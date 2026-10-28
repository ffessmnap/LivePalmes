"""One immutable source-only complement. No cloud access or implicit deployment."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / '.github/releases/evidence/20261028-nap-retained-sources-contract.json'
DIGEST = 'd066f574ad118e7a79d9b2abc5720f96ec056d3c5e85e801c964e0007ec07db2'
TEST_WORKFLOW = '.github/workflows/livepalmes-test-nap-retained-sources.yml'


def require(value, message):
    if not value:
        raise ValueError(message)


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat complement NAP modifie')
    return json.loads(raw)


def approved(value):
    option = value.get('napRetainedSourceRelease')
    if option is None:
        return []
    c = contract()
    allowed = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
               'testBackendRuns', 'changes', 'excludedBackendReview', 'excludedBackendEvidence',
               'napRetainedSourceRelease'}
    runs = value.get('testBackendRuns', [])
    require(set(value) <= allowed and option == {'approval': 'ok', 'contractSha256': DIGEST}
            and all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun'])
            and len(runs) == 2 and runs[0] == c['napTestRun']
            and type(runs[1]) is int and runs[1] > 0 and runs[1] != runs[0],
            'Complement NAP hors candidat, preuves ou perimetre')
    return c['selected']


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == 15,
                'Selection complement NAP differente des quinze sources')


def verify(value, baseline, functions, fingerprint):
    names = approved(value)
    c = contract()
    require(baseline['productionRun'] == c['productionRun'] and len(functions) == c['inventoryCount'],
            'Reference PROD complement NAP differente')
    for row in c['origins']:
        f = functions.get(row['name'], {})
        require(f.get('state') == 'ACTIVE' and f.get('revision') == row['revision']
                and f.get('commit') == row['commit']
                and fingerprint(row['commit'])[row['name']] == row['before']
                and fingerprint(c['candidate'])[row['name']] == row['after'],
                'Origine ou empreinte complement NAP differente: ' + row['name'])
    return {'schema': 1, 'candidate': c['candidate'], 'contractSha256': DIGEST,
            'selected': names, 'sourceOnly': True, 'configurationChanges': False, 'mailPause': False}


def runtime(function, project='livepalmes'):
    c = contract()
    names = c['selected'] if project == 'livepalmes' else c['testSelected'] if project == 'livepalmes-test' else []
    name = function.get('name', '').split('/')[-1]
    require(name in names and function['name'] == f'projects/{project}/locations/europe-west1/functions/{name}'
            and function.get('environment') == 'GEN_2' and function.get('state') == 'ACTIVE'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name,
            'Runtime complement NAP inconnu')


def assert_config(before, after, state, project='livepalmes'):
    runtime(before, project)
    runtime(after, project)
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    require(all(old.get(k) == new.get(k) for k in ['serviceConfig', 'buildConfig', 'eventTrigger']),
            'Configuration ou declencheur complement NAP modifie')
    expected = {**before.get('labels', {}), 'livepalmes-commit': contract()['candidate']}
    require(after.get('labels') == expected, 'Labels complement NAP modifies')


def source_patch(before, source, value=None, project='livepalmes'):
    if project == 'livepalmes':
        require(before['name'].split('/')[-1] in approved(value), 'Source NAP hors accord')
    runtime(before, project)
    require(isinstance(source, dict) and set(source) <= {'bucket', 'object', 'generation'}
            and source.get('bucket') and source.get('object'), 'Source NAP incomplete')
    return {'name': before['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': contract()['candidate']}}


def targeted(value, proof, info, cycle):
    approved(value)
    c = contract()
    require(info['path'] == TEST_WORKFLOW and proof.get('schema') == 1
            and proof.get('candidate') == c['candidate'] and proof.get('contractSha256') == DIGEST
            and proof.get('toolingCommit') == info['head_sha']
            and proof.get('mailSettingUnchanged') is True and proof.get('schedulerUnchanged') is True
            and proof.get('queueUnchanged') is True and proof.get('configurationsUnchanged') is True,
            'Preuve ciblee complement NAP incompatible')
    require(proof.get('testWrapperPreserved') is True
            and re.fullmatch(r'[0-9a-f]{64}', str(proof.get('sourceArchiveSha256', ''))),
            'Protection de source TEST absente')
    cycle.run(['git', 'merge-base', '--is-ancestor', c['candidate'], info['head_sha']], cycle.ROOT)
    paths = cycle.git('diff', '--name-only', c['candidate'], info['head_sha']).splitlines()
    require(all(p.startswith(('.github/', 'tools/', 'tests/', 'docs/')) for p in paths),
            'Code applicatif ajoute dans la preuve ciblee NAP')
    rows = proof.get('state', {}).get('functions', [])
    require(sorted(f['name'].split('/')[-1] for f in rows) == c['testSelected'], 'Lot TEST NAP different')
    current = proof.get('currentTestState', {})
    old = {f['name']: f for f in c['testBefore']['functions']}
    new = {f['name']: f for f in current.get('functions', [])}
    require(len(new) == len(old) == len(current.get('functions', [])) == 115 and set(new) == set(old)
            and current.get('hosting') == c['testBefore']['hosting'], 'Inventaire ou Hosting TEST modifie')
    for name, f in new.items():
        if name.split('/')[-1] in c['testSelected']:
            require(f in rows and f.get('state') == 'ACTIVE' and f.get('commit') == c['candidate']
                    and f.get('revision') and f.get('updateTime'), 'Source TEST NAP non attestee')
        else:
            require(f == old[name], 'Fonction TEST hors selection modifiee')


def test_controls(mail, scheduler, queue, tasks, closures):
    require(mail.get('fields', {}).get('enabled') == {'booleanValue': False}, 'Mails TEST deja coupes requis')
    require(scheduler.get('state') in {'PAUSED', 'DISABLED'}, 'Scheduler TEST deja suspendu requis')
    require(queue.get('state') == 'PAUSED' and not tasks.get('tasks') and not tasks.get('nextPageToken'),
            'File TEST deja suspendue et vide requise')
    require(not closures.get('documents') and not closures.get('nextPageToken'),
            'File technique de cloture TEST vide requise')

