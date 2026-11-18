"""Closed admin.full MFA PROD sources and separately projected PROD Rules; inactive until sealed."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261118-production-admin-mfa-contract.json'
DIGEST = 'UNSEALED_ADMIN_MFA_PRODUCTION_CONTRACT'
OPTION = 'adminMfaRelease'
KIND = 'a34b-admin-mfa-existing-v1'
CANDIDATE = 'UNSEALED_ADMIN_MFA_PRODUCTION_CANDIDATE'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('session_prepare_common', ROOT/'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec); spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = PATH.read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat PROD MFA absent/non scelle')
    c = json.loads(raw)
    require(isinstance(c,dict) and type(c.get('schema')) is int and c['schema'] == 1, 'Schema du contrat PROD MFA invalide')
    require(c['candidate'] == CANDIDATE and c['applicationAnchor'] == '02454e82658278b4e3450ad229e65147b4372711'
            and c['kind'] == KIND and c['phase'] == 'enforce-admin-full-mfa'
            and c['productionEnforcement'] is True and c['rulesDeployment'] is True
            and c['inventoryCount'] == 119 and len(c['selected']) == 110
            and c['selected'] == sorted(set(c['selected'])) and c['newFunctions'] == c['deletedFunctions'] == []
            and c['configurationChanges'] is c['bindingChanges'] is False, 'Perimetre PROD MFA different')
    for filename,key in [('admin-mfa-production-capabilities.py','capabilityModuleSha256'),
                         ('portal-session-enforcement-capabilities.py','runtimePrimitiveSha256'),
                         ('publish-test-admin-mfa-sources.py','sourceControllerSha256'),
                         ('access-revocation-production-policy.py','administrativeReaderModuleSha256'),
                         ('admin-mfa-production-rules.py','rulesModuleSha256'),
                         ('admin-mfa-rules-policy.py','rulesPolicySha256')]:
        require(hashlib.sha256((ROOT/'tools'/filename).read_bytes().replace(b'\r\n',b'\n')).hexdigest() == c[key],
                'Module PROD MFA modifie : '+filename)
    engines = c.get('fingerprintEnginesSha256')
    expected_engines = {'tools/release-function-fingerprints.js','tools/release-test-function-fingerprints.js',
                        'tools/release-production-function-fingerprints.js','tools/backend-factory-model.js',
                        'tools/history-source-provenance.py','tests/helpers/lexical-references.js'}
    require(isinstance(engines,dict) and set(engines) == expected_engines, 'Ensemble des six moteurs MFA different')
    for filename,sha in engines.items():
        require(hashlib.sha256((ROOT/filename).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==sha,
                'Moteur de selection MFA modifie : '+filename)
    require(hashlib.sha256((ROOT/'.github/releases/evidence/20261118-test-admin-mfa-contract.json').read_bytes().replace(b'\r\n',b'\n')).hexdigest() == c['testContractSha256'], 'Contrat TEST MFA modifie')
    q = c['selectionQualification']
    require(set(q) == {'verifierFile','verifierSha256','evidenceFile','evidenceSha256'}
            and q['verifierFile'] == 'tools/admin-mfa-selection-proof.js'
            and q['evidenceFile'] == '.github/releases/evidence/20261118-admin-mfa-production-equivalence.json',
            'Qualification PROD MFA hors perimetre')
    r = c['rules']; projection = common.load('admin-mfa-rules-policy.py')
    before,after = [(ROOT/r[key]).read_text(encoding='utf-8').replace('\r\n','\n') for key in ['beforeFile','afterFile']]
    require(r['project'] == 'livepalmes' and projection.digest(before) == r['beforeSha256']
            and projection.digest(after) == r['afterSha256'], 'Empreintes Rules PROD MFA differentes')
    projection.validate(before,after,'livepalmes')
    return c

def enabled(value): return OPTION in value


def approved(value):
    if not enabled(value): return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}}, 'Demande MFA hors candidat/options')
    return c['selected']


def paths(value,changed,git):
    if not enabled(value):return
    approved(value);c=contract()
    require(digest(sorted(changed))==c['changedPathsSha256'],'Diff complet MFA different')
    for name,pair in c['protectedBlobs'].items():
        require([git('rev-parse',sha+':'+name) for sha in [c['productionCommit'],CANDIDATE]]==pair,'Source MFA hors version fermee : '+name)


def approved_rule_paths(value,changed,git):
    if not enabled(value):return set()
    paths(value,changed,git)
    require('firestore.rules' in changed,'Delta Rules MFA absent du bilan')
    return {'firestore.rules'}


def complete_selection(origins,fingerprint,legacy,inherited=None):
    c = contract()
    require(len(origins) == 119 and digest(origins) == c['originsSha256'], 'Origines PROD MFA differentes')
    source = common.load('publish-test-admin-mfa-sources.py')
    rows = source.qualify_selection(c,origins,CANDIDATE,'livepalmes',fingerprint,legacy)
    desired,base = fingerprint(CANDIDATE),fingerprint(c['productionCommit'])
    require(set(desired) == set(base), 'Declarations PROD MFA ajoutees ou supprimees')
    absent = sorted(n for n in desired if n not in {r['shortName'] for r in rows} and desired[n] != base[n])
    result = {'schema':1,'candidate':CANDIDATE,'productionRun':c['productionRun'],'inventoryCount':119,
        'selected':[r['shortName'] for r in rows if r['changed']],'rows':rows,
        'selectionQualification':c['selectionQualification'],'completeOriginsSha256':digest(origins),
        'notInstalledChanges':absent}
    require(result['selected'] == c['selected'] and absent == c['notInstalledChanges']
            and digest(result) == c['selectionProofSha256'], 'Selection PROD MFA non concordante')
    return result

def expected_manifest(rows):
    c=contract();require(digest(rows)==c['manifestOriginsSha256'],'Origines manifeste MFA alterees')
    return {'schema':1,'kind':KIND,'requestSha256':digest({**c['request'],OPTION:{'contractSha256':DIGEST}}),
        **{k:c[k] for k in ['candidate','productionRun','productionCommit','productionHosting','testRun','selected','inventoryCount',
            'staticPaths','controls','approval','configurationChanges','bindingChanges','newFunctions','deletedFunctions',
            'notInstalledChanges','productionEnforcement','rulesDeployment']},
        'origins':rows,'businessInvocations':0,'mailPause':False,'contractSha256':DIGEST,'selectionProofSha256':c['selectionProofSha256']}


def validate_manifest(value):
    require(value == expected_manifest(value.get('origins', [])), 'Manifeste MFA hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    approved(request or json.loads((directory/'request.json').read_text()))
    return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    c = contract(); paths(value, changed, git)
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                        'source': 'verified-publication-artifacts'}, 'Reference PROD MFA non authentifiee')
    cycle = common.load('release-cycle.py'); directory = Path(os.environ['PLAN'])
    proof = complete_selection(sorted(functions.values(), key=lambda f: f['name']), fingerprint, legacy,
                               None)
    require(sorted(selected) == proof['selected'], 'Selection MFA reduite ou elargie')
    cycle.write(directory/'standard-admin-mfa-selection-proof.json', proof)
    return expected_manifest(proof['rows'])


def verify_retained_backend(directory, state, selected, cycle):
    value = manifest(directory); proof = cycle.read(Path(directory)/'standard-admin-mfa-selection-proof.json')
    require(digest(proof) == contract()['selectionProofSha256'] and sorted(selected) == value['selected']
            and sorted(state['functions'], key=lambda f: f['name']) == [{k: r[k] for k in ['name','updateTime','state','revision','commit']} for r in value['origins']],
            'Revue retenue MFA hors inventaire')
    rows = [r for r in proof['rows'] if not r['changed']]; names = sorted(r['shortName'] for r in rows)
    cycle.write(Path(directory)/'excluded-backend-verification.json', {
        'suite': contract()['request']['excludedBackendEvidence']['suite'], 'method': KIND,
        'candidate': CANDIDATE, 'productionCommit': value['productionCommit'], 'productionRun': value['productionRun'],
        'result': 'success', 'networkCalls': 0, 'passedFunctions': names, 'retainedFunctions': names,
        'rawLegacyDifferenceCount': sum(r['legacyChanged'] for r in rows), 'functionReviews': rows,
        'reviewSha256': digest(rows), 'selectionProofSha256': digest(proof), 'suiteSha256': DIGEST})


def test_evidence(directory,cycle):
    directory=Path(directory);c=contract();target=directory/'admin-mfa-test-source'
    info=cycle.artifact(c['testSourceRun'],'test-backend-proof',target,'.github/workflows/livepalmes-test-mail-sources.yml')
    path=target/'test-backend-proof.json'
    source_candidate=info.get('head_sha',''); source_receipt=cycle.read(path)
    require(common.re.fullmatch('[a-f0-9]{40}',source_candidate)
            and source_receipt.get('candidate')==source_candidate
            and hashlib.sha256(path.read_bytes()).hexdigest()==c['testSourceProofSha256'],
            'Preuve sources TEST MFA incompatible')
    require(all(engine(source_candidate)==engine(CANDIDATE) for engine in [cycle.test_backend_fingerprints,
                cycle.production_selection_fingerprints,cycle.backend_fingerprints]),
            'Sources TEST MFA differentes du backend du candidat commun')
    for name,item in c['testArtifacts'].items():
        meta=cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts/{item["id"]}')
        require(meta['workflow_run']['id']==item['run'] and meta['name']==name and meta['digest']==item['digest'] and meta['expired'] is False,'Provenance TEST MFA absente')
    require(hashlib.sha256((directory/'test-proof.json').read_bytes()).hexdigest()==c['testArtifacts']['test-proof']['files']['test-proof.json'],'Preuve commune TEST MFA differente')
    source=common.load('publish-test-admin-mfa-sources.py')
    def reuse(run,name,destination,workflow):
        require(int(run)==c['testSourceRun'] and name=='test-backend-proof' and workflow=='.github/workflows/livepalmes-test-mail-sources.yml','Autre source TEST refusee')
        destination=Path(destination);destination.mkdir(parents=True,exist_ok=True);(destination/'test-backend-proof.json').write_bytes(path.read_bytes());return info
    api=SimpleNamespace(gh=lambda endpoint:{'workflow_runs':[info]},artifact=reuse,read=cycle.read,
        matching_functions=cycle.matching_functions,test_backend_fingerprints=cycle.test_backend_fingerprints)
    current=cycle.read(directory/'test-proof.json')['state'];trusted=source.trusted_revisions(directory,current,api)
    require({source.PREFIX+n for n in c['selected']}<=trusted,'Archives/revisions TEST MFA non attestees')
    rules_dir=directory/'admin-mfa-test-rules'
    rules_info=cycle.artifact(c['testRun'],'portal-session-rules-proof',rules_dir,'.github/workflows/livepalmes-test-common.yml')
    rules_path=rules_dir/'test-portal-session-rules-proof.json';proof=cycle.read(rules_path)
    require(rules_info['head_sha']==CANDIDATE and hashlib.sha256(rules_path.read_bytes()).hexdigest()==c['testArtifacts']['portal-session-rules-proof']['files'][rules_path.name]
        and proof['candidate']==CANDIDATE and proof['project']=='livepalmes-test' and proof['deployed'] is True
        and proof['before']['sha256']==c['rules']['testBeforeSha256'] and proof['after']['sha256']==c['rules']['testAfterSha256']
        and proof['productionTouched'] is False and proof['indexesDeployed'] is False and proof['businessInvocations']==0,'Protection MFA Rules TEST non attestee')


def runtime(function):
    c=contract();name=function.get('name','').removeprefix(PREFIX)
    require(name in c['selected'] and function.get('name')==PREFIX+name and function.get('state')=='ACTIVE'
        and function.get('environment')=='GEN_2' and function.get('buildConfig',{}).get('runtime')=='nodejs22'
        and function['buildConfig'].get('entryPoint')==name
        and hashlib.sha256(function.get('serviceConfig',{}).get('serviceAccountEmail','').encode()).hexdigest()==c['runtimeBindings'][name],
        'Runtime MFA different de la reference existante : '+name)


def initial(functions, value):
    validate_manifest(value); common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == CANDIDATE, 'Autre candidat enforcement refuse')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def capability_digest(proof):
    # Preserve every context field, including the exact tested candidate.
    return digest(proof)


def capabilities(kind,references=None,rollback=False):
    caps=common.load('admin-mfa-production-capabilities.py')
    if rollback:
        require(os.environ.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and os.environ.get('GITHUB_REF')=='refs/heads/main'
            and os.environ.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and os.environ.get('GITHUB_RUN_ATTEMPT')=='1'
            and os.environ.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/livepalmes-production-rollback.yml@refs/heads/main'
            and os.environ.get('CONFIRM_CODE_ROLLBACK')=='livepalmes' and os.environ.get('ADMIN_MFA_RESTORE_HOSTING')=='true',
            'Qualification retour MFA hors workflow coordonne')
        reader=common.load('access-revocation-production-policy.py');identity=reader.reader_identity(kind)
        require(identity==caps.READERS[kind],'Identite retour MFA differente')
        if kind=='backend':
            require(references is not None,'Inventaire retour MFA absent');detail=caps.runtime_permissions(references,reader._read)
        else:
            detail=reader.administrative_prerequisites([],read=reader._read);detail['authLookupLimit']=2;detail['factorMetadataRead']=False;detail['signInInvoked']=False
        proof={'schema':1,'candidate':CANDIDATE,'phase':'enforce-admin-full-mfa','kind':kind,'readerIdentitySha256':identity,
            'businessInvocations':0,'newPermissions':0,'configurationChanges':False,**detail}
    else:proof=caps.qualify(CANDIDATE,kind,references=references)
    key='backendCapabilitySha256' if kind=='backend' else 'hostingCapabilitySha256'
    require(proof['ready'] and proof['readOnly'] and capability_digest(proof)==contract()[key],'Capacites MFA differentes du contrat')
    return proof


def auth(directory,after=False,prerequisite=False):
    directory=Path(directory);value=manifest(directory);proof=capabilities('hosting')
    result={**proof,'capabilitySha256':capability_digest(proof),'contractSha256':DIGEST,'manifestSha256':digest(value),
            'run':int(os.environ['GITHUB_RUN_ID']),'toolingCommit':os.environ['GITHUB_SHA']}
    suffix='prerequisites' if prerequisite else 'after' if after else 'before'
    (directory/('standard-admin-mfa-auth-'+suffix+'.json')).write_text(json.dumps(result,sort_keys=True),encoding='utf-8')
    return result


def guard(directory,after=False):
    directory=Path(directory);value=manifest(directory);c=contract();proof=capabilities('backend')
    observed={'controls':common.controls(),'runtime':proof}
    require(observed['controls']==c['controls'],'Derive mails actifs/automates/modeles MFA')
    require(not (directory/'previous').exists(),'Reprise MFA automatique interdite')
    if '.github/workflows/livepalmes-production-release.yml@' in os.environ.get('GITHUB_WORKFLOW_REF',''):
        suffix='after' if after else 'before';path=directory/('standard-admin-mfa-auth-'+suffix+'.json')
        require(path.is_file(),'Continuite administrative MFA du meme run absente');admin=json.loads(path.read_text())
        require(admin['run']==int(os.environ['GITHUB_RUN_ID']) and admin['toolingCommit']==os.environ['GITHUB_SHA']
            and admin['contractSha256']==DIGEST and admin['manifestSha256']==digest(value)
            and admin['capabilitySha256']==c['hostingCapabilitySha256'] and admin['ready'] and admin['readOnly']
            and admin['accountOrRightChanges']==0,'Continuite administrative MFA incompatible')
    path=directory/'standard-admin-mfa-controls-before.json'
    if path.exists():require(json.loads(path.read_text())==observed,'Temoin MFA different')
    else:
        require(not after,'Temoin MFA initial absent');path.write_text(json.dumps(observed,sort_keys=True),encoding='utf-8')
    if after:(directory/'standard-admin-mfa-controls-after.json').write_text(json.dumps(observed,sort_keys=True),encoding='utf-8')


def restore_witness(directory, guards):
    raise ValueError('Reprise automatique MFA non autorisee')


def backend_readiness(directory):
    directory=Path(directory);value=manifest(directory);proof=json.loads((directory/'standard-admin-mfa-controls-before.json').read_text())
    return {'contractSha256':DIGEST,'manifestSha256':digest(value),'selected':value['selected'],'retainedFunctions':9,
            'runtime':proof['runtime'],'controls':proof['controls']}


def readiness(directory,preparation,run):
    directory=Path(directory);value=manifest(directory);c=contract();cycle=common.load('release-cycle.py')
    require(str(run).isdigit() and int(run)>0 and str(preparation).isdigit() and int(preparation)>0,'Preflight/prerequis MFA officiels requis')
    pre=cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{preparation}')
    require(pre['head_sha']==os.environ['GITHUB_SHA'] and pre['conclusion']=='success' and pre['run_attempt']==1
        and pre['path']=='.github/workflows/livepalmes-production-preflight.yml','Preflight MFA du meme outillage absent')
    for kind in ['backend','hosting']:
        target=directory/('standard-admin-mfa-ready-'+kind)
        info=cycle.artifact(run,'production-prerequisites-'+kind,target,'.github/workflows/livepalmes-production-readiness.yml')
        report=cycle.read(target/('prerequisites-'+kind+'.json'));proof=report.get('adminMfa',{})
        require(info['head_sha']==os.environ['GITHUB_SHA'] and report['planRun']==int(preparation) and report['candidate']==CANDIDATE
            and report['kind']==kind and report['ready'] is True and report['readOnly'] is True and report['missingPermissions']==[]
            and proof.get('contractSha256')==DIGEST and proof.get('manifestSha256')==digest(value),'Prerequis MFA incompatibles')
        if kind=='backend':
            require(proof.get('selected')==c['selected'] and proof.get('retainedFunctions')==9 and proof.get('controls')==c['controls']
                and capability_digest(proof.get('runtime',{}))==c['backendCapabilitySha256'],'Preuve des 110 runtimes MFA absente')
        else:
            rules=report.get('adminMfaRules',{})
            require(proof.get('capabilitySha256')==c['hostingCapabilitySha256'] and proof.get('ready') and proof.get('accountOrRightChanges')==0
                and rules.get('contractSha256')==DIGEST and rules.get('manifestSha256')==digest(value)
                and rules.get('before')==c['rules']['observedBefore'] and rules.get('expectedAfterSha256')==c['rules']['afterSha256']
                and rules.get('readOnly') is True,'Continuite/regles MFA non demontrees')



def rollback_guard(backup,after_report,functions,state,apply=False):
    backup=Path(backup);value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    report=json.loads((backup/'report.json').read_text());c=contract()
    require(report['candidate']==after_report['candidate']==CANDIDATE and after_report['errors']==[]
        and report.get('sourcePolicyKind')==KIND and report.get('standardSourceManifestSha256')==digest(value)
        and report['newFunctions']==[] and {f['name'] for f in report['functions']}=={PREFIX+n for n in c['selected']},'Retour MFA hors sauvegarde')
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())}
    current={f['name']:f for f in functions};expected={f['name']:f for f in after_report['functions']}
    require(len(functions)==len(current)==len(original)==len(expected)==119 and set(current)==set(original)==set(expected)
        and all(state.identity(f)==expected[n] for n,f in current.items()),'Derive inventaire complet avant retour MFA')
    for n,f in current.items():
        require(configuration(f)==configuration(original[n]),'Configuration modifiee avant retour MFA : '+n)
        if n.removeprefix(PREFIX) in c['selected']:assert_selected(original[n],f,CANDIDATE)
        else:require(state.identity(f)==state.identity(original[n]) and f.get('labels')==original[n].get('labels'),'Fonction retenue modifiee avant retour MFA')
    capabilities('backend',references=functions,rollback=True)
    require(common.controls()==c['controls'],'Temoins mails/automates modifies avant retour MFA')
    if apply:
        proof_path=backup/'admin-mfa-rules/rollback-validated.json';require(proof_path.is_file(),'Retour code MFA seul interdit : preuve Rules absente')
        proof=json.loads(proof_path.read_text())
        require(proof['contractSha256']==DIGEST and proof['manifestSha256']==digest(value)
            and proof['rollbackRun']==int(os.environ['GITHUB_RUN_ID']) and proof['releaseRun']==int(os.environ['RELEASE_RUN']),
            'Preuve Rules du meme retour MFA absente')


def rollback_hosting_guard(backup,current):
    backup=Path(backup);value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    path=backup/'admin-mfa-rules/rollback-validated.json';require(path.is_file(),'Retour Hosting MFA seul interdit')
    proof=json.loads(path.read_text());expected=proof['hostingAfter']
    require(proof['contractSha256']==DIGEST and proof['manifestSha256']==digest(value)
        and proof['rollbackRun']==int(os.environ['GITHUB_RUN_ID'])
        and {'name':current['name'],'version':current['version']['name']}==expected,'Derive Hosting avant retour MFA')


def rollback_patch(before,source):
    runtime(before)
    return {'name':before['name'],'buildConfig':{'source':{'storageSource':source}},'labels':before.get('labels',{})},'build_config.source,labels'


def assert_rollback(before,after):
    runtime(after)
    require(configuration(before)==configuration(after) and before.get('labels',{})==after.get('labels',{}),
        'Retour MFA a modifie configuration/binding/labels')


def rollback_complete(backup,state,archives):
    backup=Path(backup);value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()));c=contract()
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())};functions=state.inventory();current={f['name']:f for f in functions}
    require(len(functions)==len(current)==len(original)==119 and set(current)==set(original),'Inventaire retour MFA incomplet')
    publisher=common.load('standard-source-publish.py');attestations={}
    for n,f in current.items():
        require(configuration(f)==configuration(original[n]),'Configuration retour MFA differente')
        if n.removeprefix(PREFIX) in c['selected']:
            assert_rollback(original[n],f);attestations[n]=publisher.attest(f,archives[n].read_bytes(),state)
        else:require(state.identity(f)==state.identity(original[n]) and f.get('labels')==original[n].get('labels'),'Fonction conservee modifiee par retour MFA')
    capabilities('backend',references=functions,rollback=True);require(common.controls()==c['controls'],'Temoins modifies par retour MFA')
    (backup/'admin-mfa-rules/rollback-sources-restored.json').write_text(json.dumps({
        'candidate':CANDIDATE,'contractSha256':DIGEST,'manifestSha256':digest(value),'rollbackRun':int(os.environ['GITHUB_RUN_ID']),
        'allSourcesRestored':True,'functions':attestations,'configurationChanges':False,'businessInvocations':0},indent=2),encoding='utf-8')


if __name__ == '__main__':
    mode,directory,*args=sys.argv[1:]
    request=json.loads((Path(directory)/'request.json').read_text())
    if enabled(request):
        if mode=='readiness' and len(args)==2:readiness(directory,*args)
        elif mode in {'auth-before','auth-after'} and not args:auth(directory,mode=='auth-after')
        elif mode=='guard-after' and not args:guard(directory,after=True)
        else:raise ValueError('Mode MFA inconnu')
