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


def release_policy(request):
    # Preserve the existing policy instance, including its isolated test services.
    return load('production-source-policy.py').for_request(request) if request.get('standardSources', {}).get('schema') == 2 or any(k in request for k in ['a6ReliabilityRelease', 'a4DependenciesRelease', 'a5RetirementRelease', 'clubPaymentPdfRelease', 'organizerFeesRelease', 'officialReviewRelease', 'publicPrivacyRelease', 'publicAccessRelease', 'accessRevocationRelease', 'portalSessionPrepareRelease', 'portalSessionEnforcementRelease', 'optionalAccessObservationRelease']) else policy


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
    request = json.loads((plan/'request.json').read_text(encoding='utf8'))
    policy = release_policy(request)
    value = policy.manifest(plan, request)
    if request.get('standardSources', {}).get('schema') == 2 and 'index.html' in value['staticPaths']:
        home_sources(candidate, value)
    report = json.loads((backup/'report.json').read_text(encoding='utf8'))
    require(report.get('errors') == [] and report.get('standardSourceManifestSha256') == policy.digest(value)
            and json.loads((backup/'standard-source-manifest.json').read_text(encoding='utf8')) == value
            and report.get('candidate') == value['candidate'] and report.get('newFunctions') == [],
            'Sauvegarde initiale hors manifeste')
    before = {f['name']: f for f in json.loads((backup/'functions.json').read_text(encoding='utf8'))}
    policy.initial(list(before.values()), value)
    if 'a4DependenciesRelease' in request or 'a6ReliabilityRelease' in request:
        policy.verify_backup_inverse(backup, report, before, value)
    selected = {PREFIX+n for n in value['selected']}
    observed = state.inventory()
    current = {f['name']: f for f in observed}
    require(len(current) == len(observed), 'Inventaire frais duplique')
    policy.assert_retained(before, current, selected, state)
    previous = json.loads((plan/'previous/production-after.json').read_text(encoding='utf8')) if (plan/'previous/production-after.json').exists() else {}
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
    if request.get('standardSources', {}).get('schema') == 2:
        isolated = load('isolated-publication-inputs.py')
        receipt = isolated.validate(json.loads(Path(os.environ['PRODUCTION_ISOLATED_INPUTS']).read_bytes()), value['candidate']).get('sourceArchive')
        actual = isolated.source_archive_receipt(data)
        require(receipt and all(receipt[k] == actual[k] for k in ['files', 'contentSha256']),
                'Archive source differente de la preparation isolee authentifiee')
    if previous and 'a4DependenciesRelease' in request:
        policy.check_recovery_archives(plan, before, current, pending, data, state, attest)
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
                mask = 'build_config.source,labels'
                if 'publicAccessRelease' in request:
                    body, mask = policy.publication_patch(before[full], source, value['candidate'])
                state.wait_operation(state.request(state.API+full+'?updateMask='+mask, 'PATCH', body))
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


