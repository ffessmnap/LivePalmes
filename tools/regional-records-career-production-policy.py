"""Closed source and label promotion of the validated regional records and swimmer career changes."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('regional_records_career_v2', ROOT/'tools/standard-source-policy-v2.py')
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)
OPTION = 'standardSources'
MARKER = 'regionalRecordsCareerRelease'
KIND = 'regional-records-career-existing-sources-v1'
CONTRACT_PATH = '.github/releases/evidence/20261125-regional-records-career-production-contract.json'
CONTRACT_SHA256 = '43b1df30d3cd01a2e5aa9f5176ebc5c7bba7740766e070ab9b96609f1e0393d1'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
INDEX = 'functions/index.js'
BACKEND_PATHS = [INDEX, 'functions/nap-category-benchmarks.js',
                 'functions/nap-public-top.js', 'functions/nap-regional-records.js']
FUNCTIONS = ['readNapPublicSwimmer']
ORIGIN_FIELDS = ('name', 'state', 'revision', 'updateTime', 'commit')
REFERENCE_FIELDS = ('candidate', 'testRun', 'productionCommit', 'productionHosting')
OLD_ACTIONS = '["swimmer", "search",'
NEW_ACTIONS = '["swimmer", "category-benchmarks", "search",'
NEW_ROUTE = ': action === "category-benchmarks" ? await require("./nap-category-benchmarks").read(napPool, request.query)'
require, digest = v2.require, v2.digest
configuration, assert_retained, assert_selected = v2.configuration, v2.assert_retained, v2.assert_selected
initial = v2.initial


def contract():
    raw = (ROOT/CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat records regionaux/fiche PROD modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['id'] == 'regional-records-career-production-v1'
            and value['project'] == 'livepalmes' and value['allowedFunctions'] == FUNCTIONS
            and value['inventoryCount'] == 119
            and value['updateMask'] == ['build_config.source', 'labels']
            and value['configurationChanges'] is value['bindingChanges'] is value['mailStateRead'] is False
            and value['businessInvocations'] == 0 and value['resumeAllowed'] is False,
            'Limites records regionaux/fiche PROD invalides')
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
            'Requete records regionaux/fiche hors candidat ou preuve TEST')
    source = value.get(OPTION, {})
    require(isinstance(source, dict) and type(source.get('schema')) is int
            and type(source.get('productionRun')) is int
            and source == {'schema': 2, 'productionRun': fixed['productionRun'],
                                 'functions': fixed['allowedFunctions'], 'approval': fixed['approval'],
                                 MARKER: CONTRACT_SHA256}, 'Selection ou accord records regionaux/fiche hors contrat')
    v2.approval(fixed['approval'])
    return fixed['allowedFunctions']


def paths(value, changed_paths, git):
    approved(value)
    fixed = contract()
    base, candidate = fixed['productionCommit'], fixed['candidate']
    actual = git('diff', '--name-only', '--no-renames', base, candidate).splitlines()
    require(sorted(changed_paths) == sorted(actual) == fixed['changedPaths']
            and sorted(p for p in actual if p.startswith('functions/')) == BACKEND_PATHS,
            'Diff complet records regionaux/fiche hors contrat')
    require(not any(p.startswith(('performances/public/data/', 'functions/private/', 'migrations/'))
                    or p.endswith(('.sql', '.env')) for p in actual), 'Donnee, migration ou secret hors contrat')
    require(git('rev-parse', base+':'+INDEX) == fixed['indexBefore']
            and git('rev-parse', candidate+':'+INDEX) == fixed['indexAfter'],
            'Empreintes du routage des reperes differentes')
    delta = git('diff', '--unified=0', base, candidate, '--', INDEX).splitlines()
    deleted = [row[1:].strip() for row in delta if row.startswith('-') and not row.startswith('--- ')]
    added = [row[1:].strip() for row in delta if row.startswith('+') and not row.startswith('+++ ')]
    require(len(deleted) == 1 and deleted[0].startswith('if (!'+OLD_ACTIONS),
            'Liste initiale des actions publiques differente')
    require(added == [deleted[0].replace(OLD_ACTIONS, NEW_ACTIONS, 1), NEW_ROUTE],
            'Autre changement dans la declaration des Functions')
    for name in v2.legacy.PROTECTED:
        if name != INDEX:
            require(git('rev-parse', base+':'+name) == git('rev-parse', candidate+':'+name),
                    'Configuration hors contrat records regionaux/fiche : '+name)


def validate_manifest(value):
    fixed = contract()
    fields = (*REFERENCE_FIELDS, 'productionRun', 'approval', 'inventoryCount', 'staticPaths')
    require(value.get('schema') == 2 and value.get('kind') == KIND
            and all(value.get(k) == fixed[k] for k in fields)
            and value.get('selected') == fixed['allowedFunctions']
            and value.get('configurationChanges') is value.get('bindingChanges') is False
            and value.get('newFunctions') == value.get('deletedFunctions') == []
            and value.get('mailPause') is False and value.get('businessInvocations') == 0
            and 'controls' not in value, 'Manifeste records regionaux/fiche hors contrat')
    origins = value['origins']
    require(len(origins) == fixed['inventoryCount']
            and digest([{k: row[k] for k in ORIGIN_FIELDS} for row in origins]) == fixed['originsSha256'],
            'Origines PROD records regionaux/fiche differentes')
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
    require(not (Path(directory)/'previous').exists(), 'Reprise records regionaux/fiche non autorisee par ce contrat')
    manifest(directory)
