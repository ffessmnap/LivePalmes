"""Second closed Direct release; preserve the original audit contract and all its guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_layout_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_bureau_layout'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261109-direct-bureau-layout-contract.json'
publisher.CONTRACT_SHA256 = '0c7329c588a4e59f7600f5769f2ce7910720db0899f0b3b2dff71c1cb1a68202'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
