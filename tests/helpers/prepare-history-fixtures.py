"""Prepare metadata-only test fixtures; never read retired reference contents."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
INPUTS = ['functions', 'tools/prepare-firebase-test-functions.js',
          'tools/firebase-test-backend-lots.js', 'tools/prepare-production-functions.js', 'firestore.rules']
RETIRED = {'functions/assets/intranap-swimmers-index.json', 'functions/intranap-swimmers-reference.json'}


def git(root, *args, data=None):
    return subprocess.check_output(['git', *args], cwd=root, input=data)


def rows(root, commit):
    return git(root, 'ls-tree', '-r', commit, '--', *INPUTS)


def prepare(original, rewritten):
    mapping = dict(line.split() for line in (rewritten/'filter-repo/commit-map').read_text().splitlines()[1:])
    texts = [p.read_text(encoding='utf-8') for p in (ROOT/'tests').glob('*') if p.suffix in {'.js', '.py'}]
    for name in ['docs/releases/backend-isolation-progress.json',
                 '.github/releases/evidence/20261101-validated-portal-contract.json']:
        texts.append((ROOT/name).read_text(encoding='utf-8'))
    candidates = sorted(set(re.findall(r'(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])', '\n'.join(texts))))
    types = git(original, 'cat-file', '--batch-check=%(objecttype)', data=('\n'.join(candidates)+'\n').encode()).decode().splitlines()
    commits = [c for c,t in zip(candidates,types) if t == 'commit' and c in mapping]
    if not 1 <= len(commits) <= 100:
        raise ValueError('Unbounded historical test inputs')
    result = {}
    for commit in commits:
        before, after = rows(original, commit), rows(rewritten, mapping[commit])
        old = {r.split(b'\t',1)[1]:r for r in before.splitlines()}
        clean = {r.split(b'\t',1)[1]:r for r in after.splitlines()}
        removed = {p.decode() for p in old.keys()-clean.keys()}
        if not removed <= RETIRED or clean.keys()-old.keys() or any(old[p] != clean[p] for p in clean):
            raise ValueError('Historical executable/rules/package inputs changed')
        for line in before.decode().splitlines():
            if not re.fullmatch(r'100(?:644|755) blob [0-9a-f]{40}\t[^\t\r\n]+',line):
                raise ValueError('Unknown source mode/type')
        result[commit] = {'rewritten':mapping[commit], 'rows':before.decode().splitlines(),
                          'cleanRowsSha256':hashlib.sha256(after).hexdigest(), 'metadataOnly':sorted(removed)}
    return {'schema':1, 'kind':'historical-test-inputs-only', 'scope':INPUTS, 'commits':result}


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['original','rewritten','output']:p.add_argument('--'+name,type=Path,required=True)
    args=p.parse_args()
    value=prepare(args.original.resolve(),args.rewritten.resolve())
    raw=(json.dumps(value,sort_keys=True,indent=2)+'\n').encode()
    args.output.write_bytes(raw)
    print(json.dumps({'commits':len(value['commits']),'sha256':hashlib.sha256(raw).hexdigest()}))
