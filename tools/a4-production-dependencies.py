"""Promote only the installed source revisions of the TEST-qualified A4 dependency set."""
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import subprocess
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
OPTION = "a4DependenciesRelease"
KIND = "a4-existing-dependency-sources-v1"
PREFIX = "projects/livepalmes/locations/europe-west1/functions/"
PLAN = ROOT / ".github/releases/evidence/20261119-a4-production-dependencies.json"
DIGEST = "66b29d96f6b2be30995817f380e4eac578b0755bd0323f6f2ba28b3551890cfa"
spec = importlib.util.spec_from_file_location("common_sources", ROOT / "tools/standard-source-policy.py")
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = PLAN.read_bytes().replace(b"\r\n", b"\n")
    require(hashlib.sha256(raw).hexdigest() == DIGEST, "Contrat A4 modifié")
    c = json.loads(raw)
    require(c["selected"] == sorted(set(c["selected"])) and len(c["selected"]) == 119
            and c["inventoryCount"] == 119 and c["sourceOnly"] == 38, "Périmètre PROD A4 différent")
    require(c["newFunctions"] == c["deletedFunctions"] == [] and c["configurationChanges"] is False
            and c["bindingChanges"] is False and set(c["controls"]) == common.CONTROL_KEYS
            and all(re.fullmatch("[0-9a-f]{64}", v) for v in c["controls"].values()),
            "Conservation des paramètres ou des témoins A4 non établie")
    source_profile = common.load("a4-publication-dependencies.py").plan()
    require(sorted(source_profile["files"]) == c["qualifiedFiles"] and source_profile["anchor"] == c["dependencyAnchor"]
            and common.load("a3-production-wif-qualification.py").contract()["dependencyQualificationRun"] == c["wifRun"],
            "Dépendances ou qualification des identités différentes")
    common.approval(c["approval"])
    return c


def enabled(request):
    return OPTION in request


def approved(request):
    if not enabled(request):
        return []
    c = contract()
    require(request == {**c["request"], OPTION: {"contractSha256": DIGEST}}, "Demande A4 différente du contrat")
    return c["selected"]


def paths(request, changed, git):
    approved(request)
    c = contract()
    require(digest(sorted(changed)) == c["changedPathsSha256"]
            and sorted(p for p in changed if p.startswith("functions/")) == ["functions/package-lock.json", "functions/package.json"],
            "Diff A4 hors qualification")
    for path in c["qualifiedFiles"]:
        require(git("rev-parse", c["candidate"] + ":" + path) == git("rev-parse", c["dependencyAnchor"] + ":" + path),
                "Manifeste de dépendances différent du TEST")


def expected_manifest(origins):
    c = contract()
    require(digest(origins) == c["originsSha256"] and sorted(row["name"] for row in origins) ==
            [PREFIX + name for name in c["selected"]], "Inventaire antérieur PROD différent")
    fields = ("candidate", "productionRun", "productionCommit", "productionHosting", "testRun", "selected",
              "controls", "inventoryCount", "approval", "staticPaths", "configurationChanges", "bindingChanges",
              "newFunctions", "deletedFunctions", "selectionProofSha256", "testSourcesRun", "testVerificationRun", "wifRun")
    return {**{k:c[k] for k in fields}, "schema":1, "kind":KIND, "contractSha256":DIGEST,
            "requestSha256":digest({**c["request"], OPTION:{"contractSha256":DIGEST}}),
            "origins":origins, "mailPause":False, "businessInvocations":0}


def validate_manifest(value):
    require(value == expected_manifest(value["origins"]), "Manifeste PROD A4 différent")
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    approved(request or json.loads((directory / "request.json").read_bytes()))
    return validate_manifest(json.loads((directory / "standard-source-manifest.json").read_bytes()))


