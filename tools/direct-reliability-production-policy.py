"""Closed public navigation/Direct release: two existing sources, 117 retained."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from threading import Event
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261112-production-direct-reliability-contract.json'
DIGEST = '25d3a1ddc120ab30110c0f940e83498f64ffbdb348ae70752ca32cfca0711df9'
OPTION = 'directReliabilityRelease'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def require(value, message):
    if not value:
        raise ValueError(message)


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/filename)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat PROD fiabilisation Direct du 12 novembre modifie')
    value = json.loads(raw)
    require(value['napBindingFunctions'] == [] and value['newFunctions'] == [] and value['sourceOnly'] == value['selected'] and value['selected'] == ['manageLivePalmesDirect','readNapPublicSwimmer'] and value['inventoryCount'] == 119, 'Contrat reserve aux deux sources existantes')
    return value


def approved(value):
    if OPTION not in value:
        return []
    c = contract()
    keys = {'schema','candidate','productionCommit','productionHosting','testRun',
            'changes','excludedBackendReview','excludedBackendEvidence',OPTION}
    require(value.get('schema') == 1 and set(value) <= keys
            and value[OPTION] == {'contractSha256':DIGEST}
            and all(value.get(k) == c[k] for k in ['candidate','productionCommit','productionHosting','testRun']),
            'Publication fiabilisation Direct du 12 novembre hors version ou options')
    return c['sourceOnly']


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == len(set(names)),
                'Selection fiabilisation Direct du 12 novembre differente du calcul')


def verify(value, baseline, functions, fingerprint, legacy_fingerprint):
    require(approved(value), 'Contrat fiabilisation Direct absent')
    c = contract()
    require(baseline['productionRun'] == c['productionRun']
            and sorted(functions.values(), key=lambda f:f['name']) == c['origins'],
            'Origines PROD fiabilisation Direct differentes')
    selected,retained = c['reviewedSelectionOrigins'],c['reviewedRetainedOrigins']
    require(sorted(r['name'] for r in selected) == c['selected']
            and len(retained) == 117
            and len({r['name'] for r in selected+retained}) == c['inventoryCount']
            and {r['name'] for r in selected+retained} == set(functions),
            'Revue des deux sources et des 117 fonctions conservees incomplete')
    for row in selected+retained:
        require(fingerprint(row['commit'])[row['name']] == row['before']
                and fingerprint(c['candidate'])[row['name']] == row['after']
                and legacy_fingerprint(row['commit'])[row['name']] == row['legacyBefore']
                and legacy_fingerprint(c['candidate'])[row['name']] == row['legacyAfter']
                and (row['before'] != row['after']) == (row['name'] in c['selected'])
                and (row['legacyBefore'] != row['legacyAfter']) == (row['name'] in c['selected']),
                'Empreinte PROD differente: '+row['name'])
    return {'schema':1,'candidate':c['candidate'],'contractSha256':DIGEST,
            'sourceOnly':c['sourceOnly'],'retainedCount':len(retained),'newFunctions':[],
            'napBindingFunctions':[], 'retiredPaths':[], 'hostingCacheChanges':0,
            'mailPause':False,'historicalReplay':False,'networkCalls':0}


def approved_paths(value, paths, git):
    if not approved(value):
        return set()
    c = contract()
    require(c['retiredBlobs'] == {}, 'Aucun retrait prive autorise')
    digest = lambda v: hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    for ref,key in [(c['productionCommit'],'hostingBeforeSha256'),(c['candidate'],'hostingAfterSha256')]:
        require(digest(json.loads(git('show',ref+':firebase.json'))) == c[key], 'Configuration Hosting differente')
    require(c['hostingBeforeSha256'] == c['hostingAfterSha256'], 'Configuration Hosting modifiee')
    return set()  # No exception to ordinary classification or public-data protection.

def runtime(function):
    name = function.get('name','').split('/')[-1]
    require(name in contract()['sourceOnly'] and function.get('name') == PREFIX+name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig',{}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name, 'Runtime PROD inconnu: '+name)


def bindings(service):
    return sorted(service.get('secretEnvironmentVariables',[]),key=lambda s:s['key'])


def initial(functions):
    c = contract(); rows = {f['name'].split('/')[-1]:f for f in functions}
    require(len(rows) == len(functions) == c['inventoryCount'] and {f['name'] for f in functions} == {f['name'] for f in c['origins']},
            'Inventaire initial PROD incomplet')
    require(all(f.get('state') == 'ACTIVE' for f in functions), 'Fonction PROD non active')
    for name in c['selected']:
        f = rows[name]; runtime(f)
        service = f.get('serviceConfig',{})
        nap = [v for v in bindings(service) if v.get('key') == 'LIVEPALMES_NAP_PASSWORD']
        require(service.get('serviceAccountEmail') == c['runtimeAccount'], 'Compte runtime different')
        require(len(nap) == 1 and nap[0].get('secret') == 'LIVEPALMES_NAP_PASSWORD'
                and set(nap[0]) == {'key','secret','projectId','version'}
                and str(nap[0]['projectId']) in {'livepalmes','718081132564'}
                and re.fullmatch('latest|[1-9][0-9]*',str(nap[0]['version'])),
                'Liaison NAP existante inconnue: '+name)
    reference = rows[c['napReference']]['serviceConfig']
    nap = [s for s in bindings(reference) if s['key'] == 'LIVEPALMES_NAP_PASSWORD']
    require(len(nap) == 1 and set(nap[0]) == {'key','secret','projectId','version'}
            and nap[0]['key'] == nap[0]['secret'] == 'LIVEPALMES_NAP_PASSWORD'
            and str(nap[0]['projectId']) in {'livepalmes','718081132564'}
            and re.fullmatch('latest|[1-9][0-9]*',str(nap[0]['version']))
            and reference.get('serviceAccountEmail') == c['runtimeAccount'], 'Reference NAP existante inconnue')
    for name in c['napBindingFunctions']:
        service = rows[name]['serviceConfig']
        require(not service.get('secretVolumes')
                and not any(s.get('key') == 'LIVEPALMES_NAP_PASSWORD' for s in service.get('secretEnvironmentVariables',[]))
                and 'LIVEPALMES_NAP_PASSWORD' not in service.get('environmentVariables',{})
                and service.get('serviceAccountEmail') == c['runtimeAccount'], 'Configuration initiale NAP differente: '+name)
    smtp = rows[c['smtpFunction']]['serviceConfig']
    require(bindings(smtp) == sorted(c['smtpBindings'],key=lambda s:s['key'])
            and not smtp.get('secretVolumes'), 'Les six liaisons SMTP PROD ont change')
    return deepcopy(nap[0])


def canonical(config):
    value = deepcopy(config)
    if 'secretEnvironmentVariables' in value.get('serviceConfig',{}):
        value['serviceConfig']['secretEnvironmentVariables'] = bindings(value['serviceConfig'])
    if 'eventFilters' in value.get('eventTrigger',{}):
        filters = value['eventTrigger']['eventFilters']
        require(isinstance(filters,list) and all(isinstance(f,dict) for f in filters), 'Filtres Eventarc inconnus')
        value['eventTrigger']['eventFilters'] = sorted(filters,key=lambda f:json.dumps(f,sort_keys=True))
    return value


def expected_config(before, state, nap):
    return state.rollback_patch(before,{})

def assert_config(before, after, state, nap):
    runtime(before); runtime(after)
    expected = canonical(expected_config(before,state,nap))
    actual = canonical(state.rollback_patch(after,{}))
    require(all(expected.get(k) == actual.get(k) for k in ['buildConfig','serviceConfig','eventTrigger'])
            and after.get('labels') == {**before.get('labels',{}),'livepalmes-commit':contract()['candidate']},
            'Configuration modifiee pendant la publication des seules sources: '+before['name'].split('/')[-1])


def assert_retained(before, after, state):
    require(set(before) == set(after), 'Inventaire PROD modifie')
    selected = {PREFIX+n for n in contract()['selected']}
    for name in set(before)-selected:
        require(state.identity(before[name]) == state.identity(after[name])
                and before[name].get('labels') == after[name].get('labels')
                and canonical(state.rollback_patch(before[name],{})) == canonical(state.rollback_patch(after[name],{}))
                and before[name].get('buildConfig',{}).get('source') == after[name].get('buildConfig',{}).get('source'),
                'Fonction conservee modifiee: '+name.split('/')[-1])


def source_patch(before, storage, nap):
    runtime(before)
    require(set(storage) <= {'bucket','object','generation'} and storage.get('bucket') and storage.get('object'), 'Source incomplete')
    return {'name':before['name'],'buildConfig':{'source':{'storageSource':storage}},
            'labels':{**before.get('labels',{}),'livepalmes-commit':contract()['candidate']}}, 'build_config.source,labels'

def observe_controls():
    # Reuse the existing four bounded reads. Both contracts require the same
    # authenticated active-mail baseline; no old deployment authority is used.
    previous = load('direct_reliability_control_reader','november-validated-release-policy.py')
    require(contract()['controls'] == previous.contract()['controls'], 'Baseline des gardes differente')
    return previous.observe_controls()


def guard(directory, after=False):
    directory = Path(directory)
    require(approved(json.loads((directory/'request.json').read_text())), 'Garde hors contrat')
    witness = directory/'direct_reliability-controls-before.json'
    require(not (directory/'previous/production-after.json').exists() or witness.exists(), 'Temoin initial de reprise absent')
    observed = observe_controls()
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Derive mails, automates ou modeles PROD')
    else:
        require(not after, 'Temoin initial absent'); witness.write_text(json.dumps(observed))
    if after:
        (directory/'direct_reliability-controls-after.json').write_text(json.dumps(observed))


def restore_witness(directory, source):
    directory,source = Path(directory),Path(source)
    require(approved(json.loads((directory/'request.json').read_text())), 'Reprise hors contrat')
    initial = source/'direct_reliability-controls-before.json'
    require(initial.is_file(), 'Temoin fiabilisation Direct du 12 novembre absent')
    value = json.loads(initial.read_text())
    require(set(value) == {'mailSha256','schedulerSha256','queueSha256','templatesSha256'}
            and all(re.fullmatch('[a-f0-9]{64}',str(v)) for v in value.values())
            and all(value.get(k) == v for k,v in contract()['controls'].items()), 'Temoin de reprise incompatible')
    target = directory/initial.name
    require(not target.exists() or json.loads(target.read_text()) == value, 'Temoin initial different')
    target.write_text(json.dumps(value))


def publish_sources(candidate, plan, backup, cycle, archive, launch_deadline=None):
    value,c = cycle.read(plan/'request.json'),contract(); names = approved(value)
    selection(value,cycle.read(plan/'selection.json'))
    report = cycle.read(backup/'report.json')
    require(report.get('additionalDirectReliabilityFunctions') == names and report['candidate'] == c['candidate'], 'Sauvegarde hors contrat')
    state = load('direct_reliability_publish_state','production-release-state.py')
    before = {f['name']:f for f in cycle.read(backup/'functions.json')}
    nap = initial(list(before.values()))
    require(nap == report.get('direct_reliabilityNapBinding'), 'Reference NAP sauvegardee differente')
    current = {f['name']:f for f in state.inventory()}
    assert_retained(before,current,state)
    previous = cycle.read(plan/'previous/production-after.json') if (plan/'previous/production-after.json').exists() else {}
    require(not previous or previous['candidate'] == c['candidate'], 'Reprise hors version')
    attested = {f['name']:f for f in previous.get('functions',[])}; pending = []
    for name in names:
        full = PREFIX+name
        require(full in current, 'Fonction existante absente')
        if state.identity(current[full]) == state.identity(before[full]):
            pending.append(name)
        else:
            require(attested.get(full) == state.identity(current[full]), 'Revision sans preuve de reprise')
            assert_config(before[full],current[full],state,nap)
    guard(plan)
    if not pending:
        return
    require(launch_deadline is None or time.time() < launch_deadline, 'Budget atteint avant toute source')
    data = archive(candidate,c['candidate'])
    upload = state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl','POST',{})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')), 'Destination source interdite')
    with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'],method='PUT',data=data,headers={'Content-Type':'application/zip'}),timeout=120):
        pass
    stopped = Event()
    def update(name):
        try:
            require(not stopped.is_set(), 'Publication interrompue apres erreur')
            require(launch_deadline is None or time.time() < launch_deadline, 'Budget atteint avant source')
            full = PREFIX+name; actual = state.request(state.API+full)
            require(state.identity(actual) == state.identity(before[full]), 'Derive avant PATCH')
            body,mask = source_patch(before[full],upload['storageSource'],nap)
            require(not stopped.is_set(), 'PATCH annule apres erreur')
            require(launch_deadline is None or time.time() < launch_deadline, 'Budget atteint avant PATCH')
            state.wait_operation(state.request(state.API+full+'?updateMask='+mask,'PATCH',body))
            assert_config(before[full],state.request(state.API+full),state,nap)
        except BaseException:
            stopped.set(); raise
    with ThreadPoolExecutor(max_workers=3) as executor:
        try:
            list(executor.map(update,pending))
        except BaseException:
            stopped.set(); raise
    guard(plan)


def check_hosting(candidate, plan, receipt, read=None):
    cycle = load('direct_reliability_hosting_cycle','release-cycle.py')
    if not approved(cycle.read(Path(plan)/'request.json')):
        return
    hosting = load('direct_reliability_hosting','check-production-hosting.py')
    read = read or hosting.fetch
    observations = []
    try:
        for path in contract()['staticPaths']:
            expected = hashlib.sha256((Path(candidate)/path).read_bytes()).hexdigest()
            for delay in hosting.DELAYS:
                if delay:
                    time.sleep(delay)
                status,body,_ = read('https://livepalmes.web.app/'+path+'?release='+str(os.environ.get('GITHUB_RUN_ID','')))
                actual = hashlib.sha256(body).hexdigest()
                observations.append({'path':path,'status':status,'expectedSha256':expected,'actualSha256':actual})
                if status == 200 and expected == actual:
                    break
            else:
                raise ValueError('Contenu Hosting different: '+path)
    finally:
        Path(receipt).write_text(json.dumps(observations,indent=2))

def main(candidate, plan, backup):
    cycle = load('direct_reliability_cycle','release-cycle.py'); value = cycle.read(Path(plan)/'request.json')
    if not approved(value):
        return
    started = os.environ.get('NOVEMBER_RELEASE_STARTED_AT','')
    require(re.fullmatch('[0-9]{10,11}',started) and int(started) <= time.time(), 'Horodatage initial absent')
    archive = load('direct_reliability_archive','publish-approved-pdf-functions.py').archive
    publish_sources(Path(candidate),Path(plan),Path(backup),cycle,archive,int(started)+70*60)


if __name__ == '__main__':
    if sys.argv[1:2] == ['hosting']:
        check_hosting(*sys.argv[2:])
    else:
        main(*sys.argv[1:])
