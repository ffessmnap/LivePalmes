"""Read deployment metadata and source archives. Never invoke business functions."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import zipfile


def archive_manifest(data):
    if len(data) > 64 * 1024 * 1024:
        raise ValueError("Archive trop volumineuse")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos = [i for i in archive.infolist() if not i.is_dir()]
        if len(infos) > 3000 or sum(i.file_size for i in infos) > 256 * 1024 * 1024:
            raise ValueError("Contenu archive hors limites")
        names = [i.filename for i in infos]
        if len(set(names)) != len(names) or any(n.startswith("/") or ".." in n.split("/") or "\\" in n for n in names):
            raise ValueError("Chemin archive invalide")
        # Hashes only; no old code is executed or extracted, no file contents logged.
        return {i.filename: hashlib.sha256(archive.read(i)).hexdigest() for i in infos}


def main():
    credentials = json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
    if credentials["project_id"] != "livepalmes":
        raise ValueError("Compte PROD requis")
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"], text=True, stderr=subprocess.DEVNULL).strip()

    def request(url, body=None):
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.hostname not in ["cloudfunctions.googleapis.com", "firebasehosting.googleapis.com", "cloudresourcemanager.googleapis.com"]:
            raise ValueError("API interdite")
        if body is not None and not (parsed.path.endswith(":generateDownloadUrl") or parsed.path.endswith(":testIamPermissions")):
            raise ValueError("Operation interdite")
        req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)

    root = Path(os.environ["CANDIDATE_DIRECTORY"])
    output = Path(os.environ["RUNNER_TEMP"]) / "production-preflight"
    output.mkdir()
    report = {"candidate": os.environ["CANDIDATE_SHA"], "functions": [], "sources": [], "errors": []}
    try:
        permissions = request("https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions", {"permissions": ["cloudfunctions.functions.setIamPolicy"]})
        report["newHttpsPermission"] = "cloudfunctions.functions.setIamPolicy" in permissions.get("permissions", [])
        version = "sites/livepalmes/versions/31e2e5f26481316a"
        hosting = request("https://firebasehosting.googleapis.com/v1beta1/" + version)
        report["hostingRollback"] = {"version": version, "status": hosting.get("status")}
        if hosting.get("status") != "FINALIZED":
            report["errors"].append("Version Hosting de repli indisponible")
        functions = []
        page = ""
        seen = set()
        for _ in range(50):
            data = request("https://cloudfunctions.googleapis.com/v2/projects/livepalmes/locations/-/functions?pageSize=100" + ("&pageToken=" + urllib.parse.quote(page) if page else ""))
            if data.get("unreachable"):
                raise ValueError("Regions inaccessibles")
            functions.extend(data.get("functions", []))
            page = data.get("nextPageToken", "")
            if not page:
                break
            if page in seen:
                raise ValueError("Pagination repetee")
            seen.add(page)
        else:
            raise ValueError("Inventaire incomplet")
        selected = json.loads(subprocess.check_output(["node", "-e", 'const {ALL_SAFE_LOTS,LOTS}=require(process.argv[1]);console.log(JSON.stringify(ALL_SAFE_LOTS.flatMap(x=>LOTS[x])))', str(root / "tools/firebase-test-backend-lots.js")], text=True))
        selected_functions = [f for f in functions if f["name"].split("/")[-1] in selected]
        app_checks = set(f.get("serviceConfig", {}).get("environmentVariables", {}).get("LIVEPALMES_ENFORCE_APP_CHECK", "false") for f in selected_functions)
        if len(app_checks) != 1 or not app_checks.issubset({"true", "false"}):
            raise ValueError("App Check heterogene ou invalide")
        report["appCheck"] = next(iter(app_checks))
        report["newFunctions"] = sorted(set(selected) - {f["name"].split("/")[-1] for f in selected_functions})
        sources = {}
        for f in selected_functions:
            source = f.get("buildConfig", {}).get("source", {}).get("storageSource")
            if not source:
                raise ValueError("Source de repli absente")
            key = json.dumps(source, sort_keys=True)
            sources.setdefault(key, []).append(f)
            report["functions"].append({"name": f["name"], "revision": f.get("serviceConfig", {}).get("revision"), "source": source})
        for key, group in sources.items():
            f = group[0]
            try:
                signed = request("https://cloudfunctions.googleapis.com/v2/" + f["name"] + ":generateDownloadUrl", {})["downloadUrl"]
                parsed = urllib.parse.urlsplit(signed)
                if parsed.scheme != "https" or not (parsed.hostname == "storage.googleapis.com" or parsed.hostname.endswith(".storage.googleapis.com")):
                    raise ValueError("Hote source interdit")
                with urllib.request.urlopen(signed, timeout=60) as response:
                    archive = response.read(64 * 1024 * 1024 + 1)
                manifest = archive_manifest(archive)
                report["sources"].append({"source": json.loads(key), "functions": [x["name"].split("/")[-1] for x in group], "sha256": hashlib.sha256(archive).hexdigest(), "files": manifest})
            except urllib.error.HTTPError as error:
                report["errors"].append(f"Source {f['name'].split('/')[-1]}: HTTP {error.code}")
            except Exception:
                report["errors"].append(f"Source {f['name'].split('/')[-1]}: lecture indisponible")
        if not report["newHttpsPermission"]:
            report["errors"].append("Permission CLI manquante: cloudfunctions.functions.setIamPolicy")
    except urllib.error.HTTPError as error:
        report["errors"].append(f"API metadata: HTTP {error.code}")
    except Exception:
        report["errors"].append("Verification incomplete, aucun deploiement")
    (output / "report.json").write_text(json.dumps(report, indent=2))
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write("## Preparation PROD sans deploiement\n\n")
        summary.write(f"- Commit candidat : {report['candidate']}\n- Sources lisibles : {len(report['sources'])}\n- Functions existantes selectionnees : {len(report['functions'])}\n")
        summary.write(f"- Hosting de repli : {report.get('hostingRollback')}\n- App Check conserve : {report.get('appCheck')}\n")
        for error in report["errors"]:
            summary.write(f"- BLOCAGE : {error}\n")
        summary.write("\nAucune donnee metier lue ou modifiee. Les archives ont ete lues pour verifier leur disponibilite, pas conservees en sauvegarde.\n")
    if report.get("appCheck"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as output_file:
            output_file.write("app_check=" + report["appCheck"] + "\n")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
