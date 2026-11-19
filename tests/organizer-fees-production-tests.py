"""Closed organizer fee publication, using local contracts and fictitious controls."""
import copy
import importlib.util
import json
import os
import subprocess
import sys
import textwrap
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

    @unittest.skipUnless(sys.platform.startswith('linux'), 'The publication runner uses Linux')
    def test_runner_stages_dependencies_and_rejects_dirty_candidate(self):
        workflow = (ROOT / '.github/workflows/livepalmes-production-release.yml').read_text()
        marker = '        fees_plan=$(python3'
        start = workflow.index(marker)
        end = workflow.index('        fi\n', start) + len('        fi\n')
        script = textwrap.dedent(workflow[start:end])
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            candidate = workspace / 'candidate'
            base = Path('tests/firestore-rules')
            (candidate / base).mkdir(parents=True)
            trusted = workspace / 'tooling' / base / 'node_modules'
            trusted.mkdir(parents=True)
            (trusted / 'fixture').write_text('trusted')
            (candidate / '.gitignore').write_text('tests/firestore-rules/node_modules/\n')
            subprocess.run(['git', 'init', '-q', str(candidate)], check=True)
            subprocess.run(['git', 'add', '.gitignore'], cwd=candidate, check=True)
            subprocess.run(['git', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                            'commit', '-qm', 'fixture'], cwd=candidate, check=True)
            (workspace / 'request.json').write_text(json.dumps(self.request))
            env = {**os.environ, 'PLAN': tmp, 'GITHUB_WORKSPACE': tmp}
            command = ['bash', '-euo', 'pipefail', '-c', script]
            subprocess.run(command, cwd=workspace, env=env, check=True)
            installed = candidate / base / 'node_modules'
            self.assertFalse(installed.is_symlink())
            self.assertEqual((installed / 'fixture').read_text(), 'trusted')
            (installed / 'fixture').unlink()
            installed.rmdir()
            (candidate / 'unexpected').write_text('other content')
            self.assertNotEqual(subprocess.run(command, cwd=workspace, env=env).returncode, 0)

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
