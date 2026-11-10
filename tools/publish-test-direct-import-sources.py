"""Closed import completeness release; preserve the original audit contract and all its guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_public_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_import_completeness'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261110-direct-import-completeness-contract.json'
publisher.CONTRACT_SHA256 = '3321488c45008161e6e71272c97e028156074878bde7e2b12b7fe858cd56003d'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
