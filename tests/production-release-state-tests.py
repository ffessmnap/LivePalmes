import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import tempfile
import json
import os
spec = importlib.util.spec_from_file_location("state", Path(__file__).parents[1] / "tools/production-release-state.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class StateTests(unittest.TestCase):
    def test_pdf_secret_binding_change_blocks_hosting(self):
        name = 'prepareEngagementClubRecapEmails'
        fn = {'name': module.PREFIX + name, 'state': 'ACTIVE',
              'labels': {'livepalmes-commit': 'test'},
              'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name},
              'serviceConfig': {'secretEnvironmentVariables': [{'key': 'MAIL', 'version': '1'}]}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'functions.json').write_text(json.dumps([fn]))
            (root / 'report.json').write_text(json.dumps({'candidate': 'test', 'commitLabel': True,
                'functions': [{'name': fn['name']}], 'newFunctions': [], 'appCheck': 'false',
                'additionalPdfFunctions': [name]}))
            with patch.object(module, 'inventory', return_value=[fn]), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(root / 'summary')}):
                module.check_after(root, root / 'after.json', True)
                fn['serviceConfig']['secretEnvironmentVariables'][0]['version'] = '2'
                with self.assertRaisesRegex(ValueError, 'Controle'):
                    module.check_after(root, root / 'after.json', True)
                self.assertIn('Configuration PDF modifiee', (root / 'after.json').read_text())

    def test_rollback_removes_output_only_fields(self):
        fn = {"name": module.PREFIX + "example", "buildConfig": {"runtime": "nodejs22", "entryPoint": "example"}, "serviceConfig": {"uri": "https://invalid", "revision": "old", "service": "managed", "timeoutSeconds": 60, "environmentVariables": {"LIVEPALMES_ENFORCE_APP_CHECK": "false"}}, "labels": {"original": "yes"}}
        result = module.rollback_patch(fn, {"bucket": "code", "object": "old.zip"})
        self.assertEqual(result["serviceConfig"], {"timeoutSeconds": 60, "environmentVariables": {"LIVEPALMES_ENFORCE_APP_CHECK": "false"}})
        self.assertEqual(result["labels"], {"original": "yes"})
    def test_rollback_restores_event_and_build_configuration(self):
        fn = {"name": module.PREFIX + "example", "buildConfig": {"runtime": "nodejs22", "entryPoint": "example", "environmentVariables": {"BUILD_OPTION": "old"}, "build": "output-only"}, "serviceConfig": {}, "eventTrigger": {"eventType": "google.cloud.firestore.document.v1.written", "retryPolicy": "RETRY_POLICY_RETRY", "trigger": "output-only"}}
        result = module.rollback_patch(fn, {"bucket": "code", "object": "old.zip"})
        self.assertEqual(result["buildConfig"]["environmentVariables"], {"BUILD_OPTION": "old"})
        self.assertNotIn("build", result["buildConfig"])
        self.assertEqual(result["eventTrigger"]["retryPolicy"], "RETRY_POLICY_RETRY")
        self.assertNotIn("trigger", result["eventTrigger"])

    def test_identity_detects_revision_and_timestamp_changes(self):
        fn = {"name": "example", "state": "ACTIVE", "updateTime": "a", "serviceConfig": {"revision": "one"}}
        before = module.identity(fn)
        fn["serviceConfig"]["revision"] = "two"
        self.assertNotEqual(before, module.identity(fn))
    def test_excluded_function_change_blocks_hosting(self):
        selected = {"name": module.PREFIX + "selected", "state": "ACTIVE", "updateTime": "before", "serviceConfig": {"revision": "one"}}
        excluded = {"name": module.PREFIX + "excluded", "state": "ACTIVE", "updateTime": "before", "serviceConfig": {"revision": "one"}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "functions.json").write_text(json.dumps([selected, excluded]))
            (root / "report.json").write_text(json.dumps({"candidate": "test", "functions": [{"name": selected["name"]}], "newFunctions": [], "appCheck": "false"}))
            selected["updateTime"] = "after"
            excluded["updateTime"] = "unexpected"
            with patch.object(module, "inventory", return_value=[selected, excluded]), patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(root / "summary")}):
                with self.assertRaisesRegex(ValueError, "controle|Controle"):
                    module.check_after(root, root / "after.json", True)
            self.assertIn("Function exclue modifiee", (root / "after.json").read_text())

    def test_rollback_blocks_a_later_production_change(self):
        name = module.PREFIX + "selected"
        function = {"name": name, "state": "ACTIVE", "updateTime": "later", "serviceConfig": {"revision": "unexpected"}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "functions.json").write_text("[]")
            (root / "report.json").write_text(json.dumps({"candidate": "test", "functions": [{"name": name}], "newFunctions": []}))
            (root / "after.json").write_text(json.dumps({"candidate": "test", "functions": [{"name": name, "state": "ACTIVE", "updateTime": "after", "revision": "expected"}]}))
            with patch.object(module, "inventory", return_value=[function]), patch.object(module, "request") as api, patch.dict(os.environ, {"CONFIRM_CODE_ROLLBACK": "livepalmes"}):
                with self.assertRaisesRegex(ValueError, "Production modifiee"):
                    module.rollback(root, root / "after.json")
                api.assert_not_called()

if __name__ == "__main__":
    unittest.main()
