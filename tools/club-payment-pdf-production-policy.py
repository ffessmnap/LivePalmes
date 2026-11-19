"""Immutable source-only release of the clickable club payment link."""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# The isolated module uses the common source, inventory, archive and mail checks.
spec = importlib.util.spec_from_file_location('club_payment_sources', ROOT / 'tools/organizer-fees-production-policy.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
OPTION = policy.OPTION = 'clubPaymentPdfRelease'
KIND = policy.KIND = 'club-payment-pdf-existing-sources-v1'
DIGEST = policy.DIGEST = 'bdb9dfb123255714af4a11b103d35dbd19d175d8c7df5fb83f0f8a907411308a'
policy.CONTRACT = ROOT / '.github/releases/evidence/20261119-production-club-helloasso-pdf-contract.json'

contract, enabled, approved, paths = policy.contract, policy.enabled, policy.approved, policy.paths
freeze, manifest, validate_manifest = policy.freeze, policy.manifest, policy.validate_manifest
require, digest, configuration = policy.require, policy.digest, policy.configuration
initial, assert_retained, assert_selected = policy.initial, policy.assert_retained, policy.assert_selected


def state_check(backup, destination, success):
    return policy.state_check(backup, destination, success, contract_field='clubPaymentPdfContractSha256')


def guard(directory, after=False):
    require(not (Path(directory) / 'previous').exists(), 'Reprise automatique du PDF club interdite')
    policy.guard(directory, after)


def restore_witness(directory, source):
    raise ValueError('Reprise du PDF club soumise a un nouvel examen')
