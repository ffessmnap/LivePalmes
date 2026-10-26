"""TEST only: rebuild the identical sources of six read handlers, at 3 then 6.

No function invocation, Hosting deployment, business write, IAM or mail change.
The existing archived sources are reused; configurations and exclusions are checked
after every batch. An unsuccessful run never produces a reusable backend proof.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes-test'
PREFIX = 'projects/livepalmes-test/locations/europe-west1/functions/'
API = 'https://cloudfunctions.googleapis.com/v2/'
NAMES = ('getEngagementCalendarEvent', 'getEngagementCompetitionStatistics', 'listEngagementCompetitions',
         'listEngagementCalendarEvents', 'getPublicEngagementClubDirectory', 'getNationalFeaturedDocuments')
MAIL = 'https://firestore.googleapis.com/v1/projects/livepalmes-test/databases/(default)/documents/engagementConfigurations/notificationDelivery'
HOSTING = 'https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes-test/releases?pageSize=1'
QUOTAS = 'https://serviceusage.googleapis.com/v1beta1/projects/livepalmes-test/services/cloudbuild.googleapis.com/consumerQuotaMetrics?view=FULL&pageSize=200'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


cycle = load('benchmark_cycle', 'release-cycle.py')
state = load('benchmark_state', 'production-release-state.py')
source_check = load('benchmark_archive', 'preflight-production-release.py')


def context():
    if not (os.environ.get('GITHUB_REF') == 'refs/heads/main' and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
            and os.environ.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and os.environ.get('BENCHMARK_CONFIRMATION') == PROJECT):
        raise ValueError('Benchmark reserve a TEST, main, tentative 1')
    credentials = cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    if credentials.get('project_id') != PROJECT:
        raise ValueError('Compte TEST requis')
    sha = os.environ['GITHUB_SHA']
    credential_file = Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).resolve()
    allowed = '?? ' + credential_file.relative_to(ROOT).as_posix() if credential_file.is_relative_to(ROOT) else ''
    dirty = cycle.git('status', '--porcelain', '--untracked-files=all').splitlines()
    if (not re.fullmatch('[0-9a-f]{40}', sha) or cycle.git('rev-parse', 'HEAD') != sha
            or any(line != allowed for line in dirty)):
        raise ValueError('Checkout exact et propre requis')
    return sha


def api(url, method='GET', body=None):
    permitted = url in {MAIL, HOSTING, QUOTAS} and method == 'GET'
    permitted |= (url.startswith(API + 'projects/livepalmes-test/locations/')
                  and method in {'GET', 'POST', 'PATCH'})
    if not permitted:
        raise ValueError('API hors TEST interdite')
    if method == 'POST' and not (url.endswith(':generateDownloadUrl') or url.endswith(':generateUploadUrl')):
        raise ValueError('Creation/invocation interdite')
    if method == 'PATCH' and not (url.split('?')[0] in {API + PREFIX + n for n in NAMES}
            and url.endswith('?updateMask=build_config.source,labels')
            and set(body) == {'name', 'buildConfig', 'labels'} and set(body['buildConfig']) == {'source'}):
        raise ValueError('Modification autre que source/labels interdite')
    if url == QUOTAS:
        number = subprocess.check_output(['gcloud', 'projects', 'describe', PROJECT, '--format=value(projectNumber)'], text=True, stderr=subprocess.DEVNULL).strip()
        if not number.isdigit():
            raise ValueError('Numero de projet non verifie')
        url = url.replace('/projects/' + PROJECT + '/', '/projects/' + number + '/')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'], text=True, stderr=subprocess.DEVNULL).strip()
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def storage_url(url):
    parsed = urllib.parse.urlsplit(url)
    if not (parsed.scheme == 'https' and parsed.hostname and
            (parsed.hostname == 'storage.googleapis.com' or parsed.hostname.endswith('.storage.googleapis.com'))):
        raise ValueError('Destination source interdite')
    return url


def inventory():
    rows, page = [], ''
    for _ in range(5):
        value = api(API + 'projects/livepalmes-test/locations/-/functions?pageSize=100' +
                    ('&pageToken=' + urllib.parse.quote(page, safe='') if page else ''))
        if value.get('unreachable'):
            raise ValueError('Inventaire TEST incomplet')
        rows.extend(value.get('functions', [])); page = value.get('nextPageToken')
        if not page:
            result = {f['name']: f for f in rows}
            if len(result) != len(rows) or any(not n.startswith(PREFIX) for n in result):
                raise ValueError('Inventaire TEST inattendu')
            return result
    raise ValueError('Pagination TEST incomplete')


def config(function):
    value = state.rollback_patch(function, {})
    value.pop('labels', None)
    return value


def check(before, current, attested, sha):
    if set(before) != set(current):
        raise ValueError('Inventaire TEST modifie')
    for name, old in before.items():
        new = current[name]
        if name not in {PREFIX + n for n in NAMES}:
            if state.identity(old) != state.identity(new):
                raise ValueError('Exclusion TEST modifiee')
        elif config(old) != config(new) or new.get('state') != 'ACTIVE':
            raise ValueError('Configuration TEST modifiee')
        elif name in attested:
            if state.identity(new) != attested[name] or new.get('labels', {}).get('livepalmes-commit') != sha:
                raise ValueError('Revision TEST non attestee')
        elif state.identity(old) != state.identity(new):
            raise ValueError('Derive TEST avant mise a jour')


def run(destination):
    sha = context()
    destination = Path(destination); destination.mkdir(parents=True, exist_ok=True)
    receipt = {'schema': 1, 'candidate': sha, 'project': PROJECT, 'functions': list(NAMES), 'rounds': [], 'success': False}
    try:
        before = inventory()
        mail, hosting = api(MAIL), api(HOSTING)['releases'][0]
        receipt['before'] = [state.identity(before[PREFIX+n]) for n in NAMES if PREFIX+n in before]
        receipt['stage'] = 'read-only-checks'
        cycle.write(destination / 'benchmark.json', receipt)
        if not 6 <= len(before) <= 200 or any(PREFIX + n not in before for n in NAMES):
            raise ValueError('Six fonctions existantes requises')
        # A label alone is never evidence of a deployed revision.
        reference = cycle.latest_run('livepalmes-test-common.yml', reuse_revisions=True)
        cycle.artifact(reference, 'test-proof', destination / 'common-proof', '.github/workflows/livepalmes-test-common.yml')
        current = cycle.snapshot(PROJECT)
        trusted = cycle.matching_functions(cycle.read(destination / 'common-proof/test-proof.json'), current)
        trusted.update(cycle.targeted_test_evidence(destination, current))
        if not {PREFIX + n for n in NAMES} <= trusted:
            raise ValueError('Revision TEST sans preuve GitHub authentifiee')
        receipt['testReferenceRun'] = reference
        # No new source is introduced: known labels must match the exact main code.
        for name in NAMES:
            f = before[PREFIX + name]
            origin = f.get('labels', {}).get('livepalmes-commit', '')
            if (f.get('eventTrigger') or not re.fullmatch('[0-9a-f]{40}', origin)
                    or cycle.backend_fingerprints(origin).get(name) != cycle.backend_fingerprints(sha).get(name)):
                raise ValueError('Source connue et identique requise : ' + name)
        quotas = api(QUOTAS)
        receipt['cloudBuildQuotas'] = quotas  # Quota metadata only; no credentials or signed URLs.
        if quotas.get('nextPageToken') or not quotas.get('metrics'):
            raise ValueError('Quotas Cloud Build non verifies')
        for name in NAMES:
            url = api(API + PREFIX + name + ':generateDownloadUrl', 'POST', {})['downloadUrl']
            with urllib.request.urlopen(storage_url(url), timeout=120) as response:
                data = response.read(64 * 1024 * 1024 + 1)
            if len(data) > 64 * 1024 * 1024:
                raise ValueError('Archive trop volumineuse')
            source_check.archive_manifest(data)
            digest = hashlib.sha256(data).hexdigest()
            backup = destination / (name + '.zip')
            backup.write_bytes(data)
            if hashlib.sha256(backup.read_bytes()).hexdigest() != digest:
                raise ValueError('Sauvegarde source TEST invalide')
            receipt.setdefault('sourceSha256', {})[name] = digest
        attested = {}
        sources = {}
        builds = {n: before[PREFIX+n].get('buildConfig', {}).get('build') for n in NAMES}
        def update(name):
            full = PREFIX + name
            started = time.monotonic()
            body = {'name': full, 'buildConfig': {'source': {'storageSource': sources[name]}},
                    'labels': {**before[full].get('labels', {}), 'livepalmes-commit': sha}}
            operation = api(API + full + '?updateMask=build_config.source,labels', 'PATCH', body)
            for _ in range(180):
                if operation.get('done'):
                    break
                time.sleep(5)
                operation = api(API + operation['name'])
            if not operation.get('done') or operation.get('error'):
                raise ValueError('Build TEST interrompu : ' + name)
            actual = api(API + full)
            if config(before[full]) != config(actual) or actual.get('state') != 'ACTIVE':
                raise ValueError('Configuration TEST differente : ' + name)
            build = actual.get('buildConfig', {}).get('build')
            if not build or build == builds[name]:
                raise ValueError('Nouveau build non confirme : ' + name)
            builds[name] = build
            return state.identity(actual), {'name': name, 'seconds': round(time.monotonic() - started, 2), 'buildId': build}
        for workers in (3, 6):
            check(before, inventory(), attested, sha)
            if api(MAIL) != mail or api(HOSTING)['releases'][0] != hosting:
                raise ValueError('Derive mails/Hosting avant benchmark')
            # Different immutable objects, identical bytes: the second series
            # cannot become a no-op from reusing the first storageSource.
            for name in NAMES:
                data = (destination / (name+'.zip')).read_bytes()
                if hashlib.sha256(data).hexdigest() != receipt['sourceSha256'][name]:
                    raise ValueError('Sauvegarde source TEST alteree')
                upload = api(API + 'projects/livepalmes-test/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
                if upload['storageSource'] == sources.get(name):
                    raise ValueError('Reference source deja utilisee')
                req = urllib.request.Request(storage_url(upload['uploadUrl']), method='PUT', data=data, headers={'Content-Type': 'application/zip'})
                with urllib.request.urlopen(req, timeout=120):
                    pass
                sources[name] = upload['storageSource']
            receipt['stage'] = 'building-'+str(workers)
            cycle.write(destination / 'benchmark.json', receipt)
            round_result = {'parallelism': workers, 'operations': []}
            started = time.monotonic()
            for offset in range(0, len(NAMES), workers):
                with ThreadPoolExecutor(max_workers=workers) as executor:
                    for identity, timing in executor.map(update, NAMES[offset:offset + workers]):
                        attested[identity['name']] = identity
                        round_result['operations'].append(timing)
                check(before, inventory(), attested, sha)
            round_result['seconds'] = round(time.monotonic() - started, 2)
            receipt['rounds'].append(round_result)
            cycle.write(destination / 'benchmark.json', receipt)
            print(json.dumps(round_result), flush=True)
        if len(set(builds.values())) != len(NAMES):
            raise ValueError('Build partage entre plusieurs lecteurs')
        if api(MAIL) != mail or api(HOSTING)['releases'][0] != hosting:
            raise ValueError('Derive mails/Hosting apres benchmark')
        receipt['inventoryCount'] = len(before)
        receipt['mailUnchanged'] = receipt['hostingUnchanged'] = True
        selector = destination / 'selector.txt'; selector.write_text(','.join(NAMES), encoding='utf-8')
        cycle.backend_proof(destination, selector)
        receipt['success'] = True
        receipt['stage'] = 'complete'
    finally:
        # Upload only these receipts, never local ZIPs or signed URLs.
        cycle.write(destination / 'benchmark.json', receipt)


if __name__ == '__main__':
    run(sys.argv[1])
