"""Closed PROD adapter for the exact validated SB import; no general eligibility change."""
import hashlib
import json
from pathlib import Path
import re
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('import_sb_standard_v2', ROOT/'tools/standard-source-policy-v2.py')
v2 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(v2)
OPTION = 'standardSources'
MARKER = 'importSbResultsRelease'
CONTRACT_PATH = '.github/releases/evidence/20261122-import-sb-production-contract.json'
CONTRACT_SHA256 = 'fe59618eb6948f4533bc3bf04f1813e99e90529e1682bb0d772180a4ac205a6c'
KIND = 'import-sb-existing-sources-v1'
require, digest, load = v2.require, v2.digest, v2.load
configuration = v2.configuration
assert_retained = v2.assert_retained
static_paths = v2.static_paths


def contract():
    raw = (ROOT/CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat import SB PROD modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['project'] == 'livepalmes'
            and value['id'] == 'import-sb-production-v1'
            and value['allowedFunctions'] == ['createCompetitionImport', 'deleteCompetitionImport', 'previewCompetitionImport',
                                             'readNapPublicSwimmer', 'savePerformanceCorrection',
                                             'updateCompetitionImportRecordAlertDecision']
            and value['updateMask'] == ['build_config.source','labels']
            and value['configurationChanges'] is value['bindingChanges'] is False
            and value['businessInvocations'] == 0 and value['mailStateRead'] is False
            and 'index.html' not in value['staticPaths']
            and value['resumeAllowed'] is False, 'Limites import SB PROD invalides')
    return value


def enabled(value):
    return value.get(OPTION, {}).get('schema') == 2 and MARKER in value.get(OPTION, {})


def approved(value):
    c = contract()
    keys = {'schema','candidate','productionCommit','productionHosting','testRun','changes',
            'excludedBackendReview','excludedBackendEvidence',OPTION,'freezeTestCandidate'}
    require(set(value) <= keys and value.get('schema') == 1 and value.get('freezeTestCandidate') is True,
            'Requete import SB PROD hors contrat')
    require(all(value.get(k) == c[k] for k in ['candidate','productionCommit','productionHosting','testRun']),
            'Candidat ou preuve import SB PROD hors contrat')
    source = value.get(OPTION, {})
    require(set(source) == {'schema','productionRun','functions','approval',MARKER}
            and type(source['schema']) is int and source['schema'] == 2
            and source[MARKER] == CONTRACT_SHA256 and type(source['productionRun']) is int
            and source['productionRun'] == c['productionRun']
            and source['functions'] == c['allowedFunctions'] and source['approval'] == c['approval'],
            'Accord ou selection import SB PROD hors contrat')
    v2.approval(source['approval'])
    return c['allowedFunctions']


def paths(value, changed_paths, git):
    approved(value); c = contract()
    actual = git('diff','--name-only','--no-renames',c['productionCommit'],c['candidate']).splitlines()
    require(sorted(changed_paths) == sorted(actual) == sorted(c['changedPaths']),
            'Diff complet import SB PROD different')
    require(sorted(p for p in actual if p.startswith('functions/')) == c['backendPaths'],
            'Chemins backend import SB hors contrat')
    v2.source_paths(c['productionCommit'],c['candidate'],actual,git)


def validate_manifest(value):
    c = contract()
    require(value.get('kind') == KIND and value.get('schema') == 2
            and all(value.get(k) == c[k] for k in ('candidate','productionRun','productionCommit','productionHosting','testRun','approval','inventoryCount','staticPaths'))
            and value.get('selected') == c['allowedFunctions']
            and value.get('configurationChanges') is value.get('bindingChanges') is False
            and value.get('newFunctions') == value.get('deletedFunctions') == []
            and value.get('businessInvocations') == 0 and value.get('mailPause') is False
            and 'controls' not in value, 'Manifeste import SB PROD hors contrat')
    origins = value.get('origins', [])
    require([{k:row.get(k) for k in ('name','state','revision','updateTime','commit')} for row in origins]
            == c['origins'], 'Origines PROD differentes du contrat import SB')
    selected_rows = {row['name'].split('/')[-1]: row for row in origins}
    require(all(selected_rows[name]['after'] == pair['precise']
                and selected_rows[name]['legacyAfter'] == pair['conservative']
                for name,pair in c['selectedFingerprints'].items()), 'Empreintes import SB differentes du contrat')
    return value


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths):
    names = approved(value)
    paths(value, changed_paths, git)
    return validate_manifest(v2.freeze_selected(value, baseline, functions, selected, fingerprint, legacy,
                                                git, changed_paths, names, KIND))


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory/'request.json').read_text(encoding='utf8'))
    return validate_manifest(v2.read_manifest(directory, request, approved(request), KIND))


def guard(directory, after=False):
    require(not (Path(directory)/'previous').exists(), 'Reprise import SB PROD interdite')
    manifest(directory)


def restore_witness(directory, source):
    manifest(directory)
    raise ValueError('Reprise import SB PROD non autorisee par ce contrat')


def runtime(function):
    name = function.get('name', '').split('/')[-1]
    require(name in contract()['allowedFunctions']
            and function.get('name') == 'projects/livepalmes/locations/europe-west1/functions/'+name
            and function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function['buildConfig'].get('entryPoint') == name,
            'Runtime import SB PROD hors contrat : '+name)


def initial(functions, value):
    v2.initial(functions, value, runtime_validator=runtime)


def assert_selected(before, after, candidate):
    require(candidate == contract()['candidate'], 'Candidat import SB PROD different')
    v2.assert_selected(before, after, candidate, runtime_validator=runtime)


def state_check(backup, destination, success):
    backup = Path(backup)
    read = lambda name: json.loads((backup/name).read_text(encoding='utf8'))
    value, report = read('standard-source-manifest.json'), read('report.json')
    validate_manifest(value)
    require(report.get('sourcePolicyKind') == KIND and report.get('standardSourceManifestSha256') == digest(value)
            and report.get('candidate') == value['candidate']
            and report.get('newFunctions') == report.get('errors') == [],
            'Sauvegarde import SB PROD hors contrat')
    state = load('production-release-state.py')
    before_list = read('functions.json'); initial(before_list, value)
    before = {f['name']:f for f in before_list}
    selected = {'projects/livepalmes/locations/europe-west1/functions/'+n for n in value['selected']}
    require({f['name'] for f in report.get('functions', [])} == selected
            and len(report['functions']) == len(selected), 'Selection sauvegardee differente')
    observed = state.inventory(); after = {f['name']:f for f in observed}; errors = []
    try:
        require(len(after) == len(observed), 'Inventaire apres sources duplique')
        assert_retained(before, after, selected, state)
        for name in sorted(selected):
            require(name in after, 'Source import SB absente')
            assert_selected(before[name], after[name], value['candidate'])
        require(success, 'Publication des sources non reussie')
    except ValueError as error:
        errors.append(str(error))
    Path(destination).write_text(json.dumps({'candidate':value['candidate'],
        'functions':[state.identity(f) for f in observed], 'errors':errors},indent=2),encoding='utf8')
    require(not errors, 'Controle import SB PROD : '+'; '.join(errors))
