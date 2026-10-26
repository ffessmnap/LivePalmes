"""Final audit cannot accept another release, source or live revision."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('audit',ROOT/'tools/verify-production-resumed.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
R=json.loads((ROOT/'.github/releases/20261025-all-validated.json').read_text(encoding='utf-8'))
C=m.cycle.bcc.for_request(R).contract()


class AuditTests(unittest.TestCase):
    def test_exact_snapshot_and_refusals(self):
        names=C['selected']+[r['name'] for r in C['retained']]
        rows=[dict(name='projects/livepalmes/locations/europe-west1/functions/'+n,
            revision='fixture',updateTime='now',state='ACTIVE',commit=R['candidate']) for n in names]
        current={'hosting':{'name':'release','version':'version'},'functions':rows}
        after={'candidate':R['candidate'],'errors':[],
            'functions':[{k:v for k,v in f.items() if k!='commit'} for f in rows]}
        m.verify_state(R,after,current['hosting'],current)
        for field,value in [('revision','changed'),('state','FAILED'),('commit','f'*40)]:
            bad=copy.deepcopy(current);bad['functions'][0][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):m.verify_state(R,after,current['hosting'],bad)
        bad=copy.deepcopy(current);bad['hosting']['version']='other'
        with self.assertRaises(ValueError):m.verify_state(R,after,current['hosting'],bad)
        bad=copy.deepcopy(current);bad['functions'][-1]=bad['functions'][0]
        with self.assertRaises(ValueError):m.verify_state(R,after,current['hosting'],bad)

    def test_wrong_context_refused_before_any_api(self):
        with patch.object(m.cycle,'artifact') as artifact:
            for env in [{'GITHUB_REF':'refs/heads/other','GITHUB_RUN_ATTEMPT':'1'},
                {'GITHUB_REF':'refs/heads/main','GITHUB_RUN_ATTEMPT':'2'}]:
                with patch.dict(m.os.environ,env),self.assertRaises(ValueError):m.main('unused')
            with patch.dict(m.os.environ,{'GITHUB_REF':'refs/heads/main','GITHUB_RUN_ATTEMPT':'1',
                'GOOGLE_APPLICATION_CREDENTIALS':'unused'}),patch.object(m.cycle,'read',return_value={
                'project_id':'livepalmes-test','client_email':'other@example.invalid'}),self.assertRaises(ValueError):
                m.main('unused')
            artifact.assert_not_called()
        self.assertEqual(m.RUN,40239558546)


if __name__=='__main__':unittest.main()
