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
publisher.CONTRACT_SHA256 = 'b50f98e900cc428a1c604e866074620219f4ae06426438160d11d507c92e0f31'
publisher.BINDING_FUNCTIONS = frozenset()
publisher.publisher.DIGEST = publisher.CONTRACT_SHA256
# Validate the new contract independently of the historical club contract.
publisher.require(set(publisher.contract()['allowedFunctions']) == publisher.ALLOWED,
                  'Inventaire nageurs different du perimetre installe')

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
