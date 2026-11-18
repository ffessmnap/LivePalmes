"""One optional current-access/App Check PROD release; no Rules writer."""
import hashlib,importlib.util,json,os,re,subprocess,sys
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'.github/releases/evidence/20261118-production-optional-access-contract.json'
DIGEST='b5f6395d20222b6371a78a1e162730f6c4d55133a91ac0e72c419810bb4af225'
OPTION='optionalAccessObservationRelease'
KIND='a3-optional-access-app-check-existing-v1'
CANDIDATE='1e27374ef9728413d9eea990f9c48975c7871ccd'
PREFIX='projects/livepalmes/locations/europe-west1/functions/'
spec=importlib.util.spec_from_file_location('optional_common',ROOT/'tools/standard-source-policy.py')
common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
require,digest=common.require,common.digest
configuration,assert_retained=common.configuration,common.assert_retained


def enabled(value): return OPTION in value


def approved(value):
    if not enabled(value): return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}}, 'Demande acces facultatif hors candidat/options')
    return c['selected']


def paths(value,changed,git):
    if not enabled(value):return
    approved(value);c=contract()
    require(digest(sorted(changed))==c['changedPathsSha256'],'Diff complet acces facultatif different')
    for name,pair in c['protectedBlobs'].items():
        require([git('rev-parse',sha+':'+name) for sha in [c['productionCommit'],CANDIDATE]]==pair,'Source acces facultatif hors version fermee : '+name)


def calculated_selection(c,origins,fingerprint,legacy):
    require(len(origins) == 119 and digest(origins) == c['originsSha256'], 'Origines PROD acces facultatif differentes')
    source = common.load('publish-test-admin-mfa-sources.py')
    rows = source.qualify_selection({**c,'applicationAnchor':c['sourceAnchor']},origins,CANDIDATE,'livepalmes',fingerprint,legacy)
    desired,base = fingerprint(CANDIDATE),fingerprint(c['productionCommit'])
    require(set(desired) == set(base), 'Declarations PROD acces facultatif ajoutees ou supprimees')
    absent = sorted(n for n in desired if n not in {r['shortName'] for r in rows} and desired[n] != base[n])
    result = {'schema':1,'candidate':CANDIDATE,'productionRun':c['productionRun'],'inventoryCount':119,
        'selected':[r['shortName'] for r in rows if r['changed']],'rows':rows,
        'selectionQualification':c['selectionQualification'],'completeOriginsSha256':digest(origins),
        'notInstalledChanges':absent}
    require(result['selected'] == c['selected'] and absent == c['notInstalledChanges']
, 'Selection PROD acces facultatif non concordante')
    return result


def complete_selection(origins,fingerprint,legacy,inherited=None):
    c=contract();result=calculated_selection(c,origins,fingerprint,legacy)
    require(digest(result)==c['selectionProofSha256'],'Preuve complete facultative differente du contrat scelle')
    return result


def expected_manifest(rows):
    c=contract();require(digest(rows)==c['manifestOriginsSha256'],'Origines manifeste acces facultatif alterees')
    return {'schema':1,'kind':KIND,'requestSha256':digest({**c['request'],OPTION:{'contractSha256':DIGEST}}),
        **{k:c[k] for k in ['candidate','productionRun','productionCommit','productionHosting','testRun','selected','inventoryCount',
            'staticPaths','controls','approval','configurationChanges','bindingChanges','newFunctions','deletedFunctions',
            'notInstalledChanges','productionEnforcement','rulesDeployment']},
        'origins':rows,'businessInvocations':0,'mailPause':False,'contractSha256':DIGEST,'selectionProofSha256':c['selectionProofSha256']}


