"""Fixtures only: closed WIF context, ADC identity and exact read-only consumers."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('hosting_probe', ROOT / 'tools/a3-wif-hosting-readonly.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class ProbeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='lp-wif-hosting-tests-')
        self.addCleanup(self.directory.cleanup)
        self.base = Path(self.directory.name)
        self.env = {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes', 'GITHUB_REPOSITORY_ID': '1240638222',
                    'GITHUB_REPOSITORY_OWNER_ID': '284726282', 'GITHUB_REF': 'refs/heads/main',
                    'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_RUN_ATTEMPT': '1',
                    'GITHUB_WORKFLOW_REF': probe.WORKFLOW, 'VERIFIED_MAIN_CI': 'true',
                    'WIF_QUALIFICATION': 'hosting-consumers', 'GITHUB_SHA': 'a' * 40,
                    'EXPECTED_COMMIT': 'a' * 40, 'GITHUB_RUN_ID': '42',
                    'GITHUB_WORKSPACE': str(self.base), 'RUNNER_TEMP': str(self.base),
                    'PATH': '/fixture/bin', 'FIREBASE_TOKEN': 'FORBIDDEN-FALLBACK',
                    'GOOGLE_OAUTH_ACCESS_TOKEN': 'FORBIDDEN-FALLBACK',
                    'FIREBASE_HOSTING_URL': 'https://example.invalid',
                    'ACTIONS_ID_TOKEN_REQUEST_URL': 'https://fixture.actions.githubusercontent.com/idtoken?api-version=2.0',
                    'ACTIONS_ID_TOKEN_REQUEST_TOKEN': 'PUBLIC-FIXTURE-ONLY'}
        self.file = self.base / 'gha-creds-abcdefgh.json'
        self.env['GOOGLE_APPLICATION_CREDENTIALS'] = str(self.file)
        self.record = {'type': 'external_account', 'audience': '//iam.googleapis.com/' + probe.PROVIDER,
                       'subject_token_type': 'urn:ietf:params:oauth:token-type:jwt',
                       'token_url': 'https://sts.googleapis.com/v1/token',
                       'service_account_impersonation_url':
                       'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/' + probe.ACCOUNT + ':generateAccessToken',
                       'credential_source': {'url': self.env['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=' +
                                             urllib.parse.quote_plus('https://iam.googleapis.com/' + probe.PROVIDER),
                                             'headers': {'Authorization': 'Bearer PUBLIC-FIXTURE-ONLY'},
                                             'format': {'type': 'json', 'subject_token_field_name': 'value'}}}
        self.file.write_text(json.dumps(self.record), encoding='utf8')
        self.site = {'name': 'projects/718081132564/sites/livepalmes', 'defaultUrl': 'https://livepalmes.web.app',
                     'appId': 'NOT-EXPORTED', 'private_key': 'PUBLIC-FIXTURE-LEAK-DETECTOR'}

    def test_context_before_credential(self):
        for key in ('GITHUB_REPOSITORY', 'GITHUB_REPOSITORY_ID', 'GITHUB_REPOSITORY_OWNER_ID',
                    'GITHUB_REF', 'GITHUB_EVENT_NAME', 'GITHUB_RUN_ATTEMPT', 'GITHUB_WORKFLOW_REF',
                    'VERIFIED_MAIN_CI', 'GITHUB_SHA', 'EXPECTED_COMMIT', 'GITHUB_RUN_ID', 'WIF_QUALIFICATION'):
            env = {**self.env, key: 'wrong'}
            with patch.object(Path, 'lstat', side_effect=AssertionError('Credential accessed')):
                with self.assertRaises(ValueError):
                    probe.credential(env)
        with self.assertRaises(ValueError):
            probe.context({**self.env, 'GITHUB_RUN_ID': str(2**53)})

    def test_closed_external_shape_and_identity(self):
        self.assertEqual(probe.credential(self.env), self.file)
        for key, value in [('type', 'service_account'), ('audience', '//iam.googleapis.com/other'),
                           ('token_url', 'https://example.invalid'), ('service_account_impersonation_url', 'other'),
                           ('private_key', 'FORBIDDEN')]:
            bad = {**self.record, key: value}
            self.file.write_text(json.dumps(bad), encoding='utf8')
            with self.assertRaises(ValueError):
                probe.credential(self.env)
        for mutate in (lambda r: r['credential_source'].update(file='/tmp/other'),
                       lambda r: r['credential_source']['headers'].update(Authorization='Bearer other'),
                       lambda r: r['credential_source'].update(url='https://example.invalid'),
                       lambda r: r.update(service_account_impersonation={'token_lifetime_seconds': 600})):
            bad = copy.deepcopy(self.record)
            mutate(bad)
            self.file.write_text(json.dumps(bad), encoding='utf8')
            with self.assertRaises(ValueError):
                probe.credential(self.env)
        self.file.write_text(json.dumps(self.record), encoding='utf8')
        with self.assertRaises(ValueError):
            probe.credential({**self.env, 'GITHUB_WORKSPACE': str(self.base / 'elsewhere')})
        self.assertEqual(json.loads(self.file.read_text()), self.record)

    def exercise(self, bad=None):
        temp = self.base / ('run-' + str(len(list(self.base.iterdir()))))
        temp.mkdir()
        calls = []

        def run(args, env, cwd):
            calls.append(args)
            self.assertEqual(cwd, temp)
            for key in ('FIREBASE_TOKEN', 'GOOGLE_OAUTH_ACCESS_TOKEN', 'FIREBASE_HOSTING_URL',
                        'GH_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN'):
                self.assertNotIn(key, env)
            self.assertEqual(json.loads((temp / 'configstore/firebase-tools.json').read_text()), {'usage': False})
            if args == ['node', '--version']:
                return 'wrong' if bad == 'node' else probe.PROFILE['node']
            if args == ['gcloud', 'version', '--format=json']:
                return json.dumps({'Google Cloud SDK': 'wrong' if bad == 'gcloud' else probe.PROFILE['gcloud']})
            if args == ['gcloud', 'auth', 'application-default', 'print-access-token']:
                return 'bad token' if bad == 'token' else 'PUBLIC-SYNTHETIC-TOKEN'
            self.assertEqual(args, ['node', str(probe.ROOT / 'tests/firestore-rules/node_modules/firebase-tools/lib/bin/firebase.js'),
                                    'hosting:sites:get', 'livepalmes', '--project', 'livepalmes', '--json', '--non-interactive'])
            return json.dumps({'status': 'error' if bad == 'cli' else 'success', 'result': self.site})

        def read(token):
            self.assertEqual(token, 'PUBLIC-SYNTHETIC-TOKEN')
            return {**self.site, 'name': 'other'} if bad == 'site' else self.site

        report = probe.exercise(self.env, temp, run, read)
        self.assertEqual(len(calls), 4)
        self.assertTrue(report['pythonGcloudSiteRead'] and report['firebaseCliSiteRead'])
        self.assertFalse(report['renewalQualifiedByThisControl'])
        self.assertFalse(report['credentialsExported'] or report['tokensExported'])
        for text in ('PUBLIC-', 'NOT-EXPORTED', 'private_key', 'FORBIDDEN'):
            self.assertNotIn(text, json.dumps(report))
        return report

    def test_exact_commands_and_public_receipt(self):
        self.exercise()
        for bad in ('node', 'gcloud', 'token', 'site', 'cli'):
            with self.assertRaises(ValueError):
                self.exercise(bad)

    def test_closed_http_and_redirects(self):
        class Response:
            status = 200
            def __enter__(inner): return inner
            def __exit__(inner, *args): pass
            def read(inner, limit):
                self.assertEqual(limit, 65537)
                return json.dumps(self.site).encode()
        with patch.object(probe.urllib.request, 'build_opener') as build:
            build.return_value.open.return_value = Response()
            self.assertEqual(probe.site_name(probe.read_site('PUBLIC-TOKEN')), self.site['name'])
            request = build.return_value.open.call_args.args[0]
            self.assertEqual(request.full_url, probe.SITE_URL)
            self.assertEqual(request.get_method(), 'GET')
            self.assertEqual(build.return_value.open.call_args.kwargs, {'timeout': 30})
        with self.assertRaises(ValueError):
            probe.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://example.invalid')


if __name__ == '__main__':
    unittest.main()
