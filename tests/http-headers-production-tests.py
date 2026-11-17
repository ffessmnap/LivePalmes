"""A3.6a closed PROD promotion: refusal, drift and HTTP budgets; offline fixtures only."""
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


policy = load('a36_production_tests', 'http-headers-production-policy.py')
cycle = load('a36_cycle_tests', 'release-cycle.py')
request = json.loads((ROOT / '.github/releases/20261117-a36-http-headers.json').read_text(encoding='utf-8'))
before = json.loads((ROOT / 'tests/fixtures/firebase-a3-http-before.json').read_text(encoding='utf-8'))
after = deepcopy(before)
after['hosting']['headers'][0:0] = [{'source': r, 'headers': [{'key': k, 'value': v} for k, v in policy.HEADERS.items()]} for r in policy.ROUTES]


def rest_config(config):
    h = config['hosting']
    result = {'headers': [{'glob': r['source'], 'headers': {v['key']: v['value'] for v in r['headers']}} for r in h['headers']],
              'redirects': [{'glob': r['source'], 'location': r['destination'], 'statusCode': r['type']} for r in h['redirects']]}
    result['rewrites'] = []
    for r in h['rewrites']:
        v = {'glob': r['source']}
        if 'destination' in r:
            v['path'] = r['destination']
        else:
            v.update(function=r['function']['functionId'], functionRegion=r['function']['region'])
        result['rewrites'].append(v)
    return result


def fixture_functions():
    return [{'name': f'projects/livepalmes/locations/europe-west1/functions/fixture{i}', 'state': 'ACTIVE',
             'updateTime': '2026-11-17T00:00:00Z', 'environment': 'GEN_2',
             'labels': {'livepalmes-commit': policy.BASE},
             'buildConfig': {'runtime': 'nodejs22', 'source': {'storageSource': {'object': 'fixture.zip'}}},
             'serviceConfig': {'revision': f'fixture{i}-00001', 'environmentVariables': {'FIXTURE': 'unchanged'},
                               'secretEnvironmentVariables': [{'key': 'FAKE', 'secret': 'FAKE', 'version': 'latest'}]}}
            for i in range(119)]


