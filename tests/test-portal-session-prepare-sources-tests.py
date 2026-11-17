"""A3.4a preparation TEST scope, refusals and authenticated receipt; no remote services."""
from copy import deepcopy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('portal_prepare_test_policy', ROOT/'tools/publish-test-portal-session-prepare.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)


class PortalSessionPrepareSources(unittest.TestCase):
    def setUp(self):
        self.entry = policy.contract()
        self.candidate = self.entry['applicationCommit']
        self.base = self.entry['baseCommit']
        self.old = {n: '0'*64 for n in self.entry['installedFunctions']+self.entry['notInstalledChanges']}
        self.desired = {**self.old, **self.entry['fingerprints']}
        for n in self.entry['notInstalledChanges']:
            self.desired[n] = '1'*64
        self.before = [{'name': policy.PREFIX+n, 'state': 'ACTIVE', 'environment': 'GEN_2',
                        'buildConfig': {'runtime': 'nodejs22', 'entryPoint': n},
                        'labels': {'livepalmes-commit': self.base}} for n in self.entry['installedFunctions']]
        self.env = {'GITHUB_REPOSITORY': policy.REPOSITORY, 'RELEASE': policy.RELEASE,
                    'GITHUB_WORKFLOW_REF': policy.REPOSITORY+'/'+policy.WORKFLOW+'@refs/heads/main'}

    def fingerprints(self, ref):
        return self.old if ref in {self.base, self.entry['comparisonBaseCommit']} else self.desired

    def test_complete_selection_and_retained_functions(self):
        with patch.object(policy.cycle, 'test_backend_fingerprints', self.fingerprints):
            self.assertEqual(policy.select(self.before, self.candidate, self.entry), sorted(policy.ALLOWED))
            unchanged = deepcopy(self.before)
            for row in unchanged:
                row['labels']['livepalmes-commit'] = self.candidate
            self.assertEqual(policy.select(unchanged, self.candidate, self.entry), [])
        self.assertNotIn('manageLivePalmesDirect', policy.ALLOWED)
        self.assertNotIn('submitEngagementAccessRequest', policy.ALLOWED)
        self.assertNotIn('getPublicEngagementClubDirectory', policy.ALLOWED)
        self.assertNotIn('closeDueEngagementCompetitions', policy.ALLOWED)

    def test_uncovered_consumer_and_missing_inventory_refused(self):
        retained = next(n for n in self.entry['installedFunctions'] if n not in policy.ALLOWED)
        self.desired[retained] = '2'*64
        with patch.object(policy.cycle, 'test_backend_fingerprints', self.fingerprints):
            with self.assertRaises(ValueError): policy.select(self.before, self.candidate, self.entry)
            with self.assertRaises(ValueError): policy.select(self.before[:-1], self.candidate, self.entry)
            self.before[0]['labels'] = {}
            with self.assertRaises(ValueError): policy.select(self.before, self.candidate, self.entry)

    def test_guard_calculates_every_consumer(self):
        with patch.object(policy, '_guard', return_value=self.candidate), patch.object(policy.cycle, 'test_backend_fingerprints', self.fingerprints):
            self.assertEqual(policy.guard(ROOT, self.entry, self.env), self.candidate)
            self.desired[next(n for n in self.entry['installedFunctions'] if n not in policy.ALLOWED)] = '3'*64
            with self.assertRaises(ValueError): policy.guard(ROOT, self.entry, self.env)

    def test_wrong_workflow_release_and_modes_refused(self):
        for change in [{'RELEASE': 'standard'}, {'GITHUB_REPOSITORY': 'other/repository'},
                       {'GITHUB_WORKFLOW_REF': policy.REPOSITORY+'/'+policy.WORKFLOW+'@refs/heads/other'},
                       {'STANDARD_SOURCE_REQUEST': '{}'}]:
            with patch.object(policy, '_guard') as delegate:
                with self.assertRaises(ValueError): policy.guard(ROOT, self.entry, {**self.env, **change})
                delegate.assert_not_called()
        for mode in ['identity', 'recover', 'delete', 'rollback']:
            with self.assertRaises(ValueError): policy.main(mode, policy.RELEASE, ROOT, ROOT)
        with self.assertRaises(ValueError): policy.contract('standard')

    def test_baseline_is_bound_to_the_proof_candidate_not_the_comparison_main(self):
        row=self.entry['baselineRuns'][0]
        state={'hosting':{'version':self.entry['baselineHostingVersion']},
               'functions':[{'name':policy.PREFIX+n} for n in self.entry['installedFunctions']]}
        proof={'candidate':self.base,'state':state}
        metadata={'id':row['artifactId'],'name':'test-proof','expired':False,
                  'digest':'sha256:'+row['artifactSha256'],'workflow_run':{'id':row['id']}}
        with patch.object(policy.cycle,'artifact',return_value={'head_sha':self.base}),patch.object(policy.cycle,'read',return_value=proof),patch.object(policy.cycle,'gh',return_value=metadata):
            self.assertEqual(policy.baseline(self.entry,ROOT),state)
            invalid=deepcopy(self.entry);invalid['baseCommit']=self.entry['comparisonBaseCommit']
            with self.assertRaisesRegex(ValueError,'hors version'):policy.baseline(invalid,ROOT)
            metadata['digest']='sha256:'+'0'*64
            with self.assertRaises(ValueError):policy.baseline(self.entry,ROOT)

    def test_source_patch_keeps_configuration_outside_transport(self):
        function = next(row for row in self.before if row['name'].split('/')[-1] in policy.ALLOWED)
        function['serviceConfig'] = {'maxInstanceCount': 2, 'maxInstanceRequestConcurrency': 4,
                                     'secretEnvironmentVariables': [{'key': 'FIXTURE'}]}
        source = {'bucket': 'fixture-source', 'object': 'archive.zip', 'generation': '1'}
        body = policy.publisher.source_patch(function, source, self.candidate)
        self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
        self.assertEqual(body['buildConfig'], {'source': {'storageSource': source}})
        self.assertEqual(body['labels']['livepalmes-commit'], self.candidate)

    def receipt(self):
        name = sorted(policy.ALLOWED)[0]
        row = {'name': policy.PREFIX+name, 'revision': 'fixture-revision', 'state': 'ACTIVE', 'commit': self.candidate}
        controls = {'mailEnabled': False, 'schedulerSuspended': True, 'queuePaused': True}
        proof = {'schema': 1, 'candidate': self.candidate, 'release': policy.RELEASE,
                 'contractSha256': policy.CONTRACT_SHA256, 'applicationAnchor': self.candidate,
                 'baselineRun': self.entry['baselineRuns'][0]['id'], 'selected': [name],
                 'state': {'functions': [row]}, 'controlsBefore': controls, 'controlsAfter': deepcopy(controls),
                 'taskContentsRead': False, 'managedSources': {name: {
                    'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True,
                    'archiveSha256': 'a'*64, 'archiveIdentity': 'b'*64,
                    'storageSource': {'bucket': 'gcf-v2-sources-206080168534-europe-west1',
                                      'object': name+'/function-source.zip', 'generation': '1'}}}}
        for key in ['configurationsUnchanged', 'otherFunctionsUnchanged', 'hostingUnchanged', 'controlsUnchanged',
                    'mailSettingUnchanged', 'schedulerUnchanged', 'queueUnchanged', 'pendingMessagesPreserved']:
            proof[key] = True
        return name, row, proof

    def test_receipt_requires_success_integrity_and_all_controls(self):
        name, row, proof = self.receipt()
        run = {'id': 42, 'head_sha': self.candidate, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1}
        api = SimpleNamespace(gh=lambda _: {'workflow_runs': [run]},
            artifact=lambda *args: {'head_sha': self.candidate, 'path': policy.WORKFLOW},
            read=lambda _: proof, test_backend_fingerprints=lambda _: self.desired,
            matching_functions=lambda p, current: {f['name'] for f in p['state']['functions'] if f in current['functions']})
        current = {'functions': [row]}
        self.assertEqual(policy.trusted_revisions(ROOT, current, api), {policy.PREFIX+name})
        for key in ['configurationsUnchanged', 'controlsUnchanged', 'otherFunctionsUnchanged', 'pendingMessagesPreserved']:
            proof[key] = False
            self.assertEqual(policy.trusted_revisions(ROOT, current, api), set())
            proof[key] = True
        proof['managedSources'][name]['generationReadAndReferencesRechecked'] = False
        self.assertEqual(policy.trusted_revisions(ROOT, current, api), set())
        run['conclusion'] = 'failure'
        self.assertEqual(policy.trusted_revisions(ROOT, current, api), set())


if __name__ == '__main__':
    unittest.main()
