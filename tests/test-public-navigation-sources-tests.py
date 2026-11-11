"""Public navigation source release: real TEST comparator and offline guard fixtures."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


navigation = load('navigation_source_contract', 'tools/publish-test-public-navigation-sources.py')
p = navigation.publisher
base = load('navigation_source_guard_fixtures', 'tests/test-direct-sources-tests.py')
base.p = p
SHA = base.SHA


class PublicNavigationSources(unittest.TestCase):
    # Replay the existing publisher guards without changing its historical suites.
    test_real_test_selector_and_anchor = base.DirectSources.test_contract_matches_the_real_test_selector_and_committed_application
    test_guard_rejects_project_attempt_and_additional_dependency = base.DirectSources.test_guard_rejects_wrong_project_candidate_attempt_and_third_dependency
    test_source_and_label_only = base.DirectSources.test_patch_only_changes_source_and_label_for_the_two_existing_runtimes
    test_foreign_plan_and_technical_drift_stop_before_mutation = base.DirectSources.test_foreign_plan_and_controls_drift_fail_before_any_cloud_mutation
    test_existing_technical_read_budget = base.DirectSources.test_controls_reuse_existing_technical_guards_without_additional_data_reads
    test_authenticated_baseline = base.DirectSources.test_baseline_pins_authenticated_artifact_inventory_and_hosting
    test_complete_single_reader_flow_and_other_states = base.DirectSources.test_complete_source_only_flow_patches_two_names_and_preserves_other_states
    test_failure_diagnostic_is_not_success_or_sensitive_payload = base.DirectSources.test_partial_failure_keeps_two_receipts_without_sensitive_payloads
    test_common_selection_never_reduces_unproved_revision = base.DirectSources.test_common_selection_reuses_two_closed_receipts_without_manual_reduction
    receipt_fixture = base.DirectSources.receipt_fixture

    def test_contract_and_workflow_allow_only_the_reader(self):
        entry = p.contract()
        self.assertEqual(p.ALLOWED, {'readNapPublicSwimmer'})
        self.assertEqual(set(entry['fingerprints']), p.ALLOWED)
        self.assertEqual(len(p.shared.ALLOWED), 6)
        self.assertNotIn('readNapPublicSwimmer', p.shared.ALLOWED)
        original = load('unchanged_direct_navigation_comparison', 'tools/publish-test-direct-sources.py')
        self.assertEqual(original.ALLOWED, {'manageLivePalmesDirect', 'readNapPublicSwimmer'})
        self.assertEqual(original.contract()['release'], 'direct_console_audit')
        workflow = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text(encoding='utf8')
        self.assertIn("inputs.release == 'public_navigation' && 'publish-test-public-navigation-sources.py'", workflow)
        self.assertIn("inputs.release == 'public_navigation' && (inputs.identity_only || inputs.recover_models)", workflow)
        with patch.object(p, 'CONTRACT_SHA256', '0' * 64), self.assertRaises(ValueError):
            p.contract()
        with self.assertRaises(ValueError):
            p.main('deploy', 'direct_console_audit', 'unused', ROOT)
        with self.assertRaises(ValueError):
            p.source_patch(base.function('manageLivePalmesDirect'), {'bucket': 'upload', 'object': 'source.zip', 'generation': '1'}, SHA)

    def test_selects_real_difference_and_preserves_equivalent_revision(self):
        entry = p.contract()
        rows = [base.function('readNapPublicSwimmer')]
        desired = entry['fingerprints']
        with patch.object(p.cycle, 'test_backend_fingerprints', side_effect=lambda sha: desired if sha == SHA else {'readNapPublicSwimmer': 'old'}):
            self.assertEqual(p.select(rows, SHA, entry), ['readNapPublicSwimmer'])
            with self.assertRaises(ValueError):
                p.select(rows, SHA, {**entry, 'fingerprints': {**desired, 'manageLivePalmesDirect': 'a' * 64}})
            rows[0]['labels']['livepalmes-commit'] = 'unknown'
            with self.assertRaises(ValueError):
                p.select(rows, SHA, entry)
        rows = [base.function('readNapPublicSwimmer')]
        with patch.object(p.cycle, 'test_backend_fingerprints', return_value=desired):
            self.assertEqual(p.select(rows, SHA, entry), [])

    def test_configuration_other_function_and_source_drift_refused(self):
        before = [base.function('readNapPublicSwimmer'), base.function('manageLivePalmesDirect')]
        current = [base.after(before[0]), copy.deepcopy(before[1])]
        sources = {'readNapPublicSwimmer': p.managed_source(current[0])}
        p.verify(before, current, ['readNapPublicSwimmer'], SHA, sources)
        for index, section, key, value in [(0, 'serviceConfig', 'environmentVariables', {'KEEP': 'changed'}),
                                           (0, 'serviceConfig', 'secretEnvironmentVariables', []),
                                           (1, 'labels', 'preserve', 'changed')]:
            changed = copy.deepcopy(current)
            changed[index][section][key] = value
            with self.assertRaises(ValueError):
                p.verify(before, changed, ['readNapPublicSwimmer'], SHA, sources)
        changed = copy.deepcopy(current)
        changed[0]['buildConfig']['source']['storageSource']['generation'] = '124'
        with self.assertRaises(ValueError):
            p.verify(before, changed, ['readNapPublicSwimmer'], SHA, sources)
        with self.assertRaises(ValueError):
            p.verify(before, current, ['readNapPublicSwimmer', 'manageLivePalmesDirect'], SHA, sources)

    def test_archive_bytes_generation_and_source_are_attested(self):
        current = base.after(base.function('readNapPublicSwimmer'))
        source, data = p.managed_source(current), base.archive()
        response = base.MagicMock()
        response.__enter__.return_value.headers = {'x-goog-generation': '123'}
        response.__enter__.return_value.read.return_value = data
        url = 'https://storage.googleapis.com/' + source['bucket'] + '/' + source['object']
        with patch.object(p.state, 'request', side_effect=[current, {'downloadUrl': url}, current]), \
                patch.object(p.urllib.request, 'urlopen', return_value=response):
            self.assertTrue(p.attest_source(current, data)['allPathsAndFileBytesIdentical'])
        for generation, body in [('124', data), ('123', b'changed bytes')]:
            response.__enter__.return_value.headers = {'x-goog-generation': generation}
            response.__enter__.return_value.read.return_value = body
            with patch.object(p.state, 'request', side_effect=[current, {'downloadUrl': url}, current]), \
                    patch.object(p.urllib.request, 'urlopen', return_value=response), self.assertRaises((ValueError, base.zipfile.BadZipFile)):
                p.attest_source(current, data)

    def test_receipts_require_own_contract_provenance_and_exact_revision(self):
        entry, current, proof, run, api = self.receipt_fixture()
        self.assertEqual(p.trusted_revisions(ROOT, current, api), {p.PREFIX + 'readNapPublicSwimmer'})
        for key, value in [('release', 'direct_public_sessions'), ('candidate', 'd' * 40), ('contractSha256', '0' * 64),
                           ('applicationAnchor', 'd' * 40), ('baselineRun', 1), ('configurationsUnchanged', False),
                           ('otherFunctionsUnchanged', False), ('hostingUnchanged', False), ('controlsUnchanged', False),
                           ('taskContentsRead', True), ('selected', []), ('selected', ['readNapPublicSwimmer', 'manageLivePalmesDirect'])]:
            original = proof[key]
            proof[key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            proof[key] = original
        name = 'readNapPublicSwimmer'
        for key, value in [('allPathsAndFileBytesIdentical', False), ('generationReadAndReferencesRechecked', False),
                           ('archiveSha256', 'unknown'), ('archiveIdentity', 'unknown')]:
            original = proof['managedSources'][name][key]
            proof['managedSources'][name][key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            proof['managedSources'][name][key] = original
        for key, value in [('conclusion', 'failure'), ('status', 'in_progress'), ('run_attempt', 2)]:
            original = run[key]
            run[key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            run[key] = original
        source = api.artifact.return_value
        for key, value in [('id', 1), ('head_sha', 'd' * 40), ('head_branch', 'other'), ('run_attempt', 2),
                           ('event', 'pull_request'), ('path', '.github/workflows/other.yml'), ('conclusion', 'failure'),
                           ('repository', {'full_name': 'fork/LivePalmes'}), ('head_repository', {'full_name': 'fork/LivePalmes'})]:
            original = source[key]
            source[key] = value
            self.assertEqual(p.trusted_revisions(ROOT, current, api), set(), key)
            source[key] = original
        api.artifact.side_effect = ValueError('Digest incorrect ou artefact absent/expire')
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set())
        api.artifact.side_effect = None
        changed = copy.deepcopy(current)
        next(row for row in changed['functions'] if row['name'] == p.PREFIX + name)['revision'] = 'unproved'
        self.assertEqual(p.trusted_revisions(ROOT, changed, api), set())
        fingerprints = api.test_backend_fingerprints.return_value
        api.test_backend_fingerprints.return_value = {name: '0' * 64}
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set())
        api.test_backend_fingerprints.return_value = fingerprints
        generation = proof['managedSources'][name]['storageSource']['generation']
        proof['managedSources'][name]['storageSource']['generation'] = 'unknown'
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set())
        proof['managedSources'][name]['storageSource']['generation'] = generation

    def test_generator_changes_only_the_two_shell_urls(self):
        entry = p.contract()
        old = json.loads(p.cycle.git('show', entry['baseCommit'] + ':functions/assets/public-home-template.json'))['html']
        new = json.loads(p.cycle.git('show', entry['applicationCommit'] + ':functions/assets/public-home-template.json'))['html']
        expected = old.replace('livepalmes-public-shell.css?v=20261021-connected-rail-2', 'livepalmes-public-shell.css?v=20261111-public-compact-1')
        expected = expected.replace('livepalmes-public-shell.js?v=20261103-navigation-trophee', 'livepalmes-public-shell.js?v=20261111-public-compact-1')
        self.assertNotEqual(old, new)
        self.assertEqual(new, expected)
        paths = p.cycle.git('diff', '--name-only', entry['baseCommit'], entry['applicationCommit'], '--', 'functions').splitlines()
        self.assertEqual(paths, ['functions/assets/public-home-template.json'])
        p.cycle.run(['node', 'tools/build-public-home-template.js'], ROOT)
        self.assertEqual(p.cycle.test_backend_fingerprints(p.cycle.git('rev-parse', 'HEAD')),
                         p.cycle.test_backend_fingerprints(entry['applicationCommit']))


if __name__ == '__main__':
    unittest.main()
