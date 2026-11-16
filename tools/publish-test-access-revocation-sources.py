"""Closed A3.3 TEST sources; reuse the existing grouped source-only transport."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from types import SimpleNamespace
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'access_revocation'
WORKFLOW = '.github/workflows/livepalmes-test-mail-sources.yml'
REPOSITORY = 'ffessmnap/LivePalmes'
PROJECT = 'livepalmes-test'
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'
CONTRACT = ROOT/'.github/releases/evidence/20261116-test-access-revocation-contract.json'
CONTRACT_SHA256 = '93a29a30bfddd1243980bafc6e4035053fdd0275fa7b86e65a28605b47556909'
spec = importlib.util.spec_from_file_location('revocation_source_transport', ROOT/'tools/publish-test-mail-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
cycle, require = publisher.cycle, publisher.require


def contract(release=RELEASE):
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat A3.3 modifie')
    value = json.loads(raw)
    require(release == RELEASE and value.get('schema') == 1 and value.get('project') == PROJECT
            and value.get('release') == RELEASE, 'Cible ou lot A3.3 interdit')
    names, installed = value['allowedFunctions'], value['installedFunctions']
    require(names == sorted(set(names)) and installed == sorted(set(installed))
            and set(names) < set(installed) and len(installed) == value['baselineFunctionCount']
            and set(value['fingerprints']) == set(names)
            and all(re.fullmatch('[a-f0-9]{64}', h) for h in value['fingerprints'].values()), 'Inventaire A3.3 invalide')
    cycle.standard_sources.approval(value['approval'])
    return {**value, '_contractSha256': CONTRACT_SHA256}


ALLOWED = frozenset(contract()['allowedFunctions'])
publisher.ALLOWED = ALLOWED
_guard, _baseline = publisher.guard, publisher.baseline


def guard(candidate, entry, env=os.environ):
    require(env.get('GITHUB_REPOSITORY') == REPOSITORY and env.get('RELEASE') == RELEASE
            and env.get('GITHUB_WORKFLOW_REF') == REPOSITORY+'/'+WORKFLOW+'@refs/heads/main'
            and not env.get('STANDARD_SOURCE_REQUEST'), 'Workflow A3.3 hors contrat')
    sha = _guard(candidate, entry, env)
    base = cycle.test_backend_fingerprints(entry['baseCommit'])
    desired = cycle.test_backend_fingerprints(sha)
    require(set(base) == set(desired), 'Exports A3.3 ajoutes ou retires')
    changed = {n for n in desired if desired[n] != base[n]}
    require(changed.intersection(entry['installedFunctions']) == ALLOWED
            and changed.difference(entry['installedFunctions']) == set(entry['notInstalledChanges']),
            'Consommateurs A3.3 non calcules ou elargis')
    return sha


def baseline(entry, directory):
    expected = _baseline(entry, directory)
    row = entry['baselineRuns'][0]
    metadata = cycle.gh(f"repos/{REPOSITORY}/actions/artifacts/{row['artifactId']}")
    require(metadata.get('id') == row['artifactId'] and metadata.get('name') == 'test-proof'
            and metadata.get('expired') is False and metadata.get('digest') == 'sha256:'+row['artifactSha256']
            and metadata.get('workflow_run', {}).get('id') == row['id'], 'Artefact TEST A3.3 non authentifie')
    require(sorted(f['name'].split('/')[-1] for f in expected['functions']) == entry['installedFunctions']
            and expected['hosting']['version'] == entry['baselineHostingVersion'], 'Reference TEST A3.3 differente')
    return expected


def select(before, candidate, entry):
    names = [f['name'].split('/')[-1] for f in before]
    require(sorted(names) == entry['installedFunctions'] and len(names) == len(set(names)), 'Inventaire TEST A3.3 different')
    desired, selected = cycle.test_backend_fingerprints(candidate), []
    for function in before:
        name = function['name'].split('/')[-1]
        previous = function.get('labels', {}).get('livepalmes-commit', '')
        require(function['name'] == PREFIX+name and function.get('state') == 'ACTIVE'
                and re.fullmatch('[a-f0-9]{40}', previous), 'Origine TEST A3.3 inconnue')
        old = cycle.test_backend_fingerprints(previous)
        require(name in old and name in desired, 'Empreinte TEST A3.3 inconnue')
        if old[name] != desired[name]:
            require(name in ALLOWED, 'Consommateur TEST A3.3 non couvert : '+name)
            publisher.runtime(function, name)
            selected.append(name)
    require(all(desired.get(n) == h for n, h in entry['fingerprints'].items()), 'Source A3.3 differente du contrat')
    return sorted(selected)


publisher.contract, publisher.guard = contract, guard
publisher.baseline, publisher.select = baseline, select


def main(mode, release, directory, candidate):
    require(mode in {'prepare', 'deploy', 'verify', 'diagnostic'} and release == RELEASE, 'Mode A3.3 interdit')
    publisher.main(mode, release, directory, candidate)
    if mode == 'verify':
        root = Path(directory)
        proof = cycle.read(root/'test-backend-proof.json')
        require(proof['controlsBefore'] == proof['controlsAfter'], 'Temoins A3.3 modifies')
        proof.update(baselineRun=contract()['baselineRuns'][0]['id'], controlsUnchanged=True)
        cycle.write(root/'test-backend-proof.json', proof)


def trusted_revisions(directory, current, api):
    entry, trusted = contract(), set()
    relevant = [f for f in current.get('functions', []) if f.get('name') in {PREFIX+n for n in ALLOWED}]
    if not relevant:
        return trusted
    runs = api.gh(f'repos/{REPOSITORY}/actions/workflows/livepalmes-test-mail-sources.yml/runs?branch=main&per_page=20')['workflow_runs']
    for info in runs:
        if info.get('status') != 'completed' or info.get('conclusion') != 'success' or info.get('run_attempt', 1) != 1:
            continue
        if not any(f.get('commit') == info.get('head_sha') and f['name'] not in trusted for f in relevant):
            continue
        try:
            destination = Path(directory)/('access-revocation-'+str(info['id']))
            source = api.artifact(info['id'], 'test-backend-proof', destination, WORKFLOW)
            proof = api.read(destination/'test-backend-proof.json')
            require(source.get('head_sha') == proof.get('candidate') == info['head_sha']
                    and source.get('path') == WORKFLOW and proof.get('schema') == 1
                    and proof.get('release') == RELEASE and proof.get('contractSha256') == CONTRACT_SHA256
                    and proof.get('applicationAnchor') == entry['applicationCommit']
                    and proof.get('baselineRun') == entry['baselineRuns'][0]['id'], 'Preuve A3.3 hors contrat')
            names, rows = proof.get('selected', []), proof.get('state', {}).get('functions', [])
            require(isinstance(names, list) and names == sorted(set(names)) and names and set(names) <= ALLOWED
                    and len(rows) == len(names) and {f.get('name') for f in rows} == {PREFIX+n for n in names}
                    and all(f.get('commit') == proof['candidate'] for f in rows), 'Selection preuve A3.3 invalide')
            desired = api.test_backend_fingerprints(proof['candidate'])
            require(all(desired.get(n) == h for n, h in entry['fingerprints'].items()), 'Empreintes preuve A3.3 differentes')
            controls = proof.get('controlsBefore')
            require(all(proof.get(k) is True for k in ['configurationsUnchanged', 'otherFunctionsUnchanged',
                    'hostingUnchanged', 'controlsUnchanged', 'mailSettingUnchanged', 'schedulerUnchanged',
                    'queueUnchanged', 'pendingMessagesPreserved']) and proof.get('taskContentsRead') is False
                    and isinstance(controls, dict) and controls == proof.get('controlsAfter')
                    and controls.get('mailEnabled') is False and controls.get('schedulerSuspended') is True
                    and controls.get('queuePaused') is True, 'Garde preuve A3.3 absente')
            managed = proof.get('managedSources', {})
            require(set(managed) == set(names) and all(v.get('allPathsAndFileBytesIdentical') is True
                    and v.get('generationReadAndReferencesRechecked') is True
                    and re.fullmatch('[a-f0-9]{64}', v.get('archiveSha256', ''))
                    and re.fullmatch('[a-f0-9]{64}', v.get('archiveIdentity', ''))
                    and v.get('storageSource', {}).get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
                    and v['storageSource'].get('object') == n+'/function-source.zip'
                    and re.fullmatch('[1-9][0-9]*', str(v['storageSource'].get('generation', '')))
                    for n, v in managed.items()), 'Archives preuve A3.3 non attestees')
            trusted.update(api.matching_functions({'state': {'functions': rows}}, current))
        except (ValueError, KeyError, TypeError, publisher.subprocess.CalledProcessError, urllib.error.HTTPError) as error:
            print(f"Preuve A3.3 {info['id']} non reutilisable : {error}")
    return trusted


if __name__ == '__main__':
    main(*sys.argv[1:])
