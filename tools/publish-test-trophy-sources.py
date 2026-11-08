"""Closed TEST-only source update for the two departmental trophy consumers."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('trophy_source_primitives', ROOT / 'tools/publish-test-mail-sources.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
cycle, state = shared.cycle, shared.state
require = shared.require
PROJECT = 'livepalmes-test'
RELEASE = 'trophy_departmental'
ALLOWED = frozenset({'readNapPublicSwimmer', 'manageDamienHebertEdition'})
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'
CONTRACT = ROOT / '.github/releases/evidence/20261108-trophy-departmental-contract.json'
CONTRACT_SHA256 = '4d024e2f848b272cb1b86a953339adf6a650dd3cc4cadf4362884f077fee16d5'


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat trophee modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['project'] == PROJECT and value['release'] == RELEASE
            and set(value['fingerprints']) == ALLOWED, 'Lot trophee hors des deux consommateurs')
    require(all(re.fullmatch('[a-f0-9]{64}', h) for h in value['fingerprints'].values()), 'Empreinte trophee invalide')
    return value


def guard(candidate, entry, env=os.environ):
    sha = cycle.run(['git', 'rev-parse', 'HEAD'], candidate)
    require(env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_RUN_ATTEMPT') == '1'
            and env.get('TARGET_FIREBASE_PROJECT') == PROJECT and env.get('CONFIRMATION') == PROJECT
            and env.get('RELEASE') == RELEASE and re.fullmatch('[a-f0-9]{40}', sha)
            and sha == env.get('GITHUB_SHA') == env.get('EXPECTED_COMMIT') == cycle.git('rev-parse', 'HEAD')
            and not cycle.run(['git', 'status', '--porcelain'], candidate), 'Candidat trophee hors cible/version')
    cycle.run(['git', 'merge-base', '--is-ancestor', entry['applicationCommit'], sha], candidate)
    paths = cycle.run(['git', 'diff', '--name-only', '--no-renames', entry['applicationCommit'], sha], candidate).splitlines()
    require(all(p in entry['toolingPaths'] for p in paths), 'Code applicatif hors contrat trophee')
    desired = cycle.test_backend_fingerprints(sha)
    anchored = cycle.test_backend_fingerprints(entry['applicationCommit'])
    baseline = cycle.test_backend_fingerprints(entry['baseCommit'])
    require(desired == anchored and set(anchored) == set(baseline)
            and {n for n in anchored if anchored[n] != baseline.get(n)} == ALLOWED
            and all(desired.get(n) == h for n, h in entry['fingerprints'].items()), 'Dependances trophee hors contrat')
    return sha


def runtime(function, name):
    require(name in ALLOWED and function.get('name') == PREFIX + name
            and function.get('environment') == 'GEN_2' and function.get('state') == 'ACTIVE'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name, 'Runtime trophee hors contrat')


def select(before, candidate, entry):
    rows = {f['name'].split('/')[-1]: f for f in before}
    require(set(entry['fingerprints']) == ALLOWED and ALLOWED <= set(rows), 'Consommateurs trophee absents ou elargis')
    desired, selected = cycle.test_backend_fingerprints(candidate), []
    for name in sorted(ALLOWED):
        function = rows[name]
        runtime(function, name)
        previous = function.get('labels', {}).get('livepalmes-commit', '')
        require(re.fullmatch('[a-f0-9]{40}', previous), 'Provenance trophee inconnue')
        old = cycle.test_backend_fingerprints(previous)
        require(name in old and desired.get(name) == entry['fingerprints'][name], 'Empreinte trophee inconnue')
        if old[name] != desired[name]:
            selected.append(name)
    return selected


def controls():
    witness = shared.controls()
    token = cycle.run(['gcloud', 'auth', 'application-default', 'print-access-token'])
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/engagementConfigurations/damienHebert'
    request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            edition = json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError('Lecture edition TEST indisponible : HTTP ' + str(error.code)) from None
    return {**witness, 'trophyEditionSha256': shared.digest(edition)}


def source_patch(function, source, candidate):
    runtime(function, function['name'].split('/')[-1])
    require(set(source) <= {'bucket', 'object', 'generation'} and source.get('bucket') and source.get('object')
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Source trophee incomplete')
    return {'name': function['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**function.get('labels', {}), 'livepalmes-commit': candidate}}


def managed_source(function):
    name = function['name'].split('/')[-1]
    runtime(function, name)
    source = function.get('buildConfig', {}).get('source', {}).get('storageSource', {})
    require(source == function['buildConfig'].get('sourceProvenance', {}).get('resolvedStorageSource')
            and source.get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
            and source.get('object') == name + '/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Source geree trophee invalide')
    return source


def attest_source(function, expected):
    source = managed_source(function)
    def recheck():
        current = state.request(state.API + function['name'])
        require(managed_source(current) == source and all(current.get(k) == function.get(k) for k in ['labels', 'updateTime'])
                and current['serviceConfig']['revision'] == function['serviceConfig']['revision'], 'Source trophee modifiee pendant lecture')
    recheck()
    download = state.request(state.API + function['name'] + ':generateDownloadUrl', 'POST', {})
    url = urllib.parse.urlsplit(download['downloadUrl'])
    require(url.scheme == 'https' and url.hostname == 'storage.googleapis.com'
            and urllib.parse.unquote(url.path).lstrip('/') == source['bucket'] + '/' + source['object'], 'Destination trophee interdite')
    try:
        with urllib.request.urlopen(download['downloadUrl'], timeout=120) as response:
            require(response.headers.get('x-goog-generation') == source['generation'], 'Generation trophee differente')
            data = response.read(64 * 1024**2 + 1)
    except urllib.error.HTTPError as error:
        raise ValueError('Archive trophee indisponible : HTTP ' + str(error.code)) from None
    require(len(data) <= 64 * 1024**2 and shared.archive_identity(data) == shared.archive_identity(expected), 'Archive trophee differente')
    recheck()
    return {'storageSource': source, 'archiveSha256': hashlib.sha256(data).hexdigest(),
            'archiveIdentity': shared.archive_identity(data), 'allPathsAndFileBytesIdentical': True,
            'generationReadAndReferencesRechecked': True}


def verify(before, after, selected, candidate, sources):
    require(set(selected) <= ALLOWED and len(selected) == len(set(selected)), 'Selection trophee elargie')
    old, new = ({f['name']: f for f in rows} for rows in [before, after])
    require(set(old) == set(new), 'Inventaire trophee modifie')
    for full, previous in old.items():
        current, name = new[full], full.split('/')[-1]
        if name not in selected:
            require(current == previous, 'Fonction hors trophee modifiee')
            continue
        runtime(current, name)
        require(managed_source(current) == sources[name], 'Source trophee hors archive')
        require(shared.configuration_identity(previous) == shared.configuration_identity(current), 'Configuration trophee modifiee')
        require(current.get('labels') == {**previous.get('labels', {}), 'livepalmes-commit': candidate}
                and current.get('updateTime') and current['updateTime'] != previous.get('updateTime')
                and current['serviceConfig'].get('revision') and current['serviceConfig']['revision'] != previous['serviceConfig'].get('revision'),
                'Revision trophee non confirmee')


def baseline(entry, directory):
    expected = shared.baseline(entry, directory)
    # verification_only deliberately skips the test-proof artifact. Authenticate
    # its exact run and successful read-only control steps instead; the preceding
    # common publication supplies the digest-checked state, compared live below.
    endpoint = f"repos/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{entry['finalCheckRun']}"
    info = cycle.gh(endpoint)
    require(info.get('head_sha') == entry['baseCommit'] and info.get('head_branch') == 'main'
            and info.get('path') == '.github/workflows/livepalmes-test-common.yml'
            and info.get('event') == 'workflow_dispatch' and info.get('run_attempt') == 1
            and info.get('status') == 'completed' and info.get('conclusion') == 'success'
            and info.get('display_title') == 'Verification TEST sans deploiement', 'Controle final trophee hors provenance')
    jobs = cycle.gh(endpoint + '/jobs?per_page=100')['jobs']
    require(len(jobs) < 100, 'Jobs de reference trophee tronques')
    tests = [job for job in jobs if job.get('name') == 'test']
    require(len(tests) == 1 and tests[0].get('status') == 'completed' and tests[0].get('conclusion') == 'success',
            'Controle final trophee incomplet')
    steps = {step['name']: step.get('conclusion') for step in tests[0]['steps']}
    require(all(steps.get(name) == 'success' for name in ['Selectionner les Functions TEST reellement differentes',
            'Controler le backend TEST et les Functions conservees']) and all(steps.get(name) == 'skipped' for name in
            ['Publier et controler les Functions TEST', 'Publier TEST commun pour le commit exact verifie',
             'Conserver la preuve de la version TEST']), 'Controle final trophee different du mode lecture seule')
    return expected


def failure_diagnostic(directory, candidate):
    def local(name):
        path = directory / name
        return cycle.read(path) if path.exists() else {}
    plan = local('plan.json')
    before = local('before.json')
    receipts = {}
    for name, row in local('uploads.json').items():
        if name in ALLOWED:
            receipts[name] = {'storageSource': {k: v for k, v in row.get('storageSource', {}).items()
                                               if k in {'bucket', 'object', 'generation'}},
                              'archiveSha256': row.get('archiveSha256')}
    result = {'candidate': candidate, 'release': RELEASE, 'runId': os.environ['GITHUB_RUN_ID'],
              'outcome': 'failure-diagnostic-only', 'successProof': False,
              'plan': {k: plan[k] for k in ['candidate', 'release', 'contractSha256'] if k in plan},
              'selected': [n for n in plan.get('selected', []) if n in ALLOWED],
              'uploadedSources': receipts, 'controlsSha256': shared.digest(local('controls.json')),
              'beforeFunctionWitnesses': {f['name']: {'functionSha256': shared.digest(f),
                  'configurationSha256': shared.configuration_identity(f)} for f in before
                  if f.get('name') in {PREFIX + n for n in ALLOWED}} if isinstance(before, list) else {}}
    cycle.write(directory / 'failure-diagnostic.json', result)


def main(mode, release, directory, candidate):
    require(release == RELEASE and mode in {'prepare', 'deploy', 'verify', 'diagnostic'}, 'Mode ou lot trophee interdit')
    directory, candidate = Path(directory).resolve(), Path(candidate).resolve()
    entry = contract()
    sha = guard(candidate, entry)
    directory.mkdir(parents=True, exist_ok=True)
    if mode == 'diagnostic':
        failure_diagnostic(directory, sha)
        return
    shared.credential_identity()
    if mode == 'prepare':
        evidence = shared.load('trophy_ci', 'test-verification-evidence.py')
        require(evidence.reusable(sha, directory / 'application')
                and evidence.reusable(sha, directory / 'publication', 'publication-offline-v1'), 'CI main exacte trophee absente')
        expected = baseline(entry, directory)
        require(cycle.snapshot(PROJECT) == expected, 'Baseline TEST trophee modifiee')
        before, witness = shared.inventory(), controls()
        require(shared.compact(before) == expected['functions'], 'Inventaire trophee instable')
        selected = select(before, sha, entry)
        cycle.write(directory / 'before.json', before)
        cycle.write(directory / 'controls.json', witness)
        cycle.write(directory / 'hosting.json', expected['hosting'])
        rows = {f['name'].split('/')[-1]: f for f in before}
        secrets = {v['key'] for n in selected for v in rows[n].get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
        require(all({v['key'] for v in rows[n].get('serviceConfig', {}).get('secretEnvironmentVariables', [])} == secrets for n in selected),
                'Liaisons de secrets trophee incompatibles')
        data = shared.archive_helper.test_archive(candidate, sha, secrets, selected) if selected else None
        if data is not None:
            (directory / 'source-0.zip').write_bytes(data)
        cycle.write(directory / 'plan.json', {'candidate': sha, 'release': RELEASE, 'contractSha256': CONTRACT_SHA256,
                    'selected': selected, 'archives': [{'file': 'source-0.zip', 'sha256': hashlib.sha256(data).hexdigest(), 'names': selected}] if selected else []})
        print('Sources trophee TEST calculees : ' + ', '.join(selected), flush=True)
        return
    plan = cycle.read(directory / 'plan.json')
    require(plan['candidate'] == sha and plan['release'] == RELEASE and plan['contractSha256'] == CONTRACT_SHA256, 'Plan trophee melange')
    before = cycle.read(directory / 'before.json')
    require(plan['selected'] == select(before, sha, entry), 'Selection trophee modifiee')
    require(controls() == cycle.read(directory / 'controls.json'), 'Etats ou edition TEST modifies')
    require(cycle.snapshot(PROJECT)['hosting'] == cycle.read(directory / 'hosting.json'), 'Hosting TEST trophee modifie')
    rows = {f['name'].split('/')[-1]: f for f in before}
    expected_archives = [{'file': 'source-0.zip', 'sha256': plan['archives'][0]['sha256'], 'names': plan['selected']}] if plan['selected'] else []
    require(plan['archives'] == expected_archives, 'Archives trophee hors selection')
    data = (directory / 'source-0.zip').read_bytes() if plan['selected'] else None
    if data is not None:
        secrets = {v['key'] for n in plan['selected'] for v in rows[n].get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
        expected = shared.archive_helper.test_archive(candidate, sha, secrets, plan['selected'])
        require(hashlib.sha256(data).hexdigest() == plan['archives'][0]['sha256']
                and shared.archive_identity(data) == shared.archive_identity(expected), 'Archive trophee alteree')
    if mode == 'deploy':
        require(shared.inventory() == before, 'Derive avant publication trophee')
        if data is None:
            return
        upload = state.request(state.API + f'projects/{PROJECT}/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')), 'Upload trophee interdit')
        target = urllib.parse.unquote(url.path).lstrip('/').split('/', 1) if url.hostname == 'storage.googleapis.com' else [url.hostname.removesuffix('.storage.googleapis.com'), urllib.parse.unquote(url.path).lstrip('/')]
        require(target == [upload['storageSource'].get('bucket'), upload['storageSource'].get('object')], 'Reference upload trophee invalide')
        request = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
        with urllib.request.urlopen(request, timeout=120) as response:
            source = {**upload['storageSource'], 'generation': response.headers.get('x-goog-generation') or upload['storageSource'].get('generation')}
        patches = [source_patch(rows[n], source, sha) for n in plan['selected']]
        cycle.write(directory / 'uploads.json', {n: {'storageSource': source, 'archiveSha256': plan['archives'][0]['sha256']} for n in plan['selected']})
        for body in patches:
            state.wait_operation(state.request(state.API + body['name'] + '?updateMask=build_config.source,labels', 'PATCH', body))
            print('Source trophee TEST actualisee : ' + body['name'].split('/')[-1], flush=True)
        return
    after = shared.inventory()
    uploads = cycle.read(directory / 'uploads.json') if plan['selected'] else {}
    require(set(uploads) == set(plan['selected']) and all(row['archiveSha256'] == plan['archives'][0]['sha256'] for row in uploads.values()), 'Recus trophee incomplets')
    current = {f['name'].split('/')[-1]: f for f in after}
    managed = {n: attest_source(current[n], data) for n in plan['selected']}
    verify(before, after, plan['selected'], sha, {n: row['storageSource'] for n, row in managed.items()})
    snapshot = cycle.snapshot(PROJECT)
    require(snapshot['functions'] == shared.compact(after) and snapshot['hosting'] == cycle.read(directory / 'hosting.json')
            and controls() == cycle.read(directory / 'controls.json'), 'Derive apres publication trophee')
    cycle.write(directory / 'test-backend-proof.json', {'schema': 1, 'candidate': sha, 'release': RELEASE,
                'applicationAnchor': entry['applicationCommit'], 'contractSha256': CONTRACT_SHA256,
                'baselineFinalCheckRun': entry['finalCheckRun'],
                'state': {'functions': [f for f in snapshot['functions'] if f['name'].split('/')[-1] in plan['selected']]},
                'currentTestState': snapshot, 'selected': plan['selected'], 'managedSources': managed,
                'uploadedSources': uploads, 'configurationsUnchanged': True, 'otherFunctionsUnchanged': True,
                'hostingUnchanged': True, 'trophyEditionUnchanged': True, 'controlsUnchanged': True,
                'taskContentsRead': False, 'controls': cycle.read(directory / 'controls.json')})


if __name__ == '__main__':
    main(*sys.argv[1:])
