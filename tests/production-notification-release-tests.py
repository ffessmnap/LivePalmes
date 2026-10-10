"""Offline approval, selection and cutover guards; no credentials or network."""
import importlib.util
from pathlib import Path
import unittest
import tempfile
import json
import os
from unittest.mock import patch

ROOT = Path(__file__).parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cycle = load('notification_cycle', 'release-cycle.py')
guard = load('notification_guard', 'check-production-mail-disabled.py')
state = load('notification_state', 'production-release-state.py')


class NotificationReleaseTests(unittest.TestCase):
    def request(self):
        return {'additionalNotificationFunctions': sorted(cycle.NOTIFICATION_FUNCTIONS),
                'additionalNotificationApproval': 'Accord specifique Infra du bilan exact',
                'initialAutomaticMailEnabled': False}

    def test_scope_requires_complete_explicit_approval_and_default_off(self):
        request = self.request()
        self.assertEqual(set(cycle.approved_extra_functions(request)), cycle.NOTIFICATION_FUNCTIONS)
        self.assertEqual(cycle.approved_notification_functions({}), [])
        for field in request:
            altered = dict(request)
            altered.pop(field)
            if field == 'additionalNotificationFunctions':
                self.assertEqual(cycle.approved_notification_functions(altered), [])
            else:
                with self.assertRaises(ValueError):
                    cycle.approved_notification_functions(altered)
        for value in [True, None, 0, 'false']:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, 'initialAutomaticMailEnabled': value})
        for names in [request['additionalNotificationFunctions'][:-1], ['resumePerformancePublicationJobs'],
                      request['additionalNotificationFunctions'] * 2, ['sendEmails'], [None], 'all']:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, 'additionalNotificationFunctions': names})
        with self.assertRaises(ValueError):
            cycle.approved_notification_functions({**request, 'additionalNotificationApproval': ' '})

    def test_overlap_with_existing_pdf_scope_is_rejected(self):
        with self.assertRaises(ValueError):
            cycle.approved_extra_functions({**self.request(), 'additionalPdfFunctions': sorted(cycle.PDF_FUNCTIONS),
                                           'additionalPdfApproval': 'Accord PDF'})

    def test_missing_disabled_enabled_and_corrupted_settings(self):
        self.assertTrue(guard.disabled({}))
        self.assertTrue(guard.disabled({'fields': {'enabled': {'booleanValue': False}}}))
        self.assertFalse(guard.disabled({'fields': {'enabled': {'booleanValue': True}}}))
        for value in [{'stringValue': 'false'}, {'booleanValue': 0}, {'booleanValue': False, 'stringValue': 'false'}]:
            with self.assertRaises(ValueError):
                guard.disabled({'fields': {'enabled': value}})

    def test_scheduler_witness_ignores_execution_metadata_but_detects_configuration(self):
        job = {'name': 'closure', 'schedule': '*/5 * * * *', 'timeZone': 'Europe/Paris',
               'state': 'ENABLED', 'httpTarget': {'uri': 'https://example.invalid/closure'}}
        witness = guard.scheduler_fingerprint(job)
        self.assertEqual(witness, guard.scheduler_fingerprint({**job, 'lastAttemptTime': 'later', 'status': {}}))
        for key, value in [('schedule', '*/10 * * * *'), ('state', 'PAUSED'), ('httpTarget', {'uri': 'https://other.invalid'})]:
            self.assertNotEqual(witness, guard.scheduler_fingerprint({**job, key: value}))

    def test_new_notification_function_is_checked_and_missing_nap_secret_blocks_hosting(self):
        name = 'processNapCompetitionNotifications'
        function = {'name': state.PREFIX + name, 'state': 'ACTIVE', 'labels': {'livepalmes-commit': 'candidate'},
                    'serviceConfig': {'secretEnvironmentVariables': [{'key': 'LIVEPALMES_NAP_PASSWORD',
                        'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes', 'version': '1'}]}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'functions.json').write_text('[]')
            (root / 'report.json').write_text(json.dumps({'candidate': 'candidate', 'commitLabel': True,
                'functions': [], 'newFunctions': [name], 'appCheck': 'false',
                'additionalNotificationFunctions': [name], 'notificationExpectedSecrets': {name: ['LIVEPALMES_NAP_PASSWORD']}}))
            with patch.object(state, 'inventory', return_value=[function]), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(root / 'summary')}):
                state.check_after(root, root / 'after.json', True)
                function['serviceConfig']['secretEnvironmentVariables'] = []
                with self.assertRaises(ValueError):
                    state.check_after(root, root / 'after.json', True)
                self.assertIn('Secrets notifications differents', (root / 'after.json').read_text())


if __name__ == '__main__':
    unittest.main()
