"""Offline fail-closed boundaries for the exact two-source PROD promotion."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
def load(name):
    spec = importlib.util.spec_from_file_location(name,ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module
closed = load('direct-public-display-production-policy.py')
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
        self.assertNotIn('manageLivePalmesDirect',closed.v2.eligible())
        test=load('direct-public-display-test-policy.py').contract()
        wrong=deepcopy(self.r);wrong['standardSources'][closed.MARKER]=test['project']
        with self.assertRaises(ValueError):router.for_request(wrong)
    def test_candidate_baseline_approval_and_schema_are_closed(self):
        mutations=[('candidate','a'*40),('productionCommit','b'*40),('productionHosting','sites/livepalmes/versions/new'),
                   ('testRun',45013268034),('freezeTestCandidate',False),('unexpected',True)]
        for k,v in mutations:
            with self.subTest(k=k),self.assertRaises(ValueError):closed.approved({**self.r,k:v})
        for k,v in [('functions',['readNapPublicSwimmer']),('functions',self.c['allowedFunctions']+['storeCompetitionPdf']),
                    ('schema',True),('productionRun',1),('approval',{**self.c['approval'],'text':'TEST only'}),
                    (closed.MARKER,load('direct-public-display-test-policy.py').CONTRACT_SHA256),('controls',{})]:
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
if __name__=='__main__':unittest.main()
