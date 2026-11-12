"""Opt-in standard TEST sources using the existing guarded source transport."""
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.error

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location('standard_test_'+name.replace('-', '_'), ROOT/'tools'/name)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


policy = load('standard-source-policy.py')
require = policy.require
WORKFLOW = '.github/workflows/livepalmes-test-mail-sources.yml'
REPOSITORY = 'ffessmnap/LivePalmes'
PREFIX = 'projects/livepalmes-test/locations/europe-west1/functions/'


def validate(value):
    require(isinstance(value, dict) and set(value) == {'schema','candidate','baselineRun','baselineCandidate',
            'baselineHosting','functions','approval'} and value['schema'] == 1,
            'Manifeste TEST standard incomplet ou option interdite')
    require(all(re.fullmatch('[0-9a-f]{40}', str(value[k])) for k in ['candidate','baselineCandidate'])
            and type(value['baselineRun']) is int and value['baselineRun'] > 0
            and re.fullmatch('sites/livepalmes-test/versions/[A-Za-z0-9_-]+', value['baselineHosting']),
            'Baseline TEST exacte requise')
    names = value['functions']
    require(isinstance(names, list) and names and all(isinstance(n, str) for n in names)
            and names == sorted(set(names)) and set(names) <= policy.eligible(),
            'Autorisation TEST existante absente, dupliquee ou exclue')
    policy.approval(value['approval'])
    return value


def selection(before, candidate, names, fingerprints):
    require(len(before) == len({f['name'] for f in before}) and 0 < len(before) <= 500,
            'Inventaire TEST incomplet')
    desired = fingerprints(candidate)
    calculated = []
    for function in before:
        name = function['name'].split('/')[-1]
        commit = function.get('labels', {}).get('livepalmes-commit', '')
        require(function['name'] == PREFIX+name and function.get('state') == 'ACTIVE'
                and re.fullmatch('[0-9a-f]{40}', commit), 'Origine TEST non prouvee')
        old = fingerprints(commit)
        require(name in old and name in desired and set(old) == set(desired),
                'Declaration ou dependance TEST inconnue/modifiee')
        if old[name] != desired[name]:
            calculated.append(name)
    require(sorted(calculated) == names, 'Selection TEST complete differente de l autorisation')
    return sorted(calculated)


def configured(value):
    value = validate(value)
    publisher = load('publish-test-direct-sources.py')
    publisher.RELEASE = 'standard'
    publisher.ALLOWED = frozenset(value['functions'])
    publisher.CONTRACT_SHA256 = policy.digest(value)
    desired = publisher.cycle.test_backend_fingerprints(value['candidate'])
    entry = {'applicationCommit': value['candidate'], 'baseCommit': value['baselineCandidate'],
             'fingerprints': {n: desired[n] for n in value['functions']},
             'baselineRuns': [{'id': value['baselineRun']}], 'toolingPaths': []}
    publisher.contract = lambda: entry

    def guard(candidate, unused, env=os.environ):
        sha = publisher.cycle.run(['git','rev-parse','HEAD'], candidate)
        require(env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_RUN_ATTEMPT') == '1'
                and env.get('GITHUB_REPOSITORY') == REPOSITORY
                and env.get('GITHUB_WORKFLOW_REF') == REPOSITORY+'/'+WORKFLOW+'@refs/heads/main'
                and env.get('TARGET_FIREBASE_PROJECT') == env.get('CONFIRMATION') == 'livepalmes-test'
                and env.get('RELEASE') == 'standard'
                and sha == value['candidate'] == env.get('GITHUB_SHA') == env.get('EXPECTED_COMMIT')
                == publisher.cycle.git('rev-parse','HEAD')
                and not publisher.cycle.run(['git','status','--porcelain'], candidate),
                'Sources TEST standard hors workflow/candidat exact')
        publisher.cycle.run(['git','merge-base','--is-ancestor',value['baselineCandidate'],sha], candidate)
        paths = publisher.cycle.git('diff','--name-only','--no-renames',value['baselineCandidate'],sha).splitlines()
        policy.source_paths(value['baselineCandidate'], sha, paths, publisher.cycle.git)
        publisher.cycle.classify(paths)
        return sha

    def baseline(unused, directory):
        info = publisher.cycle.artifact(value['baselineRun'], 'test-proof', Path(directory)/'baseline',
                                        '.github/workflows/livepalmes-test-common.yml')
        proof = publisher.cycle.read(Path(directory)/'baseline/test-proof.json')
        require(info['head_sha'] == proof.get('candidate') == value['baselineCandidate']
                and publisher.cycle.reusable_verification(proof, value['baselineCandidate']),
                'Baseline TEST standard non authentifiee')
        expected = proof['state']
        require(expected['hosting']['version'] == value['baselineHosting'], 'Hosting TEST de reference different')
        return expected

    publisher.guard = guard
    publisher.baseline = baseline
    publisher.select = lambda before, sha, unused: selection(before, sha, value['functions'],
                                                             publisher.cycle.test_backend_fingerprints)
    return publisher


