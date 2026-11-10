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
publisher.CONTRACT_SHA256 = '5a4cb507f2d8d81a1e6df3968e96d35c61046b37cad7e8561afe3afbbbd447cf'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
