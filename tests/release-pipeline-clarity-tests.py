"""Presentation-only SQL scope, actionable read-only discovery and no accidental TEST dispatch."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
scope = load('clarity_scope','test-verification-evidence.py')
auto = load('clarity_auto','automatic-test-publication.py')
readiness = load('clarity_readiness','check-release-prerequisites.py')
proofs = load('clarity_proofs','ci-suite-evidence.py')
timing = load('clarity_timing','ci-runtime.py')


class ClarityTests(unittest.TestCase):
    def test_only_proven_presentation_paths_omit_sql_and_never_fake_a_proof(self):
        for paths in [['portail.css'], ['assets/direct/direct.css','docs/a.md'], ['css/a.css','assets/a.png']]:
            self.assertFalse(scope.mysql_required(paths), paths)
        for paths in [[], ['index.html'], ['app.js'], ['functions/x.css'], ['unknown/x.css'],
                      ['tools/x.py'], ['tests/a.js'], ['css/a.css','functions/index.js'], ['firebase.json']]:
            self.assertTrue(scope.mysql_required(paths), paths)
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'MYSQL_REQUIRED':'false'}), patch.object(proofs,'proof') as create:
            proofs.record(['mysql'],directory); create.assert_not_called()
            self.assertFalse((Path(directory)/'mysql.json').exists())

    def run_info(self):
        return {'event':'push','head_branch':'main','head_repository':{'full_name':'owner/repo'},
                'path':'.github/workflows/livepalmes-verification-preview.yml',
                'status':'completed','conclusion':'success','run_attempt':1,'head_sha':'c'*40}

    def test_tooling_only_commit_never_queries_firebase_or_dispatches_test(self):
        def git(*args): return 'c'*40 if args[0]=='rev-parse' else 'tools/runner.js\ndocs/releases/PROCEDURE.md\n'
        with patch.object(auto.cycle,'gh',return_value={'object':{'sha':'c'*40}}), patch.object(auto.cycle,'git',side_effect=git), patch.object(auto.cycle,'latest_run') as previous:
            result,reason=auto.inputs_for(self.run_info(),'owner/repo','unused')
            self.assertIsNone(result); self.assertIn('aucun deploiement',reason); previous.assert_not_called()

    def test_versioned_rule_snapshots_are_metadata_but_actual_rules_stay_sensitive(self):
        app,backend=auto.cycle.classify(['.github/releases/evidence/20261113-observed-before.rules','portail.css'])
        self.assertEqual(app,['portail.css']); self.assertFalse(backend)
        for p in ['firestore.rules','storage.rules','firebase.json','.github/other.rules',
                  '.github/releases/evidence/unknown.rules','.github/releases/evidence/20261113-../firestore.rules']:
            with self.subTest(path=p), self.assertRaises(ValueError): auto.cycle.classify([p])

    def test_sensitive_delta_is_manual_but_api_or_proof_failure_remains_failure(self):
        def git(*args):
            if args[0]=='rev-parse': return 'c'*40
            return 'portail.css\n' if args[-2]=='c'*40+'^' else 'firestore.rules\n'
        with tempfile.TemporaryDirectory() as directory, patch.object(auto.cycle,'gh',return_value={'object':{'sha':'c'*40}}), patch.object(auto.cycle,'git',side_effect=git), patch.object(auto.cycle,'latest_run',return_value=12), patch.object(auto.cycle,'artifact',return_value={'head_sha':'b'*40}), patch.object(auto.cycle,'read',return_value={'candidate':'b'*40}), patch.object(auto.subprocess,'run'):
            result,reason=auto.inputs_for(self.run_info(),'owner/repo',directory)
            self.assertIsNone(result); self.assertIn('Parcours manuel requis',reason)
            with patch.object(auto.cycle,'artifact',side_effect=ValueError('preuve expiree')), self.assertRaises(ValueError):
                auto.inputs_for(self.run_info(),'owner/repo',directory)

    def test_discovery_exposes_identity_and_available_state_without_plan_or_secret(self):
        credential={'type':'service_account','project_id':'livepalmes','client_email':'existing@livepalmes.iam.gserviceaccount.com','private_key':'NEVER_EXPORT'}
        permissions=['firebasehosting.sites.get','firebasehosting.sites.update']
        rules=SimpleNamespace(PERMISSIONS=['firebaserules.releases.get','firebaserules.rulesets.get','firebaserules.releases.update','firebaserules.rulesets.create'])
        verification=SimpleNamespace(reusable=lambda *args:True)
        for allowed in [permissions,permissions+rules.PERMISSIONS]:
            rules.snapshot=lambda token:({'sha256':'observed'},'actual source')
            rules.digest=lambda source:'observed'
            with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,{'PRODUCTION_DISCOVERY_JSON':json.dumps({'candidate':'a'*40,'services':['hosting','rules']}),'GITHUB_SHA':'b'*40,'GITHUB_RUN_ID':'71','GOOGLE_APPLICATION_CREDENTIALS':'unused'}), patch.object(readiness,'identity_context'), patch.object(readiness.cycle,'git'), patch.object(readiness.cycle,'read',return_value=credential), patch.object(readiness,'load',side_effect=lambda name,file:verification if 'evidence' in file else rules), patch.object(readiness,'read',return_value={'permissions':allowed}), patch.object(readiness.cycle,'api',return_value={'releases':[{'name':'release','version':{'name':'version'}}]}), patch.object(readiness.subprocess,'check_output',return_value='SECRET_TOKEN'), patch.object(readiness.cycle,'artifact') as plan:
                readiness.discover(directory,'hosting')
                report=json.loads((Path(directory)/'production-discovery-hosting.json').read_text())
                self.assertFalse(report['publicationAllowed']); self.assertTrue(report['readOnly']); self.assertEqual(report['iamWrites'],0)
                self.assertEqual(report['identity']['client_email'],credential['client_email']); self.assertIn('hosting',report)
                self.assertEqual(report['discoveryComplete'],allowed!=permissions)
                self.assertEqual('rules' in report,allowed!=permissions)
                self.assertNotIn('NEVER_EXPORT',json.dumps(report)); self.assertNotIn('SECRET_TOKEN',json.dumps(report)); plan.assert_not_called()
                self.assertFalse((Path(directory)/'prerequisites-hosting.json').exists())

    def test_discovery_unknown_service_fails_before_cloud(self):
        with patch.dict(os.environ,{'PRODUCTION_DISCOVERY_JSON':json.dumps({'candidate':'a'*40,'services':['iam-write']})}), patch.object(readiness,'identity_context'), patch.object(readiness,'read') as cloud, self.assertRaises(ValueError):
            readiness.discover('unused','hosting')
        cloud.assert_not_called()

    def test_full_delivery_timing_keeps_sources_and_does_not_sum_job_durations(self):
        rows=[{'phase':'requested','at':'2026-11-13T08:30:49Z','source':'human approval'},
              {'phase':'production-approved','at':'2026-11-13T08:30:49Z','source':'human approval'},
              {'phase':'published','at':'2026-11-13T11:45:41Z','source':'GitHub release'},
              {'phase':'verified','at':'2026-11-13T11:48:38Z','source':'public checks'}]
        result=timing.delivery({'milestones':rows})
        self.assertEqual(result['durationsSeconds']['requestToVerified'],11869)
        self.assertEqual(result['durationsSeconds']['approvalToPublished'],11692)
        for invalid in [[],rows+[rows[0]],[{**rows[0],'source':''}], [{**rows[0],'at':'2026-11-13T08:30:49'}],
                        [rows[0],{**rows[-1],'at':'2026-11-12T08:30:49Z'}]]:
            with self.subTest(invalid=invalid),self.assertRaises(ValueError): timing.delivery({'milestones':invalid})

    def test_denied_rules_contract_keeps_the_actual_source_and_fingerprint(self):
        rules=load('clarity_rules','direct-realtime-production-rules.py')
        contract=readiness.cycle.direct_realtime.contract()
        observed={**contract['rules']['observedBefore'],'sha256':'different'}
        with tempfile.TemporaryDirectory() as directory, patch.object(rules,'context',return_value=(contract,'unused','identity')), patch.object(rules,'snapshot',return_value=(observed,'actual observed source')):
            with self.assertRaisesRegex(ValueError,'Base reelle'):
                rules.readiness(directory,observation_directory=directory)
            result=json.loads((Path(directory)/'production-rules-observed.json').read_text())
            self.assertFalse(result['expectedBaseMatches']); self.assertFalse(result['publicationAllowed'])
            self.assertEqual(result['observed'],observed)
            self.assertEqual((Path(directory)/'production-rules-observed.rules').read_text(),'actual observed source')

    def test_source_discovery_is_one_bounded_get_and_refuses_truncated_inventory(self):
        credential={'type':'service_account','project_id':'livepalmes','client_email':'existing@livepalmes.iam.gserviceaccount.com'}
        granted=readiness.permissions('backend',True,False)
        verification=SimpleNamespace(reusable=lambda *args:True)
        for truncated in [False,True]:
            state=SimpleNamespace(API='https://cloudfunctions.googleapis.com/v2/',request=lambda url:{'functions':[{'name':'function','state':'ACTIVE','serviceConfig':{'revision':'revision','secret':'MUST_NOT_EXPORT'}}], **({'nextPageToken':'more'} if truncated else {})})
            with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,{'PRODUCTION_DISCOVERY_JSON':json.dumps({'candidate':'a'*40,'services':['sources']}),'GITHUB_SHA':'b'*40,'GITHUB_RUN_ID':'71','GOOGLE_APPLICATION_CREDENTIALS':'unused'}), patch.object(readiness,'identity_context'), patch.object(readiness.cycle,'git'), patch.object(readiness.cycle,'read',return_value=credential), patch.object(readiness,'load',side_effect=lambda name,file:verification if 'evidence' in file else state), patch.object(readiness,'read',return_value={'permissions':granted}), patch.object(state,'request',wraps=state.request) as get:
                if truncated:
                    with self.assertRaisesRegex(ValueError,'incomplet'): readiness.discover(directory,'backend')
                else: readiness.discover(directory,'backend')
                get.assert_called_once(); self.assertIn('pageSize=500',get.call_args.args[0]); self.assertEqual(len(get.call_args.args),1)
                report=json.loads((Path(directory)/'production-discovery-backend.json').read_text())
                self.assertFalse(report['publicationAllowed']); self.assertNotIn('MUST_NOT_EXPORT',json.dumps(report))
                self.assertEqual(report['discoveryComplete'],not truncated)


if __name__=='__main__': unittest.main()
