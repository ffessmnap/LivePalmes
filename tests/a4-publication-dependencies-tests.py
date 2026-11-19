"""A4 fixture tests keep qualification separate from the live publication identity."""
import hashlib
import importlib.util
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
        historical = legacy.contract()
        self.assertEqual(plan["publicationPlanSha256"], legacy.DIGEST)
        self.assertEqual(set(plan["files"]), a4.PATHS)
        for name in ["functions/package-lock.json", "tests/firestore-rules/package-lock.json"]:
            self.assertNotEqual(plan["files"][name], historical["readerPins"][name])
        self.assertEqual(plan["profile"]["nodeVersion"], historical["nodeVersion"])
        self.assertNotEqual(plan["profile"]["adminVersion"], historical["adminVersion"])

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

    def test_altered_qualification_plan_is_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "plan.json"
            path.write_text("{}")
            with patch.object(a4, "PLAN", path), self.assertRaises(ValueError):
                a4.plan()


if __name__ == "__main__":
    unittest.main()
