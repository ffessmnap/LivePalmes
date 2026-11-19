"""Publish only the five retired Direct sources using the existing source-only transport."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'a5RetirementRelease'
KIND = 'a5-retirement-existing-v1'
CONTRACT = ROOT / '.github/releases/evidence/20261119-production-a5-retirement-contract.json'
DIGEST = '3824bbfe70f7a94966cd8e876135d862615c77ef5f8f3041e5753180de0e87b7'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('fees_common', ROOT / 'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat A5 modifie')
    value=json.loads(raw)
    require(value['selected']==common.load('a5-legacy-direct-policy.py').scope()['functions'] and value['inventoryCount']==119 and value['newFunctions']==value['deletedFunctions']==[] and value['configurationChanges'] is value['bindingChanges'] is False,'A5_SOURCE_SCOPE')
    return value


def enabled(value):
    return OPTION in value


def approved(value):
    if not enabled(value):
        return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}},
            'Demande hors du contrat A5')
    return c['selected']


def paths(value, changed, git):
    approved(value)
    c = contract()
    common.load('a5-legacy-direct-policy.py').validate_candidate(c['candidate'],git)
    require(digest(sorted(changed)) == c['changedPathsSha256'], 'Diff complet hors contrat')
    for name, pair in c['protectedBlobs'].items():
        require([git('rev-parse', ref + ':' + name) for ref in (c['productionCommit'], c['candidate'])] == pair,
                'Declaration ou configuration differente : ' + name)


def expected_manifest(origins=None):
    c = contract()
    origins = c['origins'] if origins is None else origins
    require(len(origins) == c['inventoryCount'] and digest(origins) == c['originsSha256'],
            'Origines PROD differentes de la decouverte')
    fields = ('candidate', 'productionRun', 'productionCommit', 'productionHosting', 'testRun', 'selected',
              'controls', 'inventoryCount', 'approval', 'staticPaths', 'configurationChanges', 'bindingChanges',
              'newFunctions', 'deletedFunctions', 'selectionProofSha256')
    return {**{key: c[key] for key in fields}, 'schema': 1, 'kind': KIND, 'contractSha256': DIGEST,
            'requestSha256': digest({**c['request'], OPTION: {'contractSha256': DIGEST}}),
            'origins': origins, 'mailPause': False, 'businessInvocations': 0}


def validate_manifest(value):
    require(value == expected_manifest(value['origins']), 'Manifeste A5 hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory / 'request.json').read_text())
    require(enabled(request), 'Option organisateur absente du plan')
    approved(request)
    return validate_manifest(json.loads((directory / 'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    paths(value, changed, git)
    c = contract()
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                         'source': 'verified-publication-artifacts'}, 'Reference PROD non authentifiee')
    origins = sorted(functions.values(), key=lambda row: row['name'])
    result = expected_manifest(origins)
    candidate = c['candidate']
    desired, legacy_desired = fingerprint(candidate), legacy(candidate)
    calculated, inherited = [], []
    for row in origins:
        name = row['name'].removeprefix(PREFIX)
        before, raw_before = fingerprint(row['commit'])[name], legacy(row['commit'])[name]
        if before != desired[name]:
            require(raw_before != legacy_desired[name], 'Desaccord sur une source a publier : ' + name)
            calculated.append(name)
        elif raw_before != legacy_desired[name]:
            require(legacy(c['productionCommit'])[name] == legacy_desired[name], 'Nouvel ecart historique : ' + name)
            inherited.append(dict(name=name, commit=row['commit'], revision=row['revision'],
                                  legacyBefore=raw_before, legacyAfter=legacy_desired[name],
                                  optimizedBefore=before, optimizedAfter=desired[name]))
    require(sorted(selected) == calculated == c['selected'], 'Selection complete differente du contrat')
    inputs = dict(schema=1, project='livepalmes', candidate=candidate, rows=inherited)
    verifier = ROOT / 'tools/admin-mfa-selection-proof.js'
    proof = json.loads(subprocess.check_output(['node', str(verifier)], input=json.dumps(inputs).encode()))
    require(digest(proof) == c['selectionProofSha256'], 'Equivalence des sources conservees non reproduite')
    return result


def runtime(function):
    name = function.get('name', '').removeprefix(PREFIX)
    build = function.get('buildConfig', {})
    require(name in contract()['selected'] and function.get('name') == PREFIX + name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and build.get('runtime') == 'nodejs22' and build.get('entryPoint') == name,
            'Runtime historique A5 hors contrat : ' + name)


def initial(functions, value):
    validate_manifest(value)
    common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == contract()['candidate'], 'Candidat A5 different')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def guard(directory, after=False):
    directory = Path(directory)
    value = manifest(directory)
    if (directory/'previous').exists():common.load('a5-legacy-direct-production-completion.py').require_marker(directory)
    observed = common.controls()
    require(observed == value['controls'], 'Derive des mails, des automates ou des modeles')
    witness = directory / 'standard-controls-before.json'
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Temoin initial different')
    else:
        require(not after, 'Temoin initial absent')
        witness.write_text(json.dumps(observed))
    if after:
        (directory / 'standard-controls-after.json').write_text(json.dumps(observed))



def approved_config_paths(value,changed,git):
    if not enabled(value):return set()
    approved(value);c=contract();closed=common.load("a5-legacy-direct-policy.py")
    closed.validate_candidate(value["candidate"],git)
    closed.validate_hosting(json.loads(git("show",value["productionCommit"]+":firebase.json")),json.loads(git("show",value["candidate"]+":firebase.json")))
    closed.validate_rules(git("show",value["productionCommit"]+":firestore.rules")+"\n",git("show",value["candidate"]+":firestore.rules")+"\n")
    common.load("a5-legacy-direct-production-rules.py").sources(c)
    require({"firebase.json","firestore.rules"} <= set(changed),"A5_CONFIG_DELTA_MISSING")
    return {"firebase.json","firestore.rules"}

def validate_http_receipt(value,project,candidate):
    c=contract();closed=common.load("a5-legacy-direct-policy.py");checker=common.load("a5-legacy-direct-hosting-check.py")
    retired={*closed.scope()["retiredPages"],"series","resultats",*[p for p in closed.scope()["retiredPaths"] if p.endswith(".js") and not p.startswith("tools/")]}
    require(project in {"livepalmes","livepalmes-test"} and candidate==c["candidate"] and value.get("project")==project and value.get("candidate")==candidate and value.get("schema")==1 and value.get("result")=="success" and value.get("businessInvocations")==0 and value.get("scriptsExecuted") is False and value.get("maximumRequests")==90,"A5_HTTP_PROOF_CONTEXT")
    rows=value.get("rows",[]);require(isinstance(rows,list) and 30<=len(rows)<=90 and all(isinstance(r,dict) and r.get("path") in retired|set(checker.PRESERVED) for r in rows),"A5_HTTP_PROOF_ROWS")
    last={r["path"]:r for r in rows};require(set(last)==retired|set(checker.PRESERVED),"A5_HTTP_PROOF_COVERAGE")
    for name,row in last.items():
        require(row.get("redirect") is False,"A5_HTTP_REDIRECT")
        if name in retired:require(row.get("status")==404,"A5_HTTP_OLD_URL_VISIBLE")
        else:require(row.get("status")==200 and row.get("expectedSha256")==row.get("actualSha256")==c["staticSha256"][name],"A5_HTTP_PRESERVED_BYTES")
    return value

def test_evidence(directory,cycle):
    c=contract();destination=Path(directory)/"a5-test-rules"
    info=cycle.artifact(c["testRun"],"portal-session-rules-proof",destination,".github/workflows/livepalmes-test-common.yml")
    proof=cycle.read(destination/"test-portal-session-rules-proof.json");closed=common.load("a5-legacy-direct-policy.py")
    require(info["head_sha"]==proof["candidate"]==c["candidate"] and proof["project"]=="livepalmes-test" and proof["scopeSha256"]==closed.digest(closed.SCOPE.read_bytes()) and proof["before"]["sha256"]==closed.scope()["rulesBeforeSha256"] and proof["after"]["sha256"]==closed.scope()["rulesAfterSha256"] and proof["sourcesVerified"] is True and proof["indexesDeployed"] is proof["productionTouched"] is False and proof["businessInvocations"]==0,"A5_TEST_RULES_PROOF")
    http_dir=Path(directory)/"a5-test-http"
    http_info=cycle.artifact(c["testRun"],"a5-retirement-http-proof",http_dir,".github/workflows/livepalmes-test-common.yml")
    require(http_info["head_sha"]==c["candidate"],"A5_HTTP_PROOF_ORIGIN")
    validate_http_receipt(cycle.read(http_dir/"a5-retirement-http-proof.json"),"livepalmes-test",c["candidate"])
    cycle.write(Path(directory)/"a5-test-rules-proof.json",proof)
    common.load("a5-legacy-direct-hosting-check.py").check("livepalmes-test",c["candidate"],Path(directory)/"a5-test-http-proof.json")

def restore_witness(directory,source):
    return common.load("a5-legacy-direct-production-completion.py").restore(directory,source)


def state_check(backup,destination,success):
    backup,destination=Path(backup),Path(destination)
    credentials=json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    require(credentials.get('project_id')=='livepalmes','A5_STATE_PROJECT')
    state=common.load('production-release-state.py')
    report=json.loads((backup/'report.json').read_text())
    value=validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    selected={PREFIX+n for n in value['selected']}
    require(report.get('sourcePolicyKind')==KIND and report.get('candidate')==value['candidate']
            and report.get('standardSourceManifestSha256')==digest(value) and report.get('newFunctions')==[]
            and len(report['functions'])==len(selected) and {f['name'] for f in report['functions']}==selected,
            'A5_STATE_BACKUP_MANIFEST')
    saved=json.loads((backup/'functions.json').read_text());observed=state.inventory()
    before,after=({f['name']:f for f in rows} for rows in (saved,observed));errors=[]
    try:
        initial(saved,value)
        require(len(after)==len(observed)==value['inventoryCount'],'A5_STATE_INVENTORY')
        assert_retained(before,after,selected,state)
        for name in sorted(selected):assert_selected(before[name],after[name],value['candidate'])
        if success:
            receipts=json.loads((Path(os.environ['PLAN'])/'standard-source-receipts.json').read_text())
            require(receipts.get('candidate')==value['candidate'] and receipts.get('manifestSha256')==digest(value)
                    and set(receipts.get('functions',{}))==selected,'A5_STATE_SOURCE_RECEIPTS')
            for name in selected:
                receipt=receipts['functions'][name]
                require(state.identity(after[name])==receipt.get('identity')
                        and after[name].get('buildConfig',{}).get('source',{}).get('storageSource')==receipt.get('storageSource')
                        and receipt.get('allPathsAndFileBytesIdentical') is True
                        and receipt.get('generationReadAndReferencesRechecked') is True,
                        'A5_STATE_DRIFT_AFTER_SOURCE: '+name.split('/')[-1])
    except (ValueError,KeyError,FileNotFoundError) as error:
        errors.append(str(error))
    destination.write_text(json.dumps({'candidate':value['candidate'],'functions':[state.identity(f) for f in observed],
        'errors':errors,'a5RetirementContractSha256':DIGEST}),encoding='utf-8')
    require(not success or not errors,'Controle final A5 en echec : '+', '.join(errors))
