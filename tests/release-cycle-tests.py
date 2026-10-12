"""Offline safety scenarios for the reusable release circuit."""
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('cycle',Path(__file__).parents[1]/'tools/release-cycle.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ReleaseTests(unittest.TestCase):
    def setUp(self):
        # Offline scenarios must not inherit the release request of the CI runner.
        environment = patch.dict(os.environ)
        environment.start()
        self.addCleanup(environment.stop)
        os.environ.pop('PLAN', None)

    def test_test_deploy_retries_only_prepublication_list_failure(self):
        class Cli:
            def __init__(self, code, output): self.code, self.stdout = code, io.StringIO(output)
            def __enter__(self): return self
            def __exit__(self, *args): self.stdout.close()
            def wait(self): return self.code
        command = ['firebase', 'deploy', '--project', 'livepalmes-test', '--only', 'functions:one']
        message = '\x1b[31mError:\x1b[39m Failed to list functions for livepalmes-test\n'
        with patch.object(m.subprocess, 'Popen', side_effect=[Cli(1,message),Cli(0,'Done\n')]) as run, patch.object(m.time,'sleep') as pause:
            m.deploy_command(command,'livepalmes-test')
            self.assertEqual(run.call_count,2); pause.assert_called_once_with(20)
            self.assertEqual(run.call_args_list[0].args,run.call_args_list[1].args)
        with patch.object(m.subprocess,'Popen',side_effect=[Cli(1,message) for _ in range(3)]) as run, patch.object(m.time,'sleep') as pause, self.assertRaises(m.subprocess.CalledProcessError):
            m.deploy_command(command,'livepalmes-test')
        self.assertEqual(run.call_count,3); self.assertEqual([c.args[0] for c in pause.call_args_list],[20,40])
        for error in ['Error: Permission denied\n','i functions: functions source uploaded successfully\n'+message,'i functions: updating Node.js function one\n'+message]:
            with patch.object(m.subprocess,'Popen',return_value=Cli(1,error)) as run, patch.object(m.time,'sleep') as pause, self.assertRaises(m.subprocess.CalledProcessError):
                m.deploy_command(command,'livepalmes-test')
            self.assertEqual(run.call_count,1); pause.assert_not_called()
        with patch.object(m.subprocess,'run',side_effect=m.subprocess.CalledProcessError(1,command)) as run, patch.object(m.subprocess,'Popen') as streamed, self.assertRaises(m.subprocess.CalledProcessError):
            m.deploy_command(command,'livepalmes')
        self.assertEqual(run.call_count,1); streamed.assert_not_called()

    def test_native_resolution_is_safe_only_in_test(self):
        root=Path(__file__).parents[1]
        self.assertIn('resolveEngagementSwimmerChangeRequest',m.safe_functions(root,'livepalmes-test'))
        self.assertNotIn('resolveEngagementSwimmerChangeRequest',m.safe_functions(root,'livepalmes'))
        self.assertNotIn('resolveEngagementSwimmerChangeRequest',m.safe_functions(root))

    def test_native_notification_previews_never_extend_production_scope(self):
        root=Path(__file__).parents[1]
        test_scope=m.safe_functions(root,'livepalmes-test')
        production_scope=m.safe_functions(root,'livepalmes')
        for name in ['notifyEngagementCompetitionDocuments','listEngagementCompetitionMailJobs',
                     'prepareEngagementOpeningNotificationEmails','prepareEngagementClubRecapEmails','sendEngagementPreparedEmails']:
            self.assertIn(name,test_scope)
            self.assertNotIn(name,production_scope)
        for name in ['closeDueEngagementCompetitions','resolveEngagementAccessRequest']:
            self.assertNotIn(name,m.safe_functions(root,'livepalmes-test'))
        with self.assertRaises(ValueError):m.safe_functions(root,'unknown')
    def test_reuse_only_successful_verification_of_exact_candidate(self):
        candidate='a'*40
        evidence={'candidate':candidate,'verification':{'schema':1,'candidate':candidate,'suite':'verify-livepalmes','result':'success'}}
        self.assertTrue(m.reusable_verification(evidence,candidate))
        self.assertFalse(m.reusable_verification(evidence,'b'*40))
        self.assertFalse(m.reusable_verification({'candidate':candidate},candidate))
        for key,value in [('schema',2),('candidate','b'*40),('suite','partial'),('result','failure')]:
            altered={**evidence,'verification':{**evidence['verification'],key:value}}
            self.assertFalse(m.reusable_verification(altered,candidate))

    def test_reuse_flag_comes_from_verified_plan_not_request(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);request=self.request();request['verified']=True
            m.write(root/'request.json',request);m.write(root/'selection.json',[])
            with patch.object(m,'artifact') as verified_artifact,patch.object(m,'output') as out:
                m.fetch_plan('12','0',d)
            verified_artifact.assert_called_once_with('12','release-plan',root,'.github/workflows/livepalmes-production-preflight.yml')
            self.assertEqual(out.call_args.kwargs['verified'],'false')
            m.write(root/'test-proof.json',{'candidate':request['candidate'],'verification':{'schema':1,'candidate':request['candidate'],'suite':'verify-livepalmes','result':'success'}})
            with patch.object(m,'artifact'),patch.object(m,'output') as out:
                m.fetch_plan('12','0',d)
            self.assertEqual(out.call_args.kwargs['verified'],'true')

    def function(self, name, commit='b'*40):
        return {'name': 'projects/livepalmes-test/locations/europe-west1/functions/' + name,
                'state': 'ACTIVE', 'commit': commit, 'revision': 'revision-' + name, 'updateTime': 'now'}

    def test_test_selection_reuses_per_function_despite_other_drift(self):
        one, two, nap = [self.function(n) for n in ['one', 'two', 'nap']]
        original = {'hosting': {'version': 'old'}, 'functions': [one, two, nap]}
        state = {'hosting': {'version': 'new'}, 'functions': [one, two, {**nap, 'revision': 'changed'}]}
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m.write(root/'previous-test/test-proof.json', {'state': original})
            with patch.dict(os.environ, {'CANDIDATE_SHA': 'a'*40, 'GITHUB_RUN_ID': '13'}), patch.object(m, 'snapshot', return_value=state), patch.object(m, 'latest_run', return_value=12), patch.object(m, 'artifact'), patch.object(m, 'targeted_test_evidence', return_value=set()), patch.object(m, 'safe_functions', return_value=['one', 'two']), patch.object(m, 'needs_function', side_effect=[True, False]), patch.object(m, 'output'):
                m.test_selection(d, '.')
            self.assertEqual(m.read(root/'test-selection.json'), ['one'])
            state['functions'][1] = {**two, 'revision': 'unproven'}
            with patch.dict(os.environ, {'CANDIDATE_SHA': 'a'*40, 'GITHUB_RUN_ID': '13'}), patch.object(m, 'snapshot', return_value=state), patch.object(m, 'latest_run', return_value=12), patch.object(m, 'artifact'), patch.object(m, 'targeted_test_evidence', return_value=set()), patch.object(m, 'safe_functions', return_value=['one', 'two']), patch.object(m, 'needs_function', return_value=False) as comparisons, patch.object(m, 'output'):
                m.test_selection(d, '.')
            self.assertEqual(m.read(root/'test-selection.json'), ['two'])
            comparisons.assert_called_once_with(one, 'one', 'a'*40)

    def test_hosting_only_requires_proven_equivalent_backend(self):
        one = self.function('one')
        for proven, changed, allowed in [(True, False, True), (True, True, False), (False, False, False)]:
            with self.subTest(proven=proven, changed=changed), tempfile.TemporaryDirectory() as d:
                m.write(Path(d)/'previous-test/test-proof.json', {'state': {'functions': [one] if proven else []}})
                with patch.dict(os.environ, {'CANDIDATE_SHA': 'a'*40, 'GITHUB_RUN_ID': '13', 'HOSTING_ONLY': 'true'}), patch.object(m, 'snapshot', return_value={'functions': [one]}), patch.object(m, 'latest_run', return_value=12), patch.object(m, 'artifact'), patch.object(m, 'targeted_test_evidence', return_value=set()), patch.object(m, 'safe_functions', return_value=['one']), patch.object(m, 'needs_function', return_value=changed), patch.object(m, 'output') as output:
                    if allowed:
                        m.test_selection(d, '.')
                        output.assert_called_once_with(backend='false')
                    else:
                        with self.assertRaisesRegex(ValueError, 'Hosting seul refuse'):
                            m.test_selection(d, '.')
                        output.assert_not_called()
        workflow=(Path(__file__).parents[1]/'.github/workflows/livepalmes-test-common.yml').read_text(encoding='utf-8')
        self.assertIn('HOSTING_ONLY: ${{ inputs.hosting_only }}', workflow)
        selection = workflow.index('    - name: Selectionner les Functions TEST reellement differentes')
        prepare = workflow.index('    - name: Preparer le backend TEST')
        self.assertNotIn('HOSTING_ONLY:', workflow[:selection])
        self.assertIn('HOSTING_ONLY: ${{ inputs.hosting_only }}', workflow[selection:prepare])
        self.assertEqual(workflow.count("steps.selection.outputs.backend == 'true' && !inputs.verification_only && !inputs.hosting_only"), 3)

    def test_targeted_proof_restores_only_exact_live_revision(self):
        one, two = self.function('one'), self.function('two')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m.write(root/'backend-12/test-backend-proof.json', {'schema': 1, 'candidate': 'b'*40, 'state': {'functions': [one, two]}})
            runs = {'workflow_runs': [{'id': 12, 'head_sha': 'b'*40, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1}]}
            current = {'functions': [one, {**two, 'revision': 'changed'}]}
            with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value=runs), patch.object(m, 'artifact', return_value={'head_sha': 'b'*40}):
                self.assertEqual(m.targeted_test_evidence(root, current), {one['name']})
                m.write(root/'backend-12/test-backend-proof.json', {'schema': 1, 'candidate': 'c'*40, 'state': {'functions': [one]}})
                self.assertEqual(m.targeted_test_evidence(root, current), set())

    def test_unknown_proof_republishes_only_unknown_functions(self):
        one, two = self.function('one'), self.function('two')
        with tempfile.TemporaryDirectory() as d:
            with patch.dict(os.environ, {'CANDIDATE_SHA': 'a'*40, 'GITHUB_RUN_ID': '13'}), patch.object(m, 'snapshot', return_value={'functions': [one, two]}), patch.object(m, 'latest_run', side_effect=ValueError('absent')), patch.object(m, 'targeted_test_evidence', return_value={one['name']}), patch.object(m, 'safe_functions', return_value=['one', 'two']), patch.object(m, 'needs_function', return_value=False), patch.object(m, 'output'):
                m.test_selection(d, '.')
            self.assertEqual(m.read(Path(d)/'test-selection.json'), ['two'])

    def test_targeted_proof_requires_active_labelled_revision(self):
        one = self.function('one', 'a'*40)
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); (root/'selector').write_text('one')
            with patch.dict(os.environ, {'TARGET_FIREBASE_PROJECT': 'livepalmes-test', 'CANDIDATE_SHA': 'a'*40}), patch.object(m, 'snapshot', return_value={'functions': [one]}):
                m.backend_proof(root/'proof', root/'selector')
                self.assertEqual(m.read(root/'proof/test-backend-proof.json')['state']['functions'], [one])
            for bad in [{**one, 'state': 'FAILED'}, {**one, 'commit': 'b'*40}, {**one, 'revision': None}]:
                with patch.dict(os.environ, {'TARGET_FIREBASE_PROJECT': 'livepalmes-test', 'CANDIDATE_SHA': 'a'*40}), patch.object(m, 'snapshot', return_value={'functions': [bad]}), self.assertRaises(ValueError):
                    m.backend_proof(root/'proof', root/'selector')

    def test_partial_or_failed_targeted_runs_cannot_prove_revisions(self):
        one = self.function('one')
        for status, conclusion, attempt in [('in_progress', None, 1), ('completed', 'failure', 1), ('completed', 'success', 2)]:
            with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value={'workflow_runs': [{'id': 12, 'head_sha': 'b'*40, 'status': status, 'conclusion': conclusion, 'run_attempt': attempt}]}), patch.object(m, 'artifact') as artifact:
                self.assertEqual(m.targeted_test_evidence('.', {'functions': [one]}), set())
                artifact.assert_not_called()
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

    def test_targeted_workflow_records_labels_before_deploy_and_proof_after(self):
        workflow=(Path(__file__).parents[1]/'.github/workflows/livepalmes-test-backend.yml').read_text(encoding='utf-8')
        self.assertLess(workflow.index('Attester le commit'), workflow.index('Dry-run des index'))
        self.assertLess(workflow.index('Déployer uniquement les Functions'), workflow.index('Conserver les revisions'))
        self.assertIn('livepalmes-commit', workflow)
        self.assertIn('test-backend-proof', workflow)
        self.assertIn("inputs.lot != 'bootstrap' && github.ref == 'refs/heads/main'", workflow)

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
            r['excludedBackendEvidence']={};m.write(root/'request.json',r)
            with patch.object(m,'production_evidence',return_value=state),patch.object(m,'needs_function',side_effect=[False,True]),patch.object(m,'verify_excluded_backend') as review,patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary')}):
                m.freeze_plan(root,evidence=True)
                review.assert_called_once_with(root,state,['two'])
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

    def test_cancelled_test_reuses_earlier_reference_only(self):
        runs = [{'id': 3, 'status': 'completed', 'conclusion': 'cancelled'},
                {'id': 2, 'status': 'completed', 'conclusion': 'cancelled'},
                {'id': 1, 'status': 'completed', 'conclusion': 'success'}]
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value={'workflow_runs': runs}):
            self.assertEqual(m.latest_run('livepalmes-test-common.yml'), 1)
            with self.assertRaises(ValueError):
                m.latest_run('livepalmes-production-release.yml')
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value={'workflow_runs': runs[:2]}), self.assertRaises(ValueError):
            m.latest_run('livepalmes-test-common.yml')

    def test_failed_or_running_test_is_not_skipped(self):
        for status, conclusion in [('completed', 'failure'), ('in_progress', None)]:
            runs = [{'id': 2, 'status': status, 'conclusion': conclusion},
                    {'id': 1, 'status': 'completed', 'conclusion': 'success'}]
            with self.subTest(status=status), patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value={'workflow_runs': runs}), self.assertRaises(ValueError):
                m.latest_run('livepalmes-test-common.yml')

    def test_cancelled_partial_deployment_does_not_prove_changed_revision(self):
        one, two = self.function('one'), self.function('two')
        proof = {'state': {'functions': [one, two]}}
        current = {'functions': [one, {**two, 'revision': 'cancelled-partial-update'}]}
        self.assertEqual(m.matching_functions(proof, current), {one['name']})

    def test_revision_evidence_reuses_success_without_trusting_failed_or_running_run(self):
        runs = [{'id': 3, 'status': 'in_progress', 'conclusion': None},
                {'id': 2, 'status': 'completed', 'conclusion': 'failure'},
                {'id': 1, 'status': 'completed', 'conclusion': 'success'}]
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value={'workflow_runs': runs}):
            self.assertEqual(m.latest_run('livepalmes-test-common.yml', reuse_revisions=True), 1)
            with self.assertRaises(ValueError):
                m.latest_run('livepalmes-test-common.yml')
            with self.assertRaises(ValueError):
                m.latest_run('livepalmes-production-release.yml', reuse_revisions=True)
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m, 'gh', return_value={'workflow_runs': runs[:2]}), self.assertRaises(ValueError):
            m.latest_run('livepalmes-test-common.yml', reuse_revisions=True)
        one = self.function('one')
        proof = {'state': {'functions': [one]}}
        for field, value in [('revision', 'partial'), ('updateTime', 'later'), ('commit', 'c'*40), ('state', 'FAILED')]:
            self.assertEqual(m.matching_functions(proof, {'functions': [{**one, field: value}]}), set())

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
    def test_dtn_extension_requires_exact_pair_and_approval(self):
        names = sorted(m.DTN_FUNCTIONS)
        for value in [{'additionalDtnFunctions': names},
                      {'additionalDtnFunctions': names[:1], 'additionalDtnApproval': 'accord'},
                      {'additionalDtnFunctions': names + names, 'additionalDtnApproval': 'accord'},
                      {'additionalDtnFunctions': ['sendEmails'], 'additionalDtnApproval': 'accord'}]:
            with self.assertRaises(ValueError):
                m.approved_extra_functions(value)
        self.assertEqual(m.approved_extra_functions({'additionalDtnFunctions': names, 'additionalDtnApproval': 'Antoine 30 septembre 22:55'}), names)
        self.assertEqual(m.approved_extra_functions({}), [])

    def test_dtn_offline_proof_must_match_exact_candidate_and_suite(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            request = self.request()
            request.update(additionalDtnFunctions=sorted(m.DTN_FUNCTIONS), additionalDtnApproval='Antoine 30 septembre')
            m.write(root/'request.json', request)
            m.write(root/'paths.json', ['functions/index.js'])
            proof = {'state': {'functions': []}, 'dtnExtensionVerification': {
                'schema': 1, 'candidate': request['candidate'], 'suite': 'dtn-shared-invalidation',
                'mode': 'offline-no-invocation', 'result': 'success', 'functions': sorted(m.DTN_FUNCTIONS)}}
            with patch.object(m, 'validate_request', return_value=True), patch.object(m, 'safe_functions', side_effect=lambda _: []):
                m.write(root/'test-proof.json', proof)
                m.prepare_selection(root, '.')
                self.assertEqual(m.read(root/'selection.json'), sorted(m.DTN_FUNCTIONS))
                for key, value in [('candidate', 'c'*40), ('result', 'failure'), ('suite', 'other')]:
                    altered = {**proof, 'dtnExtensionVerification': {**proof['dtnExtensionVerification'], key: value}}
                    m.write(root/'test-proof.json', altered)
                    with self.assertRaisesRegex(ValueError, 'Preuve'):
                        m.prepare_selection(root, '.')

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
    def test_test_top_exception_is_explicit_exact_and_test_only(self):
        with patch.object(m, 'ignored_top_paths', return_value=[]):
            paths=list(m.TEST_TOP_FILES)
            with self.assertRaises(ValueError):m.classify_test(paths)
            with patch.object(m,'git',side_effect=lambda *args:m.TEST_TOP_FILES[args[1][5:]]):
                self.assertEqual(m.classify_test(paths,True),([],False))
                with self.assertRaises(ValueError):m.classify_test(paths+['firebase.json'],True)
            with patch.object(m,'git',return_value='changed'),self.assertRaises(ValueError):
                m.classify_test(paths,True)
            with self.assertRaises(ValueError):m.classify(paths)

    def test_backend_requires_review_of_excluded_functions(self):
        value=self.request();value['changes'][0]['paths']=['functions/index.js']
        with self.assertRaises(ValueError):m.validate_request(value,['functions/index.js'])
        value['excludedBackendReview']='Analyse des fonctions de mail et schedulers : aucun changement a publier'
        with self.assertRaises(ValueError):m.validate_request(value,['functions/index.js'])
        value['excludedBackendEvidence']={'schema':1,'candidate':value['candidate'],'productionRun':12,
            'suite':'retained-calendar-consumers-v1','functions':[]}
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

class RecordsCleanupTests(unittest.TestCase):
    def fixtures(self, exists=False, drift=False, dependent=False):
        header={'source':'/'+m.RECORDS_STATIC_PATH,'headers':[{'key':'Cache-Control','value':'public, max-age=300, stale-while-revalidate=86400'}]}
        before={'hosting':{'public':'.','ignore':['secret'],'headers':[header]}}
        after={'hosting':{'public':'.','ignore':['secret'],'headers':[]}}
        if drift: after['hosting']['ignore']=[]
        def fake(*args):
            if args[0]=='ls-tree':return 'blob exists' if exists else ''
            if args[1]==m.RECORDS_CLEANUP_BASE+':firebase.json':return json.dumps(before)
            if args[1]=='HEAD:firebase.json':return json.dumps(after)
            return 'data/records-data.js' if dependent else '<html></html>'
        return fake
    def test_exact_removal_test_only(self):
        paths=['firebase.json',m.RECORDS_STATIC_PATH]
        with patch.object(m,'git',side_effect=self.fixtures()):
            self.assertEqual(m.classify_test(paths,False,True),([],False))
        with self.assertRaises(ValueError):m.classify_test(paths)
        with self.assertRaises(ValueError):m.classify(paths)
    def test_replaced_snapshot_other_configuration_or_dependency_refused(self):
        for kwargs in ({'exists':True},{'drift':True},{'dependent':True}):
            with patch.object(m,'git',side_effect=self.fixtures(**kwargs)),self.assertRaises(ValueError):
                m.classify_test(['firebase.json',m.RECORDS_STATIC_PATH],False,True)
    def test_other_generated_file_still_refused(self):
        with patch.object(m,'git',side_effect=self.fixtures()),self.assertRaises(ValueError):
            m.classify_test(['firebase.json',m.RECORDS_STATIC_PATH,'performances/public/data/other.js'],False,True)

class PublicExportCleanupTests(unittest.TestCase):
    def fake(self, replacement=False, config=False, dependent=False, unknown=False):
        def git(*args):
            if args[0]=='ls-tree':
                if args[3]==m.PUBLIC_EXPORT_CLEANUP_BASE:return 'performances/public/data/performance-public/swimmers/a.json\nperformances/public/data/intranap-summary.js'
                return 'unexpected' if replacement else ''
            if args[1].endswith(':firebase.json'):
                return json.dumps({'hosting':{'public':'.','ignore':[] if config and args[1].startswith('HEAD:') else ['historical/**']}})
            return 'intranap-summary.js' if dependent else 'public/reference.js'
        return git
    def test_exact_deletion_and_prod_unchanged(self):
        paths=['performances/public/data/performance-public/swimmers/a.json','performances/public/data/intranap-summary.js']
        with patch.object(m,'git',side_effect=self.fake()):self.assertEqual(m.classify_test(paths,False,False,True),([],False))
        with self.assertRaises(ValueError):m.classify(paths)
        with patch.object(m,'git',side_effect=self.fake()),self.assertRaises(ValueError):m.classify_test(paths)
    def test_replacement_configuration_dependency_or_new_path_refused(self):
        path='performances/public/data/performance-public/swimmers/a.json'
        for kw in ({'replacement':True},{'config':True},{'dependent':True}):
            with patch.object(m,'git',side_effect=self.fake(**kw)),self.assertRaises(ValueError):m.classify_test([path],False,False,True)
        with patch.object(m,'git',side_effect=self.fake()),self.assertRaises(ValueError):m.classify_test([path.replace('a.json','new.json')],False,False,True)
    def test_unrelated_data_still_blocked(self):
        with patch.object(m,'git',side_effect=self.fake()),self.assertRaises(ValueError):m.classify_test(['performances/public/data/other.json'],False,False,True)

if __name__=='__main__':unittest.main()
