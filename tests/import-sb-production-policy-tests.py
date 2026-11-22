"""Offline fail-closed boundaries for the exact SB PROD promotion."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
def load(name):
    spec = importlib.util.spec_from_file_location(name,ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module
closed = load('import-sb-production-policy.py')
router = load('production-source-policy.py')

class Tests(unittest.TestCase):
    def setUp(self):
        self.c = closed.contract()
        self.r = {k:self.c[k] for k in ['candidate','productionCommit','productionHosting','testRun']}
        self.r.update(schema=1,freezeTestCandidate=True,changes=[],standardSources={
            'schema':2,'productionRun':self.c['productionRun'],'functions':self.c['allowedFunctions'],
            'approval':self.c['approval'],closed.MARKER:closed.CONTRACT_SHA256})
        self.functions={f['name'].split('/')[-1]:deepcopy(f) for f in self.c['origins']}
        self.baseline={k:self.c[k] for k in ['productionRun','productionCommit']}
        self.baseline['source']='verified-publication-artifacts'
    def fps(self,conservative=False):
        desired={n:'a'*64 for n in self.functions}
        for n in self.c['allowedFunctions']:
            desired[n]=self.c['selectedFingerprints'][n]['conservative' if conservative else 'precise']
        def calculate(sha):
            return desired if sha==self.c['candidate'] else {n:('0'*64 if n in self.c['allowedFunctions'] else h) for n,h in desired.items()}
        return calculate
    def freeze(self,functions=None,selected=None,conservative=None):
        def git(*args):
            if args[0]=='diff':return '\n'.join(self.c['changedPaths'])
            return 'same-protected-blob'
        return closed.freeze(self.r,self.baseline,functions if functions is not None else self.functions,
            selected if selected is not None else self.c['allowedFunctions'],self.fps(),
            conservative or self.fps(True),git,self.c['changedPaths'])
    def test_exact_contract_routes_without_general_eligibility_change(self):
        self.assertEqual(router.for_request(self.r).approved(self.r),self.c['allowedFunctions'])
        ordinary=deepcopy(self.r);ordinary['standardSources'].pop(closed.MARKER)
        with self.assertRaises(ValueError):router.for_request(ordinary)
        self.assertEqual(len(set(self.c['allowedFunctions']) - closed.v2.eligible()), 3)
        test=load('import-sb-test-policy.py').contract()
        wrong=deepcopy(self.r);wrong['standardSources'][closed.MARKER]=test['project']
        with self.assertRaises(ValueError):router.for_request(wrong)
    def test_candidate_baseline_approval_and_schema_are_closed(self):
        mutations=[('candidate','a'*40),('productionCommit','b'*40),('productionHosting','sites/livepalmes/versions/new'),
                   ('testRun',self.c['testRun']+1),('freezeTestCandidate',False),('unexpected',True)]
        for k,v in mutations:
            with self.subTest(k=k),self.assertRaises(ValueError):closed.approved({**self.r,k:v})
        for k,v in [('functions',['readNapPublicSwimmer']),('functions',self.c['allowedFunctions']+['storeCompetitionPdf']),
                    ('schema',True),('productionRun',1),('approval',{**self.c['approval'],'text':'TEST only'}),
                    (closed.MARKER,load('import-sb-test-policy.py').CONTRACT_SHA256),('controls',{})]:
            r=deepcopy(self.r);r['standardSources'][k]=v
            with self.subTest(k=k),self.assertRaises(ValueError):closed.approved(r)
    def test_full_selection_retained_origins_and_comparators(self):
        value=self.freeze();self.assertEqual(value['inventoryCount'],119);self.assertEqual(len(value['origins']),119)
        self.assertEqual(value['staticPaths'],self.c['staticPaths']);self.assertNotIn('controls',value)
        self.assertFalse(value['configurationChanges']);self.assertFalse(value['bindingChanges'])
        for selected in [[],['readNapPublicSwimmer'],self.c['allowedFunctions']*2]:
            with self.assertRaises(ValueError):self.freeze(selected=selected)
        for mutation in ['missing','revision','origin','inactive','new']:
            f=deepcopy(self.functions);n=next(iter(f))
            if mutation=='missing':f.pop(n)
            if mutation=='revision':f[n]['revision']='different'
            if mutation=='origin':f[n]['commit']='b'*40
            if mutation=='inactive':f[n]['state']='FAILED'
            if mutation=='new':f['new']=dict(f[n],name='projects/livepalmes/locations/europe-west1/functions/new')
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):self.freeze(functions=f)
        conservative=self.fps(True)
        def mismatch(sha):
            f=conservative(sha).copy()
            if sha==self.c['candidate']:f[next(n for n in f if n not in self.c['allowedFunctions'])]='b'*64
            return f
        with self.assertRaises(ValueError):self.freeze(conservative=mismatch)
    def test_writer_protected_files_and_full_diff_cannot_change(self):
        def writer(*args):return '\n'.join(self.c['changedPaths']+['functions/nap-direct-store.js']) if args[0]=='diff' else 'same'
        with self.assertRaises(ValueError):closed.paths(self.r,self.c['changedPaths'],writer)
        def protected(*args):return '\n'.join(self.c['changedPaths']) if args[0]=='diff' else args[-1]
        with self.assertRaises(ValueError):closed.paths(self.r,self.c['changedPaths'],protected)
        with self.assertRaises(ValueError):closed.paths(self.r,self.c['changedPaths'][:-1],writer)
    def test_manifest_tampering_and_resume_are_rejected(self):
        value=self.freeze()
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);(p/'request.json').write_text(json.dumps(self.r),encoding='utf8')
            def check(v):(p/'standard-source-manifest.json').write_text(json.dumps(v),encoding='utf8')
            check(value);self.assertEqual(closed.manifest(p),value)
            for k,v in [('candidate','a'*40),('selected',['readNapPublicSwimmer']),('configurationChanges',True),
                        ('bindingChanges',True),('newFunctions',['new']),('businessInvocations',1),('mailPause',True),
                        ('staticPaths',[]),('origins',value['origins'][:-1])]:
                check({**value,k:v})
                with self.subTest(k=k),self.assertRaises(ValueError):closed.manifest(p)
            check(value)
            with self.assertRaises(ValueError):closed.restore_witness(p,p)
    def runtime_rows(self):
        rows=[]
        for f in self.c['origins']:
            n=f['name'].split('/')[-1]
            rows.append({**f,'environment':'GEN_2','buildConfig':{'runtime':'nodejs22','entryPoint':n,
                'source':{'storageSource':{'bucket':'fixture','object':n+'.zip','generation':'1'}}},
                'serviceConfig':{'revision':f['revision'],'serviceAccountEmail':'existing@fixture',
                'secretEnvironmentVariables':[{'key':'FIXTURE_SECRET','secret':'FIXTURE_SECRET','version':'latest'}]},
                'labels':{'livepalmes-commit':f['commit']}})
        return rows
    def test_closed_runtime_initial_and_after_preserve_configuration(self):
        value=self.freeze();before=self.runtime_rows();closed.initial(before,value)
        for name in self.c['allowedFunctions']:
            old=next(f for f in before if f['name'].endswith('/'+name));new=deepcopy(old)
            new['updateTime']='later';new['serviceConfig']['revision']='new-revision'
            new['buildConfig']['source']['storageSource']['generation']='2'
            new['labels']['livepalmes-commit']=self.c['candidate']
            closed.assert_selected(old,new,self.c['candidate'])
            for mutation in ['runtime','identity','binding','configuration','label','revision','environment']:
                f=deepcopy(new)
                if mutation=='runtime':f['buildConfig']['runtime']='nodejs20'
                if mutation=='identity':f['name']=f['name'].replace(name,'other')
                if mutation=='binding':f['serviceConfig']['secretEnvironmentVariables'][0]['version']='2'
                if mutation=='configuration':f['serviceConfig']['serviceAccountEmail']='other@fixture'
                if mutation=='label':f['labels']['extra']='not-authorized'
                if mutation=='revision':f['serviceConfig']['revision']=old['serviceConfig']['revision']
                if mutation=='environment':f['environment']='GEN_1'
                with self.subTest(name=name,mutation=mutation),self.assertRaises(ValueError):closed.assert_selected(old,f,self.c['candidate'])
        f=deepcopy(before[0]);f['serviceConfig']['revision']='drift'
        with self.assertRaises(ValueError):closed.initial([f]+before[1:],value)
    def test_final_state_uses_closed_policy_and_blocks_each_drift(self):
        value=self.freeze();before=self.runtime_rows();after=deepcopy(before)
        selected=set(self.c['allowedFunctions'])
        for f in after:
            if f['name'].split('/')[-1] in selected:
                f['updateTime']='later';f['serviceConfig']['revision']='new-revision'
                f['labels']['livepalmes-commit']=self.c['candidate']
                f['buildConfig']['source']['storageSource']['generation']='2'
        report={'sourcePolicyKind':closed.KIND,'standardSourceManifestSha256':closed.digest(value),
                'candidate':self.c['candidate'],'newFunctions':[],'errors':[],
                'functions':[{'name':f['name']} for f in before if f['name'].split('/')[-1] in selected]}
        identity=closed.v2.load('production-release-state.py').identity
        actual=deepcopy(after);state=SimpleNamespace(identity=identity,inventory=lambda:actual)
        original=closed.load
        with tempfile.TemporaryDirectory() as tmp,patch.object(closed,'load',side_effect=lambda n:state if n=='production-release-state.py' else original(n)):
            p=Path(tmp)
            for name,v in [('report.json',report),('standard-source-manifest.json',value),('functions.json',before)]:
                (p/name).write_text(json.dumps(v),encoding='utf8')
            closed.state_check(p,p/'after.json',True);self.assertEqual(json.loads((p/'after.json').read_text())['errors'],[])
            wrapper=load('direct-csp-production-state.py')
            with patch.object(wrapper,'load',return_value=closed),patch.object(wrapper,'run_old',side_effect=AssertionError('historical fallback forbidden')):
                wrapper.dispatch(['check',str(p),str(p/'after.json'),'success'])
            for mutation in ['retained-binding','retained-source','selected-binding','missing','duplicate','failed-outcome']:
                actual[:]=deepcopy(after)
                retained=next(f for f in actual if f['name'].split('/')[-1] not in selected)
                changed=next(f for f in actual if f['name'].split('/')[-1] in selected)
                if mutation=='retained-binding':retained['serviceConfig']['secretEnvironmentVariables']=[]
                if mutation=='retained-source':retained['buildConfig']['source']['storageSource']['generation']='4'
                if mutation=='selected-binding':changed['serviceConfig']['secretEnvironmentVariables']=[]
                if mutation=='missing':actual.pop()
                if mutation=='duplicate':actual.append(actual[0])
                with self.subTest(mutation=mutation),self.assertRaises(ValueError):closed.state_check(p,p/'after.json',mutation!='failed-outcome')
            actual[:]=deepcopy(after);report['sourcePolicyKind']='other'
            (p/'report.json').write_text(json.dumps(report),encoding='utf8')
            with self.assertRaises(ValueError):closed.state_check(p,p/'after.json',True)

if __name__=='__main__':unittest.main()
