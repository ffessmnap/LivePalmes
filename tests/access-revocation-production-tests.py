"""Closed A3.3 policy and read-only prerequisite failures, all services fictitious."""
import copy
import hashlib
import io
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.error
import urllib.parse
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

    def test_other_tooling_environment_stops_before_reading_account_ids(self):
        with patch.object(m.subprocess,'check_output',return_value='another-blob\n') as run:
            with self.assertRaises(ValueError):m._legacy_uids()
            self.assertEqual(run.call_count,1)

    def test_auth_projection_is_encoded_and_only_requests_id_and_status(self):
        query=urllib.parse.parse_qs(urllib.parse.urlsplit(m.AUTH).query)
        self.assertEqual(query,{'fields':['users/localId,users/disabled']})

    def test_existing_reader_discovery_never_reads_accounts_or_grants_roles(self):
        calls=[]
        def read(url,body):
            calls.append((url,body));return {'permissions':['firebaseauth.users.get']}
        result=m.discover_reader(m.CANDIDATE,read)
        self.assertEqual(result['accountReads'],0);self.assertEqual(result['iamWrites'],0)
        self.assertFalse(result['publicationAllowed']);self.assertEqual(result['grantedPermissions'],['firebaseauth.users.get'])
        self.assertEqual(calls,[('https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions',{'permissions':m.READER_PERMISSIONS})])

    def test_reader_discovery_refuses_another_candidate_or_unknown_permissions(self):
        with self.assertRaises(ValueError):m.discover_reader('a'*40,lambda *_:self.fail('No remote read expected'))
        with self.assertRaises(ValueError):m.discover_reader(m.CANDIDATE,lambda *_:{'permissions':['unplanned.write']})

    def test_api_error_diagnostic_redacts_token_ids_and_identity(self):
        uid='private-target-user';token='fictitious-oauth-token'
        body={'error':{'status':'INVALID_ARGUMENT','message':f'INSUFFICIENT_PERMISSION; invalid field: localId {uid}, {token}, person@example.test'}}
        error=urllib.error.HTTPError(m.AUTH,400,'Bad request',{},io.BytesIO(json.dumps(body).encode()))
        with patch.object(m.subprocess,'check_output',return_value=token), \
             patch.object(m.urllib.request,'urlopen',side_effect=error) as send:
            with self.assertRaises(urllib.error.HTTPError) as raised:m._read(m.AUTH,{'localId':[uid]})
        detail=raised.exception.a33_google_error
        self.assertEqual(detail['status'],'INVALID_ARGUMENT')
        self.assertIn('INSUFFICIENT_PERMISSION',detail['message'])
        self.assertNotIn(uid,json.dumps(detail));self.assertNotIn(token,json.dumps(detail));self.assertNotIn('person@example.test',json.dumps(detail))
        self.assertEqual(send.call_count,1)

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
    def run_check(self):
        return {**m.administrative_prerequisites(['legacy-transition'],self.read),
                **m.runtime_prerequisites(self.account,self.read)}
    def test_hosting_auth_and_backend_runtime_use_disjoint_read_paths(self):
        m.administrative_prerequisites(['legacy-transition'],self.read)
        self.assertFalse(any(url==m.IAM or url.startswith('https://iam.googleapis.com/') for url,_ in self.calls))
        self.calls=[]
        m.runtime_prerequisites(self.account,self.read)
        self.assertEqual(len(self.calls),2)
        self.assertFalse(any(url==m.AUTH or url.startswith(m.FIRESTORE) for url,_ in self.calls))
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
        with self.assertRaises(ValueError):m.runtime_prerequisites('other@livepalmes.iam.gserviceaccount.com',self.read)
        with self.assertRaises(ValueError):m.administrative_prerequisites(['one','two'],self.read)
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



