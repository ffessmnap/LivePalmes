"""Immutable CI userland, bounded downloads, credentials and sandbox guards."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pinned', ROOT/'tools/ci-pinned-runtime.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PinnedRuntimeTests(unittest.TestCase):
    def test_public_image_tools_and_seccomp_are_immutable(self):
        policy = m.policy()
        self.assertIn('@sha256:', policy['image'])
        self.assertEqual(policy['tools']['node']['version'], '22.23.5')
        self.assertEqual(set(policy['tools']), {'node', 'java', 'githubCLI'})
        profile = json.loads((ROOT/m.SECCOMP).read_text())
        self.assertEqual(profile['defaultAction'], 'SCMP_ACT_ERRNO')
        namespaces = [r for r in profile['syscalls'] if set(r['names']) == {'clone', 'setns', 'unshare'}]
        self.assertEqual(len(namespaces), 1)
        self.assertEqual(namespaces[0]['action'], 'SCMP_ACT_ALLOW')
        chroot = [r for r in profile['syscalls'] if r['names'] == ['chroot']]
        self.assertEqual(len(chroot), 1)
        self.assertEqual(chroot[0]['includes'], {})
        self.assertIn('--cap-drop=ALL', self.command()[0])

    def command(self, **extra):
        environment = {'GITHUB_OUTPUT': '/runner/output', 'GH_TOKEN': 'fixture-read-only-token',
            'NODE_PATH': '/workspace/tests/browser/node_modules', 'NAP_TEAM_FIXTURE_ALLOWED': 'isolated-ci',
            'FIREBASE_CONFIG': 'must-not-cross', 'GOOGLE_APPLICATION_CREDENTIALS': 'must-not-cross',
            'ACTIONS_ID_TOKEN_REQUEST_TOKEN': 'must-not-cross', 'GITHUB_TOKEN': 'must-not-cross',
            'SMTP_PASSWORD': 'must-not-cross', 'UNRELATED_SECRET': 'must-not-cross'}
        config = m.policy()
        with patch.object(m, 'digest', return_value='a'*64):
            return m.container_command(['node', 'tests/offline-network-tests.js'], environment,
                config, PurePosixPath('/runner/temp'), PurePosixPath('/workspace'), extra.get('uid', 1001),
                1001, PurePosixPath('/runner/.npm'))

    def test_no_root_capability_docker_socket_secret_or_mutable_tools(self):
        args, environment = self.command()
        self.assertIn('--read-only', args)
        self.assertIn('--cap-drop=ALL', args)
        self.assertIn('no-new-privileges=true', args)
        self.assertIn('1001:1001', args)
        self.assertIn('seccomp=/workspace/.github/ci-seccomp.json', args)
        self.assertIn('type=bind,src=/runner/temp/ci-runtime-tools,dst=/runner/temp/ci-runtime-tools,readonly', args)
        self.assertFalse(any('docker.sock' in arg or '--privileged' in arg or 'unconfined' in arg
                             or '--cap-add' in arg or '--no-sandbox' in arg for arg in args))
        self.assertEqual(environment['GH_TOKEN'], 'fixture-read-only-token')
        self.assertNotIn('fixture-read-only-token', str(args))
        for key in ('GITHUB_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG',
                    'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'SMTP_PASSWORD', 'UNRELATED_SECRET'):
            self.assertNotIn(key, environment)
        with self.assertRaises(ValueError):
            self.command(uid=0)

    def test_cache_is_hashed_and_tampered_download_never_extracts(self):
        data = b'authentic archive fixture'
        tool = {'sha256': hashlib.sha256(data).hexdigest(), 'url': 'https://nodejs.org/dist/fixture'}
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            file = cache/(tool['sha256']+'.tar')
            file.write_bytes(data)
            with patch.object(m.urllib.request, 'urlopen') as fetch:
                self.assertEqual(m.fetch(tool, cache), file)
                fetch.assert_not_called()
            file.write_bytes(b'tampered cache')
            with patch.object(m.urllib.request, 'urlopen', side_effect=lambda *a, **k: io.BytesIO(b'tampered download')) as fetch:
                with self.assertRaisesRegex(ValueError, 'Empreinte'):
                    m.fetch(tool, cache)
                self.assertEqual(fetch.call_count, 2)
            self.assertFalse(file.with_suffix('.download').exists())

    def archive(self, path, name, link=None):
        with tarfile.open(path, 'w') as archive:
            item = tarfile.TarInfo(name)
            if link:
                item.type, item.linkname = tarfile.SYMTYPE, link
                archive.addfile(item)
            else:
                item.size, item.mode = 4, 0o755
                archive.addfile(item, io.BytesIO(b'tool'))

    def test_extraction_refuses_foreign_root_traversal_or_external_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for i, (name, link) in enumerate([('../outside', None), ('foreign/bin/node', None),
                                             ('pinned/bin/node', '/etc/passwd')]):
                archive = root/(str(i)+'.tar')
                self.archive(archive, name, link)
                with self.subTest(name=name), self.assertRaises((ValueError, tarfile.FilterError)):
                    m.extract(archive, root/str(i), 'pinned')
            self.archive(root/'good.tar', 'pinned/bin/node')
            m.extract(root/'good.tar', root/'good', 'pinned')
            self.assertEqual((root/'good/pinned/bin/node').read_bytes(), b'tool')

    def test_a_host_cannot_issue_a_container_identity(self):
        with patch.dict(os.environ, {'LP_CI_CONTAINER': 'false'}), self.assertRaises(ValueError):
            m.identity()

    def test_cannot_run_before_fresh_runtime_preparation(self):
        with patch.dict(os.environ, {'LP_CI_RUNTIME_READY': 'false'}), \
             patch.object(m.subprocess, 'call') as run, self.assertRaises(ValueError):
            m.execute(['node', '--version'])
        run.assert_not_called()

    def test_missing_chromium_sandbox_remains_a_failure(self):
        failed = subprocess.CompletedProcess([], 134, stdout='', stderr='isolated browser failed')
        with patch.object(m, 'identity', return_value={}), \
             patch.object(m.subprocess, 'run', return_value=failed), \
             patch.object(m.Path, 'is_file', return_value=False), \
             patch.dict(os.environ, {'EDGE_BIN': '/pinned/chrome'}), \
             self.assertRaisesRegex(ValueError, 'Chromium refuse'):
            m.check()

    def test_internal_sandbox_inspection_requires_both_sandboxes(self):
        for receipt in ({'namespace': 'Yes', 'seccomp': 'Yes'}, {'namespace': 'No', 'seccomp': 'Yes'}, {}):
            result = subprocess.CompletedProcess([], 0, stdout=json.dumps(receipt), stderr='')
            with patch.object(m, 'identity', return_value={}), \
                 patch.object(m.subprocess, 'run', return_value=result) as run:
                if receipt == {'namespace': 'Yes', 'seccomp': 'Yes'}:
                    m.check()
                    self.assertEqual(run.call_args.args[0], ['node', 'tools/ci-runtime-sandbox-check.js'])
                    self.assertEqual(run.call_args.kwargs['timeout'], 45)
                else:
                    with self.assertRaisesRegex(ValueError, 'Sandbox Chromium non confirme'):
                        m.check()

    def test_native_sandbox_status_parser_refuses_missing_inactive_or_ambiguous_rows(self):
        script = """const assert=require('node:assert/strict');
