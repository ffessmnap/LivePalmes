"""Closed preparation for the reviewed 24 October pair; no network or secret reads."""
import copy
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / '.github/releases/evidence/20261024-grouped-backend-contract.json'
CONTRACT_SHA = 'ffaab8956566c7e52888a07a1a1c03b2a02d4eeff3b9971e3c3a04a6b513f4d2'
NOTIFY = 'notifyEngagementCompetitionDocuments'
MAIL_SECRETS = ['LIVEPALMES_SMTP_HOST', 'LIVEPALMES_SMTP_PORT', 'LIVEPALMES_SMTP_USER',
                'LIVEPALMES_SMTP_PASS', 'LIVEPALMES_SMTP_SECURE', 'LIVEPALMES_MAIL_FROM',
                'LIVEPALMES_NOTIFICATION_LINK_SECRET']


def contract():
    raw = CONTRACT_PATH.read_bytes().replace(b'\r\n', b'\n')
    if hashlib.sha256(raw).hexdigest() != CONTRACT_SHA:
        raise ValueError('Contrat groupe different de la revue')
    return json.loads(raw)


def approved(value):
    names = value.get('additionalGroupedFunctions', [])
    preservation = value.get('groupedIdfPreservation')
    if not names and preservation is None and value.get('documentMailRuntimeApproval') is None:
        return []
    c = contract()
    forbidden = ['additionalPdfFunctions', 'additionalDtnFunctions', 'additionalNotificationFunctions',
                 'additionalPublicNapFunctions', 'additionalAccessRequestFunctions', 'additionalClubDirectoryFunctions',
                 'publicReaderIdfPreservation', 'clubDirectoryIdfPreservation', 'notificationMaintenancePlan',
                 'notificationPilotIdfApproval', 'nativeIdentityNapSecretApproval', 'productionHomeRouting',
                 'productionStaticCleanup', 'testEquivalentCandidate']
    if (any(value.get(key) for key in forbidden)
            or any(value.get(key) != c[key] for key in ['candidate', 'productionCommit', 'testRun'])
            or value.get('productionHosting') != 'sites/livepalmes/versions/dcbeb4e43623263f'
            or value.get('initialAutomaticMailEnabled') is not True
            or names != c['selected']
            or not isinstance(preservation, dict) or set(preservation) != {'scope', 'revision', 'approval'}
            or preservation.get('scope') != 'idf' or type(preservation.get('revision')) is not int
            or preservation['revision'] != 4 or not isinstance(preservation.get('approval'), str)
            or not preservation['approval'].strip()
            or value.get('documentMailRuntimeApproval') != 'Oui, préparer cette exception limitée'):
        raise ValueError('Lot groupe hors paire, fonctions, IDF ou exception approuves')
    return list(names)


def selection(value, names):
    expected = approved(value)
    if expected and (len(names) != len(expected) or set(names) != set(expected)):
        raise ValueError('Lot groupe : selection differente des 47 sources existantes')


def verify_fingerprints(before, after, functions):
    c = contract()
    if set(before) != set(after):
        raise ValueError('Exports groupes modifies')
    changed = {n: [before[n], after[n]] for n in after if before.get(n) != after[n]}
    if (set(before) != set(after) or changed != c['changedExportHashes']
            or len(functions) != 112 or any(functions.get(n, {}).get('state') != 'ACTIVE' for n in c['selected'])):
        raise ValueError('Empreintes ou inventaire groupes differents de la revue')
    return {'pair': [c['productionCommit'], c['candidate']], 'selected': c['selected'],
            'retainedCount': 65, 'sourceOnly': True, 'contractSha256': CONTRACT_SHA,
            'configurationException': {'function': NOTIFY, 'timeoutSeconds': 300, 'addedSecrets': MAIL_SECRETS},
            'idfUnchanged': True, 'networkCalls': 0}


def normalized_secrets(items):
    if not isinstance(items, list):
        raise ValueError('Liaisons de secrets invalides')
    result = []
    for item in items:
        if (set(item) != {'key', 'secret', 'projectId', 'version'} or item['key'] != item['secret']
                or str(item['projectId']) not in {'livepalmes', '718081132564'}
                or not re.fullmatch(r'latest|[1-9][0-9]*', str(item['version']))):
            raise ValueError('Metadonnees de secret hors projet ou version')
        result.append({**item, 'projectId': 'livepalmes', 'version': str(item['version'])})
    if len({s['key'] for s in result}) != len(result):
        raise ValueError('Secret duplique')
    return sorted(result, key=lambda s: s['key'])


def notification_service(before):
    old = normalized_secrets(before.get('secretEnvironmentVariables', []))
    if len(old) != 1 or old[0]['key'] != 'LIVEPALMES_NAP_PASSWORD' or before.get('secretVolumes'):
        raise ValueError('Notification documentaire : configuration NAP initiale inattendue')
    return {'timeoutSeconds': 300, 'secretEnvironmentVariables': old + [
        {'key': key, 'secret': key, 'projectId': 'livepalmes', 'version': 'latest'} for key in MAIL_SECRETS]}


def assert_config(before, after, state):
    """Preserve every writable field, except the single approved runtime delta."""
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    name = before['name'].split('/')[-1]
    if name not in contract()['selected'] or after.get('name') != before['name']:
        raise ValueError('Configuration hors lot groupe')
    if name == NOTIFY:
        expected = notification_service(before.get('serviceConfig', {}))
        for key, value in expected.items():
            actual = new['serviceConfig'].get(key)
            if key == 'secretEnvironmentVariables':
                actual, value = normalized_secrets(actual), normalized_secrets(value)
            if actual != value:
                raise ValueError('Exception documentaire differente de celle approuvee')
            old['serviceConfig'].pop(key, None)
            new['serviceConfig'].pop(key, None)
    if any(old.get(k) != new.get(k) for k in ['serviceConfig', 'buildConfig', 'eventTrigger']):
        raise ValueError('Configuration groupe modifiee hors exception')


def source_patch(before, source, sha):
    if sha != contract()['candidate'] or before['name'].split('/')[-1] not in contract()['selected']:
        raise ValueError('Source hors contrat groupe')
    body = {'name': before['name'], 'buildConfig': {'source': {'storageSource': copy.deepcopy(source)}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': sha}}
    mask = 'build_config.source,labels'
    if before['name'].split('/')[-1] == NOTIFY:
        body['serviceConfig'] = notification_service(before.get('serviceConfig', {}))
        mask += ',service_config.timeout_seconds,service_config.secret_environment_variables'
    return body, mask
