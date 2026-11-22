"""Resolve the immutable candidate before executing it on a separate runner."""
import importlib.util
import os
from pathlib import Path
import re
import tempfile
import sys
import subprocess
import json

TOOLS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("release_cycle", TOOLS / "release-cycle.py")
cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cycle)


HISTORICAL_OPTIONS = {"portalSessionEnforcementRelease", "optionalAccessObservationRelease",
                      "portalSessionPrepareRelease", "accessRevocationRelease", "directRealtimeRelease",
                      "licenseReportRelease"}
HISTORICAL_MAIN = "29a60daf5451ea4a739f15c81705ed473bd7df48"


def historical(request):
    if HISTORICAL_OPTIONS.isdisjoint(request):
        return False
    candidate = request["candidate"]
    cycle.require(isinstance(candidate, str) and cycle.SHA.fullmatch(candidate),
                  "Candidat historique invalide")
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", candidate, HISTORICAL_MAIN],
        cwd=TOOLS.parent, check=False)
    cycle.require(result.returncode in (0, 1), "Historique de publication indisponible")
    return result.returncode == 0


def reader_transport(destination):
    raw = os.environ.get("PRODUCTION_DISCOVERY_JSON")
    if raw:
        candidate = json.loads(raw)["candidate"]
        cycle.require(cycle.SHA.fullmatch(candidate), "Candidat de découverte invalide")
        # The old capability probes target these fixed releases and exact readers.
        return candidate in {"43fbd5a9bb544199255de37dd239584f2c502d78",
                             "b0000e8763e9f11b4c21077dbb80012a442d58aa",
                             "63fb92732a448401035f24bcd0a7c466cfce4f82",
                             "689d523b423615cb1faad9f564c1a6b2f44f1b96"}
    if os.environ.get("RECOVERY_RUN","0") != "0":
        if os.environ["RECOVERY_RUN"] == "45062801612":
            return False
        cycle.require(os.environ["RECOVERY_RUN"] == "43980814596", "Reprise de lecteur inconnue")
        return True
    cycle.artifact(os.environ["PLAN_RUN"],"release-plan",destination,
                   ".github/workflows/livepalmes-production-preflight.yml")
    return historical(cycle.read(destination/"request.json"))


def select(preparation, resume, destination):
    if resume == "0":
        cycle.require(re.fullmatch("[1-9][0-9]*", preparation), "Bilan de publication requis")
        cycle.artifact(preparation, "release-plan", destination,
                       ".github/workflows/livepalmes-production-preflight.yml")
    else:
        cycle.require(re.fullmatch("[1-9][0-9]*", resume), "Reprise de publication invalide")
        # A resume can legitimately originate from a failed run. Use the same
        # digest-checked artifact reader as fetch_plan, then verify its origin.
        info = cycle.artifact(resume, "release-plan", destination)
        cycle.require(info["path"] == ".github/workflows/livepalmes-production-release.yml",
                      "Origine de reprise inconnue")
    request = cycle.read(destination / "request.json")
    sha = request["candidate"]
    cycle.require(cycle.SHA.fullmatch(sha) and not request.get("verificationOnly"),
                  "Candidat de publication invalide")
    cycle.git("merge-base", "--is-ancestor", sha, "HEAD")
    proof = destination / "test-proof.json"
    return sha, proof.is_file() and cycle.reusable_verification(cycle.read(proof), sha), historical(request)


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(dir=os.environ["RUNNER_TEMP"]) as tmp:
        if sys.argv[1:] == ["transport"]:
            cycle.output(historical_reader=str(reader_transport(Path(tmp))).lower())
        else:
            candidate, verified, legacy = select(os.environ["PREPARATION_RUN"], os.environ["RESUME_RUN"], Path(tmp))
            cycle.output(candidate=candidate, verified=str(verified).lower(), historical_reader=str(legacy).lower())
