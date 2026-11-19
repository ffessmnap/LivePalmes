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
    if (directory / 'previous').exists():
        marker = read(directory / 'standard-organizer-hosting-only.json')
        require(os.environ.get('RESUME') == SOURCE_RUN and marker['sourceRun'] == int(SOURCE_RUN)
                and marker['manifestSha256'] == digest(value) and marker['sourceWrites'] == 0,
                'Seule la cloture Hosting examinee est autorisee')
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


SOURCE_RUN = '44498169988'
SOURCE_TOOLING = '9fd344437386474d0d281793aec4ed94d71ac396'
SOURCE_ARTIFACTS = {
    'release-plan': 'sha256:38a88d7d9d4e7d404c6c11ff904e2cc742fbba6035f60b9b21e5d843b665aa8b',
    'production-after': 'sha256:eb5ccb05831845391c5b66e63b33648556f06d6752de0b1400e0463eef08abf4',
    'production-idf-preservation': 'sha256:70b186c02d0186aebcdb75819568fdaa16b89e7204695262b3ec31f0d3d21137',
    'production-code-backup': 'sha256:56eb46812c5f849707a77f0aec2e8ecc00089941309eb270009d02fe867f0215',
}


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def restore_witness(directory, source):
    directory, source = Path(directory), Path(source)
    value = manifest(directory)
    require(os.environ.get('RESUME') == SOURCE_RUN and source == directory / 'previous/standard-guards',
            'Reprise disponible uniquement pour la tentative examinee')
    require(read(source / 'standard-source-manifest.json') == value
            and read(source / 'standard-controls-before.json') == read(source / 'standard-controls-after.json') == value['controls'],
            'Temoins ou manifeste de la tentative differents')
    receipts = read(source / 'standard-source-receipts.json')
    after = read(directory / 'previous/production-after.json')
    actual = {f['name']: f for f in after['functions']}
    require(after['errors'] == [] and after['candidate'] == value['candidate']
            and after['organizerFeesContractSha256'] == DIGEST
            and len(actual) == len(after['functions']) == value['inventoryCount']
            and set(actual) == {f['name'] for f in value['origins']}, 'Etat final initial invalide')
    selected = {PREFIX + name for name in value['selected']}
    require(receipts['candidate'] == value['candidate'] and receipts['manifestSha256'] == digest(value)
            and set(receipts['functions']) == selected, 'Archives initiales incompletes')
    for name, receipt in receipts['functions'].items():
        require(receipt['identity'] == actual[name] and receipt['allPathsAndFileBytesIdentical'] is True
                and receipt['generationReadAndReferencesRechecked'] is True, 'Archive initiale non attestee')
    for row in value['origins']:
        fields = ('name', 'updateTime', 'state', 'revision')
        observed = actual[row['name']]
        require(observed['state'] == 'ACTIVE' and
                ((observed['revision'] != row['revision'] and observed['updateTime'] != row['updateTime'])
                 if row['name'] in selected else observed == {k: row[k] for k in fields}),
                'Revision initiale differente du perimetre')
    for name in ('standard-controls-before.json', 'standard-source-receipts.json'):
        (directory / name).write_bytes((source / name).read_bytes())


def qualify_hosting_only(root, resume, info, artifacts, selected):
    value = manifest(root)
    require(resume == SOURCE_RUN and info['id'] == int(SOURCE_RUN) and info['head_sha'] == SOURCE_TOOLING
            and info['event'] == 'workflow_dispatch' and info['run_attempt'] == 1 and info['head_branch'] == 'main'
            and info['path'] == '.github/workflows/livepalmes-production-release.yml' and info['conclusion'] == 'failure',
            'Tentative source de la cloture Hosting differente')
    require(sorted(selected) == value['selected'] and not (root / 'previous/production-hosting-after.json').exists(),
            'Selection modifiee ou Hosting deja tente')
    entries = {a['name']: a for a in artifacts}
    require(len(entries) == len(artifacts) and 'production-hosting-after' not in entries
            and all(entries.get(name, {}).get('digest') == expected and not entries[name]['expired']
                    for name, expected in SOURCE_ARTIFACTS.items()), 'Artefacts de la tentative initiale differents')
    require(read(root / 'standard-controls-before.json') == value['controls'], 'Temoin de reprise absent')
    (root / 'standard-organizer-hosting-only.json').write_text(json.dumps(
        {'sourceRun': int(SOURCE_RUN), 'candidate': value['candidate'], 'manifestSha256': digest(value), 'sourceWrites': 0}))


def verify_installed_archives(root, backup, state):
    value = manifest(root)
    marker = read(root / 'standard-organizer-hosting-only.json')
    require(os.environ.get('RESUME') == SOURCE_RUN and marker == {
        'sourceRun': int(SOURCE_RUN), 'candidate': value['candidate'], 'manifestSha256': digest(value), 'sourceWrites': 0},
        'Cloture Hosting non qualifiee')
    source = read(Path(os.environ['RUNNER_TEMP']) / 'code-backup-source.json')
    require(source['chainVerified'] is True and source['candidate'] == value['candidate']
            and source['originRun'] == source['sourceRun'] == int(SOURCE_RUN) and source['sourceHead'] == SOURCE_TOOLING
            and read(backup / 'standard-source-manifest.json') == value, 'Sauvegarde initiale hors contrat')
    data = common.load('publish-approved-pdf-functions.py').archive(Path(os.environ['CANDIDATE_DIRECTORY']), value['candidate'])
    attest = common.load('standard-source-publish.py').attest
    functions = {f['name']: f for f in state.inventory()}
    receipts = read(root / 'standard-source-receipts.json')['functions']
    for name, receipt in receipts.items():
        require(functions[name].get('labels', {}).get('livepalmes-commit') == value['candidate']
                and attest(functions[name], data, state) == receipt, 'Archive installee differente : ' + name)
    guard(root)
