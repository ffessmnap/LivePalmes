"""Closed touch navigation TEST release: one reader source, unchanged guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('public_navigation_touch_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'public_navigation_touch'
publisher.ALLOWED = frozenset({'readNapPublicSwimmer'})
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261112-public-navigation-touch-contract.json'
publisher.CONTRACT_SHA256 = '6c8f28cbd396d19f2cc0d4173a32eb1b911b2a3cd1e2aa8a8f8cbceda782cdc2'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
