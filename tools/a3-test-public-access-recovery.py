"""Closed read-only A3.2 recovery; original failed run never becomes a success."""
from datetime import datetime
from functools import lru_cache
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
CONTRACT = '.github/releases/evidence/20261116-a3-public-access-test-recovery.json'
DIGEST = 'd48e120c43bc1d6dc0a49e727ae89cf26ffab239dda59c50fe357e91da3046b0'
APP = '1670b49db7528b33714a5d2441009f49516a1809'
DEPLOYMENT_RUN, BASELINE_RUN = 43904934447, 43764755229
NAMES = ['getPublicEngagementClubDirectory', 'resolveEngagementAccessRequest', 'submitEngagementAccessRequest']
PUBLIC = {NAMES[0], NAMES[2]}
PROJECT, REPOSITORY = 'livepalmes-test', 'ffessmnap/LivePalmes'
PREFIX = 'projects/livepalmes-test/locations/europe-west1/functions/'
WORKFLOW = '.github/workflows/livepalmes-test-public-access-proof.yml'
API = 'https://cloudfunctions.googleapis.com/v2/'


def require(value, message):
    if not value:
        raise ValueError(message)


@lru_cache(maxsize=8)
def load(filename):
    spec = importlib.util.spec_from_file_location('a3_' + filename.replace('-', '_'), ROOT/'tools'/filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def contract():
    raw = (ROOT/CONTRACT).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat A3.2 non scelle')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['kind'] == 'a3-public-access-test-recovery-v1'
            and value['applicationCandidate'] == APP and value['deploymentRun'] == DEPLOYMENT_RUN
            and value['baselineRun'] == BASELINE_RUN and value['functions'] == NAMES
            and set(value['protectedConfigurationHashes']) == set(NAMES)
            and len(value['initialMetadataHashes']) == 121, 'Perimetre A3.2 inconnu')
    return value


def summary(row):
    return {'name': row['name'], 'revision': row.get('serviceConfig', {}).get('revision'),
            'updateTime': row.get('updateTime'), 'state': row.get('state'),
            'commit': row.get('labels', {}).get('livepalmes-commit')}


def normalize(state):
    result = load('test-public-access-guards-state.py').stable_state(state)
    for row in result['functions']:
        if row['name'].split('/')[-1] in NAMES:
            require(not row.get('eventTrigger') and row.get('labels', {}).get('deployment-callable') == 'true', 'Callable HTTP attendu')
            env = row.get('serviceConfig', {}).get('environmentVariables', {})
            if env.get('FUNCTION_SIGNATURE_TYPE') in {None, 'http'}:
                env.pop('FUNCTION_SIGNATURE_TYPE', None)
    return result


def verify_baseline(proof, value):
    require(digest(proof) == value['baselineProofSha256']
            and proof['candidate'] == value['baselineCandidate']
            and digest(proof['state']['functions']) == value['initialStateSha256']
            and len(proof['state']['functions']) == 121
            and {r['name'] for r in proof['state']['functions']} == {PREFIX+n for n in value['initialMetadataHashes']},
            'Ancre TEST initiale differente')


def snapshot(cycle):
    rows, page = [], ''
    for _ in range(2):
        result = cycle.api(PROJECT, 'functions'+('&pageToken='+urllib.parse.quote(page, safe='') if page else ''))
        require(not result.get('unreachable'), 'Inventaire de reprise incomplet')
        rows.extend(result.get('functions', []))
        page = result.get('nextPageToken', '')
        if not page:
            return {'functions': sorted(rows, key=lambda row: row['name']), 'hosting': cycle.api(PROJECT, 'hosting')['releases'][0]}
    raise ValueError('Inventaire A3.2 au-dela de deux pages : arret')


def verify_state(state, baseline, value):
    require(state['hosting']['name'] == baseline['state']['hosting']['name']
            and state['hosting']['version']['name'] == baseline['state']['hosting']['version']
            and state['hosting'].get('message', '') == baseline['state']['hosting']['message'], 'Hosting initial modifie')
    rows = {r['name'].split('/')[-1]: r for r in state['functions']}
    require(len(rows) == len(state['functions']) == 121 and set(rows) == set(value['initialMetadataHashes']), 'Inventaire A3.2 modifie')
    witness = load('test-public-access-guards-state.py')
    expected = {r['name']: r for r in value['deployedState']['functions']}
    for name, row in rows.items():
        require(row['name'] == PREFIX+name and row['state'] == 'ACTIVE', 'Origine ou etat A3.2 invalide')
        if name not in NAMES:
            require(digest(witness.stable_state({'functions': [row]})['functions'][0]) == value['initialMetadataHashes'][name], 'Fonction hors reprise modifiee : '+name)
            continue
        normalize({'functions': [row]})
        require(summary(row) == expected[row['name']] and row['environment'] == 'GEN_2'
                and row['buildConfig']['runtime'] == 'nodejs22' and row['buildConfig']['entryPoint'] == name,
                'Revision installee hors reprise : '+name)
        require(digest(witness.configuration(row, name in PUBLIC)) == value['protectedConfigurationHashes'][name], 'Configuration A3.2 modifiee : '+name)
        if name in PUBLIC:
            require(all(row['serviceConfig'].get(k) == v for k, v in value['publicCapacities'][name].items()), 'Capacite publique non confirmee')


