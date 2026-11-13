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


def evidence(candidate, suite='verify-livepalmes'):
    return {'schema': 1, 'candidate': candidate, 'suite': suite,
            'result': 'success', 'node': node_version(), 'platform': sys.platform}


def documentation_parent(candidate):
    """Prove a first-parent edge changes only documentation; never infer from CI title."""
    parents = subprocess.check_output(['git','rev-list','--parents','-n','1',candidate], cwd=ROOT, text=True).split()
    if not (2 <= len(parents) <= 3 and parents[0] == candidate
            and all(re.fullmatch('[0-9a-f]{40}', p) for p in parents)):
        return None
    parent = parents[1]
    paths = subprocess.check_output(['git','diff','--name-only','--no-renames',parent,candidate], cwd=ROOT, text=True).splitlines()
    return (parent, paths) if documentation_only(paths) else None


def reusable(candidate, directory, suite='verify-livepalmes'):
    if not re.fullmatch('[0-9a-f]{40}', candidate) or suite not in {'verify-livepalmes','publication-offline-v1'}:
        return False
    repo = os.environ['GITHUB_REPOSITORY']
    original, links = candidate, []
    name = 'application-verification' if suite == 'verify-livepalmes' else 'publication-verification'
    for _ in range(11):
        runs = cycle.gh(f'repos/{repo}/actions/workflows/livepalmes-verification-preview.yml/runs?event=push&branch=main&head_sha={candidate}&per_page=10')['workflow_runs']
        valid = [r for r in runs[:10] if r.get('head_sha') == candidate and r.get('event') == 'push'
                 and r.get('head_branch') == 'main' and r.get('path') == WORKFLOW
                 and r.get('status') == 'completed' and r.get('conclusion') == 'success'
                 and r.get('run_attempt', 1) == 1]
        if not valid:
            return False
        run = valid[0]
        inventory = cycle.gh(f'repos/{repo}/actions/runs/{run["id"]}/artifacts?per_page=100')
        items = inventory['artifacts']
        cycle.require(inventory.get('total_count', len(items)) <= 100, 'Inventaire de preuves incomplet')
        if any(a.get('name') == name for a in items):
            # Expired, ambiguous, corrupt or incompatible evidence must raise/fail,
            # never search an older proof to conceal it.
            info = cycle.artifact(run['id'], name, directory, WORKFLOW)
            if info.get('head_sha') != candidate or info.get('event') != 'push':
                return False
            if cycle.read(Path(directory)/'verification.json') != evidence(candidate, suite):
                return False
            if links:
                cycle.write(Path(directory)/'documentation-equivalence.json',
                    {'schema':1,'candidate':original,'sourceCandidate':candidate,'suite':suite,
                     'sourceRun':run['id'],'sourceArtifact':name,'links':links,
                     'sourceProofUnchanged':True})
            return True
        edge = documentation_parent(candidate)
        if edge is None or len(links) >= 10:
            return False
        parent, paths = edge
        links.append({'candidate':candidate,'parent':parent,'run':run['id'],'paths':paths})
        candidate = parent
    return False


def firestore_required(paths):
    # Emulator tests read firestore.rules only; unknown/shared paths keep the full suite.
    def isolated(path):
        value = Path(path)
        return (path == 'AGENTS.md' or (path.startswith('docs/') and value.suffix == '.md')
                or (path.startswith(('assets/', 'css/'))
                    and value.suffix in {'.css', '.svg', '.png', '.ico', '.webp', '.jpg', '.jpeg'})
                or (len(value.parts) == 1 and value.suffix in {'.html', '.css', '.js', '.svg', '.png', '.ico'})
                and not path.startswith(('firebase', 'firestore')))
    return not paths or any(not isolated(path) for path in paths)


def documentation_only(paths):
    # Policy files, tools, workflows and unknown extensions always keep full CI.
    return bool(paths) and all(path.startswith('docs/') and path.endswith('.md') for path in paths)


def mysql_required(paths):
    # Only CSS/images and documentation have no SQL execution or schema dependency.
    # HTML, JavaScript, tooling, tests, configuration and unknown paths keep MySQL.
    def presentation(path):
        value = Path(path)
        return (path.startswith('docs/') and value.suffix == '.md'
                or value.suffix in {'.css', '.svg', '.png', '.ico', '.webp', '.jpg', '.jpeg'}
                and (len(value.parts) == 1 or path.startswith(('assets/', 'css/'))))
    return not paths or any(not presentation(path) for path in paths)


def check_documentation(paths):
    for path in paths:
        file = ROOT / path
        if not file.exists():  # Deleted documentation still belongs to this scope.
            continue
        content = file.read_text(encoding='utf-8', errors='strict')
        if '\x00' in content or re.search(r'^(<<<<<<< |=======\s*$|>>>>>>> )', content, re.M):
            raise ValueError('Documentation invalide : ' + path)
        if '<!-- description:' not in content:
            raise ValueError('Description documentaire absente : ' + path)
    print(f'Documentation : {len(paths)} fichiers relus (UTF-8, description, conflits).')


def main():
    phase = sys.argv[1]
    candidate = os.environ['GITHUB_SHA']
    suite = 'publication-offline-v1' if phase.endswith('-publication') else 'verify-livepalmes'
    phase = phase.removesuffix('-publication')
    if phase == 'record':
        if os.environ.get('GITHUB_EVENT_NAME') != 'push' or os.environ.get('GITHUB_REF') != 'refs/heads/main':
            raise ValueError('Preuve reservee au push main')
        if not re.fullmatch('[0-9a-f]{40}', candidate):
            raise ValueError('Commit invalide')
        cycle.write(Path(sys.argv[2])/'verification.json', evidence(candidate, suite))
    elif phase == 'reuse':
        try:
            verified = reusable(candidate, sys.argv[2], suite) if suite != 'verify-livepalmes' else reusable(candidate, sys.argv[2])
        except Exception:
            # Missing, expired, unavailable or invalid evidence never skips a test.
            verified = False
        cycle.output(verified=str(verified).lower())
        print('Verification applicative : ' + ('preuve main authentifiee compatible reutilisee' if verified else 'suite complete requise'))
    elif phase == 'scope':
        base = os.environ.get('BASE_SHA', '')
        required, docs, mysql = True, False, True
        if re.fullmatch('[0-9a-f]{40}', base) and base != '0'*40:
            try:
                paths = subprocess.check_output(['git', 'diff', '--name-only', '--no-renames', base, candidate], text=True).splitlines()
                required = firestore_required(paths)
                docs = documentation_only(paths)
                mysql = mysql_required(paths)
                if docs:
                    check_documentation(paths)
            except subprocess.CalledProcessError:
                pass
        cycle.output(firestore=str(required).lower(), documentation=str(docs).lower())
        cycle.output(mysql=str(mysql).lower())
        print('Emulateur Firestore : ' + ('controle complet' if required else 'interface/documentation seules, regles inchangees'))
        print('Integration MySQL : ' + ('requise (dependance possible ou inconnue)' if mysql else 'non requise : styles/images/documentation uniquement'))
    else:
        raise ValueError('Phase inconnue')


if __name__ == '__main__':
    main()