def validate_manifest(value):
    require(value == expected_manifest(value.get('origins', [])), 'Manifeste acces facultatif hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    approved(request or json.loads((directory/'request.json').read_text()))
    return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    c = contract(); paths(value, changed, git)
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                        'source': 'verified-publication-artifacts'}, 'Reference PROD acces facultatif non authentifiee')
    cycle = common.load('release-cycle.py'); directory = Path(os.environ['PLAN'])
    proof = complete_selection(sorted(functions.values(), key=lambda f: f['name']), fingerprint, legacy,
                               None)
    require(sorted(selected) == proof['selected'], 'Selection acces facultatif reduite ou elargie')
    cycle.write(directory/'standard-optional-access-selection-proof.json', proof)
    return expected_manifest(proof['rows'])


def verify_retained_backend(directory, state, selected, cycle):
    value = manifest(directory); proof = cycle.read(Path(directory)/'standard-optional-access-selection-proof.json')
    require(digest(proof) == contract()['selectionProofSha256'] and sorted(selected) == value['selected']
            and sorted(state['functions'], key=lambda f: f['name']) == [{k: r[k] for k in ['name','updateTime','state','revision','commit']} for r in value['origins']],
            'Revue retenue acces facultatif hors inventaire')
    rows = [r for r in proof['rows'] if not r['changed']]; names = sorted(r['shortName'] for r in rows)
    cycle.write(Path(directory)/'excluded-backend-verification.json', {
        'suite': contract()['request']['excludedBackendEvidence']['suite'], 'method': KIND,
        'candidate': CANDIDATE, 'productionCommit': value['productionCommit'], 'productionRun': value['productionRun'],
        'result': 'success', 'networkCalls': 0, 'passedFunctions': names, 'retainedFunctions': names,
        'rawLegacyDifferenceCount': sum(r['legacyChanged'] for r in rows), 'functionReviews': rows,
        'reviewSha256': digest(rows), 'selectionProofSha256': digest(proof), 'suiteSha256': DIGEST})


def runtime(function):
    c=contract();name=function.get('name','').removeprefix(PREFIX)
    require(name in c['selected'] and function.get('name')==PREFIX+name and function.get('state')=='ACTIVE'
        and function.get('environment')=='GEN_2' and function.get('buildConfig',{}).get('runtime')=='nodejs22'
        and function['buildConfig'].get('entryPoint')==name
        and hashlib.sha256(function.get('serviceConfig',{}).get('serviceAccountEmail','').encode()).hexdigest()==c['runtimeBindings'][name],
        'Runtime acces facultatif different de la reference existante : '+name)


def initial(functions, value):
    validate_manifest(value); common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == CANDIDATE, 'Autre candidat facultatif refuse')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def restore_witness(directory, guards):
    raise ValueError('Reprise automatique acces facultatif non autorisee')


def backend_readiness(directory):
    directory=Path(directory);value=manifest(directory);proof=json.loads((directory/'standard-optional-access-controls-before.json').read_text())
    return {'contractSha256':DIGEST,'manifestSha256':digest(value),'selected':value['selected'],'retainedFunctions':9,
            'runtime':proof['runtime'],'controls':proof['controls']}


def rollback_patch(before,source):
    runtime(before)
    return {'name':before['name'],'buildConfig':{'source':{'storageSource':source}},'labels':before.get('labels',{})},'build_config.source,labels'


def assert_rollback(before,after):
    runtime(after)
    require(configuration(before)==configuration(after) and before.get('labels',{})==after.get('labels',{}),
        'Retour acces facultatif a modifie configuration/binding/labels')


