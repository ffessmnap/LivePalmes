"""Optional PROD promotion: bounded fixtures, drift and coordinated rollback."""
import copy,hashlib,importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location('test_optional_policy_'+name.replace('-','_'),ROOT/'tools'/name)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
p=load('optional-access-production-policy.py')
def save(path,value):Path(path).write_text(json.dumps(value),encoding='utf-8')
class OptionalProductionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.c=p.contract()
 def request(self):return {**copy.deepcopy(self.c['request']),p.OPTION:{'contractSha256':p.DIGEST}}
 def test_sealed_actual_request_full_paths_and_no_mandatory_route(self):
  request=self.request();c=self.c;cycle=load('release-cycle.py')
  self.assertEqual(p.approved(request),c['selected']);self.assertEqual(len(c['selected']),110)
  self.assertEqual(load('production-source-policy.py').for_request(request).KIND,p.KIND)
  changed=cycle.git('diff','--name-only','--no-renames',c['productionCommit'],p.CANDIDATE).splitlines()
  p.paths(request,changed,cycle.git);self.assertTrue(cycle.validate_request(request,changed))
  self.assertEqual(p.approved_config_paths(request,changed,cycle.git),{'firebase.json'})
  for bad in [changed[:-1],changed+['storage.rules']]:
   with self.assertRaises(ValueError):p.paths(request,bad,cycle.git)
  for key,val in [('candidate','f'*40),('standardSources',{}),('portalSessionEnforcementRelease',{}),
                  ('freezeTestCandidate',True),(p.OPTION,{'contractSha256':'0'*64})]:
   with self.subTest(key=key),self.assertRaises(ValueError):p.approved({**request,key:val})
  self.assertFalse(c['mandatoryMfa']);self.assertFalse(c['rulesDeployment']);self.assertEqual(p.approved({}),[])
  self.assertEqual(c['scopeDecisions']['noRulesWriter'],True)
 def test_contract_file_or_pinned_module_tampering_refuses(self):
  with tempfile.TemporaryDirectory() as tmp:
   bad=Path(tmp)/'contract.json';bad.write_bytes(p.PATH.read_bytes()+b' ')
   with patch.object(p,'PATH',bad),self.assertRaises(ValueError):p.contract()
  self.assertEqual(len(self.c['modulesSha256']),7)
 def test_capability_digest_preserves_every_context_field_except_separate_selection(self):
  proof={'candidate':'a'*40,'phase':'optional','ready':True,'sourceSelection':{'rows':[1]}}
  self.assertEqual(p.capability_digest(proof),p.capability_digest({**proof,'sourceSelection':{'rows':[2]}}))
  for key,val in [('candidate','b'*40),('phase','mandatory'),('ready',False),('unknown',True)]:
   self.assertNotEqual(p.capability_digest(proof),p.capability_digest({**proof,key:val}))
 def fixture(self):
  c=copy.deepcopy(self.c);names=c['selected']+['retained%02d'%i for i in range(9)]
  origins=sorted([{'name':p.PREFIX+n,'state':'ACTIVE','revision':'rev-'+n,'updateTime':'before','commit':'a'*40} for n in names],key=lambda f:f['name'])
  desired={n:'d'*64 for n in names+c['notInstalledChanges']};base=dict(desired)
  for n in c['notInstalledChanges']:base[n]='b'*64
  rows=[{**f,'shortName':f['name'].removeprefix(p.PREFIX),'changed':f['name'].removeprefix(p.PREFIX) in c['selected']} for f in origins]
  c['originsSha256']=p.digest(origins);c['manifestOriginsSha256']=p.digest(rows)
  proof={'schema':1,'candidate':p.CANDIDATE,'productionRun':c['productionRun'],'inventoryCount':119,
   'selected':c['selected'],'rows':rows,'selectionQualification':c['selectionQualification'],
   'completeOriginsSha256':p.digest(origins),'notInstalledChanges':c['notInstalledChanges']}
  c['selectionProofSha256']=p.digest(proof)
  def qualify(entry,actual,candidate,project,fp,legacy):
   self.assertEqual(len(actual),119);self.assertEqual(actual,origins)
   self.assertEqual(entry['applicationAnchor'],c['sourceAnchor']);return rows
  return c,origins,proof,qualify,lambda commit:base if commit==c['productionCommit'] else desired
 def test_selection_must_cover_all_origins_and_uninstalled_changes(self):
  c,origins,proof,qualify,fp=self.fixture();source=SimpleNamespace(qualify_selection=qualify)
  with patch.object(p,'contract',return_value=c),patch.object(p.common,'load',return_value=source):
   self.assertEqual(p.complete_selection(origins,fp,fp),proof)
   manifest=p.expected_manifest(proof['rows']);p.validate_manifest(manifest)
   for bad in [origins[:-1],list(reversed(origins)),origins+[origins[0]]]:
    with self.assertRaises(ValueError):p.complete_selection(bad,fp,fp)
   with self.assertRaises(ValueError):p.complete_selection(origins,lambda s:{**fp(s),'new':'e'*64} if s==p.CANDIDATE else fp(s),fp)
   for key,val in [('selected',c['selected'][:-1]),('mandatoryMfa',True),('rulesDeployment',True),('configurationChanges',True)]:
    with self.assertRaises(ValueError):p.validate_manifest({**manifest,key:val})
   with self.assertRaises(ValueError):p.restore_witness('unused','unused')
 def env(self,rollback=False):
  return {'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch',
   'GITHUB_RUN_ATTEMPT':'1','GITHUB_SHA':'d'*40,'GITHUB_RUN_ID':'123','RELEASE_RUN':'122',
   'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-'+('rollback' if rollback else 'release')+'.yml@refs/heads/main',
   'CONFIRM_CODE_ROLLBACK':'livepalmes','B_RESTORE_HOSTING':'true'}
 def test_official_context_and_rollback_confirmation_fail_before_identity(self):
  with patch.dict(os.environ,self.env()):p.official_context()
  for key,val in [('GITHUB_REF','refs/heads/feature'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_EVENT_NAME','push'),('GITHUB_WORKFLOW_REF','foreign')]:
   with patch.dict(os.environ,{**self.env(),key:val}),patch.object(p,'contract',return_value=self.c),patch.object(p.common,'load',side_effect=AssertionError('no network')),self.assertRaises(ValueError):p.capabilities('hosting')
  for key in ['CONFIRM_CODE_ROLLBACK','B_RESTORE_HOSTING']:
   with patch.dict(os.environ,{**self.env(True),key:''}),self.assertRaises(ValueError):p.official_context(True)
 def test_rules_are_read_only_exact_source_and_metadata(self):
  c=self.c;text=(ROOT/c['productionRulesSource']).read_text(encoding='utf-8')
  with tempfile.TemporaryDirectory() as tmp,patch.object(p,'contract',return_value=c),patch.object(p.subprocess,'check_output',return_value='fixture-token'):
   for observed,source,ok in [(c['productionRulesObserved'],text,True),({**c['productionRulesObserved'],'updateTime':'new'},text,False),
      (c['productionRulesObserved'],text+' ',False)]:
    calls=[]
    reader=SimpleNamespace(snapshot=lambda token:(calls.append(token) or (observed,source)))
    with patch.object(p.common,'load',return_value=reader):
     if ok:
      result=p.rules_snapshot(tmp);self.assertTrue(result['readOnly']);self.assertFalse(result['deployed']);self.assertFalse(result['indexesDeployed'])
     else:
      with self.assertRaises(ValueError):p.rules_snapshot(tmp)
    self.assertEqual(calls,['fixture-token'])
 def test_same_run_admin_and_mail_drift_block_after_sources(self):
  c=self.c;value={'candidate':p.CANDIDATE};runtime={'ready':True,'readOnly':True}
  admin={'run':123,'toolingCommit':'d'*40,'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),
   'capabilitySha256':c['hostingCapabilitySha256'],'ready':True,'accountOrRightChanges':0,'rules':{'observed':c['productionRulesObserved']}}
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,self.env()),patch.object(p,'manifest',return_value=value),patch.object(p,'capabilities',return_value=runtime),patch.object(p.common,'controls',return_value=c['controls']):
   root=Path(tmp)
   with self.assertRaises(ValueError):p.guard(root)
   save(root/'standard-optional-access-auth-before.json',admin);p.guard(root)
   with self.assertRaises(ValueError):p.guard(root,True)
   save(root/'standard-optional-access-auth-after.json',admin);p.guard(root,True)
   self.assertEqual((root/'standard-optional-access-controls-before.json').read_bytes(),(root/'standard-optional-access-controls-after.json').read_bytes())
   save(root/'standard-optional-access-auth-after.json',{**admin,'run':122})
   with self.assertRaises(ValueError):p.guard(root,True)
   with patch.object(p.common,'controls',return_value={**c['controls'],'mailSha256':'0'*64}),self.assertRaises(ValueError):p.guard(root)
   (root/'previous').mkdir()
   with self.assertRaises(ValueError):p.guard(root)
 def function(self,name):
  return {'name':p.PREFIX+name,'state':'ACTIVE','environment':'GEN_2','updateTime':'before',
   'buildConfig':{'runtime':'nodejs22','entryPoint':name,'source':{'storageSource':{'bucket':'fixture','object':'old.zip'}}},
   'serviceConfig':{'serviceAccountEmail':'fixture@example.test','revision':'before','maxInstanceCount':2},'labels':{'kept':'yes'}}
 def test_runtime_and_rollback_only_source_and_labels(self):
  c=copy.deepcopy(self.c);name=c['selected'][0];c['runtimeBindings'][name]=hashlib.sha256(b'fixture@example.test').hexdigest()
  before=self.function(name);after=copy.deepcopy(before);after['serviceConfig']['revision']='after';after['updateTime']='after';after['labels']['livepalmes-commit']=p.CANDIDATE
  with patch.object(p,'contract',return_value=c):
   p.assert_selected(before,after,p.CANDIDATE)
   body,mask=p.rollback_patch(before,{'bucket':'fixture','object':'old.zip'})
   self.assertEqual(mask,'build_config.source,labels');self.assertEqual(set(body),{'name','buildConfig','labels'})
   self.assertEqual(set(body['buildConfig']),{'source'})
   restored=copy.deepcopy(before);restored['serviceConfig']['revision']='restored';p.assert_rollback(before,restored)
   for mutate in [lambda f:f['serviceConfig'].update(maxInstanceCount=3),lambda f:f['serviceConfig'].update(serviceAccountEmail='other'),
                  lambda f:f['labels'].update(kept='changed'),lambda f:f.update(state='FAILED')]:
    bad=copy.deepcopy(after);mutate(bad)
    with self.assertRaises(ValueError):p.assert_selected(before,bad,p.CANDIDATE)
 def test_rollback_requires_full_inventory_same_run_hosting_and_fresh_controls(self):
  c=copy.deepcopy(self.c);c['runtimeBindings']={n:hashlib.sha256(b'fixture@example.test').hexdigest() for n in c['selected']}
  names=c['selected']+['retained%02d'%i for i in range(9)];original=[self.function(n) for n in names];current=copy.deepcopy(original)
  state=load('production-release-state.py');value={'candidate':p.CANDIDATE}
  for f in current:
   if f['name'].removeprefix(p.PREFIX) in c['selected']:
    f['serviceConfig']['revision']='after';f['updateTime']='after';f['labels']['livepalmes-commit']=p.CANDIDATE
  report={'candidate':p.CANDIDATE,'sourcePolicyKind':p.KIND,'standardSourceManifestSha256':p.digest(value),'newFunctions':[],
   'functions':[f for f in original if f['name'].removeprefix(p.PREFIX) in c['selected']]}
  after={'candidate':p.CANDIDATE,'errors':[],'functions':[state.identity(f) for f in current]}
  witness={'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),'rollbackRun':123,'releaseRun':122,
   'capabilitySha256':c['hostingCapabilitySha256'],'rules':{'observed':c['productionRulesObserved']}}
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,self.env(True)),patch.object(p,'contract',return_value=c),patch.object(p,'validate_manifest',return_value=value),patch.object(p,'capabilities',return_value={}),patch.object(p.common,'controls',return_value=c['controls']):
   root=Path(tmp);save(root/'standard-source-manifest.json',value);save(root/'functions.json',original);save(root/'report.json',report)
   p.rollback_guard(root,after,current,state,False)
   with self.assertRaises(ValueError):p.rollback_guard(root,after,current,state,True)
   save(root/'optional-access-rollback-auth.json',witness);p.rollback_guard(root,after,current,state,True)
   for bad in [current[:-1],current+[current[0]]]:
    with self.assertRaises(ValueError):p.rollback_guard(root,after,bad,state,True)
   save(root/'optional-access-rollback-auth.json',{**witness,'rollbackRun':122})
   with self.assertRaises(ValueError):p.rollback_guard(root,after,current,state,True)
   with patch.object(p.common,'controls',return_value={}),self.assertRaises(ValueError):p.rollback_guard(root,after,current,state,False)
 def test_workflow_wiring_restores_identities_and_requires_final_guards(self):
  release=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text(encoding='utf-8')
  for command in ['readiness','auth-before','auth-after','guard-after','rules-final']:
   self.assertIn('tools/optional-access-production-policy.py '+command,release)
  self.assertLess(release.index('optional-access-production-policy.py auth-after'),release.index('optional-access-production-policy.py guard-after'))
  for flag in ['OPTIONAL_ACCESS_AFTER','OPTIONAL_ACCESS_RULES_FINAL']:self.assertIn(flag,release)
  self.assertIn('production-optional-access-proofs',release)
  rollback=(ROOT/'.github/workflows/livepalmes-production-rollback.yml').read_text(encoding='utf-8')
  self.assertIn('fetch-depth: 0',rollback);self.assertIn('optional-access-production-policy.py rollback-final',rollback)
  self.assertIn("if optional: out.write('optional_access=true",rollback)
 def test_capabilities_reuse_fixed_runtime_selection_and_refuse_permission_drift(self):
  c=copy.deepcopy(self.c);identity='fixture-reader';detail={'ready':True,'readOnly':True,'selected':c['selected'],'runtimeAccounts':[]}
  expected={'schema':1,'candidate':c['applicationAnchor'],'phase':c['phase'],'kind':'backend',
   'readerIdentitySha256':identity,'businessInvocations':0,'newPermissions':0,'configurationChanges':False,
   'mandatoryMfa':False,'rulesWrites':0,'publicationAllowed':False,**detail}
  c['backendCapabilitySha256']=p.capability_digest(expected);calls=[]
  def runtime(functions,read,names):calls.append((functions,names));return copy.deepcopy(detail)
  caps=SimpleNamespace(READERS={'backend':identity},runtime_permissions=runtime)
  reader=SimpleNamespace(reader_identity=lambda kind:identity,_read=lambda *args:None)
  with patch.dict(os.environ,self.env()),patch.object(p,'contract',return_value=c),patch.object(p.common,'load',side_effect=lambda name:caps if name=='optional-access-production-capabilities.py' else reader):
   self.assertEqual(p.capabilities('backend',references=['after-publication']),expected)
   self.assertEqual(calls,[(['after-publication'],c['selected'])])
   detail['unknownPermissionChange']=True
   with self.assertRaises(ValueError):p.capabilities('backend',references=['after-publication'])
 def test_rollback_completion_attests_every_selected_archive_and_preserves_retained(self):
  c=copy.deepcopy(self.c);c['runtimeBindings']={n:hashlib.sha256(b'fixture@example.test').hexdigest() for n in c['selected']}
  original=[self.function(n) for n in c['selected']+['retained%02d'%i for i in range(9)]];current=copy.deepcopy(original)
  for f in current:
   if f['name'].removeprefix(p.PREFIX) in c['selected']:f['serviceConfig']['revision']='restored'
  realstate=load('production-release-state.py');state=SimpleNamespace(inventory=lambda:current,identity=realstate.identity)
  called=[]
  publisher=SimpleNamespace(attest=lambda f,data,api:(called.append(f['name']) or {'sha256':hashlib.sha256(data).hexdigest()}))
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,self.env(True)),patch.object(p,'contract',return_value=c),patch.object(p,'validate_manifest',return_value={'candidate':p.CANDIDATE}),patch.object(p,'capabilities',return_value={}),patch.object(p.common,'controls',return_value=c['controls']),patch.object(p.common,'load',return_value=publisher):
   root=Path(tmp);save(root/'standard-source-manifest.json',{});save(root/'functions.json',original)
   archive=root/'fixture.zip';archive.write_bytes(b'fixture archive');archives={p.PREFIX+n:archive for n in c['selected']}
   p.rollback_complete(root,state,archives)
   self.assertEqual(sorted(called),sorted(archives));self.assertEqual(len(called),110)
   result=json.loads((root/'optional-access-rollback-sources.json').read_text());self.assertTrue(result['allSourcesRestored'])
   current[-1]['labels']['kept']='changed'
   with self.assertRaises(ValueError):p.rollback_complete(root,state,archives)
if __name__=='__main__':unittest.main()
