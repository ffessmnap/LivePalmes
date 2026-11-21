"""Read only JSON from the completed preparation job of this same workflow run."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import zipfile

MAX_BYTES = 5_000_000
ARTIFACT = "isolated-production-inputs"
MEMBER = "production-inputs.json"


def require(value, message):
    if not value:
        raise ValueError(message)


def source_archive_receipt(raw):
    require(0 < len(raw) <= 64 * 1024**2, "Archive source hors limite")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        rows = archive.infolist()
        names = [r.filename for r in rows]
        require(rows and len(rows) <= 10000 and len(names) == len(set(names))
                and sum(r.file_size for r in rows) <= 64 * 1024**2
                and all(not r.is_dir() and not r.filename.startswith(('/', '\\'))
                        and not any(p in ('..', '.') for p in r.filename.split('/')) for r in rows),
                "Contenu source invalide")
        content = [[name, hashlib.sha256(archive.read(name)).hexdigest()] for name in sorted(names)]
    return {"sha256": hashlib.sha256(raw).hexdigest(), "files": len(content),
            "contentSha256": hashlib.sha256(json.dumps(content, separators=(',', ':')).encode()).hexdigest()}


def validate(data, candidate):
    require(isinstance(data, dict) and set(data) in ({"candidate", "safe", "manifests"}, {"candidate", "safe", "manifests", "sourceArchive"})
            and re.fullmatch("[a-f0-9]{40}", candidate) and data["candidate"] == candidate, "Candidat isolé différent")
    receipt = data.get("sourceArchive")
    require(receipt is None or (isinstance(receipt, dict) and set(receipt) == {"sha256", "contentSha256", "files"}
            and type(receipt["files"]) is int and 0 < receipt["files"] <= 10000
            and all(re.fullmatch('[0-9a-f]{64}', str(receipt[k])) for k in ['sha256', 'contentSha256'])),
            "Preuve de fabrication source invalide")
    names = data["safe"]
    require(isinstance(names, list) and 0 < len(names) <= 1000 and
            all(isinstance(n,str) and re.fullmatch("[a-zA-Z][a-zA-Z0-9]*", n) for n in names)
            and len(set(names)) == len(names), "Liste de fonctions isolée invalide")
    require(isinstance(data["manifests"], dict) and set(data["manifests"]) in (set(), {"true","false"}),
            "Variantes de découverte invalides")
    for manifest in data["manifests"].values():
        require(isinstance(manifest, dict) and manifest.get("specVersion") == "v1alpha1"
                and set(manifest) <= {"specVersion", "endpoints", "params", "requiredAPIs", "extensions"}
                and not manifest.get("requiredAPIs") and isinstance(manifest.get("endpoints"), dict)
                and not manifest.get("extensions")
                and 0 < len(manifest["endpoints"]) <= 1000, "Manifeste Firebase invalide")
        for name, endpoint in manifest["endpoints"].items():
            require(re.fullmatch("[A-Za-z][A-Za-z0-9]*", name) and isinstance(endpoint,dict)
                    and endpoint.get("region") == ["europe-west1"] and endpoint.get("platform") == "gcfv2"
                    and endpoint.get("serviceAccount") is None and endpoint.get("serviceAccountEmail") is None
                    and endpoint.get("entryPoint") == name and endpoint.get("labels",{}).get("livepalmes-commit")==candidate,
                    "Point d’entrée ou commit de Function différent")
    return data


def download(candidate, destination):
    repo = os.environ["GITHUB_REPOSITORY"]
    run = os.environ["GITHUB_RUN_ID"]
    require(repo=="ffessmnap/LivePalmes" and re.fullmatch("[1-9][0-9]*",run), "Origine GitHub inconnue")
    def api(endpoint):
        return subprocess.check_output(["gh","api",f"repos/{repo}/actions/{endpoint}"],timeout=60)
    items=json.loads(api(f"runs/{run}/artifacts?name={ARTIFACT}&per_page=2"))["artifacts"]
    require(len(items)==1, "Artefact isolé absent ou ambigu")
    item=items[0]
    require(item["name"]==ARTIFACT and not item["expired"] and item["workflow_run"]["id"]==int(run)
            and item["workflow_run"]["head_sha"]==os.environ["GITHUB_SHA"] and 0<item["size_in_bytes"]<=MAX_BYTES,
            "Provenance de l’artefact isolé invalide")
    raw=api(f"artifacts/{int(item['id'])}/zip")
    require(item["digest"]=="sha256:"+hashlib.sha256(raw).hexdigest(), "Artefact isolé altéré")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        require(archive.namelist()==[MEMBER] and archive.getinfo(MEMBER).file_size<=MAX_BYTES,"Membre isolé invalide")
        data=archive.read(MEMBER)
    value = validate(json.loads(data), candidate)
    trusted_module = Path(__file__).resolve().with_name("firebase-test-backend-lots.js")
    check = "const m=require(process.argv[1]); console.log(JSON.stringify(m.ALL_SAFE_LOTS.flatMap(m.activeLotFunctions)))"
    approved = json.loads(subprocess.check_output(["node", "-e", check, str(trusted_module)]))
    require(set(value["safe"]) == set(approved), "Lots isolés différents des lots de publication vérifiés")
    with destination.open("xb") as file:
        file.write(data)


def apply(stage, source, setting, candidate):
    require(setting in ("true","false"), "Paramètre App Check inconnu")
    result=validate(json.loads(source.read_bytes()),candidate)
    manifest=result["manifests"][setting]
    staged = (stage / "selector.txt").read_text().strip().split(",")
    require(set(staged) == {"functions:" + name for name in manifest["endpoints"]},
            "Le manifeste ne correspond pas aux exports autorisés par le plan")
    config=stage/"firebase.json"
    data=json.loads(config.read_bytes())
    require(data=={"functions":{"source":"functions","codebase":"default"}}, "Configuration Functions inattendue")
    # Make the CLI read the spec without starting the candidate SDK on the
    # privileged runner. Exclude that local spec from the uploaded source.
    with (stage/"functions/functions.yaml").open("x",encoding="utf8") as file:
        json.dump(manifest,file)
    data["functions"]["ignore"]=["node_modules",".git","functions.yaml"]
    config.write_text(json.dumps(data),encoding="utf8")


def check_tree(candidate):
    entries = subprocess.check_output(["git","ls-files","--stage","-z"],cwd=candidate).split(b"\0")
    require(all(line.startswith((b"100644 ",b"100755 ")) for line in entries if line),
            "Lien ou sous-module à examiner avant publication")
    config = json.loads((candidate/"firebase.json").read_bytes())
    items = config["hosting"] if isinstance(config["hosting"],list) else [config["hosting"]]
    targets = json.loads((candidate/".firebaserc").read_bytes())["targets"]["livepalmes"]["hosting"]
    for item in items:
        require(isinstance(item,dict) and not set(item).intersection({"predeploy","postdeploy","source","frameworksBackend"})
                and item.get("public")=="." and targets.get(item.get("target"))==["livepalmes"],
                "Configuration Hosting hors du parcours statique autorisé")


if __name__=="__main__":
    if sys.argv[1]=="download" and len(sys.argv)==4:
        download(sys.argv[2],Path(sys.argv[3]))
    elif sys.argv[1]=="apply" and len(sys.argv)==6:
        apply(Path(sys.argv[2]),Path(sys.argv[3]),sys.argv[4],sys.argv[5])
    elif sys.argv[1]=="check-tree" and len(sys.argv)==3:
        check_tree(Path(sys.argv[2]))
    else:
        sys.exit("Commande de préparation isolée invalide")
