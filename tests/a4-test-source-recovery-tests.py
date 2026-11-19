"""Offline cases for the read-only TEST rollback discovery."""
import hashlib
import importlib.util
from pathlib import Path
from unittest import TestCase, main, mock
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("a4_probe", ROOT / "tools/a4-test-source-recovery.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class SourceDiscovery(TestCase):
    def setUp(self):
        self.names = sorted("fixture" + str(i) for i in range(121))
        self.rows = [{"name": probe.PREFIX + n, "state": "ACTIVE", "serviceConfig": {"revision": "r1"},
                      "buildConfig": {"entryPoint": n, "runtime": "nodejs22", "source": {"storageSource": {
                          "bucket": probe.BUCKET, "object": n + "/function-source.zip", "generation": "7"}}}}
                     for n in self.names]
        self.permissions = list(probe.PERMISSIONS)
        self.calls = []
        digest = hashlib.sha256("\n".join(self.names).encode()).hexdigest()
        patched = mock.patch.object(probe, "INVENTORY_HASH", digest)
        patched.start()
        self.addCleanup(patched.stop)

    def fetch(self, url, optional=False):
        self.calls.append(url)
        if url.startswith("https://cloudfunctions.googleapis.com/"):
            return {"functions": self.rows}
        self.assertTrue(url.startswith(probe.BUCKET_URL))
        if "/iam/testPermissions?" in url:
            return {"permissions": self.permissions}
        if "/o/" not in url:
            return {"name": probe.BUCKET, "versioning": {"enabled": True}}
        parsed = urlsplit(url)
        self.assertEqual(parse_qs(parsed.query), {"fields": ["bucket,name,generation,size,crc32c"], "generation": ["7"]})
        return {"bucket": probe.BUCKET, "name": unquote(parsed.path.split("/o/")[1]),
                "generation": "7", "size": "123", "crc32c": "AAAAAA=="}

    def test_inventory_and_generations(self):
        report = probe.collect(self.fetch)
        self.assertEqual(report["generationsRead"], 121)
        self.assertEqual(len(self.calls), 124)
        self.assertFalse(report["sourceContentsRead"])
        self.assertFalse(report["deployment"])

    def test_missing_access_never_becomes_a_positive_receipt(self):
        self.permissions = []
        result = probe.collect(self.fetch)
        self.assertEqual(result["generationsRead"], 0)
        self.assertEqual(len(self.calls), 2)

    def test_foreign_source_and_replaced_function_fail_before_storage(self):
        self.rows[0]["buildConfig"]["source"]["storageSource"]["bucket"] = "other"
        with self.assertRaises(ValueError):
            probe.collect(self.fetch)
        self.assertEqual(len(self.calls), 1)
        self.rows[0] = self.rows[1]
        with self.assertRaises(ValueError):
            probe.collect(self.fetch)
        self.assertEqual(len(self.calls), 2)


if __name__ == "__main__":
    main()