def freeze(request, baseline, functions, selected, fingerprint, legacy, git, changed):
    paths(request, changed, git)
    c = contract()
    require(baseline == {"productionRun":c["productionRun"], "productionCommit":c["productionCommit"],
                         "source":"verified-publication-artifacts"}, "Référence PROD différente")
    origins = sorted(functions.values(), key=lambda row:row["name"])
    value = expected_manifest(origins)
    base, candidate = c["productionCommit"], c["candidate"]
    old, desired, conservative, raw_desired = fingerprint(base), fingerprint(candidate), legacy(base), legacy(candidate)
    require(set(old) == set(desired) == set(conservative) == set(raw_desired)
            and len(set(desired) - set(selected)) == c["sourceOnly"]
            and sorted(selected) == c["selected"], "Sélection PROD A4 incomplète")
    inherited = []
    for row in origins:
        name, origin = row["name"].removeprefix(PREFIX), row["commit"]
        actual, raw_origin = fingerprint(origin)[name], legacy(origin)[name]
        require(actual == old[name] and actual != desired[name] and raw_origin != raw_desired[name]
                and conservative[name] != raw_desired[name], "Origine antérieure ou dépendance différente pour " + name)
        if raw_origin != conservative[name]:
            inherited.append(dict(name=name, commit=origin, revision=row["revision"], legacyBefore=raw_origin,
                                  legacyAfter=conservative[name], optimizedBefore=actual, optimizedAfter=old[name]))
    data = dict(schema=1, project="livepalmes", candidate=base, rows=inherited)
    proof = json.loads(subprocess.check_output(["node", str(ROOT/"tools/admin-mfa-selection-proof.js")], input=json.dumps(data).encode()))
    require(digest(proof) == c["selectionProofSha256"], "Équivalence des anciennes sources non établie")
    return value


def runtime(function):
    name = function["name"].removeprefix(PREFIX)
    require(name in contract()["selected"] and function["name"] == PREFIX + name and function["state"] == "ACTIVE"
            and function["environment"] == "GEN_2" and function["buildConfig"]["runtime"] == "nodejs22"
            and function["buildConfig"]["entryPoint"] == name, "Fonction hors inventaire A4")


def initial(functions, value):
    common.initial(functions, validate_manifest(value), runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == contract()["candidate"], "Version différente du TEST A4")
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def guard(directory, after=False):
    directory = Path(directory)
    evidence = manifest(directory)
    if (directory / "previous").exists():
        resume_state(directory)
    observed = common.controls()
    require(observed == evidence["controls"], "Témoins mails, planificateur, file ou modèles différents")
    witness = directory / "standard-controls-before.json"
    if witness.exists():
        require(json.loads(witness.read_bytes()) == observed, "Témoins initiaux différents")
    else:
        require(not after, "Témoins initiaux absents")
        witness.write_text(json.dumps(observed))
    if after:
        (directory/"standard-controls-after.json").write_text(json.dumps(observed))


def test_evidence(directory, cycle):
    directory = Path(directory)
    c = contract()
    common_test = cycle.read(directory / "test-proof.json")
    require(common_test["candidate"] == c["candidate"], "Candidat TEST commun différent")
    source = common.load("publish-test-a4-dependencies.py")
    run = c["testSourcesRun"]
    dest = directory / "a4-dependency-test-receipts"
    owners = {"repository", "head_repository"}
    info = cycle.artifact(run, "test-backend-proof", dest, source.WORKFLOW)
    require(info["id"] == run and info["head_sha"] == c["candidate"] and info["path"] == source.WORKFLOW
            and info["head_branch"] == "main" and info["event"] == "workflow_dispatch" and info["run_attempt"] == 1
            and info["conclusion"] == "success" and all(info[k]["full_name"] == "ffessmnap/LivePalmes" for k in owners),
            "Origine du TEST dédié non authentifiée")
    source_file = dest / "test-backend-proof.json"
    require(hashlib.sha256(source_file.read_bytes()).hexdigest() == c["testSourceReceiptSha256"],
            "Reçu de déploiement TEST différent")
    receipt = cycle.read(source_file)
    source.verify_controls(receipt)
    require(receipt["release"] == source.RELEASE and receipt["contractSha256"] == source.DIGEST
            and receipt["applicationAnchor"] == c["dependencyAnchor"] and receipt["candidate"] == c["candidate"]
            and receipt["selected"] == source.plan()["installedNames"]
            and set(receipt["managedSources"]) == set(receipt["selected"])
            and all(r["allPathsAndFileBytesIdentical"] is True and r["generationReadAndReferencesRechecked"] is True
                    for r in receipt["managedSources"].values())
            and receipt["rollback"] == {"verifiedGenerations":121,"allArchivesReopened":True,
                                      "inverseMask":"build_config.source,labels","restoreWrites":0},
            "Qualification des archives ou du retour TEST incomplète")
    trusted = cycle.matching_functions(receipt, common_test["state"])
    require(trusted == {source.publisher.PREFIX+n for n in receipt["selected"]}
            and set(c["selected"]) <= set(receipt["selected"]), "Version TEST propre à chaque fonction non confirmée")


