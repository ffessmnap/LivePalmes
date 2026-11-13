import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(file):
    spec=importlib.util.spec_from_file_location(file.replace('-','_'),ROOT/'tools'/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
m=load('official-review-production-policy.py')


class OfficialReviewProductionTests(unittest.TestCase):
    def request(self):return {**copy.deepcopy(m.contract()['request']),m.OPTION:{'contractSha256':m.DIGEST}}
    def functions(self):
        result=[]
        for row in m.contract()['origins']:
            name=row['name'].split('/')[-1]
            result.append({'name':row['name'],'state':'ACTIVE','updateTime':row['updateTime'],'environment':'GEN_2',
                'buildConfig':{'runtime':'nodejs22','entryPoint':name,'source':{'storageSource':{'bucket':'old','object':'old'}}},
                'serviceConfig':{'revision':row['revision'],'serviceAccountEmail':'existing@livepalmes.iam.gserviceaccount.com'},
                'labels':{'livepalmes-commit':row['commit']}})
        smtp=next(f for f in result if f['name'].endswith('/resolveAccessUserDeletionRequest'))
        smtp['serviceConfig']['secretEnvironmentVariables']=[{'key':key,'secret':key,'version':'1','projectId':'livepalmes'}
            for key in ['LIVEPALMES_SMTP_HOST','LIVEPALMES_SMTP_PORT','LIVEPALMES_SMTP_USER','LIVEPALMES_SMTP_PASS','LIVEPALMES_SMTP_SECURE','LIVEPALMES_MAIL_FROM']]
        return result

    def test_exact_contract_and_standard_exclusion_remain_distinct(self):
        self.assertEqual(m.approved(self.request()),m.SELECTED)
        self.assertNotIn('resolveEngagementSwimmerChangeRequest',m.common.eligible())
        standard=copy.deepcopy(m.contract()['request']);standard['standardSources']={
            'schema':1,'productionRun':43419140643,'functions':m.SELECTED,'approval':m.contract()['approval'],'controls':m.contract()['controls']}
        with self.assertRaises(ValueError):m.common.approved(standard)
        combined=self.request();combined['standardSources']=standard['standardSources']
        with self.assertRaises(ValueError):m.approved(combined)

    def test_other_candidate_reference_proof_or_contract_never_accepted(self):
        for key,value in [('candidate','a'*40),('productionCommit','b'*40),('testRun',1),('productionHosting','sites/livepalmes/versions/other'),(m.OPTION,{'contractSha256':'0'*64})]:
            request=self.request();request[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):m.approved(request)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'contract.json';path.write_text(m.PATH.read_text()+' ')
            with patch.object(m,'PATH',path),self.assertRaises(ValueError):m.contract()

    def test_complete_origins_and_both_calculators_are_required(self):
        c=m.contract();functions={r['name'].split('/')[-1]:{k:r[k] for k in ['name','updateTime','state','revision','commit']} for r in c['origins']}
        fast={};old={}
        for r in c['origins']:
            name=r['name'].split('/')[-1];fast.setdefault(r['commit'],{})[name]=r['before'];old.setdefault(r['commit'],{})[name]=r['legacyBefore']
        fast[c['candidate']]={r['name'].split('/')[-1]:r['after'] for r in c['origins']}
        old[c['candidate']]={r['name'].split('/')[-1]:r['legacyAfter'] for r in c['origins']}
        refs=[c['productionCommit'],c['candidate']]
        git=lambda command,ref:c['protectedBlobs'][ref.split(':',1)[1]][refs.index(ref.split(':',1)[0])]
        args=[self.request(),{'productionRun':c['productionRun'],'productionCommit':c['productionCommit'],'source':'verified-publication-artifacts'},functions,m.SELECTED,fast.__getitem__,old.__getitem__,git,c['changedFiles']]
        self.assertEqual(m.freeze(*args),m.expected_manifest())
        args[3]=m.SELECTED[:1]
        with self.assertRaises(ValueError):m.freeze(*args)
        args[3]=m.SELECTED
        retained=next(r for r in c['origins'] if r['name'].split('/')[-1] not in m.SELECTED)
        old[c['candidate']][retained['name'].split('/')[-1]]='0'*64
        with self.assertRaises(ValueError):m.freeze(*args)

    def test_manifest_configuration_bindings_and_initial_inventory_are_closed(self):
        manifest=m.expected_manifest();m.initial(self.functions(),manifest)
        manifest['selected']=manifest['selected'][:1]
        with self.assertRaises(ValueError):m.validate_manifest(manifest)
        before=next(f for f in self.functions() if f['name']==m.PREFIX+m.SELECTED[1])
        after=copy.deepcopy(before);after['updateTime']='new';after['serviceConfig']['revision']='new'
        after['labels']['livepalmes-commit']=m.contract()['candidate'];m.assert_selected(before,after,m.contract()['candidate'])
        for field,value in [('secretEnvironmentVariables',[{'key':'NEW','secret':'NEW'}]),('serviceAccountEmail','other@example.com')]:
            changed=copy.deepcopy(after);changed['serviceConfig'][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):m.assert_selected(before,changed,m.contract()['candidate'])
        functions=self.functions();functions[0]['serviceConfig']['revision']='drift'
        with self.assertRaises(ValueError):m.initial(functions,m.expected_manifest())

    def test_controls_stay_active_identical_and_replay_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'request.json').write_text(json.dumps(self.request()));(root/'standard-source-manifest.json').write_text(json.dumps(m.expected_manifest()))
            with patch.object(m.common,'controls',return_value=m.contract()['controls']):m.guard(root);m.guard(root,True)
            self.assertEqual((root/'standard-controls-before.json').read_bytes(),(root/'standard-controls-after.json').read_bytes())
            with patch.object(m.common,'controls',return_value={**m.contract()['controls'],'mailSha256':'0'*64}),self.assertRaises(ValueError):m.guard(root,True)
            with self.assertRaises(ValueError):m.restore_witness(root,root)

    def test_existing_transport_patches_exactly_two_sources_and_labels(self):
        transport=load('standard-source-publish.py');functions={f['name']:f for f in self.functions()};patches=[]
        def request(url,method='GET',body=None):
            if url.endswith(':generateUploadUrl'):
                return {'uploadUrl':'https://storage.googleapis.com/fixture/source.zip','storageSource':{'bucket':'fixture','object':'source.zip'}}
            full=url.removeprefix('api/').split('?',1)[0]
            if method=='PATCH':
                patches.append((url,copy.deepcopy(body)));f=functions[full];f['buildConfig']['source']=body['buildConfig']['source'];f['labels']=body['labels']
                f['updateTime']='new';f['serviceConfig']['revision']='new-'+full.split('/')[-1];return {'done':True}
            return copy.deepcopy(functions[full])
        state=SimpleNamespace(API='api/',request=request,inventory=lambda:copy.deepcopy(list(functions.values())),
            identity=lambda f:{'name':f['name'],'updateTime':f['updateTime'],'state':f['state'],'revision':f['serviceConfig']['revision']},wait_operation=lambda value:None)
        response=SimpleNamespace(headers={'x-goog-generation':'7'})
        class Upload:
            def __enter__(self):return response
            def __exit__(self,*args):return False
        original_load=transport.load
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);plan=root/'plan';backup=root/'backup';plan.mkdir();backup.mkdir();manifest=m.expected_manifest()
            for path,value in [(plan/'request.json',self.request()),(backup/'standard-source-manifest.json',manifest),
                               (backup/'functions.json',list(functions.values())),(backup/'report.json',{'errors':[],'candidate':manifest['candidate'],'newFunctions':[],'standardSourceManifestSha256':m.digest(manifest)})]:
                path.write_text(json.dumps(value))
            (plan/'standard-source-manifest.json').write_text(json.dumps(manifest))
            with patch.object(transport,'load',side_effect=lambda name:SimpleNamespace(for_request=lambda value:m) if name=='production-source-policy.py' else original_load(name)),patch.object(transport.urllib.request,'urlopen',return_value=Upload()),patch.object(transport,'attest',return_value={'fixture':True}),patch.object(m,'guard'):
                transport.publish(root,plan,backup,state,lambda *args:b'fixture archive',time.time()+60)
        self.assertEqual(sorted(p[1]['name'].split('/')[-1] for p in patches),m.SELECTED)
        self.assertTrue(all(p[0].endswith('?updateMask=build_config.source,labels') and set(p[1])=={'name','buildConfig','labels'} for p in patches))


    def test_existing_final_state_checker_uses_the_closed_policy(self):
        state=load('production-release-state.py');before=self.functions();after=copy.deepcopy(before);manifest=m.expected_manifest()
        for function in after:
            if function['name'].split('/')[-1] in m.SELECTED:
                function['updateTime']='new';function['serviceConfig']['revision']='new-'+function['name'].split('/')[-1]
                function['labels']['livepalmes-commit']=manifest['candidate']
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);report={'candidate':manifest['candidate'],'functions':[{'name':m.PREFIX+n} for n in m.SELECTED],
                'newFunctions':[],'standardSourceManifestSha256':m.digest(manifest),'sourcePolicyKind':m.KIND}
            for path,value in [(root/'report.json',report),(root/'functions.json',before),(root/'standard-source-manifest.json',manifest)]:
                path.write_text(json.dumps(value))
            with patch.dict(state.os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary.md')}),patch.object(state,'inventory',return_value=after):
                state.check_after(root,root/'after.json',True)
            self.assertEqual(json.loads((root/'after.json').read_text())['errors'],[])
            changed=copy.deepcopy(after);retained=next(f for f in changed if f['name'].split('/')[-1] not in m.SELECTED)
            retained['labels']['unexpected']='drift'
            with patch.dict(state.os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary.md')}),patch.object(state,'inventory',return_value=changed),self.assertRaises(ValueError):
                state.check_after(root,root/'after-drift.json',True)


if __name__=='__main__':unittest.main()
