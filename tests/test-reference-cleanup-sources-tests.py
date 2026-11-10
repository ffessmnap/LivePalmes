"""Closed reference cleanup: metadata and network operations are fixtures only."""
import copy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reference_cleanup', ROOT / 'tools/publish-test-reference-cleanup-sources.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
SHA = 'c'*40
BINDING = {'key': 'LIVEPALMES_NAP_PASSWORD', 'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes-test', 'version': '7'}
SOURCE = {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': 'upload.zip', 'generation': '1'}


def function(name):
    return {'name': p.PREFIX + name, 'environment': 'GEN_2', 'state': 'ACTIVE', 'updateTime': 'before',
        'labels': {'livepalmes-commit': 'b'*40, 'keep': 'yes'},
        'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name, 'source': {'storageSource': {'bucket': 'old', 'object': 'old'}}},
        'serviceConfig': {'revision': 'old', 'serviceAccountEmail': 'runtime@example.invalid',
            'availableMemory': '256M', 'environmentVariables': {'KEEP': 'yes'},
            'secretEnvironmentVariables': [copy.deepcopy(BINDING)] if name == 'readNapPublicSwimmer' else []}}


def before():
    return [function(name) for name in sorted(p.ALLOWED)]


class ReferenceCleanup(unittest.TestCase):
    def test_contract_pins_the_real_complete_installed_scope_without_retired_creation(self):
        entry = p.contract()
        anchored = p.cycle.test_backend_fingerprints(entry['applicationCommit'])
        self.assertEqual({n: anchored[n] for n in p.ALLOWED}, entry['fingerprints'])
        self.assertEqual(len(p.ALLOWED), 121)
        self.assertEqual(len(p.BINDING_FUNCTIONS), 6)
        registry = json.loads(p.cycle.run(['node', '-e', 'console.log(JSON.stringify(require("./tools/firebase-test-backend-lots").NAP_RETIRED_FUNCTIONS))'], ROOT))
        self.assertFalse(p.ALLOWED.intersection(registry))
        with patch.object(p, 'CONTRACT_SHA256', '0'*64), self.assertRaises(ValueError):
            p.contract()

    def test_six_bindings_reuse_an_existing_runtime_account_and_preserve_other_secrets(self):
        rows = before()
        target = next(row for row in rows if row['name'].endswith('/listAccessUsers'))
        target['serviceConfig']['secretEnvironmentVariables'] = [{'key': 'KEEP', 'secret': 'KEEP', 'projectId': p.PROJECT, 'version': '1'}]
        p.configure_bindings(rows)
        body = p.source_patch(target, SOURCE, SHA)
        self.assertEqual(body['serviceConfig']['secretEnvironmentVariables'], target['serviceConfig']['secretEnvironmentVariables'] + [BINDING])
        self.assertEqual(set(p._added_bindings), p.BINDING_FUNCTIONS)
        self.assertEqual(target['serviceConfig']['secretEnvironmentVariables'][0]['key'], 'KEEP')
        ordinary = function('getCurrentAccessUser')
        self.assertNotIn('serviceConfig', p.source_patch(ordinary, SOURCE, SHA))
        target['serviceConfig']['serviceAccountEmail'] = 'unapproved@example.invalid'
        with self.assertRaises(ValueError):
            p.configure_bindings(rows)

    def test_only_the_six_authorized_source_registrations_change_configuration(self):
        entry = p.contract()
        script = r'''
const cp=require('child_process'),acorn=require('./tests/firestore-rules/node_modules/acorn');
function canonical(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(canonical);return Object.fromEntries(Object.entries(value).filter(([key])=>!['start','end','raw'].includes(key)).map(([key,value])=>[key,canonical(value)]));}
function registrations(sha){const source=cp.execFileSync('git',['show',sha+':functions/index.js'],{encoding:'utf8'}),ast=acorn.parse(source,{ecmaVersion:'latest'}),values={};for(const item of ast.body){const node=item.expression;if(node?.type==='AssignmentExpression'&&node.left.object?.name==='exports'&&node.right.type==='CallExpression'&&/^on/.test(node.right.callee.name||''))values[node.left.property.name]=JSON.stringify(canonical(node.right.arguments[0]));}return values;}
const before=registrations(process.argv[1]),after=registrations(process.argv[2]);
console.log(JSON.stringify(Object.keys(after).filter(name=>before[name]!==after[name])));
'''
        changed = json.loads(p.cycle.run(['node', '-e', script, entry['baseCommit'], entry['applicationCommit']], ROOT))
        self.assertEqual(set(changed), p.BINDING_FUNCTIONS)

    def test_existing_nap_binding_is_not_rotated_and_production_reference_is_refused(self):
        rows = before()
        target = next(row for row in rows if row['name'].endswith('/listAccessUsers'))
        target['serviceConfig']['secretEnvironmentVariables'] = [{**BINDING, 'version': '6'}]
        p.configure_bindings(rows)
        self.assertNotIn('listAccessUsers', p._added_bindings)
        self.assertNotIn('serviceConfig', p.source_patch(target, SOURCE, SHA))
        target['serviceConfig']['secretEnvironmentVariables'][0]['projectId'] = 'livepalmes'
        with self.assertRaises(ValueError):
            p.configure_bindings(rows)

    def test_patch_mask_and_payload_cannot_change_other_configuration_or_project(self):
        rows = before(); p.configure_bindings(rows)
        target = next(row for row in rows if row['name'].endswith('/listAccessUsers'))
        body = p.source_patch(target, SOURCE, SHA)
        url = p.publisher.state.API + target['name'] + '?updateMask=build_config.source,labels'
        with patch.object(p, '_request', side_effect=lambda *args: target if len(args) == 1 else {'ok': True}) as request:
            p.request(url, 'PATCH', body)
            self.assertTrue(request.call_args.args[0].endswith(',service_config.secret_environment_variables'))
            changed = copy.deepcopy(body); changed['serviceConfig']['availableMemory'] = '2G'
            with self.assertRaises(ValueError): p.request(url, 'PATCH', changed)
            with self.assertRaises(ValueError): p.request(url.replace(p.PROJECT, 'livepalmes'), 'PATCH', body)
            with self.assertRaises(ValueError): p.request(url + ',service_config.environment_variables', 'PATCH', body)
        changed_runtime = copy.deepcopy(target); changed_runtime['serviceConfig']['availableMemory'] = '2G'
        with patch.object(p, '_request', return_value=changed_runtime) as request, self.assertRaises(ValueError):
            p.request(url, 'PATCH', body)
        self.assertEqual(request.call_count, 1, 'A stale binding plan stops after the metadata GET, before any PATCH')
        with self.assertRaises(ValueError):
            p.publisher.runtime(function('retired-or-unknown'), 'retired-or-unknown')

    def test_verification_permits_only_the_exact_binding_delta_and_freezes_other_functions(self):
        old = before(); p.configure_bindings(old)
        new = copy.deepcopy(old); name = 'listAccessUsers'
        current = next(row for row in new if row['name'] == p.PREFIX + name)
        current['labels']['livepalmes-commit'] = SHA
        current['updateTime'] = 'after'; current['serviceConfig']['revision'] = 'new'
        current['serviceConfig']['secretEnvironmentVariables'] = copy.deepcopy(p._desired_secrets[name])
        current['buildConfig']['source'] = {'storageSource': SOURCE}
        p.verify(old, new, [name], SHA, {name: SOURCE})
        for mutation in ['memory', 'binding', 'other']:
            changed = copy.deepcopy(new)
            row = next(row for row in changed if row['name'] == p.PREFIX + name)
            if mutation == 'memory': row['serviceConfig']['availableMemory'] = '2G'
            elif mutation == 'binding': row['serviceConfig']['secretEnvironmentVariables'][0]['version'] = '8'
            else: changed[0]['labels']['unapproved'] = 'yes'
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                p.verify(old, changed, [name], SHA, {name: SOURCE})

    def test_source_archive_registers_only_the_existing_nap_secret_when_needed(self):
        with patch.object(p, '_archive', return_value=b'fixture') as build:
            p.archive(ROOT, SHA, {'KEEP'}, ['listAccessUsers'])
            self.assertEqual(build.call_args.args[2], {'KEEP', 'LIVEPALMES_NAP_PASSWORD'})
            p.archive(ROOT, SHA, {'KEEP'}, ['getCurrentAccessUser'])
            self.assertEqual(build.call_args.args[2], {'KEEP'})
        for mode, release in [('identity', p.RELEASE), ('recover', p.RELEASE), ('deploy', 'models')]:
            with self.subTest(mode=mode, release=release), self.assertRaises(ValueError):
                p.main(mode, release, ROOT, ROOT)

    def test_foreign_empty_or_unattested_receipt_cannot_reduce_the_selector(self):
        current = {'functions': [{'name': p.PREFIX + 'listAccessUsers', 'commit': SHA}]}
        info = {'id': 1, 'head_sha': SHA, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1}
        source = {**info, 'head_branch': 'main', 'path': '.github/workflows/livepalmes-test-mail-sources.yml',
            'event': 'workflow_dispatch', 'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY}}
        api = SimpleNamespace(gh=lambda _: {'workflow_runs': [info]}, artifact=lambda *args: source,
            read=lambda _: {}, test_backend_fingerprints=lambda _: p.contract()['fingerprints'],
            matching_functions=lambda *args: {'must-not-be-trusted'})
        self.assertEqual(p.trusted_revisions(ROOT, current, api), set())
        with patch.object(p, 'guard') as guard, self.assertRaises(ValueError):
            p.publisher_contract('import_resolution')
        guard.assert_not_called()

    def test_only_the_exact_attested_receipt_and_current_revision_are_reused(self):
        entry, name = p.contract(), 'listAccessUsers'
        row = {'name': p.PREFIX + name, 'commit': SHA, 'revision': 'new', 'updateTime': 'after', 'state': 'ACTIVE'}
        current = {'functions': [row]}
        info = {'id': 1, 'head_sha': SHA, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1}
        source = {**info, 'head_branch': 'main', 'path': '.github/workflows/livepalmes-test-mail-sources.yml',
            'event': 'workflow_dispatch', 'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY}}
        controls = {'mailEnabled': False, 'schedulerSuspended': True, 'queuePaused': True}
        proof = {'schema': 1, 'release': p.RELEASE, 'candidate': SHA, 'contractSha256': p.CONTRACT_SHA256,
            'applicationAnchor': entry['applicationCommit'], 'baselineRun': entry['baselineRuns'][0]['id'],
            'selected': [name], 'state': {'functions': [row]}, 'addedNapBindings': {name: BINDING},
            'configurationsUnchanged': False, 'configurationsUnchangedExceptApprovedNapBindings': True,
            'otherFunctionsUnchanged': True, 'hostingUnchanged': True, 'controlsUnchanged': True,
            'taskContentsRead': False, 'controlsBefore': controls, 'controlsAfter': controls,
            'managedSources': {name: {'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True,
                'archiveSha256': 'a'*64, 'archiveIdentity': 'b'*64,
                'storageSource': {**SOURCE, 'object': name + '/function-source.zip'}}}}
        api = SimpleNamespace(gh=lambda _: {'workflow_runs': [info]}, artifact=lambda *args: source,
            read=lambda _: proof, test_backend_fingerprints=lambda _: entry['fingerprints'],
            matching_functions=p.cycle.matching_functions)
        self.assertEqual(p.trusted_revisions(ROOT, current, api), {row['name']})
        original = copy.deepcopy(proof)
        for mutation in ['contract', 'generation', 'binding', 'configuration', 'state', 'foreign-release', 'contents']:
            proof.clear(); proof.update(copy.deepcopy(original))
            if mutation == 'contract': proof['contractSha256'] = '0'*64
            elif mutation == 'generation': proof['managedSources'][name]['storageSource']['generation'] = ''
            elif mutation == 'binding': proof['addedNapBindings'][name]['projectId'] = 'livepalmes'
            elif mutation == 'configuration': proof['configurationsUnchangedExceptApprovedNapBindings'] = False
            elif mutation == 'state': proof['state']['functions'][0]['revision'] = 'different'
            elif mutation == 'foreign-release': proof['release'] = 'models'
            else: proof['taskContentsRead'] = True
            with self.subTest(mutation=mutation):
                self.assertEqual(p.trusted_revisions(ROOT, current, api), set())


if __name__ == '__main__':
    unittest.main()
