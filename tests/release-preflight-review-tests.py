"""Offline negative scenarios for bounded cleanup and retained backend proofs."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location('review_cycle', ROOT / 'tools/release-cycle.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def request(paths=None):
    return {'schema': 1, 'candidate': 'a'*40, 'productionCommit': 'b'*40,
            'productionHosting': 'sites/livepalmes/versions/example', 'testRun': 12,
            'changes': [{'title': 'Reviewed release', 'status': 'validated', 'validation': 'Explicit TEST validation',
                         'paths': paths or ['portail.html']}], 'excludedBackendReview': 'Retain reviewed packages',
            'excludedBackendEvidence': {'schema': 1, 'candidate': 'a'*40, 'productionRun': 34,
                'suite': 'retained-calendar-consumers-v1', 'functions': []}}


class ClassificationTests(unittest.TestCase):
    def test_large_diff_computes_ignore_once_and_preserves_coverage(self):
        paths = ['docs/row-'+str(n)+'.md' for n in range(11000)] + ['portail.html']
        with patch.object(m, 'ignored_top_paths', return_value=[]) as ignored:
            self.assertFalse(m.validate_request(request(), paths))
            ignored.assert_called_once_with(paths, 'a'*40)
        with patch.object(m, 'ignored_top_paths', return_value=[]), self.assertRaisesRegex(ValueError, 'sans validation'):
            m.validate_request(request(), paths + ['extra.html'])

    def cleanup_git(self, drift=False, replacement=False, dependent=False, unknown=False):
        header = {'source': '/'+m.RECORDS_STATIC_PATH, 'headers': [
            {'key': 'Cache-Control', 'value': 'public, max-age=300, stale-while-revalidate=86400'}]}
        before = {'hosting': {'public': '.', 'ignore': ['private/**'], 'headers': [header]}}
        after = {'hosting': {'public': '.', 'ignore': [] if drift else ['private/**'], 'headers': []}}
        exports = 'performances/public/data/performance-public/swimmers/a.json\nperformances/public/data/intranap-summary.js'
        def git(*args):
            if args[0] == 'ls-tree':
                if m.PUBLIC_EXPORT_CLEANUP_BASE in args:
                    return '' if unknown else exports
                return 'replacement' if replacement else ''
            if args[1] == m.RECORDS_CLEANUP_BASE+':firebase.json':
                return json.dumps(before)
            if args[1].endswith(':firebase.json'):
                return json.dumps(after if args[1].startswith('a'*40) else {**after, 'hosting': {**after['hosting'], 'ignore': ['private/**']}})
            return 'data/records-data.js' if dependent else 'public/reference.js'
        return git

    def cleanup_request(self):
        paths = ['firebase.json', m.RECORDS_STATIC_PATH, 'performances/public/data/intranap-summary.js',
                 'performances/public/data/performance-public/swimmers/a.json', 'portail.html']
        value = request(paths)
        value['productionStaticCleanup'] = {'records': True, 'publicExports': True, 'approval': 'Infra bounded cleanup'}
        return value, paths

    def test_exact_cleanup_allowed_only_by_request_not_global_classifier(self):
        value, paths = self.cleanup_request()
        with patch.object(m, 'git', side_effect=self.cleanup_git()):
            self.assertFalse(m.validate_request(value, paths))
        with self.assertRaises(ValueError): m.classify(paths)
        del value['productionStaticCleanup']
        with self.assertRaises(ValueError): m.validate_request(value, paths)

    def test_cleanup_cannot_replace_files_or_change_configuration_or_dependencies(self):
        value, paths = self.cleanup_request()
        for kwargs in [{'drift': True}, {'replacement': True}, {'dependent': True}, {'unknown': True}]:
            with self.subTest(kwargs=kwargs), patch.object(m, 'git', side_effect=self.cleanup_git(**kwargs)), self.assertRaises(ValueError):
                m.validate_request(value, paths)
        with patch.object(m, 'git', side_effect=self.cleanup_git()), self.assertRaises(ValueError):
            m.validate_request(value, paths + ['performances/public/data/other.json'])
        for altered in [None, {}, {'records': True, 'publicExports': True, 'approval': ''},
                        {'records': True, 'publicExports': True, 'approval': 'yes', 'rules': True}]:
            with self.subTest(altered=altered), self.assertRaises(ValueError):
                m.validate_request({**value, 'productionStaticCleanup': altered}, paths)

    def test_text_review_alone_wrong_candidate_or_duplicate_rows_refused(self):
        value = request(['functions/index.js'])
        del value['excludedBackendEvidence']
        with self.assertRaises(ValueError): m.validate_request(value, ['functions/index.js'])
        value = request(['functions/index.js'])
        value['excludedBackendEvidence']['candidate'] = 'c'*40
        with self.assertRaises(ValueError): m.validate_request(value, ['functions/index.js'])
        row = {'name': 'mail', 'commit': 'c'*40, 'revision': 'r1', 'before': '1'*64, 'after': '2'*64, 'reason': 'retain'}
        value = request(['functions/index.js']); value['excludedBackendEvidence']['functions'] = [row, row]
        with self.assertRaises(ValueError): m.validate_request(value, ['functions/index.js'])


class RetainedProofTests(unittest.TestCase):
    def fixture(self, directory, inherited=False):
        value = request(['functions/index.js'])
        row = {'name': 'mail', 'commit': 'c'*40, 'revision': 'r1', 'before': '1'*64, 'after': '2'*64, 'reason': 'Retained consumer'}
        value['excludedBackendEvidence']['functions'] = [row]
        m.write(Path(directory)/'request.json', value)
        m.write(Path(directory)/'baseline.json', {'productionRun': 34})
        state = {'functions': [{'name': 'functions/mail', 'commit': 'c'*40, 'revision': 'r1', 'state': 'ACTIVE'}]}
        fingerprints = {'a'*40: {'mail': '2'*64}, 'b'*40: {'mail': ('2' if inherited else '3')*64}, 'c'*40: {'mail': '1'*64}}
        receipt = {'suite': 'retained-calendar-consumers-v1', 'candidate': 'a'*40, 'productionCommit': 'b'*40,
                   'result': 'success', 'networkCalls': 0, 'passedFunctions': ['mail']}
        return value, state, fingerprints, receipt

    def test_complete_receipt_bound_to_run_revision_code_and_suite(self):
        with tempfile.TemporaryDirectory() as directory:
            value, state, fingerprints, receipt = self.fixture(directory)
            with patch.object(m, 'backend_fingerprints', side_effect=lambda sha: fingerprints[sha]), patch.object(m, 'run', return_value=json.dumps(receipt)) as runner:
                m.verify_excluded_backend(directory, state, [])
                runner.assert_called_once()
            result = m.read(Path(directory)/'excluded-backend-verification.json')
            self.assertEqual(result['retainedFunctions'], ['mail'])
            self.assertEqual(len(result['suiteSha256']), 64)
            self.assertEqual(len(result['reviewSha256']), 64)

    def test_missing_extra_changed_revision_origin_or_fingerprint_blocks_before_suite(self):
        for change in ['missing', 'extra', 'revision', 'commit', 'before', 'after', 'run']:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as directory:
                value, state, fingerprints, receipt = self.fixture(directory)
                rows = value['excludedBackendEvidence']['functions']
                if change == 'missing': rows.clear()
                elif change == 'extra': rows.append({**rows[0], 'name': 'extra'})
                elif change == 'run': value['excludedBackendEvidence']['productionRun'] = 35
                else: rows[0][change] = 'different'
                m.write(Path(directory)/'request.json', value)
                with patch.object(m, 'backend_fingerprints', side_effect=lambda sha: fingerprints[sha]), patch.object(m, 'run') as runner, self.assertRaises(ValueError):
                    m.verify_excluded_backend(directory, state, [])
                runner.assert_not_called()

    def test_failed_receipt_wrong_scope_or_network_cannot_attest_compatibility(self):
        for altered in [{'result': 'failure'}, {'passedFunctions': []}, {'candidate': 'd'*40}, {'networkCalls': 1}]:
            with self.subTest(altered=altered), tempfile.TemporaryDirectory() as directory:
                value, state, fingerprints, receipt = self.fixture(directory)
                with patch.object(m, 'backend_fingerprints', side_effect=lambda sha: fingerprints[sha]), patch.object(m, 'run', return_value=json.dumps({**receipt, **altered})), self.assertRaises(ValueError):
                    m.verify_excluded_backend(directory, state, [])
                self.assertFalse((Path(directory)/'excluded-backend-verification.json').exists())

    def test_preexisting_difference_is_recorded_not_republished(self):
        with tempfile.TemporaryDirectory() as directory:
            value, state, fingerprints, receipt = self.fixture(directory, inherited=True)
            with patch.object(m, 'backend_fingerprints', side_effect=lambda sha: fingerprints[sha]), patch.object(m, 'run') as runner:
                m.verify_excluded_backend(directory, state, [])
                runner.assert_not_called()
            self.assertEqual(m.read(Path(directory)/'excluded-backend-verification.json')['retainedFunctions'], ['mail'])

    def test_unknown_provenance_or_missing_export_cannot_be_retained(self):
        for field in ['commit', 'revision', 'state']:
            with tempfile.TemporaryDirectory() as directory:
                value, state, fingerprints, receipt = self.fixture(directory)
                state['functions'][0][field] = None
                with patch.object(m, 'backend_fingerprints', side_effect=lambda sha: fingerprints[sha]), self.assertRaises(ValueError):
                    m.verify_excluded_backend(directory, state, [])
        with tempfile.TemporaryDirectory() as directory:
            value, state, fingerprints, receipt = self.fixture(directory)
            fingerprints['a'*40] = {}
            with patch.object(m, 'backend_fingerprints', side_effect=lambda sha: fingerprints[sha]), self.assertRaises(ValueError):
                m.verify_excluded_backend(directory, state, [])


if __name__ == '__main__': unittest.main()
