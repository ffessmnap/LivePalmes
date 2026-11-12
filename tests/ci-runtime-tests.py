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


class ComparisonTests(unittest.TestCase):
    def fixture(self):
        from copy import deepcopy
        repo = 'ffessmnap/LivePalmes'
        def info(run, event, head, date):
            return {'id': run, 'event': event, 'head_sha': head, 'head_branch': 'main',
                    'path': '.github/workflows/livepalmes-verification-preview.yml', 'status': 'completed',
                    'conclusion': 'success', 'run_attempt': 1, 'head_repository': {'full_name': repo},
                    'created_at': '2026-11-12T'+date+'Z'}
        pr = info(71, 'pull_request', 'b'*40, '09:59:50')
        main = info(72, 'push', 'd'*40, '11:59:50')
        steps = {'application': ('Verification applicative', 'Verifier LivePalmes'),
                 'firestore': ('Verification applicative', 'Tester les regles Firestore'),
                 'mysql': ('Verification applicative', 'Verifier les ecritures par equipes dans MySQL isole'),
                 'publication': ('Verification du circuit de publication', 'Tester le circuit de publication sans acces Firebase'),
                 'browser': ('Verification navigateur hors ligne', 'Verifier les parcours navigateur isoles')}
        def jobs(cached):
            start = '12:00:00' if cached else '10:00:00'
            end = '12:01:00' if cached else '10:10:00'
            result = [{'name': name, 'conclusion': 'success', 'started_at': '2026-11-12T'+start+'Z',
                       'completed_at': '2026-11-12T'+end+'Z', 'steps': [
                           {'name': step, 'conclusion': 'skipped' if cached else 'success'}
                           for job, step in steps.values() if job == name]}
                      for name in sorted({job for job, step in steps.values()})]
            result.append({'name': 'Verification technique', 'conclusion': 'success',
                           'started_at': '2026-11-12T'+end+'Z',
                           'completed_at': '2026-11-12T'+('12:01:10' if cached else '10:10:10')+'Z', 'steps': []})
            return result
        proofs = {}
        for suite in steps:
            receipt = {'run': 71, 'artifact': 8, 'sha256': 'sha256:'+'1'*64}
            source = {'schema': 2, 'suite': suite, 'result': 'success', 'candidate': 'e'*40,
                      'content': {'tree': 'f'*40}, 'environment': {'node': 'v22.23.5'},
                      'origin': {'repository': repo, 'run': 71, 'attempt': 1, 'event': 'pull_request',
                                 'head': pr['head_sha'], 'base': 'a'*40, 'number': 13,
                                 'headRepository': repo, 'baseBranch': 'main'}, 'mode': 'executed', 'source': None}
            target = {**deepcopy(source), 'candidate': main['head_sha'], 'mode': 'reused',
                      'origin': {'repository': repo, 'run': 72, 'attempt': 1, 'event': 'push', 'head': main['head_sha']},
                      'source': {**receipt, 'suite': suite, 'pullRequest': 13}}
            proofs[suite] = {'pr': source, 'main': target, 'receipt': receipt}
        return repo, pr, main, jobs(False), jobs(True), proofs

    def test_real_elapsed_includes_queue_and_never_adds_parallel_jobs(self):
        result = m.comparison(*self.fixture())
        self.assertEqual(result['pr']['seconds'], 620)
        self.assertEqual(result['main']['seconds'], 80)
        self.assertEqual(result['pr']['initialRunnerWaitSeconds'], 10)
        self.assertEqual(result['savedSeconds'], 540)
        self.assertEqual(result['reductionPercent'], 87.1)
        self.assertEqual(len(result['reusedSuites']), 5)

    def test_partial_hits_report_executed_suite_without_invented_reuse(self):
        values = self.fixture()
        values[-1]['application']['main'].update(mode='executed', source=None)
        next(j for j in values[-2] if j['name']=='Verification applicative')['steps'][0]['conclusion']='success'
        result = m.comparison(*values)
        self.assertEqual(result['executedMainSuites'], ['application'])
        self.assertEqual(len(result['reusedSuites']), 4)

    def test_incompatible_proof_origin_content_environment_or_receipt_refuses(self):
        for path, bad in [('candidate','0'*40), ('origin.run',99), ('origin.attempt',2),
                          ('origin.repository','outside/repo'), ('content.tree','0'*40),
                          ('environment.node','v22.23.4'), ('source.sha256','bad'),
                          ('source.artifact',99), ('source.pullRequest',99), ('source.suite','mysql')]:
            values = self.fixture(); target = values[-1]['application']['main']; parts=path.split('.')
            for key in parts[:-1]: target=target[key]
            target[parts[-1]]=bad
            with self.subTest(path=path), self.assertRaises(ValueError): m.comparison(*values)

    def test_failure_rerun_missing_job_timestamp_or_false_skipped_step_refuses(self):
        for case in ('failure','rerun','missing-job','missing-time','executed-step','missing-proof'):
            values = self.fixture()
            if case=='failure': values[2]['conclusion']='failure'
            elif case=='rerun': values[2]['run_attempt']=2
            elif case=='missing-job': values[-2].pop()
            elif case=='missing-time': values[-2][0]['completed_at']=None
            elif case=='executed-step': values[-2][0]['steps'][0]['conclusion']='success'
            elif case=='missing-proof': values[-1].pop('mysql')
            with self.subTest(case=case), self.assertRaises(ValueError): m.comparison(*values)


if __name__ == '__main__':
    unittest.main()
