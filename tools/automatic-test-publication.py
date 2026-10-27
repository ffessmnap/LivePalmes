"""Dispatch ordinary TEST only from a successful exact main CI; no Firebase access."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('automatic_cycle', ROOT/'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)


def ordinary_paths(paths):
    """Conservative automation boundary; unknown, backend and sensitive changes need review."""
    application, backend = cycle.classify(paths)
    if backend:
        return False
    allowed = {'.html', '.css', '.js', '.svg', '.png', '.ico', '.webp', '.jpg', '.jpeg'}
    return bool(application) and all(
        Path(p).suffix in allowed and (len(Path(p).parts) == 1 or p.startswith(('js/', 'css/', 'assets/')))
        and not any(word in p.lower() for word in ('auth', 'permission', 'admin', 'migration', 'scheduler', 'mail'))
        for p in application)


def trusted_run(run, repository):
    return (run.get('event') == 'push' and run.get('head_branch') == 'main'
            and run.get('head_repository', {}).get('full_name') == repository
            and run.get('path') == '.github/workflows/livepalmes-verification-preview.yml'
            and run.get('status') == 'completed' and run.get('conclusion') == 'success'
            and run.get('run_attempt', 1) == 1 and bool(cycle.SHA.fullmatch(str(run.get('head_sha', '')))))


def inputs_for(run, repository, directory):
    if not trusted_run(run, repository):
        raise ValueError('CI source non autorisee')
    candidate = run['head_sha']
    if cycle.gh(f'repos/{repository}/git/ref/heads/main')['object']['sha'] != candidate:
        return None, 'CI depassee : attendre la verification du dernier main'
    if cycle.git('rev-parse', 'HEAD') != candidate:
        raise ValueError('Checkout different de la CI')
    previous = cycle.latest_run('livepalmes-test-common.yml')
    info = cycle.artifact(previous, 'test-proof', Path(directory)/'test', '.github/workflows/livepalmes-test-common.yml')
    proof = cycle.read(Path(directory)/'test/test-proof.json')
    base = proof.get('candidate', '')
    if not cycle.SHA.fullmatch(str(base)) or info.get('head_sha') != base:
        raise ValueError('Reference TEST invalide')
    if base == candidate:
        return None, 'Version deja publiee sur TEST'
    subprocess.run(['git', 'merge-base', '--is-ancestor', base, candidate], cwd=ROOT, check=True)
    paths = cycle.git('diff', '--name-only', '--no-renames', base, candidate).splitlines()
    if not ordinary_paths(paths):
        return None, 'Aucun changement applicatif ordinaire autonome ; parcours manuel conserve'
    # Authenticate the current production provenance, never use a configurable SHA or a label.
    state = cycle.production_evidence(Path(directory)/'production')
    production = cycle.read(Path(directory)/'production/baseline.json')['productionCommit']
    if not cycle.SHA.fullmatch(str(production)) or not state['hosting'].get('version'):
        raise ValueError('Reference PROD invalide')
    all_paths = cycle.git('diff', '--name-only', '--no-renames', production, candidate).splitlines()
    # Historical exceptions are never enabled automatically. Existing TEST guards
    # also refuse any backend drift before Hosting because hosting_only is true.
    cycle.classify_test(all_paths)
    return {'production_commit': production, 'hosting_only': 'true', 'automatic_candidate': candidate}, 'TEST ordinaire : Hosting uniquement, backend controle'


def main():
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8'))
    repository = os.environ['GITHUB_REPOSITORY']
    with tempfile.TemporaryDirectory() as directory:
        inputs, reason = inputs_for(event['workflow_run'], repository, directory)
    if inputs is not None:
        payload = json.dumps({'ref': 'main', 'inputs': inputs})
        subprocess.run(['gh', 'api', f'repos/{repository}/actions/workflows/livepalmes-test-common.yml/dispatches',
                        '--method', 'POST', '--input', '-'], input=payload, text=True, check=True)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
        stream.write(reason+'\n')
    print(reason)


if __name__ == '__main__':
    main()
