"""Optional guards: complete coverage, fail-closed permissions and local context."""
import importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location('test_optional_'+name.replace('-','_'),ROOT/'tools'/name)
    p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p);return p
p=load('optional-access-production-capabilities.py')
PREFIX='projects/livepalmes/locations/europe-west1/functions/'
ACCOUNT='fixture@livepalmes.iam.gserviceaccount.com'
class CapabilityTests(unittest.TestCase):
    def fixture(self):
        c=json.loads((ROOT/'.github/releases/evidence/20261118-test-admin-mfa-optional-contract.json').read_text())
        names=sorted(set(c['installedFunctions'])-{'exportNapPublicPage','getNapSwimmerPerformances'})
        selected=sorted(set(c['allowedFunctions'])&set(names));self.assertEqual((len(names),len(selected)),(119,110))
        functions=[{'name':PREFIX+n,'state':'ACTIVE','updateTime':'2026-11-18T00:00:00Z','labels':{'livepalmes-commit':'a'*40},
            'environment':'GEN_2','buildConfig':{'runtime':'nodejs22','entryPoint':n},
            'serviceConfig':{'serviceAccountEmail':ACCOUNT,'revision':'fixture-'+n}} for n in names]
        return functions,selected
    def reader(self,missing=False,conditional=False):
        calls=[]
        def read(url,body=None):
            calls.append((url,body))
            if 'getIamPolicy' in url:return {'bindings':[{'role':'roles/fixture','members':['serviceAccount:'+ACCOUNT],**({'condition':{'expression':'true'}} if conditional else {})}]}
            self.assertEqual(url,'https://iam.googleapis.com/v1/roles/fixture?fields=includedPermissions')
            return {'includedPermissions':[] if missing else ['datastore.databases.get','datastore.entities.get','datastore.entities.create','datastore.entities.update']}
        return read,calls
    def test_every_selected_runtime_uses_bounded_shared_iam_reads(self):
        functions,selected=self.fixture();read,calls=self.reader()
        result=p.runtime_permissions(functions,read,selected)
        self.assertTrue(result['ready']);self.assertEqual((result['selectedCount'],result['retainedCount']),(110,9))
        self.assertEqual(len(calls),2);self.assertEqual(result['runtimeAccounts'][0]['selectedFunctions'],selected)
        self.assertFalse(result['impersonation']);self.assertEqual(result['sessionWrites'],0);self.assertNotIn(ACCOUNT,json.dumps(result))
    def test_no_conditional_missing_or_denied_permission_qualifies(self):
        functions,selected=self.fixture()
        for options in [{'missing':True},{'conditional':True}]:
            read,calls=self.reader(**options);result=p.runtime_permissions(functions,read,selected)
            self.assertFalse(result['ready']);self.assertTrue(result['missingRuntimePermissions']);self.assertLessEqual(len(calls),2)
        with self.assertRaises(PermissionError):p.runtime_permissions(functions,lambda *args:(_ for _ in ()).throw(PermissionError('fixture')),selected)
        for invalid in [functions[:-1],functions+[functions[0]],[{**f,'state':'FAILED'} for f in functions]]:
            read,calls=self.reader()
            with self.assertRaises(ValueError):p.runtime_permissions(invalid,read,selected)
        with self.assertRaises(ValueError):p.runtime_permissions(functions,self.reader()[0],selected[:-1])
    def test_selection_recalculates_every_origin_without_exporting_accounts(self):
        functions,selected=self.fixture();seen=[];original=p.load
        def qualify(entry,origins,candidate,project,optimized,legacy):
            seen.append(origins);self.assertEqual(len(origins),119);self.assertEqual(candidate,p.CANDIDATE)
            self.assertEqual(project,'livepalmes');self.assertEqual(entry['applicationAnchor'],p.SOURCE_ANCHOR)
            self.assertNotIn(ACCOUNT,json.dumps(origins))
            return [{**f,'shortName':f['name'].removeprefix(PREFIX),'changed':f['name'].removeprefix(PREFIX) in selected} for f in origins]
        fake=SimpleNamespace(qualify_selection=qualify,cycle=SimpleNamespace(production_selection_fingerprints=object(),backend_fingerprints=object()))
        with patch.object(p,'load',side_effect=lambda name:fake if name=='publish-test-admin-mfa-sources.py' else original(name)):
            proof=p.source_selection(functions)
            self.assertEqual(proof['selected'],selected);self.assertEqual(len(seen),1);self.assertEqual(proof['networkCalls'],0)
            self.assertTrue(all(f['commit']=='a'*40 and f['revision'] for f in seen[0]));self.assertFalse(proof['applicationModulesExecuted'])
    def test_local_contract_integrity_and_bad_context_refuse_before_identity(self):
        p.validate_local(p.CANDIDATE)
        with self.assertRaises(ValueError):p.validate_local('b'*40)
        env={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch',
          'GITHUB_RUN_ATTEMPT':'1','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main',
          'GITHUB_SHA':'c'*40,'GITHUB_RUN_ID':'123'}
        for key,value in [('GITHUB_REF','refs/heads/foreign'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_EVENT_NAME','push'),('GITHUB_WORKFLOW_REF','foreign')]:
            with patch.object(p,'load',side_effect=AssertionError('Identity/network must not be read')):
                with self.assertRaises(ValueError):p.discover(p.CANDIDATE,'hosting',env={**env,key:value})
        with patch.object(p,'QUALIFICATION',{**p.QUALIFICATION,'evidenceSha256':'0'*64}):
            with self.assertRaises(ValueError):p.validate_local(p.CANDIDATE)
    def test_discovery_refuses_a_local_mismatch_before_reading_credentials(self):
        readiness=load('check-release-prerequisites.py')
        verification=SimpleNamespace(reusable=lambda *args:True)
        guard=SimpleNamespace(validate_local=lambda *args:(_ for _ in ()).throw(ValueError('fixture local refusal')))
        def dependency(name,file):
            if file=='test-verification-evidence.py':return verification
            if file=='optional-access-production-capabilities.py':return guard
            raise AssertionError('No other dependency may run before the local guard')
        with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'PRODUCTION_DISCOVERY_JSON':json.dumps({'candidate':p.CANDIDATE,'services':['sources']}),'GITHUB_SHA':'d'*40}),patch.object(readiness,'identity_context'),patch.object(readiness.cycle,'git'),patch.object(readiness,'load',side_effect=dependency),patch.object(readiness.cycle,'read',side_effect=AssertionError('No credential read')),patch.object(readiness,'read',side_effect=AssertionError('No Google request')):
            with self.assertRaisesRegex(ValueError,'fixture local refusal'):readiness.discover(directory,'backend')
if __name__=='__main__':unittest.main()
