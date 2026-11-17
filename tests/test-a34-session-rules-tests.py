"""Exact B TEST Rules closure and refusal paths; all cloud operations are mocked."""
import importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from helpers.history_fixture import rule_source
ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
p=load('a34_rules','tools/test-a34-session-rules.py')
c=load('a34_rules_cycle','tools/release-cycle.py')
coordinate=load('a34_coordinate','tools/coordinate-test-publication.py')
before=(ROOT/'.github/releases/evidence/20261117-a34-session-enforcement-test-before.rules').read_text(encoding='utf8')
after=(ROOT/'firestore.rules').read_text(encoding='utf8')

class RulesTests(unittest.TestCase):
    def test_only_exact_test_delta_and_source_classification(self):
        p.validate_sources(before,after,p.PROJECT)
        for old,new,project in [(after,before,p.PROJECT),(before,after+'\n',p.PROJECT),(before,after,'livepalmes')]:
            with self.assertRaises(ValueError):p.validate_sources(old,new,project)
        env={'TARGET_FIREBASE_PROJECT':p.PROJECT,'BASE_SHA':'a'*40,'A34_HOSTING_MODE':'true','A34_AUTOMATIC_CANDIDATE':''}
        with patch.dict(os.environ,env),patch.object(c.subprocess,'check_output',side_effect=[before,after]):
            self.assertEqual(c.classify_test(['firestore.rules','functions/index.js'],approved_a34_session_rules=True),(['functions/index.js'],True))
        for change in [{'TARGET_FIREBASE_PROJECT':'livepalmes'},{'A34_HOSTING_MODE':'false'},{'A34_AUTOMATIC_CANDIDATE':'a'*40}]:
            with patch.dict(os.environ,{**env,**change}),patch.object(c.subprocess,'check_output',side_effect=[before,after]):
                with self.assertRaises(ValueError):c.classify_test(['firestore.rules'],approved_a34_session_rules=True)
        with patch.dict(os.environ,env),self.assertRaises(ValueError):c.classify_test(['firestore.rules'],approved_a34_session_rules=True,approved_direct_realtime_rules=True)
    def fixture(self,root):
        (root/'firestore.rules').write_text(after,encoding='utf8');credentials=root/'credentials.json';credentials.write_text(json.dumps({'project_id':p.PROJECT}))
        return {'TARGET_FIREBASE_PROJECT':p.PROJECT,'GITHUB_REF':'refs/heads/main','GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_RUN_ATTEMPT':'1','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-test-common.yml@refs/heads/main','CANDIDATE_SHA':'a'*40,'GITHUB_SHA':'a'*40,'GOOGLE_APPLICATION_CREDENTIALS':str(credentials),'A34_RULES_APPROVAL':p.APPROVAL,'A34_RULES_WRITE':'true','A34_HOSTING_MODE':'true','A34_AUTOMATIC_CANDIDATE':'','A34_VERIFICATION_ONLY':'false'}
    def test_deployment_and_drift_only_rules_test(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);env=self.fixture(root)
            command=lambda args,**kwargs:'a'*40 if args[0]=='git' else 'synthetic-token'
            with patch.dict(os.environ,env),patch.object(p,'validate_candidate'),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',side_effect=[{'sha256':p.BEFORE},{'sha256':p.BEFORE},{'sha256':p.AFTER}]):
                p.deploy(root,root/'proof.json');self.assertEqual(run.call_count,2)
                for call in run.call_args_list:
                    self.assertIn('firestore:rules',call.args[0]);self.assertIn(p.PROJECT,call.args[0]);self.assertNotIn('firestore:indexes',call.args[0]);self.assertNotIn('livepalmes',call.args[0])
                self.assertIn('--dry-run',run.call_args_list[0].args[0]);self.assertNotIn('--dry-run',run.call_args_list[1].args[0])
                proof=json.loads((root/'proof.json').read_text());self.assertTrue(proof['deployed']);self.assertFalse(proof['productionTouched']);self.assertFalse(proof['indexesDeployed'])
            for change in [{'TARGET_FIREBASE_PROJECT':'livepalmes'},{'A34_RULES_WRITE':'false'},{'A34_RULES_APPROVAL':''},{'A34_HOSTING_MODE':'false'},{'A34_AUTOMATIC_CANDIDATE':'a'*40},{'A34_VERIFICATION_ONLY':'true'},{'GITHUB_WORKFLOW_REF':'other'}]:
                with patch.dict(os.environ,{**env,**change}),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run:
                    with self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                    run.assert_not_called()
            with patch.dict(os.environ,env),patch.object(p,'validate_candidate'),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',side_effect=[{'sha256':p.BEFORE},{'sha256':'drift'}]):
                with self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                self.assertEqual(run.call_count,1);self.assertIn('--dry-run',run.call_args.args[0])
    def test_readonly_requires_after_without_full_manual_scope(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);env={**self.fixture(root),'A34_RULES_WRITE':'false'}
            for observed in [p.BEFORE,p.AFTER,'drift']:
                with patch.dict(os.environ,env),patch.object(p.subprocess,'check_output',side_effect=lambda args,**kw:'a'*40 if args[0]=='git' else 'synthetic-token'),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',return_value={'sha256':observed}):
                    if observed==p.AFTER:p.check(root,root/'read.json')
                    else:
                        with self.assertRaises(ValueError):p.check(root,root/'read.json')
                    run.assert_not_called()
    def test_sensitive_coordination_has_no_automatic_followup_or_mixing(self):
        inputs={'approved_a34_session_rules':True,'hosting_only':True,'production_commit':'a'*40}
        with patch.object(coordinate,'latest',return_value='b'*40):
            self.assertEqual(coordinate.coordinate('prepare','ffessmnap/LivePalmes','b'*40,inputs),{'publish':True,'head':'b'*40})
            self.assertEqual(coordinate.coordinate('followup','ffessmnap/LivePalmes','b'*40,inputs),{'queued':False,'head':'b'*40})
            for change in [{'automatic_candidate':'b'*40},{'hosting_only':False},{'approved_portal_session_rules':True},{'approved_direct_realtime_rules':True},{'approved_a3_http_headers':True},{'dtn_extension':True},{'verification_only':True}]:
                with self.assertRaises(ValueError):coordinate.coordinate('prepare','ffessmnap/LivePalmes','b'*40,{**inputs,**change})
    def test_candidate_contract_and_application_are_bound(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);(root/'.github/releases/evidence').mkdir(parents=True);(root/'tools').mkdir()
            contract='.github/releases/evidence/20261117-test-portal-session-enforcement-contract.json'
            (root/contract).write_bytes((ROOT/contract).read_bytes());(root/'tools/publish-test-portal-session-enforcement.py').write_bytes((ROOT/'tools/publish-test-portal-session-enforcement.py').read_bytes());(root/'firestore.rules').write_text(after,encoding='utf8')
            with patch.object(p.subprocess,'check_output',side_effect=['','']),patch.object(p.subprocess,'run'):
                p.validate_candidate(root)
            with patch.object(p.subprocess,'check_output',side_effect=['','assets/unapproved.js']),patch.object(p.subprocess,'run'):
                with self.assertRaises(ValueError):p.validate_candidate(root)
            with (root/contract).open('ab') as stream:stream.write(b' ')
            with self.assertRaises(ValueError):p.validate_candidate(root)

if __name__=='__main__':unittest.main()