def home_sources(candidate, value):
    """Attest the ignored home source without executing the candidate or reading NAP."""
    def source(name):
        data = subprocess.check_output(['git', 'show', value['candidate']+':'+name], cwd=candidate)
        require(len(data) <= 2*1024**2, 'Source accueil hors limite')
        return data
    config = json.loads(source('firebase.json'))['hosting']
    require(isinstance(config, dict) and 'index.html' in config.get('ignore', [])
            and 'readNapPublicSwimmer' in value['selected'],
            'Accueil serveur hors source existante selectionnee')
    headers = {}
    for route in ['/', '/index.html']:
        rewrites = [r for r in config.get('rewrites', []) if r.get('source') == route]
        require(len(rewrites) == 1 and rewrites[0] == {'source': route, 'function': {
            'functionId': 'readNapPublicSwimmer', 'region': 'europe-west1'}},
            'Route accueil differente du lecteur public attendu')
        headers[route] = {h['key']: h['value'] for r in config.get('headers', [])
                          if r.get('source') == route for h in r.get('headers', [])}
        require(all(headers[route].get(k) for k in ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy']),
                'Protection accueil absente de la configuration candidate')
    html = source('index.html').decode('utf8').replace('\r\n', '\n')
    packed = source('functions/assets/public-home-template.json')
    template = json.loads(packed)
    require(isinstance(template, dict) and set(template) == {'html'} and template['html'] == html,
            'Modele accueil empaquete different de la source candidate')
    return {'headers': headers, 'sourceHtmlSha256': hashlib.sha256(html.encode('utf8')).hexdigest(),
            'packagedTemplateSha256': hashlib.sha256(packed).hexdigest()}


def home_archive(plan, value):
    path = Path(plan)/'standard-source-receipts.json'
    require(path.is_file(), 'Recu archive accueil absent')
    receipts = json.loads(path.read_text(encoding='utf8'))
    require(receipts.get('candidate') == value['candidate']
            and receipts.get('manifestSha256') == policy.digest(value),
            'Recu archive accueil hors candidat/manifeste')
    row = receipts.get('functions', {}).get(PREFIX+'readNapPublicSwimmer', {})
    origin = row.get('storageSource', {})
    identity = row.get('identity', {})
    require(row.get('allPathsAndFileBytesIdentical') is True
            and row.get('generationReadAndReferencesRechecked') is True
            and re.fullmatch('[0-9a-f]{64}', str(row.get('archiveSha256', '')))
            and identity.get('name') == PREFIX+'readNapPublicSwimmer' and identity.get('state') == 'ACTIVE'
            and identity.get('revision') and identity.get('updateTime')
            and origin.get('bucket') == 'gcf-v2-sources-718081132564-europe-west1'
            and origin.get('object') == 'readNapPublicSwimmer/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(origin.get('generation', ''))),
            'Archive accueil geree non attestee')
    return row['archiveSha256']


def home_head(url):
    # Public headers only. The existing handler may read its bounded, cached public NAP data.
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=30) as response:
            return response.status, response.read(1), response.headers
    except urllib.error.HTTPError as error:
        return error.code, b'', error.headers
    except (urllib.error.URLError, TimeoutError):
        return 0, b'', {}


def hosting(candidate, plan, receipt, fetch=None, head=None):
    plan = Path(plan)
    request = json.loads((plan/'request.json').read_text(encoding='utf8'))
    policy = release_policy(request)
    if not policy.enabled(request):
        return
    value = policy.manifest(plan, request)
    common = load('check-production-hosting.py')
    fetch = fetch or common.fetch
    head = head or home_head
    results = []
    try:
        if 'a6ReliabilityRelease' in request:
            results.append(policy.verify_redirect())
        for name in value['staticPaths']:
            if name == 'index.html' and request.get('standardSources', {}).get('schema') == 2:
                presentation = home_sources(candidate, value)
                archive_sha = home_archive(plan, value)
                for route in ['/', '/index.html']:
                    for delay in common.DELAYS:
                        if delay:
                            time.sleep(delay)
                        status, raw, headers = head('https://livepalmes.web.app'+route+'?release='+os.environ['GITHUB_RUN_ID'])
                        valid = (status == 200 and raw == b''
                                 and headers.get('X-LivePalmes-Home-Source') == 'nap-server-html'
                                 and headers.get('Content-Type', '').split(';')[0].strip().lower() == 'text/html'
                                 and {'private', 'no-store'} <= {v.strip().lower() for v in headers.get('Cache-Control', '').split(',')}
                                 and all(headers.get(k) == v for k, v in presentation['headers'][route].items()))
                        results.append({'path': route, 'mode': 'server-home', 'status': status,
                            'candidate': value['candidate'], 'sourceHtmlSha256': presentation['sourceHtmlSha256'],
                            'packagedTemplateSha256': presentation['packagedTemplateSha256'],
                            'managedArchiveSha256': archive_sha, 'allSourcePathsAndBytesAttested': True,
                            'publicHeadersValid': valid})
                        if valid:
                            break
                    else:
                        raise ValueError('Accueil serveur different ou indisponible : '+route)
                continue
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
    request = json.loads((Path(plan)/'request.json').read_text(encoding='utf8'))
    policy = release_policy(request)
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
