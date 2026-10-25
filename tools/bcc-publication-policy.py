"""Closed CCI/task preparation. No API calls, data mutation or mail invocation."""
import copy
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / '.github/releases/evidence/20261025-bcc-contract.json'
DIGEST = '8e2cfbe810e97327f68b0ff2a84d43670f5137ffe9d8d1ce42d04a49b19022d7'
REFERENCE = 'processNapCompetitionNotifications'
QUEUE = 'projects/livepalmes/locations/europe-west1/queues/processNapNotificationTask'
CI = 'serviceAccount:github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com'
MAIL_KEYS = {'LIVEPALMES_NAP_PASSWORD', 'LIVEPALMES_SMTP_HOST', 'LIVEPALMES_SMTP_PORT',
             'LIVEPALMES_SMTP_USER', 'LIVEPALMES_SMTP_PASS', 'LIVEPALMES_SMTP_SECURE',
             'LIVEPALMES_MAIL_FROM', 'LIVEPALMES_NOTIFICATION_LINK_SECRET'}


def require(value, message):
    if not value:
        raise ValueError(message)


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat CCI different de la revue')
    return json.loads(raw)


def approved(value):
    names = value.get('additionalBccFunctions', [])
    transition = value.get('bccMailTransition')
    infrastructure = value.get('bccInfrastructure')
    if names == [] and transition is None and infrastructure is None:
        return []
    c = contract()
    require(all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun'])
            and names == c['selected'] and value.get('initialAutomaticMailEnabled') is True,
            'Lot CCI hors paire, preuve ou selection approuvees')
    require(not any(value.get(k) for k in ['additionalPdfFunctions', 'additionalDtnFunctions',
        'additionalNotificationFunctions', 'additionalPublicNapFunctions', 'additionalAccessRequestFunctions',
        'additionalClubDirectoryFunctions', 'additionalGroupedFunctions', 'groupedIdfPreservation',
        'groupedAllMailPreservation', 'notificationMaintenancePlan', 'notificationPilotIdfApproval',
        'publicReaderIdfPreservation', 'clubDirectoryIdfPreservation', 'testEquivalentCandidate',
        'nativeIdentityNapSecretApproval', 'productionHomeRouting', 'productionStaticCleanup']),
        'CCI incompatible avec une ancienne extension')
    require(transition == c['mailTransition'], 'Transition CCI differente de la revue')
    require(isinstance(transition, dict) and set(transition) == {'scope', 'observedRevision', 'pauseRevision',
        'resumeRevision', 'initialSha256', 'immutableSha256', 'enabledSince', 'noReplay', 'approval'}
        and transition['scope'] == 'all' and transition['noReplay'] is True
        and all(type(transition[k]) is int for k in ['observedRevision', 'pauseRevision', 'resumeRevision'])
        and [transition[k] for k in ['observedRevision', 'pauseRevision', 'resumeRevision']] == [5, 6, 7]
        and all(isinstance(transition[k], str) and len(transition[k]) == 64
                and all(x in '0123456789abcdef' for x in transition[k]) for k in ['initialSha256', 'immutableSha256'])
        and transition['enabledSince'] and transition['approval'] == 'ok', 'Transition CCI hors perimetre')
    require(infrastructure == {'api': 'cloudtasks.googleapis.com', 'queue': QUEUE,
        'worker': c['worker'], 'ciMember': CI, 'ciQueueRole': 'roles/cloudtasks.viewer',
        'runtimeIamChanges': False, 'smtpTest': False, 'approval': 'ok'}, 'Infrastructure CCI hors perimetre')
    return list(names)


def selection(value, selected):
    expected = approved(value)
    require(not expected or (len(selected) == len(expected) and set(selected) == set(expected)),
            'Selection CCI differente des107 fonctions bornees')


def verify_fingerprints(before, after, functions):
    c = contract()
    require(before == c['beforeHashes'] and after == c['afterHashes'] and len(functions) == 112
            and c['worker'] not in functions and all(f.get('state') == 'ACTIVE' for f in functions.values()),
            'Inventaire ou empreintes CCI differents de la preuve')
    require(set(after) - set(before) == {c['worker']} and not set(before) - set(after), 'Nouvel export CCI inattendu')
    return {'pair': [c['productionCommit'], c['candidate']], 'contractSha256': DIGEST,
        'selected': c['selected'], 'existingSelected': 106, 'retainedCount': 6,
        'newFunctions': [c['worker']], 'configurationChangesToExistingFunctions': False,
        'sourceOnly': True, 'networkCalls': 0}


def worker_service(reference):
    service = copy.deepcopy(reference['serviceConfig'])
    service.pop('revision', None)
    # Select only writable fields through the same rollback projection as the
    # ordinary source publisher; callers pass that projection, not API outputs.
    secrets = service.get('secretEnvironmentVariables', [])
    require(len(secrets) == 8 and {s.get('key') for s in secrets} == MAIL_KEYS
            and all(s.get('secret') == s.get('key') and str(s.get('projectId')) in {'livepalmes', '718081132564'}
                    and set(s) == {'key','secret','projectId','version'}
                    and re.fullmatch(r'latest|[1-9][0-9]*', str(s.get('version', ''))) for s in secrets), 'Reference secrets CCI incompatible')
    require(service.get('serviceAccountEmail') == '718081132564-compute@developer.gserviceaccount.com'
            and not service.get('secretVolumes'), 'Compte runtime CCI ou volumes inattendus')
    service.update(timeoutSeconds=540, availableMemory='1Gi', maxInstanceCount=1, maxInstanceRequestConcurrency=1)
    service['environmentVariables'] = {**service.get('environmentVariables', {})}
    if 'FUNCTION_TARGET' in service['environmentVariables']:
        service['environmentVariables']['FUNCTION_TARGET'] = contract()['worker']
    return service


def assert_config(before, after, state):
    old = state.rollback_patch(before, {})
    new = state.rollback_patch(after, {})
    require(before['name'] == after['name'] and all(old.get(k) == new.get(k)
            for k in ['buildConfig', 'serviceConfig', 'eventTrigger']), 'Configuration CCI existante modifiee')


def assert_worker(function, expected, state):
    require(function.get('name', '').split('/')[-1] == contract()['worker']
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function.get('buildConfig', {}).get('entryPoint') == contract()['worker']
            and not function.get('eventTrigger'), 'Nouveau worker CCI incompatible')
    service = state.rollback_patch(function, {})['serviceConfig']
    require(service == expected, 'Configuration du worker CCI differente du bilan')


def source_patch(before, source, sha):
    require(sha == contract()['candidate'] and before['name'].split('/')[-1] in contract()['selected'],
            'Source hors contrat CCI')
    return {'name': before['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': sha}}


def reconciled_proof(request, proof, source):
    require(approved(request), 'Preuve ciblee CCI sans extension approuvee')
    c = contract()
    require(source.get('path') == '.github/workflows/livepalmes-test-notifications-reconcile.yml'
            and proof.get('schema') == 1 and proof.get('candidate') == c['candidate']
            and proof.get('reconciliation') == {'schema': 1, 'suite': 'bcc-current-test-v1',
                'testRun': c['testRun'], 'toolingCommit': source['head_sha'],
                'hostingUnchanged': True, 'mailSettingUnchanged': True, 'otherFunctionsUnchanged': True}
            and sorted(f['name'].split('/')[-1] for f in proof.get('state', {}).get('functions', []))
                == sorted(c['testReconciliationFunctions']), 'Preuve ciblee CCI non attestee')
