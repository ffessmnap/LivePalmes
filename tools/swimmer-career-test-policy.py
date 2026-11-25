"""Pin the approved TEST-only routing change for the swimmer career reader."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'swimmerCareer'
CONTRACT_PATH = '.github/releases/evidence/20261125-swimmer-career-test-contract.json'
CONTRACT_SHA256 = '2e79e612fb6c342e3e1ba4e04763a677de7bc29a497a74ca6c4cf093617036c4'
INDEX = 'functions/index.js'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def contract():
    raw = (ROOT / CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat carrière TEST modifié')
    value = json.loads(raw)
    require(value['project'] == 'livepalmes-test' and value['id'] == 'swimmer-career-test-v1'
            and value['allowedFunctions'] == ['readNapPublicSwimmer'], 'Périmètre carrière TEST invalide')
    return value


def manifest(request, run_git=None):
    value = contract()
    require(request.get('schema') == 2 and request.get(OPTION) == CONTRACT_SHA256
            and request.get('functions') == value['allowedFunctions']
            and all(request.get(key) == value[key] for key in ('baselineRun', 'baselineCandidate', 'baselineHosting', 'approval')),
            'Manifeste ou accord carrière TEST hors contrat')
    candidate = request.get('candidate')
    require(re.fullmatch('[0-9a-f]{40}', str(candidate)), 'Commit TEST exact requis')
    run_git = run_git or git
    run_git('merge-base', '--is-ancestor', value['applicationCommit'], candidate)
    changed = run_git('diff', '--name-only', '--no-renames', value['applicationCommit'], candidate).splitlines()
    require(set(changed) <= set(value['toolingPaths']), 'Application carrière modifiée après le gel')
    return value


def check_sources(request, paths, policy, run_git, calculate):
    value = manifest(request, run_git)
    baseline, application, candidate = value['baselineCandidate'], value['applicationCommit'], request['candidate']
    require(run_git('rev-parse', baseline + ':' + INDEX) == value['indexBefore']
            and run_git('rev-parse', candidate + ':' + INDEX) == value['indexAfter'],
            'Raccord carrière différent du changement autorisé')
    # Keep every other protected file at its authenticated TEST baseline.
    for name in policy.PROTECTED:
        if name != INDEX:
            require(run_git('rev-parse', baseline + ':' + name) == run_git('rev-parse', application + ':' + name),
                    'Configuration hors contrat carrière : ' + name)
    policy.source_paths(application, candidate, paths, run_git)
    desired = calculate(candidate)
    require(desired == calculate(application)
            and desired.get('readNapPublicSwimmer') == value['fingerprints']['readNapPublicSwimmer'],
            'Empreintes différentes du candidat carrière autorisé')
