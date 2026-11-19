"""Closed A6 TEST source lot. Require the native notification index before preparing or publishing."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'a6_reliability'
spec = importlib.util.spec_from_file_location('a6_test_policy', ROOT/'tools/publish-test-organizer-fees.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
policy.RELEASE = RELEASE
policy.CONTRACT = ROOT/'.github/releases/evidence/20261119-test-a6-reliability.json'
policy.CONTRACT_SHA256 = '18c7728f6d591a17795a122db9c5eae8bbe92309a5ba15c00ecc92b6a383b3a0'
_read_contract = policy.contract


def contract(release=RELEASE):
    return _read_contract(release)


policy.contract = policy.publisher.contract = contract
policy.ALLOWED = policy.publisher.ALLOWED = frozenset(contract()['allowedFunctions'])
trusted_revisions = policy.trusted_revisions

def require_ready_index():
    import json
    rows = json.loads(policy.cycle.run([
        'gcloud', 'firestore', 'indexes', 'composite', 'list',
        '--project=livepalmes-test', '--format=json', '--quiet']))
    policy.require(any(ready_index(row) for row in rows), 'Index de notifications NAP TEST absent ou non prêt')


def ready_index(row):
    expected = [('source', 'ASCENDING'), ('runAt', 'ASCENDING'), ('__name__', 'ASCENDING')]
    prefix = 'projects/livepalmes-test/databases/(default)/collectionGroups/engagementClosureQueue/indexes/'
    return (row.get('name', '').startswith(prefix) and row.get('queryScope') == 'COLLECTION'
            and row.get('state') == 'READY'
            and [(f.get('fieldPath'), f.get('order')) for f in row.get('fields', [])] == expected)


def verify_hosting_receipt(run_id, paths, env):
    import re
    from tempfile import TemporaryDirectory
    api = policy.cycle
    sha = api.git('rev-parse', 'HEAD')
    base = env.get('BASE_SHA', '')
    index_file = 'firestore.indexes.json'
    policy.require(env.get('GITHUB_WORKFLOW_REF') == policy.REPOSITORY +
                   '/.github/workflows/livepalmes-test-common.yml@refs/heads/main'
                   and env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT') == '1'
                   and env.get('TARGET_FIREBASE_PROJECT') == policy.PROJECT and env.get('A6_HOSTING_MODE') == 'true'
                   and not env.get('A6_AUTOMATIC_CANDIDATE') and sha == env.get('GITHUB_SHA')
                   and re.fullmatch('[a-f0-9]{40}', base), 'Contexte Hosting TEST A6 invalide')
    entry = contract()
    api.git('merge-base', '--is-ancestor', entry['applicationCommit'], sha)
    delta = api.git('diff', '--name-only', '--no-renames', entry['applicationCommit'], sha).splitlines()
    policy.require(set(delta) <= set(entry['toolingPaths']) and index_file in paths
                   and api.git('rev-parse', base + ':' + index_file) == '78f51db94f27b33e9865795425f9c3a193372bd4'
                   and api.git('rev-parse', sha + ':' + index_file) == '42b18c45db9f8335334c4c2f33cebf13ec4e4173',
                   'Diff ou déclaration hors du lot A6')
    with TemporaryDirectory() as directory:
        info = api.artifact(run_id, 'a6-notification-index-proof', Path(directory),
                            '.github/workflows/a6-test-notification-index.yml')
        receipt = api.read(Path(directory) / 'a6-notification-index-proof.json')
    policy.require(info['head_sha'] == sha and info['event'] == 'workflow_dispatch'
                   and receipt['project'] == policy.PROJECT and receipt['commit'] == sha
                   and len(receipt['indexes']) == 1 and ready_index(receipt['indexes'][0]), 'Reçu index TEST hors contrat')


if __name__ == '__main__':
    if sys.argv[1] in {'prepare', 'deploy'}:
        require_ready_index()
    policy.main(*sys.argv[1:])
