"""One immutable A3.3 release: existing sources and labels only."""
import hashlib
import importlib.util
import json
from functools import lru_cache
from pathlib import Path
import re
import subprocess
from types import SimpleNamespace
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261116-production-access-revocation-contract.json'
DIGEST = '060e1c55829e705d7dfbafd3d6ba9d2278302a155afe86348cf32a3e9adc791a'
OPTION = 'accessRevocationRelease'
KIND = 'a33-access-revocation-existing-v1'
CANDIDATE = '43fbd5a9bb544199255de37dd239584f2c502d78'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('a33_common', ROOT/'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec); spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat A3.3 modifie')
    c = json.loads(raw)
    require(c['candidate'] == CANDIDATE and c['selected'] == sorted(set(c['selected']))
            and len(c['selected']) == 107 and c['inventoryCount'] == 119
            and c['newFunctions'] == c['deletedFunctions'] == []
            and c['configurationChanges'] is c['bindingChanges'] is False,
            'Contrat A3.3 hors sources existantes')
    return c


def enabled(value): return OPTION in value


def approved(value):
    if not enabled(value): return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}}, 'Demande A3.3 hors candidat/options')
    return c['selected']


def paths(value, changed, git):
    if not enabled(value): return
    approved(value); c = contract()
    require(digest(sorted(changed)) == c['changedPathsSha256'], 'Diff complet A3.3 different')
    for name, pair in c['protectedBlobs'].items():
        require([git('rev-parse', ref+':'+name) for ref in [c['productionCommit'], c['candidate']]] == pair,
                'Source ou configuration A3.3 differente: '+name)


def expected_manifest(origins):
    c = contract()
    require(len(origins) == 119 and digest(origins) == c['originsSha256'], 'Origines A3.3 differentes')
    return {'schema':1, 'kind':KIND, 'requestSha256':digest({**c['request'], OPTION:{'contractSha256':DIGEST}}),
            **{k:c[k] for k in ['candidate','productionRun','productionCommit','productionHosting','testRun',
                                'selected','inventoryCount','staticPaths','controls','approval',
                                'configurationChanges','bindingChanges','newFunctions','deletedFunctions']},
            'origins':origins, 'businessInvocations':0, 'mailPause':False,
            'contractSha256':DIGEST, 'selectionProofSha256':c['selectionProofSha256']}


def validate_manifest(value):
    require(value == expected_manifest(value.get('origins', [])), 'Manifeste A3.3 hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    approved(request or json.loads((directory/'request.json').read_text()))
    return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))


@lru_cache(maxsize=1)
def _proof(origins_json):
    c = contract()
    history = common.load('history-source-provenance.py'); history.checkpoint()
    verifier = ROOT/'tools/access-revocation-production-proof.js'
    require(hashlib.sha256(verifier.read_bytes().replace(b'\r\n', b'\n')).hexdigest() == c['selectionVerifierSha256'],
            'Verificateur A3.3 modifie')
    # Exact static fingerprints only; no application module or business service runs.
    cycle = common.load('release-cycle.py')
    origins = json.loads(origins_json)
    commits = sorted({f['commit'] for f in origins})
    payload = {'origins':origins, 'legacy':{s:cycle.backend_fingerprints(s) for s in commits},
               'optimized':{s:cycle.production_selection_fingerprints(s) for s in commits}}
    result = json.loads(subprocess.check_output(['node',str(verifier),str(ROOT)], input=json.dumps(payload).encode()))
    require(digest(result) == c['selectionProofSha256'] and result['selected'] == c['selected']
            and result['selected'] == result['counterfactualSelected']
            and result['inventoryCount'] == 119 and len(result['retained']) == 12,
            'Selection complete A3.3 non demontree')
    return result


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    approved(value); c = contract(); paths(value, changed, git)
    require(baseline == {'productionRun':c['productionRun'],'productionCommit':c['productionCommit'],
                        'source':'verified-publication-artifacts'}, 'Baseline A3.3 non authentifiee')
    origins = sorted(functions.values(), key=lambda f:f['name'])
    result = expected_manifest(origins)
    proof = _proof(json.dumps(origins, sort_keys=True))
    require(sorted(selected) == proof['selected'], 'Selection A3.3 reduite ou elargie')
    require(digest(legacy(c['candidate'])) == c['candidateLegacySha256']
            and digest(fingerprint(c['candidate'])) == c['candidateOptimizedSha256'], 'Empreintes A3.3 differentes')
    return result


