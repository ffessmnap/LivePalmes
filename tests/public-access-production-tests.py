import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name.replace('-','_'),ROOT/'tools'/name)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
m=load('public-access-production-policy.py')

class PublicAccessProductionTests(unittest.TestCase):
    def request(self):return {**copy.deepcopy(m.contract()['request']),m.OPTION:{'contractSha256':m.DIGEST}}
    def function(self,name,maximum=15,concurrency=80):
        service={'revision':'old','serviceAccountEmail':'existing@livepalmes.iam.gserviceaccount.com',
                 'maxInstanceRequestConcurrency':concurrency,'availableMemory':'256M'}
        if maximum is not None:service['maxInstanceCount']=maximum
        keys=['LIVEPALMES_NAP_PASSWORD']
        if name in ['submitEngagementAccessRequest','resolveEngagementAccessRequest']:
            keys+=['LIVEPALMES_SMTP_HOST','LIVEPALMES_SMTP_PORT','LIVEPALMES_SMTP_USER','LIVEPALMES_SMTP_PASS','LIVEPALMES_SMTP_SECURE','LIVEPALMES_MAIL_FROM']
        service['secretEnvironmentVariables']=[{'key':k,'secret':k,'version':'1','projectId':'livepalmes'} for k in keys]
        return {'name':m.PREFIX+name,'state':'ACTIVE','environment':'GEN_2','updateTime':'old',
                'buildConfig':{'runtime':'nodejs22','entryPoint':name,'source':{'storageSource':{'bucket':'old','object':'old'}}},
                'serviceConfig':service,'labels':{'livepalmes-commit':'b'*40,'retained-label':'same'}}
    def after(self,before):
        after=copy.deepcopy(before);after['serviceConfig']['revision']='new';after['updateTime']='new'
        after['labels']['livepalmes-commit']=m.contract()['candidate']
        if before['name'].split('/')[-1] in m.PUBLIC:after['serviceConfig'].update(m.CAPACITY)
        return after
    def test_contract_is_closed_to_version_options_and_approval(self):
        self.assertEqual(m.approved(self.request()),m.SELECTED)
        for key,value in [('candidate','a'*40),('testRun',1),('productionHosting','sites/livepalmes/versions/other'),('standardSources',{})]:
            request=self.request();request[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):m.approved(request)
        ordinary=load('standard-source-policy.py')
        self.assertNotIn('submitEngagementAccessRequest',ordinary.eligible())
        self.assertNotIn('resolveEngagementAccessRequest',ordinary.eligible())
    def test_only_two_public_capacity_fields_can_change(self):
        for name in m.SELECTED:
            before=self.function(name);after=self.after(before);m.assert_selected(before,after,m.contract()['candidate'])
            for field,value in [('serviceAccountEmail','different@example.com'),('availableMemory','1G'),('secretEnvironmentVariables',[])]:
                bad=copy.deepcopy(after);bad['serviceConfig'][field]=value
                with self.subTest(name=name,field=field),self.assertRaises(ValueError):m.assert_selected(before,bad,m.contract()['candidate'])
            bad=copy.deepcopy(after);bad['serviceConfig']['maxInstanceCount']=9
            with self.subTest(name=name),self.assertRaises(ValueError):m.assert_selected(before,bad,m.contract()['candidate'])
    def test_masks_and_absent_limit_reset(self):
        for name in m.SELECTED:
            before=self.function(name,None);body,mask=m.publication_patch(before,{'bucket':'new','object':'new'},m.contract()['candidate'])
            restored,restore_mask=m.rollback_patch(before,{'bucket':'backup','object':'backup'})
            self.assertEqual(set(body),{'name','buildConfig','labels'}|({'serviceConfig'} if name in m.PUBLIC else set()))
            self.assertEqual(mask,restore_mask)
            if name in m.PUBLIC:
                self.assertEqual(body['serviceConfig'],m.CAPACITY)
                self.assertEqual(restored['serviceConfig'],{'maxInstanceCount':0,'maxInstanceRequestConcurrency':80})
                self.assertIn('service_config.max_instance_count',restore_mask)
            else:self.assertNotIn('serviceConfig',restored)
        with self.assertRaises(ValueError):m.publication_patch(self.function('readNapPublicSwimmer'),{},m.contract()['candidate'])
    def test_manifest_origin_digest_and_configuration_scope_are_sealed(self):
        origins=[{'name':'fixture','commit':'b'*40} for _ in range(119)]
        c=copy.deepcopy(m.contract());c['originsSha256']=m.digest(origins)
        with patch.object(m,'contract',return_value=c):
            value=m.expected_manifest(origins);m.validate_manifest(value)
            for key,new in [('selected',[]),('capacityChanges',{}),('bindingChanges',True),('businessInvocations',1)]:
                bad=copy.deepcopy(value);bad[key]=new
                with self.subTest(key=key),self.assertRaises(ValueError):m.validate_manifest(bad)
    def test_official_rollback_restores_absent_limit_without_network(self):
        state=load('production-release-state.py')
        before=[self.function(n,None if n=='getPublicEngagementClubDirectory' else 15) for n in m.SELECTED]
        after=[self.after(f) for f in before];current={f['name']:copy.deepcopy(f) for f in after}
        origins=[{'name':'fixture'+str(i)} for i in range(119)]
        c=copy.deepcopy(m.contract());c['originsSha256']=m.digest(origins)
        requests=[]
        def request(url,method='GET',body=None):
            if url.endswith(':generateUploadUrl'):return {'uploadUrl':'https://storage.googleapis.com/fixture/source.zip','storageSource':{'bucket':'fixture','object':'source.zip'}}
            if method=='PATCH':
                requests.append((url,copy.deepcopy(body)));f=current[body['name']]
                f['labels']=body['labels'];f['buildConfig']['source']=body['buildConfig']['source']
                for k,v in body.get('serviceConfig',{}).items():
                    if v==0:f['serviceConfig'].pop(k,None)
                    else:f['serviceConfig'][k]=v
                return {}
            return current[url.removeprefix(state.API)]
        with tempfile.TemporaryDirectory() as directory,patch.object(m,'contract',return_value=c):
            root=Path(directory);(root/'sources').mkdir();archive=b'isolated fixture archive'
            (root/'sources'/ (m.SELECTED[0]+'.zip')).write_bytes(archive)
            value=m.expected_manifest(origins)
            report={'candidate':c['candidate'],'functions':[{'name':f['name']} for f in before],'newFunctions':[],
                    'sourcePolicyKind':m.KIND,'standardSourceManifestSha256':m.digest(value),
                    'sources':[{'functions':m.SELECTED,'sha256':hashlib.sha256(archive).hexdigest()}]}
            for name,data in [('report.json',report),('functions.json',before),('standard-source-manifest.json',value),
                              ('after.json',{'candidate':c['candidate'],'functions':[state.identity(f) for f in after]})]:
                (root/name).write_text(json.dumps(data),encoding='utf-8')
            runtime_checks=load('preflight-production-release.py')
            fake_spec=SimpleNamespace(loader=SimpleNamespace(exec_module=lambda _:None))
            with patch.dict(os.environ,{'CONFIRM_CODE_ROLLBACK':'livepalmes'}),patch.object(state,'inventory',return_value=list(current.values())),\
                 patch.object(state,'request',side_effect=request),patch.object(state,'wait_operation'),patch.object(state.urllib.request,'urlopen'),patch.object(m.common,'load',return_value=runtime_checks),\
                 patch.object(state.importlib.util,'spec_from_file_location',return_value=fake_spec),patch.object(state.importlib.util,'module_from_spec',return_value=m):
                state.rollback(root,root/'after.json')
            self.assertEqual(len(requests),3)
            for f in before:m.assert_rollback(f,current[f['name']])
            directory_call=next((u,b) for u,b in requests if b['name'].endswith('/getPublicEngagementClubDirectory'))
            self.assertIn('service_config.max_instance_count',directory_call[0]);self.assertEqual(directory_call[1]['serviceConfig']['maxInstanceCount'],0)

    def test_shared_transport_updates_three_and_retains_other_identities(self):
        transport=load('standard-source-publish.py');state_module=load('production-release-state.py')
        old=json.loads((ROOT/'.github/releases/evidence/20261115-production-public-privacy-contract.json').read_text())
        before=[self.function(r['name'].split('/')[-1],None if r['name'].endswith('/getPublicEngagementClubDirectory') else 15) for r in old['origins']]
        deletion=next(f for f in before if f['name'].endswith('/resolveAccessUserDeletionRequest'))
        deletion['serviceConfig']['secretEnvironmentVariables']=[{'key':k,'secret':k,'version':'1','projectId':'livepalmes'} for k in
            ['LIVEPALMES_SMTP_HOST','LIVEPALMES_SMTP_PORT','LIVEPALMES_SMTP_USER','LIVEPALMES_SMTP_PASS','LIVEPALMES_SMTP_SECURE','LIVEPALMES_MAIL_FROM']]
        origins=sorted([{**state_module.identity(f),'commit':f['labels']['livepalmes-commit']} for f in before],key=lambda r:r['name'])
        c=copy.deepcopy(m.contract());c['originsSha256']=m.digest(origins)
        current={f['name']:copy.deepcopy(f) for f in before};requests=[]
        def request(url,method='GET',body=None):
            if url.endswith(':generateUploadUrl'):return {'uploadUrl':'https://storage.googleapis.com/fixture/source.zip','storageSource':{'bucket':'fixture','object':'source.zip'}}
            if method=='PATCH':
                requests.append((url,copy.deepcopy(body)));f=current[body['name']]
                f['buildConfig']['source']=body['buildConfig']['source'];f['labels']=body['labels']
                f['serviceConfig'].update(body.get('serviceConfig',{}));f['serviceConfig']['revision']='new';f['updateTime']='new'
                return {}
            return current[url.removeprefix(state_module.API)]
        fake_state=SimpleNamespace(API=state_module.API,identity=state_module.identity,inventory=lambda:list(current.values()),request=request,wait_operation=lambda _:None)
        upload=SimpleNamespace(headers={'x-goog-generation':'123'})
        with tempfile.TemporaryDirectory() as directory,patch.object(m,'contract',return_value=c):
            root=Path(directory);plan=root/'plan';backup=root/'backup';plan.mkdir();backup.mkdir()
            value=m.expected_manifest(origins)
            report={'errors':[],'standardSourceManifestSha256':m.digest(value),'candidate':c['candidate'],'newFunctions':[]}
            for name,data in [('request.json',self.request()),('standard-source-manifest.json',value)]:
                (plan/name).write_text(json.dumps(data))
            for name,data in [('report.json',report),('standard-source-manifest.json',value),('functions.json',before)]:
                (backup/name).write_text(json.dumps(data))
            with patch.object(transport,'release_policy',return_value=m),patch.object(m.common,'controls',return_value=c['controls']),\
                 patch.object(transport,'attest',side_effect=lambda f,expected,state:{'identity':state.identity(f)}),\
                 patch.object(transport.urllib.request,'urlopen') as network:
                network.return_value.__enter__.return_value=upload
                import time
                transport.publish(root,plan,backup,fake_state,lambda *_:b'isolated source archive',time.time()+30)
            self.assertEqual(len(requests),3)
            changed={body['name'].split('/')[-1] for _,body in requests}
            self.assertEqual(changed,set(m.SELECTED))
            for url,body in requests:
                name=body['name'].split('/')[-1]
                if name in m.PUBLIC:self.assertEqual(body['serviceConfig'],m.CAPACITY)
                else:self.assertNotIn('serviceConfig',body);self.assertNotIn('service_config',url)
            for f in before:
                if f['name'].split('/')[-1] not in m.SELECTED:self.assertEqual(current[f['name']],f)
            self.assertEqual((plan/'standard-controls-before.json').read_bytes(),json.dumps(c['controls']).encode())


    def test_preflight_reviews_every_retained_function_and_rejects_disagreement(self):
        cycle=load('release-cycle.py')
        old=json.loads((ROOT/'.github/releases/evidence/20261115-production-public-privacy-contract.json').read_text())
        origins=sorted([{'name':r['name'],'commit':'b'*40,'state':'ACTIVE','revision':'fixture-'+r['name'].split('/')[-1],'updateTime':'fixture'} for r in old['origins']],key=lambda r:r['name'])
        names=[r['name'].split('/')[-1] for r in origins]
        old_raw={n:'a'*64 for n in names};new_raw={n:'e'*64 for n in names}
        old_fast={n:'f'*64 for n in names};new_fast={n:('d'*64 if n in m.SELECTED else 'f'*64) for n in names}
        c=copy.deepcopy(m.contract());c.update({'originsSha256':m.digest(origins),'candidateLegacySha256':m.digest(new_raw),'candidateOptimizedSha256':m.digest(new_fast)})
        with tempfile.TemporaryDirectory() as directory,patch.object(m,'contract',return_value=c):
            root=Path(directory);value=m.expected_manifest(origins)
            for name,data in [('request.json',self.request()),('standard-source-manifest.json',value)]:
                (root/name).write_text(json.dumps(data))
            (root/'baseline.json').write_text(json.dumps({'productionRun':c['productionRun'],'productionCommit':c['productionCommit'],'source':'verified-publication-artifacts'}))
            with patch.object(cycle,'source_policy',return_value=m),\
                 patch.object(cycle,'backend_fingerprints',side_effect=lambda ref:new_raw if ref==c['candidate'] else old_raw),\
                 patch.object(cycle,'production_selection_fingerprints',side_effect=lambda ref:new_fast if ref==c['candidate'] else old_fast):
                cycle.verify_excluded_backend(root,{'functions':origins},m.SELECTED)
                result=json.loads((root/'excluded-backend-verification.json').read_text())
                self.assertEqual(result['networkCalls'],0);self.assertEqual(len(result['functionReviews']),116)
                self.assertEqual(set(result['passedFunctions']),set(names)-set(m.SELECTED))
                retained=next(n for n in names if n not in m.SELECTED);old_fast[retained]='0'*64
                with self.assertRaisesRegex(ValueError,'non demontree'):cycle.verify_excluded_backend(root,{'functions':origins},m.SELECTED)
                with self.assertRaisesRegex(ValueError,'hors inventaire'):cycle.verify_excluded_backend(root,{'functions':origins[:-1]},m.SELECTED)


if __name__=='__main__':unittest.main()
