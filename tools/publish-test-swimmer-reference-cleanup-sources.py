"""Closed swimmer cleanup; reuse the immutable source publisher without binding changes."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('swimmer_cleanup_primitives', ROOT / 'tools/publish-test-reference-cleanup-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'swimmer_reference_cleanup'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261111-swimmer-reference-cleanup-contract.json'
publisher.CONTRACT_SHA256 = 'e58d05d0246a85dcb22eaded27adfb4eaa656e4cb78fe4424c5c7ed3d8bb2b53'
publisher.BINDING_FUNCTIONS = frozenset()
publisher.publisher.DIGEST = publisher.CONTRACT_SHA256
# Validate the new contract independently of the historical club contract.
publisher.require(set(publisher.contract()['allowedFunctions']) == publisher.ALLOWED,
                  'Inventaire nageurs different du perimetre installe')

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
