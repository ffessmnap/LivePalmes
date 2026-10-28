"""Fail-closed complement: immutable scope, real state checks and source-only API mask."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import io
import zipfile
import urllib.error
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


p = load('nap_policy_tests', 'nap-retained-source-policy.py')
s = load('nap_state_tests', 'production-release-state.py')
publisher = load('nap_publisher_tests', 'nap-retained-sources.py')
c = load('nap_cycle_tests', 'release-cycle.py')


def request():
    value = {k: p.contract()[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']}
    value.update(schema=1, testBackendRuns=[p.contract()['napTestRun'], 99999999999],
                 napRetainedSourceRelease={'approval': 'ok', 'contractSha256': p.DIGEST},
                 changes=[{'title': 'Complement NAP', 'paths': [], 'status': 'validated',
                           'validation': 'Lot architecture valide ; preparation du complement demandee dans Infra.'}],
                 excludedBackendReview='98 sources deja publiees conservees',
                 excludedBackendEvidence={'schema': 1, 'candidate': p.contract()['candidate'],
                    'productionRun': p.contract()['productionRun'],
                    'suite': 'retained-calendar-consumers-v1', 'functions': []})
    return value


def function(name, project='livepalmes'):
    return {'name': f'projects/{project}/locations/europe-west1/functions/{name}',
            'environment': 'GEN_2', 'state': 'ACTIVE', 'updateTime': 'before',
            'labels': {'existing': 'keep'},
            'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name,
                'environmentVariables': {'KEEP': 'build'}, 'source': {'storageSource': {'bucket': 'old', 'object': 'old'}}},
            'serviceConfig': {'revision': 'old-revision', 'timeoutSeconds': 300,
                'environmentVariables': {'LIVEPALMES_ENFORCE_APP_CHECK': 'true'},
                'serviceAccountEmail': 'runtime@example.test',
                'secretEnvironmentVariables': [{'key': 'LIVEPALMES_NAP_PASSWORD',
                    'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes', 'version': '7'}]}}


def target_proof():
    value = {'schema': 1, 'candidate': p.contract()['candidate'], 'contractSha256': p.DIGEST,
             'toolingCommit': 'a' * 40, 'mailSettingUnchanged': True, 'schedulerUnchanged': True,
             'queueUnchanged': True, 'configurationsUnchanged': True,
             'testWrapperPreserved': True, 'sourceArchiveSha256': 'a' * 64,
             'currentTestState': copy.deepcopy(p.contract()['testBefore'])}
    rows = []
    for f in value['currentTestState']['functions']:
        if f['name'].split('/')[-1] in p.contract()['testSelected']:
            f.update(commit=p.contract()['candidate'], revision='new', updateTime='after')
            rows.append(f)
    value['state'] = {'functions': rows}
    return value


class Complement(unittest.TestCase):
    def test_forbidden_read_is_named_without_token_or_payload(self):
        from unittest.mock import MagicMock
        import contextlib
        values = [{'fields': {'enabled': {'booleanValue': False}}}, {'state': 'PAUSED'},
                  {'state': 'PAUSED'}, None, {}]
        calls = []
        def fetch(req, **kwargs):
            calls.append((req.full_url, req.get_method()))
            if '/tasks?' in req.full_url:
                raise urllib.error.HTTPError(req.full_url, 403, 'private-response', {}, None)
            value = values[len(calls) - 1]
            response = MagicMock()
            response.__enter__.return_value.read.return_value = json.dumps(value).encode()
            return response
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            credential = Path(directory) / 'credentials.json'
            credential.write_text('{"project_id":"livepalmes-test"}')
            with patch.dict(os.environ, {'GOOGLE_APPLICATION_CREDENTIALS': str(credential)}), \
                    patch.object(publisher.subprocess, 'check_output', return_value='private-token'), \
                    patch.object(publisher.urllib.request, 'urlopen', side_effect=fetch), contextlib.redirect_stdout(output):
                with self.assertRaisesRegex(ValueError, 'tasks=HTTP 403'):
                    publisher.controls('livepalmes-test')
        self.assertEqual(len(calls), 5)
        self.assertTrue(all(method == 'GET' for _, method in calls))
        self.assertIn('"tasks": "HTTP 403"', output.getvalue())
        self.assertNotIn('private-token', output.getvalue())
        self.assertNotIn('private-response', output.getvalue())

    def test_test_archive_keeps_project_fence_and_limited_exports(self):
        raw = io.BytesIO()
        with zipfile.ZipFile(raw, 'w') as archive:
            archive.writestr('index.js', 'const { defineBoolean, defineSecret } = require("firebase-functions/params");\nexports.existing = true;')
            archive.writestr('helper.js', 'module.exports = 1;')
        module = SimpleNamespace(archive=lambda *a: raw.getvalue())
        with patch.object(publisher, 'load', return_value=module):
            result = publisher.test_archive(ROOT, p.contract()['candidate'], {'LIVEPALMES_NAP_PASSWORD'})
        with zipfile.ZipFile(io.BytesIO(result)) as archive:
            wrapper = archive.read('index.js').decode()
            self.assertIn('environment.name !== "test"', wrapper)
            self.assertIn('environment.projectId !== "livepalmes-test"', wrapper)
            self.assertIn(json.dumps(p.contract()['testSelected']), wrapper)
            self.assertIn('deployedSecretNames.includes(name)', archive.read('backend-index.js').decode())
            self.assertEqual(archive.read('helper.js'), b'module.exports = 1;')

    def test_prod_origin_cannot_be_replaced_by_latest_labels(self):
        contract = p.contract()
        functions = {r['name']: {'state': 'ACTIVE', 'commit': r['commit'], 'revision': r['revision']} for r in contract['origins']}
        functions.update({'ordinary' + str(i): {} for i in range(98)})
        hashes = {}
        for row in contract['origins']:
            hashes.setdefault(row['commit'], {})[row['name']] = row['before']
            hashes.setdefault(contract['candidate'], {})[row['name']] = row['after']
        baseline = {'productionRun': contract['productionRun']}
        p.verify(request(), baseline, functions, lambda sha: hashes[sha])
        changed = copy.deepcopy(functions); changed[contract['selected'][0]]['revision'] = 'unattested'
        with self.assertRaises(ValueError): p.verify(request(), baseline, changed, lambda sha: hashes[sha])
        with self.assertRaises(ValueError): p.verify(request(), {'productionRun': 1}, functions, lambda sha: hashes[sha])

    def test_no_implicit_exception(self):
        self.assertEqual(p.approved({}), [])
        self.assertEqual(c.approved_extra_functions({}), [])
        self.assertEqual(len(p.approved(request())), 15)
        self.assertTrue(c.validate_request(request(), []))

    def test_scope_cannot_expand_or_follow_main(self):
        for key, value in [('candidate', '0' * 40), ('productionCommit', '0' * 40),
                           ('productionHosting', 'sites/livepalmes/versions/other'), ('testRun', 1),
                           ('additionalPublicNapFunctions', ['exportNapPublicPage']),
                           ('freezeTestCandidate', True), ('testBackendRuns', [1, 2])]:
            changed = request(); changed[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                p.approved(changed)
        changed = request(); changed['napRetainedSourceRelease']['contractSha256'] = '0' * 64
        with self.assertRaises(ValueError): p.approved(changed)

    def test_selection_is_all_fifteen_and_only_fifteen(self):
        names = p.contract()['selected']
        p.selection(request(), names)
        for changed in [names[:-1], names + ['exportNapPublicPage'], names + [names[0]]]:
            with self.assertRaises(ValueError): p.selection(request(), changed)

    def test_source_patch_preserves_bindings_and_trigger(self):
        old = function('closeDueEngagementCompetitions')
        old['eventTrigger'] = {'eventType': 'test', 'pubsubTopic': 'existing'}
        body = p.source_patch(old, {'bucket': 'upload', 'object': 'object'}, request())
        self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
        self.assertEqual(set(body['buildConfig']), {'source'})
        new = copy.deepcopy(old); new['labels'] = body['labels']; new['buildConfig']['source'] = body['buildConfig']['source']
        new['serviceConfig']['revision'] = 'new-revision'
        p.assert_config(old, new, s)
        for field in ['timeoutSeconds', 'secretEnvironmentVariables', 'environmentVariables', 'serviceAccountEmail']:
            changed = copy.deepcopy(new); changed['serviceConfig'][field] = None
            with self.subTest(field=field), self.assertRaises(ValueError): p.assert_config(old, changed, s)
        changed = copy.deepcopy(new); changed['eventTrigger']['pubsubTopic'] = 'other'
        with self.assertRaises(ValueError): p.assert_config(old, changed, s)
        changed = copy.deepcopy(new); changed['labels']['existing'] = 'changed'
        with self.assertRaises(ValueError): p.assert_config(old, changed, s)

    def test_reject_unknown_project_source_and_runtime(self):
        old = function('exportNapPublicPage')
        with self.assertRaises(ValueError): p.source_patch(old, {'bucket': 'b', 'object': 'o'}, request())
        old = function(p.contract()['selected'][0]); old['buildConfig']['runtime'] = 'nodejs20'
        with self.assertRaises(ValueError): p.runtime(old)
        with self.assertRaises(ValueError): p.runtime(function(p.contract()['selected'][0]), 'other-project')

    def test_test_fences_never_enable_or_pause_anything(self):
        args = [{'fields': {'enabled': {'booleanValue': False}}}, {'state': 'PAUSED'}, {'state': 'PAUSED'}, {}, {}]
        p.test_controls(*args)
        for i, bad in [(0, {'fields': {'enabled': {'booleanValue': True}}}),
                       (1, {'state': 'ENABLED'}), (2, {'state': 'RUNNING'}),
                       (3, {'tasks': [{'name': 'old-message'}]}), (3, {'nextPageToken': 'more'}),
                       (4, {'documents': [{'name': 'old-closure'}]})]:
            changed = copy.deepcopy(args); changed[i] = bad
            with self.subTest(i=i), self.assertRaises(ValueError): p.test_controls(*changed)

    def test_targeted_receipt_rejects_unrelated_drift(self):
        info = {'path': p.TEST_WORKFLOW, 'head_sha': 'a' * 40}
        cycle = SimpleNamespace(run=lambda *a: '', git=lambda *a: 'tools/approved.py', ROOT=ROOT)
        proof = target_proof()
        p.targeted(request(), proof, info, cycle)
        for key in ['mailSettingUnchanged', 'schedulerUnchanged', 'queueUnchanged', 'configurationsUnchanged']:
            bad = copy.deepcopy(proof); bad[key] = False
            with self.subTest(key=key), self.assertRaises(ValueError): p.targeted(request(), bad, info, cycle)
        bad = copy.deepcopy(proof); bad['currentTestState']['hosting']['version'] = 'other'
        with self.assertRaises(ValueError): p.targeted(request(), bad, info, cycle)
        bad = copy.deepcopy(proof); bad['currentTestState']['functions'][0]['revision'] = 'unreviewed'
        with self.assertRaises(ValueError): p.targeted(request(), bad, info, cycle)
        with self.assertRaises(ValueError): p.targeted(request(), proof, {**info, 'path': 'other'}, cycle)
        with self.assertRaises(ValueError): p.targeted(request(), proof, info,
            SimpleNamespace(run=lambda *a: '', git=lambda *a: 'functions/index.js', ROOT=ROOT))

    def test_source_update_uses_only_upload_and_source_mask(self):
        name = p.contract()['selected'][0]; old = function(name); full = old['name']; calls = []
        def api(url, method, body):
            calls.append((url, method, body))
            return {'uploadUrl': 'https://storage.googleapis.com/upload',
                    'storageSource': {'bucket': 'b', 'object': 'o'}} if method == 'POST' else {'done': True}
        fake = SimpleNamespace(API=s.API, identity=s.identity, request=api, wait_operation=lambda op: None)
        from unittest.mock import MagicMock
        with patch.object(publisher.urllib.request, 'urlopen', return_value=MagicMock()):
            publisher.update(ROOT, [name], {full: old}, {full: old}, 'livepalmes', fake,
                             lambda *a: b'fixture-source', request())
        self.assertEqual([x[1] for x in calls], ['POST', 'PATCH'])
        self.assertTrue(calls[1][0].endswith('?updateMask=build_config.source,labels'))
        self.assertNotIn('serviceConfig', calls[1][2])
        drift = copy.deepcopy(old); drift['updateTime'] = 'drift'
        calls.clear()
        with self.assertRaises(ValueError):
            publisher.update(ROOT, [name], {full: old}, {full: drift}, 'livepalmes', fake, lambda *a: b'', request())
        self.assertEqual(calls, [])

    def test_existing_state_check_blocks_changes_outside_selection(self):
        names = p.contract()['selected']
        before = [function(n) for n in names] + [function('ordinary' + str(i)) for i in range(98)]
        after = copy.deepcopy(before)
        for f in after[:15]:
            f['labels']['livepalmes-commit'] = p.contract()['candidate']
            f['serviceConfig']['revision'] = 'new-revision'; f['updateTime'] = 'after'
        report = {'candidate': p.contract()['candidate'], 'functions': [{'name': f['name']} for f in before[:15]],
                  'newFunctions': [], 'appCheck': 'false', 'commitLabel': True, 'additionalNapRetainedFunctions': names}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'functions.json').write_text(json.dumps(before))
            (root / 'report.json').write_text(json.dumps(report))
            with patch.object(s, 'inventory', return_value=after), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(root / 'summary')}):
                s.check_after(root, root / 'result.json', True)
                after[-1]['updateTime'] = 'unapproved'
                with self.assertRaises(ValueError): s.check_after(root, root / 'result.json', True)


if __name__ == '__main__':
    unittest.main()
