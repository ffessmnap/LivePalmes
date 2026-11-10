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
publisher.CONTRACT_SHA256 = 'b0862d52a01ff751bd2dfc319fcbe11f2edd931b246b84f2b7d148f5dc385a92'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
