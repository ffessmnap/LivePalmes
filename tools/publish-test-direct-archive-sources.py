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
publisher.CONTRACT_SHA256 = 'f31c1c47970782b58f6ab13f695a5f9020c03055bebf1367d4de6f9cdaed9e89'

if __name__ == '__main__':
    publisher.main(*sys.argv[1:])
