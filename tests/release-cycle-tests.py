"""Offline safety scenarios for the reusable release circuit."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('cycle',Path(__file__).parents[1]/'tools/release-cycle.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ReleaseTests(unittest.TestCase):
    def request(self):
        return {'schema':1,'candidate':'a'*40,'productionCommit':'b'*40,'productionHosting':'sites/livepalmes/versions/example','testRun':12,'changes':[{'title':'Affichage','status':'validated','validation':'Antoine, retour sur le commit teste','paths':['portail.html']}]}
    def test_ui_does_not_select_backend(self):
        self.assertFalse(m.validate_request(self.request(),['portail.html','docs/example.md']))
    def test_unvalidated_work_blocks_release(self):
        value=self.request();value['changes'][0]['status']='in-progress'
        with self.assertRaises(ValueError):m.validate_request(value,['portail.html'])
    def test_unlisted_application_change_blocks_release(self):
        with self.assertRaises(ValueError):m.validate_request(self.request(),['portail.html','assets/extra.js'])
    def test_rules_indexes_and_data_need_separate_authorization(self):
        for path in ['firestore.rules','firestore.indexes.json','firebase.json','performances/public/data/records-data.js','archives/result.json']:
            with self.subTest(path=path),self.assertRaises(ValueError):m.classify([path])
    def test_backend_requires_review_of_excluded_functions(self):
        value=self.request();value['changes'][0]['paths']=['functions/index.js']
        with self.assertRaises(ValueError):m.validate_request(value,['functions/index.js'])
        value['excludedBackendReview']='Analyse des fonctions de mail et schedulers : aucun changement a publier'
        self.assertTrue(m.validate_request(value,['functions/index.js']))
    def test_changed_production_blocks_publication(self):
        with tempfile.TemporaryDirectory() as d:
            m.write(Path(d)/'prod-before.json',{'version':'old'})
            with patch.object(m,'snapshot',return_value={'version':'new'}),self.assertRaises(ValueError):m.compare_prod(d)
    def test_wrong_test_commit_blocks_plan(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r)
            m.write(Path(d)/'test/test-proof.json',{'candidate':'c'*40,'state':{}})
            with patch.object(m,'artifact',return_value={'head_sha':'a'*40}),self.assertRaises(ValueError):m.verify_test(d)
    def test_changed_test_snapshot_blocks_plan(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r)
            m.write(Path(d)/'test/test-proof.json',{'candidate':'a'*40,'state':{'revision':'old'}})
            with patch.object(m,'artifact',return_value={'head_sha':'a'*40}),patch.object(m,'snapshot',return_value={'revision':'new'}),self.assertRaises(ValueError):m.verify_test(d)
    def test_cli_zero_with_missing_function_is_failure(self):
        with tempfile.TemporaryDirectory() as d:
            m.write(Path(d)/'selection.json',['one']);m.write(Path(d)/'credentials.json',{'project_id':'livepalmes'})
            with patch.dict(os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(Path(d)/'credentials.json'),'CANDIDATE_SHA':'a'*40}),patch.object(m,'safe_functions',return_value=['one']),patch.object(m.subprocess,'run') as command,patch.object(m,'snapshot',return_value={'functions':[]}),patch.object(m.time,'sleep'),self.assertRaises(ValueError):
                m.deploy_batches('livepalmes',d,d,str(Path(d)/'selection.json'),False)
            self.assertEqual(command.call_count,1)
    def test_batches_limited_to_ten_and_exclude_unsafe_functions(self):
        names=['fn'+str(i) for i in range(23)]
        with tempfile.TemporaryDirectory() as d:
            m.write(Path(d)/'selection.json',names);m.write(Path(d)/'credentials.json',{'project_id':'livepalmes'})
            with patch.dict(os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(Path(d)/'credentials.json'),'CANDIDATE_SHA':'a'*40}),patch.object(m,'safe_functions',return_value=names),patch.object(m.subprocess,'run') as command:
                m.deploy_batches('livepalmes',d,d,str(Path(d)/'selection.json'),True)
                self.assertEqual(command.call_count,3)
                for call in command.call_args_list:
                    args=call.args[0];self.assertIn('--dry-run',args)
                    self.assertLessEqual(len(args[args.index('--only')+1].split(',')),10)
            m.write(Path(d)/'selection.json',['sendEmails'])
            with patch.dict(os.environ,{'GOOGLE_APPLICATION_CREDENTIALS':str(Path(d)/'credentials.json')}),patch.object(m,'safe_functions',return_value=names),self.assertRaises(ValueError):
                m.deploy_batches('livepalmes',d,d,str(Path(d)/'selection.json'),False)
    def test_tampered_artifact_not_extracted(self):
        metadata={'id':1,'name':'release-plan','expired':False,'digest':'sha256:'+'0'*64,'workflow_run':{'id':12}}
        responses=[{'status':'completed','head_branch':'main','run_attempt':1},{'artifacts':[metadata]},metadata]
        with tempfile.TemporaryDirectory() as d,patch.dict(os.environ,{'GITHUB_REPOSITORY':'ffessmnap/LivePalmes'}),patch.object(m,'gh',side_effect=responses),patch.object(m.subprocess,'check_output',return_value=b'tampered'),self.assertRaises(ValueError):
            m.artifact(12,'release-plan',d)
    def test_production_functions_unchanged_by_ui_plan(self):
        with tempfile.TemporaryDirectory() as d:
            r=self.request();m.write(Path(d)/'request.json',r);m.write(Path(d)/'paths.json',['portail.html'])
            with patch.object(m,'safe_functions') as backend:
                m.prepare_selection(d,'.');backend.assert_not_called()
            self.assertEqual(m.read(Path(d)/'selection.json'),[])

if __name__=='__main__':unittest.main()
