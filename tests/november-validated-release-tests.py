"""Offline tests of the exact November release, including its immediate consumers."""
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('november_tests', ROOT / 'tools/november-validated-release-policy.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
state = m.load('november_test_state', 'production-release-state.py')
c = m.contract()


def request():
    return {**{k: c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']},
            'schema': 1, 'novemberValidatedRelease': {'contractSha256': m.DIGEST}}


def fixture(name):
    return {'name': m.PREFIX + name, 'state': 'ACTIVE', 'environment': 'GEN_2',
            'labels': {'preserved': 'yes', 'livepalmes-commit': 'old'},
            'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name},
            'serviceConfig': {'revision': 'old', 'timeoutSeconds': 60,
                              'serviceAccountEmail': c['runtimeAccount'],
                              'environmentVariables': {'LIVEPALMES_ENFORCE_APP_CHECK': 'false'}}}


def inventory():
    rows = [fixture(row['name'].split('/')[-1]) for row in c['origins']]
    next(f for f in rows if f['name'] == m.PREFIX+c['smtpReference'])['serviceConfig']['secretEnvironmentVariables'] = deepcopy(c['smtpBindings'])
    return rows


class NovemberTests(unittest.TestCase):
    def test_closed_version_options_and_selection(self):
        self.assertEqual(len(m.approved(request())), 115)
        self.assertEqual(len(c['selected']), 117)
        self.assertEqual(set(c['selected'])-set(c['sourceOnly']), set(c['newFunctions']))
        m.selection(request(), c['selected'])
        for change in [{'candidate': 'a'*40}, {'testRun': 1}, {'productionCommit': 'b'*40},
                       {'productionHosting': 'sites/livepalmes/versions/other'},
                       {'freezeTestCandidate': True}, {'additionalPdfFunctions': []},
                       {'novemberValidatedRelease': {'contractSha256': '0'*64}}]:
            with self.assertRaises(ValueError):
                m.approved({**request(), **change})
        for names in [c['selected'][:-1], c['selected']+[c['selected'][0]], c['selected']+['other']]:
            with self.assertRaises(ValueError):
                m.selection(request(), names)
        self.assertEqual(m.approved({}), [])

    def test_authenticated_origins_and_legacy_review(self):
        maps = {}
        for row in c['reviewedLegacyOrigins']:
            maps.setdefault(row['commit'], {})[row['name']] = row['before']
            maps.setdefault(c['candidate'], {})[row['name']] = row['after']
        rows = {f['name'].split('/')[-1]: f for f in deepcopy(c['origins'])}
        proof = m.verify(request(), {'productionRun': c['productionRun']}, rows, maps.__getitem__)
        self.assertFalse(proof['mailPause'])
        self.assertEqual(proof['networkCalls'], 0)
        rows[next(iter(rows))]['revision'] = 'drift'
        with self.assertRaisesRegex(ValueError, 'Origines'):
            m.verify(request(), {'productionRun': c['productionRun']}, rows, maps.__getitem__)

    def test_initial_runtime_and_existing_smtp_reference(self):
        rows = inventory()
        m.initial(rows)
        for mutation in ['account', 'binding', 'already-bound', 'new-function']:
            changed = deepcopy(rows)
            target = next(f for f in changed if f['name'] == m.PREFIX+c['smtpFunction'])
            reference = next(f for f in changed if f['name'] == m.PREFIX+c['smtpReference'])
            if mutation == 'account': target['serviceConfig']['serviceAccountEmail'] = 'other@example.test'
            if mutation == 'binding': reference['serviceConfig']['secretEnvironmentVariables'][0]['version'] = 'latest'
            if mutation == 'already-bound': target['serviceConfig']['secretEnvironmentVariables'] = deepcopy(c['smtpBindings'])
            if mutation == 'new-function': changed.append(fixture(c['newFunctions'][0]))
            with self.assertRaises(ValueError):
                m.initial(changed)

    def test_patch_surface_and_exactly_one_configuration_exception(self):
        changes = []
        for name in c['sourceOnly']:
            before = fixture(name)
            body, mask = m.source_patch(before, {'bucket': 'source-bucket', 'object': 'source.zip'})
            self.assertEqual(body['labels']['preserved'], 'yes')
            self.assertEqual(body['labels']['livepalmes-commit'], c['candidate'])
            self.assertEqual(body['buildConfig'], {'source': {'storageSource': {'bucket': 'source-bucket', 'object': 'source.zip'}}})
            if 'serviceConfig' in body:
                changes.append(name)
                self.assertEqual(body['serviceConfig'], {'secretEnvironmentVariables': c['smtpBindings']})
                self.assertEqual(mask, 'build_config.source,labels,service_config.secret_environment_variables')
            else:
                self.assertEqual(mask, 'build_config.source,labels')
                self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
        self.assertEqual(changes, [c['smtpFunction']])
        with self.assertRaises(ValueError):
            m.source_patch(fixture('unreviewed'), {'bucket': 'bucket', 'object': 'source'})

    def test_all_existing_configurations_preserved_except_the_six_bindings(self):
        for name in c['sourceOnly']:
            before = fixture(name)
            before['eventTrigger'] = {'eventType': 'fixed', 'retryPolicy': 'RETRY_POLICY_RETRY'}
            after = deepcopy(before)
            after['labels']['livepalmes-commit'] = c['candidate']
            if name == c['smtpFunction']:
                after['serviceConfig']['secretEnvironmentVariables'] = deepcopy(c['smtpBindings'])
            m.assert_config(before, after, state)
            after['serviceConfig']['timeoutSeconds'] += 1
            with self.assertRaises(ValueError): m.assert_config(before, after, state)
        before = fixture(c['smtpFunction'])
        after = deepcopy(before)
        after['labels']['livepalmes-commit'] = c['candidate']
        after['serviceConfig']['secretEnvironmentVariables'] = deepcopy(c['smtpBindings'])
        for key, value in [('serviceAccountEmail', 'other@example.test'), ('secretVolumes', [{'mountPath': '/secret'}])]:
            changed = deepcopy(after); changed['serviceConfig'][key] = value
            with self.assertRaises(ValueError): m.assert_config(before, changed, state)
        after['serviceConfig']['secretEnvironmentVariables'][0]['version'] = '2'
        with self.assertRaises(ValueError): m.assert_config(before, after, state)

    def test_controls_ignore_execution_dates_but_never_configuration(self):
        values = {'mail': {'fields': {'enabled': {'booleanValue': True}, 'scope': {'stringValue': 'all'}, 'revision': {'integerValue': '9'}}},
                  'templates': {'fields': {'custom': 'unchanged'}},
                  'scheduler': {'state': 'ENABLED', 'schedule': '0 * * * *', 'timeZone': 'Europe/Paris', 'scheduleTime': 'before'},
                  'queue': {'name': 'queue', 'state': 'RUNNING', 'rateLimits': {'maxConcurrentDispatches': 1}}}
        digest = lambda v: hashlib.sha256(json.dumps(v, sort_keys=True).encode()).hexdigest()
        expected = {'mailSha256': digest(values['mail']), 'schedulerSha256': digest({k:v for k,v in values['scheduler'].items() if k!='scheduleTime'}), 'queueSha256': digest(values['queue'])}
        with patch.object(m, 'contract', return_value={**c, 'controls': expected}):
            first = m.controls(values)
            values['scheduler']['scheduleTime'] = 'later'
            self.assertEqual(first, m.controls(values))
            values['queue']['rateLimits']['maxConcurrentDispatches'] = 2
            with self.assertRaisesRegex(ValueError, 'Derive'): m.controls(values)
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); (p/'request.json').write_text(json.dumps(request()))
            with patch.object(m, 'observe_controls', return_value=first):
                m.guard(p); m.guard(p, True)
            with patch.object(m, 'observe_controls', return_value={**first, 'templatesSha256': 'drift'}):
                with self.assertRaisesRegex(ValueError, 'Derive'): m.guard(p)

    def test_event_filter_permutation_only(self):
        for name in ['syncEngagementMailRecipientIndex', 'syncNapClubAccountEmails']:
            before = fixture(name)
            before['eventTrigger'] = {'eventType': 'google.cloud.firestore.document.v1.written',
                'eventFilters': [{'attribute': 'database', 'value': '(default)'},
                                 {'attribute': 'document', 'value': 'users/{uid}', 'operator': 'match-path-pattern'}]}
            after = deepcopy(before); after['labels']['livepalmes-commit'] = c['candidate']
            after['eventTrigger']['eventFilters'].reverse()
            m.assert_config(before, after, state)
            for mutation in ['value', 'operator', 'duplicate', 'missing-field', 'shape']:
                changed = deepcopy(after); filters = changed['eventTrigger']['eventFilters']
                if mutation == 'value': filters[0]['value'] = 'other/{id}'
                if mutation == 'operator': filters[0]['operator'] = 'other'
                if mutation == 'duplicate': filters.append(deepcopy(filters[0]))
                if mutation == 'missing-field': del filters[0]['operator']
                if mutation == 'shape': changed['eventTrigger']['eventFilters'] = {'document': 'users/{uid}'}
                with self.assertRaises(ValueError): m.assert_config(before, changed, state)

    def test_publish_patches_all_selected_existing_sources_without_business_or_iam_calls(self):
        before_rows = inventory()
        current = {f['name']: deepcopy(f) for f in before_rows}
        requests = []
        def api(url, method='GET', body=None):
            requests.append((url, method, body))
            if url.endswith(':generateUploadUrl'):
                self.assertEqual(method, 'POST')
                return {'uploadUrl': 'https://storage.googleapis.com/source-bucket/upload', 'storageSource': {'bucket': 'source-bucket', 'object': 'code.zip'}}
            full = url.removeprefix(state.API).split('?')[0]
            self.assertIn(full, current)
            if method == 'PATCH':
                updated = current[full]
                updated['buildConfig'].update(deepcopy(body['buildConfig']))
                updated['labels'] = deepcopy(body['labels'])
                updated['serviceConfig'].update(deepcopy(body.get('serviceConfig', {})))
                updated['serviceConfig']['revision'] = 'new'
                return {'done': True}
            self.assertEqual(method, 'GET')
            return deepcopy(current[full])
        fake = SimpleNamespace(API=state.API, inventory=lambda: list(current.values()), identity=state.identity,
                               rollback_patch=state.rollback_patch, request=api, wait_operation=lambda _: None)
        cycle = SimpleNamespace(read=lambda path: json.loads(path.read_text()))
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); plan = p/'plan'; backup = p/'backup'; plan.mkdir(); backup.mkdir()
            (plan/'request.json').write_text(json.dumps(request()))
            (plan/'selection.json').write_text(json.dumps(c['selected']))
            (backup/'functions.json').write_text(json.dumps(before_rows))
            (backup/'report.json').write_text(json.dumps({'candidate': c['candidate'], 'additionalNovemberFunctions': c['sourceOnly']}))
            with patch.object(m, 'load', return_value=fake), patch.object(m, 'guard'), patch.object(m.urllib.request, 'urlopen', return_value=MagicMock()):
                m.publish_sources(p, plan, backup, cycle, lambda _root, sha: b'fixture-source')
        patches = [r for r in requests if r[1]=='PATCH']
        self.assertEqual(len(patches), 115)
        self.assertEqual(sum('serviceConfig' in r[2] for r in patches), 1)
        self.assertEqual({r[2]['name'].split('/')[-1] for r in patches}, set(c['sourceOnly']))
        self.assertFalse(any('IamPolicy' in r[0] or 'run.app' in r[0] or 'cloudfunctions.net' in r[0] for r in requests))

    def test_resume_requires_the_authenticated_initial_templates_witness(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); source = p/'previous/guards'; source.mkdir(parents=True)
            (p/'request.json').write_text(json.dumps(request()))
            (p/'previous/production-after.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'absent'): m.restore_witness(p, source)
            with patch.object(m, 'observe_controls') as observe:
                with self.assertRaisesRegex(ValueError, 'absent'): m.guard(p)
                observe.assert_not_called()
            initial = {**c['controls'], 'templatesSha256': 'a'*64}
            (source/'november-controls-before.json').write_text(json.dumps(initial))
            m.restore_witness(p, source)
            with patch.object(m, 'observe_controls', return_value={**initial, 'templatesSha256': 'b'*64}):
                with self.assertRaisesRegex(ValueError, 'Derive'): m.guard(p)
            with patch.object(m, 'observe_controls', return_value=initial):
                m.guard(p)
            (source/'november-controls-before.json').write_text(json.dumps({**initial, 'mailSha256': '0'*64}))
            with self.assertRaisesRegex(ValueError, 'incompatible'): m.restore_witness(p, source)

    def test_integration_and_workflow_order(self):
        cycle = m.load('november_test_cycle', 'release-cycle.py')
        self.assertEqual(cycle.approved_extra_functions(request()), c['sourceOnly'])
        self.assertIsNotNone(cycle.idf_preservation(request()))
        workflow = (ROOT/'.github/workflows/livepalmes-production-release.yml').read_text(encoding='utf-8')
        before = workflow.index('python tooling/tools/november-validated-release-policy.py candidate')
        ordinary = workflow.index('"$RELEASE_SELECTION" deploy')
        self.assertLess(before, ordinary)
        self.assertIn('release-plan/november-*.json', workflow)
        self.assertIn('november-validated-release-tests.py', (ROOT/'.github/workflows/livepalmes-verification-preview.yml').read_text())

    def test_existing_functions_never_return_to_the_cli(self):
        cycle = m.load('november_cli_cycle', 'release-cycle.py')
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); (p/'request.json').write_text(json.dumps(request()))
            selection = p/'selection.json'; selection.write_text(json.dumps(c['selected']))
            credentials = p/'credentials.json'; credentials.write_text(json.dumps({'project_id':'livepalmes'}))
            with patch.dict(os.environ, {'PLAN':str(p), 'GOOGLE_APPLICATION_CREDENTIALS':str(credentials), 'CANDIDATE_SHA':c['candidate']}), \
                 patch.object(cycle, 'safe_functions', return_value=c['selected']), patch.object(cycle, 'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes', ROOT, p, selection, True)
            deploy.assert_called_once()
            args = deploy.call_args.args[0]
            self.assertEqual(args[args.index('--only')+1], ','.join('functions:'+n for n in c['newFunctions']))

    def test_elapsed_budget_prevents_any_new_patch(self):
        rows = inventory()
        fake = SimpleNamespace(inventory=lambda: deepcopy(rows), identity=state.identity)
        cycle = SimpleNamespace(read=lambda path: json.loads(path.read_text()))
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); plan = p/'plan'; backup = p/'backup'; plan.mkdir(); backup.mkdir()
            (plan/'request.json').write_text(json.dumps(request()))
            (plan/'selection.json').write_text(json.dumps(c['selected']))
            (backup/'functions.json').write_text(json.dumps(rows))
            (backup/'report.json').write_text(json.dumps({'candidate':c['candidate'], 'additionalNovemberFunctions':c['sourceOnly']}))
            with patch.object(m, 'load', return_value=fake), patch.object(m, 'guard'), patch.object(m.urllib.request, 'urlopen') as network:
                with self.assertRaisesRegex(ValueError, 'Budget'): m.publish_sources(p, plan, backup, cycle, lambda *_: b'code', 0)
                network.assert_not_called()

    def test_common_postcheck_covers_every_existing_configuration_and_both_new_functions(self):
        before = inventory(); after = deepcopy(before)
        for f in after:
            if f['name'].split('/')[-1] in c['sourceOnly']:
                f['labels']['livepalmes-commit'] = c['candidate']
            if f['name'] == m.PREFIX+c['smtpFunction']:
                f['serviceConfig']['secretEnvironmentVariables'] = deepcopy(c['smtpBindings'])
        for name in c['newFunctions']:
            f = fixture(name); f['labels']['livepalmes-commit'] = c['candidate']
            f['serviceConfig'].update(availableMemory='1024Mi', timeoutSeconds=120, maxInstanceCount=2,
                maxInstanceRequestConcurrency=4, secretEnvironmentVariables=[{'key':'LIVEPALMES_NAP_PASSWORD',
                    'secret':'LIVEPALMES_NAP_PASSWORD','projectId':'livepalmes','version':'2'}])
            after.append(f)
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            (p/'functions.json').write_text(json.dumps(before))
            (p/'report.json').write_text(json.dumps({'candidate':c['candidate'],'commitLabel':True,
                'functions':[{'name':f['name']} for f in before if f['name'].split('/')[-1] in c['sourceOnly']], 'newFunctions':c['newFunctions'],
                'appCheck':'false','additionalNovemberFunctions':c['sourceOnly']}))
            with patch.object(state, 'inventory', return_value=after), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY':str(p/'summary')}):
                state.check_after(p,p/'after.json',True)
                after[0]['serviceConfig']['maxInstanceCount'] = 99
                with self.assertRaisesRegex(ValueError, 'Controle'): state.check_after(p,p/'after.json',True)
                del after[0]['serviceConfig']['maxInstanceCount']
                after[-1]['serviceConfig']['availableMemory'] = '512Mi'
                with self.assertRaisesRegex(ValueError, 'Controle'): state.check_after(p,p/'after.json',True)

    def test_retained_preferences_require_the_real_test_origin(self):
        rows = [{**row, 'name':row['name'].replace('projects/livepalmes/', 'projects/livepalmes-test/')}
                for row in c['origins'] if row['name'].split('/')[-1] in c['retainedFunctions']]
        proof = {'candidate':c['candidate'], 'state':{'functions':rows}}
        m.retained_test_origins(request(), proof)
        for key, replacement in [('commit', c['candidate']), ('state', 'FAILED'), ('updateTime', '')]:
            changed = deepcopy(proof)
            changed['state']['functions'][0][key] = replacement
            with self.assertRaisesRegex(ValueError, 'Origines TEST'): m.retained_test_origins(request(), changed)
        wrong = deepcopy(proof); wrong['state']['functions'].append(wrong['state']['functions'][0])
        with self.assertRaisesRegex(ValueError, 'Origines TEST'): m.retained_test_origins(request(), wrong)

    def test_common_retained_review_uses_the_closed_proof_without_weakening_other_sources(self):
        cycle = m.load('november_retained_cycle', 'release-cycle.py')
        retained = [r for r in c['reviewedLegacyOrigins'] if r['name'] in c['retainedFunctions']]
        value = {**request(), 'excludedBackendEvidence':{'schema':1,'candidate':c['candidate'],
            'productionRun':c['productionRun'],'suite':'retained-calendar-consumers-v1',
            'functions':[{**r,'reason':'closed proof'} for r in retained]}}
        rows = [{**row, 'name':row['name'].replace('projects/livepalmes/', 'projects/livepalmes-test/')}
                for row in c['origins'] if row['name'].split('/')[-1] in c['retainedFunctions']]
        maps = {c['candidate']:{r['name']:r['after'] for r in retained},
                c['productionCommit']:{r['name']:'0'*64 for r in retained},
                retained[0]['commit']:{r['name']:r['before'] for r in retained}}
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)
            (p/'request.json').write_text(json.dumps(value)); (p/'baseline.json').write_text(json.dumps({'productionRun':c['productionRun']}))
            (p/'test-proof.json').write_text(json.dumps({'candidate':c['candidate'],'state':{'functions':rows}}))
            with patch.object(cycle, 'backend_fingerprints', side_effect=maps.__getitem__):
                cycle.verify_excluded_backend(p, {'functions':c['origins']}, c['selected'])
            result = json.loads((p/'excluded-backend-verification.json').read_text())
            self.assertEqual(result['retainedFunctions'], c['retainedFunctions'])
            self.assertEqual(result['passedFunctions'], c['retainedFunctions'])
            self.assertTrue(result['preferenceClosureUnchanged'])
            source = (ROOT/'tools/release-cycle.py').read_text(encoding='utf-8')
            self.assertIn('for n in november_release.approved(request)', source)
            self.assertIn("'Preuve TEST du 8 novembre absente ou incompatible'", source)


if __name__ == '__main__':
    unittest.main()
