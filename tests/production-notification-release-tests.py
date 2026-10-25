"""Offline approval, selection and cutover guards; no credentials or network."""
import importlib.util
from pathlib import Path
import unittest
import tempfile
import json
import os
from unittest.mock import patch

ROOT = Path(__file__).parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cycle = load('notification_cycle', 'release-cycle.py')
guard = load('notification_guard', 'check-production-mail-disabled.py')
state = load('notification_state', 'production-release-state.py')
test_state = load('test_notification_state', 'test-notification-state.py')


class NotificationReleaseTests(unittest.TestCase):
    def test_equivalent_test_proof_is_restricted_to_same_application_nap_repair(self):
        request = {'candidate': 'a' * 40, 'productionCommit': 'a' * 40,
                   'testEquivalentCandidate': 'b' * 40,
                   'additionalPublicNapFunctions': ['readNapPublicSwimmer'],
                   'additionalPublicNapApproval': 'Explicit approval', 'initialAutomaticMailEnabled': False}
        evidence = {'candidate': 'b' * 40}
        info = {'head_sha': 'b' * 40}
        with patch.object(cycle.subprocess, 'run'), patch.object(cycle, 'backend_fingerprints', return_value={'reader': 'same'}), patch.object(cycle, 'git', return_value='tools/release-cycle.py'):
            cycle.verify_test_candidate(request, evidence, info)
            for bad in [{**request, 'productionCommit': 'c' * 40}, {**request, 'testEquivalentCandidate': 'c' * 40}, {**request, 'additionalPublicNapFunctions': []}]:
                with self.assertRaises(ValueError):
                    cycle.verify_test_candidate(bad, evidence, info)
        for path in ['functions/index.js', 'assets/livepalmes-environment.js', 'firebase.json', 'performances/public/data/records.json', 'portail.html']:
            with patch.object(cycle.subprocess, 'run'), patch.object(cycle, 'git', return_value=path), self.assertRaises(ValueError):
                cycle.verify_test_candidate(request, evidence, info)
        with patch.object(cycle.subprocess, 'run'), patch.object(cycle, 'git', return_value='tools/helper.py'), patch.object(cycle, 'backend_fingerprints', side_effect=[{'reader': 'old'}, {'reader': 'new'}]), self.assertRaises(ValueError):
            cycle.verify_test_candidate(request, evidence, info)
        with self.assertRaises(ValueError):
            cycle.verify_test_candidate(request, evidence, {'head_sha': 'c' * 40})

    def test_public_nap_extension_is_exact_and_works_without_application_diff(self):
        request = {'schema': 1, 'candidate': 'a' * 40, 'productionCommit': 'a' * 40,
                   'productionHosting': 'sites/livepalmes/versions/existing',
                   'testRun': 1, 'changes': [{'title': 'Missing public NAP reader', 'paths': [],
                     'status': 'validated', 'validation': 'Explicit correction approval'}],
                   'excludedBackendReview': 'Only public reader; no migrations or diagnostics',
                   'additionalPublicNapFunctions': ['readNapPublicSwimmer'],
                   'additionalPublicNapApproval': 'Explicit approval', 'initialAutomaticMailEnabled': False}
        request['excludedBackendEvidence']={'schema':1,'candidate':request['candidate'],'productionRun':12,
            'suite':'retained-calendar-consumers-v1','functions':[]}
        self.assertTrue(cycle.validate_request(request, []))
        for names in [['exportNapPublicPage'], ['getNapSwimmerPerformances'], ['readNapPublicSwimmer', 'exportNapPublicPage']]:
            with self.assertRaises(ValueError):
                cycle.approved_public_nap_functions({**request, 'additionalPublicNapFunctions': names})
        with self.assertRaises(ValueError):
            cycle.approved_public_nap_functions({**request, 'additionalPublicNapApproval': ''})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'request.json').write_text(json.dumps(request))
            (root / 'credentials.json').write_text(json.dumps({'project_id': 'livepalmes'}))
            (root / 'selection.json').write_text(json.dumps(['readNapPublicSwimmer']))
            with patch.dict(os.environ, {'PLAN': str(root), 'GOOGLE_APPLICATION_CREDENTIALS': str(root / 'credentials.json'),
                                        'CANDIDATE_SHA': 'a' * 40}), patch.object(cycle, 'safe_functions', return_value=[]), patch.object(cycle, 'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes', '.', root, root / 'selection.json', True)
                command = deploy.call_args.args[0]
                self.assertEqual(command[command.index('--only') + 1], 'functions:readNapPublicSwimmer')

    def test_runtime_nap_check_never_accepts_firebase_or_missing_reader(self):
        runtime = load('nap_runtime_check', 'check-production-nap-runtime.py')
        self.assertEqual(runtime.check(lambda url: {'source': 'nap'}), 5)
        with self.assertRaises(ValueError):
            runtime.check(lambda url: {'source': 'firestore'})
        def unavailable(url):
            raise OSError('404')
        with self.assertRaises(OSError):
            runtime.check(unavailable)

    def test_unserved_top_files_only(self):
        top = cycle.TOP_PREFIXES[0] + '200BI/M-S.json'
        record = 'performances/public/data/records.json'
        hosting = {'public': '.', 'ignore': [prefix + '**' for prefix in cycle.TOP_PREFIXES]}
        with patch.object(cycle, 'git', return_value=json.dumps({'hosting': hosting})):
            self.assertEqual(cycle.ignored_top_paths([top, record], 'HEAD'), [top])
        for value in [{'public': '.', 'ignore': []}, [hosting, {'public': '.', 'ignore': []}],
                      {'public': 'other', 'ignore': hosting['ignore']}]:
            with patch.object(cycle, 'git', return_value=json.dumps({'hosting': value})):
                self.assertEqual(cycle.ignored_top_paths([top], 'HEAD'), [])
        for path in [record, 'firebase.json']:
            with self.assertRaises(ValueError):
                cycle.classify([path])

    def test_targeted_test_refresh_preserves_other_functions(self):
        candidate = 'a' * 40
        before = {'functions': [{'name': name, 'state': 'ACTIVE', 'commit': 'b' * 40}
                               for name in sorted(test_state.NAMES | {'unrelated'})]}
        after = {'functions': [{**f, 'commit': candidate} if f['name'] in test_state.NAMES else dict(f)
                              for f in before['functions']]}
        test_state.unchanged(before, after, candidate)
        next(f for f in after['functions'] if f['name'] == 'unrelated')['revision'] = 'unexpected'
        with self.assertRaises(ValueError):
            test_state.unchanged(before, after, candidate)

    def test_idf_pilot_refresh_is_exactly_nine_functions(self):
        candidate = 'a' * 40
        before = {'functions': [{'name': name, 'state': 'ACTIVE', 'commit': 'b' * 40}
                               for name in sorted(test_state.PILOT_NAMES | {'unrelated'})]}
        after = {'functions': [{**f, 'commit': candidate} if f['name'] in test_state.PILOT_NAMES else dict(f)
                              for f in before['functions']]}
        with patch.dict(os.environ, {'NOTIFICATION_PILOT_IDF': 'true'}):
            test_state.unchanged(before, after, candidate)
            next(f for f in after['functions'] if f['name'] == 'unrelated')['revision'] = 'unexpected'
            with self.assertRaises(ValueError):
                test_state.unchanged(before, after, candidate)

    def test_native_identity_secret_requires_specific_approval(self):
        request = {'additionalDtnFunctions': sorted(cycle.DTN_FUNCTIONS), 'additionalDtnApproval': 'Accord DTN'}
        self.assertFalse(cycle.approved_native_identity_secret(request))
        self.assertTrue(cycle.approved_native_identity_secret({**request, 'nativeIdentityNapSecretApproval': 'Accord explicite'}))
        for value in [{**request, 'nativeIdentityNapSecretApproval': ''}, {'nativeIdentityNapSecretApproval': 'Accord'}]:
            with self.assertRaises(ValueError):
                cycle.approved_native_identity_secret(value)

    def test_bcc_task_refresh_allows_only_the_exact_new_worker(self):
        candidate = 'a' * 40
        before = {'functions': [{'name': name, 'state': 'ACTIVE', 'commit': 'b' * 40}
                               for name in sorted((test_state.BCC_NAMES - {'processNapNotificationTask'}) | {'unrelated'})]}
        after = {'functions': [{**f, 'commit': candidate} if f['name'] in test_state.BCC_NAMES else dict(f)
                              for f in before['functions']] + [{'name': 'processNapNotificationTask', 'state': 'ACTIVE', 'commit': candidate}]}
        with patch.dict(os.environ, {'NOTIFICATION_BCC_TASKS': 'true', 'NOTIFICATION_PILOT_IDF': 'false'}):
            test_state.unchanged(before, after, candidate)
            for invalid in [after['functions'] + [{'name': 'unexpected'}], after['functions'][1:]]:
                with self.assertRaises(ValueError):
                    test_state.unchanged(before, {'functions': invalid}, candidate)

    def request(self):
        return {'additionalNotificationFunctions': sorted(cycle.NOTIFICATION_FUNCTIONS),
                'additionalNotificationApproval': 'Accord specifique Infra du bilan exact',
                'initialAutomaticMailEnabled': False}

    def test_scope_requires_complete_explicit_approval_and_default_off(self):
        request = self.request()
        self.assertEqual(set(cycle.approved_extra_functions(request)), cycle.NOTIFICATION_FUNCTIONS)
        self.assertEqual(cycle.approved_notification_functions({}), [])
        for field in request:
            altered = dict(request)
            altered.pop(field)
            if field == 'additionalNotificationFunctions':
                self.assertEqual(cycle.approved_notification_functions(altered), [])
            else:
                with self.assertRaises(ValueError):
                    cycle.approved_notification_functions(altered)
        for value in [True, None, 0, 'false']:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, 'initialAutomaticMailEnabled': value})
        for names in [request['additionalNotificationFunctions'][:-1], ['resumePerformancePublicationJobs'],
                      request['additionalNotificationFunctions'] * 2, ['sendEmails'], [None], 'all']:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, 'additionalNotificationFunctions': names})
        with self.assertRaises(ValueError):
            cycle.approved_notification_functions({**request, 'additionalNotificationApproval': ' '})

    def test_overlap_with_existing_pdf_scope_is_rejected(self):
        with self.assertRaises(ValueError):
            cycle.approved_extra_functions({**self.request(), 'additionalPdfFunctions': sorted(cycle.PDF_FUNCTIONS),
                                           'additionalPdfApproval': 'Accord PDF'})

    def test_grouped_idf_release_requires_explicit_pause_and_restart_plan(self):
        maintenance = {'scope': 'idf', 'observedRevision': 2, 'pauseRevision': 3,
                       'resumeRevision': 4, 'noReplay': True, 'approval': 'Preparation du bilan, accord final requis'}
        request = {**self.request(), 'productionCommit': cycle.IDF_MAILS_PAIR[0],
                   'candidate': cycle.IDF_MAILS_PAIR[1], 'notificationPilotIdfApproval': 'IDF seulement',
                   'additionalNotificationFunctions': sorted(cycle.IDF_NOTIFICATION_FUNCTIONS),
                   'notificationMaintenancePlan': maintenance}
        self.assertEqual(set(cycle.approved_notification_functions(request)), cycle.IDF_NOTIFICATION_FUNCTIONS)
        for key in maintenance:
            missing = dict(maintenance)
            missing.pop(key)
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, 'notificationMaintenancePlan': missing})
        for change in [{'scope': 'all'}, {'noReplay': False}, {'pauseRevision': 4},
                       {'resumeRevision': 3}, {'observedRevision': True}, {'approval': ''}]:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, 'notificationMaintenancePlan': {**maintenance, **change}})
        for change in [{'notificationMaintenancePlan': None}, {'candidate': 'a' * 40},
                       {'initialAutomaticMailEnabled': True}, {'additionalNotificationFunctions': sorted(cycle.NOTIFICATION_FUNCTIONS)}]:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, **change})
        document = {'fields': {'enabled': {'booleanValue': False}, 'scope': {'stringValue': 'idf'},
                    'revision': {'integerValue': '3'}, 'enabledSince': {'stringValue': '2026-10-20T08:47:02.380Z'},
                    'discardThrough': {'stringValue': '2026-10-20T12:00:00.000Z'},
                    'updatedAt': {'stringValue': '2026-10-20T12:00:00.000Z'}}}
        self.assertEqual(guard.paused_idf_state(document, maintenance), document['fields'])
        with tempfile.TemporaryDirectory() as directory:
            witness = Path(directory) / 'pause.json'
            guard.check_pause_witness(document, maintenance, witness)
            guard.check_pause_witness(document, maintenance, witness)
            with self.assertRaises(ValueError):
                guard.check_pause_witness({'fields': {**document['fields'],
                    'updatedAt': {'stringValue': '2026-10-20T12:01:00.000Z'}}}, maintenance, witness)
        for key, value in [('enabled', {'booleanValue': True}), ('scope', {'stringValue': 'all'}),
                           ('revision', {'integerValue': '4'}), ('enabled', None),
                           ('discardThrough', {'stringValue': ''}),
                           ('discardThrough', {'stringValue': '2026-10-19T12:00:00.000Z'})]:
            with self.assertRaises(ValueError):
                guard.paused_idf_state({'fields': {**document['fields'], key: value}}, maintenance)

    def test_idf_pilot_exact_pair_seven_treatments_and_default_off(self):
        request = {**self.request(), 'productionCommit': cycle.IDF_NOTIFICATION_PAIR[0],
                   'candidate': cycle.IDF_NOTIFICATION_PAIR[1],
                   'notificationPilotIdfApproval': 'Pilote IDF seulement, activation separee',
                   'additionalNotificationFunctions': sorted(cycle.IDF_NOTIFICATION_FUNCTIONS)}
        self.assertEqual(set(cycle.approved_extra_functions(request)), cycle.IDF_NOTIFICATION_FUNCTIONS)
        for altered in [{'candidate': 'a' * 40}, {'productionCommit': 'b' * 40},
                        {'notificationPilotIdfApproval': ''}, {'initialAutomaticMailEnabled': True},
                        {'additionalNotificationApproval': ''},
                        {'additionalNotificationFunctions': sorted(cycle.NOTIFICATION_FUNCTIONS)},
                        {'additionalNotificationFunctions': sorted(cycle.IDF_NOTIFICATION_FUNCTIONS)[:-1]},
                        {'additionalNotificationFunctions': []}]:
            with self.assertRaises(ValueError):
                cycle.approved_notification_functions({**request, **altered})
        without_pilot = dict(request)
        without_pilot.pop('notificationPilotIdfApproval')
        with self.assertRaises(ValueError):
            cycle.approved_notification_functions(without_pilot)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'request.json').write_text(json.dumps(request))
            (root / 'credentials.json').write_text(json.dumps({'project_id': 'livepalmes'}))
            (root / 'selection.json').write_text(json.dumps(request['additionalNotificationFunctions']))
            with patch.dict(os.environ, {'PLAN': str(root), 'GOOGLE_APPLICATION_CREDENTIALS': str(root / 'credentials.json'),
                                        'CANDIDATE_SHA': request['candidate']}), \
                    patch.object(cycle, 'safe_functions', return_value=[]), patch.object(cycle, 'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes', '.', root, root / 'selection.json', True)
                command = deploy.call_args.args[0]
                self.assertIn('--dry-run', command)
                self.assertEqual(set(command[command.index('--only') + 1].split(',')),
                                 {'functions:' + name for name in cycle.IDF_NOTIFICATION_FUNCTIONS})

    def test_missing_disabled_enabled_and_corrupted_settings(self):
        self.assertTrue(guard.disabled({}))
        self.assertTrue(guard.disabled({'fields': {'enabled': {'booleanValue': False}}}))
        self.assertFalse(guard.disabled({'fields': {'enabled': {'booleanValue': True}}}))
        for value in [{'stringValue': 'false'}, {'booleanValue': 0}, {'booleanValue': False, 'stringValue': 'false'}]:
            with self.assertRaises(ValueError):
                guard.disabled({'fields': {'enabled': value}})

    def test_scheduler_witness_ignores_execution_metadata_but_detects_configuration(self):
        job = {'name': 'closure', 'schedule': '*/5 * * * *', 'timeZone': 'Europe/Paris',
               'state': 'ENABLED', 'httpTarget': {'uri': 'https://example.invalid/closure'}}
        witness = guard.scheduler_fingerprint(job)
        self.assertEqual(witness, guard.scheduler_fingerprint({**job, 'lastAttemptTime': 'later', 'status': {}}))
        for key, value in [('schedule', '*/10 * * * *'), ('state', 'PAUSED'), ('httpTarget', {'uri': 'https://other.invalid'})]:
            self.assertNotEqual(witness, guard.scheduler_fingerprint({**job, key: value}))

    def test_new_notification_function_is_checked_and_missing_nap_secret_blocks_hosting(self):
        name = 'processNapCompetitionNotifications'
        function = {'name': state.PREFIX + name, 'state': 'ACTIVE', 'labels': {'livepalmes-commit': 'candidate'},
                    'serviceConfig': {'secretEnvironmentVariables': [{'key': 'LIVEPALMES_NAP_PASSWORD',
                        'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes', 'version': '1'}]}}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'functions.json').write_text('[]')
            (root / 'report.json').write_text(json.dumps({'candidate': 'candidate', 'commitLabel': True,
                'functions': [], 'newFunctions': [name], 'appCheck': 'false',
                'additionalNotificationFunctions': [name], 'notificationExpectedSecrets': {name: ['LIVEPALMES_NAP_PASSWORD']}}))
            with patch.object(state, 'inventory', return_value=[function]), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(root / 'summary')}):
                state.check_after(root, root / 'after.json', True)
                function['serviceConfig']['secretEnvironmentVariables'] = []
                with self.assertRaises(ValueError):
                    state.check_after(root, root / 'after.json', True)
                self.assertIn('Secrets notifications differents', (root / 'after.json').read_text())

    def test_notification_functions_reach_cli_dry_run_without_extending_selection(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            request = self.request()
            (root / 'request.json').write_text(json.dumps(request))
            (root / 'credentials.json').write_text(json.dumps({'project_id': 'livepalmes'}))
            (root / 'selection.json').write_text(json.dumps(request['additionalNotificationFunctions']))
            with patch.dict(os.environ, {'PLAN': str(root), 'GOOGLE_APPLICATION_CREDENTIALS': str(root / 'credentials.json'),
                                        'CANDIDATE_SHA': 'a' * 40}), patch.object(cycle, 'safe_functions', return_value=[]), \
                    patch.object(cycle, 'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes', '.', root, root / 'selection.json', True)
                self.assertEqual(deploy.call_count, 1)
                command = deploy.call_args.args[0]
                self.assertIn('--dry-run', command)
                self.assertEqual(set(command[command.index('--only') + 1].split(',')),
                                 {'functions:' + name for name in cycle.NOTIFICATION_FUNCTIONS})


class PublicReaderIdfPreservationTests(unittest.TestCase):
    def request(self):
        return {'productionCommit': cycle.PUBLIC_READER_IDF_PAIR[0], 'candidate': cycle.PUBLIC_READER_IDF_PAIR[1],
                'additionalPublicNapFunctions': ['readNapPublicSwimmer'], 'additionalPublicNapApproval': 'Accord lecteur',
                'initialAutomaticMailEnabled': True,
                'publicReaderIdfPreservation': {'scope': 'idf', 'revision': 4, 'approval': 'Adaptation validee'}}

    def document(self):
        return {'name': 'technical-setting', 'updateTime': 'stable', 'fields': {
            'enabled': {'booleanValue': True}, 'scope': {'stringValue': 'idf'}, 'revision': {'integerValue': '4'},
            'enabledSince': {'stringValue': 'activation'}, 'discardThrough': {'stringValue': 'cutoff'},
            'updatedAt': {'stringValue': 'activation'}, 'updatedBy': {'stringValue': 'existing-user'}}}

    def test_exact_pair_and_single_reader_only(self):
        request = self.request()
        self.assertEqual(cycle.approved_extra_functions(request), ['readNapPublicSwimmer'])
        cycle.require_access_request_selection(request, ['readNapPublicSwimmer'])
        mutations = [{'candidate': 'c' * 40}, {'productionCommit': 'c' * 40},
                     {'initialAutomaticMailEnabled': False}, {'additionalPublicNapApproval': ''},
                     {'additionalPublicNapFunctions': []}, {'additionalPublicNapFunctions': ['exportNapPublicPage']},
                     {'publicReaderIdfPreservation': {'scope': 'idf', 'revision': True, 'approval': 'yes'}},
                     {'publicReaderIdfPreservation': {'scope': 'all', 'revision': 4, 'approval': 'yes'}},
                     {'publicReaderIdfPreservation': {'scope': 'idf', 'revision': 4, 'approval': ''}}]
        for key in ['additionalNotificationFunctions', 'additionalAccessRequestFunctions', 'additionalPdfFunctions',
                    'additionalDtnFunctions', 'notificationMaintenancePlan', 'testEquivalentCandidate', 'productionHomeRouting']:
            mutations.append({key: ['unexpected']})
        for mutation in mutations:
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                cycle.approved_public_nap_functions({**request, **mutation})
        for selected in [[], ['readNapPublicSwimmer', 'other'], ['other']]:
            with self.assertRaises(ValueError):
                cycle.require_access_request_selection(request, selected)
        with self.assertRaises(ValueError):
            cycle.approved_public_nap_functions({**request, 'publicReaderIdfPreservation': None})

    def test_full_setting_witness_including_metadata_and_unknown_fields(self):
        import copy
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); document = self.document(); preservation = cycle.idf_preservation(self.request())
            with self.assertRaises(ValueError):
                guard.check_idf_preservation(document, preservation, root, after=True)
            guard.check_idf_preservation(document, preservation, root)
            guard.check_idf_preservation(document, preservation, root, after=True)
            self.assertEqual(json.loads((root/'public-reader-idf-before.json').read_text()),
                             json.loads((root/'public-reader-idf-after.json').read_text()))
            for key in document['fields']:
                changed = copy.deepcopy(document); changed['fields'][key] = {'stringValue': 'drift'}
                with self.subTest(key=key), self.assertRaises(ValueError):
                    guard.check_idf_preservation(changed, preservation, root, after=True)
            for changed in [{**document, 'updateTime': 'drift'}, {**document, 'extra': 'drift'}, {}]:
                with self.assertRaises(ValueError):
                    guard.check_idf_preservation(changed, preservation, root, after=True)

    def test_guard_reads_only_and_refuses_scheduler_drift(self):
        import io
        request=self.request(); scheduler={'name':'job','schedule':'*/5 * * * *','timeZone':'Europe/Paris','state':'ENABLED'}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'request.json').write_text(json.dumps(request)); (root/'selection.json').write_text(json.dumps(cycle.approved_extra_functions(request)))
            (root/'credentials.json').write_text(json.dumps({'project_id':'livepalmes'}))
            def run(after=False, job=None):
                responses=[io.BytesIO(json.dumps(x).encode()) for x in [self.document(), job or scheduler]]
                with patch.dict(os.environ, {'PLAN':str(root),'GOOGLE_APPLICATION_CREDENTIALS':str(root/'credentials.json')}), \
                     patch.object(guard.sys,'argv',['guard']+(['--after'] if after else [])), \
                     patch.object(guard.subprocess,'check_output',return_value='offline-token'), \
                     patch.object(guard.urllib.request,'urlopen',side_effect=responses) as fetch:
                    guard.main()
                    self.assertEqual(fetch.call_count,2)
                    self.assertTrue(all(call.args[0].get_method()=='GET' for call in fetch.call_args_list))
            run(); run(); run(after=True)
            for mutation in [{'state':'PAUSED'}, {'schedule':'*/10 * * * *'}, {'timeZone':'UTC'}, {'retryConfig':{'retryCount':2}}]:
                with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                    run(after=True,job={**scheduler,**mutation})
            (root/'notification-scheduler-before.json').unlink()
            with self.assertRaises(ValueError):
                run(after=True)

    def test_workflow_final_guard_is_required_and_attested(self):
        workflow=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        self.assertIn('check-production-mail-disabled.py --after',workflow)
        self.assertIn('name: production-idf-preservation',workflow)
        self.assertIn('if [ "$IDF_PRESERVATION" = true ]; then test "$IDF_AFTER" = success; fi',workflow)
        self.assertLess(workflow.index('id: hosting'),workflow.index('id: idf_after'))

    def test_frozen_proof_refuses_other_dependency_or_missing_reader(self):
        request={**self.request(), 'productionHosting':'sites/livepalmes/versions/existing',
                 'excludedBackendEvidence':{}, 'changes':[]}
        before={'readNapPublicSwimmer':cycle.PUBLIC_READER_IDF_HASHES[0], 'mail':'unchanged'}
        after={**before,'readNapPublicSwimmer':cycle.PUBLIC_READER_IDF_HASHES[1]}
        state={'hosting':{'version':request['productionHosting'],'message':'LivePalmes '+request['productionCommit']+' run 1'},
               'functions':[{'name':'readNapPublicSwimmer','state':'ACTIVE','revision':'existing','commit':request['productionCommit']}]}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'request.json').write_text(json.dumps(request));(root/'selection.json').write_text(json.dumps(['readNapPublicSwimmer']))
            def run(desired, observed=state):
                with patch.object(cycle,'production_evidence',return_value=observed), \
                     patch.object(cycle,'verify_excluded_backend'), \
                     patch.object(cycle,'backend_fingerprints',side_effect=lambda sha: before if sha==request['productionCommit'] else desired), \
                     patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary.txt')}):
                    cycle.freeze_plan(root,evidence=True)
            run(after)
            self.assertTrue((root/'public-reader-idf-proof.json').exists())
            for desired in [{**after,'mail':'changed'}, {**after,'new':'export'}, {**after,'readNapPublicSwimmer':'wrong'}]:
                with self.assertRaises(ValueError):run(desired)
            with self.assertRaises(ValueError):run(after,{**state,'functions':[]})


