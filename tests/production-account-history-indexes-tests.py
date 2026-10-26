"""Offline negative tests; no cloud connection."""
import copy
import importlib.util
from pathlib import Path
import unittest
import tempfile
import json
import io
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

    def test_inspection_is_get_only_and_apply_requires_final_approval(self):
        with tempfile.TemporaryDirectory() as temporary:
            credentials=Path(temporary)/'credentials.json'
            credentials.write_text(json.dumps({'project_id':'livepalmes','client_email':'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com'}))
            environment={'GITHUB_REF':'refs/heads/main','GITHUB_RUN_ATTEMPT':'1','GOOGLE_APPLICATION_CREDENTIALS':str(credentials),'INDEX_CONFIRMATION':''}
            response=unittest.mock.MagicMock()
            response.__enter__.return_value.read.return_value=b'{"indexes":[]}'
            with patch.dict(m.os.environ,environment),patch.object(m.subprocess,'check_output',return_value='offline-token'),patch.object(m.urllib.request,'urlopen',return_value=response) as network:
                m.main('inspect',str(Path(temporary)/'receipt'))
                self.assertEqual(network.call_count,1)
                self.assertEqual(network.call_args.args[0].get_method(),'GET')
                self.assertEqual(network.call_args.args[0].full_url,m.URL+'?pageSize=0')
                receipt=json.loads((Path(temporary)/'receipt/index-receipt.json').read_text())
                self.assertEqual(receipt['created'],0)
                network.reset_mock()
                with self.assertRaises(ValueError):m.main('apply',str(Path(temporary)/'refused'))
                network.assert_not_called()
                error=m.urllib.error.HTTPError(m.URL,400,'Bad Request',{'Authorization':'must-not-appear'},
                    io.BytesIO(b'{"error":{"status":"INVALID_ARGUMENT","message":"metadata diagnostic"}}'))
                network.side_effect=error
                with self.assertRaisesRegex(ValueError,'HTTP 400: INVALID_ARGUMENT metadata diagnostic') as failure:
                    m.main('inspect',str(Path(temporary)/'metadata-error'))
                self.assertNotIn('must-not-appear',str(failure.exception))

if __name__=='__main__':unittest.main()
