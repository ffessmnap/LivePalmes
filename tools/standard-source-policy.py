"""Opt-in existing-function sources/labels policy; historical contracts stay separate."""
from copy import deepcopy
from functools import lru_cache
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'standardSources'
KIND = 'standard-existing-sources-v1'
PROTECTED = ('firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json',
             'functions/index.js', 'functions/package.json', 'functions/package-lock.json',
             'functions/livepalmes-environment.js', 'tools/prepare-production-functions.js',
             'tools/prepare-firebase-test-functions.js', 'tools/firebase-test-backend-lots.js')
CONTROL_KEYS = {'mailSha256', 'schedulerSha256', 'queueSha256', 'templatesSha256'}


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@lru_cache(maxsize=1)
def eligible():
    # Trusted tooling only, never require historical/candidate application code.
    script = """const p=require(process.argv[1]);
const blocked=new Set([...p.LOTS.email,...p.LOTS.schedulers,...p.PUBLICATION_EFFECT_FUNCTIONS]);
console.log(JSON.stringify([...new Set([...p.ALL_SAFE_LOTS.flatMap(p.activeLotFunctions),
'readNapPublicSwimmer','manageLivePalmesDirect'])].filter(n=>!blocked.has(n)&&!/dtn|migration|migrate/i.test(n)).sort()));"""
    return set(json.loads(subprocess.check_output(
        ['node', '-e', script, str(ROOT/'tools/firebase-test-backend-lots.js')], timeout=30)))


def approval(value):
    require(isinstance(value, dict) and set(value) == {'threadId', 'messageId', 'text'}
            and all(isinstance(value[k], str) and value[k].strip() for k in value),
            'Reference et texte de l accord humain authentique requis')
    require(all(re.fullmatch(r'[0-9a-f-]{36}', value[k]) for k in ['threadId', 'messageId']),
            'Reference de message humain invalide')
    return value


def enabled(value):
    return OPTION in value


def approved(value):
    if not enabled(value):
        return []
    keys = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
            'changes', 'excludedBackendReview', 'excludedBackendEvidence', OPTION, 'freezeTestCandidate'}
    require(set(value) <= keys and value.get('schema') == 1,
            'Parcours standard sans ancienne exception ni option supplementaire')
    require(all(re.fullmatch('[0-9a-f]{40}', str(value.get(k, ''))) for k in ['candidate', 'productionCommit'])
            and type(value.get('testRun')) is int and value['testRun'] > 0
            and re.fullmatch(r'sites/livepalmes/versions/[A-Za-z0-9_-]+', value.get('productionHosting', '')),
            'Candidat, preuve TEST et reference Hosting exacts requis')
    c = value[OPTION]
    require(isinstance(c, dict) and set(c) == {'schema', 'productionRun', 'functions', 'approval', 'controls'}
            and c['schema'] == 1 and type(c['productionRun']) is int and c['productionRun'] > 0,
            'Autorisation de sources existantes incomplete')
    names = c['functions']
    require(isinstance(names, list) and all(isinstance(n, str) for n in names)
            and names == sorted(set(names)) and set(names) <= eligible(),
            'Fonction exclue ou autorisation de sources non bornee')
    approval(c['approval'])
    require(isinstance(c['controls'], dict) and set(c['controls']) == CONTROL_KEYS
            and all(re.fullmatch('[0-9a-f]{64}', str(h)) for h in c['controls'].values()),
            'Temoins techniques authentifies absents')
    return names


def paths(value, paths, git):
    if not enabled(value):
        return
    approved(value)
    source_paths(value['productionCommit'], value['candidate'], paths, git)


def source_paths(production, candidate, paths, git):
    for name in PROTECTED:
        require(git('rev-parse', production+':'+name)
                == git('rev-parse', candidate+':'+name),
                'Declaration/configuration/dependance hors sources seules : '+name)
    require(not any(p.startswith(('performances/public/data/', 'functions/private/', 'migrations/'))
                    or p.endswith(('.sql', '.env')) for p in paths),
            'Donnee, migration ou secret hors parcours standard')


