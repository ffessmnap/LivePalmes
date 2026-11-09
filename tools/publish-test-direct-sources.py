"""Closed TEST-only source update for the two calculated Direct consumers."""
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
spec = importlib.util.spec_from_file_location('direct_source_primitives', ROOT / 'tools/publish-test-mail-sources.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
cycle, state = shared.cycle, shared.state
require = shared.require
PROJECT = 'livepalmes-test'
REPOSITORY = 'ffessmnap/LivePalmes'
RELEASE = 'direct_console_audit'
ALLOWED = frozenset({'manageLivePalmesDirect', 'readNapPublicSwimmer'})
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'
CONTRACT = ROOT / '.github/releases/evidence/20261109-direct-console-audit-contract.json'
CONTRACT_SHA256 = '5e35f3cd322a9fdfae88161fd27200f017880ea0a365de0b47f36a89825768c8'


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat Direct modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['project'] == PROJECT and value['release'] == RELEASE
            and set(value['fingerprints']) == ALLOWED, 'Lot Direct hors des deux consommateurs')
    require(all(re.fullmatch('[a-f0-9]{64}', h) for h in value['fingerprints'].values()), 'Empreinte Direct invalide')
    return value


def guard(candidate, entry, env=os.environ):
    sha = cycle.run(['git', 'rev-parse', 'HEAD'], candidate)
    require(env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_RUN_ATTEMPT') == '1'
            and env.get('GITHUB_REPOSITORY') == REPOSITORY
            and env.get('TARGET_FIREBASE_PROJECT') == PROJECT and env.get('CONFIRMATION') == PROJECT
            and env.get('RELEASE') == RELEASE and re.fullmatch('[a-f0-9]{40}', sha)
            and sha == env.get('GITHUB_SHA') == env.get('EXPECTED_COMMIT') == cycle.git('rev-parse', 'HEAD')
            and not cycle.run(['git', 'status', '--porcelain'], candidate), 'Candidat Direct hors cible/version')
    cycle.run(['git', 'merge-base', '--is-ancestor', entry['applicationCommit'], sha], candidate)
    paths = cycle.run(['git', 'diff', '--name-only', '--no-renames', entry['applicationCommit'], sha], candidate).splitlines()
    require(all(p in entry['toolingPaths'] for p in paths), 'Code applicatif hors contrat Direct')
    desired = cycle.test_backend_fingerprints(sha)
    anchored = cycle.test_backend_fingerprints(entry['applicationCommit'])
    baseline = cycle.test_backend_fingerprints(entry['baseCommit'])
    require(desired == anchored and set(anchored) == set(baseline)
            and {n for n in anchored if anchored[n] != baseline.get(n)} == ALLOWED
            and all(desired.get(n) == h for n, h in entry['fingerprints'].items()), 'Dependances Direct hors contrat')
    return sha


def runtime(function, name):
    require(name in ALLOWED and function.get('name') == PREFIX + name
            and function.get('environment') == 'GEN_2' and function.get('state') == 'ACTIVE'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name, 'Runtime Direct hors contrat')


def select(before, candidate, entry):
    rows = {f['name'].split('/')[-1]: f for f in before}
    require(set(entry['fingerprints']) == ALLOWED and ALLOWED <= set(rows), 'Consommateurs Direct absents ou elargis')
    desired, selected = cycle.test_backend_fingerprints(candidate), []
    for name in sorted(ALLOWED):
        function = rows[name]
        runtime(function, name)
        previous = function.get('labels', {}).get('livepalmes-commit', '')
        require(re.fullmatch('[a-f0-9]{40}', previous), 'Provenance Direct inconnue')
        old = cycle.test_backend_fingerprints(previous)
        require(name in old and desired.get(name) == entry['fingerprints'][name], 'Empreinte Direct inconnue')
        if old[name] != desired[name]:
            selected.append(name)
    return selected


def controls():
    # Existing technical guards only; no import, directory or sporting data.
    return shared.controls()


