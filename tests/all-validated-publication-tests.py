"""Offline regression: independently pinned grouped scope, no TEST republication."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('all_cycle', ROOT/'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
REQUEST = json.loads((ROOT/'.github/releases/20261025-all-validated.json').read_text(encoding='utf-8'))
policy = cycle.bcc.for_request(REQUEST)
C = policy.contract()


class GroupedTests(unittest.TestCase):
    def test_both_contracts_remain_independent(self):
        old = cycle.bcc.contract()
        self.assertNotEqual(old['candidate'], C['candidate'])
        self.assertEqual(len(old['selected']), 107)
        self.assertEqual(len(policy.approved(REQUEST)), 108)
        self.assertEqual(len(C['retained']), 5)
        self.assertEqual(set(C['selected'])-set(old['selected']), {'readNapPublicSwimmer'})
        with self.assertRaises(ValueError): cycle.bcc.approved(REQUEST)
        for key, value in [('candidate','f'*40),('testRun',1),('additionalBccFunctions',C['selected'][:-1])]:
            wrong=copy.deepcopy(REQUEST); wrong[key]=value
            with self.subTest(key=key), self.assertRaises(ValueError): cycle.approved_bcc_functions(wrong)

    def test_fingerprints_and_public_reader_source(self):
        proof=policy.verify_fingerprints(C['beforeHashes'], C['afterHashes'], {str(i):{'state':'ACTIVE'} for i in range(112)})
        self.assertEqual((proof['existingSelected'],proof['retainedCount']), (107,5))
        function={'name':'projects/livepalmes/locations/europe-west1/functions/readNapPublicSwimmer'}
        self.assertEqual(set(policy.source_patch(function, {}, C['candidate'])), {'name','buildConfig','labels'})
        with self.assertRaises(ValueError): cycle.bcc.source_patch(function, {}, C['candidate'])

    def test_live_common_proof_without_refresh(self):
        state={'hosting':{'version':C['testHosting']},'functions':[]}
        evidence={'candidate':C['candidate'],'state':state}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            cycle.write(root/'request.json', REQUEST)
            cycle.write(root/'test/test-proof.json', evidence)
            with patch.object(cycle,'artifact',return_value={'head_sha':C['candidate']}) as artifact, patch.object(cycle,'snapshot',return_value=state):
                cycle.verify_test(root)
                artifact.assert_called_once()
                self.assertEqual(cycle.read(root/'test-proof.json')['candidate'],C['candidate'])
            with patch.object(cycle,'artifact',return_value={'head_sha':C['candidate']}), patch.object(cycle,'snapshot',return_value={**state,'hosting':{'version':'drift'}}), self.assertRaises(ValueError):
                cycle.verify_test(root)

    def test_user_validation_is_not_an_import_write(self):
        self.assertEqual(C['groupedValidation'],'Oui je valide tout')
        self.assertFalse(REQUEST['resolveBccProof'])
        self.assertEqual(REQUEST['testBackendRuns'],[])
        self.assertTrue(REQUEST['bccMailTransition']['noReplay'])
        self.assertFalse(REQUEST['bccInfrastructure']['smtpTest'])
        self.assertFalse(REQUEST['bccInfrastructure']['runtimeIamChanges'])
        self.assertNotIn('readNapPublicSwimmer',[r['name'] for r in C['retained']])


if __name__=='__main__': unittest.main()
