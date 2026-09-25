"""Offline safety scenarios for the reusable release circuit."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('cycle',Path(__file__).parents[1]/'tools/release-cycle.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ReleaseTests(unittest.TestCase):
    def test_workflow_keeps_only_writer_behind_approval(self):
        workflows=Path(__file__).parents[1]/'.github/workflows'
        preflight=(workflows/'livepalmes-production-preflight.yml').read_text()
        release=(workflows/'livepalmes-production-release.yml').read_text()
        self.assertNotIn('environment: production',preflight)
        self.assertNotIn('FIREBASE_SERVICE_ACCOUNT',preflight)
        self.assertNotIn('google-github-actions',preflight)
        self.assertIn('environment: production',release)
        self.assertLess(release.index('Relire TEST avant toute ecriture PROD'),release.index('Sauvegarder le code PROD'))
        self.assertLess(release.index('Verifier que PROD correspond encore au bilan'),release.index('Publier les Functions'))

    def test_production_evidence_preserves_unselected_commit(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            before=[{'name':'functions/one','commit':'b'*40},{'name':'functions/two','commit':'c'*40}]
            m.write(root/'production-plan/request.json',{'candidate':'a'*40})
            m.write(root/'production-plan/prod-before.json',{'functions':before})
            m.write(root/'production-plan/selection.json',['one'])
            m.write(root/'production-state/production-after.json',{'candidate':'a'*40,'errors':[], 'functions':[{'name':f['name'],'state':'ACTIVE','revision':'r','updateTime':'now'} for f in before]})
            m.write(root/'production-hosting/production-hosting-after.json',{'name':'release','version':'version'})
            with patch.object(m,'latest_run',return_value=12),patch.object(m,'artifact'),patch.object(m,'snapshot') as google:
                result=m.production_evidence(root);google.assert_not_called()
            self.assertEqual([f['commit'] for f in result['functions']],['a'*40,'c'*40])
            self.assertEqual(result['hosting']['message'],'LivePalmes '+'a'*40+' run 12')

    def test_freeze_reduces_only_functions_with_equal_code(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);r=self.request();m.write(root/'request.json',r);m.write(root/'selection.json',['one','two'])
            state={'hosting':{'version':r['productionHosting'],'message':'LivePalmes '+r['productionCommit']+' run 12'},'functions':[{'name':'functions/one'},{'name':'functions/two'}]}
            with patch.object(m,'production_evidence',return_value=state),patch.object(m,'needs_function',side_effect=[False,True]),patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary')}):
                m.freeze_plan(root,evidence=True)
            self.assertEqual(m.read(root/'selection.json'),['two'])

    def test_unchanged_backend_can_keep_older_commit(self):
        fn={'state':'ACTIVE','commit':'b'*40}
        with patch.object(m,'backend_fingerprints',return_value={'one':'same'}):
            self.assertFalse(m.needs_function(fn,'one','a'*40))
        with patch.object(m,'backend_fingerprints',side_effect=[{'one':'old'},{'one':'new'}]):
            self.assertTrue(m.needs_function(fn,'one','a'*40))
        self.assertTrue(m.needs_function({'state':'FAILED'},'one','a'*40))
        self.assertTrue(m.needs_function({'state':'ACTIVE','commit':None},'one','a'*40))

    def test_readonly_plan_never_calls_google(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r)
            m.write(Path(d)/'test/test-proof.json',{'candidate':r['candidate'],'state':{'revision':'published'}})
            with patch.object(m,'artifact',return_value={'head_sha':r['candidate']}),patch.object(m,'snapshot') as google:
                m.verify_test(d,live=False);google.assert_not_called()

    def test_verification_only_plan_cannot_publish(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();r['verificationOnly']=True;m.write(Path(d)/'request.json',r)
            with patch.object(m,'artifact'),self.assertRaisesRegex(ValueError,'publication interdite'):
                m.fetch_plan('12','0',d)

    def test_latest_failed_production_does_not_use_older_success(self):
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(m,'gh',return_value={'workflow_runs':[{'id':2,'status':'completed','conclusion':'failure'},{'id':1,'status':'completed','conclusion':'success'}]}),self.assertRaises(ValueError):
            m.latest_run('livepalmes-production-release.yml')

    def test_test_diagnostic_does_not_replace_deployment_proof(self):
        with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(m,'gh',return_value={'workflow_runs':[{'id':2,'display_title':'Verification TEST sans deploiement','status':'completed','conclusion':'success'},{'id':1,'status':'completed','conclusion':'success'}]}):
            self.assertEqual(m.latest_run('livepalmes-test-common.yml'),1)

    def test_unselected_test_change_blocks_hosting(self):
        with tempfile.TemporaryDirectory() as d:
            f={'name':'projects/livepalmes-test/locations/europe-west1/functions/one','revision':'old'}
            m.write(Path(d)/'test-before.json',{'functions':[f]});m.write(Path(d)/'test-selection.json',[])
            with patch.object(m,'snapshot',return_value={'functions':[{**f,'revision':'unexpected'}]}),self.assertRaisesRegex(ValueError,'non selectionnee'):
                m.check_test(d,'.')

    def test_pdf_extension_needs_specific_approval_and_exact_pair(self):
        for names, approval in [(['sendEmails'], 'accord'), (['closeDueEngagementCompetitions'], 'accord'), (list(m.PDF_FUNCTIONS), '')]:
            with self.assertRaises(ValueError):
                m.approved_pdf_functions({'additionalPdfFunctions': names, 'additionalPdfApproval': approval})
        self.assertEqual(set(m.approved_pdf_functions({'additionalPdfFunctions': list(m.PDF_FUNCTIONS), 'additionalPdfApproval': 'Antoine, Infra 25 septembre'})), m.PDF_FUNCTIONS)
    def test_test_staging_respects_external_destination(self):
        with tempfile.TemporaryDirectory() as d:
            candidate=Path(d)/'candidate'; candidate.mkdir()
            destination=Path(d)/'.firebase-test-functions'
            (destination/'functions').mkdir(parents=True)
            (destination/'functions/index.js').write_text('exports.example = {};')
            with patch.object(m.subprocess,'run') as command:
                m.stage(str(candidate),'livepalmes-test',str(destination),'a'*40)
            self.assertEqual(command.call_args.args[0][-1],str(destination))
            self.assertFalse((candidate/'.firebase-test-functions').exists())
            self.assertIn('livepalmes-commit',(destination/'functions/index.js').read_text())
    def request(self):
        return {'schema':1,'candidate':'a'*40,'productionCommit':'b'*40,'productionHosting':'sites/livepalmes/versions/example','testRun':12,'changes':[{'title':'Affichage','status':'validated','validation':'Antoine, retour sur le commit teste','paths':['portail.html']}]}
    def test_ui_does_not_select_backend(self):
        self.assertFalse(m.validate_request(self.request(),['portail.html','docs/example.md']))
    def test_unvalidated_work_blocks_release(self):
        value=self.request();value['changes'][0]['status']='in-progress'
        with self.assertRaises(ValueError):m.validate_request(value,['portail.html'])
    def test_unlisted_application_change_blocks_release(self):
        with self.assertRaises(ValueError):m.validate_request(self.request(),['portail.html','assets/extra.js'])
    def test_rules_indexes_and_data_need_separate_authorization(self):
        for path in ['firestore.rules','firestore.indexes.json','firebase.json','performances/public/data/records-data.js','archives/result.json']:
            with self.subTest(path=path),self.assertRaises(ValueError):m.classify([path])
    def test_backend_requires_review_of_excluded_functions(self):
        value=self.request();value['changes'][0]['paths']=['functions/index.js']
        with self.assertRaises(ValueError):m.validate_request(value,['functions/index.js'])
        value['excludedBackendReview']='Analyse des fonctions de mail et schedulers : aucun changement a publier'
        self.assertTrue(m.validate_request(value,['functions/index.js']))
    def test_changed_production_blocks_publication(self):
        with tempfile.TemporaryDirectory() as d:
            m.write(Path(d)/'prod-before.json',{'version':'old'})
            with patch.object(m,'snapshot',return_value={'version':'new'}),self.assertRaises(ValueError):m.compare_prod(d)
    def test_wrong_test_commit_blocks_plan(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r)
            m.write(Path(d)/'test/test-proof.json',{'candidate':'c'*40,'state':{}})
            with patch.object(m,'artifact',return_value={'head_sha':'a'*40}),self.assertRaises(ValueError):m.verify_test(d)
    def test_changed_test_snapshot_blocks_plan(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r)
            m.write(Path(d)/'test/test-proof.json',{'candidate':'a'*40,'state':{'revision':'old'}})
            with patch.object(m,'artifact',return_value={'head_sha':'a'*40}),patch.object(m,'snapshot',return_value={'revision':'new'}),self.assertRaises(ValueError):m.verify_test(d)
    def test_cli_zero_with_missing_function_is_failure(self):
        with tempfile.TemporaryDirectory() as d:
            m.write(Path(d)/'selection.json',['one']);m.write(Path(d)/'credentials.json',{'project_id':'livepalmes'})
            with patch.dict(os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(Path(d)/'credentials.json'),'CANDIDATE_SHA':'a'*40}),patch.object(m,'safe_functions',return_value=['one']),patch.object(m.subprocess,'run') as command,patch.object(m,'snapshot',return_value={'functions':[]}),patch.object(m.time,'sleep'),self.assertRaises(ValueError):
                m.deploy_batches('livepalmes',d,d,str(Path(d)/'selection.json'),False)
            self.assertEqual(command.call_count,1)
    def test_batches_limited_to_ten_and_exclude_unsafe_functions(self):
        names=['fn'+str(i) for i in range(23)]
        with tempfile.TemporaryDirectory() as d:
            m.write(Path(d)/'selection.json',names);m.write(Path(d)/'credentials.json',{'project_id':'livepalmes'})
            with patch.dict(os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(Path(d)/'credentials.json'),'CANDIDATE_SHA':'a'*40}),patch.object(m,'safe_functions',return_value=names),patch.object(m.subprocess,'run') as command:
                m.deploy_batches('livepalmes',d,d,str(Path(d)/'selection.json'),True)
                self.assertEqual(command.call_count,3)
                for call in command.call_args_list:
                    args=call.args[0];self.assertIn('--dry-run',args)
                    self.assertLessEqual(len(args[args.index('--only')+1].split(',')),10)
            m.write(Path(d)/'selection.json',['sendEmails'])
            with patch.dict(os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(Path(d)/'credentials.json')}),patch.object(m,'safe_functions',return_value=names),self.assertRaises(ValueError):
                m.deploy_batches('livepalmes',d,d,str(Path(d)/'selection.json'),False)
    def test_tampered_artifact_not_extracted(self):
        metadata={'id':1,'name':'release-plan','expired':False,'digest':'sha256:'+'0'*64,'workflow_run':{'id':12}}
        responses=[{'status':'completed','head_branch':'main','run_attempt':1},{'artifacts':[metadata]},metadata]
        with tempfile.TemporaryDirectory() as d,patch.dict(os.environ,{'GITHUB_REPOSITORY':'ffessmnap/LivePalmes'}),patch.object(m,'gh',side_effect=responses),patch.object(m.subprocess,'check_output',return_value=b'tampered'),self.assertRaises(ValueError):
            m.artifact(12,'release-plan',d)
    def test_production_functions_unchanged_by_ui_plan(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r);m.write(Path(d)/'paths.json',['portail.html'])
            with patch.object(m,'safe_functions') as backend:
                m.prepare_selection(d,'.');backend.assert_not_called()
            self.assertEqual(m.read(Path(d)/'selection.json'),[])

if __name__=='__main__':unittest.main()
