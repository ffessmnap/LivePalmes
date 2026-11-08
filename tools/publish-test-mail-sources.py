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
DIGEST = "82ee3c568601abee7963fcfa6c8cb10f5053de6382d3e0147b2b0bec5c246b9e"
CONTACTS_CONTRACT = ROOT / '.github/releases/evidence/20261108-competition-mail-contacts-contract.json'
CONTACTS_DIGEST = 'a7004eba8a9d71d4ca4074730bb198e18b4157dbaa1f1028e681f42f849b471d'
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
    contacts = release == 'contacts'
    source, expected_digest = (CONTACTS_CONTRACT, CONTACTS_DIGEST) if contacts else (CONTRACT, DIGEST)
    raw = source.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == expected_digest, 'Contrat TEST mails modifie')
    value = json.loads(raw)
    require(value.get('schema') == 1 and value.get('project') == PROJECT
            and set(value.get('allowedFunctions', [])) == ALLOWED
            and set(value['releases']) <= ({'contacts'} if contacts else {'models', 'decisions'}) and release in value['releases'],
            'Lot TEST mails non ferme')
    entry = value['releases'][release]
    require(set(entry['fingerprints']) <= ALLOWED and entry['fingerprints']
            and all(re.fullmatch('[a-f0-9]{64}', v) for v in entry['fingerprints'].values()),
            'Empreintes TEST mails invalides')
    return {**entry, '_contractSha256': expected_digest} if contacts else entry


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
            for function in rows:
                filters = function.get('eventTrigger', {}).get('eventFilters')
                if filters is not None:
                    require(isinstance(filters, list) and all(isinstance(f, dict) for f in filters),
                            'Filtres Eventarc TEST invalides')
                    # The API returns these criteria in varying order. Keep every
                    # complete entry (including duplicates) and all other fields.
                    function['eventTrigger']['eventFilters'] = sorted(filters, key=lambda f: json.dumps(f, sort_keys=True))
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
        items = archive.infolist()
        require(len(items) <= 5000 and sum(i.file_size for i in items) <= 64 * 1024**2
                and len({i.filename for i in items}) == len(items), 'Archive source dupliquee ou hors limite')
        require(all(not i.is_dir() and not i.filename.startswith('/') and '\\' not in i.filename
                    and '..' not in i.filename.split('/') and (i.external_attr >> 28) != 10 for i in items),
                'Chemin archive source invalide')
        return digest(sorted((i.filename, hashlib.sha256(archive.read(i)).hexdigest()) for i in items))


def configuration_identity(function):
    value = state.rollback_patch(function, {})
    return digest({k: value.get(k) for k in ['serviceConfig', 'buildConfig', 'eventTrigger']})


def managed_source(function):
    name = function['name'].split('/')[-1]
    runtime(function, name)
    source = function.get('buildConfig', {}).get('source', {}).get('storageSource', {})
    require(source == function['buildConfig'].get('sourceProvenance', {}).get('resolvedStorageSource')
            and source.get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
            and source.get('object') == name + '/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Source geree TEST non attestee')
    return source


