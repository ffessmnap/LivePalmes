"""Closed CSP scope, immutable baselines and publication refusals; no remote services."""
import base64,copy,hashlib,importlib.util,json,os,re,subprocess,unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
policy=load('direct_csp_policy','test-direct-csp-policy.py')
cycle=load('direct_csp_cycle','release-cycle.py')
coordinate=load('direct_csp_coordinate','coordinate-test-publication.py')
before=json.loads(subprocess.check_output(['git','show',policy.BASELINE+':firebase.json'],cwd=ROOT))
after=json.loads((ROOT/'firebase.json').read_text(encoding='utf8'))

class DirectCspTests(unittest.TestCase):
    def test_complete_config_changes_only_five_csp_headers(self):
        policy.validate_sources(before,after,'livepalmes-test',True,'',False)
        restored=copy.deepcopy(after);changed=[]
        for row in restored['hosting']['headers']:
            if row['source'] in ['/','/index.html','/direct.html','/direct-admin.html','/direct-consoles.html']:
                matches=[h for h in row['headers'] if h['key']=='Content-Security-Policy']
                self.assertEqual(len(matches),1)
                value=matches[0]['value'];script=next(s for s in value.split(';') if s.strip().startswith('script-src'))
                self.assertNotIn("'unsafe-inline'",script);self.assertNotIn("'unsafe-eval'",script)
                self.assertIn("object-src 'none'",value);self.assertIn("base-uri 'self'",value)
                row['headers'].remove(matches[0]);changed.append(row['source'])
        self.assertEqual(len(changed),5);self.assertEqual(restored,before)
    def test_bootstrap_hash_is_exact_and_script_sources_are_known(self):
        for page in ['index.html','direct.html','direct-admin.html','direct-consoles.html']:
            source=(ROOT/page).read_text(encoding='utf8')
            csp=next(h['value'] for row in after['hosting']['headers'] if row['source']=='/'+page for h in row['headers'] if h['key']=='Content-Security-Policy')
            for attrs,body in re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>',source):
                src=re.search(r'\bsrc="([^"]+)"',attrs)
                if src:self.assertTrue(src[1].startswith(('assets/','/assets/','https://www.gstatic.com/firebasejs/')))
                else:self.assertIn("'sha256-"+base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()+"'",csp)
    def test_other_configuration_and_privilege_changes_are_refused(self):
        for key in ['rewrites','ignore','redirects']:
            changed=copy.deepcopy(after);changed['hosting'][key]=[]
            with self.assertRaises(ValueError):policy.validate_sources(before,changed,'livepalmes-test',True,'',False)
        for change in [('livepalmes',True,'',False),('livepalmes-test',False,'',False),('livepalmes-test',True,'a'*40,False),('livepalmes-test',True,'',True)]:
            with self.assertRaises(ValueError):policy.validate_sources(before,after,*change)
        changed=copy.deepcopy(after);changed['hosting']['headers'][0]['source']='/**'
        with self.assertRaises(ValueError):policy.validate_sources(before,changed,'livepalmes-test',True,'',False)
    def test_classifier_allows_only_closed_config_and_tooling(self):
        env={'BASE_SHA':policy.BASELINE,'TARGET_FIREBASE_PROJECT':'livepalmes-test','DIRECT_CSP_HOSTING_MODE':'true'}
        def git(*args):
            if args==('show',policy.BASELINE+':firebase.json'):return json.dumps(before)
            if args==('show','HEAD:firebase.json'):return json.dumps(after)
            raise AssertionError(args)
        with patch.dict(os.environ,env,clear=True),patch.object(cycle,'git',side_effect=git):
            self.assertEqual(cycle.classify_test(['firebase.json','tools/test-direct-csp-policy.py'],approved_direct_csp=True),([],False))
            for paths in [['firebase.json','assets/direct/public.js'],['firebase.json','functions/index.js'],['firebase.json','firestore.rules']]:
                with self.assertRaises(ValueError):cycle.classify_test(paths,approved_direct_csp=True)
            for other in ['approved_a34_session_rules','approved_a3_http_headers','approved_top_files','approved_static_asset_cache']:
                with self.assertRaises(ValueError):cycle.classify_test(['firebase.json'],approved_direct_csp=True,**{other:True})
    def test_no_automatic_followup_mixed_approval_or_dry_run(self):
        candidate='b'*40;inputs={'production_commit':'a'*40,'hosting_only':True,'approved_direct_csp':True}
        with patch.object(coordinate,'latest',return_value=candidate),patch.object(coordinate,'gh') as remote:
            self.assertEqual(coordinate.coordinate('prepare','ffessmnap/LivePalmes',candidate,inputs),{'publish':True,'head':candidate})
            self.assertEqual(coordinate.coordinate('followup','ffessmnap/LivePalmes',candidate,inputs),{'queued':False,'head':candidate})
            for change in [{'automatic_candidate':candidate},{'hosting_only':False},{'verification_only':True},{'approved_a3_http_headers':True},{'dtn_extension':True}]:
                with self.assertRaises(ValueError):coordinate.coordinate('prepare','ffessmnap/LivePalmes',candidate,{**inputs,**change})
            remote.assert_not_called()
    def test_ordinary_and_production_configuration_gates_remain_closed(self):
        for classifier in [cycle.classify,cycle.classify_test]:
            with self.assertRaisesRegex(ValueError,'Perimetre specifique'):classifier(['firebase.json'])

if __name__=='__main__':unittest.main()