def contract():
    raw=PATH.read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest()==DIGEST,'Contrat facultatif PROD absent ou altere')
    c=json.loads(raw)
    require(c['schema']==1 and c['kind']==KIND and c['candidate']==CANDIDATE
        and c['applicationAnchor']=='b0000e8763e9f11b4c21077dbb80012a442d58aa'
        and c['sourceAnchor']=='50acd7ab0860c4d0b716022e3ad7d373c5dac359'
        and c['phase']=='optional-current-access-and-app-check-observation'
        and c['mandatoryMfa'] is c['productionEnforcement'] is c['rulesDeployment'] is False
        and c['configurationChanges'] is c['bindingChanges'] is False
        and c['inventoryCount']==119 and len(c['selected'])==110 and c['selected']==sorted(set(c['selected']))
        and len(c['notInstalledChanges'])==28 and c['newFunctions']==c['deletedFunctions']==[],
        'Perimetre facultatif PROD non ferme')
    modules={'optional-access-production-capabilities.py','portal-session-enforcement-capabilities.py',
        'publish-test-admin-mfa-optional.py','publish-test-admin-mfa-sources.py',
        'access-revocation-production-policy.py','direct-realtime-production-rules.py','standard-source-policy.py'}
    require(set(c['modulesSha256'])==modules,'Modules facultatifs inconnus')
    for name,expected in c['modulesSha256'].items():
        require(hashlib.sha256((ROOT/'tools'/name).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==expected,
                'Module facultatif modifie : '+name)
    caps=common.load('optional-access-production-capabilities.py');caps.validate_local(c['applicationAnchor'])
    require(c['selectionQualification']==caps.QUALIFICATION and c['fingerprintEnginesSha256']==caps.ENGINES,
            'Qualification facultative differente de la decouverte')
    require(c['productionRulesSource']=='.github/releases/evidence/20261118-admin-mfa-production-before.rules'
        and c['productionRulesSha256']=='ef955e075af13b4de189401d3f148a807e99704fcf83651c85fe72598caf44f2'
        and hashlib.sha256((ROOT/c['productionRulesSource']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==c['productionRulesSha256']
        and c['productionRulesObserved']['sha256']==c['productionRulesSha256'], 'Source Rules PROD observee differente')
    require(c['firebaseBeforeSha256']=='896854073c2eb582864a8083dc30fe62f2fc3b5f50c5bda4ffd5df67c3e32671'
        and c['firebaseAfterSha256']=='99e19446b33090c0b797962c0c7c5a30b1ce33ed9915ae128f2771bc9a03b53d',
        'Paire CSP portail differente de TEST')
    optional=ROOT/'.github/releases/evidence/20261118-test-admin-mfa-optional-contract.json'
    require(hashlib.sha256(optional.read_bytes().replace(b'\r\n',b'\n')).hexdigest()==c['testSourceContractSha256']
        =='2903739d34fbe44280f945ef718d169cc156fd3cf54cff04409ffc84bb19bf36','Contrat source TEST facultatif different')
    common.approval(c['approval'])
    return c


def approved_config_paths(value,changed,git):
    if not enabled(value):return set()
    paths(value,changed,git);c=contract()
    require('firebase.json' in changed,'Delta CSP portail absent')
    for key,sha in [('firebaseBeforeSha256',c['productionCommit']),('firebaseAfterSha256',CANDIDATE)]:
        require(digest(json.loads(git('show',sha+':firebase.json')))==c[key],'Configuration hors paire App Check fermee')
    return {'firebase.json'}


def official_context(rollback=False):
    env=os.environ;contract()
    workflow='ffessmnap/LivePalmes/.github/workflows/'
    allowed={workflow+'livepalmes-production-rollback.yml@refs/heads/main'} if rollback else {
        workflow+'livepalmes-production-readiness.yml@refs/heads/main',workflow+'livepalmes-production-release.yml@refs/heads/main'}
    require(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
        and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1'
        and env.get('GITHUB_WORKFLOW_REF') in allowed and re.fullmatch('[a-f0-9]{40}',env.get('GITHUB_SHA',''))
        and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')),'Contexte officiel facultatif requis')
    if rollback:require(env.get('CONFIRM_CODE_ROLLBACK')=='livepalmes' and env.get('B_RESTORE_HOSTING')=='true',
        'Retour facultatif coordonne et explicitement confirme requis')


def capability_digest(proof):
    # Origin/source selection is frozen separately; every capability context
    # field, including the actually tested source candidate, remains covered.
    return digest({k:v for k,v in proof.items() if k!='sourceSelection'})


def capabilities(kind,references=None,rollback=False):
    official_context(rollback);c=contract();caps=common.load('optional-access-production-capabilities.py')
    require(kind in caps.READERS,'Identite facultative inconnue')
    reader=common.load('access-revocation-production-policy.py');identity=reader.reader_identity(kind)
    require(identity==caps.READERS[kind],'Identite existante facultative differente')
    if kind=='backend':
        functions=references if references is not None else common.load('production-release-state.py').inventory()
        detail=caps.runtime_permissions(functions,reader._read,c['selected'])
    else:
        detail=reader.administrative_prerequisites([],read=reader._read)
        detail.update(authLookupLimit=2,factorMetadataRead=False,signInInvoked=False)
    proof={'schema':1,'candidate':c['applicationAnchor'],'phase':c['phase'],'kind':kind,
        'readerIdentitySha256':identity,'businessInvocations':0,'newPermissions':0,'configurationChanges':False,
        'mandatoryMfa':False,'rulesWrites':0,'publicationAllowed':False,**detail}
    key='backendCapabilitySha256' if kind=='backend' else 'hostingCapabilitySha256'
    require(proof['ready'] is proof['readOnly'] is True and capability_digest(proof)==c[key],
            'Capacites facultatives differentes de la decouverte authentifiee')
    return proof


def rules_snapshot(directory,expected=None):
    c=contract();reader=common.load('direct-realtime-production-rules.py')
    token=subprocess.check_output(['gcloud','auth','application-default','print-access-token'],text=True,stderr=subprocess.DEVNULL).strip()
    observed,text=reader.snapshot(token)
    require(observed==c['productionRulesObserved'] and (expected is None or observed==expected)
        and text.encode()==(ROOT/c['productionRulesSource']).read_bytes().replace(b'\r\n',b'\n'),
        'Derive Rules PROD : aucune ecriture ou reinitialisation autorisee')
    proof={'readOnly':True,'deployed':False,'indexesDeployed':False,'observed':observed}
    (Path(directory)/'standard-optional-access-rules-observed.json').write_text(json.dumps(proof,sort_keys=True),encoding='utf-8')
    return proof


def auth(directory,after=False,prerequisite=False):
    directory=Path(directory);value=manifest(directory);proof=capabilities('hosting')
    rules=rules_snapshot(directory)
    result={**proof,'rules':rules,'capabilitySha256':capability_digest(proof),'contractSha256':DIGEST,
        'manifestSha256':digest(value),'run':int(os.environ['GITHUB_RUN_ID']),'toolingCommit':os.environ['GITHUB_SHA']}
    suffix='prerequisites' if prerequisite else 'after' if after else 'before'
    (directory/('standard-optional-access-auth-'+suffix+'.json')).write_text(json.dumps(result,sort_keys=True),encoding='utf-8')
    return result


def guard(directory,after=False):
    directory=Path(directory);value=manifest(directory);c=contract();proof=capabilities('backend')
    observed={'controls':common.controls(),'runtime':proof}
    require(observed['controls']==c['controls'],'Derive mails actifs/automates/modeles facultatifs')
    require(not (directory/'previous').exists(),'Reprise facultative automatique interdite')
    if '.github/workflows/livepalmes-production-release.yml@' in os.environ.get('GITHUB_WORKFLOW_REF',''):
        suffix='after' if after else 'before';path=directory/('standard-optional-access-auth-'+suffix+'.json')
        require(path.is_file(),'Continuite administrative du meme run absente');admin=json.loads(path.read_text())
        require(admin['run']==int(os.environ['GITHUB_RUN_ID']) and admin['toolingCommit']==os.environ['GITHUB_SHA']
            and admin['contractSha256']==DIGEST and admin['manifestSha256']==digest(value)
            and admin['capabilitySha256']==c['hostingCapabilitySha256'] and admin['ready'] and admin['accountOrRightChanges']==0
            and admin['rules']['observed']==c['productionRulesObserved'],'Continuite administrative/regles incompatibles')
    path=directory/'standard-optional-access-controls-before.json'
    if path.exists():require(json.loads(path.read_text())==observed,'Temoin facultatif initial different')
    else:
        require(not after,'Temoin facultatif initial absent');path.write_text(json.dumps(observed,sort_keys=True),encoding='utf-8')
    if after:(directory/'standard-optional-access-controls-after.json').write_text(json.dumps(observed,sort_keys=True),encoding='utf-8')


def test_evidence(directory,cycle):
    directory=Path(directory);c=contract();target=directory/'optional-access-test-source'
    info=cycle.artifact(c['testSourceRun'],'test-backend-proof',target,'.github/workflows/livepalmes-test-mail-sources.yml')
    path=target/'test-backend-proof.json';source_candidate=info.get('head_sha','');receipt=cycle.read(path)
    require(source_candidate==c['sourceAnchor'] and receipt['candidate']==source_candidate
        and receipt['release']=='admin_mfa_optional' and receipt['mandatoryAdminMfa'] is False
        and receipt['contractSha256']==c['testSourceContractSha256']
        and hashlib.sha256(path.read_bytes()).hexdigest()==c['testSourceProofSha256'], 'Preuve source facultative TEST incompatible')
    require(all(engine(source_candidate)==engine(CANDIDATE) for engine in [cycle.test_backend_fingerprints,
        cycle.production_selection_fingerprints,cycle.backend_fingerprints]),'Backend TEST different du candidat facultatif')
    for name,item in c['testArtifacts'].items():
        meta=cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/artifacts/{item["id"]}')
        require(meta['workflow_run']['id']==item['run'] and meta['name']==name and meta['digest']==item['digest']
            and meta['expired'] is False,'Provenance TEST facultative absente')
    require(hashlib.sha256((directory/'test-proof.json').read_bytes()).hexdigest()==c['testArtifacts']['test-proof']['files']['test-proof.json'],
            'Preuve commune TEST facultative alteree')
    source=common.load('publish-test-admin-mfa-optional.py')
    def reuse(run,name,destination,workflow):
        require(int(run)==c['testSourceRun'] and name=='test-backend-proof'
            and workflow=='.github/workflows/livepalmes-test-mail-sources.yml','Autre preuve source refusee')
        destination=Path(destination);destination.mkdir(parents=True,exist_ok=True)
        (destination/'test-backend-proof.json').write_bytes(path.read_bytes());return info
    api=SimpleNamespace(gh=lambda endpoint:{'workflow_runs':[info]},artifact=reuse,read=cycle.read,
        matching_functions=cycle.matching_functions,test_backend_fingerprints=cycle.test_backend_fingerprints)
    trusted=source.trusted_revisions(directory,cycle.read(directory/'test-proof.json')['state'],api)
    require({source.PREFIX+n for n in c['selected']}<=trusted,'Archives/revisions facultatives TEST non attestees')
    rules_dir=directory/'optional-access-test-rules'
    rules_info=cycle.artifact(c['testRun'],'portal-session-rules-proof',rules_dir,'.github/workflows/livepalmes-test-common.yml')
    rules_path=rules_dir/'test-portal-session-rules-proof.json';rules=cycle.read(rules_path)
    require(rules_info['head_sha']==CANDIDATE and rules['candidate']==CANDIDATE and rules['project']=='livepalmes-test'
        and hashlib.sha256(rules_path.read_bytes()).hexdigest()==c['testArtifacts']['portal-session-rules-proof']['files'][rules_path.name]
        and rules['readOnly'] is True and rules['deployed'] is rules['indexesDeployed'] is rules['productionTouched'] is False
        and rules['businessInvocations']==0 and rules['after']['sha256']==c['testRulesSha256'],
        'Regles facultatives TEST non attestees en lecture seule')


def readiness(directory,preparation,run):
    directory=Path(directory);value=manifest(directory);c=contract();cycle=common.load('release-cycle.py')
    require(str(run).isdigit() and int(run)>0 and str(preparation).isdigit() and int(preparation)>0,
            'Preflight et prerequis officiels facultatifs requis')
    pre=cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{preparation}')
    require(pre['head_sha']==os.environ['GITHUB_SHA'] and pre['conclusion']=='success' and pre['run_attempt']==1
        and pre['path']=='.github/workflows/livepalmes-production-preflight.yml','Preflight facultatif du meme outillage absent')
    for kind in ['backend','hosting']:
        target=directory/('standard-optional-access-ready-'+kind)
        info=cycle.artifact(run,'production-prerequisites-'+kind,target,'.github/workflows/livepalmes-production-readiness.yml')
        report=cycle.read(target/('prerequisites-'+kind+'.json'));proof=report.get('optionalAccessObservation',{})
        require(info['head_sha']==os.environ['GITHUB_SHA'] and report['planRun']==int(preparation)
            and report['candidate']==CANDIDATE and report['kind']==kind and report['ready'] is report['readOnly'] is True
            and report['missingPermissions']==[] and proof.get('contractSha256')==DIGEST
            and proof.get('manifestSha256')==digest(value),'Prerequis facultatifs incompatibles')
        if kind=='backend':
            require(proof.get('selected')==c['selected'] and proof.get('retainedFunctions')==9 and proof.get('controls')==c['controls']
                and capability_digest(proof.get('runtime',{}))==c['backendCapabilitySha256'],'Preuve des110runtimes facultatifs absente')
        else:
            require(proof.get('capabilitySha256')==c['hostingCapabilitySha256'] and proof.get('ready')
                and proof.get('accountOrRightChanges')==0 and proof.get('rules',{}).get('observed')==c['productionRulesObserved'],
                'Continuite et Rules facultatives non demontrees')


def rollback_hosting_guard(backup,current):
    official_context(rollback=True);backup=Path(backup)
    value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    proof=capabilities('hosting',rollback=True);rules=rules_snapshot(backup)
    result={'contractSha256':DIGEST,'manifestSha256':digest(value),'rollbackRun':int(os.environ['GITHUB_RUN_ID']),
        'releaseRun':int(os.environ['RELEASE_RUN']),'capabilitySha256':capability_digest(proof),'rules':rules,
        'hostingAfter':{'name':current['name'],'version':current['version']['name']}}
    (backup/'optional-access-rollback-auth.json').write_text(json.dumps(result,sort_keys=True),encoding='utf-8')


def rollback_guard(backup,after_report,functions,state,apply=False):
    official_context(rollback=True);backup=Path(backup);c=contract()
    value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    report=json.loads((backup/'report.json').read_text())
    require(report['candidate']==after_report['candidate']==CANDIDATE and after_report['errors']==[]
        and report.get('sourcePolicyKind')==KIND and report.get('standardSourceManifestSha256')==digest(value)
        and report['newFunctions']==[] and {f['name'] for f in report['functions']}=={PREFIX+n for n in c['selected']},
        'Retour facultatif hors sauvegarde et selection complete')
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())}
    current={f['name']:f for f in functions};expected={f['name']:f for f in after_report['functions']}
    require(len(functions)==len(current)==len(original)==len(expected)==119 and set(current)==set(original)==set(expected)
        and all(state.identity(f)==expected[n] for n,f in current.items()),'Derive avant retour facultatif')
    for n,f in current.items():
        require(configuration(f)==configuration(original[n]),'Configuration retour facultatif modifiee')
        if n.removeprefix(PREFIX) in c['selected']:assert_selected(original[n],f,CANDIDATE)
        else:require(state.identity(f)==state.identity(original[n]) and f.get('labels')==original[n].get('labels'),'Fonction conservee modifiee')
    capabilities('backend',references=functions,rollback=True)
    require(common.controls()==c['controls'],'Mails/automates/modeles modifies avant retour facultatif')
    if apply:
        path=backup/'optional-access-rollback-auth.json';require(path.is_file(),'Temoin Hosting/Rules du meme retour absent')
        proof=json.loads(path.read_text())
        require(proof['contractSha256']==DIGEST and proof['manifestSha256']==digest(value)
            and proof['rollbackRun']==int(os.environ['GITHUB_RUN_ID']) and proof['releaseRun']==int(os.environ['RELEASE_RUN'])
            and proof['capabilitySha256']==c['hostingCapabilitySha256']
            and proof['rules']['observed']==c['productionRulesObserved'],'Temoin du retour coordonne incompatible')


def rollback_complete(backup,state,archives):
    official_context(rollback=True);backup=Path(backup);c=contract()
    value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())}
    functions=state.inventory();current={f['name']:f for f in functions}
    require(len(functions)==len(current)==len(original)==119 and set(current)==set(original),'Inventaire retour incomplet')
    publisher=common.load('standard-source-publish.py');attestations={}
    for n,f in current.items():
        require(configuration(f)==configuration(original[n]),'Configuration retour facultatif differente')
        if n.removeprefix(PREFIX) in c['selected']:
            assert_rollback(original[n],f);attestations[n]=publisher.attest(f,archives[n].read_bytes(),state)
        else:require(state.identity(f)==state.identity(original[n]) and f.get('labels')==original[n].get('labels'),'Fonction conservee modifiee par retour')
    capabilities('backend',references=functions,rollback=True)
    require(common.controls()==c['controls'],'Temoins modifies par retour facultatif')
    (backup/'optional-access-rollback-sources.json').write_text(json.dumps({'candidate':CANDIDATE,'contractSha256':DIGEST,
        'manifestSha256':digest(value),'rollbackRun':int(os.environ['GITHUB_RUN_ID']),'allSourcesRestored':True,
        'functions':attestations,'configurationChanges':False,'businessInvocations':0},indent=2),encoding='utf-8')


