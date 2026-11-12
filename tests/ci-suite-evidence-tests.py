"""Fail-closed content, provenance, environment and artifact checks for CI reuse."""
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('suites', ROOT / 'tools/ci-suite-evidence.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
PARENT, HEAD, CANDIDATE = 'a' * 40, 'b' * 40, 'c' * 40
CONTENT = {'tree': 'd'*40, 'manifestSha256': 'e'*64, 'controllers': {'workflow': 'f'*40}}
ENV = {'node': 'v22.23.5', 'platform': 'linux', 'architecture': 'x86_64',
       'runnerImage': 'ubuntu24', 'runnerVersion': '20261110.1.0'}


class SuiteEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes'})
        self.env.start()
        m.artifact.cache_clear()
        m.DEADLINE = None
        self.addCleanup(self.env.stop)

    def info(self, **extra):
        return {'id': 71, 'path': m.WORKFLOW, 'event': 'pull_request',
                'status': 'completed', 'conclusion': 'success', 'run_attempt': 1,
                'head_sha': HEAD, 'head_repository': {'full_name': 'ffessmnap/LivePalmes'},
                'pull_requests': [{'number': 13, 'base': {'ref': 'main', 'sha': PARENT},
                                   'head': {'sha': HEAD}}], **extra}

    def value(self):
        return {'schema': 2, 'suite': 'application', 'result': 'success',
                'candidate': '9'*40, 'content': deepcopy(CONTENT), 'environment': deepcopy(ENV),
                'origin': {'repository': 'ffessmnap/LivePalmes', 'run': 71, 'attempt': 1,
                           'event': 'pull_request', 'head': HEAD, 'base': PARENT, 'number': 13,
                           'headRepository': 'ffessmnap/LivePalmes', 'baseBranch': 'main'},
                'mode': 'executed', 'source': None}

    def accepts(self, value=None, info=None, parent_content=None, environment=None):
        with patch.object(m, 'content', side_effect=lambda ref: parent_content or CONTENT), \
             patch.object(m, 'environment', return_value=environment or ENV):
            return m.accepts(value or self.value(), 'application', CANDIDATE,
                             info or self.info(), PARENT, HEAD)

    def test_identical_tested_tree_can_cross_different_merge_commits(self):
        self.assertTrue(self.accepts())
        self.assertNotEqual(self.value()['candidate'], CANDIDATE)

    def test_sources_dependencies_tests_or_unknown_file_change_invalidates(self):
        for part in ['tree', 'manifestSha256', 'controllers']:
            value = self.value()
            value['content'][part] = 'changed'
            with self.subTest(part=part), self.assertRaises(ValueError):
                self.accepts(value)

    def test_modified_controller_cannot_authorize_its_own_pr_proof(self):
        before = {**CONTENT, 'controllers': {'workflow': '0'*40}}
        with patch.object(m, 'content', side_effect=lambda ref: before if ref == PARENT else CONTENT), \
             patch.object(m, 'environment', return_value=ENV), self.assertRaises(ValueError):
            m.accepts(self.value(), 'application', CANDIDATE, self.info(), PARENT, HEAD)

    def test_missing_failed_reused_foreign_suite_or_environment_never_becomes_success(self):
        for key, bad in [('schema', 1), ('result', 'failure'), ('result', 'cancelled'),
                         ('suite', 'publication'), ('mode', 'reused'), ('source', {}),
                         ('candidate', 'bad'), ('environment', {**ENV, 'node': 'v22.23.4'})]:
            with self.subTest(key=key, value=bad), self.assertRaises(ValueError):
                self.accepts({**self.value(), key: bad})
        for change in [{'run': 72}, {'attempt': 2}, {'event': 'push'}, {'base': '0'*40},
                       {'head': '0'*40}, {'headRepository': 'outside/repo'}, {'baseBranch': 'other'}]:
            value = self.value()
            value['origin'].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.accepts(value)

    def test_run_and_pr_base_must_both_match(self):
        for change in [{'head_sha': '0'*40}, {'pull_requests': []},
                       {'pull_requests': [{'number': 13, 'base': {'ref': 'main', 'sha': '0'*40},
                                           'head': {'sha': HEAD}}]}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.accepts(info=self.info(**change))

    def archive(self, **changes):
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as archive:
            archive.writestr(changes.get('filename', 'application.json'), json.dumps(self.value()))
        raw = data.getvalue()
        row = {'id': 8, 'name': 'ci-application-suites', 'expired': False}
        meta = {**row, 'workflow_run': {'id': 71, 'head_sha': HEAD},
                'digest': 'sha256:' + hashlib.sha256(raw).hexdigest(), **changes.get('meta', {})}
        inventory = changes.get('inventory', {'total_count': 1, 'artifacts': [row]})
        def request(path, binary=False):
            if binary:
                return raw + b'altered' if changes.get('altered') else raw
            if path.endswith('/runs/71'):
                return self.info(**changes.get('run', {}))
            if '/artifacts?' in path:
                return inventory
            return meta
        with patch.object(m, 'gh', side_effect=request):
            return m.artifact(71, 'ci-application-suites')

    def test_authenticated_digest_checked_pr_artifact(self):
        info, files, receipt = self.archive()
        self.assertEqual(info['id'], 71)
        self.assertEqual(files['application.json'], self.value())
        self.assertEqual(receipt['artifact'], 8)

    def test_tamper_expiration_wrong_run_fork_attempt_or_zip_path_refuses(self):
        for change in [{'altered': True}, {'filename': '../application.json'},
                       {'meta': {'expired': True}}, {'meta': {'workflow_run': {'id': 72, 'head_sha': HEAD}}},
                       {'inventory': {'total_count': 0, 'artifacts': []}},
                       {'run': {'run_attempt': 2}}, {'run': {'conclusion': 'failure'}},
                       {'run': {'event': 'workflow_dispatch'}}, {'run': {'path': 'foreign.yml'}},
                       {'run': {'head_repository': {'full_name': 'outside/repo'}}}]:
            m.artifact.cache_clear()
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.archive(**change)

    def test_unavailable_proof_and_nonmerge_execute_all_suites(self):
        for error in [ValueError('not a merge'), TimeoutError('network')]:
            with tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / 'outputs'
                def git(*args):
                    if args == ('rev-parse', 'HEAD'):
                        return CANDIDATE
                    raise error
                with patch.dict(os.environ, {'GITHUB_EVENT_NAME': 'push', 'GITHUB_REF': 'refs/heads/main',
                     'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_OUTPUT': str(output)}), patch.object(m, 'git', side_effect=git):
                    m.reuse(list(m.GROUPS), directory)
                self.assertEqual(len(output.read_text().splitlines()), 5)
                self.assertTrue(all(line.endswith('=false') for line in output.read_text().splitlines()))

    def test_complete_reuse_records_each_authenticated_origin(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'outputs'
            def git(*args):
                return CANDIDATE if args == ('rev-parse', 'HEAD') else ' '.join([CANDIDATE, PARENT, HEAD])
            def artifact(run, group):
                suite = 'application' if group == 'ci-application-suites' else 'publication'
                return self.info(), {suite+'.json': {**self.value(), 'suite': suite}}, {
                    'run': 71, 'artifact': 8, 'sha256': 'sha256:'+'1'*64}
            with patch.dict(os.environ, {'GITHUB_EVENT_NAME': 'push', 'GITHUB_REF': 'refs/heads/main',
                 'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_OUTPUT': str(output)}), \
                 patch.object(m, 'git', side_effect=git), \
                 patch.object(m, 'gh', return_value={'workflow_runs': [self.info()]}), \
                 patch.object(m, 'artifact', side_effect=artifact), \
                 patch.object(m, 'content', return_value=CONTENT), patch.object(m, 'environment', return_value=ENV):
                m.reuse(['application', 'publication'], directory)
            self.assertEqual(output.read_text().splitlines(), ['application=true', 'publication=true'])
            receipt = json.loads((Path(directory)/'reuse.json').read_text())
            self.assertEqual(receipt['application']['source']['run'], 71)
            self.assertEqual(receipt['publication']['source']['suite'], 'publication')

    def test_not_required_emulator_does_not_create_a_success_proof(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.dict(os.environ, {'FIRESTORE_REQUIRED': 'false'}), patch.object(m, 'proof') as prove:
            m.record(['firestore'], directory)
            prove.assert_not_called()
            self.assertFalse((Path(directory)/'firestore.json').exists())

    def test_real_git_manifest_includes_unknown_files_but_not_untracked_outputs(self):
        import subprocess
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.DEVNULL).decode().strip()
            git('init', '-q')
            git('config', 'user.email', 'offline-fixture@example.invalid')
            git('config', 'user.name', 'Offline fixture')
            for name in m.CONTROLLERS:
                file = root/name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text('fixed controller')
            git('add', '.')
            git('commit', '-qm', 'baseline')
            first = git('rev-parse', 'HEAD')
            with patch.object(m, 'ROOT', root):
                before = m.content(first)
                (root/'untracked-output.json').write_text('not a source')
                self.assertEqual(m.content(first), before)
                (root/'unknown-dependency.bin').write_bytes(b'changed source')
                git('add', 'unknown-dependency.bin')
                git('commit', '-qm', 'unknown dependency')
                self.assertNotEqual(m.content(git('rev-parse', 'HEAD')), before)

    def test_workflow_preserves_each_suite_and_mandatory_synthesis(self):
        script = """const f=require('node:fs'),y=require('./tests/firestore-rules/node_modules/js-yaml');
console.log(JSON.stringify(y.load(f.readFileSync('.github/workflows/livepalmes-verification-preview.yml','utf8'))));"""
        import subprocess
        w = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT))
        self.assertEqual(set(w['jobs']['verification']['needs']), {'application', 'publication', 'browser'})
        self.assertEqual(w['jobs']['verification']['if'], 'always()')
        gate = next(s for s in w['jobs']['verification']['steps'] if s.get('name') == 'Exiger toutes les verifications')
        self.assertIn('test "$BROWSER" = success', gate['run'])
        app = w['jobs']['application']['steps']
        for name in ['Tester les regles Firestore', 'Verifier LivePalmes',
                     'Verifier les ecritures par equipes dans MySQL isole']:
            step = next(s for s in app if s.get('name') == name)
            self.assertIn("!= 'true'", step['if'])
            self.assertNotIn('continue-on-error', step)
        self.assertIn('node tools/verify-livepalmes.js --browser-only', str(w['jobs']['browser']))


if __name__ == '__main__':
    unittest.main()