def verify_original(info, jobs, logs, value):
    require(info.get('id') == DEPLOYMENT_RUN and info.get('head_sha') == APP and info.get('head_branch') == 'main'
            and info.get('event') == 'workflow_dispatch' and info.get('run_attempt') == 1
            and info.get('status') == 'completed' and info.get('conclusion') == 'failure'
            and info.get('path') == '.github/workflows/livepalmes-test-backend.yml'
            and all(info.get(k, {}).get('full_name') == REPOSITORY for k in ['repository', 'head_repository']), 'Run initial hors reprise')
    selected = [j for j in jobs if j.get('name') == 'Vérifier puis déployer le lot email en TEST']
    require(len(selected) == 1 and all(j in selected or j.get('conclusion') == 'skipped' for j in jobs), 'Jobs initiaux ambigus')
    steps = {s['name']: s for s in selected[0]['steps']}
    for name in ['Vérifier LivePalmes et la classification des Functions', 'Calculer et borner le contrat A3.2 avec mails TEST deja desactives',
                 'Refuser toute derive A3.2 juste avant publication', 'Déployer uniquement les Functions du lot TEST']:
        require(steps.get(name, {}).get('conclusion') == 'success', 'Etape initiale non confirmee : '+name)
    require([s['name'] for s in selected[0]['steps'] if s.get('conclusion') == 'failure'] == ['Controler le contrat A3.2, les configurations et les traitements conserves'], 'Echec initial different')
    cleaned = re.sub(r'\x1b\[[0-9;]*[A-Za-z]', '', logs)
    require(len(logs.encode()) < 4*1024**2 and 'ValueError: Configuration ou liaison modifiee : getPublicEngagementClubDirectory' in cleaned
            and all(cleaned.count('functions['+n+'(europe-west1)] Successful update operation.') == 1 for n in NAMES), 'Trace initiale incompatible')
    deployment = steps['Déployer uniquement les Functions du lot TEST']
    stamp = lambda text: datetime.fromisoformat(text.replace('Z', '+00:00'))
    require(all(stamp(deployment['started_at']) <= stamp(r['updateTime']) <= stamp(deployment['completed_at'])
                for r in value['deployedState']['functions']), 'Revisions hors deploiement initial')


