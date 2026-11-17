"""B runtime discovery: bounded pure fixtures, no cloud or business operations."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('session_b_caps_tests',ROOT/'tools/portal-session-enforcement-capabilities.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
ENV={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_RUN_ATTEMPT':'1',
 'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_SHA':'a'*40,'GITHUB_RUN_ID':'123',
 'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'}
ACCOUNT='fixture@livepalmes.iam.gserviceaccount.com'
OTHER='reader@livepalmes.iam.gserviceaccount.com'

class EnforcementCapabilitiesTests(unittest.TestCase):
    def functions(self):
        c=json.loads((ROOT/'.github/releases/evidence/20261117-test-portal-session-enforcement-contract.json').read_text(encoding='utf-8'))
        names=set(c['installedFunctions'])-{'exportNapPublicPage','getNapSwimmerPerformances'}
        return [{'name':p.PREFIX+n,'state':'ACTIVE','environment':'GEN_2',
                 'buildConfig':{'runtime':'nodejs22','entryPoint':n},
                 'serviceConfig':{'serviceAccountEmail':ACCOUNT}} for n in sorted(names)]

    def reader(self,permissions=None,conditional=False,two=False):
        calls=[]
        def read(url,body=None):
            calls.append((url,body))
            if url==p.IAM:
                self.assertEqual(body,{'options':{'requestedPolicyVersion':3}})
                role={'role':'roles/fixture','members':['serviceAccount:'+ACCOUNT]}
                if conditional:role['condition']={'expression':'false'}
                return {'bindings':[role]+([{'role':'roles/readOnly','members':['serviceAccount:'+OTHER]}] if two else [])}
            self.assertIsNone(body)
            if url=='https://iam.googleapis.com/v1/roles/readOnly?fields=includedPermissions':
                return {'includedPermissions':['datastore.entities.get']}
            self.assertEqual(url,'https://iam.googleapis.com/v1/roles/fixture?fields=includedPermissions')
            return {'includedPermissions':sorted(p.BOOTSTRAP_PERMISSIONS if permissions is None else permissions)}
        return read,calls

    def test_all_102_installed_runtimes_are_bound_without_n_plus_one(self):
        read,calls=self.reader();proof=p.runtime_permissions(self.functions(),read)
        self.assertTrue(proof['ready']);self.assertEqual(proof['selectedCount'],102)
        self.assertEqual(proof['retainedCount'],17);self.assertEqual(proof['runtimeAccountCount'],1)
        self.assertEqual(proof['missingRuntimePermissions'],[])
        self.assertEqual(len(proof['runtimeAccounts'][0]['selectedFunctions']),102)
        self.assertEqual(len(calls),2)
        self.assertEqual(proof['roleDefinitionReadsSucceeded'],1)
        self.assertFalse(proof['impersonation']);self.assertEqual(proof['sessionWrites'],0)
        self.assertNotIn(ACCOUNT,json.dumps(proof))

    def test_multiple_existing_accounts_need_only_their_actual_permissions(self):
        functions=self.functions();targets=set(p.selected())
        for f in functions:
            if f['name'].removeprefix(p.PREFIX) in targets-{'getCurrentAccessUser'}:
                f['serviceConfig']['serviceAccountEmail']=OTHER
        read,calls=self.reader(two=True);proof=p.runtime_permissions(functions,read)
        self.assertTrue(proof['ready']);self.assertEqual(proof['runtimeAccountCount'],2)
        rows={r['accountSha256']:r for r in proof['runtimeAccounts']}
        self.assertEqual(rows[hashlib.sha256(OTHER.encode()).hexdigest()]['requiredPermissions'],['datastore.entities.get'])
        self.assertEqual(len(calls),3)

    def test_missing_or_conditional_grants_never_become_ready(self):
        for kwargs in [{'permissions':['datastore.entities.get']},{'conditional':True}]:
            read,calls=self.reader(**kwargs);proof=p.runtime_permissions(self.functions(),read)
            self.assertFalse(proof['ready']);self.assertTrue(proof['missingRuntimePermissions'])
            self.assertLessEqual(len(calls),2)

    def test_exact_role_get_refusal_propagates(self):
        read,calls=self.reader()
        def denied(url,body=None):
            if url!=p.IAM:raise PermissionError('fixture refusal')
            return read(url,body)
        with self.assertRaises(PermissionError):p.runtime_permissions(self.functions(),denied)

    def test_inventory_or_selected_runtime_change_blocks(self):
        read,_=self.reader();original=self.functions()
        for functions in [original[:-1],original+[original[0]],copy.deepcopy(original)]:
            if len(functions)==119:functions[0]['state']='FAILED'
            with self.assertRaises(ValueError):p.runtime_permissions(functions,read)
        for section,key,value in [('buildConfig','runtime','nodejs20'),('buildConfig','entryPoint','other'),
                                  ('serviceConfig','serviceAccountEmail','invalid')]:
            functions=copy.deepcopy(original);f=next(f for f in functions if f['name']==p.PREFIX+'getCurrentAccessUser');f[section][key]=value
            with self.assertRaises(ValueError):p.runtime_permissions(functions,read)

    def test_role_budget_unknown_role_and_policy_budget_block(self):
        for bindings in [[{'role':'roles/fixture'+str(i),'members':['serviceAccount:'+ACCOUNT]} for i in range(11)],
                         [{'role':'projects/other/roles/admin','members':['serviceAccount:'+ACCOUNT]}],
                         [{} for _ in range(251)]]:
            with self.assertRaises(ValueError):p.runtime_permissions(self.functions(),lambda *args:{'bindings':bindings})

    def test_closed_context_identity_and_contract(self):
        p.context(p.CANDIDATE,'backend',ENV)
        for key,value in [('GITHUB_REF','refs/heads/other'),('GITHUB_RUN_ATTEMPT','2'),
                          ('GITHUB_EVENT_NAME','push'),('GITHUB_SHA','short'),('GITHUB_RUN_ID','0')]:
            with self.assertRaises(ValueError):p.context(p.CANDIDATE,'backend',{**ENV,key:value})
        with self.assertRaises(ValueError):p.context('f'*40,'backend',ENV)
        with self.assertRaises(ValueError):p.qualify(p.CANDIDATE,'backend',identity='0'*64,env=ENV)
        with patch.object(Path,'read_bytes',return_value=b'{}'):
            with self.assertRaises(ValueError):p.selected()

    def test_hosting_reuses_bounded_read_only_continuity_reader(self):
        class Fake:
            @staticmethod
            def administrative_prerequisites(functions,read):
                self.assertEqual(functions,[])
                return {'ready':True,'readOnly':True,'accountOrRightChanges':0,'enabledAdministrativeAuthAccounts':2}
        with patch.object(p,'load',return_value=Fake):
            proof=p.qualify(p.CANDIDATE,'hosting',read=lambda *a:None,identity=p.READERS['hosting'],env=ENV)
        self.assertEqual(proof['authLookupLimit'],2);self.assertEqual(proof['businessInvocations'],0)
        self.assertEqual(proof['newPermissions'],0);self.assertEqual(proof['candidate'],p.CANDIDATE)

if __name__=='__main__':unittest.main()
