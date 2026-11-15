"""Prepare A1's read-only checkpoint from the already authenticated exact receipts.

No Firebase API, Git writes, old application execution or deployment. The fixed
file digests bind the inputs to PROD 43707826259 and its validated TEST proof.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION_RUN = 43707826259
TEST_RUN = 43703143650
RUN_HEAD = '5649d0912a6efcd6927bfe6e3a5ba4d679407fe7'
PREVIOUS_CHECKPOINT_SHA256 = 'efc8185feb70446f338ac2938e99ed9b85bdaafba44c5ae94be5948d5bd28776'
FILES = {
    'release-plan/standard-source-manifest.json': '5fe1ade4b45064d7fb9bd1a7fd42154b52136b7f5a184b2cd0f7b7afc491cba6',
    'release-plan/prod-before.json': '323d9dfefb7a4ead28755c4ab412cf5b4e1c8a93c1d374fb727679402806b372',
    'release-plan/test-proof.json': '86ed7e3daa25c3e6e7afb1944dbc2a5ae1b60afb3058ceef1710f18993b05edd',
    'production-after/production-after.json': 'ecb851ed87718e0f173130b65252d1dc1f1306da2791914bb9747e33207fc5bf',
    'production-idf-preservation/standard-source-receipts.json': 'ad6f766a85a00a11eb835628187ec95c43d5fd382ab0686833c1d563054421a5',
}
SCRIPTS = {
    'legacy': 'release-function-fingerprints.js',
    'test-selection': 'release-test-function-fingerprints.js',
    'production-selection': 'release-production-function-fingerprints.js',
}


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()


def projected_baseline(original, rewritten, before, after, allowed_path_hashes):
    def entries(root, commit):
        raw = subprocess.check_output(['git','ls-tree','-rz',commit],cwd=root)
        return {name: metadata for metadata, name in
                (row.split(b'\t',1) for row in raw.split(b'\0') if row)}
    source, clean = entries(original,before), entries(rewritten,after)
    removed = set(source)-set(clean)
    removed_hashes = {hashlib.sha256(p).hexdigest() for p in removed}
    require = load('history-source-provenance.py').require
    require(len(removed) == 2 and removed_hashes == set(allowed_path_hashes)
            and not set(clean)-set(source)
            and all(source[p] == clean[p] for p in clean),
            'Projection differente des deux retraits : ajout, modification ou autre suppression interdits')
    return {'commit':after,'sourceTree':git(original,'rev-parse',before+'^{tree}'),
            'tree':git(rewritten,'rev-parse',after+'^{tree}'),'retiredPathsSha256':sorted(removed_hashes)}


def prepare(evidence, original, rewritten, reuse=None):
    policy = load('public-privacy-production-policy.py')
    provenance = load('history-source-provenance.py')
    inputs = {}
    for name, expected in FILES.items():
        raw = (evidence/name).read_bytes()
        policy.require(hashlib.sha256(raw).hexdigest() == expected, 'Preuve A1 differente : '+name)
        inputs[name] = json.loads(raw, object_pairs_hook=provenance.unique)
    manifest = policy.validate_manifest(inputs['release-plan/standard-source-manifest.json'])
    before = inputs['release-plan/prod-before.json']
    after = inputs['production-after/production-after.json']
    receipts = inputs['production-idf-preservation/standard-source-receipts.json']
    test = inputs['release-plan/test-proof.json']
    policy.require(after['candidate'] == test['candidate'] == receipts['candidate'] == manifest['candidate']
                   and after['errors'] == [] and len(after['functions']) == manifest['inventoryCount'],
                   'Etat apres publication incoherent')
    policy.require(receipts['manifestSha256'] == policy.digest(manifest), 'Recu de source hors manifeste')
    origin_rows = {r['name']: r for r in manifest['origins']}
    policy.require(sorted(before['functions'],key=lambda r:r['name']) ==
                   sorted([{k:r[k] for k in ['name','updateTime','state','revision','commit']}
                           for r in manifest['origins']],key=lambda r:r['name']), 'Origines avant publication differentes')
    policy.require({r['name'] for r in after['functions']} == set(origin_rows), 'Creation/suppression non couverte')
    selected = {policy.PREFIX+n for n in manifest['selected']}
    policy.require(set(receipts['functions']) == selected, 'Recus de source incomplets')
    for row in after['functions']:
        expected = receipts['functions'][row['name']]['identity'] if row['name'] in selected else origin_rows[row['name']]
        policy.require(row == {k:expected[k] for k in ['name','updateTime','state','revision']}, 'Revision non attestee')
    for receipt in receipts['functions'].values():
        policy.require(receipt['allPathsAndFileBytesIdentical'] is True
                       and receipt['generationReadAndReferencesRechecked'] is True, 'Source geree non attestee')
    commits = sorted({r['commit'] for r in manifest['origins']} |
                     {r['commit'] for r in test['state']['functions']} | {manifest['candidate']})
    def analyse(commit):
        algorithms = {}
        for algorithm, script in SCRIPTS.items():
            output = json.loads(subprocess.check_output(['node', str(ROOT/'tools'/script), str(original), commit], timeout=300))
            algorithms[algorithm] = output['functions']
        return commit, algorithms
    hashes = {}
    if reuse is not None:
        raw = reuse.read_bytes().replace(b'\r\n',b'\n')
        policy.require(hashlib.sha256(raw).hexdigest() == PREVIOUS_CHECKPOINT_SHA256,
                       'Seul le releve A1.4a deja scelle peut etre reutilise')
        previous = json.loads(raw,object_pairs_hook=provenance.unique)
        policy.require(previous['engines'] == provenance.engine_hashes(ROOT)
                       and previous['evidence'] == {'productionRun':PRODUCTION_RUN,'testRun':TEST_RUN,'artifacts':FILES},
                       'Algorithmes ou preuves differents : recalcul requis')
        hashes = {commit:previous['commits'][commit] for commit in commits}
    else:
        with ThreadPoolExecutor(max_workers=3) as executor:
            for future in as_completed([executor.submit(analyse, commit) for commit in commits]):
                commit, algorithms = future.result()
                hashes[commit] = algorithms
                print('Origine analysee '+str(len(hashes))+'/'+str(len(commits)), flush=True)
    for row in manifest['origins']:
        name = row['name'].split('/')[-1]
        for algorithm, previous, current in [('legacy','legacyBefore','legacyAfter'),
                                             ('production-selection','before','after')]:
            policy.require(hashes[row['commit']][algorithm][name] == row[previous]
                           and hashes[manifest['candidate']][algorithm][name] == row[current],
                           'Empreinte calculee differente de la preuve A1 : '+name)
    mapping = dict(line.split() for line in (rewritten/'filter-repo/commit-map').read_text().splitlines()[1:])
    baseline = manifest['candidate']
    policy.require(baseline in mapping, 'Baseline absente de l essai nettoye')
    inputs_paths = ['functions', 'tools/prepare-production-functions.js',
                    'tools/prepare-firebase-test-functions.js', 'tools/firebase-test-backend-lots.js']
    policy.require(git(original, 'ls-tree', '-r', RUN_HEAD, '--', *inputs_paths)
                   == git(original, 'ls-tree', '-r', baseline, '--', *inputs_paths),
                   'Sources du controleur differentes de la baseline applicative')
    hashes[RUN_HEAD] = hashes[baseline]
    baselines = {}
    for anchor in [baseline, RUN_HEAD]:
        policy.require(anchor in mapping,'Reference de publication absente de l essai')
        baselines[anchor] = projected_baseline(original,rewritten,anchor,mapping[anchor],provenance.RETIRED_TOOL_PATH_SHA256)
    return {'schema': 2, 'kind': 'a1-source-provenance-v2',
            'evidence': {'productionRun': PRODUCTION_RUN, 'testRun': TEST_RUN, 'artifacts': FILES},
            'engines': provenance.engine_hashes(ROOT), 'commits': hashes,
            'baselines': baselines}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['evidence', 'original', 'rewritten', 'output']:
        parser.add_argument('--'+name, type=Path, required=True)
    parser.add_argument('--reuse',type=Path,help='Reuse only the exact sealed A1.4a fingerprint checkpoint')
    args = parser.parse_args()
    value = prepare(args.evidence.resolve(), args.original.resolve(), args.rewritten.resolve(),args.reuse)
    raw = (json.dumps(value, sort_keys=True, indent=2)+'\n').encode()
    args.output.write_bytes(raw)
    print(json.dumps({'sha256': hashlib.sha256(raw).hexdigest(), 'commits': len(value['commits'])}))


if __name__ == '__main__':
    main()
