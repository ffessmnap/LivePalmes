"""Offline boundaries for the exact two-source Direct TEST complement."""
from copy import deepcopy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

closed=load('direct-public-display-test-policy.py')
publisher=load('publish-test-standard-sources.py')
production=load('standard-source-policy-v2.py')

class Tests(unittest.TestCase):
    def setUp(self):
        original=publisher.load
        loader=patch.object(publisher,'load',side_effect=lambda name:closed if name=='direct-public-display-test-policy.py' else original(name))
        loader.start();self.addCleanup(loader.stop)
        git=patch.object(closed,'git',return_value='')
        git.start();self.addCleanup(git.stop)

    def request(self):
        c=closed.contract()
        return {**{k:c[k] for k in ['baselineRun','baselineCandidate','baselineHosting','approval']},
                'schema':2,'candidate':c['applicationCommit'],'functions':c['allowedFunctions'],
                closed.OPTION:closed.CONTRACT_SHA256}

    def test_closed_manifest_and_each_changed_boundary(self):
        value=self.request();self.assertEqual(publisher.validate(value),value)
        for delta in [{'schema':1},{closed.OPTION:'0'*64},{'functions':['readNapPublicSwimmer']},
                      {'functions':value['functions']+['storeCompetitionPdf']},{'baselineRun':1},
                      {'baselineCandidate':'a'*40},{'baselineHosting':'sites/livepalmes/versions/no'},
                      {'approval':{**value['approval'],'messageId':'00000000-0000-0000-0000-000000000001'}},
                      {'a5Retirement':'other'},{'configurationChanges':True}]:
            with self.subTest(delta=delta),self.assertRaises(ValueError):publisher.validate({**value,**delta})

    def test_ordinary_and_production_still_refuse_manage(self):
        value=self.request();value.pop(closed.OPTION)
        with self.assertRaises(ValueError):publisher.validate(value)
        self.assertNotIn('manageLivePalmesDirect',publisher.policy.eligible())
        request={'schema':1,'candidate':value['candidate'],'productionCommit':value['baselineCandidate'],
                 'productionHosting':'sites/livepalmes/versions/unchanged','testRun':12,
                 'standardSources':{'schema':2,'productionRun':11,'functions':value['functions'],
                                    'approval':value['approval']}}
        with self.assertRaises(ValueError):production.approved(request)

    def test_changed_application_or_any_function_fingerprint_is_rejected(self):
        value=self.request();c=closed.contract()
        def fake(*args):return 'functions/nap-direct-store.js' if args[0]=='diff' else ''
        with self.assertRaises(ValueError):closed.manifest(value,fake)
        def tooling(*args):return 'tools/publish-test-standard-sources.py' if args[0]=='diff' else ''
        self.assertEqual(closed.manifest(value,tooling),c)
        anchored={**c['fingerprints'],'untouched':'0'*64}
        closed.fingerprints(value,lambda sha:anchored)
        count=0
        def corrupt(sha):
            nonlocal count
            count+=1
            return {**anchored,'untouched':'1'*64} if count==1 else anchored
        with self.assertRaises(ValueError):closed.fingerprints(value,corrupt)

    def test_transport_still_calculates_every_dependency(self):
        value=self.request();c=closed.contract();before=[{'name':publisher.PREFIX+n,'state':'ACTIVE',
            'labels':{'livepalmes-commit':'a'*40}} for n in c['allowedFunctions']+['other']]
        def fp(sha):return {**{n:('1' if sha=='a'*40 else '2')*64 for n in c['allowedFunctions']},'other':'0'*64}
        self.assertEqual(publisher.selection(before,value['candidate'],value['functions'],fp),value['functions'])
        with self.assertRaises(ValueError):publisher.selection(before,value['candidate'],['readNapPublicSwimmer'],fp)
        transport=publisher.load('publish-test-direct-sources.py');original=publisher.load
        with patch.object(publisher,'load',side_effect=lambda name:transport if name=='publish-test-direct-sources.py' else original(name)), \
             patch.object(transport.cycle,'test_backend_fingerprints',return_value=c['fingerprints']):
            configured=publisher.configured(value)
            self.assertFalse(configured.CHECK_OPERATIONAL_CONTROLS)
            self.assertEqual(configured.ALLOWED,closed.NAMES)
        source=(ROOT/'tools/publish-test-standard-sources.py').read_text()
        self.assertIn("load('direct-public-display-test-policy.py').fingerprints(value",source)
        self.assertIn("policy.source_paths(value['baselineCandidate'], sha, paths",source)
        self.assertIn("url.endswith('?updateMask=build_config.source,labels')",source)

    def test_only_authenticated_exact_receipts_are_reused(self):
        value=self.request();names=value['functions'];sha=value['candidate']
        rows=[{'name':publisher.PREFIX+n,'commit':sha,'revision':n+'-v2','updateTime':'after','state':'ACTIVE'} for n in names]
        run={'id':13,'head_sha':sha,'status':'completed','conclusion':'success','run_attempt':1}
        info={**run,'event':'workflow_dispatch','path':publisher.WORKFLOW,'head_branch':'main',
              'repository':{'full_name':publisher.REPOSITORY},'head_repository':{'full_name':publisher.REPOSITORY}}
        proof={'schema':1,'release':'standard','standardManifest':value,'candidate':sha,
               'contractSha256':publisher.policy.digest(value),'baselineRun':value['baselineRun'],
               'selected':names,'state':{'functions':rows},'taskContentsRead':False,
               'configurationsUnchanged':True,'otherFunctionsUnchanged':True,'hostingUnchanged':True,
               'operationalControls':'not-requested','managedSources':{n:{'allPathsAndFileBytesIdentical':True,
               'generationReadAndReferencesRechecked':True,'archiveSha256':'1'*64,'archiveIdentity':'2'*64,
               'storageSource':{'bucket':'gcf-v2-sources-206080168534-europe-west1','object':n+'/function-source.zip',
               'generation':'123'}} for n in names}}
        for corruption in [None,'digest','binding','archive','rows','candidate','operational']:
            actual=deepcopy(proof)
            if corruption=='digest':actual['contractSha256']='0'*64
            if corruption=='binding':actual['configurationsUnchanged']=False
            if corruption=='archive':actual['managedSources'][names[0]]['generationReadAndReferencesRechecked']=False
            if corruption=='rows':actual['state']['functions']=rows[:1]
            if corruption=='candidate':actual['candidate']='a'*40
            if corruption=='operational':actual['controls']={}
            def match(proven,current):return {r['name'] for r in proven['state']['functions'] if r in current['functions']}
            api=SimpleNamespace(gh=lambda *a:{'workflow_runs':[run]},artifact=lambda *a:info,read=lambda *a:actual,
                matching_functions=match,test_backend_fingerprints=lambda *a:closed.contract()['fingerprints'])
            with self.subTest(corruption=corruption):
                self.assertEqual(publisher.trusted_revisions(Path('unused'),{'functions':rows},api),
                                 {r['name'] for r in rows} if corruption is None else set())

if __name__=='__main__':unittest.main()
