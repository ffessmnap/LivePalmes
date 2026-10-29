"""Closed source publisher and bounded read guards. Never invokes a handler."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


policy = load('nap_retained_policy', 'nap-retained-source-policy.py')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def controls(project, contract=None):
    policy.require(project in {'livepalmes', 'livepalmes-test'}, 'Cible NAP interdite')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    policy.require(credentials.get('project_id') == project, 'Compte NAP du mauvais projet')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'],
                                  text=True, stderr=subprocess.DEVNULL).strip()
    urls = {
        'mail': f'https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents/engagementConfigurations/notificationDelivery',
        'scheduler': f'https://cloudscheduler.googleapis.com/v1/projects/{project}/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1',
        'queue': f'https://cloudtasks.googleapis.com/v2/projects/{project}/locations/europe-west1/queues/processNapNotificationTask'}
    if project == 'livepalmes-test':
        urls['closures'] = 'https://firestore.googleapis.com/v1/projects/livepalmes-test/databases/(default)/documents/engagementClosureQueue?pageSize=101'
    values, errors = {}, {}
    for name, url in urls.items():
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                values[name] = json.load(response)
        except urllib.error.HTTPError as error:
            errors[name] = 'HTTP ' + str(error.code)
    if project == 'livepalmes-test':
        # Only technical booleans/statuses, never a document, task body or token.
        summary = {'project': project, 'readOnly': True, 'unavailable': errors,
                   'mailEnabled': values.get('mail', {}).get('fields', {}).get('enabled', {}).get('booleanValue'),
                   'schedulerState': values.get('scheduler', {}).get('state'),
                   'queueState': values.get('queue', {}).get('state')}
        summary['closureDocumentsObserved'] = len(values['closures'].get('documents', [])) if 'closures' in values else None
        summary['closuresComplete'] = not bool(values.get('closures', {}).get('nextPageToken')) if 'closures' in values else False
        print('Prerequis NAP TEST : ' + json.dumps(summary), flush=True)
    policy.require(not errors, 'Lectures techniques indisponibles : ' + ', '.join(k + '=' + v for k, v in errors.items()))
    if project == 'livepalmes-test':
        policy.test_controls(**values)
    else:
        guard = load('nap_retained_mail', 'check-license-report-release.py')
        guard.validate(values['mail'], values['scheduler'], contract or policy.contract())
        policy.require(values['queue'].get('state') == 'RUNNING', 'File PROD non active')
    scheduler = {k: v for k, v in values['scheduler'].items()
                 if k not in {'lastAttemptTime', 'scheduleTime', 'status'}}
    queue = {k: values['queue'][k] for k in ['name', 'state', 'purgeTime', 'rateLimits', 'retryConfig',
             'stackdriverLoggingConfig', 'httpTarget', 'appEngineRoutingOverride'] if k in values['queue']}
    result = {'mailSha256': digest(values['mail']), 'schedulerSha256': digest(scheduler),
              'queueSha256': digest(queue)}
    if project == 'livepalmes-test':
        result['closureSha256'] = digest(sorted(values['closures'].get('documents', []), key=lambda d: d['name']))
    return result


def guard(directory, after=False):
    directory = Path(directory)
    request = json.loads((directory / 'request.json').read_text())
    policy.require(policy.approved(request), 'Garde complement NAP hors accord')
    observed = controls('livepalmes')
    before = directory / 'nap-retained-before.json'
    if before.exists():
        policy.require(json.loads(before.read_text()) == observed, 'Derive mails/scheduler/file NAP')
    else:
        policy.require(not after, 'Temoin initial NAP absent')
        before.write_text(json.dumps(observed))
    if after:
        (directory / 'nap-retained-after.json').write_text(json.dumps(observed))
    print('Mails tous clubs, scheduler et file conserves ; lectures techniques uniquement.')


def update(candidate, names, before, current, project, state, archive, value=None):
    c = policy.contract()
    policy.require(len(names) == len(set(names)), 'Sources NAP dupliquees')
    for name in names:
        full = f'projects/{project}/locations/europe-west1/functions/{name}'
        policy.require(full in before and full in current
                       and state.identity(before[full]) == state.identity(current[full]), 'Derive source NAP')
        policy.runtime(before[full], project)
    if not names:
        return
    data = archive(candidate, c['candidate'])
    upload = state.request(state.API + f'projects/{project}/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    policy.require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com'
                   or url.hostname.endswith('.storage.googleapis.com')), 'Destination NAP interdite')
    req = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data,
                                 headers={'Content-Type': 'application/zip'})
    with urllib.request.urlopen(req, timeout=120):
        pass
    def one(name):
        full = f'projects/{project}/locations/europe-west1/functions/{name}'
        body = policy.source_patch(before[full], upload['storageSource'], value, project)
        state.wait_operation(state.request(state.API + full + '?updateMask=build_config.source,labels', 'PATCH', body))
        print('Source NAP actualisee : ' + name, flush=True)
    with ThreadPoolExecutor(max_workers=3) as executor:
        list(executor.map(one, names))
    return hashlib.sha256(data).hexdigest()


def test_archive(candidate, sha, secrets):
    archive = load('nap_retained_raw_archive', 'publish-approved-pdf-functions.py').archive
    raw = archive(candidate, sha)
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(raw)) as source, zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
        backend = source.read('index.js').decode('utf-8')
        params = 'const { defineBoolean, defineSecret } = require("firebase-functions/params");'
        policy.require(backend.count(params) == 1, 'Import de secrets TEST inconnu')
        replacement = 'const { defineBoolean, defineSecret: registerSecret } = require("firebase-functions/params");\n'
        replacement += 'const deployedSecretNames = ' + json.dumps(sorted(secrets)) + ';\n'
        replacement += 'const defineSecret = (name) => deployedSecretNames.includes(name) ? registerSecret(name) : name;'
        backend = backend.replace(params, replacement)
        for item in source.infolist():
            if item.filename != 'index.js':
                target.writestr(item.filename, source.read(item))
        target.writestr('backend-index.js', backend)
        wrapper = '"use strict";\nconst { livePalmesEnvironment } = require("./livepalmes-environment");\n'
        wrapper += 'const environment = livePalmesEnvironment(process.env);\n'
        wrapper += 'if (environment.name !== "test" || environment.projectId !== "livepalmes-test") throw new Error("Code reserve a TEST");\n'
        wrapper += 'const backend = require("./backend-index");\n'
        wrapper += 'for (const name of ' + json.dumps(policy.contract()['testSelected']) + ') {\n'
        wrapper += 'if (!backend[name]) throw new Error("Export TEST absent"); exports[name] = backend[name];\n}\n'
        target.writestr('index.js', wrapper)
    return output.getvalue()


def publish(candidate, plan, backup, cycle, archive):
    value = cycle.read(plan / 'request.json')
    names = policy.approved(value)
    policy.selection(value, cycle.read(plan / 'selection.json'))
    report = cycle.read(backup / 'report.json')
    policy.require(report.get('additionalNapRetainedFunctions') == names
                   and report['candidate'] == value['candidate'], 'Sauvegarde NAP hors plan')
    state = load('nap_retained_state', 'production-release-state.py')
    before = {f['name']: f for f in cycle.read(backup / 'functions.json')}
    current = {f['name']: f for f in state.inventory()}
    previous_path = plan / 'previous/production-after.json'
    previous = cycle.read(previous_path) if previous_path.exists() else {}
    if previous:
        policy.require(previous['candidate'] == value['candidate'], 'Reprise NAP hors candidat')
    pending = load('nap_retained_resume', 'publish-approved-pdf-functions.py').pending_club_sources(
        names, before, current, {f['name']: f for f in previous.get('functions', [])}, value['candidate'], state)
    guard(plan)
    update(candidate, pending, before, current, 'livepalmes', state, archive, value)
    state.check_after(backup, backup / 'after.json', True)
    guard(plan, after=True)


def test(mode, directory, candidate):
    cycle = load('nap_retained_test_cycle', 'release-cycle.py')
    c = policy.contract()
    directory, candidate = Path(directory), Path(candidate).resolve()
    policy.require(os.environ.get('GITHUB_REF') == 'refs/heads/main'
                   and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
                   and os.environ.get('CONFIRMATION') == 'livepalmes-test'
                   and os.environ.get('TARGET_FIREBASE_PROJECT') == 'livepalmes-test'
                   and cycle.run(['git', 'rev-parse', 'HEAD'], candidate) == c['candidate']
                   and not cycle.run(['git', 'status', '--porcelain'], candidate), 'Lot NAP TEST hors cible/version')
    directory.mkdir(parents=True, exist_ok=True)
    state = load('nap_retained_test_state', 'production-release-state.py')
    def inventory():
        result = []
        for page in range(50):
            value = cycle.api('livepalmes-test', 'functions' + (('&pageToken=' + urllib.parse.quote(token)) if page else ''))
            policy.require(not value.get('unreachable'), 'Inventaire TEST incomplet')
            result.extend(value.get('functions', []))
            token = value.get('nextPageToken')
            if not token:
                return result
        raise ValueError('Pagination TEST non bornee')
    if mode == 'prepare':
        # Authenticate the two existing proofs before trusting the pinned snapshot.
        cycle.artifact(c['testRun'], 'test-proof', directory / 'common', '.github/workflows/livepalmes-test-common.yml')
        cycle.artifact(c['napTestRun'], 'test-backend-proof', directory / 'nap', '.github/workflows/livepalmes-test-backend.yml')
        expected = cycle.read(directory / 'common/test-proof.json')['state']
        rows = {f['name']: f for f in expected['functions']}
        rows.update({f['name']: f for f in cycle.read(directory / 'nap/test-backend-proof.json')['state']['functions']})
        expected['functions'] = sorted(rows.values(), key=lambda f: f['name'])
        policy.require(expected == c['testBefore'] and cycle.snapshot('livepalmes-test') == expected,
                       'TEST a evolue depuis les preuves')
        witness = controls('livepalmes-test')
        full = inventory()
        policy.require(len(full) == 115, 'Inventaire TEST inattendu')
        for f in full:
            if f['name'].split('/')[-1] in c['testSelected']:
                policy.runtime(f, 'livepalmes-test')
        cycle.write(directory / 'before.json', full)
        cycle.write(directory / 'controls.json', witness)
    elif mode == 'deploy':
        before = {f['name']: f for f in cycle.read(directory / 'before.json')}
        current = {f['name']: f for f in inventory()}
        policy.require(cycle.snapshot('livepalmes-test') == c['testBefore']
                       and controls('livepalmes-test') == cycle.read(directory / 'controls.json'), 'Derive TEST NAP')
        secrets = {v['key'] for f in before.values() if f['name'].split('/')[-1] in c['testSelected']
                   for v in f.get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
        archive = lambda candidate, sha: test_archive(candidate, sha, secrets)
        sha = update(candidate, c['testSelected'], before, current, 'livepalmes-test', state, archive)
        cycle.write(directory / 'source-receipt.json', {'sourceArchiveSha256': sha})
    elif mode == 'verify':
        before = {f['name']: f for f in cycle.read(directory / 'before.json')}
        current = {f['name']: f for f in inventory()}
        policy.require(set(before) == set(current), 'Inventaire TEST modifie')
        for name, f in current.items():
            if name.split('/')[-1] in c['testSelected']:
                policy.assert_config(before[name], f, state, 'livepalmes-test')
            else:
                policy.require(state.identity(f) == state.identity(before[name]), 'Source TEST exclue modifiee')
        policy.require(controls('livepalmes-test') == cycle.read(directory / 'controls.json'), 'Reglages TEST modifies')
        after = cycle.snapshot('livepalmes-test')
        proof = {'schema': 1, 'candidate': c['candidate'], 'contractSha256': policy.DIGEST,
                 'toolingCommit': os.environ['GITHUB_SHA'], 'currentTestState': after,
                 'state': {'functions': [f for f in after['functions'] if f['name'].split('/')[-1] in c['testSelected']]},
                 'mailSettingUnchanged': True, 'schedulerUnchanged': True,
                 'queueUnchanged': True, 'configurationsUnchanged': True, 'testWrapperPreserved': True,
                 'pendingMessagesPreserved': True, 'taskContentsRead': False,
                 **cycle.read(directory / 'source-receipt.json')}
        # Validate the same receipt rules that PROD preflight will enforce.
        value = {k: c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun']}
        value.update(napRetainedSourceRelease={'approval': 'ok', 'contractSha256': policy.DIGEST},
                     testBackendRuns=[c['napTestRun'], int(os.environ['GITHUB_RUN_ID'])])
        policy.targeted(value, proof, {'path': policy.TEST_WORKFLOW, 'head_sha': os.environ['GITHUB_SHA']}, cycle)
        cycle.write(directory / 'test-backend-proof.json', proof)
    else:
        raise ValueError('Mode NAP TEST interdit')


if __name__ == '__main__':
    test(*sys.argv[1:])
