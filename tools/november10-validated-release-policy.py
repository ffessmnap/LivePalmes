"""Closed 10 November release: existing sources, six NAP bindings, exact Hosting changes."""
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
PATH = ROOT/'.github/releases/evidence/20261110-production-validated-contract.json'
DIGEST = 'eae47689686d5a394c7591d6064f2eed0dc9ab2a502ff8d23a746901694330bb'
OPTION = 'november10ValidatedRelease'
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
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat PROD du 10 novembre modifie')
    return json.loads(raw)


def approved(value):
    if OPTION not in value:
        return []
    c = contract()
    keys = {'schema','candidate','productionCommit','productionHosting','testRun',
            'changes','excludedBackendReview','excludedBackendEvidence',OPTION}
    require(value.get('schema') == 1 and set(value) <= keys
            and value[OPTION] == {'contractSha256':DIGEST}
            and all(value.get(k) == c[k] for k in ['candidate','productionCommit','productionHosting','testRun']),
            'Publication du 10 novembre hors version ou options')
    return c['sourceOnly']


def selection(value, names):
    if approved(value):
        require(sorted(names) == contract()['selected'] and len(names) == len(set(names)),
                'Selection du 10 novembre differente du calcul')


def verify(value, baseline, functions, fingerprint):
    require(approved(value), 'Contrat du 10 novembre absent')
    c = contract()
    require(baseline['productionRun'] == c['productionRun']
            and sorted(functions.values(), key=lambda f:f['name']) == c['origins'],
            'Origines PROD du 10 novembre differentes')
    for row in c['reviewedSelectionOrigins']:
        require(fingerprint(row['commit'])[row['name']] == row['before']
                and fingerprint(c['candidate'])[row['name']] == row['after']
                and row['before'] != row['after'], 'Empreinte PROD differente: '+row['name'])
    return {'schema':1,'candidate':c['candidate'],'contractSha256':DIGEST,
            'sourceOnly':c['sourceOnly'],'newFunctions':[], 'napBindingFunctions':c['napBindingFunctions'],
            'retiredPaths':sorted(c['retiredBlobs']), 'hostingCacheChanges':8,
            'mailPause':False,'historicalReplay':False,'networkCalls':0}


def approved_paths(value, paths, git):
    if not approved(value):
        return set()
    c = contract(); expected = {'firebase.json', *c['retiredBlobs']}
    require(expected <= set(paths), 'Chemins de cache/retrait incomplets')
    digest = lambda v: hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    for ref,key in [(c['productionCommit'],'hostingBeforeSha256'),(c['candidate'],'hostingAfterSha256')]:
        require(digest(json.loads(git('show',ref+':firebase.json'))) == c[key], 'Configuration Hosting hors des huit caches')
    for path,blob in c['retiredBlobs'].items():
        require(git('rev-parse',c['productionCommit']+':'+path) == blob
                and not git('ls-tree','-r',c['candidate'],'--',path), 'Retrait clubs hors des deux copies exactes')
    return expected


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
    require(len(rows) == len(functions) == c['inventoryCount'] and set(rows) == set(c['selected']),
            'Inventaire initial PROD incomplet')
    for f in functions:
        runtime(f)
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
    expected = state.rollback_patch(before,{})
    if before['name'].split('/')[-1] in contract()['napBindingFunctions']:
        require(not any(s.get('key') == nap['key'] for s in bindings(before['serviceConfig'])), 'Binding NAP initial deja present')
        expected['serviceConfig']['secretEnvironmentVariables'] = bindings(before['serviceConfig'])+[deepcopy(nap)]
    return expected


def assert_config(before, after, state, nap):
    runtime(before); runtime(after)
    expected = canonical(expected_config(before,state,nap))
    actual = canonical(state.rollback_patch(after,{}))
    require(all(expected.get(k) == actual.get(k) for k in ['buildConfig','serviceConfig','eventTrigger'])
            and after.get('labels') == {**before.get('labels',{}),'livepalmes-commit':contract()['candidate']},
            'Configuration modifiee hors du binding NAP approuve: '+before['name'].split('/')[-1])


def source_patch(before, storage, nap):
    runtime(before)
    require(set(storage) <= {'bucket','object','generation'} and storage.get('bucket') and storage.get('object'), 'Source incomplete')
    body = {'name':before['name'],'buildConfig':{'source':{'storageSource':storage}},
            'labels':{**before.get('labels',{}),'livepalmes-commit':contract()['candidate']}}
    mask = 'build_config.source,labels'
    if before['name'].split('/')[-1] in contract()['napBindingFunctions']:
        require(not any(s.get('key') == nap['key'] for s in bindings(before['serviceConfig'])), 'Binding NAP initial deja present')
        body['serviceConfig'] = {'secretEnvironmentVariables':bindings(before['serviceConfig'])+[deepcopy(nap)]}
        mask += ',service_config.secret_environment_variables'
    return body,mask


