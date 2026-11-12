"""Run the bounded source-policy/dossier regression suites (no cloud access)."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
suite = unittest.TestSuite()
paths = sorted((ROOT/'tests').glob('release-acceleration-*-tests.py'))
if not 1 <= len(paths) <= 10:
    raise ValueError('Suites de publication absentes ou hors limite')
for path in paths:
    spec = importlib.util.spec_from_file_location(path.stem.replace('-', '_'), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    suite.addTests(unittest.defaultTestLoader.loadTestsFromModule(module))
if suite.countTestCases() == 0:
    raise ValueError('Aucun test de publication decouvert')
if __name__ == '__main__':
    with patch('socket.create_connection', side_effect=AssertionError('Network disabled in offline release regression')):
        raise SystemExit(not unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful())
