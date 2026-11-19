"""Closed organizer fee publication, using local contracts and fictitious controls."""
import copy
import importlib.util
import json
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fees_router', ROOT / 'tools/production-source-policy.py')
router = importlib.util.module_from_spec(spec)
spec.loader.exec_module(router)
fees = router.load('organizer-fees-production-policy.py')


class OrganizerFeesProductionTests(unittest.TestCase):
    def setUp(self):
        self.contract = fees.contract()
        self.request = {**self.contract['request'], fees.OPTION: {'contractSha256': fees.DIGEST}}

    def test_closed_request(self):
        self.assertIs(router.for_request(self.request), fees)
        self.assertEqual(len(fees.approved(self.request)), 24)
        self.assertEqual(router.for_request({}).OPTION, 'standardSources')
        for key, value in [('candidate', '0' * 40), ('testRun', 1), ('standardSources', {})]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                router.for_request({**self.request, key: value})

    def test_retained_origin_and_selection(self):
        with self.assertRaises(ValueError):
            fees.expected_manifest([])
        selected = set(fees.approved(self.request))
        self.assertTrue({'closeDueEngagementCompetitions', 'processNapNotificationTask'} <= selected)
        evidence = self.request['excludedBackendEvidence']['functions']
        self.assertEqual(len(evidence), 5)
        self.assertTrue(selected.isdisjoint(row['name'] for row in evidence))

    def test_final_check_routing(self):
        adapter = router.load('direct-csp-production-state.py')
        with tempfile.TemporaryDirectory() as directory:
            backup = Path(directory)
            destination = backup / 'after.json'
            args = ['check', str(backup), str(destination), 'success']
            (backup / 'report.json').write_text(json.dumps({'sourcePolicyKind': fees.KIND}))
            with patch.object(adapter, 'load', return_value=fees), patch.object(fees, 'state_check') as check:
                adapter.dispatch(args)
                check.assert_called_once_with(backup, destination, True)
            (backup / 'report.json').write_text('{}')
            with patch.object(adapter, 'run_old') as original:
                adapter.dispatch(args)
                original.assert_called_once_with(args)

    def test_runtime_and_control_drift(self):
        name = 'processNapNotificationTask'
        before = {'name': fees.PREFIX + name, 'state': 'ACTIVE', 'environment': 'GEN_2',
                  'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name}, 'updateTime': 'before',
                  'serviceConfig': {'revision': 'r1'}, 'labels': {}}
        after = copy.deepcopy(before)
        after.update(updateTime='after', labels={'livepalmes-commit': self.request['candidate']})
        after['serviceConfig']['revision'] = 'r2'
        fees.assert_selected(before, after, self.request['candidate'])
        after['serviceConfig']['serviceAccountEmail'] = 'changed'
        with self.assertRaises(ValueError):
            fees.assert_selected(before, after, self.request['candidate'])
        with patch.object(fees, 'manifest', return_value=self.contract), patch.object(fees.common, 'controls', return_value={}), self.assertRaises(ValueError):
            fees.guard(ROOT)


if __name__ == '__main__':
    unittest.main()