def observe_controls():
    # Reuse the existing four bounded reads. Both contracts require the same
    # authenticated active-mail baseline; no old deployment authority is used.
    previous = load('november10_control_reader','november-validated-release-policy.py')
    require(contract()['controls'] == previous.contract()['controls'], 'Baseline des gardes differente')
    return previous.observe_controls()


def guard(directory, after=False):
    directory = Path(directory)
    require(approved(json.loads((directory/'request.json').read_text())), 'Garde hors contrat')
    witness = directory/'november10-controls-before.json'
    require(not (directory/'previous/production-after.json').exists() or witness.exists(), 'Temoin initial de reprise absent')
    observed = observe_controls()
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Derive mails, automates ou modeles PROD')
    else:
        require(not after, 'Temoin initial absent'); witness.write_text(json.dumps(observed))
    if after:
        (directory/'november10-controls-after.json').write_text(json.dumps(observed))


def restore_witness(directory, source):
    directory,source = Path(directory),Path(source)
    require(approved(json.loads((directory/'request.json').read_text())), 'Reprise hors contrat')
    initial = source/'november10-controls-before.json'
    require(initial.is_file(), 'Temoin du 10 novembre absent')
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
    require(report.get('additionalNovember10Functions') == names and report['candidate'] == c['candidate'], 'Sauvegarde hors contrat')
    state = load('november10_publish_state','production-release-state.py')
    before = {f['name']:f for f in cycle.read(backup/'functions.json')}
    nap = initial(list(before.values()))
    require(nap == report.get('november10NapBinding'), 'Reference NAP sauvegardee differente')
    current = {f['name']:f for f in state.inventory()}
    require(set(current) == set(before), 'Inventaire PROD modifie avant publication')
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
    cycle = load('november10_hosting_cycle','release-cycle.py')
    if not approved(cycle.read(Path(plan)/'request.json')):
        return
    hosting = load('november10_hosting','check-production-hosting.py')
    read = read or hosting.fetch
    paths = ['styles.css','logo-ffessm-nage-avec-palmes.png','sifflet-ja.png',
             'assets/public/livepalmes-public-shell.js','assets/portal/deferred/account-and-access.js',
             'assets/portal/styles/16-team-entries.css','assets/pages/resultats.js','assets/pages/series-public.js']
    observations = []
    try:
        for path in paths:
            expected = hashlib.sha256((Path(candidate)/path).read_bytes()).hexdigest()
            for delay in hosting.DELAYS:
                if delay:
                    time.sleep(delay)
                status,body,headers = read('https://livepalmes.web.app/'+path+'?release='+str(os.environ.get('GITHUB_RUN_ID','')))
                actual = hashlib.sha256(body).hexdigest()
                observations.append({'path':path,'status':status,'expectedSha256':expected,
                                     'actualSha256':actual,'cache':headers.get('Cache-Control','')})
                if status == 200 and expected == actual and headers.get('Cache-Control') == 'public, max-age=86400, must-revalidate':
                    break
            else:
                raise ValueError('Contenu ou cache Hosting different: '+path)
        path = 'performances/public/data/club-reference.js'
        status,_,_ = read('https://livepalmes.web.app/'+path)
        observations.append({'path':path,'status':status})
        require(status == 404, 'Ancienne copie clubs publique encore accessible')
    finally:
        Path(receipt).write_text(json.dumps(observations,indent=2))


def main(candidate, plan, backup):
    cycle = load('november10_cycle','release-cycle.py'); value = cycle.read(Path(plan)/'request.json')
    if not approved(value):
        return
    started = os.environ.get('NOVEMBER_RELEASE_STARTED_AT','')
    require(re.fullmatch('[0-9]{10,11}',started) and int(started) <= time.time(), 'Horodatage initial absent')
    archive = load('november10_archive','publish-approved-pdf-functions.py').archive
    publish_sources(Path(candidate),Path(plan),Path(backup),cycle,archive,int(started)+70*60)


if __name__ == '__main__':
    if sys.argv[1:2] == ['hosting']:
        check_hosting(*sys.argv[2:])
    else:
        main(*sys.argv[1:])
