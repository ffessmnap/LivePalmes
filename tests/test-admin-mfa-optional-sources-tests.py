"""Optional TEST source return: authentic origin, closed scope, no live calls."""
from copy import deepcopy
import hashlib,importlib.util,json,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('optional_mfa_tests',ROOT/'tools/publish-test-admin-mfa-optional.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class OptionalSources(unittest.TestCase):
    def test_contract_is_separate_sealed_and_test_only(self):
        value=p.contract();self.assertEqual((len(value['allowedFunctions']),len(value['installedFunctions'])),(111,121))
        self.assertEqual(value['rulesSha256'],p.previous.contract()['rulesBeforeSha256'])
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'contract.json'
            for change in [{'project':'livepalmes'},{'phase':'enforce-admin-full-mfa'},{'baseCommit':'a'*40},
                           {'allowedFunctions':value['allowedFunctions'][:-1]}, {'rulesSha256':'f'*64},
                           {'toolingPaths':['functions/index.js']}, {'approval':{**value['approval'],'messageId':'a'*36}}]:
                v={**value,**change};v.pop('_contractSha256');raw=(json.dumps(v)+'\n').encode();path.write_bytes(raw)
                with patch.object(p,'CONTRACT',path),patch.object(p,'CONTRACT_SHA256',hashlib.sha256(raw).hexdigest()),self.assertRaises(ValueError):p.contract()
            path.write_bytes(p.CONTRACT.read_bytes()+b' ')
            with patch.object(p,'CONTRACT',path),self.assertRaises(ValueError):p.contract()
        for release in ['standard','admin_mfa_enforcement']:
            with self.assertRaises(ValueError):p.contract(release)

    def test_tooling_contract_covers_the_integrated_stabilization(self):
        # Frozen integrated candidate: a future application may intentionally
        # leave this closed contract, without invalidating its historical proof.
        entry=p.contract()
        paths=p.publisher.subprocess.check_output(['git','diff','--name-only','--no-renames',entry['applicationCommit'],'2176fb2c3e7558405b7942cadac28f169657dd11'],cwd=ROOT,text=True).splitlines()
        self.assertTrue(set(paths)<=set(entry['toolingPaths']),set(paths)-set(entry['toolingPaths']))
        self.assertEqual(p.publisher.subprocess.check_output(['git','diff','--name-only',entry['applicationCommit'],'2176fb2c3e7558405b7942cadac28f169657dd11','--','functions/'],cwd=ROOT,text=True),'')

    def fixture(self,root,mutate=lambda proof:None):
        entry=p.contract();base=entry['baseCommit'];names=entry['allowedFunctions']
        rows=[dict(name=p.PREFIX+n,commit=base if n in names else 'a'*40,state='ACTIVE',revision=n+'-r1',updateTime='2026-11-18T15:00:00Z') for n in entry['installedFunctions']]
        proof=dict(candidate=base,release=p.previous.RELEASE,contractSha256=p.previous.CONTRACT_SHA256,selected=names,
                   controlsBefore={'control':'preserved'},controlsAfter={'control':'preserved'},taskContentsRead=False,
                   currentTestState={'functions':rows,'hosting':{'version':entry['baselineHostingVersion']}},
                   **{k:True for k in ['configurationsUnchanged','otherFunctionsUnchanged','hostingUnchanged','controlsUnchanged']})
        mutate(proof);raw=json.dumps(proof).encode();entry=deepcopy(entry);entry['baselineRuns'][0]['fileSha256']=hashlib.sha256(raw).hexdigest();row=entry['baselineRuns'][0]
        metadata=dict(id=row['artifactId'],name=row['artifact'],expired=False,digest='sha256:'+row['artifactSha256'],workflow_run={'id':row['id']})
        run=dict(id=row['id'],head_sha=base,event='workflow_dispatch',head_branch='main',path=p.WORKFLOW,run_attempt=1,status='completed',conclusion='success',repository={'full_name':p.REPOSITORY},head_repository={'full_name':p.REPOSITORY})
        def artifact(run_id,name,target,workflow):
            self.assertEqual((run_id,name,workflow),(row['id'],row['artifact'],p.WORKFLOW));target.mkdir(parents=True,exist_ok=True);(target/'test-backend-proof.json').write_bytes(raw);return run
        api=SimpleNamespace(gh=Mock(return_value=metadata),artifact=Mock(side_effect=artifact))
        return entry,proof,metadata,run,api,{p.PREFIX+n for n in names}

    def test_baseline_authenticates_all_121_and_all_111_source_archives(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);entry,proof,meta,run,api,proven=self.fixture(root)
            with patch.object(p,'current_rules'),patch.object(p,'cycle',api),patch.object(p.previous,'trusted_revisions',return_value=proven):
                self.assertEqual(p.authenticated_baseline(entry,root),proof['currentTestState'])
                meta['expired']=True
                with self.assertRaises(ValueError):p.authenticated_baseline(entry,root)
                meta['expired']=False
                for key,value in [('conclusion','failure'),('head_sha','b'*40),('event','push'),('run_attempt',2)]:
                    old=run[key];run[key]=value
                    with self.assertRaises(ValueError):p.authenticated_baseline(entry,root)
                    run[key]=old
                entry['baselineRuns'][0]['fileSha256']='f'*64
                with self.assertRaises(ValueError):p.authenticated_baseline(entry,root)
            entry,proof,meta,run,api,proven=self.fixture(root)
            with patch.object(p,'current_rules'),patch.object(p,'cycle',api),patch.object(p.previous,'trusted_revisions',return_value=proven-{p.PREFIX+entry['allowedFunctions'][0]}),self.assertRaises(ValueError):p.authenticated_baseline(entry,root)

    def test_controls_missing_function_or_foreign_hosting_refuse_origin(self):
        mutations=[lambda v:v['controlsAfter'].update(control='changed'),lambda v:v.update(configurationsUnchanged=False),lambda v:v.update(taskContentsRead=True),lambda v:v['currentTestState']['functions'].pop(),lambda v:v['currentTestState']['hosting'].update(version='sites/livepalmes/versions/foreign')]
        with tempfile.TemporaryDirectory() as directory:
            for mutate in mutations:
                root=Path(directory);entry,proof,meta,run,api,proven=self.fixture(root,mutate)
                with patch.object(p,'current_rules'),patch.object(p,'cycle',api),patch.object(p.previous,'trusted_revisions',return_value=proven),self.assertRaises(ValueError):p.authenticated_baseline(entry,root)

    def test_wrong_workflow_or_mixed_release_refused_before_transport(self):
        env=dict(GITHUB_REPOSITORY=p.REPOSITORY,RELEASE=p.RELEASE,GITHUB_WORKFLOW_REF=p.REPOSITORY+'/'+p.WORKFLOW+'@refs/heads/main',GITHUB_EVENT_NAME='workflow_dispatch')
        for change in [{'GITHUB_REPOSITORY':'other/repo'},{'RELEASE':'admin_mfa_enforcement'},{'GITHUB_WORKFLOW_REF':'other'},{'GITHUB_EVENT_NAME':'push'},{'STANDARD_SOURCE_REQUEST':'{}'}]:
            with patch.object(p.previous,'_original_guard') as transport,self.assertRaises(ValueError):p.guard(ROOT,{},dict(env,**change))
            transport.assert_not_called()
        for mode in ['rollback','delete','recover']:
            with self.assertRaises(ValueError):p.main(mode,p.RELEASE,ROOT,ROOT)

    def test_complete_selection_cannot_be_reduced_or_include_one_extra_function(self):
        entry=p.contract();names=entry['allowedFunctions'];before=[dict(name=p.PREFIX+n) for n in entry['installedFunctions']]
        rows=[dict(shortName=n,changed=n in names,after=entry['fingerprints'].get(n,'')) for n in entry['installedFunctions']]
        with patch.object(p.previous,'qualify_selection',return_value=rows),patch.object(p.publisher,'runtime'):
            self.assertEqual(p.select(before,'a'*40,entry),names)
            rows[0]['changed']=not rows[0]['changed']
            with self.assertRaises(ValueError):p.select(before,'a'*40,entry)
        with self.assertRaises(ValueError):p.select(before[:-1],'a'*40,entry)

    def test_common_locked_install_precedes_classification_and_google(self):
        script="const fs=require('node:fs'),yaml=require('./tests/firestore-rules/node_modules/yaml');console.log(JSON.stringify(yaml.parse(fs.readFileSync('.github/workflows/livepalmes-test-common.yml','utf8')).jobs.test.steps));"
        steps=json.loads(p.publisher.subprocess.check_output(['node','-e',script],cwd=ROOT,text=True))
        installs=[i for i,s in enumerate(steps) if 'npm ci --prefix tests/firestore-rules' in s.get('run','')]
        classify=next(i for i,s in enumerate(steps) if 'classify_test(' in s.get('run',''))
        google=next(i for i,s in enumerate(steps) if s.get('uses','').startswith('google-github-actions/auth@'))
        self.assertEqual(len(installs),1);self.assertLess(installs[0],classify);self.assertLess(classify,google)

    def test_rules_drift_blocks_without_any_write(self):
        entry=p.contract();reader=SimpleNamespace(rules=Mock(return_value={'sha256':entry['rulesSha256']}))
        with patch.object(p.publisher,'credential_identity') as identity,patch.object(p.cycle,'run',return_value='synthetic-token'),patch.object(p,'load',return_value=reader):
            p.current_rules(entry);identity.assert_called_once();reader.rules.assert_called_once_with('synthetic-token')
            reader.rules.return_value={'sha256':'f'*64}
            with self.assertRaises(ValueError):p.current_rules(entry)

    def test_workflow_keeps_closed_flags_source_transport_and_rules_read_only(self):
        script="const fs=require('node:fs'),yaml=require('./tests/firestore-rules/node_modules/yaml');console.log(JSON.stringify(yaml.parse(fs.readFileSync('.github/workflows/livepalmes-test-mail-sources.yml','utf8'))));"
        v=json.loads(p.publisher.subprocess.check_output(['node','-e',script],cwd=ROOT,text=True));job=v['jobs']['sources'];steps=job['steps']
        self.assertIn('admin_mfa_optional',v['on']['workflow_dispatch']['inputs']['release']['options'])
        self.assertIn("inputs.release == 'admin_mfa_optional' && (inputs.identity_only || inputs.recover_models || inputs.standard_request != '')",job['if'])
        self.assertIn("inputs.release == 'admin_mfa_optional' && 'publish-test-admin-mfa-optional.py'",job['env']['SOURCE_TOOL'])
        source=(ROOT/'tools/publish-test-admin-mfa-optional.py').read_text()
        self.assertIn("load('test-portal-session-rules.py').rules(token)",source)
        self.assertNotIn("'PATCH'",source)
        self.assertIn('admin_mfa_optional',job['timeout-minutes']);self.assertEqual(v['concurrency']['group'],'livepalmes-test-backend')

if __name__=='__main__':unittest.main()
