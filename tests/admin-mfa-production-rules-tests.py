"""Rules MFA ordering, source attestations, compile and drift; all cloud calls mocked."""
from copy import deepcopy
import importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_prod_rules_tests',ROOT/'tools/admin-mfa-production-rules.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

def save(path,value):Path(path).write_text(json.dumps(value),encoding='utf-8')

class RuleTests(unittest.TestCase):
    def fixture(self,directory):
        d=Path(directory);plan=d/'plan';backup=d/'backup';plan.mkdir();backup.mkdir()
        p=r.policy();entry=json.loads((ROOT/'.github/releases/evidence/20261118-test-admin-mfa-contract.json').read_text())
        names=sorted(set(entry['installedFunctions'])-{'exportNapPublicPage','getNapSwimmerPerformances'})
        selected=sorted(set(entry['allowedFunctions']) & set(names))
        before=(ROOT/'.github/releases/evidence/20261118-admin-mfa-production-before.rules').read_text()
        after=(ROOT/'.github/releases/evidence/20261118-admin-mfa-production-after.rules').read_text()
        observed={'releaseName':r.RELEASE,'rulesetName':'projects/livepalmes/rulesets/fixture-old','sha256':r.digest(before),'updateTime':'initial'}
        c={'candidate':'a'*40,'selected':selected,'rules':{'observedBefore':observed,'beforeSha256':r.digest(before),'afterSha256':r.digest(after)}}
        state={'candidate':c['candidate'],'errors':[],'functions':[{'name':p.PREFIX+n,'state':'ACTIVE','revision':n+'-r1','commit':c['candidate']} for n in names]}
        manifest={'origins':deepcopy(state['functions'])};digest=p.digest(manifest)
        save(backup/'report.json',{'candidate':c['candidate'],'newFunctions':[],'errors':[],'sourcePolicyKind':p.KIND,'standardSourceManifestSha256':digest})
        target=plan/'standard-admin-mfa-ready-hosting';target.mkdir()
        save(target/'prerequisites-hosting.json',{'ready':True,'missingPermissions':[],'planRun':1,'adminMfaRules':{'contractSha256':p.DIGEST,'before':observed}})
        save(d/'after.json',state)
        save(plan/'standard-source-receipts.json',{'candidate':c['candidate'],'manifestSha256':digest,'functions':{f['name']:{'identity':f,'allPathsAndFileBytesIdentical':True,'generationReadAndReferencesRechecked':True} for f in state['functions'] if f['name'].split('/')[-1] in selected}})
        (d/'backup.enc').write_bytes(b'synthetic encrypted artifact; no real archive')
        env={'PREPARATION_RUN':'1','READINESS_RUN':'2','PRODUCTION_AFTER_FILE':str(d/'after.json'),'RULES_BACKUP_VERIFIED':'true','ENCRYPTED_BACKUP_FILE':str(d/'backup.enc')}
        return d,plan,backup,p,c,manifest,before,after,env

    def backup(self,plan,backup,p,c,manifest,before):
        with patch.object(r,'context',return_value=(p,manifest,c,'synthetic-token',r.HOSTING_IDENTITY)),patch.object(r,'sources',return_value=(before,'unused')),patch.object(r,'snapshot',return_value=(c['rules']['observedBefore'],before)):
            r.backup(plan,backup)

    def test_sources_then_compile_then_fresh_rules_patch(self):
        with tempfile.TemporaryDirectory() as directory:
            d,plan,backup,p,c,manifest,before,after,env=self.fixture(directory)
            with patch.dict(os.environ,env):
                self.backup(plan,backup,p,c,manifest,before)
                created='projects/livepalmes/rulesets/fixture-new';published={**c['rules']['observedBefore'],'rulesetName':created,'sha256':r.digest(after),'updateTime':'published'}
                calls=[]
                def api(path,token,method='GET',body=None,**kw):
                    calls.append((method,path,body))
                    if method=='POST':return {'name':created}
                    if method=='GET':return {'source':{'files':[{'name':'firestore.rules','content':after}]}}
                    return {}
                with patch.object(r,'context',return_value=(p,manifest,c,'synthetic-token',r.HOSTING_IDENTITY)),patch.object(r,'sources',return_value=(before,after)),patch.object(r,'snapshot',side_effect=[(c['rules']['observedBefore'],before),(c['rules']['observedBefore'],before),(published,after)]),patch.object(r,'api',side_effect=api):
                    r.publish(plan,backup,d/'receipt.json')
                self.assertEqual([call[0] for call in calls],['POST','GET','PATCH'])
                self.assertEqual(calls[0][2]['source']['files'][0]['content'],after)
                self.assertTrue(json.loads((d/'receipt.json').read_text())['onlyAdminMfaDelta'])

    def test_missing_archives_or_unverified_backup_prevent_any_rule_write(self):
        with tempfile.TemporaryDirectory() as directory:
            d,plan,backup,p,c,manifest,before,after,env=self.fixture(directory)
            with patch.dict(os.environ,env):
                self.backup(plan,backup,p,c,manifest,before)
                context=(p,manifest,c,'synthetic-token',r.HOSTING_IDENTITY)
                path=plan/'standard-source-receipts.json';receipts=json.loads(path.read_text());receipts['functions'].pop(next(iter(receipts['functions'])));save(path,receipts)
                with patch.object(r,'context',return_value=context),patch.object(r,'sources',return_value=(before,after)),patch.object(r,'api') as api,self.assertRaises(ValueError):r.publish(plan,backup,d/'receipt.json')
                api.assert_not_called()
                with patch.dict(os.environ,{'RULES_BACKUP_VERIFIED':'false'}),patch.object(r,'context',return_value=context),patch.object(r,'api') as api,self.assertRaises(ValueError):r.publish(plan,backup,d/'receipt.json')
                api.assert_not_called()

    def test_bad_compilation_or_fresh_drift_prevents_release_patch(self):
        for bad_compilation in [True,False]:
            with tempfile.TemporaryDirectory() as directory:
                d,plan,backup,p,c,manifest,before,after,env=self.fixture(directory)
                with patch.dict(os.environ,env):
                    self.backup(plan,backup,p,c,manifest,before)
                    calls=[]
                    def api(path,token,method='GET',body=None,**kw):
                        calls.append(method)
                        if method=='POST':return {'name':'projects/livepalmes/rulesets/fixture-new'}
                        return {'source':{'files':[{'name':'firestore.rules','content':'altered' if bad_compilation else after}]}}
                    drift={**c['rules']['observedBefore'],'updateTime':'external-change'}
                    with patch.object(r,'context',return_value=(p,manifest,c,'synthetic-token',r.HOSTING_IDENTITY)),patch.object(r,'sources',return_value=(before,after)),patch.object(r,'snapshot',side_effect=[(c['rules']['observedBefore'],before),(drift,before)]),patch.object(r,'api',side_effect=api),self.assertRaises(ValueError):
                        r.publish(plan,backup,d/'receipt.json')
                    self.assertNotIn('PATCH',calls)
                    self.assertEqual(json.loads((d/'receipt.json').read_text())['result'],'failure')

    def test_api_refuses_other_projects_indexes_or_altered_source(self):
        with patch.object(r,'sources',return_value=('before','after')),patch.object(r.urllib.request,'build_opener') as opener:
            for path,method,body in [('projects/livepalmes-test/rulesets','POST',{}),(r.RELEASE,'DELETE',None),('projects/livepalmes/releases/storage.rules','PATCH',{}),('projects/livepalmes/rulesets','POST',{'source':{'files':[{'name':'firestore.rules','content':'before'}]}})]:
                with self.assertRaises(ValueError):r.api(path,'synthetic-token',method,body,write=True)
            opener.assert_not_called()

if __name__=='__main__':unittest.main()
