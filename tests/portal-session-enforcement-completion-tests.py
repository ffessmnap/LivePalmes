"""Offline refusal and workflow regressions for the single attested B completion."""
import ast
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('completion', ROOT/'tools/portal-session-enforcement-completion.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
REAL_LOAD = m.load
COMMON = REAL_LOAD('standard-source-policy.py')
STATE = REAL_LOAD('production-release-state.py')


def environment(mode='release'):
    return {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes', 'GITHUB_REF': 'refs/heads/main',
            'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_RUN_ATTEMPT': '1',
            'GITHUB_SHA': 'a'*40, 'GITHUB_RUN_ID': '777',
            'GITHUB_WORKFLOW_REF': 'ffessmnap/LivePalmes/'+m.WORKFLOWS[mode]+'@refs/heads/main'}


def fixture():
    selected = ['selected'+str(i).zfill(3) for i in range(102)]
    names = selected+['retained'+str(i).zfill(2) for i in range(17)]
    before = {}; current = {}; rows = []; receipts = {}
    for name in names:
        full = m.PREFIX+name
        f = {'name': full, 'state': 'ACTIVE', 'updateTime': 'old-time', 'environment': 'GEN_2',
             'labels': {'livepalmes-commit': 'b'*40, 'preserved': 'label'},
             'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name,
                             'source': {'storageSource': {'bucket': 'old', 'object': name, 'generation': '1'}}},
             'serviceConfig': {'revision': name+'-old', 'serviceAccountEmail': 'fixture@example.invalid',
                               'secretEnvironmentVariables': [{'key': 'PRESERVED', 'secret': 'PRESERVED', 'version': '1'}]}}
        before[full] = f; after = copy.deepcopy(f); rows.append({**STATE.identity(f), 'commit': 'b'*40})
        if name in selected:
            source = {'bucket': 'gcf-v2-sources-718081132564-europe-west1', 'object': name+'/function-source.zip', 'generation': '123'}
            after['serviceConfig']['revision'] = name+'-new'; after['updateTime'] = 'new-time'
            after['labels']['livepalmes-commit'] = m.CANDIDATE
            after['buildConfig']['source'] = {'storageSource': source}
            after['buildConfig']['sourceProvenance'] = {'resolvedStorageSource': source}
            receipts[full] = {'identity': STATE.identity(after), 'storageSource': source, 'archiveSha256': 'c'*64,
                              'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True}
        current[full] = after
    manifest = {'candidate': m.CANDIDATE, 'selected': selected, 'origins': rows}
    state = {'candidate': m.CANDIDATE, 'functions': sorted([STATE.identity(f) for f in current.values()], key=lambda f: f['name']), 'errors': []}
    receipt = {'candidate': m.CANDIDATE, 'manifestSha256': m.digest(manifest), 'functions': receipts}
    controls = {name: name+'-hash' for name in ['mailSha256', 'queueSha256', 'schedulerSha256', 'templatesSha256']}
    c = {'originalManifestSha256': m.digest(manifest), 'failedStateSha256': m.digest(state),
         'currentStateSha256': m.digest(state), 'sourceReceiptsSha256': m.digest(receipt), 'originalBackupSha256': 'd'*64,
         'rulesBefore': {'sha256': 'old-rules'}, 'expectedHosting': 'old-hosting'}
    p = SimpleNamespace(PREFIX=m.PREFIX, validate_manifest=lambda value: value,
        manifest=lambda directory: manifest, assert_retained=COMMON.assert_retained,
        assert_selected=lambda a, b, candidate: COMMON.assert_selected(a, b, candidate, runtime_validator=lambda f: None),
        capabilities=lambda kind, references: {'ready': True, 'readOnly': True},
        common=SimpleNamespace(controls=lambda: controls), contract=lambda: {'controls': controls})
    return SimpleNamespace(before=before, current=current, manifest=manifest, state=state, receipts=receipt,
                           selection=list(reversed(selected)), c=c, parent=p)


class ContractTests(unittest.TestCase):
    def test_real_contract_and_all_old_policies_unchanged(self):
        c = m.contract()
        self.assertEqual((c['completionOfRun'], c['sourceWrites']), (44099971258, 0))
        self.assertFalse(c['genericResume'])

    def test_modified_contract_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'contract.json'; path.write_text('{}')
            with patch.object(m, 'CONTRACT', path), self.assertRaisesRegex(ValueError, 'Contrat'):
                m.contract()

    def test_only_real_official_contexts(self):
        for mode in m.WORKFLOWS:
            with patch.dict(os.environ, environment(mode), clear=True): m.context(mode)
        for field, bad in [('GITHUB_REPOSITORY', 'other/repo'), ('GITHUB_REF', 'refs/heads/branch'),
                           ('GITHUB_EVENT_NAME', 'push'), ('GITHUB_RUN_ATTEMPT', '2'),
                           ('GITHUB_SHA', 'short'), ('GITHUB_RUN_ID', '0'), ('GITHUB_WORKFLOW_REF', 'other')]:
            env = environment(); env[field] = bad
            with self.subTest(field=field), patch.dict(os.environ, env, clear=True), self.assertRaises(ValueError):
                m.context('release')


class SourceProofTests(unittest.TestCase):
    def setUp(self):
        self.f = fixture()
        self.load = patch.object(m, 'load', lambda name: self.f.parent if name == 'portal-session-enforcement-production-policy.py' else REAL_LOAD(name))
        self.contract = patch.object(m, 'contract', lambda: self.f.c)
        self.load.start(); self.contract.start(); self.addCleanup(self.load.stop); self.addCleanup(self.contract.stop)

    def verify(self):
        m.validate_sources(self.f.manifest, self.f.state, self.f.receipts, self.f.selection)

    def test_exact_full_set_in_different_order_accepted(self): self.verify()

    def test_missing_extra_duplicate_or_already_sorted_selection_refused(self):
        for changed in [self.f.selection[:-1], self.f.selection+['extra'],
                        self.f.selection[:-1]+[self.f.selection[0]], sorted(self.f.selection)]:
            with self.subTest(size=len(changed)), self.assertRaises(ValueError):
                m.validate_sources(self.f.manifest, self.f.state, self.f.receipts, changed)

    def test_unattested_archive_refused_even_with_matching_file_digest(self):
        next(iter(self.f.receipts['functions'].values()))['allPathsAndFileBytesIdentical'] = False
        self.f.c['sourceReceiptsSha256'] = m.digest(self.f.receipts)
        with self.assertRaisesRegex(ValueError, 'Archive'): self.verify()

    def test_unknown_generation_refused(self):
        next(iter(self.f.receipts['functions'].values()))['storageSource']['generation'] = ''
        self.f.c['sourceReceiptsSha256'] = m.digest(self.f.receipts)
        with self.assertRaises(ValueError): self.verify()

    def test_changed_retained_revision_refused(self):
        self.f.state['functions'][0]['revision'] = 'foreign'
        self.f.c['failedStateSha256'] = m.digest(self.f.state)
        with self.assertRaises(ValueError): self.verify()

    def test_another_candidate_refused(self):
        self.f.state['candidate'] = 'e'*40; self.f.c['failedStateSha256'] = m.digest(self.f.state)
        with self.assertRaises(ValueError): self.verify()

    def test_changed_manifest_or_receipt_digest_refused(self):
        self.f.c['originalManifestSha256'] = '0'*64
        with self.assertRaises(ValueError): self.verify()


class CurrentStateTests(unittest.TestCase):
    def setUp(self):
        self.f = fixture(); self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.plan = Path(self.tmp.name)
        for name, value in [('completion-initial-after.json', self.f.state), ('standard-source-receipts.json', self.f.receipts)]:
            m.write(self.plan/name, value)
        def loader(name):
            if name == 'portal-session-enforcement-production-policy.py': return self.f.parent
            return REAL_LOAD(name)
        for patcher in [patch.object(m, 'load', loader), patch.object(m, 'contract', lambda: self.f.c),
                        patch.object(m, 'backup_validate', lambda plan, backup: self.f.before),
                        patch.object(m, 'inventory', lambda: list(self.f.current.values()))]:
            patcher.start(); self.addCleanup(patcher.stop)

    def test_current_metadata_reuses_only_identical_102_archive_generations(self):
        proof = m.current(self.plan, 'backup')
        self.assertEqual(proof['managedArchiveAttestationsReused'], 102)
        self.assertEqual(proof['stateSha256'], self.f.c['currentStateSha256'])

    def test_api_order_does_not_change_the_complete_inventory_proof(self):
        self.f.state['functions'].reverse()
        self.f.c['failedStateSha256'] = m.digest(self.f.state)
        m.write(self.plan/'completion-initial-after.json', self.f.state)
        proof = m.current(self.plan, 'backup')
        self.assertEqual(proof['stateSha256'], self.f.c['currentStateSha256'])
        self.assertNotEqual(proof['stateSha256'], self.f.c['failedStateSha256'])

    def test_configuration_binding_labels_and_revision_drift_refused(self):
        name = m.PREFIX+self.f.manifest['selected'][0]; original = copy.deepcopy(self.f.current[name])
        mutations = [lambda f: f['serviceConfig'].update(timeoutSeconds=55),
                     lambda f: f['serviceConfig']['secretEnvironmentVariables'].clear(),
                     lambda f: f['labels'].update(preserved='changed'),
                     lambda f: f['serviceConfig'].update(revision='foreign')]
        for mutation in mutations:
            self.f.current[name] = copy.deepcopy(original); mutation(self.f.current[name])
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): m.current(self.plan, 'backup')

    def test_managed_source_reference_drift_refused(self):
        name = m.PREFIX+self.f.manifest['selected'][0]
        self.f.current[name]['buildConfig']['source']['storageSource'] = {'bucket': 'other'}
        with self.assertRaisesRegex(ValueError, 'Generation'): m.current(self.plan, 'backup')

    def test_retained_function_drift_refused(self):
        self.f.current[m.PREFIX+'retained00']['serviceConfig']['revision'] = 'changed'
        with self.assertRaises(ValueError): m.current(self.plan, 'backup')

    def test_controls_drift_refused(self):
        self.f.parent.common.controls = lambda: {'mailSha256': 'changed'}
        with self.assertRaisesRegex(ValueError, 'mails'): m.current(self.plan, 'backup')


