"""Exercise the exact TOP TEST contract and its negative cases without cloud access."""
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
publisher = runpy.run_path(str(ROOT / 'tools/publish-test-standard-sources.py'))
closed = publisher['load']('top-city-test-policy.py')
policy = publisher['policy']
contract = closed.contract()
baseline = contract['baselineCandidate']
application = contract['applicationCommit']
candidate = 'a' * 40


def request():
    return {key: contract[key] for key in ('baselineRun', 'baselineHosting', 'baselineCandidate', 'approval')} | {
        'schema': 2, 'functions': ['readNapPublicSwimmer'], 'candidate': candidate,
        closed.OPTION: closed.CONTRACT_SHA256,
    }


def git_fixture(*args):
    if args[0] == 'merge-base':
        assert args == ('merge-base', '--is-ancestor', application, candidate)
        return ''
    if args[0] == 'diff':
        return 'tools/top-city-test-policy.py'
    assert args[0] == 'rev-parse'
    sha, path = args[1].split(':')
    if path == closed.INDEX:
        return contract['indexBefore'] if sha == baseline else contract['indexAfter']
    return 'identical'


class TopCityTests(unittest.TestCase):
    def test_manifest(self):
        original = publisher['load']
        with patch.object(closed, 'git', side_effect=git_fixture), patch.dict(publisher['validate'].__globals__, {
            'load': lambda name: closed if name == 'top-city-test-policy.py' else original(name)
        }):
            self.assertEqual(publisher['validate'](request()), request())
            for change in [{'schema': 1}, {closed.OPTION: 'wrong'}, {'approval': {}},
                           {'baselineRun': 1}, {'baselineCandidate': candidate}, {'baselineHosting': 'sites/livepalmes/versions/test'},
                           {'functions': ['exportNapPublicPage']}, {'importSbResults': 'another'}]:
                with self.subTest(change=change), self.assertRaises(ValueError):
                    publisher['validate'](request() | change)

    def test_sources_and_refusals(self):
        hashes = contract['fingerprints'] | {'other': 'unchanged'}
        def check(git=git_fixture, paths=(closed.INDEX,), calculate=lambda sha: hashes):
            closed.check_sources(request(), paths, policy, git, calculate)
        check()
        for ref in (baseline + ':' + closed.INDEX, candidate + ':' + closed.INDEX,
                    application + ':firebase.json', candidate + ':functions/package.json'):
            with self.subTest(ref=ref), self.assertRaises(ValueError):
                check(git=lambda *args: 'different' if args == ('rev-parse', ref) else git_fixture(*args))
        with self.assertRaises(ValueError):
            check(git=lambda *args: 'portail.html' if args[0] == 'diff' else git_fixture(*args))
        with self.assertRaises(ValueError):
            check(paths=('migrations/other.sql',))
        with self.assertRaises(ValueError):
            check(calculate=lambda sha: hashes | {'readNapPublicSwimmer': 'unexpected'})
        with self.assertRaises(ValueError):
            check(calculate=lambda sha: hashes | {'other': sha})
        with self.assertRaises(ValueError):
            policy.source_paths(baseline, candidate, [closed.INDEX], git_fixture)


if __name__ == '__main__':
    unittest.main()
