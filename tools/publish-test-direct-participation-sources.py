"""Closed participation release; preserve the original audit contract and all its guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_public_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_participations'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261110-direct-participations-contract.json'
publisher.CONTRACT_SHA256 = '2504f6c527885eca7d308fe62f0486354591d30a360c3228acda415a844f6b1a'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
