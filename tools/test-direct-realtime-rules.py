"""Exact private Direct wake-up rules, TEST only; legacy rules guards unchanged."""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_rules_primitives', ROOT/'tools/test-portal-session-rules.py')
shared = importlib.util.module_from_spec(spec); spec.loader.exec_module(shared)
require, digest, rules = shared.require, shared.digest, shared.rules
PROJECT = 'livepalmes-test'
BEFORE = 'c08143b2e616943508a84fdbcdc4ae677db736bb75b6ff7ff06b940b1074353d'
AFTER = '435cec310d319499827c1f34a7758cb9c775daeedda7bc5d811017e85fda05c4'
APPROVAL = '20261113-direct-private-realtime-test'


def validate_sources(before, after, project):
    require(project == PROJECT and digest(before) == BEFORE and digest(after) == AFTER,
            'Regles hors signal Direct TEST exact approuve')


def context(root):
    root = Path(root).resolve()
    require(os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1', 'Signal reserve a TEST main du depot attendu')
    candidate = os.environ.get('CANDIDATE_SHA', '')
    require(re.fullmatch(r'[a-f0-9]{40}', candidate) and candidate == os.environ.get('GITHUB_SHA')
            and subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip() == candidate,
            'Candidat exact absent')
    require(digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Source de signal differente')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text(encoding='utf-8'))
    require(credentials.get('project_id') == PROJECT, 'Identite hors TEST')
    token = subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
    return root, candidate, token


def check(root, output):
    root, candidate, token = context(root)
    current = rules(token)
    write = os.environ.get('DIRECT_REALTIME_RULES_WRITE') == 'true'
    verification = os.environ.get('DIRECT_REALTIME_VERIFICATION_ONLY') == 'true'
    require(current['sha256'] in ({BEFORE, AFTER} if write and not verification else {AFTER}),
            'Signal TEST non publie ou derive : parcours manuel exact requis')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,'after':current,
        'readOnly':True,'deployed':False,'indexesDeployed':False,'productionTouched':False,'businessInvocations':0},indent=2)+'\n',encoding='utf-8')


def deploy(root, output):
    require(os.environ.get('DIRECT_REALTIME_RULES_APPROVAL') == APPROVAL
            and os.environ.get('HOSTING_ONLY') == 'true'
            and not os.environ.get('AUTOMATIC_CANDIDATE')
            and os.environ.get('DIRECT_REALTIME_VERIFICATION_ONLY') != 'true',
            'Publication manuelle fermee du signal TEST absente')
    root, candidate, token = context(root)
    before = rules(token)
    require(before['sha256'] in {BEFORE, AFTER}, 'Derive des regles TEST avant ecriture')
    changed = before['sha256'] != AFTER
    if changed:
        cli = str(root/'tests/firestore-rules/node_modules/.bin/firebase')
        command = [cli,'deploy','--project',PROJECT,'--only','firestore:rules','--non-interactive']
        subprocess.run(command+['--dry-run'],cwd=root,check=True)
        require(rules(token)['sha256'] == before['sha256'], 'Derive pendant la simulation')
        subprocess.run(command,cwd=root,check=True)
    after = rules(token)
    require(after['sha256'] == AFTER, 'Regles privees non attestees')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,'approval':APPROVAL,
        'before':before,'after':after,'deployed':changed,'indexesDeployed':False,'productionTouched':False,'businessInvocations':0},indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    if sys.argv[1] == 'check': check(sys.argv[2], sys.argv[3])
    else: deploy(sys.argv[1], sys.argv[2])
