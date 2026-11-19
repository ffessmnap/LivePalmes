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
policy.CONTRACT_SHA256 = '44ad26c55106d7578e73a3eb674b220690debcec21e0a11cb54444949bc3e1a0'
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
    expected = [('source', 'ASCENDING'), ('runAt', 'ASCENDING'), ('__name__', 'ASCENDING')]
    policy.require(any('/collectionGroups/engagementClosureQueue/indexes/' in row.get('name', '')
                       and row.get('queryScope') == 'COLLECTION' and row.get('state') == 'READY'
                       and [(f.get('fieldPath'), f.get('order')) for f in row.get('fields', [])] == expected
                       for row in rows), 'Index de notifications NAP TEST absent ou non pret')


if __name__ == '__main__':
    if sys.argv[1] in {'prepare', 'deploy'}:
        require_ready_index()
    policy.main(*sys.argv[1:])
