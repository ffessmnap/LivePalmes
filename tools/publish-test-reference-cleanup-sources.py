"""Closed club cleanup using the existing source publisher and technical guards."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'club_reference_cleanup'
CONTRACT = ROOT / '.github/releases/evidence/20261110-club-reference-cleanup-contract.json'
CONTRACT_SHA256 = 'ecce557a8898b7906e1dea8cce6775cec14318441ab893b29bc4c2b070871d45'
PROJECT = 'livepalmes-test'
REPOSITORY = 'ffessmnap/LivePalmes'
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'
BINDING_FUNCTIONS = frozenset({'listAccessUsers', 'rebuildAccessDirectoryIndexNextPage',
    'rebuildAccessDirectorySnapshotNextPage', 'setAccessUserStatus', 'requestAccessUserDeletion',
    'syncEngagementMailRecipientIndex'})
BINDING_READERS = ('readNapPublicSwimmer', 'getPublicEngagementClubDirectory',
                   'getNapSwimmerPerformances', 'listEngagementCompetitions')

spec = importlib.util.spec_from_file_location('reference_cleanup_source_primitives', ROOT / 'tools/publish-test-mail-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
cycle, require = publisher.cycle, publisher.require


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat nettoyage modifie')
    entry = json.loads(raw)
    names = entry.get('allowedFunctions', [])
    require(entry.get('schema') == 1 and entry.get('project') == PROJECT and entry.get('release') == RELEASE
            and len(names) == len(set(names)) == 121 and set(entry.get('fingerprints', {})) == set(names)
            and set(entry.get('napBindingFunctions', [])) == BINDING_FUNCTIONS
            and all(re.fullmatch('[a-f0-9]{64}', v) for v in entry['fingerprints'].values()),
            'Perimetre nettoyage non ferme')
    return {**entry, '_contractSha256': CONTRACT_SHA256}


ALLOWED = frozenset(contract()['allowedFunctions'])
publisher.ALLOWED = ALLOWED
publisher.DIGEST = CONTRACT_SHA256
_source_patch, _verify = publisher.source_patch, publisher.verify
_select = publisher.select
_request, _archive = publisher.state.request, publisher.archive_helper.test_archive
_guard = publisher.guard
_desired_secrets, _added_bindings = {}, {}
_before_functions = {}


def valid_binding(binding):
    return isinstance(binding, dict) and set(binding) == {'key', 'projectId', 'secret', 'version'} \
        and binding['key'] == binding['secret'] == 'LIVEPALMES_NAP_PASSWORD' \
        and str(binding['projectId']) in {PROJECT, '206080168534'} \
        and re.fullmatch(r'(?:[1-9][0-9]*|latest)', str(binding['version']))


def configure_bindings(before):
    """Reuse an existing TEST binding already attached to the same runtime account."""
    global _desired_secrets, _added_bindings, _before_functions
    rows = {f['name'].split('/')[-1]: f for f in before}
    require(set(rows) == ALLOWED, 'Inventaire nettoyage hors reference')
    existing = {}
    for name in BINDING_READERS:
        row = rows[name]
        publisher.runtime(row, name)
        account = row.get('serviceConfig', {}).get('serviceAccountEmail')
        for binding in row.get('serviceConfig', {}).get('secretEnvironmentVariables', []):
            if valid_binding(binding):
                existing.setdefault(account, copy.deepcopy(binding))
    desired, added = {}, {}
    for name in sorted(BINDING_FUNCTIONS):
        row = rows[name]
        publisher.runtime(row, name)
        config = row.get('serviceConfig', {})
        require(isinstance(config.get('serviceAccountEmail'), str) and config['serviceAccountEmail'],
                'Compte runtime absent : ' + name)
        secrets = copy.deepcopy(config.get('secretEnvironmentVariables', []))
        require(len({v['key'] for v in secrets}) == len(secrets), 'Bindings existants ambigus')
        matches = [v for v in secrets if v['key'] == 'LIVEPALMES_NAP_PASSWORD']
        if matches:
            require(len(matches) == 1 and valid_binding(matches[0]), 'Binding NAP existant hors TEST')
        else:
            binding = existing.get(config.get('serviceAccountEmail'))
            require(binding is not None, 'Compte runtime sans binding NAP preexistant : ' + name)
            secrets.append(copy.deepcopy(binding))
            added[name] = copy.deepcopy(binding)
        desired[name] = secrets
    _desired_secrets, _added_bindings = desired, added
    _before_functions = copy.deepcopy(rows)


def source_patch(function, source, candidate):
    body = _source_patch(function, source, candidate)
    name = function['name'].split('/')[-1]
    if name in _added_bindings:
        body['serviceConfig'] = {'secretEnvironmentVariables': copy.deepcopy(_desired_secrets[name])}
    return body


def select(before, candidate, entry):
    configure_bindings(before)
    return _select(before, candidate, entry)


def request(url, method='GET', body=None):
    if method == 'PATCH':
        prefix = publisher.state.API + PREFIX
        require(url.startswith(prefix) and '?' in url, 'PATCH nettoyage hors TEST')
        name, query = url[len(prefix):].split('?', 1)
        require(name in ALLOWED and query == 'updateMask=build_config.source,labels'
                and isinstance(body, dict) and body.get('name') == PREFIX + name,
                'PATCH nettoyage hors source autorisee')
        if name in _added_bindings:
            require(set(body) == {'name', 'buildConfig', 'labels', 'serviceConfig'}
                    and body['serviceConfig'] == {'secretEnvironmentVariables': _desired_secrets[name]},
                    'Configuration nettoyage elargie')
            previous = _before_functions[name]
            current = _request(publisher.state.API + PREFIX + name)
            require(current.get('state') == 'ACTIVE'
                    and publisher.configuration_identity(current) == publisher.configuration_identity(previous)
                    and all(current.get(key) == previous.get(key) for key in ['labels', 'updateTime'])
                    and current['serviceConfig']['revision'] == previous['serviceConfig']['revision'],
                    'Configuration modifiee avant raccordement NAP : ' + name)
            url += ',service_config.secret_environment_variables'
        else:
            require(set(body) == {'name', 'buildConfig', 'labels'}, 'Configuration hors des six bindings')
    return _request(url, method, body)


def verify(before, after, selected, candidate, sources):
    configure_bindings(before)
    expected = copy.deepcopy(before)
    for row in expected:
        name = row['name'].split('/')[-1]
        if name in set(selected).intersection(_added_bindings):
            row['serviceConfig']['secretEnvironmentVariables'] = copy.deepcopy(_desired_secrets[name])
    # The original verifier freezes every other service/build/event field and
    # every unselected function; it still verifies distinct committed revisions.
    _verify(expected, after, selected, candidate, sources)


def archive(candidate, sha, secrets, names):
    if set(names).intersection(BINDING_FUNCTIONS):
        secrets = set(secrets) | {'LIVEPALMES_NAP_PASSWORD'}
    return _archive(candidate, sha, secrets, names)


def guard(candidate, entry, env=os.environ):
    require(env.get('GITHUB_REPOSITORY') == REPOSITORY and env.get('RELEASE') == RELEASE,
            'Depot ou lot nettoyage interdit')
    return _guard(candidate, entry, env)


def publisher_contract(release):
    require(release == RELEASE, 'Ancien lot inaccessible depuis le nettoyage')
    return contract()


publisher.contract = publisher_contract
publisher.guard = guard
publisher.source_patch = source_patch
publisher.select = select
publisher.state.request = request
publisher.verify = verify
publisher.archive_helper.test_archive = archive


def main(mode, release, directory, candidate):
    require(mode in {'prepare', 'deploy', 'verify', 'diagnostic'} and release == RELEASE,
            'Mode ou lot nettoyage interdit')
    directory = Path(directory).resolve()
    if mode in {'deploy', 'verify'}:
        configure_bindings(cycle.read(directory / 'before.json'))
    publisher.main(mode, release, directory, candidate)
    if mode == 'prepare':
        configure_bindings(cycle.read(directory / 'before.json'))
    if mode == 'verify':
        proof = cycle.read(directory / 'test-backend-proof.json')
        changes = {n: v for n, v in _added_bindings.items() if n in proof['selected']}
        require(proof['controlsBefore'] == proof['controlsAfter'], 'Etats techniques modifies')
        proof.update(configurationsUnchanged=not changes,
            configurationsUnchangedExceptApprovedNapBindings=True, addedNapBindings=changes,
            controlsUnchanged=True, baselineRun=contract()['baselineRuns'][0]['id'])
        cycle.write(directory / 'test-backend-proof.json', proof)


def trusted_revisions(directory, current, api):
    """Authenticate this closed receipt, including its six permitted binding deltas."""
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
            destination = Path(directory) / ('reference-cleanup-' + str(info['id']))
            source = api.artifact(info['id'], 'test-backend-proof', destination, '.github/workflows/livepalmes-test-mail-sources.yml')
            require(source.get('id') == info['id'] and source.get('head_branch') == 'main'
                    and source.get('path') == '.github/workflows/livepalmes-test-mail-sources.yml'
                    and source.get('event') == 'workflow_dispatch' and source.get('run_attempt') == 1
                    and source.get('status') == 'completed' and source.get('conclusion') == 'success'
                    and source.get('repository', {}).get('full_name') == REPOSITORY
                    and source.get('head_repository', {}).get('full_name') == REPOSITORY,
                    'Provenance nettoyage invalide')
            proof = api.read(destination / 'test-backend-proof.json')
            require(proof.get('schema') == 1 and proof.get('release') == RELEASE
                    and proof.get('candidate') == source.get('head_sha') == info.get('head_sha')
                    and proof.get('contractSha256') == CONTRACT_SHA256
                    and proof.get('applicationAnchor') == entry['applicationCommit']
                    and proof.get('baselineRun') == entry['baselineRuns'][0]['id'], 'Preuve nettoyage hors contrat')
            names = proof.get('selected', [])
            require(isinstance(names, list) and names and len(names) == len(set(names)) and set(names) <= ALLOWED,
                    'Selection nettoyage elargie ou vide')
            rows = proof.get('state', {}).get('functions', [])
            require(len(rows) == len(names) and {f.get('name') for f in rows} == {PREFIX + n for n in names}
                    and all(f.get('commit') == proof['candidate'] for f in rows), 'Revisions nettoyage hors selection')
            desired = api.test_backend_fingerprints(proof['candidate'])
            require(all(desired.get(n) == entry['fingerprints'][n] for n in ALLOWED), 'Empreintes nettoyage differentes')
            changes = proof.get('addedNapBindings', {})
            controls = proof.get('controlsBefore')
            require(isinstance(changes, dict) and set(changes) <= set(names).intersection(BINDING_FUNCTIONS)
                    and all(valid_binding(v) for v in changes.values())
                    and proof.get('configurationsUnchanged') is (not changes)
                    and all(proof.get(k) is True for k in ['configurationsUnchangedExceptApprovedNapBindings',
                        'otherFunctionsUnchanged', 'hostingUnchanged', 'controlsUnchanged'])
                    and proof.get('taskContentsRead') is False
                    and isinstance(controls, dict) and controls == proof.get('controlsAfter')
                    and controls.get('mailEnabled') is False and controls.get('schedulerSuspended') is True
                    and controls.get('queuePaused') is True, 'Garde nettoyage absent')
            managed = proof.get('managedSources', {})
            require(set(managed) == set(names) and all(v.get('allPathsAndFileBytesIdentical') is True
                    and v.get('generationReadAndReferencesRechecked') is True
                    and re.fullmatch('[a-f0-9]{64}', v.get('archiveSha256', ''))
                    and re.fullmatch('[a-f0-9]{64}', v.get('archiveIdentity', ''))
                    and v.get('storageSource', {}).get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
                    and v['storageSource'].get('object') == n + '/function-source.zip'
                    and re.fullmatch('[1-9][0-9]*', str(v['storageSource'].get('generation', '')))
                    for n, v in managed.items()), 'Archives nettoyage non attestees')
            trusted.update(api.matching_functions({'state': {'functions': rows}}, current))
        except (ValueError, KeyError, TypeError, publisher.subprocess.CalledProcessError, urllib.error.HTTPError) as error:
            print(f"Preuve nettoyage {info['id']} non reutilisable : {error}")
    return trusted


if __name__ == '__main__':
    main(*sys.argv[1:])
