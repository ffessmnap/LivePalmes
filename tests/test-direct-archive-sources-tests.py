"""Replay the complete source-only guards against the closed archive release."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


archive = load('direct_archive_contract', 'tools/publish-test-direct-archive-sources.py')
suite = load('direct_archive_source_guard_suite', 'tests/test-direct-sources-tests.py')
suite.p = archive.publisher
workflow = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text(encoding='utf8')
assert "inputs.release == 'direct_date_archive' && 'publish-test-direct-archive-sources.py'" in workflow
assert "inputs.release == 'direct_date_archive' && (inputs.identity_only || inputs.recover_models)" in workflow
assert archive.publisher.RELEASE == 'direct_date_archive'
assert set(archive.publisher.contract()['fingerprints']) == {'manageLivePalmesDirect', 'readNapPublicSwimmer'}

if __name__ == '__main__':
    unittest.main(module=suite)