def source_patch(function, source, candidate):
    runtime(function, function['name'].split('/')[-1])
    require(set(source) <= {'bucket', 'object', 'generation'} and source.get('bucket') and source.get('object')
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Source Direct incomplete')
    return {'name': function['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**function.get('labels', {}), 'livepalmes-commit': candidate}}


def managed_source(function):
    name = function['name'].split('/')[-1]
    runtime(function, name)
    source = function.get('buildConfig', {}).get('source', {}).get('storageSource', {})
    require(source == function['buildConfig'].get('sourceProvenance', {}).get('resolvedStorageSource')
            and source.get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
            and source.get('object') == name + '/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Source geree import invalide')
    return source


def attest_source(function, expected):
    source = managed_source(function)
    def recheck():
        current = state.request(state.API + function['name'])
        require(managed_source(current) == source and all(current.get(k) == function.get(k) for k in ['labels', 'updateTime'])
                and current['serviceConfig']['revision'] == function['serviceConfig']['revision'], 'Source Direct modifiee pendant lecture')
    recheck()
    download = state.request(state.API + function['name'] + ':generateDownloadUrl', 'POST', {})
    url = urllib.parse.urlsplit(download['downloadUrl'])
    require(url.scheme == 'https' and url.hostname == 'storage.googleapis.com'
            and urllib.parse.unquote(url.path).lstrip('/') == source['bucket'] + '/' + source['object'], 'Destination Direct interdite')
    try:
        with urllib.request.urlopen(download['downloadUrl'], timeout=120) as response:
            require(response.headers.get('x-goog-generation') == source['generation'], 'Generation Direct differente')
            data = response.read(64 * 1024**2 + 1)
    except urllib.error.HTTPError as error:
        raise ValueError('Archive Direct indisponible : HTTP ' + str(error.code)) from None
    require(len(data) <= 64 * 1024**2 and shared.archive_identity(data) == shared.archive_identity(expected), 'Archive Direct differente')
    recheck()
    return {'storageSource': source, 'archiveSha256': hashlib.sha256(data).hexdigest(),
            'archiveIdentity': shared.archive_identity(data), 'allPathsAndFileBytesIdentical': True,
            'generationReadAndReferencesRechecked': True}


def verify(before, after, selected, candidate, sources):
    require(set(selected) <= ALLOWED and len(selected) == len(set(selected)), 'Selection Direct elargie')
    old, new = ({f['name']: f for f in rows} for rows in [before, after])
    require(set(old) == set(new), 'Inventaire Direct modifie')
    for full, previous in old.items():
        current, name = new[full], full.split('/')[-1]
        if name not in selected:
            require(current == previous, 'Fonction hors Direct modifiee')
            continue
        runtime(current, name)
        require(managed_source(current) == sources[name], 'Source Direct hors archive')
        require(shared.configuration_identity(previous) == shared.configuration_identity(current), 'Configuration Direct modifiee')
        require(current.get('labels') == {**previous.get('labels', {}), 'livepalmes-commit': candidate}
                and current.get('updateTime') and current['updateTime'] != previous.get('updateTime')
                and current['serviceConfig'].get('revision') and current['serviceConfig']['revision'] != previous['serviceConfig'].get('revision'),
                'Revision Direct non confirmee')


def baseline(entry, directory):
    expected = shared.baseline(entry, directory)
    row = entry['baselineRuns'][0]
    metadata = cycle.gh(f"repos/{REPOSITORY}/actions/artifacts/{row['artifactId']}")
    require(metadata.get('id') == row['artifactId'] and metadata.get('name') == 'test-proof'
            and metadata.get('expired') is False
            and metadata.get('digest') == 'sha256:' + row['artifactSha256']
            and metadata.get('workflow_run', {}).get('id') == row['id']
            and metadata['workflow_run'].get('head_sha') == entry['baseCommit']
            and metadata['workflow_run'].get('head_branch') == 'main', 'Baseline Direct non authentifiee')
    require(len(expected.get('functions', [])) == entry['baselineFunctionCount']
            and expected.get('hosting', {}).get('version') == entry['baselineHostingVersion'], 'Baseline Direct hors inventaire/Hosting')
    return expected


def trusted_revisions(directory, current, api):
    """Reuse only the two exact Direct source receipts, never another source-workflow lot."""
    relevant = [f for f in current.get('functions', []) if f.get('name') in {PREFIX + n for n in ALLOWED}]
    if not relevant:
        return set()
    entry, trusted = contract(), set()
    runs = api.gh(f'repos/{REPOSITORY}/actions/workflows/livepalmes-test-mail-sources.yml/runs?branch=main&per_page=20')['workflow_runs']
    for info in runs:
        if info.get('status') != 'completed' or info.get('conclusion') != 'success' or info.get('run_attempt', 1) != 1:
            continue
        if not any(f.get('commit') == info.get('head_sha') and f['name'] not in trusted for f in relevant):
            continue
        try:
            destination = Path(directory) / ('direct-sources-' + str(info['id']))
            source = api.artifact(info['id'], 'test-backend-proof', destination, '.github/workflows/livepalmes-test-mail-sources.yml')
            require(source.get('id') == info['id'] and source.get('head_branch') == 'main'
                    and source.get('path') == '.github/workflows/livepalmes-test-mail-sources.yml'
                    and source.get('event') == 'workflow_dispatch' and source.get('run_attempt') == 1
                    and source.get('status') == 'completed' and source.get('conclusion') == 'success'
                    and source.get('repository', {}).get('full_name') == REPOSITORY
                    and source.get('head_repository', {}).get('full_name') == REPOSITORY, 'Provenance de preuve import invalide')
            proof = api.read(destination / 'test-backend-proof.json')
            require(proof.get('schema') == 1 and proof.get('release') == RELEASE
                    and proof.get('candidate') == source.get('head_sha') == info.get('head_sha')
                    and proof.get('contractSha256') == CONTRACT_SHA256
                    and proof.get('applicationAnchor') == entry['applicationCommit']
                    and proof.get('baselineRun') == entry['baselineRuns'][0]['id'], 'Preuve Direct hors contrat/version')
            names = proof.get('selected', [])
            require(isinstance(names, list) and names and len(names) == len(set(names)) and set(names) <= ALLOWED,
                    'Preuve Direct elargie ou vide')
            rows = proof.get('state', {}).get('functions', [])
            require(len(rows) == len(names) and {f.get('name') for f in rows} == {PREFIX + n for n in names}
                    and all(f.get('commit') == proof['candidate'] for f in rows), 'Revisions Direct hors selection')
            desired = api.test_backend_fingerprints(proof['candidate'])
            require(all(desired.get(n) == entry['fingerprints'][n] for n in ALLOWED), 'Empreintes de preuve Direct differentes')
            require(all(proof.get(k) is True for k in ['configurationsUnchanged', 'otherFunctionsUnchanged', 'hostingUnchanged', 'controlsUnchanged'])
                    and proof.get('taskContentsRead') is False, 'Garde de preuve Direct absent')
            managed = proof.get('managedSources', {})
            require(set(managed) == set(names) and all(m.get('allPathsAndFileBytesIdentical') is True
                    and m.get('generationReadAndReferencesRechecked') is True
                    and re.fullmatch('[a-f0-9]{64}', m.get('archiveSha256', ''))
                    and re.fullmatch('[a-f0-9]{64}', m.get('archiveIdentity', ''))
                    and m.get('storageSource', {}).get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
                    and m['storageSource'].get('object') == n + '/function-source.zip'
                    and re.fullmatch('[1-9][0-9]*', str(m['storageSource'].get('generation', '')))
                    for n, m in managed.items()), 'Archives de preuve Direct non attestees')
            trusted.update(api.matching_functions({'state': {'functions': rows}}, current))
        except (ValueError, KeyError, TypeError, shared.subprocess.CalledProcessError, urllib.error.HTTPError) as error:
            print(f"Preuve Direct {info['id']} non reutilisable : {error}")
    return trusted


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
    require(release == RELEASE and mode in {'prepare', 'deploy', 'verify', 'diagnostic'}, 'Mode ou lot Direct interdit')
    directory, candidate = Path(directory).resolve(), Path(candidate).resolve()
    entry = contract()
    sha = guard(candidate, entry)
    directory.mkdir(parents=True, exist_ok=True)
    if mode == 'diagnostic':
        failure_diagnostic(directory, sha)
        return
    shared.credential_identity()
    if mode == 'prepare':
        evidence = shared.load('direct_ci', 'test-verification-evidence.py')
        require(evidence.reusable(sha, directory / 'application')
                and evidence.reusable(sha, directory / 'publication', 'publication-offline-v1'), 'CI main exacte import absente')
        expected = baseline(entry, directory)
        require(cycle.snapshot(PROJECT) == expected, 'Baseline TEST Direct modifiee')
        before, witness = shared.inventory(), controls()
        require(shared.compact(before) == expected['functions'], 'Inventaire Direct instable')
        selected = select(before, sha, entry)
        cycle.write(directory / 'before.json', before)
        cycle.write(directory / 'controls.json', witness)
        cycle.write(directory / 'hosting.json', expected['hosting'])
        rows = {f['name'].split('/')[-1]: f for f in before}
        secrets = {v['key'] for n in selected for v in rows[n].get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
        require(all({v['key'] for v in rows[n].get('serviceConfig', {}).get('secretEnvironmentVariables', [])} == secrets for n in selected),
                'Liaisons de secrets import incompatibles')
        data = shared.archive_helper.test_archive(candidate, sha, secrets, selected) if selected else None
        if data is not None:
            (directory / 'source-0.zip').write_bytes(data)
        cycle.write(directory / 'plan.json', {'candidate': sha, 'release': RELEASE, 'contractSha256': CONTRACT_SHA256,
                    'selected': selected, 'archives': [{'file': 'source-0.zip', 'sha256': hashlib.sha256(data).hexdigest(), 'names': selected}] if selected else []})
        print('Sources Direct TEST calculees : ' + ', '.join(selected), flush=True)
        return
    plan = cycle.read(directory / 'plan.json')
    require(plan['candidate'] == sha and plan['release'] == RELEASE and plan['contractSha256'] == CONTRACT_SHA256, 'Plan Direct melange')
    before = cycle.read(directory / 'before.json')
    require(plan['selected'] == select(before, sha, entry), 'Selection Direct modifiee')
    require(controls() == cycle.read(directory / 'controls.json'), 'Etats techniques TEST modifies')
    require(cycle.snapshot(PROJECT)['hosting'] == cycle.read(directory / 'hosting.json'), 'Hosting TEST Direct modifie')
    rows = {f['name'].split('/')[-1]: f for f in before}
    expected_archives = [{'file': 'source-0.zip', 'sha256': plan['archives'][0]['sha256'], 'names': plan['selected']}] if plan['selected'] else []
    require(plan['archives'] == expected_archives, 'Archives Direct hors selection')
    data = (directory / 'source-0.zip').read_bytes() if plan['selected'] else None
    if data is not None:
        secrets = {v['key'] for n in plan['selected'] for v in rows[n].get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
        expected = shared.archive_helper.test_archive(candidate, sha, secrets, plan['selected'])
        require(hashlib.sha256(data).hexdigest() == plan['archives'][0]['sha256']
                and shared.archive_identity(data) == shared.archive_identity(expected), 'Archive Direct alteree')
    if mode == 'deploy':
        require(shared.inventory() == before, 'Derive avant publication import')
        if data is None:
            return
        upload = state.request(state.API + f'projects/{PROJECT}/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')), 'Upload Direct interdit')
        target = urllib.parse.unquote(url.path).lstrip('/').split('/', 1) if url.hostname == 'storage.googleapis.com' else [url.hostname.removesuffix('.storage.googleapis.com'), urllib.parse.unquote(url.path).lstrip('/')]
        require(target == [upload['storageSource'].get('bucket'), upload['storageSource'].get('object')], 'Reference upload Direct invalide')
        request = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
        with urllib.request.urlopen(request, timeout=120) as response:
            source = {**upload['storageSource'], 'generation': response.headers.get('x-goog-generation') or upload['storageSource'].get('generation')}
        patches = [source_patch(rows[n], source, sha) for n in plan['selected']]
        cycle.write(directory / 'uploads.json', {n: {'storageSource': source, 'archiveSha256': plan['archives'][0]['sha256']} for n in plan['selected']})
        for body in patches:
            state.wait_operation(state.request(state.API + body['name'] + '?updateMask=build_config.source,labels', 'PATCH', body))
            print('Source Direct TEST actualisee : ' + body['name'].split('/')[-1], flush=True)
        return
    after = shared.inventory()
    uploads = cycle.read(directory / 'uploads.json') if plan['selected'] else {}
    require(set(uploads) == set(plan['selected']) and all(row['archiveSha256'] == plan['archives'][0]['sha256'] for row in uploads.values()), 'Recus Direct incomplets')
    current = {f['name'].split('/')[-1]: f for f in after}
    managed = {n: attest_source(current[n], data) for n in plan['selected']}
    verify(before, after, plan['selected'], sha, {n: row['storageSource'] for n, row in managed.items()})
    snapshot = cycle.snapshot(PROJECT)
    require(snapshot['functions'] == shared.compact(after) and snapshot['hosting'] == cycle.read(directory / 'hosting.json')
            and controls() == cycle.read(directory / 'controls.json'), 'Derive apres publication import')
    cycle.write(directory / 'test-backend-proof.json', {'schema': 1, 'candidate': sha, 'release': RELEASE,
                'applicationAnchor': entry['applicationCommit'], 'contractSha256': CONTRACT_SHA256,
                'baselineRun': entry['baselineRuns'][0]['id'],
                'state': {'functions': [f for f in snapshot['functions'] if f['name'].split('/')[-1] in plan['selected']]},
                'currentTestState': snapshot, 'selected': plan['selected'], 'managedSources': managed,
                'uploadedSources': uploads, 'configurationsUnchanged': True, 'otherFunctionsUnchanged': True,
                'hostingUnchanged': True, 'controlsUnchanged': True,
                'taskContentsRead': False, 'controls': cycle.read(directory / 'controls.json')})


if __name__ == '__main__':
    main(*sys.argv[1:])
