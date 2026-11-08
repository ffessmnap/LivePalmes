"""Closed preparation of the validated 8 November application. No business calls.

The ordinary selector stays unchanged. Only the pinned existing consumers use
source PATCHes; the sole configuration exception adds six existing SMTP
bindings to the account-deletion decision handler. Nothing grants IAM.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / '.github/releases/evidence/20261108-production-validated-contract.json'
DIGEST = '24189d6073ca25864324497db113bc2add8af5e969903d27339f7a5b91e1e97c'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
OPTION = 'novemberValidatedRelease'


def require(value, message):
    if not value:
        raise ValueError(message)


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat PROD du 8 novembre modifie')
    return json.loads(raw)


def approved(value):
    if OPTION not in value:
        return []
    c = contract()
    allowed = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
               'changes', 'excludedBackendReview', 'excludedBackendEvidence', OPTION}
    require(value.get('schema') == 1 and set(value) <= allowed and value[OPTION] == {'contractSha256': DIGEST}
            and all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']),
            'Publication du 8 novembre hors version, preuves ou options')
    return c['sourceOnly']


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == len(set(names)),
                'Selection PROD du 8 novembre differente du calcul revu')


def verify(value, baseline, functions, fingerprint):
    require(approved(value), 'Complement du 8 novembre absent')
    c = contract()
    require(baseline['productionRun'] == c['productionRun'] and len(functions) == c['inventoryCount'],
            'Baseline PROD du 8 novembre differente')
    require(sorted(functions.values(), key=lambda f: f['name']) == c['origins'],
            'Origines PROD du 8 novembre differentes')
    for row in c['reviewedLegacyOrigins']:
        require(fingerprint(row['commit'])[row['name']] == row['before']
                and fingerprint(c['candidate'])[row['name']] == row['after'],
                'Empreinte du consommateur relu differente: ' + row['name'])
    return {'schema': 1, 'candidate': c['candidate'], 'contractSha256': DIGEST,
            'sourceOnly': c['sourceOnly'], 'newFunctions': c['newFunctions'],
            'retainedFunctions': c['retainedFunctions'],
            'configurationException': {c['smtpFunction']: c['smtpBindings']},
            'mailPause': False, 'historicalReplay': False, 'networkCalls': 0}


def runtime(function):
    name = function.get('name', '').split('/')[-1]
    require(name in contract()['sourceOnly'] and function.get('name') == PREFIX + name
            and function.get('environment') == 'GEN_2' and function.get('state') == 'ACTIVE'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name, 'Runtime protege inconnu: ' + name)


def bindings(service):
    return sorted(service.get('secretEnvironmentVariables', []), key=lambda item: item['key'])


def initial(functions):
    c = contract()
    rows = {f['name'].split('/')[-1]: f for f in functions}
    require(len(rows) == len(functions) == c['inventoryCount']
            and not set(c['newFunctions']) & set(rows)
            and set(c['sourceOnly']) | set(c['retainedFunctions']) == set(rows), 'Inventaire initial incomplet')
    for name in c['sourceOnly']:
        runtime(rows[name])
    target, reference = (rows[c[key]]['serviceConfig'] for key in ['smtpFunction', 'smtpReference'])
    require(not target.get('secretEnvironmentVariables') and not target.get('secretVolumes')
            and not set(s['key'] for s in c['smtpBindings']) & set(target.get('environmentVariables', {}))
            and target.get('serviceAccountEmail') == reference.get('serviceAccountEmail') == c['runtimeAccount'],
            'Configuration SMTP initiale ou compte runtime different')
    require([s for s in bindings(reference) if s['key'] in {v['key'] for v in c['smtpBindings']}]
            == bindings({'secretEnvironmentVariables': c['smtpBindings']}), 'References SMTP existantes differentes')


def retained_test_origins(value, proof):
    require(approved(value), 'Revue conservee hors contrat')
    c = contract()
    rows = [f for f in proof.get('state', {}).get('functions', []) if f['name'].split('/')[-1] in c['retainedFunctions']]
    require(proof.get('candidate') == c['candidate'] and len(rows) == 2
            and {f['name'].split('/')[-1] for f in rows} == set(c['retainedFunctions'])
            and all(f['name'] == 'projects/livepalmes-test/locations/europe-west1/functions/' + f['name'].split('/')[-1]
                    and f.get('state') == 'ACTIVE' and f.get('revision') and f.get('updateTime')
                    and f.get('commit') == '7a6eedb6ee8b6c5943c194e88611219602782fdf' for f in rows),
            'Origines TEST des deux preferences conservees non prouvees')


def expected_config(before, state):
    c = contract()
    expected = state.rollback_patch(before, {})
    if before['name'] == PREFIX + c['smtpFunction']:
        require(not before['serviceConfig'].get('secretEnvironmentVariables')
                and not before['serviceConfig'].get('secretVolumes'), 'Liaisons SMTP initiales non vides')
        expected['serviceConfig']['secretEnvironmentVariables'] = c['smtpBindings']
    return expected


def assert_config(before, after, state):
    runtime(before)
    runtime(after)
    expected, actual = expected_config(before, state), state.rollback_patch(after, {})
    for v in [expected, actual]:
        if 'secretEnvironmentVariables' in v['serviceConfig']:
            v['serviceConfig']['secretEnvironmentVariables'] = bindings(v['serviceConfig'])
        trigger = v.get('eventTrigger', {})
        if 'eventFilters' in trigger:
            filters = trigger['eventFilters']
            require(isinstance(filters, list) and all(isinstance(item, dict) for item in filters),
                    'Filtres de declencheur non reconnus')
            # Google can reorder the complete filter entries. Keep every field
            # and duplicate; only the order of this one list is immaterial.
            trigger['eventFilters'] = sorted(filters, key=lambda item: json.dumps(item, sort_keys=True))
    require(all(expected.get(k) == actual.get(k) for k in ['buildConfig', 'serviceConfig', 'eventTrigger'])
            and after.get('labels') == {**before.get('labels', {}), 'livepalmes-commit': contract()['candidate']},
            'Configuration protegee modifiee hors des six liaisons SMTP: ' + before['name'].split('/')[-1])


def source_patch(before, storage):
    runtime(before)
    require(set(storage) <= {'bucket', 'object', 'generation'} and storage.get('bucket') and storage.get('object'),
            'Source Storage incomplete')
    c = contract()
    body = {'name': before['name'], 'buildConfig': {'source': {'storageSource': storage}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': c['candidate']}}
    mask = 'build_config.source,labels'
    if before['name'] == PREFIX + c['smtpFunction']:
        require(not before['serviceConfig'].get('secretEnvironmentVariables')
                and not before['serviceConfig'].get('secretVolumes'), 'Liaisons SMTP inattendues')
        body['serviceConfig'] = {'secretEnvironmentVariables': c['smtpBindings']}
        mask += ',service_config.secret_environment_variables'
    return body, mask


def assert_new(function):
    c = contract()
    name = function.get('name', '').split('/')[-1]
    service = function.get('serviceConfig', {})
    secrets = service.get('secretEnvironmentVariables', [])
    require(name in c['newFunctions'] and function['name'] == PREFIX + name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name and not function.get('eventTrigger')
            and function.get('labels', {}).get('livepalmes-commit') == c['candidate']
            and service.get('serviceAccountEmail') == c['runtimeAccount']
            and service.get('availableMemory') == '1024Mi'
            and service.get('timeoutSeconds') == 120 and service.get('maxInstanceCount') == 2
            and service.get('maxInstanceRequestConcurrency') == 4 and not service.get('secretVolumes')
            and len(secrets) == 1 and secrets[0].get('key') == secrets[0].get('secret') == 'LIVEPALMES_NAP_PASSWORD'
            and str(secrets[0].get('projectId')) in {'livepalmes', '718081132564'}
            and str(secrets[0].get('version')) in {'2', 'latest'}, 'Nouvelle callable import hors contrat')


def observe_controls():
    require(json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text()).get('project_id') == 'livepalmes',
            'Compte PROD requis')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'],
                                    text=True, stderr=subprocess.DEVNULL).strip()
    urls = {
        'mail': 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/notificationDelivery',
        'templates': 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/mailTemplates',
        'scheduler': 'https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1',
        'queue': 'https://cloudtasks.googleapis.com/v2/projects/livepalmes/locations/europe-west1/queues/processNapNotificationTask'}
    values = {}
    for name, url in urls.items():
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=30) as response:
                values[name] = json.load(response)
        except urllib.error.HTTPError as error:
            if name != 'templates' or error.code != 404:
                raise
            values[name] = {'absent': True}
    return controls(values)


def controls(values):
    digest = lambda v: hashlib.sha256(json.dumps(v, sort_keys=True).encode()).hexdigest()
    fields, scheduler, queue = values['mail'].get('fields', {}), values['scheduler'], values['queue']
    require(fields.get('enabled') == {'booleanValue': True} and fields.get('scope') == {'stringValue': 'all'}
            and fields.get('revision') == {'integerValue': '9'}
            and scheduler.get('state') == 'ENABLED' and scheduler.get('schedule') == '0 * * * *'
            and scheduler.get('timeZone') == 'Europe/Paris' and queue.get('state') == 'RUNNING',
            'Mails ou automates PROD differents')
    scheduler = {k: v for k, v in scheduler.items() if k not in {'lastAttemptTime', 'scheduleTime', 'status'}}
    queue = {k: queue[k] for k in ['name', 'state', 'purgeTime', 'rateLimits', 'retryConfig',
             'stackdriverLoggingConfig', 'httpTarget', 'appEngineRoutingOverride'] if k in queue}
    observed = {'mailSha256': digest(values['mail']), 'schedulerSha256': digest(scheduler), 'queueSha256': digest(queue)}
    require(observed == contract()['controls'], 'Derive des reglages mails/automates depuis la baseline')
    return {**observed, 'templatesSha256': digest(values['templates'])}


def guard(directory, after=False):
    directory = Path(directory)
    require(approved(json.loads((directory / 'request.json').read_text())), 'Garde sans contrat du 8 novembre')
    witness = directory / 'november-controls-before.json'
    require(not (directory / 'previous/production-after.json').exists() or witness.exists(),
            'Temoin initial de reprise absent')
    observed = observe_controls()
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Derive mails, automates ou modeles PROD')
    else:
        require(not after, 'Temoin initial absent')
        witness.write_text(json.dumps(observed))
    if after:
        (directory / 'november-controls-after.json').write_text(json.dumps(observed))


def restore_witness(directory, source):
    directory, source = Path(directory), Path(source)
    require(approved(json.loads((directory / 'request.json').read_text())), 'Reprise hors contrat')
    initial = source / 'november-controls-before.json'
    require(initial.is_file(), 'Temoin initial November absent de la tentative authentifiee')
    value = json.loads(initial.read_text())
    require(set(value) == {'mailSha256', 'schedulerSha256', 'queueSha256', 'templatesSha256'}
            and all(re.fullmatch('[a-f0-9]{64}', str(v)) for v in value.values())
            and all(value.get(k) == v for k, v in contract()['controls'].items()), 'Temoin November incompatible')
    destination = directory / initial.name
    require(not destination.exists() or json.loads(destination.read_text()) == value,
            'Temoin initial different du plan de reprise')
    destination.write_text(json.dumps(value))


def publish_sources(candidate, plan, backup, cycle, archive, launch_deadline=None):
    value, c = cycle.read(plan / 'request.json'), contract()
    names = approved(value)
    selection(value, cycle.read(plan / 'selection.json'))
    report = cycle.read(backup / 'report.json')
    require(report.get('additionalNovemberFunctions') == names and report['candidate'] == c['candidate'],
            'Sauvegarde hors contrat du 8 novembre')
    state = load('november_publish_state', 'production-release-state.py')
    before = {f['name']: f for f in cycle.read(backup / 'functions.json')}
    initial(list(before.values()))
    current = {f['name']: f for f in state.inventory()}
    previous_path = plan / 'previous/production-after.json'
    previous = cycle.read(previous_path) if previous_path.exists() else {}
    require(not previous or previous['candidate'] == c['candidate'], 'Reprise hors version')
    attested = {f['name']: f for f in previous.get('functions', [])}
    pending = []
    for name in names:
        full = PREFIX + name
        require(full in current, 'Consommateur protege absent')
        if state.identity(current[full]) == state.identity(before[full]):
            pending.append(name)
        else:
            require(attested.get(full) == state.identity(current[full]), 'Revision sans preuve de reprise')
            assert_config(before[full], current[full], state)
    guard(plan)
    if not pending:
        return
    require(launch_deadline is None or time.time() < launch_deadline, 'Budget de publication atteint avant source ; reprise attestee requise')
    data = archive(candidate, c['candidate'])
    upload = state.request(state.API + 'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')),
            'Destination source interdite')
    with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'], method='PUT', data=data,
                                headers={'Content-Type': 'application/zip'}), timeout=120):
        pass

    def update(name):
        require(launch_deadline is None or time.time() < launch_deadline,
                'Budget de publication atteint ; reprise attestee requise avant Hosting')
        full = PREFIX + name
        actual = state.request(state.API + full)
        require(state.identity(actual) == state.identity(before[full]), 'Derive avant PATCH source')
        body, mask = source_patch(before[full], upload['storageSource'])
        state.wait_operation(state.request(state.API + full + '?updateMask=' + mask, 'PATCH', body))
        assert_config(before[full], state.request(state.API + full), state)
    with ThreadPoolExecutor(max_workers=3) as executor:
        list(executor.map(update, pending))
    guard(plan)


def main(candidate, plan, backup):
    cycle = load('november_cycle', 'release-cycle.py')
    value = cycle.read(Path(plan) / 'request.json')
    # This hook precedes ordinary Functions only for this exact closed request.
    if not approved(value):
        return
    started = os.environ.get('NOVEMBER_RELEASE_STARTED_AT', '')
    require(re.fullmatch('[0-9]{10,11}', started) and int(started) <= time.time(), 'Horodatage initial du job absent ou invalide')
    archive = load('november_archive', 'publish-approved-pdf-functions.py').archive
    # Stop launching builds at minute 70 of the existing 120-minute job.
    # Keep a margin for in-flight operations and state/guard artefacts. A
    # continuation still requires actual, matching revisions, never a guess.
    publish_sources(Path(candidate), Path(plan), Path(backup), cycle, archive, int(started) + 70 * 60)


if __name__ == '__main__':
    main(*sys.argv[1:])
