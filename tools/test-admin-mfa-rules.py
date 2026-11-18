"""Closed TEST-only admin.full MFA Rules, after authenticated source publication."""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes-test'
APPROVAL = '20261118-admin-full-mfa-test'


def load(name):
    spec = importlib.util.spec_from_file_location('admin_mfa_rules_'+name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


shared = load('test-portal-session-rules.py')
projection = load('admin-mfa-rules-policy.py')
require, digest, rules = shared.require, shared.digest, shared.rules
BEFORE, AFTER = projection.BEFORE[PROJECT], projection.AFTER[PROJECT]


def validate_sources(before, after, project):
    require(project == PROJECT, 'Projection MFA reservee a TEST')
    projection.validate(before, after, project)


def validate_candidate(root):
    root = Path(root).resolve()
    source = load('publish-test-admin-mfa-sources.py'); entry = source.contract()
    require(root == ROOT and not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=root,text=True).strip(),
            'Checkout MFA TEST suivi modifie')
    subprocess.run(['git','merge-base','--is-ancestor',entry['applicationCommit'],'HEAD'],cwd=root,check=True,capture_output=True)
    changed = subprocess.check_output(['git','diff','--name-only','--no-renames',entry['applicationCommit'],'HEAD'],cwd=root,text=True).splitlines()
    require(set(changed) <= set(entry['toolingPaths']), 'Autre code ajoute au candidat MFA')
    candidate = subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
    require(source.cycle.test_backend_fingerprints(candidate) == source.cycle.test_backend_fingerprints(entry['applicationCommit'])
            and digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Code/Rules MFA hors ancre')
    return entry


def context(root):
    root = Path(root).resolve(); candidate = os.environ.get('CANDIDATE_SHA','')
    require(os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and os.environ.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
            and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_WORKFLOW_REF') == 'ffessmnap/LivePalmes/.github/workflows/livepalmes-test-common.yml@refs/heads/main'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1' and re.fullmatch('[a-f0-9]{40}',candidate)
            and candidate == os.environ.get('GITHUB_SHA')
            and subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip() == candidate
            and digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Contexte Rules MFA TEST invalide')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text(encoding='utf-8'))
    require(credentials.get('project_id') == PROJECT, 'Identite Rules MFA hors TEST')
    token = subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
    return root, candidate, token


def manual_write():
    return (os.environ.get('ADMIN_MFA_RULES_WRITE') == 'true' and os.environ.get('ADMIN_MFA_HOSTING_MODE') == 'true'
            and not os.environ.get('ADMIN_MFA_AUTOMATIC_CANDIDATE') and os.environ.get('ADMIN_MFA_VERIFICATION_ONLY') != 'true'
            and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch')


def check(root, output):
    root, candidate, token = context(root)
    current = rules(token)
    require(current['sha256'] in ({BEFORE, AFTER} if manual_write() else {AFTER}), 'Derive Rules MFA TEST')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,'after':current,
        'deployed':False,'indexesDeployed':False,'productionTouched':False,'businessInvocations':0,'readOnly':True},indent=2)+'\n',encoding='utf-8')


def deploy(root, output):
    require(manual_write() and os.environ.get('ADMIN_MFA_RULES_APPROVAL') == APPROVAL, 'Accord MFA TEST manuel absent')
    root, candidate, token = context(root); entry = validate_candidate(root)
    temporary = Path(os.environ['RUNNER_TEMP'])
    require(json.loads((temporary/'test-selection.json').read_text()) == [], 'Backend MFA non prouve avant Rules')
    before_state = json.loads((temporary/'test-before.json').read_text())
    source = load('publish-test-admin-mfa-sources.py'); current_state = source.cycle.snapshot(PROJECT)
    require(current_state == before_state and len(current_state['functions']) == entry['baselineFunctionCount'],
            'Derive backend/Hosting MFA avant Rules')
    names = {f['name'].split('/')[-1]:f for f in current_state['functions']}
    require(all(names[n]['state'] == 'ACTIVE' and names[n]['commit'] == candidate for n in entry['allowedFunctions']),
            'Sources MFA du candidat non attestees')
    before = rules(token); require(before['sha256'] in {BEFORE,AFTER}, 'Derive Rules MFA avant simulation')
    changed = before['sha256'] != AFTER
    if changed:
        cli = str(root/'tests/firestore-rules/node_modules/.bin/firebase')
        command = [cli,'deploy','--project',PROJECT,'--only','firestore:rules','--non-interactive']
        subprocess.run(command+['--dry-run'],cwd=root,check=True)
        require(rules(token) == before, 'Derive Rules MFA pendant simulation')
        require(source.cycle.snapshot(PROJECT) == current_state, 'Derive des sources MFA avant ecriture Rules')
        subprocess.run(command,cwd=root,check=True)
    after = rules(token); require(after['sha256'] == AFTER, 'Rules MFA TEST non confirmees')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,
        'contractSha256':source.CONTRACT_SHA256,'applicationAnchor':entry['applicationCommit'],
        'approval':APPROVAL,'before':before,'after':after,'deployed':changed,'sourcesVerified':True,
        'indexesDeployed':False,'productionTouched':False,'businessInvocations':0},indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__': {'check':check,'deploy':deploy}[sys.argv[1]](*sys.argv[2:])
