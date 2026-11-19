"""Selection and refusal cases for the organizer PDF release, with simulated TEST state."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fee_source_policy', ROOT/'tools/publish-test-organizer-fees.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)


class OrganizerFeesRelease(unittest.TestCase):
    def setUp(self):
        self.entry = policy.contract()
        self.base = self.entry['baseCommit']
        self.candidate = self.entry['applicationCommit']
        self.old = dict.fromkeys(self.entry['installedFunctions'], '0'*64)
        self.desired = {**self.old, **self.entry['fingerprints']}
        self.rows = [
            {'name': policy.PREFIX+name, 'state': 'ACTIVE', 'environment': 'GEN_2',
             'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name},
             'labels': {'livepalmes-commit': self.base}}
            for name in self.entry['installedFunctions']
        ]

    def select(self):
        def fingerprints(ref):
            return {self.base: self.old, self.candidate: self.desired}[ref]
        with patch.object(policy.cycle, 'test_backend_fingerprints', fingerprints):
            return policy.select(self.rows, self.candidate, self.entry)

    def test_complete_selection_from_all_origins(self):
        self.assertEqual(self.select(), self.entry['allowedFunctions'])
        self.assertIn('processNapNotificationTask', policy.ALLOWED)
        self.assertIn('processNapCompetitionNotifications', policy.ALLOWED)
        self.assertNotIn('verifyPin', policy.ALLOWED)

    def test_unrelated_change_or_missing_function_blocks_release(self):
        self.desired['verifyPin'] = '1'*64
        with self.assertRaises(ValueError):
            self.select()
        self.desired['verifyPin'] = self.old['verifyPin']
        self.rows.pop()
        with self.assertRaises(ValueError):
            self.select()

    def test_club_abbreviation_release_has_its_own_origin_and_receipt(self):
        layout = policy.cycle.standard_sources.load('publish-test-organizer-fees-layout.py')
        entry = layout.contract()
        self.assertEqual(entry['baselineRuns'][0]['id'], 44481919780)
        self.assertEqual(entry['baseCommit'], '87bcd84b781389f377b025333fa7ef73c29e88af')
        self.assertEqual(len(layout.policy.ALLOWED), 7)
        self.assertLess(layout.policy.ALLOWED, policy.ALLOWED)
        self.assertNotEqual(layout.policy.CONTRACT_SHA256, policy.CONTRACT_SHA256)
        with self.assertRaises(ValueError):
            layout.contract(policy.RELEASE)
        with self.assertRaises(ValueError):
            policy.contract(layout.RELEASE)

    def test_previous_lot_or_unauthorized_workflow_refused(self):
        with self.assertRaises(ValueError):
            policy.contract('access_revocation')
        with self.assertRaises(ValueError):
            policy.guard('.', self.entry, {})
        with self.assertRaises(ValueError):
            policy.main('recover', policy.RELEASE, '.', '.')


if __name__ == '__main__':
    unittest.main()
