"""MFA PROD closed request/manifest and unsealed refusal; no cloud access."""
from copy import deepcopy
import hashlib,importlib.util,json,os,re,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_prod_policy_tests',ROOT/'tools/admin-mfa-production-policy.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class PolicyTests(unittest.TestCase):
    def test_unrelated_requests_keep_the_historical_route(self):
        with patch.object(p,'contract') as contract:
            self.assertFalse(p.enabled({'schema':1}));self.assertEqual(p.approved({'schema':1}),[])
            p.paths({},['functions/index.js'],lambda *args:None)
            contract.assert_not_called()

    def test_no_release_without_a_real_sealed_contract(self):
        if p.PATH.is_file() and re.fullmatch('[a-f0-9]{64}',p.DIGEST):
            c=p.contract();self.assertEqual(c['inventoryCount'],119);self.assertEqual(len(c['selected']),110)
        else:
            with self.assertRaises((ValueError,FileNotFoundError)):p.contract()
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'contract.json';path.write_text('{}')
            with patch.object(p,'PATH',path),self.assertRaises(ValueError):p.contract()

    def fixture(self):
        rows=[{'name':p.PREFIX+'fixture','commit':'b'*40,'state':'ACTIVE','revision':'fixture-r1','updateTime':'fixture'}]
        c={'candidate':'a'*40,'productionRun':1,'productionCommit':'b'*40,'productionHosting':'sites/livepalmes/versions/fixture',
           'testRun':2,'selected':['fixture'],'inventoryCount':119,'staticPaths':['portail.html'],
           'controls':{'mailSha256':'c'*64},'approval':{'threadId':'fixture'},'configurationChanges':False,'bindingChanges':False,
           'newFunctions':[],'deletedFunctions':[],'notInstalledChanges':[],'productionEnforcement':True,'rulesDeployment':True,
           'selectionProofSha256':'d'*64,'request':{'schema':1,'candidate':'a'*40,'testRun':2},'manifestOriginsSha256':p.digest(rows)}
        return c,rows

    def test_exact_request_cannot_mix_other_exceptions(self):
        c,rows=self.fixture();request={**c['request'],p.OPTION:{'contractSha256':p.DIGEST}}
        with patch.object(p,'contract',return_value=c):
            self.assertEqual(p.approved(request),['fixture'])
            for change in [{'candidate':'b'*40},{'testRun':3},{'standardSources':{}},{'portalSessionEnforcementRelease':{}},
                           {p.OPTION:{'contractSha256':'e'*64}}]:
                with self.assertRaises(ValueError):p.approved({**request,**change})

    def test_complete_fictitious_contract_checks_modules_engines_and_projects(self):
        sha=lambda name:hashlib.sha256((ROOT/name).read_bytes().replace(b'\r\n',b'\n')).hexdigest()
        entry=json.loads((ROOT/'.github/releases/evidence/20261118-test-admin-mfa-contract.json').read_text())
        names=set(entry['installedFunctions'])-{'exportNapPublicPage','getNapSwimmerPerformances'}
        engines=['tools/release-function-fingerprints.js','tools/release-test-function-fingerprints.js','tools/release-production-function-fingerprints.js','tools/backend-factory-model.js','tools/history-source-provenance.py','tests/helpers/lexical-references.js']
        before='.github/releases/evidence/20261118-admin-mfa-production-before.rules'
        after='.github/releases/evidence/20261118-admin-mfa-production-after.rules'
        c={'schema':1,'project':'livepalmes','candidate':'a'*40,'applicationAnchor':entry['applicationCommit'],'kind':p.KIND,
           'phase':'enforce-admin-full-mfa','productionEnforcement':True,'rulesDeployment':True,'inventoryCount':119,
           'selected':sorted(set(entry['allowedFunctions']) & names),'newFunctions':[],'deletedFunctions':[],
           'configurationChanges':False,'bindingChanges':False,'fingerprintEnginesSha256':{name:sha(name) for name in engines},
           'testContractSha256':sha('.github/releases/evidence/20261118-test-admin-mfa-contract.json'),
           'selectionQualification':{'verifierFile':'tools/admin-mfa-selection-proof.js','verifierSha256':sha('tools/admin-mfa-selection-proof.js'),
             'evidenceFile':'.github/releases/evidence/20261118-admin-mfa-production-equivalence.json','evidenceSha256':sha('.github/releases/evidence/20261118-admin-mfa-production-equivalence.json')},
           'rules':{'project':'livepalmes','beforeFile':before,'afterFile':after,'beforeSha256':sha(before),'afterSha256':sha(after)}}
        for file,key in [('admin-mfa-production-capabilities.py','capabilityModuleSha256'),('portal-session-enforcement-capabilities.py','runtimePrimitiveSha256'),('publish-test-admin-mfa-sources.py','sourceControllerSha256'),('access-revocation-production-policy.py','administrativeReaderModuleSha256'),('admin-mfa-production-rules.py','rulesModuleSha256'),('admin-mfa-rules-policy.py','rulesPolicySha256')]:c[key]=sha('tools/'+file)
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'contract.json'
            def read(value):
                raw=(json.dumps(value)+'\n').encode();path.write_bytes(raw)
                with patch.object(p,'PATH',path),patch.object(p,'DIGEST',hashlib.sha256(raw).hexdigest()),patch.object(p,'CANDIDATE','a'*40):return p.contract()
            self.assertEqual(read(c)['selected'],c['selected'])
            for change in [{'schema':2},{'candidate':'b'*40},{'configurationChanges':True},{'sourceControllerSha256':'0'*64},
                           {'testContractSha256':'0'*64},{'rules':{**c['rules'],'project':'livepalmes-test'}},
                           {'fingerprintEnginesSha256':{name:sha(name) for name in engines[:-1]}},
                           {'fingerprintEnginesSha256':{**c['fingerprintEnginesSha256'],engines[-1]:'0'*64}}]:
                with self.assertRaises(ValueError):read({**c,**change})

    def test_manifest_rejects_invented_targets_and_configuration(self):
        c,rows=self.fixture()
        with patch.object(p,'contract',return_value=c):
            manifest=p.expected_manifest(rows);self.assertEqual(p.validate_manifest(manifest),manifest)
            for change in [{'selected':[]},{'configurationChanges':True},{'bindingChanges':True},{'newFunctions':['other']},
                           {'candidate':'b'*40},{'businessInvocations':1},{'origins':[]}]:
                with self.assertRaises(ValueError):p.validate_manifest({**manifest,**change})

    def test_capability_context_is_never_removed_from_the_digest(self):
        proof={'candidate':'a'*40,'kind':'backend','ready':True,'readerIdentitySha256':'b'*64}
        for change in [{'candidate':'c'*40},{'kind':'hosting'},{'ready':False},{'readerIdentitySha256':'d'*64}]:
            self.assertNotEqual(p.capability_digest(proof),p.capability_digest({**proof,**change}))

    def test_rollback_needs_explicit_coordinated_context_before_credentials(self):
        with patch.dict(os.environ,{},clear=True),patch.object(p.common,'load',return_value=SimpleNamespace()) as loader:
            with self.assertRaises(ValueError):p.capabilities('backend',rollback=True)
            loader.assert_called_once_with('admin-mfa-production-capabilities.py')
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'standard-source-manifest.json').write_text('{}')
            with patch.object(p,'validate_manifest',return_value={}),self.assertRaises(ValueError):p.rollback_hosting_guard(root,{})

    def test_rollback_can_only_patch_original_sources_and_labels(self):
        before={'name':p.PREFIX+'fixture','labels':{'preserved':'yes'},'serviceConfig':{'maxInstanceCount':2,'secretEnvironmentVariables':[{'key':'SYNTHETIC'}]}}
        source={'bucket':'synthetic-source','object':'archive.zip','generation':'1'}
        with patch.object(p,'runtime') as runtime:
            body,mask=p.rollback_patch(before,source)
        runtime.assert_called_once_with(before)
        self.assertEqual(mask,'build_config.source,labels')
        self.assertEqual(set(body),{'name','buildConfig','labels'})
        self.assertEqual(body['labels'],before['labels'])
        self.assertEqual(body['buildConfig'],{'source':{'storageSource':source}})

if __name__=='__main__':unittest.main()