def verify_retained_backend(directory, state, selected, cycle):
    directory = Path(directory); request = cycle.read(directory/'request.json'); approved(request)
    value = manifest(directory, request)
    require(sorted(state['functions'], key=lambda f:f['name']) == value['origins'] and sorted(selected) == value['selected'],
            'Revue retenue A3.3 hors inventaire')
    proof = _proof(json.dumps(value['origins'], sort_keys=True))
    rows = proof['retained']; names = sorted(r['name'] for r in rows)
    cycle.write(directory/'excluded-backend-verification.json', {
        'suite':request['excludedBackendEvidence']['suite'],'method':proof['kind'],'candidate':CANDIDATE,
        'productionCommit':value['productionCommit'],'productionRun':value['productionRun'],
        'result':'success','networkCalls':0,'passedFunctions':names,'retainedFunctions':names,
        'rawLegacyDifferenceCount':sum(r['legacyChanged'] for r in rows),'functionReviews':rows,
        'reviewSha256':digest(rows),'selectionProofSha256':digest(proof),'suiteSha256':contract()['selectionVerifierSha256']})


def test_evidence(directory, cycle):
    directory = Path(directory); c = contract()
    target = directory/'access-revocation-test-source'
    workflow = '.github/workflows/livepalmes-test-mail-sources.yml'
    info = cycle.artifact(c['testSourceRun'], 'test-backend-proof', target, workflow)
    proof_path = target/'test-backend-proof.json'
    require(hashlib.sha256(proof_path.read_bytes()).hexdigest() == c['testSourceProofSha256']
            and info['head_sha'] == CANDIDATE, 'Preuve sources TEST A3.3 differente')
    current = cycle.read(directory/'test-proof.json')['state']
    source = common.load('publish-test-access-revocation-sources.py')
    api = SimpleNamespace(gh=lambda endpoint:{'workflow_runs':[info]}, artifact=cycle.artifact,
        read=cycle.read, matching_functions=cycle.matching_functions,
        test_backend_fingerprints=cycle.test_backend_fingerprints)
    # Reuse the existing TEST validator, pinned here to the authenticated source run.
    # Avoid downloading its unchanged ZIP a second time in this same qualification.
    api.artifact = lambda run,name,destination,workflow_path: _reuse_test_source(run,name,destination,workflow_path,target,info,c)
    trusted = source.trusted_revisions(directory, current, api)
    require({source.PREFIX+n for n in c['selected']} <= trusted, 'Sources TEST incompletes pour les consommateurs PROD')


def _reuse_test_source(run, name, destination, workflow, source, info, c):
    require(int(run) == c['testSourceRun'] and name == 'test-backend-proof'
            and workflow == '.github/workflows/livepalmes-test-mail-sources.yml', 'Autre preuve sources TEST refusee')
    destination = Path(destination); destination.mkdir(parents=True,exist_ok=True)
    data = (source/'test-backend-proof.json').read_bytes()
    require(hashlib.sha256(data).hexdigest() == c['testSourceProofSha256'], 'Preuve sources TEST alteree')
    (destination/'test-backend-proof.json').write_bytes(data)
    return info


