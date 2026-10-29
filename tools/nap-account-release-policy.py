"""Closed preparation for the validated 29 October candidate, not a general NAP permission."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / '.github/releases/evidence/20261029-nap-account-release-contract.json'
DIGEST = 'ff26c2615f1983dd1286c17a1776e02203ce1765392d7b0d0e3f71fd48950c6b'
NAME = 'syncNapClubAccountEmails'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def require(value, message):
    if not value:
        raise ValueError(message)


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat annuaire NAP modifie')
    return json.loads(raw)


def approved(value):
    option = value.get('napAccountRelease')
    if option is None:
        return []
    c = contract()
    allowed = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
               'changes', 'excludedBackendReview', 'excludedBackendEvidence', 'napAccountRelease'}
    require(set(value) <= allowed and option == {'approval': 'ok', 'contractSha256': DIGEST}
            and all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']),
            'Annuaire NAP hors version, preuve ou autorisation')
    return c['selected']


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == len(set(names)),
                'Selection annuaire NAP differente du calcul approuve')


def verify(value, baseline, functions):
    require(approved(value), 'Accord annuaire NAP absent')
    c = contract()
    require(baseline['productionRun'] == c['productionRun'] and len(functions) == c['inventoryCount']
            and NAME not in functions, 'Reference PROD annuaire NAP differente')
    for row in c['retained']:
        actual = functions.get(row['name'], {})
        require(actual.get('state') == 'ACTIVE' and actual.get('commit') == row['commit']
                and actual.get('revision') == row['revision'], 'Origine conservee differente: '+row['name'])
    return {'schema': 1, 'candidate': c['candidate'], 'contractSha256': DIGEST,
            'existingSources': c['existingSelected'], 'newFunction': NAME,
            'mailPause': False, 'existingConfigurationChanges': False, 'dataReconciliation': False}


def new_function(source):
    c = contract()
    return {'name': PREFIX+NAME, 'environment': 'GEN_2',
        'buildConfig': {'runtime': 'nodejs22', 'entryPoint': NAME,
            'source': {'storageSource': source},
            'environmentVariables': {'GOOGLE_NODE_RUN_SCRIPTS': ''},
            'dockerRepository': 'projects/livepalmes/locations/europe-west1/repositories/gcf-artifacts',
            'serviceAccount': 'projects/livepalmes/serviceAccounts/'+c['runtimeAccount']},
        'serviceConfig': {'serviceAccountEmail': c['runtimeAccount'], 'availableMemory': '256Mi',
            'availableCpu': '1', 'timeoutSeconds': 60, 'maxInstanceRequestConcurrency': 80,
            'maxInstanceCount': 3, 'ingressSettings': 'ALLOW_ALL',
            'secretEnvironmentVariables': c['napBinding'],
            'environmentVariables': {'GCLOUD_PROJECT': 'livepalmes', 'FUNCTION_TARGET': NAME,
                'FUNCTION_SIGNATURE_TYPE': 'cloudevent', 'LIVEPALMES_ENFORCE_APP_CHECK': 'false',
                'FIREBASE_CONFIG': '{"projectId":"livepalmes","storageBucket":"livepalmes.firebasestorage.app"}',
                'EVENTARC_CLOUD_EVENT_SOURCE': 'projects/livepalmes/locations/europe-west1/services/'+NAME,
                'LOG_EXECUTION_ID': 'true'}},
        'eventTrigger': c['trigger'], 'labels': {'livepalmes-commit': c['candidate']}}


def references(functions):
    c = contract()
    rows = {f['name'].split('/')[-1]: f for f in functions}
    require(len(rows) == c['inventoryCount'] and NAME not in rows, 'Inventaire initial annuaire different')
    reference = rows[c['referenceTrigger']]
    require({k: reference.get('eventTrigger', {}).get(k) for k in c['trigger']} == c['trigger']
            and reference.get('serviceConfig', {}).get('serviceAccountEmail') == c['runtimeAccount'],
            'Reference declencheur annuaire modifiee')
    nap = rows[c['referenceNap']]
    require(nap.get('serviceConfig', {}).get('serviceAccountEmail') == c['runtimeAccount']
            and nap.get('serviceConfig', {}).get('secretEnvironmentVariables') == c['napBinding'],
            'Acces runtime NAP existant non prouve')


def assert_new(function):
    expected = new_function({})
    require(function.get('name') == expected['name'] and function.get('environment') == 'GEN_2'
            and function.get('state') == 'ACTIVE'
            and function.get('labels', {}).get('livepalmes-commit') == contract()['candidate'],
            'Nouveau declencheur NAP hors contrat')
    for section in ['buildConfig', 'serviceConfig', 'eventTrigger']:
        for key, value in expected[section].items():
            if key != 'source':
                actual = function.get(section, {}).get(key)
                if key == 'eventFilters':
                    actual = sorted(actual or [], key=lambda x: x['attribute'])
                    value = sorted(value, key=lambda x: x['attribute'])
                require(actual == value, 'Configuration nouveau declencheur differente: '+section+'.'+key)
    require(not function['serviceConfig'].get('secretVolumes')
            and not function['serviceConfig'].get('vpcConnector')
            and not function['serviceConfig'].get('directVpcNetworkInterface'), 'Acces NAP supplementaire interdit')


def assert_existing(before, after, state):
    require(before['name'] == after['name'] and after.get('state') == 'ACTIVE'
            and after.get('labels') == {**before.get('labels', {}), 'livepalmes-commit': contract()['candidate']},
            'Identite source annuaire differente')
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    # This exact source-only update returned the same AND filters in a different
    # order. Accept no different filter, region, type, account or other setting.
    if (before['name'] == PREFIX+'syncOfficialResultToPublicIndex'
            and before.get('serviceConfig', {}).get('revision') == 'syncofficialresulttopublicindex-00052-gup'
            and after.get('serviceConfig', {}).get('revision') == 'syncofficialresulttopublicindex-00053-toz'):
        expected = [{'attribute': 'database', 'value': '(default)'},
                    {'attribute': 'namespace', 'value': '(default)'},
                    {'attribute': 'document', 'operator': 'match-path-pattern',
                     'value': 'competitions/{competitionId}/results/{resultId}'}]
        canonical = lambda rows: sorted(rows, key=lambda row: json.dumps(row, sort_keys=True))
        for view in [old, new]:
            trigger = view.get('eventTrigger', {})
            require(canonical(trigger.get('eventFilters', [])) == canonical(expected),
                    'Filtres du resultat officiel differents')
            trigger['eventFilters'] = canonical(expected)
    require(all(old.get(k) == new.get(k) for k in ['buildConfig', 'serviceConfig', 'eventTrigger']),
            'Configuration existante modifiee')
