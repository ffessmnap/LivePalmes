"""A single sealed layout exception; all other archive paths stay refused."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import warnings
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('layout', ROOT/'tools/portal-session-enforcement-artifact-layout.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class Fixture:
    def __init__(self):
        self.value = copy.deepcopy(m.layout()); self.payload = {n: b'{}' for n in self.value['members']}
        self.payload['production-hosting-after.json'] = json.dumps(self.value['hosting']).encode()
        self.payload['production-session-enforcement-rules-after.json'] = json.dumps({
            'candidate': self.value['candidate'], 'contractSha256': self.value['originalRulesContractSha256'],
            'after': self.value['rulesAfter'], 'result': 'success', 'readOnly': True}).encode()
        for name, raw in self.payload.items(): self.value['members'][name].update(bytes=len(raw), sha256=m.sha(raw))
        self.info = {'id': self.value['run'], 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1,
                     'head_branch': 'main', 'event': 'workflow_dispatch', 'head_sha': self.value['head'], 'path': self.value['workflow']}
        self.meta = {'id': self.value['artifactId'], 'name': self.value['artifactName'], 'expired': False,
                     'workflow_run': {'id': self.value['run']}}
        self.extra = []; self.downloads = 0; self.repack()

    def repack(self, duplicate=False):
        data = io.BytesIO()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            with zipfile.ZipFile(data, 'w') as archive:
                for name, raw in self.payload.items(): archive.writestr(name, raw)
                if duplicate: archive.writestr('production-hosting-after.json', self.payload['production-hosting-after.json'])
        self.raw = data.getvalue(); self.value['artifactDigest'] = self.meta['digest'] = 'sha256:'+m.sha(self.raw)

    def gh(self, endpoint):
        if '/artifacts?' in endpoint: return {'total_count': 1+len(self.extra), 'artifacts': [self.meta]+self.extra}
        if '/actions/artifacts/' in endpoint: return self.meta
        return self.info

    def download(self): self.downloads += 1; return self.raw


class LayoutTests(unittest.TestCase):
    def setUp(self):
        self.f = Fixture(); self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.dest = Path(self.tmp.name)/'artifact'
        for p in [patch.object(m, 'layout', lambda: self.f.value), patch.dict(os.environ, {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes'})]:
            p.start(); self.addCleanup(p.stop)

    def read(self, run=44120289139, name='production-hosting-after', workflow=None):
        return m.artifact(run, name, self.dest, workflow, gh=self.f.gh, download=self.f.download)

    def test_only_recorded_six_files_are_preserved_byte_for_byte(self):
        self.assertEqual(self.read(), self.f.info)
        self.assertEqual(len(list(self.dest.iterdir())), 6)
        self.assertFalse((self.dest/'release-plan').exists())
        for name, data in self.f.payload.items(): self.assertEqual((self.dest/Path(name).name).read_bytes(), data)

    def test_another_run_artifact_workflow_or_repository_refused(self):
        for args in [(42, 'production-hosting-after', None), (44120289139, 'another', None),
                     (44120289139, 'production-hosting-after', 'another-workflow')]:
            with self.subTest(args=args), self.assertRaises(ValueError): self.read(*args)
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'other/repo'}), self.assertRaises(ValueError): self.read()
        self.assertEqual(self.f.downloads, 0)

    def test_failed_rerun_branch_head_event_or_workflow_refused(self):
        for key, bad in [('conclusion', 'failure'), ('status', 'in_progress'), ('run_attempt', 2),
                         ('head_branch', 'other'), ('head_sha', 'a'*40), ('event', 'push'), ('path', 'other')]:
            old = self.f.info[key]; self.f.info[key] = bad
            with self.subTest(key=key), self.assertRaises(ValueError): self.read()
            self.f.info[key] = old
        self.assertEqual(self.f.downloads, 0)

    def test_expired_ambiguous_or_wrong_metadata_refused(self):
        self.f.meta['expired'] = True
        with self.assertRaises(ValueError): self.read()
        self.f.meta['expired'] = False; self.f.extra = [{**self.f.meta, 'id': 99}]
        with self.assertRaises(ValueError): self.read()
        self.f.extra = []; self.f.meta['workflow_run']['id'] = 99
        with self.assertRaises(ValueError): self.read()
        self.assertEqual(self.f.downloads, 0)

    def test_altered_zip_refused_before_writing(self):
        self.f.raw += b'altered'
        with self.assertRaisesRegex(ValueError, 'ZIP'): self.read()
        self.assertFalse(self.dest.exists())

    def test_extra_nested_or_traversal_path_refused(self):
        for bad in ['../outside.json', 'other/file.json', 'release-plan/another.json']:
            self.f.payload[bad] = b'{}'; self.f.repack()
            with self.subTest(path=bad), self.assertRaisesRegex(ValueError, 'Chemins'): self.read()
            del self.f.payload[bad]
        self.assertFalse(self.dest.exists())

    def test_duplicate_member_refused(self):
        self.f.repack(duplicate=True)
        with self.assertRaisesRegex(ValueError, 'Chemins'): self.read()
        self.assertFalse(self.dest.exists())

    def test_changed_file_bytes_refused_even_when_zip_digest_matches(self):
        self.f.payload['production-standard-hosting-check.json'] = b'changed'; self.f.repack()
        with self.assertRaisesRegex(ValueError, 'Fichier'): self.read()
        self.assertFalse(self.dest.exists())

    def test_unknown_hosting_semantics_refused(self):
        raw = json.dumps({'name': 'foreign', 'version': 'foreign'}).encode()
        self.f.payload['production-hosting-after.json'] = raw
        self.f.value['members']['production-hosting-after.json'].update(bytes=len(raw), sha256=m.sha(raw)); self.f.repack()
        with self.assertRaisesRegex(ValueError, 'Contenu'): self.read()
        self.assertFalse(self.dest.exists())

    def test_existing_different_local_proof_is_not_overwritten(self):
        self.dest.mkdir(); target = self.dest/'production-hosting-after.json'; target.write_bytes(b'existing')
        with self.assertRaisesRegex(ValueError, 'Destination'): self.read()
        self.assertEqual(target.read_bytes(), b'existing')

    def test_generic_reader_still_refuses_same_layout_for_other_run(self):
        spec = importlib.util.spec_from_file_location('cycle_for_layout', ROOT/'tools/release-cycle.py')
        cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
        self.f.info['id'] = 42; self.f.meta['workflow_run']['id'] = 42
        with patch.object(cycle, 'gh', self.f.gh), patch.object(cycle.subprocess, 'check_output', return_value=self.f.raw), self.assertRaisesRegex(ValueError, 'Chemin artefact invalide'):
            cycle.artifact(42, 'production-hosting-after', self.dest, self.f.value['workflow'])


class ImmutableRecordTests(unittest.TestCase):
    def test_real_record_is_sealed_to_successful_b_run(self):
        value = m.layout()
        self.assertEqual((value['run'], value['artifactId']), (44120289139, 14344399374))
        self.assertEqual(value['hosting']['version'], 'sites/livepalmes/versions/9c61dae421f20d00')

    def test_changed_record_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'record.json'; path.write_text('{}')
            with patch.object(m, 'PATH', path), self.assertRaises(ValueError): m.layout()


if __name__ == '__main__': unittest.main()
