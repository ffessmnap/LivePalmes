"""Interrupted TEST release recovery, with synthetic metadata and no network."""
import copy
from contextlib import ExitStack
import importlib.util
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('recovery_test', ROOT / 'tools/publish-test-reference-recovery-sources.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
p = r.p
SHA = 'c' * 40
BINDING = {'key': 'LIVEPALMES_NAP_PASSWORD', 'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes-test', 'version': '7'}
CONTROLS = {'mailEnabled': False, 'schedulerSuspended': True, 'queuePaused': True}


def function(name):
    row = {'name': p.PREFIX + name, 'environment': 'GEN_2', 'state': 'ACTIVE', 'updateTime': 'before',
        'labels': {'livepalmes-commit': r.ORIGINAL['baseCommit'], 'keep': 'yes'},
        'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name, 'source': {'storageSource': {'bucket': 'old', 'object': 'old'}}},
        'serviceConfig': {'revision': 'old', 'serviceAccountEmail': 'runtime@example.invalid',
            'availableMemory': '256M', 'environmentVariables': {'KEEP': 'yes'},
            'secretEnvironmentVariables': [copy.deepcopy(BINDING)] if name == 'readNapPublicSwimmer' else []}}
    if name == 'syncEngagementMailRecipientIndex':
        row['eventTrigger'] = {'eventType': 'google.cloud.firestore.document.v1.written', 'retryPolicy': 'RETRY_POLICY_RETRY',
            'eventFilters': [{'attribute': 'database', 'value': '(default)'}, {'attribute': 'document', 'value': 'profiles/{id}', 'operator': 'match-path-pattern'}]}
    return row


def partial():
    old = [function(name) for name in sorted(r.BASE_ALLOWED)]
    diagnostic = {'candidate': r.ORIGIN['candidate'], 'runId': str(r.ORIGIN['id']), 'release': 'club_reference_cleanup',
        'successProof': False, 'outcome': 'failure-diagnostic-only',
        'plan': {'candidate': r.ORIGIN['candidate'], 'release': 'club_reference_cleanup',
            'contractSha256': r.ORIGIN['contractSha256'], 'selected': sorted(r.BASE_ALLOWED)},
        'beforeFunctionWitnesses': {row['name']: {'functionSha256': r.publisher.digest(row),
            'configurationSha256': r.publisher.configuration_identity(row), 'revision': 'old', 'updateTime': 'before'} for row in old}}
    current = copy.deepcopy(old)
    for row in current:
        name = row['name'].split('/')[-1]
        if name not in r.PENDING:
            row['labels']['livepalmes-commit'] = r.ORIGIN['candidate']
            row['updateTime'] = 'partial'
            row['serviceConfig']['revision'] = 'partial'
        if name in r.HISTORICAL_BINDINGS:
            row['serviceConfig']['secretEnvironmentVariables'].append(copy.deepcopy(BINDING))
    return current, diagnostic


def run_info(candidate=SHA, conclusion='success', run_id=123):
    return {'id': run_id, 'head_sha': candidate, 'head_branch': 'main', 'path': r.publisher.WORKFLOW,
        'event': 'workflow_dispatch', 'run_attempt': 1, 'status': 'completed', 'conclusion': conclusion,
        'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY}}


def managed(name):
    return {'storageSource': {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': name + '/function-source.zip', 'generation': '7'},
        'archiveSha256': 'a' * 64, 'archiveIdentity': 'b' * 64,
        'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True}


def receipt():
    rows = [{'name': p.PREFIX + name, 'state': 'ACTIVE', 'revision': 'real-' + name, 'updateTime': 'after',
        'commit': SHA if name in r.PENDING else r.ORIGIN['candidate']} for name in sorted(r.BASE_ALLOWED)]
    return {'schema': 1, 'candidate': SHA, 'release': r.RELEASE, 'contractSha256': r.CONTRACT_SHA256,
        'applicationAnchor': r.ORIGINAL['applicationCommit'], 'baselineRun': r.ORIGINAL['baselineRuns'][0]['id'],
        'originalInterruptedRun': r.ORIGIN, 'selected': sorted(r.PENDING), 'recoveredSelected': sorted(r.BASE_ALLOWED - r.PENDING),
        'state': {'functions': rows}, 'managedSources': {name: managed(name) for name in r.BASE_ALLOWED},
        'addedNapBindings': {name: copy.deepcopy(BINDING) for name in r.BASE_BINDINGS},
        'bindingsAddedInThisRun': {'syncEngagementMailRecipientIndex': copy.deepcopy(BINDING)},
        'configurationsUnchanged': False, 'configurationsUnchangedExceptApprovedNapBindings': True,
        'otherFunctionsUnchanged': True, 'hostingUnchanged': True, 'controlsUnchanged': True,
        'recoveredFunctionsUnchangedDuringResume': True, 'originalWritableConfigurationsVerified': True,
        'canonicalTriggerReadVerifiedBeforeUpload': True,
        'taskContentsRead': False, 'originalDiagnosticIsSuccessProof': False, 'originalFullMetadataAvailable': False,
        'originalNonCommitLabelEqualityReconstructed': False, 'controlsBefore': CONTROLS, 'controlsAfter': CONTROLS}


class Recovery(unittest.TestCase):
    def test_contract_keeps_the_original_code_and_closed_114_plus_seven_scope(self):
        entry = r.contract()
        self.assertEqual(set(entry['pendingFunctions']), r.PENDING)
        self.assertEqual(len(entry['publishedFunctions']), 114)
        self.assertEqual(entry['napBindingFunctions'], ['syncEngagementMailRecipientIndex'])
        self.assertEqual(r.cycle.test_backend_fingerprints(entry['applicationCommit']), r.cycle.test_backend_fingerprints(r.ORIGIN['candidate']))
        self.assertEqual(entry['fingerprints'], r.ORIGINAL['fingerprints'])
        with patch.object(p, 'CONTRACT_SHA256', '0' * 64), self.assertRaises(ValueError):
            r.contract()

    def test_real_dependency_selection_yields_only_the_seven_remaining_functions(self):
        rows, _ = partial()
        self.assertEqual(set(p.select(rows, r.ORIGIN['candidate'], r.contract())), r.PENDING)
        self.assertEqual(set(p._added_bindings), {'syncEngagementMailRecipientIndex'})

    def test_unordered_event_filters_are_canonicalized_without_losing_data(self):
        row = function('syncEngagementMailRecipientIndex')
        shuffled = copy.deepcopy(row)
        shuffled['eventTrigger']['eventFilters'].reverse()
        self.assertEqual(r.canonical_metadata(shuffled), row)
        self.assertNotEqual(shuffled, row, 'Canonicalization must not mutate the API response')
        duplicate = copy.deepcopy(row)
        duplicate['eventTrigger']['eventFilters'].append(copy.deepcopy(duplicate['eventTrigger']['eventFilters'][0]))
        self.assertEqual(len(r.canonical_metadata(duplicate)['eventTrigger']['eventFilters']), 3)
        duplicate['eventTrigger']['eventFilters'] = ['invalid']
        with self.assertRaises(ValueError): r.canonical_metadata(duplicate)

    def test_fresh_trigger_get_accepts_order_only_and_stops_every_real_drift_before_patch(self):
        rows, _ = partial(); p.configure_bindings(rows)
        target = next(row for row in rows if row['name'].endswith('/syncEngagementMailRecipientIndex'))
        source = {'bucket': 'source', 'object': 'archive', 'generation': '1'}
        body = p.source_patch(target, source, SHA)
        url = p.publisher.state.API + target['name'] + '?updateMask=build_config.source,labels'
        shuffled = copy.deepcopy(target); shuffled['eventTrigger']['eventFilters'].reverse()
        with patch.object(r, '_raw_request', side_effect=lambda url, method='GET', body=None: shuffled if method == 'GET' else {}) as request:
            p.request(url, 'PATCH', body)
            self.assertEqual(request.call_count, 2)
            self.assertTrue(request.call_args.args[0].endswith(',service_config.secret_environment_variables'))
        for field in ['filter', 'operator', 'duplicate', 'retry', 'memory', 'label', 'revision', 'updateTime']:
            changed = copy.deepcopy(target)
            if field == 'filter': changed['eventTrigger']['eventFilters'][0]['value'] = 'other-database'
            elif field == 'operator': changed['eventTrigger']['eventFilters'][1]['operator'] = 'other-operator'
            elif field == 'duplicate': changed['eventTrigger']['eventFilters'].append(copy.deepcopy(changed['eventTrigger']['eventFilters'][0]))
            elif field == 'retry': changed['eventTrigger']['retryPolicy'] = 'RETRY_POLICY_DO_NOT_RETRY'
            elif field == 'memory': changed['serviceConfig']['availableMemory'] = '2G'
            elif field == 'label': changed['labels']['keep'] = 'changed'
            elif field == 'revision': changed['serviceConfig']['revision'] = 'changed'
            else: changed['updateTime'] = 'changed'
            with self.subTest(field=field), patch.object(r, '_raw_request', return_value=changed) as request, self.assertRaises(ValueError):
                p.request(url, 'PATCH', body)
            self.assertEqual(request.call_count, 1)

    def test_partial_state_requires_exact_pending_metadata_and_original_configurations(self):
        rows, diagnostic = partial()
        _, bindings = r.inspect_partial(rows, diagnostic)
        self.assertEqual(set(bindings), r.HISTORICAL_BINDINGS)
        for name, field in [('verifyPin', 'updateTime'), ('listAccessUsers', 'memory'), ('getCurrentAccessUser', 'memory'), ('setAccessUserStatus', 'binding')]:
            changed = copy.deepcopy(rows); row = next(item for item in changed if item['name'] == p.PREFIX + name)
            if field == 'memory': row['serviceConfig']['availableMemory'] = '2G'
            elif field == 'binding': row['serviceConfig']['secretEnvironmentVariables'][0]['version'] = '8'
            else: row['updateTime'] = 'changed'
            with self.subTest(name=name), self.assertRaises(ValueError): r.inspect_partial(changed, diagnostic)

    def test_failed_attempt_is_authenticated_and_never_relabelled_success(self):
        _, diagnostic = partial()
        info = run_info(r.ORIGIN['candidate'], 'failure', r.ORIGIN['id'])
        artifact = {'id': r.ORIGIN['artifactId'], 'name': r.ORIGIN['artifactName'], 'expired': False,
            'workflow_run': {'id': r.ORIGIN['id']}, 'digest': 'sha256:' + r.ORIGIN['artifactSha256']}
        jobs = {'jobs': [{'id': r.ORIGIN['job'], 'steps': [
            {'name': 'Authentifier les preuves et constater les preconditions deja satisfaites', 'conclusion': 'success'},
            {'name': 'Publier seulement les sources calculees et autorisees', 'conclusion': 'failure'},
            {'name': 'Verifier revisions et preservation de tous les etats', 'conclusion': 'skipped'}]}]}
        api = SimpleNamespace(artifact=lambda *args: info, gh=lambda path: artifact if '/artifacts/' in path else jobs, read=lambda path: diagnostic)
        logs = '\n'.join('Source TEST actualisee : ' + name for name in r.BASE_ALLOWED - r.PENDING)
        logs += '\nValueError: Configuration modifiee avant raccordement NAP : syncEngagementMailRecipientIndex'
        with patch.object(r.publisher, 'closed_run_logs', return_value=logs):
            self.assertIs(r.original_diagnostic(ROOT, api), diagnostic)
            for mutation in ['digest', 'conclusion', 'success-proof']:
                saved = copy.deepcopy((artifact, info, diagnostic))
                if mutation == 'digest': artifact['digest'] = 'sha256:' + '0' * 64
                elif mutation == 'conclusion': info['conclusion'] = 'success'
                else: diagnostic['successProof'] = True
                with self.subTest(mutation=mutation), self.assertRaises(ValueError): r.original_diagnostic(ROOT, api)
                artifact.clear(); artifact.update(saved[0]); info.clear(); info.update(saved[1]); diagnostic.clear(); diagnostic.update(saved[2])

    def test_114_existing_archives_are_all_read_back_without_publishing(self):
        rows, diagnostic = partial(); names = sorted(r.BASE_ALLOWED)
        diagnostic['plan']['archives'] = [{'names': names, 'sha256': 'a' * 64}]
        diagnostic['uploadedSources'] = {name: {'archiveSha256': 'a' * 64} for name in names}
        with patch.object(r.publisher.archive_helper, 'test_archive', return_value=b'fixture'), patch.object(r.publisher, 'attest_source', side_effect=lambda row, data: managed(row['name'].split('/')[-1])) as attest:
            result = r.recover_archives(ROOT, SHA, rows, diagnostic)
            self.assertEqual(set(result), r.BASE_ALLOWED - r.PENDING)
            self.assertEqual(attest.call_count, 114)
            self.assertNotIn('syncEngagementMailRecipientIndex', result)

    def test_prepare_and_existing_deployer_patch_only_seven_and_one_binding(self):
        rows, diagnostic = partial(); diagnostic['controlsWitness'] = CONTROLS
        real_select, real_run = p.select, r.cycle.run
        snapshot = {'hosting': {'version': 'baseline'}, 'functions': r.publisher.compact(rows)}
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w') as archive: archive.writestr('index.js', 'synthetic offline package')
        data = output.getvalue()
        changes = []
        def request(url, method='GET', body=None):
            if method == 'GET':
                return next(row for row in rows if url == r.publisher.state.API + row['name'])
            if method == 'POST':
                self.assertTrue(url.endswith('/functions:generateUploadUrl'))
                return {'uploadUrl': 'https://storage.googleapis.com/test-upload/package.zip',
                    'storageSource': {'bucket': 'test-upload', 'object': 'package.zip'}}
            self.assertEqual(method, 'PATCH')
            changes.append((url, body))
            return {'name': 'synthetic-operation'}
        class Upload:
            headers = {'x-goog-generation': '9'}
            def __enter__(self): return self
            def __exit__(self, *args): pass
        def upload(req, **kwargs):
            self.assertEqual(req.method, 'PUT')
            self.assertEqual(req.full_url, 'https://storage.googleapis.com/test-upload/package.zip')
            self.assertEqual(req.data, data)
            return Upload()
        with TemporaryDirectory() as directory, ExitStack() as stack:
            directory = Path(directory)
            for obj, name, value in [
                (p, 'guard', lambda *args: SHA), (r.publisher, 'guard', lambda *args: SHA),
                (r.publisher, 'load', lambda *args: SimpleNamespace(reusable=lambda *args: True)),
                (r.publisher, 'credential_identity', lambda: 'synthetic'),
                (r.publisher, 'baseline', lambda *args: snapshot),
                (r, 'original_diagnostic', lambda *args: diagnostic),
                (r.publisher, 'inventory', lambda: rows), (r.publisher, 'controls', lambda: CONTROLS),
                (r.cycle, 'snapshot', lambda *args: snapshot),
                (r.cycle, 'run', lambda args, cwd=None: '' if args[:3] == ['git', 'diff', '--name-only'] else real_run(args, cwd)),
                (r, 'recover_archives', lambda *args: {name: managed(name) for name in r.BASE_ALLOWED - r.PENDING}),
                (r.publisher.archive_helper, 'test_archive', lambda *args: data),
                (p, 'select', lambda before, candidate, entry: real_select(before, r.ORIGIN['candidate'], entry)),
                (r.publisher, 'select', lambda before, candidate, entry: real_select(before, r.ORIGIN['candidate'], entry)),
                (r, '_raw_request', request), (r.publisher.state, 'wait_operation', lambda *args: None),
                (r.publisher.urllib.request, 'urlopen', upload)]:
                stack.enter_context(patch.object(obj, name, value))
            r.prepare(directory, ROOT)
            plan = r.cycle.read(directory / 'plan.json')
            self.assertEqual(set(plan['selected']), r.PENDING)
            self.assertEqual(sum(len(item['names']) for item in plan['archives']), 7)
            self.assertEqual(len(r.cycle.read(directory / 'recovered.json')['managedSources']), 114)
            r.publisher.main('deploy', r.RELEASE, directory, ROOT)
            drift = copy.deepcopy(next(row for row in rows if row['name'].endswith('/syncEngagementMailRecipientIndex')))
            drift['eventTrigger']['eventFilters'][0]['value'] = 'changed-before-upload'
            with patch.object(r, '_raw_request', return_value=drift), patch.object(r, 'recover_archives') as attest:
                with self.assertRaisesRegex(ValueError, 'avant tout upload'):
                    r.prepare(directory, ROOT)
                attest.assert_not_called()
        self.assertEqual(len(changes), 7)
        self.assertEqual({body['name'].split('/')[-1] for _, body in changes}, r.PENDING)
        bindings = [(url, body) for url, body in changes if 'serviceConfig' in body]
        self.assertEqual(len(bindings), 1)
        self.assertEqual(bindings[0][1]['name'], p.PREFIX + 'syncEngagementMailRecipientIndex')
        self.assertTrue(bindings[0][0].endswith(',service_config.secret_environment_variables'))

    def test_receipt_retains_the_real_mixed_commits_and_rejects_forgery_or_drift(self):
        proof = receipt(); info = run_info()
        current = copy.deepcopy(proof['state'])
        api = SimpleNamespace(gh=lambda _: {'workflow_runs': [info]}, artifact=lambda *args: info, read=lambda _: proof,
            test_backend_fingerprints=lambda _: r.contract()['fingerprints'], matching_functions=r.cycle.matching_functions)
        self.assertEqual(len(r.trusted_revisions(ROOT, current, api)), 121)
        pristine = copy.deepcopy(proof)
        for mutation in ['contract', 'origin', 'commit', 'selection', 'binding', 'archive', 'controls', 'honesty']:
            proof.clear(); proof.update(copy.deepcopy(pristine))
            if mutation == 'contract': proof['contractSha256'] = '0' * 64
            elif mutation == 'origin': proof['originalInterruptedRun']['id'] = 1
            elif mutation == 'commit': proof['state']['functions'][0]['commit'] = SHA
            elif mutation == 'selection': proof['selected'] = proof['selected'][:-1]
            elif mutation == 'binding': proof['addedNapBindings']['verifyPin'] = BINDING
            elif mutation == 'archive': next(iter(proof['managedSources'].values()))['generationReadAndReferencesRechecked'] = False
            elif mutation == 'controls': proof['controlsAfter'] = {'mailEnabled': True}
            else: proof['originalDiagnosticIsSuccessProof'] = True
            with self.subTest(mutation=mutation): self.assertEqual(r.trusted_revisions(ROOT, current, api), set())

    def test_finish_preserves_114_versions_without_redeploying_them(self):
        final = receipt()
        initial = copy.deepcopy(final)
        initial['state']['functions'] = [row for row in final['state']['functions'] if row['name'].split('/')[-1] in r.PENDING]
        initial['currentTestState'] = final['state']
        initial['managedSources'] = {name: managed(name) for name in r.PENDING}
        initial['addedNapBindings'] = {'syncEngagementMailRecipientIndex': BINDING}
        recovered = {'originalRun': r.ORIGIN, 'managedSources': {name: managed(name) for name in r.BASE_ALLOWED - r.PENDING},
            'canonicalTriggerReadVerifiedBeforeUpload': True,
            'historicalBindings': {name: BINDING for name in r.HISTORICAL_BINDINGS}}
        with TemporaryDirectory() as directory:
            directory = Path(directory)
            r.cycle.write(directory / 'test-backend-proof.json', initial)
            r.cycle.write(directory / 'recovered.json', recovered)
            r.finish(directory)
            actual = r.cycle.read(directory / 'test-backend-proof.json')
            self.assertEqual(actual['state'], final['state'])
            self.assertEqual(len(actual['managedSources']), 121)
            self.assertEqual(set(actual['bindingsAddedInThisRun']), {'syncEngagementMailRecipientIndex'})
            self.assertFalse(actual['originalDiagnosticIsSuccessProof'])

    def test_workflow_has_an_independent_release_and_forbids_old_recovery_modes(self):
        source = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text()
        self.assertRegex(source, r'options: \[[^\]\n]*\bclub_reference_cleanup_recovery(?:,|\])')
        self.assertIn("inputs.release == 'club_reference_cleanup_recovery' && (inputs.identity_only || inputs.recover_models)", source)
        self.assertIn("'publish-test-reference-recovery-sources.py'", source)
        for mode, release in [('recover', r.RELEASE), ('identity', r.RELEASE), ('deploy', 'models')]:
            with self.assertRaises(ValueError): r.main(mode, release, ROOT, ROOT)


if __name__ == '__main__':
    unittest.main()