def rollback_final(backup,destination):
    official_context(rollback=True);backup=Path(backup)
    value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    source=json.loads((backup/'optional-access-rollback-sources.json').read_text())
    require(source['allSourcesRestored'] is True and source['contractSha256']==DIGEST
        and source['manifestSha256']==digest(value) and source['rollbackRun']==int(os.environ['GITHUB_RUN_ID']),
        'Sources restaurees non attestees dans ce retour')
    proof=capabilities('hosting',rollback=True);rules=rules_snapshot(backup)
    cycle=common.load('release-cycle.py');current=cycle.api('livepalmes','hosting')['releases'][0]
    require(current['version']['name']==contract()['productionHosting'],'Hosting original non restaure')
    Path(destination).write_text(json.dumps({'candidate':CANDIDATE,'contractSha256':DIGEST,'allSourcesRestored':True,
        'hostingRestored':True,'rules':rules,'readOnlyFinal':True,'accountOrRightChanges':proof['accountOrRightChanges']},indent=2),encoding='utf-8')


def backup_manifest(backup):
    backup=Path(backup);report=json.loads((backup/'report.json').read_text())
    value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    require(report['sourcePolicyKind']==KIND and report['candidate']==CANDIDATE and report['newFunctions']==[]
        and report['standardSourceManifestSha256']==digest(value)
        and len(report['functions'])==len(value['selected'])==110
        and {f['name'] for f in report['functions']}=={PREFIX+n for n in value['selected']},'Sauvegarde facultative hors manifeste')
    return report,value


