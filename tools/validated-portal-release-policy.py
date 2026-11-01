"""One exact, user-approved CMAS/CCI/news release; preserve live mail and runtime settings."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / '.github/releases/evidence/20261101-validated-portal-contract.json'
DIGEST = '168f591a43dcb90657a72f2b827f62005f57b06da822f751bf9e6b68a8b52a0f'


def require(value, message):
    if not value:
        raise ValueError(message)


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat CMAS/CCI/nouveautes modifie')
    return json.loads(raw)


def approved(value):
    option = value.get('validatedPortalRelease')
    if option is None:
        return []
    c = contract()
    allowed = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
               'changes', 'excludedBackendReview', 'excludedBackendEvidence',
               'freezeTestCandidate', 'validatedPortalRelease'}
    require(set(value) <= allowed and option == {'approval': c['approval'], 'contractSha256': DIGEST}
            and value.get('freezeTestCandidate') is True
            and all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']),
            'Publication CMAS/CCI/nouveautes hors version ou accord')
    return c['sourceOnly']


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == len(set(names)),
                'Selection CMAS/CCI/nouveautes differente du calcul revu')


def verify(value, baseline, functions):
    require(approved(value), 'Accord CMAS/CCI/nouveautes absent')
    c = contract()
    require(baseline['productionRun'] == c['productionRun'] and len(functions) == c['inventoryCount']
            and c['newFunction'] not in functions, 'Origine PROD CMAS/CCI/nouveautes differente')
    for row in c['retained']:
        actual = functions.get(row['name'], {})
        require(all(actual.get(k) == row[k] for k in ['revision', 'commit'])
                and actual.get('state') == 'ACTIVE', 'Revision conservee differente: '+row['name'])
    return {'schema': 1, 'candidate': c['candidate'], 'contractSha256': DIGEST,
            'sourceOnly': c['sourceOnly'], 'newFunction': c['newFunction'],
            'mailPause': False, 'configurationChanges': False, 'networkCalls': 0}


def initial(functions):
    c = contract()
    rows = {f['name'].split('/')[-1]: f for f in functions}
    require(len(rows) == c['inventoryCount'] and c['newFunction'] not in rows
            and set(c['selected']) - {c['newFunction']} <= set(rows), 'Inventaire PROD incomplet')
    runtime = load('validated_portal_runtime', 'preflight-production-release.py')
    for name in c['sourceOnly']:
        f = rows[name]
        check = runtime.access_request_runtime_allowed if name.endswith('AccessRequest') else runtime.ordinary_runtime_allowed
        require(f.get('state') == 'ACTIVE' and not f.get('eventTrigger')
                and check(f.get('serviceConfig', {})), 'Configuration protegee inattendue: '+name)


def assert_config(before, after, state):
    require(before['name'] == after['name'] and after.get('state') == 'ACTIVE'
            and after.get('labels') == {**before.get('labels', {}), 'livepalmes-commit': contract()['candidate']},
            'Identite source protegee differente')
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    require(all(old.get(k) == new.get(k) for k in ['buildConfig', 'serviceConfig', 'eventTrigger']),
            'Configuration source protegee modifiee')


def source_patch(before, storage):
    c = contract()
    require(before['name'].split('/')[-1] in c['sourceOnly'], 'Source hors perimetre protege')
    return {'name': before['name'], 'buildConfig': {'source': {'storageSource': storage}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': c['candidate']}}


def guard(directory, after=False):
    directory = Path(directory)
    require(approved(json.loads((directory/'request.json').read_text())), 'Garde sans accord')
    require(json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text()).get('project_id') == 'livepalmes',
            'Compte PROD requis')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'],
                                   text=True, stderr=subprocess.DEVNULL).strip()
    urls = {
        'mail': 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/notificationDelivery',
        'scheduler': 'https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1',
        'queue': 'https://cloudtasks.googleapis.com/v2/projects/livepalmes/locations/europe-west1/queues/processNapNotificationTask'}
    values = {}
    for name, url in urls.items():
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer '+token}), timeout=30) as response:
            values[name] = json.load(response)
    digest = lambda v: hashlib.sha256(json.dumps(v, sort_keys=True).encode()).hexdigest()
    fields = values['mail'].get('fields', {})
    require(fields.get('enabled') == {'booleanValue': True} and fields.get('scope') == {'stringValue': 'all'}
            and fields.get('revision') == {'integerValue': '9'}
            and digest(values['mail']) == contract()['mailPreservation']['documentSha256'], 'Reglage mails modifie')
    scheduler = values['scheduler']
    require(scheduler.get('state') == 'ENABLED' and scheduler.get('schedule') == '0 * * * *'
            and scheduler.get('timeZone') == 'Europe/Paris' and values['queue'].get('state') == 'RUNNING',
            'Automates PROD differents')
    # Execution timestamps change normally; configuration and queue settings must not drift.
    scheduler = {k: v for k, v in scheduler.items() if k not in {'lastAttemptTime', 'scheduleTime', 'status'}}
    queue = {k: values['queue'][k] for k in ['name', 'state', 'purgeTime', 'rateLimits', 'retryConfig',
             'stackdriverLoggingConfig', 'httpTarget', 'appEngineRoutingOverride'] if k in values['queue']}
    observed = {'mailSha256': digest(values['mail']), 'schedulerSha256': digest(scheduler), 'queueSha256': digest(queue)}
    before = directory/'validated-portal-before.json'
    if before.exists():
        require(json.loads(before.read_text()) == observed, 'Derive des mails ou automates')
    else:
        require(not after, 'Temoin initial absent')
        before.write_text(json.dumps(observed))
    if after:
        (directory/'validated-portal-after.json').write_text(json.dumps(observed))


def publish(candidate, plan, backup, cycle, archive):
    value = cycle.read(plan/'request.json')
    names = approved(value)
    require(names, 'Publication protegee sans accord')
    selection(value, cycle.read(plan/'selection.json'))
    report = cycle.read(backup/'report.json')
    require(report.get('additionalValidatedPortalFunctions') == names and report['candidate'] == value['candidate'],
            'Sauvegarde protegee hors plan')
    state = load('validated_portal_state', 'production-release-state.py')
    before = {f['name']: f for f in cycle.read(backup/'functions.json')}
    current = {f['name']: f for f in state.inventory()}
    previous = cycle.read(plan/'previous/production-after.json') if (plan/'previous/production-after.json').exists() else {}
    require(not previous or previous['candidate'] == value['candidate'], 'Reprise hors candidat')
    pending = load('validated_portal_resume', 'publish-approved-pdf-functions.py').pending_club_sources(
        names, before, current, {f['name']: f for f in previous.get('functions', [])}, value['candidate'], state)
    guard(plan)
    if pending:
        data = archive(candidate, value['candidate'])
        upload = state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')),
                'Destination archive interdite')
        with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'], method='PUT', data=data,
                                    headers={'Content-Type': 'application/zip'}), timeout=120):
            pass
        for name in pending:
            full = state.PREFIX+name
            state.wait_operation(state.request(state.API+full+'?updateMask=build_config.source,labels',
                                               'PATCH', source_patch(before[full], upload['storageSource'])))
    state.check_after(backup, backup/'after.json', True)
    guard(plan, after=True)
