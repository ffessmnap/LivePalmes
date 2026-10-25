import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('coordination', root/'tools/coordinate-test-publication.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class CoordinationTests(unittest.TestCase):
    def call(self, phase, head='a', **inputs):
        responses = [{'object': {'sha': head*40}}]
        if head != 'a':
            responses.append({'status': 'ahead'})
        if phase == 'followup' and head != 'a' and not inputs.get('verification_only'):
            responses.append(None)
        with patch.object(m, 'gh', side_effect=responses) as api:
            result = m.coordinate(phase, 'owner/repo', 'a'*40, inputs)
        return result, api

    def test_current_candidate_runs_and_has_no_successor(self):
        self.assertTrue(self.call('prepare')[0]['publish'])
        result, api = self.call('followup')
        self.assertFalse(result['queued'])
        self.assertEqual(api.call_count, 1)

    def test_stale_queued_candidate_does_not_publish(self):
        self.assertFalse(self.call('prepare', 'b')[0]['publish'])

    def test_main_advances_during_release_followup_preserves_every_restriction(self):
        inputs = {'production_commit': 'c'*40, 'hosting_only': True,
                  'approved_home_routing': False, 'verification_only': False,
                  'approved_top_files': False, 'approved_records_cleanup': False,
                  'approved_public_export_cleanup': False, 'dtn_extension': False}
        result, api = self.call('followup', 'b', **inputs)
        self.assertTrue(result['queued'])
        endpoint, payload = api.call_args.args
        self.assertTrue(endpoint.endswith('/livepalmes-test-common.yml/dispatches'))
        self.assertEqual(payload['ref'], 'main')
        expected = {key: str(value).lower() if isinstance(value, bool) else value for key, value in inputs.items()}
        self.assertEqual(payload['inputs'], {**expected, 'followup_depth': '1'})

    def test_readonly_run_never_dispatches(self):
        self.assertTrue(self.call('prepare', 'b', verification_only=True)[0]['publish'])
        result, api = self.call('followup', 'b', verification_only=True)
        self.assertFalse(result['queued'])
        self.assertEqual(api.call_count, 2)

    def test_rewritten_branch_api_failure_and_invalid_sha_stop(self):
        with patch.object(m, 'gh', side_effect=[{'object': {'sha': 'b'*40}}, {'status': 'diverged'}]) as api:
            with self.assertRaises(ValueError):
                m.coordinate('followup', 'owner/repo', 'a'*40, {})
            self.assertEqual(api.call_count, 2)
        with patch.object(m, 'gh', side_effect=RuntimeError('unavailable')):
            with self.assertRaises(RuntimeError):
                m.coordinate('prepare', 'owner/repo', 'a'*40, {})
        with self.assertRaises(ValueError):
            m.coordinate('followup', 'owner/repo', 'main', {})

    def test_followups_bounded_and_unknown_inputs_refused(self):
        with patch.object(m, 'gh', side_effect=[{'object': {'sha': 'b'*40}}, {'status': 'ahead'}]) as api:
            with self.assertRaisesRegex(ValueError, 'trois suivis'):
                m.coordinate('followup', 'owner/repo', 'a'*40, {'followup_depth': 3})
            self.assertEqual(api.call_count, 2)
        with self.assertRaises(ValueError):
            m.coordinate('prepare', 'owner/repo', 'a'*40, {'unknown': True})

    def test_workflow_keeps_exact_proof_serialization_and_failure_guard(self):
        workflow = (root/'.github/workflows/livepalmes-test-common.yml').read_text(encoding='utf-8')
        self.assertIn('cancel-in-progress: false', workflow)
        self.assertIn('group: livepalmes-test-backend', workflow)
        self.assertIn('git merge-base --is-ancestor "$GITHUB_SHA" origin/main', workflow)
        self.assertIn('test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"', workflow)
        self.assertIn("needs.test.result == 'success' || needs.test.result == 'skipped'", workflow)
        self.assertIn('!inputs.verification_only', workflow)
        self.assertEqual(workflow.count('actions: write'), 1)
        self.assertLess(workflow.index('tools/release-cycle.py proof'), workflow.index('  followup:'))


if __name__ == '__main__':
    unittest.main()
