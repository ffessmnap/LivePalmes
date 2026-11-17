"""Coordinated B Rules publication: all cloud operations are fixture callbacks."""
import copy
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('b_rules_tests',ROOT/'tools/portal-session-enforcement-production-rules.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
p=r.policy()
def save(path,value):Path(path).write_text(json.dumps(value),encoding='utf-8')

class EnforcementRulesTests(unittest.TestCase):
    def fixture(self,tmp):
        d=Path(tmp);plan=d/'plan';backup=d/'backup';plan.mkdir();backup.mkdir();c=p.contract()
        names=c['selected']+['retained%02d'%i for i in range(17)]
        functions=[{'name':p.PREFIX+n,'state':'ACTIVE','revision':n+'-new','updateTime':'new'} for n in names]
        value={'candidate':p.CANDIDATE,'selected':c['selected'],'origins':functions}
        save(backup/'report.json',{'candidate':p.CANDIDATE,'newFunctions':[],'errors':[],
            'sourcePolicyKind':p.KIND,'standardSourceManifestSha256':p.digest(value)})
        (plan/'standard-session-enforcement-ready-hosting').mkdir()
        save(plan/'standard-session-enforcement-ready-hosting/prerequisites-hosting.json',{'ready':True,'missingPermissions':[],'planRun':11,
            'portalSessionEnforcementRules':{'contractSha256':p.DIGEST,'before':c['rules']['observedBefore']}})
        save(d/'after.json',{'candidate':p.CANDIDATE,'errors':[],'functions':functions})
        save(plan/'standard-source-receipts.json',{'candidate':p.CANDIDATE,'manifestSha256':p.digest(value),
            'functions':{f['name']:{'identity':f,'allPathsAndFileBytesIdentical':True,'generationReadAndReferencesRechecked':True}
                         for f in functions if f['name'].removeprefix(p.PREFIX) in c['selected']}})
        (d/'backup.enc').write_bytes(b'encrypted fixture')
        env={'PREPARATION_RUN':'11','READINESS_RUN':'12','RULES_BACKUP_VERIFIED':'true','ENCRYPTED_BACKUP_FILE':str(d/'backup.enc'),
             'PRODUCTION_AFTER_FILE':str(d/'after.json'),'GITHUB_RUN_ID':'456','GITHUB_SHA':'a'*40,'RELEASE_RUN':'789'}
        return d,plan,backup,c,value,env

    def prepare_backup(self,plan,backup,c,value):
        with patch.object(r,'context',return_value=(p,value,c,'fixture-token',r.HOSTING_IDENTITY)),\
             patch.object(r,'snapshot',return_value=(c['rules']['observedBefore'],r.sources(c)[0])):
            r.backup(plan,backup)

    def cloud(self,c,drift=False,denied=False):
        before,after=r.sources(c);current=copy.deepcopy(c['rules']['observedBefore']);calls=[]
        created='projects/livepalmes/rulesets/fixture-new'
        published={**current,'rulesetName':created,'sha256':c['rules']['afterSha256'],'updateTime':'published'}
        def snapshot(token):return copy.deepcopy(current),before if current['sha256']==c['rules']['beforeSha256'] else after
        def api(path,token,method='GET',body=None,**kwargs):
            calls.append((path,method,body))
            if method=='POST':
                self.assertEqual(path,'projects/livepalmes/rulesets');self.assertEqual(body['source']['files'][0]['content'],after)
                if denied:raise PermissionError('fixture refusal')
                return {'name':created}
            if method=='GET':
                self.assertEqual(path,created)
                if drift:current['updateTime']='external change'
                return {'source':{'files':[{'name':'firestore.rules','content':after,'fingerprint':'fixture metadata'}]}}
            self.assertEqual(path,r.RELEASE);self.assertEqual(method,'PATCH');self.assertEqual(body['release']['rulesetName'],created)
            current.clear();current.update(published);return {}
        return snapshot,api,calls,current,published

    def test_only_actual_production_snapshot_block_changes(self):
        c=p.contract();before,after=r.sources(c)
        self.assertEqual(r.digest(before),c['rules']['beforeSha256']);self.assertEqual(r.digest(after),c['rules']['afterSha256'])
        self.assertNotEqual(r.digest(after),c['rules']['testAfterSha256'])
        needle='      allow get: if canReadAccessDirectorySnapshot();'
        replacement='      // All portal snapshots pass through the server session and current scope.\n      allow get: if false;'
        self.assertEqual(before.replace(needle,replacement,1),after)
        self.assertTrue(r.file_matches([{'name':'firestore.rules','content':after,'fingerprint':'metadata'}],after))
        self.assertFalse(r.file_matches([{'name':'other','content':after}],after))

    def test_api_refuses_arbitrary_resource_body_and_redirect(self):
        for path,method,body in [('projects/other/rulesets','POST',{}),(r.RELEASE,'PATCH',{'release':{'name':'other'}}),
                                 ('projects/livepalmes/rulesets','POST',{'source':{'files':[]}}),('projects/livepalmes/other','GET',None)]:
            with self.assertRaises(ValueError):r.api(path,'fixture-token',method,body,write=method!='GET')
        with self.assertRaises(ValueError):r.NoRedirect().redirect_request(None,None,None,None,None,None)

    def test_identity_context_is_workflow_specific(self):
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'other','GITHUB_REF':'refs/heads/main'}),\
             patch.object(r.subprocess,'check_output') as token:
            with self.assertRaises(ValueError):r.identity_token('livepalmes-production-release.yml')
            token.assert_not_called()

    def test_readiness_keeps_mismatch_diagnostic_without_reset(self):
        with tempfile.TemporaryDirectory() as tmp:
            d,plan,backup,c,value,env=self.fixture(tmp)
            with patch.object(r,'context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),\
                 patch.object(r,'snapshot',return_value=(c['rules']['observedBefore'],r.sources(c)[0])):
                proof=r.readiness(plan);self.assertTrue(proof['readOnly'])
            bad={**c['rules']['observedBefore'],'updateTime':'different'}
            with patch.object(r,'context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),\
                 patch.object(r,'snapshot',return_value=(bad,r.sources(c)[0])):
                with self.assertRaises(ValueError):r.readiness(plan)
            self.assertEqual(json.loads((plan/'standard-session-enforcement-rules-observed.json').read_text())['before'],bad)

    def test_coordinated_backup_then_single_rules_publication(self):
        with tempfile.TemporaryDirectory() as tmp:
            d,plan,backup,c,value,env=self.fixture(tmp)
            with patch.dict(os.environ,env):self.prepare_backup(plan,backup,c,value)
            self.assertEqual((backup/'session-enforcement-rules/before.rules').read_text(encoding='utf-8'),r.sources(c)[0])
            snapshot,api,calls,current,published=self.cloud(c)
            with patch.dict(os.environ,env),patch.object(r,'context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),\
                 patch.object(r,'snapshot',side_effect=snapshot),patch.object(r,'api',side_effect=api):
                r.publish(plan,backup,d/'published.json');r.final(plan,d/'final.json')
            self.assertEqual([m for _,m,_ in calls].count('POST'),1);self.assertEqual([m for _,m,_ in calls].count('PATCH'),1)
            self.assertEqual(json.loads((d/'final.json').read_text())['after'],published)
            self.assertEqual(json.loads((d/'published.json').read_text())['result'],'success')

    def test_missing_crypto_source_archive_or_failed_state_stops_before_rules(self):
        for mode in ['crypto','archive','state','inventory']:
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as tmp:
                d,plan,backup,c,value,env=self.fixture(tmp)
                with patch.dict(os.environ,env):self.prepare_backup(plan,backup,c,value)
                if mode=='crypto':env['RULES_BACKUP_VERIFIED']='false'
                elif mode=='archive':
                    v=json.loads((plan/'standard-source-receipts.json').read_text());next(iter(v['functions'].values()))['allPathsAndFileBytesIdentical']=False;save(plan/'standard-source-receipts.json',v)
                else:
                    v=json.loads((d/'after.json').read_text())
                    if mode=='state':v['errors']=['fixture failed source']
                    else:v['functions'][-1]=v['functions'][0]
                    save(d/'after.json',v)
                with patch.dict(os.environ,env),patch.object(r,'context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),patch.object(r,'api') as api:
                    with self.assertRaises(ValueError):r.publish(plan,backup,d/'published.json')
                    api.assert_not_called()

    def test_drift_after_compile_never_patches_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            d,plan,backup,c,value,env=self.fixture(tmp)
            with patch.dict(os.environ,env):self.prepare_backup(plan,backup,c,value)
            snapshot,api,calls,_,_=self.cloud(c,drift=True)
            with patch.dict(os.environ,env),patch.object(r,'context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),\
                 patch.object(r,'snapshot',side_effect=snapshot),patch.object(r,'api',side_effect=api):
                with self.assertRaises(ValueError):r.publish(plan,backup,d/'published.json')
            self.assertEqual([m for _,m,_ in calls].count('POST'),1);self.assertEqual([m for _,m,_ in calls].count('PATCH'),0)
            self.assertEqual(json.loads((d/'published.json').read_text())['result'],'failure')

    def test_permission_refusal_is_not_retried(self):
        with tempfile.TemporaryDirectory() as tmp:
            d,plan,backup,c,value,env=self.fixture(tmp)
            with patch.dict(os.environ,env):self.prepare_backup(plan,backup,c,value)
            snapshot,api,calls,_,_=self.cloud(c,denied=True)
            with patch.dict(os.environ,env),patch.object(r,'context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),\
                 patch.object(r,'snapshot',side_effect=snapshot),patch.object(r,'api',side_effect=api):
                with self.assertRaises(PermissionError):r.publish(plan,backup,d/'published.json')
            self.assertEqual(len(calls),1);self.assertEqual(json.loads((d/'published.json').read_text())['result'],'failure')

    def test_rollback_rules_requires_same_run_restored_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            d,plan,backup,c,value,env=self.fixture(tmp);target=backup/'session-enforcement-rules';target.mkdir()
            published={**c['rules']['observedBefore'],'sha256':c['rules']['afterSha256'],'rulesetName':'projects/livepalmes/rulesets/new','updateTime':'new'}
            save(target/'rollback-validated.json',{'releaseRun':789,'rollbackRun':456,'rulesAfter':published})
            save(target/'rollback-sources-restored.json',{'rollbackRun':455,'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),'allSourcesRestored':True})
            with patch.dict(os.environ,env),patch.object(r,'rollback_context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),patch.object(r,'api') as api:
                with self.assertRaises(ValueError):r.rollback_restore(backup,d/'rollback.json')
                api.assert_not_called()
            save(target/'rollback-sources-restored.json',{'rollbackRun':456,'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),'allSourcesRestored':True})
            current=copy.deepcopy(published);before=r.sources(c)[0];calls=[]
            def api(path,token,method='GET',body=None,**kwargs):
                calls.append((path,method))
                if method=='GET':return {'source':{'files':[{'name':'firestore.rules','content':before}]}}
                self.assertEqual(path,r.RELEASE);self.assertEqual(body['release']['rulesetName'],c['rules']['observedBefore']['rulesetName'])
                current.clear();current.update(c['rules']['observedBefore']);return {}
            with patch.dict(os.environ,env),patch.object(r,'rollback_context',return_value=(p,value,c,'token',r.HOSTING_IDENTITY)),\
                 patch.object(r,'snapshot',side_effect=lambda token:(current.copy(),before)),patch.object(r,'api',side_effect=api):r.rollback_restore(backup,d/'rollback.json')
            self.assertEqual(calls[-1][1],'PATCH');self.assertEqual(json.loads((d/'rollback.json').read_text())['result'],'success')

if __name__=='__main__':unittest.main()
