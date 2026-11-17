"""Qualification provenance and exact source/runtime binding, without network."""
import copy
import importlib.util
import io
import json
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('qualification', Path(__file__).resolve().parent.parent / 'tools/qualify-production-code-backup.py')
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)


class Qualification(unittest.TestCase):
    def setUp(self):
        self.policy = {'schema': 1, 'purpose': 'production-code', 'environment': 'production',
                       'secretName': 'LIVEPALMES_CODE_BACKUP_KEY_V2', 'keyId': 'fixture-only', 'keyFingerprint': 'a' * 64}
        self.blobs = {f: f.encode() for f in q.FILES}
        self.blobs[q.POLICY] = json.dumps(self.policy).encode()
        self.blobs[q.WORKFLOW] = b"node-version: '22.23.5'\n"
        self.run = {'id': 101, 'run_attempt': 1, 'status': 'completed', 'conclusion': 'success',
                    'event': 'workflow_dispatch', 'path': q.WORKFLOW, 'head_branch': 'main', 'head_sha': 'b' * 40,
                    'repository': {'full_name': q.REPO}, 'head_repository': {'full_name': q.REPO}}
        self.receipt = {'schema': 1, 'context': {'project': 'livepalmes', 'repository': q.REPO,
                        'kind': 'production-code', 'candidate': 'b' * 40, 'runId': 101},
                        'checkedAtUtc': '2026-11-17T20:00:00.000Z', 'keyId': 'fixture-only', 'keyFingerprint': 'a' * 64,
                        'ciphertextSha256': 'c' * 64, 'restoredSha256': 'd' * 64, 'archiveCiphertextSha256': 'e' * 64,
                        'codeHashes': {f: q.sha(b) for f, b in self.blobs.items()}, 'nodeVersion': 'v22.23.5',
                        **dict.fromkeys(q.TRUE_FLAGS, True), **dict.fromkeys(q.FALSE_FLAGS, False)}
        self.members = None
        self.run_changes = {}
        self.metadata_changes = {}
        self.list_changes = {}
        self.bad_digest = False

    def invoke(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as archive:
            for name, value in (self.members or [('code-backup-key-check.json', json.dumps(self.receipt).encode())]):
                archive.writestr(name, value)
        packed = buffer.getvalue()
        metadata = {'id': 9, 'name': 'code-backup-key-proof', 'expired': False, 'size_in_bytes': len(packed),
                    'digest': 'sha256:' + ('0' * 64 if self.bad_digest else q.sha(packed)),
                    'workflow_run': {'id': 101, 'head_sha': 'b' * 40, 'head_branch': 'main'}, **self.metadata_changes}
        responses = {'actions/runs/101': {**self.run, **self.run_changes},
                     'actions/runs/101/artifacts?per_page=100': {'total_count': 1, 'artifacts': [metadata], **self.list_changes},
                     'actions/artifacts/9': metadata, 'actions/artifacts/9/zip': packed}
        calls = []

        def api(endpoint, raw=False):
            calls.append((endpoint, raw))
            self.assertLessEqual(len(calls), 4)
            return copy.deepcopy(responses[endpoint])

        result = q.qualify(101, api=api, sources=lambda: (self.blobs, 'v22.23.5'))
        self.assertEqual(len(calls), 4)
        self.assertEqual(calls[-1], ('actions/artifacts/9/zip', True))
        return result

    def test_exact_probe(self):
        result = self.invoke()
        self.assertEqual(result['receipt'], self.receipt)
        self.assertEqual(result['source']['run'], 101)
        self.assertRegex(result['source']['memberSha256'], '^[0-9a-f]{64}$')

    def test_wrong_run_contexts(self):
        for name, value in [('id', 102), ('run_attempt', 2), ('status', 'in_progress'), ('conclusion', 'failure'),
                            ('event', 'pull_request'), ('path', 'other.yml'), ('head_branch', 'feature'),
                            ('repository', {'full_name': 'other/repo'}), ('head_repository', {'full_name': 'other/repo'})]:
            with self.subTest(name=name):
                self.run_changes = {name: value}
                with self.assertRaises(ValueError):
                    self.invoke()

    def test_wrong_artifacts(self):
        for change in [{'expired': True}, {'size_in_bytes': 262145}, {'workflow_run': {'id': 102}},
                       {'workflow_run': {'id': 101, 'head_sha': 'c' * 40, 'head_branch': 'main'}}]:
            self.metadata_changes = change
            with self.assertRaises(ValueError):
                self.invoke()
        self.metadata_changes = {}
        self.bad_digest = True
        with self.assertRaises(ValueError):
            self.invoke()

    def test_bounded_unambiguous_listing(self):
        for change in [{'total_count': 101}, {'total_count': 2}, {'total_count': 0, 'artifacts': []}]:
            self.list_changes = change
            with self.assertRaises(ValueError):
                self.invoke()

    def test_receipt_changes_and_old_probe(self):
        original = copy.deepcopy(self.receipt)
        for key in q.TRUE_FLAGS + q.FALSE_FLAGS:
            self.receipt = copy.deepcopy(original)
            self.receipt[key] = not self.receipt[key]
            with self.assertRaises(ValueError):
                self.invoke()
        for key in ['originChainVerified', 'foreignSameCandidateRejected', 'archiveRoundtripVerified']:
            self.receipt = copy.deepcopy(original)
            del self.receipt[key]
            with self.assertRaises(ValueError):
                self.invoke()
        for key, value in [('nodeVersion', 'v24.16.0'), ('keyId', 'other'), ('keyFingerprint', '0' * 64),
                           ('codeHashes', {f: '0' * 64 for f in q.FILES}), ('extraField', 'never-export-unexpected-content')]:
            self.receipt = {**copy.deepcopy(original), key: value}
            with self.assertRaises(ValueError):
                self.invoke()

    def test_zip_members(self):
        for members in [[('../code-backup-key-check.json', b'{}')], [('extra.json', b'{}')],
                        [('code-backup-key-check.json', b' ' * 32769)],
                        [('code-backup-key-check.json', b'{}'), ('other.json', b'{}')]]:
            self.members = members
            with self.assertRaises(ValueError):
                self.invoke()


if __name__ == '__main__':
    unittest.main()