def state_check(backup,destination,require_success,state):
    backup=Path(backup);report,value=backup_manifest(backup)
    old=json.loads((backup/'functions.json').read_text());actual=state.inventory()
    before={f['name']:f for f in old};after={f['name']:f for f in actual};selected={PREFIX+n for n in value['selected']}
    errors=[]
    try:
        require(len(old)==len(before)==len(actual)==len(after)==119,'Inventaire facultatif incomplet ou duplique')
        assert_retained(before,after,selected,state)
        for name in sorted(selected):
            require(name in after,'Source facultative absente');assert_selected(before[name],after[name],CANDIDATE)
    except ValueError as error:errors.append(str(error))
    Path(destination).write_text(json.dumps({'candidate':CANDIDATE,'functions':[state.identity(f) for f in actual],
        'errors':errors,'optionalAccessContractSha256':DIGEST},indent=2),encoding='utf-8')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as output:
            output.write(f'\nFacultatif :110sources,119fonctions,ecarts={len(errors)}.\n')
    require(not (require_success and errors),'Controle des Functions facultatives en echec')


def narrow_rollback_request(state,original,selected):
    # A separate instance of the frozen transport calls this adapter. Its archive,
    # upload, revision and operation checks remain intact; only the write mask is
    # narrowed to the two fields already authorized by this closed contract.
    def request(url,method='GET',body=None):
        if method=='PATCH':
            from urllib.parse import urlsplit,parse_qs
            require(isinstance(body,dict),'Corps de retour facultatif absent')
            target=urlsplit(url);query=parse_qs(target.query)
            require(target.scheme=='https' and target.netloc=='cloudfunctions.googleapis.com'
                and target.path=='/v2/'+body.get('name','') and body.get('name') in selected
                and set(query)=={'updateMask'} and len(query['updateMask'])==1
                and set(body)=={'name','buildConfig','labels'} and set(body['buildConfig'])=={'source'}
                and set(body['buildConfig']['source'])=={'storageSource'},'PATCH de retour facultatif non borne')
            url=state.API+body['name']+'?updateMask=build_config.source,labels'
        return original(url,method,body)
    return request


