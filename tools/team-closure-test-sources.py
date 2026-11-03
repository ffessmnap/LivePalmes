"""Publish only existing protected TEST sources for the exact teams/trophy candidate."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes-test'
CANDIDATE = '7a6eedb6ee8b6c5943c194e88611219602782fdf'
TEST_RUN = 41738670112
PROTECTED = frozenset({
    'closeDueEngagementCompetitions', 'disableCompetitionEmailNotifications',
    'listEngagementCompetitionMailJobs', 'notifyEngagementCompetitionDocuments',
    'prepareEngagementClubRecapEmails', 'prepareEngagementLicenseControlBatch',
    'prepareEngagementOpeningNotificationEmails', 'processNapCompetitionNotifications',
    'processNapNotificationTask', 'readNapPublicSwimmer', 'resolveEngagementAccessRequest',
    'resolveEngagementSwimmerChangeRequest', 'sendEngagementPreparedEmails',
    'submitEngagementAccessRequest', 'syncNapClubAccountEmails',
    'updateCurrentEmailNotificationPreferences',
})
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def patch_source(function, source):
    name = function.get('name', '')
    build = function.get('buildConfig', {})
    if (name not in {PREFIX+n for n in PROTECTED} or function.get('state') != 'ACTIVE'
            or function.get('environment') != 'GEN_2' or build.get('runtime') != 'nodejs22'
            or build.get('entryPoint') != name.split('/')[-1]):
        raise ValueError('Fonction TEST hors contrat de sources equipes')
    if not source.get('bucket') or not source.get('object') or set(source) - {'bucket','object','generation'}:
        raise ValueError('Archive source TEST invalide')
    return {'name': name, 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**function.get('labels', {}), 'livepalmes-commit': CANDIDATE}}


def inventory(cycle):
    result, token = {}, ''
    for _ in range(50):
        data = cycle.api(PROJECT, 'functions'+(('&pageToken='+urllib.parse.quote(token)) if token else ''))
        cycle.require(not data.get('unreachable'), 'Inventaire TEST incomplet')
        for function in data.get('functions', []):
            name = function['name']
            cycle.require(name not in result, 'Fonction TEST dupliquee')
            result[name] = function
        next_token = data.get('nextPageToken', '')
        if not next_token:
            return result
        cycle.require(next_token != token, 'Pagination TEST non terminee')
        token = next_token
    raise ValueError('Inventaire TEST hors limite')


def main(candidate, directory):
    candidate, directory = Path(candidate).resolve(), Path(directory)
    cycle = load('team_test_cycle','release-cycle.py')
    sources = load('team_test_sources','nap-retained-sources.py')
    state = load('team_test_state','production-release-state.py')
    cycle.require(os.environ.get('GITHUB_REF') == 'refs/heads/main'
                  and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
                  and os.environ.get('CONFIRMATION') == 'livepalmes-test'
                  and os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
                  and cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])['project_id'] == PROJECT,
                  'Accord exact et compte TEST requis')
    cycle.require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=candidate,text=True).strip() == CANDIDATE
                  and not subprocess.check_output(['git','status','--porcelain'],cwd=candidate).strip(),
                  'Checkout exact et propre requis')
    directory.mkdir(parents=True,exist_ok=True)
    info = cycle.artifact(TEST_RUN,'test-proof',directory/'common','.github/workflows/livepalmes-test-common.yml')
    proof = cycle.read(directory/'common/test-proof.json')
    cycle.require(info['head_sha'] == CANDIDATE and cycle.reusable_verification(proof,CANDIDATE)
                  and cycle.snapshot(PROJECT) == proof['state'], 'Preuve ou etat du TEST commun different')
    rows = {f['name'].split('/')[-1]: f for f in proof['state']['functions']}
    cycle.require(PROTECTED <= set(rows), 'Fonction protegee absente de TEST')
    selected = sorted(n for n in PROTECTED if cycle.needs_function(rows[n],n,CANDIDATE,project=PROJECT))
    before = inventory(cycle)
    controls = sources.controls(PROJECT)
    archive_hash = None
    if selected:
        for name in selected:
            patch_source(before[PREFIX+name],{'bucket':'validation','object':'validation'})
        secrets = {v['key'] for n in selected for v in before[PREFIX+n].get('serviceConfig',{}).get('secretEnvironmentVariables',[])}
        archive = sources.test_archive(candidate,CANDIDATE,secrets,selected)
        archive_hash = hashlib.sha256(archive).hexdigest()
        cycle.require(cycle.snapshot(PROJECT) == proof['state'] and sources.controls(PROJECT) == controls,
                      'Derive du TEST avant publication')
        upload = state.request(state.API+f'projects/{PROJECT}/locations/europe-west1/functions:generateUploadUrl','POST',{})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        cycle.require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com'
                      or url.hostname.endswith('.storage.googleapis.com')), 'Destination source interdite')
        req = urllib.request.Request(upload['uploadUrl'],method='PUT',data=archive,headers={'Content-Type':'application/zip'})
        with urllib.request.urlopen(req,timeout=120):
            pass
        for name in selected:
            full = PREFIX+name
            current = state.request(state.API+full)
            cycle.require(state.identity(current) == state.identity(before[full]),'Derive fonction TEST')
            body = patch_source(current,upload['storageSource'])
            state.wait_operation(state.request(state.API+full+'?updateMask=build_config.source,labels','PATCH',body))
    after = inventory(cycle)
    cycle.require(set(before) == set(after), 'Inventaire TEST modifie')
    for name, value in after.items():
        if name not in {PREFIX+n for n in selected}:
            cycle.require(state.identity(value) == state.identity(before[name]),'Fonction TEST exclue modifiee')
            continue
        old_config = state.rollback_patch(before[name],{})
        new_config = state.rollback_patch(value,{})
        cycle.require(all(old_config.get(k) == new_config.get(k) for k in ('buildConfig','serviceConfig','eventTrigger'))
                      and value.get('state') == 'ACTIVE'
                      and value.get('labels',{}) == {**before[name].get('labels',{}),'livepalmes-commit':CANDIDATE},
                      'Configuration ou origine TEST modifiee')
    cycle.require(sources.controls(PROJECT) == controls,'Automates, mails ou clotures TEST modifies')
    live = cycle.snapshot(PROJECT)
    cycle.require(live['hosting'] == proof['state']['hosting'],'Hosting TEST modifie')
    cycle.write(directory/'test-backend-proof.json', {
        'schema':1,'candidate':CANDIDATE,'commonTestRun':TEST_RUN,'currentTestState':live,
        'state':{'functions':[f for f in live['functions'] if f['name'].split('/')[-1] in selected]},
        'selected':selected,'sourceArchiveSha256':archive_hash,'configurationsUnchanged':True,
        'mailSettingUnchanged':True,'schedulerUnchanged':True,'queueUnchanged':True,
        'pendingMessagesPreserved':True,'businessInvocations':0,
    })


if __name__ == '__main__':
    main(*sys.argv[1:])
