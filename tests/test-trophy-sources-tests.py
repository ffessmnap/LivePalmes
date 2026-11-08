"""Departmental trophy source contract: offline fixtures only."""
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
spec = importlib.util.spec_from_file_location('trophy_sources', ROOT / 'tools/publish-test-trophy-sources.py')
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


class TrophySources(unittest.TestCase):
    def test_contract_and_workflow_are_closed_without_changing_mail_permissions(self):
        entry = p.contract()
        self.assertEqual(set(entry['fingerprints']), p.ALLOWED)
        self.assertEqual(len(p.ALLOWED), 2)
        self.assertNotIn('readNapPublicSwimmer', p.shared.ALLOWED)
        self.assertNotIn('manageDamienHebertEdition', p.shared.ALLOWED)
        self.assertEqual(len(p.shared.ALLOWED), 6)
        workflow = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text(encoding='utf8')
        self.assertIn("inputs.release == 'trophy_departmental' && 'publish-test-trophy-sources.py' || 'publish-test-mail-sources.py'", workflow)
        self.assertIn("inputs.release == 'trophy_departmental' && (inputs.identity_only || inputs.recover_models)", workflow)
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
                return 'tools/publish-test-trophy-sources.py'
            return ''
        def fingerprints(sha):
            return baseline if sha == entry['baseCommit'] else desired
        with patch.object(p.cycle, 'run', side_effect=git_run), patch.object(p.cycle, 'git', return_value=SHA), \
                patch.object(p.cycle, 'test_backend_fingerprints', side_effect=fingerprints):
            self.assertEqual(p.guard(ROOT, entry, env), SHA)
            for key, value in [('TARGET_FIREBASE_PROJECT', 'livepalmes'), ('EXPECTED_COMMIT', 'd' * 40),
                               ('GITHUB_RUN_ATTEMPT', '2'), ('GITHUB_REF', 'refs/heads/other'), ('RELEASE', 'contacts')]:
                with self.assertRaises(ValueError):
                    p.guard(ROOT, entry, {**env, key: value})
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
        old = {n: ('old' if n == 'readNapPublicSwimmer' else desired[n]) for n in p.ALLOWED}
        with patch.object(p.cycle, 'test_backend_fingerprints', side_effect=lambda sha: desired if sha == SHA else old):
            self.assertEqual(p.select(rows, SHA, entry), ['readNapPublicSwimmer'])
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
        current = after(function('readNapPublicSwimmer'))
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

    def test_foreign_plan_and_edition_drift_fail_before_any_cloud_mutation(self):
        entry = p.contract()
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'contract', return_value=entry), patch.object(p.shared, 'credential_identity'), \
                patch.object(p.state, 'request') as request:
            root = Path(directory)
            (root / 'plan.json').write_text(json.dumps({'candidate': SHA, 'release': 'officials_txt', 'contractSha256': p.CONTRACT_SHA256}))
            with self.assertRaisesRegex(ValueError, 'Plan trophee'):
                p.main('deploy', p.RELEASE, directory, ROOT)
            (root / 'plan.json').write_text(json.dumps({'candidate': SHA, 'release': p.RELEASE,
                'contractSha256': p.CONTRACT_SHA256, 'selected': []}))
            (root / 'before.json').write_text('[]')
            (root / 'controls.json').write_text(json.dumps({'trophyEditionSha256': 'before'}))
            with patch.object(p, 'select', return_value=[]), patch.object(p, 'controls', return_value={'trophyEditionSha256': 'after'}), \
                    self.assertRaisesRegex(ValueError, 'edition TEST'):
                p.main('deploy', p.RELEASE, directory, ROOT)
            request.assert_not_called()

    def test_edition_guard_is_one_targeted_test_read_and_stores_only_a_hash(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({'fields': {'draft': 'private-setting'}}).encode()
        with patch.object(p.shared, 'controls', return_value={'mailSha256': 'mail'}), \
                patch.object(p.cycle, 'run', return_value='never-log-this-token'), \
                patch.object(p.urllib.request, 'urlopen', return_value=response) as read:
            witness = p.controls()
            self.assertEqual(read.call_count, 1)
            request = read.call_args.args[0]
            self.assertTrue(request.full_url.endswith('/engagementConfigurations/damienHebert'))
            self.assertIn('/projects/livepalmes-test/', request.full_url)
            self.assertNotIn('private-setting', json.dumps(witness))
            self.assertNotIn('never-log', json.dumps(witness))
            self.assertEqual(len(witness['trophyEditionSha256']), 64)

    def test_exact_final_read_only_run_has_no_artifact_and_requires_successful_steps(self):
        entry = p.contract()
        expected = {'functions': [], 'hosting': {'version': 'baseline'}}
        run = {'head_sha': entry['baseCommit'], 'head_branch': 'main', 'path': '.github/workflows/livepalmes-test-common.yml',
               'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY},
               'event': 'workflow_dispatch', 'run_attempt': 1, 'status': 'completed', 'conclusion': 'success',
               'display_title': 'Verification TEST sans deploiement'}
        steps = [{'name': name, 'conclusion': conclusion} for name, conclusion in [
            ('Selectionner les Functions TEST reellement differentes', 'success'),
            ('Controler le backend TEST et les Functions conservees', 'success'),
            ('Publier et controler les Functions TEST', 'skipped'),
            ('Publier TEST commun pour le commit exact verifie', 'skipped'),
            ('Conserver la preuve de la version TEST', 'skipped')]]
        jobs = {'jobs': [{'name': 'test', 'status': 'completed', 'conclusion': 'success', 'steps': steps}]}
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes'}), \
                patch.object(p.shared, 'baseline', return_value=expected), patch.object(p.cycle, 'artifact') as artifact, \
                patch.object(p.cycle, 'gh', side_effect=lambda path: jobs if '/jobs?' in path else run) as github:
            self.assertEqual(p.baseline(entry, ROOT), expected)
            artifact.assert_not_called()
            self.assertTrue(all(str(entry['finalCheckRun']) in call.args[0] for call in github.call_args_list))
            for key, value in [('head_sha', SHA), ('head_branch', 'other'), ('conclusion', 'failure'), ('run_attempt', 2),
                               ('path', '.github/workflows/other.yml'), ('event', 'pull_request'),
                               ('repository', {'full_name': 'other/LivePalmes'}), ('head_repository', {'full_name': 'fork/LivePalmes'})]:
                previous = run[key]
                run[key] = value
                with self.assertRaises(ValueError):
                    p.baseline(entry, ROOT)
                run[key] = previous
            for step in steps:
                previous = step['conclusion']
                step['conclusion'] = 'failure' if previous == 'success' else 'success'
                with self.assertRaises(ValueError):
                    p.baseline(entry, ROOT)
                step['conclusion'] = previous

    def test_complete_source_only_flow_patches_two_names_and_preserves_other_states(self):
        entry = p.contract()
        original = [function(n) for n in sorted(p.ALLOWED) + ['ordinary']]
        live = copy.deepcopy(original)
        data, witness = archive(), {'trophyEditionSha256': 'unchanged', 'mailSha256': 'unchanged'}
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
            self.assertTrue(proof['trophyEditionUnchanged'] and proof['otherFunctionsUnchanged'])
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
            (root / 'controls.json').write_text(json.dumps({'trophyEdition': private}))
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


if __name__ == '__main__':
    unittest.main()
