"""One attested B completion: original backup and revisions, Rules then Hosting only."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT/'.github/releases/evidence/20261117-production-portal-session-enforcement-completion-contract.json'
DIGEST = '0dd039103fee409ad6b9bd3c894bb0aa6e480eb7a2182b889909ad78744b7ab6'
KIND = 'a34-session-enforcement-completion-v1'
CANDIDATE = '689d523b423615cb1faad9f564c1a6b2f44f1b96'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
WORKFLOWS = {name: '.github/workflows/livepalmes-production-'+name+'.yml'
             for name in ['preflight', 'readiness', 'release']}


def load(name):
    spec = importlib.util.spec_from_file_location('b_completion_'+name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module


def require(value, message):
    if not value: raise ValueError(message)


def read(path): return json.loads(Path(path).read_text(encoding='utf-8'))
def write(path, value): Path(path).write_text(json.dumps(value, sort_keys=True, indent=2)+'\n', encoding='utf-8')
def sha(raw): return hashlib.sha256(raw).hexdigest()
def digest(value): return sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(sha(raw) == DIGEST, 'Contrat du complement B modifie')
    c = json.loads(raw)
    require(c['kind'] == KIND and c['candidate'] == CANDIDATE and c['completionOfRun'] == 44099971258
            and c['initialPreflightRun'] == 44099186709 and c['initialReadinessRun'] == 44099573747
            and c['sourceWrites'] == 0 and c['genericResume'] is False
            and c['selectedCount'] == 102 and c['retainedCount'] == 17 and c['inventoryCount'] == 119
            and c['configurationChanges'] is c['bindingChanges'] is False
            and c['newFunctions'] == c['deletedFunctions'] == [], 'Complement B hors perimetre')
    for name, expected in c['pins'].items():
        require(sha((ROOT/name).read_bytes().replace(b'\r\n', b'\n')) == expected, 'Politique initiale B modifiee : '+name)
    p = load('portal-session-enforcement-production-policy.py'); p.contract()
    require(p.DIGEST == c['originalContractSha256'], 'Contrat B initial different')
    return c


def context(mode):
    env = os.environ
    require(mode in WORKFLOWS and env.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
            and env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch'
            and env.get('GITHUB_RUN_ATTEMPT') == '1'
            and env.get('GITHUB_WORKFLOW_REF') == 'ffessmnap/LivePalmes/'+WORKFLOWS[mode]+'@refs/heads/main'
            and re.fullmatch('[a-f0-9]{40}', env.get('GITHUB_SHA', ''))
            and re.fullmatch('[1-9][0-9]*', env.get('GITHUB_RUN_ID', '')),
            'Complement B reserve au workflow officiel main/tentative1')


def authenticate(run, name, destination, expected, workflow, conclusion='success', head=None):
    cycle = load('release-cycle.py')
    info = cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{run}')
    require(info['path'] == workflow and info['conclusion'] == conclusion and info['status'] == 'completed'
            and info['head_branch'] == 'main' and info['run_attempt'] == 1
            and (head is None or info['head_sha'] == head), 'Provenance du complement B incompatible')
    if expected:
        meta = cycle.gh(f'repos/ffessmnap/LivePalmes/actions/artifacts/{expected["id"]}')
        require(meta['workflow_run']['id'] == int(run) and meta['name'] == name and meta['expired'] is False
                and meta['digest'] == expected['digest'], 'Artefact initial B absent ou altere')
    cycle.artifact(run, name, destination, workflow if conclusion == 'success' else None)
    if expected:
        require({f.name: sha(f.read_bytes()) for f in Path(destination).iterdir()} == expected['files'],
                'Fichiers de preuve initiale B differents')
    return info


def validate_sources(manifest, state, receipts, selection):
    p = load('portal-session-enforcement-production-policy.py'); c = contract(); p.validate_manifest(manifest)
    require(digest(manifest) == c['originalManifestSha256'] and digest(state) == c['failedStateSha256']
            and digest(receipts) == c['sourceReceiptsSha256'], 'Preuves sources initiales B incompatibles')
    require(isinstance(selection, list) and len(selection) == len(set(selection)) == 102
            and sorted(selection) == manifest['selected'] and selection != manifest['selected'],
            'Le seul ecart attendu est un ordre de selection, sans retrait ni ajout')
    expected = {p.PREFIX+n for n in manifest['selected']}; functions = {f['name']: f for f in state['functions']}
    origins = {f['name']: f for f in manifest['origins']}
    require(state['candidate'] == receipts['candidate'] == CANDIDATE and state['errors'] == []
            and len(state['functions']) == len(functions) == 119 and functions.keys() == origins.keys()
            and set(receipts['functions']) == expected and receipts['manifestSha256'] == digest(manifest)
            and all(f['state'] == 'ACTIVE' for f in functions.values()), 'Inventaire partiel B non conforme')
    for name, f in functions.items():
        if name in expected:
            r = receipts['functions'][name]; source = r['storageSource']
            require(r['identity'] == f and r['allPathsAndFileBytesIdentical'] is True
                    and r['generationReadAndReferencesRechecked'] is True and re.fullmatch('[a-f0-9]{64}', r['archiveSha256'])
                    and source['bucket'] == 'gcf-v2-sources-718081132564-europe-west1'
                    and source['object'] == name.removeprefix(PREFIX)+'/function-source.zip'
                    and re.fullmatch('[1-9][0-9]*', source['generation'])
                    and f['revision'] != origins[name]['revision'], 'Archive/revision initiale B non attestee')
        else:
            require(f == {k: origins[name][k] for k in ['name', 'updateTime', 'state', 'revision']},
                    'Une des 17 fonctions conservees a change')


def marker(plan):
    c = contract(); plan = Path(plan); m = read(plan/'completion.json')
    require(m['kind'] == KIND and m['contractSha256'] == DIGEST and m['candidate'] == CANDIDATE
            and m['completionOfRun'] == c['completionOfRun'] and m['controllerCommit'] == os.environ['GITHUB_SHA']
            and m['originalBackupSha256'] == c['originalBackupSha256'] and m['sourceWrites'] == 0,
            'Plan de cloture B incompatible')
    validate_sources(read(plan/'standard-source-manifest.json'), read(plan/'completion-initial-after.json'),
                     read(plan/'standard-source-receipts.json'), read(plan/'selection.json'))
    return m


def preflight(plan, request_path):
    context('preflight'); c = contract(); plan = Path(plan); plan.mkdir(parents=True, exist_ok=False)
    expected = {'schema': 1, 'candidate': CANDIDATE, 'completionOfRun': c['completionOfRun'],
                'initialPreflightRun': c['initialPreflightRun'], 'contractSha256': DIGEST}
    require(read(request_path) == expected, 'Demande de cloture B hors version')
    original = plan.parent/'completion-original'; original.mkdir(exist_ok=False)
    for name in ['release-plan', 'production-after', 'production-idf-preservation']:
        authenticate(c['completionOfRun'], name, original/name, c['originalArtifacts'][name], WORKFLOWS['release'],
                     'failure', c['originalController'])
    initial = original/'preflight'
    authenticate(c['initialPreflightRun'], 'release-plan', initial, c['initialPreflightArtifact'],
                 WORKFLOWS['preflight'], head=c['originalController'])
    for f in initial.iterdir():
        require(f.read_bytes() == (original/'release-plan'/f.name).read_bytes(), 'Plan initial B modifie apres preflight')
    cycle = load('release-cycle.py')
    meta = cycle.gh(f'repos/ffessmnap/LivePalmes/actions/artifacts/{c["originalArtifacts"]["production-code-backup"]["id"]}')
    require(meta['workflow_run']['id'] == c['completionOfRun'] and not meta['expired']
            and meta['digest'] == c['originalArtifacts']['production-code-backup']['digest'], 'Sauvegarde B initiale indisponible')
    jobs = cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{c["completionOfRun"]}/jobs')['jobs']
    require(len(jobs) == 1 and jobs[0]['id'] == c['jobId'] and jobs[0]['conclusion'] == 'failure', 'Job initial B ambigu')
    names = ['Chiffrer puis tester la sauvegarde', 'Controler toutes les Functions et les exclusions',
             'Fermer le seul acces direct annuaire apres les 102 sources B', 'Publier Hosting apres les controles', 'Conclure']
    boundary = [{k: s[k] for k in ['name', 'conclusion', 'started_at', 'completed_at']}
                for s in jobs[0]['steps'] if s['name'] in names]
    require(digest(boundary) == c['jobBoundarySha256'], 'Bascule initiale Rules/Hosting ou controles inconnus')
    log = subprocess.check_output(['gh', 'api', f'repos/ffessmnap/LivePalmes/actions/jobs/{c["jobId"]}/logs'])
    require(sha(log) == c['jobLogSha256'], 'Cause du run arrete non authentifiee')
    for f in (original/'release-plan').iterdir(): shutil.copyfile(f, plan/f.name)
    shutil.copyfile(plan/'standard-session-enforcement-auth-before.json', plan/'initial-session-enforcement-auth-before.json')
    shutil.copyfile(original/'production-after/production-after.json', plan/'completion-initial-after.json')
    shutil.copyfile(original/'production-idf-preservation/standard-source-receipts.json', plan/'standard-source-receipts.json')
    write(plan/'completion.json', {'schema': 1, 'kind': KIND, 'contractSha256': DIGEST, 'candidate': CANDIDATE,
          'completionOfRun': c['completionOfRun'], 'controllerCommit': os.environ['GITHUB_SHA'],
          'preflightRun': int(os.environ['GITHUB_RUN_ID']), 'originalBackupSha256': c['originalBackupSha256'], 'sourceWrites': 0})
    marker(plan)
    # Authenticate compatible TEST evidence again; no Google access or TEST deployment.
    load('portal-session-enforcement-production-policy.py').test_evidence(plan, cycle)


def fetch_plan(plan, run):
    require(str(run).isdigit() and int(run) > 0, 'Preflight du complement requis')
    authenticate(run, 'release-plan', plan, None, WORKFLOWS['preflight'], head=os.environ['GITHUB_SHA'])
    require(marker(plan)['preflightRun'] == int(run), 'Plan hors preflight de cloture')


def backup_download(plan, target):
    marker(plan); c = contract()
    authenticate(c['completionOfRun'], 'production-code-backup', target, c['originalArtifacts']['production-code-backup'],
                 WORKFLOWS['release'], 'failure', c['originalController'])
    require(sha(Path(target, 'prod-backup.enc').read_bytes()) == c['originalBackupSha256'], 'Sauvegarde chiffree B differente')


def backup_validate(plan, backup):
    marker(plan); plan, backup = Path(plan), Path(backup); p = load('portal-session-enforcement-production-policy.py')
    value = p.manifest(plan); report = read(backup/'report.json')
    require(os.environ.get('COMPLETION_BACKUP_OPENED') == 'true' and report['candidate'] == CANDIDATE
            and report['errors'] == [] and report['newFunctions'] == [] and report['sourcePolicyKind'] == p.KIND
            and report['standardSourceManifestSha256'] == digest(value)
            and read(backup/'standard-source-manifest.json') == value, 'Sauvegarde initiale B non ouverte ou incompatible')
    rules = load('portal-session-enforcement-production-rules.py')
    require(read(backup/'session-enforcement-rules/before.json') == read(plan/'standard-session-enforcement-rules-before.json')
            and (backup/'session-enforcement-rules/before.rules').read_text(encoding='utf-8').replace('\r\n', '\n') == rules.sources()[0],
            'Temoin Rules initial non conserve dans la sauvegarde')
    functions = read(backup/'functions.json')
    p.initial(functions, value)
    require(len(report['functions']) == 102 and {f['name'] for f in report['functions']} == {PREFIX+n for n in value['selected']},
            'Selection de sauvegarde initiale differente')
    return {f['name']: f for f in functions}


def inventory():
    state = load('production-release-state.py'); values = []; page = ''
    for _ in range(2):
        response = state.request(state.API+'projects/livepalmes/locations/-/functions?pageSize=100'
                                 +('&pageToken='+urllib.parse.quote(page, safe='') if page else ''))
        require(not response.get('unreachable'), 'Inventaire B incomplet')
        values.extend(response.get('functions', [])); page = response.get('nextPageToken', '')
        if not page: break
    require(not page and len(values) == 119 and len({f['name'] for f in values}) == 119, 'Inventaire B derive ou hors budget')
    return values


def current(plan, backup):
    before = backup_validate(plan, backup); plan = Path(plan); p = load('portal-session-enforcement-production-policy.py')
    state = load('production-release-state.py'); value = p.manifest(plan); c = contract(); functions = inventory()
    actual = {f['name']: f for f in functions}; initial = {f['name']: f for f in read(plan/'completion-initial-after.json')['functions']}
    write(plan/'completion-observed-functions.json', sorted([state.identity(f) for f in functions], key=lambda f: f['name']))
    selected = {PREFIX+n for n in value['selected']}; receipts = read(plan/'standard-source-receipts.json')['functions']
    require(set(actual) == set(before) == set(initial), 'Origines du complement B inconnues')
    p.assert_retained(before, actual, selected, state)
    for name, function in actual.items():
        require(state.identity(function) == initial[name], 'Revision B modifiee depuis le run arrete : '+name)
        if name in selected:
            p.assert_selected(before[name], function, CANDIDATE)
            build = function.get('buildConfig', {})
            require(build.get('source', {}).get('storageSource') == build.get('sourceProvenance', {}).get('resolvedStorageSource')
                    == receipts[name]['storageSource'], 'Generation source B differente : '+name)
    runtime = p.capabilities('backend', references=functions); controls = p.common.controls()
    require(controls == p.contract()['controls'], 'Derive mails actifs/automates/modeles B')
    observed = {'candidate': CANDIDATE, 'functions': sorted([state.identity(f) for f in functions], key=lambda f: f['name']), 'errors': []}
    require(digest(observed) == c['currentStateSha256'], 'Inventaire B different de la preuve initiale')
    write(plan/'production-after.json', observed)
    return {'stateSha256': digest(observed), 'managedArchiveAttestationsReused': 102, 'sourceGenerationsIdentical': True,
            'configurationChanges': False, 'bindingChanges': False, 'runtimeSha256': digest(runtime), 'controls': controls,
            'originalBackupSha256': c['originalBackupSha256'], 'backupOpenedAndAuthenticated': True}


def hosting_before(plan):
    p = load('portal-session-enforcement-production-policy.py'); state = load('production-release-state.py')
    p.manifest(plan)
    rules = load('portal-session-enforcement-production-rules.py')
    workflow = 'livepalmes-production-readiness.yml' if os.environ.get('GITHUB_WORKFLOW_REF', '').endswith('livepalmes-production-readiness.yml@refs/heads/main') else 'livepalmes-production-release.yml'
    token, _ = rules.identity_token(workflow); observed_rules, text = rules.snapshot(token)
    write(Path(plan)/'completion-observed-rules.json', observed_rules)
    require(observed_rules == contract()['rulesBefore'] and text == rules.sources()[0], 'Regles PROD derivees depuis la base B')
    releases = state.request('https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1')['releases']
    observed = {'name': releases[0]['name'], 'version': releases[0]['version']['name']} if releases else None
    write(Path(plan)/'completion-observed-hosting.json', observed)
    require(observed and observed['version'] == contract()['expectedHosting'], 'Hosting derive depuis la base B')
    return observed


def permissions(kind):
    require(kind in {'backend', 'hosting'}, 'Identite de cloture inconnue')
    prerequisite = load('check-release-prerequisites.py'); caps = load('portal-session-enforcement-capabilities.py')
    reader = load('access-revocation-production-policy.py')
    require(reader.reader_identity(kind) == caps.READERS[kind], 'Identite de cloture differente')
    expected = prerequisite.permissions(kind, False, False)+caps.READER_PERMISSIONS[kind]
    if kind == 'hosting': expected += load('portal-session-enforcement-production-rules.py').PERMISSIONS
    expected = sorted(set(expected)); granted = prerequisite.read(prerequisite.IAM, {'permissions': expected}).get('permissions', [])
    require(set(expected) <= set(granted), 'Permission existante manquante pour la cloture B')
    return expected


def readiness(plan, kind, backup=None):
    context('readiness'); plan = Path(plan); m = marker(plan); p = load('portal-session-enforcement-production-policy.py')
    required = permissions(kind)
    if kind == 'backend': proof = current(plan, backup)
    else:
        require(kind == 'hosting', 'Lecteur de cloture inconnu')
        proof = {'administrative': p.auth(plan, prerequisite=True),
                 'rules': load('portal-session-enforcement-production-rules.py').readiness(plan), 'hosting': hosting_before(plan)}
    report = {'schema': 1, 'kind': kind, 'candidate': CANDIDATE, 'contractSha256': DIGEST,
              'planRun': m['preflightRun'], 'readinessRun': int(os.environ['GITHUB_RUN_ID']),
              'controllerCommit': os.environ['GITHUB_SHA'], 'ready': True, 'readOnly': True,
              'missingPermissions': [], 'verifiedPermissions': required, 'businessInvocations': 0, 'sourceWrites': 0, 'proof': proof}
    write(plan/('prerequisites-'+kind+'.json'), report)


def require_readiness(plan, run):
    context('release'); plan = Path(plan); m = marker(plan)
    require(str(run).isdigit() and int(run) > 0, 'Prerequis officiels de cloture requis')
    for kind in ['backend', 'hosting']:
        target = plan/('completion-ready-'+kind)
        authenticate(run, 'production-prerequisites-'+kind, target, None, WORKFLOWS['readiness'], head=os.environ['GITHUB_SHA'])
        report = read(target/('prerequisites-'+kind+'.json'))
        require(report['kind'] == kind and report['candidate'] == CANDIDATE and report['contractSha256'] == DIGEST
                and report['planRun'] == m['preflightRun'] and report['readinessRun'] == int(run)
                and report['controllerCommit'] == os.environ['GITHUB_SHA'] and report['ready'] is True
                and report['readOnly'] is True and report['missingPermissions'] == []
                and report['sourceWrites'] == report['businessInvocations'] == 0, 'Prerequis du complement B incompatibles')
        proof = report['proof']; c = contract(); original = load('portal-session-enforcement-production-policy.py').contract()
        if kind == 'backend':
            require(proof['stateSha256'] == c['currentStateSha256'] and proof['sourceGenerationsIdentical'] is True
                    and proof['managedArchiveAttestationsReused'] == 102 and proof['runtimeSha256'] == original['backendCapabilitySha256']
                    and proof['controls'] == original['controls'] and proof['originalBackupSha256'] == c['originalBackupSha256']
                    and proof['backupOpenedAndAuthenticated'] is True
                    and proof['configurationChanges'] is proof['bindingChanges'] is False, 'Preuve backend de cloture incomplete')
        else:
            admin, rules = proof['administrative'], proof['rules']
            require(admin['capabilitySha256'] == original['hostingCapabilitySha256'] and admin['accountOrRightChanges'] == 0
                    and admin['run'] == int(run) and admin['toolingCommit'] == os.environ['GITHUB_SHA']
                    and admin['contractSha256'] == rules['contractSha256'] == c['originalContractSha256']
                    and admin['manifestSha256'] == rules['manifestSha256'] == c['originalManifestSha256']
                    and admin['ready'] is admin['readOnly'] is rules['readOnly'] is True
                    and rules['before'] == c['rulesBefore'] and rules['expectedAfterSha256'] == c['rulesAfterSha256']
                    and proof['hosting']['version'] == c['expectedHosting'], 'Preuve Hosting/Rules de cloture incomplete')


def observe_rules(plan):
    context('release'); plan = Path(plan); marker(plan)
    rules = load('portal-session-enforcement-production-rules.py')
    token, _ = rules.identity_token('livepalmes-production-release.yml')
    observed, _ = rules.snapshot(token)
    write(plan/'completion-rules-observed-after.json', {'candidate': CANDIDATE, 'after': observed, 'readOnly': True})


def final(plan, backup):
    context('release'); plan = Path(plan); current(plan, backup); p = load('portal-session-enforcement-production-policy.py')
    p.guard(plan, after=True)
    require((plan/'standard-session-enforcement-auth-before.json').read_bytes() == (plan/'standard-session-enforcement-auth-after.json').read_bytes()
            and (plan/'standard-session-enforcement-controls-before.json').read_bytes() == (plan/'standard-session-enforcement-controls-after.json').read_bytes(),
            'Temoins avant/apres cloture B differents')
    write(plan/'completion-final.json', {**marker(plan), 'result': 'success', 'activeFunctions': 119,
          'reusedSourceAttestations': 102, 'retainedFunctions': 17, 'sourceWrites': 0,
          'businessInvocations': 0, 'mailsActiveAndControlsIdentical': True})


def main():
    mode, directory, *args = sys.argv[1:]; directory = Path(directory)
    if mode == 'preflight' and len(args) == 1: preflight(directory, args[0])
    elif mode == 'fetch-plan' and len(args) == 1: fetch_plan(directory, args[0])
    elif mode == 'backup-download' and len(args) == 1: backup_download(directory, args[0])
    elif mode == 'readiness' and len(args) in {1, 2}: readiness(directory, *args)
    elif mode == 'require-readiness' and len(args) == 1: require_readiness(directory, args[0])
    elif mode == 'current' and len(args) == 1:
        context('release'); current(directory, args[0])
    elif mode == 'hosting-before' and not args:
        context('release'); marker(directory); permissions('hosting'); hosting_before(directory)
    elif mode == 'observe-rules' and not args: observe_rules(directory)
    elif mode == 'final' and len(args) == 1: final(directory, args[0])
    else: raise ValueError('Mode de cloture B inconnu')


if __name__ == '__main__': main()
