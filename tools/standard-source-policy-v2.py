"""Current existing-source policy, separate from the byte-frozen historical v1 reader."""
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('frozen_source_v1', ROOT/'tools/standard-source-policy.py')
legacy = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(legacy)
OPTION = legacy.OPTION
CURRENT_KIND = KIND = 'standard-existing-sources-v2'
# Reuse unchanged selection, byte fingerprint and configuration primitives.
require, digest, load = legacy.require, legacy.digest, legacy.load
eligible, approval = legacy.eligible, legacy.approval
source_paths, static_paths = legacy.source_paths, legacy.static_paths
configuration, runtime = legacy.configuration, legacy.runtime
assert_selected, assert_retained = legacy.assert_selected, legacy.assert_retained


def enabled(value):
    return value.get(OPTION, {}).get('schema') == 2


def approved(value):
    if not enabled(value):
        return []
    keys = {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun',
            'changes', 'excludedBackendReview', 'excludedBackendEvidence', OPTION, 'freezeTestCandidate'}
    require(set(value) <= keys and value.get('schema') == 1,
            'Parcours standard sans ancienne exception ni option supplementaire')
    require(all(re.fullmatch('[0-9a-f]{40}', str(value.get(k, ''))) for k in ['candidate', 'productionCommit'])
            and type(value.get('testRun')) is int and value['testRun'] > 0
            and re.fullmatch(r'sites/livepalmes/versions/[A-Za-z0-9_-]+', value.get('productionHosting', '')),
            'Candidat, preuve TEST et reference Hosting exacts requis')
    c = value[OPTION]
    require(isinstance(c, dict) and set(c) == {'schema', 'productionRun', 'functions', 'approval'}
            and type(c['schema']) is int and c['schema'] == 2
            and type(c['productionRun']) is int and c['productionRun'] > 0,
            'Autorisation de sources existantes incomplete')
    names = c['functions']
    require(isinstance(names, list) and all(isinstance(n, str) for n in names)
            and names == sorted(set(names)) and set(names) <= eligible(),
            'Fonction exclue ou autorisation de sources non bornee')
    approval(c['approval'])
    return names


def paths(value, paths, git):
    if not enabled(value):
        return
    approved(value)
    source_paths(value['productionCommit'], value['candidate'], paths, git)


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths):
    names = approved(value)
    paths(value, changed_paths, git)
    return freeze_selected(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths, names, KIND)


def freeze_selected(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths, names, kind):
    # Callers must validate authority and the complete diff before using this comparison.
    require(enabled(value) and baseline['productionRun'] == value[OPTION]['productionRun']
            and baseline['productionCommit'] == value['productionCommit']
            and baseline['source'] == 'verified-publication-artifacts',
            'Baseline PROD non authentifiee ou differente')
    desired, conservative = fingerprint(value['candidate']), legacy(value['candidate'])
    require(set(desired) == set(fingerprint(value['productionCommit']))
            and set(conservative) == set(legacy(value['productionCommit'])),
            'Creation ou suppression de declaration interdite')
    require(0 < len(functions) <= 500 and len(functions) == len({f['name'] for f in functions.values()})
            and all(f['name'] == 'projects/livepalmes/locations/europe-west1/functions/'+n
                    for n, f in functions.items()), 'Inventaire PROD duplique, vide ou hors projet')
    calculated, rows = [], []
    for name, function in sorted(functions.items()):
        commit = function.get('commit', '')
        require(function.get('state') == 'ACTIVE' and re.fullmatch('[0-9a-f]{40}', commit)
                and function.get('revision') and function.get('updateTime')
                and name in desired and name in conservative,
                'Origine ou fonction PROD inconnue : '+name)
        before, old = fingerprint(commit), legacy(commit)
        require(name in before and name in old, 'Dependance inconnue : '+name)
        changed = before[name] != desired[name]
        require(changed == (old[name] != conservative[name]),
                'Comparateurs incompatibles, selection non reductible : '+name)
        if changed:
            calculated.append(name)
        rows.append({**function, 'before': before[name], 'after': desired[name],
                     'legacyBefore': old[name], 'legacyAfter': conservative[name]})
    require(sorted(selected) == calculated == names and len(selected) == len(set(selected)),
            'Selection calculee complete differente de l autorisation')
    return {'schema': 2, 'kind': kind, 'requestSha256': digest(value),
            'candidate': value['candidate'], 'productionRun': baseline['productionRun'],
            'productionCommit': value['productionCommit'], 'productionHosting': value['productionHosting'],
            'testRun': value['testRun'], 'selected': calculated, 'origins': rows,
            'inventoryCount': len(rows), 'staticPaths': static_paths(changed_paths, value['candidate'], git),
            'approval': value[OPTION]['approval'],
            'configurationChanges': False, 'bindingChanges': False, 'newFunctions': [],
            'deletedFunctions': [], 'businessInvocations': 0, 'mailPause': False}


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory/'request.json').read_text(encoding='utf8'))
    names = approved(request)
    return read_manifest(directory, request, names, KIND)


def read_manifest(directory, request, names, kind):
    value = json.loads((directory/'standard-source-manifest.json').read_text(encoding='utf8'))
    require(value.get('productionRun') == request[OPTION]['productionRun']
            and value.get('productionCommit') == request['productionCommit']
            and value.get('productionHosting') == request['productionHosting']
            and value.get('testRun') == request['testRun']
            and value.get('approval') == request[OPTION]['approval']
            and value.get('inventoryCount') == len(value.get('origins', [])) > 0
            and len({f['name'] for f in value['origins']}) == value['inventoryCount']
            and value.get('businessInvocations') == 0 and value.get('mailPause') is False,
            'Manifeste altere ou incomplet')
    require(value.get('schema') == 2
            and value.get('kind') == kind
            and value.get('requestSha256') == digest(request)
            and value.get('candidate') == request['candidate']
            and value.get('selected') == names
            and 'controls' not in value
            and value.get('newFunctions') == value.get('deletedFunctions') == []
            and value.get('configurationChanges') is False and value.get('bindingChanges') is False,
            'Manifeste immuable hors candidat/perimetre')
    return value


def initial(functions, value, runtime_validator=None):
    state = load('production-release-state.py')
    rows = {f['name'].split('/')[-1]: f for f in functions}
    expected = {f['name'].split('/')[-1]: f for f in value['origins']}
    require(len(rows) == len(functions) == value['inventoryCount'] and set(rows) == set(expected)
            and all(state.identity(rows[n]) == {k: expected[n][k] for k in ['name','revision','updateTime','state']}
                    for n in rows), 'Derive de l inventaire avant sauvegarde')
    for name in value['selected']:
        (runtime_validator or runtime)(rows[name])


def guard(directory, after=False):
    # The immutable manifest is still checked. No operational mail/automation read.
    manifest(directory)


def restore_witness(directory, source):
    # A v2 resume requires its original backup and revisions, not a mail witness.
    manifest(directory)