def runtime(function):
    c = contract(); name = function.get('name','').split('/')[-1]
    require(name in c['selected'] and function.get('name') == PREFIX+name and function.get('state') == 'ACTIVE'
            and function.get('environment') == 'GEN_2' and function.get('buildConfig',{}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name
            and hashlib.sha256(function.get('serviceConfig',{}).get('serviceAccountEmail','').encode()).hexdigest() == c['runtimeAccountSha256'],
            'Runtime A3.3 existant different: '+name)


def initial(functions, value):
    validate_manifest(value)
    common.initial(functions, value, runtime_validator=runtime)
    reference = next((f for f in functions if f['name'] == PREFIX+'getCurrentAccessUser'), None)
    require(reference is not None, 'Lecteur de profil runtime absent')
    runtime(reference)


def assert_selected(before, after, candidate):
    require(candidate == CANDIDATE, 'Autre candidat A3.3')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


FIRESTORE = 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents'
AUTH = 'https://identitytoolkit.googleapis.com/v1/projects/livepalmes/accounts:lookup?'+urllib.parse.urlencode({'fields':'users/localId,users/disabled'})
IAM = 'https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:getIamPolicy?fields=bindings(role,members,condition)'
READER_PERMISSIONS = ['firebaseauth.users.get','datastore.entities.get','datastore.entities.list',
                      'resourcemanager.projects.getIamPolicy','iam.roles.get']


def discover_reader(candidate, read):
    require(candidate == CANDIDATE, 'Decouverte lecteur reservee au candidat A3.3')
    contract()
    result = read('https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions',
                  {'permissions':READER_PERMISSIONS}).get('permissions',[])
    require(isinstance(result,list) and set(result) <= set(READER_PERMISSIONS), 'Reponse permissions lecteur inconnue')
    return {'readOnly':True,'accountReads':0,'iamWrites':0,'publicationAllowed':False,
            'requestedPermissions':READER_PERMISSIONS,'grantedPermissions':sorted(set(result)),
            'missingPermissions':sorted(set(READER_PERMISSIONS)-set(result))}


def _read(url, body=None):
    # Only the candidate-specific metadata reads below. POST is a read for
    # runQuery/accounts:lookup/getIamPolicy, never an account or policy write.
    allowed = (url in {FIRESTORE+':runQuery', AUTH, IAM}
               or url.startswith(FIRESTORE+'/users/') and '?mask.fieldPaths=status' in url
               or re.fullmatch(r'https://iam[.]googleapis[.]com/v1/(?:roles/[A-Za-z0-9_.]+|projects/livepalmes/roles/[A-Za-z0-9_.]+)\?fields=includedPermissions', url))
    require(allowed, 'Lecture A3.3 hors metadonnees fermees')
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'],
                                    text=True, stderr=subprocess.DEVNULL).strip()
    req = urllib.request.Request(url, method='POST' if body is not None else 'GET',
            data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read(2*1024**2+1)
    except urllib.error.HTTPError as error:
        # Keep the API's technical reason, never its raw body, account IDs or token.
        try:
            failure = json.loads(error.read(8192)).get('error',{})
            message = str(failure.get('message',''))
            for value in [token]+(body or {}).get('localId',[]):
                message = message.replace(value,'<redacted>')
            message = re.sub(r'[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+','<identity>',message)
            message = re.sub(r'[A-Za-z0-9_-]{20,}',lambda match:
                match[0] if re.fullmatch(r'[A-Z_]{3,80}',match[0]) else '<identifier>',message)
            error.a33_google_error = {'status':str(failure.get('status',''))[:40],
                'message':message.replace('\n',' ')[:240]}
        except (ValueError,TypeError,AttributeError):
            error.a33_google_error = {'status':'unavailable','message':'Error body omitted'}
        raise
    require(len(raw) <= 2*1024**2, 'Metadonnees A3.3 hors limite')
    return json.loads(raw)


def prerequisites(account, legacy_uids, read=None):
    transport = read or _read
    def read(url, body=None):
        try:
            return transport(url, body)
        except urllib.error.HTTPError as error:
            error.a33_stage = ('auth-lookup' if url == AUTH else 'runtime-iam-policy' if url == IAM
                               else 'runtime-role' if url.startswith('https://iam.googleapis.com/')
                               else 'administrative-profiles')
            raise
    require(re.fullmatch(r'[A-Za-z0-9._-]+@[a-z0-9.-]+[.]gserviceaccount[.]com', account)
            and hashlib.sha256(account.encode()).hexdigest() == contract()['runtimeAccountSha256'], 'Compte runtime non ferme')
    require(len(legacy_uids) <= 1 and all(re.fullmatch('[A-Za-z0-9_-]{1,128}',uid) for uid in legacy_uids), 'Transition hors budget')
    field = 'capabilities.`admin.full`'
    query = {'structuredQuery':{'from':[{'collectionId':'users'}],
        'select':{'fields':[{'fieldPath':'status'},{'fieldPath':field}]},
        'where':{'compositeFilter':{'op':'AND','filters':[
            {'fieldFilter':{'field':{'fieldPath':'status'},'op':'EQUAL','value':{'stringValue':'active'}}},
            {'fieldFilter':{'field':{'fieldPath':field},'op':'EQUAL','value':{'booleanValue':True}}}]}},'limit':2}}
    result = read(FIRESTORE+':runQuery', query)
    require(isinstance(result,list) and 1 <= len(result) <= 2, 'Reponse profils administratifs hors limite')
    users = {}
    for row in result:
        doc = row.get('document',{}); fields = doc.get('fields',{}); name = doc.get('name','')
        prefix = 'projects/livepalmes/databases/(default)/documents/users/'
        uid = name.removeprefix(prefix)
        require(name.startswith(prefix) and re.fullmatch('[A-Za-z0-9_-]{1,128}',uid) and uid not in users
                and fields.get('status') == {'stringValue':'active'}
                and fields.get('capabilities',{}).get('mapValue',{}).get('fields',{}).get('admin.full') == {'booleanValue':True},
                'Profil administratif actif non demontre')
        users[uid] = True
    require(users, 'Aucun profil administratif actif trouve')
    legacy_found = 0
    for uid in legacy_uids:
        try:
            doc = read(FIRESTORE+'/users/'+urllib.parse.quote(uid,safe='')+'?mask.fieldPaths=status')
            legacy_found += int(bool(doc))
        except urllib.error.HTTPError as error:
            if error.code != 404: raise
    requested = sorted(set(users)|set(legacy_uids))
    require(len(requested) <= 3, 'Lookup Auth hors budget')
    found = read(AUTH, {'localId':requested}).get('users',[])
    require(isinstance(found,list) and len(found) <= len(requested), 'Lookup Auth tronque ou excessif')
    by_uid = {}
    for row in found:
        uid = row.get('localId')
        require(uid in requested and uid not in by_uid and set(row) <= {'localId','disabled'}
                and type(row.get('disabled',False)) is bool, 'Compte Auth hors lecture ciblee')
        by_uid[uid] = row
    enabled = [u for u in users if u in by_uid and not by_uid[u].get('disabled',False)]
    require(enabled, 'Continuite administrative Auth non demontree')
    # Existing runtime permission, observed without impersonation or IAM change.
    policy = read(IAM, {'options':{'requestedPolicyVersion':3}})
    bindings = policy.get('bindings',[])
    require(isinstance(bindings,list) and len(bindings) <= 250, 'Politique runtime hors limite')
    principal = 'serviceAccount:'+account
    roles = sorted({b['role'] for b in bindings if principal in b.get('members',[]) and not b.get('condition')})
    require(0 < len(roles) <= 10, 'Attribution runtime directe non demontree')
    granted = False
    checked = 0
    for role in roles:
        require(re.fullmatch(r'roles/[A-Za-z0-9_.]+|projects/livepalmes/roles/[A-Za-z0-9_.]+',role), 'Role runtime inconnu')
        metadata = read('https://iam.googleapis.com/v1/'+role+'?fields=includedPermissions')
        checked += 1
        if 'datastore.entities.get' in metadata.get('includedPermissions',[]):
            granted = True
            break
    require(granted, 'Lecture de profil non demontree pour le runtime PROD')
    return {'readOnly':True,'ready':True,'profileLimit':2,'authLookupLimit':3,
            'activeAdministrativeProfiles':len(users),'enabledAdministrativeAuthAccounts':len(enabled),
            'legacyProfileFound':bool(legacy_found), 'legacyAuthFound':any(uid in by_uid for uid in legacy_uids),
            'legacyProfileBypassRemoved':True,'runtimeProfileReadPermissionVerified':True,
            'runtimeRolesChecked':checked,'accountOrRightChanges':0,'businessInvocations':0}


def _legacy_uids():
    name = 'functions/livepalmes-environment.js'
    blob = subprocess.check_output(['git','rev-parse','HEAD:'+name],cwd=ROOT,text=True).strip()
    require(blob == contract()['protectedBlobs'][name][1], 'Configuration technique hors candidat A3.3')
    code = 'console.log(JSON.stringify(require(process.argv[1]).PROJECTS.livepalmes.legacyAdminUids))'
    return json.loads(subprocess.check_output(['node','-e',code,str(ROOT/name)]))


def _live_prerequisites():
    uids = _legacy_uids()
    state = common.load('production-release-state.py')
    reference = state.request(state.API+PREFIX+'getCurrentAccessUser')
    runtime(reference)
    return prerequisites(reference['serviceConfig']['serviceAccountEmail'], uids)


def guard(directory, after=False):
    directory = Path(directory); value = manifest(directory)
    observed = common.controls()
    require(observed == value['controls'], 'Derive mails, automates ou modeles A3.3')
    witness = directory/'standard-controls-before.json'
    if witness.exists(): require(json.loads(witness.read_text()) == observed, 'Temoin A3.3 initial different')
    else:
        require(not after, 'Temoin A3.3 initial absent')
        witness.write_text(json.dumps(observed))
    if after: (directory/'standard-controls-after.json').write_text(json.dumps(observed))
    destination = directory/('standard-access-revocation-prerequisites-'+('after' if after else 'before')+'.json')
    try:
        result = _live_prerequisites()
    except Exception as error:
        destination.write_text(json.dumps({'readOnly':True,'ready':False,'failureType':type(error).__name__,
                                          'httpStatus':getattr(error,'code',None),
                                          'stage':getattr(error,'a33_stage',None),
                                          'googleError':getattr(error,'a33_google_error',None)}))
        raise
    destination.write_text(json.dumps(result))


def restore_witness(directory, source):
    raise ValueError('Reprise A3.3 exige un examen de la sauvegarde et des revisions avant ecriture')
