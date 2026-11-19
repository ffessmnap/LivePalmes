"""Supply the two existing service accounts to verified production jobs via WIF."""
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = {"livepalmes-production-readiness.yml", "livepalmes-production-release.yml",
             "livepalmes-production-rollback.yml"}


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def target(kind, env):
    plan = load("a3-production-wif-qualification").contract()
    repo = "ffessmnap/LivePalmes"
    allowed = {repo + "/.github/workflows/" + name + "@refs/heads/main" for name in WORKFLOWS}
    if (env.get("GITHUB_WORKFLOW_REF") not in allowed or env.get("GITHUB_REF") != "refs/heads/main"
            or env.get("GITHUB_REPOSITORY") != repo or env.get("GITHUB_EVENT_NAME") != "workflow_dispatch"
            or env.get("GITHUB_REPOSITORY_ID") != plan["repositoryId"]
            or env.get("GITHUB_REPOSITORY_OWNER_ID") != plan["ownerId"]
            or env.get("GITHUB_RUN_ATTEMPT") != "1" or not re.fullmatch("[0-9a-f]{40}",env.get("GITHUB_SHA",""))
            or kind not in plan["accounts"]):
        raise ValueError("Contexte de publication non autorisé")
    return plan["accounts"][kind], plan["allowedAudiences"][0].removeprefix("https://iam.googleapis.com/")


def install(kind, env):
    account, provider = target(kind, env)
    reader = load("a3-wif-hosting-readonly")
    reader.PROVIDER, reader.ACCOUNT = provider, account
    reader.context = lambda source, qualification: target(kind, source)
    original = reader.credential(env)
    data = json.loads(original.read_bytes())
    data.update(project_id="livepalmes", client_email=account,
                service_account_impersonation={"token_lifetime_seconds": 3600})
    with tempfile.NamedTemporaryFile(prefix="production-wif-", suffix=".json", mode="w", encoding="utf8",
                                     dir=env["RUNNER_TEMP"], delete=False) as dest:
        json.dump(data, dest)
    variables = ("GOOGLE_APPLICATION_CREDENTIALS", "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
                 "GOOGLE_GHA_CREDS_PATH")
    with open(env["GITHUB_ENV"], "a", encoding="utf8") as out:
        for key in variables:
            out.write(f"{key}={dest.name}\n")
    # The hosted runner discards RUNNER_TEMP when the job ends.
    return Path(dest.name)


if __name__ == "__main__":
    try:
        install(sys.argv[1], os.environ)
    except Exception:
        sys.exit("Identité de publication refusée. Vérifier le contexte et le compte sélectionné.")
