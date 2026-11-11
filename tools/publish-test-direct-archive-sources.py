"""Closed date-based Direct archive TEST release; unchanged source/label guards."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('direct_archive_source_primitives', ROOT / 'tools/publish-test-direct-sources.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
publisher.RELEASE = 'direct_date_archive'
publisher.CONTRACT = ROOT / '.github/releases/evidence/20261111-direct-date-archive-contract.json'
publisher.CONTRACT_SHA256 = '66a4fd58fdf89b536b1bfb64bf7f9b6143a835451acffb093cd3e3f567860e62'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
