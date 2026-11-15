"""Prepare metadata-only test fixtures; never read retired reference contents."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
INPUTS = ['functions', 'tools/prepare-firebase-test-functions.js',
          'tools/firebase-test-backend-lots.js', 'tools/prepare-production-functions.js', 'firestore.rules',
          'tests/helpers/source-files.js', 'firebase.json', 'tools/release-cycle.py',
          '.github/workflows/livepalmes-production-release.yml',
          'tools/check-production-mail-disabled.py', 'tools/grouped-publication-policy.py',
          '.firebaserc', 'firestore.indexes.json', 'performances/public/data/admin-reference.js']
RETIRED = {'functions/assets/intranap-swimmers-index.json', 'functions/intranap-swimmers-reference.json',
           'performances/public/data/admin-reference.js'}
STATIC_METADATA = ['assets/direct/guide.pdf', 'assets/public/livepalmes-public-home.css',
    'assets/public/livepalmes-public-shell.js', 'assets/public/livepalmes-trophy-table.js',
    'assets/public/livepalmes-trophy.css', 'bibliotheque.html', 'calendrier.html', 'competition.html',
    'conditions-utilisation.html', 'confidentialite.html', 'direct-guide.html', 'index.html',
    'medailles.html', 'mentions-legales.html', 'pdf.html', 'performances/construction.html',
    'performances/damien-hebert.html', 'performances/index.html', 'performances/mpf.html',
    'performances/nageur.html', 'performances/public/import-competitions.js', 'performances/records.html',
    'performances/tops.html', 'public.html', 'resultat-pdf.html', 'resultats.html', 'series-pdf.html',
    'series-public.html']
CONTRACTS = [
    '20261029-nap-account-release-contract.json', '20261115-production-public-privacy-contract.json',
    '20261111-direct-date-archive-contract.json', '20261112-direct-reliability-contract.json',
    '20261113-direct-realtime-contract.json', '20261109-direct-bureau-layout-contract.json',
    '20261110-direct-access-contract.json', '20261110-direct-public-sessions-contract.json',
    '20261110-direct-participations-contract.json', '20261110-direct-import-completeness-contract.json',
    '20261012-production-blocked-attempt.json',
    '20261024-grouped-backend-contract.json', '20261024-grouped-mail-scope-correction.json',
    '20261111-production-reference-cleanup-contract.json', '20261112-production-direct-reliability-contract.json',
    '20261113-production-direct-realtime-observed-contract.json',
    '20261112-production-public-navigation-touch-contract.json',
    '20261101-validated-portal-contract.json', '20261101-backend-isolation-contract.json',
    '20261028-architecture-retained-contract.json', '20261108-production-validated-contract.json',
    '20261109-direct-console-audit-contract.json', '20261110-club-reference-cleanup-contract.json',
    '20261110-club-reference-recovery-contract.json', '20261111-swimmer-reference-cleanup-contract.json',
    '20261111-reference-migration-cleanup-contract.json', '20261111-public-navigation-contract.json',
    '20261112-public-navigation-touch-contract.json', '20261110-production-validated-contract.json',
    '20261111-public-navigation-direct-production-contract.json',
    '20261109-import-resolution-contract.json', '20261108-test-mail-sources-contract.json',
    '20261108-competition-mail-contacts-contract.json', '20261108-competition-deadline-reminder-contract.json',
    '20261108-txt-officials-contract.json', '20261108-competition-contacts-three-contract.json',
    '20261108-txt-official-dates-contract.json',
]


def git(root, *args, data=None):
    return subprocess.check_output(['git', *args], cwd=root, input=data)


def rows(root, commit):
    return git(root, 'ls-tree', '-r', commit, '--', *INPUTS)


def prepare(original, rewritten):
    mapping = dict(line.split() for line in (rewritten/'filter-repo/commit-map').read_text().splitlines()[1:])
    texts = [p.read_text(encoding='utf-8') for p in (ROOT/'tests').glob('*') if p.suffix in {'.js', '.py'}]
    for name in ['docs/releases/backend-isolation-progress.json', 'tools/direct-production-policy.py',
                 'tools/test-static-cache-policy.py'] + ['.github/releases/evidence/'+n for n in CONTRACTS]:
        texts.append((ROOT/name).read_text(encoding='utf-8'))
    candidates = sorted(set(re.findall(r'(?<![0-9a-f])[0-9a-f]{40}(?![0-9a-f])', '\n'.join(texts))))
    types = git(original, 'cat-file', '--batch-check=%(objecttype)', data=('\n'.join(candidates)+'\n').encode()).decode().splitlines()
    commits = [c for c,t in zip(candidates,types) if t == 'commit' and c in mapping]
    if not 1 <= len(commits) <= 120:
        raise ValueError('Unbounded historical test inputs')
    contracts = {name:json.loads((ROOT/'.github/releases/evidence'/name).read_text(encoding='utf-8')) for name in CONTRACTS}
    metadata_paths = sorted(set(contracts['20261110-production-validated-contract.json']['retiredBlobs']) | set(STATIC_METADATA))
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
        meta = git(original,'ls-tree','-r',commit,'--',*metadata_paths).decode().splitlines()
        cleaned_meta = git(rewritten,'ls-tree','-r',mapping[commit],'--',*metadata_paths).decode().splitlines()
        if meta != cleaned_meta:raise ValueError('Additional metadata changed unexpectedly')
        result[commit] = {'rewritten':mapping[commit], 'rows':before.decode().splitlines(),
                          'sourceTree':git(original,'rev-parse',commit+'^{tree}').decode().strip(),
                          'cleanTree':git(rewritten,'rev-parse',mapping[commit]+'^{tree}').decode().strip(),
                          'metadataRows':meta,
                          'cleanRowsSha256':hashlib.sha256(after).hexdigest(), 'metadataOnly':sorted(removed)}
    diffs = {}
    for name in ['20261110-production-validated-contract.json','20261111-public-navigation-direct-production-contract.json',
                 '20261111-production-reference-cleanup-contract.json','20261112-production-direct-reliability-contract.json',
                 '20261113-production-direct-realtime-observed-contract.json','20261112-production-public-navigation-touch-contract.json']:
        c=contracts[name];a,b=c['productionCommit'],c['candidate']
        if a not in result or b not in result:raise ValueError('Incomplete historical diff fixture')
        paths=git(original,'diff','--name-only','--no-renames',a,b).decode().splitlines()
        if len(paths)>500 or any(re.search(r'\d{4}[-/]\d{2}[-/]\d{2}|%7[cC]|\|',p) for p in paths):
            raise ValueError('Historical diff path needs private qualification')
        diffs[a+':'+b]=paths
    return {'schema':1, 'kind':'historical-test-inputs-only', 'scope':INPUTS, 'commits':result,
            'diffs':diffs, 'metadataPaths':metadata_paths}


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['original','rewritten','output']:p.add_argument('--'+name,type=Path,required=True)
    args=p.parse_args()
    value=prepare(args.original.resolve(),args.rewritten.resolve())
    raw=(json.dumps(value,sort_keys=True,indent=2)+'\n').encode()
    args.output.write_bytes(raw)
    print(json.dumps({'commits':len(value['commits']),'sha256':hashlib.sha256(raw).hexdigest()}))
