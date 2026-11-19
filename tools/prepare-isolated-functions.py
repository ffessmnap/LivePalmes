"""Discover Firebase Functions on the isolated candidate runner, before cloud credentials."""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

TOOLS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("cycle", TOOLS / "release-cycle.py")
cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cycle)


def preserves_deployed_sources(request):
    return (cycle.source_policy(request).enabled(request) or cycle.november10_release.approved(request)
            or cycle.reference_cleanup.approved(request) or cycle.public_navigation_direct.approved(request)
            or cycle.direct_reliability.approved(request) or cycle.direct_realtime.approved(request)
            or cycle.public_navigation_touch.approved(request))


def prepare(candidate, plan, sha, destination):
    cycle.require(cycle.SHA.fullmatch(sha) and cycle.run(["git", "rev-parse", "HEAD"], cwd=candidate) == sha,
                  "Candidat isolé incohérent")
    request = cycle.read(plan / "request.json")
    selected = cycle.read(plan / "selection.json")
    cycle.require(request["candidate"] == sha, "Plan isolé incohérent")
    safe = cycle.safe_functions(candidate)
    result = {"candidate": sha, "safe": safe, "manifests": {}}
    requires_cli = bool(selected) and not (preserves_deployed_sources(request) or cycle.approved_bcc_functions(request)
                                            or cycle.nap_account.approved(request))
    if os.environ.get("RESUME_RUN", "0") != "0" and (
            "accessRevocationRelease" in request or cycle.team_trophy.approved(request)):
        requires_cli = False
    if requires_cli:
        with tempfile.TemporaryDirectory(dir=os.environ["RUNNER_TEMP"]) as tmp:
            stage = Path(tmp) / "stage"
            os.environ.update(APP_CHECK="false", PLAN=str(plan), TARGET_FIREBASE_PROJECT="livepalmes")
            cycle.stage(candidate, "livepalmes", stage, sha)
            functions = stage / "functions"
            subprocess.run(["npm", "ci", "--no-audit", "--no-fund"], cwd=functions, check=True)
            for setting in ("true", "false"):
                (functions / ".env.livepalmes").write_text("LIVEPALMES_ENFORCE_APP_CHECK=" + setting + "\n")
                manifest = Path(tmp) / ("discovery-" + setting + ".json")
                env = {**os.environ, "GCLOUD_PROJECT":"livepalmes", "GOOGLE_CLOUD_PROJECT":"livepalmes",
                       "FIREBASE_CONFIG":json.dumps({"projectId":"livepalmes"}),
                       "LIVEPALMES_ENFORCE_APP_CHECK":setting, "FUNCTIONS_MANIFEST_OUTPUT_PATH":str(manifest)}
                subprocess.run(["node", "node_modules/firebase-functions/lib/bin/firebase-functions.js"],
                               cwd=functions, env=env, check=True, timeout=90)
                cycle.require(manifest.stat().st_size <= 2_000_000, "Manifeste Firebase trop volumineux")
                value = json.loads(manifest.read_bytes())
                cycle.require(value["specVersion"] == "v1alpha1" and isinstance(value["endpoints"], dict)
                              and set(selected).intersection(safe).issubset(value["endpoints"]), "Découverte incomplète")
                result["manifests"][setting] = value
    destination.write_text(json.dumps(result, separators=(",", ":"))+"\n", encoding="utf8")


if __name__ == "__main__":
    prepare(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(), sys.argv[3], Path(sys.argv[4]))
