"""Closed source and label promotion of the validated foreign officials and TOP city changes."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('officials_top_standard_v2', ROOT/'tools/standard-source-policy-v2.py')
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)
OPTION = 'standardSources'
MARKER = 'officialsTopCityRelease'
KIND = 'officials-top-city-existing-sources-v1'
CONTRACT_PATH = '.github/releases/evidence/20261124-officials-top-city-production-contract.json'
CONTRACT_SHA256 = 'fd8d2aca6ed88c64b52ad3c34e71921ccff554ed2a44291ab0633b7c3a306407'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
INDEX = 'functions/index.js'
BACKEND_PATHS = [INDEX, 'functions/nap-club-person-create.js', 'functions/nap-public-top.js']
FUNCTIONS = ['deleteEngagementNationalClubPerson', 'mergeEngagementNationalClubPerson', 'readNapPublicSwimmer',
             'requestEngagementClubSwimmerChange', 'resolveEngagementSwimmerChangeRequest',
             'saveEngagementClubPerson', 'setEngagementClubPersonStatus', 'setEngagementNationalClubPersonStatus']
ORIGIN_FIELDS = ('name', 'state', 'revision', 'updateTime', 'commit')
REFERENCE_FIELDS = ('candidate', 'testRun', 'productionCommit', 'productionHosting')
OLD_ROUTE = ': action === "top" ? await require("./nap-direct-tops").readDirectTop(napPool, request.query)'
NEW_ROUTE = ': action === "top" ? await require("./nap-public-top").readPublicTop(napPool, request.query)'
require, digest, load = v2.require, v2.digest, v2.load
configuration, assert_retained = v2.configuration, v2.assert_retained


def contract():
    raw = (ROOT/CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat officiels/TOP PROD modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['id'] == 'officials-top-city-production-v1'
            and value['project'] == 'livepalmes' and value['allowedFunctions'] == FUNCTIONS
            and value['inventoryCount'] == 119
            and value['updateMask'] == ['build_config.source', 'labels']
            and value['configurationChanges'] is value['bindingChanges'] is value['mailStateRead'] is False
            and value['businessInvocations'] == 0 and value['resumeAllowed'] is False,
            'Limites officiels/TOP PROD invalides')
    v2.approval(value['productionApproval'])
    return value


def enabled(value):
    return value.get(OPTION, {}).get('schema') == 2 and MARKER in value.get(OPTION, {})


def approved(value):
    fixed = contract()
    keys = {'schema', 'changes', 'freezeTestCandidate', 'excludedBackendReview',
            'excludedBackendEvidence', OPTION, *REFERENCE_FIELDS}
    require(set(value) <= keys and type(value.get('schema')) is int and value['schema'] == 1 and value.get('freezeTestCandidate') is True
            and all(value.get(k) == fixed[k] for k in REFERENCE_FIELDS),
            'Requete officiels/TOP hors candidat ou preuve TEST')
    source = value.get(OPTION, {})
    require(isinstance(source, dict) and type(source.get('schema')) is int
            and type(source.get('productionRun')) is int
            and source == {'schema': 2, 'productionRun': fixed['productionRun'],
                                 'functions': fixed['allowedFunctions'], 'approval': fixed['approval'],
                                 MARKER: CONTRACT_SHA256}, 'Selection ou accord officiels/TOP hors contrat')
    v2.approval(fixed['approval'])
    return fixed['allowedFunctions']


def paths(value, changed_paths, git):
    approved(value)
    fixed = contract()
    base, candidate = fixed['productionCommit'], fixed['candidate']
    actual = git('diff', '--name-only', '--no-renames', base, candidate).splitlines()
    require(sorted(changed_paths) == sorted(actual) == fixed['changedPaths']
            and sorted(p for p in actual if p.startswith('functions/')) == BACKEND_PATHS,
            'Diff complet officiels/TOP hors contrat')
    require(not any(p.startswith(('performances/public/data/', 'functions/private/', 'migrations/'))
                    or p.endswith(('.sql', '.env')) for p in actual), 'Donnee, migration ou secret hors contrat')
    require(git('rev-parse', base+':'+INDEX) == fixed['indexBefore']
            and git('rev-parse', candidate+':'+INDEX) == fixed['indexAfter'],
            'Empreintes du routage TOP differentes')
    delta = git('diff', '--unified=0', base, candidate, '--', INDEX).splitlines()
    deleted = [row[1:].strip() for row in delta if row.startswith('-') and not row.startswith('--- ')]
    added = [row[1:].strip() for row in delta if row.startswith('+') and not row.startswith('+++ ')]
    require(deleted == [OLD_ROUTE] and added == [NEW_ROUTE], 'Autre changement dans la declaration des Functions')
    for name in v2.legacy.PROTECTED:
        if name != INDEX:
            require(git('rev-parse', base+':'+name) == git('rev-parse', candidate+':'+name),
                    'Configuration hors contrat officiels/TOP : '+name)


def validate_manifest(value):
    fixed = contract()
    fields = (*REFERENCE_FIELDS, 'productionRun', 'approval', 'inventoryCount', 'staticPaths')
    require(value.get('schema') == 2 and value.get('kind') == KIND
            and all(value.get(k) == fixed[k] for k in fields)
            and value.get('selected') == fixed['allowedFunctions']
            and value.get('configurationChanges') is value.get('bindingChanges') is False
            and value.get('newFunctions') == value.get('deletedFunctions') == []
            and value.get('mailPause') is False and value.get('businessInvocations') == 0
            and 'controls' not in value, 'Manifeste officiels/TOP hors contrat')
    origins = value['origins']
    require(len(origins) == fixed['inventoryCount']
            and digest([{k: row[k] for k in ORIGIN_FIELDS} for row in origins]) == fixed['originsSha256'],
            'Origines PROD officiels/TOP differentes')
    return value


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths):
    paths(value, changed_paths, git)
    return validate_manifest(v2.freeze_selected(value, baseline, functions, selected, fingerprint,
                                                legacy, git, changed_paths, approved(value), KIND))


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory/'request.json').read_text(encoding='utf8'))
    return validate_manifest(v2.read_manifest(directory, request, approved(request), KIND))


def guard(directory, after=False):
    require(not (Path(directory)/'previous').exists(), 'Reprise officiels/TOP non autorisee par ce contrat')
    manifest(directory)


def runtime(function):
    name = function.get('name','').rsplit('/', 1)[-1]
    build = function.get('buildConfig', {})
    require(function.get('name') == PREFIX+name and name in FUNCTIONS
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and build.get('runtime') == 'nodejs22' and build.get('entryPoint') == name,
            'Runtime officiels/TOP hors contrat : '+name)


def initial(functions, value):
    v2.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == contract()['candidate'], 'Candidat officiels/TOP different')
    v2.assert_selected(before, after, candidate, runtime_validator=runtime)


def state_check(backup, destination, success):
    backup = Path(backup)

    def read(name):
        return json.loads((backup/name).read_text(encoding='utf8'))

    value, report = validate_manifest(read('standard-source-manifest.json')), read('report.json')
    require(report.get('sourcePolicyKind') == KIND and report.get('standardSourceManifestSha256') == digest(value)
            and report.get('candidate') == value['candidate']
            and report.get('newFunctions') == report.get('errors') == [], 'Sauvegarde officiels/TOP hors contrat')
    originals = read('functions.json')
    initial(originals, value)
    before = {f['name']: f for f in originals}
    selected = {PREFIX+name for name in value['selected']}
    require({f['name'] for f in report['functions']} == selected and len(report['functions']) == len(selected),
            'Selection sauvegardee differente')
    state = load('production-release-state.py')
    observed = state.inventory()
    after = {f['name']: f for f in observed}
    errors = []
    try:
        require(len(after) == len(observed) and after.keys() == before.keys(), 'Inventaire apres sources different')
        assert_retained(before, after, selected, state)
        for name in sorted(selected):
            assert_selected(before[name], after[name], value['candidate'])
        require(success, 'Publication des sources non reussie')
    except ValueError as error:
        errors.append(str(error))
    Path(destination).write_text(json.dumps({'candidate':value['candidate'],
        'functions':[state.identity(f) for f in observed], 'errors':errors}, indent=2), encoding='utf8')
    require(not errors, 'Controle officiels/TOP PROD : '+'; '.join(errors))
