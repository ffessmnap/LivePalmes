"""Closed 16-function preparation; no API calls or business invocations."""
import copy
import hashlib
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('oct27_base', ROOT/'tools/bcc-publication-policy.py')
base = importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
require = base.require
DIGEST = 'e20e88ea1f9e1efdde4045334d1ab64dc68e4d266648acce28181c9508a8c8b0'
LICENSE = 'prepareEngagementLicenseControlBatch'
MAINTENANCE = {'scope':'all','observedRevision':7,'pauseRevision':8,'resumeRevision':9,
               'noReplay':True,'approval':'Oui, je valide cette préparation limitée'}

def contract():
    raw = (ROOT/'.github/releases/evidence/20261027-validated-contract.json').read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat27octobre modifie')
    return json.loads(raw)

def approved(value):
    c = contract()
    require(all(value.get(k) == c[k] for k in ['candidate','productionCommit','productionHosting','testRun'])
        and value.get('additionalBccFunctions') == c['selected'] and value.get('initialAutomaticMailEnabled') is True,
        'Lot27octobre hors paire ou selection')
    require(value.get('limitedMailMaintenance') == MAINTENANCE, 'Maintenance27octobre hors contrat')
    runs = value.get('testBackendRuns',[])
    require(isinstance(runs,list) and len(runs) <= 1 and all(type(r) is int and r > 0 for r in runs), 'Preuve ciblee27octobre invalide')
    require(not any(value.get(k) for k in ['additionalPdfFunctions','additionalDtnFunctions','additionalNotificationFunctions',
        'additionalPublicNapFunctions','additionalAccessRequestFunctions','additionalClubDirectoryFunctions','additionalGroupedFunctions',
        'bccMailTransition','bccInfrastructure','activeMailPreservation','productionAccountHistoryIndexes',
        'resolveBccProof','notificationMaintenancePlan','notificationPilotIdfApproval','testEquivalentCandidate','productionStaticCleanup',
        'productionHomeRouting','nativeIdentityNapSecretApproval','groupedAllMailPreservation','groupedIdfPreservation',
        'publicReaderIdfPreservation','clubDirectoryIdfPreservation']), 'Extension incompatible avec lot27octobre')
    return c['selected']

def verify_targeted(request, targeted, source, root, cycle):
    require(targeted.get('schema') == 1 and targeted.get('candidate') == source['head_sha'], 'Preuve ciblee27octobre hors commit')
    sha = targeted['candidate']
    # No application substitution: only reviewed infrastructure descendants may
    # supply the exact same validated handlers, with real revision receipts.
    cycle.subprocess.run(['git','merge-base','--is-ancestor',request['candidate'],sha],cwd=ROOT,check=True)
    paths = cycle.git('diff','--name-only','--no-renames',request['candidate'],sha).splitlines()
    require(all(p.startswith(('.github/','docs/','tools/','tests/')) or p == 'AGENTS.md' for p in paths), 'Difference applicative dans la preuve ciblee27octobre')
    names = sorted(f['name'].split('/')[-1] for f in targeted.get('state',{}).get('functions',[]))
    require(names == contract()['targetedTestFunctions'], 'Lot TEST cible27octobre different')
    desired = cycle.test_backend_fingerprints(request['candidate']); actual = cycle.test_backend_fingerprints(sha)
    require(all(n in desired and n in actual and desired[n] == actual[n] for n in names), 'Sources TEST ciblees non equivalentes')
    cycle.artifact(source['id'],'test-notification-control',root/'.notification-control','.github/workflows/livepalmes-test-backend.yml')
    control = cycle.read(root/'.notification-control/notification-control.json')
    require(control.get('project') == 'livepalmes-test' and control.get('candidate') == sha
        and control.get('before') == control.get('after') and control.get('after',{}).get('enabled') is False
        and control.get('mailsSent') == 0, 'Mails TEST ou reglage modifies pendant lot cible')

def selection(value, selected):
    require(sorted(selected) == approved(value) and len(selected) == len(set(selected)), 'Selection27octobre differente')

def verify_fingerprints(before, after, functions):
    c = contract()
    require(before == c['beforeHashes'] and after == c['afterHashes'] and len(functions) == 113
        and set(functions) == set(c['selected']+c['retained']) and all(f.get('state') == 'ACTIVE' for f in functions.values()),
        'Empreintes ou inventaire27octobre differents')
    return {'pair':[c['productionCommit'],c['candidate']], 'selected':c['selected'], 'retainedCount':97,
        'newFunctions':[], 'sourceOnly':False, 'configurationExceptions':[LICENSE,'scheduler schedule'],
        'mailPauseRequired':True, 'noReplay':True, 'networkCalls':0}

