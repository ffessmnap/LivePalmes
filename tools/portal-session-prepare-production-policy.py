"""One A3.4a compatible bootstrap release; no PROD enforcement or Rules writes."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261117-production-portal-session-prepare-contract.json'
DIGEST = 'ad7a9fc12408a14aef3295db112a771b7511b20c28c6b1fe4febe4b73189a7df'
OPTION = 'portalSessionPrepareRelease'
KIND = 'a34-portal-session-prepare-existing-v1'
CANDIDATE = '63fb92732a448401035f24bcd0a7c466cfce4f82'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('session_prepare_common', ROOT/'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec); spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat PROD session A modifie')
    c = json.loads(raw)
    for filename, key in [('portal-session-production-capabilities.py', 'capabilityModuleSha256'), ('access-revocation-production-policy.py', 'administrativeReaderModuleSha256')]:
        require(hashlib.sha256((ROOT/'tools'/filename).read_bytes().replace(b'\r\n', b'\n')).hexdigest() == c[key], 'Lecteur de capacites/continuite modifie')
    require(c['candidate'] == CANDIDATE and c['selected'] == ['getCurrentAccessUser']
            and c['phase'] == 'prepare-compatible' and c['productionEnforcement'] is False
            and c['inventoryCount'] == 119 and c['newFunctions'] == c['deletedFunctions'] == []
            and c['configurationChanges'] is c['bindingChanges'] is c['rulesDeployment'] is False,
            'Contrat reserve au bootstrap compatible, sans phase B')
    require(hashlib.sha256((ROOT/c['productionRulesSource']).read_bytes().replace(b'\r\n', b'\n')).hexdigest() == c['productionRulesSha256'], 'Source Rules PROD historique alteree')
    return c


def enabled(value): return OPTION in value


def approved(value):
    if not enabled(value): return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}}, 'Demande session A hors candidat/options')
    return c['selected']


def paths(value, changed, git):
    if not enabled(value): return
    approved(value); c = contract()
    require(digest(sorted(changed)) == c['changedPathsSha256'], 'Diff complet session A different')
    for name, pair in c['protectedBlobs'].items():
        require([git('rev-parse', sha+':'+name) for sha in [c['productionCommit'], CANDIDATE]] == pair,
                'Source session A hors version fermee : '+name)
    require(c['protectedBlobs']['functions/portal-session.js'][0] == c['protectedBlobs']['functions/portal-session.js'][1]
            and c['protectedBlobs']['firestore.rules'][0] == c['protectedBlobs']['firestore.rules'][1],
            'Module de garde ou regles session A modifies')


def historical_proof(directory, cycle):
    c = contract()['historicalProof']; directory = Path(directory)/'session-prepare-inherited'
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


def complete_selection(origins, fingerprint, legacy, inherited):
    c = contract()
    require(len(origins) == 119 and digest(origins) == c['originsSha256'], 'Origines PROD session A differentes')
    desired, conservative = fingerprint(CANDIDATE), legacy(CANDIDATE)
    base, oldbase = fingerprint(c['productionCommit']), legacy(c['productionCommit'])
    require(set(desired) == set(base) == set(conservative) == set(oldbase), 'Declaration session A ajoutee ou retiree')
    require(sorted(n for n in desired if desired[n] != base[n]) == c['selected']
            and sorted(n for n in conservative if conservative[n] != oldbase[n]) == c['selected'],
            'Delta depuis derniere PROD non limite au bootstrap')
    oldrows = {r['name']: r for r in inherited['functionReviews']}
    rows, qualified = [], []
    for f in origins:
        name = f['name'].split('/')[-1]
        require(f['state'] == 'ACTIVE' and f['revision'] and f['updateTime'] and name in desired, 'Origine session A incomplete')
        previous, old = fingerprint(f['commit']), legacy(f['commit'])
        require(name in previous and name in old, 'Origine session A inconnue')
        a, b, x, y = previous[name], desired[name], old[name], conservative[name]
        changed, legacy_changed = a != b, x != y
        method = 'both-comparators-changed' if changed else 'both-comparators-unchanged'
        if changed != legacy_changed:
            r = oldrows.get(name, {})
            require(not changed and legacy_changed and r.get('legacyChanged') is True
                    and r.get('commit') == f['commit'] and r.get('revision') == f['revision']
                    and r.get('legacyBefore') == x and r.get('legacyAfter') == y
                    and r.get('optimizedBefore') == a and r.get('optimizedAfter') == b
                    and isinstance(r.get('normalizedBefore'), str) and len(r['normalizedBefore']) == 64
                    and r.get('normalizedBefore') == r.get('normalizedAfter')
                    and base[name] == b and oldbase[name] == y,
                    'Ecart non qualifie : aucune reduction de selection permise : '+name)
            qualified.append(name); method = 'authenticated-inherited-equivalence-unchanged-since-production'
        rows.append({**f, 'shortName': name, 'before': a, 'after': b, 'legacyBefore': x, 'legacyAfter': y,
                     'changed': changed, 'legacyChanged': legacy_changed, 'method': method})
    result = {'schema': 1, 'candidate': CANDIDATE, 'productionRun': c['productionRun'], 'inventoryCount': 119,
              'selected': [r['shortName'] for r in rows if r['changed']], 'inheritedNames': qualified,
              'rows': rows, 'historicalProof': c['historicalProof'], 'completeOriginsSha256': digest(origins)}
    require(result['selected'] == c['selected'] and digest(result) == c['selectionProofSha256'],
            'Selection session A incomplete ou differente')
    return result


def expected_manifest(rows):
    c = contract()
    require(digest(rows) == c['manifestOriginsSha256'], 'Origines du manifeste session A alterees')
    return {'schema': 1, 'kind': KIND, 'requestSha256': digest({**c['request'], OPTION: {'contractSha256': DIGEST}}),
            **{k: c[k] for k in ['candidate', 'productionRun', 'productionCommit', 'productionHosting', 'testRun',
                                 'selected', 'inventoryCount', 'staticPaths', 'controls', 'approval',
                                 'configurationChanges', 'bindingChanges', 'newFunctions', 'deletedFunctions']},
            'origins': rows, 'businessInvocations': 0, 'mailPause': False, 'contractSha256': DIGEST,
            'selectionProofSha256': c['selectionProofSha256']}


def validate_manifest(value):
    require(value == expected_manifest(value.get('origins', [])), 'Manifeste session A hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    approved(request or json.loads((directory/'request.json').read_text()))
    return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    c = contract(); paths(value, changed, git)
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                        'source': 'verified-publication-artifacts'}, 'Reference PROD session A non authentifiee')
    cycle = common.load('release-cycle.py'); directory = Path(os.environ['PLAN'])
    proof = complete_selection(sorted(functions.values(), key=lambda f: f['name']), fingerprint, legacy,
                               historical_proof(directory, cycle))
    require(sorted(selected) == proof['selected'], 'Selection session A reduite ou elargie')
    cycle.write(directory/'standard-session-prepare-selection-proof.json', proof)
    return expected_manifest(proof['rows'])


def verify_retained_backend(directory, state, selected, cycle):
    value = manifest(directory); proof = cycle.read(Path(directory)/'standard-session-prepare-selection-proof.json')
    require(digest(proof) == contract()['selectionProofSha256'] and sorted(selected) == value['selected']
            and sorted(state['functions'], key=lambda f: f['name']) == [{k: r[k] for k in ['name','updateTime','state','revision','commit']} for r in value['origins']],
            'Revue retenue session A hors inventaire')
    rows = [r for r in proof['rows'] if not r['changed']]; names = sorted(r['shortName'] for r in rows)
    cycle.write(Path(directory)/'excluded-backend-verification.json', {
        'suite': contract()['request']['excludedBackendEvidence']['suite'], 'method': KIND,
        'candidate': CANDIDATE, 'productionCommit': value['productionCommit'], 'productionRun': value['productionRun'],
        'result': 'success', 'networkCalls': 0, 'passedFunctions': names, 'retainedFunctions': names,
        'rawLegacyDifferenceCount': sum(r['legacyChanged'] for r in rows), 'functionReviews': rows,
        'reviewSha256': digest(rows), 'selectionProofSha256': digest(proof), 'suiteSha256': DIGEST})


def test_evidence(directory, cycle):
    directory = Path(directory); c = contract(); target = directory/'session-prepare-test-source'
    info = cycle.artifact(c['testSourceRun'], 'test-backend-proof', target, '.github/workflows/livepalmes-test-mail-sources.yml')
    path = target/'test-backend-proof.json'
    require(info['head_sha'] == CANDIDATE and hashlib.sha256(path.read_bytes()).hexdigest() == c['testSourceProofSha256'],
            'Preuve sources TEST session A incompatible')
    source = common.load('publish-test-portal-session-prepare.py')
    def reuse(run, name, destination, workflow):
        require(int(run) == c['testSourceRun'] and name == 'test-backend-proof'
                and workflow == '.github/workflows/livepalmes-test-mail-sources.yml', 'Autre preuve source refusee')
        destination = Path(destination); destination.mkdir(parents=True, exist_ok=True)
        (destination/'test-backend-proof.json').write_bytes(path.read_bytes()); return info
    api = SimpleNamespace(gh=lambda endpoint: {'workflow_runs': [info]}, artifact=reuse, read=cycle.read,
                          matching_functions=cycle.matching_functions, test_backend_fingerprints=cycle.test_backend_fingerprints)
    current = cycle.read(directory/'test-proof.json')['state']
    require(source.PREFIX+'getCurrentAccessUser' in source.trusted_revisions(directory, current, api),
            'Archive/revision TEST du bootstrap non attestees')


def runtime(function):
    c = contract()
    require(function.get('name') == PREFIX+'getCurrentAccessUser' and function.get('state') == 'ACTIVE'
            and function.get('environment') == 'GEN_2' and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == 'getCurrentAccessUser'
            and hashlib.sha256(function.get('serviceConfig', {}).get('serviceAccountEmail', '').encode()).hexdigest() == c['runtimeAccountSha256'],
            'Runtime bootstrap different de la reference existante')


def initial(functions, value):
    validate_manifest(value); common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == CANDIDATE, 'Autre candidat bootstrap refuse')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def rules_snapshot(directory, expected=None):
    rules = common.load('direct-realtime-production-rules.py')
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'], text=True, stderr=subprocess.DEVNULL).strip()
    observed, text = rules.snapshot(token)
    (Path(directory)/'standard-session-prepare-rules-observed.json').write_text(json.dumps({'readOnly': True, 'observed': observed}, sort_keys=True), encoding='utf-8')
    require(observed['sha256'] == contract()['productionRulesSha256'] and (expected is None or observed == expected),
            'Regles PROD differentes : aucune reinitialisation ni publication')
    return {'readOnly': True, 'deployed': False, 'indexesDeployed': False, 'observed': observed}


def auth(directory, after=False, prerequisite=False):
    directory = Path(directory); value = manifest(directory); caps = common.load('portal-session-production-capabilities.py')
    proof = caps.qualify(CANDIDATE, 'hosting')
    expected = None
    ready = directory/'standard-session-prepare-ready-hosting/prerequisites-hosting.json'
    if not prerequisite:
        require(ready.is_file(), 'Prerequis officiels session A absents')
        expected = json.loads(ready.read_text())['portalSessionPrepare']['rules']['observed']
    ruleproof = rules_snapshot(directory, expected)
    result = {**proof, 'rules': ruleproof, 'contractSha256': DIGEST, 'manifestSha256': digest(value),
              'run': int(os.environ['GITHUB_RUN_ID']), 'toolingCommit': os.environ['GITHUB_SHA']}
    suffix = 'prerequisites' if prerequisite else 'after' if after else 'before'
    (directory/('standard-session-prepare-auth-'+suffix+'.json')).write_text(json.dumps(result, sort_keys=True), encoding='utf-8')
    return result


def guard(directory, after=False):
    directory = Path(directory); value = manifest(directory); c = contract()
    caps = common.load('portal-session-production-capabilities.py'); proof = caps.qualify(CANDIDATE, 'backend')
    require(proof['ready'] and proof['missingRuntimePermissions'] == []
            and proof['runtimeRolePermissionsSha256'] == c['runtimeRolePermissionsSha256']
            and proof['rolePermissionScope'] == 'exact-role-resource', 'Capacites runtime session A differentes')
    observed = {'controls': common.controls(), 'runtime': proof}
    require(observed['controls'] == c['controls'], 'Derive des mails actifs/automates/modeles session A')
    require(not (directory/'previous').exists(), 'Reprise session A automatique non autorisee')
    # Prerequisites have their own fresh Hosting matrix report; release needs same-run auth evidence.
    if '.github/workflows/livepalmes-production-release.yml@' in os.environ.get('GITHUB_WORKFLOW_REF', ''):
        suffix = 'after' if after else 'before'; path = directory/('standard-session-prepare-auth-'+suffix+'.json')
        require(path.is_file(), 'Continuite administrative du meme run absente')
        admin = json.loads(path.read_text())
        require(admin['run'] == int(os.environ['GITHUB_RUN_ID']) and admin['toolingCommit'] == os.environ['GITHUB_SHA']
                and admin['contractSha256'] == DIGEST and admin['manifestSha256'] == digest(value)
                and admin['ready'] and admin['readOnly'] and admin['accountOrRightChanges'] == 0,
                'Continuite administrative session A incompatible')
    path = directory/'standard-session-prepare-controls-before.json'
    if path.exists(): require(json.loads(path.read_text()) == observed, 'Temoin initial session A different')
    else:
        require(not after, 'Temoin initial session A absent')
        path.write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')
    if after: (directory/'standard-session-prepare-controls-after.json').write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')


def restore_witness(directory, guards):
    raise ValueError('Reprise automatique session A non autorisee')


def backend_readiness(directory):
    directory = Path(directory); value = manifest(directory)
    proof = json.loads((directory/'standard-session-prepare-controls-before.json').read_text())
    return {'contractSha256': DIGEST, 'manifestSha256': digest(value), 'selected': value['selected'],
            'retainedFunctions': 118, 'runtime': proof['runtime'], 'controls': proof['controls']}


def readiness(directory, preparation, run):
    directory = Path(directory); value = manifest(directory); cycle = common.load('release-cycle.py')
    require(str(run).isdigit() and int(run) > 0 and str(preparation).isdigit() and int(preparation) > 0,
            'Preflight/prerequis officiels session A requis')
    pre = cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{preparation}')
    require(pre['head_sha'] == os.environ['GITHUB_SHA'] and pre['conclusion'] == 'success'
            and pre['run_attempt'] == 1 and pre['path'] == '.github/workflows/livepalmes-production-preflight.yml',
            'Preflight session A du meme outillage absent')
    for kind in ['backend', 'hosting']:
        target = directory/('standard-session-prepare-ready-'+kind)
        info = cycle.artifact(run, 'production-prerequisites-'+kind, target, '.github/workflows/livepalmes-production-readiness.yml')
        report = json.loads((target/('prerequisites-'+kind+'.json')).read_text()); proof = report.get('portalSessionPrepare', {})
        require(info['head_sha'] == os.environ['GITHUB_SHA'] and report['planRun'] == int(preparation)
                and report['candidate'] == CANDIDATE and report['kind'] == kind and report['ready'] is True
                and report['readOnly'] is True and report['missingPermissions'] == []
                and proof.get('contractSha256') == DIGEST and proof.get('manifestSha256') == digest(value),
                'Prerequis session A incompatibles')
        if kind == 'backend':
            require(proof.get('selected') == ['getCurrentAccessUser'] and proof.get('retainedFunctions') == 118
                    and proof.get('controls') == contract()['controls'] and proof.get('runtime', {}).get('ready')
                    and proof['runtime']['runtimeRolePermissionsSha256'] == contract()['runtimeRolePermissionsSha256'],
                    'Preuve runtime session A absente')
        else:
            require(proof.get('ready') and proof.get('accountOrRightChanges') == 0
                    and proof.get('enabledAdministrativeAuthAccounts', 0) > 0
                    and proof.get('rules', {}).get('observed', {}).get('sha256') == contract()['productionRulesSha256'],
                    'Continuite/regles session A non demontrees')


if __name__ == '__main__':
    mode, directory, *args = sys.argv[1:]
    request = json.loads((Path(directory)/'request.json').read_text())
    if enabled(request):
        if mode == 'readiness' and len(args) == 2: readiness(directory, *args)
        elif mode in {'auth-before', 'auth-after'} and not args: auth(directory, mode == 'auth-after')
        elif mode == 'rules-final' and len(args) == 1:
            manifest(directory)
            before = json.loads((Path(directory)/'standard-session-prepare-auth-before.json').read_text())
            proof = rules_snapshot(directory, before['rules']['observed'])
            Path(args[0]).write_text(json.dumps({'candidate': CANDIDATE, 'contractSha256': DIGEST, **proof}, indent=2), encoding='utf-8')
        else: raise ValueError('Mode session A inconnu')
