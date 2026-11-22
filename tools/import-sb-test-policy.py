"""Closed TEST-only source receipt for the approved SB import correction."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'importSbResults'
CONTRACT_PATH = '.github/releases/evidence/20261122-import-sb-test-contract.json'
CONTRACT_SHA256 = "7d297f1da48e658790ee7faa4557284a778e8d7ff726e05fb689bdd07024722d"
NAMES = frozenset(["createCompetitionImport","deleteCompetitionImport","previewCompetitionImport","readNapPublicSwimmer","savePerformanceCorrection","updateCompetitionImportRecordAlertDecision"])


def require(condition, message):
    if not condition:
        raise ValueError(message)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()


def contract():
    raw = (ROOT / CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat import SB TEST modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['id'] == 'import-sb-results-test-v1'
            and value['project'] == 'livepalmes-test'
            and value['allowedFunctions'] == sorted(NAMES)
            and set(value['fingerprints']) == NAMES, 'Perimetre import SB TEST invalide')
    return value


def manifest(request, run_git=None):
    run_git = run_git or git
    value = contract()
    require(request.get('schema') == 2 and request.get(OPTION) == CONTRACT_SHA256
            and request.get('functions') == value['allowedFunctions']
            and request.get('approval') == value['approval']
            and all(request.get(key) == value[key] for key in ['baselineRun', 'baselineCandidate', 'baselineHosting']),
            'Manifeste ou accord import SB TEST hors contrat')
    candidate = request.get('candidate', '')
    require(re.fullmatch('[a-f0-9]{40}', str(candidate)), 'Candidat import SB TEST exact requis')
    run_git('merge-base', '--is-ancestor', value['applicationCommit'], candidate)
    changed = run_git('diff', '--name-only', '--no-renames', value['applicationCommit'], candidate).splitlines()
    require(set(changed) <= set(value['toolingPaths']), 'Application import SB modifiee apres gel')
    return value


def fingerprints(request, calculate):
    value = manifest(request)
    desired, anchored = calculate(request['candidate']), calculate(value['applicationCommit'])
    require(desired == anchored and all(desired.get(name) == fingerprint
            for name, fingerprint in value['fingerprints'].items()), 'Sources import SB differentes du candidat teste')
