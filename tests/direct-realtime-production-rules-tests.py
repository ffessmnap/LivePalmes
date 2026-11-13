"""Offline negative checks for the sole closed production signal rules addition."""
from copy import deepcopy
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock
import urllib.error

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('closed_rules_tests',ROOT/'tools/direct-realtime-production-rules.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
parent=m.load_policy();c=parent.contract();before,after,block=m.sources(c)
BASE={'releaseName':m.RELEASE,'rulesetName':'projects/livepalmes/rulesets/before',
      'sha256':c['rules']['beforeSha256'],'updateTime':'2026-11-01T01:00:00Z'}
AFTER={**BASE,'rulesetName':'projects/livepalmes/rulesets/new','sha256':c['rules']['afterSha256'],
       'updateTime':'2026-11-13T12:00:00Z'}

def request():
    return {'schema':1,**{k:c[k] for k in ['candidate','productionCommit','productionHosting','testRun']},
            parent.OPTION:{'contractSha256':parent.DIGEST}}

def environment():
    return {'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main',
      'GITHUB_RUN_ATTEMPT':'1','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main',
      'GITHUB_SHA':'a'*40,'PREPARATION_RUN':'123'}

def fixture(root):
    plan,backup=root/'plan',root/'backup';plan.mkdir();backup.mkdir()
    (plan/'request.json').write_text(json.dumps(request()))
    witness={'schema':1,'candidate':c['candidate'],'identitySha256':'a'*64,'before':BASE,
             'afterSha256':c['rules']['afterSha256'],'readinessRun':456}
    rules=backup/'direct-realtime-rules';rules.mkdir()
    (rules/'before.json').write_text(json.dumps(witness));(rules/'before.rules').write_text(before,encoding='utf-8',newline='\n')
    (plan/'direct-realtime-rules-before.json').write_text(json.dumps(witness))
    encrypted=root/'backup.enc';encrypted.write_bytes(b'encrypted-offline-fixture')
    return plan,backup,root/'receipt.json',encrypted

class ClosedRulesTests(unittest.TestCase):
    def test_exact_derivation_preserves_all_other_production_rules(self):
        result=m.validate_contract(c)
        self.assertEqual(len(block.splitlines()),10)
        self.assertEqual(after.replace(block,'',1),before)
        self.assertTrue(result['allOtherRulesUnchanged']);self.assertFalse(result['testSessionRestrictionPublished'])
        cycle=parent.load('rules_test_git','release-cycle.py');m.validate_contract(c,cycle.git)
        for field,value in [('project','livepalmes-test'),('addedLines',11),('testAfterSha256','a'*64),('beforeFile','firestore.rules')]:
            other=deepcopy(c);other['rules'][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):m.validate_contract(other)

    def test_only_owned_rule_api_paths_exact_source_and_release_patch(self):
        allowed=[(m.RELEASE,'GET',None,False),('projects/livepalmes/rulesets/a','GET',None,False),
          ('projects/718081132564/rulesets/a','GET',None,False),
          ('projects/livepalmes/rulesets','POST',{'source':{'files':[{'name':'firestore.rules','content':after}]}},True),
          (m.RELEASE,'PATCH',{'release':{'name':m.RELEASE,'rulesetName':AFTER['rulesetName']}},True)]
        for path,method,body,write in allowed:
            opener=MagicMock();opener.open.return_value.__enter__.return_value=io.BytesIO(b'{}')
            with patch.object(m.urllib.request,'build_opener',return_value=opener):
                self.assertEqual(m.api(path,'offline-token',method,body,write=write,c=c),{})
            sent=opener.open.call_args.args[0]
            self.assertEqual(sent.full_url,m.BASE+path);self.assertEqual(sent.method,method)
            if body is not None:self.assertEqual(json.loads(sent.data),body)
        denied=[('projects/other/rulesets/a','GET',None,False),
          ('projects/livepalmes/databases/(default)/documents','GET',None,False),
          ('projects/livepalmes/releases/other','PATCH',{'release':{'name':m.RELEASE,'rulesetName':AFTER['rulesetName']}},True),
          (m.RELEASE,'DELETE',None,True),(m.RELEASE,'POST',{},True),
          (m.RELEASE,'PATCH',{'release':{'name':m.RELEASE,'rulesetName':'projects/other/rulesets/a'}},True),
          (m.RELEASE,'PATCH',{'release':{'name':m.RELEASE,'rulesetName':AFTER['rulesetName']},'other':True},True),
          ('projects/livepalmes/rulesets','POST',{'source':{'files':[{'name':'firestore.rules','content':before}]}},True),
          ('projects/livepalmes/rulesets','POST',{'source':{'files':[{'name':'other','content':after}]}},True)]
        for path,method,body,write in denied:
            with self.subTest(path=path,method=method),patch.object(m.urllib.request,'build_opener') as network:
                with self.assertRaises(ValueError):m.api(path,'offline-token',method,body,write=write,c=c)
                network.assert_not_called()

    def test_permission_refusal_is_sanitized_not_retried_or_fallback(self):
        opener=MagicMock();opener.open.side_effect=urllib.error.HTTPError(m.BASE+m.RELEASE,403,'sensitive',{},None)
        with patch.object(m.urllib.request,'build_opener',return_value=opener):
            with self.assertRaisesRegex(ValueError,'HTTP 403'):m.api(m.RELEASE,'offline-token')
        self.assertEqual(opener.open.call_count,1)
        with self.assertRaises(ValueError):m.NoRedirect().redirect_request(None,None,None,None,None,None)

    def test_test_artifacts_are_both_immutable_authenticated_and_cover_the_mobile_candidate(self):
        signal={'schema':1,'project':'livepalmes-test','candidate':'ada6005cd5bbb62637f8b5a1fdc2c509fb9247d8',
          'approval':'20261113-direct-private-realtime-test','before':{'sha256':c['rules']['testBeforeSha256']},
          'after':{'sha256':c['rules']['testAfterSha256'],'release':'projects/livepalmes-test/rulesets/confirmed'},
          'deployed':True,'indexesDeployed':False,'productionTouched':False,'businessInvocations':0}
        mobile={**signal,'candidate':c['candidate'],'readOnly':True,'deployed':False}
        metadata={c['rules']['testSignalsArtifact']:{'id':c['rules']['testSignalsArtifact'],'name':'direct-realtime-rules-proof',
            'workflow_run':{'id':c['rules']['testSignalsRun']},'digest':'sha256:'+c['rules']['testSignalsArtifactSha256'],'expired':False},
          c['rules']['testReadonlyArtifact']:{'id':c['rules']['testReadonlyArtifact'],'name':'portal-session-rules-proof',
            'workflow_run':{'id':c['testRun']},'digest':'sha256:'+c['rules']['testReadonlyArtifactSha256'],'expired':False}}
        for mutation in [None,'digest','head','rules','business','deployed']:
            first,second=deepcopy(signal),deepcopy(mobile);meta=deepcopy(metadata);head=c['candidate']
            if mutation=='digest':meta[c['rules']['testReadonlyArtifact']]['digest']='sha256:'+'0'*64
            if mutation=='head':head='b'*40
            if mutation=='rules':second['after']['sha256']='0'*64
            if mutation=='business':second['businessInvocations']=1
            if mutation=='deployed':second['deployed']=True
            cycle=SimpleNamespace(artifact=MagicMock(side_effect=[{'head_sha':signal['candidate']},{'head_sha':head}]),
                gh=lambda url:meta[int(url.split('/')[-1])],
                read=lambda p:first if p.name=='test-direct-realtime-rules-proof.json' else second)
            with tempfile.TemporaryDirectory() as directory:
                if mutation:
                    with self.subTest(mutation=mutation),self.assertRaises(ValueError):m.verify_test_evidence(directory,cycle)
                else:
                    report=m.verify_test_evidence(directory,cycle);self.assertEqual(report['result'],'success')
                    self.assertEqual(cycle.artifact.call_count,2)

    def test_only_main_attempt_one_official_service_account_context(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'request.json').write_text(json.dumps(request()))
            credentials=root/'creds';account={'type':'service_account','project_id':'livepalmes','client_email':'existing@livepalmes.iam.gserviceaccount.com'}
            credentials.write_text(json.dumps(account));env={**environment(),'GOOGLE_APPLICATION_CREDENTIALS':str(credentials)}
            with patch.dict(os.environ,env),patch.object(m.subprocess,'check_output',return_value='offline-token'):
                self.assertEqual(m.context(root,'backup')[0],c)
            for key,value in [('GITHUB_REF','refs/heads/other'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_REPOSITORY','other/repo'),
                              ('GITHUB_WORKFLOW_REF','ffessmnap/LivePalmes/.github/workflows/other.yml@refs/heads/main')]:
                with self.subTest(key=key),patch.dict(os.environ,{**env,key:value}),patch.object(m.subprocess,'check_output') as command:
                    with self.assertRaises(ValueError):m.context(root,'backup')
                    command.assert_not_called()
            for key,value in [('type','authorized_user'),('project_id','livepalmes-test'),('client_email','other@other.iam.gserviceaccount.com')]:
                credentials.write_text(json.dumps({**account,key:value}))
                with self.subTest(key=key),patch.dict(os.environ,env),patch.object(m.subprocess,'check_output') as command:
                    with self.assertRaises(ValueError):m.context(root,'backup')
                    command.assert_not_called()

    def test_live_snapshot_rejects_other_project_extra_files_or_unknown_source(self):
        release={'name':m.RELEASE,'rulesetName':BASE['rulesetName'],'updateTime':BASE['updateTime']}
        source={'source':{'files':[{'name':'firestore.rules','content':before}]}}
        with patch.object(m,'api',side_effect=[release,source]):self.assertEqual(m.snapshot('offline'),(BASE,before))
        for value in [{**release,'rulesetName':'projects/other/rulesets/a'},{**release,'name':'projects/livepalmes/releases/other'}]:
            with patch.object(m,'api',return_value=value),self.assertRaises(ValueError):m.snapshot('offline')
        for files in [[],[{'name':'other','content':before}],source['source']['files']*2]:
            with patch.object(m,'api',side_effect=[release,{'source':{'files':files}}]),self.assertRaises(ValueError):m.snapshot('offline')

    def test_readiness_is_read_only_and_refuses_actual_baseline_drift(self):
        with patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'snapshot',return_value=(BASE,before)):
            report=m.readiness('unused');self.assertTrue(report['readOnly']);self.assertEqual(report['before'],BASE)
        with patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'snapshot',return_value=({**BASE,'sha256':'b'*64},before)):
            with self.assertRaisesRegex(ValueError,'Base reelle'):m.readiness('unused')

    def test_backup_requires_authenticated_ready_exact_plan_tooling_identity_and_snapshot(self):
        proof={'ready':True,'missingPermissions':[],'readOnly':True,'planRun':123,'candidate':c['candidate'],
               'directRealtimeRules':{'identitySha256':'a'*64,'expectedAfterSha256':c['rules']['afterSha256'],'before':BASE}}
        for mutation in [None,'head','plan','identity','drift','permission']:
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory);plan=root/'plan';backup=root/'backup';plan.mkdir();backup.mkdir()
                (backup/'report.json').write_text(json.dumps({'candidate':c['candidate'],'additionalDirectRealtimeFunctions':c['selected'],'newFunctions':[]}))
                value=deepcopy(proof);head='a'*40;observed=BASE
                if mutation=='head':head='b'*40
                if mutation=='plan':value['planRun']=124
                if mutation=='identity':value['directRealtimeRules']['identitySha256']='b'*64
                if mutation=='drift':observed={**BASE,'rulesetName':'projects/livepalmes/rulesets/drift'}
                if mutation=='permission':value['missingPermissions']=['firebaserules.releases.update']
                cycle=SimpleNamespace(artifact=MagicMock(return_value={'head_sha':head}),read=lambda p:json.loads(p.read_text()) if p.name=='report.json' else value)
                with patch.dict(os.environ,environment()),patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'snapshot',return_value=(observed,before)):
                    if mutation:
                        with self.assertRaises(ValueError):m.backup(plan,backup,'456',cycle)
                        self.assertFalse((backup/'direct-realtime-rules').exists())
                    else:
                        m.backup(plan,backup,'456',cycle)
                        self.assertEqual((backup/'direct-realtime-rules/before.rules').read_text(encoding='utf-8'),before)
                        self.assertEqual(json.loads((plan/'direct-realtime-rules-before.json').read_text())['before'],BASE)

    def test_publish_exact_rules_only_after_verified_backup_and_fresh_drift_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            plan,backup,receipt,encrypted=fixture(Path(directory));calls=[]
            def api(path,token,method='GET',body=None,**kw):
                calls.append((path,method,body))
                if method=='POST':return {'name':AFTER['rulesetName']}
                if method=='GET':return {'source':{'files':[{'name':'firestore.rules','content':after}]}}
                if method=='PATCH':return {}
                self.fail('Unexpected method')
            with patch.dict(os.environ,{'RULES_BACKUP_VERIFIED':'true','ENCRYPTED_BACKUP_FILE':str(encrypted)}),patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'snapshot',side_effect=[(BASE,before),(BASE,before),(AFTER,after)]),patch.object(m,'api',side_effect=api):
                m.publish(plan,backup,receipt)
            self.assertEqual([row[1] for row in calls],['POST','GET','PATCH'])
            self.assertEqual(calls[-1][2],{'release':{'name':m.RELEASE,'rulesetName':AFTER['rulesetName']}})
            result=json.loads(receipt.read_text());self.assertEqual(result['result'],'success');self.assertFalse(result['testSessionRestrictionPublished'])
            with patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'snapshot',return_value=(AFTER,after)):
                m.final(plan,Path(directory)/'final.json')
            for verified in ['false','']:
                with patch.dict(os.environ,{'RULES_BACKUP_VERIFIED':verified}),patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'api') as api:
                    with self.assertRaises(ValueError):m.publish(plan,backup,receipt)
                    api.assert_not_called()

    def test_drift_or_permission_failure_stops_without_patch_retry_or_rollback(self):
        for stage in ['before','between','patch','after']:
            with tempfile.TemporaryDirectory() as directory:
                plan,backup,receipt,encrypted=fixture(Path(directory));calls=[];drift={**BASE,'rulesetName':'projects/livepalmes/rulesets/drift'}
                snapshots=[(drift,before)] if stage=='before' else [(BASE,before),(drift if stage=='between' else BASE,before),(BASE,before)]
                def api(path,token,method='GET',body=None,**kw):
                    calls.append(method)
                    if method=='POST':return {'name':AFTER['rulesetName']}
                    if method=='GET':return {'source':{'files':[{'name':'firestore.rules','content':after}]}}
                    if method=='PATCH' and stage=='patch':raise ValueError('HTTP 403')
                    return {}
                with patch.dict(os.environ,{'RULES_BACKUP_VERIFIED':'true','ENCRYPTED_BACKUP_FILE':str(encrypted)}),patch.object(m,'context',return_value=(c,'offline','a'*64)),patch.object(m,'snapshot',side_effect=snapshots),patch.object(m,'api',side_effect=api):
                    with self.assertRaises(ValueError):m.publish(plan,backup,receipt)
                self.assertEqual(calls.count('PATCH'),0 if stage in ['before','between'] else 1)
                if receipt.exists():self.assertEqual(json.loads(receipt.read_text())['result'],'failure')
                self.assertFalse((plan/'direct-realtime-rules-published.json').exists())

    def test_official_workflow_orders_full_backup_before_any_publication(self):
        text=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text(encoding='utf-8')
        names=['Sauvegarder le code PROD','Sauvegarder les seules regles privees Direct','Chiffrer puis tester la sauvegarde',
               'production-backup-crypto.js open','diff -qr','Publier les Functions par petits lots',
               'Publier le seul ajout prive Direct','Publier Hosting apres les controles','Confirmer les seules regles privees Direct apres Hosting']
        positions=[text.index(name) for name in names];self.assertEqual(positions,sorted(positions))
        self.assertIn('steps.encrypted_backup.outcome',text);self.assertIn('--only hosting',text)
        self.assertNotIn('--only firestore',text);self.assertIn('production-direct-realtime-rules',text)
        prerequisites=(ROOT/'tools/check-release-prerequisites.py').read_text()
        self.assertIn('expected += rules.PERMISSIONS',prerequisites)
        self.assertLess(prerequisites.index("cycle.require(not report['missingPermissions']"),prerequisites.index("report['directRealtimeRules'] = rules.readiness"))

if __name__=='__main__':unittest.main()