class ClubDirectoryIdfPreservationTests(PublicReaderIdfPreservationTests):
    def request(self):
        return json.loads((ROOT/'.github/releases/20261022-club-directory-idf.json').read_text(encoding='utf-8'))

    def test_exact_pair_and_single_reader_only(self):
        request = self.request(); names = list(cycle.CLUB_DIRECTORY_HASHES)
        self.assertEqual(cycle.approved_extra_functions(request), names)
        cycle.require_access_request_selection(request, names)
        for selected in [[], names[:-1], names+['readNapPublicSwimmer'], names+[names[0]]]:
            with self.assertRaises(ValueError): cycle.require_access_request_selection(request, selected)
        for altered in [{'candidate':'a'*40}, {'productionCommit':'b'*40},
                        {'initialAutomaticMailEnabled':False}, {'additionalClubDirectoryFunctions':names[:-1]},
                        {'clubDirectoryIdfPreservation':None},
                        {'clubDirectoryIdfPreservation':{'scope':'idf','revision':4,'approval':''}}]:
            with self.assertRaises(ValueError):cycle.approved_extra_functions({**request,**altered})
        for key in ['additionalDtnFunctions','additionalPdfFunctions','additionalNotificationFunctions',
                    'additionalPublicNapFunctions','additionalAccessRequestFunctions','notificationMaintenancePlan',
                    'publicReaderIdfPreservation','nativeIdentityNapSecretApproval','testEquivalentCandidate']:
            with self.subTest(key=key),self.assertRaises(ValueError):
                cycle.approved_extra_functions({**request,key:['forbidden']})

    def test_frozen_proof_refuses_other_dependency_or_missing_reader(self):
        request=self.request(); names=list(cycle.CLUB_DIRECTORY_HASHES)
        before={n:h[0] for n,h in cycle.CLUB_DIRECTORY_HASHES.items()}; before['mail']='unchanged'
        after={n:h[1] for n,h in cycle.CLUB_DIRECTORY_HASHES.items()}; after['mail']='unchanged'
        observed={'hosting':{'version':request['productionHosting'],'message':'LivePalmes '+request['productionCommit']+' run 1'},
                  'functions':[{'name':n,'state':'ACTIVE','revision':'existing','commit':request['productionCommit']} for n in names]}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'request.json').write_text(json.dumps(request));(root/'selection.json').write_text(json.dumps(names))
            def run(desired, state=observed):
                with patch.object(cycle,'production_evidence',return_value=state),patch.object(cycle,'verify_excluded_backend'), \
                     patch.object(cycle,'backend_fingerprints',side_effect=lambda sha:before if sha==request['productionCommit'] else desired), \
                     patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary.txt')}):
                    cycle.freeze_plan(root,evidence=True)
            run(after);self.assertTrue((root/'club-directory-idf-proof.json').exists())
            for desired in [{**after,'mail':'changed'},{**after,names[0]:'wrong'},{**after,'new':'export'}]:
                with self.assertRaises(ValueError):run(desired)
            with self.assertRaises(ValueError):run(after,{**observed,'functions':observed['functions'][:-1]})

    def test_bindings_are_existing_nap_only_and_missing_is_not_repaired(self):
        preflight=load('club_preflight','preflight-production-release.py')
        secret={'key':'LIVEPALMES_NAP_PASSWORD','secret':'LIVEPALMES_NAP_PASSWORD','projectId':'livepalmes','version':'1'}
        for name in cycle.CLUB_DIRECTORY_HASHES:
            service={'secretEnvironmentVariables':[] if name.startswith('list') else [secret]}
            self.assertTrue(preflight.club_directory_runtime_allowed(name,service))
            for changed in [{'secretEnvironmentVariables':[{'key':'SMTP'}]}, {'secretVolumes':[{}]},
                            {'environmentVariables':{'CUSTOM':'unexpected'}}]:
                self.assertFalse(preflight.club_directory_runtime_allowed(name,{**service,**changed}))
            if not name.startswith('list'):
                self.assertFalse(preflight.club_directory_runtime_allowed(name,{}))

    def test_source_only_path_never_calls_cli_or_changes_secrets(self):
        publisher=load('club_publisher','publish-approved-pdf-functions.py'); request=self.request()
        for name in cycle.CLUB_DIRECTORY_HASHES:
            body=publisher.source_patch({'name':name}, {}, request['candidate'])
            self.assertEqual(set(body),{'name','buildConfig','labels'})
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'request.json').write_text(json.dumps(request));(root/'selection.json').write_text(json.dumps(list(cycle.CLUB_DIRECTORY_HASHES)))
            (root/'credentials.json').write_text(json.dumps({'project_id':'livepalmes'}))
            with patch.dict(os.environ,{'PLAN':str(root),'GOOGLE_APPLICATION_CREDENTIALS':str(root/'credentials.json'),'CANDIDATE_SHA':request['candidate']}), \
                 patch.object(cycle,'safe_functions',return_value=[]),patch.object(cycle,'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes','.',root,root/'selection.json',True)
                deploy.assert_not_called()

    def test_configuration_and_retained_revision_changes_block_hosting(self):
        import copy
        request=self.request();names=list(cycle.CLUB_DIRECTORY_HASHES)
        old=[{'name':state.PREFIX+n,'state':'ACTIVE','updateTime':'before','buildConfig':{'runtime':'nodejs22'},
              'serviceConfig':{'revision':'before','timeoutSeconds':60,'secretEnvironmentVariables':[]}} for n in names+['retainedMail']]
        new=copy.deepcopy(old)
        for f in new[:-1]:
            f.update(updateTime='after',labels={'livepalmes-commit':request['candidate']});f['serviceConfig']['revision']='after'
        report={'candidate':request['candidate'],'commitLabel':True,'functions':[{'name':f['name']} for f in old[:-1]],
                'newFunctions':[],'appCheck':'false','additionalClubDirectoryFunctions':names}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'functions.json').write_text(json.dumps(old));(root/'report.json').write_text(json.dumps(report))
            def check(data):
                with patch.object(state,'inventory',return_value=data),patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary')}):
                    state.check_after(root,root/'after.json',True)
            check(new)
            for key,value in [('timeoutSeconds',120),('secretEnvironmentVariables',[{'key':'SMTP'}]),('environmentVariables',{'CUSTOM':'1'})]:
                changed=copy.deepcopy(new);changed[0]['serviceConfig'][key]=value
                with self.subTest(key=key),self.assertRaises(ValueError):check(changed)
            changed=copy.deepcopy(new);changed[-1]['serviceConfig']['revision']='drift'
            with self.assertRaises(ValueError):check(changed)

    def test_resume_only_skips_attested_candidate_with_identical_configuration(self):
        import copy
        publisher=load('club_resume','publish-approved-pdf-functions.py');name=list(cycle.CLUB_DIRECTORY_HASHES)[0];full=state.PREFIX+name
        old={'name':full,'state':'ACTIVE','updateTime':'before','buildConfig':{'runtime':'nodejs22'},'serviceConfig':{'revision':'old'}}
        new={**old,'updateTime':'after','labels':{'livepalmes-commit':self.request()['candidate']},'serviceConfig':{'revision':'new'}}
        def run(current, previous):
            return publisher.pending_club_sources([name],{full:old},{full:current},previous,self.request()['candidate'],state)
        self.assertEqual(run(old,{}),[name]);self.assertEqual(run(new,{full:state.identity(new)}),[])
        with self.assertRaises(ValueError):run(new,{})
        drift=copy.deepcopy(new);drift['serviceConfig']['timeoutSeconds']=120
        with self.assertRaises(ValueError):run(drift,{full:state.identity(drift)})
        with self.assertRaises(ValueError):run({**new,'labels':{'livepalmes-commit':'other'}},{full:state.identity(new)})


if __name__ == '__main__':
    unittest.main()
