"""Closed B source promotion and explicit rollback guards; fixtures only."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('b_prod_tests',ROOT/'tools/portal-session-enforcement-production-policy.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
def save(path,value):Path(path).write_text(json.dumps(value),encoding='utf-8')

class EnforcementProductionTests(unittest.TestCase):
    def fixture(self):
        c=copy.deepcopy(p.contract());targets=set(c['selected']);names=sorted(targets|{'retained%02d'%i for i in range(17)})
        extra=c['notInstalledChanges'];allnames=names+extra
        base={n:'b'*64 for n in allnames};desired={n:'c'*64 if n in targets or n in extra else 'b'*64 for n in allnames}
        old={**base,'retained00':'d'*64}
        fp=lambda sha:desired if sha==p.CANDIDATE else base
        legacy=lambda sha:desired if sha==p.CANDIDATE else old if sha=='a'*40 else base
        origins=[{'name':p.PREFIX+n,'state':'ACTIVE','revision':n+'-fixture','updateTime':'before','commit':'a'*40} for n in names]
        reviews={'functionReviews':[{'name':'retained00','commit':'a'*40,'revision':'retained00-fixture','legacyChanged':True,
            'legacyBefore':'d'*64,'legacyAfter':'b'*64,'optimizedBefore':'b'*64,'optimizedAfter':'b'*64,
            'normalizedBefore':'e'*64,'normalizedAfter':'e'*64}]}
        rows=[{**f,'shortName':n,'before':'b'*64,'after':desired[n],'legacyBefore':old[n],'legacyAfter':desired[n],
            'changed':n in targets,'legacyChanged':n in targets or n=='retained00',
            'method':'authenticated-inherited-equivalence-unchanged-since-production' if n=='retained00' else
                     'both-comparators-changed' if n in targets else 'both-comparators-unchanged'} for f,n in zip(origins,names)]
        declared=sorted(targets|set(extra));result={'schema':1,'candidate':p.CANDIDATE,'productionRun':c['productionRun'],
            'inventoryCount':119,'selected':sorted(targets),'inheritedNames':['retained00'],'rows':rows,
            'historicalProof':c['historicalProof'],'completeOriginsSha256':p.digest(origins),
            'declaredChanged':declared,'notInstalledChanges':extra}
        c.update(originsSha256=p.digest(origins),selectionProofSha256=p.digest(result),manifestOriginsSha256=p.digest(rows),declaredChanges=declared)
        return c,origins,fp,legacy,reviews,result

    def test_actual_closed_contract_request_and_full_paths(self):
        c=p.contract();request=json.loads((ROOT/'.github/releases/20261117-a34-session-enforcement.json').read_text(encoding='utf-8'))
        self.assertEqual(p.approved(request),c['selected']);self.assertEqual(len(c['selected']),102)
        self.assertTrue(c['productionEnforcement']);self.assertTrue(c['rulesDeployment']);self.assertFalse(c['configurationChanges'])
        cycle=p.common.load('release-cycle.py');paths=cycle.git('diff','--name-only',c['productionCommit'],p.CANDIDATE).splitlines()
        self.assertTrue(cycle.validate_request(request,paths));self.assertEqual(p.approved_rule_paths(request,paths,cycle.git),{'firestore.rules'})
        for key,value in [('candidate','f'*40),('standardSources',{}),('portalSessionPrepareRelease',{}),
                          ('portalSessionEnforcementRelease',{'contractSha256':'0'*64}),('freezeTestCandidate',True)]:
            with self.subTest(key=key),self.assertRaises(ValueError):p.approved({**request,key:value})
        with self.assertRaises(ValueError):p.paths(request,paths+['firebase.json'],cycle.git)
        self.assertEqual(p.approved({}),[])

    def test_all_origins_and_noninstalled_changes_are_qualified(self):
        c,origins,fp,legacy,reviews,result=self.fixture()
        with patch.object(p,'contract',return_value=c):
            self.assertEqual(p.complete_selection(origins,fp,legacy,reviews),result)
            value=p.expected_manifest(result['rows']);p.validate_manifest(value)
            for key,change in [('selected',c['selected'][:-1]),('candidate','f'*40),('bindingChanges',True),
                    ('configurationChanges',True),('newFunctions',['unexpected']),('rulesDeployment',False),('productionEnforcement',False)]:
                with self.subTest(key=key),self.assertRaises(ValueError):p.validate_manifest({**value,key:change})
            with self.assertRaises(ValueError):p.complete_selection(origins[:-1],fp,legacy,reviews)
            bad=copy.deepcopy(reviews);bad['functionReviews'][0]['revision']='changed'
            with self.assertRaises(ValueError):p.complete_selection(origins,fp,legacy,bad)
            bad=copy.deepcopy(reviews);bad['functionReviews'][0]['normalizedAfter']='0'*64
            with self.assertRaises(ValueError):p.complete_selection(origins,fp,legacy,bad)
            changed=lambda sha:{**legacy(sha),'retained01':'c'*64} if sha==p.CANDIDATE else legacy(sha)
            with self.assertRaises(ValueError):p.complete_selection(origins,fp,changed,reviews)

    def reference(self):
        account='fixture@livepalmes.iam.gserviceaccount.com';c=copy.deepcopy(p.contract());c['runtimeBindings']['getCurrentAccessUser']=hashlib.sha256(account.encode()).hexdigest()
        before={'name':p.PREFIX+'getCurrentAccessUser','state':'ACTIVE','environment':'GEN_2','updateTime':'old',
            'buildConfig':{'runtime':'nodejs22','entryPoint':'getCurrentAccessUser','source':{}},
            'serviceConfig':{'serviceAccountEmail':account,'revision':'old','maxInstanceCount':2},'labels':{'existing':'kept'}}
        after=copy.deepcopy(before);after['updateTime']='new';after['serviceConfig']['revision']='new';after['labels']['livepalmes-commit']=p.CANDIDATE
        return c,before,after

    def test_publish_and_rollback_only_change_source_and_labels(self):
        c,before,after=self.reference()
        with patch.object(p,'contract',return_value=c):
            p.assert_selected(before,after,p.CANDIDATE)
            body,mask=p.rollback_patch(before,{'bucket':'fixture','object':'old.zip','generation':'1'})
            self.assertEqual(mask,'build_config.source,labels');self.assertEqual(set(body),{'name','buildConfig','labels'})
            restored=copy.deepcopy(after);restored['labels']=before['labels'];p.assert_rollback(before,restored)
            for change in [lambda f:f['serviceConfig'].update(maxInstanceCount=4),lambda f:f['labels'].update(existing='changed')]:
                bad=copy.deepcopy(after);change(bad)
                with self.assertRaises(ValueError):p.assert_selected(before,bad,p.CANDIDATE)
                with self.assertRaises(ValueError):p.assert_rollback(before,bad)

    def test_same_run_admin_and_runtime_witnesses_are_mandatory(self):
        c=p.contract();value={'selected':c['selected']};runtime={'ready':True,'readOnly':True,'selectedCount':102}
        env={'GITHUB_RUN_ID':'123','GITHUB_SHA':'a'*40,'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main'}
        admin={'run':123,'toolingCommit':'a'*40,'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),
            'capabilitySha256':c['hostingCapabilitySha256'],'ready':True,'readOnly':True,'accountOrRightChanges':0}
        with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,env),patch.object(p,'manifest',return_value=value),\
             patch.object(p,'capabilities',return_value=runtime),patch.object(p.common,'controls',return_value=c['controls']):
            d=Path(tmp)
            with self.assertRaises(ValueError):p.guard(d)
            save(d/'standard-session-enforcement-auth-before.json',admin);p.guard(d)
            with self.assertRaises(ValueError):p.guard(d,True)
            save(d/'standard-session-enforcement-auth-after.json',admin);p.guard(d,True)
            self.assertEqual((d/'standard-session-enforcement-controls-before.json').read_bytes(),(d/'standard-session-enforcement-controls-after.json').read_bytes())
            save(d/'standard-session-enforcement-auth-after.json',{**admin,'run':122})
            with self.assertRaises(ValueError):p.guard(d,True)
            with patch.object(p.common,'controls',return_value={**c['controls'],'mailSha256':'0'*64}):
                with self.assertRaises(ValueError):p.guard(d)
            with self.assertRaises(ValueError):p.restore_witness(d,d)

    def test_capability_proof_change_never_silently_passes(self):
        c=copy.deepcopy(p.contract());proof={'ready':True,'readOnly':True,'runtimeBindingsSha256':'a'*64}
        c['backendCapabilitySha256']=p.digest(proof)
        with patch.object(p,'contract',return_value=c),patch.object(p.common,'load',return_value=SimpleNamespace(qualify=lambda *a,**k:proof)):
            self.assertEqual(p.capabilities('backend'),proof);proof['runtimeBindingsSha256']='b'*64
            with self.assertRaises(ValueError):p.capabilities('backend')

    def test_official_readiness_exact_controller_plan_and_rules(self):
        c=copy.deepcopy(p.contract());value={'selected':c['selected']};head='a'*40;rt={'ready':True,'selectedCount':102};c['backendCapabilitySha256']=p.digest(rt)
        pre={'head_sha':head,'conclusion':'success','run_attempt':1,'path':'.github/workflows/livepalmes-production-preflight.yml'}
        reports={}
        for kind in ['backend','hosting']:
            proof={'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),'selected':c['selected'],'retainedFunctions':17,
                'controls':c['controls'],'runtime':rt,'ready':True,'accountOrRightChanges':0,'capabilitySha256':c['hostingCapabilitySha256']}
            reports[kind]={'planRun':11,'candidate':p.CANDIDATE,'kind':kind,'ready':True,'readOnly':True,'missingPermissions':[],
                'portalSessionEnforcement':proof,'portalSessionEnforcementRules':{'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),
                    'before':c['rules']['observedBefore'],'expectedAfterSha256':c['rules']['afterSha256'],'readOnly':True}}
        def artifact(run,name,destination,workflow):
            self.assertEqual(str(run),'12');kind=name.removeprefix('production-prerequisites-');Path(destination).mkdir(exist_ok=True)
            save(Path(destination)/('prerequisites-'+kind+'.json'),reports[kind]);return {'head_sha':head}
        cycle=SimpleNamespace(gh=lambda endpoint:pre,artifact=artifact,read=lambda path:json.loads(Path(path).read_text()))
        with tempfile.TemporaryDirectory() as tmp,patch.object(p,'contract',return_value=c),patch.object(p,'manifest',return_value=value),\
             patch.object(p.common,'load',return_value=cycle),patch.dict(os.environ,{'GITHUB_SHA':head,'GITHUB_REPOSITORY':'ffessmnap/LivePalmes'}):
            p.readiness(tmp,'11','12');pre['head_sha']='b'*40
            with self.assertRaises(ValueError):p.readiness(tmp,'11','12')
            pre['head_sha']=head;reports['hosting']['portalSessionEnforcementRules']['expectedAfterSha256']='0'*64
            with self.assertRaises(ValueError):p.readiness(tmp,'11','12')
            with self.assertRaises(ValueError):p.readiness(tmp,'11','0')

    def test_rollback_rejects_code_only_before_cloud_changes(self):
        c,before,after=self.reference();c['selected']=['getCurrentAccessUser'];value={'selected':c['selected']}
        originals=[before]+[{'name':p.PREFIX+'fixture%03d'%i,'state':'ACTIVE','environment':'GEN_2','updateTime':'old',
            'buildConfig':{},'serviceConfig':{'revision':'old'},'labels':{}} for i in range(118)]
        current=[after]+copy.deepcopy(originals[1:]);identity=lambda f:{k:f[k] for k in ['name','state','updateTime']}|{'revision':f['serviceConfig']['revision']}
        post={'candidate':p.CANDIDATE,'errors':[],'functions':[identity(f) for f in current]}
        report={'candidate':p.CANDIDATE,'sourcePolicyKind':p.KIND,'standardSourceManifestSha256':p.digest(value),'newFunctions':[],
            'functions':[{'name':before['name']}]}
        with tempfile.TemporaryDirectory() as tmp,patch.object(p,'contract',return_value=c),patch.object(p,'validate_manifest',return_value=value),\
             patch.object(p,'capabilities',return_value={'ready':True}),patch.object(p.common,'controls',return_value=c['controls']):
            d=Path(tmp);save(d/'standard-source-manifest.json',value);save(d/'report.json',report);save(d/'functions.json',originals)
            p.rollback_guard(d,post,current,SimpleNamespace(identity=identity),False)
            with self.assertRaises(ValueError):p.rollback_guard(d,post,current,SimpleNamespace(identity=identity),True)
            bad=copy.deepcopy(current);bad[-1]['updateTime']='drift'
            with self.assertRaises(ValueError):p.rollback_guard(d,post,bad,SimpleNamespace(identity=identity),False)

    def test_workflow_order_and_real_rollback_output(self):
        text=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text(encoding='utf-8')
        self.assertLess(text.index('portal-session-enforcement-production-policy.py auth-before'),text.index('Sauvegarder le code PROD avant publication'))
        self.assertLess(text.index('Sauvegarder les seules regles PROD initiales de B'),text.index('Chiffrer puis tester la sauvegarde'))
        self.assertLess(text.index('Chiffrer puis tester la sauvegarde'),text.index('id: functions'))
        self.assertLess(text.index('id: functions'),text.index('id: session_enforcement_rules'))
        self.assertLess(text.index('id: session_enforcement_rules'),text.index('id: hosting'))
        self.assertIn('B_RULES_FINAL',text)
        rollback=(ROOT/'.github/workflows/livepalmes-production-rollback.yml').read_text(encoding='utf-8')
        self.assertLess(rollback.index('rollback-validate'),rollback.index('name: Retablir Hosting'))
        self.assertLess(rollback.index('Retablir les Functions'),rollback.index('rollback-restore'))
        script=rollback.split("python - <<'PYCODE'",1)[1].split('        PYCODE',1)[0]
        script='\n'.join(line[8:] if line.startswith('        ') else line for line in script.splitlines())
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp);(d/'prod-backup').mkdir();save(d/'prod-backup/report.json',{'sourcePolicyKind':p.KIND})
            with patch.dict(os.environ,{'RUNNER_TEMP':tmp,'B_RESTORE_HOSTING':'true','GITHUB_OUTPUT':str(d/'out')}):exec(compile(script,'workflow','exec'),{})
            self.assertEqual((d/'out').read_text(),'portal_session_enforcement=true\n')

if __name__=='__main__':unittest.main()