def source_reference(row):
    name = row['name'].split('/')[-1]
    source = row.get('buildConfig', {}).get('source', {}).get('storageSource', {})
    require(name in NAMES and row['name'] == PREFIX+name
            and source == row['buildConfig'].get('sourceProvenance', {}).get('resolvedStorageSource')
            and source.get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
            and source.get('object') == name+'/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(source.get('generation', ''))), 'Source A3.2 inconnue')
    return source


def source_request(url, method='GET', body=None):
    allowed = {API+PREFIX+n for n in NAMES}
    require((method == 'GET' and url in allowed and body is None)
            or (method == 'POST' and body == {} and url in {u+':generateDownloadUrl' for u in allowed}), 'Lecture source A3.2 hors perimetre')
    return load('production-release-state.py').request(url, method, body)


def attest_source(row, expected):
    source = source_reference(row)
    def recheck():
        current = source_request(API+row['name'])
        require(source_reference(current) == source and summary(current) == summary(row), 'Source A3.2 modifiee pendant lecture')
    recheck()
    download = source_request(API+row['name']+':generateDownloadUrl', 'POST', {})
    url = urllib.parse.urlsplit(download['downloadUrl'])
    require(url.scheme == 'https' and url.hostname == 'storage.googleapis.com'
            and urllib.parse.unquote(url.path).lstrip('/') == source['bucket']+'/'+source['object'], 'Destination source A3.2 interdite')
    try:
        with urllib.request.urlopen(download['downloadUrl'], timeout=60) as response:
            require(response.headers.get('x-goog-generation') == source['generation'], 'Generation source A3.2 differente')
            data = response.read(64*1024**2+1)
    except urllib.error.HTTPError as error:
        raise ValueError('Archive A3.2 indisponible : HTTP '+str(error.code)) from None
    identity = load('publish-test-mail-sources.py').archive_identity
    require(len(data) <= 64*1024**2, 'Archive source A3.2 trop volumineuse')
    actual_identity, expected_identity = identity(data), identity(expected)
    if actual_identity != expected_identity:
        def paths(payload):
            with zipfile.ZipFile(io.BytesIO(payload)) as archive:
                return {item.filename: hashlib.sha256(archive.read(item)).hexdigest() for item in archive.infolist()}
        actual, wanted = paths(data), paths(expected)
        changed = [name for name in sorted(set(actual)|set(wanted)) if actual.get(name) != wanted.get(name)]
        raise ValueError('Octets ou chemins source A3.2 differents : '+', '.join(changed[:12]))
    recheck()
    return {'storageSource': source, 'archiveSha256': hashlib.sha256(data).hexdigest(), 'archiveIdentity': actual_identity,
            'allPathsAndFileBytesIdentical': True, 'generationReadAndReferencesRechecked': True}


def guard(env, head):
    require(env.get('GITHUB_REPOSITORY') == REPOSITORY and env.get('GITHUB_REF') == 'refs/heads/main'
            and env.get('GITHUB_RUN_ATTEMPT') == '1' and env.get('TARGET_FIREBASE_PROJECT') == PROJECT
            and env.get('CONFIRMATION') == PROJECT and head == env.get('GITHUB_SHA') == env.get('EXPECTED_COMMIT')
            and re.fullmatch('[0-9a-f]{40}', head or ''), 'Reprise A3.2 hors cible/version')


def main(directory, expected_archive):
    cycle = load('release-cycle.py')
    head = cycle.git('rev-parse', 'HEAD')
    guard(os.environ, head)
    value = contract()
    require(not cycle.git('status', '--porcelain'), 'Outillage A3.2 modifie')
    require(not cycle.git('diff', '--name-only', APP, head, '--', 'functions/', 'tools/prepare-firebase-test-functions.js', 'tools/firebase-test-backend-lots.js'), 'Sources applicatives ou staging A3.2 modifies')
    for path, expected in value['originalSources'].items():
        # git helper strips the final newline; hash the exact Git bytes instead.
        require(hashlib.sha256(subprocess.check_output(['git', 'show', APP+':'+path], cwd=ROOT)).hexdigest() == expected, 'Controle initial A3.2 modifie')
    runs = cycle.gh(f'repos/{REPOSITORY}/actions/workflows/livepalmes-verification-preview.yml/runs?branch=main&event=push&per_page=20')['workflow_runs']
    require(any(r.get('head_sha') == head and r.get('conclusion') == 'success' and r.get('status') == 'completed'
                and r.get('run_attempt') == 1 and r.get('path') == '.github/workflows/livepalmes-verification-preview.yml' for r in runs), 'CI main exacte A3.2 absente')
    original = cycle.gh(f'repos/{REPOSITORY}/actions/runs/{DEPLOYMENT_RUN}')
    jobs = cycle.gh(f'repos/{REPOSITORY}/actions/runs/{DEPLOYMENT_RUN}/jobs?per_page=100')['jobs']
    job = next(j for j in jobs if j['name'] == 'Vérifier puis déployer le lot email en TEST')
    logs = load('publish-test-mail-sources.py').closed_run_logs(job['id'])
    verify_original(original, jobs, logs, value)
    target = Path(directory)
    info = cycle.artifact(BASELINE_RUN, 'test-proof', target/'baseline', '.github/workflows/livepalmes-test-common.yml')
    require(info['head_sha'] == value['baselineCandidate'], 'Provenance baseline A3.2 differente')
    baseline = cycle.read(target/'baseline/test-proof.json')
    verify_baseline(baseline, value)
    before = snapshot(cycle)
    verify_state(before, baseline, value)
    expected = Path(expected_archive).read_bytes()
    sources = {r['name'].split('/')[-1]: attest_source(r, expected) for r in before['functions'] if r['name'].split('/')[-1] in NAMES}
    after = snapshot(cycle)
    require(normalize(before) == normalize(after), 'Derive pendant verification A3.2')
    verify_state(after, baseline, value)
    # Mail setting is read twice by the existing pure guard, never changed.
    mail = cycle.read(target/'mail-before.json')
    subprocess.run(['node', str(ROOT/'tools/a3-test-public-access-mail-witness.js'), str(target/'mail-after.json')], check=True, cwd=ROOT)
    require(mail == cycle.read(target/'mail-after.json') and mail.get('disabled') is True, 'Reglage mail A3.2 modifie')
    cycle.write(target/'a3-test-public-access-proof.json', {'schema': 1, 'kind': 'a3-public-access-readonly-proof-v1',
        'contractSha256': DIGEST, 'candidate': head, 'applicationCandidate': APP, 'recoveredRun': DEPLOYMENT_RUN,
        'baselineRun': BASELINE_RUN, 'originalRunConclusion': 'failure', 'readOnlyRecovery': True,
        'selected': NAMES, 'state': value['deployedState'], 'managedSources': sources,
        'otherFunctionsUnchanged': True, 'configurationsPreserved': True, 'publicCapacitiesVerified': True,
        'hostingUnchanged': True, 'mailsDisabled': True, 'mailSettingPreservedDuringVerification': True})
    print('A3.2 : trois revisions et archives exactes confirmees en lecture seule ; 118 fonctions, Hosting et reglages conserves.')


def trusted_revisions(directory, current, api):
    """Dedicated receipt only; no change to ordinary failed-run evidence rules."""
    trusted = set()
    if not any(row.get('commit') == APP and row['name'].split('/')[-1] in NAMES for row in current['functions']):
        return trusted
    contract()
    runs = api.gh(f'repos/{REPOSITORY}/actions/workflows/livepalmes-test-public-access-proof.yml/runs?branch=main&per_page=20')['workflow_runs']
    for info in runs:
        if info.get('status') != 'completed' or info.get('conclusion') != 'success' or info.get('run_attempt') != 1:
            continue
        try:
            source = api.artifact(info['id'], 'a3-test-public-access-proof', Path(directory)/('a3-public-access-'+str(info['id'])), WORKFLOW)
            require(source.get('event') == 'workflow_dispatch' and source.get('head_branch') == 'main'
                    and source.get('path') == WORKFLOW and source.get('run_attempt') == 1
                    and source.get('status') == 'completed' and source.get('conclusion') == 'success'
                    and all(source.get(k, {}).get('full_name') == REPOSITORY for k in ['repository', 'head_repository']), 'Provenance reprise A3.2 invalide')
            proof = api.read(Path(directory)/('a3-public-access-'+str(info['id']))/'a3-test-public-access-proof.json')
            validate_receipt(proof, source, api.test_backend_fingerprints)
            trusted.update(api.matching_functions(proof, current))
        except (ValueError, KeyError, TypeError, urllib.error.HTTPError) as error:
            print('Preuve de reprise A3.2 '+str(info['id'])+' non reutilisable : '+str(error))
    return trusted


def validate_receipt(proof, source, fingerprints):
    value = contract()
    require(proof.get('schema') == 1 and proof.get('kind') == 'a3-public-access-readonly-proof-v1'
            and proof.get('contractSha256') == DIGEST and proof.get('candidate') == source['head_sha']
            and proof.get('applicationCandidate') == APP and proof.get('recoveredRun') == DEPLOYMENT_RUN
            and proof.get('baselineRun') == BASELINE_RUN and proof.get('originalRunConclusion') == 'failure'
            and proof.get('selected') == NAMES and proof.get('state') == value['deployedState']
            and all(proof.get(k) is True for k in ['readOnlyRecovery', 'otherFunctionsUnchanged', 'configurationsPreserved',
                    'publicCapacitiesVerified', 'hostingUnchanged', 'mailsDisabled', 'mailSettingPreservedDuringVerification']), 'Recu A3.2 hors contrat')
    desired, anchored = fingerprints(source['head_sha']), fingerprints(APP)
    require(all(desired.get(n) == anchored.get(n) and anchored.get(n) for n in NAMES), 'Code applicatif A3.2 different')
    managed = proof.get('managedSources', {})
    require(set(managed) == set(NAMES) and all(v.get('allPathsAndFileBytesIdentical') is True
            and v.get('generationReadAndReferencesRechecked') is True
            and re.fullmatch('[0-9a-f]{64}', str(v.get('archiveSha256', '')))
            and re.fullmatch('[0-9a-f]{64}', str(v.get('archiveIdentity', '')))
            and v.get('storageSource', {}).get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
            and v['storageSource'].get('object') == n+'/function-source.zip'
            and re.fullmatch('[1-9][0-9]*', str(v['storageSource'].get('generation', '')))
            for n, v in managed.items()), 'Archives A3.2 non attestees')


if __name__ == '__main__':
    main(*sys.argv[1:])
