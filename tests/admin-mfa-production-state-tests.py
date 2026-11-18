"""MFA wrapper preserves historical routes and refuses incomplete final source state."""
from copy import deepcopy
import importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_prod_state_tests',ROOT/'tools/admin-mfa-production-state.py')
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)

class StateTests(unittest.TestCase):
    def test_no_implicit_resume_or_unknown_command(self):
        for mode in ['resume','recover','delete','completion']:
            with patch.object(s,'load') as loader,self.assertRaises(ValueError):s.dispatch([mode,'backup','after'])
            loader.assert_not_called()

    def test_non_mfa_backup_keeps_historical_dispatch(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'report.json').write_text('{}')
            old=SimpleNamespace(dispatch=Mock(return_value='historical'))
            with patch.object(s,'load',return_value=old) as loader:
                self.assertEqual(s.dispatch(['check',str(root),'after','success']),'historical')
                loader.assert_called_once_with('direct-csp-production-state.py')

    def test_final_check_refuses_missing_inventory_and_failed_source_phase(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);p=s.load('admin-mfa-production-policy.py')
            names=[p.PREFIX+'fixture'+str(i) for i in range(119)]
            before=[{'name':n,'state':'ACTIVE','commit':'b'*40} for n in names]
            manifest={'candidate':'a'*40,'selected':['fixture0'],'controls':{'fixture':'preserved'}}
            report={'candidate':'a'*40,'newFunctions':[],'sourcePolicyKind':p.KIND,'standardSourceManifestSha256':p.digest(manifest),'functions':[{'name':names[0]}]}
            for filename,value in [('report.json',report),('standard-source-manifest.json',manifest),('functions.json',before)]:
                (root/filename).write_text(json.dumps(value))
            fakep=SimpleNamespace(PREFIX=p.PREFIX,KIND=p.KIND,require=p.require,digest=p.digest,validate_manifest=lambda value:value,
                initial=Mock(),assert_retained=Mock(),assert_selected=Mock(),common=SimpleNamespace(controls=lambda:manifest['controls']))
            state=SimpleNamespace(inventory=Mock(return_value=deepcopy(before)),identity=lambda value:value)
            with patch.object(s,'load',side_effect=lambda name:fakep if name=='admin-mfa-production-policy.py' else state):
                s.check(root,root/'after.json',True)
                self.assertEqual(fakep.assert_selected.call_count,1)
                with self.assertRaises(ValueError):s.check(root,root/'after.json',False)
                state.inventory.return_value=before[:-1]
                with self.assertRaises(ValueError):s.check(root,root/'after.json',True)
                state.inventory.return_value=deepcopy(before)
                fakep.assert_selected.side_effect=ValueError('synthetic changed configuration')
                with self.assertRaises(ValueError):s.check(root,root/'after.json',True)
                self.assertTrue(json.loads((root/'after.json').read_text())['errors'])

    def test_fresh_post_hosting_inventory_configurations_and_witnesses(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);p=s.load('admin-mfa-production-policy.py')
            current=[{'name':p.PREFIX+'fixture'+str(i),'state':'ACTIVE','revision':'r1','commit':'a'*40,'updateTime':'initial','serviceConfig':{'maxInstanceCount':2}} for i in range(119)]
            identity=lambda f:{k:f[k] for k in ['name','state','revision','commit','updateTime']}
            manifest={'candidate':'a'*40,'controls':{'preserved':True}}
            prior={'candidate':'a'*40,'errors':[],'functions':[identity(f) for f in current]}
            report={'candidate':'a'*40,'sourcePolicyKind':p.KIND,'standardSourceManifestSha256':p.digest(manifest),'newFunctions':[],'errors':[]}
            for filename,value in [('report.json',report),('standard-source-manifest.json',manifest),('functions.json',current),('after.json',prior)]:
                (root/filename).write_text(json.dumps(value))
            fakep=SimpleNamespace(KIND=p.KIND,require=p.require,digest=p.digest,validate_manifest=lambda value:value,
                configuration=lambda f:f['serviceConfig'],common=SimpleNamespace(controls=Mock(return_value=manifest['controls'])))
            state=SimpleNamespace(inventory=Mock(return_value=deepcopy(current)),identity=identity)
            with patch.object(s,'load',side_effect=lambda name:fakep if name=='admin-mfa-production-policy.py' else state):
                s.final(root,root/'after.json',root/'final.json')
                proof=json.loads((root/'final.json').read_text());self.assertTrue(proof['readOnly']);self.assertEqual(proof['inventoryCount'],119)
                for change in [{'revision':'external-change'},{'serviceConfig':{'maxInstanceCount':3}}]:
                    state.inventory.return_value=deepcopy(current);state.inventory.return_value[0].update(change)
                    with self.assertRaises(ValueError):s.final(root,root/'after.json',root/'refused.json')
                    self.assertFalse((root/'refused.json').exists())
                state.inventory.return_value=deepcopy(current);fakep.common.controls.return_value={'preserved':False}
                with self.assertRaises(ValueError):s.final(root,root/'after.json',root/'refused.json')
                fakep.common.controls.return_value=manifest['controls']
                for change in [{'candidate':'b'*40},{'errors':['synthetic failure']},{'functions':prior['functions']+[prior['functions'][0]]}]:
                    (root/'after.json').write_text(json.dumps({**prior,**change}))
                    with self.assertRaises(ValueError):s.final(root,root/'after.json',root/'refused.json')

if __name__=='__main__':unittest.main()
