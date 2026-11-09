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
publisher.CONTRACT_SHA256 = 'eb3f976b9273465a409ff7eb57a6f50615ee35400db46b8374c3aaaeae2d4e8c'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