def verify_retained(root, state, selected, cycle):
    c = contract(); request = cycle.read(root/'request.json'); selection(request, selected)
    actual = {f['name'].split('/')[-1]:f for f in state['functions'] if f['name'].split('/')[-1] not in selected}
    require(set(actual) == set(c['retained']), 'Exclusions27octobre incompletes')
    desired = cycle.production_selection_fingerprints(c['candidate'])
    baseline = cycle.production_selection_fingerprints(c['productionCommit'])
    expected_rows = []
    for origin in c['retainedOrigins']:
        n = origin['name']; f = actual[n]
        require(f.get('state') == 'ACTIVE' and all(f.get(k) == origin[k] for k in ['commit','revision']), 'Provenance conservee differente: '+n)
        require(n in baseline and n in desired and baseline[n] == desired[n], 'Nouveau changement conserve non prouve: '+n)
        old = c['originHashes'][origin['commit']][n]
        if old != c['afterHashes'][n]:
            expected_rows.append({**origin,'before':old,'after':c['afterHashes'][n]})
    rows = request['excludedBackendEvidence']['functions']
    require([{k:r[k] for k in ['name','commit','revision','before','after']} for r in rows] == expected_rows,
        'Revue historique des exclusions27octobre differente')
    cycle.write(root/'excluded-backend-verification.json', {'suite':'retained-calendar-consumers-v1',
        'candidate':c['candidate'],'productionCommit':c['productionCommit'],'result':'success','networkCalls':0,
        'retainedFunctions':c['retained'],'contractSha256':DIGEST,
        'method':'authenticated-origins-and-static-production-equivalence','inheritedDivergencesPreserved':True})

def initial_license_service(service):
    require(service.get('timeoutSeconds',60) == 60 and not service.get('secretVolumes'), 'Configuration initiale licences inattendue')
    require(service.get('serviceAccountEmail') == '718081132564-compute@developer.gserviceaccount.com', 'Compte licences non couvert par les liaisons mail existantes')
    secrets = service.get('secretEnvironmentVariables',[])
    require(len(secrets) == 1 and secrets[0].get('key') == secrets[0].get('secret') == 'LIVEPALMES_NAP_PASSWORD'
        and str(secrets[0].get('projectId')) in {'livepalmes','718081132564'}
        and re.fullmatch(r'latest|[1-9][0-9]*',str(secrets[0].get('version',''))),
        'Liaison initiale licences inattendue')
    return service

def license_service(before, reference):
    service = copy.deepcopy(initial_license_service(before['serviceConfig']))
    require(reference is not None and reference.get('name','').split('/')[-1] == base.REFERENCE,
        'Reference mail existante requise')
    ref = reference.get('serviceConfig',{})
    require(ref.get('serviceAccountEmail') == service['serviceAccountEmail'] and not ref.get('secretVolumes'),
        'Compte ou volumes de la reference mail differents')
    keys = ref.get('secretEnvironmentVariables',[])
    require(len(keys) == 8 and {v.get('key') for v in keys} == base.MAIL_KEYS
        and all(set(v) == {'key','secret','projectId','version'} and v['key'] == v['secret']
            and str(v['projectId']) in {'livepalmes','718081132564'}
            and re.fullmatch(r'latest|[1-9][0-9]*',str(v['version'])) for v in keys), 'Reference des liaisons mail invalide')
    nap = service['secretEnvironmentVariables'][0]
    service['timeoutSeconds'] = 300
    service['secretEnvironmentVariables'] = sorted([copy.deepcopy(v) for v in keys if v['key'] != nap['key']] + [nap],key=lambda v:v['key'])
    return service

def source_patch(before, source, sha, reference=None):
    c = contract(); name = before['name'].split('/')[-1]
    require(sha == c['candidate'] and name in c['selected'], 'Source hors contrat27octobre')
    body = {'name':before['name'],'buildConfig':{'source':{'storageSource':source}},
        'labels':{**before.get('labels',{}),'livepalmes-commit':sha}}
    if name == LICENSE:
        service = license_service(before, reference)
        body['serviceConfig'] = {k:service[k] for k in ['timeoutSeconds','secretEnvironmentVariables']}
    return body

def update_mask(body):
    return 'build_config.source,labels' + (',service_config.timeout_seconds,service_config.secret_environment_variables' if 'serviceConfig' in body else '')

def assert_config(before, after, state):
    expected = copy.deepcopy(before)
    if before['name'].split('/')[-1] == LICENSE:
        expected['serviceConfig'] = license_service(before, getattr(state,'bcc_runtime_reference',None))
        after = copy.deepcopy(after)
        after['serviceConfig']['secretEnvironmentVariables'] = sorted(after['serviceConfig'].get('secretEnvironmentVariables',[]),key=lambda v:v.get('key',''))
    base.assert_config(expected, after, state)

def assert_worker(function, expected, state):
    require(function.get('name','').split('/')[-1] == contract()['worker'] and function.get('state') == 'ACTIVE'
        and function.get('environment') == 'GEN_2' and function.get('buildConfig',{}).get('runtime') == 'nodejs22'
        and function.get('buildConfig',{}).get('entryPoint') == contract()['worker'] and not function.get('eventTrigger')
        and state.rollback_patch(function,{})['serviceConfig'] == expected, 'Worker existant27octobre modifie')

def initial_runtime(name, service, ordinary):
    keys = service.get('secretEnvironmentVariables',[])
    mail = name in {'notifyEngagementCompetitionDocuments','processNapCompetitionNotifications','closeDueEngagementCompetitions','processNapNotificationTask'}
    if name == LICENSE: initial_license_service(service)
    if mail:
        require(len(keys) == 8 and {v.get('key') for v in keys} == base.MAIL_KEYS
            and all(v.get('key') == v.get('secret') and str(v.get('projectId')) in {'livepalmes','718081132564'}
                and re.fullmatch(r'latest|[1-9][0-9]*',str(v.get('version',''))) for v in keys)
            and ordinary({**service,'secretEnvironmentVariables':[]}), 'Configuration mail initiale27octobre inattendue')
    else: require(ordinary(service), 'Configuration initiale27octobre inattendue')