def attest_source(function, expected):
    source = managed_source(function)
    def same_reference():
        current = state.request(state.API + function['name'])
        require(managed_source(current) == source and all(current.get(k) == function.get(k) for k in ['labels', 'updateTime'])
                and current['serviceConfig']['revision'] == function['serviceConfig']['revision'], 'Source modifiee pendant lecture')
    same_reference()
    # sourceCodeGet is already granted to the deployer. A signed read avoids
    # requiring any additional Storage permission or exposing its URL/token.
    download = state.request(state.API + function['name'] + ':generateDownloadUrl', 'POST', {})
    url = urllib.parse.urlsplit(download['downloadUrl'])
    require(url.scheme == 'https' and url.hostname == 'storage.googleapis.com'
            and urllib.parse.unquote(url.path).lstrip('/') == source['bucket'] + '/' + source['object'], 'Destination lecture source interdite')
    try:
        with urllib.request.urlopen(download['downloadUrl'], timeout=120) as response:
            require(response.headers.get('x-goog-generation') == source['generation'], 'Generation source lue differente')
            data = response.read(64 * 1024**2 + 1)
    except urllib.error.HTTPError as error:
        raise ValueError('Lecture archive geree indisponible : HTTP ' + str(error.code)) from None
    require(len(data) <= 64 * 1024**2, 'Archive geree trop volumineuse')
    identity = archive_identity(data)
    require(identity == archive_identity(expected), 'Contenu archive geree different du candidat')
    same_reference()
    return {'storageSource': source, 'archiveSha256': hashlib.sha256(data).hexdigest(),
        'expectedArchiveSha256': hashlib.sha256(expected).hexdigest(), 'archiveIdentity': identity,
        'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True}


def closed_run_logs(job_id):
    require(type(job_id) is int and job_id > 0, 'Job de preuve invalide')
    args = ['gh', 'api', f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/jobs/{job_id}/logs']
    help_text = subprocess.check_output(['gh', 'api', '--help']).decode('utf-8')
    if '--allow-escape-sequences' in help_text:
        # stdout is captured as bytes, never rendered in a terminal or proof.
        args.append('--allow-escape-sequences')
    raw = subprocess.check_output(args)
    require(len(raw) < 4 * 1024**2, 'Logs de preuve trop volumineux')
    return raw.decode('utf-8')


def recover_models(entry, candidate, sha, directory):
    recovery = entry.get('recovery', {})
    require(recovery.get('run') == 42454743001 and recovery.get('sourceCandidate') == 'd9281070a7bd037d9383d844474269d19c8b3613'
            and set(recovery.get('selected', {})) == ALLOWED, 'Reprise models hors run ferme')
    run = cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/42454743001')
    require(run.get('head_sha') == recovery['sourceCandidate'] and run.get('head_branch') == 'main'
            and run.get('path') == WORKFLOW and run.get('run_attempt') == 1
            and run.get('status') == 'completed' and run.get('conclusion') == 'failure', 'Run engage non authentifie')
    jobs = cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/42454743001/jobs?per_page=100')['jobs']
    require(len(jobs) == 1, 'Jobs du run engage ambigus')
    steps = {s['name']: s.get('conclusion') for s in jobs[0]['steps']}
    require(steps.get('Authentifier les preuves et constater les preconditions deja satisfaites') == 'success'
            and steps.get('Publier seulement les sources calculees et autorisees') == 'success'
            and steps.get('Verifier revisions et preservation de tous les etats') == 'failure', 'Etapes du run engage non confirmees')
    logs = closed_run_logs(jobs[0]['id'])
    require(len(logs) < 4 * 1024**2 and 'ValueError: Source distante differente de l’archive autorisee : closeDueEngagementCompetitions' in logs
            and all(logs.count('Source TEST actualisee : ' + name) == 1 for name in ALLOWED), 'Trace du run engage incompatible')
    require(not cycle.run(['git', 'diff', '--name-only', recovery['sourceCandidate'], sha, '--', 'functions/'], candidate), 'Sources de reprise differentes')
    expected = baseline(entry, directory)
    require(recovery['beforeCompactSha256'] == digest(expected['functions']), 'Temoin local different de la baseline authentifiee')
    before = inventory()
    witness = controls()
    require(cycle.snapshot(PROJECT)['hosting'] == expected['hosting'], 'Hosting modifie depuis le run engage')
    require(set(recovery['beforeFunctionHashes']) == {f['name'] for f in before}, 'Inventaire reprise incomplet')
    groups = {}
    for function in before:
        name = function['name'].split('/')[-1]
        if name not in ALLOWED:
            require(digest(function) == recovery['beforeFunctionHashes'][function['name']], 'Fonction hors reprise modifiee : ' + name)
            continue
        pinned = recovery['selected'][name]
        require(digest(function) == pinned['afterFunctionSha256'] and managed_source(function) == pinned['source']
                and configuration_identity(function) == recovery['beforeConfigurationHashes'][function['name']], 'Configuration ou revision reprise modifiee : ' + name)
        keys = tuple(sorted(v['key'] for v in function.get('serviceConfig', {}).get('secretEnvironmentVariables', [])))
        groups.setdefault(keys, []).append(name)
    rows = {f['name'].split('/')[-1]: f for f in before}
    sources = {}
    for keys, names in groups.items():
        archive = archive_helper.test_archive(candidate, sha, keys, sorted(names))
        for name in names:
            sources[name] = attest_source(rows[name], archive)
            require(sources[name]['archiveSha256'] == recovery['selected'][name]['archiveSha256']
                    and sources[name]['archiveIdentity'] == recovery['selected'][name]['archiveIdentity'], 'Archive reprise hors generation attestee')
    require(inventory() == before and controls() == witness, 'Derive pendant reprise en lecture seule')
    current = cycle.snapshot(PROJECT)
    require(current['functions'] == compact(before) and current['hosting'] == expected['hosting'], 'Etat reprise instable')
    cycle.write(directory / 'test-backend-proof.json', {'schema': 1, 'candidate': sha, 'release': 'models',
        'recoveredRun': recovery['run'], 'sourceCandidate': recovery['sourceCandidate'], 'contractSha256': DIGEST,
        'applicationAnchor': entry['applicationCommit'], 'readOnlyRecovery': True, 'currentTestState': current,
        'state': {'functions': [f for f in current['functions'] if f['name'].split('/')[-1] in ALLOWED]},
        'selected': sorted(ALLOWED), 'managedSources': sources, 'originalRunConclusion': 'failure',
        'originalUploadReceiptsAvailable': False, 'originalControlsHashesAvailable': False,
        'originalControlsEqualityAttestedByRunControlFlow': True, 'beforeInventorySha256': recovery['beforeInventorySha256'],
        'freshControlsBefore': witness, 'freshControlsAfter': witness, 'otherFunctionsUnchanged': True,
        'configurationsUnchanged': True, 'hostingUnchanged': True, 'taskContentsRead': False})


def failure_diagnostic(directory, release, sha):
    result = {'candidate': sha, 'release': release, 'runId': os.environ['GITHUB_RUN_ID'],
        'outcome': 'failure-diagnostic-only', 'successProof': False}
    def local(name):
        path = directory / name
        return cycle.read(path) if path.exists() else {}
    plan = local('plan.json')
    result['plan'] = {k: plan[k] for k in ['candidate', 'release', 'contractSha256', 'selected', 'archives'] if k in plan}
    controls_value = local('controls.json')
    result['controlsWitness'] = {k: controls_value[k] for k in ['mailSha256', 'schedulerSha256', 'queueSha256',
        'taskMetadata', 'metadata', 'mailEnabled', 'schedulerSuspended', 'queuePaused'] if k in controls_value}
    result['uploadedSources'] = {name: {k: value[k] for k in ['storageSource', 'archiveSha256'] if k in value}
        for name, value in local('uploads.json').items() if name in ALLOWED}
    before = local('before.json')
    result['beforeFunctionWitnesses'] = {f['name']: {'functionSha256': digest(f),
        'configurationSha256': configuration_identity(f), 'revision': f.get('serviceConfig', {}).get('revision'),
        'updateTime': f.get('updateTime')} for f in before} if isinstance(before, list) else {}
    cycle.write(directory / 'failure-diagnostic.json', result)


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
    require(mode in {'identity', 'prepare', 'deploy', 'verify', 'recover', 'diagnostic'}, 'Mode TEST interdit')
    directory, candidate = Path(directory).resolve(), Path(candidate).resolve()
    entry = contract(release)
    contract_sha = entry.get('_contractSha256', DIGEST)
    sha = guard(candidate, entry)
    directory.mkdir(parents=True, exist_ok=True)
    if mode == 'diagnostic':
        failure_diagnostic(directory, release, sha)
        return
    if mode in {'identity', 'prepare', 'recover'}:
        evidence = load('test_mail_ci', 'test-verification-evidence.py')
        require(evidence.reusable(sha, directory / 'application')
                and evidence.reusable(sha, directory / 'publication', 'publication-offline-v1'), 'CI main exacte non confirmee')
        client_email = credential_identity()
        print('Compte backend TEST confirme : ' + client_email, flush=True)
        if mode == 'recover':
            require(release == 'models', 'Reprise reservee au seul lot models')
            recover_models(entry, candidate, sha, directory)
            return
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
        cycle.write(directory / 'plan.json', {'candidate': sha, 'release': release, 'contractSha256': contract_sha, 'selected': selected, 'archives': archives})
        print('Sources TEST calculees : ' + ', '.join(selected), flush=True)
        return
    plan = cycle.read(directory / 'plan.json')
    require(plan['candidate'] == sha and plan['release'] == release and plan['contractSha256'] == contract_sha, 'Plan TEST modifie')
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
    managed = {}
    rows = {f['name'].split('/')[-1]: f for f in after}
    for archive in plan['archives']:
        data = (directory / archive['file']).read_bytes()
        require(hashlib.sha256(data).hexdigest() == archive['sha256'], 'Archive candidate alteree avant verification')
        for name in archive['names']:
            managed[name] = attest_source(rows[name], data)
    verify(before, after, plan['selected'], sha, {name: row['storageSource'] for name, row in managed.items()})
    snapshot = cycle.snapshot(PROJECT)
    require(snapshot['functions'] == compact(after), 'Inventaire TEST modifie pendant la verification')
    proof = {'schema': 1, 'candidate': sha, 'release': release, 'contractSha256': contract_sha,
        'applicationAnchor': entry['applicationCommit'], 'state': {'functions': [f for f in snapshot['functions'] if f['name'].split('/')[-1] in plan['selected']]},
        'currentTestState': snapshot, 'selected': plan['selected'], 'archives': plan['archives'],
        'uploadedSources': uploads,
        'managedSources': managed,
        'mailSettingUnchanged': True, 'schedulerUnchanged': True, 'queueUnchanged': True, 'pendingMessagesPreserved': True,
        'configurationsUnchanged': True, 'otherFunctionsUnchanged': True, 'hostingUnchanged': True, 'taskContentsRead': False,
        'controlsBefore': cycle.read(directory / 'controls.json'), 'controlsAfter': controls()}
    require(proof['controlsBefore'] == proof['controlsAfter'], 'Derive technique apres verification')
    cycle.write(directory / 'test-backend-proof.json', proof)


if __name__ == '__main__':
    main(*sys.argv[1:])
