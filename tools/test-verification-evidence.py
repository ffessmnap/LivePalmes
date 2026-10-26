"""Reuse only a digest-checked successful main CI proof for the exact commit."""
import importlib.util
from functools import lru_cache
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = '.github/workflows/livepalmes-verification-preview.yml'
spec = importlib.util.spec_from_file_location('cycle', ROOT/'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cycle)


@lru_cache(maxsize=1)
def node_version():
    return subprocess.check_output(['node', '--version'], text=True).strip()


def evidence(candidate):
    return {'schema': 1, 'candidate': candidate, 'suite': 'verify-livepalmes',
            'result': 'success', 'node': node_version(), 'platform': sys.platform}


def reusable(candidate, directory):
    if not re.fullmatch('[0-9a-f]{40}', candidate):
        return False
    repo = os.environ['GITHUB_REPOSITORY']
    runs = cycle.gh(f'repos/{repo}/actions/workflows/livepalmes-verification-preview.yml/runs?event=push&branch=main&head_sha={candidate}&per_page=10')['workflow_runs']
    for run in runs[:10]:
        if not (run.get('head_sha') == candidate and run.get('event') == 'push'
                and run.get('head_branch') == 'main' and run.get('path') == WORKFLOW
                and run.get('status') == 'completed' and run.get('conclusion') == 'success'
                and run.get('run_attempt', 1) == 1):
            continue
        info = cycle.artifact(run['id'], 'application-verification', directory, WORKFLOW)
        if info.get('head_sha') != candidate or info.get('event') != 'push':
            return False
        return cycle.read(Path(directory)/'verification.json') == evidence(candidate)
    return False


def firestore_required(paths):
    # Emulator tests read firestore.rules only; unknown/shared paths keep the full suite.
    def isolated(path):
        value = Path(path)
        return (path == 'AGENTS.md' or (path.startswith('docs/') and value.suffix == '.md')
                or (len(value.parts) == 1 and value.suffix in {'.html', '.css', '.js', '.svg', '.png', '.ico'})
                and not path.startswith(('firebase', 'firestore')))
    return not paths or any(not isolated(path) for path in paths)


def main():
    phase = sys.argv[1]
    candidate = os.environ['GITHUB_SHA']
    if phase == 'record':
        if os.environ.get('GITHUB_EVENT_NAME') != 'push' or os.environ.get('GITHUB_REF') != 'refs/heads/main':
            raise ValueError('Preuve reservee au push main')
        if not re.fullmatch('[0-9a-f]{40}', candidate):
            raise ValueError('Commit invalide')
        cycle.write(Path(sys.argv[2])/'verification.json', evidence(candidate))
    elif phase == 'reuse':
        try:
            verified = reusable(candidate, sys.argv[2])
        except Exception:
            # Missing, expired, unavailable or invalid evidence never skips a test.
            verified = False
        cycle.output(verified=str(verified).lower())
        print('Verification applicative : ' + ('preuve main exacte reutilisee' if verified else 'suite complete requise'))
    elif phase == 'scope':
        base = os.environ.get('BASE_SHA', '')
        required = True
        if re.fullmatch('[0-9a-f]{40}', base) and base != '0'*40:
            try:
                paths = subprocess.check_output(['git', 'diff', '--name-only', '--no-renames', base, candidate], text=True).splitlines()
                required = firestore_required(paths)
            except subprocess.CalledProcessError:
                pass
        cycle.output(firestore=str(required).lower())
        print('Emulateur Firestore : ' + ('controle complet' if required else 'interface/documentation seules, regles inchangees'))
    else:
        raise ValueError('Phase inconnue')


if __name__ == '__main__':
    main()
