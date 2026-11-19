"""Read-only A4 discovery of rollback capabilities on the TEST source bucket."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "livepalmes-test"
BUCKET = "gcf-v2-sources-206080168534-europe-west1"
BUCKET_URL = "https://storage.googleapis.com/storage/v1/b/" + BUCKET
PREFIX = "projects/livepalmes-test/locations/europe-west1/functions/"
WORKFLOW = "ffessmnap/LivePalmes/.github/workflows/a4-test-source-recovery.yml@refs/heads/main"
BASELINE = "bfb034ad2f3d7c6e9a378330d7ebfd07aa3a13f1"
INVENTORY_HASH = "4b34c040a1ccd54692fc3a54d759812ad669448e697a59332348806a95092512"
PERMISSIONS = ("storage.buckets.get", "storage.objects.get")


def require(value, message):
    if not value:
        raise ValueError(message)


def inventory(fetch):
    fields = "functions(name,state,buildConfig(runtime,entryPoint,source/storageSource),serviceConfig/revision),nextPageToken,unreachable"
    endpoint = "https://cloudfunctions.googleapis.com/v2/projects/livepalmes-test/locations/-/functions?"
    data = fetch(endpoint + urllib.parse.urlencode({"pageSize": 500, "fields": fields}))
    rows = data.get("functions", [])
    require(len(rows) == 121 and not data.get("unreachable") and not data.get("nextPageToken"), "Inventaire TEST incomplet")
    sources = {}
    for row in rows:
        name = row["name"].removeprefix(PREFIX)
        build = row["buildConfig"]
        require(row["name"] == PREFIX + name and re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", name)
                and name not in sources and row["state"] == "ACTIVE" and build["runtime"] == "nodejs22"
                and build["entryPoint"] == name and row["serviceConfig"]["revision"], "Fonction TEST hors périmètre")
        source = build["source"]["storageSource"]
        require(source["bucket"] == BUCKET and source["object"] == name + "/function-source.zip"
                and re.fullmatch(r"[1-9][0-9]*", str(source["generation"])), "Source TEST hors bucket ou génération")
        sources[name] = str(source["generation"])
    digest = hashlib.sha256("\n".join(sorted(sources)).encode()).hexdigest()
    require(digest == INVENTORY_HASH, "Liste de fonctions TEST différente de la preuve commune")
    return sources


def collect(fetch):
    sources = inventory(fetch)
    query = urllib.parse.urlencode([("permissions", p) for p in PERMISSIONS])
    perm = fetch(BUCKET_URL + "/iam/testPermissions?" + query, optional=True)
    granted = perm.get("permissions", [])
    require(isinstance(granted, list) and set(granted) <= set(PERMISSIONS), "Réponse de permissions inattendue")
    bucket = {}
    if "storage.buckets.get" in granted:
        bucket = fetch(BUCKET_URL + "?fields=name,versioning,softDeletePolicy,retentionPolicy,lifecycle")
        require(bucket.get("name") == BUCKET, "Bucket TEST différent")
    checked = 0
    if "storage.objects.get" in granted:
        for name, generation in sorted(sources.items()):
            obj = name + "/function-source.zip"
            query = urllib.parse.urlencode({"generation": generation, "fields": "bucket,name,generation,size,crc32c"})
            row = fetch(BUCKET_URL + "/o/" + urllib.parse.quote(obj, safe="") + "?" + query)
            require(row.get("bucket") == BUCKET and row.get("name") == obj and row.get("generation") == generation
                    and 0 < int(row["size"]) <= 64 * 1024**2 and row.get("crc32c"), "Métadonnées de génération invalides")
            checked += 1
    return {"schema": 1, "project": PROJECT, "sourceBucket": BUCKET, "baseline": BASELINE,
            "installed": len(sources), "permissions": sorted(granted), "retentionMetadata": bucket,
            "generationsRead": checked, "readOnly": True, "sourceContentsRead": False,
            "businessInvocations": 0, "deployment": False}


def main(destination):
    env = os.environ
    require(env.get("GITHUB_WORKFLOW_REF") == WORKFLOW and env.get("GITHUB_REPOSITORY") == "ffessmnap/LivePalmes"
            and env.get("GITHUB_REF") == "refs/heads/main" and env.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
            and env.get("GITHUB_RUN_ATTEMPT") == "1" and env.get("VERIFIED_MAIN_CI") == "true"
            and re.fullmatch("[0-9a-f]{40}", env.get("GITHUB_SHA", "")) and env.get("EXPECTED_COMMIT") == env["GITHUB_SHA"],
            "Contexte protégé TEST requis")
    identity = json.loads(Path(env["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
    require(identity.get("type") == "service_account" and identity.get("project_id") == PROJECT
            and identity.get("client_email") == "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com",
            "Compte backend TEST requis")
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"],
                                    text=True, stderr=subprocess.DEVNULL).strip()

    def fetch(url, optional=False):
        class Direct(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                raise ValueError("Redirection interdite")
        request = urllib.request.Request(url, headers={"Authorization": "Bearer " + token})
        try:
            with urllib.request.build_opener(Direct()).open(request, timeout=30) as response:
                raw = response.read(1048577)
        except urllib.error.HTTPError as error:
            if optional and error.code == 403:
                return {}
            raise ValueError("Lecture des métadonnées refusée (HTTP " + str(error.code) + ")") from None
        require(len(raw) <= 1048576, "Métadonnées trop volumineuses")
        return json.loads(raw)

    report = collect(fetch)
    report.update(candidate=env["GITHUB_SHA"], run=int(env["GITHUB_RUN_ID"]))
    Path(destination).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Inventaire TEST {report['installed']}, générations lisibles {report['generationsRead']}. Aucune écriture.")


if __name__ == "__main__":
    main(sys.argv[1])
