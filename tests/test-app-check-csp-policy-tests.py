"""Exact portal CSP, retained backend and manual TEST-only publication boundary."""
import copy
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
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
policy = load('app_check_csp_policy', 'test-app-check-csp-policy.py')
cycle = load('app_check_csp_cycle', 'release-cycle.py')
coordinator = load('app_check_csp_coordinator', 'coordinate-test-publication.py')
before = json.loads(subprocess.check_output(['git', 'show', policy.BASELINE+':firebase.json'], cwd=ROOT))
# Verified TEST Hosting candidate that exercised this closed historical contract.
APP_CHECK_CANDIDATE = '1e27374ef9728413d9eea990f9c48975c7871ccd'
after = json.loads(subprocess.check_output(['git', 'show', APP_CHECK_CANDIDATE+':firebase.json'], cwd=ROOT))
current = json.loads((ROOT/'firebase.json').read_text(encoding='utf-8'))

class AppCheckCspTests(unittest.TestCase):
    def test_only_three_portal_directives_change(self):
        policy.validate_sources(before, after, 'livepalmes-test', True, '')
        def portal(config):
            return next(h for r in config['hosting']['headers'] if r['source']=='/portail.html'
                        for h in r['headers'] if h['key']=='Content-Security-Policy')
        old, new = portal(before)['value'], portal(after)['value']
        restored = copy.deepcopy(after)
        portal(restored)['value'] = old
        self.assertEqual(restored, before)
        directives = lambda value: {d.strip().split()[0]: d.strip().split()[1:] for d in value.split(';')}
        old_d, new_d = directives(old), directives(new)
        self.assertEqual(set(old_d), set(new_d))
        self.assertEqual({k for k in old_d if old_d[k]!=new_d[k]}, {'script-src','frame-src','connect-src'})
        for k in ['script-src','frame-src','connect-src']:
            self.assertEqual(new_d[k][:len(old_d[k])], old_d[k])
            self.assertNotIn("'unsafe-inline'", new_d[k])
            self.assertNotIn("'unsafe-eval'", new_d[k])
        self.assertEqual(new_d['script-src'][len(old_d['script-src']):], ['https://www.google.com/recaptcha/'])
        self.assertEqual(new_d['frame-src'][len(old_d['frame-src']):], ['https://www.google.com/recaptcha/','https://recaptcha.google.com/recaptcha/'])
        self.assertEqual(new_d['connect-src'][len(old_d['connect-src']):], ['https://www.google.com/recaptcha/'])

    def test_current_portal_keeps_the_verified_app_check_directives(self):
        def portal(config):
            return next(h['value'] for row in config['hosting']['headers'] if row['source']=='/portail.html'
                        for h in row['headers'] if h['key']=='Content-Security-Policy')
        self.assertEqual(portal(current),portal(after))

    def test_other_configuration_or_broader_origin_is_refused(self):
        for key in ['rewrites','redirects','ignore']:
            changed=copy.deepcopy(after);changed['hosting'][key]=[]
            with self.assertRaises(ValueError): policy.validate_sources(before,changed,'livepalmes-test',True,'')
        changed=json.loads(json.dumps(after).replace('https://www.google.com/recaptcha/','https://www.google.com/'))
        with self.assertRaises(ValueError): policy.validate_sources(before,changed,'livepalmes-test',True,'')
        with self.assertRaises(ValueError): policy.validate_sources(after,after,'livepalmes-test',True,'')

    def test_no_production_automatic_or_backend_mode(self):
        for args in [('livepalmes',True,''),('livepalmes-test',False,''),('livepalmes-test',True,'f'*40)]:
            with self.assertRaises(ValueError): policy.validate_sources(before,after,*args)
        policy.validate_scope(policy.FUNCTIONS_TREE, policy.APPLICATION_PATHS)
        with self.assertRaises(ValueError): policy.validate_scope('a'*40,[])
        for name in ['functions/index.js','assets/direct/admin.js','firestore.rules','storage.rules']:
            with self.assertRaises(ValueError): policy.validate_scope(policy.FUNCTIONS_TREE,[name])

    def test_real_classifier_and_ordinary_gate(self):
        env={'BASE_SHA':policy.BASELINE,'TARGET_FIREBASE_PROJECT':'livepalmes-test','APP_CHECK_CSP_HOSTING_MODE':'true','APP_CHECK_CSP_AUTOMATIC_CANDIDATE':''}
        paths=['firebase.json','assets/livepalmes-app-check.js','tools/test-app-check-csp-policy.py']
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,env), patch.object(cycle,'ROOT',Path(directory)):
            subprocess.run(['git','clone','--quiet','--bare','--shared',str(ROOT),directory],check=True)
            subprocess.run(['git','update-ref','--no-deref','HEAD',APP_CHECK_CANDIDATE],cwd=directory,check=True)
            self.assertEqual(cycle.classify_test(paths,approved_app_check_csp=True),(['assets/livepalmes-app-check.js'],False))
            for other in ['approved_top_files','approved_admin_mfa_rules','approved_direct_csp','approved_a34_session_rules']:
                with self.assertRaises(ValueError): cycle.classify_test(paths,approved_app_check_csp=True,**{other:True})
        for classifier in [cycle.classify,cycle.classify_test]:
            with self.assertRaisesRegex(ValueError,'Perimetre specifique'): classifier(['firebase.json'])

    def test_no_followup_and_readonly_final_allowed(self):
        sha='b'*40;inputs={'production_commit':'a'*40,'hosting_only':True,'approved_app_check_csp':True}
        with patch.object(coordinator,'latest',return_value=sha),patch.object(coordinator,'gh') as remote:
            self.assertEqual(coordinator.coordinate('prepare','ffessmnap/LivePalmes',sha,inputs),{'publish':True,'head':sha})
            self.assertEqual(coordinator.coordinate('prepare','ffessmnap/LivePalmes',sha,{**inputs,'verification_only':True}),{'publish':True,'head':sha})
            self.assertEqual(coordinator.coordinate('followup','ffessmnap/LivePalmes',sha,inputs),{'queued':False,'head':sha})
            for extra in [{'automatic_candidate':sha},{'hosting_only':False},{'followup_depth':1},{'approved_admin_mfa_rules':True},{'approved_a3_http_headers':True},{'dtn_extension':True}]:
                with self.assertRaises(ValueError): coordinator.coordinate('prepare','ffessmnap/LivePalmes',sha,{**inputs,**extra})
            remote.assert_not_called()

    def test_workflow_default_off_and_guard_before_google(self):
        script="const fs=require('node:fs'),yaml=require('./tests/firestore-rules/node_modules/yaml');console.log(JSON.stringify(yaml.parse(fs.readFileSync('.github/workflows/livepalmes-test-common.yml','utf8'))));"
        workflow=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT,text=True))
        dispatch=workflow['on']['workflow_dispatch']['inputs']
        self.assertIs(dispatch['approved_app_check_csp']['default'],False)
        steps=workflow['jobs']['test']['steps']
        scope=next(i for i,s in enumerate(steps) if s.get('id')=='scope')
        auth=next(i for i,s in enumerate(steps) if str(s.get('uses','')).startswith('google-github-actions/auth@'))
        self.assertLess(scope,auth)
        self.assertIn('approved_app_check_csp=',steps[scope]['run'])
        self.assertEqual(steps[scope]['env']['APP_CHECK_CSP_HOSTING_MODE'],'${{ inputs.hosting_only }}')

if __name__=='__main__': unittest.main()
