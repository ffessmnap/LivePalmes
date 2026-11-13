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
publisher.CONTRACT_SHA256 = '360aee4c3d026e4da7f959391b7ac994173497f2189193595b11fe668cd3c0db'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
