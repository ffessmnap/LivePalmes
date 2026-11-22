"""Closed TEST-only source receipt for the already tested Direct public display."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'directPublicDisplay'
CONTRACT_PATH = '.github/releases/evidence/20261122-direct-public-display-test-contract.json'
CONTRACT_SHA256 = 'dd71c30b8babc9402fd015fef112785103eef980dc9a704a1177f9936738890e'
NAMES = frozenset({'manageLivePalmesDirect', 'readNapPublicSwimmer'})


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()


def contract():
    raw = (ROOT / CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat Direct public TEST modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['id'] == 'direct-public-display-test-v1'
            and value['project'] == 'livepalmes-test'
            and value['allowedFunctions'] == sorted(NAMES)
            and set(value['fingerprints']) == NAMES, 'Perimetre Direct public TEST invalide')
    return value


def manifest(request, run_git=None):
    run_git = run_git or git
    value = contract()
    require(request.get('schema') == 2 and request.get(OPTION) == CONTRACT_SHA256
            and request.get('functions') == value['allowedFunctions']
            and request.get('approval') == value['approval']
            and all(request.get(key) == value[key] for key in ['baselineRun', 'baselineCandidate', 'baselineHosting']),
            'Manifeste ou accord Direct public TEST hors contrat')
    candidate = request.get('candidate', '')
    require(re.fullmatch('[a-f0-9]{40}', str(candidate)), 'Candidat Direct public TEST exact requis')
    run_git('merge-base', '--is-ancestor', value['applicationCommit'], candidate)
    changed = run_git('diff', '--name-only', '--no-renames', value['applicationCommit'], candidate).splitlines()
    require(set(changed) <= set(value['toolingPaths']), 'Application Direct public modifiee apres gel')
    return value


def fingerprints(request, calculate):
    value = manifest(request)
    desired, anchored = calculate(request['candidate']), calculate(value['applicationCommit'])
    require(desired == anchored and all(desired.get(name) == fingerprint
            for name, fingerprint in value['fingerprints'].items()), 'Sources Direct public differentes du candidat teste')
