"""Closed combined swimmer and migration cleanup; reuse the immutable source publisher without binding changes."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reference_migration_cleanup_primitives', ROOT / 'tools/publish-test-reference-cleanup-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'reference_migration_cleanup'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261111-reference-migration-cleanup-contract.json'
publisher.CONTRACT_SHA256 = 'e4fbfe209f0ae4911bc50cd42d9d345dcd3ee4e8e0b3771b9fb93a216fd23473'
publisher.BINDING_FUNCTIONS = frozenset()
publisher.publisher.DIGEST = publisher.CONTRACT_SHA256
# Validate the new contract independently of the historical club contract.
publisher.require(set(publisher.contract()['allowedFunctions']) == publisher.ALLOWED,
                  'Inventaire nageurs different du perimetre installe')

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