class BoundedReadTests(unittest.TestCase):
    def test_inventory_stops_before_third_page(self):
        calls = []
        state = SimpleNamespace(API='https://cloudfunctions.googleapis.com/v2/',
                                request=lambda url: calls.append(url) or {'functions': [], 'nextPageToken': 'next'})
        with patch.object(m, 'load', lambda name: state), self.assertRaises(ValueError): m.inventory()
        self.assertEqual(len(calls), 2)

    def test_missing_permission_refused_without_writes(self):
        fake = SimpleNamespace(permissions=lambda *args: ['read', 'write'], IAM='fixed-testIamPermissions',
                               read=lambda url, body: {'permissions': ['read']})
        caps = SimpleNamespace(READERS={'hosting': 'identity'}, READER_PERMISSIONS={'hosting': []})
        reader = SimpleNamespace(reader_identity=lambda kind: 'identity')
        modules = {'check-release-prerequisites.py': fake, 'portal-session-enforcement-capabilities.py': caps,
                   'access-revocation-production-policy.py': reader,
                   'portal-session-enforcement-production-rules.py': SimpleNamespace(PERMISSIONS=[])}
        with patch.object(m, 'load', lambda name: modules[name]), self.assertRaisesRegex(ValueError, 'Permission'):
            m.permissions('hosting')


