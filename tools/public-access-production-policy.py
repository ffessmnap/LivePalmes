"""One closed A3.2 release, including two bounded public capacity changes."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'.github/releases/evidence/20261116-production-public-access-contract.json'
DIGEST='ff141d7692e9390ea70600e28e20095c9fb887e93aac9598cb19876b697c3375'
OPTION='publicAccessRelease'
KIND='a3-public-access-existing-v1'
SELECTED=['getPublicEngagementClubDirectory','resolveEngagementAccessRequest','submitEngagementAccessRequest']
PUBLIC=['getPublicEngagementClubDirectory','submitEngagementAccessRequest']
PREFIX='projects/livepalmes/locations/europe-west1/functions/'
CAPACITY={'maxInstanceCount':2,'maxInstanceRequestConcurrency':4}
spec=importlib.util.spec_from_file_location('a3_common',ROOT/'tools/standard-source-policy.py')
common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
require,digest,assert_retained=common.require,common.digest,common.assert_retained

def contract():
    raw=PATH.read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest()==DIGEST,'Contrat A3 modifie')
    c=json.loads(raw)
    require(c['selected']==SELECTED and c['capacityChanges']=={n:CAPACITY for n in PUBLIC}
            and c['inventoryCount']==119 and c['newFunctions']==c['deletedFunctions']==[]
            and c['bindingChanges'] is False,'Contrat A3 hors perimetre')
    return c

def enabled(value):return OPTION in value

def approved(value):
    if not enabled(value):return []
    c=contract()
    require(value=={**c['request'],OPTION:{'contractSha256':DIGEST}},'Demande A3 hors candidat ou options fermees')
    return c['selected']

def paths(value,changed,git):
    if not enabled(value):return
    approved(value);c=contract()
    require(digest(sorted(changed))==c['changedPathsSha256'],'Diff complet A3 different')
    for name,pair in c['protectedBlobs'].items():
        require([git('rev-parse',ref+':'+name) for ref in [c['productionCommit'],c['candidate']]]==pair,'Source/configuration A3 differente: '+name)

def expected_manifest(origins):
    c=contract();require(len(origins)==119 and digest(origins)==c['originsSha256'],'Origines A3 differentes')
    return {'schema':1,'kind':KIND,'requestSha256':digest({**c['request'],OPTION:{'contractSha256':DIGEST}}),
            **{k:c[k] for k in ['candidate','productionRun','productionCommit','productionHosting','testRun','selected','inventoryCount',
                               'capacityChanges','staticPaths','controls','approval','bindingChanges','newFunctions','deletedFunctions']},
            'origins':origins,'configurationChanges':True,'businessInvocations':0,'mailPause':False,
            'contractSha256':DIGEST,'selectionProofSha256':c['selectionProofSha256']}

def validate_manifest(value):
    require(value==expected_manifest(value.get('origins',[])),'Manifeste A3 hors contrat')
    return value

def manifest(directory,request=None):
    directory=Path(directory);request=request or json.loads((directory/'request.json').read_text())
    approved(request);return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))

def freeze(value,baseline,functions,selected,fingerprint,legacy,git,changed):
    approved(value);c=contract();paths(value,changed,git)
    require(baseline=={'productionRun':c['productionRun'],'productionCommit':c['productionCommit'],'source':'verified-publication-artifacts'},'Baseline A3 non authentifiee')
    origins=sorted(functions.values(),key=lambda r:r['name'])
    require(digest(origins)==c['originsSha256'],'Inventaire A3 hors reference')
    history=common.load('history-source-provenance.py');history.checkpoint()
    alias=history.resolve_git_arguments(ROOT,(c['productionCommit'],))[0]
    verifier=ROOT/'tools/a3-production-selection-proof.js'
    require(hashlib.sha256(verifier.read_bytes().replace(b'\r\n',b'\n')).hexdigest()==c['selectionVerifierSha256'],'Verificateur A3 modifie')
    proof=json.loads(subprocess.check_output(['node',str(verifier),str(ROOT),c['candidate'],alias,c['productionCommit']],input=json.dumps(origins).encode()))
    require(digest(proof)==c['selectionProofSha256'] and sorted(selected)==proof['selected']==SELECTED
            and proof['inventoryCount']==119 and len(proof['rawLegacyChanged'])==119,'Selection A3 non demontree')
    require(digest(legacy(c['candidate']))==c['candidateLegacySha256']
            and digest(fingerprint(c['candidate']))==c['candidateOptimizedSha256'],'Empreintes A3 differentes')
    return expected_manifest(origins)

def configuration(function):return common.configuration(function)

def runtime(function):
    name=function.get('name','').split('/')[-1]
    require(name in SELECTED and function['name']==PREFIX+name and function.get('state')=='ACTIVE'
            and function.get('environment')=='GEN_2' and function.get('buildConfig',{}).get('runtime')=='nodejs22'
            and function['buildConfig'].get('entryPoint')==name,'Runtime A3 different')
    checks=common.load('preflight-production-release.py')
    service=function.get('serviceConfig',{})
    check=checks.access_request_runtime_allowed if name!='getPublicEngagementClubDirectory' else checks.ordinary_runtime_allowed
    require(check(service),'Liaisons/configuration A3 inattendues')

def initial(functions,value):
    validate_manifest(value);common.initial(functions,value,runtime_validator=runtime)

def assert_selected(before,after,candidate):
    require(candidate==contract()['candidate'],'Candidat A3 different')
    runtime(before);runtime(after);name=before['name'].split('/')[-1]
    a,b=copy.deepcopy(before),copy.deepcopy(after)
    if name in PUBLIC:
        require(all(after['serviceConfig'].get(k)==v for k,v in CAPACITY.items()),'Capacite publique A3 differente')
        for f in [a,b]:
            for k in CAPACITY:f['serviceConfig'].pop(k,None)
    common.assert_selected(a,b,candidate,runtime_validator=runtime)

def publication_patch(before,source,candidate):
    require(candidate==contract()['candidate'],'Candidat A3 different');runtime(before)
    body={'name':before['name'],'buildConfig':{'source':{'storageSource':source}},
          'labels':{**before.get('labels',{}),'livepalmes-commit':candidate}}
    mask='build_config.source,labels'
    if before['name'].split('/')[-1] in PUBLIC:
        body['serviceConfig']=dict(CAPACITY)
        mask+=',service_config.max_instance_count,service_config.max_instance_request_concurrency'
    return body,mask

def rollback_patch(before,source):
    runtime(before)
    body={'name':before['name'],'buildConfig':{'source':{'storageSource':source}},'labels':before.get('labels',{})}
    mask='build_config.source,labels'
    if before['name'].split('/')[-1] in PUBLIC:
        # Explicit leaf masks reset an originally absent scalar to protobuf zero.
        # A parent message mask alone merges omitted fields and is insufficient.
        body['serviceConfig']={k:before.get('serviceConfig',{}).get(k,0) for k in CAPACITY}
        mask+=',service_config.max_instance_count,service_config.max_instance_request_concurrency'
    return body,mask

def assert_rollback(before,after):
    runtime(before);runtime(after)
    expected,observed=configuration(before),configuration(after)
    if before['name'].split('/')[-1] in PUBLIC:
        for field in CAPACITY:
            if field not in before.get('serviceConfig',{}) and observed['serviceConfig'].get(field)==0:
                observed['serviceConfig'].pop(field)
    require(expected==observed and before.get('labels',{})==after.get('labels',{}),
            'Retour arriere A3 : capacite/configuration/binding different')

def rollback_snapshot(functions):
    rows={f['name'].split('/')[-1]:f for f in functions}
    require(set(SELECTED).issubset(rows),'Source de retour arriere A3 absente')
    result={}
    for name in SELECTED:
        body,mask=rollback_patch(rows[name],{})
        result[name]={'updateMask':mask,'capacityReset':body.get('serviceConfig',{})}
    return result

def capacity_snapshot(functions):
    return {f['name'].split('/')[-1]:{k:{'present':k in f.get('serviceConfig',{}),'value':f.get('serviceConfig',{}).get(k)} for k in CAPACITY}
            for f in functions if f['name'].split('/')[-1] in SELECTED}

def guard(directory,after=False):
    directory=Path(directory);value=manifest(directory);observed=common.controls()
    require(observed==value['controls'],'Derive mails/automates/modeles A3')
    witness=directory/'standard-controls-before.json'
    if witness.exists():require(json.loads(witness.read_text())==observed,'Temoin initial A3 different')
    else:
        require(not after,'Temoin initial A3 absent');witness.write_text(json.dumps(observed))
    if after:(directory/'standard-controls-after.json').write_text(json.dumps(observed))

def restore_witness(directory,source):raise ValueError('Reprise A3 exige un nouvel examen avant ecriture')
