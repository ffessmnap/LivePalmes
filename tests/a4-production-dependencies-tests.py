"""Verify the A4 source-only backup and inverse on offline fixtures."""
import copy
import hashlib
import json
import importlib.util
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("a4_prod", ROOT / "tools/a4-production-dependencies.py")
a4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a4)


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.bucket = "gcf-v2-sources-718081132564-europe-west1"
        self.source = {"bucket": self.bucket, "object": "One/function-source.zip", "generation": "61"}
        self.value = {"selected": ["One", "Two"]}
        self.before = {}
        for name in self.value["selected"]:
            full = a4.PREFIX + name
            self.before[full] = {"name": full, "environment": "GEN_2", "state": "ACTIVE",
                                 "buildConfig": {"runtime": "nodejs22", "entryPoint": name,
                                                 "source": {"storageSource": self.source},
                                                 "sourceProvenance": {"resolvedStorageSource": self.source}},
                                 "serviceConfig": {"revision": "fixture-1", "timeoutSeconds": 60},
                                 "labels": {"livepalmes-commit": "a" * 40}}

    def test_only_the_exact_validated_request_and_two_server_manifests_are_allowed(self):
        c = a4.contract()
        request = {**c["request"], a4.OPTION: {"contractSha256": a4.DIGEST}}
        self.assertEqual(len(a4.approved(request)), 119)
        self.assertEqual(a4.approved({}), [])
        for wrong in ({**request, "candidate":"0" * 40}, {**request, "extra":True},
                      {**request, a4.OPTION:{"contractSha256":"0" * 64}}):
            with self.assertRaises(ValueError):
                a4.approved(wrong)
        with self.assertRaises(ValueError):
            a4.paths(request, ["functions/index.js"], lambda *args: "fixture")

    def test_backup_checks_generation_object_and_host(self):
        f = self.before[a4.PREFIX + "One"]
        for url in (f"https://storage.googleapis.com/{self.bucket}/One/function-source.zip",
                    f"https://{self.bucket}.storage.googleapis.com/One/function-source.zip"):
            a4.validate_backup_generation(f, urlsplit(url), "61")
            with self.assertRaises(ValueError):
                a4.validate_backup_generation(f, urlsplit(url), "62")
        for url in (f"https://other.invalid/{self.bucket}/One/function-source.zip",
                    f"https://storage.googleapis.com/{self.bucket}/Two/function-source.zip"):
            with self.assertRaises(ValueError):
                a4.validate_backup_generation(f, urlsplit(url), "61")

    def test_reopens_shared_backup_and_rejects_missing_extra_or_modified_sources(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(a4, "contract", return_value=self.value):
            path = Path(directory) / "sources/One.zip"
            path.parent.mkdir()
            data = b"opaque-test-archive"
            path.write_bytes(data)
            entry = {"functions": ["One", "Two"], "source": self.source, "sha256": hashlib.sha256(data).hexdigest()}
            report = {"sourcePolicyKind": a4.KIND, "standardSourceManifestSha256": a4.digest(self.value), "sources": [entry]}
            a4.verify_backup_inverse(directory, report, self.before, self.value)
            for names in (["One"], ["One", "Two", "Two"], ["One", "Foreign"]):
                with self.assertRaises(ValueError):
                    a4.verify_backup_inverse(directory, {**report, "sources": [{**entry, "functions": names}]}, self.before, self.value)
            path.write_bytes(b"changed")
            with self.assertRaises(ValueError):
                a4.verify_backup_inverse(directory, report, self.before, self.value)

    def test_state_router_records_confirmed_revisions_and_blocks_inventory_drift(self):
        router = a4.common.load("direct-csp-production-state.py")
        value = {**self.value, "candidate":"b" * 40, "controls":{"mail":"fixture"}}
        report = {"candidate":value["candidate"], "standardSourceManifestSha256":a4.digest(value),
                  "sourcePolicyKind":a4.KIND, "newFunctions":[], "functions":list(self.before.values())}
        current = copy.deepcopy(list(self.before.values()))
        for row in current:
            row["labels"]["livepalmes-commit"] = value["candidate"]
            row["updateTime"] = "fixture-updated"
            row["serviceConfig"]["revision"] = "fixture-2"
        frozen = a4.common.load("production-release-state.py")
        state = SimpleNamespace(inventory=lambda:current, identity=frozen.identity)
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            for filename, data in {"identity.json":{"project_id":"livepalmes"}, "report.json":report,
                                   "standard-source-manifest.json":value, "functions.json":list(self.before.values())}.items():
                (root / filename).write_text(json.dumps(data))
            args = ["check", d, str(root / "after.json"), "success"]
            with patch.dict(a4.os.environ, GOOGLE_APPLICATION_CREDENTIALS=str(root / "identity.json")), \
                 patch.object(router, "load", return_value=a4), patch.object(a4, "contract", return_value=value), \
                 patch.object(a4, "validate_manifest", return_value=value), patch.object(a4, "initial"), \
                 patch.object(a4.common, "controls", return_value=value["controls"]), patch.object(a4.common, "load", return_value=state):
                router.dispatch(args)
                final = json.loads((root / "after.json").read_bytes())
                self.assertEqual(final["errors"], [])
                self.assertEqual(final["functions"], [state.identity(row) for row in current])
                current.pop()
                with self.assertRaises(ValueError):
                    router.dispatch(args)
                router.dispatch([*args[:-1], "failure"])
                self.assertTrue(json.loads((root / "after.json").read_bytes())["errors"])

    def test_inverse_restores_only_the_previous_labels_and_code(self):
        previous = self.before[a4.PREFIX + "One"]
        with patch.object(a4, "contract", return_value=self.value):
            body, mask = a4.rollback_patch(previous, self.source)
            self.assertEqual(mask, "build_config.source,labels")
            self.assertEqual(body, {"name": previous["name"], "buildConfig": {"source": previous["buildConfig"]["source"]}, "labels": previous["labels"]})
            a4.assert_rollback(previous, copy.deepcopy(previous))
            for field in ("serviceConfig", "labels"):
                changed = copy.deepcopy(previous)
                changed[field]["fixture"] = "different"
                with self.assertRaises(ValueError):
                    a4.assert_rollback(previous, changed)


if __name__ == "__main__":
    unittest.main()
