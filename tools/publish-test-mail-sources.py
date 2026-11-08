"""Closed TEST source complement. No invocation, data write or configuration PATCH."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import urllib.request
import urllib.error
import io
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / '.github/releases/evidence/20261108-test-mail-sources-contract.json'
DIGEST = '768886367ef86391752aa9be7880b1880a22869b66d87965b20288d027d415b1'
WORKFLOW = '.github/workflows/livepalmes-test-mail-sources.yml'
PROJECT = 'livepalmes-test'
DEPLOYER = 'github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com'
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'
ALLOWED = {'exportNapPublicPage', 'submitEngagementAccessRequest', 'resolveEngagementAccessRequest',
           'processNapNotificationTask', 'processNapCompetitionNotifications', 'closeDueEngagementCompetitions'}


def require(value, message):
    if not value:
        raise ValueError(message)


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


cycle = load('test_mail_cycle', 'release-cycle.py')
state = load('test_mail_state', 'production-release-state.py')
archive_helper = load('test_mail_archive', 'nap-retained-sources.py')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def contract(release):
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat TEST mails modifie')
    value = json.loads(raw)
    require(value.get('schema') == 1 and value.get('project') == PROJECT
            and set(value.get('allowedFunctions', [])) == ALLOWED
            and set(value['releases']) <= {'models', 'decisions'} and release in value['releases'],
            'Lot TEST mails non ferme')
    entry = value['releases'][release]
    require(set(entry['fingerprints']) <= ALLOWED and entry['fingerprints']
            and all(re.fullmatch('[a-f0-9]{64}', v) for v in entry['fingerprints'].values()),
            'Empreintes TEST mails invalides')
    return entry


def guard(candidate, entry, env=os.environ):
    sha = cycle.run(['git', 'rev-parse', 'HEAD'], candidate)
    require(env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_RUN_ATTEMPT') == '1'
            and env.get('TARGET_FIREBASE_PROJECT') == PROJECT and env.get('CONFIRMATION') == PROJECT
            and re.fullmatch('[a-f0-9]{40}', sha) and sha == env.get('GITHUB_SHA') == env.get('EXPECTED_COMMIT')
            and cycle.git('rev-parse', 'HEAD') == sha
            and not cycle.run(['git', 'status', '--porcelain'], candidate), 'Candidat TEST mails hors cible/version')
    cycle.run(['git', 'merge-base', '--is-ancestor', entry['applicationCommit'], sha], candidate)
    paths = cycle.run(['git', 'diff', '--name-only', '--no-renames', entry['applicationCommit'], sha], candidate).splitlines()
    require(all(p in entry['toolingPaths'] for p in paths), 'Code applicatif hors contrat TEST mails')
    desired = cycle.test_backend_fingerprints(sha)
    anchored = cycle.test_backend_fingerprints(entry['applicationCommit'])
    require(desired == anchored and all(desired.get(n) == h for n, h in entry['fingerprints'].items()),
            'Sources applicatives differentes du lot ferme')
    return sha


def runtime(function, name):
    require(name in ALLOWED and function.get('name') == PREFIX + name
            and function.get('environment') == 'GEN_2' and function.get('state') == 'ACTIVE'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name, 'Runtime TEST mails inconnu : ' + name)


def select(before, candidate, entry):
    rows = {f['name'].split('/')[-1]: f for f in before}
    require(set(entry['fingerprints']) <= set(rows), 'Consommateur TEST existant absent')
    desired = cycle.test_backend_fingerprints(candidate)
    selected = []
    for name in sorted(entry['fingerprints']):
        function = rows[name]
        runtime(function, name)
        previous = function.get('labels', {}).get('livepalmes-commit', '')
        require(re.fullmatch('[a-f0-9]{40}', previous), 'Provenance TEST inconnue : ' + name)
        old = cycle.test_backend_fingerprints(previous)
        require(name in old and name in desired, 'Empreinte TEST inconnue : ' + name)
        if old[name] != desired[name]:
            selected.append(name)
    return selected


def inventory():
    rows, token = [], ''
    for _ in range(50):
        value = cycle.api(PROJECT, 'functions' + ('&pageToken=' + urllib.parse.quote(token, safe='') if token else ''))
        require(not value.get('unreachable'), 'Inventaire TEST incomplet')
        rows.extend(value.get('functions', []))
        token = value.get('nextPageToken')
        if not token:
            require(len(rows) == len({f['name'] for f in rows}), 'Inventaire TEST duplique')
            return sorted(rows, key=lambda f: f['name'])
    raise ValueError('Inventaire TEST trop volumineux')


def credential_identity():
    credentials = cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    require(credentials.get('type') == 'service_account' and credentials.get('project_id') == PROJECT
            and credentials.get('client_email') == DEPLOYER, 'Identite backend TEST inattendue')
    return credentials['client_email']


def controls():
    credential_identity()
    token = cycle.run(['gcloud', 'auth', 'application-default', 'print-access-token'])
    def read(label, url, body=None):
        request = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise ValueError(f'Lecture technique {label} indisponible : HTTP {error.code}') from None
    mail = read('reglage', f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/engagementConfigurations/notificationDelivery')
    scheduler = read('planificateur', f'https://cloudscheduler.googleapis.com/v1/projects/{PROJECT}/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1')
    queue = read('file', f'https://cloudtasks.googleapis.com/v2/projects/{PROJECT}/locations/europe-west1/queues/processNapNotificationTask')
    require(mail.get('fields', {}).get('enabled') == {'booleanValue': False}, 'Mails TEST deja desactives requis')
    require(scheduler.get('state') in {'PAUSED', 'DISABLED'} and queue.get('state') == 'PAUSED',
            'Planificateur et file TEST deja suspendus requis')
    tasks, seen, page_token = [], set(), ''
    for _ in range(10):
        url = f'https://cloudtasks.googleapis.com/v2/projects/{PROJECT}/locations/europe-west1/queues/processNapNotificationTask/tasks?pageSize=1000&responseView=BASIC&fields=tasks(name,createTime,scheduleTime,dispatchCount,responseCount),nextPageToken'
        if page_token:
            url += '&pageToken=' + urllib.parse.quote(page_token, safe='')
        value = read('metadonnees des taches', url)
        page = value.get('tasks', [])
        require(isinstance(page, list) and len(page) <= 1000 and set(value) <= {'tasks', 'nextPageToken'}, 'Metadonnees des taches invalides')
        for task in page:
            require(set(task) <= {'name', 'createTime', 'scheduleTime', 'dispatchCount', 'responseCount'}
                    and task.get('name', '').startswith(f'projects/{PROJECT}/locations/europe-west1/queues/processNapNotificationTask/tasks/')
                    and isinstance(task.get('createTime'), str) and task['createTime']
                    and isinstance(task.get('scheduleTime'), str) and task['scheduleTime']
                    and all(type(task.get(k, 0)) is int and task.get(k, 0) >= 0 for k in ['dispatchCount', 'responseCount']), 'Identite de tache absente ou contenu interdit')
            tasks.append({key: task.get(key, 0) for key in ['name', 'createTime', 'scheduleTime', 'dispatchCount', 'responseCount']})
        page_token = value.get('nextPageToken')
        if not page_token:
            break
        require(page and page_token not in seen, 'Pagination des taches invalide')
        seen.add(page_token)
    else:
        raise ValueError('Metadonnees des taches tronquees : limite de 10 pages')
    require(len(tasks) == len({t['name'] for t in tasks}), 'Identite de tache dupliquee')
    metadata = {}
    for collection, maximum in [('engagementClosureQueue', 1000), ('engagementMailJobs', 10000)]:
        value = read(collection, f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:runQuery',
            {'structuredQuery': {'from': [{'collectionId': collection}], 'select': {'fields': [{'fieldPath': '__name__'}]},
                'orderBy': [{'field': {'fieldPath': '__name__'}, 'direction': 'ASCENDING'}], 'limit': maximum + 1}})
        documents = [row['document'] for row in value if 'document' in row]
        require(len(documents) <= maximum and all(set(d.get('fields', {})) <= {'__name__'} for d in documents), 'Metadonnees techniques hors limite')
        metadata[collection] = {'count': len(documents), 'sha256': digest([{'name': d['name'], 'updateTime': d['updateTime']} for d in documents])}
    # Exclude volatile scheduler attempt timestamps and queue throughput counters.
    scheduler = {k: v for k, v in scheduler.items() if k not in {'lastAttemptTime', 'scheduleTime', 'status'}}
    queue = {k: queue[k] for k in ['name', 'state', 'purgeTime', 'rateLimits', 'retryConfig',
        'stackdriverLoggingConfig', 'httpTarget', 'appEngineRoutingOverride'] if k in queue}
    return {'mailSha256': digest(mail), 'schedulerSha256': digest(scheduler), 'queueSha256': digest(queue),
            'taskMetadata': {'count': len(tasks), 'sha256': digest(sorted(tasks, key=lambda t: t['name']))},
            'metadata': metadata, 'mailEnabled': False, 'schedulerSuspended': True, 'queuePaused': True}


def source_patch(function, source, candidate):
    name = function['name'].split('/')[-1]
    runtime(function, name)
    require(set(source) <= {'bucket', 'object', 'generation'} and source.get('bucket') and source.get('object'), 'Source TEST incomplete')
    return {'name': function['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**function.get('labels', {}), 'livepalmes-commit': candidate}}


def verify(before, after, selected, candidate, sources):
    old = {f['name']: f for f in before}
    new = {f['name']: f for f in after}
    require(set(old) == set(new), 'Inventaire TEST modifie')
    for full, previous in old.items():
        current, name = new[full], full.split('/')[-1]
        if name not in selected:
            require(current == previous, 'Fonction TEST hors selection modifiee : ' + name)
            continue
        runtime(current, name)
        require(current.get('buildConfig', {}).get('source', {}).get('storageSource') == sources.get(name), 'Source distante differente de l’archive autorisee : ' + name)
        old_config, new_config = state.rollback_patch(previous, {}), state.rollback_patch(current, {})
        require(all(old_config.get(k) == new_config.get(k) for k in ['serviceConfig', 'buildConfig', 'eventTrigger']), 'Configuration TEST modifiee : ' + name)
        require(current.get('labels') == {**previous.get('labels', {}), 'livepalmes-commit': candidate}
                and current.get('serviceConfig', {}).get('revision') and current.get('updateTime')
                and current['serviceConfig']['revision'] != previous.get('serviceConfig', {}).get('revision')
                and current['updateTime'] != previous.get('updateTime'), 'Revision TEST non confirmee : ' + name)


def compact(functions):
    return sorted([{'name': f['name'], 'revision': f.get('serviceConfig', {}).get('revision'),
        'updateTime': f.get('updateTime'), 'state': f.get('state'), 'commit': f.get('labels', {}).get('livepalmes-commit')}
        for f in functions], key=lambda f: f['name'])


def archive_identity(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return digest(sorted((name, hashlib.sha256(archive.read(name)).hexdigest()) for name in archive.namelist()))


def baseline(entry, directory):
    expected = None
    for row in entry['baselineRuns']:
        destination = directory / ('baseline-' + str(row['id']))
        info = cycle.artifact(row['id'], row['artifact'], destination, row['workflow'])
        proof = cycle.read(destination / (row['artifact'] + '.json'))
        require(proof.get('candidate') == info['head_sha'] == entry['baseCommit'], 'Preuve de reference hors version')
        if row['artifact'] == 'test-proof':
            require(expected is None, 'Reference TEST dupliquee')
            expected = proof['state']
        else:
            require(expected is not None, 'Reference TEST commune absente')
            functions = {f['name']: f for f in expected['functions']}
            functions.update({f['name']: f for f in proof['state']['functions']})
            expected['functions'] = sorted(functions.values(), key=lambda f: f['name'])
    require(expected is not None, 'Reference TEST absente')
    return expected


def main(mode, release, directory, candidate):
    require(mode in {'identity', 'prepare', 'deploy', 'verify'}, 'Mode TEST interdit')
    directory, candidate = Path(directory).resolve(), Path(candidate).resolve()
    entry = contract(release)
    sha = guard(candidate, entry)
    directory.mkdir(parents=True, exist_ok=True)
    if mode in {'identity', 'prepare'}:
        evidence = load('test_mail_ci', 'test-verification-evidence.py')
        require(evidence.reusable(sha, directory / 'application')
                and evidence.reusable(sha, directory / 'publication', 'publication-offline-v1'), 'CI main exacte non confirmee')
        client_email = credential_identity()
        print('Compte backend TEST confirme : ' + client_email, flush=True)
        if mode == 'identity':
            cycle.write(directory / 'identity-proof.json', {'candidate': sha, 'project': PROJECT,
                'clientEmail': client_email, 'runId': os.environ['GITHUB_RUN_ID'], 'cloudMutation': False})
            return
        expected = baseline(entry, directory)
        require(cycle.snapshot(PROJECT) == expected, 'TEST a change depuis la reference autorisee')
        before, witness = inventory(), controls()
        require(compact(before) == expected['functions'], 'Inventaire TEST modifie pendant la lecture')
        selected = select(before, sha, entry)
        cycle.write(directory / 'before.json', before)
        cycle.write(directory / 'controls.json', witness)
        cycle.write(directory / 'hosting.json', cycle.snapshot(PROJECT)['hosting'])
        groups = {}
        for function in before:
            if function['name'].split('/')[-1] in selected:
                secrets = tuple(sorted(v['key'] for v in function.get('serviceConfig', {}).get('secretEnvironmentVariables', [])))
                groups.setdefault(secrets, []).append(function['name'].split('/')[-1])
        archives = []
        for index, (secrets, names) in enumerate(groups.items()):
            data = archive_helper.test_archive(candidate, sha, secrets, sorted(names))
            filename = f'source-{index}.zip'
            (directory / filename).write_bytes(data)
            archives.append({'file': filename, 'sha256': hashlib.sha256(data).hexdigest(), 'names': sorted(names)})
        cycle.write(directory / 'plan.json', {'candidate': sha, 'release': release, 'contractSha256': DIGEST, 'selected': selected, 'archives': archives})
        print('Sources TEST calculees : ' + ', '.join(selected), flush=True)
        return
    plan = cycle.read(directory / 'plan.json')
    require(plan['candidate'] == sha and plan['release'] == release and plan['contractSha256'] == DIGEST, 'Plan TEST modifie')
    before = cycle.read(directory / 'before.json')
    require(plan['selected'] == select(before, sha, entry), 'Selection TEST modifiee')
    require(controls() == cycle.read(directory / 'controls.json'), 'Reglages, file, planificateur ou messages modifies')
    require(cycle.snapshot(PROJECT)['hosting'] == cycle.read(directory / 'hosting.json'), 'Hosting TEST modifie')
    if mode == 'deploy':
        require(inventory() == before, 'Sources TEST modifiees avant publication')
        previous = {f['name'].split('/')[-1]: f for f in before}
        names = [n for row in plan['archives'] for n in row['names']]
        require(len(names) == len(set(names)) and set(names) == set(plan['selected']), 'Archives hors selection calculee')
        # Validate every archive before any upload or function update.
        for archive in plan['archives']:
            require(re.fullmatch(r'source-[0-9]+\.zip', archive['file']), 'Chemin archive interdit')
            data = (directory / archive['file']).read_bytes()
            require(hashlib.sha256(data).hexdigest() == archive['sha256'], 'Archive TEST alteree')
            secrets = {v['key'] for name in archive['names'] for v in previous[name].get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
            expected = archive_helper.test_archive(candidate, sha, secrets, archive['names'])
            require(archive_identity(data) == archive_identity(expected), 'Contenu archive hors candidat ferme')
        for archive in plan['archives']:
            data = (directory / archive['file']).read_bytes()
            require(hashlib.sha256(data).hexdigest() == archive['sha256'], 'Archive TEST alteree')
            upload = state.request(state.API + f'projects/{PROJECT}/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
            url = urllib.parse.urlsplit(upload['uploadUrl'])
            require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')), 'Destination source interdite')
            parts = urllib.parse.unquote(url.path).lstrip('/').split('/', 1)
            target = parts if url.hostname == 'storage.googleapis.com' else [url.hostname.removesuffix('.storage.googleapis.com'), urllib.parse.unquote(url.path).lstrip('/')]
            require(target == [upload['storageSource'].get('bucket'), upload['storageSource'].get('object')], 'Reference de source differente de la destination upload')
            request = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
            with urllib.request.urlopen(request, timeout=120) as response:
                generation = response.headers.get('x-goog-generation')
            source = {**upload['storageSource']}
            if generation:
                source['generation'] = generation
            require(re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Generation exacte de source indisponible avant mise a jour')
            receipt_path = directory / 'uploads.json'
            receipts = cycle.read(receipt_path) if receipt_path.exists() else {}
            receipts.update({name: {'storageSource': source, 'archiveSha256': archive['sha256']} for name in archive['names']})
            cycle.write(receipt_path, receipts)
            def publish(name):
                body = source_patch(previous[name], source, sha)
                state.wait_operation(state.request(state.API + PREFIX + name + '?updateMask=build_config.source,labels', 'PATCH', body))
                print('Source TEST actualisee : ' + name, flush=True)
            with ThreadPoolExecutor(max_workers=3) as executor:
                list(executor.map(publish, archive['names']))
        return
    after = inventory()
    uploads = cycle.read(directory / 'uploads.json') if plan['selected'] else {}
    require(set(uploads) == set(plan['selected']), 'Recu des sources incomplet')
    require(all(uploads[name]['archiveSha256'] == row['sha256'] for row in plan['archives'] for name in row['names']), 'Empreinte de source recue differente du plan')
    verify(before, after, plan['selected'], sha, {name: row['storageSource'] for name, row in uploads.items()})
    snapshot = cycle.snapshot(PROJECT)
    require(snapshot['functions'] == compact(after), 'Inventaire TEST modifie pendant la verification')
    proof = {'schema': 1, 'candidate': sha, 'release': release, 'contractSha256': DIGEST,
        'applicationAnchor': entry['applicationCommit'], 'state': {'functions': [f for f in snapshot['functions'] if f['name'].split('/')[-1] in plan['selected']]},
        'currentTestState': snapshot, 'selected': plan['selected'], 'archives': plan['archives'],
        'uploadedSources': uploads,
        'mailSettingUnchanged': True, 'schedulerUnchanged': True, 'queueUnchanged': True, 'pendingMessagesPreserved': True,
        'configurationsUnchanged': True, 'otherFunctionsUnchanged': True, 'hostingUnchanged': True, 'taskContentsRead': False,
        'controlsBefore': cycle.read(directory / 'controls.json'), 'controlsAfter': controls()}
    require(proof['controlsBefore'] == proof['controlsAfter'], 'Derive technique apres verification')
    cycle.write(directory / 'test-backend-proof.json', proof)


if __name__ == '__main__':
    main(*sys.argv[1:])
