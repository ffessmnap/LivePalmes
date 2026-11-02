"""Offline bounds of the explicit TEST-only portal session rules publication."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


p = load('session_rules', 'tools/test-portal-session-rules.py')
c = load('session_cycle', 'tools/release-cycle.py')
after = (ROOT/'firestore.rules').read_text(encoding='utf-8')
before = subprocess.check_output(['git', 'show', '29ceb478da84d63e41459a8a8f89f34bef0c6b04:firestore.rules'], cwd=ROOT, text=True)


class SessionRulesTests(unittest.TestCase):
    def test_only_exact_test_restriction(self):
        p.validate_sources(before, after, p.PROJECT)
        for project in ['livepalmes', 'other', '']:
            with self.assertRaises(ValueError): p.validate_sources(before, after, project)
        for old, new in [(after, before), (before+'\n', after), (before, after.replace('!= "livepalmes-test"', '== "livepalmes-test"'))]:
            with self.assertRaises(ValueError): p.validate_sources(old, new, p.PROJECT)

    def test_ordinary_and_production_classification_unchanged(self):
        with self.assertRaises(ValueError): c.classify_test(['firestore.rules'])
        with self.assertRaises(ValueError): c.classify(['firestore.rules'])
        with patch.dict(os.environ, {'TARGET_FIREBASE_PROJECT':p.PROJECT, 'BASE_SHA':'a'*40}), patch.object(c, 'git', side_effect=[before,after]):
            self.assertEqual(c.classify_test(['firestore.rules','functions/portal-session.js'],approved_portal_session_rules=True), (['functions/portal-session.js'],True))
        for path in ['storage.rules','firestore.indexes.json','firebase.json','performances/public/data/private.json']:
            with patch.dict(os.environ, {'TARGET_FIREBASE_PROJECT':p.PROJECT, 'BASE_SHA':'a'*40}), patch.object(c,'git',side_effect=[before,after]):
                with self.assertRaises(ValueError): c.classify_test(['firestore.rules',path],approved_portal_session_rules=True)

    def test_exact_rules_only_deployment_and_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'firestore.rules').write_text(after,encoding='utf-8')
            credentials=root/'credentials.json';credentials.write_text(json.dumps({'project_id':p.PROJECT}),encoding='utf-8')
            env={'TARGET_FIREBASE_PROJECT':p.PROJECT,'PORTAL_SESSION_RULES_APPROVAL':p.APPROVAL,'GITHUB_REF':'refs/heads/main','CANDIDATE_SHA':'a'*40,'GITHUB_SHA':'a'*40,'HOSTING_ONLY':'false','AUTOMATIC_CANDIDATE':'','GOOGLE_APPLICATION_CREDENTIALS':str(credentials)}
            def command(args,**kwargs):return 'a'*40 if args[0]=='git' else 'synthetic-token'
            for observed, expected_deploys in [(p.BEFORE,2),(p.AFTER,0),('unknown',0)]:
                with patch.dict(os.environ,env),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',side_effect=[{'sha256':observed},{'sha256':observed},{'sha256':p.AFTER}] if observed==p.BEFORE else [{'sha256':observed},{'sha256':p.AFTER}]) as read:
                    if observed=='unknown':
                        with self.assertRaisesRegex(ValueError,'Derive'):p.deploy(root,root/'proof.json')
                    else:
                        p.deploy(root,root/'proof.json')
                        proof=json.loads((root/'proof.json').read_text());self.assertFalse(proof['indexesDeployed']);self.assertFalse(proof['productionTouched']);self.assertEqual(proof['candidate'],'a'*40)
                    self.assertEqual(run.call_count,expected_deploys)
                    for call in run.call_args_list:
                        args=call.args[0];self.assertIn('firestore:rules',args);self.assertEqual(args[args.index('--project')+1],p.PROJECT);self.assertNotIn('firestore:indexes',args)
            for key,value in [('TARGET_FIREBASE_PROJECT','livepalmes'),('GITHUB_REF','refs/heads/feature'),('GITHUB_SHA','b'*40),('HOSTING_ONLY','true'),('AUTOMATIC_CANDIDATE','a'*40),('PORTAL_SESSION_RULES_APPROVAL','')]:
                with patch.dict(os.environ,{**env,key:value}),patch.object(p.subprocess,'run') as run:
                    with self.assertRaises(ValueError):p.deploy(root,root/'proof.json')
                    run.assert_not_called()
            for observed in [p.BEFORE,p.AFTER,'unknown']:
                with patch.dict(os.environ,{**env,'PORTAL_SESSION_RULES_WRITE':'false'}),patch.object(p.subprocess,'check_output',side_effect=command),patch.object(p.subprocess,'run') as run,patch.object(p,'rules',return_value={'sha256':observed}):
                    if observed==p.AFTER:p.check(root,root/'readonly.json')
                    else:
                        with self.assertRaises(ValueError):p.check(root,root/'readonly.json')
                    run.assert_not_called()
            workflow=(ROOT/'.github/workflows/livepalmes-test-common.yml').read_text()
            self.assertLess(workflow.index('Controler les regles de session TEST avant toute publication'),workflow.index('Selectionner les Functions TEST reellement differentes'))
            self.assertIn("if: inputs.approved_portal_session_rules && !inputs.verification_only && !inputs.hosting_only",workflow)


if __name__=='__main__':unittest.main()