def rollback_guard(backup, after_report, observed, state, archives):
    backup = Path(backup)
    report = json.loads((backup / "report.json").read_bytes())
    value = validate_manifest(json.loads((backup / "standard-source-manifest.json").read_bytes()))
    saved = json.loads((backup / "functions.json").read_bytes())
    initial(saved, value)
    selected = {PREFIX + name for name in value["selected"]}
    require(report.get("sourcePolicyKind") == KIND and report["candidate"] == after_report["candidate"] == value["candidate"]
            and report["standardSourceManifestSha256"] == digest(value) and report["newFunctions"] == []
            and set(archives) == selected, "Sauvegarde inverse hors contrat A4")
    before = {f["name"]:f for f in saved}
    current = {f["name"]:f for f in observed}
    expected = {f["name"]:f for f in after_report["functions"]}
    require(set(before) == set(current) == set(expected) == selected and len(selected) == len(observed)
            and len(selected) == len(after_report["functions"]), "Inventaire du retour incomplet")
    for name, function in current.items():
        require(state.identity(function) == expected[name] and configuration(function) == configuration(before[name]),
                "Dérive avant retour A4")
        if state.identity(before[name]) != state.identity(function):
            assert_selected(before[name], function, value["candidate"])
        else:
            require(function.get("labels") == before[name].get("labels") and
                    function["buildConfig"]["source"] == before[name]["buildConfig"]["source"], "Origine non publiée différente")
    require(common.controls() == value["controls"], "Dérive des témoins avant retour")
    return value


def rollback_patch(previous, source):
    runtime(previous)
    return {"name":previous["name"], "buildConfig":{"source":{"storageSource":source}},
            "labels":previous.get("labels", {})}, "build_config.source,labels"


def assert_rollback(previous, restored):
    runtime(restored)
    require(restored["name"] == previous["name"] and configuration(restored) == configuration(previous)
            and restored.get("labels") == previous.get("labels"), "Retour A4 hors code ou labels")


def rollback_fresh(before, expected, actual, state):
    require(state.identity(actual) == state.identity(expected) and configuration(actual) == configuration(before)
            and actual.get("labels") == expected.get("labels")
            and actual["buildConfig"]["source"] == expected["buildConfig"]["source"], "Dérive avant restauration A4")


def verify_restored(before, archives, value, state):
    observed = state.inventory()
    require(len(observed) == len(before) == len(archives) and {r["name"] for r in observed} == set(before) == set(archives),
            "Inventaire de retour A4 incomplet")
    attest = common.load("standard-source-publish.py").attest
    for function in observed:
        name = function["name"]
        assert_rollback(before[name], function)
        if state.identity(function) != state.identity(before[name]):
            attest(function, archives[name].read_bytes(), state)
    require(common.controls() == value["controls"], "Témoins après retour A4 différents")

def validate_backup_generation(function, url, generation):
    name = function["name"].removeprefix(PREFIX)
    source = function["buildConfig"]["source"]["storageSource"]
    resolved = function["buildConfig"]["sourceProvenance"]["resolvedStorageSource"]
    bucket = "gcf-v2-sources-718081132564-europe-west1"
    object_name = source["object"]
    path = urllib.parse.unquote(url.path).lstrip("/")
    target = ((url.hostname == "storage.googleapis.com" and path == bucket + "/" + object_name)
              or (url.hostname == bucket + ".storage.googleapis.com" and path == object_name))
    require(function["name"] == PREFIX + name and source == resolved and source["bucket"] == bucket
            and re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*/function-source[.]zip", object_name)
            and str(source["generation"]).isdigit() and int(source["generation"]) > 0
            and generation == str(source["generation"]) and url.scheme == "https" and target,
            "Génération initiale PROD non démontrée pour " + name)


