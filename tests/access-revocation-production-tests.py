"""Closed A3.3 policy and read-only prerequisite failures, all services fictitious."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.error
import tempfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('a33_test_policy',ROOT/'tools/access-revocation-production-policy.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class ClosedPolicyTests(unittest.TestCase):
    def request(self): return {**copy.deepcopy(m.contract()['request']),m.OPTION:{'contractSha256':m.DIGEST}}
    def test_exact_candidate_and_all_consumers(self):
        self.assertEqual(len(m.approved(self.request())),107)
        for key,value in [('candidate','a'*40),('testRun',1),('freezeTestCandidate',True),('publicAccessRelease',{})]:
            request=self.request();request[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):m.approved(request)
        with patch.object(m,'DIGEST','0'*64),self.assertRaises(ValueError):m.contract()

    def test_manifest_refuses_configuration_and_selection_edits(self):
        # The origin seal is independently checked before any expected manifest exists.
        with self.assertRaises(ValueError):m.expected_manifest([])
        c=m.contract();origins=[{'name':str(i)} for i in range(119)]
        with patch.object(m,'contract',return_value={**c,'originsSha256':m.digest(origins)}):
            value=m.expected_manifest(origins)
            for key,other in [('selected',value['selected'][:-1]),('configurationChanges',True),
                              ('bindingChanges',True),('newFunctions',['unplanned']),('businessInvocations',1)]:
                altered=copy.deepcopy(value);altered[key]=other
                with self.subTest(key=key),self.assertRaises(ValueError):m.validate_manifest(altered)

    def test_calculated_selection_cannot_be_reduced_or_extended(self):
        c=m.contract();origins=[{'name':str(i)} for i in range(119)]
        c={**c,'originsSha256':m.digest(origins),'changedPathsSha256':m.digest([]),'protectedBlobs':{}}
        request=self.request();baseline={'productionRun':c['productionRun'],'productionCommit':c['productionCommit'],
                                        'source':'verified-publication-artifacts'}
        with patch.object(m,'contract',return_value=c),patch.object(m,'_proof',return_value={'selected':c['selected']}):
            for selected in [c['selected'][:-1],c['selected']+['unplanned']]:
                with self.subTest(count=len(selected)),self.assertRaises(ValueError):
                    m.freeze(request,baseline,{f['name']:f for f in origins},selected,None,None,None,[])

    def function(self):
        name=m.contract()['selected'][0]
        return {'name':m.PREFIX+name,'state':'ACTIVE','environment':'GEN_2','updateTime':'old',
            'buildConfig':{'runtime':'nodejs22','entryPoint':name,'source':{'storageSource':{'object':'old'}}},
            'serviceConfig':{'serviceAccountEmail':'existing@livepalmes.iam.gserviceaccount.com','revision':'old',
                'maxInstanceCount':20,'maxInstanceRequestConcurrency':80,
                'secretEnvironmentVariables':[{'key':'EXISTING','secret':'EXISTING','version':'1'}]},
            'labels':{'livepalmes-commit':'b'*40,'existing':'unchanged'}}

    def test_sources_and_labels_preserve_every_configuration(self):
        before=self.function();after=copy.deepcopy(before)
        after['serviceConfig']['revision']='new';after['updateTime']='new'
        after['labels']['livepalmes-commit']=m.CANDIDATE
        after['buildConfig']['source']={'storageSource':{'object':'new'}}
        c={**m.contract(),'runtimeAccountSha256':hashlib.sha256(before['serviceConfig']['serviceAccountEmail'].encode()).hexdigest()}
        with patch.object(m,'contract',return_value=c):
            m.assert_selected(before,after,m.CANDIDATE)
            for part,key,value in [('serviceConfig','maxInstanceCount',2),('serviceConfig','serviceAccountEmail','other@example.com'),
                    ('serviceConfig','secretEnvironmentVariables',[]),('buildConfig','runtime','nodejs24')]:
                changed=copy.deepcopy(after);changed[part][key]=value
                with self.subTest(key=key),self.assertRaises(ValueError):m.assert_selected(before,changed,m.CANDIDATE)
            altered=copy.deepcopy(after);altered['labels']['new']='forbidden'
            with self.assertRaises(ValueError):m.assert_selected(before,altered,m.CANDIDATE)


class PrerequisiteTests(unittest.TestCase):
    account='existing@livepalmes.iam.gserviceaccount.com'
    def profile(self,uid):
        return {'document':{'name':'projects/livepalmes/databases/(default)/documents/users/'+uid,
            'fields':{'status':{'stringValue':'active'},'capabilities':{'mapValue':{'fields':{'admin.full':{'booleanValue':True}}}}}}}
    def setUp(self):
        self.profiles=[self.profile('admin-one'),self.profile('admin-two')]
        self.auth=[{'localId':'admin-one','disabled':False},{'localId':'admin-two','disabled':True}]
        self.roles=[{'role':'roles/datastore.user','members':['serviceAccount:'+self.account]}]
        self.permissions=['datastore.entities.get']
        self.calls=[];self.fail=None
        c={**m.contract(),'runtimeAccountSha256':hashlib.sha256(self.account.encode()).hexdigest()}
        self.patcher=patch.object(m,'contract',return_value=c);self.patcher.start();self.addCleanup(self.patcher.stop)
    def read(self,url,body=None):
        self.calls.append((url,body))
        if self.fail==url:raise urllib.error.HTTPError(url,403,'Forbidden',{},None)
        if url==m.FIRESTORE+':runQuery':
            self.assertEqual(body['structuredQuery']['limit'],2)
            self.assertEqual(body['structuredQuery']['select']['fields'][1]['fieldPath'],'capabilities.`admin.full`')
            return self.profiles
        if url.startswith(m.FIRESTORE+'/users/'):
            raise urllib.error.HTTPError(url,404,'Not found',{},None)
        if url==m.AUTH:
            self.assertEqual(set(body),{'localId'});self.assertLessEqual(len(body['localId']),3)
            return {'users':self.auth}
        if url==m.IAM:return {'bindings':self.roles}
        if url.startswith('https://iam.googleapis.com/v1/roles/'):return {'includedPermissions':self.permissions}
        raise AssertionError('Unplanned endpoint')
    def run_check(self):return m.prerequisites(self.account,['legacy-transition'],self.read)
    def test_continuity_and_existing_runtime_permission_without_account_effects(self):
        value=self.run_check()
        self.assertTrue(value['ready']);self.assertEqual(value['enabledAdministrativeAuthAccounts'],1)
        self.assertFalse(value['legacyProfileFound']);self.assertEqual(value['accountOrRightChanges'],0)
        self.assertEqual(len(self.calls),5)
        self.assertNotIn('admin-one',json.dumps(value))
    def test_auth_permission_failure_stops_without_fallback(self):
        self.fail=m.AUTH
        with self.assertRaises(urllib.error.HTTPError) as failure:self.run_check()
        self.assertEqual(failure.exception.a33_stage,'auth-lookup')
        self.assertEqual(sum(url==m.AUTH for url,_ in self.calls),1)
        self.assertFalse(any(url==m.IAM for url,_ in self.calls))
    def test_disabled_or_missing_accounts_cannot_prove_continuity(self):
        for value in [[],[{'localId':'admin-one','disabled':True}]]:
            self.auth=value
            with self.subTest(value=value),self.assertRaises(ValueError):self.run_check()
    def test_profile_absent_inactive_extra_or_duplicate_refuses(self):
        for profiles in [[],[{}],[self.profile('admin-one')]*2,[self.profile('admin-one')]*3]:
            self.profiles=profiles
            with self.subTest(profiles=len(profiles)),self.assertRaises(ValueError):self.run_check()
    def test_auth_results_outside_requested_uids_refuse(self):
        self.auth=[{'localId':'not-requested','disabled':False}]
        with self.assertRaises(ValueError):self.run_check()
    def test_missing_or_conditional_runtime_permission_is_not_assumed(self):
        for roles,permissions in [([],['datastore.entities.get']),
                ([{**self.roles[0],'condition':{'expression':'true'}}],['datastore.entities.get']),
                (self.roles,[])]:
            self.roles,self.permissions=roles,permissions
            with self.subTest(roles=roles),self.assertRaises(ValueError):self.run_check()
    def test_runtime_identity_and_legacy_lookup_budget_are_closed(self):
        with self.assertRaises(ValueError):m.prerequisites('other@livepalmes.iam.gserviceaccount.com',[],self.read)
        with self.assertRaises(ValueError):m.prerequisites(self.account,['one','two'],self.read)
        self.assertEqual(self.calls,[])
    def test_failed_guard_keeps_a_readonly_blocking_diagnostic(self):
        error=urllib.error.HTTPError(m.AUTH,403,'Forbidden',{},None);error.a33_stage='auth-lookup'
        with tempfile.TemporaryDirectory() as target:
            with patch.object(m,'manifest',return_value={'controls':{'same':'witness'}}), \
                 patch.object(m.common,'controls',return_value={'same':'witness'}), \
                 patch.object(m,'_live_prerequisites',side_effect=error):
                with self.assertRaises(urllib.error.HTTPError):m.guard(target)
            result=json.loads((Path(target)/'standard-access-revocation-prerequisites-before.json').read_text())
            self.assertEqual(result['stage'],'auth-lookup');self.assertFalse(result['ready'])
            self.assertTrue(result['readOnly']);self.assertEqual(result['httpStatus'],403)


if __name__=='__main__':unittest.main()
