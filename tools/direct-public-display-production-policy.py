"""Closed PROD adapter for the exact validated Direct public display; no general eligibility change."""
import hashlib
import json
from pathlib import Path
import re
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('direct_public_standard_v2', ROOT/'tools/standard-source-policy-v2.py')
v2 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(v2)
OPTION = 'standardSources'
MARKER = 'directPublicDisplayRelease'
CONTRACT_PATH = '.github/releases/evidence/20261122-direct-public-display-production-contract.json'
CONTRACT_SHA256 = '270c22827f16f9f46f372ce578db7dbe8600b5c87fcc57cf88f39bad12e32dcf'
KIND = v2.KIND
require, digest, load = v2.require, v2.digest, v2.load
configuration, runtime, initial = v2.configuration, v2.runtime, v2.initial
assert_selected, assert_retained = v2.assert_selected, v2.assert_retained
static_paths = v2.static_paths


def contract():
    raw = (ROOT/CONTRACT_PATH).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat Direct public PROD modifie')
    value = json.loads(raw)
    require(value['schema'] == 1 and value['project'] == 'livepalmes'
            and value['id'] == 'direct-public-display-production-v1'
            and value['allowedFunctions'] == ['manageLivePalmesDirect','readNapPublicSwimmer']
            and value['updateMask'] == ['build_config.source','labels']
            and value['configurationChanges'] is value['bindingChanges'] is False
            and value['businessInvocations'] == 0 and value['mailStateRead'] is False
            and value['resumeAllowed'] is False, 'Limites Direct public PROD invalides')
    return value


def enabled(value):
    return value.get(OPTION, {}).get('schema') == 2 and MARKER in value.get(OPTION, {})


def approved(value):
    c = contract()
    keys = {'schema','candidate','productionCommit','productionHosting','testRun','changes',
            'excludedBackendReview','excludedBackendEvidence',OPTION,'freezeTestCandidate'}
    require(set(value) <= keys and value.get('schema') == 1 and value.get('freezeTestCandidate') is True,
            'Requete Direct public PROD hors contrat')
    require(all(value.get(k) == c[k] for k in ['candidate','productionCommit','productionHosting','testRun']),
            'Candidat ou preuve Direct public PROD hors contrat')
    source = value.get(OPTION, {})
    require(set(source) == {'schema','productionRun','functions','approval',MARKER}
            and type(source['schema']) is int and source['schema'] == 2
            and source[MARKER] == CONTRACT_SHA256 and type(source['productionRun']) is int
            and source['productionRun'] == c['productionRun']
            and source['functions'] == c['allowedFunctions'] and source['approval'] == c['approval'],
            'Accord ou selection Direct public PROD hors contrat')
    v2.approval(source['approval'])
    return c['allowedFunctions']


def paths(value, changed_paths, git):
    approved(value); c = contract()
    actual = git('diff','--name-only','--no-renames',c['productionCommit'],c['candidate']).splitlines()
    require(sorted(changed_paths) == sorted(actual) == sorted(c['changedPaths']),
            'Diff complet Direct public PROD different')
    require(sorted(p for p in actual if p.startswith('functions/')) == c['backendPaths'],
            'Writer ou autre source backend modifie')
    v2.source_paths(c['productionCommit'],c['candidate'],actual,git)


def freeze(value, baseline, functions, selected, fingerprint, legacy, git, changed_paths):
    names = approved(value)
    require(enabled(value) and baseline['productionRun'] == value[OPTION]['productionRun']
            and baseline['productionCommit'] == value['productionCommit']
            and baseline['source'] == 'verified-publication-artifacts',
            'Baseline PROD non authentifiee ou differente')
    paths(value, changed_paths, git)
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
    c = contract()
    require(len(rows) == c['inventoryCount'] and all(
        {k: f.get(k) for k in ['name','state','revision','updateTime','commit']} == origin
        for f, origin in zip(rows,c['origins'])), 'Origines PROD differentes du contrat')
    require(all(desired[n] == c['selectedFingerprints'][n]['precise'] and conservative[n] == c['selectedFingerprints'][n]['conservative']
                for n in names), 'Empreintes Direct public PROD differentes du candidat valide')
    require(sorted(set(static_paths(changed_paths, value['candidate'], git)) | {'index.html'}) == c['staticPaths'],
            'Fichiers Hosting differents du contrat')
    return {'schema': 2, 'kind': KIND, 'requestSha256': digest(value),
            'candidate': value['candidate'], 'productionRun': baseline['productionRun'],
            'productionCommit': value['productionCommit'], 'productionHosting': value['productionHosting'],
            'testRun': value['testRun'], 'selected': calculated, 'origins': rows,
            'inventoryCount': len(rows), 'staticPaths': sorted(set(static_paths(changed_paths, value['candidate'], git)) | {'index.html'}),
            'approval': value[OPTION]['approval'],
            'configurationChanges': False, 'bindingChanges': False, 'newFunctions': [],
            'deletedFunctions': [], 'businessInvocations': 0, 'mailPause': False}


def manifest(directory, request=None):
    directory = Path(directory)
    request = request or json.loads((directory/'request.json').read_text(encoding='utf8'))
    names = approved(request)
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
            and value.get('kind') == KIND
            and value.get('requestSha256') == digest(request)
            and value.get('candidate') == request['candidate']
            and value.get('selected') == names
            and 'controls' not in value
            and value.get('newFunctions') == value.get('deletedFunctions') == []
            and value.get('configurationChanges') is False and value.get('bindingChanges') is False,
            'Manifeste immuable hors candidat/perimetre')
    c = contract()
    require(value['inventoryCount'] == c['inventoryCount'] and value.get('staticPaths') == c['staticPaths']
            and all({k:f.get(k) for k in ['name','state','revision','updateTime','commit']} == origin
                    for f,origin in zip(value['origins'],c['origins'])), 'Origines ou accueil hors contrat')
    return value


def guard(directory, after=False):
    manifest(directory)


def restore_witness(directory, source):
    manifest(directory)
    raise ValueError('Reprise Direct public PROD non autorisee par ce contrat')
