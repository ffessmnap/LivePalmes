"""Swimmer source delivery guards: isolated fixtures, no remote service."""
import copy
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('swimmer_cleanup', ROOT / 'tools/publish-test-swimmer-reference-cleanup-sources.py')
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
p = wrapper.publisher
SHA = 'c' * 40
SOURCE = {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': 'upload.zip', 'generation': '1'}


def function(name):
    return {'name': p.PREFIX + name, 'environment': 'GEN_2', 'state': 'ACTIVE', 'updateTime': 'before',
        'labels': {'livepalmes-commit': 'b' * 40, 'keep': 'yes'},
        'buildConfig': {'runtime': 'nodejs22', 'entryPoint': name, 'source': {'storageSource': SOURCE}},
        'serviceConfig': {'revision': 'old', 'serviceAccountEmail': 'runtime@example.invalid',
            'environmentVariables': {'KEEP': 'yes'}, 'secretEnvironmentVariables': [
                {'key': 'KEEP', 'secret': 'KEEP', 'projectId': p.PROJECT, 'version': '1'}]}}


class SwimmerCleanup(unittest.TestCase):
    def test_exact_scope_and_unchanged_cloud_registrations(self):
        entry = p.contract()
        self.assertEqual(p.RELEASE, 'swimmer_reference_cleanup')
        self.assertEqual(p.BINDING_FUNCTIONS, frozenset())
        self.assertEqual(entry['napBindingFunctions'], [])
        fp = p.cycle.test_backend_fingerprints(entry['applicationCommit'])
        old = p.cycle.test_backend_fingerprints(entry['baseCommit'])
        self.assertEqual(entry['fingerprints'], {n: fp[n] for n in p.ALLOWED})
        self.assertEqual({n for n in p.ALLOWED if fp[n] != old[n]}, p.ALLOWED)
        script = r'''
const cp=require('child_process'),acorn=require('./tests/firestore-rules/node_modules/acorn');
function canonical(v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(canonical);return Object.fromEntries(Object.entries(v).filter(([k])=>!['start','end','raw'].includes(k)).map(([k,x])=>[k,canonical(x)]));}
function registrations(sha){const ast=acorn.parse(cp.execFileSync('git',['show',sha+':functions/index.js'],{encoding:'utf8'}),{ecmaVersion:'latest'}),v={};for(const i of ast.body){const n=i.expression;if(n?.type==='AssignmentExpression'&&n.left.object?.name==='exports'&&n.right.type==='CallExpression'&&/^on/.test(n.right.callee.name||''))v[n.left.property.name]=JSON.stringify(canonical(n.right.arguments[0]));}return v;}
console.log(JSON.stringify(registrations(process.argv[1])===undefined?null:[registrations(process.argv[1]),registrations(process.argv[2])]));
'''
        before, after = json.loads(p.cycle.run(['node', '-e', script, entry['baseCommit'], entry['applicationCommit']], ROOT))
        self.assertEqual(before, after)
        with patch.object(p, 'CONTRACT_SHA256', '0' * 64), self.assertRaises(ValueError):
            p.contract()

    def test_every_patch_is_source_only_even_for_previous_binding_consumers(self):
        rows = [function(n) for n in sorted(p.ALLOWED)]
        p.configure_bindings(rows)
        self.assertEqual(p._added_bindings, {})
        for row in rows:
            body = p.source_patch(row, SOURCE, SHA)
            self.assertEqual(set(body), {'name', 'buildConfig', 'labels'})
            url = p.publisher.state.API + row['name'] + '?updateMask=build_config.source,labels'
            with patch.object(p, '_request', return_value={}) as request:
                p.request(url, 'PATCH', body)
                self.assertEqual(request.call_args.args, (url, 'PATCH', body))
                changed = {**body, 'serviceConfig': row['serviceConfig']}
                with self.assertRaises(ValueError): p.request(url, 'PATCH', changed)
                with self.assertRaises(ValueError): p.request(url.replace(p.PROJECT, 'livepalmes'), 'PATCH', body)

    def test_verification_rejects_config_and_preserves_unselected_functions(self):
        old = [function(n) for n in sorted(p.ALLOWED)]
        new = copy.deepcopy(old)
        selected = new[0]['name'].split('/')[-1]
        new[0]['labels']['livepalmes-commit'] = SHA
        new[0]['updateTime'] = 'after'
        new[0]['serviceConfig']['revision'] = 'new'
        p.verify(old, new, [selected], SHA, {selected: SOURCE})
        new[0]['serviceConfig']['environmentVariables']['KEEP'] = 'changed'
        with self.assertRaises(ValueError): p.verify(old, new, [selected], SHA, {selected: SOURCE})
        for mode, release in [('identity', p.RELEASE), ('recover', p.RELEASE), ('prepare', 'club_reference_cleanup')]:
            with self.assertRaises(ValueError): p.main(mode, release, ROOT, ROOT)

    def test_receipt_requires_exact_contract_archives_controls_and_current_revision(self):
        entry = p.contract(); name = 'listAccessUsers'
        row = {'name': p.PREFIX + name, 'commit': SHA, 'revision': 'new', 'updateTime': 'after', 'state': 'ACTIVE'}
        info = {'id': 1, 'head_sha': SHA, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1}
        source = {**info, 'head_branch': 'main', 'path': '.github/workflows/livepalmes-test-mail-sources.yml',
            'event': 'workflow_dispatch', 'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY}}
        controls = {'mailEnabled': False, 'schedulerSuspended': True, 'queuePaused': True}
        proof = {'schema': 1, 'release': p.RELEASE, 'candidate': SHA, 'contractSha256': p.CONTRACT_SHA256,
            'applicationAnchor': entry['applicationCommit'], 'baselineRun': entry['baselineRuns'][0]['id'],
            'selected': [name], 'state': {'functions': [row]}, 'addedNapBindings': {},
            'configurationsUnchanged': True, 'configurationsUnchangedExceptApprovedNapBindings': True,
            'otherFunctionsUnchanged': True, 'hostingUnchanged': True, 'controlsUnchanged': True,
            'taskContentsRead': False, 'controlsBefore': controls, 'controlsAfter': controls,
            'managedSources': {name: {'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True,
                'archiveSha256': 'a' * 64, 'archiveIdentity': 'b' * 64,
                'storageSource': {**SOURCE, 'object': name + '/function-source.zip'}}}}
        api = SimpleNamespace(gh=lambda _: {'workflow_runs': [info]}, artifact=lambda *args: source,
            read=lambda _: proof, test_backend_fingerprints=lambda _: entry['fingerprints'], matching_functions=p.cycle.matching_functions)
        self.assertEqual(p.trusted_revisions(ROOT, {'functions': [row]}, api), {row['name']})
        original = copy.deepcopy(proof)
        for mutation in ['binding', 'configuration', 'contract', 'foreign', 'revision', 'generation', 'controls']:
            proof.clear(); proof.update(copy.deepcopy(original))
            if mutation == 'binding': proof['addedNapBindings'] = {name: {'key': 'ANY'}}
            elif mutation == 'configuration': proof['configurationsUnchanged'] = False
            elif mutation == 'contract': proof['contractSha256'] = '0' * 64
            elif mutation == 'foreign': proof['release'] = 'club_reference_cleanup'
            elif mutation == 'revision': proof['state']['functions'][0]['revision'] = 'other'
            elif mutation == 'generation': proof['managedSources'][name]['storageSource']['generation'] = ''
            else: proof['controlsAfter']['queuePaused'] = False
            with self.subTest(mutation=mutation):
                self.assertEqual(p.trusted_revisions(ROOT, {'functions': [row]}, api), set())


if __name__ == '__main__':
    unittest.main()
