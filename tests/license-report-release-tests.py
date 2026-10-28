"""Closed licence promotion: scope, exact configuration and read-only drift failures."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from datetime import datetime,timezone,timedelta

ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
p=load('license_policy_test','license-report-release-policy.py')
g=load('license_guard_test','check-license-report-release.py')
s=load('license_state_test','production-release-state.py')
c=load('license_cycle_test','release-cycle.py')

def request():
    v={k:p.contract()[k] for k in ['candidate','productionCommit','productionHosting','testRun']}
    return {**v,'schema':1,'freezeTestCandidate':True,'licenseReportRelease':{'approval':'ok','contractSha256':p.DIGEST}}

def function():
    return {'name':s.PREFIX+p.NAME,'state':'ACTIVE','environment':'GEN_2','labels':{'existing':'retained'},
        'buildConfig':{'runtime':'nodejs22','entryPoint':p.NAME,'environmentVariables':{'UNCHANGED':'value'}},
        'serviceConfig':{'timeoutSeconds':300,'availableMemory':'256Mi','serviceAccountEmail':'runtime@example.invalid',
            'secretEnvironmentVariables':[{'key':k,'secret':k,'projectId':'livepalmes','version':'2'} for k in sorted(p.MAIL_KEYS)]}}

class ClosedLicenceTests(unittest.TestCase):
    def test_closure_promotion_is_independent_and_has_no_storage_transition(self):
        contract=p.contract({'candidate':p.NEXT_CANDIDATE})
        value={k:contract[k] for k in ['candidate','productionCommit','productionHosting','testRun']}
        value.update(schema=1,freezeTestCandidate=True,licenseReportRelease={'approval':'ok','contractSha256':p.NEXT_DIGEST})
        self.assertEqual(p.approved(value),[p.NAME]);p.selection(value,[p.NAME])
        self.assertEqual(len(p.contract()['selected']),12)
        self.assertTrue(contract['noStorageTransition']);self.assertEqual(contract['oldRequestsSettleSeconds'],0)
        self.assertEqual(p.contract()['oldRequestsSettleSeconds'],305)
        with self.assertRaises(ValueError):p.approved({**value,'licenseReportRelease':request()['licenseReportRelease']})
        with self.assertRaises(ValueError):p.approved({**request(),'licenseReportRelease':value['licenseReportRelease']})
        with self.assertRaises(ValueError):p.selection(value,[p.NAME,'sendEngagementPreparedEmails'])
        now=datetime.now(timezone.utc)
        self.assertEqual(g.settle({'candidate':contract['candidate'],'updatedAt':now.isoformat()},now,contract),0)
        patch_body=p.source_patch(function(),{'bucket':'fixture','object':'closure.zip'},value)
        self.assertEqual(patch_body['labels']['livepalmes-commit'],contract['candidate'])
        self.assertNotIn('serviceConfig',patch_body)
    def test_closed_candidate_and_no_other_exception(self):
        self.assertEqual(p.approved({}),[])
        self.assertEqual(p.approved(request()),[p.NAME])
        for k,v in [('candidate','f'*40),('productionCommit','f'*40),('testRun',1),('freezeTestCandidate',False),
                    ('additionalBccFunctions',[p.NAME]),('initialAutomaticMailEnabled',False)]:
            with self.subTest(key=k),self.assertRaises(ValueError):p.approved({**request(),k:v})
        for value in [{}, {'approval':'ok'}, {'approval':'ok','contractSha256':'0'*64}]:
            with self.assertRaises(ValueError):p.approved({**request(),'licenseReportRelease':value})
    def test_exact_selection_not_all_mail_or_missing_ordinary(self):
        selected=p.contract()['selected'];p.selection(request(),selected)
        for wrong in [selected[:-1],selected+['sendEngagementPreparedEmails'],selected+[selected[0]]]:
            with self.assertRaises(ValueError):p.selection(request(),wrong)
        self.assertEqual(c.approved_extra_functions(request()),[p.NAME])
    def test_origin_revision_and_hashes_pinned(self):
        contract=p.contract();functions={p.NAME:{'commit':contract['productionCommit'],'revision':contract['revision']}}
        functions.update({str(n):{} for n in range(112)})
        args=[request(),{'productionRun':contract['productionRun']},{p.NAME:contract['beforeHash']},{p.NAME:contract['afterHash']},functions]
        self.assertTrue(p.verify(*args)['sourceOnly'])
        for i,value in [(1,{'productionRun':1}),(2,{p.NAME:'0'*64}),(3,{p.NAME:'0'*64}),(4,{**functions,p.NAME:{'commit':contract['productionCommit'],'revision':'drift'}})]:
            wrong=copy.deepcopy(args);wrong[i]=value
            with self.assertRaises(ValueError):p.verify(*wrong)
    def test_source_patch_never_changes_runtime_or_selectors(self):
        f=function();original=copy.deepcopy(f);body=p.source_patch(f,{'bucket':'fixture','object':'source.zip'},request())
        self.assertEqual(set(body),{'name','buildConfig','labels'})
        self.assertEqual(set(body['buildConfig']),{'source'})
        self.assertEqual(body['labels'],{**f['labels'],'livepalmes-commit':p.contract()['candidate']})
        self.assertEqual(f,original)
        with self.assertRaises(ValueError):p.source_patch({**f,'name':s.PREFIX+'sendEngagementPreparedEmails'},{},request())
    def test_config_secret_selector_and_trigger_changes_rejected(self):
        before=function();after=copy.deepcopy(before);after['labels']['livepalmes-commit']=p.contract()['candidate']
        p.assert_config(before,after,s)
        for change in ['selector','timeout','memory','trigger','entry']:
            after=copy.deepcopy(before)
            if change=='selector':after['serviceConfig']['secretEnvironmentVariables'][0]['version']='latest'
            if change=='timeout':after['serviceConfig']['timeoutSeconds']=301
            if change=='memory':after['serviceConfig']['availableMemory']='512Mi'
            if change=='trigger':after['eventTrigger']={'eventType':'fixture'}
            if change=='entry':after['buildConfig']['entryPoint']='different'
            with self.subTest(change=change),self.assertRaises(ValueError):p.assert_config(before,after,s)
    def test_source_settle_delay_bounds(self):
        now=datetime(2026,10,27,22,tzinfo=timezone.utc)
        receipt={'candidate':p.contract()['candidate'],'updatedAt':now.isoformat()}
        self.assertEqual(g.settle(receipt,now),305)
        self.assertEqual(g.settle(receipt,now+timedelta(seconds=306)),0)
        for bad in [{'candidate':'f'*40,'updatedAt':now.isoformat()}, {'candidate':p.contract()['candidate'],'updatedAt':(now+timedelta(seconds=61)).isoformat()}]:
            with self.assertRaises(ValueError):g.settle(bad,now)
    def test_guard_pins_whole_mail_and_scheduler_and_never_writes(self):
        mail={'fields':{'enabled':{'booleanValue':True},'scope':{'stringValue':'all'},'revision':{'integerValue':'9'}}}
        scheduler={'schedule':'0 * * * *','timeZone':'Europe/Paris','state':'ENABLED','httpTarget':{'uri':'https://fixture.invalid'}}
        contract={'mailPreservation':{'documentSha256':g.digest(mail),'schedulerSha256':g.digest(scheduler)}}
        g.validate(mail,{**scheduler,'lastAttemptTime':'transient'},contract)
        with self.assertRaises(ValueError):g.validate({**mail,'updateTime':'drift'},scheduler,contract)
        with self.assertRaises(ValueError):g.validate(mail,{**scheduler,'schedule':'*/5 * * * *'},contract)
        with self.assertRaises(ValueError):g.get(g.MAIL+'?write=true','not-a-token')
    def test_guard_after_requires_source_receipt_before_any_cloud_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'request.json').write_text(json.dumps(request()))
            credentials=root/'credentials.json';credentials.write_text('{"project_id":"livepalmes"}')
            with patch.dict('os.environ',{'GOOGLE_APPLICATION_CREDENTIALS':str(credentials)}),patch.object(g,'get',side_effect=AssertionError('no cloud')):
                with self.assertRaisesRegex(ValueError,'publication'):g.main(root,True)
    def test_full_guard_reuses_witness_and_blocks_source_drift_without_api_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'request.json').write_text(json.dumps(request()))
            credentials=root/'credentials.json';credentials.write_text('{"project_id":"livepalmes"}')
            source={'schema':1,'sourceHash':p.contract()['sourceHash'],'count':10,'readOnly':True}
            observed={'mailSha256':'mail','schedulerSha256':'scheduler'}
            with patch.dict('os.environ',{'GOOGLE_APPLICATION_CREDENTIALS':str(credentials)}),patch.object(g,'get',return_value={}) as reads,patch.object(g,'validate',return_value=observed.copy()),patch.object(g.subprocess,'check_output',side_effect=['private-token',json.dumps(source)]):
                g.main(root)
                self.assertEqual(reads.call_args_list[0].args,(g.MAIL,'private-token'))
                self.assertEqual(reads.call_args_list[1].args,(g.SCHEDULER,'private-token'))
            stamp=(datetime.now(timezone.utc)-timedelta(seconds=306)).isoformat()
            (root/'license-report-source-update.json').write_text(json.dumps({'candidate':p.contract()['candidate'],'updatedAt':stamp}))
            with patch.dict('os.environ',{'GOOGLE_APPLICATION_CREDENTIALS':str(credentials)}),patch.object(g,'get',return_value={}),patch.object(g,'validate',return_value=observed.copy()),patch.object(g.subprocess,'check_output',side_effect=['private-token',json.dumps(source)]),patch.object(g.time,'sleep') as delay:
                g.main(root,True);delay.assert_not_called()
            self.assertEqual(json.loads((root/'license-report-after.json').read_text()),json.loads((root/'license-report-before.json').read_text()))
            with patch.dict('os.environ',{'GOOGLE_APPLICATION_CREDENTIALS':str(credentials)}),patch.object(g,'get',return_value={}),patch.object(g,'validate',return_value=observed.copy()),patch.object(g.subprocess,'check_output',side_effect=['private-token',json.dumps({**source,'sourceHash':'0'*64})]):
                with self.assertRaisesRegex(ValueError,'source'):g.main(root,True)

if __name__=='__main__':unittest.main()