def static_paths(paths, candidate, git):
    values = {p for p in paths if not p.startswith(('functions/', 'tests/', 'tools/', 'docs/', '.'))
              and Path(p).suffix.lower() in {'.html', '.css', '.js', '.pdf', '.svg', '.png', '.jpg', '.webp', '.ico'}}
    for name in ['performances/public/import-competitions.js', 'direct-guide.html', 'assets/direct/guide.pdf']:
        try:
            git('rev-parse', candidate+':'+name)
            values.add(name)
        except Exception:
            raise ValueError('Fichier statique conserve absent : '+name) from None
    require(all(not Path(p).is_absolute() and '..' not in Path(p).parts for p in values),
            'Chemin statique invalide')
    return sorted(values)


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths):
    names = approved(value)
    require(enabled(value) and baseline['productionRun'] == value[OPTION]['productionRun']
            and baseline['productionCommit'] == value['productionCommit']
            and baseline['source'] == 'verified-publication-artifacts',
            'Baseline PROD non authentifiee ou differente')
    paths(value, changed_paths, git)
    desired, conservative = fingerprint(value['candidate']), legacy(value['candidate'])
    require(set(desired) == set(fingerprint(value['productionCommit']))
            and set(conservative) == set(legacy(value['productionCommit'])),
            'Creation ou suppression de declaration interdite')
    require(0 < len(functions) <= 500 and len(functions) == len({f['name'] for f in functions.values()})
            and all(f['name'] == 'projects/livepalmes/locations/europe-west1/functions/'+n
                    for n, f in functions.items()), 'Inventaire PROD duplique, vide ou hors projet')
    calculated, rows = [], []
    for name, function in sorted(functions.items()):
        commit = function.get('commit', '')
        require(function.get('state') == 'ACTIVE' and re.fullmatch('[0-9a-f]{40}', commit)
                and function.get('revision') and function.get('updateTime')
                and name in desired and name in conservative,
                'Origine ou fonction PROD inconnue : '+name)
        before, old = fingerprint(commit), legacy(commit)
        require(name in before and name in old, 'Dependance inconnue : '+name)
        changed = before[name] != desired[name]
        require(changed == (old[name] != conservative[name]),
                'Comparateurs incompatibles, selection non reductible : '+name)
        if changed:
            calculated.append(name)
        rows.append({**function, 'before': before[name], 'after': desired[name],
                     'legacyBefore': old[name], 'legacyAfter': conservative[name]})
    require(sorted(selected) == calculated == names and len(selected) == len(set(selected)),
            'Selection calculee complete differente de l autorisation')
    return {'schema': 1, 'kind': KIND, 'requestSha256': digest(value),
            'candidate': value['candidate'], 'productionRun': baseline['productionRun'],
            'productionCommit': value['productionCommit'], 'productionHosting': value['productionHosting'],
            'testRun': value['testRun'], 'selected': calculated, 'origins': rows,
            'inventoryCount': len(rows), 'staticPaths': static_paths(changed_paths, value['candidate'], git),
            'controls': value[OPTION]['controls'], 'approval': value[OPTION]['approval'],
            'configurationChanges': False, 'bindingChanges': False, 'newFunctions': [],
            'deletedFunctions': [], 'businessInvocations': 0, 'mailPause': False}


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory/'request.json').read_text())
    names = approved(request)
    value = json.loads((directory/'standard-source-manifest.json').read_text())
    require(value.get('productionRun') == request[OPTION]['productionRun']
            and value.get('productionCommit') == request['productionCommit']
            and value.get('productionHosting') == request['productionHosting']
            and value.get('testRun') == request['testRun']
            and value.get('approval') == request[OPTION]['approval']
            and value.get('inventoryCount') == len(value.get('origins', [])) > 0
            and len({f['name'] for f in value['origins']}) == value['inventoryCount']
            and value.get('businessInvocations') == 0 and value.get('mailPause') is False,
            'Manifeste altere ou incomplet')
    require(value.get('schema') == 1 and value.get('kind') == KIND
            and value.get('requestSha256') == digest(request)
            and value.get('candidate') == request['candidate']
            and value.get('selected') == names
            and value.get('controls') == request[OPTION]['controls']
            and value.get('newFunctions') == value.get('deletedFunctions') == []
            and value.get('configurationChanges') is False and value.get('bindingChanges') is False,
            'Manifeste immuable hors candidat/perimetre')
    return value


def configuration(function):
    value = deepcopy({k: function.get(k) for k in ['buildConfig', 'serviceConfig', 'eventTrigger', 'environment']})
    for key in ['source', 'sourceProvenance', 'build']:
        value.get('buildConfig', {}).pop(key, None)
    value.get('serviceConfig', {}).pop('revision', None)
    if value.get('serviceConfig', {}).get('secretEnvironmentVariables'):
        value['serviceConfig']['secretEnvironmentVariables'].sort(key=lambda v: json.dumps(v, sort_keys=True))
    if value.get('eventTrigger') and value['eventTrigger'].get('eventFilters'):
        value['eventTrigger']['eventFilters'].sort(key=lambda v: json.dumps(v, sort_keys=True))
    return value


def runtime(function):
    name = function.get('name', '').split('/')[-1]
    require(name in eligible() and function.get('name') == 'projects/livepalmes/locations/europe-west1/functions/'+name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name,
            'Runtime existant hors sources seules : '+name)


