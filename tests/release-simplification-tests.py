"""Negative automation, parallel-CI and immutable-candidate gates; offline only."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


auto = load('simplification_auto', 'automatic-test-publication.py')
draft = load('simplification_draft', 'prepare-release-draft.py')
c = auto.cycle
coord = load('simplification_coordinate', 'coordinate-test-publication.py')


class SimplificationTests(unittest.TestCase):
    def test_auto_never_substitutes_a_newer_or_sensitive_candidate(self):
        inputs = {'production_commit': '0'*40, 'hosting_only': 'true', 'automatic_candidate': 'a'*40}
        with patch.object(coord, 'latest', return_value='b'*40), patch.object(coord, 'gh') as dispatch:
            self.assertFalse(coord.coordinate('prepare', 'owner/repo', 'a'*40, inputs)['publish'])
            self.assertFalse(coord.coordinate('followup', 'owner/repo', 'a'*40, inputs)['queued'])
            for invalid in [{**inputs, 'automatic_candidate': 'b'*40}, {**inputs, 'hosting_only': False}]:
                with self.assertRaises(ValueError):
                    coord.coordinate('prepare', 'owner/repo', 'a'*40, invalid)
            dispatch.assert_not_called()

    def test_only_exact_successful_main_push_is_trusted(self):
        run = {'event': 'push', 'head_branch': 'main', 'head_repository': {'full_name': 'owner/repo'},
               'path': '.github/workflows/livepalmes-verification-preview.yml', 'status': 'completed',
               'conclusion': 'success', 'run_attempt': 1, 'head_sha': 'a'*40}
        self.assertTrue(auto.trusted_run(run, 'owner/repo'))
        for key, value in [('event', 'pull_request'), ('head_branch', 'feature'),
                           ('head_repository', {'full_name': 'fork/repo'}), ('path', 'other.yml'),
                           ('conclusion', 'failure'), ('status', 'in_progress'), ('run_attempt', 2), ('head_sha', 'bad')]:
            self.assertFalse(auto.trusted_run({**run, key: value}, 'owner/repo'), key)

    def test_automatic_scope_does_not_enable_sensitive_or_unknown_operations(self):
        with patch.object(c, 'classify', return_value=(['portail.css'], False)):
            self.assertTrue(auto.ordinary_paths(['portail.css']))
        for path in ['functions/index.js', 'custom/unknown.js', 'auth.js', 'admin.js', 'scheduler.js', 'data.json']:
            with patch.object(c, 'classify', return_value=([path], path.startswith('functions/'))):
                self.assertFalse(auto.ordinary_paths([path]), path)
        with patch.object(c, 'classify', return_value=([], False)):
            self.assertFalse(auto.ordinary_paths(['docs/example.md']))
        for path in ['firebase.json', 'firestore.rules', 'firestore.indexes.json', 'performances/public/data/a.js']:
            with self.assertRaises(ValueError):
                auto.ordinary_paths([path])

    def test_auto_has_no_prod_dispatch_or_exception_flags(self):
        source = (ROOT/'tools/automatic-test-publication.py').read_text(encoding='utf-8')
        self.assertIn("'hosting_only': 'true'", source)
        self.assertIn('livepalmes-test-common.yml/dispatches', source)
        self.assertNotIn('production-release.yml/dispatches', source)
        self.assertNotIn('approved_home_routing', source)
        workflow = (ROOT/'.github/workflows/livepalmes-test-automatic.yml').read_text(encoding='utf-8')
        self.assertIn('workflow_run.head_repository.full_name == github.repository', workflow)
        self.assertIn('ref: ${{ github.event.workflow_run.head_sha }}', workflow)
        self.assertNotIn('FIREBASE_SERVICE_ACCOUNT', workflow)

    def test_dispatch_inputs_use_authenticated_baselines_and_missing_proof_blocks(self):
        run = {'event': 'push', 'head_branch': 'main', 'head_repository': {'full_name': 'owner/repo'},
               'path': '.github/workflows/livepalmes-verification-preview.yml', 'status': 'completed',
               'conclusion': 'success', 'run_attempt': 1, 'head_sha': 'c'*40}
        def read(path):
            return {'candidate': 'b'*40} if Path(path).name == 'test-proof.json' else {'productionCommit': 'a'*40}
        def git(*args):
            return 'c'*40 if args[0] == 'rev-parse' else 'portail.css\n'
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(c, 'gh', return_value={'object': {'sha': 'c'*40}}), \
                patch.object(c, 'git', side_effect=git), patch.object(c, 'latest_run', return_value=12), \
                patch.object(c, 'artifact', return_value={'head_sha': 'b'*40}), \
                patch.object(c, 'read', side_effect=read), patch.object(auto.subprocess, 'run'), \
                patch.object(c, 'production_evidence', return_value={'hosting': {'version': 'known'}}):
            result, _ = auto.inputs_for(run, 'owner/repo', directory)
            self.assertEqual(result, {'production_commit': 'a'*40, 'hosting_only': 'true', 'automatic_candidate': 'c'*40})
            with patch.object(c, 'artifact', side_effect=ValueError('expired')):
                with self.assertRaises(ValueError):
                    auto.inputs_for(run, 'owner/repo', directory)
            with patch.object(c, 'gh', return_value={'object': {'sha': 'd'*40}}):
                self.assertIsNone(auto.inputs_for(run, 'owner/repo', directory)[0])

    def test_draft_does_not_claim_readiness_when_backend_review_or_coverage_is_missing(self):
        proof = {'candidate': 'c'*40, 'verification': {'schema': 1, 'candidate': 'c'*40,
                 'suite': 'verify-livepalmes', 'result': 'success'}}
        record = {'title': 'Interface', 'commits': ['b'*40], 'status': 'validated', 'validation': 'Retour utilisateur exact'}
        for backend, path, records in [(False, 'portail.css', [record]), (False, 'portail.css', []),
                                       (True, 'functions/index.js', [record])]:
            with tempfile.TemporaryDirectory() as directory, \
                    patch.object(draft.cycle, 'artifact', return_value={'head_sha': 'c'*40}), \
                    patch.object(draft.cycle, 'read', side_effect=lambda p: proof if Path(p).name == 'test-proof.json' else {'productionCommit': 'a'*40}), \
                    patch.object(draft.cycle, 'production_evidence', return_value={'hosting': {'version': 'sites/livepalmes/versions/proven'}}), \
                    patch.object(draft.cycle, 'git', return_value=path+'\n'), patch.object(draft.subprocess, 'run'), \
                    patch.object(draft.cycle, 'validate_request') as validate:
                blockers = draft.build(directory, 12, records)
                self.assertEqual(bool(blockers), backend or not records)
                status = json.loads((Path(directory)/'draft-status.json').read_text())
                self.assertFalse(status['productionApproval'])
                request = json.loads((Path(directory)/'request-draft.json').read_text())
                self.assertEqual(request['candidate'], 'c'*40)
                self.assertTrue(request['freezeTestCandidate'])
                self.assertEqual(validate.call_count, int(not blockers))

    def test_validation_records_never_infer_user_acceptance_or_future_changes(self):
        row = {'title': 'Boutons', 'commits': ['b'*40], 'status': 'validated', 'validation': 'Antoine : valide sur TEST'}
        with patch.object(draft.subprocess, 'run') as git, patch.object(draft.cycle, 'git', return_value='portail.css\n'):
            changes, missing = draft.changes_from_records([row], ['portail.css', 'index.html'], 'a'*40, 'c'*40)
            self.assertEqual(missing, ['index.html'])
            self.assertEqual(changes[0]['validation'], row['validation'])
            self.assertEqual(git.call_count, 2)
            for invalid in [{**row, 'validation': ''}, {**row, 'status': 'in-progress'}, {**row, 'commits': ['main']}]:
                with self.assertRaises(ValueError):
                    draft.changes_from_records([invalid], ['portail.css'], 'a'*40, 'c'*40)
        with patch.object(draft.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'git')):
            with self.assertRaises(subprocess.CalledProcessError):
                draft.changes_from_records([row], ['portail.css'], 'a'*40, 'c'*40)

    def test_frozen_candidate_accepts_only_authentic_descendant_exact_live_state(self):
        request = {'schema': 1, 'candidate': 'a'*40, 'productionCommit': '0'*40,
                   'productionHosting': 'sites/livepalmes/versions/old', 'testRun': 12,
                   'changes': [], 'excludedBackendReview': '', 'freezeTestCandidate': True}
        observed = {'hosting': {'version': 'new'}, 'functions': []}
        proof = {'candidate': 'b'*40, 'state': observed,
                 'verification': {'schema': 1, 'candidate': 'b'*40, 'suite': 'verify-livepalmes', 'result': 'success'}}
        with tempfile.TemporaryDirectory() as directory, patch.object(c, 'latest_run', return_value=13), \
                patch.object(c, 'artifact', return_value={'head_sha': 'b'*40}), \
                patch.object(c, 'read', return_value=proof), patch.object(c.subprocess, 'run') as ancestry:
            original = copy.deepcopy(request)
            c.verify_later_test(directory, request, observed)
            self.assertEqual(request, original)
            ancestry.assert_called_once()
            for bad in [{}, {**observed, 'unexpected': True}]:
                with self.assertRaises(ValueError):
                    c.verify_later_test(directory, request, bad)
            for invalid in [{**request, 'additionalPdfFunctions': []}, {**request, 'testRun': 13}]:
                with self.assertRaises(ValueError):
                    c.verify_later_test(directory, invalid, observed)
            with patch.object(c.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'git')):
                with self.assertRaises(subprocess.CalledProcessError):
                    c.verify_later_test(directory, request, observed)
            with patch.object(c, 'artifact', side_effect=ValueError('digest invalide')):
                with self.assertRaises(ValueError):
                    c.verify_later_test(directory, request, observed)
            with patch.object(c, 'read', return_value={**proof, 'verification': {}}):
                with self.assertRaises(ValueError):
                    c.verify_later_test(directory, request, observed)

    def test_ci_parallel_jobs_preserve_all_checks_and_fail_closed(self):
        script = "const y=require('./tests/firestore-rules/node_modules/js-yaml'),fs=require('fs'); console.log(JSON.stringify(y.load(fs.readFileSync('.github/workflows/livepalmes-verification-preview.yml','utf8'))));"
        workflow = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT, text=True))
        jobs = workflow['jobs']
        self.assertNotIn('needs', jobs['application'])
        self.assertNotIn('needs', jobs['publication'])
        self.assertEqual(set(jobs['verification']['needs']), {'application', 'publication'})
        gate = jobs['verification']['steps'][0]
        self.assertEqual(gate['run'], 'test "$APPLICATION" = success && test "$PUBLICATION" = success')
        self.assertEqual(jobs['verification']['if'], 'always()')
        self.assertEqual(jobs['apercu']['needs'], 'verification')
        app = (ROOT/'tools/verify-livepalmes.js').read_text(encoding='utf-8')
        # Every removed duplicate is demonstrably still run by the required application job.
        commands = next(s['run'] for s in jobs['publication']['steps'] if s.get('name') == 'Tester le circuit de publication sans acces Firebase')
        for line in commands.splitlines():
            if line.startswith('# Covered by required application job: node tests/'):
                self.assertIn('"'+line.split('tests/', 1)[1]+'"', app)
        self.assertIn('python tests/release-simplification-tests.py', commands)


if __name__ == '__main__':
    unittest.main()