const {validateSandbox}=require('./tools/ci-runtime-sandbox-check');
const good=[['Namespace Sandbox','Yes'],['Seccomp-BPF sandbox','Yes']];
assert.deepEqual(validateSandbox(good),{namespace:'Yes',seccomp:'Yes'});
for(const rows of [[],[['Namespace Sandbox','Yes']],good.concat(good),
 [['Namespace Sandbox','No'],['Seccomp-BPF sandbox','Yes']],
 [['Namespace Sandbox','Yes'],['Seccomp-BPF sandbox','No']]])assert.throws(()=>validateSandbox(rows));"""
        subprocess.run(['node', '-e', script], cwd=ROOT, check=True)

    def test_workflow_keeps_all_suites_gate_and_isolated_mysql(self):
        script = """const fs=require('node:fs'),y=require('./tests/firestore-rules/node_modules/js-yaml');
console.log(JSON.stringify(y.load(fs.readFileSync('.github/workflows/livepalmes-verification-preview.yml','utf8'))));"""
        workflow = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT))
        for name in ('application', 'publication', 'browser'):
            job = workflow['jobs'][name]
            self.assertEqual(job['defaults']['run']['shell'], 'python tools/ci-pinned-runtime.py shell {0}')
            prepare = [s for s in job['steps'] if s.get('run') == 'python tools/ci-pinned-runtime.py prepare']
            self.assertEqual(len(prepare), 1)
            self.assertEqual(prepare[0]['shell'], 'bash')
            self.assertIn("documentation != 'true'", prepare[0]['if'])
            self.assertFalse(any(s.get('continue-on-error') for s in job['steps']))
        mysql = next(s for s in workflow['jobs']['application']['steps']
                     if s.get('name') == 'Verifier les ecritures par equipes dans MySQL isole')
        self.assertIn('-p 127.0.0.1:33317:3306 mysql:5.7.30@sha256:', mysql['run'])
        for test in ('nap-team-entry', 'nap-club-account-emails', 'nap-direct'):
            self.assertIn('python tools/ci-pinned-runtime.py exec node tests/'+test+'-mysql-tests.js', mysql['run'])
        self.assertEqual(set(workflow['jobs']['verification']['needs']), {'application', 'publication', 'browser'})
        self.assertEqual(workflow['permissions'], {'contents': 'read', 'actions': 'read'})


if __name__ == '__main__':
    unittest.main()
