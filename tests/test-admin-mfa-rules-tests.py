"""MFA TEST Rules require authenticated sources first; cloud calls are mocked."""
from copy import deepcopy
import importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_test_rules',ROOT/'tools/test-admin-mfa-rules.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
before=(ROOT/'.github/releases/evidence/20261118-admin-mfa-test-before.rules').read_text(encoding='utf-8')
after=(ROOT/'firestore.rules').read_text(encoding='utf-8')

class RuleTests(unittest.TestCase):
    def fixture(self,root):
        (root/'firestore.rules').write_text(after,encoding='utf-8')
        credentials=root/'credentials.json';credentials.write_text(json.dumps({'project_id':p.PROJECT}))
        entry=p.load('publish-test-admin-mfa-sources.py').contract();candidate='a'*40
        prefix='projects/'+p.PROJECT+'/locations/europe-west1/functions/'
        state={'functions':[{'name':prefix+n,'state':'ACTIVE','commit':'b'*40} for n in entry['installedFunctions']]}
        (root/'test-selection.json').write_text('[]');(root/'test-before.json').write_text(json.dumps(state))
        source=SimpleNamespace(PREFIX=prefix,contract=lambda:entry,CONTRACT_SHA256='c'*64,cycle=SimpleNamespace(snapshot=lambda project:deepcopy(state),gh=Mock(),artifact=Mock(),read=Mock(),matching_functions=Mock(),test_backend_fingerprints=Mock()))
        source.trusted_revisions=Mock(side_effect=lambda directory,current,api:{f['name'] for f in current['functions'] if f['commit']=='b'*40 and f['state']=='ACTIVE' and f['name'].split('/')[-1] in entry['allowedFunctions']})
        env=dict(TARGET_FIREBASE_PROJECT=p.PROJECT,GITHUB_REF='refs/heads/main',GITHUB_REPOSITORY='ffessmnap/LivePalmes',GITHUB_RUN_ATTEMPT='1',GITHUB_WORKFLOW_REF='ffessmnap/LivePalmes/.github/workflows/livepalmes-test-common.yml@refs/heads/main',CANDIDATE_SHA=candidate,GITHUB_SHA=candidate,GOOGLE_APPLICATION_CREDENTIALS=str(credentials),ADMIN_MFA_RULES_APPROVAL=p.APPROVAL,ADMIN_MFA_RULES_WRITE='true',ADMIN_MFA_HOSTING_MODE='true',ADMIN_MFA_AUTOMATIC_CANDIDATE='',ADMIN_MFA_VERIFICATION_ONLY='false',GITHUB_EVENT_NAME='workflow_dispatch',RUNNER_TEMP=str(root))
        return env,entry,state,source

    def test_exact_project_and_rule_delta_only(self):
        p.validate_sources(before,after,p.PROJECT)
        for old,new,project in [(after,before,p.PROJECT),(before,after+'\n',p.PROJECT),(before,after,'livepalmes')]:
            with self.assertRaises(ValueError):p.validate_sources(old,new,project)

    def test_sources_before_rules_dryrun_drift_and_no_indexes(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);env,entry,state,source=self.fixture(root)
            command=lambda args,**kw:'a'*40 if args[0]=='git' else 'synthetic-token'
            with patch.dict(os.environ,env,clear=True),patch.object(p,'validate_candidate',return_value=entry),patch.object(p,'load',return_value=source),patch.object(p.subprocess,'check_output',side_effect=command):
                with patch.object(p.subprocess,'run') as run,patch.object(p,'rules',side_effect=[{'sha256':p.BEFORE},{'sha256':p.BEFORE},{'sha256':p.AFTER}]):
                    p.deploy(root,root/'proof.json')
                    self.assertEqual(run.call_count,2)
                    self.assertIn('--dry-run',run.call_args_list[0].args[0]);self.assertNotIn('--dry-run',run.call_args_list[1].args[0])
                    for call in run.call_args_list:
                        self.assertEqual(call.args[0][call.args[0].index('--only')+1],'firestore:rules')
                        self.assertEqual(call.args[0][call.args[0].index('--project')+1],p.PROJECT)
                    proof=json.loads((root/'proof.json').read_text());self.assertTrue(proof['sourcesVerified']);self.assertFalse(proof['productionTouched'])
                with patch.object(p.subprocess,'run') as run,patch.object(p,'rules',side_effect=[{'sha256':p.BEFORE},{'sha256':'drift'}]):
                    with self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                    self.assertEqual(run.call_count,1)
                state['functions'][0]['commit']='c'*40
                (root/'test-before.json').write_text(json.dumps(state))
                with patch.object(p.subprocess,'run') as run,self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                run.assert_not_called()

    def test_wrong_context_and_missing_sources_never_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);env,entry,state,source=self.fixture(root)
            for change in [{'TARGET_FIREBASE_PROJECT':'livepalmes'},{'ADMIN_MFA_RULES_WRITE':'false'},{'ADMIN_MFA_HOSTING_MODE':'false'},{'ADMIN_MFA_RULES_APPROVAL':''},{'ADMIN_MFA_AUTOMATIC_CANDIDATE':'b'*40},{'ADMIN_MFA_VERIFICATION_ONLY':'true'},{'GITHUB_EVENT_NAME':'push'},{'GITHUB_WORKFLOW_REF':'other'},{'GITHUB_RUN_ATTEMPT':'2'}]:
                with patch.dict(os.environ,{**env,**change},clear=True),patch.object(p.subprocess,'check_output',return_value='a'*40),patch.object(p.subprocess,'run') as run,self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                run.assert_not_called()
            (root/'test-selection.json').write_text('["not-yet-published"]')
            with patch.dict(os.environ,env,clear=True),patch.object(p,'validate_candidate',return_value=entry),patch.object(p.subprocess,'check_output',return_value='a'*40),patch.object(p.subprocess,'run') as run,self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
            run.assert_not_called()

    def test_sensitive_coordinator_has_no_automatic_or_mixed_followup(self):
        c=p.load('coordinate-test-publication.py')
        inputs={'approved_admin_mfa_rules':True,'hosting_only':True,'production_commit':'b'*40}
        with patch.object(c,'latest',return_value='a'*40):
            self.assertEqual(c.coordinate('prepare','ffessmnap/LivePalmes','a'*40,inputs),{'publish':True,'head':'a'*40})
            self.assertEqual(c.coordinate('followup','ffessmnap/LivePalmes','a'*40,inputs),{'queued':False,'head':'a'*40})
            self.assertEqual(c.coordinate('prepare','ffessmnap/LivePalmes','b'*40,inputs),{'publish':False,'head':'a'*40})
            for change in [{'hosting_only':False},{'automatic_candidate':'a'*40},{'verification_only':True},{'approved_a34_session_rules':True},{'approved_direct_csp':True},{'dtn_extension':True},{'followup_depth':1}]:
                with self.assertRaises(ValueError):c.coordinate('prepare','ffessmnap/LivePalmes','a'*40,{**inputs,**change})

    def test_locked_parser_is_installed_before_classification_and_google_identity(self):
        script="const fs=require('node:fs'),yaml=require('./tests/firestore-rules/node_modules/yaml');console.log(JSON.stringify(yaml.parse(fs.readFileSync('.github/workflows/livepalmes-test-common.yml','utf8')).jobs.test.steps));"
        steps=json.loads(p.subprocess.check_output(['node','-e',script],cwd=ROOT,text=True))
        classify=next(i for i,s in enumerate(steps) if 'classify_test(' in s.get('run',''))
        install=next(i for i,s in enumerate(steps) if 'npm ci --prefix tests/firestore-rules' in s.get('run',''))
        google=next(i for i,s in enumerate(steps) if s.get('uses','').startswith('google-github-actions/auth@'))
        self.assertLess(install,classify);self.assertLess(classify,google)

    def test_one_of_all_111_unproven_sources_prevents_any_rules_write(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);env,entry,state,source=self.fixture(root)
            proven={source.PREFIX+n for n in entry['allowedFunctions']}
            source.trusted_revisions=Mock(return_value=proven-{source.PREFIX+entry['allowedFunctions'][0]})
            with patch.dict(os.environ,env,clear=True),patch.object(p,'validate_candidate',return_value=entry),patch.object(p,'load',return_value=source),patch.object(p.subprocess,'check_output',side_effect=lambda args,**kw:'a'*40 if args[0]=='git' else 'synthetic-token'),patch.object(p.subprocess,'run') as deploy,self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
            deploy.assert_not_called()

if __name__=='__main__':unittest.main()
