"""Offline dossier coverage, authentic-message references and compatible-proof decisions."""
from copy import deepcopy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dossier_tests',ROOT/'tools/prepare-release-draft.py')
draft = importlib.util.module_from_spec(spec)
spec.loader.exec_module(draft)
SOURCE = {'threadId':'00000000-0000-0000-0000-000000000001',
          'messageId':'00000000-0000-0000-0000-000000000002','text':'Fixture: this version works on TEST'}


class DossierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)/'repository'
        self.repo.mkdir()
        self.git('init','-q')
        (self.repo/'index.html').write_text('before')
        (self.repo/'public.css').write_text('before')
        self.base = self.commit('baseline')
        (self.repo/'index.html').write_text('approved')
        (self.repo/'public.css').write_text('approved')
        self.candidate = self.commit('candidate')
        self.root_patch = patch.object(draft,'ROOT',self.repo)
        self.cycle_patch = patch.object(draft.cycle,'ROOT',self.repo)
        self.root_patch.start(); self.cycle_patch.start()
        self.addCleanup(self.root_patch.stop); self.addCleanup(self.cycle_patch.stop)

    def git(self,*args):
        return subprocess.check_output(['git',*args],cwd=self.repo,stderr=subprocess.DEVNULL,text=True).strip()

    def commit(self,title):
        self.git('add','.')
        self.git('-c','user.name=Offline fixture','-c','user.email=fixture@example.invalid','commit','-qm',title)
        return self.git('rev-parse','HEAD')

    def record(self,**overrides):
        return {'title':'Approved fixture','commits':[self.candidate],'status':'validated',
                'validation':SOURCE['text'],'source':SOURCE,'validatedCandidate':self.candidate,**overrides}

    def proof(self,candidate=None):
        candidate = candidate or self.candidate
        return {'candidate':candidate,'verification':{'schema':1,'candidate':candidate,
                'suite':'verify-livepalmes','result':'success'}}

    def state(self):
        return {'hosting':{'name':'releases/fixture','version':'sites/livepalmes/versions/before',
                           'message':'LivePalmes '+self.base+' run 11'},'functions':[]}

    def build(self,records):
        output = Path(self.temp.name)/'dossier'
        def artifact(run,name,target,workflow):
            self.assertEqual((run,name,workflow),(12,'test-proof','.github/workflows/livepalmes-test-common.yml'))
            Path(target).mkdir(parents=True)
            (Path(target)/'test-proof.json').write_text(json.dumps(self.proof()))
            return {'head_sha':self.candidate}
        def production(target):
            Path(target).mkdir(parents=True)
            (Path(target)/'baseline.json').write_text(json.dumps({'productionCommit':self.base,'productionRun':11,
                                                               'source':'verified-publication-artifacts'}))
            return self.state()
        with patch.object(draft.cycle,'artifact',side_effect=artifact), \
                patch.object(draft.cycle,'production_evidence',side_effect=production):
            blockers = draft.build(output,12,records)
        return blockers,output

    def test_full_candidate_coverage_keeps_message_references_and_no_production_approval(self):
        blockers,root = self.build([self.record()])
        self.assertEqual(blockers,[])
        value=json.loads((root/'request-draft.json').read_text())
        status=json.loads((root/'draft-status.json').read_text())
        self.assertEqual(value['candidate'],self.candidate)
        self.assertEqual(value['changes'][0]['validationSource'],SOURCE)
        self.assertFalse(status['productionApproval'])
        self.assertFalse(status['deploymentPerformed'])
        self.assertTrue(status['readyForPreflight'])
        files=json.loads((root/'full-diff.json').read_text())['files']
        self.assertEqual({f['path'] for f in files},{'index.html','public.css'})
        self.assertTrue(all(f['humanValidationCovered'] for f in files))
        decisions=json.loads((root/'proof-decisions.json').read_text())['checks']
        self.assertEqual(next(c for c in decisions if c['check']=='TEST')['mode'],'reused')
        self.assertEqual(next(c for c in decisions if c['check']=='fresh-drift')['mode'],'required')

    def test_later_change_to_approved_file_blocks_instead_of_reusing_old_approval(self):
        approved=self.candidate
        (self.repo/'public.css').write_text('changed after approval')
        self.candidate=self.commit('later change')
        changes,missing=draft.changes_from_records([self.record(commits=[approved],validatedCandidate=approved)],
                           ['index.html','public.css'],self.base,self.candidate)
        self.assertEqual(missing,['public.css'])
        self.assertEqual(changes[0]['paths'],['index.html'])
        blockers,root=self.build([self.record(commits=[approved],validatedCandidate=approved)])
        self.assertTrue(any('public.css' in b for b in blockers))
        self.assertFalse(json.loads((root/'draft-status.json').read_text())['readyForPreflight'])

    def test_newer_main_does_not_enter_frozen_test_candidate(self):
        (self.repo/'later.html').write_text('not part of the tested candidate')
        later=self.commit('newer main')
        self.assertNotEqual(later,self.candidate)
        blockers,root=self.build([self.record()])
        self.assertEqual(blockers,[])
        value=json.loads((root/'full-diff.json').read_text())
        self.assertNotIn('later.html',[f['path'] for f in value['files']])
        self.assertEqual(value['candidate'],self.candidate)

    def test_missing_human_message_ref_cannot_turn_ci_success_into_acceptance(self):
        record=self.record();record.pop('source')
        blockers,root=self.build([record])
        self.assertTrue(any('message humain' in b for b in blockers))
        self.assertFalse(json.loads((root/'draft-status.json').read_text())['productionApproval'])

    def test_future_validation_commit_and_mismatched_quote_are_rejected(self):
        (self.repo/'public.css').write_text('future')
        future=self.commit('future version')
        with self.assertRaises(subprocess.CalledProcessError):
            draft.changes_from_records([self.record(commits=[future],validatedCandidate=future)],
                                       ['public.css'],self.base,self.candidate)
        with self.assertRaises(ValueError):
            draft.changes_from_records([self.record(validation='CI is green')],
                                       ['public.css'],self.base,self.candidate)

    def test_duplicate_or_oversized_json_is_rejected(self):
        for raw in ['{"candidate":1,"candidate":2}','"'+'x'*65537+'"']:
            with self.assertRaises(ValueError): draft.bounded_json(raw)

    def test_incomplete_or_failed_test_proof_cannot_be_used(self):
        root=Path(self.temp.name)/'wrong-proof';root.mkdir()
        bad=self.proof();bad['verification']['result']='failure'
        with patch.object(draft.cycle,'artifact',return_value={'head_sha':self.candidate}), \
                patch.object(draft.cycle,'read',return_value=bad),self.assertRaises(ValueError):
            draft.build(root,12,[self.record()])

    def test_preflight_and_prerequisites_reuse_is_exact_and_never_skips_fresh_guards(self):
        root=Path(self.temp.name)/'reuse';root.mkdir()
        request={'candidate':self.candidate,'scope':'fixture'}
        state=self.state()
        for mismatch in [False,True]:
            current=deepcopy(request)
            if mismatch: current['scope']='different'
            def artifact(run,name,target,workflow):
                target=Path(target);target.mkdir(parents=True,exist_ok=True)
                if name=='release-plan':
                    for file,value in [('request.json',current),('prod-before.json',state),
                                        ('selection.json',[]),('test-proof.json',self.proof())]:
                        (target/file).write_text(json.dumps(value))
                else:
                    kind=name.removeprefix('production-prerequisites-')
                    (target/('prerequisites-'+kind+'.json')).write_text(json.dumps({
                        'schema':1,'candidate':self.candidate,'planRun':20,'kind':kind,
                        'readOnly':True,'ready':True,'missingPermissions':[]}))
                return {'head_sha':self.candidate}
            with patch.object(draft.cycle,'artifact',side_effect=artifact), \
                    patch.object(draft,'compatible_controllers'):
                result=draft.reuse_checks(root,request,state,[],{'preflightRun':20,'prerequisitesRun':21})
            self.assertEqual(result[0]['mode'],'required' if mismatch else 'reused')
            self.assertEqual(result[1]['mode'],'required' if mismatch else 'reused')
            self.assertTrue(all(c['mode']=='required' for c in result[2:]))

    def test_no_backend_approval_never_adds_a_function_silently(self):
        desired={'readNapPublicSwimmer':'2'*64,'resolveAccessUserDeletionRequest':'3'*64}
        before={'readNapPublicSwimmer':'1'*64,'resolveAccessUserDeletionRequest':'3'*64}
        state={'functions':[{'name':'projects/livepalmes/locations/europe-west1/functions/'+n,
               'commit':self.base,'state':'ACTIVE','revision':'v1','updateTime':'before'} for n in desired]}
        fn=lambda sha: desired if sha==self.candidate else before
        with patch.object(draft.cycle,'production_selection_fingerprints',side_effect=fn), \
                patch.object(draft.cycle,'backend_fingerprints',side_effect=fn):
            selected,rows=draft.backend_selection(state,self.candidate)
            self.assertEqual(selected,['readNapPublicSwimmer'])
            request={'candidate':self.candidate}
            with self.assertRaises(ValueError):
                draft.standard_request(request,{'candidate':self.candidate,'functions':[],'approval':SOURCE},
                    state,{'productionRun':11},[],{},Path(self.temp.name))
        self.assertNotIn('standardSources',request)

    def test_authorized_sources_generate_manifest_selection_and_retained_evidence(self):
        desired={'readNapPublicSwimmer':'2'*64,'resolveAccessUserDeletionRequest':'3'*64}
        old={**desired,'readNapPublicSwimmer':'1'*64}
        functions=[{'name':'projects/livepalmes/locations/europe-west1/functions/'+n,
                    'commit':self.base,'state':'ACTIVE','revision':'v1','updateTime':'before'} for n in desired]
        state={'functions':functions}
        request={'schema':1,'candidate':self.candidate,'productionCommit':self.base,
                 'productionHosting':'sites/livepalmes/versions/before','testRun':12,
                 'changes':[],'freezeTestCandidate':True}
        test={'state':{'functions':[dict(f,name=f['name'].replace('/livepalmes/','/livepalmes-test/'),
                                       commit=self.candidate if f['name'].endswith('readNapPublicSwimmer') else self.base)
                                    for f in functions]}}
        fingerprint=lambda sha: desired if sha==self.candidate else old
        baseline={'productionRun':11,'productionCommit':self.base,'source':'verified-publication-artifacts'}
        controls={k:'1'*64 for k in draft.cycle.standard_sources.CONTROL_KEYS}
        root=Path(self.temp.name)/'standard';root.mkdir()
        with patch.object(draft.cycle,'production_selection_fingerprints',side_effect=fingerprint), \
                patch.object(draft.cycle,'backend_fingerprints',side_effect=fingerprint), \
                patch.object(draft.cycle,'test_backend_fingerprints',side_effect=fingerprint), \
                patch.object(draft.cycle,'git',return_value='e'*40), \
                patch.object(draft,'controls_from_artifact',return_value=controls):
            selected=draft.standard_request(request,{'candidate':self.candidate,
                'functions':['readNapPublicSwimmer'],'approval':SOURCE},state,baseline,[],test,root)
        manifest=json.loads((root/'standard-source-manifest.json').read_text())
        self.assertEqual(selected,['readNapPublicSwimmer'])
        self.assertEqual(manifest['selected'],selected)
        self.assertEqual(manifest['approval'],SOURCE)
        self.assertEqual(manifest['inventoryCount'],2)
        self.assertEqual(manifest['newFunctions'],[])
        self.assertFalse(manifest['bindingChanges'])
        self.assertEqual(request['excludedBackendEvidence']['functions'],[])

    def test_mail_controls_need_one_authenticated_identical_before_after_pair(self):
        for condition in ['missing','changed','duplicate','valid']:
            with self.subTest(condition=condition),tempfile.TemporaryDirectory() as temp:
                root=Path(temp)
                def artifact(run,name,target,workflow):
                    target=Path(target);target.mkdir()
                    value={k:'1'*64 for k in draft.cycle.standard_sources.CONTROL_KEYS}
                    if condition=='missing': return {}
                    (target/'fixture-controls-before.json').write_text(json.dumps(value))
                    after={**value,'mailSha256':'2'*64} if condition=='changed' else value
                    (target/'fixture-controls-after.json').write_text(json.dumps(after))
                    if condition=='duplicate':
                        for part in ['before','after']:
                            (target/('other-controls-'+part+'.json')).write_text(json.dumps(value))
                    return {}
                with patch.object(draft.cycle,'artifact',side_effect=artifact):
                    if condition=='valid':
                        self.assertEqual(set(draft.controls_from_artifact(root,11)),draft.cycle.standard_sources.CONTROL_KEYS)
                    else:
                        with self.assertRaises(ValueError): draft.controls_from_artifact(root,11)

    def test_workflow_remains_read_only_and_never_dispatches_a_publication(self):
        text=(ROOT/'.github/workflows/livepalmes-release-draft.yml').read_text()
        self.assertIn('actions: read',text)
        self.assertNotIn('actions: write',text)
        self.assertNotIn('google-github-actions/auth',text)
        self.assertNotIn('gh workflow run',text)
        self.assertNotIn('firebase deploy',text)
        self.assertIn('proof-decisions.json',text)
        self.assertIn('full-diff.json',text)
        self.assertIn('if: always()',text)

    def test_cli_rejects_blocked_dossier_after_preserving_its_summary(self):
        root=Path(self.temp.name)/'cli'
        root.mkdir()
        (root/'SUMMARY.md').write_text('fixture diagnostic',encoding='utf-8')
        for blockers,expected in [([],0),(['Missing dependency or validation'],2)]:
            summary=root/'step.md'
            with patch.dict(os.environ,{'VALIDATIONS_JSON':'[]','TEST_RUN':'12',
                    'SOURCES_AUTHORIZATION_JSON':'','REUSE_EVIDENCE_JSON':'{}','GITHUB_STEP_SUMMARY':str(summary)}), \
                 patch.object(draft.sys,'argv',['prepare-release-draft.py',str(root)]), \
                 patch.object(draft,'build',return_value=blockers):
                self.assertEqual(draft.main(),expected)
                self.assertIn('fixture diagnostic',summary.read_text())


if __name__ == '__main__':
    unittest.main()
