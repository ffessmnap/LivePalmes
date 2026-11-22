"""Offline historical comparison and source-only failure/resume boundaries."""
from copy import deepcopy
import importlib.util
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
_fixture_spec=importlib.util.spec_from_file_location('source_test_history',ROOT/'tests/helpers/history_fixture.py')
_fixture=importlib.util.module_from_spec(_fixture_spec);_fixture_spec.loader.exec_module(_fixture)
fixture_git=_fixture.fixture_git


def load(name):
    spec = importlib.util.spec_from_file_location('source_test_'+name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = load('standard-source-policy.py')
current_policy = load('standard-source-policy-v2.py')
publisher = load('standard-source-publish.py')
test_sources = load('publish-test-standard-sources.py')
legacy = load('public-navigation-touch-production-policy.py')
cycle = load('release-cycle.py')
state = load('production-release-state.py')
APPROVAL = {'threadId':'00000000-0000-0000-0000-000000000001',
            'messageId':'00000000-0000-0000-0000-000000000002',
            'text':'Fixture only: existing source and label; no live authorization'}


def historical():
    c = legacy.contract()
    baseline = {'productionRun':c['productionRun'], 'productionCommit':c['productionCommit'],
                'source':'verified-publication-artifacts'}
    names = {f['name'].split('/')[-1]: f for f in c['origins']}
    precise, conservative = {}, {}
    for row in c['reviewedSelectionOrigins']+c['reviewedRetainedOrigins']:
        for cache, before, after in [(precise,'before','after'),(conservative,'legacyBefore','legacyAfter')]:
            cache.setdefault(row['commit'], {})[row['name']] = row[before]
            cache.setdefault(c['candidate'], {})[row['name']] = row[after]
    # Declaration names are identical even for releases with mixed source origins.
    for cache in [precise, conservative]:
        cache.setdefault(c['productionCommit'], {}).update({n: cache.get(c['productionCommit'], {}).get(n, h)
                                                for n, h in cache[c['candidate']].items()})
    request = {k:c[k] for k in ['schema','candidate','productionCommit','productionHosting','testRun']}
    request.update(changes=[{'title':'Historical comparison fixture', 'paths':[], 'status':'validated',
                            'validation':'Not a new deployment approval'}], excludedBackendReview='offline comparison',
                   standardSources={'schema':1,'productionRun':c['productionRun'],'functions':c['selected'],
                       'approval':APPROVAL, 'controls':{**c['controls'],'templatesSha256':'1'*64}})
    return c, baseline, names, precise, conservative, request


def function(name, commit='a'*40):
    smtp = [{'key':key,'secret':key,'projectId':'livepalmes','version':'7'} for key in
            ['LIVEPALMES_SMTP_HOST','LIVEPALMES_SMTP_PORT','LIVEPALMES_SMTP_USER',
             'LIVEPALMES_SMTP_PASS','LIVEPALMES_SMTP_SECURE','LIVEPALMES_MAIL_FROM']]
    return {'name':publisher.PREFIX+name,'updateTime':'before','state':'ACTIVE','environment':'GEN_2',
            'buildConfig':{'runtime':'nodejs22','entryPoint':name,
                'source':{'storageSource':{'bucket':'before','object':'source','generation':'1'}}},
            'serviceConfig':{'revision':'before','serviceAccountEmail':'existing@example.invalid',
                'secretEnvironmentVariables':smtp if name == 'resolveAccessUserDeletionRequest' else [],
                'environmentVariables':{'UNCHANGED':'yes'}},'labels':{'livepalmes-commit':commit,'retained':'yes'}}


def model(directory, selected=None):
    selected = ['readNapPublicSwimmer'] if selected is None else selected
    before = [function('readNapPublicSwimmer'), function('resolveAccessUserDeletionRequest')]
    request = {'schema':1,'candidate':'b'*40,'productionCommit':'a'*40,
               'productionHosting':'sites/livepalmes/versions/before','testRun':12,
               'changes':[], 'standardSources':{'schema':1,'productionRun':11,'functions':selected,
                    'approval':APPROVAL,'controls':{k:'1'*64 for k in policy.CONTROL_KEYS}}}
    manifest = {'schema':1,'kind':policy.KIND,'requestSha256':policy.digest(request),'candidate':'b'*40,
                'productionRun':11,'productionCommit':'a'*40,'productionHosting':request['productionHosting'],
                'testRun':12,'selected':selected,'origins':[dict(state.identity(f),commit='a'*40) for f in before],
                'inventoryCount':2,'staticPaths':[],'controls':request['standardSources']['controls'],
                'approval':APPROVAL,'newFunctions':[],'deletedFunctions':[],
                'configurationChanges':False,'bindingChanges':False,'businessInvocations':0,'mailPause':False}
    report = {'standardSourceManifestSha256':policy.digest(manifest),'candidate':'b'*40,
              'newFunctions':[],'errors':[],'functions':[{'name':publisher.PREFIX+n} for n in selected]}
    plan, backup = directory/'plan', directory/'backup'
    plan.mkdir(); backup.mkdir()
    for path, value in [(plan/'request.json',request),(plan/'standard-source-manifest.json',manifest),
            (backup/'standard-source-manifest.json',manifest),(backup/'report.json',report),
            (backup/'functions.json',before)]:
        path.write_text(json.dumps(value))
    return plan, backup, before, manifest


class FakeState:
    API = state.API
    identity = staticmethod(state.identity)

    def __init__(self, rows, drift=False, fail=False):
        self.rows = {f['name']:deepcopy(f) for f in rows}
        self.patches = []
        self.drift = drift
        self.fail = fail

    def inventory(self):
        return deepcopy(list(self.rows.values()))

    def request(self, url, method='GET', body=None):
        if url.endswith(':generateUploadUrl'):
            return {'uploadUrl':'https://storage.googleapis.com/source-bucket/object',
                    'storageSource':{'bucket':'source-bucket','object':'object'}}
        full = url.removeprefix(self.API).split('?')[0]
        if method == 'PATCH':
            if self.fail:
                raise PermissionError('offline permission refusal')
            if self.drift:
                raise AssertionError('A PATCH must not follow observed drift')
            assert url.endswith('?updateMask=build_config.source,labels')
            assert set(body) == {'name','buildConfig','labels'} and set(body['buildConfig']) == {'source'}
            self.patches.append(deepcopy(body))
            self.rows[full]['buildConfig']['source'] = deepcopy(body['buildConfig']['source'])
            self.rows[full]['labels'] = deepcopy(body['labels'])
            self.rows[full]['serviceConfig']['revision'] = 'after'
            self.rows[full]['updateTime'] = 'after'
            return {'done':True}
        value = deepcopy(self.rows[full])
        if self.drift:
            value['labels']['unexpected'] = 'drift'
        return value

    def wait_operation(self, value):
        assert value == {'done':True}


class SourcePolicyTests(unittest.TestCase):
    def setUp(self):
        source=patch.object(cycle,'git',side_effect=fixture_git)
        source.start();self.addCleanup(source.stop)

    def test_historical_success_agrees_with_closed_policy_on_all_119_origins(self):
        c, baseline, names, precise, conservative, request = historical()
        old_request = {k:v for k,v in request.items() if k != 'standardSources'}
        old_request[legacy.OPTION] = {'contractSha256':legacy.DIGEST}
        legacy.verify(old_request, baseline, names, precise.__getitem__, conservative.__getitem__)
        manifest = policy.freeze(request, baseline, names, c['selected'], precise.__getitem__,
                                 conservative.__getitem__, cycle.git,
                                 cycle.git('diff','--name-only',c['productionCommit'],c['candidate']).splitlines())
        self.assertEqual(manifest['selected'], ['readNapPublicSwimmer'])
        self.assertEqual(manifest['inventoryCount'], 119)
        self.assertEqual(manifest['newFunctions'], [])
        self.assertFalse(manifest['configurationChanges'])

    def test_no_historical_contract_or_unrelated_request_is_activated(self):
        self.assertEqual(policy.approved({'schema':1}), [])
        c, baseline, names, precise, conservative, request = historical()
        request['publicNavigationTouchRelease'] = {'contractSha256':legacy.DIGEST}
        with self.assertRaises(ValueError):
            policy.approved(request)

    def test_missing_approval_extra_selection_unknown_origin_and_disagreement_block(self):
        c, baseline, names, precise, conservative, request = historical()
        for mutate in [lambda v:v['standardSources'].pop('approval'),
                       lambda v:v['standardSources'].update(functions=['closeDueEngagementCompetitions']),
                       lambda v:v['standardSources'].update(functions=[])]:
            wrong = deepcopy(request); mutate(wrong)
            with self.assertRaises(ValueError):
                policy.freeze(wrong, baseline, names, c['selected'], precise.__getitem__, conservative.__getitem__, cycle.git, [])
        wrong = deepcopy(names); wrong['readNapPublicSwimmer']['commit'] = 'unknown'
        with self.assertRaises(ValueError):
            policy.freeze(request, baseline, wrong, c['selected'], precise.__getitem__, conservative.__getitem__, cycle.git, [])
        wrong = deepcopy(conservative)
        row = c['reviewedSelectionOrigins'][0]
        wrong[c['candidate']][row['name']] = row['legacyBefore']
        with self.assertRaises(ValueError):
            policy.freeze(request, baseline, names, c['selected'], precise.__getitem__, wrong.__getitem__, cycle.git, [])

    def test_controls_keep_all_mail_fields_templates_and_six_existing_smtp_bindings(self):
        values = {'mail':{'fields':{'enabled':{'booleanValue':True},'scope':{'stringValue':'all'}}},
                  'scheduler':{'state':'ENABLED'},'queue':{'state':'RUNNING'},'templates':{'absent':True}}
        expected = policy.control_witness(values)
        changed = deepcopy(values); changed['mail']['fields']['preference'] = {'stringValue':'changed'}
        self.assertNotEqual(policy.control_witness(changed), expected)
        for part in ['mail','scheduler','queue']:
            changed = deepcopy(values)
            if part == 'mail':
                changed[part]['fields']['enabled'] = {'booleanValue':False}
            else:
                changed[part]['state'] = 'PAUSED'
            with self.assertRaises(ValueError): policy.control_witness(changed)

    def test_test_selection_checks_every_origin_instead_of_filtering_approval(self):
        before = [function('readNapPublicSwimmer'),function('resolveAccessUserDeletionRequest')]
        for row in before: row['name'] = row['name'].replace('/livepalmes/','/livepalmes-test/')
        old = {'readNapPublicSwimmer':'1'*64,'resolveAccessUserDeletionRequest':'2'*64}
        new = {**old,'readNapPublicSwimmer':'3'*64}
        fingerprints = lambda sha: new if sha == 'b'*40 else old
        self.assertEqual(test_sources.selection(before,'b'*40,['readNapPublicSwimmer'], fingerprints), ['readNapPublicSwimmer'])
        new['resolveAccessUserDeletionRequest'] = '4'*64
        with self.assertRaises(ValueError):
            test_sources.selection(before,'b'*40,['readNapPublicSwimmer'], fingerprints)

    def test_selected_configuration_labels_and_retained_smtp_cannot_change(self):
        old = function('readNapPublicSwimmer'); new = deepcopy(old)
        new['updateTime'] = new['serviceConfig']['revision'] = 'after'
        new['labels']['livepalmes-commit'] = 'b'*40
        policy.assert_selected(old, new, 'b'*40)
        for mutate in [lambda f:f['serviceConfig'].update(serviceAccountEmail='different'),
                       lambda f:f['serviceConfig']['secretEnvironmentVariables'].append({'key':'NEW'}),
                       lambda f:f['labels'].update(unexpected='new')]:
            wrong = deepcopy(new); mutate(wrong)
            with self.assertRaises(ValueError): policy.assert_selected(old,wrong,'b'*40)
        smtp = function('resolveAccessUserDeletionRequest')
        before = {smtp['name']:smtp}; after = deepcopy(before)
        after[smtp['name']]['serviceConfig']['secretEnvironmentVariables'][0]['version'] = '8'
        with self.assertRaises(ValueError): policy.assert_retained(before,after,set(),state)

    def test_manifest_tampering_and_missing_resume_witness_fail(self):
        with tempfile.TemporaryDirectory() as temp:
            plan, backup, before, manifest = model(Path(temp))
            manifest['productionRun'] += 1
            (plan/'standard-source-manifest.json').write_text(json.dumps(manifest))
            with self.assertRaises(ValueError): policy.manifest(plan)
        with tempfile.TemporaryDirectory() as temp:
            plan, backup, before, manifest = model(Path(temp))
            (plan/'previous').mkdir()
            (plan/'previous/production-after.json').write_text('{}')
            with patch.object(policy,'controls',return_value=manifest['controls']), self.assertRaises(ValueError):
                policy.guard(plan)

    def test_transport_uses_only_source_and_label_patch_and_leaves_other_functions(self):
        with tempfile.TemporaryDirectory() as temp:
            plan, backup, before, manifest = model(Path(temp))
            fake = FakeState(before)
            response = SimpleNamespace(headers={'x-goog-generation':'2'},__enter__=lambda s:s,__exit__=lambda *a:None)
            class Upload:
                headers = {'x-goog-generation':'2'}
                def __enter__(self): return self
                def __exit__(self,*args): pass
            with patch.object(publisher.policy,'guard') as guard, patch.object(publisher,'attest',return_value={'verified':True}), \
                    patch.object(publisher.urllib.request,'urlopen',return_value=Upload()):
                publisher.publish(ROOT,plan,backup,fake,lambda *a:b'offline source',time.time()+10)
            self.assertEqual(len(fake.patches),1)
            self.assertEqual(fake.rows[before[1]['name']],before[1])
            self.assertEqual(guard.call_count,2)

    def test_fresh_drift_permission_refusal_and_budget_never_trigger_retry(self):
        for mode in ['drift','permission','budget','controls']:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as temp:
                plan, backup, before, manifest = model(Path(temp))
                fake = FakeState(before,drift=mode == 'drift',fail=mode == 'permission')
                class Upload:
                    headers = {'x-goog-generation':'2'}
                    def __enter__(self): return self
                    def __exit__(self,*args): pass
                with patch.object(publisher.policy,'guard',side_effect=ValueError('controls') if mode=='controls' else None), \
                        patch.object(publisher.urllib.request,'urlopen',return_value=Upload()), self.assertRaises((ValueError,PermissionError)):
                    publisher.publish(ROOT,plan,backup,fake,lambda *a:b'offline',time.time()+(-1 if mode=='budget' else 10))
                self.assertEqual(fake.patches,[])

    def test_partial_revision_without_authenticated_previous_run_stops_before_upload(self):
        with tempfile.TemporaryDirectory() as temp:
            plan, backup, before, manifest = model(Path(temp))
            fake = FakeState(before)
            fake.rows[before[0]['name']]['serviceConfig']['revision'] = 'different'
            with patch.object(publisher.urllib.request,'urlopen') as upload, self.assertRaises(ValueError):
                publisher.publish(ROOT,plan,backup,fake,lambda *a:b'offline',time.time()+10)
            upload.assert_not_called()

    def test_standard_test_manifest_refuses_excluded_functions_and_unknown_options(self):
        value = {'schema':1,'candidate':'b'*40,'baselineRun':12,'baselineCandidate':'a'*40,
                 'baselineHosting':'sites/livepalmes-test/versions/before',
                 'functions':['readNapPublicSwimmer'],'approval':APPROVAL}
        self.assertEqual(test_sources.validate(value), value)
        raw=json.dumps(value)
        duplicate=raw.replace('\"schema\": 1','\"schema\": 1, \"schema\": 1',1)
        with self.assertRaises(ValueError): test_sources.read_request(duplicate)
        for key, replacement in [('functions',['closeDueEngagementCompetitions']),('baselineRun',True),
                                 ('candidate','branch-name'),('approval',{'text':'CI is green'}),
                                 ('approval',{**APPROVAL,'messageId':'-'*36})]:
            wrong = deepcopy(value); wrong[key] = replacement
            with self.assertRaises(ValueError): test_sources.validate(wrong)
        wrong = deepcopy(value); wrong['configurationChanges'] = True
        with self.assertRaises(ValueError): test_sources.validate(wrong)

    def test_reuse_accepts_only_exact_authenticated_manifest_and_managed_sources(self):
        value = {'schema':1,'candidate':'b'*40,'baselineRun':12,'baselineCandidate':'a'*40,
                 'baselineHosting':'sites/livepalmes-test/versions/before',
                 'functions':['readNapPublicSwimmer'],'approval':APPROVAL}
        row = {'name':test_sources.PREFIX+'readNapPublicSwimmer','commit':'b'*40,
               'revision':'reader-v2','updateTime':'after','state':'ACTIVE'}
        run = {'id':13,'head_sha':'b'*40,'status':'completed','conclusion':'success','run_attempt':1}
        info = {**run,'event':'workflow_dispatch','path':test_sources.WORKFLOW,'head_branch':'main',
                'repository':{'full_name':test_sources.REPOSITORY},
                'head_repository':{'full_name':test_sources.REPOSITORY}}
        proof = {'schema':1,'release':'standard','standardManifest':value,'candidate':'b'*40,
                 'contractSha256':policy.digest(value),'baselineRun':12,'selected':value['functions'],
                 'state':{'functions':[row]},'taskContentsRead':False,
                 'configurationsUnchanged':True,'otherFunctionsUnchanged':True,
                 'hostingUnchanged':True,'controlsUnchanged':True,
                 'managedSources':{'readNapPublicSwimmer':{
                    'allPathsAndFileBytesIdentical':True,'generationReadAndReferencesRechecked':True,
                    'archiveSha256':'1'*64,'archiveIdentity':'2'*64,'storageSource':{
                    'bucket':'gcf-v2-sources-206080168534-europe-west1',
                    'object':'readNapPublicSwimmer/function-source.zip','generation':'123'}}}}
        for corruption in [None,'digest','controls','archive','candidate']:
            actual=deepcopy(proof)
            if corruption=='digest': actual['contractSha256']='0'*64
            if corruption=='controls': actual['controlsUnchanged']=False
            if corruption=='archive': actual['managedSources']['readNapPublicSwimmer']['generationReadAndReferencesRechecked']=False
            if corruption=='candidate': actual['candidate']='c'*40
            api=SimpleNamespace(gh=lambda *a:{'workflow_runs':[run]},artifact=lambda *a:info,
                                read=lambda *a:actual,matching_functions=cycle.matching_functions,
                                test_backend_fingerprints=lambda *a:{'readNapPublicSwimmer':'3'*64})
            result=test_sources.trusted_revisions(Path('unused'),{'functions':[row]},api)
            self.assertEqual(result,{row['name']} if corruption is None else set())

    def test_static_removal_blocks_during_plan_instead_of_after_hosting(self):
        def git(*args):
            if args[-1].endswith(':removed.js'):
                raise ValueError('not in candidate')
            return '1'*40
        with self.assertRaises(ValueError):
            policy.static_paths(['removed.js'],'b'*40,git)

    def test_workflow_keeps_crypto_before_source_writers_and_required_synthesis(self):
        text = (ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        self.assertLess(text.index('production-code-backup-archive.js open-v2'), text.index('standard-source-publish.py candidate'))
        self.assertIn('diff -qr',text)
        self.assertIn('set -euo pipefail\n        python tooling/tools/standard-source-publish.py',text)
        self.assertIn('standard-*.json',text)
        for file in ['livepalmes-verification-preview.yml','livepalmes-production-preflight.yml','livepalmes-production-release.yml']:
            self.assertIn('tools/run-verification-tests.js',(ROOT/'.github/workflows'/file).read_text())
        inventory=json.loads((ROOT/'tools/verification-tests.json').read_text())
        for suite in ['publication','publicationFallback']:
            self.assertIn('tools/verify-release-acceleration.py',inventory[suite])



def current_model(directory):
    plan, backup, before, manifest = model(directory)
    request = cycle.read(plan/'request.json')
    request['standardSources'].update(schema=2)
    request['standardSources'].pop('controls')
    manifest.update(schema=2,kind=current_policy.CURRENT_KIND,requestSha256=policy.digest(request))
    manifest.pop('controls')
    cycle.write(plan/'request.json',request)
    cycle.write(plan/'standard-source-manifest.json',manifest)
    cycle.write(plan/'selection.json',manifest['selected'])
    cycle.write(backup/'standard-source-manifest.json',manifest)
    report=cycle.read(backup/'report.json');report['standardSourceManifestSha256']=policy.digest(manifest)
    cycle.write(backup/'report.json',report)
    return plan,backup,before,manifest

class CurrentPublicationTests(unittest.TestCase):
    def current_model(self, directory):
        return current_model(directory)

    def test_current_manifest_needs_no_operational_state_even_on_resume(self):
        with tempfile.TemporaryDirectory() as temp:
            plan,_,_,manifest=self.current_model(Path(temp))
            (plan/'previous').mkdir();cycle.write(plan/'previous/production-after.json',{})
            with patch.object(current_policy.legacy,'controls',side_effect=AssertionError('No Google mail read')):
                current_policy.guard(plan);current_policy.guard(plan,after=True)
                current_policy.restore_witness(plan,Path(temp)/'absent')
                self.assertIsNone(cycle.idf_preservation(cycle.read(plan/'request.json')))
            self.assertFalse(list(plan.glob('*controls*.json')))
            manifest['controls']={k:'1'*64 for k in policy.CONTROL_KEYS}
            cycle.write(plan/'standard-source-manifest.json',manifest)
            with self.assertRaises(ValueError):current_policy.guard(plan)

    def test_current_initial_does_not_hardcode_smtp_but_preserves_every_binding(self):
        with tempfile.TemporaryDirectory() as temp:
            _,_,before,manifest=self.current_model(Path(temp))
            rows=deepcopy(before)
            smtp=next(f for f in rows if f['name'].endswith('/resolveAccessUserDeletionRequest'))
            smtp['serviceConfig']['secretEnvironmentVariables']=[]
            current_policy.initial(rows,manifest)
            current={f['name']:deepcopy(f) for f in rows}
            current[smtp['name']]['serviceConfig']['secretEnvironmentVariables']=[{'key':'NEW'}]
            with self.assertRaises(ValueError):
                policy.assert_retained({f['name']:f for f in rows},current,set(),state)

    def test_current_test_manifest_accepts_no_operational_witness(self):
        value={'schema':2,'candidate':'b'*40,'baselineRun':11,'baselineCandidate':'a'*40,
               'baselineHosting':'sites/livepalmes-test/versions/before',
               'functions':['readNapPublicSwimmer'],'approval':APPROVAL}
        self.assertEqual(test_sources.validate(value),value)
        with self.assertRaises(ValueError):test_sources.validate({**value,'controls':{}})
        with self.assertRaises(ValueError):test_sources.validate({**value,'a5Retirement':{}})

    def test_current_test_prepare_makes_no_operational_read(self):
        value={'schema':2,'candidate':'b'*40,'baselineRun':11,'baselineCandidate':'a'*40,
               'baselineHosting':'sites/livepalmes-test/versions/before',
               'functions':['readNapPublicSwimmer'],'approval':APPROVAL}
        transport=test_sources.load('publish-test-direct-sources.py')
        with patch.object(test_sources,'load',return_value=transport), \
             patch.object(transport.cycle,'test_backend_fingerprints',return_value={'readNapPublicSwimmer':'1'*64}):
            configured=test_sources.configured(value)
        with tempfile.TemporaryDirectory() as temp:
            before=[function('readNapPublicSwimmer')]
            expected={'hosting':{'version':'before'},'functions':transport.shared.compact(before)}
            evidence=SimpleNamespace(reusable=lambda *args:True)
            with patch.object(configured,'guard',return_value='b'*40), \
                 patch.object(configured,'baseline',return_value=expected), \
                 patch.object(configured,'select',return_value=['readNapPublicSwimmer']), \
                 patch.object(configured.cycle,'snapshot',return_value=expected), \
                 patch.object(configured.shared,'load',return_value=evidence), \
                 patch.object(configured.shared,'credential_identity'), \
                 patch.object(configured.shared,'inventory',return_value=before), \
                 patch.object(configured.shared.archive_helper,'test_archive',return_value=b'offline fixture'), \
                 patch.object(configured,'controls',side_effect=AssertionError('No operational read')):
                configured.main('prepare','standard',temp,ROOT)
            self.assertFalse((Path(temp)/'controls.json').exists())
            self.assertEqual(cycle.read(Path(temp)/'plan.json')['selected'],['readNapPublicSwimmer'])

    def test_preflight_and_transport_reject_the_same_invalid_selection_before_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            plan, backup, before, manifest = self.current_model(Path(temp))
            selected = manifest['selected']
            publisher.preflight(ROOT, plan)
            for invalid in ([], selected + selected, selected + ['unexpected'], 'not-a-list'):
                with self.subTest(selection=invalid):
                    cycle.write(plan/'selection.json', invalid)
                    with self.assertRaisesRegex(ValueError, 'Selection du plan differente'):
                        publisher.preflight(ROOT, plan)
                    with self.assertRaisesRegex(ValueError, 'Selection du plan differente'):
                        publisher.publish(ROOT, plan, backup, None, None, time.time()+60)

    def test_standard_completion_requires_attested_sources_and_no_hosting_attempt(self):
        completion = load('standard-source-hosting-completion.py')
        with tempfile.TemporaryDirectory() as temp:
            plan, _, before, manifest = self.current_model(Path(temp))
            full = publisher.PREFIX + manifest['selected'][0]
            cycle.write(plan/completion.PLAN, completion.plan_record(manifest))
            previous = plan/'previous'
            previous.mkdir()
            rows = [publisher.load('production-release-state.py').identity(f) for f in before]
            changed = next(row for row in rows if row['name'] == full)
            changed['revision'] += '-installed'
            cycle.write(previous/'production-after.json', {'candidate': manifest['candidate'], 'errors': [], 'functions': rows})
            receipt = {'identity': changed, 'archiveSha256': 'a'*64,
                       'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True}
            saved = {'candidate': manifest['candidate'], 'manifestSha256': policy.digest(manifest),
                     'functions': {full: receipt}}
            cycle.write(previous/completion.RECEIPTS, saved)
            steps = [{'name': 'Publier les Functions par petits lots', 'conclusion': 'success'},
                     {'name': 'Controler toutes les Functions et les exclusions', 'conclusion': 'success'},
                     {'name': 'Publier Hosting apres les controles', 'conclusion': 'skipped'}]
            info = {'id': 12, 'head_branch': 'main', 'path': completion.WORKFLOW,
                    'status': 'completed', 'event': 'workflow_dispatch', 'run_attempt': 1, 'conclusion': 'failure'}
            jobs = {'jobs': [{'name': 'release', 'conclusion': 'failure', 'steps': steps}]}
            runs = {'workflow_runs': [{'id': 13}, {'id': 12}]}
            with patch.dict(os.environ, GITHUB_REPOSITORY='fixture/repository', GITHUB_RUN_ID='13'),                     patch.object(cycle, 'gh', side_effect=lambda url: jobs if '/jobs?' in url else runs):
                completion.qualify(plan, '0', '12', info, [], cycle)
                self.assertEqual(cycle.read(plan/'standard-hosting-selection.json'), [])
                self.assertEqual(cycle.read(plan/'selection.json'), manifest['selected'])
                self.assertEqual(cycle.read(plan/completion.RECEIPTS), saved)
                with self.assertRaisesRegex(ValueError, 'Hosting deja tente'):
                    completion.qualify(plan, '0', '12', info, [{'name': 'production-hosting-after'}], cycle)
                steps[-1]['conclusion'] = 'failure'
                with self.assertRaisesRegex(ValueError, 'Hosting a ete ignore'):
                    completion.qualify(plan, '0', '12', info, [], cycle)
                steps[-1]['conclusion'] = 'skipped'
                cycle.write(previous/completion.RECEIPTS, {**saved, 'functions': {}})
                with self.assertRaisesRegex(ValueError, 'inventaire incompletes'):
                    completion.qualify(plan, '0', '12', info, [], cycle)

    def test_archive_mismatch_stops_current_writer_before_upload(self):
        isolated=load('isolated-publication-inputs.py')
        import io,zipfile
        out=io.BytesIO()
        with zipfile.ZipFile(out,'w') as z:z.writestr('index.js','fixture')
        data=out.getvalue();receipt=isolated.source_archive_receipt(data)
        for wrong in [False,True]:
            with tempfile.TemporaryDirectory() as temp:
                plan,backup,before,_=self.current_model(Path(temp));fake=FakeState(before)
                receipt_path=Path(temp)/'inputs.json'
                cycle.write(receipt_path,{'candidate':'b'*40,'safe':['example'],'manifests':{},
                    'sourceArchive':{**receipt,'contentSha256':'0'*64} if wrong else None})
                with patch.object(publisher.os,'environ',{**os.environ,'PRODUCTION_ISOLATED_INPUTS':str(receipt_path)}), \
                     patch.object(publisher.policy,'controls',side_effect=AssertionError('No operational read')), \
                     patch.object(publisher.urllib.request,'urlopen',side_effect=AssertionError('No upload')):
                    with self.assertRaisesRegex(ValueError,'Archive source differente'):
                        publisher.publish(ROOT,plan,backup,fake,lambda *args:data,time.time()+60)
                self.assertEqual(fake.patches,[])

    def test_current_retained_review_requires_real_identical_fingerprints(self):
        with tempfile.TemporaryDirectory() as temp:
            plan,_,_,manifest=self.current_model(Path(temp))
            request=cycle.read(plan/'request.json')
            request['excludedBackendEvidence']={'schema':1,'candidate':'b'*40,'productionRun':11,
                'suite':'retained-backend-fingerprints-v2','functions':[]}
            cycle.write(plan/'request.json',request);cycle.write(plan/'baseline.json',{'productionRun':11})
            retained='resolveAccessUserDeletionRequest'
            for changed in [False,True]:
                desired={n:'2'*64 for n in ['readNapPublicSwimmer',retained]}
                old={**desired,retained:'1'*64} if changed else desired
                with patch.object(cycle,'backend_fingerprints',side_effect=lambda sha:desired if sha=='b'*40 else old):
                    if changed:
                        with self.assertRaisesRegex(ValueError,'Revue incomplete'):
                            cycle.verify_excluded_backend(plan,{'functions':manifest['origins']},manifest['selected'])
                    else:
                        cycle.verify_excluded_backend(plan,{'functions':manifest['origins']},manifest['selected'])
                        proof=cycle.read(plan/'excluded-backend-verification.json')
                        self.assertTrue(proof['allRetainedFingerprintsIdentical'])
                        self.assertEqual(proof['retainedFunctions'],[retained])
                        self.assertEqual(proof['suite'],'retained-backend-fingerprints-v2')

    def test_plan_json_keeps_human_utf8_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            target=Path(temp)/'request.json';value={'approval':'Équipe, maîtres mixtes : déjà validé.'}
            cycle.write(target,value)
            self.assertEqual(cycle.read(target),value)
            self.assertIn(value['approval'].encode('utf8'),target.read_bytes())

    def test_offline_packaging_uses_real_clean_checkout_and_byte_content(self):
        isolated=load('isolated-publication-inputs.py');archive=load('publish-approved-pdf-functions.py').archive
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            def local_git(*args):return subprocess.check_output(['git',*args],cwd=root,text=True,stderr=subprocess.DEVNULL).strip()
            local_git('init','-q');local_git('config','user.email','fixture@example.invalid');local_git('config','user.name','Fixture')
            (root/'functions').mkdir();source=root/'functions/index.js';source.write_bytes(b'exports.example = 1;\n')
            local_git('add','.');local_git('commit','-qm','Fixture');candidate=local_git('rev-parse','HEAD')
            receipt=isolated.source_archive_receipt(archive(root,candidate))
            self.assertEqual(receipt['files'],1)
            source.write_bytes(b'exports.example = 2;\n')
            with self.assertRaisesRegex(ValueError,'modifie'):archive(root,candidate)
            import io,zipfile
            def packed(data,stamp):
                out=io.BytesIO()
                with zipfile.ZipFile(out,'w') as z:z.writestr(zipfile.ZipInfo('index.js',stamp),data)
                return isolated.source_archive_receipt(out.getvalue())
            old=packed(b'code',(2020,1,1,0,0,0));new=packed(b'code',(2026,1,1,0,0,0))
            self.assertNotEqual(old['sha256'],new['sha256'])
            self.assertEqual(old['contentSha256'],new['contentSha256'])
            self.assertNotEqual(old['contentSha256'],packed(b'changed',(2026,1,1,0,0,0))['contentSha256'])


class ServerHomeHostingTests(unittest.TestCase):
    def fixture(self, root, fault=None):
        plan,backup,before,manifest=current_model(root)
        candidate=root/'candidate';candidate.mkdir()
        def git(*args):return subprocess.check_output(['git',*args],cwd=candidate,text=True,stderr=subprocess.DEVNULL).strip()
        git('init','-q')
        expected={'Content-Security-Policy':"default-src 'self'",'X-Content-Type-Options':'nosniff',
                  'Referrer-Policy':'strict-origin-when-cross-origin'}
        html='<!doctype html><p>Accueil pr\u00e9par\u00e9</p>\n'
        config={'hosting':{'target':'app','public':'.','ignore':[] if fault=='ignore' else ['index.html'],
            'rewrites':[{'source':r,'function':{'functionId':('unexpected' if fault=='rewrite' else 'readNapPublicSwimmer'),
                'region':'europe-west1'}} for r in ['/','/index.html']],
            'headers':[{'source':r,'headers':[{'key':k,'value':v} for k,v in expected.items()]} for r in ['/','/index.html']]}}
        (candidate/'functions/assets').mkdir(parents=True)
        cycle.write(candidate/'firebase.json',config)
        (candidate/'index.html').write_bytes(html.encode('utf8'))
        cycle.write(candidate/'functions/assets/public-home-template.json',{'html':'changed' if fault=='template' else html})
        (candidate/'asset.js').write_bytes(b'fixture static')
        git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Fixture')
        sha=git('rev-parse','HEAD')
        request=cycle.read(plan/'request.json');request['candidate']=sha
        manifest.update(candidate=sha,requestSha256=policy.digest(request),staticPaths=['index.html','asset.js'])
        cycle.write(plan/'request.json',request);cycle.write(plan/'standard-source-manifest.json',manifest)
        cycle.write(backup/'standard-source-manifest.json',manifest)
        report=cycle.read(backup/'report.json');report.update(candidate=sha,standardSourceManifestSha256=policy.digest(manifest));cycle.write(backup/'report.json',report)
        row={'identity':{'name':publisher.PREFIX+'readNapPublicSwimmer','state':'ACTIVE','revision':'after','updateTime':'after'},
             'storageSource':{'bucket':'gcf-v2-sources-718081132564-europe-west1','object':'readNapPublicSwimmer/function-source.zip','generation':'2'},
             'archiveSha256':'1'*64,'allPathsAndFileBytesIdentical':True,'generationReadAndReferencesRechecked':True}
        cycle.write(plan/'standard-source-receipts.json',{'candidate':sha,'manifestSha256':policy.digest(manifest),
                    'functions':{publisher.PREFIX+'readNapPublicSwimmer':row}})
        return candidate,plan,backup,before,manifest,{**expected,'X-LivePalmes-Home-Source':'nap-server-html',
                    'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'}

    def test_server_home_and_each_static_path_are_verified_without_getting_dynamic_html(self):
        with tempfile.TemporaryDirectory() as temp:
            candidate,plan,_,_,manifest,headers=self.fixture(Path(temp))
            heads=[];reads=[]
            def head(url):heads.append(url);return 200,b'',headers
            def fetch(url):reads.append(url);return 200,b'fixture static',{}
            target=Path(temp)/'hosting.json'
            with patch.object(publisher.os,'environ',{**os.environ,'GITHUB_RUN_ID':'123'}):
                publisher.hosting(candidate,plan,target,fetch=fetch,head=head)
            rows=cycle.read(target)
            self.assertEqual(len(heads),2);self.assertEqual(len(reads),1)
            self.assertTrue(all('index.html' not in u for u in reads))
            self.assertEqual([r['path'] for r in rows],['/','/index.html','asset.js'])
            self.assertTrue(all(r['publicHeadersValid'] and r['allSourcePathsAndBytesAttested'] for r in rows[:2]))
            self.assertEqual(rows[-1]['actualSha256'],rows[-1]['expectedSha256'])
            self.assertEqual(rows[0]['sourceHtmlSha256'],hashlib.sha256((candidate/'index.html').read_bytes()).hexdigest())

    def test_wrong_template_or_home_route_stops_before_any_cloud_read_or_upload(self):
        for fault in ['template','rewrite','ignore']:
            with self.subTest(fault=fault),tempfile.TemporaryDirectory() as temp:
                candidate,plan,backup,before,_,_=self.fixture(Path(temp),fault)
                fake=FakeState(before)
                with patch.object(fake,'inventory',side_effect=AssertionError('No cloud read')) as inventory, \
                     patch.object(publisher.urllib.request,'urlopen',side_effect=AssertionError('No upload')):
                    with self.assertRaises(ValueError):
                        publisher.publish(candidate,plan,backup,fake,lambda *args:b'not reached',time.time()+60)
                    inventory.assert_not_called()
                self.assertEqual(fake.patches,[])

    def test_missing_or_incompatible_managed_archive_blocks_before_public_head(self):
        for fault in ['missing','candidate','manifest','attestation','generation']:
            with self.subTest(fault=fault),tempfile.TemporaryDirectory() as temp:
                candidate,plan,_,_,_,_=self.fixture(Path(temp));path=plan/'standard-source-receipts.json'
                if fault=='missing':path.unlink()
                else:
                    proof=cycle.read(path)
                    if fault=='candidate':proof['candidate']='0'*40
                    if fault=='manifest':proof['manifestSha256']='0'*64
                    row=proof['functions'][publisher.PREFIX+'readNapPublicSwimmer']
                    if fault=='attestation':row['allPathsAndFileBytesIdentical']=False
                    if fault=='generation':row['storageSource']['generation']='unknown'
                    cycle.write(path,proof)
                with patch.object(publisher.os,'environ',{**os.environ,'GITHUB_RUN_ID':'123'}):
                    with self.assertRaises(ValueError):
                        publisher.hosting(candidate,plan,Path(temp)/'hosting.json',
                            fetch=lambda *args: self.fail('No static read before archive proof'),
                            head=lambda *args: self.fail('No HEAD before archive proof'))

    def test_wrong_response_headers_or_status_fail_with_observations_retained(self):
        for fault in ['status','source','content-type','cache','csp']:
            with self.subTest(fault=fault),tempfile.TemporaryDirectory() as temp:
                candidate,plan,_,_,_,headers=self.fixture(Path(temp));target=Path(temp)/'hosting.json'
                status=503 if fault=='status' else 200
                if fault=='source':headers['X-LivePalmes-Home-Source']='static'
                if fault=='content-type':headers['Content-Type']='application/json'
                if fault=='cache':headers['Cache-Control']='public, max-age=300'
                if fault=='csp':headers['Content-Security-Policy']='different'
                with patch.object(publisher.time,'sleep'),patch.object(publisher.os,'environ',{**os.environ,'GITHUB_RUN_ID':'123'}):
                    with self.assertRaisesRegex(ValueError,'Accueil serveur'):
                        publisher.hosting(candidate,plan,target,head=lambda *args:(status,b'',headers),
                            fetch=lambda *args:self.fail('Static checks must follow valid home'))
                rows=cycle.read(target);self.assertEqual(len(rows),3)
                self.assertTrue(all(r['publicHeadersValid'] is False for r in rows))

    def test_static_byte_mismatch_still_blocks_after_server_home_verification(self):
        with tempfile.TemporaryDirectory() as temp:
            candidate,plan,_,_,_,headers=self.fixture(Path(temp));target=Path(temp)/'hosting.json'
            with patch.object(publisher.time,'sleep'),patch.object(publisher.os,'environ',{**os.environ,'GITHUB_RUN_ID':'123'}):
                with self.assertRaisesRegex(ValueError,'Fichier statique different'):
                    publisher.hosting(candidate,plan,target,head=lambda *args:(200,b'',headers),
                        fetch=lambda *args:(200,b'wrong static bytes',{}))
            rows=cycle.read(target);self.assertEqual(len(rows),5)
            self.assertTrue(all(r['publicHeadersValid'] for r in rows[:2]))
            self.assertTrue(all(r['actualSha256']!=r['expectedSha256'] for r in rows[2:]))


class StandardReaderPreparationTests(unittest.TestCase):
    def test_standard_sources_use_existing_physical_copy_and_keep_clean_archive_guard(self):
        text=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        expression=re.search(r"fees_plan=\$\(python3 -c '([^']+)'",text).group(1)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'request.json'
            for request,expected in [({'standardSources':{'schema':1}},'1'),({'a6ReliabilityRelease':{}},'1'),({'changes':[]},'0')]:
                path.write_text(json.dumps(request))
                self.assertEqual(subprocess.check_output([sys.executable,'-c',expression,str(path)],text=True).strip(),expected)
        self.assertIn('cp -a --reflink=auto',text)
        self.assertIn('test -z "$(git -C candidate status --porcelain)"',text)
        archive=(ROOT/'tools/publish-approved-pdf-functions.py').read_text()
        self.assertIn("['git', 'status', '--porcelain']",archive)
        self.assertIn('full.is_symlink()',archive)

    def test_source_only_resume_rechecks_test_before_restoring_initial_backup(self):
        text=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        step=text.split('    - name: Relire TEST avant toute ecriture PROD',1)[1].split('    - ',1)[0]
        self.assertIn("steps.plan.outputs.preserved_sources_only == 'true'",step)
        self.assertIn('release-cycle.py verify-test',step)
        self.assertLess(text.index('    - name: Relire TEST avant toute ecriture PROD'),text.index('    - name: Ouvrir V2 en conservant le contexte de creation initial'))


if __name__ == '__main__':
    unittest.main()
