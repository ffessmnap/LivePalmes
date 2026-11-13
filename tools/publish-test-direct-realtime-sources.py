"""Closed Direct realtime TEST release; unchanged source/label guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_realtime_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_realtime'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261113-direct-realtime-contract.json'
publisher.CONTRACT_SHA256 = '06decd16ae790a1b4afee302b7b41fe8cd4c8bde2d623ff98014c0f458cd601d'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
