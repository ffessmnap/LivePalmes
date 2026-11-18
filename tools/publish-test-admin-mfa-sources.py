"""Closed admin.full MFA TEST sources using the existing grouped source transport."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'admin_mfa_enforcement'
WORKFLOW = '.github/workflows/livepalmes-test-mail-sources.yml'
REPOSITORY = 'ffessmnap/LivePalmes'
PROJECT = 'livepalmes-test'
PREFIX = f'projects/{PROJECT}/locations/europe-west1/functions/'
APPLICATION = '02454e82658278b4e3450ad229e65147b4372711'
CONTRACT = ROOT/'.github/releases/evidence/20261118-test-admin-mfa-contract.json'
# Sealed to the completed evidence owned by the application coordinator before CI.
CONTRACT_SHA256 = '2d711cddc59733114683a1da2d16742ce4dbf6e83ef742d2d34808e6ba71692a'


def load(name):
    spec = importlib.util.spec_from_file_location('admin_mfa_test_'+name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


publisher = load('publish-test-mail-sources.py')
cycle, require = publisher.cycle, publisher.require


def contract(release=RELEASE):
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat MFA TEST absent ou non scelle')
    value = json.loads(raw)
    require(release == RELEASE and value.get('schema') == 1 and value.get('project') == PROJECT
            and value.get('release') == RELEASE and value.get('phase') == 'enforce-admin-full-mfa'
            and value.get('applicationCommit') == APPLICATION, 'Cible/candidat MFA TEST different')
    names, installed = value['allowedFunctions'], value['installedFunctions']
    require(names and names == sorted(set(names)) and installed == sorted(set(installed))
            and set(names) <= set(installed) and len(installed) == value['baselineFunctionCount'] == 121
            and set(value['fingerprints']) == set(names)
            and all(re.fullmatch('[a-f0-9]{64}', h) for h in value['fingerprints'].values())
            and value['notInstalledChanges'] == sorted(set(value['notInstalledChanges']))
            and not set(value['notInstalledChanges']) & set(installed), 'Selection/inventaire MFA TEST invalide')
    require(re.fullmatch('[a-f0-9]{40}', value['baseCommit'])
            and len(value['baselineRuns']) == 1 and value['baselineRuns'][0]['artifact'] == 'test-proof'
            and value['baselineRuns'][0]['workflow'] == '.github/workflows/livepalmes-test-common.yml'
            and value['rulesProject'] == PROJECT, 'Reference commune MFA TEST absente')
    projection = load('admin-mfa-rules-policy.py')
    require(value['rulesBeforeSha256'] == projection.BEFORE[PROJECT]
            and value['rulesAfterSha256'] == projection.AFTER[PROJECT]
            and hashlib.sha256((ROOT/'tools/admin-mfa-rules-policy.py').read_bytes().replace(b'\r\n', b'\n')).hexdigest()
                == value['rulesPolicySha256'], 'Projection Rules MFA modifiee')
    require(value['toolingPaths'] == sorted(set(value['toolingPaths']))
            and all(p.startswith(('tools/', 'tests/', 'docs/', '.github/')) for p in value['toolingPaths']),
            'Chemin applicatif hors ancre MFA interdit')
    q = value['selectionQualification']
    require(set(q) == {'verifierFile','verifierSha256','evidenceFile','evidenceSha256'}
            and q['verifierFile'] == 'tools/admin-mfa-selection-proof.js'
            and q['evidenceFile'] == '.github/releases/evidence/20261118-admin-mfa-test-equivalence.json'
            and all(re.fullmatch('[a-f0-9]{64}', q[k]) for k in ['verifierSha256','evidenceSha256']),
            'Qualification de selection MFA TEST non bornee')
    cycle.standard_sources.approval(value['approval'])
    return {**value, '_contractSha256': CONTRACT_SHA256}


def configure():
    entry = contract()
    publisher.ALLOWED = frozenset(entry['allowedFunctions'])
    publisher.contract, publisher.guard = contract, guard
    publisher.baseline, publisher.select = baseline, select
    return entry


_original_guard, _original_baseline = publisher.guard, publisher.baseline


def guard(candidate, entry, env=os.environ):
    require(env.get('GITHUB_REPOSITORY') == REPOSITORY and env.get('RELEASE') == RELEASE
            and env.get('GITHUB_WORKFLOW_REF') == REPOSITORY+'/'+WORKFLOW+'@refs/heads/main'
            and env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch' and not env.get('STANDARD_SOURCE_REQUEST'),
            'Workflow MFA TEST hors contrat')
    sha = _original_guard(candidate, entry, env)
    desired, base = cycle.test_backend_fingerprints(sha), cycle.test_backend_fingerprints(entry['baseCommit'])
    require(set(desired) == set(base), 'Export serveur MFA ajoute ou retire')
    absent = sorted(n for n in desired if n not in entry['installedFunctions'] and desired[n] != base[n])
    require(absent == entry['notInstalledChanges'], 'Delta serveur non installe MFA different')
    require(load('admin-mfa-rules-policy.py').digest((Path(candidate)/'firestore.rules').read_text(encoding='utf-8'))
            == entry['rulesAfterSha256'], 'Source Rules MFA TEST differente')
    return sha


def baseline(entry, directory):
    expected = _original_baseline(entry, directory)
    row = entry['baselineRuns'][0]
    metadata = cycle.gh(f"repos/{REPOSITORY}/actions/artifacts/{row['artifactId']}")
    require(metadata.get('id') == row['artifactId'] and metadata.get('name') == 'test-proof'
            and metadata.get('expired') is False and metadata.get('digest') == 'sha256:'+row['artifactSha256']
            and metadata.get('workflow_run', {}).get('id') == row['id'], 'Baseline MFA TEST non authentifiee')
    require(sorted(f['name'].split('/')[-1] for f in expected['functions']) == entry['installedFunctions']
            and expected['hosting']['version'] == entry['baselineHostingVersion'], 'Etat MFA TEST de reference different')
    return expected


def qualify_selection(entry, origins, candidate, project, optimized, legacy):
    """Recalculate every origin; qualify only the independently pinned discrepancies."""
    require(project in {'livepalmes-test','livepalmes'}, 'Projet de qualification MFA inconnu')
    anchor = entry.get('applicationCommit', entry.get('applicationAnchor'))
    desired, conservative = optimized(candidate), legacy(candidate)
    require(desired == optimized(anchor) and conservative == legacy(anchor), 'Empreintes MFA differentes de l ancre')
    require(len(origins) <= 500 and len(origins) == len({f['name'] for f in origins}), 'Origines MFA dupliquees ou hors budget')
    rows, discrepancies = [], []
    prefix = f'projects/{project}/locations/europe-west1/functions/'
    for function in sorted(origins, key=lambda f:f['name']):
        name = function['name'].split('/')[-1]
        previous = function.get('commit', function.get('labels', {}).get('livepalmes-commit', ''))
        require(function['name'] == prefix+name and function.get('state') == 'ACTIVE'
                and function.get('revision', function.get('serviceConfig', {}).get('revision'))
                and function.get('updateTime') and re.fullmatch('[a-f0-9]{40}', previous), 'Origine MFA incomplete')
        old, old_legacy = optimized(previous), legacy(previous)
        require(name in old and name in old_legacy and name in desired and name in conservative,
                'Empreinte de consommateur MFA inconnue')
        a,b,x,y = old[name],desired[name],old_legacy[name],conservative[name]
        changed, legacy_changed = a != b, x != y
        row = {**function,'commit':previous,'shortName':name,'before':a,'after':b,
               'legacyBefore':x,'legacyAfter':y,'changed':changed,'legacyChanged':legacy_changed,
               'method':'both-comparators-changed' if changed else 'both-comparators-unchanged'}
        if changed != legacy_changed:
            require(not changed and legacy_changed, 'Divergence MFA non qualifiable : '+name)
            discrepancies.append({'name':name,'commit':previous,
                'revision':function.get('revision',function.get('serviceConfig',{}).get('revision')),
                'legacyBefore':x,'legacyAfter':y,'optimizedBefore':a,'optimizedAfter':b})
            row['method'] = 'independent-pinned-numeric-equivalence'
        rows.append(row)
    q = entry['selectionQualification']
    verifier, evidence = ROOT/q['verifierFile'], ROOT/q['evidenceFile']
    require(hashlib.sha256(verifier.read_bytes().replace(b'\r\n',b'\n')).hexdigest() == q['verifierSha256']
            and hashlib.sha256(evidence.read_bytes().replace(b'\r\n',b'\n')).hexdigest() == q['evidenceSha256'],
            'Verificateur/preuve de selection MFA modifies')
    proof = json.loads(evidence.read_text(encoding='utf-8'))
    fields = ['name','commit','revision','legacyBefore','legacyAfter','optimizedBefore','optimizedAfter']
    require(proof['candidate'] == anchor and proof['project'] == project
            and sorted([{k:r[k] for k in fields} for r in proof['rows']], key=lambda r:r['name']) == discrepancies,
            'Ecarts MFA frais differents de la preuve : aucune omission permise')
    result = json.loads(publisher.subprocess.check_output(['node',str(verifier)],cwd=ROOT,
        input=json.dumps({'schema':1,'candidate':anchor,'project':project,'rows':discrepancies}),text=True,timeout=180))
    require(result == proof, 'Qualification MFA independante non reproduite')
    return rows


def select(before, candidate, entry):
    require(sorted(f['name'].split('/')[-1] for f in before) == entry['installedFunctions'], 'Inventaire MFA TEST different')
    rows = qualify_selection(entry, before, candidate, PROJECT, cycle.test_backend_fingerprints, cycle.backend_fingerprints)
    selected = sorted(r['shortName'] for r in rows if r['changed'])
    require(selected == entry['allowedFunctions']
            and all(r['after'] == entry['fingerprints'][r['shortName']] for r in rows if r['changed']),
            'Selection MFA TEST complete differente du contrat')
    for function in before:
        name = function['name'].split('/')[-1]
        if name in selected: publisher.runtime(function, name)
    return selected


def trusted_revisions(directory, current, api):
    entry = contract()
    # Independent reader instance: historical Direct contracts/constants stay intact.
    evidence = load('publish-test-direct-sources.py')
    evidence.RELEASE, evidence.CONTRACT_SHA256 = RELEASE, CONTRACT_SHA256
    evidence.ALLOWED, evidence.contract = frozenset(entry['allowedFunctions']), contract
    return evidence.trusted_revisions(directory, current, api)


def main(mode, release, directory, candidate):
    require(mode in {'prepare', 'deploy', 'verify', 'diagnostic'} and release == RELEASE, 'Mode MFA TEST interdit')
    entry = configure()
    publisher.main(mode, release, directory, candidate)
    if mode == 'verify':
        path = Path(directory)/'test-backend-proof.json'
        proof = cycle.read(path)
        require(proof['selected'] == entry['allowedFunctions'] and proof['controlsBefore'] == proof['controlsAfter'],
                'Preuve MFA TEST incomplete ou temoins modifies')
        proof.update(baselineRun=entry['baselineRuns'][0]['id'], controlsUnchanged=True)
        cycle.write(path, proof)


if __name__ == '__main__': main(*sys.argv[1:])
