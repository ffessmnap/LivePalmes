"""Closed TEST source contract for foreign club officials without an FFESSM licence."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'foreignClubOfficials'
CONTRACT_PATH = '.github/releases/evidence/20261124-foreign-officials-test-contract.json'
CONTRACT_SHA256 = '395cdb34d451e061b48301bca9ee2f7096e299bd17bafb35f376361bc0c29b7e'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def contract():
    raw = (ROOT / CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat officiels étrangers TEST modifié')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['project'] == 'livepalmes-test'
            and value['id'] == 'foreign-officials-test-v1'
            and len(value['allowedFunctions']) == 8
            and value['allowedFunctions'] == sorted(value['fingerprints']), 'Périmètre TEST incohérent')
    return value


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def manifest(request, run_git=None):
    value = contract()
    require(request.get('schema') == 2 and request.get(OPTION) == CONTRACT_SHA256
            and request.get('functions') == value['allowedFunctions']
            and all(request.get(key) == value[key] for key in ('baselineRun', 'baselineCandidate', 'baselineHosting', 'approval')),
            'Manifeste ou accord TEST hors contrat officiels étrangers')
    candidate = request.get('candidate')
    require(isinstance(candidate, str) and re.fullmatch('[a-f0-9]{40}', candidate), 'Commit TEST exact requis')
    run_git = run_git or git
    run_git('merge-base', '--is-ancestor', value['applicationCommit'], candidate)
    changed = run_git('diff', '--name-only', '--no-renames', value['applicationCommit'], candidate).splitlines()
    require(set(changed) <= set(value['toolingPaths']), 'Application modifiée après le gel TEST')
    return value


def fingerprints(request, calculate):
    value = manifest(request)
    desired = calculate(request['candidate'])
    require(desired == calculate(value['applicationCommit'])
            and all(desired.get(name) == expected for name, expected in value['fingerprints'].items()),
            'Empreintes différentes du contrat officiels étrangers TEST')
