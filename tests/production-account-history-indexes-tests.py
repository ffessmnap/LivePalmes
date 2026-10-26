"""Offline negative tests; no cloud connection."""
import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('indexes',Path(__file__).resolve().parents[1]/'tools/production-account-history-indexes.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class IndexTests(unittest.TestCase):
    def test_exact_add_only_and_ready(self):
        self.assertEqual(m.missing([]),m.DEFINITIONS)
        row={'name':m.PREFIX+'/existing','state':'READY',**m.DEFINITIONS[0]}
        self.assertEqual(m.missing([row]),[m.DEFINITIONS[1]])
        for field,value in [('state','NEEDS_REPAIR'),('state','UNKNOWN')]:
            with self.assertRaises(ValueError):m.missing([{**row,field:value}])
        with self.assertRaises(ValueError):m.missing([row,row])
        self.assertFalse(m.matching({**row,'name':row['name'].replace('livepalmes/','livepalmes-test/')},m.DEFINITIONS[0]))

    def test_mutated_plan_rejected(self):
        request={'candidate':m.CANDIDATE,'productionAccountHistoryIndexes':copy.deepcopy(m.APPROVAL)}
        m.check_plan(request)
        for key,value in [('candidate','0'*40),('addOnly',False),('delete',True),('documents',True),('collection','users')]:
            changed=copy.deepcopy(request)
            changed['productionAccountHistoryIndexes'][key]=value
            with self.assertRaises(ValueError):m.check_plan(changed)
        changed=copy.deepcopy(request);changed['productionAccountHistoryIndexes']['definitions'].pop()
        with self.assertRaises(ValueError):m.check_plan(changed)

    def test_wrong_context_stops_before_token_or_network(self):
        with patch.dict(m.os.environ,{'GITHUB_REF':'refs/heads/other','GITHUB_RUN_ATTEMPT':'1'}),patch.object(m.subprocess,'check_output') as token:
            with self.assertRaises(ValueError):m.main('apply','unused')
            token.assert_not_called()

if __name__=='__main__':unittest.main()