def state_rollback(backup,after_path,apply,state):
    backup=Path(backup);report,value=backup_manifest(backup)
    after=json.loads(Path(after_path).read_text());functions=state.inventory()
    rollback_guard(backup,after,functions,state,apply=apply)
    # Keep every archive/hash, fresh selected revision, upload and operation
    # control in the frozen rollback. No source, report or contract is rewritten.
    archives={PREFIX+n:backup/'sources'/(source['functions'][0]+'.zip') for source in report['sources'] for n in source['functions']}
    require(len([n for source in report['sources'] for n in source['functions']])==len(archives)==110
        and set(archives)=={PREFIX+n for n in value['selected']},'Archives de retour facultatif incompletes ou dupliquees')
    original_request,original_patch=state.request,state.rollback_patch
    state.request=narrow_rollback_request(state,original_request,{PREFIX+n for n in value['selected']})
    state.rollback_patch=lambda before,source:rollback_patch(before,source)[0]
    try:state.rollback(backup,Path(after_path),apply)
    finally:state.request,state.rollback_patch=original_request,original_patch
    if apply:rollback_complete(backup,state,archives)


def state_dispatch(args):
    require(len(args) in (3,4) and args[0] in {'check','hosting-state','validate-rollback','rollback','hosting-rollback'},'Mode etat facultatif inconnu')
    mode,backup,after,*outcome=args;backup,after=Path(backup),Path(after)
    require(json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text()).get('project_id')=='livepalmes','Compte PROD requis')
    backup_manifest(backup);state=common.load('production-release-state.py')
    if mode=='check':
        require(len(outcome)==1,'Resultat source requis');return state_check(backup,after,outcome==['success'],state)
    require(not outcome,'Argument etat facultatif inattendu')
    if mode in {'rollback','validate-rollback'}:return state_rollback(backup,after,mode=='rollback',state)
    if mode=='hosting-rollback':
        current=state.request('https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1')['releases'][0]
        require(current['name']==json.loads(after.read_text())['name'],'Hosting modifie depuis publication')
        rollback_hosting_guard(backup,current)
    return state.hosting(backup,after,mode=='hosting-rollback')


if __name__=='__main__':
    mode,directory,*args=sys.argv[1:]
    if mode=='rollback-final' and len(args)==1:rollback_final(directory,args[0])
    else:
        request=json.loads((Path(directory)/'request.json').read_text())
        if enabled(request):
            if mode=='readiness' and len(args)==2:readiness(directory,*args)
            elif mode in {'auth-before','auth-after'} and not args:auth(directory,mode=='auth-after')
            elif mode=='guard-after' and not args:guard(directory,after=True)
            elif mode=='rules-final' and len(args)==1:
                manifest(directory);proof=rules_snapshot(directory)
                Path(args[0]).write_text(json.dumps({'candidate':CANDIDATE,'contractSha256':DIGEST,**proof},indent=2),encoding='utf-8')
            else:raise ValueError('Mode facultatif inconnu')
