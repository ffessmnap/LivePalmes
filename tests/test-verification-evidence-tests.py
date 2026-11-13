import importlib.util
import os
import json
import shutil
import subprocess
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('evidence', ROOT/'tools/test-verification-evidence.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EvidenceTests(unittest.TestCase):
    def installer(self):
        bash = shutil.which('bash')
        if os.name == 'nt' and Path('C:/Program Files/Git/bin/bash.exe').exists():
            bash = 'C:/Program Files/Git/bin/bash.exe'
        if not bash:
            self.skipTest('bash absent ; controle obligatoire sur CI Linux')
        script = "const y=require('./tests/firestore-rules/node_modules/js-yaml'),f=require('fs'); const w=y.load(f.readFileSync('.github/workflows/livepalmes-test-common.yml','utf8')); console.log(JSON.stringify(w.jobs.test.steps.find(s=>s.name==='Installer les dependances verrouillees en parallele').run));"
        install = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT, text=True))
        return bash, install

    def run_installer(self, install, bash, functions=0, rules=0, flags=None, existing=False, unexpected=False):
        mocked = 'npm() { echo "SIMULATED $*"; if [[ "$*" == *"--prefix functions "* ]]; then return "$FUNCTIONS_EXIT"; else if [ "$UNEXPECTED_INSTALL" = true ]; then mkdir -p functions/node_modules; fi; return "$RULES_EXIT"; fi; }\n'
        with tempfile.TemporaryDirectory() as directory:
            if existing:
                (Path(directory)/'functions/node_modules').mkdir(parents=True)
            return subprocess.run([bash, '-e'], input=mocked + install, text=True, capture_output=True, cwd=directory,
                env={**os.environ, 'TEST_VERIFICATION_ONLY': '', 'MAIN_VERIFIED': '', 'PUBLICATION_VERIFIED': '',
                     **(flags or {}), 'FUNCTIONS_EXIT': str(functions), 'RULES_EXIT': str(rules),
                     'UNEXPECTED_INSTALL': 'true' if unexpected else 'false'})

    def test_parallel_installs_wait_for_both_and_fail_closed(self):
        bash, install = self.installer()
        for functions, rules in [(0, 0), (1, 0), (0, 1), (1, 1)]:
            result = self.run_installer(install, bash, functions, rules)
            self.assertEqual(result.returncode == 0, functions == rules == 0)
            self.assertEqual(result.stdout.count('SIMULATED'), 2)
        self.assertEqual(install.count('npm ci '), 2)
        self.assertEqual(install.count('--prefer-offline --no-audit --no-fund'), 2)

    def test_only_read_only_with_both_authenticated_proofs_can_skip_functions(self):
        bash, install = self.installer()
        for mode, main, publication in [('true', 'true', 'true'), ('false', 'true', 'true'),
                ('true', 'false', 'true'), ('true', 'true', 'false'), ('true', '', 'true'),
                ('true', 'true', ''), ('', 'true', 'true'), ('true', 'false', 'false'),
                ('true', 'True', 'true'), ('true', 'true', '1')]:
            skip = mode == main == publication == 'true'
            for rules in [0, 1]:
                with self.subTest(mode=mode, main=main, publication=publication, rules=rules):
                    result = self.run_installer(install, bash, functions=1 if skip else 0, rules=rules,
                        flags={'TEST_VERIFICATION_ONLY': mode, 'MAIN_VERIFIED': main, 'PUBLICATION_VERIFIED': publication})
                    self.assertEqual(result.returncode == 0, rules == 0, result.stderr)
                    self.assertEqual(result.stdout.count('SIMULATED'), 1 if skip else 2)
                    self.assertIn('--prefix tests/firestore-rules ', result.stdout)
                    self.assertEqual('--prefix functions ' in result.stdout, not skip)
                    self.assertEqual('functions/node_modules absent apres installation.' in result.stdout, skip and rules == 0)

    def test_read_only_absence_attestation_refuses_existing_or_unexpected_sdk(self):
        bash, install = self.installer()
        flags = {'TEST_VERIFICATION_ONLY': 'true', 'MAIN_VERIFIED': 'true', 'PUBLICATION_VERIFIED': 'true'}
        for values in [{'existing': True}, {'unexpected': True}]:
            result = self.run_installer(install, bash, flags=flags, **values)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn('functions/node_modules absent apres installation.', result.stdout)

    def test_rendered_workflow_shell_is_valid(self):
        bash = shutil.which('bash')
        if os.name == 'nt' and Path('C:/Program Files/Git/bin/bash.exe').exists():
            bash = 'C:/Program Files/Git/bin/bash.exe'
        if not bash:
            self.skipTest('bash absent ; controle obligatoire sur CI Linux')
        script = "const y=require('./tests/firestore-rules/node_modules/js-yaml'),f=require('fs'); const w=y.load(f.readFileSync('.github/workflows/livepalmes-test-common.yml','utf8')); console.log(JSON.stringify(Object.values(w.jobs).flatMap(j=>(j.steps||[]).filter(s=>s.run).map(s=>s.run))));"
        scripts = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT, text=True))
        for script in scripts:
            result = subprocess.run([bash, '-n'], input=script, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def info(self, **values):
        return {'id': 12, 'head_sha': 'a'*40, 'head_branch': 'main', 'event': 'push',
                'path': m.WORKFLOW, 'status': 'completed', 'conclusion': 'success',
                'run_attempt': 1, **values}

    def check(self, run=None, proof=None, artifact_info=None):
        with tempfile.TemporaryDirectory() as directory:
            m.cycle.write(Path(directory)/'verification.json', proof if proof is not None else m.evidence('a'*40))
            with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m.cycle, 'gh', side_effect=lambda endpoint: {'artifacts':[{'name':'application-verification'}]} if '/artifacts?' in endpoint else {'workflow_runs':[run or self.info()]}), patch.object(m.cycle, 'artifact', return_value=artifact_info or self.info()) as artifact:
                result = m.reusable('a'*40, directory)
                return result, artifact.call_count

    def test_exact_success_is_reused(self):
        self.assertEqual(self.check(), (True, 1))

    def test_other_commit_branch_event_workflow_attempt_or_state_never_skips(self):
        for values in [{'head_sha': 'b'*40}, {'head_branch': 'feature'}, {'event': 'pull_request'},
                       {'path': 'other.yml'}, {'run_attempt': 2}, {'status': 'in_progress'},
                       {'conclusion': 'failure'}, {'conclusion': 'cancelled'}]:
            with self.subTest(values=values):
                self.assertEqual(self.check(run=self.info(**values)), (False, 0))

    def test_proof_content_and_authenticated_run_both_match(self):
        for proof in [{}, {**m.evidence('a'*40), 'candidate': 'b'*40},
                      {**m.evidence('a'*40), 'node': 'v0.0.0'},
                      {**m.evidence('a'*40), 'result': 'failure'}, {**m.evidence('a'*40), 'extra': True}]:
            self.assertFalse(self.check(proof=proof)[0])
        self.assertFalse(self.check(artifact_info=self.info(head_sha='b'*40))[0])
        self.assertFalse(self.check(artifact_info=self.info(event='pull_request'))[0])

    def test_same_major_different_patch_still_requires_verification(self):
        with patch.object(m, 'node_version', return_value='v22.23.4'):
            proof = {**m.evidence('a'*40), 'node': 'v22.23.3'}
            self.assertFalse(self.check(proof=proof)[0])

    def test_unavailable_or_altered_artifact_cannot_be_reused(self):
        with patch.dict(os.environ, {'GITHUB_REPOSITORY': 'owner/repo'}), patch.object(m.cycle, 'gh', side_effect=lambda endpoint: {'artifacts':[{'name':'application-verification'}]} if '/artifacts?' in endpoint else {'workflow_runs':[self.info()]}), patch.object(m.cycle, 'artifact', side_effect=ValueError('Artefact altere')):
            with self.assertRaises(ValueError):
                m.reusable('a'*40, '.')
        with patch.object(m, 'reusable', side_effect=ValueError('expired')), patch.object(m.cycle, 'output') as output, patch.dict(os.environ, {'GITHUB_SHA': 'a'*40}), patch.object(m.sys, 'argv', ['tool', 'reuse', '.']):
            m.main()
            output.assert_called_once_with(verified='false')

    def test_emulator_scope_is_conservative(self):
        for paths in [['portail.css'], ['portail.js', 'index.html'], ['docs/releases/EVOLUTIONS.md'],
                      ['assets/portal/styles/06-competition.css'], ['css/public.css', 'assets/logo.webp']]:
            self.assertFalse(m.firestore_required(paths))
        for path in ['firestore.rules', 'firebase.json', 'firestore.indexes.json',
                     'functions/index.js', 'tests/firestore-rules/firestore-rules.test.cjs',
                     'tests/firestore-rules/package-lock.json', 'tools/unknown.py', 'unknown', '.github/workflows/check.yml',
                     'assets/portal/auth.js', 'assets/portal/config.json', 'assets/firestore.rules', 'custom/style.css']:
            self.assertTrue(m.firestore_required(['portail.css', path]))
        self.assertTrue(m.firestore_required([]))

    def test_workflow_keeps_fallback_and_all_publication_checks(self):
        workflow = (ROOT/'.github/workflows/livepalmes-test-common.yml').read_text(encoding='utf-8')
        self.assertIn('MAIN_VERIFIED: ${{ steps.verified-main.outputs.verified }}', workflow)
        self.assertIn('else\n          node tools/verify-livepalmes.js\n        fi', workflow)
        for command in ['test-selection', 'check-test', 'check-hosting-payload', 'release-cycle.py proof']:
            self.assertIn(command, workflow)
        ci = (ROOT/m.WORKFLOW).read_text(encoding='utf-8')
        self.assertLess(ci.index('node tools/verify-livepalmes.js'), ci.index('application-verification/verification.json'))
        self.assertIn("if: github.event_name == 'push'", ci)

    def test_test_publication_reuses_only_the_distinct_exact_ci_suite(self):
        script = "const y=require('./tests/firestore-rules/node_modules/js-yaml'),f=require('fs'); console.log(JSON.stringify(y.load(f.readFileSync('.github/workflows/livepalmes-test-common.yml','utf8')).jobs.test.steps));"
        steps = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT, text=True))
        proof = next(step for step in steps if step.get('id') == 'verified-publication')
        self.assertIn('reuse-publication', proof['run'])
        install = next(step for step in steps if step.get('name') == 'Installer les dependances verrouillees en parallele')
        self.assertEqual(install['env'], {'TEST_VERIFICATION_ONLY': '${{ inputs.verification_only }}',
            'MAIN_VERIFIED': '${{ steps.verified-main.outputs.verified }}',
            'PUBLICATION_VERIFIED': '${{ steps.verified-publication.outputs.verified }}'})
        backend = next(step for step in steps if step.get('name') == 'Controler le backend TEST et les Functions conservees')
        self.assertEqual(backend['env'], {'TEST_VERIFICATION_ONLY': '${{ inputs.verification_only }}'})
        fallback = next(step for step in steps if step.get('name') == 'Verifier le circuit ou reutiliser la preuve exacte')
        self.assertEqual(fallback['if'], "steps.verified-publication.outputs.verified != 'true'")
        commands = [line.strip() for line in fallback['run'].splitlines() if line.strip()]
        self.assertEqual(len(commands), 11)
        self.assertIn('python tests/portal-session-rules-tests.py', commands)
        self.assertIn('python tests/direct-realtime-rules-policy-tests.py', commands)
        self.assertIn('python tests/test-static-cache-policy-tests.py', commands)
        ci = (ROOT/m.WORKFLOW).read_text(encoding='utf-8')
        inventory = json.loads((ROOT/'tools/verification-tests.json').read_text(encoding='utf-8'))
        self.assertIn('node tools/run-verification-tests.js publication', ci)
        for command in commands:
            self.assertIn(command.split(' ',1)[1], inventory['publication'])
        for step in steps:
            if any(command in step.get('run', '') for command in ['test-selection', 'check-test', 'release-cycle.py proof']):
                self.assertNotIn('verified-publication', step.get('if', ''))

    def test_source_operation_timings_preserve_errors_and_do_not_expose_metadata(self):
        spec = importlib.util.spec_from_file_location('state', ROOT/'tools/production-release-state.py')
        state = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(state)
        for failing in [False, True]:
            with tempfile.TemporaryDirectory() as directory:
                summary = Path(directory)/'summary.txt'
                operation = {'done': True, 'metadata': {'target': 'PRIVATE\nCONTENT'}}
                if failing:
                    operation['error'] = {'message': 'PRIVATE'}
                with patch.dict(os.environ, {'GITHUB_STEP_SUMMARY': str(summary)}), patch.object(state.time, 'sleep') as pause:
                    if failing:
                        with self.assertRaisesRegex(ValueError, 'Operation Firebase en echec'):
                            state.wait_operation(operation)
                    else:
                        state.wait_operation(operation)
                    pause.assert_not_called()
                content = summary.read_text(encoding='utf-8')
                self.assertNotIn('PRIVATE', content)
                self.assertIn('interrompue' if failing else 'terminee', content)


    def documentation_check(self, changed=None, source_proof=None, target_artifact=False):
        target, source = 'a'*40, 'b'*40
        def api(endpoint):
            if '/artifacts?' in endpoint:
                return {'artifacts': [{'name':'publication-verification'}] if '/12/' in endpoint or target_artifact else []}
            sha = target if 'head_sha='+target in endpoint else source
            return {'workflow_runs':[self.info(id=13 if sha == target else 12,head_sha=sha)]}
        with tempfile.TemporaryDirectory() as directory:
            m.cycle.write(Path(directory)/'verification.json', source_proof or m.evidence(source,'publication-offline-v1'))
            with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo'}),patch.object(m.cycle,'gh',side_effect=api),patch.object(m.cycle,'artifact',return_value=self.info(head_sha=source)) as artifact,patch.object(m,'documentation_parent',return_value=(source,changed) if changed is not None else None) as parent:
                result=m.reusable(target,directory,'publication-offline-v1')
                original=m.cycle.read(Path(directory)/'verification.json')
                receipt=m.cycle.read(Path(directory)/'documentation-equivalence.json') if (Path(directory)/'documentation-equivalence.json').exists() else None
                return result,artifact.call_count,parent.call_count,original,receipt

    def test_documentation_only_reuses_authentic_source_proof_without_rewriting_it(self):
        result,calls,edges,proof,receipt=self.documentation_check(['docs/releases/EVOLUTIONS.md'])
        self.assertTrue(result);self.assertEqual((calls,edges),(1,1))
        self.assertEqual(proof['candidate'],'b'*40)
        self.assertEqual(receipt['candidate'],'a'*40);self.assertEqual(receipt['sourceCandidate'],'b'*40)
        self.assertTrue(receipt['sourceProofUnchanged'])

    def test_missing_evidence_without_documentation_edge_stays_blocked(self):
        result,calls,_,_,receipt=self.documentation_check()
        self.assertFalse(result);self.assertEqual(calls,0);self.assertIsNone(receipt)

    def test_documentation_never_hides_wrong_source_runtime_or_result(self):
        for field,value in [('candidate','c'*40),('node','v0.0.0'),('result','failure')]:
            proof={**m.evidence('b'*40,'publication-offline-v1'),field:value}
            self.assertFalse(self.documentation_check(['docs/releases/EVOLUTIONS.md'],proof)[0])

    def test_present_incompatible_target_artifact_never_searches_an_ancestor(self):
        result,_,edges,_,receipt=self.documentation_check(['docs/releases/EVOLUTIONS.md'],target_artifact=True)
        self.assertFalse(result);self.assertEqual(edges,0);self.assertIsNone(receipt)

    def test_documentation_edge_requires_actual_git_diff_and_no_controller_change(self):
        for paths,valid in [('docs/releases/EVOLUTIONS.md\n',True),('AGENTS.md\n',False),('tools/test-verification-evidence.py\n',False),('docs/readme.md\nfunctions/index.js\n',False),('',False)]:
            with patch.object(m.subprocess,'check_output',side_effect=['a'*40+' '+'b'*40,paths]):
                self.assertEqual(m.documentation_parent('a'*40) is not None,valid)

    def test_draft_installs_existing_locked_parser_dependencies(self):
        workflow=(ROOT/'.github/workflows/livepalmes-release-draft.yml').read_text(encoding='utf-8')
        self.assertIn('npm ci --prefix tests/firestore-rules --ignore-scripts --prefer-offline --no-audit --no-fund',workflow)


if __name__ == '__main__':
    unittest.main()
