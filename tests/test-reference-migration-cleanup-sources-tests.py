"""Run the source-only delivery guard suite against the combined closed contract."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


shared_tests = load('combined_cleanup_guard_tests', 'tests/test-swimmer-reference-cleanup-sources-tests.py')
wrapper = load('combined_cleanup', 'tools/publish-test-reference-migration-cleanup-sources.py')
p = wrapper.publisher
shared_tests.p = p


class ReferenceMigrationCleanup(shared_tests.SwimmerCleanup):
    def test_exact_scope_and_unchanged_cloud_registrations(self):
        entry = p.contract()
        self.assertEqual(p.RELEASE, 'reference_migration_cleanup')
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
console.log(JSON.stringify([registrations(process.argv[1]),registrations(process.argv[2])]));
'''
        before, after = json.loads(p.cycle.run(['node', '-e', script, entry['baseCommit'], entry['applicationCommit']], ROOT))
        removed = {'importHistoricalPerformanceRows', 'getPerformanceBaseMigrationStatus', 'migratePerformanceBaseNextChunk'}
        self.assertEqual(set(before) - set(after), removed)
        self.assertEqual(set(after) - set(before), set())
        self.assertEqual({n: v for n, v in before.items() if n not in removed}, after)
        with patch.object(p, 'CONTRACT_SHA256', '0' * 64), self.assertRaises(ValueError):
            p.contract()
        workflow = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text()
        self.assertIn("inputs.release == 'reference_migration_cleanup' && (inputs.identity_only || inputs.recover_models)", workflow)
        self.assertIn("inputs.release == 'reference_migration_cleanup' && 'publish-test-reference-migration-cleanup-sources.py'", workflow)


if __name__ == '__main__':
    unittest.main()