def verify_backup_inverse(backup, report, before, value):
    selected = {PREFIX + n for n in value["selected"]}
    require(set(before) == selected and report["sourcePolicyKind"] == KIND
            and report["standardSourceManifestSha256"] == digest(value), "Sauvegarde hors lot A4")
    checked = set()
    for entry in report["sources"]:
        names = entry["functions"]
        require(names and all(PREFIX + n in selected for n in names), "Archive initiale hors fonction")
        path = Path(backup) / "sources" / (names[0] + ".zip")
        require(path.is_file() and not path.is_symlink() and path.stat().st_size <= 64 * 1024**2
                and hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"], "Archive de retour altérée")
        for short_name in names:
            name = PREFIX + short_name
            previous = before[name]
            require(name not in checked and entry["source"] == previous["buildConfig"]["source"]["storageSource"],
                    "Archive initiale en double ou source différente")
            body, mask = rollback_patch(previous, entry["source"])
            require(mask == "build_config.source,labels" and body == {"name":name,
                    "buildConfig":{"source":previous["buildConfig"]["source"]}, "labels":previous["labels"]},
                    "Inverse des sources ou des labels différent")
            checked.add(name)
    require(checked == selected, "Sauvegarde A4 incomplète")


def state_dispatch(args):
    mode, directory, destination, *outcome = args
    backup, after = Path(directory), Path(destination)
    require(json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_bytes()).get("project_id") == "livepalmes",
            "Identité PROD requise")
    report = json.loads((backup / "report.json").read_bytes())
    value = validate_manifest(json.loads((backup / "standard-source-manifest.json").read_bytes()))
    selected = {PREFIX + name for name in value["selected"]}
    require(report["candidate"] == value["candidate"] and report.get("sourcePolicyKind") == KIND
            and report["standardSourceManifestSha256"] == digest(value) and report["newFunctions"] == []
            and len(report["functions"]) == len(selected) and {row["name"] for row in report["functions"]} == selected,
            "Rapport A4 hors contrat")
    state = common.load("production-release-state.py")
    if mode in {"hosting-state", "hosting-rollback"} and not outcome:
        if mode == "hosting-rollback":
            require(json.loads((backup / "hosting.json").read_bytes())["version"]["name"] == value["productionHosting"],
                    "Version Hosting de retour différente")
        return state.hosting(backup, after, mode == "hosting-rollback")
    saved = json.loads((backup / "functions.json").read_bytes())
    initial(saved, value)
    before = {row["name"]: row for row in saved}
    observed = state.inventory()
    if mode == "check" and outcome in (["success"], ["failure"]):
        errors = []
        try:
            require(len(observed) == len(selected) and {row["name"] for row in observed} == selected,
                    "Inventaire final A4 différent")
            for row in observed:
                assert_selected(before[row["name"]], row, value["candidate"])
            require(common.controls() == value["controls"], "Témoins après publication différents")
        except ValueError as error:
            errors.append(str(error))
        after.write_text(json.dumps({"candidate":value["candidate"], "functions":[state.identity(row) for row in observed],
                                      "errors":errors}, indent=2), encoding="utf-8")
        require(not errors or outcome == ["failure"], "Contrôle final A4 en échec")
        return
    require(mode in {"rollback", "validate-rollback"} and not outcome, "Mode de retour A4 inconnu")
    verify_backup_inverse(backup, report, before, value)
    archives = {PREFIX + name:backup / "sources" / (entry["functions"][0] + ".zip")
                for entry in report["sources"] for name in entry["functions"]}
    rollback_guard(backup, json.loads(after.read_bytes()), observed, state, archives)
    current = {row["name"]:row for row in observed}
    original = state.request
    # Reuse the same source-only transport as the qualified optional access release.
    narrow = common.load("optional-access-production-policy.py").narrow_rollback_request(state, original, selected)
    def guarded_request(url, method="GET", body=None):
        if method == "PATCH":
            name = body["name"]
            require(name in selected, "Cible de retour inconnue")
            rollback_fresh(before[name], current[name], original(state.API + name), state)
        require(method in {"GET", "POST", "PATCH"}, "Opération de retour interdite")
        return narrow(url, method, body)
    state.request = guarded_request
    state.rollback_patch = lambda previous, source: rollback_patch(previous, source)[0]
    apply = mode == "rollback"
    state.rollback(backup, after, apply)
    if apply:
        verify_restored(before, archives, value, state)


# Conditional recovery of the single interrupted A4 production release.
SOURCE_RUN = "44614884453"
SOURCE_CONTROLLER = "c0be1b62494881523f8c64b5a79f07aabb450aa5"
AFTER_DIGEST = "9caac5ba21319b4d63227b2b1b306f4bc4b7a7678f3d4a5cf60795a0e28c0db2"
UPDATED_NAMES_DIGEST = "c733b1da68559e8dbd25dc1e43add07b5bac0494656720fee16be73c9cfa8b85"
SOURCE_ARTIFACTS = {
    "production-after":"a5dbc76ac93bfa61c1a767c12429b46ea04c59f5d1f885e944302fa7940cc1c3",
    "release-plan":"8fef76dcb1fb91b12becf7c923a5afd9f11bc5abe43169ca5074bc5e7f88daf4",
    "production-code-backup":"8eb7aa5a05308e4de5df48329b1e754143ad9016e3a584e6bb34f9e045fa3fc7",
    "production-idf-preservation":"a93453d5b22411508bbc41c3a4c6b525fea2614e124413f75a7dbb33cd9cae99"
}


