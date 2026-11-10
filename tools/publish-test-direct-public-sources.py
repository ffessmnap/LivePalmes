"""Closed public sessions release; preserve the original audit contract and all its guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_public_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_public_sessions'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261110-direct-public-sessions-contract.json'
publisher.CONTRACT_SHA256 = 'c0fc589b7792d9096ca801db85eb00fd2dca3453b0be2088b6214492e7ff17be'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
