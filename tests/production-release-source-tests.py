import importlib.util
import io
from pathlib import Path
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("preflight", Path(__file__).parents[1] / "tools/preflight-production-release.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceArchiveTests(unittest.TestCase):
    def test_existing_nap_binding_only(self):
        base = {"environmentVariables": {"LIVEPALMES_ENFORCE_APP_CHECK": "false"}}
        self.assertTrue(module.ordinary_runtime_allowed(base))
        secret = {"key": "LIVEPALMES_NAP_PASSWORD", "secret": "LIVEPALMES_NAP_PASSWORD",
                  "projectId": "livepalmes", "version": "2"}
        for project in ["livepalmes", "718081132564"]:
            for version in ["2", "latest"]:
                self.assertTrue(module.ordinary_runtime_allowed({**base, "secretEnvironmentVariables": [{**secret, "projectId": project, "version": version}]}))
        for patch in [{"key": "SMTP_PASS"}, {"secret": "SMTP_PASS"}, {"projectId": "livepalmes-test"},
                      {"version": ""}, {"version": "0"}, {"version": "alias"}, {"unexpected": "field"}]:
            self.assertFalse(module.ordinary_runtime_allowed({**base, "secretEnvironmentVariables": [{**secret, **patch}]}))
        for secrets in [[secret, secret], [{k: v for k, v in secret.items() if k != "version"}]]:
            self.assertFalse(module.ordinary_runtime_allowed({**base, "secretEnvironmentVariables": secrets}))
        self.assertFalse(module.ordinary_runtime_allowed({**base, "secretVolumes": [{"mountPath": "/secret"}]}))
        self.assertFalse(module.ordinary_runtime_allowed({"environmentVariables": {"UNEXPECTED": "value"}}))

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
