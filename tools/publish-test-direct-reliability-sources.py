"""Closed Direct reliability TEST release; unchanged source/label guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_reliability_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_reliability'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261112-direct-reliability-contract.json'
publisher.CONTRACT_SHA256 = '4685910b4833d878f531c0b767005b351087a7b26110f029c1fd10b7493876b8'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
