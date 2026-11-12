"""Validate runtime coherence and distinguish slow setup from failing tests."""
import importlib.util
from pathlib import Path
import unittest
import subprocess

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('runtime', ROOT / 'tools/ci-runtime.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class RuntimeTests(unittest.TestCase):
    def test_runtime_chain_is_pinned(self):
        m.validate()

    def test_parsed_workflows_have_bounded_setup_and_metrics(self):
        script = """
const f=require('node:fs'), y=require('./tests/firestore-rules/node_modules/js-yaml');
const c=JSON.parse(f.readFileSync('.github/ci-runtime.json'));
for(const name of c.workflows){
  const w=y.load(f.readFileSync('.github/workflows/'+name,'utf8'));
  let installs=0, metrics=0;
  for(const job of Object.values(w.jobs)){
    for(const s of job.steps||[]){
      if(/setup-node/.test(s.uses||'')){
        installs++;
        if(s.with['node-version']!==c.node||s['timeout-minutes']!==3)throw Error(name);
      }
      if(s.name==='Distinguer installations et tests')metrics++;
    }
  }
  if(!installs||!metrics)throw Error(name);
}
"""
        subprocess.run(['node', '-e', script], cwd=ROOT, check=True)

    def test_installation_timeout_is_not_reported_as_a_test_failure(self):
        value = m.report([{'name': 'app', 'conclusion': 'timed_out', 'steps': [
            {'name': 'Installer Node.js', 'conclusion': 'timed_out',
             'started_at': '2026-11-12T10:00:00Z', 'completed_at': '2026-11-12T10:03:00Z'},
            {'name': 'Verifier LivePalmes', 'conclusion': 'skipped'}]}])
        self.assertIn('| app | 180 | 0 | 0 | timed_out |', value)
        self.assertIn("distinct d'un resultat de test", value)

    def test_parallel_jobs_and_incomplete_steps_do_not_invent_total_duration(self):
        value = m.report([{'name': 'app', 'status': 'in_progress', 'steps': [
            {'name': 'Verifier LivePalmes', 'started_at': '2026-11-12T10:03:00Z'}]}])
        self.assertIn('| app | 0 | 0 | 0 | in_progress |', value)
        self.assertIn('non additionnes en duree de livraison', value)


if __name__ == '__main__':
    unittest.main()
