"""Publish the approved organizer fee report using the existing source-only transport."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'organizerFeesRelease'
KIND = 'organizer-fees-existing-sources-v1'
CONTRACT = ROOT / '.github/releases/evidence/20261119-production-organizer-fees-contract.json'
DIGEST = '7ae7f7fbf0360217285676e79da71b36f6b2e1e6d0823601c050f9404f959ef9'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
spec = importlib.util.spec_from_file_location('fees_common', ROOT / 'tools/standard-source-policy.py')
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
require, digest = common.require, common.digest
configuration, assert_retained = common.configuration, common.assert_retained


def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat des frais organisateur modifie')
    return json.loads(raw)


def enabled(value):
    return OPTION in value


def approved(value):
    if not enabled(value):
        return []
    c = contract()
    require(value == {**c['request'], OPTION: {'contractSha256': DIGEST}},
            'Demande hors du contrat des frais organisateur')
    return c['selected']


def paths(value, changed, git):
    approved(value)
    c = contract()
    require(digest(sorted(changed)) == c['changedPathsSha256'], 'Diff complet hors contrat')
    for name, pair in c['protectedBlobs'].items():
        require([git('rev-parse', ref + ':' + name) for ref in (c['productionCommit'], c['candidate'])] == pair,
                'Declaration ou configuration differente : ' + name)


def expected_manifest(origins):
    c = contract()
    require(len(origins) == c['inventoryCount'] and digest(origins) == c['originsSha256'],
            'Origines PROD differentes de la decouverte')
    fields = ('candidate', 'productionRun', 'productionCommit', 'productionHosting', 'testRun', 'selected',
              'controls', 'inventoryCount', 'approval', 'staticPaths', 'configurationChanges', 'bindingChanges',
              'newFunctions', 'deletedFunctions', 'selectionProofSha256')
    return {**{key: c[key] for key in fields}, 'schema': 1, 'kind': KIND, 'contractSha256': DIGEST,
            'requestSha256': digest({**c['request'], OPTION: {'contractSha256': DIGEST}}),
            'origins': origins, 'mailPause': False, 'businessInvocations': 0}


def validate_manifest(value):
    require(value == expected_manifest(value['origins']), 'Manifeste des frais hors contrat')
    return value


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory / 'request.json').read_text())
    require(enabled(request), 'Option organisateur absente du plan')
    approved(request)
    return validate_manifest(json.loads((directory / 'standard-source-manifest.json').read_text()))


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed):
    paths(value, changed, git)
    c = contract()
    require(baseline == {'productionRun': c['productionRun'], 'productionCommit': c['productionCommit'],
                         'source': 'verified-publication-artifacts'}, 'Reference PROD non authentifiee')
    origins = sorted(functions.values(), key=lambda row: row['name'])
    result = expected_manifest(origins)
    candidate = c['candidate']
    desired, legacy_desired = fingerprint(candidate), legacy(candidate)
    calculated, inherited = [], []
    for row in origins:
        name = row['name'].removeprefix(PREFIX)
        before, raw_before = fingerprint(row['commit'])[name], legacy(row['commit'])[name]
        if before != desired[name]:
            require(raw_before != legacy_desired[name], 'Desaccord sur une source a publier : ' + name)
            calculated.append(name)
        elif raw_before != legacy_desired[name]:
            require(legacy(c['productionCommit'])[name] == legacy_desired[name], 'Nouvel ecart historique : ' + name)
            inherited.append(dict(name=name, commit=row['commit'], revision=row['revision'],
                                  legacyBefore=raw_before, legacyAfter=legacy_desired[name],
                                  optimizedBefore=before, optimizedAfter=desired[name]))
    require(sorted(selected) == calculated == c['selected'], 'Selection complete differente du contrat')
    inputs = dict(schema=1, project='livepalmes', candidate=candidate, rows=inherited)
    verifier = ROOT / 'tools/admin-mfa-selection-proof.js'
    proof = json.loads(subprocess.check_output(['node', str(verifier)], input=json.dumps(inputs).encode()))
    require(digest(proof) == c['selectionProofSha256'], 'Equivalence des sources conservees non reproduite')
    return result


def runtime(function):
    name = function.get('name', '').removeprefix(PREFIX)
    build = function.get('buildConfig', {})
    require(name in contract()['selected'] and function.get('name') == PREFIX + name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and build.get('runtime') == 'nodejs22' and build.get('entryPoint') == name,
            'Runtime organisateur hors contrat : ' + name)


def initial(functions, value):
    validate_manifest(value)
    common.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == contract()['candidate'], 'Candidat des frais different')
    common.assert_selected(before, after, candidate, runtime_validator=runtime)


def guard(directory, after=False):
    directory = Path(directory)
    value = manifest(directory)
    require(not (directory / 'previous').exists(), 'Reprise automatique des frais interdite')
    observed = common.controls()
    require(observed == value['controls'], 'Derive des mails, des automates ou des modeles')
    witness = directory / 'standard-controls-before.json'
    if witness.exists():
        require(json.loads(witness.read_text()) == observed, 'Temoin initial different')
    else:
        require(not after, 'Temoin initial absent')
        witness.write_text(json.dumps(observed))
    if after:
        (directory / 'standard-controls-after.json').write_text(json.dumps(observed))


def state_check(backup, destination, success):
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    require(credentials.get('project_id') == 'livepalmes', 'Compte PROD requis')
    state = common.load('production-release-state.py')
    report = json.loads((backup / 'report.json').read_text())
    value = validate_manifest(json.loads((backup / 'standard-source-manifest.json').read_text()))
    selected = {PREFIX + n for n in value['selected']}
    require(report['sourcePolicyKind'] == KIND and report['candidate'] == value['candidate']
            and report['standardSourceManifestSha256'] == digest(value) and report['newFunctions'] == []
            and len(report['functions']) == len(selected) and {f['name'] for f in report['functions']} == selected,
            'Sauvegarde des frais hors manifeste')
    saved = json.loads((backup / 'functions.json').read_text())
    observed = state.inventory()
    before, after = ({row['name']: row for row in rows} for rows in (saved, observed))
    errors = []
    try:
        initial(saved, value)
        require(len(after) == len(observed) == value['inventoryCount'], 'Inventaire final incomplet ou duplique')
        assert_retained(before, after, selected, state)
        for name in sorted(selected):
            assert_selected(before[name], after[name], value['candidate'])
    except ValueError as error:
        errors.append(str(error))
    destination.write_text(json.dumps({'candidate': value['candidate'], 'functions': [state.identity(f) for f in observed],
                                       'errors': errors, 'organizerFeesContractSha256': DIGEST}), encoding='utf-8')
    require(not success or not errors, 'Controle final des frais en echec : ' + ', '.join(errors))


def restore_witness(directory, source):
    raise ValueError('Reprise de publication des frais soumise a un nouvel examen')
