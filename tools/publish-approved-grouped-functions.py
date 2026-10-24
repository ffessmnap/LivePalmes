"""Publish only the pinned 47 sources after approval/backup/drift guards.

No function invocation, data API, Scheduler mutation, secret value access or IAM.
Only the documentary notification receives the separately approved runtime delta.
"""
import importlib.util
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request


def pending(names, before, current, previous, candidate, state, policy):
    if set(before) != set(current):
        raise ValueError('Inventaire groupe modifie depuis sauvegarde')
    result = []
    selected = {state.PREFIX + n for n in names}
    for full in set(before) - selected:
        if state.identity(current[full]) != state.identity(before[full]):
            raise ValueError('Fonction exclue modifiee avant publication groupee')
    for name in names:
        full = state.PREFIX + name
        if full not in before or before[full].get('state') != 'ACTIVE':
            raise ValueError('Source groupee existante absente')
        if state.identity(current[full]) == state.identity(before[full]):
            result.append(name)
        else:
            if (previous.get(full) != state.identity(current[full])
                    or current[full].get('state') != 'ACTIVE'
                    or current[full].get('labels', {}).get('livepalmes-commit') != candidate):
                raise ValueError('Revision groupee sans preuve de reprise')
            policy.assert_config(before[full], current[full], state)
    return result


def publish(candidate, plan, backup, cycle, archive):
    request = json.loads((plan / 'request.json').read_text())
    names = cycle.approved_grouped_functions(request)
    cycle.grouped.selection(request, json.loads((plan / 'selection.json').read_text()))
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    if credentials.get('project_id') != 'livepalmes':
        raise ValueError('Compte PROD requis')
    report = json.loads((backup / 'report.json').read_text())
    if (report['candidate'] != request['candidate'] or report.get('additionalGroupedFunctions') != names
            or report.get('newFunctions') or {r['name'].split('/')[-1] for r in report['functions']} != set(names)):
        raise ValueError('Sauvegarde groupee hors bilan')
    spec = importlib.util.spec_from_file_location('grouped_state', Path(__file__).with_name('production-release-state.py'))
    state = importlib.util.module_from_spec(spec); spec.loader.exec_module(state)
    before = {f['name']: f for f in json.loads((backup / 'functions.json').read_text())}
    previous_path = plan / 'previous/production-after.json'
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
    if previous and previous.get('candidate') != request['candidate']:
        raise ValueError('Reprise groupee hors candidat')
    names = pending(names, before, {f['name']: f for f in state.inventory()},
                    {f['name']: f for f in previous.get('functions', [])}, request['candidate'], state, cycle.grouped)
    if names:
        # Build and validate every patch before the first write.
        patches = [cycle.grouped.source_patch(before[state.PREFIX + n], {}, request['candidate']) for n in names]
        data = archive(candidate, request['candidate'])
        upload = state.request(state.API + 'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        if url.scheme != 'https' or not url.hostname or not (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')):
            raise ValueError('Destination source interdite')
        req = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
        with urllib.request.urlopen(req, timeout=120):
            pass
        for body, mask in patches:
            body['buildConfig']['source']['storageSource'] = upload['storageSource']
            state.wait_operation(state.request(state.API + body['name'] + '?updateMask=' + mask, 'PATCH', body))
            print('Source groupee autorisee actualisee : ' + body['name'].split('/')[-1], flush=True)
    state.check_after(backup, backup / 'after.json', True)
