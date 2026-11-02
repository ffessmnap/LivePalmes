"""One explicit TEST-only rules restriction for the approved 24h portal session."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

BEFORE = '21dba28a68feec4d0164d82cc5aec60395b30e3f9ef32fa2193ec0659e4f58dc'
AFTER = 'c08143b2e616943508a84fdbcdc4ae677db736bb75b6ff7ff06b940b1074353d'
PROJECT = 'livepalmes-test'
PROJECT_NUMBER = '206080168534'
APPROVAL = '20261102-portal-session-24h-test'


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(text):
    return hashlib.sha256(text.replace('\r\n', '\n').encode('utf-8')).hexdigest()


def validate_sources(before, after, project):
    require(project == PROJECT, 'Protection de session reservee a TEST')
    require(digest(before) == BEFORE and digest(after) == AFTER, 'Regles hors restriction exacte approuvee')


def api(path, token):
    request = urllib.request.Request('https://firebaserules.googleapis.com/v1/' + path,
                                     headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def rules(token):
    release = api('projects/' + PROJECT + '/releases/cloud.firestore', token)
    name = release.get('rulesetName', '')
    require(re.fullmatch(r'projects/(?:' + PROJECT + '|' + PROJECT_NUMBER + r')/rulesets/[A-Za-z0-9_-]+', name), 'Ruleset hors projet TEST')
    files = api(name, token).get('source', {}).get('files', [])
    require(len(files) == 1 and isinstance(files[0].get('content'), str), 'Source Firestore inconnue')
    return {'release': name, 'sha256': digest(files[0]['content'])}


def deploy(root, output):
    root = Path(root).resolve()
    require(os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and os.environ.get('PORTAL_SESSION_RULES_APPROVAL') == APPROVAL
            and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('HOSTING_ONLY') != 'true'
            and not os.environ.get('AUTOMATIC_CANDIDATE'), 'Accord manuel TEST de session absent')
    candidate = os.environ.get('CANDIDATE_SHA', '')
    require(re.fullmatch(r'[a-f0-9]{40}', candidate) and candidate == os.environ.get('GITHUB_SHA'), 'Candidat exact absent')
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    require(actual == candidate, 'Checkout different du candidat verifie')
    require(digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Source de regles modifiee')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text(encoding='utf-8'))
    require(credentials.get('project_id') == PROJECT, 'Identite Google hors TEST')
    token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()
    before = rules(token)
    require(before['sha256'] in {BEFORE, AFTER}, 'Derive des regles TEST : arret avant ecriture')
    changed = before['sha256'] != AFTER
    if changed:
        cli = str(root/'tests/firestore-rules/node_modules/.bin/firebase')
        command = [cli, 'deploy', '--project', PROJECT, '--only', 'firestore:rules', '--non-interactive']
        subprocess.run(command + ['--dry-run'], cwd=root, check=True)
        require(rules(token)['sha256'] == before['sha256'], 'Derive des regles pendant la simulation : arret')
        subprocess.run(command, cwd=root, check=True)
    after = rules(token)
    require(after['sha256'] == AFTER, 'Regles TEST non attestees apres publication')
    proof = {'schema': 1, 'project': PROJECT, 'candidate': candidate, 'approval': APPROVAL,
             'before': before, 'after': after, 'deployed': changed, 'indexesDeployed': False,
             'productionTouched': False, 'businessInvocations': 0}
    Path(output).write_text(json.dumps(proof, indent=2) + '\n', encoding='utf-8')
    print('Restriction de session TEST attestee ; aucun index, donnees metier ou regles PROD touches.')


def check(root, output):
    """Ordinary releases may reuse the exact deployed restriction, never write it."""
    root = Path(root).resolve()
    require(os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and os.environ.get('GITHUB_REF') == 'refs/heads/main', 'Lecture des regles reservee a TEST main')
    candidate = os.environ.get('CANDIDATE_SHA', '')
    require(re.fullmatch(r'[a-f0-9]{40}', candidate) and candidate == os.environ.get('GITHUB_SHA')
            and subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip() == candidate, 'Candidat exact absent')
    require(digest((root/'firestore.rules').read_text(encoding='utf-8')) == AFTER, 'Restriction locale differente')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text(encoding='utf-8'))
    require(credentials.get('project_id') == PROJECT, 'Identite Google hors TEST')
    token = subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
    current = rules(token)
    manual = os.environ.get('PORTAL_SESSION_RULES_WRITE') == 'true'
    require(current['sha256'] in ({BEFORE,AFTER} if manual else {AFTER}), 'Regles non publiees ou derive : parcours manuel requis avant toute publication')
    Path(output).write_text(json.dumps({'schema':1,'project':PROJECT,'candidate':candidate,'after':current,
        'deployed':False,'indexesDeployed':False,'productionTouched':False,'businessInvocations':0,'readOnly':True},indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    if sys.argv[1] == 'check':
        check(sys.argv[2], sys.argv[3])
    else:
        deploy(sys.argv[1], sys.argv[2])