class HttpHeadersProductionTests(unittest.TestCase):
    def seed(self, root):
        for name, value in [('request.json', request), ('selection.json', []), ('http_headers-scope-proof.json', policy.scope())]:
            (root / name).write_text(json.dumps(value), encoding='utf-8')

    def test_sealed_contract_and_independent_rest_translation(self):
        c = policy.contract()
        self.assertEqual(c['candidate'], policy.CANDIDATE)
        self.assertEqual(c['routes'], policy.ROUTES)
        self.assertEqual(c['headers'], policy.HEADERS)
        policy.validate_sources(before, after)
        self.assertEqual(policy.check_config(rest_config(before)), c['hostingConfigBeforeSha256'])
        self.assertEqual(policy.check_config(rest_config(after), after=True), c['hostingConfigAfterSha256'])

    def test_generic_configuration_and_test_only_contract_stay_closed(self):
        test = load('a36_test_only', 'test-http-headers-policy.py')
        for classifier in [cycle.classify, cycle.classify_test]:
            with self.assertRaises(ValueError): classifier(['firebase.json'])
        with self.assertRaises(ValueError): test.validate_sources(before, after, 'livepalmes', True, '')
        self.assertFalse(policy.approved({'schema': 1}))

    def test_request_version_validation_and_option_mutations_refused(self):
        self.assertTrue(policy.approved(request))
        cases = []
        for key, val in [('candidate', 'a'*40), ('productionCommit', 'a'*40), ('productionHosting', 'sites/livepalmes/versions/other'), ('testRun', 1), ('schema', 2)]:
            v = deepcopy(request); v[key] = val; cases.append(v)
        for key in ['standardSources', 'freezeTestCandidate', 'approved_a3_http_headers', 'accessRevocationRelease']:
            v = deepcopy(request); v[key] = True; cases.append(v)
        for mutate in [lambda v: v[policy.OPTION].update(contractSha256='0'*64),
                       lambda v: v['changes'][0].update(paths=['firebase.json', 'functions/index.js']),
                       lambda v: v['changes'][0].update(status='conditional'),
                       lambda v: v['changes'][0]['source'].update(text='not a human validation')]:
            v = deepcopy(request); mutate(v); cases.append(v)
        for v in cases:
            with self.subTest(value=v), self.assertRaises(ValueError): policy.approved(v)

    def test_every_other_configuration_change_refused(self):
        mutations = [lambda c: c['hosting']['headers'][0].update(source='/**'),
                     lambda c: c['hosting']['headers'].pop(0),
                     lambda c: c['hosting']['headers'][0]['headers'].append({'key':'Content-Security-Policy','value':"default-src 'none'"}),
                     lambda c: c['hosting']['headers'][0]['headers'][0].update(value='other'),
                     lambda c: c['hosting']['headers'].append({'source':'/other.html','headers':[]})]
        for key in ['redirects', 'rewrites', 'ignore']:
            mutations.append(lambda c, k=key: c['hosting'].update({k: []}))
        for key in ['functions', 'firestore', 'storage']:
            mutations.append(lambda c, k=key: c.update({k: {}}))
        for mutate in mutations:
            v = deepcopy(after); mutate(v)
            with self.subTest(mutation=mutate), self.assertRaises(ValueError): policy.validate_sources(before, v)
        v = deepcopy(before); v['hosting']['ignore'].append('other/**')
        with self.assertRaises(ValueError): policy.validate_sources(v, after)

    def test_full_git_diff_calculates_empty_selection_without_override(self):
        paths = policy.contract()['changedPaths']
        self.assertEqual(policy.approved_paths(request, paths, cycle.git), {'firebase.json'})
        self.assertFalse(cycle.validate_request(request, paths))
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory); self.seed(p); (p/'paths.json').write_text(json.dumps(paths))
            with patch.object(cycle, 'safe_functions', side_effect=AssertionError('No manual function selection')):
                cycle.prepare_selection(p, policy.CANDIDATE)
            self.assertEqual(json.loads((p/'selection.json').read_text()), [])
        for bad in [paths + ['assets/unreviewed.js'], [x for x in paths if x != 'firebase.json']]:
            with self.assertRaises(ValueError): policy.approved_paths(request, bad, cycle.git)
        def changed_tree(*args):
            return 'a'*40 if args[0] == 'rev-parse' else cycle.git(*args)
        with self.assertRaises(ValueError): policy.approved_paths(request, paths, changed_tree)

    def test_inventory_and_configuration_source_binding_changes_refused(self):
        functions = fixture_functions(); c = deepcopy(policy.contract()); c['functionsSnapshotSha256'] = policy.digest(policy.minimal(functions))
        with patch.object(policy, 'contract', return_value=c):
            policy.initial(functions)
            initial = {f['name']: f for f in functions}
            policy.assert_retained(initial, deepcopy(initial))
            for mutate in [lambda f: f.pop(), lambda f: f.append(deepcopy(f[0])),
                           lambda f: f[0].update(state='FAILED'),
                           lambda f: f[0]['serviceConfig'].update(revision='changed'),
                           lambda f: f[0].update(updateTime='changed'),
                           lambda f: f[0]['labels'].update({'livepalmes-commit':'a'*40})]:
                v = deepcopy(functions); mutate(v)
                with self.assertRaises(ValueError): policy.initial(v)
            for mutate in [lambda f: f['serviceConfig']['environmentVariables'].update(FIXTURE='changed'),
                           lambda f: f['serviceConfig']['secretEnvironmentVariables'][0].update(version='1'),
                           lambda f: f['buildConfig']['source']['storageSource'].update(object='changed.zip'),
                           lambda f: f['labels'].update(other='new')]:
                v = deepcopy(initial); mutate(v[functions[0]['name']])
                with self.assertRaises(ValueError): policy.assert_retained(initial, v)

    def test_plan_nonempty_selection_missing_proof_and_resume_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory); self.seed(p); policy.plan(p)
            (p/'selection.json').write_text('["readNapPublicSwimmer"]')
            with self.assertRaises(ValueError): policy.plan(p)
            self.seed(p); (p/'http_headers-scope-proof.json').unlink()
            with self.assertRaises(FileNotFoundError): policy.plan(p)
            self.seed(p); (p/'previous').mkdir()
            with self.assertRaises(ValueError): policy.plan(p)

    def test_mail_witnesses_strictly_identical_and_drift_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory); self.seed(p)
            with patch.object(policy, 'load', return_value=SimpleNamespace(controls=lambda:policy.contract()['controls'])):
                policy.guard(p); policy.guard(p, True)
                self.assertEqual((p/'http_headers-controls-before.json').read_bytes(), (p/'http_headers-controls-after.json').read_bytes())
            altered={**policy.contract()['controls'], 'mailSha256':'0'*64}
            with patch.object(policy, 'load', return_value=SimpleNamespace(controls=lambda:altered)), self.assertRaises(ValueError): policy.guard(p, True)
            (p/'http_headers-controls-before.json').unlink()
            with patch.object(policy, 'load', return_value=SimpleNamespace(controls=lambda:policy.contract()['controls'])), self.assertRaises(ValueError): policy.guard(p, True)

    def test_fresh_hosting_baseline_and_exact_rollback(self):
        current={'name':'sites/livepalmes/releases/fixture', 'message':'LivePalmes fixture',
                 'version':{'name':policy.contract()['productionHosting'], 'config':rest_config(before)}}
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory); self.seed(p)
            (p/'prod-before.json').write_text(json.dumps({'hosting':{'name':current['name'],'version':current['version']['name'],'message':current['message']}}))
            with patch.object(policy, 'latest_hosting', return_value=current): policy.before_hosting(p)
            v=deepcopy(current);v['name']+='drift'
            with patch.object(policy, 'latest_hosting', return_value=v),self.assertRaises(ValueError): policy.before_hosting(p)
        published=deepcopy(current);published['version']['config']=rest_config(after)
        report={policy.OPTION:policy.CONTRACT_SHA256,'candidate':policy.CANDIDATE,'functions':[],'newFunctions':[]}
        policy.rollback_check(report,published,current)
        for path in ['headers','redirects','rewrites']:
            v=deepcopy(published);v['version']['config'][path]=[]
            with self.assertRaises(ValueError): policy.rollback_check(report,v,current)

    def test_official_readiness_same_controller_and_nonzero_runs_required(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);self.seed(p)
            with self.assertRaises(ValueError): policy.readiness(p, '1', '0')
            fake=SimpleNamespace(gh=lambda _:dict(head_sha='b'*40,run_attempt=1,path='.github/workflows/livepalmes-production-preflight.yml',conclusion='success'))
            with patch.object(policy,'load',return_value=fake),patch.dict(os.environ,GITHUB_REPOSITORY='ffessmnap/LivePalmes',GITHUB_SHA='a'*40),self.assertRaises(ValueError): policy.readiness(p,'1','2')

    def test_five_final_routes_raw_bytes_and_exactly_two_home_heads(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);self.seed(p)
            for route in policy.ROUTES[2:]: (p/route[1:]).write_bytes(b'fixture html')
            calls=[]
            def read(route,method):
                calls.append((route,method))
                return 200,b'' if method=='HEAD' else b'fixture html',{**policy.HEADERS,'Content-Type':'text/html; charset=utf-8','X-LivePalmes-Home-Source':'nap-server-html','Cache-Control':'private, no-store'}
            published={'message':f'LivePalmes {policy.CANDIDATE} run 123','version':{'name':'sites/livepalmes/versions/fixture','config':rest_config(after)}}
            with patch.object(policy,'latest_hosting',return_value=published),patch.dict(os.environ,GITHUB_RUN_ID='123'):
                result=policy.check_hosting(p,p,p/'receipt.json',read,lambda _:None)
            self.assertTrue(result['verified']);self.assertEqual(calls,[(r,'HEAD' if r in policy.ROUTES[:2] else 'GET') for r in policy.ROUTES])
            self.assertEqual([o['bytesReceived'] for o in result['observations'][:2]],[0,0])
            calls.clear()
            def wrong_home(route,method): calls.append((route,method));return 200,b'',{'Content-Type':'text/html'}
            with patch.object(policy,'latest_hosting',return_value=published),patch.dict(os.environ,GITHUB_RUN_ID='123'),self.assertRaises(ValueError): policy.check_hosting(p,p,p/'receipt.json',wrong_home,lambda _:None)
            self.assertEqual(calls,[('/','HEAD')]);self.assertFalse(json.loads((p/'receipt.json').read_text())['verified'])

    def test_authenticated_readiness_accepts_only_matching_complete_reports(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);self.seed(p)
            expected={'name':'release-fixture','version':policy.contract()['productionHosting'],'message':'fixture'}
            (p/'prod-before.json').write_text(json.dumps({'hosting':expected}))
            reports={k:{'planRun':1,'candidate':policy.CANDIDATE,'kind':k,'readOnly':True,'ready':True,'missingPermissions':[],policy.OPTION:{'contractSha256':policy.CONTRACT_SHA256}} for k in ['hosting','backend']}
            reports['hosting'][policy.OPTION].update(configurationSha256=policy.contract()['hostingConfigBeforeSha256'],hosting=expected)
            reports['backend'][policy.OPTION].update(selected=[],preservedFunctions=119,controls=policy.contract()['controls'],functionsWitnessSha256='a'*64)
            def artifact(run,name,destination,workflow):
                kind=name.removeprefix('production-prerequisites-');destination.mkdir(parents=True,exist_ok=True)
                (destination/('prerequisites-'+kind+'.json')).write_text(json.dumps(reports[kind]))
                return {'head_sha':'a'*40}
            fake=SimpleNamespace(gh=lambda _:dict(head_sha='a'*40,run_attempt=1,path='.github/workflows/livepalmes-production-preflight.yml',conclusion='success'),artifact=artifact)
            with patch.object(policy,'load',return_value=fake),patch.dict(os.environ,GITHUB_REPOSITORY='ffessmnap/LivePalmes',GITHUB_SHA='a'*40):
                policy.readiness(p,'1','2')
                for key,val in [('planRun',99),('ready',False),('missingPermissions',['fixture.denied'])]:
                    old=reports['backend'][key];reports['backend'][key]=val
                    with self.assertRaises(ValueError):policy.readiness(p,'1','2')
                    reports['backend'][key]=old

    def test_backup_requires_fresh_configuration_witness_and_empty_selection(self):
        functions=fixture_functions();c=deepcopy(policy.contract());c['functionsSnapshotSha256']=policy.digest(policy.minimal(functions))
        with patch.object(policy,'contract',return_value=c),tempfile.TemporaryDirectory() as directory:
            p=Path(directory);self.seed(p);d=p/'http_headers-readiness-backend';d.mkdir()
            (d/'prerequisites-backend.json').write_text(json.dumps({policy.OPTION:{'functionsWitnessSha256':policy.function_witness(functions)}}))
            self.assertEqual(policy.backup_review(p,[],functions,{'config':rest_config(before)}),policy.CONTRACT_SHA256)
            with self.assertRaises(ValueError):policy.backup_review(p,['fixture0'],functions,{'config':rest_config(before)})
            changed=deepcopy(functions);changed[0]['serviceConfig']['environmentVariables']['FIXTURE']='drift'
            with self.assertRaises(ValueError):policy.backup_review(p,[],changed,{'config':rest_config(before)})

    def test_required_pipeline_guards_and_preservation_are_present(self):
        workflow=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        self.assertIn('http-headers-production-policy.py readiness',workflow)
        self.assertIn('http-headers-production-policy.py before-hosting',workflow)
        self.assertLess(workflow.index('http-headers-production-policy.py before-hosting'),workflow.index('firebase deploy --project livepalmes'))
        self.assertIn('http-headers-production-policy.py hosting',workflow)
        self.assertIn('production-http-headers-check.json',workflow)
        self.assertEqual(cycle.idf_preservation(request),{'scope':'all','httpHeadersControlsUnchanged':True})


if __name__ == '__main__':
    unittest.main()
