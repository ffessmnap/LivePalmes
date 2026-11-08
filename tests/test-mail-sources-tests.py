"""Closed TEST mail sources: all network/cloud operations are fixtures."""
import copy
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('test_mail_sources', ROOT / 'tools/publish-test-mail-sources.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
SHA = 'c' * 40


def function(name):
    return {'name': p.PREFIX + name, 'environment': 'GEN_2', 'state': 'ACTIVE', 'updateTime': 'before',
        'labels': {'livepalmes-commit': 'b' * 40, 'preserve': 'yes'},
        'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name, 'environmentVariables': {'KEEP': 'build'},
            'source': {'storageSource': {'bucket': 'before', 'object': 'before'}}},
        'serviceConfig': {'revision': 'before-revision', 'serviceAccountEmail': 'runtime@example.invalid',
            'environmentVariables': {'LIVEPALMES_ENFORCE_APP_CHECK': 'false'},
            'secretEnvironmentVariables': [{'key': 'LIVEPALMES_NAP_PASSWORD', 'secret': 'LIVEPALMES_NAP_PASSWORD', 'version': '7'}]}}


def zipped(source='const { defineBoolean, defineSecret } = require("firebase-functions/params");'):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as archive:
        archive.writestr('index.js', source)
        archive.writestr('helper.js', 'module.exports = 1;')
    return stream.getvalue()


def credentials_file(directory, **overrides):
    path = Path(directory) / 'test.json'
    path.write_text(json.dumps({'type': 'service_account', 'project_id': p.PROJECT,
        'client_email': p.DEPLOYER, 'private_key': 'private-key-never-logged', **overrides}))
    return path


