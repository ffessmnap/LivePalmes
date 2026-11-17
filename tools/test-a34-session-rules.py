"""Closed A3.4a TEST snapshot closure; all historical contracts stay unchanged."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes-test'
BEFORE = '435cec310d319499827c1f34a7758cb9c775daeedda7bc5d811017e85fda05c4'
AFTER = '367fbf01bf3f2794727b19e6d5f5bd141bcf6baf31002500c9ffc8bb1ea98561'
APPROVAL = '20261117-a34-portal-session-enforcement-test'
spec = importlib.util.spec_from_file_location('a34_rules_primitives', ROOT/'tools/test-portal-session-rules.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
require, digest, rules = shared.require, shared.digest, shared.rules


def validate_sources(before, after, project):
    require(project == PROJECT and digest(before) == BEFORE and digest(after) == AFTER,
            'Fermeture A3.4a hors des deux sources exactes TEST')


def validate_candidate(root):
    root = Path(root).resolve()
    path = root/'.github/releases/evidence/20261117-test-portal-session-enforcement-contract.json'
    raw = path.read_bytes().replace(b'\r\n', b'\n')
    policy = root/'tools/publish-test-portal-session-enforcement.py'
    marker = re.search(r"CONTRACT_SHA256 = '([a-f0-9]{64})'", policy.read_text(encoding='utf-8'))
    require(marker and hashlib.sha256(raw).hexdigest() == marker.group(1), 'Contrat A3.4a non authentifie')
    entry = json.loads(raw)
    require(not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=root,text=True).strip(),
            'Etat suivi A3.4a modifie hors candidat')
    anchor = entry['applicationCommit']
    require(re.fullmatch('[a-f0-9]{40}', anchor), 'Ancre A3.4a invalide')
    subprocess.run(['git','merge-base','--is-ancestor',anchor,'HEAD'],cwd=root,check=True,capture_output=True)
    paths = subprocess.check_output(['git','diff','--name-only','--no-renames',anchor,'HEAD'],cwd=root,text=True).splitlines()
    require(set(paths) <= set(entry['toolingPaths']), 'Autre source applicative ajoutee au lot A3.4a')
    require(digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Regles A3.4a locales differentes')


def context(root):
    root = Path(root).resolve()
    candidate = os.environ.get('CANDIDATE_SHA', '')
    require(os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
            and os.environ.get('GITHUB_WORKFLOW_REF') == 'ffessmnap/LivePalmes/.github/workflows/livepalmes-test-common.yml@refs/heads/main'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
            and re.fullmatch('[a-f0-9]{40}', candidate)
            and candidate == os.environ.get('GITHUB_SHA')
            and subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip() == candidate,
            'Lecture A3.4a reservee au candidat TEST main exact')
    require(digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Regles A3.4a locales differentes')
    identity = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text(encoding='utf-8'))
    require(identity.get('project_id') == PROJECT, 'Identite A3.4a hors TEST')
    token = subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
    return root, candidate, token


def check(root, output):
    root, candidate, token = context(root)
    current = rules(token)
    manual = (os.environ.get('A34_RULES_WRITE') == 'true'
              and os.environ.get('A34_HOSTING_MODE') == 'true'
              and not os.environ.get('A34_AUTOMATIC_CANDIDATE')
              and os.environ.get('A34_VERIFICATION_ONLY') != 'true')
    require(current['sha256'] in ({BEFORE, AFTER} if manual else {AFTER}),
            'Regles A3.4a non publiees ou derive : arret')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,
        'after':current,'deployed':False,'indexesDeployed':False,'productionTouched':False,
        'businessInvocations':0,'readOnly':True},indent=2)+'\n',encoding='utf-8')


def deploy(root, output):
    require(os.environ.get('A34_RULES_APPROVAL') == APPROVAL
            and os.environ.get('A34_RULES_WRITE') == 'true'
            and os.environ.get('A34_HOSTING_MODE') == 'true'
            and not os.environ.get('A34_AUTOMATIC_CANDIDATE')
            and os.environ.get('A34_VERIFICATION_ONLY') != 'true', 'Accord A3.4a TEST manuel absent')
    root, candidate, token = context(root)
    validate_candidate(root)
    before = rules(token)
    require(before['sha256'] in {BEFORE, AFTER}, 'Derive A3.4a avant publication : arret')
    changed = before['sha256'] != AFTER
    if changed:
        cli = str(root/'tests/firestore-rules/node_modules/.bin/firebase')
        command = [cli,'deploy','--project',PROJECT,'--only','firestore:rules','--non-interactive']
        subprocess.run(command+['--dry-run'],cwd=root,check=True)
        require(rules(token)['sha256'] == before['sha256'], 'Derive A3.4a pendant simulation : arret')
        subprocess.run(command,cwd=root,check=True)
    after = rules(token)
    require(after['sha256'] == AFTER, 'Regles A3.4a non confirmees')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,
        'approval':APPROVAL,'before':before,'after':after,'deployed':changed,'indexesDeployed':False,
        'productionTouched':False,'businessInvocations':0},indent=2)+'\n',encoding='utf-8')
    print('A3.4a : annuaire direct ferme sur TEST, aucun index, donnee ou PROD touche.')


if __name__ == '__main__':
    {'check':check,'deploy':deploy}[sys.argv[1]](*sys.argv[2:])
