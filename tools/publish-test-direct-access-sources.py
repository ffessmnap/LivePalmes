"""Closed Direct access release; preserve the original audit contract and all its guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_access_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_access'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261110-direct-access-contract.json'
publisher.CONTRACT_SHA256 = '67efe0c82ead59956eac34c29b9aee39af3dcd0dee93e82b6e27917bbfc7a6c7'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
