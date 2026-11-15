"""Immutable A1 TEST exception; ordinary and production policies stay closed."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'a1PublicPrivacy'
CONTRACT_PATH = '.github/releases/evidence/20261115-a1-public-privacy-test-contract.json'
CONTRACT_SHA256 = "7f6a013fa591264e9856e9cb1d862a05018f5316dcdf61cd923234a25ad1ac2f"

# Exact tooling-only repair after the source receipt; keep its immutable contract.
COORDINATION_REPAIR = {
    'tools/coordinate-test-publication.py': 'f1d2a0c61039bafd65c5b2699900939fda631078',
    'tests/test-publication-coordination-tests.py': '4c8e8e1c43c529b75e87047efbbc7dfdbfdb870b',
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()


def contract():
    raw = (ROOT / CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat A1 TEST modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['id'] == 'a1-public-privacy-test-v1'
            and value['project'] == 'livepalmes-test'
            and value['allowedFunctions'] == ['readNapPublicSwimmer']
            and set(value['fingerprints']) == set(value['allowedFunctions'])
            and set(value['retiredFiles']) == {'performances/public/data/admin-reference.js'},
            'Perimetre A1 TEST invalide')
    return value


def candidate(candidate, run_git=git):
    value = contract()
    require(re.fullmatch('[a-f0-9]{40}', str(candidate)), 'Candidat A1 exact requis')
    run_git('merge-base', '--is-ancestor', value['applicationCommit'], candidate)
    changed = run_git('diff', '--name-only', '--no-renames', value['applicationCommit'], candidate).splitlines()
    require(set(changed) <= set(value['toolingPaths']) | set(COORDINATION_REPAIR), 'Application A1 modifiee apres gel')
    for name in set(changed).intersection(COORDINATION_REPAIR):
        require(run_git('rev-parse', candidate + ':' + name) == COORDINATION_REPAIR[name],
                'Raccord de coordination A1 different du correctif exact')
    return value


def manifest(request, run_git=git):
    value = candidate(request['candidate'], run_git)
    require(request.get(OPTION) == CONTRACT_SHA256
            and request['functions'] == value['allowedFunctions']
            and request['approval'] == value['approval']
            and all(request[key] == value[key] for key in ['baselineRun', 'baselineCandidate', 'baselineHosting']),
            'Manifeste ou accord A1 TEST hors contrat')
    return value


def retired_paths(paths, candidate_sha, run_git=git, project=None):
    require(project == 'livepalmes-test', 'Retrait A1 reserve a TEST')
    value = candidate(candidate_sha, run_git)
    for name, blob in value['retiredFiles'].items():
        require(name in paths and run_git('rev-parse', value['baseCommit'] + ':' + name) == blob,
                'Source retiree A1 differente ou absente du diff')
        require(not run_git('ls-tree', '--name-only', candidate_sha, '--', name), 'Referentiel A1 encore present')
    return set(value['retiredFiles'])


def source_paths(request, paths, protected, run_git=git):
    value = manifest(request, run_git)
    for name in protected:
        expected = value['applicationCommit'] if name == 'functions/index.js' else value['baselineCandidate']
        require(run_git('rev-parse', expected + ':' + name) == run_git('rev-parse', request['candidate'] + ':' + name),
                'Configuration ou entree A1 hors contrat : ' + name)
    retired = retired_paths(paths, request['candidate'], run_git, 'livepalmes-test')
    remaining = [name for name in paths if name not in retired]
    require(not any(name.startswith(('performances/public/data/', 'functions/private/', 'migrations/'))
                    or name.endswith(('.sql', '.env')) for name in remaining),
            'Autre donnee, migration ou secret hors contrat A1')
    return remaining
