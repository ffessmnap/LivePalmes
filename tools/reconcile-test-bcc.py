"""Refresh only the seven existing TEST exports at its already validated commit.

Never switches Hosting, changes mail control/IAM/queues or invokes a handler.
The tooling SHA and the application SHA deliberately remain separate.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


cycle = module('reconcile_cycle', 'release-cycle.py')
policy = module('reconcile_policy', 'bcc-publication-policy.py')


def guard(env, application_sha, tooling_sha):
    cycle.require(env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_RUN_ATTEMPT') == '1'
        and env.get('CONFIRMATION') == 'livepalmes-test'
        and all(env.get(k) == 'livepalmes-test' for k in ['TARGET_FIREBASE_PROJECT', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT'])
        and application_sha == policy.contract()['candidate'] and tooling_sha == env.get('GITHUB_SHA')
        and cycle.SHA.fullmatch(tooling_sha), 'Reconciliation TEST hors version/cible/confimation')


def read_control():
    credentials = cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    cycle.require(credentials['project_id'] == 'livepalmes-test', 'Compte TEST obligatoire')
    token = cycle.run(['gcloud', 'auth', 'application-default', 'print-access-token'])
    url = 'https://firestore.googleapis.com/v1/projects/livepalmes-test/databases/(default)/documents/engagementConfigurations/notificationDelivery'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=30) as response:
        value = json.load(response)
    cycle.require(value.get('fields', {}).get('enabled') == {'booleanValue': False}, 'Mails TEST deja desactives requis')
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def verify_state(before, after, selected, candidate):
    cycle.require(before['hosting'] == after['hosting'], 'Hosting TEST modifie pendant reconciliation')
    old = {f['name']: f for f in before['functions']}
    new = {f['name']: f for f in after['functions']}
    cycle.require(len(before['functions']) == len(after['functions']) == len(old) == 115 and set(old) == set(new), 'Inventaire TEST modifie')
    for full, previous in old.items():
        current = new[full]
        if full.split('/')[-1] in selected:
            cycle.require(current.get('state') == 'ACTIVE' and current.get('commit') == candidate
                and current.get('revision') and current.get('updateTime'), 'Export TEST incomplet')
        else:
            cycle.require(current == previous, 'Export TEST hors selection modifie')


def main(mode, directory, candidate):
    directory, candidate = Path(directory).resolve(), Path(candidate).resolve()
    c = policy.contract()
    application_sha = cycle.run(['git', 'rev-parse', 'HEAD'], candidate)
    tooling_sha = cycle.git('rev-parse', 'HEAD')
    guard(os.environ, application_sha, tooling_sha)
    subprocess.run(['git', 'merge-base', '--is-ancestor', application_sha, tooling_sha], cwd=ROOT, check=True)
    cycle.require(not cycle.run(['git', 'status', '--porcelain'], candidate), 'Source TEST modifiee')
    names = c['testReconciliationFunctions']
    stage = Path(os.environ['RUNNER_TEMP']).resolve() / '.firebase-test-functions'
    cycle.require(stage.resolve().parent == Path(os.environ['RUNNER_TEMP']).resolve()
        and stage.name == '.firebase-test-functions', 'Dossier temporaire TEST hors cible')
    if mode == 'prepare':
        info = cycle.artifact(c['testRun'], 'test-proof', directory / 'published', '.github/workflows/livepalmes-test-common.yml')
        evidence = cycle.read(directory / 'published/test-proof.json')
        cycle.require(info['head_sha'] == application_sha and evidence['candidate'] == application_sha
            and cycle.reusable_verification(evidence, application_sha), 'Preuve applicative TEST incompatible')
        before = cycle.snapshot('livepalmes-test')
        cycle.require(before == evidence['state'] and before['hosting']['version'] == c['testHosting'],
            'TEST a evolue : ne pas remplacer la version commune')
        cycle.require(all(any(f['name'].split('/')[-1] == name and f['state'] == 'ACTIVE'
            for f in before['functions']) for name in names), 'Export TEST existant absent')
        cycle.write(directory / 'before.json', before)
        cycle.write(directory / 'mail-witness.json', {'sha256': read_control()})
        subprocess.run(['node', str(candidate / 'tools/prepare-firebase-test-functions.js'), 'email', str(stage)],
                       env={**os.environ, 'NOTIFICATION_BCC_TASKS': 'true'}, check=True)
        index = stage / 'functions/index.js'
        narrow = cycle.run(['node', '-e', 'const fs=require("fs"),m=require(process.argv[1]);process.stdout.write(m.narrow(fs.readFileSync(process.argv[2],"utf8"),{NOTIFICATION_BCC_TASKS:"true"}));',
                           str(ROOT / 'tools/refresh-test-notifications.js'), str(index)])
        narrow += '\nfor (const name of ' + json.dumps(names) + ') { if(!exports[name]?.__endpoint) throw Error("Endpoint absent"); exports[name].__endpoint.labels={...exports[name].__endpoint.labels,"livepalmes-commit":' + json.dumps(application_sha) + '}; }\n'
        index.write_text(narrow)
        cycle.write(directory / 'selection.json', names)
    elif mode in {'dry-run', 'deploy'}:
        cycle.require(cycle.read(directory / 'selection.json') == names, 'Selection TEST modifiee')
        cycle.require(cycle.snapshot('livepalmes-test') == cycle.read(directory / 'before.json'), 'TEST modifie avant publication')
        cycle.require(read_control() == cycle.read(directory / 'mail-witness.json')['sha256'], 'Reglage TEST modifie')
        command = [str(ROOT / 'tests/firestore-rules/node_modules/.bin/firebase'), 'deploy', '--project', 'livepalmes-test',
            '--config', str(stage / 'firebase.json'), '--only', ','.join('functions:' + n for n in names), '--non-interactive', '--force']
        if mode == 'dry-run': command.append('--dry-run')
        subprocess.run(command, check=True)
    elif mode == 'verify':
        before = cycle.read(directory / 'before.json'); after = cycle.snapshot('livepalmes-test')
        verify_state(before, after, names, application_sha)
        cycle.require(read_control() == cycle.read(directory / 'mail-witness.json')['sha256'], 'Reglage TEST modifie apres publication')
        cycle.write(directory / 'test-backend-proof.json', {'schema': 1, 'candidate': application_sha,
            'state': {'functions': [f for f in after['functions'] if f['name'].split('/')[-1] in names]},
            'reconciliation': {'schema': 1, 'suite': 'bcc-current-test-v1', 'testRun': c['testRun'],
                'toolingCommit': tooling_sha, 'hostingUnchanged': True, 'mailSettingUnchanged': True,
                'otherFunctionsUnchanged': True}})
    else:
        raise ValueError('Mode interdit')


if __name__ == '__main__':
    main(*sys.argv[1:])
