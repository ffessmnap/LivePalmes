"""Negative gates for the approved TEST cache delta; no network or Firebase."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = load('static_cache_policy', 'test-static-cache-policy.py')
cycle = load('static_cache_cycle', 'release-cycle.py')
before = json.loads(subprocess.check_output(['git', 'show', policy.BASELINE + ':firebase.json'], cwd=ROOT, text=True))
after = copy.deepcopy(before)
headers = after['hosting']['headers']
position = next(i for i, item in enumerate(headers) if item['source'] == '/logo-livepalmes.png')
sources = ['/styles.css', '/logo-ffessm-nage-avec-palmes.png', '/sifflet-ja.png',
           '/assets/public/**/*.js', '/assets/portal/**/*.js', '/assets/portal/styles/*.css']
headers[position:position] = [dict(source=source, headers=[dict(key='Cache-Control', value='public, max-age=86400, must-revalidate')]) for source in sources]
for item in headers:
    if item['source'] in ['/assets/pages/resultats.js', '/assets/pages/series-public.js']:
        item['headers'][0]['value'] = 'public, max-age=86400, must-revalidate'


class StaticCacheTests(unittest.TestCase):
    def validate(self, first=before, second=after, project='livepalmes-test', hosting_only=True, automatic=''):
        return policy.validate_sources(first, second, project, hosting_only, automatic)

    def test_exact_configuration_is_accepted_only_on_manual_test_hosting(self):
        self.validate()
        for values in [dict(project='livepalmes'), dict(project='unknown'), dict(hosting_only=False), dict(automatic='a' * 40)]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                self.validate(**values)

    def test_other_configuration_changes_are_refused(self):
        for key in ['firestore', 'functions', 'hosting']:
            changed = copy.deepcopy(after)
            del changed[key]
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.validate(second=changed)
        for field, value in [('public', 'other'), ('rewrites', []), ('ignore', []), ('redirects', [])]:
            changed = copy.deepcopy(after)
            changed['hosting'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.validate(second=changed)

    def test_broader_cache_missing_rule_or_different_baseline_are_refused(self):
        for field, value in [('source', '/**'), ('headers', [dict(key='Cache-Control', value='public, max-age=31536000')])]:
            changed = copy.deepcopy(after)
            changed['hosting']['headers'][position][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.validate(second=changed)
        changed = copy.deepcopy(after)
        changed['hosting']['headers'].pop(position)
        with self.assertRaises(ValueError):
            self.validate(second=changed)
        changed = copy.deepcopy(before)
        changed['hosting']['ignore'].append('unexpected/**')
        with self.assertRaises(ValueError):
            self.validate(first=changed)

    def test_ordinary_and_production_configuration_refusal_is_preserved(self):
        with self.assertRaisesRegex(ValueError, 'Perimetre specifique'):
            cycle.classify(['firebase.json'])
        with self.assertRaisesRegex(ValueError, 'Perimetre specifique'):
            cycle.classify_test(['firebase.json'])

    def test_test_classification_preserves_backend_and_other_sensitive_gates(self):
        environment = dict(BASE_SHA=policy.BASELINE, TARGET_FIREBASE_PROJECT='livepalmes-test', STATIC_CACHE_HOSTING_MODE='true', STATIC_CACHE_AUTOMATIC_CANDIDATE='')
        def git(*args):
            return json.dumps(after if args[-1] == 'HEAD:firebase.json' else before)
        with patch.dict(os.environ, environment), patch.object(cycle, 'git', side_effect=git):
            application, backend = cycle.classify_test(['firebase.json', 'functions/example.js'], approved_static_asset_cache=True)
            self.assertEqual(application, ['functions/example.js'])
            self.assertTrue(backend)
            with self.assertRaisesRegex(ValueError, 'Perimetre specifique'):
                cycle.classify_test(['firebase.json', 'firestore.indexes.json'], approved_static_asset_cache=True)


if __name__ == '__main__':
    unittest.main()
