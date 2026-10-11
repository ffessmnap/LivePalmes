"""Offline strict scope, secret binding and deployment tests. No network or credentials."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parents[1]
def load(filename):
    spec = importlib.util.spec_from_file_location(filename, ROOT / 'tools' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
cycle = load('release-cycle.py')
preflight = load('preflight-production-release.py')
state = load('production-release-state.py')
PAIR = sorted(cycle.ACCESS_REQUEST_FUNCTIONS)
REQUEST = {'additionalAccessRequestFunctions': PAIR, 'additionalAccessRequestApproval': 'Explicit pair approval', 'initialAutomaticMailEnabled': False}

class AccessRequestReleaseTests(unittest.TestCase):
    def test_exact_approval_and_selection(self):
        self.assertEqual(cycle.approved_access_request_functions({}), [])
        self.assertEqual(cycle.approved_extra_functions(REQUEST), PAIR)
        cycle.require_access_request_selection(REQUEST, PAIR)
        for change in [{'additionalAccessRequestFunctions': PAIR[:1]}, {'additionalAccessRequestFunctions': PAIR + PAIR},
                       {'additionalAccessRequestFunctions': ['sendEngagementPreparedEmails']}, {'additionalAccessRequestApproval': ''},
                       {'initialAutomaticMailEnabled': True}, {'initialAutomaticMailEnabled': 'false'},
                       {'additionalNotificationFunctions': ['sendEngagementPreparedEmails']}]:
            with self.assertRaises(ValueError):
                cycle.approved_access_request_functions({**REQUEST, **change})
        for names in [[], PAIR[:1], PAIR + ['getNapSwimmerPerformances']]:
            with self.assertRaises(ValueError):
                cycle.require_access_request_selection(REQUEST, names)

    def test_existing_secret_configuration_is_narrow(self):
        secrets = [{'key': n, 'secret': n, 'projectId': 'livepalmes', 'version': '1'} for n in cycle.ACCESS_REQUEST_SECRETS]
        for bindings in [secrets, secrets[1:]]:
            self.assertTrue(preflight.access_request_runtime_allowed({'secretEnvironmentVariables': bindings}))
        for bad in [secrets[:1], secrets + secrets[:1], [{**s, 'projectId': 'livepalmes-test'} for s in secrets],
                    [{**s, 'version': '0'} for s in secrets], [{**s, 'secret': 'other'} for s in secrets]]:
            self.assertFalse(preflight.access_request_runtime_allowed({'secretEnvironmentVariables': bad}))
        self.assertFalse(preflight.access_request_runtime_allowed({'secretEnvironmentVariables': secrets, 'secretVolumes': [{}]}))

    def test_actual_deploy_command_is_exact_pair(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'request.json').write_text(json.dumps(REQUEST))
            (root / 'selection.json').write_text(json.dumps(PAIR))
            (root / 'credentials.json').write_text(json.dumps({'project_id': 'livepalmes'}))
            with patch.dict(os.environ, {'PLAN': str(root), 'CANDIDATE_SHA': 'a' * 40, 'GOOGLE_APPLICATION_CREDENTIALS': str(root / 'credentials.json')}), patch.object(cycle, 'safe_functions', return_value=[]), patch.object(cycle, 'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes', '.', root, root / 'selection.json', True)
                command = deploy.call_args.args[0]
                self.assertEqual(set(command[command.index('--only') + 1].split(',')), {'functions:' + n for n in PAIR})

    def test_runtime_secret_drift_blocks_success(self):
        functions = [{'name': state.PREFIX + n, 'state': 'ACTIVE', 'labels': {'livepalmes-commit': 'a' * 40},
                      'serviceConfig': {'secretEnvironmentVariables': [{'key': k, 'secret': k, 'projectId': 'livepalmes', 'version': 'latest'} for k in cycle.ACCESS_REQUEST_SECRETS]}} for n in PAIR]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'functions.json').write_text(json.dumps(functions))
            (root / 'report.json').write_text(json.dumps({'candidate': 'a' * 40, 'commitLabel': True, 'functions': [{'name': f['name']} for f in functions],
                'newFunctions': [], 'appCheck': 'false', 'additionalAccessRequestFunctions': PAIR, 'accessRequestExpectedSecrets': cycle.ACCESS_REQUEST_SECRETS}))
            with patch.object(state, 'inventory', return_value=functions), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(root / 'summary')}):
                state.check_after(root, root / 'after.json', True)
                functions[0]['serviceConfig']['secretEnvironmentVariables'].pop()
                with self.assertRaises(ValueError):
                    state.check_after(root, root / 'after.json', True)

if __name__ == '__main__':
    unittest.main()
