"""Replay the full source-only guard suite against the new closed Direct contract."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

layout = load('direct_access_contract', 'tools/publish-test-direct-access-sources.py')
suite = load('direct_source_guard_suite', 'tests/test-direct-sources-tests.py')
suite.p = layout.publisher
workflow = (ROOT / '.github/workflows/livepalmes-test-mail-sources.yml').read_text(encoding='utf8')
assert "inputs.release == 'direct_access' && 'publish-test-direct-access-sources.py'" in workflow
assert "inputs.release == 'direct_access' && (inputs.identity_only || inputs.recover_models)" in workflow
assert layout.publisher.RELEASE == 'direct_access'
assert set(layout.publisher.contract()['fingerprints']) == {'manageLivePalmesDirect', 'readNapPublicSwimmer'}

if __name__ == '__main__':
    unittest.main(module=suite)
