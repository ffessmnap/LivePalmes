"""Closed public navigation TEST release: existing reader source only, unchanged guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('public_navigation_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'public_navigation'
publisher.ALLOWED = frozenset({'readNapPublicSwimmer'})
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261111-public-navigation-contract.json'
publisher.CONTRACT_SHA256 = 'e5e03632e7b67fba313ab73033984b04c3e3b1e85c54d401d8a428e1dc4c2475'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
