"""Offline A1 contract boundaries; no Firebase access or business invocation."""
from copy import deepcopy
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), ROOT / 'tools' / name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


a1 = load('a1-public-privacy-test-policy.py')
standard = load('publish-test-standard-sources.py')
cycle = load('release-cycle.py')


class A1TestPolicy(unittest.TestCase):
    def setUp(self):
        self.c = a1.contract()
        self.request = {key: deepcopy(self.c[key]) for key in ['baselineRun', 'baselineCandidate', 'baselineHosting', 'approval']}
        self.request.update(schema=1, candidate=self.c['applicationCommit'], functions=self.c['allowedFunctions'],
                            a1PublicPrivacy=a1.CONTRACT_SHA256)
        self.paths = a1.git('diff', '--name-only', '--no-renames', self.c['baselineCandidate'], self.c['applicationCommit']).splitlines()

    def test_exact_application_manifest_and_retirement_are_accepted(self):
        self.assertEqual(standard.validate(self.request), self.request)
        remaining = a1.source_paths(self.request, self.paths, standard.policy.PROTECTED)
        self.assertNotIn('performances/public/data/admin-reference.js', remaining)
        self.assertIn('functions/index.js', remaining)

    def test_other_manifest_function_approval_or_baseline_are_refused(self):
        for changed in [{'functions': ['manageLivePalmesDirect']}, {'a1PublicPrivacy': '0' * 64},
                        {'baselineRun': 1}, {'baselineCandidate': 'f' * 40}, {'baselineHosting': 'sites/livepalmes-test/versions/other'},
                        {'approval': {**self.c['approval'], 'text': 'Different scope'}}, {'unexpected': True}]:
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                standard.validate({**self.request, **changed})

    def test_other_application_or_data_change_is_refused(self):
        def modified(*args):
            if args[:2] == ('diff', '--name-only'):
                return 'assets/unapproved.js'
            return a1.git(*args)
        with self.assertRaisesRegex(ValueError, 'apres gel'):
            a1.candidate(self.c['applicationCommit'], modified)
        with self.assertRaisesRegex(ValueError, 'Autre donnee'):
            a1.source_paths(self.request, self.paths + ['performances/public/data/other.json'], standard.policy.PROTECTED)

    def test_retired_file_must_have_the_exact_origin_and_be_absent(self):
        name = next(iter(self.c['retiredFiles']))
        for bad_origin in [True, False]:
            def changed(*args):
                if args == ('rev-parse', self.c['baseCommit'] + ':' + name) and bad_origin:
                    return '0' * 40
                if args == ('ls-tree', '--name-only', self.c['applicationCommit'], '--', name) and not bad_origin:
                    return name
                return a1.git(*args)
            with self.assertRaises(ValueError):
                a1.retired_paths(self.paths, self.c['applicationCommit'], changed, 'livepalmes-test')
        with self.assertRaises(ValueError):
            a1.retired_paths([], self.c['applicationCommit'], project='livepalmes-test')

    def test_only_test_opt_in_is_allowed_and_production_stays_closed(self):
        with self.assertRaises(ValueError):
            a1.retired_paths(self.paths, self.c['applicationCommit'], project='livepalmes')
        with self.assertRaises(ValueError):
            cycle.classify(self.paths)
        with self.assertRaises(ValueError):
            cycle.classify_test(self.paths)
        def fixed_candidate(*args):
            return self.c['applicationCommit'] if args == ('rev-parse', 'HEAD') else a1.git(*args)
        with patch.dict(os.environ, {'TARGET_FIREBASE_PROJECT': 'livepalmes-test', 'A1_PRIVACY_HOSTING_MODE': 'true', 'A1_PRIVACY_AUTOMATIC_CANDIDATE': ''}), patch.object(cycle, 'git', fixed_candidate):
            application, backend = cycle.classify_test(self.paths, approved_a1_public_privacy=True)
        self.assertTrue(backend)
        self.assertIn('functions/index.js', application)
        self.assertNotIn('performances/public/data/admin-reference.js', application)
        with self.assertRaises(ValueError):
            standard.policy.source_paths(self.c['baselineCandidate'], self.c['applicationCommit'], self.paths, a1.git)
        for env in [{'A1_PRIVACY_HOSTING_MODE': 'false'}, {'A1_PRIVACY_HOSTING_MODE': 'true', 'A1_PRIVACY_AUTOMATIC_CANDIDATE': 'f' * 40}]:
            with patch.dict(os.environ, env), self.assertRaises(ValueError):
                cycle.classify_test(self.paths, approved_a1_public_privacy=True)

    def test_automatic_test_keeps_its_existing_manual_boundary(self):
        automatic = load('automatic-test-publication.py')
        with self.assertRaises(ValueError):
            automatic.ordinary_paths(self.paths)

    def test_coordination_repair_allows_only_its_exact_two_blobs(self):
        self.assertEqual(set(a1.COORDINATION_REPAIR), {'tools/coordinate-test-publication.py',
                                                     'tests/test-publication-coordination-tests.py'})
        def repair(*args):
            if args[:2] == ('diff', '--name-only'):
                return '\n'.join(a1.COORDINATION_REPAIR)
            if args[0] == 'rev-parse':
                name = args[1].split(':', 1)[1]
                return a1.COORDINATION_REPAIR[name]
            return a1.git(*args)
        a1.candidate(self.c['applicationCommit'], repair)
        def changed(*args):
            return '0' * 40 if args[0] == 'rev-parse' else repair(*args)
        with self.assertRaisesRegex(ValueError, 'correctif exact'):
            a1.candidate(self.c['applicationCommit'], changed)


if __name__ == '__main__':
    unittest.main()