class ReaderReceiptTests(unittest.TestCase):
    def setUp(self):
        self.context={'candidate':m.CANDIDATE,'contractSha256':m.DIGEST,'readerContractSha256':m.READER_DIGEST,
            'manifestSha256':'a'*64,'run':123,'attempt':1,'toolingCommit':'b'*40,
            'workflowRef':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'}
        self.result={'readOnly':True,'ready':True,'profileLimit':2,'authLookupLimit':3,
            'activeAdministrativeProfiles':2,'enabledAdministrativeAuthAccounts':1,
            'legacyProfileFound':False,'legacyAuthFound':False,'legacyProfileBypassRemoved':True,
            'accountOrRightChanges':0,'businessInvocations':0}

    def test_reader_seal_and_existing_identity_are_required(self):
        self.assertEqual(m.readers()['candidate'],m.CANDIDATE)
        with patch.object(m,'READER_DIGEST','0'*64),self.assertRaises(ValueError):m.readers()
        with tempfile.TemporaryDirectory() as target:
            p=Path(target)/'credential.json'
            p.write_text(json.dumps({'type':'service_account','project_id':'livepalmes','client_email':'fictitious@example.test'}))
            with patch.dict(m.os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(p)}),self.assertRaises(ValueError):
                m.reader_identity('hosting')

    def test_receipt_is_same_run_fresh_bounded_and_contains_no_account_ids(self):
        with tempfile.TemporaryDirectory() as target,patch.object(m,'reader_context',return_value=self.context), \
                patch.object(m,'reader_identity',return_value=m.readers()['identities']['hosting']), \
                patch.object(m,'_legacy_uids',return_value=['private-transition']), \
                patch.object(m,'administrative_prerequisites',return_value=self.result):
            m.qualify_auth(target)
            p=Path(target)/'standard-access-revocation-auth-before.json';receipt=json.loads(p.read_text())
            self.assertNotIn('private-transition',p.read_text())
            self.assertEqual(m.authenticated_auth_result(target),self.result)
            variants=[('run',124),('toolingCommit','c'*40),('manifestSha256','c'*64),
                ('readerIdentitySha256',m.readers()['identities']['backend']),
                ('observedAt',int(m.time.time())-7201),('observedAt',int(m.time.time())+20)]
            for key,value in variants:
                p.write_text(json.dumps({**receipt,key:value}))
                with self.subTest(key=key),self.assertRaises(ValueError):m.authenticated_auth_result(target)
            for altered in [{**self.result,'enabledAdministrativeAuthAccounts':0},
                    {**self.result,'ready':False},{**self.result,'localId':'unplanned-private-id'},
                    {**self.result,'activeAdministrativeProfiles':3}]:
                p.write_text(json.dumps({**receipt,'result':altered}))
                with self.subTest(result=altered),self.assertRaises(ValueError):m.authenticated_auth_result(target)
            p.write_text(json.dumps(receipt))
            with self.assertRaises(FileNotFoundError):m.authenticated_auth_result(target,after=True)

    def test_reader_context_rejects_local_branch_attempt_and_tooling_mismatch(self):
        env={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main',
            'GITHUB_RUN_ATTEMPT':'1','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ID':'123',
            'GITHUB_SHA':'b'*40,'GITHUB_WORKFLOW_REF':self.context['workflowRef']}
        with patch.object(m,'manifest',return_value={'candidate':m.CANDIDATE}), \
                patch.object(m.subprocess,'check_output',return_value='b'*40):
            with patch.dict(m.os.environ,env,clear=True):self.assertEqual(m.reader_context('.')['run'],123)
            for key,value in [('GITHUB_REF','refs/heads/unplanned'),('GITHUB_RUN_ATTEMPT','2'),
                    ('GITHUB_SHA','c'*40),('GITHUB_EVENT_NAME','push'),('GITHUB_WORKFLOW_REF','other/workflow')]:
                with self.subTest(key=key),patch.dict(m.os.environ,{**env,key:value},clear=True),self.assertRaises(ValueError):
                    m.reader_context('.')

    def test_auth_failure_writes_blocking_diagnostic_without_runtime_fallback(self):
        error=urllib.error.HTTPError(m.AUTH,403,'Forbidden',{},None);error.a33_stage='auth-lookup'
        with tempfile.TemporaryDirectory() as target,patch.object(m,'reader_context',return_value=self.context), \
                patch.object(m,'reader_identity',return_value=m.readers()['identities']['hosting']), \
                patch.object(m,'_legacy_uids',return_value=[]), \
                patch.object(m,'administrative_prerequisites',side_effect=error), \
                patch.object(m,'runtime_prerequisites') as runtime:
            with self.assertRaises(urllib.error.HTTPError):m.qualify_auth(target)
            runtime.assert_not_called()
            result=json.loads((Path(target)/'standard-access-revocation-auth-before.json').read_text())['result']
            self.assertEqual(result['stage'],'auth-lookup');self.assertFalse(result['ready'])
            with self.assertRaises(ValueError):m.authenticated_auth_result(target)

    def test_workflows_restore_backend_before_backup_sources_and_require_final_auth(self):
        release=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        points=['Utiliser le lecteur Auth existant A3.3 avant publication',
            'Qualifier la continuite administrative A3.3 avant publication',
            'Restaurer le compte backend A3.3 avant sauvegarde et sources',
            'Verifier que PROD correspond encore au bilan','Sauvegarder le code PROD avant publication',
            'Chiffrer puis tester la sauvegarde','Publier les Functions par petits lots',
            'Requalifier la continuite administrative A3.3 apres sources','Publier Hosting apres les controles',
            'Confirmer IDF inchange apres Hosting']
        self.assertEqual([release.index(x) for x in points],sorted(release.index(x) for x in points))
        restore=release[release.index('- name: '+points[2]):release.index('- name: '+points[3])]
        self.assertIn('secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_BACKEND',restore)
        self.assertIn("always() && steps.plan.outputs.access_revocation_reader == 'true'",restore)
        readiness=(ROOT/'.github/workflows/livepalmes-production-readiness.yml').read_text()
        self.assertLess(readiness.index('Qualifier la continuite administrative A3.3'),readiness.index('Restaurer le compte backend existant A3.3'))
        self.assertLess(readiness.index('Restaurer le compte backend existant A3.3'),readiness.index('Lire les permissions, quotas et la derive du plan'))

    def test_mail_entrypoint_routes_a33_to_active_unchanged_witness_guard(self):
        spec=importlib.util.spec_from_file_location('a33_mail_entry',ROOT/'tools/check-production-mail-disabled.py')
        entry=importlib.util.module_from_spec(spec);spec.loader.exec_module(entry)
        request={**m.contract()['request'],m.OPTION:{'contractSha256':m.DIGEST}}
        with tempfile.TemporaryDirectory() as target:
            (Path(target)/'request.json').write_text(json.dumps(request))
            with patch.dict(entry.os.environ,{'PLAN':target}),patch.object(entry.sys,'argv',['mail','--after']), \
                    patch.object(m,'guard') as guard,patch.object(entry.importlib.util,'module_from_spec') as module:
                from types import SimpleNamespace
                router=SimpleNamespace(for_request=lambda value:m)
                module.return_value=router
                with patch.object(entry.importlib.util,'spec_from_file_location') as spec_loader:
                    spec_loader.return_value=SimpleNamespace(loader=SimpleNamespace(exec_module=lambda value:None))
                    entry.main()
                guard.assert_called_once_with(Path(target),True)


if __name__=='__main__':unittest.main()
