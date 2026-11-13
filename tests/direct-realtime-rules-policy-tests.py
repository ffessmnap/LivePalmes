"""Closed TEST-only Direct rules publication, no credentials or remote calls."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
p=load('direct_rules_policy','tools/test-direct-realtime-rules.py')
c=load('direct_rules_cycle','tools/release-cycle.py')
before=subprocess.check_output(['git','show','aeb83ddce5d78e1c613ba4569231f72f467f4097:firestore.rules'],cwd=ROOT,text=True)
after=(ROOT/'firestore.rules').read_text(encoding='utf-8')

class DirectRulesTests(unittest.TestCase):
    def test_exact_sources_no_broadening(self):
        p.validate_sources(before,after,p.PROJECT)
        for old,new,project in [(before,after,'livepalmes'),(after,before,p.PROJECT),(before,after+'\n',p.PROJECT),(before,after.replace('allow list, write: if false','allow list, write: if true'),p.PROJECT)]:
            with self.assertRaises(ValueError):p.validate_sources(old,new,project)
        with self.assertRaises(ValueError):c.classify(['firestore.rules'])
        with self.assertRaises(ValueError):c.classify_test(['firestore.rules'])
        with patch.dict(os.environ,{'TARGET_FIREBASE_PROJECT':p.PROJECT,'BASE_SHA':'a'*40}),patch.object(c.subprocess,'check_output',side_effect=[before,after]):
            self.assertEqual(c.classify_test(['firestore.rules','functions/nap-direct-service.js'],approved_direct_realtime_rules=True),(['functions/nap-direct-service.js'],True))

    def test_publication_and_drift_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'firestore.rules').write_text(after,encoding='utf-8')
            credentials=root/'credentials.json';credentials.write_text(json.dumps({'project_id':p.PROJECT}),encoding='utf-8')
            env={'TARGET_FIREBASE_PROJECT':p.PROJECT,'DIRECT_REALTIME_RULES_APPROVAL':p.APPROVAL,'GITHUB_REF':'refs/heads/main','GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_RUN_ATTEMPT':'1','CANDIDATE_SHA':'a'*40,'GITHUB_SHA':'a'*40,'HOSTING_ONLY':'true','AUTOMATIC_CANDIDATE':'','GOOGLE_APPLICATION_CREDENTIALS':str(credentials),'DIRECT_REALTIME_VERIFICATION_ONLY':'false'}
            def command(args,**kwargs):return 'a'*40 if args[0]=='git' else 'synthetic-token'
            with patch.dict(os.environ,env),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',side_effect=[{'sha256':p.BEFORE},{'sha256':p.BEFORE},{'sha256':p.AFTER}]):
                p.deploy(root,root/'proof.json');self.assertEqual(run.call_count,2)
                proof=json.loads((root/'proof.json').read_text());self.assertFalse(proof['productionTouched']);self.assertFalse(proof['indexesDeployed'])
                for call in run.call_args_list:self.assertIn('firestore:rules',call.args[0]);self.assertIn(p.PROJECT,call.args[0])
            for key,value in [('TARGET_FIREBASE_PROJECT','livepalmes'),('GITHUB_REF','refs/heads/branch'),('GITHUB_SHA','b'*40),('HOSTING_ONLY','false'),('AUTOMATIC_CANDIDATE','a'*40),('DIRECT_REALTIME_RULES_APPROVAL',''),('DIRECT_REALTIME_VERIFICATION_ONLY','true')]:
                with patch.dict(os.environ,{**env,key:value}),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run:
                    with self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                    run.assert_not_called()
            for observed in [p.BEFORE,p.AFTER,'drift']:
                with patch.dict(os.environ,{**env,'DIRECT_REALTIME_RULES_WRITE':'false'}),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',return_value={'sha256':observed}):
                    if observed==p.AFTER:p.check(root,root/'readonly.json')
                    else:
                        with self.assertRaises(ValueError):p.check(root,root/'readonly.json')
                    run.assert_not_called()
if __name__=='__main__':unittest.main()
