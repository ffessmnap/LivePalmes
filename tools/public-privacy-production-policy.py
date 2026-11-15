"""One immutable A1 public-privacy release; shared source-only transport."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261115-production-public-privacy-contract.json'
DIGEST = 'fb22632e37b296ba66c3b81b960c02ca04318ef78053f822ad63925149fadec2'
OPTION = 'publicPrivacyRelease'
KIND = 'public-privacy-existing-sources-v1'
SELECTED = ['readNapPublicSwimmer']
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('a1_privacy_common', ROOT/'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec); spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat A1 public modifie')
    value = json.loads(raw)
    require(value['selected'] == SELECTED and value['inventoryCount'] == 119
            and value['newFunctions'] == value['deletedFunctions'] == []
            and value['configurationChanges'] is False and value['bindingChanges'] is False
            and value['productionApprovalRequired'] is True,
            'Contrat reserve a la source publique existante')
    return value


def enabled(value):
    return OPTION in value


def approved(value):
    if not enabled(value):
        return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}},
            'A1 public hors version, preuve ou options fermees')
    return c['selected']


def paths(value, changed, git):
    if not enabled(value):
        return
    approved(value); c = contract()
    require(sorted(changed) == c['changedFiles'], 'Diff complet hors contrat A1')
    for path, pair in c['protectedBlobs'].items():
        actual = [git('rev-parse', ref+':'+path) for ref in [value['productionCommit'], value['candidate']]]
        require(actual == pair and (path == 'functions/index.js' or actual[0] == actual[1]),
                'Declaration ou configuration hors contrat : '+path)
    retired = set(c['retiredFiles'])
    require(retired == {'performances/public/data/admin-reference.js'}, 'Autre retrait hors contrat A1')
    for path, blob in c['retiredFiles'].items():
        require(path in changed and git('rev-parse', value['productionCommit']+':'+path) == blob
                and not git('ls-tree', '--name-only', value['candidate'], '--', path),
                'Referentiel A1 different ou encore present')
    require(not any(p.startswith(('performances/public/data/', 'functions/private/', 'migrations/'))
                    or p.endswith(('.sql', '.env')) for p in changed if p not in retired), 'Donnee ou migration interdite')


def retired_paths(value, changed, git):
    if not enabled(value):
        return set()
    paths(value, changed, git)
    return set(contract()['retiredFiles'])


def expected_manifest():
    c = contract(); request = {**c['request'], OPTION: {'contractSha256': DIGEST}}
    return {'schema': 1, 'kind': KIND, 'requestSha256': digest(request),
            **{k: c[k] for k in ['candidate','productionRun','productionCommit','productionHosting','testRun',
                                'selected','origins','inventoryCount','staticPaths','controls','approval',
                                'configurationChanges','bindingChanges','newFunctions','deletedFunctions']},
            'businessInvocations': 0, 'mailPause': False, 'contractSha256': DIGEST}


def validate_manifest(value):
    require(value == expected_manifest(), 'Manifeste A1 public altere ou hors candidat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory/'request.json').read_text())
    approved(request)
    return validate_manifest(json.loads((directory/'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    approved(value); c = contract(); paths(value, changed, git)
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                         'source': 'verified-publication-artifacts'}, 'Reference PROD non authentifiee')
    identities = [{k: r[k] for k in ['name','updateTime','state','revision','commit']} for r in c['origins']]
    require(sorted(functions.values(), key=lambda f:f['name']) == identities, 'Origines PROD differentes')
    desired, old_desired = fingerprint(c['candidate']), legacy(c['candidate'])
    calculated = []
    for row in c['origins']:
        name = row['name'].split('/')[-1]
        before, old = fingerprint(row['commit'])[name], legacy(row['commit'])[name]
        require(before == row['before'] and old == row['legacyBefore']
                and desired[name] == row['after'] and old_desired[name] == row['legacyAfter']
                and (before != desired[name]) == (old != old_desired[name]),
                'Comparateurs ou empreintes incompatibles : '+name)
        if before != desired[name]:
            calculated.append(name)
    require(sorted(selected) == sorted(set(selected)) == sorted(calculated) == SELECTED,
            'Selection complete differente des source publique autorisee')
    return expected_manifest()


def runtime(function):
    name = function.get('name', '').split('/')[-1]
    require(name in SELECTED and function.get('name') == PREFIX+name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name,
            'Runtime existant hors contrat A1')


def initial(functions, value):
    validate_manifest(value)
    common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == contract()['candidate'], 'Candidat A1 different')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def guard(directory, after=False):
    directory = Path(directory); value = manifest(directory)
    observed = common.controls()
    require(observed == value['controls'], 'Derive mails, automates ou modeles')
    witness = directory/'standard-controls-before.json'
    require(not (directory/'previous/production-after.json').exists() or witness.exists(), 'Temoin initial absent')
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Temoin initial different')
    else:
        require(not after, 'Temoin initial absent'); witness.write_text(json.dumps(observed))
    if after:
        (directory/'standard-controls-after.json').write_text(json.dumps(observed))


def restore_witness(directory, source):
    # No automatic replay authority for this new, fixed candidate.
    raise ValueError('Reprise du contrat A1 exige un nouvel examen avant toute ecriture')
