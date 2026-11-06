"""Closed operational release of the tested 6 November Direct candidate."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import urllib.request
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
BASE = '8aa9d79377729defcf64c19c0f35b123b03d7f97'
CANDIDATE = '5b76e1e37eddba618b25c41c92a8168446fe4115'
NEW = 'manageLivePalmesDirect'
READER = 'readNapPublicSwimmer'
SELECTED = [NEW, READER]
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def require(value, message):
    if not value:
        raise ValueError(message)


def approved(value):
    option = value.get('directRelease')
    if option is None:
        return []
    allowed = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
               'changes', 'excludedBackendReview', 'excludedBackendEvidence', 'directRelease'}
    require(set(value) <= allowed and option == '20261106-direct-paris'
            and value['candidate'] == CANDIDATE and value['productionCommit'] == BASE
            and value['productionHosting'] == 'sites/livepalmes/versions/18c1ef8d34dce98f'
            and value['testRun'] == 42306711779, 'Accord Direct hors version et preuves')
    return [READER]


def scope():
    result = json.loads(subprocess.check_output(['node', str(ROOT/'tools/verify-direct-production-scope.js'),
                        str(ROOT), BASE, CANDIDATE], text=True))
    require(result['result'] == 'success' and result['changedProductionExports'] == SELECTED
            and result['otherHandlersAndSharedInitializationUnchanged'], 'Preuve structurelle Direct absente')
    return result


def select(request, names, baseline, functions):
    require(approved(request) and set(SELECTED) <= set(names)
            and baseline['productionRun'] == 41925812934 and len(functions) == 116
            and NEW not in functions and all(f.get('state') == 'ACTIVE'
            and f.get('commit') == '7a6eedb6ee8b6c5943c194e88611219602782fdf' and f.get('revision')
            for f in functions.values()), 'Reference Direct differente')
    return scope()['changedProductionExports']


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def guard(directory, after=False):
    directory = Path(directory)
    require(approved(json.loads((directory/'request.json').read_text())), 'Garde Direct sans accord')
    observed = load('direct_controls', 'validated-portal-release-policy.py').observe_controls()
    witness = directory/'direct-controls-before.json'
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Derive mails ou automates pendant Direct')
    else:
        require(not after, 'Temoin Direct initial absent')
        witness.write_text(json.dumps(observed))
    if after:
        (directory/'direct-controls-after.json').write_text(json.dumps(observed))


def assert_new(function):
    service = function.get('serviceConfig', {})
    bindings = service.get('secretEnvironmentVariables', [])
    require(function.get('name') == PREFIX+NEW and function.get('state') == 'ACTIVE'
            and function.get('environment') == 'GEN_2' and not function.get('eventTrigger')
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == NEW
            and function.get('labels', {}).get('livepalmes-commit') == CANDIDATE
            and service.get('timeoutSeconds') == 120 and service.get('maxInstanceCount') == 2
            and service.get('maxInstanceRequestConcurrency') == 4
            and len(bindings) == 1 and bindings[0].get('key') == 'LIVEPALMES_NAP_PASSWORD'
            and bindings[0].get('secret') == 'LIVEPALMES_NAP_PASSWORD'
            and str(bindings[0].get('projectId')) in {'livepalmes', '718081132564'},
            'Configuration du nouveau Direct differente')


def assert_reader(before, after, state):
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    require(all(old.get(k) == new.get(k) for k in ['buildConfig', 'serviceConfig', 'eventTrigger'])
            and after.get('labels') == {**before.get('labels', {}), 'livepalmes-commit': CANDIDATE},
            'Configuration du lecteur public modifiee')


def publish(candidate, plan, backup, cycle, archive):
    require(approved(cycle.read(plan/'request.json'))
            and cycle.read(plan/'selection.json') == SELECTED, 'Publication Direct hors selection')
    state = load('direct_state', 'production-release-state.py')
    before = {f['name']: f for f in cycle.read(backup/'functions.json')}
    current = {f['name']: f for f in state.inventory()}
    require(set(current) == set(before)|{PREFIX+NEW}, 'Inventaire Direct different')
    assert_new(current[PREFIX+NEW])
    full = PREFIX+READER
    require(state.identity(current[full]) == state.identity(before[full]), 'Derive lecteur public avant publication')
    data = archive(candidate, CANDIDATE)
    upload = state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')), 'Source hors Storage')
    with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'], method='PUT', data=data,
                                headers={'Content-Type':'application/zip'}), timeout=120):
        pass
    body = {'name':full, 'buildConfig':{'source':{'storageSource':upload['storageSource']}},
            'labels':{**before[full].get('labels', {}), 'livepalmes-commit':CANDIDATE}}
    state.wait_operation(state.request(state.API+full+'?updateMask=build_config.source,labels', 'PATCH', body))
