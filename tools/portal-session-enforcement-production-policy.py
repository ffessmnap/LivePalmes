"""One closed A3.4a B release; existing sources and a separately sealed Rules patch."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261117-production-portal-session-enforcement-contract.json'
DIGEST = '6a8b8ba4ee06885f4a6be54da3b52284f2af5e25b593ecfc0af264f3c708945d'
OPTION = 'portalSessionEnforcementRelease'
KIND = 'a34-portal-session-enforcement-existing-v1'
CANDIDATE = '689d523b423615cb1faad9f564c1a6b2f44f1b96'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('session_prepare_common', ROOT/'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec); spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw=PATH.read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest()==DIGEST,'Contrat PROD B modifie')
    c=json.loads(raw)
    for filename,key in [('portal-session-enforcement-capabilities.py','capabilityModuleSha256'),('access-revocation-production-policy.py','administrativeReaderModuleSha256'),('portal-session-enforcement-production-rules.py','rulesModuleSha256')]:
        require(hashlib.sha256((ROOT/'tools'/filename).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==c[key],'Lecteur B modifie')
    for filename,sha in c['fingerprintEnginesSha256'].items():
        require(hashlib.sha256((ROOT/'tools'/filename).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==sha,'Moteur de selection B modifie')
    require(c['candidate']==CANDIDATE and len(c['selected'])==102 and c['selected']==sorted(set(c['selected']))
        and c['phase']=='enforce-portal-session' and c['productionEnforcement'] is True and c['rulesDeployment'] is True
        and c['inventoryCount']==119 and c['newFunctions']==c['deletedFunctions']==[]
        and c['configurationChanges'] is c['bindingChanges'] is False,'Perimetre ferme B different')
    r=c['rules'];before=(ROOT/r['beforeFile']).read_bytes().replace(b'\r\n',b'\n');after=(ROOT/r['afterFile']).read_bytes().replace(b'\r\n',b'\n')
    needle=b'      allow get: if canReadAccessDirectorySnapshot();'
    replacement=b'      // All portal snapshots pass through the server session and current scope.\n      allow get: if false;'
    require(hashlib.sha256(before).hexdigest()==r['beforeSha256']=='285dd688801807bd08d932ee98f10f9f973e1f9dcc900cd38bbc27081f0716f8'
        and hashlib.sha256(after).hexdigest()==r['afterSha256']=='ef955e075af13b4de189401d3f148a807e99704fcf83651c85fe72598caf44f2'
        and before.count(needle)==1 and before.replace(needle,replacement,1)==after,'Seule la fermeture annuaire PROD est autorisee')
    return c


def enabled(value): return OPTION in value


def approved(value):
    if not enabled(value): return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}}, 'Demande session B hors candidat/options')
    return c['selected']


def paths(value,changed,git):
    if not enabled(value):return
    approved(value);c=contract()
    require(digest(sorted(changed))==c['changedPathsSha256'],'Diff complet B different')
    for name,pair in c['protectedBlobs'].items():
        require([git('rev-parse',sha+':'+name) for sha in [c['productionCommit'],CANDIDATE]]==pair,'Source B hors version fermee : '+name)


def approved_rule_paths(value,changed,git):
    if not enabled(value):return set()
    paths(value,changed,git)
    require('firestore.rules' in changed,'Fermeture annuaire absente du bilan B')
    return {'firestore.rules'}


def historical_proof(directory, cycle):
    c = contract()['historicalProof']; directory = Path(directory)/'session-enforcement-inherited'
    target = directory/'excluded-backend-verification.json'
    if not target.exists():
        cycle.artifact(c['run'], 'release-plan', directory, '.github/workflows/livepalmes-production-release.yml')
        metadata = cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts/{c["artifactId"]}')
        require(metadata['workflow_run']['id'] == c['run'] and metadata['name'] == 'release-plan'
                and metadata['digest'] == c['artifactDigest'] and metadata['expired'] is False,
                'Provenance de la preuve heritee absente')
    require(hashlib.sha256(target.read_bytes()).hexdigest() == c['fileSha256'], 'Preuve heritee alteree')
    value = json.loads(target.read_text())
    verifier = ROOT/'tools/access-revocation-production-proof.js'
    require(value['result'] == 'success' and value['suiteSha256'] == c['selectionVerifierSha256']
            and hashlib.sha256(verifier.read_bytes().replace(b'\r\n', b'\n')).hexdigest() == c['selectionVerifierSha256'],
            'Verificateur de la preuve heritee incompatible')
    return value


def complete_selection(origins,fingerprint,legacy,inherited):
    c=contract();require(len(origins)==119 and digest(origins)==c['originsSha256'],'Origines PROD B differentes')
    desired,conservative=fingerprint(CANDIDATE),legacy(CANDIDATE)
    base,oldbase=fingerprint(c['productionCommit']),legacy(c['productionCommit'])
    require(set(desired)==set(base)==set(conservative)==set(oldbase),'Declaration B ajoutee ou retiree')
    declared=sorted(n for n in desired if desired[n]!=base[n])
    require(declared==c['declaredChanges']==sorted(n for n in conservative if conservative[n]!=oldbase[n]),'Delta B non concordant')
    names={f['name'].split('/')[-1] for f in origins}
    require(sorted(set(declared)&names)==c['selected'] and sorted(set(declared)-names)==c['notInstalledChanges'],'Consommateurs B hors inventaire')
    oldrows={r['name']:r for r in inherited['functionReviews']};rows=[];qualified=[]
    for f in origins:
        n=f['name'].split('/')[-1];require(f['state']=='ACTIVE' and f['revision'] and f['updateTime'] and n in desired,'Origine B incomplete')
        previous,old=fingerprint(f['commit']),legacy(f['commit']);require(n in previous and n in old,'Origine B inconnue')
        a,b,x,y=previous[n],desired[n],old[n],conservative[n];changed,lc=a!=b,x!=y
        method='both-comparators-changed' if changed else 'both-comparators-unchanged'
        if changed!=lc:
            r=oldrows.get(n,{})
            require(not changed and lc and r.get('legacyChanged') is True and r.get('commit')==f['commit']
                and r.get('revision')==f['revision'] and r.get('legacyBefore')==x and r.get('legacyAfter')==y
                and r.get('optimizedBefore')==a and r.get('optimizedAfter')==b
                and isinstance(r.get('normalizedBefore'),str) and len(r['normalizedBefore'])==64
                and r['normalizedBefore']==r.get('normalizedAfter') and base[n]==b and oldbase[n]==y,
                'Ecart B non qualifie : aucune reduction de selection permise : '+n)
            qualified.append(n);method='authenticated-inherited-equivalence-unchanged-since-production'
        rows.append({**f,'shortName':n,'before':a,'after':b,'legacyBefore':x,'legacyAfter':y,'changed':changed,'legacyChanged':lc,'method':method})
    result={'schema':1,'candidate':CANDIDATE,'productionRun':c['productionRun'],'inventoryCount':119,
        'selected':[r['shortName'] for r in rows if r['changed']],'inheritedNames':qualified,'rows':rows,
        'historicalProof':c['historicalProof'],'completeOriginsSha256':digest(origins),'declaredChanged':declared,'notInstalledChanges':c['notInstalledChanges']}
    require(result['selected']==c['selected'] and digest(result)==c['selectionProofSha256'],'Selection B incomplete ou differente')
    return result


def expected_manifest(rows):
    c=contract();require(digest(rows)==c['manifestOriginsSha256'],'Origines manifeste B alterees')
    return {'schema':1,'kind':KIND,'requestSha256':digest({**c['request'],OPTION:{'contractSha256':DIGEST}}),
        **{k:c[k] for k in ['candidate','productionRun','productionCommit','productionHosting','testRun','selected','inventoryCount',
            'staticPaths','controls','approval','configurationChanges','bindingChanges','newFunctions','deletedFunctions',
            'notInstalledChanges','productionEnforcement','rulesDeployment']},
        'origins':rows,'businessInvocations':0,'mailPause':False,'contractSha256':DIGEST,'selectionProofSha256':c['selectionProofSha256']}


def validate_manifest(value):
    require(value == expected_manifest(value.get('origins', [])), 'Manifeste session B hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    approved(request or json.loads((directory/'request.json').read_text()))
    return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    c = contract(); paths(value, changed, git)
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                        'source': 'verified-publication-artifacts'}, 'Reference PROD session B non authentifiee')
    cycle = common.load('release-cycle.py'); directory = Path(os.environ['PLAN'])
    proof = complete_selection(sorted(functions.values(), key=lambda f: f['name']), fingerprint, legacy,
                               historical_proof(directory, cycle))
    require(sorted(selected) == proof['selected'], 'Selection B reduite ou elargie')
    cycle.write(directory/'standard-session-enforcement-selection-proof.json', proof)
    return expected_manifest(proof['rows'])


def verify_retained_backend(directory, state, selected, cycle):
    value = manifest(directory); proof = cycle.read(Path(directory)/'standard-session-enforcement-selection-proof.json')
    require(digest(proof) == contract()['selectionProofSha256'] and sorted(selected) == value['selected']
            and sorted(state['functions'], key=lambda f: f['name']) == [{k: r[k] for k in ['name','updateTime','state','revision','commit']} for r in value['origins']],
            'Revue retenue session B hors inventaire')
    rows = [r for r in proof['rows'] if not r['changed']]; names = sorted(r['shortName'] for r in rows)
    cycle.write(Path(directory)/'excluded-backend-verification.json', {
        'suite': contract()['request']['excludedBackendEvidence']['suite'], 'method': KIND,
        'candidate': CANDIDATE, 'productionCommit': value['productionCommit'], 'productionRun': value['productionRun'],
        'result': 'success', 'networkCalls': 0, 'passedFunctions': names, 'retainedFunctions': names,
        'rawLegacyDifferenceCount': sum(r['legacyChanged'] for r in rows), 'functionReviews': rows,
        'reviewSha256': digest(rows), 'selectionProofSha256': digest(proof), 'suiteSha256': DIGEST})


def test_evidence(directory,cycle):
    directory=Path(directory);c=contract();target=directory/'session-enforcement-test-source'
    info=cycle.artifact(c['testSourceRun'],'test-backend-proof',target,'.github/workflows/livepalmes-test-mail-sources.yml')
    path=target/'test-backend-proof.json'
    require(info['head_sha']==CANDIDATE and hashlib.sha256(path.read_bytes()).hexdigest()==c['testSourceProofSha256'],'Preuve sources TEST B incompatible')
    for name,item in c['testArtifacts'].items():
        meta=cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts/{item["id"]}')
        require(meta['workflow_run']['id']==item['run'] and meta['name']==name and meta['digest']==item['digest'] and meta['expired'] is False,'Provenance TEST B absente')
    require(hashlib.sha256((directory/'test-proof.json').read_bytes()).hexdigest()==c['testArtifacts']['test-proof']['files']['test-proof.json'],'Preuve commune TEST B differente')
    source=common.load('publish-test-portal-session-enforcement.py')
    def reuse(run,name,destination,workflow):
        require(int(run)==c['testSourceRun'] and name=='test-backend-proof' and workflow=='.github/workflows/livepalmes-test-mail-sources.yml','Autre source TEST refusee')
        destination=Path(destination);destination.mkdir(parents=True,exist_ok=True);(destination/'test-backend-proof.json').write_bytes(path.read_bytes());return info
    api=SimpleNamespace(gh=lambda endpoint:{'workflow_runs':[info]},artifact=reuse,read=cycle.read,
        matching_functions=cycle.matching_functions,test_backend_fingerprints=cycle.test_backend_fingerprints)
    current=cycle.read(directory/'test-proof.json')['state'];trusted=source.trusted_revisions(directory,current,api)
    require({source.PREFIX+n for n in c['selected']}<=trusted,'Archives/revisions TEST B non attestees')
    rules_dir=directory/'session-enforcement-test-rules'
    rules_info=cycle.artifact(c['testRun'],'portal-session-rules-proof',rules_dir,'.github/workflows/livepalmes-test-common.yml')
    rules_path=rules_dir/'test-portal-session-rules-proof.json';proof=cycle.read(rules_path)
    require(rules_info['head_sha']==CANDIDATE and hashlib.sha256(rules_path.read_bytes()).hexdigest()==c['testArtifacts']['portal-session-rules-proof']['files'][rules_path.name]
        and proof['candidate']==CANDIDATE and proof['project']=='livepalmes-test' and proof['deployed'] is True
        and proof['before']['sha256']==c['rules']['testBeforeSha256'] and proof['after']['sha256']==c['rules']['testAfterSha256']
        and proof['productionTouched'] is False and proof['indexesDeployed'] is False and proof['businessInvocations']==0,'Fermeture Rules TEST B non attestee')


def runtime(function):
    c=contract();name=function.get('name','').removeprefix(PREFIX)
    require(name in c['selected'] and function.get('name')==PREFIX+name and function.get('state')=='ACTIVE'
        and function.get('environment')=='GEN_2' and function.get('buildConfig',{}).get('runtime')=='nodejs22'
        and function['buildConfig'].get('entryPoint')==name
        and hashlib.sha256(function.get('serviceConfig',{}).get('serviceAccountEmail','').encode()).hexdigest()==c['runtimeBindings'][name],
        'Runtime B different de la reference existante : '+name)


def initial(functions, value):
    validate_manifest(value); common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == CANDIDATE, 'Autre candidat enforcement refuse')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def capabilities(kind,references=None,rollback=False):
    caps=common.load('portal-session-enforcement-capabilities.py')
    if rollback:
        require(os.environ.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and os.environ.get('GITHUB_REF')=='refs/heads/main'
            and os.environ.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and os.environ.get('GITHUB_RUN_ATTEMPT')=='1'
            and os.environ.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/livepalmes-production-rollback.yml@refs/heads/main'
            and os.environ.get('CONFIRM_CODE_ROLLBACK')=='livepalmes' and os.environ.get('B_RESTORE_HOSTING')=='true',
            'Qualification retour B hors workflow coordonne')
        reader=common.load('access-revocation-production-policy.py');identity=reader.reader_identity(kind)
        require(identity==caps.READERS[kind],'Identite retour B differente')
        if kind=='backend':
            require(references is not None,'Inventaire retour B absent');detail=caps.runtime_permissions(references,reader._read)
        else:
            detail=reader.administrative_prerequisites([],read=reader._read);detail['authLookupLimit']=2
        proof={'schema':1,'candidate':CANDIDATE,'phase':'enforce-portal-session','kind':kind,'readerIdentitySha256':identity,
            'businessInvocations':0,'newPermissions':0,'configurationChanges':False,**detail}
    else:proof=caps.qualify(CANDIDATE,kind,references=references)
    key='backendCapabilitySha256' if kind=='backend' else 'hostingCapabilitySha256'
    require(proof['ready'] and proof['readOnly'] and digest(proof)==contract()[key],'Capacites B differentes du contrat')
    return proof


def auth(directory,after=False,prerequisite=False):
    directory=Path(directory);value=manifest(directory);proof=capabilities('hosting')
    result={**proof,'capabilitySha256':digest(proof),'contractSha256':DIGEST,'manifestSha256':digest(value),
            'run':int(os.environ['GITHUB_RUN_ID']),'toolingCommit':os.environ['GITHUB_SHA']}
    suffix='prerequisites' if prerequisite else 'after' if after else 'before'
    (directory/('standard-session-enforcement-auth-'+suffix+'.json')).write_text(json.dumps(result,sort_keys=True),encoding='utf-8')
    return result


def guard(directory,after=False):
    directory=Path(directory);value=manifest(directory);c=contract();proof=capabilities('backend')
    observed={'controls':common.controls(),'runtime':proof}
    require(observed['controls']==c['controls'],'Derive mails actifs/automates/modeles B')
    require(not (directory/'previous').exists(),'Reprise B automatique interdite')
    if '.github/workflows/livepalmes-production-release.yml@' in os.environ.get('GITHUB_WORKFLOW_REF',''):
        suffix='after' if after else 'before';path=directory/('standard-session-enforcement-auth-'+suffix+'.json')
        require(path.is_file(),'Continuite administrative B du meme run absente');admin=json.loads(path.read_text())
        require(admin['run']==int(os.environ['GITHUB_RUN_ID']) and admin['toolingCommit']==os.environ['GITHUB_SHA']
            and admin['contractSha256']==DIGEST and admin['manifestSha256']==digest(value)
            and admin['capabilitySha256']==c['hostingCapabilitySha256'] and admin['ready'] and admin['readOnly']
            and admin['accountOrRightChanges']==0,'Continuite administrative B incompatible')
    path=directory/'standard-session-enforcement-controls-before.json'
    if path.exists():require(json.loads(path.read_text())==observed,'Temoin B different')
    else:
        require(not after,'Temoin B initial absent');path.write_text(json.dumps(observed,sort_keys=True),encoding='utf-8')
    if after:(directory/'standard-session-enforcement-controls-after.json').write_text(json.dumps(observed,sort_keys=True),encoding='utf-8')


def restore_witness(directory, guards):
    raise ValueError('Reprise automatique session B non autorisee')


def backend_readiness(directory):
    directory=Path(directory);value=manifest(directory);proof=json.loads((directory/'standard-session-enforcement-controls-before.json').read_text())
    return {'contractSha256':DIGEST,'manifestSha256':digest(value),'selected':value['selected'],'retainedFunctions':17,
            'runtime':proof['runtime'],'controls':proof['controls']}


def readiness(directory,preparation,run):
    directory=Path(directory);value=manifest(directory);c=contract();cycle=common.load('release-cycle.py')
    require(str(run).isdigit() and int(run)>0 and str(preparation).isdigit() and int(preparation)>0,'Preflight/prerequis B officiels requis')
    pre=cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{preparation}')
    require(pre['head_sha']==os.environ['GITHUB_SHA'] and pre['conclusion']=='success' and pre['run_attempt']==1
        and pre['path']=='.github/workflows/livepalmes-production-preflight.yml','Preflight B du meme outillage absent')
    for kind in ['backend','hosting']:
        target=directory/('standard-session-enforcement-ready-'+kind)
        info=cycle.artifact(run,'production-prerequisites-'+kind,target,'.github/workflows/livepalmes-production-readiness.yml')
        report=cycle.read(target/('prerequisites-'+kind+'.json'));proof=report.get('portalSessionEnforcement',{})
        require(info['head_sha']==os.environ['GITHUB_SHA'] and report['planRun']==int(preparation) and report['candidate']==CANDIDATE
            and report['kind']==kind and report['ready'] is True and report['readOnly'] is True and report['missingPermissions']==[]
            and proof.get('contractSha256')==DIGEST and proof.get('manifestSha256')==digest(value),'Prerequis B incompatibles')
        if kind=='backend':
            require(proof.get('selected')==c['selected'] and proof.get('retainedFunctions')==17 and proof.get('controls')==c['controls']
                and digest(proof.get('runtime',{}))==c['backendCapabilitySha256'],'Preuve des 102 runtimes B absente')
        else:
            rules=report.get('portalSessionEnforcementRules',{})
            require(proof.get('capabilitySha256')==c['hostingCapabilitySha256'] and proof.get('ready') and proof.get('accountOrRightChanges')==0
                and rules.get('contractSha256')==DIGEST and rules.get('manifestSha256')==digest(value)
                and rules.get('before')==c['rules']['observedBefore'] and rules.get('expectedAfterSha256')==c['rules']['afterSha256']
                and rules.get('readOnly') is True,'Continuite/regles B non demontrees')



def rollback_guard(backup,after_report,functions,state,apply=False):
    backup=Path(backup);value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    report=json.loads((backup/'report.json').read_text());c=contract()
    require(report['candidate']==after_report['candidate']==CANDIDATE and after_report['errors']==[]
        and report.get('sourcePolicyKind')==KIND and report.get('standardSourceManifestSha256')==digest(value)
        and report['newFunctions']==[] and {f['name'] for f in report['functions']}=={PREFIX+n for n in c['selected']},'Retour B hors sauvegarde')
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())}
    current={f['name']:f for f in functions};expected={f['name']:f for f in after_report['functions']}
    require(len(functions)==len(current)==len(original)==len(expected)==119 and set(current)==set(original)==set(expected)
        and all(state.identity(f)==expected[n] for n,f in current.items()),'Derive inventaire complet avant retour B')
    for n,f in current.items():
        require(configuration(f)==configuration(original[n]),'Configuration modifiee avant retour B : '+n)
        if n.removeprefix(PREFIX) in c['selected']:assert_selected(original[n],f,CANDIDATE)
        else:require(state.identity(f)==state.identity(original[n]) and f.get('labels')==original[n].get('labels'),'Fonction retenue modifiee avant retour B')
    capabilities('backend',references=functions,rollback=True)
    require(common.controls()==c['controls'],'Temoins mails/automates modifies avant retour B')
    if apply:
        proof_path=backup/'session-enforcement-rules/rollback-validated.json';require(proof_path.is_file(),'Retour code B seul interdit : preuve Rules absente')
        proof=json.loads(proof_path.read_text())
        require(proof['contractSha256']==DIGEST and proof['manifestSha256']==digest(value)
            and proof['rollbackRun']==int(os.environ['GITHUB_RUN_ID']) and proof['releaseRun']==int(os.environ['RELEASE_RUN']),
            'Preuve Rules du meme retour B absente')


def rollback_hosting_guard(backup,current):
    backup=Path(backup);value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    path=backup/'session-enforcement-rules/rollback-validated.json';require(path.is_file(),'Retour Hosting B seul interdit')
    proof=json.loads(path.read_text());expected=proof['hostingAfter']
    require(proof['contractSha256']==DIGEST and proof['manifestSha256']==digest(value)
        and proof['rollbackRun']==int(os.environ['GITHUB_RUN_ID'])
        and {'name':current['name'],'version':current['version']['name']}==expected,'Derive Hosting avant retour B')


def rollback_patch(before,source):
    runtime(before)
    return {'name':before['name'],'buildConfig':{'source':{'storageSource':source}},'labels':before.get('labels',{})},'build_config.source,labels'


def assert_rollback(before,after):
    runtime(after)
    require(configuration(before)==configuration(after) and before.get('labels',{})==after.get('labels',{}),
        'Retour B a modifie configuration/binding/labels')


def rollback_complete(backup,state,archives):
    backup=Path(backup);value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()));c=contract()
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())};functions=state.inventory();current={f['name']:f for f in functions}
    require(len(functions)==len(current)==len(original)==119 and set(current)==set(original),'Inventaire retour B incomplet')
    publisher=common.load('standard-source-publish.py');attestations={}
    for n,f in current.items():
        require(configuration(f)==configuration(original[n]),'Configuration retour B differente')
        if n.removeprefix(PREFIX) in c['selected']:
            assert_rollback(original[n],f);attestations[n]=publisher.attest(f,archives[n].read_bytes(),state)
        else:require(state.identity(f)==state.identity(original[n]) and f.get('labels')==original[n].get('labels'),'Fonction conservee modifiee par retour B')
    capabilities('backend',references=functions,rollback=True);require(common.controls()==c['controls'],'Temoins modifies par retour B')
    (backup/'session-enforcement-rules/rollback-sources-restored.json').write_text(json.dumps({
        'candidate':CANDIDATE,'contractSha256':DIGEST,'manifestSha256':digest(value),'rollbackRun':int(os.environ['GITHUB_RUN_ID']),
        'allSourcesRestored':True,'functions':attestations,'configurationChanges':False,'businessInvocations':0},indent=2),encoding='utf-8')


if __name__ == '__main__':
    mode,directory,*args=sys.argv[1:]
    request=json.loads((Path(directory)/'request.json').read_text())
    if enabled(request):
        if mode=='readiness' and len(args)==2:readiness(directory,*args)
        elif mode in {'auth-before','auth-after'} and not args:auth(directory,mode=='auth-after')
        else:raise ValueError('Mode B inconnu')
