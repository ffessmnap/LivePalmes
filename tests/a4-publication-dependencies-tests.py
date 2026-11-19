"""A4 fixture tests keep qualification separate from the live publication identity."""
import hashlib
import importlib.util
import json
from types import SimpleNamespace
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("a4_dependencies", ROOT / "tools/a4-publication-dependencies.py")
a4 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(a4)


class DependencyQualification(unittest.TestCase):
    def test_both_plans_have_distinct_dependency_profiles(self):
        plan, legacy = a4.plan(), a4.legacy()
        raw = legacy.PLAN.read_bytes().replace(b"\r\n", b"\n")
        self.assertEqual(hashlib.sha256(raw).hexdigest(), legacy.DIGEST)
        historical = json.loads(raw)
        active = legacy.contract()
        self.assertEqual({k: active[k] for k in plan["profile"]}, plan["profile"])
        self.assertEqual(active["accounts"], historical["accounts"])
        self.assertEqual(active["allowedWorkflows"], historical["allowedWorkflows"])
        self.assertEqual(active["allowedAudiences"], historical["allowedAudiences"])
        self.assertEqual(active["newBindings"], historical["newBindings"])
        self.assertEqual(plan["publicationPlanSha256"], legacy.DIGEST)
        self.assertEqual(set(plan["files"]), a4.PATHS)
        for name in ["functions/package-lock.json", "tests/firestore-rules/package-lock.json"]:
            self.assertNotEqual(plan["files"][name], historical["readerPins"][name])
        self.assertEqual(plan["profile"]["nodeVersion"], historical["nodeVersion"])
        self.assertNotEqual(plan["profile"]["adminVersion"], historical["adminVersion"])

    def test_active_contract_rejects_drift_in_a_manifest_or_in_either_receipt(self):
        spec = importlib.util.spec_from_file_location("active_a4", ROOT / "tools/a4-active-publication-profile.py")
        active = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(active)
        legacy = a4.legacy()
        base = json.loads(legacy.PLAN.read_bytes())
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in a4.PATHS:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes((ROOT / name).read_bytes())
            active.verified(base, legacy.DIGEST, root)
            for name in sorted(a4.PATHS):
                file = root / name
                original = file.read_bytes()
                file.write_bytes(original + b"x")
                with self.subTest(name=name), self.assertRaises(ValueError):
                    active.verified(base, legacy.DIGEST, root)
                file.write_bytes(original)
            with patch.object(active, "RECEIPT_SHA", "0" * 64), self.assertRaises(ValueError):
                active.verified(base, legacy.DIGEST, root)
            proof = json.loads((active.EVIDENCE / active.RECEIPT).read_bytes())
            for kind in ("hosting", "backend"):
                with self.subTest(kind=kind):
                    for name in (active.PROFILE, active.RECEIPT):
                        (root / name).write_bytes((active.EVIDENCE / name).read_bytes())
                    report = json.loads(json.dumps(proof))
                    report["artifacts"][kind]["report"]["renewedAfterRealExpiry"] = False
                    (root / active.RECEIPT).write_text(json.dumps(report))
                    with patch.object(active, "EVIDENCE", root), patch.object(active, "RECEIPT_SHA", active.digest(root / active.RECEIPT)), self.assertRaises(ValueError):
                        active.verified(base, legacy.DIGEST, root)

    def test_staging_reads_only_the_four_exact_blobs_and_rejects_drift(self):
        files = {name: name.encode() for name in a4.PATHS}
        sample = {"anchor": "a" * 40, "files": {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}}
        def read(args, cwd):
            self.assertEqual(cwd, a4.ROOT)
            self.assertEqual(args[:2], ["git", "show"])
            anchor, name = args[2].split(":")
            self.assertEqual(anchor, sample["anchor"])
            return files[name]
        with tempfile.TemporaryDirectory() as temp, patch.object(a4.subprocess, "check_output", side_effect=read) as blobs:
            target = Path(temp) / "staged"
            a4.stage(target, sample)
            self.assertEqual(blobs.call_count, 4)
            with self.assertRaises(FileExistsError):
                a4.stage(target, sample)
            (target / "functions/package-lock.json").write_text("{}")
            with self.assertRaises(ValueError):
                a4.verify(target, sample)
            with self.assertRaises(ValueError):
                a4.stage(Path(temp) / "invalid", {**sample, "files": {"functions/package.json": "0" * 64}})

    def test_completed_checks_produce_a_receipt_for_each_account(self):
        runner = a4.legacy()
        profile = a4.plan()["profile"]
        with tempfile.TemporaryDirectory() as folder:
            temporary = Path(folder).resolve()
            for kind in ("hosting", "backend"):
                context = {"kind": kind, "account": "fixture-" + kind, "provider": "fixture-provider"}
                def prepare(env, directory):
                    original, adc = directory / "fixture-original", directory / "fixture-copy"
                    original.write_bytes(b"fixture")
                    adc.write_text("{}")
                    return context, original, b"fixture", adc, {}
                def command(argv, **options):
                    value = profile if argv[-1] == "--profile" else {"Google Cloud SDK": "593.0.0"}
                    return SimpleNamespace(stdout=json.dumps(value).encode())
                def child(argv, env, directory):
                    self.assertTrue(argv[1].endswith("a4-publication-consumers.js"))
                    result = {"kind": kind, "renewedAfterRealExpiry": True, "sdkCredentialsRenewed": 2,
                              "cliReads": 2, "publicationInvocations": 0, "tokensExported": False,
                              "waitedMilliseconds": 610000, **profile}
                    (directory / "consumer-report.json").write_text(json.dumps(result))
                destination = temporary / (kind + ".json")
                with self.subTest(kind=kind), patch.object(runner, "context", return_value=context), \
                     patch.object(runner, "prepare", side_effect=prepare), patch.object(runner, "child", side_effect=child), \
                     patch.object(runner, "gcloud_read", return_value={"fixture": kind}), \
                     patch.object(runner.subprocess, "run", side_effect=command):
                    runner.main(destination, {"RUNNER_TEMP": str(temporary)}, dependency_profile=profile,
                                dependency_directory=temporary / "a4-publication-dependencies")
                    report = json.loads(destination.read_text())
                    self.assertEqual(report["kind"], kind)
                    self.assertEqual(report["sourceHashes"]["tools/a4-publication-consumers.js"],
                                     runner.sha((ROOT / "tools/a4-publication-consumers.js").read_bytes().replace(b"\r\n", b"\n")))
                    self.assertEqual(report["publicationInvocations"], 0)

    def test_altered_qualification_plan_is_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "plan.json"
            path.write_text("{}")
            with patch.object(a4, "PLAN", path), self.assertRaises(ValueError):
                a4.plan()


if __name__ == "__main__":
    unittest.main()
