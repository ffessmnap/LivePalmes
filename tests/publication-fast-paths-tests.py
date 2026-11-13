"""Negative release gates and TEST-only benchmark; no network or Firebase use."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


hosting = load('fast_hosting', 'check-production-hosting.py')
inputs = load('fast_inputs', 'prepare-release-input.py')
evidence = load('fast_evidence', 'test-verification-evidence.py')
benchmark = load('fast_benchmark', 'benchmark-test-source-builds.py')
parallel = load('fast_parallel', 'release-source-parallelism.py')
readiness = load('fast_readiness', 'check-release-prerequisites.py')


class FastPathsTests(unittest.TestCase):
    def test_input_is_one_bounded_object_with_unique_keys(self):
        self.assertEqual(inputs.manifest('', '{"schema":1}'), {'schema': 1})
        self.assertEqual(inputs.manifest('.github/releases/example.json', '')['schema'], 1)
        for file, inline in [('', ''), ('.github/releases/example.json', '{}'), ('../secret', ''),
                             ('', '[]'), ('', '{"a":1,"a":2}'), ('', json.dumps({'large': 'x'*65536}))]:
            with self.subTest(file=file), self.assertRaises(ValueError):
                inputs.manifest(file, inline)
        with patch.object(inputs, 'manifest', return_value={'schema': 0}), tempfile.TemporaryDirectory() as directory:
            # Inline input delegates to the original validator; it is no bypass.
            with self.assertRaises((ValueError, KeyError)):
                inputs.main(directory)

    def test_documentation_scope_never_accepts_code_or_unknown_changes(self):
        self.assertTrue(evidence.documentation_only(['docs/releases/EVOLUTIONS.md']))
        for paths in [[], ['AGENTS.md'], ['docs/helper.py'], ['docs/a.md', 'functions/index.js'],
                      ['docs/a.md', '.github/workflows/check.yml'], ['docs/a.json']]:
            self.assertFalse(evidence.documentation_only(paths))
        with tempfile.TemporaryDirectory() as directory, patch.object(evidence, 'ROOT', Path(directory)):
            file = Path(directory) / 'doc.md'
            for content in ['No description', '<!-- description: x -->\n<<<<<<< conflict', '<!-- description: x -->\n\x00']:
                file.write_text(content, encoding='utf-8')
                with self.assertRaises(ValueError):
                    evidence.check_documentation(['doc.md'])
            file.write_text('<!-- description: Example -->\nTexte français.', encoding='utf-8')
            evidence.check_documentation(['doc.md'])

    def hosting_fixture(self, root):
        for name in hosting.FILES:
            file = Path(root) / name; file.parent.mkdir(parents=True, exist_ok=True); file.write_bytes(b'exact')

    def test_hosting_retries_transient_content_without_redeploy(self):
        calls = []
        def read(url):
            calls.append(url)
            if any(url.endswith(name) for name in hosting.EXCLUDED):
                return 404, b'', {}
            body = b'stale' if len(calls) == 1 else b'exact'
            return 200, body, {'Cache-Control': 'no-store', 'Content-Security-Policy': 'present'}
        with tempfile.TemporaryDirectory() as directory, patch.object(hosting.time, 'sleep') as sleep:
            self.hosting_fixture(directory)
            receipt = Path(directory) / 'receipt.json'
            hosting.check(directory, 12, read, sleep, receipt)
            sleep.assert_called_once_with(5)
            self.assertEqual(len(calls), 8)
            self.assertEqual(len(json.loads(receipt.read_text())), 8)

    def test_hosting_persistent_mismatch_headers_and_exclusions_remain_blocking(self):
        with tempfile.TemporaryDirectory() as directory:
            self.hosting_fixture(directory)
            for kind in ['stale', 'headers', 'excluded']:
                calls = []
                def read(url):
                    calls.append(url)
                    excluded = any(url.endswith(n) for n in hosting.EXCLUDED)
                    return (200 if kind == 'excluded' or not excluded else 404,
                            b'stale' if kind == 'stale' else b'exact',
                            {} if kind == 'headers' else {'Cache-Control': 'no-store', 'Content-Security-Policy': 'present'})
                with patch.object(hosting.time, 'sleep') as sleep, self.assertRaises(ValueError):
                    hosting.check(directory, 12, read, sleep)
                self.assertLessEqual(len(calls), 6)
                self.assertEqual(sleep.call_count, 2 if kind == 'stale' else 0)

    def test_publication_proof_has_distinct_suite(self):
        self.assertNotEqual(evidence.evidence('a'*40), evidence.evidence('a'*40, 'publication-offline-v1'))
        with patch.dict(os.environ, {'GITHUB_SHA': 'a'*40}), patch.object(evidence, 'reusable', return_value=True) as reuse, patch.object(evidence.cycle, 'output') as output, patch.object(evidence.sys, 'argv', ['tool', 'reuse-publication', 'dir']):
            evidence.main()
            reuse.assert_called_once_with('a'*40, 'dir', 'publication-offline-v1')
            output.assert_called_once_with(verified='true')

    def test_ci_covers_every_attested_preflight_and_release_test(self):
        ci = (ROOT / evidence.WORKFLOW).read_text(encoding='utf-8')
        for file in ['livepalmes-production-preflight.yml', 'livepalmes-production-release.yml']:
            workflow = (ROOT / '.github/workflows' / file).read_text(encoding='utf-8')
            self.assertIn("if: steps.tooling-ci.outputs.verified != 'true'", workflow)
            for command in re.findall(r'^\s+((?:node|python) tooling/tests/[^\n]+)', workflow, re.M):
                self.assertIn(command.replace('tooling/', ''), ci)
        self.assertEqual(ci.count("if: github.event_name == 'push' && steps.test-scope.outputs.documentation != 'true'"), 4)
        self.assertIn("if: steps.test-scope.outputs.documentation != 'true'", ci)

    def test_benchmark_api_cannot_write_prod_mail_config_or_invoke(self):
        for url, method, body in [(benchmark.API+'projects/livepalmes/locations/-/functions', 'GET', None),
                (benchmark.MAIL, 'PATCH', {}), (benchmark.API+benchmark.PREFIX+benchmark.NAMES[0]+':call', 'POST', {}),
                (benchmark.API+benchmark.PREFIX+benchmark.NAMES[0]+'?updateMask=service_config', 'PATCH', {}),
                (benchmark.API+benchmark.PREFIX+'sendEmail?updateMask=build_config.source,labels', 'PATCH', {})]:
            with patch.object(benchmark.subprocess, 'check_output') as token, self.assertRaises(ValueError):
                benchmark.api(url, method, body)
            token.assert_not_called()
        with patch.dict(os.environ, {'GITHUB_REF': 'refs/heads/feature', 'TARGET_FIREBASE_PROJECT': 'livepalmes'}), self.assertRaises(ValueError):
            benchmark.context()

    def test_benchmark_detects_config_and_exclusion_drift(self):
        name = benchmark.PREFIX + benchmark.NAMES[0]
        before = {name: {'name': name, 'state': 'ACTIVE', 'buildConfig': {'runtime': 'nodejs22'},
                         'serviceConfig': {'timeoutSeconds': 60}, 'updateTime': 'old'},
                  benchmark.PREFIX+'excluded': {'name': benchmark.PREFIX+'excluded', 'updateTime': 'old'}}
        benchmark.check(before, copy.deepcopy(before), {}, 'a'*40)
        for scope in ['config', 'excluded', 'inventory', 'revision']:
            current = copy.deepcopy(before)
            if scope == 'config': current[name]['serviceConfig']['timeoutSeconds'] = 300
            if scope == 'excluded': current[benchmark.PREFIX+'excluded']['updateTime'] = 'new'
            if scope == 'inventory': current.pop(benchmark.PREFIX+'excluded')
            if scope == 'revision': current[name]['updateTime'] = 'new'
            with self.subTest(scope=scope), self.assertRaises(ValueError):
                benchmark.check(before, current, {}, 'a'*40)

    def test_benchmark_quota_failure_writes_receipt_and_never_updates_a_source(self):
        rows = {benchmark.PREFIX+n: {'name': benchmark.PREFIX+n, 'labels': {'livepalmes-commit': 'a'*40}} for n in benchmark.NAMES}
        def api(url, *args):
            if url == benchmark.HOSTING: return {'releases': [{}]}
            if url == benchmark.QUOTAS: raise ValueError('Quota access denied')
            if url == benchmark.MAIL: return {}
            raise AssertionError('Unexpected write')
        with tempfile.TemporaryDirectory() as directory, patch.object(benchmark, 'context', return_value='a'*40), patch.object(benchmark, 'inventory', return_value=rows), patch.object(benchmark, 'api', side_effect=api), patch.object(benchmark.cycle, 'latest_run', return_value=12), patch.object(benchmark.cycle, 'artifact'), patch.object(benchmark.cycle, 'read', return_value={}), patch.object(benchmark.cycle, 'snapshot', return_value={}), patch.object(benchmark.cycle, 'matching_functions', return_value=set(rows)), patch.object(benchmark.cycle, 'targeted_test_evidence', return_value=set()), patch.object(benchmark.cycle, 'backend_fingerprints', return_value={n:'same' for n in benchmark.NAMES}), patch.object(benchmark.cycle, 'backend_proof') as proof:
            with self.assertRaisesRegex(ValueError, 'Quota access denied'):
                benchmark.run(directory)
            proof.assert_not_called()
            self.assertFalse(json.loads((Path(directory)/'benchmark.json').read_text())['success'])

    def test_parallelism_stays_three_without_authentic_positive_measurement(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(parallel.selected(directory), 3)
            parallel.prepare(directory, '0')
            self.assertEqual(parallel.selected(directory), 3)
            proof = {'schema': 1, 'project': 'livepalmes-test', 'candidate': 'a'*40, 'success': True,
                     'mailUnchanged': True, 'hostingUnchanged': True, 'functions': list(benchmark.NAMES),
                     'rounds': [{'parallelism': n, 'seconds': seconds, 'operations': [{'name': name, 'buildId': str(n)+name} for name in benchmark.NAMES]}
                                for n, seconds in [(3, 120), (6, 70)]]}
            parallel.validate(proof)
            for key, value in [('success', False), ('mailUnchanged', False), ('project', 'livepalmes')]:
                with self.assertRaises(ValueError): parallel.validate({**proof, key: value})
            bad = copy.deepcopy(proof); bad['rounds'][1]['seconds'] = 130
            with self.assertRaises(ValueError): parallel.validate(bad)
            bad = copy.deepcopy(proof); bad['rounds'][1]['operations'] = copy.deepcopy(bad['rounds'][0]['operations'])
            with self.assertRaises(ValueError): parallel.validate(bad)
            # A user-supplied concurrency value cannot stand in for a sealed proof.
            Path(directory, 'source-build-concurrency.json').write_text('{"schema":1,"parallelism":6}')
            with self.assertRaises(ValueError): parallel.selected(directory)

    def test_prerequisites_report_only_needed_permissions_and_cannot_write(self):
        self.assertEqual(readiness.permissions('hosting', True, True), ['firebasehosting.sites.get', 'firebasehosting.sites.update'])
        self.assertNotIn('datastore.indexes.create', readiness.permissions('backend', True, False))
        self.assertIn('datastore.indexes.create', readiness.permissions('backend', True, True))
        for url in ['https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:setIamPolicy',
                    'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/anything',
                    'https://cloudfunctions.googleapis.com/v2/projects/livepalmes/locations/europe-west1/functions']:
            with patch.object(readiness.subprocess, 'check_output') as token, self.assertRaises(ValueError):
                readiness.read(url, {})
            token.assert_not_called()

    def test_two_complete_benchmark_rounds_and_failure_stops_later_batches(self):
        for failing in [False, True]:
            rows = {benchmark.PREFIX+n: {'name': benchmark.PREFIX+n, 'state': 'ACTIVE', 'updateTime': 'old',
                    'labels': {'livepalmes-commit': 'a'*40}, 'buildConfig': {'runtime': 'nodejs22'},
                    'serviceConfig': {'timeoutSeconds': 60}} for n in benchmark.NAMES}
            calls = []
            uploads = []
            def api(url, method='GET', body=None):
                if url == benchmark.MAIL: return {}
                if url == benchmark.HOSTING: return {'releases': [{}]}
                if url == benchmark.QUOTAS: return {'metrics': [{'name': 'quota'}]}
                if url.endswith(':generateDownloadUrl'): return {'downloadUrl': 'https://storage.googleapis.com/source'}
                if url.endswith(':generateUploadUrl'):
                    uploads.append(1)
                    return {'uploadUrl': 'https://storage.googleapis.com/upload', 'storageSource': {'bucket':'test', 'object':str(len(uploads))}}
                if method == 'PATCH':
                    calls.append(body)
                    if failing: return {'done': True, 'error': {'message': 'simulated'}}
                    rows[body['name']]['updateTime'] = str(len(calls))
                    rows[body['name']]['labels'] = body['labels']
                    rows[body['name']]['buildConfig']['build'] = 'build-'+str(len(calls))
                    return {'done': True}
                if url.startswith(benchmark.API+benchmark.PREFIX): return copy.deepcopy(rows[url[len(benchmark.API):]])
                raise AssertionError('Unexpected API')
            with tempfile.TemporaryDirectory() as directory, patch.object(benchmark, 'context', return_value='a'*40), patch.object(benchmark, 'inventory', side_effect=lambda: copy.deepcopy(rows)), patch.object(benchmark, 'api', side_effect=api), patch.object(benchmark.cycle, 'latest_run', return_value=12), patch.object(benchmark.cycle, 'artifact'), patch.object(benchmark.cycle, 'read', return_value={}), patch.object(benchmark.cycle, 'snapshot', return_value={}), patch.object(benchmark.cycle, 'matching_functions', return_value=set(rows)), patch.object(benchmark.cycle, 'targeted_test_evidence', return_value=set()), patch.object(benchmark.cycle, 'backend_fingerprints', return_value={n:'same' for n in benchmark.NAMES}), patch.object(benchmark.cycle, 'backend_proof') as proof, patch.object(benchmark.source_check, 'archive_manifest'), patch.object(benchmark.urllib.request, 'urlopen', side_effect=lambda *a, **k: io.BytesIO(b'source')):
                if failing:
                    with self.assertRaisesRegex(ValueError, 'Build TEST interrompu'): benchmark.run(directory)
                    proof.assert_not_called()
                    self.assertLessEqual(len(calls), 3)
                else:
                    benchmark.run(directory)
                    proof.assert_called_once()
                    self.assertEqual(len(calls), 12)
                receipt = json.loads((Path(directory)/'benchmark.json').read_text())
                self.assertEqual(receipt['success'], not failing)
                self.assertEqual(len(receipt['rounds']), 0 if failing else 2)


class HostingIdentityDiagnosticTests(unittest.TestCase):
    def environment(self):
        return {'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main',
          'GITHUB_RUN_ATTEMPT':'1','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_SHA':'a'*40,
          'GITHUB_RUN_ID':'123','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'}

    def test_metadata_allowlist_never_returns_key_or_whole_credential(self):
        value={'type':'service_account','project_id':'livepalmes','client_email':'existing-publisher@livepalmes.iam.gserviceaccount.com',
               'private_key':'NEVER_EXPORT_KEY','private_key_id':'NEVER_EXPORT_ID','token_uri':'NEVER_EXPORT_URI'}
        result=readiness.public_hosting_identity(json.dumps(value))
        self.assertEqual(result['client_email'],value['client_email']);self.assertTrue(result['matchesClosedRulesIdentityPolicy'])
        self.assertNotIn('NEVER_EXPORT',json.dumps(result));self.assertNotIn('private_key',result)
        for mutation in [{'type':'authorized_user'},{'project_id':'other'},{'client_email':'person@example.test'},{'client_email':'bad\n@example.gserviceaccount.com'}]:
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):readiness.public_hosting_identity(json.dumps({**value,**mutation}))
        for raw in ['not json','[]','null']:
            with self.assertRaises(ValueError):readiness.public_hosting_identity(raw)

    def test_identity_context_is_main_dispatch_attempt_one_only(self):
        with patch.dict(os.environ,self.environment()):readiness.identity_context()
        for key,value in [('GITHUB_REF','refs/heads/other'),('GITHUB_REPOSITORY','other/repo'),('GITHUB_RUN_ATTEMPT','2'),
                          ('GITHUB_EVENT_NAME','pull_request'),('GITHUB_WORKFLOW_REF','other'),('GITHUB_SHA','bad')]:
            with self.subTest(key=key),patch.dict(os.environ,{**self.environment(),key:value}),self.assertRaises(ValueError):readiness.identity_context()

    def test_identity_requires_exact_authenticated_context_and_does_not_call_cloud(self):
        c=readiness.cycle.direct_realtime.contract()
        context={'schema':1,'project':'livepalmes','candidate':c['candidate'],'planRun':456,'toolingCommit':'a'*40,
                 'run':123,'contractSha256':readiness.cycle.direct_realtime.DIGEST,'readOnly':True,'publicationCIAuthenticated':True}
        credential=json.dumps({'type':'service_account','project_id':'livepalmes','client_email':'existing-publisher@livepalmes.iam.gserviceaccount.com','private_key':'NEVER_EXPORT'})
        for mutation in [None,'run','candidate','publicationCIAuthenticated']:
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory);proof=copy.deepcopy(context)
                if mutation=='run':proof['run']=124
                if mutation=='candidate':proof['candidate']='b'*40
                if mutation=='publicationCIAuthenticated':proof['publicationCIAuthenticated']=False
                (root/'production-hosting-identity-context.json').write_text(json.dumps(proof))
                with patch.dict(os.environ,{**self.environment(),'PRODUCTION_HOSTING_CREDENTIAL_METADATA':credential}),patch.object(readiness,'read') as cloud,patch.object(readiness.cycle,'api') as api,patch.object(readiness.subprocess,'check_output') as command:
                    if mutation:
                        with self.assertRaises(ValueError):readiness.hosting_identity(root,'456')
                    else:
                        readiness.hosting_identity(root,'456')
                        result=json.loads((root/'production-hosting-identity.json').read_text())
                        self.assertEqual(result['cloudApiCalls'],0);self.assertFalse(result['keyMaterialExported'])
                        self.assertNotIn('NEVER_EXPORT',json.dumps(result));self.assertNotIn('PRODUCTION_HOSTING_CREDENTIAL_METADATA',os.environ)
                    cloud.assert_not_called();api.assert_not_called();command.assert_not_called()

    def test_identity_prepare_requires_immutable_plan_and_exact_main_ci(self):
        c=readiness.cycle.direct_realtime.contract()
        request={'schema':1,**{k:c[k] for k in ['candidate','productionCommit','productionHosting','testRun']},
                 readiness.cycle.direct_realtime.OPTION:{'contractSha256':readiness.cycle.direct_realtime.DIGEST}}
        for valid in [False,True]:
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory);(root/'request.json').write_text(json.dumps(request))
                with patch.dict(os.environ,self.environment()),patch.object(readiness.cycle,'artifact') as archive,patch.object(readiness,'load',return_value=evidence),patch.object(evidence,'reusable',return_value=valid) as ci,patch.object(readiness,'read') as cloud:
                    if valid:
                        readiness.prepare_hosting_identity(root,'456')
                        result=json.loads((root/'production-hosting-identity-context.json').read_text())
                        self.assertEqual(result['candidate'],c['candidate']);self.assertEqual(result['toolingCommit'],'a'*40)
                        self.assertEqual(result['planRun'],456);self.assertTrue(result['publicationCIAuthenticated'])
                    else:
                        with self.assertRaisesRegex(ValueError,'CI main'):readiness.prepare_hosting_identity(root,'456')
                        self.assertFalse((root/'production-hosting-identity-context.json').exists())
                    archive.assert_called_once_with('456','release-plan',root,'.github/workflows/livepalmes-production-preflight.yml')
                    ci.assert_called_once_with('a'*40,root/'identity-ci','publication-offline-v1');cloud.assert_not_called()

    def test_identity_workflow_is_distinct_from_denied_prerequisites(self):
        text=(ROOT/'.github/workflows/livepalmes-production-readiness.yml').read_text(encoding='utf-8')
        self.assertIn('!inputs.identity_only',text)
        identity=text.split('  hosting_identity:',1)[1].split('\n  rules_observation:',1)[0]
        self.assertIn('inputs.identity_only',identity);self.assertIn('production-hosting-identity',identity)
        self.assertIn('secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES',identity)
        for forbidden in ['google-github-actions/auth','setup-gcloud','setIamPolicy','gcloud','firebase deploy','production-prerequisites-hosting']:
            self.assertNotIn(forbidden,identity)


class ProductionRulesObservationTests(unittest.TestCase):
    def test_real_snapshot_is_preserved_even_when_the_closed_expected_base_does_not_match(self):
        rules=load('observation_rules_test','direct-realtime-production-rules.py');c=readiness.cycle.direct_realtime.contract()
        for matches in [False,True]:
            source='authenticated historical source\n';observed={'releaseName':'projects/livepalmes/releases/cloud.firestore','rulesetName':'projects/livepalmes/rulesets/observed','sha256':rules.digest(source),'updateTime':'2026-11-13T00:00:00Z'}
            expected=copy.deepcopy(c)
            if matches:expected['rules']['beforeSha256']=observed['sha256']
            with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'GITHUB_RUN_ID':'123','GITHUB_SHA':'a'*40}),patch.object(readiness,'prepare_hosting_identity') as prepare,patch.object(readiness,'load',return_value=rules),patch.object(rules,'context',return_value=(expected,'offline','b'*64)),patch.object(rules,'snapshot',return_value=(observed,source)):
                root=Path(directory);readiness.observe_production_rules(root,'456');prepare.assert_called_once_with(root,'456')
                report=json.loads((root/'production-rules-observation.json').read_text())
                self.assertEqual(report['observed'],observed);self.assertEqual(report['expectedBaseMatches'],matches)
                self.assertFalse(report['publicationAllowed']);self.assertEqual(report['rulesWrites'],0)
                self.assertEqual((root/'observed-production-before.rules').read_text(),source)
                self.assertFalse((root/'prerequisites-hosting.json').exists())

    def test_rules_observation_workflow_does_not_call_prerequisites_or_publisher(self):
        text=(ROOT/'.github/workflows/livepalmes-production-readiness.yml').read_text(encoding='utf-8')
        self.assertIn('!inputs.rules_observation_only',text)
        observation=text.split('  rules_observation:',1)[1]
        self.assertIn('secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES',observation)
        self.assertIn('rules-observe',observation)
        for forbidden in ['firebase deploy','setIamPolicy','production-prerequisites-hosting','identity-prepare']:
            self.assertNotIn(forbidden,observation)


if __name__ == '__main__':
    unittest.main()