def initial(functions, value):
    state = load('production-release-state.py')
    rows = {f['name'].split('/')[-1]: f for f in functions}
    expected = {f['name'].split('/')[-1]: f for f in value['origins']}
    require(len(rows) == len(functions) == value['inventoryCount'] and set(rows) == set(expected)
            and all(state.identity(rows[n]) == {k: expected[n][k] for k in ['name','revision','updateTime','state']}
                    for n in rows), 'Derive de l inventaire avant sauvegarde')
    for name in value['selected']:
        runtime(rows[name])
    smtp = rows.get('resolveAccessUserDeletionRequest', {}).get('serviceConfig', {})
    keys = {'LIVEPALMES_SMTP_HOST','LIVEPALMES_SMTP_PORT','LIVEPALMES_SMTP_USER',
            'LIVEPALMES_SMTP_PASS','LIVEPALMES_SMTP_SECURE','LIVEPALMES_MAIL_FROM'}
    require(len(smtp.get('secretEnvironmentVariables', [])) == 6
            and {s['key'] for s in smtp['secretEnvironmentVariables']} == keys
            and not smtp.get('secretVolumes'), 'Six bindings SMTP existants differents')


def assert_selected(before, after, candidate):
    runtime(before)
    runtime(after)
    require(after.get('updateTime') and after.get('serviceConfig', {}).get('revision')
            and after['updateTime'] != before.get('updateTime')
            and after['serviceConfig']['revision'] != before.get('serviceConfig', {}).get('revision'),
            'Nouvelle revision et horodatage non confirmes')
    require(configuration(before) == configuration(after)
            and after.get('labels') == {**before.get('labels', {}), 'livepalmes-commit': candidate},
            'Configuration, binding ou label hors sources seules')


def assert_retained(before, after, selected, state):
    require(set(before) == set(after), 'Creation ou suppression distante interdite')
    for name in set(before) - set(selected):
        require(state.identity(before[name]) == state.identity(after[name])
                and configuration(before[name]) == configuration(after[name])
                and before[name].get('labels') == after[name].get('labels')
                and before[name].get('buildConfig', {}).get('source') == after[name].get('buildConfig', {}).get('source'),
                'Fonction conservee modifiee : '+name.split('/')[-1])


def control_witness(values):
    fields = values['mail'].get('fields', {})
    require(fields.get('enabled') == {'booleanValue': True}
            and fields.get('scope') == {'stringValue': 'all'}
            and values['scheduler'].get('state') == 'ENABLED'
            and values['queue'].get('state') == 'RUNNING', 'Mails PROD actifs et automates inchanges requis')
    scheduler = {k: v for k, v in values['scheduler'].items()
                 if k not in {'lastAttemptTime', 'scheduleTime', 'status'}}
    queue = {k: values['queue'][k] for k in ['name','state','purgeTime','rateLimits','retryConfig',
             'stackdriverLoggingConfig','httpTarget','appEngineRoutingOverride'] if k in values['queue']}
    # Match existing witnesses, including all mail fields and template bytes.
    sha = lambda v: hashlib.sha256(json.dumps(v, sort_keys=True).encode()).hexdigest()
    return {k+'Sha256': sha(v) for k, v in
            {'mail': values['mail'], 'scheduler': scheduler, 'queue': queue, 'templates': values['templates']}.items()}


def controls():
    require(json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text()).get('project_id') == 'livepalmes',
            'Compte technique PROD existant requis')
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'],
                                    text=True, stderr=subprocess.DEVNULL).strip()
    base = 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/'
    urls = {'mail': base+'notificationDelivery', 'templates': base+'mailTemplates',
            'scheduler': 'https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1',
            'queue': 'https://cloudtasks.googleapis.com/v2/projects/livepalmes/locations/europe-west1/queues/processNapNotificationTask'}
    values = {}
    for name, url in urls.items():
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer '+token}), timeout=30) as response:
                raw = response.read(2*1024**2+1)
            require(len(raw) <= 2*1024**2, 'Temoin technique hors limite')
            values[name] = json.loads(raw)
        except urllib.error.HTTPError as error:
            if name != 'templates' or error.code != 404:
                raise
            values[name] = {'absent': True}
    return control_witness(values)


def guard(directory, after=False):
    directory = Path(directory)
    value = manifest(directory)
    observed = controls()
    require(observed == value['controls'], 'Derive mails/automates/modeles depuis le bilan')
    witness = directory/'standard-controls-before.json'
    require(not (directory/'previous/production-after.json').exists() or witness.exists(),
            'Temoin initial de reprise absent')
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Temoin initial different')
    else:
        require(not after, 'Temoin initial absent')
        witness.write_text(json.dumps(observed))
    if after:
        (directory/'standard-controls-after.json').write_text(json.dumps(observed))


def restore_witness(directory, source):
    directory, source = Path(directory), Path(source)
    value = manifest(directory)
    witness = source/'standard-controls-before.json'
    require(witness.is_file() and json.loads(witness.read_text()) == value['controls'],
            'Temoin de reprise incompatible')
    target = directory/witness.name
    require(not target.exists() or json.loads(target.read_text()) == value['controls'],
            'Temoin initial de reprise different')
    target.write_bytes(witness.read_bytes())
