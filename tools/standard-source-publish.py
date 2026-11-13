"""Stable source-only transport behind an authenticated immutable release plan."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from threading import Event
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = load('standard-source-policy.py')
require = policy.require
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def attest(function, expected, state):
    identity = load('publish-test-mail-sources.py').archive_identity
    source = function.get('buildConfig', {}).get('source', {}).get('storageSource', {})
    require(source == function.get('buildConfig', {}).get('sourceProvenance', {}).get('resolvedStorageSource')
            and source.get('bucket') == 'gcf-v2-sources-718081132564-europe-west1'
            and source.get('object') == function['name'].split('/')[-1]+'/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))),
            'Source geree PROD inconnue')
    before = state.identity(function)
    require(state.identity(state.request(state.API+function['name'])) == before, 'Source modifiee avant lecture')
    signed = state.request(state.API+function['name']+':generateDownloadUrl', 'POST', {})['downloadUrl']
    url = urllib.parse.urlsplit(signed)
    require(url.scheme == 'https' and url.hostname == 'storage.googleapis.com'
            and urllib.parse.unquote(url.path).lstrip('/') == source['bucket']+'/'+source['object'],
            'Destination archive PROD interdite')
    with urllib.request.urlopen(signed, timeout=60) as response:
        require(response.headers.get('x-goog-generation') == source['generation'], 'Generation archive differente')
        data = response.read(64*1024**2+1)
    require(len(data) <= 64*1024**2 and identity(data) == identity(expected), 'Archive geree hors candidat')
    require(state.identity(state.request(state.API+function['name'])) == before, 'Source modifiee pendant lecture')
    return {'identity': before, 'storageSource': source, 'archiveSha256': hashlib.sha256(data).hexdigest(),
            'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True}


def publish(candidate, plan, backup, state, archive, deadline):
    candidate, plan, backup = Path(candidate), Path(plan), Path(backup)
    request = json.loads((plan/'request.json').read_text())
    policy = load('production-source-policy.py').for_request(request)
    value = policy.manifest(plan, request)
    report = json.loads((backup/'report.json').read_text())
    require(report.get('errors') == [] and report.get('standardSourceManifestSha256') == policy.digest(value)
            and json.loads((backup/'standard-source-manifest.json').read_text()) == value
            and report.get('candidate') == value['candidate'] and report.get('newFunctions') == [],
            'Sauvegarde initiale hors manifeste')
    before = {f['name']: f for f in json.loads((backup/'functions.json').read_text())}
    policy.initial(list(before.values()), value)
    selected = {PREFIX+n for n in value['selected']}
    observed = state.inventory()
    current = {f['name']: f for f in observed}
    require(len(current) == len(observed), 'Inventaire frais duplique')
    policy.assert_retained(before, current, selected, state)
    previous = json.loads((plan/'previous/production-after.json').read_text()) if (plan/'previous/production-after.json').exists() else {}
    require(not previous or (previous.get('candidate') == value['candidate']
            and {f['name'] for f in previous.get('functions', [])} == set(before)), 'Reprise hors candidat/inventaire')
    attested = {f['name']: f for f in previous.get('functions', [])}
    pending = []
    for full in sorted(selected):
        require(full in current and full in before, 'Fonction existante absente')
        if state.identity(current[full]) == state.identity(before[full]):
            pending.append(full)
        else:
            require(attested.get(full) == state.identity(current[full]), 'Revision partielle non authentifiee')
            policy.assert_selected(before[full], current[full], value['candidate'])
    policy.guard(plan)
    require(time.time() < deadline, 'Budget atteint avant toute source')
    if not selected:
        return
    data = archive(candidate, value['candidate'])
    stopped = Event()
    if pending:
        upload = state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
        url = urllib.parse.urlsplit(upload['uploadUrl'])
        require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com'
                or url.hostname.endswith('.storage.googleapis.com')), 'Destination source interdite')
        target = (urllib.parse.unquote(url.path).lstrip('/').split('/', 1) if url.hostname == 'storage.googleapis.com'
                  else [url.hostname.removesuffix('.storage.googleapis.com'), urllib.parse.unquote(url.path).lstrip('/')])
        require(target == [upload['storageSource']['bucket'], upload['storageSource']['object']],
                'Objet source different de l upload')
        with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'], method='PUT', data=data,
                headers={'Content-Type':'application/zip'}), timeout=120) as response:
            generation = response.headers.get('x-goog-generation')
        source = {**upload['storageSource']}
        if generation:
            source['generation'] = generation
        require(re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Generation de source absente')
        def update(full):
            try:
                require(not stopped.is_set() and time.time() < deadline, 'Publication interrompue ou budget atteint')
                actual = state.request(state.API+full)
                require(state.identity(actual) == state.identity(before[full]), 'Derive fraiche avant PATCH')
                require(policy.configuration(actual) == policy.configuration(before[full])
                        and actual.get('labels') == before[full].get('labels')
                        and actual.get('buildConfig', {}).get('source') == before[full].get('buildConfig', {}).get('source'),
                        'Configuration, labels ou source derives')
                body = {'name': full, 'buildConfig': {'source': {'storageSource': source}},
                        'labels': {**before[full].get('labels', {}), 'livepalmes-commit': value['candidate']}}
                require(not stopped.is_set() and time.time() < deadline, 'PATCH bloque apres erreur/budget')
                state.wait_operation(state.request(state.API+full+'?updateMask=build_config.source,labels', 'PATCH', body))
                policy.assert_selected(before[full], state.request(state.API+full), value['candidate'])
            except BaseException:
                stopped.set()
                raise
        with ThreadPoolExecutor(max_workers=3) as executor:
            list(executor.map(update, pending))
    after = {f['name']: f for f in state.inventory()}
    policy.assert_retained(before, after, selected, state)
    receipts = {}
    for full in sorted(selected):
        policy.assert_selected(before[full], after[full], value['candidate'])
        receipts[full] = attest(after[full], data, state)
    (plan/'standard-source-receipts.json').write_text(json.dumps({
        'candidate': value['candidate'], 'manifestSha256': policy.digest(value), 'functions': receipts}, indent=2))
    policy.guard(plan)


def hosting(candidate, plan, receipt, fetch=None):
    plan = Path(plan)
    request = json.loads((plan/'request.json').read_text())
    policy = load('production-source-policy.py').for_request(request)
    if not policy.enabled(request):
        return
    value = policy.manifest(plan, request)
    common = load('check-production-hosting.py')
    fetch = fetch or common.fetch
    results = []
    try:
        for name in value['staticPaths']:
            expected = subprocess.check_output(['git', 'show', value['candidate']+':'+name], cwd=candidate)
            for delay in common.DELAYS:
                if delay:
                    time.sleep(delay)
                status, raw, _ = fetch('https://livepalmes.web.app/'+urllib.parse.quote(name)+'?release='+os.environ['GITHUB_RUN_ID'])
                actual, digest = hashlib.sha256(raw).hexdigest(), hashlib.sha256(expected).hexdigest()
                results.append({'path': name, 'status': status, 'expectedSha256': digest, 'actualSha256': actual})
                if status == 200 and actual == digest:
                    break
            else:
                raise ValueError('Fichier statique different : '+name)
    finally:
        Path(receipt).write_text(json.dumps(results, indent=2))


def main(candidate, plan, backup):
    request = json.loads((Path(plan)/'request.json').read_text())
    policy = load('production-source-policy.py').for_request(request)
    if not policy.enabled(request):
        return
    require(os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
            and os.environ.get('GITHUB_WORKFLOW_REF') ==
                'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main',
            'Publication standard reservee au workflow officiel main')
    start = os.environ.get('NOVEMBER_RELEASE_STARTED_AT', '')
    require(re.fullmatch('[0-9]{10,11}', start) and int(start) <= time.time(), 'Horodatage initial absent')
    state, archive = load('production-release-state.py'), load('publish-approved-pdf-functions.py').archive
    publish(candidate, plan, backup, state, archive, int(start)+70*60)


if __name__ == '__main__':
    if sys.argv[1:2] == ['hosting']:
        hosting(*sys.argv[2:])
    else:
        main(*sys.argv[1:])
