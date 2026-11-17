"""Closed HTTP configuration delta and orchestration refusals; all services fictitious."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

policy = load('a3_http_policy', 'test-http-headers-policy.py')
cycle = load('a3_http_cycle', 'release-cycle.py')
coordinate = load('a3_http_coordinate', 'coordinate-test-publication.py')
before = json.loads((ROOT / 'tests/fixtures/firebase-a3-http-before.json').read_text(encoding='utf-8'))
routes = ['/', '/index.html', '/direct.html', '/direct-admin.html', '/direct-consoles.html']
after = copy.deepcopy(before)
after['hosting']['headers'][0:0] = [dict(source=route, headers=[dict(key='X-Content-Type-Options', value='nosniff'), dict(key='Referrer-Policy', value='strict-origin-when-cross-origin')]) for route in routes]

class HttpHeadersTests(unittest.TestCase):
    def test_exact_delta_and_complete_existing_configuration(self):
        policy.validate_sources(before, after, 'livepalmes-test', True, '')
        self.assertEqual(policy.digest(before), policy.BEFORE)
        restored = copy.deepcopy(after)
        self.assertEqual([x['source'] for x in restored['hosting']['headers'][:5]], routes)
        del restored['hosting']['headers'][:5]
        self.assertEqual(restored, before)

    def test_wrong_project_automatic_and_non_hosting_refused(self):
        for project, hosting, automatic in [('livepalmes', True, ''), ('unknown', True, ''), ('livepalmes-test', False, ''), ('livepalmes-test', True, 'a' * 40)]:
            with self.subTest(project=project, hosting=hosting, automatic=automatic), self.assertRaises(ValueError):
                policy.validate_sources(before, after, project, hosting, automatic)

    def test_extra_route_header_csp_and_cache_refused(self):
        mutations = [lambda h: h[0].update(source='/**'), lambda h: h.pop(0),
                     lambda h: h[0]['headers'].append(dict(key='Content-Security-Policy', value="default-src 'none'")),
                     lambda h: h[0]['headers'][0].update(value='wrong'),
                     lambda h: h.append(dict(source='/other.html', headers=[]))]
        for mutate in mutations:
            changed = copy.deepcopy(after); mutate(changed['hosting']['headers'])
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                policy.validate_sources(before, changed, 'livepalmes-test', True, '')
        for field in ['rewrites', 'redirects', 'ignore']:
            changed = copy.deepcopy(after); changed['hosting'][field] = []
            with self.subTest(field=field), self.assertRaises(ValueError):
                policy.validate_sources(before, changed, 'livepalmes-test', True, '')
        for field in ['functions', 'firestore']:
            changed = copy.deepcopy(after); changed[field] = {}
            with self.subTest(field=field), self.assertRaises(ValueError):
                policy.validate_sources(before, changed, 'livepalmes-test', True, '')

    def test_different_baseline_refused(self):
        changed = copy.deepcopy(before); changed['hosting']['ignore'].append('other/**')
        with self.assertRaises(ValueError):
            policy.validate_sources(changed, after, 'livepalmes-test', True, '')

    def test_default_and_production_configuration_gates_unchanged(self):
        for classifier in [cycle.classify, cycle.classify_test]:
            with self.assertRaisesRegex(ValueError, 'Perimetre specifique'):
                classifier(['firebase.json'])

    def test_classifier_exact_manual_context_and_rejections(self):
        environment = dict(BASE_SHA=policy.BASELINE, TARGET_FIREBASE_PROJECT='livepalmes-test', A3_HTTP_HOSTING_MODE='true', A3_HTTP_AUTOMATIC_CANDIDATE='')
        def git(*args):
            return json.dumps(after if args[-1] == 'HEAD:firebase.json' else before)
        with patch.dict(os.environ, environment), patch.object(cycle, 'git', side_effect=git):
            self.assertEqual(cycle.classify_test(['firebase.json', 'docs/audit-a3-http.md'], approved_a3_http_headers=True), ([], False))
            for paths in [['firebase.json', 'assets/unrelated.js'], ['firebase.json', 'functions/index.js'], ['firebase.json', 'firestore.rules']]:
                with self.subTest(paths=paths), self.assertRaises(ValueError):
                    cycle.classify_test(paths, approved_a3_http_headers=True)
            with self.assertRaises(ValueError):
                cycle.classify_test(['firebase.json'], approved_a3_http_headers=True, approved_static_asset_cache=True)

    def test_coordinator_no_followup_new_main_or_other_authorization(self):
        inputs = dict(production_commit='a'*40, hosting_only=True, approved_a3_http_headers=True)
        with patch.object(coordinate, 'latest', return_value='b'*40), patch.object(coordinate, 'gh', side_effect=AssertionError('No dispatch')):
            self.assertTrue(coordinate.coordinate('prepare', 'fixture/repo', 'b'*40, inputs)['publish'])
            self.assertFalse(coordinate.coordinate('followup', 'fixture/repo', 'b'*40, inputs)['queued'])
            self.assertFalse(coordinate.coordinate('prepare', 'fixture/repo', 'c'*40, inputs)['publish'])
            for extra in [dict(automatic_candidate='b'*40), dict(hosting_only=False), dict(approved_home_routing=True), dict(dtn_extension=True)]:
                with self.subTest(extra=extra), self.assertRaises(ValueError):
                    coordinate.coordinate('prepare', 'fixture/repo', 'b'*40, dict(inputs, **extra))

if __name__ == '__main__':
    unittest.main()
