"""Offline regression tests for the closed CCI publication and TEST reconciliation."""
import copy
import importlib.util
import unittest
from types import SimpleNamespace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


policy = load('bcc_policy_test', 'bcc-publication-policy.py')
guard = load('bcc_guard_test', 'check-production-bcc.py')
reconcile = load('bcc_reconcile_test', 'reconcile-test-bcc.py')
publisher = load('bcc_publisher_test', 'publish-approved-bcc-functions.py')
C = policy.contract()


def request():
    return {**{k: C[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']},
        'initialAutomaticMailEnabled': True, 'additionalBccFunctions': C['selected'],
        'bccMailTransition': copy.deepcopy(C['mailTransition']),
        'bccInfrastructure': {'api': 'cloudtasks.googleapis.com', 'queue': policy.QUEUE,
            'worker': C['worker'], 'ciMember': policy.CI, 'ciQueueRole': 'roles/cloudtasks.viewer',
            'runtimeIamChanges': False, 'smtpTest': False, 'approval': 'ok'}}


class PolicyTests(unittest.TestCase):
    def test_exact_scope(self):
        self.assertEqual(len(policy.approved(request())), 107)
        self.assertEqual(len(C['retained']), 6)
        policy.selection(request(), C['selected'])
        for key, value in [('candidate', '0' * 40), ('initialAutomaticMailEnabled', False),
                ('additionalBccFunctions', C['selected'][:-1]), ('additionalPdfFunctions', ['unexpected'])]:
            changed = request(); changed[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): policy.approved(changed)
        for key in request()['bccInfrastructure']:
            changed = request(); changed['bccInfrastructure'][key] = 'unexpected'
            with self.subTest(key=key), self.assertRaises(ValueError): policy.approved(changed)
        with self.assertRaises(ValueError): policy.selection(request(), C['selected'][:-1])

    def test_closed_fingerprints(self):
        functions = {str(i): {'state': 'ACTIVE'} for i in range(112)}
        result = policy.verify_fingerprints(C['beforeHashes'], C['afterHashes'], functions)
        self.assertEqual(result['newFunctions'], [C['worker']])
        for before, after, inventory in [(C['beforeHashes'], {}, functions),
                ({}, C['afterHashes'], functions), (C['beforeHashes'], C['afterHashes'], {})]:
            with self.assertRaises(ValueError): policy.verify_fingerprints(before, after, inventory)
        functions['0']['state'] = 'FAILED'
        with self.assertRaises(ValueError): policy.verify_fingerprints(C['beforeHashes'], C['afterHashes'], functions)

    def test_worker_secrets_and_limits(self):
        reference = {'serviceConfig': {'serviceAccountEmail': '718081132564-compute@developer.gserviceaccount.com',
            'secretEnvironmentVariables': [{'key': k, 'secret': k, 'projectId': 'livepalmes', 'version': 'latest'}
                for k in sorted(policy.MAIL_KEYS)], 'environmentVariables': {'FUNCTION_TARGET': policy.REFERENCE}}}
        result = policy.worker_service(reference)
        self.assertEqual((result['timeoutSeconds'], result['availableMemory'], result['maxInstanceCount'],
            result['maxInstanceRequestConcurrency']), (540, '1Gi', 1, 1))
        self.assertEqual(result['environmentVariables']['FUNCTION_TARGET'], C['worker'])
        self.assertEqual(reference['serviceConfig']['environmentVariables']['FUNCTION_TARGET'], policy.REFERENCE)
        for key, value in [('projectId', 'other-project'), ('version', ''), ('secret', 'OTHER_SECRET')]:
            changed = copy.deepcopy(reference); changed['serviceConfig']['secretEnvironmentVariables'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): policy.worker_service(changed)
        changed = copy.deepcopy(reference); changed['serviceConfig']['serviceAccountEmail'] = 'other@example.com'
        with self.assertRaises(ValueError): policy.worker_service(changed)

    def test_reconciled_attestation(self):
        source = {'path': '.github/workflows/livepalmes-test-notifications-reconcile.yml', 'head_sha': 'a' * 40}
        proof = {'schema': 1, 'candidate': C['candidate'], 'reconciliation': {'schema': 1,
            'suite': 'bcc-current-test-v1', 'testRun': C['testRun'], 'toolingCommit': source['head_sha'],
            'hostingUnchanged': True, 'mailSettingUnchanged': True, 'otherFunctionsUnchanged': True},
            'state': {'functions': [{'name': n} for n in C['testReconciliationFunctions']]}}
        policy.reconciled_proof(request(), proof, source)
        for key in ['hostingUnchanged', 'mailSettingUnchanged', 'otherFunctionsUnchanged', 'toolingCommit']:
            changed = copy.deepcopy(proof); changed['reconciliation'][key] = False
            with self.subTest(key=key), self.assertRaises(ValueError): policy.reconciled_proof(request(), changed, source)
        source['path'] = '.github/workflows/other.yml'
        with self.assertRaises(ValueError): policy.reconciled_proof(request(), proof, source)


class ReconciliationTests(unittest.TestCase):
    def test_main_test_only(self):
        sha = 'a' * 40
        env = {'GITHUB_REF': 'refs/heads/main', 'GITHUB_RUN_ATTEMPT': '1', 'GITHUB_SHA': sha,
            'CONFIRMATION': 'livepalmes-test', 'TARGET_FIREBASE_PROJECT': 'livepalmes-test',
            'GCLOUD_PROJECT': 'livepalmes-test', 'GOOGLE_CLOUD_PROJECT': 'livepalmes-test'}
        reconcile.guard(env, C['candidate'], sha)
        for key in env:
            changed = {**env, key: 'livepalmes'}
            with self.subTest(key=key), self.assertRaises(ValueError): reconcile.guard(changed, C['candidate'], sha)

    def test_no_other_export_or_hosting_change(self):
        selected = C['testReconciliationFunctions']
        before = {'hosting': {'version': C['testHosting']}, 'functions': [
            {'name': n, 'state': 'ACTIVE', 'commit': 'old', 'revision': 'old', 'updateTime': 'old'}
            for n in selected + ['untouched' + str(i) for i in range(108)]]}
        after = copy.deepcopy(before)
        for row in after['functions'][:7]: row.update(commit=C['candidate'], revision='new', updateTime='new')
        reconcile.verify_state(before, after, selected, C['candidate'])
        after['functions'][-1]['revision'] = 'changed'
        with self.assertRaises(ValueError): reconcile.verify_state(before, after, selected, C['candidate'])
        after = copy.deepcopy(before); after['hosting']['version'] = 'changed'
        with self.assertRaises(ValueError): reconcile.verify_state(before, after, selected, C['candidate'])


class InfrastructureTests(unittest.TestCase):
    def test_pause_resume_without_replay(self):
        since = '2026-10-22T21:02:00Z'
        pause = '2026-10-26T10:00:00Z'
        document = {'fields': {'scope': {'stringValue': 'all'}, 'enabled': {'booleanValue': False},
            'revision': {'integerValue': '6'}, 'enabledSince': {'stringValue': since},
            'discardThrough': {'stringValue': pause}, 'updatedAt': {'stringValue': pause}}}
        transition = {'immutableSha256': guard.immutable_mail(document), 'enabledSince': since,
            'pauseRevision': 6, 'resumeRevision': 7}
        witness = guard.check_mail(document, transition, 'paused')
        guard.check_mail(document, transition, 'paused', witness)
        changed = copy.deepcopy(document); changed['fields']['updatedBy'] = {'stringValue': 'drift'}
        with self.assertRaises(ValueError): guard.check_mail(changed, transition, 'paused', witness)
        resumed = copy.deepcopy(document)
        resumed['fields'].update(enabled={'booleanValue': True}, revision={'integerValue': '7'},
            enabledSince={'stringValue': '2026-10-26T11:00:00Z'}, updatedAt={'stringValue': '2026-10-26T11:00:00Z'})
        guard.check_mail(resumed, transition, 'resumed', witness)
        with self.assertRaises(ValueError): guard.check_mail(resumed, transition, 'resumed')
        resumed['fields']['enabledSince'] = {'stringValue': since}
        with self.assertRaises(ValueError): guard.check_mail(resumed, transition, 'resumed', witness)

    def test_queue_and_unknown_configuration(self):
        queue = {'name': policy.QUEUE, 'state': 'RUNNING',
            'rateLimits': {'maxConcurrentDispatches': 1, 'maxDispatchesPerSecond': 1},
            'retryConfig': {'maxAttempts': 3, 'minBackoff': '60s', 'maxBackoff': '300s'}}
        baseline = guard.check_queue(queue)
        queue['unexpectedConfiguration'] = True
        self.assertNotEqual(baseline, guard.check_queue(queue))
        queue['rateLimits']['maxConcurrentDispatches'] = 2
        with self.assertRaises(ValueError): guard.check_queue(queue)

    def test_mail_unknown_fields_are_not_ignored(self):
        document = {'fields': {'scope': {'stringValue': 'all'}, 'enabled': {'booleanValue': True},
            'revision': {'integerValue': '5'}}}
        transition = {'initialSha256': guard.digest(document), 'immutableSha256': guard.immutable_mail(document)}
        guard.check_mail(document, transition, 'initial')
        document['fields']['unknown'] = {'stringValue': 'drift'}
        with self.assertRaises(ValueError): guard.check_mail(document, transition, 'initial')
        with self.assertRaises(ValueError): guard.get('https://example.com', 'never-used')

    def test_scheduler_execution_outputs_only(self):
        scheduler = {'state': 'ENABLED', 'schedule': '*/5 * * * *', 'timeZone': 'Europe/Paris'}
        digest = guard.scheduler_digest(scheduler)
        scheduler['lastAttemptTime'] = 'changed'
        self.assertEqual(digest, guard.scheduler_digest(scheduler))
        scheduler['httpTarget'] = {'uri': 'changed'}
        self.assertNotEqual(digest, guard.scheduler_digest(scheduler))
        scheduler['schedule'] = '* * * * *'
        with self.assertRaises(ValueError): guard.scheduler_digest(scheduler)


class PublisherTests(unittest.TestCase):
    def test_resume_requires_attested_identity(self):
        prefix = 'projects/livepalmes/locations/europe-west1/functions/'
        old = {'name': prefix + 'existing', 'state': 'ACTIVE', 'revision': 'old', 'labels': {}}
        retained = {'name': prefix + 'retained', 'revision': 'unchanged'}
        state = SimpleNamespace(PREFIX=prefix, identity=lambda f: {k:v for k,v in f.items() if k != 'labels'},
            rollback_patch=lambda f, _: {'buildConfig': {}, 'serviceConfig': {}, 'eventTrigger': None})
        before = {old['name']: old, retained['name']: retained}
        names = ['existing', C['worker']]
        self.assertEqual(publisher.pending(names, before, copy.deepcopy(before), {}, C['candidate'], state, policy, {}), names)
        current = copy.deepcopy(before)
        current[old['name']].update(revision='new', labels={'livepalmes-commit': C['candidate']})
        with self.assertRaises(ValueError): publisher.pending(names, before, current, {}, C['candidate'], state, policy, {})
        attested = {old['name']: state.identity(current[old['name']])}
        self.assertEqual(publisher.pending(names, before, current, attested, C['candidate'], state, policy, {}), [C['worker']])
        current[retained['name']]['revision'] = 'drift'
        with self.assertRaises(ValueError): publisher.pending(names, before, current, attested, C['candidate'], state, policy, {})

    def test_workflow_failure_is_enforced(self):
        workflow = (ROOT / '.github/workflows/livepalmes-production-release.yml').read_text(encoding='utf-8')
        self.assertIn('BCC_PRESERVATION: ${{ steps.plan.outputs.bcc_preservation }}', workflow)
        self.assertIn('BCC_AFTER: ${{ steps.bcc_after.outcome }}', workflow)
        self.assertIn('test "$BCC_AFTER" = success', workflow)
        self.assertLess(workflow.index('id: hosting'), workflow.index('id: bcc_after'))
        test_workflow = (ROOT / '.github/workflows/livepalmes-test-notifications-reconcile.yml').read_text(encoding='utf-8')
        self.assertNotIn('FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_BACKEND', test_workflow)
        self.assertNotIn('--only hosting', test_workflow)


if __name__ == '__main__':
    unittest.main()
