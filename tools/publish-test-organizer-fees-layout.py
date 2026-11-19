"""Closed TEST delivery for the revised organizer PDF, using the same verified transport."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'organizer_fees_layout'
# A private policy instance keeps the original release and its receipt reader independent.
spec = importlib.util.spec_from_file_location('organizer_fee_layout_policy', ROOT/'tools/publish-test-organizer-fees.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
policy.RELEASE = RELEASE
policy.CONTRACT = ROOT/'.github/releases/evidence/20261119-test-organizer-fees-layout-contract.json'
policy.CONTRACT_SHA256 = '0636dd5e666b6579615287c413a7d7f30a41c47961e632b821285f0fb0e58740'
_read_contract = policy.contract


def contract(release=RELEASE):
    return _read_contract(release)


policy.contract = policy.publisher.contract = contract
policy.ALLOWED = policy.publisher.ALLOWED = frozenset(contract()['allowedFunctions'])
trusted_revisions = policy.trusted_revisions

if __name__ == '__main__':
    policy.main(*sys.argv[1:])
