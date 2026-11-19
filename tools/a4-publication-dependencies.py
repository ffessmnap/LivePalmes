"""Stage exactly the approved A4 npm inputs for the existing read-only WIF qualification."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / ".github/releases/evidence/20261119-a4-publication-dependencies.json"
DIGEST = "01f762c1f7dd21511f2626e2bfe24f41e886aaeb7b378e10d9cc46cd3cf73167"
PATHS = {prefix + name for prefix in ("functions/", "tests/firestore-rules/")
         for name in ("package.json", "package-lock.json")}


def require(value, message):
    if not value:
        raise ValueError(message)


def legacy():
    spec = importlib.util.spec_from_file_location("production_wif", ROOT / "tools/a3-production-wif-qualification.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def plan():
    raw = PLAN.read_bytes().replace(b"\r\n", b"\n")
    require(hashlib.sha256(raw).hexdigest() == DIGEST, "Contrat de dépendances A4 modifié")
    value = json.loads(raw)
    require(value["schema"] == 1 and set(value["files"]) == PATHS and value["publicationPlanSha256"] == legacy().DIGEST,
            "Contrat de qualification incompatible")
    return value


def directory():
    return Path(os.environ["RUNNER_TEMP"]).resolve(strict=True) / "a4-publication-dependencies"


def verify(directory, value):
    for name, digest in value["files"].items():
        file = directory / name
        require(file.is_file() and file.resolve() == directory.resolve() / name
                and hashlib.sha256(file.read_bytes()).hexdigest() == digest, "Fichier npm hors contrat : " + name)


def stage(directory, value):
    directory.mkdir(mode=0o700, exist_ok=False)
    for name, digest in value["files"].items():
        raw = subprocess.check_output(["git", "show", value["anchor"] + ":" + name], cwd=ROOT)
        require(hashlib.sha256(raw).hexdigest() == digest, "Empreinte Git du manifeste npm différente")
        file = directory / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(raw)
    verify(directory, value)


def main():
    value = plan()
    context = legacy()
    context.context(os.environ)  # Same workflow, identities, exact main, CI and first attempt.
    destination = directory()
    if sys.argv[1:] == ["prepare"]:
        stage(destination, value)
        return
    require(len(sys.argv) == 3 and sys.argv[1] == "qualify", "Mode de qualification A4 inconnu")
    verify(destination, value)
    context.main(sys.argv[2], dependency_profile=value["profile"], dependency_directory=destination)
    report_file = Path(sys.argv[2])
    report = json.loads(report_file.read_text())
    require(all(report[k] == version for k, version in value["profile"].items()) and
            report["renewedAfterRealExpiry"] and report["publicationInvocations"] == report["iamWrites"] == 0,
            "Reçu de qualification A4 incomplet")
    report.update(dependencyAnchor=value["anchor"], dependencyContractSha256=DIGEST, dependencyFiles=value["files"])
    report_file.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit("Qualification A4 refusée. Aucun identifiant ou jeton affiché.")