class AuxiliaryOrderRegressionTests(unittest.TestCase):
    def execute_real_branch(self, selection, request):
        tree = ast.parse((ROOT/'tools/publish-approved-pdf-functions.py').read_text())
        main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        branch = next(n for n in main.body if isinstance(n, ast.If) and 'source_policy(request).enabled' in ast.unparse(n.test))
        wrapper = ast.FunctionDef(name='exercise', args=ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]),
                                  body=[branch], decorator_list=[], type_params=[])
        code = ast.fix_missing_locations(ast.Module(body=[wrapper], type_ignores=[])); guarded = []
        policy = SimpleNamespace(enabled=lambda request: True, approved=lambda request: True,
                                 manifest=lambda plan: {'selected': ['a', 'b']}, guard=lambda plan: guarded.append(True))
        def require(value, message):
            if not value: raise ValueError(message)
        cycle = SimpleNamespace(source_policy=lambda request: policy, read=lambda path: selection, require=require)
        env = {'cycle': cycle, 'request': request, 'plan': Path('fixture')}
        exec(compile(code, 'actual-pdf-policy-branch', 'exec'), env); env['exercise'](); return guarded

    def test_b_order_only_difference_reaches_preserved_guard(self):
        self.assertEqual(self.execute_real_branch(['b', 'a'], {'portalSessionEnforcementRelease': {}}), [True])

    def test_b_duplicate_missing_or_extra_never_reaches_guard(self):
        for selected in [['a', 'a'], ['a'], ['a', 'b', 'extra']]:
            with self.subTest(selected=selected), self.assertRaises(ValueError):
                self.execute_real_branch(selected, {'portalSessionEnforcementRelease': {}})

    def test_unrelated_contract_order_semantics_unchanged(self):
        with self.assertRaises(ValueError): self.execute_real_branch(['b', 'a'], {'otherRelease': {}})
        self.assertEqual(self.execute_real_branch(['b', 'a'], {'accessRevocationRelease': {}}), [True])


