"""Deployment metadata and code rollback only; no business data API calls."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.parse
import urllib.request

PREFIX = "projects/livepalmes/locations/europe-west1/functions/"
API = "https://cloudfunctions.googleapis.com/v2/"


def request(url, method="GET", body=None):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in {"cloudfunctions.googleapis.com", "firebasehosting.googleapis.com"}:
        raise ValueError("API non autorisee")
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"], text=True, stderr=subprocess.DEVNULL).strip()
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def inventory():
    result, page = [], ""
    for _ in range(50):
        value = request(API + "projects/livepalmes/locations/-/functions?pageSize=100" + ("&pageToken=" + urllib.parse.quote(page) if page else ""))
        if value.get("unreachable"):
            raise ValueError("Inventaire incomplet")
        result.extend(value.get("functions", []))
        page = value.get("nextPageToken", "")
        if not page:
            return result
    raise ValueError("Pagination non terminee")


def identity(function):
    return {key: function.get(key) for key in ["name", "updateTime", "state"]} | {"revision": function.get("serviceConfig", {}).get("revision")}


def check_after(backup, destination, require_success):
    report = json.loads((backup / "report.json").read_text())
    before = {f["name"]: f for f in json.loads((backup / "functions.json").read_text())}
    after = {f["name"]: f for f in inventory()}
    selected = {f["name"] for f in report["functions"]} | {PREFIX + name for name in report["newFunctions"]}
    errors = []
    for name in set(before) - selected:
        if name not in after or identity(before[name]) != identity(after[name]):
            errors.append("Function exclue modifiee: " + name.split("/")[-1])
    for name in selected:
        f = after.get(name)
        if not f or f.get("state") != "ACTIVE":
            errors.append("Function non active: " + name.split("/")[-1])
        elif f.get("serviceConfig", {}).get("environmentVariables", {}).get("LIVEPALMES_ENFORCE_APP_CHECK", "false") != report["appCheck"]:
            errors.append("App Check different: " + name.split("/")[-1])
        elif name in before and f.get("updateTime") == before[name].get("updateTime"):
            errors.append("Function non actualisee: " + name.split("/")[-1])
    if set(after) != set(before) | selected:
        errors.append("Inventaire inattendu")
    destination.write_text(json.dumps({"candidate": report["candidate"], "functions": [identity(f) for f in after.values()], "errors": errors}, indent=2))
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write(f"\nFunctions selectionnees : {len(selected)}. Inventaire PROD : {len(after)}. Ecarts : {len(errors)}.\n")
        for error in errors:
            summary.write("- " + error + "\n")
    if require_success and errors:
        raise ValueError("Controle des Functions en echec")


def wait_operation(operation):
    for _ in range(180):
        if operation.get("done"):
            if operation.get("error"):
                raise ValueError("Operation Firebase en echec")
            return
        time.sleep(10)
        operation = request(API + operation["name"])
    raise ValueError("Operation Firebase non terminee")


def rollback_patch(function, source):
    # Only writable ServiceConfig fields. No business calls or triggers invoked.
    writable = {"timeoutSeconds", "availableMemory", "availableCpu", "maxInstanceCount", "minInstanceCount", "maxInstanceRequestConcurrency", "ingressSettings", "serviceAccountEmail", "environmentVariables", "allTrafficOnLatestRevision", "vpcConnector", "vpcConnectorEgressSettings", "secretEnvironmentVariables", "secretVolumes", "securityLevel", "binaryAuthorizationPolicy", "directVpcNetworkInterface", "directVpcEgress"}
    return {"name": function["name"], "buildConfig": {"source": {"storageSource": source}, "runtime": function["buildConfig"]["runtime"], "entryPoint": function["buildConfig"]["entryPoint"]}, "serviceConfig": {k: v for k, v in function["serviceConfig"].items() if k in writable}, "labels": function.get("labels", {})}


def rollback(backup, after_path, apply=True):
    if os.environ.get("CONFIRM_CODE_ROLLBACK") != "livepalmes":
        raise ValueError("Confirmation explicite du retour arriere requise")
    report = json.loads((backup / "report.json").read_text())
    after_report = json.loads(after_path.read_text())
    if after_report["candidate"] != report["candidate"]:
        raise ValueError("Sauvegarde et publication differentes")
    before = {f["name"]: f for f in json.loads((backup / "functions.json").read_text())}
    expected = {f["name"]: f for f in after_report["functions"]}
    current = {f["name"]: f for f in inventory()}
    selected = {f["name"] for f in report["functions"]} | {PREFIX + name for name in report["newFunctions"]}
    for name in selected:
        if not name.startswith(PREFIX):
            raise ValueError("Function hors perimetre PROD")
        if name in current and (name not in expected or identity(current[name]) != expected[name]):
            raise ValueError("Production modifiee depuis la publication, retour arriere bloque")
    archives = {}
    for source in report["sources"]:
        archive = backup / "sources" / (source["functions"][0] + ".zip")
        if hashlib.sha256(archive.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError("Archive alteree")
        for name in source["functions"]:
            archives[PREFIX + name] = archive
    if not apply:
        print("Sauvegarde, archives et revisions de retour arriere verifiees.")
        return
    def restore(name):
        if name not in before:
            if name in current:
                wait_operation(request(API + name, "DELETE"))
            return
        if name in current and identity(current[name]) == identity(before[name]):
            return
        upload = request(API + "projects/livepalmes/locations/europe-west1/functions:generateUploadUrl", "POST", {})
        url = urllib.parse.urlsplit(upload["uploadUrl"])
        if url.scheme != "https" or not (url.hostname == "storage.googleapis.com" or url.hostname.endswith(".storage.googleapis.com")):
            raise ValueError("Destination archive interdite")
        req = urllib.request.Request(upload["uploadUrl"], method="PUT", data=archives[name].read_bytes(), headers={"Content-Type": "application/zip"})
        with urllib.request.urlopen(req, timeout=120):
            pass
        mask = "build_config.source,build_config.runtime,build_config.entry_point,service_config,labels"
        wait_operation(request(API + name + "?updateMask=" + mask, "PATCH", rollback_patch(before[name], upload["storageSource"])))
    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(restore, sorted(selected)))
    print("Retour arriere Functions termine ; aucune donnee metier modifiee.")


def hosting(backup, after_path, restore=False):
    url = "https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases"
    current = request(url + "?pageSize=1")["releases"][0]
    if not restore:
        after_path.write_text(json.dumps({"name": current["name"], "version": current["version"]["name"]}))
        print("Version Hosting active: " + current["version"]["name"])
        return
    expected = json.loads(after_path.read_text())
    if current["name"] != expected["name"]:
        raise ValueError("Hosting modifie depuis la publication")
    previous = json.loads((backup / "hosting.json").read_text())["version"]["name"]
    if previous != "sites/livepalmes/versions/31e2e5f26481316a":
        raise ValueError("Version Hosting de repli inattendue")
    if current["version"]["name"] != previous:
        request(url + "?versionName=" + urllib.parse.quote(previous, safe=""), "POST", {"message": "Retour arriere code LivePalmes"})
    print("Hosting revenu a la version sauvegardee.")


if __name__ == "__main__":
    credentials = json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
    if credentials.get("project_id") != "livepalmes":
        raise ValueError("Compte PROD requis")
    if sys.argv[1] == "check":
        check_after(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4] == "success")
    elif sys.argv[1] in {"rollback", "validate-rollback"}:
        rollback(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[1] == "rollback")
    elif sys.argv[1] in {"hosting-state", "hosting-rollback"}:
        hosting(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[1] == "hosting-rollback")
    else:
        raise ValueError("Mode inconnu")
