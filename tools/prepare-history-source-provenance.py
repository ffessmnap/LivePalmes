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


def prepare(evidence, original, rewritten):
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
        original_tree = git(original, 'rev-parse', anchor+'^{tree}')
        policy.require(anchor in mapping and git(rewritten, 'rev-parse', mapping[anchor]+'^{tree}') == original_tree,
                       'La baseline de publication a change de contenu')
        baselines[anchor] = {'commit': mapping[anchor], 'tree': original_tree}
    return {'schema': 1, 'kind': 'a1-source-provenance-v1',
            'evidence': {'productionRun': PRODUCTION_RUN, 'testRun': TEST_RUN, 'artifacts': FILES},
            'engines': provenance.engine_hashes(ROOT), 'commits': hashes,
            'baselines': baselines}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['evidence', 'original', 'rewritten', 'output']:
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    value = prepare(args.evidence.resolve(), args.original.resolve(), args.rewritten.resolve())
    raw = (json.dumps(value, sort_keys=True, indent=2)+'\n').encode()
    args.output.write_bytes(raw)
    print(json.dumps({'sha256': hashlib.sha256(raw).hexdigest(), 'commits': len(value['commits'])}))


if __name__ == '__main__':
    main()
