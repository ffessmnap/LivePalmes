"""All MFA runtimes are covered with bounded shared IAM reads; fixtures only."""
from copy import deepcopy
import importlib.util,json,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_prod_caps_tests',ROOT/'tools/admin-mfa-production-capabilities.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
ACCOUNT='fixture@livepalmes.iam.gserviceaccount.com'
PREFIX='projects/livepalmes/locations/europe-west1/functions/'

class CapabilityTests(unittest.TestCase):
    def fixture(self):
        entry=json.loads((ROOT/'.github/releases/evidence/20261118-test-admin-mfa-contract.json').read_text())
        names=sorted(set(entry['installedFunctions'])-{'exportNapPublicPage','getNapSwimmerPerformances'})
        selected=sorted(set(entry['allowedFunctions']) & set(names))
        self.assertEqual((len(names),len(selected)),(119,110))
        functions=[{'name':PREFIX+n,'state':'ACTIVE','environment':'GEN_2','buildConfig':{'runtime':'nodejs22','entryPoint':n},'serviceConfig':{'serviceAccountEmail':ACCOUNT}} for n in names]
        policy=p.load('admin-mfa-production-policy.py')
        c={'candidate':'a'*40,'selected':selected,'installedNamesSha256':policy.digest(names)}
        return functions,policy,c

    def read(self,missing=False,conditional=False):
        calls=[]
        def read(url,body=None):
            calls.append((url,body))
            if ':getIamPolicy' in url:
                grant={'role':'roles/fixture','members':['serviceAccount:'+ACCOUNT]}
                if conditional:grant['condition']={'expression':'false'}
                return {'bindings':[grant]}
            self.assertEqual(url,'https://iam.googleapis.com/v1/roles/fixture?fields=includedPermissions')
            return {'includedPermissions':['datastore.entities.get'] if missing else ['datastore.databases.get','datastore.entities.get','datastore.entities.create','datastore.entities.update']}
        return read,calls

    def test_all_110_consumers_with_two_requests_no_impersonation(self):
        functions,policy,c=self.fixture();read,calls=self.read();original=p.load
        with patch.object(p,'load',side_effect=lambda name:policy if name=='admin-mfa-production-policy.py' else original(name)),patch.object(policy,'contract',return_value=c):
            proof=p.runtime_permissions(functions,read)
        self.assertTrue(proof['ready']);self.assertEqual((proof['selectedCount'],proof['retainedCount']),(110,9))
        self.assertEqual(len(calls),2);self.assertEqual(len(proof['runtimeAccounts'][0]['selectedFunctions']),110)
        self.assertFalse(proof['impersonation']);self.assertEqual(proof['sessionWrites'],0)
        self.assertNotIn(ACCOUNT,json.dumps(proof))

    def test_missing_conditional_or_denied_permissions_never_qualify(self):
        functions,policy,c=self.fixture();original=p.load
        with patch.object(p,'load',side_effect=lambda name:policy if name=='admin-mfa-production-policy.py' else original(name)),patch.object(policy,'contract',return_value=c):
            for options in [{'missing':True},{'conditional':True}]:
                read,calls=self.read(**options);proof=p.runtime_permissions(functions,read)
                self.assertFalse(proof['ready']);self.assertTrue(proof['missingRuntimePermissions']);self.assertLessEqual(len(calls),2)
            with self.assertRaises(PermissionError):p.runtime_permissions(functions,lambda *args:(_ for _ in ()).throw(PermissionError('synthetic refusal')))
            read,calls=self.read()
            for invalid in [functions[:-1],functions+[functions[0]],[{**f,'state':'FAILED'} for f in functions]]:
                with self.assertRaises(ValueError):p.runtime_permissions(invalid,read)

if __name__=='__main__':unittest.main()
