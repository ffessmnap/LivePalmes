"""A4 selection, source-only writes and inherited business code."""
import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("a4_publish", ROOT / "tools/publish-test-a4-dependencies.py")
a4 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(a4)


class DependencyScope(unittest.TestCase):
    def setUp(self):
        self.names = a4.plan()["installedNames"][:2]
        self.all = self.names + ["sourceOnlyFixture"]
        self.old = {n: "before" for n in self.all}
        self.new = {n: "after" for n in self.all}
        self.c = {"installedNames": self.names, "sourceOnly": 1, "baseCommit": "base",
                  "fingerprints": {n: self.new[n] for n in self.names}}
        self.rows = [{"name": a4.publisher.PREFIX + n, "state": "ACTIVE", "environment": "GEN_2", "labels": {"livepalmes-commit": "old"},
                      "buildConfig": {"runtime": "nodejs22", "entryPoint": n}} for n in self.names]

    def select(self, origin):
        values = {"base": self.old, "candidate": self.new, "old": origin}
        with patch.object(a4.cycle, "test_backend_fingerprints", side_effect=values.__getitem__):
            return a4.select(self.rows, "candidate", self.c)

    def test_selection_covers_all_installed_but_does_not_create(self):
        self.assertEqual(self.select(self.old), self.names)

    def test_pending_business_change_or_wrong_runtime_fails(self):
        changed = {**self.old, self.names[0]: "other"}
        with self.assertRaises(ValueError):
            self.select(changed)
        self.rows[0]["buildConfig"]["runtime"] = "nodejs24"
        with self.assertRaises(ValueError):
            self.select(self.old)

    def test_stops_before_patch_on_fresh_drift(self):
        previous = self.rows[0]
        actual = copy.deepcopy(previous)
        actual["labels"]["livepalmes-commit"] = "different"
        a4.stop_updates.clear()
        try:
            with patch.object(a4.publisher.state, "request", return_value=actual) as read, patch.object(a4, "original_update") as update:
                for _ in range(2):
                    with self.assertRaises(ValueError):
                        a4.update_existing(previous, {}, "candidate")
                self.assertEqual(read.call_count, 1)
                update.assert_not_called()
        finally:
            a4.stop_updates.clear()


if __name__ == "__main__":
    unittest.main()
