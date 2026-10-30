"""One validated portal candidate: one existing source and one existing NAP binding."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / '.github/releases/evidence/20261030-portal-access-ns-contract.json'
DIGEST = '601540e177548250112aea89fb30b2285c0f503b9587739a758301eb1c3a6fea'
NAME = 'resolveEngagementSwimmerChangeRequest'
ACCOUNT = 'createOrUpdateAccessUser'


def require(value, message):
    if not value:
        raise ValueError(message)


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat portail NS/acces modifie')
    return json.loads(raw)


def approved(value):
    option = value.get('portalAccessNsRelease')
    if option is None:
        return []
    c = contract()
    allowed = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
               'changes', 'excludedBackendReview', 'excludedBackendEvidence',
               'freezeTestCandidate', 'portalAccessNsRelease'}
    require(set(value) <= allowed and option == {'approval': 'ok', 'contractSha256': DIGEST}
            and value.get('freezeTestCandidate') is True
            and all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']),
            'Exception portail NS/acces hors version ou perimetre')
    return [NAME]


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == len(set(names)),
                'Selection portail NS/acces differente du calcul revu')


def verify(value, baseline, functions):
    require(approved(value), 'Accord portail NS/acces absent')
    c = contract()
    require(baseline['productionRun'] == c['productionRun'] and len(functions) == c['inventoryCount']
            and functions[ACCOUNT]['revision'] == c['accountRevision'], 'Origine portail NS/acces differente')
    for row in c['retained']:
        actual = functions.get(row['name'], {})
        require(actual.get('revision') == row['revision'] and actual.get('commit') == row['commit']
                and actual.get('state') == 'ACTIVE', 'Fonction conservee differente: '+row['name'])
    return {'schema': 1, 'candidate': c['candidate'], 'contractSha256': DIGEST,
            'sourceOnly': [NAME], 'bindingOnly': ACCOUNT, 'mailPause': False, 'networkCalls': 0}


def initial(functions):
    rows = {f['name'].split('/')[-1]: f for f in functions}
    c = contract()
    require(len(rows) == c['inventoryCount'] and set(c['selected']) <= set(rows), 'Inventaire portail incomplet')
    account = rows[ACCOUNT]
    require(account.get('serviceConfig', {}).get('secretEnvironmentVariables', []) == []
            and account.get('serviceConfig', {}).get('revision') == c['accountRevision']
            and not account.get('eventTrigger'), 'Configuration initiale acces club differente')
    reference = rows['listEngagementClubSwimmers']
    require(reference.get('serviceConfig', {}).get('secretEnvironmentVariables') == c['napBinding']
            and reference['serviceConfig'].get('serviceAccountEmail') == account['serviceConfig'].get('serviceAccountEmail'),
            'Liaison NAP runtime existante non prouvee')
    target = rows[NAME]
    require(not target.get('eventTrigger') and target.get('state') == 'ACTIVE'
            and target.get('serviceConfig', {}).get('secretEnvironmentVariables') == c['napBinding'],
            'Configuration resolution nationale differente')


def assert_config(before, after, state):
    expected_labels = {**before.get('labels', {}), 'livepalmes-commit': contract()['candidate']}
    if before['name'].split('/')[-1] == ACCOUNT:
        # The ordinary Firebase CLI updates its own SHA-1 source/secret hash.
        # This build marker is not a runtime setting; no other label may drift.
        key = 'firebase-functions-hash'
        if key in expected_labels:
            require(re.fullmatch(r'[a-f0-9]{40}', str(expected_labels[key]))
                    and re.fullmatch(r'[a-f0-9]{40}', str(after.get('labels', {}).get(key, ''))),
                    'Empreinte source Firebase invalide')
            expected_labels[key] = after['labels'][key]
    require(before['name'] == after['name'] and after.get('state') == 'ACTIVE'
            and after.get('labels') == expected_labels,
            'Identite portail NS/acces differente')
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    if before['name'].split('/')[-1] == ACCOUNT:
        require(old['serviceConfig'].get('secretEnvironmentVariables', []) == []
                and new['serviceConfig'].get('secretEnvironmentVariables') == contract()['napBinding'],
                'Seule la liaison NAP existante est autorisee')
        old['serviceConfig'].pop('secretEnvironmentVariables', None)
        new['serviceConfig'].pop('secretEnvironmentVariables', None)
    require(all(old.get(k) == new.get(k) for k in ['buildConfig', 'serviceConfig', 'eventTrigger']),
            'Configuration portail NS/acces modifiee hors accord')