def trusted_revisions(directory, current, api):
    """Authenticate a per-run manifest and its exact managed source receipts."""
    relevant = [f for f in current.get('functions', []) if f['name'].split('/')[-1] in policy.eligible()]
    trusted = set()
    if not relevant:
        return trusted
    runs = api.gh(f'repos/{REPOSITORY}/actions/workflows/livepalmes-test-mail-sources.yml/runs?branch=main&per_page=20')['workflow_runs']
    for info in runs:
        if (info.get('status') != 'completed' or info.get('conclusion') != 'success'
                or info.get('run_attempt', 1) != 1
                or not any(f.get('commit') == info.get('head_sha') and f['name'] not in trusted for f in relevant)):
            continue
        try:
            target = Path(directory)/('standard-sources-'+str(info['id']))
            source = api.artifact(info['id'], 'test-backend-proof', target, WORKFLOW)
            proof = api.read(target/'test-backend-proof.json')
            require(source.get('event') == 'workflow_dispatch' and source.get('head_branch') == 'main'
                    and source.get('path') == WORKFLOW and source.get('run_attempt') == 1
                    and source.get('conclusion') == 'success'
                    and all(source.get(k, {}).get('full_name') == REPOSITORY for k in ['repository','head_repository']),
                    'Provenance TEST standard invalide')
            manifest = validate(proof.get('standardManifest'))
            require(proof.get('schema') == 1 and proof.get('release') == 'standard'
                    and manifest['candidate'] == proof.get('candidate') == source.get('head_sha') == info.get('head_sha')
                    and proof.get('contractSha256') == policy.digest(manifest)
                    and proof.get('baselineRun') == manifest['baselineRun']
                    and proof.get('selected') == manifest['functions'], 'Recu standard hors manifeste')
            rows = proof.get('state', {}).get('functions', [])
            names = manifest['functions']
            require(len(rows) == len(names) and {r['name'] for r in rows} == {PREFIX+n for n in names}
                    and all(r.get('commit') == manifest['candidate'] and r.get('state') == 'ACTIVE'
                            and r.get('revision') and r.get('updateTime') for r in rows), 'Revisions TEST incompletes')
            require(all(proof.get(k) is True for k in ['configurationsUnchanged','otherFunctionsUnchanged',
                    'hostingUnchanged','controlsUnchanged']) and proof.get('taskContentsRead') is False,
                    'Garde TEST standard absente')
            managed = proof.get('managedSources', {})
            require(set(managed) == set(names) and all(m.get('allPathsAndFileBytesIdentical') is True
                    and m.get('generationReadAndReferencesRechecked') is True
                    and re.fullmatch('[0-9a-f]{64}', str(m.get('archiveSha256', '')))
                    and re.fullmatch('[0-9a-f]{64}', str(m.get('archiveIdentity', '')))
                    and m.get('storageSource', {}).get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
                    and m['storageSource'].get('object') == n+'/function-source.zip'
                    and re.fullmatch('[1-9][0-9]*', str(m['storageSource'].get('generation', '')))
                    for n, m in managed.items()), 'Archive standard non authentifiee')
            # Whole generated selection was checked by the successful source workflow.
            api.test_backend_fingerprints(manifest['candidate'])
            trusted.update(api.matching_functions({'state': {'functions': rows}}, current))
        except (ValueError, KeyError, TypeError, urllib.error.HTTPError) as error:
            print(f"Preuve standard {info['id']} non reutilisable : {error}")
    return trusted


def main(mode, release, directory, candidate):
    require(release == 'standard', 'Mode standard uniquement')
    raw = os.environ.get('STANDARD_SOURCE_REQUEST', '')
    require(len(raw.encode()) <= 65536, 'Manifeste TEST trop volumineux')
    value = validate(json.loads(raw))
    publisher = configured(value)
    if mode == 'deploy':
        # Keep the transport, adding a fresh identity/configuration gate to each PATCH.
        before = {f['name']: f for f in publisher.cycle.read(Path(directory)/'before.json')}
        original = publisher.state
        def request(url, method='GET', body=None):
            if method == 'PATCH':
                require(url.endswith('?updateMask=build_config.source,labels')
                        and body and set(body) == {'name','buildConfig','labels'}
                        and set(body['buildConfig']) == {'source'} and body['name'] in before,
                        'PATCH TEST standard hors source/label')
                actual = original.request(original.API+body['name'])
                expected = before[body['name']]
                require(original.identity(actual) == original.identity(expected)
                        and policy.configuration(actual) == policy.configuration(expected)
                        and actual.get('labels') == expected.get('labels')
                        and actual.get('buildConfig', {}).get('source') == expected.get('buildConfig', {}).get('source'),
                        'Derive fraiche avant source TEST')
            return original.request(url,method,body)
        from types import SimpleNamespace
        publisher.state = SimpleNamespace(API=original.API, request=request, wait_operation=original.wait_operation)
    publisher.main(mode, release, directory, candidate)
    if mode == 'verify':
        path = Path(directory)/'test-backend-proof.json'
        proof = json.loads(path.read_text())
        proof['standardManifest'] = value
        path.write_text(json.dumps(proof, indent=2))


if __name__ == '__main__':
    main(*sys.argv[1:])