class MailSources(unittest.TestCase):
    def test_closed_run_logs_capture_ansi_with_old_and_new_cli_without_rendering(self):
        marker = 'ValueError: Source distante differente de l’archive autorisee'
        raw = ('\x1b[36m' + marker + '\x1b[0m').encode('utf-8')
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes'}):
            for help_text in [b'old CLI help', b'--allow-escape-sequences Allow printing terminal escape sequences']:
                with patch.object(p.subprocess, 'check_output', side_effect=[help_text, raw]) as command, \
                        contextlib.redirect_stdout(io.StringIO()) as output:
                    self.assertIn(marker, p.closed_run_logs(128651255167))
                    self.assertEqual(output.getvalue(), '')
                    args = command.call_args_list[-1].args[0]
                    self.assertEqual('--allow-escape-sequences' in args, b'--allow-escape-sequences' in help_text)
            with patch.object(p.subprocess, 'check_output', side_effect=[b'help', b'x' * (4 * 1024**2)]), \
                    self.assertRaisesRegex(ValueError, 'trop volumineux'):
                p.closed_run_logs(128651255167)

    def test_managed_archive_requires_exact_generation_paths_bytes_and_stable_reference(self):
        name = 'processNapNotificationTask'
        current = function(name)
        source = {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': name + '/function-source.zip', 'generation': '123'}
        current['buildConfig'].update(source={'storageSource': source}, sourceProvenance={'resolvedStorageSource': source})
        data = zipped()
        url = 'https://storage.googleapis.com/' + source['bucket'] + '/' + source['object'] + '?private-signature=never-log'
        response = MagicMock(); response.__enter__.return_value.headers = {'x-goog-generation': '123'}
        response.__enter__.return_value.read.return_value = data
        def attest(answers=None):
            with patch.object(p.state, 'request', side_effect=answers or [current, {'downloadUrl': url}, current]) as request, \
                    patch.object(p.urllib.request, 'urlopen', return_value=response):
                result = p.attest_source(current, data)
                self.assertEqual([c.args[1] if len(c.args) > 1 else 'GET' for c in request.call_args_list], ['GET', 'POST', 'GET'])
                self.assertTrue(request.call_args_list[1].args[0].endswith(':generateDownloadUrl'))
                return result
        result = attest()
        self.assertEqual(result['archiveSha256'], p.hashlib.sha256(data).hexdigest())
        self.assertTrue(result['generationReadAndReferencesRechecked'])
        response.__enter__.return_value.read.assert_called_with(64 * 1024**2 + 1)
        for changed_data, generation in [(zipped('changed file bytes'), '123'), (data, '124')]:
            response.__enter__.return_value.read.return_value = changed_data
            response.__enter__.return_value.headers = {'x-goog-generation': generation}
            with self.assertRaises(ValueError): attest()
        response.__enter__.return_value.read.return_value = data
        response.__enter__.return_value.headers = {'x-goog-generation': '123'}
        changed = copy.deepcopy(current); changed['buildConfig']['source']['storageSource']['generation'] = '124'
        with self.assertRaises(ValueError): attest([current, {'downloadUrl': url}, changed])
        with self.assertRaisesRegex(ValueError, 'Destination lecture'):
            attest([current, {'downloadUrl': 'https://example.invalid/private-signature'}])
        with patch.object(p.state, 'request', side_effect=[current, {'downloadUrl': url}]), \
                patch.object(p.urllib.request, 'urlopen', side_effect=urllib.error.HTTPError(url, 403, 'private-signature', {}, None)), \
                self.assertRaisesRegex(ValueError, 'HTTP 403') as error:
            p.attest_source(current, data)
        self.assertNotIn('private-signature', str(error.exception))
        oversized = MagicMock(); oversized.file_size = 64 * 1024**2 + 1
        fake_archive = MagicMock(); fake_archive.__enter__.return_value.infolist.return_value = [oversized]
        with patch.object(p.zipfile, 'ZipFile', return_value=fake_archive), self.assertRaisesRegex(ValueError, 'hors limite'):
            p.archive_identity(data)
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            archive.writestr('same.js', 'first')
            with self.assertWarns(UserWarning): archive.writestr('same.js', 'second')
        with self.assertRaisesRegex(ValueError, 'dupliquee'): p.archive_identity(stream.getvalue())
        with self.assertRaisesRegex(ValueError, 'Chemin'): p.archive_identity(zipped().replace(b'index.js', b'../xx.js'))

    def test_recovery_is_closed_read_only_and_preserves_every_other_function(self):
        entry = copy.deepcopy(p.contract('models')); original_sha = entry['recovery']['sourceCandidate']
        old = [function(name) for name in sorted(p.ALLOWED | {'ordinary'})]
        current = copy.deepcopy(old)
        for row in current:
            name = row['name'].split('/')[-1]
            if name not in p.ALLOWED: continue
            source = {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': name + '/function-source.zip', 'generation': '123'}
            row['buildConfig'].update(source={'storageSource': source}, sourceProvenance={'resolvedStorageSource': source})
            row['labels']['livepalmes-commit'] = original_sha
            row['updateTime'] = 'after'; row['serviceConfig']['revision'] = 'after'
        recovery = entry['recovery']
        recovery.update(beforeCompactSha256=p.digest(p.compact(old)), beforeFunctionHashes={f['name']: p.digest(f) for f in old},
            beforeConfigurationHashes={f['name']: p.configuration_identity(f) for f in old}, selected={
                f['name'].split('/')[-1]: {'afterFunctionSha256': p.digest(f), 'source': p.managed_source(f),
                    'archiveSha256': 'archive', 'archiveIdentity': 'identity'}
                for f in current if f['name'].split('/')[-1] in p.ALLOWED})
        run = {'head_sha': original_sha, 'head_branch': 'main', 'path': p.WORKFLOW, 'run_attempt': 1, 'status': 'completed', 'conclusion': 'failure'}
        steps = [{'name': name, 'conclusion': conclusion} for name, conclusion in [
            ('Authentifier les preuves et constater les preconditions deja satisfaites', 'success'),
            ('Publier seulement les sources calculees et autorisees', 'success'),
            ('Verifier revisions et preservation de tous les etats', 'failure')]]
        logs = '\n'.join('Source TEST actualisee : ' + name for name in p.ALLOWED) + '\nValueError: Source distante differente de l’archive autorisee : closeDueEngagementCompetitions'
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes'}), \
                patch.object(p.cycle, 'gh', side_effect=lambda path: {'jobs': [{'id': 123, 'steps': steps}]} if '/jobs?' in path else run), \
                patch.object(p.cycle, 'run', side_effect=lambda args, *_: logs if args[0] == 'gh' else ''), \
                patch.object(p, 'closed_run_logs', return_value=logs), \
                patch.object(p, 'baseline', return_value={'functions': p.compact(old), 'hosting': {}}), \
                patch.object(p, 'inventory', side_effect=lambda: copy.deepcopy(current)), patch.object(p, 'controls', return_value={}), \
                patch.object(p.cycle, 'snapshot', side_effect=lambda *_: {'functions': p.compact(current), 'hosting': {}}), \
                patch.object(p.archive_helper, 'test_archive', return_value=zipped()), \
                patch.object(p, 'attest_source', return_value={'archiveSha256': 'archive', 'archiveIdentity': 'identity'}), \
                patch.object(p.state, 'request') as request:
            p.recover_models(entry, ROOT, SHA, Path(directory))
            proof = p.cycle.read(Path(directory) / 'test-backend-proof.json')
            self.assertTrue(proof['readOnlyRecovery']); self.assertEqual(proof['originalRunConclusion'], 'failure')
            self.assertFalse(proof['originalUploadReceiptsAvailable']); self.assertFalse(proof['originalControlsHashesAvailable'])
            self.assertEqual(set(proof['managedSources']), p.ALLOWED)
            request.assert_not_called()
            ordinary = next(f for f in current if f['name'].endswith('/ordinary'))
            ordinary['serviceConfig']['environmentVariables']['KEEP'] = 'changed'
            with self.assertRaisesRegex(ValueError, 'reprise modifiee'): p.recover_models(entry, ROOT, SHA, Path(directory))
            ordinary['serviceConfig']['environmentVariables'].pop('KEEP')
            recovery['run'] = 42
            with self.assertRaisesRegex(ValueError, 'hors run ferme'): p.recover_models(entry, ROOT, SHA, Path(directory))
            recovery['run'] = 42454743001
            run['head_sha'] = 'd' * 40
            with self.assertRaisesRegex(ValueError, 'non authentifie'): p.recover_models(entry, ROOT, SHA, Path(directory))

    def test_failure_diagnostic_never_exports_raw_configuration_credentials_or_sources(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'GITHUB_RUN_ID': '123'}), \
                patch.object(p, 'guard', return_value=SHA), patch.object(p, 'credential_identity') as identity, \
                patch.object(p.state, 'request') as request, patch.object(p.urllib.request, 'urlopen') as urlopen:
            directory = Path(directory)
            before = function('processNapNotificationTask')
            before['serviceConfig']['environmentVariables']['PRIVATE'] = 'private-env-never-export'
            p.cycle.write(directory / 'before.json', [before])
            p.cycle.write(directory / 'controls.json', {'mailSha256': 'a' * 64, 'private': 'private-control-never-export'})
            p.cycle.write(directory / 'plan.json', {'candidate': SHA, 'selected': ['processNapNotificationTask'], 'credentials': 'private-key-never-export'})
            p.cycle.write(directory / 'uploads.json', {'processNapNotificationTask': {'storageSource': {'bucket': 'test', 'object': 'source.zip', 'generation': '123'}, 'archiveSha256': 'b' * 64}})
            p.main('diagnostic', 'models', directory, ROOT)
            raw = (directory / 'failure-diagnostic.json').read_text()
            diagnostic = json.loads(raw)
            self.assertFalse(diagnostic['successProof'])
            self.assertEqual(diagnostic['outcome'], 'failure-diagnostic-only')
            self.assertIn('functionSha256', diagnostic['beforeFunctionWitnesses'][before['name']])
            self.assertNotIn('private-', raw); self.assertNotIn('environmentVariables', raw)
            self.assertNotIn('before.json', raw); self.assertNotIn('credentials', raw)
            for mock in [identity, request, urlopen]: mock.assert_not_called()

    def test_inventory_normalizes_only_complete_event_filter_order(self):
        original = function('syncEngagementMailRecipientIndex')
        original['eventTrigger'] = {'trigger': 'unchanged-trigger', 'eventType': 'unchanged-type',
            'eventFilters': [{'attribute': 'database', 'value': '(default)'},
                {'attribute': 'document', 'value': 'accounts/{id}', 'operator': 'match-path-pattern'},
                {'attribute': 'namespace', 'value': '(default)', 'extra': 'preserved'}]}
        original['serviceConfig']['secretEnvironmentVariables'].append({'key': 'KEEP', 'secret': 'KEEP', 'version': '3'})
        def read(value):
            with patch.object(p.cycle, 'api', return_value={'functions': [copy.deepcopy(value)]}):
                return p.inventory()
        reordered = copy.deepcopy(original)
        reordered['eventTrigger']['eventFilters'].reverse()
        before, after = read(original), read(reordered)
        self.assertEqual(before, after)
        p.verify(before, after, [], SHA, {})
        mutations = [lambda f: f['eventTrigger']['eventFilters'][0].update(attribute='changed'),
            lambda f: f['eventTrigger']['eventFilters'][0].update(value='changed'),
            lambda f: f['eventTrigger']['eventFilters'][1].update(operator='changed'),
            lambda f: f['eventTrigger']['eventFilters'][2].pop('extra'),
            lambda f: f['eventTrigger']['eventFilters'].pop(),
            lambda f: f['eventTrigger']['eventFilters'].append(copy.deepcopy(f['eventTrigger']['eventFilters'][0])),
            lambda f: f['serviceConfig']['secretEnvironmentVariables'].reverse(),
            lambda f: f.update(updateTime='changed'),
            lambda f: f['buildConfig']['source']['storageSource'].update(object='changed')]
        for mutate in mutations:
            changed = copy.deepcopy(original); mutate(changed)
            with self.assertRaisesRegex(ValueError, 'hors selection'):
                p.verify(before, read(changed), [], SHA, {})
        duplicate = copy.deepcopy(original)
        duplicate['eventTrigger']['eventFilters'].append(copy.deepcopy(duplicate['eventTrigger']['eventFilters'][0]))
        self.assertEqual(len(read(duplicate)[0]['eventTrigger']['eventFilters']), 4)

    def test_identity_diagnostic_checks_actual_credentials_without_cloud_access(self):
        with tempfile.TemporaryDirectory() as directory:
            credentials = credentials_file(directory)
            with patch.dict(os.environ, {'GOOGLE_APPLICATION_CREDENTIALS': str(credentials), 'GITHUB_RUN_ID': '123'}), \
                    patch.object(p, 'guard', return_value=SHA), \
                    patch.object(p, 'load', return_value=SimpleNamespace(reusable=MagicMock(return_value=True))), \
                    patch.object(p, 'inventory') as inventory, patch.object(p, 'controls') as controls, \
                    patch.object(p.cycle, 'snapshot') as snapshot, patch.object(p.urllib.request, 'urlopen') as urlopen, \
                    patch.object(p.state, 'request') as request, contextlib.redirect_stdout(io.StringIO()) as output:
                p.main('identity', 'models', directory, ROOT)
                proof = p.cycle.read(Path(directory) / 'identity-proof.json')
                self.assertEqual(proof, {'candidate': SHA, 'project': p.PROJECT, 'clientEmail': p.DEPLOYER,
                    'runId': '123', 'cloudMutation': False})
                self.assertEqual(output.getvalue(), 'Compte backend TEST confirme : ' + p.DEPLOYER + '\n')
                for mock in [inventory, controls, snapshot, urlopen, request]:
                    mock.assert_not_called()
                for wrong in [{'type': 'authorized_user'}, {'project_id': 'livepalmes'},
                              {'client_email': 'other@example.invalid'}, {'client_email': None}]:
                    credentials_file(directory, **wrong)
                    with self.assertRaisesRegex(ValueError, 'Identite backend TEST inattendue') as error:
                        p.credential_identity()
                    self.assertNotIn('private-key', str(error.exception))
                    self.assertNotIn('other@example.invalid', str(error.exception))
                credentials_file(directory, client_email='other@example.invalid')
                with self.assertRaisesRegex(ValueError, 'Identite backend TEST inattendue'):
                    p.main('prepare', 'models', directory, ROOT)
                inventory.assert_not_called(); snapshot.assert_not_called()

    def test_both_main_ci_proofs_are_required_before_cloud_reads(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'controls') as controls, patch.object(p.cycle, 'snapshot') as snapshot:
            for mode in ['prepare', 'recover', 'identity']:
                for answers in [[False], [True, False]]:
                    evidence = SimpleNamespace(reusable=MagicMock(side_effect=answers))
                    with patch.object(p, 'load', return_value=evidence), self.assertRaisesRegex(ValueError, 'CI main exacte'):
                        p.main(mode, 'models', directory, ROOT)
                    controls.assert_not_called(); snapshot.assert_not_called()

    def test_closed_contract_and_future_lot_not_implicitly_enabled(self):
        entry = p.contract('models')
        self.assertEqual(set(entry['fingerprints']), p.ALLOWED)
        decisions = p.contract('decisions')
        self.assertEqual(decisions['baseCommit'], '00f8b4ef8fa38630f3ce2e0bb023ed3a6ee65d65')
        self.assertEqual(set(decisions['fingerprints']), p.ALLOWED)
        self.assertTrue(set(decisions['fingerprints']) <= p.ALLOWED)
        with self.assertRaisesRegex(ValueError, 'non ferme'):
            p.contract('future')
        with patch.object(p, 'DIGEST', '0' * 64), self.assertRaisesRegex(ValueError, 'modifie'):
            p.contract('models')
        workflow = (ROOT / p.WORKFLOW).read_text(encoding='utf-8')
        self.assertIn('inputs.expected_commit == github.sha', workflow)
        self.assertIn('group: livepalmes-test-backend', workflow)
        self.assertIn('cancel-in-progress: false', workflow)
        self.assertNotIn('actions: write', workflow)
        self.assertNotIn('production', workflow)
        self.assertIn('if: inputs.identity_only', workflow)
        self.assertEqual(workflow.count('if: ${{ !inputs.identity_only && !inputs.recover_models }}'), 3)
        self.assertIn('!(inputs.identity_only && inputs.recover_models)', workflow)

    def test_contacts_have_a_separate_closed_contract_and_cannot_reuse_a_models_plan(self):
        entry = p.contract('contacts')
        self.assertNotEqual(p.CONTACTS_CONTRACT, p.CONTRACT)
        self.assertNotEqual(p.CONTACTS_DIGEST, p.DIGEST)
        self.assertEqual(entry['_contractSha256'], p.CONTACTS_DIGEST)
        self.assertEqual(entry['baseCommit'], '450727138cc4c795c368465602f53379e28aafae')
        self.assertEqual(entry['baselineRuns'][0]['id'], 42465038161)
        self.assertTrue(entry['fingerprints'] and set(entry['fingerprints']) <= p.ALLOWED)
        with patch.object(p, 'CONTACTS_DIGEST', '0' * 64), self.assertRaisesRegex(ValueError, 'modifie'):
            p.contract('contacts')
        with self.assertRaisesRegex(ValueError, 'non ferme'):
            p.contract('future-reminder')
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'controls') as controls, patch.object(p, 'inventory') as inventory, \
                patch.object(p, 'load', return_value=SimpleNamespace(reusable=lambda *_: True)):
            p.cycle.write(Path(directory) / 'plan.json', {'candidate': SHA, 'release': 'models',
                'contractSha256': p.DIGEST, 'selected': [], 'archives': []})
            with self.assertRaisesRegex(ValueError, 'Plan'):
                p.main('deploy', 'contacts', directory, ROOT)
            controls.assert_not_called(); inventory.assert_not_called()

    def test_reminder_has_its_own_anchor_baseline_and_digest(self):
        entry = p.contract('reminder')
        self.assertEqual(entry['_contractSha256'], p.REMINDER_DIGEST)
        self.assertNotIn(p.REMINDER_DIGEST, [p.DIGEST, p.CONTACTS_DIGEST])
        self.assertEqual(entry['baseCommit'], '9b9dae56aa98ee5a9dfd21d62651deb670c500f0')
        self.assertEqual(entry['baselineRuns'][0]['id'], 42472956878)
        self.assertEqual(set(entry['fingerprints']), p.ALLOWED)
        with patch.object(p, 'REMINDER_DIGEST', '0' * 64), self.assertRaisesRegex(ValueError, 'modifie'):
            p.contract('reminder')
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'controls') as controls, patch.object(p, 'inventory') as inventory, \
                patch.object(p, 'load', return_value=SimpleNamespace(reusable=lambda *_: True)):
            p.cycle.write(Path(directory) / 'plan.json', {'candidate': SHA, 'release': 'contacts',
                'contractSha256': p.CONTACTS_DIGEST, 'selected': [], 'archives': []})
            with self.assertRaisesRegex(ValueError, 'Plan'):
                p.main('deploy', 'reminder', directory, ROOT)
            controls.assert_not_called(); inventory.assert_not_called()

    def test_officials_txt_is_closed_to_its_own_three_sources_and_cannot_mix_plans(self):
        entry = p.contract('officials_txt')
        names = {'closeDueEngagementCompetitions', 'processNapCompetitionNotifications', 'processNapNotificationTask'}
        self.assertEqual(set(entry['fingerprints']), names)
        self.assertEqual(len(p.ALLOWED), 6)
        self.assertEqual(entry['applicationCommit'], '59ff046750ff9d102fb475e5d8284bfeed8ebb7b')
        self.assertEqual(entry['baseCommit'], '257f4271ebe03fef889bbd668fb5418c96f66d9a')
        self.assertEqual(entry['baselineRuns'][0]['id'], 42477367936)
        self.assertEqual(entry['_contractSha256'], p.OFFICIALS_TXT_DIGEST)
        self.assertNotIn(p.OFFICIALS_TXT_DIGEST, [p.DIGEST, p.CONTACTS_DIGEST, p.REMINDER_DIGEST])
        actual = p.cycle.test_backend_fingerprints(entry['applicationCommit'])
        self.assertEqual(entry['fingerprints'], {name: actual[name] for name in names})
        self.assertFalse(any(path.startswith('functions/') for path in entry['toolingPaths']))
        with patch.object(p, 'OFFICIALS_TXT_DIGEST', '0' * 64), self.assertRaisesRegex(ValueError, 'modifie'):
            p.contract('officials_txt')
        before = [function(name) for name in sorted(p.ALLOWED)]
        with patch.object(p.cycle, 'test_backend_fingerprints', side_effect=lambda sha: {name: sha for name in p.ALLOWED}):
            self.assertEqual(p.select(before, SHA, entry), sorted(names))
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'controls') as controls, patch.object(p, 'inventory') as inventory, \
                patch.object(p, 'load', return_value=SimpleNamespace(reusable=lambda *_: True)):
            for other, digest in [('models', p.DIGEST), ('contacts', p.CONTACTS_DIGEST), ('reminder', p.REMINDER_DIGEST)]:
                p.cycle.write(Path(directory) / 'plan.json', {'candidate': SHA, 'release': other,
                    'contractSha256': digest, 'selected': [], 'archives': []})
                with self.assertRaisesRegex(ValueError, 'Plan'):
                    p.main('deploy', 'officials_txt', directory, ROOT)
            controls.assert_not_called(); inventory.assert_not_called()

    def test_contacts_three_own_anchor_baseline_digest_and_no_cross_lot_plan(self):
        entry = p.contract('contacts_three')
        self.assertEqual(entry['applicationCommit'], '0f18ae53623947d1e984c2213d87bd2436efff3d')
        self.assertEqual(entry['baseCommit'], 'bb09ea8057943aff39b2600a3448fdd278a32908')
        self.assertEqual(entry['baselineRuns'], [{'id': 42487560642, 'artifact': 'test-proof',
            'workflow': '.github/workflows/livepalmes-test-common.yml'}])
        self.assertEqual(entry['_contractSha256'], p.CONTACTS_THREE_DIGEST)
        self.assertNotIn(p.CONTACTS_THREE_DIGEST, [p.DIGEST, p.CONTACTS_DIGEST, p.REMINDER_DIGEST, p.OFFICIALS_TXT_DIGEST])
        self.assertEqual(len(p.ALLOWED), 6)
        actual = p.cycle.test_backend_fingerprints(entry['applicationCommit'])
        base = p.cycle.test_backend_fingerprints(entry['baseCommit'])
        self.assertEqual(entry['fingerprints'], {name: actual[name] for name in p.ALLOWED if actual[name] != base[name]})
        self.assertEqual(set(entry['fingerprints']), p.ALLOWED)
        self.assertFalse(any(path.startswith(('functions/', 'assets/')) for path in entry['toolingPaths']))
        with patch.object(p, 'CONTACTS_THREE_DIGEST', '0' * 64), self.assertRaisesRegex(ValueError, 'modifie'):
            p.contract('contacts_three')
        with tempfile.TemporaryDirectory() as directory, patch.object(p, 'guard', return_value=SHA), \
                patch.object(p, 'controls') as controls, patch.object(p, 'inventory') as inventory, \
                patch.object(p, 'load', return_value=SimpleNamespace(reusable=lambda *_: True)):
            for other in ['models', 'decisions', 'contacts', 'reminder', 'officials_txt']:
                other_entry = p.contract(other)
                for plan_release in [other, 'contacts_three']:
                    p.cycle.write(Path(directory) / 'plan.json', {'candidate': SHA, 'release': plan_release,
                        'contractSha256': other_entry.get('_contractSha256', p.DIGEST), 'selected': [], 'archives': []})
                    with self.assertRaisesRegex(ValueError, 'Plan'):
                        p.main('deploy', 'contacts_three', directory, ROOT)
            controls.assert_not_called(); inventory.assert_not_called()

    def test_exact_main_ci_candidate_and_application_anchor(self):
        entry = p.contract('models')
        env = {'GITHUB_REF': 'refs/heads/main', 'GITHUB_RUN_ATTEMPT': '1', 'TARGET_FIREBASE_PROJECT': p.PROJECT,
               'CONFIRMATION': p.PROJECT, 'GITHUB_SHA': SHA, 'EXPECTED_COMMIT': SHA}
        paths = [p.WORKFLOW]
        def run(args, *_):
            return SHA if args[1] == 'rev-parse' else '\n'.join(paths) if args[1] == 'diff' else ''
        with patch.object(p.cycle, 'run', side_effect=run), patch.object(p.cycle, 'git', return_value=SHA), \
                patch.object(p.cycle, 'test_backend_fingerprints', return_value=entry['fingerprints']):
            self.assertEqual(p.guard(ROOT, entry, env), SHA)
            for key, bad in [('GITHUB_REF', 'refs/heads/codex/test'), ('TARGET_FIREBASE_PROJECT', 'livepalmes'),
                             ('GITHUB_RUN_ATTEMPT', '2'), ('EXPECTED_COMMIT', 'd' * 40), ('CONFIRMATION', '')]:
                with self.assertRaises(ValueError):
                    p.guard(ROOT, entry, {**env, key: bad})
            paths.append('functions/unapproved.js')
            with self.assertRaisesRegex(ValueError, 'applicatif hors contrat'):
                p.guard(ROOT, entry, env)

    def test_selection_is_calculated_and_unknown_origin_blocks(self):
        entry = p.contract('models')
        before = [function(name) for name in sorted(p.ALLOWED)]
        desired = entry['fingerprints']
        old = {name: '0' * 64 for name in desired}
        old[before[0]['name'].split('/')[-1]] = desired[before[0]['name'].split('/')[-1]]
        with patch.object(p.cycle, 'test_backend_fingerprints', side_effect=lambda sha: desired if sha == SHA else old):
            self.assertEqual(p.select(before, SHA, entry), sorted(set(desired) - {before[0]['name'].split('/')[-1]}))
            before[0]['labels'].clear()
            with self.assertRaisesRegex(ValueError, 'Provenance'):
                p.select(before, SHA, entry)

    def test_patch_mask_and_all_function_configurations_are_preserved(self):
        name = 'processNapNotificationTask'
        before = [function(name), function('submitEngagementAccessRequest')]
        source = {'bucket': 'test-source', 'object': 'closed.zip', 'generation': '1'}
        body = p.source_patch(before[0], source, SHA)
        self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
        self.assertEqual(set(body['buildConfig']), {'source'})
        after = copy.deepcopy(before)
        after[0]['buildConfig']['source'] = {'storageSource': source}
        after[0]['serviceConfig']['revision'] = 'new-revision'
        after[0]['updateTime'] = 'after'
        after[0]['labels']['livepalmes-commit'] = SHA
        sources = {name: source}
        p.verify(before, after, [name], SHA, sources)
        mutations = [lambda f: f['serviceConfig']['environmentVariables'].update(SMTP_HOST='forbidden'),
                     lambda f: f['serviceConfig'].update(serviceAccountEmail='other@example.invalid'),
                     lambda f: f['serviceConfig']['secretEnvironmentVariables'].append({'key': 'SMTP'}),
                     lambda f: f['buildConfig'].update(runtime='nodejs24'),
                     lambda f: f.update(eventTrigger={'eventType': 'changed'}),
                     lambda f: f['labels'].update(unapproved='label')]
        for mutate in mutations:
            changed = copy.deepcopy(after); mutate(changed[0])
            with self.assertRaises(ValueError):
                p.verify(before, changed, [name], SHA, sources)
        changed = copy.deepcopy(after); changed[1]['updateTime'] = 'unapproved'
        with self.assertRaisesRegex(ValueError, 'hors selection'):
            p.verify(before, changed, [name], SHA, sources)
        changed = copy.deepcopy(after); changed[0]['buildConfig']['source']['storageSource']['object'] = 'other.zip'
        with self.assertRaisesRegex(ValueError, 'Source distante'):
            p.verify(before, changed, [name], SHA, sources)
        with self.assertRaises(ValueError):
            p.source_patch(function('unapproved'), source, SHA)

    def fixture_controls(self, *, active=False, overflow=False, payload=False, forbidden=False, task_name='one', pagination=False, missing=False, task_pages=None):
        calls = []
        task_index = 0
        def fetch(request, **_):
            nonlocal task_index
            calls.append((request.full_url, request.get_method(), None if request.data is None else json.loads(request.data)))
            url = request.full_url
            if '/tasks?' in url:
                if forbidden == 'tasks':
                    raise urllib.error.HTTPError(url, 403, 'private error body', {}, None)
                task = {'name': f'projects/{p.PROJECT}/locations/europe-west1/queues/processNapNotificationTask/tasks/{task_name}', 'createTime': 'created', 'scheduleTime': 'scheduled'}
                if missing:
                    task.pop('createTime')
                if payload:
                    task['httpRequest'] = {'body': 'private-body', 'headers': {'private': 'header'}}
                value = {'tasks': [task]}
                if pagination:
                    value['nextPageToken'] = 'repeated'
                if task_pages is not None:
                    value = task_pages[task_index]
                    task_index += 1
            elif 'cloudtasks' in url:
                if forbidden is True:
                    raise urllib.error.HTTPError(url, 403, 'private error body', {}, None)
                value = {'name': 'queue', 'state': 'RUNNING' if active else 'PAUSED', 'stats': {'tasksCount': 2}}
            elif 'cloudscheduler' in url:
                value = {'name': 'scheduler', 'state': 'PAUSED'}
            elif ':runQuery' in url:
                query = json.loads(request.data)['structuredQuery']
                self.assertEqual(query['select'], {'fields': [{'fieldPath': '__name__'}]})
                documents = [{'document': {'name': 'technical', 'updateTime': 'unchanged'}}]
                if overflow:
                    documents *= query['limit']
                if payload:
                    documents[0]['document']['fields'] = {'textBody': 'forbidden'}
                value = documents
            else:
                value = {'fields': {'enabled': {'booleanValue': False}}}
            response = MagicMock(); response.__enter__.return_value.read.return_value = json.dumps(value).encode()
            return response
        return calls, fetch

    def test_metadata_only_bounded_reads_and_preconditions_are_never_corrected(self):
        with tempfile.TemporaryDirectory() as directory:
            credentials = credentials_file(directory)
            with patch.dict(os.environ, {'GOOGLE_APPLICATION_CREDENTIALS': str(credentials)}), patch.object(p.cycle, 'run', return_value='private-token'):
                calls, fetch = self.fixture_controls()
                with patch.object(p.urllib.request, 'urlopen', side_effect=fetch):
                    value = p.controls()
                self.assertTrue(value['queuePaused']); self.assertEqual(len(calls), 6)
                self.assertTrue(all('responseView=BASIC' in url and 'fields=tasks(name,createTime,scheduleTime,dispatchCount,responseCount),nextPageToken' in url for url, *_ in calls if '/tasks?' in url))
                self.assertTrue(all(method == 'GET' or method == 'POST' and ':runQuery' in url for url, method, _ in calls))
                for kwargs in [{'active': True}, {'overflow': True}, {'payload': True}, {'forbidden': True}, {'forbidden': 'tasks'}, {'pagination': True}, {'missing': True}]:
                    calls, fetch = self.fixture_controls(**kwargs)
                    with patch.object(p.urllib.request, 'urlopen', side_effect=fetch), self.assertRaises(ValueError) as error:
                        p.controls()
                    self.assertNotIn('private-token', str(error.exception)); self.assertNotIn('private error body', str(error.exception))
                    if kwargs.get('forbidden') == 'tasks':
                        self.assertIn('taches', str(error.exception))
                    self.assertFalse(any(method in {'PATCH', 'PUT', 'DELETE'} for _, method, _ in calls))
                _, fetch = self.fixture_controls(task_name='replacement-at-same-count')
                with patch.object(p.urllib.request, 'urlopen', side_effect=fetch):
                    changed = p.controls()
                self.assertEqual(value['taskMetadata']['count'], changed['taskMetadata']['count'])
                self.assertNotEqual(value['taskMetadata']['sha256'], changed['taskMetadata']['sha256'])

    def test_task_metadata_pagination_order_empty_and_truncation(self):
        def task(index):
            return {'name': f'projects/{p.PROJECT}/locations/europe-west1/queues/processNapNotificationTask/tasks/{index}', 'createTime': 'created', 'scheduleTime': 'scheduled'}
        with tempfile.TemporaryDirectory() as directory:
            credentials = credentials_file(directory)
            with patch.dict(os.environ, {'GOOGLE_APPLICATION_CREDENTIALS': str(credentials)}), patch.object(p.cycle, 'run', return_value='private-token'):
                def witness(pages):
                    _, fetch = self.fixture_controls(task_pages=pages)
                    with patch.object(p.urllib.request, 'urlopen', side_effect=fetch):
                        return p.controls()
                first = witness([{'tasks': [task(1)], 'nextPageToken': 'next'}, {'tasks': [task(2)]}])
                reordered = witness([{'tasks': [task(2)], 'nextPageToken': 'next'}, {'tasks': [task(1)]}])
                self.assertEqual(first['taskMetadata'], reordered['taskMetadata'])
                self.assertEqual(witness([{}])['taskMetadata']['count'], 0)
                with self.assertRaisesRegex(ValueError, 'tronquees'):
                    witness([{'tasks': [task(i)], 'nextPageToken': f'next-{i}'} for i in range(10)])
                with self.assertRaisesRegex(ValueError, 'dupliquee'):
                    witness([{'tasks': [task(1)], 'nextPageToken': 'next'}, {'tasks': [task(1)]}])

    def test_common_publication_and_final_check_preserve_the_six_retained_revisions(self):
        safe = p.cycle.safe_functions(ROOT, p.PROJECT)
        self.assertTrue(p.ALLOWED.isdisjoint(safe), 'No extension of the ordinary selector is needed')
        names = sorted(set(safe) | p.ALLOWED)
        previous = {'hosting': {'version': 'previous'}, 'functions': p.compact([function(name) for name in names])}
        current = copy.deepcopy(previous)
        for row in current['functions']:
            if row['name'].split('/')[-1] in p.ALLOWED:
                row.update(commit=SHA, revision='retained-new', updateTime='retained-after')
        ordinary = {'getEngagementAutomaticMailControl', 'updateEngagementAutomaticMailControl', 'notifyEngagementCompetitionDocuments',
                    'sendEngagementPreparedEmails', 'prepareEngagementLicenseControlBatch', 'resolveEngagementSwimmerChangeRequest',
                    'updateEngagementCompetition', 'processEngagementQualificationJob', 'grantEngagementQualificationException'}
        self.assertTrue(ordinary <= set(safe))
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'CANDIDATE_SHA': SHA, 'GITHUB_RUN_ID': '123', 'APPLICATION_CHECKS': 'success'}), contextlib.redirect_stdout(io.StringIO()):
            directory = Path(directory)
            p.cycle.write(directory / 'previous-test/test-proof.json', {'state': previous})
            with patch.object(p.cycle, 'snapshot', return_value=current), patch.object(p.cycle, 'latest_run', return_value=1), \
                    patch.object(p.cycle, 'artifact'), patch.object(p.cycle, 'targeted_test_evidence', return_value=set()), \
                    patch.object(p.cycle, 'needs_function', side_effect=lambda _, name, *args, **kwargs: name in ordinary), patch.object(p.cycle, 'output'):
                p.cycle.test_selection(directory, ROOT)
            selected = p.cycle.read(directory / 'test-selection.json')
            self.assertEqual(set(selected), ordinary)
            after = copy.deepcopy(current)
            for row in after['functions']:
                if row['name'].split('/')[-1] in ordinary:
                    row.update(commit=SHA, revision='ordinary-new', updateTime='ordinary-after')
            after['hosting'] = {'version': 'new', 'message': f'LivePalmes {SHA} run 123'}
            with patch.object(p.cycle, 'snapshot', return_value=after), patch.object(p.cycle, 'needs_function', return_value=False):
                p.cycle.check_test(directory, ROOT)
                p.cycle.proof(directory)
            proof = p.cycle.read(directory / 'test-proof.json')
            retained = [f for f in proof['state']['functions'] if f['name'].split('/')[-1] in p.ALLOWED]
            self.assertEqual(len(retained), 6)
            self.assertTrue(all(f['commit'] == SHA and f['revision'] == 'retained-new' for f in retained))
            p.cycle.write(directory / 'previous-test/test-proof.json', proof)
            with patch.object(p.cycle, 'snapshot', return_value=after), patch.object(p.cycle, 'latest_run', return_value=2), \
                    patch.object(p.cycle, 'artifact'), patch.object(p.cycle, 'targeted_test_evidence', return_value=set()), \
                    patch.object(p.cycle, 'needs_function', return_value=False), patch.object(p.cycle, 'output'):
                p.cycle.test_selection(directory, ROOT)
                p.cycle.check_test(directory, ROOT)
            self.assertEqual(p.cycle.read(directory / 'test-selection.json'), [])

    def test_deploy_attests_exact_uploaded_generation_and_never_updates_other_fields(self):
        name = 'processNapNotificationTask'
        before, data = [function(name)], zipped()
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            row = {'file': 'source-0.zip', 'names': [name], 'sha256': p.hashlib.sha256(data).hexdigest()}
            plan = {'candidate': SHA, 'release': 'models', 'contractSha256': p.DIGEST, 'selected': [name], 'archives': [row]}
            for filename, value in [('plan.json', plan), ('before.json', before), ('controls.json', {}), ('hosting.json', {})]:
                p.cycle.write(directory / filename, value)
            (directory / row['file']).write_bytes(data)
            calls = []
            def api(url, method='GET', body=None):
                calls.append((url, method, body))
                if url.endswith(':generateUploadUrl'):
                    return {'uploadUrl': 'https://storage.googleapis.com/test/source.zip', 'storageSource': {'bucket': 'test', 'object': 'source.zip', 'generation': '0'}}
                self.assertTrue(url.endswith('?updateMask=build_config.source,labels'))
                self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
                self.assertEqual(body['buildConfig']['source']['storageSource']['generation'], '123')
                return {'done': True}
            response = MagicMock(); response.__enter__.return_value.headers = {'x-goog-generation': '123'}
            with patch.object(p, 'guard', return_value=SHA), patch.object(p, 'controls', return_value={}), \
                    patch.object(p, 'inventory', return_value=before), patch.object(p, 'select', return_value=[name]), \
                    patch.object(p.cycle, 'snapshot', return_value={'hosting': {}}), patch.object(p.archive_helper, 'test_archive', return_value=data), \
                    patch.object(p.state, 'request', side_effect=api), patch.object(p.state, 'wait_operation'), \
                    patch.object(p.urllib.request, 'urlopen', return_value=response), contextlib.redirect_stdout(io.StringIO()):
                p.main('deploy', 'models', directory, ROOT)
                self.assertEqual(len(calls), 2)
                upload = p.cycle.read(directory / 'uploads.json')[name]
                self.assertEqual(upload['storageSource'], {'bucket': 'test', 'object': 'source.zip', 'generation': '123'})
                self.assertEqual(upload['archiveSha256'], row['sha256'])
                calls.clear(); response.__enter__.return_value.headers = {}
                with self.assertRaisesRegex(ValueError, 'Generation exacte'):
                    p.main('deploy', 'models', directory, ROOT)
                self.assertEqual(len(calls), 1, 'No function PATCH without the exact uploaded generation')
                calls.clear(); plan['archives'][0]['names'] = ['unapproved']
                p.cycle.write(directory / 'plan.json', plan)
                with self.assertRaisesRegex(ValueError, 'Archives hors selection'):
                    p.main('deploy', 'models', directory, ROOT)
                self.assertEqual(calls, [], 'A changed plan cannot upload or PATCH anything')

    def test_existing_test_wrapper_and_secret_bindings_are_reused(self):
        stub = SimpleNamespace(archive=lambda *_: zipped())
        with patch.object(p.archive_helper, 'load', return_value=stub):
            raw = p.archive_helper.test_archive(ROOT, SHA, {'LIVEPALMES_NAP_PASSWORD'}, ['processNapNotificationTask'])
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            wrapper = archive.read('index.js').decode()
            self.assertIn('environment.projectId !== "livepalmes-test"', wrapper)
            self.assertIn('["processNapNotificationTask"]', wrapper)
            backend = archive.read('backend-index.js').decode()
            self.assertIn('["LIVEPALMES_NAP_PASSWORD"]', backend)
            self.assertNotIn('LIVEPALMES_SMTP_HOST', backend)
        self.assertEqual(p.archive_identity(raw), p.archive_identity(raw))


if __name__ == '__main__':
    unittest.main()
