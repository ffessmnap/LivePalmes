"""Offline adversarial tests of the closed grouped preparation and runtime delta."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


cycle = load('group_cycle', 'release-cycle.py')
policy = cycle.grouped
state = load('group_state', 'production-release-state.py')
publisher = load('group_publisher', 'publish-approved-grouped-functions.py')


class GroupedTests(unittest.TestCase):
    def request(self):
        return json.loads((ROOT / '.github/releases/20261024-grouped-test.json').read_text(encoding='utf-8'))

    def functions(self):
        nap = {'key': 'LIVEPALMES_NAP_PASSWORD', 'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes', 'version': '3'}
        names = policy.contract()['selected'] + ['retainedMail']
        return [{'name': state.PREFIX + n, 'state': 'ACTIVE', 'environment': 'GEN_2', 'updateTime': 'before',
                 'buildConfig': {'runtime': 'nodejs22', 'entryPoint': n}, 'labels': {'existing': 'preserved'},
                 'serviceConfig': {'revision': 'before', 'timeoutSeconds': 60, 'availableMemory': '256M',
                                   'environmentVariables': {'LIVEPALMES_ENFORCE_APP_CHECK': 'true'},
                                   'secretEnvironmentVariables': [nap]}} for n in names]

    def deployed(self, before):
        after = copy.deepcopy(before)
        for f in after[:-1]:
            f['updateTime'] = 'after'
            f['serviceConfig']['revision'] = 'after'
            f['labels']['livepalmes-commit'] = self.request()['candidate']
            if f['name'].endswith('/' + policy.NOTIFY):
                f['serviceConfig'].update(policy.notification_service(f['serviceConfig']))
        return after

    def test_request_and_all_mutations_fail_closed(self):
        request = self.request()
        self.assertEqual(len(cycle.approved_extra_functions(request)), 47)
        self.assertEqual(cycle.idf_preservation(request), request['groupedIdfPreservation'])
        cycle.require_access_request_selection(request, request['additionalGroupedFunctions'])
        changes = {'candidate': 'a'*40, 'productionCommit': 'b'*40, 'testRun': 1,
                   'initialAutomaticMailEnabled': False, 'productionHosting': 'other',
                   'documentMailRuntimeApproval': '', 'additionalGroupedFunctions': request['additionalGroupedFunctions'][:-1],
                   'additionalDtnFunctions': ['resolveEngagementSwimmerChangeRequest'],
                   'notificationMaintenancePlan': {'scope': 'idf'}, 'groupedIdfPreservation': {'scope': 'all', 'revision': 4, 'approval': 'x'}}
        for key, value in changes.items():
            with self.subTest(key=key), self.assertRaises(ValueError):
                cycle.approved_extra_functions({**request, key: value})
        for selection in [request['additionalGroupedFunctions'][:-1], request['additionalGroupedFunctions'] + ['processNapCompetitionNotifications']]:
            with self.assertRaises(ValueError):
                cycle.require_access_request_selection(request, selection)

    def test_pinned_function_delta_and_inventory(self):
        c = policy.contract()
        before = {n: pair[0] for n, pair in c['changedExportHashes'].items()}
        after = {n: pair[1] for n, pair in c['changedExportHashes'].items()}
        functions = {n: {'state': 'ACTIVE'} for n in c['selected']}
        functions.update({f'retained{i}': {'state': 'ACTIVE'} for i in range(65)})
        self.assertEqual(policy.verify_fingerprints(before, after, functions)['retainedCount'], 65)
        for changed in [{**after, next(iter(after)): 'wrong'}, {**after, 'newExport': 'new'}]:
            with self.assertRaises(ValueError):
                policy.verify_fingerprints(before, changed, functions)
        with self.assertRaises(ValueError):
            policy.verify_fingerprints(before, after, {**functions, c['selected'][0]: {'state': 'DEPLOYING'}})

    def test_only_notification_gets_runtime_delta(self):
        for fn in self.functions()[:-1]:
            body, mask = policy.source_patch(fn, {'bucket': 'fixture'}, self.request()['candidate'])
            self.assertEqual(body['labels']['existing'], 'preserved')
            if fn['name'].endswith('/' + policy.NOTIFY):
                self.assertEqual(body['serviceConfig']['timeoutSeconds'], 300)
                self.assertEqual(len(body['serviceConfig']['secretEnvironmentVariables']), 8)
                self.assertEqual(body['serviceConfig']['secretEnvironmentVariables'][0]['version'], '3')
                self.assertIn('service_config.timeout_seconds', mask)
            else:
                self.assertNotIn('serviceConfig', body)
                self.assertEqual(mask, 'build_config.source,labels')
        for bad in [{}, {'secretEnvironmentVariables': []}, {'secretEnvironmentVariables': [{'key': 'SMTP'}]}]:
            with self.assertRaises(ValueError):
                policy.notification_service(bad)

    def test_after_and_resume_reject_every_other_config_drift(self):
        before, request = self.functions(), self.request()
        after = self.deployed(before)
        for old, new in zip(before[:-1], after[:-1]):
            policy.assert_config(old, new, state)
            for key, value in [('availableMemory', '512M'), ('environmentVariables', {'OTHER': '1'}), ('secretVolumes', [{}])]:
                drift = copy.deepcopy(new); drift['serviceConfig'][key] = value
                with self.subTest(name=old['name'], key=key), self.assertRaises(ValueError):
                    policy.assert_config(old, drift, state)
        notify = next(f for f in after if f['name'].endswith('/'+policy.NOTIFY))
        original = next(f for f in before if f['name'] == notify['name'])
        for key, value in [('timeoutSeconds', 301), ('secretEnvironmentVariables', original['serviceConfig']['secretEnvironmentVariables'])]:
            drift = copy.deepcopy(notify); drift['serviceConfig'][key] = value
            with self.assertRaises(ValueError):
                policy.assert_config(original, drift, state)
        oldmap = {f['name']: f for f in before}; newmap = {f['name']: f for f in after}
        names = request['additionalGroupedFunctions']
        self.assertEqual(publisher.pending(names, oldmap, oldmap, {}, request['candidate'], state, policy), names)
        attested = {f['name']: state.identity(f) for f in after}
        self.assertEqual(publisher.pending(names, oldmap, newmap, attested, request['candidate'], state, policy), [])
        with self.assertRaises(ValueError):
            publisher.pending(names, oldmap, newmap, {}, request['candidate'], state, policy)
        drift = copy.deepcopy(newmap); drift[before[-1]['name']]['serviceConfig']['revision'] = 'unknown'
        with self.assertRaises(ValueError):
            publisher.pending(names, oldmap, drift, attested, request['candidate'], state, policy)
        report = {'candidate': request['candidate'], 'commitLabel': True, 'appCheck': 'false',
                  'functions': [{'name': f['name']} for f in before[:-1]], 'newFunctions': [], 'additionalGroupedFunctions': names}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); (root/'report.json').write_text(json.dumps(report)); (root/'functions.json').write_text(json.dumps(before))
            def check(data):
                with patch.object(state, 'inventory', return_value=data), patch.dict(os.environ, {'GITHUB_STEP_SUMMARY':str(root/'summary')}):
                    state.check_after(root, root/'after.json', True)
            check(after)
            changed = copy.deepcopy(after); changed[0]['serviceConfig']['timeoutSeconds'] = 301
            with self.assertRaises(ValueError): check(changed)
            changed = copy.deepcopy(after); changed[-1]['updateTime'] = 'unknown'
            with self.assertRaises(ValueError): check(changed)

    def test_grouped_idf_guard_reuses_full_read_only_witness(self):
        spec = importlib.util.spec_from_file_location('group_notification_tests', ROOT/'tests/production-notification-release-tests.py')
        fixture = importlib.util.module_from_spec(spec); spec.loader.exec_module(fixture)
        # Reuse the adversarial protocol fixtures with this lot's actual request,
        # not the earlier single-reader authorization.
        class GroupWitness(fixture.PublicReaderIdfPreservationTests):
            def request(inner): return self.request()
        instance = GroupWitness()
        instance.test_full_setting_witness_including_metadata_and_unknown_fields()
        instance.test_guard_reads_only_and_refuses_scheduler_drift()
        instance.test_workflow_final_guard_is_required_and_attested()

    def test_all_47_are_removed_from_cli_batches(self):
        request = self.request()
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); (root/'request.json').write_text(json.dumps(request)); (root/'selection.json').write_text(json.dumps(request['additionalGroupedFunctions']))
            (root/'credentials.json').write_text(json.dumps({'project_id':'livepalmes'}))
            with patch.dict(os.environ, {'PLAN':str(root), 'GOOGLE_APPLICATION_CREDENTIALS':str(root/'credentials.json'), 'CANDIDATE_SHA':request['candidate']}), patch.object(cycle, 'deploy_command') as deploy:
                cycle.deploy_batches('livepalmes', ROOT, root/'stage', root/'selection.json', False)
                deploy.assert_not_called()

    def test_exact_pair_offline_retained_consumer_suite(self):
        c = policy.contract()
        rows = sorted([{'name':r['name'], 'commit':r['commit']} for r in c['retained'] if r['newVsApplicationBase']],key=lambda r:r['name'])
        result = json.loads(subprocess.check_output(['node', str(ROOT/'tests/release-excluded-backend-compatibility-tests.js'), str(ROOT), c['productionCommit'], c['candidate'], json.dumps(rows)],text=True))
        self.assertEqual(result['passedFunctions'], [r['name'] for r in rows])
        self.assertEqual(result['networkCalls'], 0)


if __name__ == '__main__':
    unittest.main()
