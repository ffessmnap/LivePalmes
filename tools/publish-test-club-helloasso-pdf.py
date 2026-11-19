"""Exact TEST source lot for the payment link in club recap PDFs."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = 'club_helloasso_pdf'
spec = importlib.util.spec_from_file_location('club_payment_test_policy', ROOT/'tools/publish-test-organizer-fees.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
policy.RELEASE = RELEASE
policy.CONTRACT = ROOT/'.github/releases/evidence/20261119-test-club-helloasso-pdf.json'
policy.CONTRACT_SHA256 = '31e5984368caf5f3b7bab2094759bcbeb0100424102c56f9fefdfe9ea66f63c9'
_read_contract = policy.contract


def contract(release=RELEASE):
    return _read_contract(release)


policy.contract = policy.publisher.contract = contract
policy.ALLOWED = policy.publisher.ALLOWED = frozenset(contract()['allowedFunctions'])
trusted_revisions = policy.trusted_revisions

if __name__ == '__main__':
    policy.main(*sys.argv[1:])
