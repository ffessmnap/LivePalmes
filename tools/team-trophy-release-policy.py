"""Exact source-only extension for the 4 November teams and trophy release."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = '3ebb91ed1ebd714d192d6bfe9457b47f8e05f964'
CANDIDATE = '7a6eedb6ee8b6c5943c194e88611219602782fdf'
TEST_RUN = 41738670112
TEST_WORKFLOW = '.github/workflows/livepalmes-test-team-closure-sources.yml'
NEW = 'manageDamienHebertEdition'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def load(name,file):
    spec = importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SOURCE_ONLY = sorted(load('team_scope','team-closure-test-sources.py').PROTECTED)


def require(value,message):
    if not value:
        raise ValueError(message)


def approved(value):
    option = value.get('teamTrophyRelease')
    if option is None:
        return []
    allowed = {'schema','candidate','productionCommit','productionHosting','testRun','testBackendRuns',
               'changes','excludedBackendReview','excludedBackendEvidence','teamTrophyRelease'}
    runs = value.get('testBackendRuns',[])
    require(set(value) <= allowed and option == '20261104-equipes-trophee-sources'
            and value.get('candidate') == CANDIDATE and value.get('productionCommit') == BASE
            and value.get('productionHosting') == 'sites/livepalmes/versions/073cb6f89178c29e'
            and value.get('testRun') == TEST_RUN and isinstance(runs,list) and len(runs) == 1
            and type(runs[0]) is int and runs[0] > 0 and runs[0] != TEST_RUN,
            'Version, preuves ou accord equipes/trophee hors contrat')
    return SOURCE_ONLY+[NEW]


def selection(value,names):
    if approved(value):
        require(len(names) == len(set(names)) == 116 and set(SOURCE_ONLY+[NEW]) <= set(names),
                'Selection equipes/trophee differente du calcul revu')


def test_proof(value,targeted,source):
    require(approved(value) and source['path'] == TEST_WORKFLOW
            and targeted.get('schema') == 1 and targeted.get('candidate') == CANDIDATE
            and targeted.get('commonTestRun') == TEST_RUN and targeted.get('businessInvocations') == 0
            and targeted.get('toolingCommit') == source['head_sha']
            and all(targeted.get(k) is True for k in ('configurationsUnchanged','mailSettingUnchanged',
                   'schedulerUnchanged','queueUnchanged','pendingMessagesPreserved')),
            'Preuve TEST equipe hors contrat ou configurations modifiees')
    rows = targeted.get('state',{}).get('functions',[])
    names = [f.get('name','').split('/')[-1] for f in rows]
    require(names and sorted(names) == targeted.get('selected') and set(names) <= set(SOURCE_ONLY),
            'Sources de la preuve TEST hors perimetre')


def initial(functions):
    rows = {f['name'].split('/')[-1]:f for f in functions}
    require(len(rows) == 115 and NEW not in rows and set(SOURCE_ONLY) <= set(rows),
            'Inventaire PROD equipes/trophee different')
    for name in SOURCE_ONLY:
        runtime(rows[name],name)


def runtime(function,name):
    require(name in SOURCE_ONLY and function.get('name') == PREFIX+name and function.get('state') == 'ACTIVE'
            and function.get('environment') == 'GEN_2' and function.get('buildConfig',{}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name, 'Runtime source protegee inconnu')


def assert_config(before,after,state):
    name = before['name'].split('/')[-1]
    runtime(before,name)
    runtime(after,name)
    old, new = state.rollback_patch(before,{}), state.rollback_patch(after,{})
    require(all(old.get(k)==new.get(k) for k in ('buildConfig','serviceConfig','eventTrigger'))
            and after.get('labels',{}) == {**before.get('labels',{}),'livepalmes-commit':CANDIDATE},
            'Configuration source protegee modifiee: '+name)


def assert_new(function):
    bindings = function.get('serviceConfig',{}).get('secretEnvironmentVariables',[])
    require(function.get('name') == PREFIX+NEW and function.get('state') == 'ACTIVE'
            and function.get('environment') == 'GEN_2' and not function.get('eventTrigger')
            and function.get('buildConfig',{}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == NEW
            and function.get('labels',{}).get('livepalmes-commit') == CANDIDATE
            and len(bindings) == 1 and bindings[0].get('key') == 'LIVEPALMES_NAP_PASSWORD'
            and bindings[0].get('secret') == 'LIVEPALMES_NAP_PASSWORD'
            and str(bindings[0].get('projectId')) in {'livepalmes','718081132564'},
            'Callable trophee hors contrat')


def prepare_trophy_secret(destination):
    backend = Path(destination)/'functions/backend-index.js'
    source = backend.read_text(encoding='utf-8')
    declaration = 'const napPassword = defineSecret("LIVEPALMES_NAP_PASSWORD");'
    require(source.count(declaration) == 1, 'Declaration du secret du trophee inconnue')
    replacement = 'const napPassword = { name: "LIVEPALMES_NAP_PASSWORD", value: () => process.env.LIVEPALMES_NAP_PASSWORD };'
    backend.write_text(source.replace(declaration,replacement),encoding='utf-8')


def require_quiet_closures(rows,now):
    minimum = now + timedelta(hours=2)
    require(len(rows) <= 100 and all(r.get('status',{}).get('stringValue') == 'pending'
            and not r.get('sourceHash',{}).get('stringValue')
            and datetime.fromisoformat(r.get('runAt',{}).get('stringValue','1970-01-01T00:00:00Z').replace('Z','+00:00')) > minimum
            for r in rows), 'Cloture imminente ou preparation engagee : arret')


def guard(directory,after=False):
    directory = Path(directory)
    require(approved(json.loads((directory/'request.json').read_text())), 'Garde equipes sans plan')
    controls = load('team_controls','validated-portal-release-policy.py')
    witnessed = controls.observe_controls()
    witness = directory/'team-trophy-controls-before.json'
    if witness.exists():
        require(json.loads(witness.read_text()) == witnessed,'Derive reglages mails ou automates')
    else:
        require(not after,'Temoin initial absent')
        witness.write_text(json.dumps(witnessed))
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'],
                                    text=True,stderr=subprocess.DEVNULL).strip()
    query = {'structuredQuery':{'from':[{'collectionId':'engagementClosureQueue'}],
             'select':{'fields':[{'fieldPath':x} for x in ('status','runAt','sourceHash')]},
             'where':{'fieldFilter':{'field':{'fieldPath':'status'},'op':'IN',
                      'value':{'arrayValue':{'values':[{'stringValue':s} for s in ('pending','processing','blocked','failed')]}}}},
             'limit':101}}
    request = urllib.request.Request('https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents:runQuery',
                                     data=json.dumps(query).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=30) as response:
        rows = [r['document']['fields'] for r in json.load(response) if 'document' in r]
    require_quiet_closures(rows,datetime.now(timezone.utc))
    if after:
        (directory/'team-trophy-controls-after.json').write_text(json.dumps(witnessed))


def publish(candidate,plan,backup,cycle,archive):
    value = cycle.read(plan/'request.json')
    selection(value,cycle.read(plan/'selection.json'))
    report = cycle.read(backup/'report.json')
    require(approved(value) and report.get('additionalTeamTrophyFunctions') == SOURCE_ONLY
            and report['candidate'] == CANDIDATE, 'Sauvegarde hors plan equipes')
    state = load('team_prod_state','production-release-state.py')
    before = {f['name']:f for f in cycle.read(backup/'functions.json')}
    current = {f['name']:f for f in state.inventory()}
    require(set(current) == set(before)|{PREFIX+NEW}, 'Derive de l inventaire avant sources protegees')
    assert_new(current[PREFIX+NEW])
    for name in SOURCE_ONLY:
        full = PREFIX+name
        runtime(before[full],name)
        require(state.identity(current[full]) == state.identity(before[full]),'Source protegee deja modifiee')
    guard(plan)
    data = archive(candidate,CANDIDATE)
    upload = state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl','POST',{})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')),
            'Destination source interdite')
    req = urllib.request.Request(upload['uploadUrl'],method='PUT',data=data,headers={'Content-Type':'application/zip'})
    with urllib.request.urlopen(req,timeout=120):
        pass
    def update(name):
        full = PREFIX+name
        actual = state.request(state.API+full)
        require(state.identity(actual) == state.identity(before[full]), 'Derive source protegee')
        body = {'name':full,'buildConfig':{'source':{'storageSource':upload['storageSource']}},
                'labels':{**actual.get('labels',{}),'livepalmes-commit':CANDIDATE}}
        state.wait_operation(state.request(state.API+full+'?updateMask=build_config.source,labels','PATCH',body))
    with ThreadPoolExecutor(max_workers=3) as executor:
        list(executor.map(update,SOURCE_ONLY))
    state.check_after(backup,backup/'after.json',True)
    guard(plan,after=True)
