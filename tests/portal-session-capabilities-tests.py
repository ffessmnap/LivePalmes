"""Runtime grant inspection and bounded administrative reads; all services fictitious."""
import copy
import hashlib
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('session_caps_tests',ROOT/'tools/portal-session-production-capabilities.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
ENV={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_RUN_ATTEMPT':'1',
     'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_SHA':'a'*40,'GITHUB_RUN_ID':'123',
     'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'}
ACCOUNT='fixture@livepalmes.iam.gserviceaccount.com'
REF={'name':p.PREFIX+'getCurrentAccessUser','state':'ACTIVE','environment':'GEN_2',
     'buildConfig':{'runtime':'nodejs22','entryPoint':'getCurrentAccessUser'},'serviceConfig':{'serviceAccountEmail':ACCOUNT}}


class SessionCapabilityTests(unittest.TestCase):
    def test_closed_candidate_project_workflow_and_reader(self):
        p.context(p.CANDIDATE,'backend',ENV)
        for key,value in [('GITHUB_REF','refs/heads/other'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_EVENT_NAME','push'),
                          ('GITHUB_REPOSITORY','other/repo'),('GITHUB_SHA','short'),('GITHUB_RUN_ID','0'),('GITHUB_WORKFLOW_REF','other')]:
            env={**ENV,key:value}
            with self.assertRaises(ValueError):p.context(p.CANDIDATE,'backend',env)
        with self.assertRaises(ValueError):p.context('b'*40,'backend',ENV)
        with self.assertRaises(ValueError):p.context(p.CANDIDATE,'unknown',ENV)
        with self.assertRaises(ValueError):p.qualify(p.CANDIDATE,'backend',REF,lambda *a:{},'0'*64,ENV)

    def reader(self, permissions, conditional=False):
        calls=[]
        def read(url,body=None):
            calls.append((url,body))
            if url==p.IAM:
                b={'role':'roles/fixture','members':['serviceAccount:'+ACCOUNT]}
                if conditional:b['condition']={'expression':'false'}
                return {'bindings':[b]}
            self.assertEqual(url,'https://iam.googleapis.com/v1/roles/fixture?fields=includedPermissions')
            self.assertIsNone(body)
            return {'includedPermissions':permissions}
        return read,calls

    def test_union_requires_all_four_permissions_without_writing(self):
        read,calls=self.reader(sorted(p.REQUIRED))
        with patch.object(p,'RUNTIME',hashlib.sha256(ACCOUNT.encode()).hexdigest()):result=p.runtime_permissions(REF,read)
        self.assertTrue(result['ready']);self.assertEqual(result['missingRuntimePermissions'],[])
        self.assertEqual(len(calls),2);self.assertEqual(calls[0][1],{'options':{'requestedPolicyVersion':3}})
        self.assertEqual(result['sessionWrites'],0);self.assertFalse(result['impersonation'])
        self.assertNotIn(ACCOUNT,str(result))

    def test_each_missing_permission_is_a_visible_failure(self):
        for missing in p.REQUIRED:
            read,_=self.reader(sorted(p.REQUIRED-{missing}))
            with patch.object(p,'RUNTIME',hashlib.sha256(ACCOUNT.encode()).hexdigest()):result=p.runtime_permissions(REF,read)
            self.assertFalse(result['ready']);self.assertEqual(result['missingRuntimePermissions'],[missing])

    def test_conditional_binding_does_not_prove_permission(self):
        read,calls=self.reader(sorted(p.REQUIRED),conditional=True)
        with patch.object(p,'RUNTIME',hashlib.sha256(ACCOUNT.encode()).hexdigest()):result=p.runtime_permissions(REF,read)
        self.assertFalse(result['ready']);self.assertEqual(result['runtimeRolesChecked'],0);self.assertEqual(len(calls),1)

    def test_runtime_identity_state_and_budgets_refused(self):
        for mutate in [lambda f:f.update(state='FAILED'),lambda f:f.update(name=p.PREFIX+'other'),
                       lambda f:f['buildConfig'].update(runtime='nodejs20'),
                       lambda f:f['serviceConfig'].update(serviceAccountEmail='other@livepalmes.iam.gserviceaccount.com')]:
            f=copy.deepcopy(REF);mutate(f)
            with patch.object(p,'RUNTIME',hashlib.sha256(ACCOUNT.encode()).hexdigest()),self.assertRaises(ValueError):p.runtime_permissions(f,lambda *a:{})
        for bindings in [[{}]*251,[{'role':'roles/fake'+str(i),'members':['serviceAccount:'+ACCOUNT]} for i in range(11)],
                         [{'role':'projects/other/roles/unsafe','members':['serviceAccount:'+ACCOUNT]}]]:
            with patch.object(p,'RUNTIME',hashlib.sha256(ACCOUNT.encode()).hexdigest()),self.assertRaises(ValueError):p.runtime_permissions(REF,lambda *a:{'bindings':bindings})

    def test_administrative_continuity_reuses_bounded_read_only_queries(self):
        calls=[]
        def read(url,body=None):
            calls.append((url,body))
            if url.endswith(':runQuery'):
                self.assertEqual(body['structuredQuery']['limit'],2)
                return [{'document':{'name':'projects/livepalmes/databases/(default)/documents/users/fixture',
                    'fields':{'status':{'stringValue':'active'},'capabilities':{'mapValue':{'fields':{'admin.full':{'booleanValue':True}}}}}}}]
            self.assertIn('accounts:lookup',url);self.assertEqual(body,{'localId':['fixture']})
            return {'users':[{'localId':'fixture','disabled':False}]}
        result=p.qualify(p.CANDIDATE,'hosting',read=read,identity=p.READERS['hosting'],env=ENV)
        self.assertTrue(result['ready']);self.assertEqual(len(calls),2)
        self.assertEqual(result['activeAdministrativeProfiles'],1);self.assertNotIn('fixture',str(result))
        self.assertEqual(result['accountOrRightChanges'],0)
        self.assertEqual(result['authLookupLimit'],2)

    def test_discovery_hook_is_limited_to_the_phase_a_candidate(self):
        source=(ROOT/'tools/check-release-prerequisites.py').read_text()
        self.assertIn("value['candidate'] == '"+p.CANDIDATE+"'",source)
        self.assertIn("requested += session_caps.READER_PERMISSIONS[kind]",source)
        self.assertIn("report['portalSessionPrepare'] = session_caps.qualify",source)


if __name__=='__main__':unittest.main()
