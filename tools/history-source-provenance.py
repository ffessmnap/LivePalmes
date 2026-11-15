"""Sealed, read-only source fingerprints for the reviewed A1 history transition.

Historical run/commit identities remain unchanged. Only a tree-identical
publication baseline can be resolved to a rewritten Git commit. No generic
old-to-new SHA substitution, application source or deployment API lives here.
"""
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = 'tools/history-source-provenance.json'
CATALOGUE_SHA256 = 'efc8185feb70446f338ac2938e99ed9b85bdaafba44c5ae94be5948d5bd28776'
ALGORITHMS = {'legacy', 'test-selection', 'production-selection'}
ENGINES = (
    'tools/release-function-fingerprints.js',
    'tools/release-test-function-fingerprints.js',
    'tools/release-production-function-fingerprints.js',
    'tests/firestore-rules/node_modules/acorn/dist/acorn.js',
)
SHA = re.compile(r'[0-9a-f]{40}')
HASH = re.compile(r'[0-9a-f]{64}')


class ProvenanceError(RuntimeError):
    """Must escape the ordinary conservative 'republish unknown' fallback."""


def require(value, message):
    if not value:
        raise ProvenanceError(message)


def engine_hashes(root):
    return {name: hashlib.sha256((Path(root)/name).read_bytes().replace(b'\r\n', b'\n')).hexdigest()
            for name in ENGINES}


def unique(items):
    result = {}
    for key, value in items:
        require(key not in result, 'Cle de provenance dupliquee')
        result[key] = value
    return result


def validate(raw, expected_digest, engines):
    require(HASH.fullmatch(expected_digest or '')
            and hashlib.sha256(raw).hexdigest() == expected_digest,
            'Point de provenance historique absent, non scelle ou altere')
    value = json.loads(raw, object_pairs_hook=unique)
    require(set(value) == {'schema', 'kind', 'evidence', 'engines', 'commits', 'baselines'}
            and value['schema'] == 1 and value['kind'] == 'a1-source-provenance-v1',
            'Schema de provenance historique inconnu')
    require(value['engines'] == engines and set(engines) == set(ENGINES),
            'Algorithme de provenance modifie : nouvelle qualification requise')
    evidence = value['evidence']
    require(isinstance(evidence, dict) and set(evidence) == {'productionRun', 'testRun', 'artifacts'}
            and type(evidence['productionRun']) is int and evidence['productionRun'] > 0
            and type(evidence['testRun']) is int and evidence['testRun'] > 0
            and isinstance(evidence['artifacts'], dict) and evidence['artifacts']
            and all(HASH.fullmatch(v) for v in evidence['artifacts'].values()),
            'Origine des preuves historiques incomplete')
    require(isinstance(value['commits'], dict) and 1 <= len(value['commits']) <= 100,
            'Catalogue de commits historique non borne')
    for commit, algorithms in value['commits'].items():
        require(SHA.fullmatch(commit) and set(algorithms) == ALGORITHMS,
                'Origine ou algorithme historique inconnu')
        for functions in algorithms.values():
            require(isinstance(functions, dict) and 0 < len(functions) <= 500
                    and all(re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', n) and HASH.fullmatch(h)
                            for n, h in functions.items()), 'Empreintes historiques invalides')
    require(isinstance(value['baselines'], dict) and 1 <= len(value['baselines']) <= 10,
            'Baselines historiques non bornees')
    for old, row in value['baselines'].items():
        require(old in value['commits'] and set(row) == {'commit', 'tree'}
                and SHA.fullmatch(row['commit']) and SHA.fullmatch(row['tree'])
                and old != row['commit'], 'Correspondance de baseline invalide')
    return value


@lru_cache(maxsize=1)
def checkpoint():
    return validate((ROOT/CATALOGUE).read_bytes(), CATALOGUE_SHA256, engine_hashes(ROOT))


def exists(root, commit):
    require(SHA.fullmatch(str(commit)), 'Commit de provenance complet requis')
    result = subprocess.run(['git', 'cat-file', '--batch-check=%(objecttype)'], cwd=root,
                            input=commit+'\n', text=True, capture_output=True)
    require(result.returncode == 0, 'Lecture Git impossible : aucune reprise de provenance admise')
    if result.stdout.strip() == 'commit':
        return True
    require(result.stdout.strip() == commit+' missing', 'Origine de provenance non commit')
    return False


def fingerprints(root, commit, algorithm, live):
    require(algorithm in ALGORITHMS, 'Comparateur de provenance inconnu')
    if exists(root, commit):
        return live(commit)
    functions = checkpoint()['commits'].get(commit, {}).get(algorithm)
    require(functions is not None,
            'Origine Git absente et non couverte par les preuves historiques : '+commit)
    return dict(functions)


def resolve_git_arguments(root, args):
    """Keep original identities in requests/artifacts; resolve local reads only."""
    replacements = {}
    for arg in args:
        if not isinstance(arg, str) or len(arg) < 40 or not SHA.fullmatch(arg[:40]):
            continue
        old, suffix = arg[:40], arg[40:]
        if suffix and suffix != '^{tree}' and not suffix.startswith(':'):
            continue
        if subprocess.run(['git', 'cat-file', '-e', old], cwd=root, stdout=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL).returncode == 0:
            continue
        row = checkpoint()['baselines'].get(old)
        require(row is not None, 'Reference Git historique non qualifiee : '+old)
        require(exists(root, row['commit']), 'Baseline nettoyee absente : '+row['commit'])
        tree = subprocess.check_output(['git', 'rev-parse', row['commit']+'^{tree}'], cwd=root, text=True).strip()
        require(tree == row['tree'], 'Arbre de baseline different de la preuve historique')
        subprocess.run(['git', 'merge-base', '--is-ancestor', row['commit'], 'HEAD'], cwd=root, check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        replacements[arg] = row['commit']+suffix
    return tuple(replacements.get(arg, arg) for arg in args)
