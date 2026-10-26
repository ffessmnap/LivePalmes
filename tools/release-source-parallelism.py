"""Freeze measured source concurrency in the immutable plan; old plans stay at 3."""
import hashlib
import importlib.util
import math
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = '.github/workflows/livepalmes-test-backend.yml'
FILES = [WORKFLOW, 'tools/benchmark-test-source-builds.py', 'tools/release-source-parallelism.py',
         'tools/publish-approved-bcc-functions.py']
spec = importlib.util.spec_from_file_location('parallel_cycle', ROOT / 'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)


def validate(value):
    cycle.require(value.get('schema') == 1 and value.get('project') == 'livepalmes-test'
                  and value.get('success') is True and value.get('mailUnchanged') is True
                  and value.get('hostingUnchanged') is True, 'Benchmark TEST incomplet')
    names = value.get('functions', [])
    cycle.require(len(names) == len(set(names)) == 6, 'Six sources TEST requises')
    rounds = value.get('rounds', [])
    cycle.require(len(rounds) == 2 and [r.get('parallelism') for r in rounds] == [3, 6], 'Comparaison 3/6 requise')
    for row in rounds:
        cycle.require(type(row.get('seconds')) in (int, float) and math.isfinite(row['seconds']) and row['seconds'] > 0
                      and len(row.get('operations', [])) == 6
                      and {op.get('name') for op in row['operations']} == set(names), 'Mesure de duree invalide')
    builds = [op.get('buildId') for row in rounds for op in row['operations']]
    cycle.require(all(isinstance(build, str) and build for build in builds) and len(set(builds)) == 12,
                  'Douze builds distincts requis, aucun no-op admis')
    cycle.require(rounds[1]['seconds'] < rounds[0]['seconds'], 'Aucun gain mesure : conserver trois builds')


def prepare(directory, run_id):
    directory = Path(directory)
    if run_id == '0':
        cycle.write(directory / 'source-build-concurrency.json', {'schema': 1, 'parallelism': 3})
        return
    cycle.require(run_id.isdigit() and int(run_id) > 0, 'Run benchmark invalide')
    target = directory / 'benchmark-evidence'
    info = cycle.artifact(int(run_id), 'test-source-benchmark', target, WORKFLOW)
    value = cycle.read(target / 'benchmark.json')
    cycle.require(value.get('candidate') == info['head_sha'], 'Benchmark hors commit')
    validate(value)
    # Reuse only the same benchmark/publisher implementation, even after docs commits.
    subprocess.run(['git', 'merge-base', '--is-ancestor', info['head_sha'], 'HEAD'], cwd=ROOT, check=True)
    cycle.require(not cycle.git('diff', '--name-only', info['head_sha'], 'HEAD', '--', *FILES),
                  'Circuit modifie depuis le benchmark : nouvelle mesure requise')
    source = target / 'benchmark.json'
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    (directory / 'source-build-benchmark.json').write_bytes(source.read_bytes())
    cycle.write(directory / 'source-build-concurrency.json', {'schema': 1, 'parallelism': 6,
                'run': int(run_id), 'candidate': info['head_sha'], 'sha256': digest})


def selected(directory):
    directory = Path(directory)
    file = directory / 'source-build-concurrency.json'
    if not file.exists():
        return 3
    value = cycle.read(file)
    if value == {'schema': 1, 'parallelism': 3}:
        return 3
    cycle.require(set(value) == {'schema', 'parallelism', 'run', 'candidate', 'sha256'}
                  and value['schema'] == 1 and value['parallelism'] == 6
                  and type(value['run']) is int and value['run'] > 0, 'Parallelisme hors plan')
    source = directory / 'source-build-benchmark.json'
    cycle.require(hashlib.sha256(source.read_bytes()).hexdigest() == value['sha256'], 'Mesure alteree')
    proof = cycle.read(source)
    cycle.require(proof.get('candidate') == value['candidate'], 'Commit du benchmark different')
    validate(proof)
    return 6


if __name__ == '__main__':
    prepare(sys.argv[1], os.environ.get('SOURCE_BENCHMARK_RUN', '0') or '0')
