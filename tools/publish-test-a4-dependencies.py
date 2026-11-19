"""A4.3, existing TEST functions only. Keep the existing source/label transport."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from threading import Event
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "a4_dependencies"
WORKFLOW = ".github/workflows/livepalmes-test-mail-sources.yml"
REPO = "ffessmnap/LivePalmes"
PLAN = ROOT / ".github/releases/evidence/20261119-a4-test-dependencies.json"
DIGEST = "246dadce5ada0b989f6f0255298aae41abc6200cebca203eacab27e1ebd483b1"


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


publisher = load("publish-test-mail-sources")
recovery = load("a4-test-dependency-backup")
cycle, require = publisher.cycle, publisher.require
original_guard, original_baseline = publisher.guard, publisher.baseline


def plan():
    raw = PLAN.read_bytes().replace(b"\r\n", b"\n")
    require(hashlib.sha256(raw).hexdigest() == DIGEST, "Contrat TEST A4 modifiÃ©")
    value = json.loads(raw)
    names = value["installedNames"]
    require(value["schema"] == 1 and value["project"] == publisher.PROJECT and value["release"] == RELEASE
            and len(names) == 121 and names == sorted(set(names)), "Inventaire du contrat TEST A4 diffÃ©rent")
    cycle.standard_sources.approval(value["approval"])
    return value


# Only work needed for testing, qualifying, and publishing this exact dependency set.
TOOLING = {
    ".github/workflows/a4-test-source-recovery.yml", ".github/workflows/a3-production-wif-qualification.yml",
    ".github/workflows/livepalmes-test-mail-sources.yml", "docs/releases/PROCEDURE.md", "docs/releases/EVOLUTIONS.md",
    "tools/a3-production-wif-qualification.py", "tools/a3-production-wif-consumers.js", "tools/release-cycle.py",
    "tools/verification-tests.json", "tools/publish-test-a4-dependencies.py", "tools/publish-test-mail-sources.py", "tools/production-delivery-identity.py",
    "tests/a3-production-wif-qualification-tests.py", "tests/a3-production-wif-consumers-tests.js",
}


def contract(release=RELEASE):
    c = plan()
    require(release == RELEASE, "Lot TEST inconnu")
    desired = cycle.test_backend_fingerprints(c["applicationCommit"])
    paths = cycle.git("diff", "--name-only", "--no-renames", c["applicationCommit"], "HEAD").splitlines()
    for name in paths:
        require(name in TOOLING or re.fullmatch(r"(?:tools|tests)/a4-[a-z0-9-]+\.(?:js|py)", name)
                or re.fullmatch(r"\.github/releases/evidence/20261119-a4-[a-z0-9-]+\.json", name),
                "Chemin supplÃ©mentaire hors candidat TEST A4 : " + name)
    return {**c, "_contractSha256": DIGEST, "toolingPaths": paths,
            "fingerprints": {n: desired[n] for n in c["installedNames"]}}


def guard(candidate, c, env=os.environ):
    require(env.get("GITHUB_REPOSITORY") == REPO and env.get("RELEASE") == RELEASE
            and env.get("GITHUB_WORKFLOW_REF") == f"{REPO}/{WORKFLOW}@refs/heads/main"
            and env.get("GITHUB_EVENT_NAME") == "workflow_dispatch" and not env.get("STANDARD_SOURCE_REQUEST"),
            "Contexte du parcours TEST A4 diffÃ©rent")
    sha = original_guard(candidate, c, env)
    changed = cycle.git("diff", "--name-only", c["baseCommit"], sha, "--", "functions").splitlines()
    require(sorted(changed) == c["changes"], "La livraison modifierait du code mÃ©tier")
    require(cycle.git("rev-parse", sha + ":functions") == cycle.git("rev-parse", c["applicationCommit"] + ":functions"),
            "Arbre serveur diffÃ©rent du candidat")
    for name in c["files"]:
        require(cycle.git("rev-parse", sha + ":" + name) == cycle.git("rev-parse", c["applicationCommit"] + ":" + name),
                "DÃ©pendance modifiÃ©e aprÃ¨s qualification")
    return sha


def baseline(c, directory):
    expected = original_baseline(c, directory)
    row = c["baselineRuns"][0]
    meta = cycle.gh(f"repos/{REPO}/actions/artifacts/{row['artifactId']}")
    require(meta.get("name") == "test-proof" and meta.get("digest") == "sha256:" + row["artifactSha256"]
            and meta.get("expired") is False and meta.get("workflow_run", {}).get("id") == row["id"]
            and expected["hosting"]["version"] == c["baselineHostingVersion"], "RÃ©fÃ©rence TEST non authentifiÃ©e")
    return expected


def select(before, candidate, c):
    names = c["installedNames"]
    recovery.check_inventory(before, names)
    previous = cycle.test_backend_fingerprints(c["baseCommit"])
    desired = cycle.test_backend_fingerprints(candidate)
    require(set(previous) == set(desired) and len(set(desired) - set(names)) == c["sourceOnly"]
            and all(desired[n] != previous[n] for n in desired), "SÃ©lection complÃ¨te des dÃ©pendances non dÃ©montrÃ©e")
    for function in before:
        name = function["name"].removeprefix(publisher.PREFIX)
        publisher.runtime(function, name)
        origin = function.get("labels", {}).get("livepalmes-commit", "")
        require(cycle.test_backend_fingerprints(origin)[name] == previous[name]
                and desired[name] == c["fingerprints"][name], "Ã‰cart mÃ©tier antÃ©rieur : " + name)
    return names


original_update = publisher.update_existing
stop_updates = Event()


def update_existing(previous, source, candidate):
    try:
        require(not stop_updates.is_set(), "Mises à jour arrêtées après échec")
        actual = publisher.state.request(publisher.state.API + previous["name"])
        require(publisher.compact([actual]) == publisher.compact([previous])
                and actual.get("labels") == previous.get("labels")
                and cycle.standard_sources.configuration(actual) == cycle.standard_sources.configuration(previous)
                and publisher.managed_source(actual) == publisher.managed_source(previous), "Dérive fraîche avant mise à jour TEST")
        require(not stop_updates.is_set(), "Mises à jour arrêtées pendant la relecture")
        original_update(actual, source, candidate)
    except BaseException:
        stop_updates.set()
        raise


publisher.update_existing = update_existing
publisher.ALLOWED = frozenset(plan()["installedNames"])
publisher.contract, publisher.guard = contract, guard
publisher.baseline, publisher.select = baseline, select


def main(mode, release, directory, candidate):
    require(mode in {"prepare", "deploy", "verify", "diagnostic"} and release == RELEASE, "Mode TEST A4 interdit")
    directory = Path(directory)
    backup_path = directory / "a4-source-recovery.json"
    if mode == "deploy":
        c = contract()
        sha = guard(Path(candidate), c)
        require(backup_path.read_bytes() == (directory / "reopened/a4-source-recovery.json").read_bytes(),
                "Le manifeste de sauvegarde TEST archivé est différent")
        saved = cycle.read(backup_path)
        require(saved["candidate"] == sha and saved["contractSha256"] == DIGEST
                and saved["run"] == int(os.environ["GITHUB_RUN_ID"])
                and saved["baselineRun"] == c["baselineRuns"][0]["id"]
                and set(saved["functions"]) == publisher.ALLOWED, "Sauvegarde TEST absente ou hors lot")
    publisher.main(mode, release, directory, candidate)
    if mode not in {"prepare", "verify"}:
        return
    sha = os.environ["GITHUB_SHA"]
    previous = cycle.read(directory / "before.json")
    if mode == "prepare":
        saved = recovery.capture(previous, publisher.ALLOWED, publisher, recovery.reader())
        require(publisher.inventory() == previous, "Sources TEST modifiÃ©es pendant la sauvegarde")
        cycle.write(backup_path, {"schema": 1, "contractSha256": DIGEST, "candidate": sha,
                    "run": int(os.environ["GITHUB_RUN_ID"]), "baselineRun": plan()["baselineRuns"][0]["id"],
                    "functions": saved})
        return
    saved = cycle.read(backup_path)
    proof = cycle.read(directory / "test-backend-proof.json")
    after = publisher.inventory()
    require(publisher.compact(after) == proof["state"]["functions"], "RÃ©visions TEST modifiÃ©es avant le contrÃ´le du retour")
    originals = {row["name"]: row for row in previous}
    for function in after:
        cycle.standard_sources.assert_selected(originals[function["name"]], function, sha,
            runtime_validator=lambda item: publisher.runtime(item, item["name"].removeprefix(publisher.PREFIX)))
    result = recovery.review(previous, after, saved["functions"], sha, publisher, recovery.reader())
    require(publisher.compact(publisher.inventory()) == proof["state"]["functions"]
            and publisher.controls() == proof["controlsAfter"], "DÃ©rive pendant la relecture du retour TEST")
    proof.update(rollback=result, backupSha256=publisher.digest(saved), baselineRun=saved["baselineRun"])
    cycle.write(directory / "test-backend-proof.json", proof)


def trusted_revisions(directory, current, api):
    c = plan()
    revisions = {r.get("commit") for r in current.get("functions", [])}
    runs = api.gh(f"repos/{REPO}/actions/workflows/livepalmes-test-mail-sources.yml/runs?branch=main&per_page=20")["workflow_runs"]
    for run in runs:
        sha = run.get("head_sha")
        if sha not in revisions or run.get("conclusion") != "success" or run.get("run_attempt") != 1:
            continue
        dest = Path(directory) / ("a4-sources-" + str(run["id"]))
        src = api.artifact(run["id"], "test-backend-proof", dest, WORKFLOW)
        proof = api.read(dest / "test-backend-proof.json")
        if proof.get("release") != RELEASE:
            continue
        require(src.get("event") == "workflow_dispatch" and src.get("head_branch") == "main"
                and src.get("status") == "completed" and src.get("conclusion") == "success"
                and src.get("run_attempt") == 1 and src.get("head_sha") == sha and src.get("path") == WORKFLOW
                and all(src.get(k, {}).get("full_name") == REPO for k in ("repository", "head_repository"))
                and proof.get("candidate") == sha and proof.get("contractSha256") == DIGEST
                and proof.get("applicationAnchor") == c["applicationCommit"] and proof.get("baselineRun") == c["baselineRuns"][0]["id"],
                "Provenance du reÃ§u A4 incorrecte")
        rows = proof["state"]["functions"]
        recovery.check_inventory(rows, publisher.ALLOWED)
        require(all(r.get("commit") == sha and r.get("state") == "ACTIVE" for r in rows)
                and proof["selected"] == c["installedNames"] and set(proof["managedSources"]) == publisher.ALLOWED
                and all(v.get("generationReadAndReferencesRechecked") is True and v.get("allPathsAndFileBytesIdentical") is True
                        for v in proof["managedSources"].values()), "Sources TEST A4 non attestÃ©es")
        initial = proof["controlsBefore"]
        require(all(proof.get(k) is True for k in ("controlsUnchanged", "mailSettingUnchanged", "pendingMessagesPreserved",
                    "configurationsUnchanged", "otherFunctionsUnchanged", "hostingUnchanged", "schedulerUnchanged", "queueUnchanged"))
                and proof["controlsAfter"] == initial and initial["mailEnabled"] is False and initial["queuePaused"] is True
                and initial["schedulerSuspended"] is True and proof["taskContentsRead"] is False, "TÃ©moins TEST A4 incomplets")
        api.artifact(run["id"], "a4-test-source-recovery-before", dest / "backup", WORKFLOW)
        saved = api.read(dest / "backup/a4-source-recovery.json")
        require(publisher.digest(saved) == proof["backupSha256"] and saved["run"] == run["id"] and saved["candidate"] == sha
                and saved["contractSha256"] == DIGEST and set(saved["functions"]) == publisher.ALLOWED
                and proof["rollback"] == {"verifiedGenerations": 121, "allArchivesReopened": True,
                "inverseMask": recovery.MASK, "restoreWrites": 0}, "Sauvegarde TEST A4 non dÃ©montrÃ©e")
        return api.matching_functions(proof, current)
    return set()


if __name__ == "__main__":
    main(*sys.argv[1:])
