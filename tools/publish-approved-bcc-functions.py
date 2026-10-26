"""Publish the pinned CCI sources after pause, backup and infrastructure checks.

One new private worker; existing configurations are preserved. Three updates
maximum per batch, then an inventory check before the next batch. No data call,
queue change, IAM write or mail invocation is performed by this publisher.
"""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


def pending(names, before, current, attested, candidate, state, policy, expected_worker):
    worker = state.PREFIX + policy.contract()['worker']
    policy.require(set(current) in ((set(before),) if policy.contract().get('existingWorker') else (set(before), set(before) | {worker})), 'Inventaire CCI inattendu')
    result = []
    for full in set(before) - {state.PREFIX + n for n in names}:
        policy.require(state.identity(before[full]) == state.identity(current[full]), 'Exclusion CCI modifiee')
    for name in names:
        full = state.PREFIX + name
        if full not in current:
            policy.require(full == worker, 'Fonction existante CCI absente')
            result.append(name); continue
        old, new = before.get(full), current[full]
        if old is not None and state.identity(old) == state.identity(new):
            result.append(name); continue
        policy.require(attested.get(full) == state.identity(new) and new.get('state') == 'ACTIVE'
            and new.get('labels', {}).get('livepalmes-commit') == candidate, 'Revision CCI sans preuve de reprise')
        if full == worker:
            policy.assert_worker(new, expected_worker, state)
        else:
            policy.assert_config(old, new, state)
    return result


def publish(candidate, plan, backup, cycle, archive):
    request = cycle.read(plan / 'request.json'); policy = cycle.bcc.for_request(request)
    names = cycle.approved_bcc_functions(request)
    policy.selection(request, cycle.read(plan / 'selection.json'))
    policy.require(cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])['project_id'] == 'livepalmes', 'Compte PROD requis')
    report = cycle.read(backup / 'report.json')
    worker = policy.contract()['worker']
    new_functions = [] if policy.contract().get('existingWorker') else [worker]
    policy.require(report.get('additionalBccFunctions') == names and report['candidate'] == request['candidate']
        and report['newFunctions'] == new_functions and len(report['functions']) == len(names) - len(new_functions), 'Sauvegarde CCI hors bilan')
    state = load('bcc_publish_state', Path(__file__).with_name('production-release-state.py'))
    guard = load('bcc_publish_guard', Path(__file__).with_name('check-production-bcc.py'))
    guard.main('paused', plan)
    before = {f['name']: f for f in cycle.read(backup / 'functions.json')}
    previous_path = plan / 'previous/production-after.json'
    previous = cycle.read(previous_path) if previous_path.exists() else {}
    policy.require(not previous or previous.get('candidate') == request['candidate'], 'Reprise CCI hors candidat')
    attested = {f['name']: f for f in previous.get('functions', [])}
    expected_worker = report['bccWorkerService']
    current = {f['name']: f for f in state.inventory()}
    todo = pending(names, before, current, attested, request['candidate'], state, policy, expected_worker)
    if previous and state.PREFIX + worker in current:
        policy.require((plan / 'bcc-worker-iam-witness.json').exists(), 'Reprise sans temoin IAM worker')
    if todo:
        data = archive(candidate, request['candidate'])
        upload = state.request(state.API + 'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        policy.require(url.scheme == 'https' and url.hostname and
            (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')), 'Destination source interdite')
        req = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
        with urllib.request.urlopen(req, timeout=120): pass
        source = upload['storageSource']
        if worker in todo and not policy.contract().get('existingWorker'):
            body = {'name': state.PREFIX + worker, 'environment': 'GEN_2',
                'buildConfig': {'runtime': 'nodejs22', 'entryPoint': worker, 'source': {'storageSource': source}},
                'serviceConfig': expected_worker, 'labels': {'livepalmes-commit': request['candidate']}}
            state.wait_operation(state.request(state.API + 'projects/livepalmes/locations/europe-west1/functions?functionId=' + worker, 'POST', body))
            actual = state.request(state.API + state.PREFIX + worker)
            policy.assert_worker(actual, expected_worker, state)
            attested[actual['name']] = state.identity(actual)
            todo.remove(worker)
        # The worker is private before any producer or legacy consumer changes.
        token = cycle.run(['gcloud', 'auth', 'application-default', 'print-access-token'])
        iam = guard.get('https://run.googleapis.com/v2/projects/livepalmes/locations/europe-west1/services/processnapnotificationtask:getIamPolicy', token)
        policy.require(not any(member in {'allUsers', 'allAuthenticatedUsers'} for b in iam.get('bindings', []) for member in b.get('members', [])), 'Worker CCI public : arret')
        witness = {'sha256': guard.digest(iam)}
        witness_path = plan / 'bcc-worker-iam-witness.json'
        if witness_path.exists(): policy.require(cycle.read(witness_path) == witness, 'IAM worker modifie depuis creation')
        cycle.write(witness_path, witness)
        def update(name):
            full = state.PREFIX + name
            body = policy.source_patch(before[full], source, request['candidate'])
            state.wait_operation(state.request(state.API + full + '?updateMask=build_config.source,labels', 'PATCH', body))
            actual = state.request(state.API + full)
            policy.require(actual.get('state') == 'ACTIVE' and actual.get('labels', {}).get('livepalmes-commit') == request['candidate'], 'Source CCI non active')
            policy.assert_config(before[full], actual, state)
            return state.identity(actual)
        for offset in range(0, len(todo), 3):
            batch = todo[offset:offset + 3]
            # Waiting for this batch also prevents later batches after a failure.
            with ThreadPoolExecutor(max_workers=3) as executor:
                for identity in executor.map(update, batch): attested[identity['name']] = identity
            current = {f['name']: f for f in state.inventory()}
            pending(names, before, current, attested, request['candidate'], state, policy, expected_worker)
            print(f'Lot CCI {offset // 3 + 1} actif ({len(batch)} sources) ; exclusions controlees.', flush=True)
    state.check_after(backup, backup / 'after.json', True)
