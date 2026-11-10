"""Direct console source contract: offline fixtures only."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_sources', ROOT / 'tools/publish-test-direct-sources.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
SHA = 'c' * 40


def function(name):
    return {'name': p.PREFIX + name, 'environment': 'GEN_2', 'state': 'ACTIVE', 'updateTime': 'before',
            'labels': {'livepalmes-commit': 'b' * 40, 'preserve': 'yes'},
            'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name,
                            'source': {'storageSource': {'bucket': 'old', 'object': 'old'}}},
            'serviceConfig': {'revision': 'old', 'serviceAccountEmail': 'runtime@example.invalid',
                              'environmentVariables': {'KEEP': 'yes'},
                              'secretEnvironmentVariables': [{'key': 'LIVEPALMES_NAP_PASSWORD', 'version': '7'}]}}


def after(before):
    current = copy.deepcopy(before)
    name = current['name'].split('/')[-1]
    source = {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': name + '/function-source.zip', 'generation': '123'}
    current['buildConfig'].update(source={'storageSource': source}, sourceProvenance={'resolvedStorageSource': source})
    current['labels']['livepalmes-commit'] = SHA
    current['updateTime'] = 'after'
    current['serviceConfig']['revision'] = 'new'
    return current


def archive():
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as output:
        output.writestr('index.js', 'module.exports = {};')
    return stream.getvalue()


class DirectSources(unittest.TestCase):
    def test_contract_matches_the_real_test_selector_and_committed_application(self):
        entry = p.contract()
        anchored = p.cycle.test_backend_fingerprints(entry['applicationCommit'])
        baseline = p.cycle.test_backend_fingerprints(entry['baseCommit'])
        current = p.cycle.test_backend_fingerprints(p.cycle.git('rev-parse', 'HEAD'))
        self.assertEqual({n: anchored[n] for n in p.ALLOWED}, entry['fingerprints'],
                         'Use the deployed TEST selector, not the dependency diagnostic snapshot')
        self.assertEqual(set(anchored), set(baseline))
        self.assertEqual({n for n in anchored if anchored[n] != baseline[n]}, p.ALLOWED)
        # Historical contracts attest their own immutable anchor, not all future
        # releases. The deployment guard still requires an exact candidate closure.
        p.cycle.run(['git', 'merge-base', '--is-ancestor', entry['applicationCommit'], p.cycle.git('rev-parse', 'HEAD')], ROOT)

    def test_contract_and_workflow_are_closed_without_changing_mail_permissions(self):
        entry = p.contract()
        self.assertEqual(set(entry['fingerprints']), p.ALLOWED)
        self.assertEqual(len(p.ALLOWED), 2)
        self.assertNotIn('manageLivePalmesDirect', p.shared.ALLOWED)
        self.assertNotIn('readNapPublicSwimmer', p.shared.ALLOWED)
        self.assertEqual(len(p.shared.ALLOWED), 6)
        workflow = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text(encoding='utf8')
        self.assertIn("inputs.release == 'direct_console_audit' && 'publish-test-direct-sources.py'", workflow)
        self.assertIn("inputs.release == 'direct_console_audit' && (inputs.identity_only || inputs.recover_models)", workflow)
        with patch.object(p, 'CONTRACT_SHA256', '0' * 64), self.assertRaises(ValueError):
            p.contract()
        with self.assertRaises(ValueError):
            p.main('deploy', 'officials_txt', 'unused', ROOT)

    def test_guard_rejects_wrong_project_candidate_attempt_and_third_dependency(self):
        entry = p.contract()
        desired = {**entry['fingerprints'], 'ordinary': 'same'}
        baseline = {**{n: 'old' for n in p.ALLOWED}, 'ordinary': 'same'}
        env = {'GITHUB_REF': 'refs/heads/main', 'GITHUB_RUN_ATTEMPT': '1', 'TARGET_FIREBASE_PROJECT': p.PROJECT,
               'GITHUB_REPOSITORY': p.REPOSITORY,
               'CONFIRMATION': p.PROJECT, 'RELEASE': p.RELEASE, 'GITHUB_SHA': SHA, 'EXPECTED_COMMIT': SHA}
        def git_run(args, *_):
            if 'rev-parse' in args:
                return SHA
            if 'diff' in args:
                return entry['toolingPaths'][0]
            return ''
        def fingerprints(sha):
            return baseline if sha == entry['baseCommit'] else desired
        with patch.object(p.cycle, 'run', side_effect=git_run), patch.object(p.cycle, 'git', return_value=SHA), \
                patch.object(p.cycle, 'test_backend_fingerprints', side_effect=fingerprints):
            self.assertEqual(p.guard(ROOT, entry, env), SHA)
            for key, value in [('GITHUB_REPOSITORY', 'fork/LivePalmes'), ('TARGET_FIREBASE_PROJECT', 'livepalmes'), ('EXPECTED_COMMIT', 'd' * 40),
                               ('GITHUB_RUN_ATTEMPT', '2'), ('GITHUB_REF', 'refs/heads/other'), ('RELEASE', 'contacts')]:
                with self.assertRaises(ValueError):
                    p.guard(ROOT, entry, {**env, key: value})
            with patch.object(p.cycle, 'run', side_effect=lambda args,*_: 'assets/direct/import.js' if 'diff' in args else git_run(args)), self.assertRaisesRegex(ValueError, 'Code applicatif'):
                p.guard(ROOT, entry, env)
            baseline['ordinary'] = 'different'
            with self.assertRaisesRegex(ValueError, 'Dependances'):
                p.guard(ROOT, entry, env)
            baseline['ordinary'] = 'same'
            del desired['ordinary']
            with self.assertRaisesRegex(ValueError, 'Dependances'):
                p.guard(ROOT, entry, env)

    def test_selection_preserves_equivalent_revision_and_refuses_unknown_provenance(self):
        entry = p.contract()
        rows = [function(n) for n in sorted(p.ALLOWED)]
        desired = entry['fingerprints']
        old = {n: ('old' if n == 'manageLivePalmesDirect' else desired[n]) for n in p.ALLOWED}
        with patch.object(p.cycle, 'test_backend_fingerprints', side_effect=lambda sha: desired if sha == SHA else old):
            self.assertEqual(p.select(rows, SHA, entry), ['manageLivePalmesDirect'])
            with self.assertRaises(ValueError):
                p.select(rows, SHA, {**entry, 'fingerprints': {**desired, 'third': 'a' * 64}})
            rows[0]['labels']['livepalmes-commit'] = 'unknown'
            with self.assertRaises(ValueError):
                p.select(rows, SHA, entry)

    def test_patch_only_changes_source_and_label_for_the_two_existing_runtimes(self):
        source = {'bucket': 'upload', 'object': 'archive.zip', 'generation': '123'}
        for name in p.ALLOWED:
            original = function(name)
            body = p.source_patch(original, source, SHA)
            self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
            self.assertEqual(body['buildConfig'], {'source': {'storageSource': source}})
            self.assertEqual(original['labels']['livepalmes-commit'], 'b' * 40)
            for changed in [function('third'), {**original, 'name': original['name'].replace('livepalmes-test', 'livepalmes')},
                            {**original, 'state': 'DEPLOYING'}, {**original, 'buildConfig': {**original['buildConfig'], 'runtime': 'nodejs20'}}]:
                with self.assertRaises(ValueError):
                    p.source_patch(changed, source, SHA)
            with self.assertRaises(ValueError):
                p.source_patch(original, {**source, 'generation': None}, SHA)

    def test_verification_rejects_configuration_other_function_and_managed_generation_drift(self):
        selected = sorted(p.ALLOWED)
        before = [function(n) for n in selected + ['ordinary']]
        current = [after(f) if f['name'].split('/')[-1] in p.ALLOWED else copy.deepcopy(f) for f in before]
        sources = {f['name'].split('/')[-1]: p.managed_source(f) for f in current[:-1]}
        p.verify(before, current, selected, SHA, sources)
        for index, section, key, value in [(0, 'serviceConfig', 'environmentVariables', {'KEEP': 'changed'}),
                                            (2, 'labels', 'preserve', 'changed')]:
            changed = copy.deepcopy(current)
            changed[index][section][key] = value
            with self.assertRaises(ValueError):
                p.verify(before, changed, selected, SHA, sources)
        changed = copy.deepcopy(current)
        changed[0]['buildConfig']['source']['storageSource']['generation'] = '124'
        with self.assertRaises(ValueError):
            p.verify(before, changed, selected, SHA, sources)
        with self.assertRaises(ValueError):
            p.verify(before, current, selected + ['ordinary'], SHA, sources)

    def test_attestation_checks_all_archive_bytes_generation_and_stable_source(self):
        current = after(function('manageLivePalmesDirect'))
        source = p.managed_source(current)
        data = archive()
        url = 'https://storage.googleapis.com/' + source['bucket'] + '/' + source['object'] + '?signature=private'
        response = MagicMock()
        response.__enter__.return_value.headers = {'x-goog-generation': '123'}
        response.__enter__.return_value.read.return_value = data
        with patch.object(p.state, 'request', side_effect=[current, {'downloadUrl': url}, current]), \
                patch.object(p.urllib.request, 'urlopen', return_value=response):
            self.assertTrue(p.attest_source(current, data)['allPathsAndFileBytesIdentical'])
        for generation, body in [('124', data), ('123', b'changed bytes')]:
            response.__enter__.return_value.headers = {'x-goog-generation': generation}
            response.__enter__.return_value.read.return_value = body
            with patch.object(p.state, 'request', side_effect=[current, {'downloadUrl': url}, current]), \
                    patch.object(p.urllib.request, 'urlopen', return_value=response), self.assertRaises((ValueError, zipfile.BadZipFile)):
                p.attest_source(current, data)

    def test_foreign_plan_and_controls_drift_fail_before_any_cloud_mutation(self):
        entry = p.contract()
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'contract', return_value=entry), patch.object(p.shared, 'credential_identity'), \
                patch.object(p.state, 'request') as request:
            root = Path(directory)
            (root / 'plan.json').write_text(json.dumps({'candidate': SHA, 'release': 'officials_txt', 'contractSha256': p.CONTRACT_SHA256}))
            with self.assertRaisesRegex(ValueError, 'Plan Direct'):
                p.main('deploy', p.RELEASE, directory, ROOT)
            (root / 'plan.json').write_text(json.dumps({'candidate': SHA, 'release': p.RELEASE,
                'contractSha256': p.CONTRACT_SHA256, 'selected': []}))
            (root / 'before.json').write_text('[]')
            (root / 'controls.json').write_text(json.dumps({'mailSha256': 'before'}))
            with patch.object(p, 'select', return_value=[]), patch.object(p, 'controls', return_value={'mailSha256': 'after'}), \
                    self.assertRaisesRegex(ValueError, 'techniques TEST'):
                p.main('deploy', p.RELEASE, directory, ROOT)
            request.assert_not_called()

    def test_controls_reuse_existing_technical_guards_without_additional_data_reads(self):
        witness = {'mailSha256': 'unchanged', 'queuePaused': True}
        with patch.object(p.shared, 'controls', return_value=witness) as read:
            self.assertEqual(p.controls(), witness)
            read.assert_called_once_with()

    def test_baseline_pins_authenticated_artifact_inventory_and_hosting(self):
        entry = p.contract()
        row = entry['baselineRuns'][0]
        expected = {'functions': [{'name': str(i)} for i in range(121)], 'hosting': {'version': entry['baselineHostingVersion']}}
        metadata = {'id': row['artifactId'], 'name': 'test-proof', 'expired': False,
                    'digest': 'sha256:' + row['artifactSha256'],
                    'workflow_run': {'id': row['id'], 'head_sha': entry['baseCommit'], 'head_branch': 'main'}}
        with patch.object(p.shared, 'baseline', return_value=expected), patch.object(p.cycle, 'gh', return_value=metadata):
            self.assertEqual(p.baseline(entry, ROOT), expected)
            for key, value in [('id', 1), ('name', 'other'), ('expired', True), ('digest', 'sha256:'+'0'*64)]:
                original = metadata[key]
                metadata[key] = value
                with self.assertRaises(ValueError):
                    p.baseline(entry, ROOT)
                metadata[key] = original
            for key, value in [('id', 1), ('head_sha', SHA), ('head_branch', 'other')]:
                original = metadata['workflow_run'][key]
                metadata['workflow_run'][key] = value
                with self.assertRaises(ValueError):
                    p.baseline(entry, ROOT)
                metadata['workflow_run'][key] = original
            expected['functions'].pop()
            with self.assertRaises(ValueError):
                p.baseline(entry, ROOT)

    def test_complete_source_only_flow_patches_two_names_and_preserves_other_states(self):
        entry = p.contract()
        original = [function(n) for n in sorted(p.ALLOWED) + ['ordinary']]
        live = copy.deepcopy(original)
        data, witness = archive(), {'mailSha256': 'unchanged'}
        def snapshot(*_):
            return {'functions': p.shared.compact(live), 'hosting': {'version': 'unchanged'}}
        base = snapshot()
        response = MagicMock()
        response.__enter__.return_value.headers = {'x-goog-generation': '123'}
        response.__enter__.return_value.read.return_value = data
        mutations = []
        def request(url, method='GET', body=None):
            if url.endswith(':generateUploadUrl'):
                self.assertEqual(method, 'POST')
                return {'uploadUrl': 'https://storage.googleapis.com/upload/source.zip',
                        'storageSource': {'bucket': 'upload', 'object': 'source.zip'}}
            if url.endswith(':generateDownloadUrl'):
                full = url.removeprefix(p.state.API).removesuffix(':generateDownloadUrl')
                current = next(f for f in live if f['name'] == full)
                source = p.managed_source(current)
                return {'downloadUrl': 'https://storage.googleapis.com/' + source['bucket'] + '/' + source['object']}
            full = url.removeprefix(p.state.API).split('?')[0]
            if method == 'PATCH':
                self.assertTrue(url.endswith('?updateMask=build_config.source,labels'))
                mutations.append(copy.deepcopy(body))
                for index, current in enumerate(live):
                    if current['name'] == full:
                        live[index] = after(current)
                        return {'done': True}
            return copy.deepcopy(next(f for f in live if f['name'] == full))
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'contract', return_value=entry), patch.object(p.shared, 'credential_identity'), \
                patch.object(p, 'baseline', return_value=base), patch.object(p, 'controls', return_value=witness), \
                patch.object(p.shared, 'inventory', side_effect=lambda: copy.deepcopy(live)), \
                patch.object(p.shared, 'load', return_value=SimpleNamespace(reusable=lambda *_: True)), \
                patch.object(p.shared.archive_helper, 'test_archive', return_value=data), \
                patch.object(p.cycle, 'snapshot', side_effect=snapshot), \
                patch.object(p.cycle, 'test_backend_fingerprints', side_effect=lambda sha: entry['fingerprints'] if sha == SHA else {n: 'old' for n in p.ALLOWED}), \
                patch.object(p.state, 'request', side_effect=request), patch.object(p.state, 'wait_operation'), \
                patch.object(p.urllib.request, 'urlopen', return_value=response):
            for mode in ['prepare', 'deploy', 'verify']:
                p.main(mode, p.RELEASE, directory, ROOT)
            proof = json.loads((Path(directory) / 'test-backend-proof.json').read_text())
            self.assertEqual(set(proof['selected']), p.ALLOWED)
            self.assertTrue(proof['controlsUnchanged'] and proof['otherFunctionsUnchanged'])
            self.assertEqual({body['name'].split('/')[-1] for body in mutations}, p.ALLOWED)
            self.assertEqual(live[-1], original[-1])
            self.assertTrue(all(set(body) == {'name', 'buildConfig', 'labels'} for body in mutations))

    def test_partial_failure_keeps_two_receipts_without_sensitive_payloads(self):
        private = 'fictional-sensitive-value-never-published'
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'GITHUB_RUN_ID': '123'}):
            root = Path(directory)
            original = [function(n) for n in sorted(p.ALLOWED)]
            original[0]['serviceConfig']['environmentVariables']['SECRET'] = private
            (root / 'before.json').write_text(json.dumps(original))
            (root / 'plan.json').write_text(json.dumps({'candidate': SHA, 'release': p.RELEASE,
                'contractSha256': p.CONTRACT_SHA256, 'selected': sorted(p.ALLOWED), 'credentials': private}))
            (root / 'controls.json').write_text(json.dumps({'mailSetting': private}))
            receipts = {n: {'storageSource': {'bucket': 'upload', 'object': 'source.zip', 'generation': '123',
                                            'signedUrl': private}, 'archiveSha256': 'a' * 64, 'privateKey': private}
                        for n in p.ALLOWED | {'third'}}
            (root / 'uploads.json').write_text(json.dumps(receipts))
            p.failure_diagnostic(root, SHA)
            raw = (root / 'failure-diagnostic.json').read_text()
            result = json.loads(raw)
            self.assertFalse(result['successProof'])
            self.assertEqual(set(result['uploadedSources']), p.ALLOWED)
            self.assertNotIn(private, raw)
            self.assertNotIn('signedUrl', raw)
            self.assertNotIn('third', raw)

    def receipt_fixture(self):
        entry = p.contract()
        current = {'functions': p.shared.compact([after(function(n)) for n in sorted(p.ALLOWED)] + [function('ordinary')]),
                   'hosting': {'version': entry['baselineHostingVersion']}}
        rows = [f for f in current['functions'] if f['name'].split('/')[-1] in p.ALLOWED]
        managed = {n: {'storageSource': p.managed_source(after(function(n))), 'archiveSha256': 'a'*64,
                       'archiveIdentity': 'b'*64, 'allPathsAndFileBytesIdentical': True,
                       'generationReadAndReferencesRechecked': True} for n in p.ALLOWED}
        proof = {'schema': 1, 'release': p.RELEASE, 'candidate': SHA, 'contractSha256': p.CONTRACT_SHA256,
                 'applicationAnchor': entry['applicationCommit'], 'baselineRun': entry['baselineRuns'][0]['id'],
                 'selected': sorted(p.ALLOWED), 'state': {'functions': rows}, 'managedSources': managed,
                 'configurationsUnchanged': True, 'otherFunctionsUnchanged': True, 'hostingUnchanged': True,
                 'controlsUnchanged': True, 'taskContentsRead': False}
        run = {'id': 123, 'head_sha': SHA, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1,
               'head_branch': 'main', 'path': '.github/workflows/livepalmes-test-mail-sources.yml',
               'event': 'workflow_dispatch', 'repository': {'full_name': p.REPOSITORY},
               'head_repository': {'full_name': p.REPOSITORY}}
        api = SimpleNamespace(gh=MagicMock(return_value={'workflow_runs': [run]}),
                              artifact=MagicMock(return_value=copy.deepcopy(run)), read=MagicMock(return_value=proof),
                              test_backend_fingerprints=MagicMock(return_value=entry['fingerprints']),
                              matching_functions=p.cycle.matching_functions)
        return entry, current, proof, run, api

    def test_only_authenticated_closed_import_receipts_are_reusable(self):
        entry, current, proof, run, api = self.receipt_fixture()
        self.assertEqual(p.trusted_revisions(ROOT, current, api), {p.PREFIX+n for n in p.ALLOWED})
        for key, value in [('release', 'models'), ('candidate', 'd'*40), ('contractSha256', '0'*64),
                           ('applicationAnchor', 'd'*40), ('baselineRun', 1), ('configurationsUnchanged', False),
                           ('otherFunctionsUnchanged', False), ('hostingUnchanged', False),
                           ('controlsUnchanged', False), ('taskContentsRead', True), ('selected', []),
                           ('selected', sorted(p.ALLOWED)+['ordinary'])]:
            original = proof[key]
            proof[key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            proof[key] = original
        name = sorted(p.ALLOWED)[0]
        for key, value in [('allPathsAndFileBytesIdentical', False), ('generationReadAndReferencesRechecked', False),
                           ('archiveSha256', 'unknown'), ('archiveIdentity', 'unknown')]:
            original = proof['managedSources'][name][key]
            proof['managedSources'][name][key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            proof['managedSources'][name][key] = original
        original = proof['managedSources'][name]['storageSource']['generation']
        proof['managedSources'][name]['storageSource']['generation'] = 'unknown'
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set())
        proof['managedSources'][name]['storageSource']['generation'] = original
        for key, value in [('conclusion', 'failure'), ('status', 'in_progress'), ('run_attempt', 2)]:
            original = run[key]
            run[key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set())
            run[key] = original
        fingerprints = api.test_backend_fingerprints.return_value
        api.test_backend_fingerprints.return_value = {**fingerprints, name: '0'*64}
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), 'Different source fingerprint is refused')
        api.test_backend_fingerprints.return_value = fingerprints
        source = api.artifact.return_value
        for key, value in [('id', 1), ('head_sha', 'd'*40), ('head_branch', 'other'), ('run_attempt', 2),
                           ('event', 'pull_request'), ('path', '.github/workflows/other.yml'),
                           ('conclusion', 'failure'), ('repository', {'full_name': 'fork/LivePalmes'}),
                           ('head_repository', {'full_name': 'fork/LivePalmes'})]:
            original = source[key]
            source[key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            source[key] = original
        api.artifact.side_effect = ValueError('Artefact absent, expire ou digest different')
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), 'Unauthenticated artifact never grants trust')
        api.artifact.side_effect = None
        changed = copy.deepcopy(current)
        changed['functions'][0]['revision'] = 'unproved'
        self.assertEqual(len(p.trusted_revisions(ROOT, changed, api)), 1, 'A changed revision remains untrusted')
        api.gh.reset_mock()
        self.assertEqual(p.trusted_revisions(ROOT, {'functions': [p.shared.compact([function('ordinary')])[0]]}, api), set())
        api.gh.assert_not_called()

    def test_common_selection_reuses_two_closed_receipts_without_manual_reduction(self):
        entry, current, proof, run, api = self.receipt_fixture()
        baseline = {'state': {'functions': p.shared.compact([function(n) for n in sorted(p.ALLOWED)+['ordinary']])}}
        fingerprints = {**entry['fingerprints'], 'ordinary': 'unchanged'}
        def github(path):
            return {'workflow_runs': [run] if 'livepalmes-test-mail-sources.yml' in path else []}
        def read(path):
            return baseline if 'previous-test' in str(path) else proof
        for valid in [True, False]:
            proof['contractSha256'] = p.CONTRACT_SHA256 if valid else '0'*64
            with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {
                    'GITHUB_REPOSITORY': p.REPOSITORY, 'GITHUB_RUN_ID': '999', 'CANDIDATE_SHA': SHA,
                    'GITHUB_OUTPUT': str(Path(directory)/'output')}), \
                    patch.object(p.cycle, 'snapshot', return_value=current), \
                    patch.object(p.cycle, 'latest_run', return_value=10), \
                    patch.object(p.cycle, 'artifact', return_value=run), \
                    patch.object(p.cycle, 'read', side_effect=read), patch.object(p.cycle, 'gh', side_effect=github), \
                    patch.object(p.cycle, 'safe_functions', return_value=sorted(fingerprints)), \
                    patch.object(p.cycle, 'test_backend_fingerprints', return_value=fingerprints):
                p.cycle.test_selection(directory, ROOT)
                selected = json.loads((Path(directory)/'test-selection.json').read_text())
                self.assertEqual(selected, [] if valid else sorted(p.ALLOWED))


if __name__ == '__main__':
    unittest.main()