def resume_state(directory):
    directory = Path(directory)
    require(os.environ.get("RESUME") == SOURCE_RUN and os.environ.get("GITHUB_REF") == "refs/heads/main"
            and os.environ.get("GITHUB_RUN_ATTEMPT") == "1"
            and os.environ.get("GITHUB_WORKFLOW_REF") ==
            "ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main",
            "Reprise hors publication A4 autorisée")
    value = manifest(directory)
    previous = json.loads((directory / "previous/production-after.json").read_bytes())
    require(digest(previous) == AFTER_DIGEST and previous["candidate"] == value["candidate"]
            and not (directory / "previous/production-hosting-after.json").exists(), "Relevé initial de reprise différent")
    rows = {row["name"]: row for row in previous["functions"]}
    origins = {row["name"]: row for row in value["origins"]}
    require(len(rows) == len(previous["functions"]) == len(origins) == 119 and set(rows) == set(origins),
            "Inventaire initial de reprise différent")
    updated = {name for name, row in rows.items() if row["revision"] != origins[name]["revision"]}
    require(len(updated) == 17 and digest(sorted(updated)) == UPDATED_NAMES_DIGEST
            and all(row["state"] == "ACTIVE" and (row["updateTime"] != origins[name]["updateTime"]) == (name in updated)
                    for name, row in rows.items()), "Répartition initiale des révisions différente")
    return rows, updated


def restore_witness(directory, source):
    directory, source = Path(directory), Path(source)
    resume_state(directory)
    value = manifest(directory)
    require(source == directory / "previous/standard-guards" and
            json.loads((source / "standard-source-manifest.json").read_bytes()) == value
            and json.loads((source / "standard-controls-before.json").read_bytes()) ==
                json.loads((source / "standard-controls-after.json").read_bytes()) == value["controls"],
            "Témoins de la tentative A4 différents")
    (directory / "standard-controls-before.json").write_bytes((source / "standard-controls-before.json").read_bytes())


def qualify_recovery(directory, resume, info, artifacts, selected):
    directory = Path(directory)
    resume_state(directory)
    require(resume == SOURCE_RUN and info["id"] == int(SOURCE_RUN) and info["head_sha"] == SOURCE_CONTROLLER
            and info["event"] == "workflow_dispatch" and info["path"] == ".github/workflows/livepalmes-production-release.yml"
            and info["head_branch"] == "main" and info["status"] == "completed" and info["run_attempt"] == 1
            and info["conclusion"] == "failure" and all(info[k]["full_name"] == "ffessmnap/LivePalmes"
                for k in ("repository","head_repository")) and sorted(selected) == manifest(directory)["selected"],
            "Origine de la reprise A4 non qualifiée")
    for name, expected in SOURCE_ARTIFACTS.items():
        matches = [a for a in artifacts if a["name"] == name]
        require(len(matches) == 1 and not matches[0]["expired"] and matches[0]["digest"] == "sha256:" + expected,
                "Archive initiale A4 inconnue")
    require((directory / "encrypted/code-backup-context.json").is_file()
            and not any(a["name"] == "production-hosting-after" for a in artifacts), "Sauvegarde V2 ou état Hosting différent")


def check_recovery_archives(directory, before, current, pending, data, state, attest):
    expected, updated = resume_state(directory)
    require(len(pending) == 102 and set(pending) == set(expected) - updated and set(current) == set(before) == set(expected),
            "Les seules 102 révisions en attente sont requises")
    candidate = contract()["candidate"]
    for name, row in current.items():
        require(state.identity(row) == expected[name], "Révision modifiée avant reprise A4")
        if name in updated:
            assert_selected(before[name], row, candidate)
        else:
            require(state.identity(row) == state.identity(before[name]) and
                    configuration(row) == configuration(before[name]) and row.get("labels") == before[name].get("labels")
                    and row["buildConfig"]["source"] == before[name]["buildConfig"]["source"], "Origine en attente différente")
    receipts = {name:attest(current[name], data, state) for name in sorted(updated)}
    require(all(receipt["identity"] == expected[name] and receipt["generationReadAndReferencesRechecked"] is True
                and receipt["allPathsAndFileBytesIdentical"] is True for name,receipt in receipts.items()),
            "Archive déjà publiée non conforme")
    fresh = state.inventory()
    require(len(fresh) == len(expected) and {f["name"]:state.identity(f) for f in fresh} == expected
            and common.controls() == contract()["controls"], "Dérive pendant la relecture des archives A4")
    (Path(directory) / "standard-a4-recovery-before.json").write_text(json.dumps({
        "sourceRun":int(SOURCE_RUN), "candidate":candidate, "verified":receipts, "pending":sorted(pending)
    }), encoding="utf-8")