class AuthenticationTests(unittest.TestCase):
    def test_failed_run_requires_exact_head_attempt_and_artifact_metadata(self):
        info = {'path': m.WORKFLOWS['release'], 'conclusion': 'failure', 'status': 'completed',
                'head_branch': 'main', 'run_attempt': 1, 'head_sha': 'a'*40}
        meta = {'workflow_run': {'id': 42}, 'name': 'proof', 'expired': False, 'digest': 'sha256:fixed'}
        downloaded = []
        def artifact(run, name, target, workflow):
            downloaded.append(True); Path(target).mkdir(); (Path(target)/'proof.json').write_bytes(b'proof')
        cycle = SimpleNamespace(gh=lambda url: meta if '/artifacts/' in url else info, artifact=artifact)
        expected = {'id': 12, 'digest': 'sha256:fixed', 'files': {'proof.json': m.sha(b'proof')}}
        with tempfile.TemporaryDirectory() as tmp, patch.object(m, 'load', lambda name: cycle):
            m.authenticate(42, 'proof', Path(tmp)/'valid', expected, m.WORKFLOWS['release'], 'failure', 'a'*40)
            self.assertEqual(downloaded, [True])
            for field, bad in [('head_sha', 'b'*40), ('run_attempt', 2), ('head_branch', 'other'), ('conclusion', 'success')]:
                valid = info[field]; info[field] = bad
                with self.subTest(field=field), self.assertRaises(ValueError):
                    m.authenticate(42, 'proof', Path(tmp)/'bad', expected, m.WORKFLOWS['release'], 'failure', 'a'*40)
                info[field] = valid
            meta['expired'] = True
            with self.assertRaises(ValueError):
                m.authenticate(42, 'proof', Path(tmp)/'bad', expected, m.WORKFLOWS['release'], 'failure', 'a'*40)
            self.assertEqual(downloaded, [True])

    def test_another_encrypted_backup_is_refused(self):
        c = {'completionOfRun': 42, 'originalController': 'a'*40, 'originalBackupSha256': m.sha(b'expected'),
             'originalArtifacts': {'production-code-backup': {}}}
        def auth(run, name, target, *args):
            Path(target).mkdir(); (Path(target)/'prod-backup.enc').write_bytes(b'wrong')
        with tempfile.TemporaryDirectory() as tmp, patch.object(m, 'marker', lambda plan: {}), patch.object(m, 'contract', lambda: c), patch.object(m, 'authenticate', auth):
            with self.assertRaisesRegex(ValueError, 'chiffree'):
                m.backup_download(tmp, Path(tmp)/'encrypted')

    def test_readiness_must_belong_to_the_same_preflight_and_candidate(self):
        def auth(run, name, target, *args, **kwargs):
            Path(target).mkdir()
            m.write(Path(target)/'prerequisites-backend.json', {
                'kind': 'backend', 'candidate': m.CANDIDATE, 'contractSha256': m.DIGEST,
                'planRun': 999, 'readinessRun': 777, 'controllerCommit': 'a'*40, 'ready': True,
                'readOnly': True, 'missingPermissions': [], 'sourceWrites': 0, 'businessInvocations': 0})
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, environment(), clear=True), patch.object(m, 'marker', lambda plan: {'preflightRun': 888}), patch.object(m, 'authenticate', auth):
            with self.assertRaisesRegex(ValueError, 'Prerequis'): m.require_readiness(tmp, 777)

    def test_current_run_auth_and_control_witnesses_cannot_be_normalized_away(self):
        for changed in ['auth', 'controls']:
            with self.subTest(changed=changed), tempfile.TemporaryDirectory() as tmp:
                plan = Path(tmp)
                for category in ['auth', 'controls']:
                    (plan/('standard-session-enforcement-'+category+'-before.json')).write_bytes(b'{"same":true}')
                    (plan/('standard-session-enforcement-'+category+'-after.json')).write_bytes(b'{"same":true}' if category != changed else b'{"same": true}')
                parent = SimpleNamespace(guard=lambda *args, **kwargs: None)
                with patch.dict(os.environ, environment(), clear=True), patch.object(m, 'current', lambda *args: None), patch.object(m, 'load', lambda name: parent):
                    with self.assertRaisesRegex(ValueError, 'Temoins'): m.final(plan, 'backup')


class WorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        script = "const fs=require('fs'),Y=require('./tests/firestore-rules/node_modules/yaml');let r={};for(const n of ['preflight','readiness','release'])r[n]=Y.parse(fs.readFileSync('.github/workflows/livepalmes-production-'+n+'.yml','utf8'));process.stdout.write(JSON.stringify(r))"
        cls.workflows = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT))

    def test_completion_default_off_and_normal_jobs_preserved(self):
        for name, workflow in self.workflows.items():
            self.assertIs(workflow['on']['workflow_dispatch']['inputs']['session_enforcement_completion']['default'], False)
            for jobname, job in workflow['jobs'].items():
                if jobname == 'session-enforcement-completion': continue
                self.assertIn('!inputs.session_enforcement_completion', job['if'])

    def test_setup_and_runtime_metrics_stay_bounded(self):
        for workflow in self.workflows.values():
            steps = workflow['jobs']['session-enforcement-completion']['steps']
            for step in steps:
                if 'setup-node@' in step.get('uses', ''):
                    self.assertEqual(step['timeout-minutes'], 3)
                    self.assertEqual(step['with']['node-version'], '22.23.5')
            self.assertTrue(any(step.get('name') == 'Distinguer installations et tests' and step['timeout-minutes'] == 1 for step in steps))

    def test_completion_cannot_write_any_source_or_use_resume(self):
        job = self.workflows['release']['jobs']['session-enforcement-completion']
        self.assertIn("inputs.resume_run == '0'", job['if']); self.assertIn('inputs.confirmation', job['if'])
        self.assertEqual(job['environment'], 'production')
        commands = '\n'.join(step.get('run', '') for step in job['steps'])
        for forbidden in ['--only functions', ' batches ', ' resume ', 'standard-source-publish.py candidate', 'generateUploadUrl', 'gcloud functions']:
            self.assertNotIn(forbidden, commands)
        self.assertIn('--only hosting', commands)
        self.assertIn('release-cycle.py verify-test', commands)
        self.assertIn('portal-session-enforcement-production-rules.py publish', commands)

    def test_backup_and_controls_before_rules_and_hosting_last(self):
        steps = self.workflows['release']['jobs']['session-enforcement-completion']['steps']
        ids = {s.get('id'): i for i, s in enumerate(steps) if s.get('id')}
        self.assertLess(ids['opened'], ids['current_before']); self.assertLess(ids['controls_before'], ids['rules'])
        self.assertLess(ids['rules'], ids['hosting']); self.assertLess(ids['hosting'], ids['hosting_checks'])
        self.assertLess(ids['admin_after'], ids['final'])
        commands = '\n'.join(s.get('run', '') for s in steps)
        self.assertIn('check-production-mail-disabled.py', commands)
        self.assertIn('portal-session-enforcement-completion.py final', commands)


if __name__ == '__main__': unittest.main()
