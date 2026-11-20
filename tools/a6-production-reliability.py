"""Frozen A6 promotion. Reuse source-only publishing, receipts and rollback."""
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('a6_source_policy', ROOT/'tools/organizer-fees-production-policy.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
OPTION = policy.OPTION = 'a6ReliabilityRelease'
KIND = policy.KIND = 'a6-reliability-existing-sources-v1'
DIGEST = policy.DIGEST = '6f9e280a9c7b66b45e3176233b72a93e4514a79c80da90b962e393dc0fc48b7d'
policy.CONTRACT = ROOT/'.github/releases/evidence/20261120-a6-production.json'
contract, enabled, approved, paths = policy.contract, policy.enabled, policy.approved, policy.paths
freeze, manifest, validate_manifest = policy.freeze, policy.manifest, policy.validate_manifest
require, digest, configuration = policy.require, policy.digest, policy.configuration
initial, assert_retained, assert_selected = policy.initial, policy.assert_retained, policy.assert_selected
PREFIX = policy.PREFIX
common = policy.common
# Isolated copy retains its source/label inverse and immutable archive checks.
inverse = common.load('a4-production-dependencies.py')
inverse.KIND, inverse.runtime = KIND, policy.runtime
validate_backup_generation = inverse.validate_backup_generation
INDEX = 'projects/livepalmes/databases/(default)/collectionGroups/engagementClosureQueue/indexes'
FIELDS = [{'fieldPath': p, 'order': 'ASCENDING'} for p in ['source','runAt','__name__']]


def ready_index(rows):
    matches = [r for r in rows if r.get('name', '').startswith(INDEX + '/') and r.get('queryScope') == 'COLLECTION'
               and r.get('fields') == FIELDS]
    require(len(matches) == 1 and matches[0].get('state') == 'READY', 'Index PROD A6 absent ou non READY')
    return matches[0]['name']


def verify_redirect(host='livepalmes.web.app'):
    from urllib.parse import urljoin, urlsplit
    import time
    require(host in ('livepalmes.web.app', 'livepalmes-test.web.app'), 'Hôte interdit')
    rule, = contract()['checkedRedirects']
    for delay in common.load('check-production-hosting.py').DELAYS:
        if delay:
            time.sleep(delay)
        connection = http.client.HTTPSConnection(host, timeout=25)
        try:
            connection.request('HEAD', rule['source'])
            reply = connection.getresponse()
            location = reply.getheader('Location', '')
            target = urlsplit(urljoin('https://'+host+'/', location))
            if (reply.status == rule['type'] and location and target.scheme == 'https' and target.netloc == host
                    and target.path == rule['destination'] and not target.query and not target.fragment):
                return {'path':rule['source'], 'status':reply.status, 'destination':target.path}
        finally:
            connection.close()
    raise ValueError('Redirection publique A6 différente')


def check_index():
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'], text=True).strip()
    req = urllib.request.Request('https://firestore.googleapis.com/v1/'+INDEX+'?pageSize=0',
                                 headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req, timeout=30) as response:
        page = json.load(response)
    require(not page.get('nextPageToken'), 'Inventaire index incomplet')
    return ready_index(page.get('indexes', []))


def guard(directory, after=False):
    require(not (Path(directory)/'previous').exists(), 'Reprise A6 non qualifiée')
    check_index()
    policy.guard(directory, after)


def test_evidence(directory, cycle):
    c = contract()
    directory = Path(directory)
    for run_key, name, file, expected_hash, workflow in [
            ('testSourcesRun','test-backend-proof','test-backend-proof.json','testSourceSha256','livepalmes-test-mail-sources.yml'),
            ('testIndexRun','a6-notification-index-proof','a6-notification-index-proof.json','testIndexSha256','a6-test-notification-index.yml')]:
        dest = directory / ('a6-'+name)
        info = cycle.artifact(c[run_key], name, dest, '.github/workflows/' + workflow)
        require(info['head_sha'] == c['candidate'] and info['event'] == 'workflow_dispatch'
                and hashlib.sha256((dest/file).read_bytes()).hexdigest() == c[expected_hash], 'Reçu TEST A6 incompatible')
    receipt = cycle.read(directory/'a6-test-backend-proof/test-backend-proof.json')
    require(receipt['currentTestState']['functions'] == cycle.read(directory/'test-proof.json')['state']['functions']
            and receipt['release'] == 'a6_reliability' and receipt['selected'] == c['testSelected']
            and receipt['controlsBefore'] == receipt['controlsAfter'] and receipt['pendingMessagesPreserved'] is True
            and receipt['configurationsUnchanged'] is True and set(receipt['managedSources']) == set(c['testSelected'])
            and set(c['testSelected']) - set(c['selected']) == {'exportNapPublicPage'}
            and all(row['allPathsAndFileBytesIdentical'] and row['generationReadAndReferencesRechecked']
                    for row in receipt['managedSources'].values()), 'Sources ou témoins A6 incompatibles')
    info = cycle.gh(f"repos/ffessmnap/LivePalmes/actions/runs/{c['testFinalRun']}")
    require(info['head_sha'] == c['candidate'] and info['path'] == '.github/workflows/livepalmes-test-common.yml'
            and info['event'] == 'workflow_dispatch' and info['head_branch'] == 'main' and info['run_attempt'] == 1
            and info['display_title'] == 'Verification TEST sans deploiement' and info['conclusion'] == 'success',
            'Vérification TEST finale incompatible')


def verify_backup_inverse(backup, report, before, value):
    validate_manifest(value)
    selected = {PREFIX+n for n in value['selected']}
    require(len(report['functions']) == len(selected) and {f['name'] for f in report['functions']} == selected
            and report['newFunctions'] == [] and report['candidate'] == value['candidate'], 'Sauvegarde hors lot A6')
    inverse.verify_backup_inverse(backup, report, {name:before[name] for name in selected}, value)


def state_dispatch(args):
    mode, directory, destination, *outcome = args
    backup, after = Path(directory), Path(destination)
    report = json.loads((backup/'report.json').read_bytes())
    value = validate_manifest(json.loads((backup/'standard-source-manifest.json').read_bytes()))
    require(report['sourcePolicyKind'] == KIND and report['standardSourceManifestSha256'] == digest(value)
            and report['candidate'] == value['candidate'], 'Rapport A6 différent')
    require(json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_bytes()).get('project_id') == 'livepalmes'
            and report['newFunctions'] == [] and len(report['functions']) == len(value['selected'])
            and {f['name'] for f in report['functions']} == {PREFIX+n for n in value['selected']}, 'Cible du retour A6 différente')
    if mode == 'check' and outcome in (['success'], ['failure']):
        return policy.state_check(backup, after, outcome == ['success'], contract_field='a6ReliabilityContractSha256')
    state = common.load('production-release-state.py')
    if mode in {'hosting-state','hosting-rollback'} and not outcome:
        if mode == 'hosting-rollback':
            require(json.loads((backup/'hosting.json').read_bytes())['version']['name'] == value['productionHosting'],
                    'Version Hosting de retour différente')
        return state.hosting(backup, after, mode == 'hosting-rollback')
    require(mode in {'rollback','validate-rollback'} and not outcome, 'Retour A6 hors périmètre')
    saved = json.loads((backup/'functions.json').read_bytes())
    initial(saved, value)
    before = {row['name']:row for row in saved}
    selected = {PREFIX+n for n in value['selected']}
    verify_backup_inverse(backup, report, before, value)
    observed = state.inventory()
    current = {row['name']:row for row in observed}
    recorded = json.loads(after.read_bytes())
    require(recorded['candidate'] == value['candidate'] and len(current) == len(observed) == value['inventoryCount']
            and len(recorded['functions']) == len(current) and {r['name']:r for r in recorded['functions']} ==
            {name:state.identity(row) for name,row in current.items()}, 'Dérive avant retour A6')
    assert_retained(before,current,selected,state)
    for name in selected:
        require(configuration(before[name]) == configuration(current[name]), 'Configuration du retour différente')
        if state.identity(before[name]) != state.identity(current[name]):
            assert_selected(before[name], current[name], value['candidate'])
        else:
            require(before[name]['buildConfig']['source'] == current[name]['buildConfig']['source']
                    and before[name].get('labels') == current[name].get('labels'), 'Source initiale différente')
    require(common.controls() == value['controls'], 'Témoins avant retour différents')
    original = state.request
    narrow = common.load('optional-access-production-policy.py').narrow_rollback_request(state, original, selected)
    def guarded(url, method='GET', body=None):
        require(method in {'GET','POST','PATCH'}, 'Opération retour interdite')
        if method == 'PATCH':
            name = body['name']
            require(name in selected, 'Fonction hors du retour A6')
            inverse.rollback_fresh(before[name], current[name], original(state.API+name), state)
        return narrow(url, method, body)
    state.request = guarded
    state.rollback_patch = lambda previous, source: inverse.rollback_patch(previous, source)[0]
    state.rollback(backup, after, mode == 'rollback')
    if mode == 'rollback':
        restored = state.inventory()
        final = {f['name']:f for f in restored}
        require(len(final) == len(restored) == len(before), 'Inventaire final du retour différent')
        assert_retained(before, final, selected, state)
        archives = {PREFIX+n:backup/'sources'/(entry['functions'][0]+'.zip') for entry in report['sources']
                    for n in entry['functions']}
        attest = common.load('standard-source-publish.py').attest
        for name in sorted(selected):
            inverse.assert_rollback(before[name], final[name])
            if state.identity(before[name]) != state.identity(final[name]):
                attest(final[name], archives[name].read_bytes(), state)
        require(common.controls() == value['controls'], 'Témoins après retour différents')
