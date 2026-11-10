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
publisher.CONTRACT_SHA256 = 'e862512160dff2567ec1fd5ff2ffeece93ea396c09dfb9e172e33db37cbddea6'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
