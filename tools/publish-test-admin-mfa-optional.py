"""Closed TEST-only return to optional MFA, preserving factors and sessions."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'admin_mfa_optional'
CONTRACT = ROOT/'.github/releases/evidence/20261118-test-admin-mfa-optional-contract.json'
CONTRACT_SHA256 = '25846c08fc8f7ec88e17f4d9c9a3a24b78829d1ad04fd3d209b8f893dc7feb24'

def load(name):
    spec = importlib.util.spec_from_file_location('optional_mfa_'+name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

previous = load('publish-test-admin-mfa-sources.py')
publisher, require, cycle = previous.publisher, previous.require, previous.cycle
PROJECT, PREFIX, WORKFLOW, REPOSITORY = previous.PROJECT, previous.PREFIX, previous.WORKFLOW, previous.REPOSITORY

def contract(release=RELEASE):
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat facultatif TEST non scelle')
    value = json.loads(raw)
    require(release == RELEASE and value.get('schema') == 1 and value.get('project') == PROJECT
            and value.get('release') == RELEASE and value.get('phase') == 'postpone-mandatory-admin-mfa'
            and re.fullmatch('[a-f0-9]{40}', value.get('applicationCommit', '')),
            'Retour facultatif hors projet/version')
    old = previous.contract()
    require(value['allowedFunctions'] == old['allowedFunctions']
            and value['installedFunctions'] == old['installedFunctions']
            and value['notInstalledChanges'] == old['notInstalledChanges']
            and value['baselineFunctionCount'] == 121
            and value['baselineHostingVersion'] == old['baselineHostingVersion']
            and value['rulesSha256'] == old['rulesBeforeSha256'], 'Perimetre facultatif TEST elargi')
    row = value['baselineRuns']
    require(len(row) == 1 and row[0]['id'] == 44331211017 and row[0]['artifactId'] == 14442319189
            and row[0]['artifactSha256'] == '2bd9be4dafb02ee7d0a39e3245cb256946ce60e57eeb7c6f2965766b8900d0e6'
            and row[0]['fileSha256'] == '6bddf24a18be5c8f893b3934aa1f5538d41156e1877792ca04bae5489f77a651'
            and row[0]['artifact'] == 'test-backend-proof'
            and value['baseCommit'] == 'de49a1bae71156c5e0d1fd91a0991dd786290137', 'Origine retour facultatif non fermee')
    require(set(value['fingerprints']) == set(value['allowedFunctions'])
            and all(re.fullmatch('[a-f0-9]{64}', h) for h in value['fingerprints'].values())
            and value['toolingPaths'] == sorted(set(value['toolingPaths']))
            and all(p.startswith(('tools/', 'tests/', 'docs/', '.github/')) for p in value['toolingPaths']),
            'Empreintes/chemins facultatifs invalides')
    q = value['selectionQualification']
    require(q['verifierFile'] == old['selectionQualification']['verifierFile']
            and q['verifierSha256'] == old['selectionQualification']['verifierSha256']
            and q['evidenceFile'] == '.github/releases/evidence/20261118-admin-mfa-optional-test-equivalence.json'
            and re.fullmatch('[a-f0-9]{64}', q['evidenceSha256']), 'Qualification facultative non bornee')
    cycle.standard_sources.approval(value['approval'])
    require(value['approval']['messageId'] == '01a1ef78-9541-7ad1-b818-6d441cafdb4a', 'Accord de report different')
    return {**value, '_contractSha256': CONTRACT_SHA256}

def guard(candidate, entry, env=os.environ):
    require(env.get('GITHUB_REPOSITORY') == REPOSITORY and env.get('RELEASE') == RELEASE
            and env.get('GITHUB_WORKFLOW_REF') == REPOSITORY+'/'+WORKFLOW+'@refs/heads/main'
            and env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch' and not env.get('STANDARD_SOURCE_REQUEST'),
            'Retour facultatif hors workflow manuel ferme')
    sha = previous._original_guard(candidate, entry, env)
    desired, old = cycle.test_backend_fingerprints(sha), cycle.test_backend_fingerprints(entry['baseCommit'])
    require(set(desired) == set(old)
            and sorted(n for n in desired if desired[n] != old[n] and n not in entry['installedFunctions'])
                == entry['notInstalledChanges'], 'Declarations absentes hors retour facultatif')
    require(load('admin-mfa-rules-policy.py').digest((Path(candidate)/'firestore.rules').read_text(encoding='utf-8'))
            == entry['rulesSha256'], 'Rules facultatives TEST differentes')
    return sha

def current_rules(entry):
    publisher.credential_identity()
    token = cycle.run(['gcloud','auth','application-default','print-access-token'])
    require(load('test-portal-session-rules.py').rules(token)['sha256'] == entry['rulesSha256'],
            'Derive des Rules facultatives TEST')

def authenticated_baseline(entry, directory):
    current_rules(entry)  # Two bounded read-only Rules calls under the existing identity.

    row = entry['baselineRuns'][0]
    metadata = cycle.gh(f"repos/{REPOSITORY}/actions/artifacts/{row['artifactId']}")
    require(metadata.get('id') == row['artifactId'] and metadata.get('name') == row['artifact']
            and metadata.get('expired') is False and metadata.get('digest') == 'sha256:'+row['artifactSha256']
            and metadata.get('workflow_run', {}).get('id') == row['id'], 'Artefact source avant retour non authentifie')
    target = Path(directory)/'optional-baseline'
    source = cycle.artifact(row['id'], row['artifact'], target, WORKFLOW)
    raw = (target/'test-backend-proof.json').read_bytes()
    require(hashlib.sha256(raw).hexdigest() == row['fileSha256'], 'Recu source avant retour altere')
    proof = json.loads(raw)
    require(source.get('id') == row['id'] and source.get('head_sha') == proof.get('candidate') == entry['baseCommit']
            and source.get('event') == 'workflow_dispatch' and source.get('head_branch') == 'main'
            and source.get('path') == WORKFLOW and source.get('run_attempt') == 1
            and source.get('status') == 'completed' and source.get('conclusion') == 'success'
            and all(source.get(k, {}).get('full_name') == REPOSITORY for k in ['repository','head_repository'])
            and proof.get('release') == previous.RELEASE and proof.get('contractSha256') == previous.CONTRACT_SHA256
            and proof.get('selected') == entry['allowedFunctions']
            and proof.get('controlsBefore') == proof.get('controlsAfter')
            and all(proof.get(k) is True for k in ['configurationsUnchanged','otherFunctionsUnchanged','hostingUnchanged','controlsUnchanged'])
            and proof.get('taskContentsRead') is False, 'Preuve source avant retour incompatible')
    expected = proof['currentTestState']
    require(sorted(f['name'].split('/')[-1] for f in expected['functions']) == entry['installedFunctions']
            and len(expected['functions']) == 121 and all(f['state'] == 'ACTIVE' for f in expected['functions'])
            and expected['hosting']['version'] == entry['baselineHostingVersion'], 'Inventaire avant retour incomplet')
    proven = previous.trusted_revisions(Path(directory)/'optional-origins', expected, cycle)
    require({PREFIX+n for n in entry['allowedFunctions']} <= proven, 'Une source avant retour non authentifiee')
    return expected

def select(before, candidate, entry):
    require(sorted(f['name'].split('/')[-1] for f in before) == entry['installedFunctions'], 'Inventaire facultatif TEST different')
    rows = previous.qualify_selection(entry, before, candidate, PROJECT, cycle.test_backend_fingerprints, cycle.backend_fingerprints)
    selected = sorted(r['shortName'] for r in rows if r['changed'])
    require(selected == entry['allowedFunctions']
            and all(r['after'] == entry['fingerprints'][r['shortName']] for r in rows if r['changed']),
            'Selection complete du retour facultatif differente')
    for f in before:
        if f['name'].split('/')[-1] in selected: publisher.runtime(f, f['name'].split('/')[-1])
    return selected

def trusted_revisions(directory, current, api):
    entry = contract()
    reader = load('publish-test-direct-sources.py')
    reader.RELEASE, reader.CONTRACT_SHA256 = RELEASE, CONTRACT_SHA256
    reader.ALLOWED, reader.contract = frozenset(entry['allowedFunctions']), contract
    return reader.trusted_revisions(directory, current, api)

def main(mode, release, directory, candidate):
    require(mode in {'prepare','deploy','verify','diagnostic'} and release == RELEASE, 'Mode facultatif TEST interdit')
    entry = contract()
    publisher.ALLOWED = frozenset(entry['allowedFunctions'])
    publisher.contract, publisher.guard = contract, guard
    publisher.baseline, publisher.select = authenticated_baseline, select
    if mode == 'deploy':
        guard(candidate, entry)
        current_rules(entry)  # Fresh check before the existing source/drift guards and writes.
    publisher.main(mode, release, directory, candidate)
    if mode == 'verify':
        path = Path(directory)/'test-backend-proof.json';proof = cycle.read(path)
        require(proof['selected'] == entry['allowedFunctions'] and proof['controlsBefore'] == proof['controlsAfter'],
                'Recu du retour facultatif incomplet')
        proof.update(baselineRun=entry['baselineRuns'][0]['id'],controlsUnchanged=True,mandatoryAdminMfa=False)
        cycle.write(path, proof)

if __name__ == '__main__': main(*sys.argv[1:])
