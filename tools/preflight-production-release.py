"""Read deployment metadata and source archives. Never invoke business functions."""
from concurrent.futures import ThreadPoolExecutor
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
    backup = Path(os.environ["RELEASE_BACKUP_DIRECTORY"]) if os.environ.get("RELEASE_BACKUP_DIRECTORY") else None
    if backup:
        backup.mkdir()
        (backup / "sources").mkdir()
    report = {"candidate": os.environ["CANDIDATE_SHA"], "functions": [], "sources": [], "errors": []}
    try:
        permissions = request("https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions", {"permissions": ["cloudfunctions.functions.setIamPolicy"]})
        report["newHttpsPermission"] = "cloudfunctions.functions.setIamPolicy" in permissions.get("permissions", [])
        releases = request("https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1").get("releases", [])
        if not releases:
            raise ValueError("Release Hosting absente")
        version = releases[0]["version"]["name"]
        if os.environ.get("EXPECTED_HOSTING_VERSION") and version != os.environ["EXPECTED_HOSTING_VERSION"]:
            raise ValueError("Hosting a change depuis le bilan")
        hosting = request("https://firebasehosting.googleapis.com/v1beta1/" + version)
        report["hostingRollback"] = {"version": version, "status": hosting.get("status")}
        if hosting.get("status") != "FINALIZED":
            report["errors"].append("Version Hosting de repli indisponible")
        if backup:
            releases = request("https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1").get("releases", [])
            if not releases or releases[0].get("version", {}).get("name") != version:
                raise ValueError("Version Hosting active differente du bilan")
            (backup / "hosting.json").write_text(json.dumps(releases[0]))
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
        extra = []
        if os.environ.get('PLAN'):
            plan = json.loads((Path(os.environ['PLAN']) / 'request.json').read_text())
            extra = plan.get('additionalPdfFunctions', [])
            if extra and (set(extra) != {'prepareEngagementClubRecapEmails', 'closeDueEngagementCompetitions'} or not plan.get('additionalPdfApproval')):
                raise ValueError('Extension PDF non autorisee')
        selected += extra
        if os.environ.get("RELEASE_SELECTION"):
            requested = json.loads(Path(os.environ["RELEASE_SELECTION"]).read_text())
            if not isinstance(requested, list) or len(requested) != len(set(requested)) or not set(requested).issubset(selected):
                raise ValueError("Selection hors perimetre")
            selected = requested
        selected_functions = [f for f in functions if f["name"].split("/")[-1] in selected]
        if not set(extra).issubset({f['name'].split('/')[-1] for f in selected_functions}):
            raise ValueError('Traitement PDF existant absent')
        report['additionalPdfFunctions'] = extra
        app_checks = set(f.get("serviceConfig", {}).get("environmentVariables", {}).get("LIVEPALMES_ENFORCE_APP_CHECK", "false") for f in selected_functions if f['name'].split('/')[-1] not in extra)
        if selected and (len(app_checks) != 1 or not app_checks.issubset({"true", "false"})):
            raise ValueError("App Check heterogene ou invalide")
        report["appCheck"] = next(iter(app_checks), "false")
        report["newFunctions"] = sorted(set(selected) - {f["name"].split("/")[-1] for f in selected_functions})
        if backup:
            allowed_keys = {"EVENTARC_CLOUD_EVENT_SOURCE", "FIREBASE_CONFIG", "FUNCTION_SIGNATURE_TYPE", "FUNCTION_TARGET", "GCLOUD_PROJECT", "LIVEPALMES_ENFORCE_APP_CHECK", "LOG_EXECUTION_ID"}
            for f in selected_functions:
                service = f.get("serviceConfig", {})
                if f['name'].split('/')[-1] not in extra and (set(service.get("environmentVariables", {})) - allowed_keys or service.get("secretEnvironmentVariables") or service.get("secretVolumes")):
                    raise ValueError("Configuration runtime inattendue")
                if f.get("environment") != "GEN_2" or f.get("buildConfig", {}).get("runtime") != "nodejs22" or f.get("state") != "ACTIVE":
                    raise ValueError("Function PROD incompatible")
            (backup / "functions.json").write_text(json.dumps(functions))
        sources = {}
        for f in selected_functions:
            source = f.get("buildConfig", {}).get("source", {}).get("storageSource")
            if not source:
                raise ValueError("Source de repli absente")
            key = json.dumps(source, sort_keys=True)
            sources.setdefault(key, []).append(f)
            report["functions"].append({"name": f["name"], "revision": f.get("serviceConfig", {}).get("revision"), "source": source, "environmentKeys": sorted(f.get("serviceConfig", {}).get("environmentVariables", {})), "secretCount": len(f.get("serviceConfig", {}).get("secretEnvironmentVariables", []))})
        def inspect_source(item):
            key, group = item
            f = group[0]
            try:
                signed = request("https://cloudfunctions.googleapis.com/v2/" + f["name"] + ":generateDownloadUrl", {})["downloadUrl"]
                parsed = urllib.parse.urlsplit(signed)
                if parsed.scheme != "https" or not (parsed.hostname == "storage.googleapis.com" or parsed.hostname.endswith(".storage.googleapis.com")):
                    raise ValueError("Hote source interdit")
                with urllib.request.urlopen(signed, timeout=60) as response:
                    archive = response.read(64 * 1024 * 1024 + 1)
                manifest = archive_manifest(archive)
                if backup:
                    (backup / "sources" / (f["name"].split("/")[-1] + ".zip")).write_bytes(archive)
                return {"source": json.loads(key), "functions": [x["name"].split("/")[-1] for x in group], "sha256": hashlib.sha256(archive).hexdigest(), "files": manifest}, None
            except urllib.error.HTTPError as error:
                return None, f"Source {f['name'].split('/')[-1]}: HTTP {error.code}"
            except Exception:
                return None, f"Source {f['name'].split('/')[-1]}: lecture indisponible"
        # Bounded parallel reads; only the main thread updates the report.
        with ThreadPoolExecutor(max_workers=6) as executor:
            for source_report, error in executor.map(inspect_source, sources.items()):
                if error:
                    report["errors"].append(error)
                else:
                    report["sources"].append(source_report)
        if not report["newHttpsPermission"]:
            report["errors"].append("Permission CLI manquante: cloudfunctions.functions.setIamPolicy")
    except urllib.error.HTTPError as error:
        report["errors"].append(f"API metadata: HTTP {error.code}")
    except Exception:
        report["errors"].append("Verification incomplete, aucun deploiement")
    (output / "report.json").write_text(json.dumps(report, indent=2))
    if backup:
        (backup / "report.json").write_text(json.dumps(report, indent=2))
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write("## Preparation PROD sans deploiement\n\n")
        summary.write(f"- Commit candidat : {report['candidate']}\n- Sources lisibles : {len(report['sources'])}\n- Functions existantes selectionnees : {len(report['functions'])}\n")
        summary.write(f"- Hosting de repli : {report.get('hostingRollback')}\n- App Check conserve : {report.get('appCheck')}\n")
        environment_keys = sorted({key for function in report["functions"] for key in function.get("environmentKeys", [])})
        summary.write(f"- Noms des variables runtime (aucune valeur) : {environment_keys}\n")
        summary.write(f"- Functions selectionnees avec secrets : {sum(bool(f.get('secretCount')) for f in report['functions'])}\n")
        for error in report["errors"]:
            summary.write(f"- BLOCAGE : {error}\n")
        summary.write("\nAucune donnee metier lue ou modifiee.\n")
        summary.write("Sources conservees temporairement pour chiffrement avant publication.\n" if backup else "Archives controlees, pas conservees en sauvegarde.\n")
    if report.get("appCheck"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as output_file:
            output_file.write("app_check=" + report["appCheck"] + "\n")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
