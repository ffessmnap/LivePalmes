import importlib.util
import io
from pathlib import Path
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("preflight", Path(__file__).parents[1] / "tools/preflight-production-release.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceArchiveTests(unittest.TestCase):
    def archive(self, name, value=b"secret-never-in-report"):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr(name, value)
        return buffer.getvalue()

    def test_only_hashes_are_returned(self):
        manifest = module.archive_manifest(self.archive("index.js"))
        self.assertEqual(len(manifest["index.js"]), 64)
        self.assertNotIn("secret-never-in-report", str(manifest))

    def test_unsafe_paths_rejected(self):
        for path in ["../index.js", "/index.js", "folder/../../secret", "folder\\secret"]:
            with self.assertRaises(ValueError):
                module.archive_manifest(self.archive(path))


if __name__ == "__main__":
    unittest.main()
