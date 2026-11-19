"""Check the round trip and the failure cases of the TEST version references."""
import copy
import importlib.util
import io
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("a4_backup", ROOT / "tools/a4-test-dependency-backup.py")
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class Recovery(unittest.TestCase):
    def setUp(self):
        self.bucket = {"name": backup.BUCKET, "versioning": {"enabled": True}, "lifecycle": {"rule": [
            {"action": {"type": "Delete"}, "condition": {"isLive": False, "numNewerVersions": 3}}]}}
        self.file = io.BytesIO()
        with zipfile.ZipFile(self.file, "w") as archive:
            archive.writestr("index.js", "exports.fixture=42;")
        self.source = {"bucket": backup.BUCKET, "object": "fixture/function-source.zip", "generation": "12"}
        self.previous = {"name": backup.PREFIX + "fixture", "state": "ACTIVE", "labels": {"livepalmes-commit": "a"*40, "owner": "test"},
                         "updateTime": "1", "serviceConfig": {"revision": "r1"}, "source": self.source, "setting": "stable"}
        self.current = copy.deepcopy(self.previous)
        self.current.update(labels={**self.previous["labels"], "livepalmes-commit": "b"*40}, updateTime="2",
                            serviceConfig={"revision": "r2"}, source={**self.source, "generation": "13"})
        self.publisher = SimpleNamespace(managed_source=lambda f: f["source"], configuration_identity=lambda f: f["setting"],
                                         archive_identity=lambda raw: zipfile.ZipFile(io.BytesIO(raw)).read("index.js").hex())

    def read(self, url, maximum):
        if "/o/" not in url:
            self.assertEqual(url, backup.BUCKET_URL + "?fields=name,versioning,lifecycle")
            return json.dumps(self.bucket).encode(), None
        self.assertEqual(url, backup.BUCKET_URL + "/o/fixture%2Ffunction-source.zip?generation=12&alt=media")
        return self.file.getvalue(), "12"

    def capture(self):
        return backup.capture([self.previous], {"fixture"}, self.publisher, self.read)

    def test_reopen_and_prepare_exact_inverse(self):
        saved = self.capture()
        result = backup.review([self.previous], [self.current], saved, "b"*40, self.publisher, self.read)
        self.assertEqual(result["verifiedGenerations"], 1)
        self.assertEqual(result["restoreWrites"], 0)

    def test_conditions_which_can_delete_the_previous_source_fail(self):
        for condition in [{"isLive": False, "numNewerVersions": 1}, {"age": 1}, {"isLive": True, "numNewerVersions": 3}]:
            with self.subTest(condition=condition):
                self.bucket["lifecycle"]["rule"][0]["condition"] = condition
                with self.assertRaises(ValueError):
                    self.capture()

    def test_foreign_generation_labels_configuration_or_revision_fails(self):
        row = self.capture()["fixture"]
        for field, replacement in [("labels", {"livepalmes-commit": "b"*40, "owner": "other"}),
                                   ("setting", "different"), ("serviceConfig", {"revision": "different"}),
                                   ("state", "FAILED")]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                backup.inverse({**self.current, field: replacement}, row, "b"*40, "r2", self.publisher.configuration_identity)
        with self.assertRaises(ValueError):
            backup.read_source("fixture", self.source, lambda url, maximum: (b"bytes", "14"), lambda raw: "unused")
        with self.assertRaises(ValueError):
            backup.read_source("fixture", {**self.source, "bucket": "foreign"}, self.read, lambda raw: "unused")


class WorkflowBackup(unittest.TestCase):
    def test_reopens_the_uploaded_id_in_this_run_before_the_publisher(self):
        import json
        import subprocess
        root = Path(__file__).resolve().parents[1]
        js = "const fs=require('fs'),yaml=require('./tests/firestore-rules/node_modules/yaml');console.log(JSON.stringify(yaml.parse(fs.readFileSync('.github/workflows/livepalmes-test-mail-sources.yml','utf8')).jobs.sources.steps))"
        steps = json.loads(subprocess.check_output(["node", "-e", js], cwd=root))
        upload = next(i for i, step in enumerate(steps) if step.get("id") == "a4_backup")
        download = next(i for i, step in enumerate(steps) if "artifact-ids" in step.get("with", {}))
        deploy = next(i for i, step in enumerate(steps) if ' deploy "$RELEASE"' in step.get("run", ""))
        self.assertLess(upload, download)
        self.assertLess(download, deploy)
        self.assertEqual(steps[upload]["with"]["name"], "a4-test-source-recovery-before")
        self.assertEqual(steps[download]["uses"], "actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093")
        self.assertEqual(steps[download]["with"], {"artifact-ids": "${{ steps.a4_backup.outputs.artifact-id }}",
                         "path": "${{ runner.temp }}/test-mail-sources/reopened", "merge-multiple": True})
        self.assertIn("steps.a4_backup.outputs.artifact-id != ''", steps[download]["if"])


if __name__ == "__main__":
    unittest.main()
