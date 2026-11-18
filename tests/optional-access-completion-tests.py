"""Closed optional Hosting completion: provenance, drift, backup and gates."""
import ast,copy,importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location('test_completion_'+name.replace('-','_'),ROOT/'tools'/name)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=load('optional-access-production-completion.py');REAL_LOAD=m.load
STATE=load('production-release-state.py');COMMON=load('standard-source-policy.py')
def env(mode='release'):
 return {'OPTIONAL_ACCESS_COMPLETION':'true','GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main',
  'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_SHA':'a'*40,'GITHUB_RUN_ID':'777',
  'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/'+m.WORKFLOWS[mode]+'@refs/heads/main'}
def fixture():
 selected=['selected%03d'%i for i in range(110)];names=selected+['retained%02d'%i for i in range(9)]
 before={};current={};receipts={};prefix='projects/livepalmes/locations/europe-west1/functions/'
 for name in names:
  full=prefix+name
  f={'name':full,'state':'ACTIVE','updateTime':'old-time','environment':'GEN_2',
   'labels':{'preserved':'label','livepalmes-commit':'b'*40},'buildConfig':{'runtime':'nodejs22','entryPoint':name,
    'source':{'storageSource':{'bucket':'old','object':name,'generation':'1'}}},
   'serviceConfig':{'revision':name+'-old','serviceAccountEmail':'fixture@example.invalid','maxInstanceCount':20,
    'secretEnvironmentVariables':[{'key':'PRESERVED','secret':'PRESERVED','version':'1'}]}}
  before[full]=f;after=copy.deepcopy(f)
  if name in selected:
   source={'bucket':'gcf-v2-sources-718081132564-europe-west1','object':name+'/function-source.zip','generation':'123'}
   after['serviceConfig']['revision']=name+'-new';after['updateTime']='new-time'
   after['labels']['livepalmes-commit']=m.CANDIDATE
   after['buildConfig']['source']={'storageSource':source};after['buildConfig']['sourceProvenance']={'resolvedStorageSource':source}
   receipts[full]={'identity':STATE.identity(after),'storageSource':source,'archiveSha256':'c'*64,
    'allPathsAndFileBytesIdentical':True,'generationReadAndReferencesRechecked':True}
  current[full]=after
 manifest={'candidate':m.CANDIDATE,'selected':selected,'origins':[STATE.identity(f) for f in before.values()]}
 state={'candidate':m.CANDIDATE,'functions':[STATE.identity(f) for f in current.values()],'errors':[],'optionalAccessContractSha256':'e'*64}
 receipt={'candidate':m.CANDIDATE,'manifestSha256':m.digest(manifest),'functions':receipts}
 c={'originalManifestSha256':m.digest(manifest),'failedStateSha256':m.digest(state),'sourceReceiptsSha256':m.digest(receipt),
  'originalBackupSha256':'d'*64,'originalBackupContextSha256':'f'*64}
 controls={'mail':'same','queue':'same','scheduler':'same','templates':'same'}
 pc={'controls':controls,'hostingCapabilitySha256':m.digest({'kind':'hosting'}),'productionRulesObserved':{'sha256':'rules'}}
 p=SimpleNamespace(PREFIX=prefix,DIGEST='e'*64,KIND='fixture',validate_manifest=lambda v:v,manifest=lambda plan:manifest,
  runtime=lambda f:None,initial=lambda fs,v:None,assert_retained=COMMON.assert_retained,
  assert_selected=lambda a,b,candidate:COMMON.assert_selected(a,b,candidate,runtime_validator=lambda f:None),
  contract=lambda:pc,capabilities=lambda kind,**kw:{'kind':kind},capability_digest=m.digest,
  rules_snapshot=lambda plan:{'observed':pc['productionRulesObserved']})
 return SimpleNamespace(before=before,current=current,manifest=manifest,state=state,receipts=receipt,
  selection=list(reversed(selected)),c=c,p=p,controls=controls)

class CompletionTests(unittest.TestCase):
 def test_real_contract_request_and_historical_pins(self):
  c=m.contract();self.assertEqual((c['completionOfRun'],c['sourceWrites'],c['inventoryCount']),(44405688714,0,119))
  self.assertEqual(m.read(ROOT/'.github/releases/20261118-a3-optional-access-completion.json')['contractSha256'],m.DIGEST)
  self.assertFalse(c['mandatoryMfa']);self.assertFalse(c['rulesDeployment']);self.assertFalse(c['genericResume'])
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'bad.json';path.write_text('{}')
   with patch.object(m,'PATH',path),self.assertRaises(ValueError):m.contract()
 def test_context_rejects_other_workflow_branch_attempt_or_mode(self):
  for mode in m.WORKFLOWS:
   with patch.dict(os.environ,env(mode),clear=True):self.assertEqual(m.context(mode)['sourceWrites'],0)
  for key,bad in [('OPTIONAL_ACCESS_COMPLETION','false'),('GITHUB_REPOSITORY','other/repo'),('GITHUB_REF','refs/heads/other'),
   ('GITHUB_EVENT_NAME','push'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_SHA','short'),('GITHUB_RUN_ID','0'),('GITHUB_WORKFLOW_REF','foreign')]:
   with self.subTest(key=key),patch.dict(os.environ,{**env(),key:bad},clear=True),self.assertRaises(ValueError):m.context('release')
 def setUp(self):
  self.f=fixture()
  for name,value in [('contract',lambda:self.f.c),('policy',lambda:self.f.p)]:
   if self._testMethodName.startswith('test_real_contract'):continue
   p=patch.object(m,name,value);p.start();self.addCleanup(p.stop)
 def verify(self):m.validate_sources(self.f.manifest,self.f.state,self.f.receipts,self.f.selection)
 def refresh(self):
  self.f.c['failedStateSha256']=m.digest(self.f.state);self.f.c['sourceReceiptsSha256']=m.digest(self.f.receipts)
 def test_all_sources_accepted_but_no_missing_duplicate_foreign_or_sorted_selection(self):
  self.verify()
  for selection in [self.f.selection[:-1],self.f.selection+[self.f.selection[0]],self.f.selection[:-1]+['foreign'],sorted(self.f.selection)]:
   with self.subTest(size=len(selection)),self.assertRaises(ValueError):m.validate_sources(self.f.manifest,self.f.state,self.f.receipts,selection)
 def test_archive_claim_generation_identity_or_inventory_drift_refused(self):
  original=copy.deepcopy(self.f)
  for kind in ['bytes','references','generation','identity','inactive','missing']:
   self.f=copy.deepcopy(original);r=next(iter(self.f.receipts['functions'].values()))
   if kind=='bytes':r['allPathsAndFileBytesIdentical']=False
   if kind=='references':r['generationReadAndReferencesRechecked']=False
   if kind=='generation':r['storageSource']['generation']='0'
   if kind=='identity':r['identity']={**r['identity'],'revision':'foreign'}
   if kind=='inactive':self.f.state['functions'][0]['state']='FAILED'
   if kind=='missing':self.f.state['functions'].pop()
   self.refresh()
   with self.subTest(kind=kind),self.assertRaises(ValueError):self.verify()
 def plan(self,path):
  m.write(path/'optional-completion-initial-after.json',self.f.state);m.write(path/'standard-source-receipts.json',self.f.receipts)
 def test_current_revisions_generations_labels_and_full_configuration_are_checked(self):
  with tempfile.TemporaryDirectory() as tmp,patch.object(m,'marker',return_value={}):
   plan=Path(tmp);self.plan(plan);values=list(self.f.current.values())
   with patch.object(m,'backup_validate',return_value=self.f.before):m.current_sources(plan,values,'opened')
   for kind in ['revision','generation','label','binding','retained-config']:
    changed=copy.deepcopy(values);selected=next(f for f in changed if f['name'] in self.f.receipts['functions'])
    if kind=='revision':selected['serviceConfig']['revision']='foreign'
    if kind=='generation':selected['buildConfig']['source']['storageSource']['generation']='124'
    if kind=='label':selected['labels']['preserved']='changed'
    if kind=='binding':selected['serviceConfig']['secretEnvironmentVariables'][0]['version']='2'
    if kind=='retained-config':next(f for f in changed if f['name'] not in self.f.receipts['functions'])['serviceConfig']['maxInstanceCount']=2
    with self.subTest(kind=kind),patch.object(m,'backup_validate',return_value=self.f.before),self.assertRaises(ValueError):m.current_sources(plan,changed,'opened')
 def test_backup_must_be_opened_in_protected_release_before_config_comparison(self):
  with tempfile.TemporaryDirectory() as tmp,patch.object(m,'marker',return_value={}):
   path=Path(tmp);report={'candidate':m.CANDIDATE,'errors':[],'newFunctions':[],'sourcePolicyKind':self.f.p.KIND,'standardSourceManifestSha256':m.digest(self.f.manifest)}
   m.write(path/'report.json',report);m.write(path/'standard-source-manifest.json',self.f.manifest);m.write(path/'functions.json',list(self.f.before.values()))
   with patch.dict(os.environ,{'COMPLETION_BACKUP_OPENED':'true'}):self.assertEqual(len(m.backup_validate(path,path)),119)
   with patch.dict(os.environ,{'COMPLETION_BACKUP_OPENED':'false'}),self.assertRaises(ValueError):m.backup_validate(path,path)
   report['candidate']='0'*40;m.write(path/'report.json',report)
   with patch.dict(os.environ,{'COMPLETION_BACKUP_OPENED':'true'}),self.assertRaises(ValueError):m.backup_validate(path,path)
 def test_readiness_is_readonly_and_truthfully_marks_backup_config_still_pending(self):
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,env('readiness'),clear=True),patch.object(m,'marker',return_value={'preflightRun':666}),\
   patch.object(m,'current_sources',return_value=self.f.state['functions']),patch.object(m.common,'controls',return_value=self.f.controls),\
   patch.object(m,'load',return_value=SimpleNamespace(inventory=lambda:list(self.f.current.values()))):
   proof=m.backend(tmp,'readiness');self.assertFalse(proof['originalBackupOpenedInOfficialRunner']);self.assertFalse(proof['configurationVerifiedAgainstOpenedBackup'])
   self.assertTrue(proof['configurationBeforeHostingRequiresOpenedOriginalBackup']);self.assertEqual(proof['sourceWrites'],0)
   with patch.dict(os.environ,env(),clear=True),self.assertRaises(ValueError):m.backend(tmp,'release')
   with patch.object(m.common,'controls',return_value={}),self.assertRaises(ValueError):m.backend(tmp,'readiness')
 def test_publish_requires_same_run_opened_backup_and_unchanged_rules(self):
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,env(),clear=True),patch.object(m,'marker',return_value={}),patch.object(m,'hosting_before'):
   plan=Path(tmp);backend={**m.context('release'),'ready':True,'configurationVerifiedAgainstOpenedBackup':True}
   auth={**m.context('release'),'ready':True,'capabilitySha256':self.f.p.contract()['hostingCapabilitySha256'],'rules':{'observed':self.f.p.contract()['productionRulesObserved']}}
   m.write(plan/'optional-completion-backend-before.json',backend);m.write(plan/'optional-completion-auth-before.json',auth);m.publish_guard(plan)
   for key,val in [('run',776),('controllerCommit','b'*40),('sourceWrites',1),('configurationVerifiedAgainstOpenedBackup',False)]:
    m.write(plan/'optional-completion-backend-before.json',{**backend,key:val})
    with self.subTest(key=key),self.assertRaises(ValueError):m.publish_guard(plan)
   m.write(plan/'optional-completion-backend-before.json',backend)
   m.write(plan/'optional-completion-auth-before.json',{**auth,'rules':{'observed':{'sha256':'foreign'}}})
   with self.assertRaises(ValueError):m.publish_guard(plan)
 def test_same_run_final_witnesses_and_runtime_cannot_drift(self):
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,env(),clear=True),patch.object(m,'marker',return_value={'preflightRun':666}),\
   patch.object(m,'current_sources',return_value=self.f.state['functions']),patch.object(m.common,'controls',return_value=self.f.controls),\
   patch.object(m,'load',return_value=SimpleNamespace(inventory=lambda:list(self.f.current.values()))):
   first=m.backend(tmp,'release','opened');m.backend(tmp,'release','opened',after=True)
   for field,value in [('run',776),('functionsSha256','foreign'),('runtimeSha256','foreign'),('controls',{})]:
    m.write(Path(tmp)/'optional-completion-backend-before.json',{**first,field:value})
    with self.subTest(field=field),self.assertRaises(ValueError):m.backend(tmp,'release','opened',after=True)
 def test_only_exact_old_hosting_release_authorizes_switch(self):
  live={'name':'old-release','version':{'name':'old-version'},'message':'old-message'}
  self.f.c['initialHosting']={'name':'old-release','version':'old-version','message':'old-message'}
  cycle=SimpleNamespace(api=lambda *args:{'releases':[live]})
  with patch.object(m,'load',return_value=cycle):
   m.hosting_before('plan');live['version']['name']='foreign'
   with self.assertRaises(ValueError):m.hosting_before('plan')
 def test_readiness_must_match_controller_preflight_roles_and_readonly_backup_state(self):
  pc=self.f.p.contract();pc['backendCapabilitySha256']='backend'
  base={'contractSha256':m.DIGEST,'candidate':m.CANDIDATE,'run':888,
   'controllerCommit':'a'*40,'preflightRun':666,'workflow':m.WORKFLOWS['readiness'],'completionOfRun':m.INITIAL_RUN,
   'ready':True,'readOnly':True,'sourceWrites':0,'originalBackupSha256':self.f.c['originalBackupSha256']}
  backend={**base,'functionsActive':119,'sourcesPreviouslyAttested':110,'managedReferencesRechecked':True,
   'controls':pc['controls'],'runtimeSha256':'backend','originalBackupOpenedInOfficialRunner':False}
  hosting={**base,'capabilitySha256':pc['hostingCapabilitySha256'],'rules':{'observed':pc['productionRulesObserved']}}
  values={'backend':backend,'hosting':hosting}
  def authenticate(run,name,target,*args,**kwargs):
   kind=name.rsplit('-',1)[1];Path(target).mkdir(exist_ok=True);m.write(Path(target)/('optional-completion-ready-'+kind+'.json'),values[kind])
  with tempfile.TemporaryDirectory() as tmp,patch.dict(os.environ,env(),clear=True),patch.object(m,'marker',return_value={'preflightRun':666}),patch.object(m,'authenticate',authenticate):
   m.require_readiness(tmp,888)
   for kind,key,value in [('backend','preflightRun',665),('backend','controllerCommit','b'*40),('backend','sourceWrites',1),
    ('backend','controls',{}),('backend','runtimeSha256','foreign'),('backend','originalBackupOpenedInOfficialRunner',True),
    ('hosting','capabilitySha256','foreign'),('hosting','rules',{'observed':{}})]:
    old=values[kind][key];values[kind][key]=value
    with self.subTest(kind=kind,key=key),self.assertRaises(ValueError):m.require_readiness(tmp,888)
    values[kind][key]=old
 def test_failed_original_backup_transport_is_pinned_and_another_cipher_refused(self):
  delegated=[];reader=SimpleNamespace(authenticate=lambda *a:delegated.append(a))
  with patch.object(m,'load',return_value=reader):m.authenticate(42,'proof','target',{'id':12},m.WORKFLOWS['release'],'failure','a'*40)
  self.assertEqual(delegated[0],(42,'proof','target',{'id':12},m.WORKFLOWS['release'],'failure','a'*40))
  self.f.c.update(originalArtifacts={'production-code-backup':{'id':12}},originalController='a'*40)
  def download(run,name,target,*args):
   self.assertEqual(run,m.INITIAL_RUN);self.assertEqual(args[-2: ],('failure','a'*40));Path(target).mkdir();(Path(target)/'prod-backup.enc').write_bytes(b'wrong')
  with tempfile.TemporaryDirectory() as tmp,patch.object(m,'marker',return_value={}),patch.object(m,'authenticate',download),self.assertRaisesRegex(ValueError,'Sauvegarde'):
   m.backup_download(tmp,Path(tmp)/'cipher')

class WorkflowTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  script="const fs=require('fs'),Y=require('./tests/firestore-rules/node_modules/yaml');let r={};for(const n of ['preflight','readiness','release'])r[n]=Y.parse(fs.readFileSync('.github/workflows/livepalmes-production-'+n+'.yml','utf8'));process.stdout.write(JSON.stringify(r))"
  cls.workflows=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT))
 def test_modes_are_exclusive_and_default_off(self):
  for workflow in self.workflows.values():
   self.assertIs(workflow['on']['workflow_dispatch']['inputs']['optional_access_completion']['default'],False)
   for name,job in workflow['jobs'].items():
    self.assertIn('inputs.optional_access_completion' if name=='optional-access-completion' else '!inputs.optional_access_completion',job['if'])
    if name=='optional-access-completion':self.assertIn('!inputs.session_enforcement_completion',job['if'])
 def test_release_has_no_source_rules_or_cloud_access_writer(self):
  job=self.workflows['release']['jobs']['optional-access-completion'];self.assertEqual(job['environment'],'production')
  self.assertIn("inputs.resume_run == '0'",job['if']);self.assertIn('inputs.confirmation',job['if'])
  commands='\n'.join(s.get('run','') for s in job['steps'])
  for forbidden in ['--only functions',' batches ','generateUploadUrl','gcloud functions',' rules publish','--only firestore','add-iam','seal-v2']:
   self.assertNotIn(forbidden,commands)
  for required in ['--only hosting','release-cycle.py verify-test','backup-download','validate-source','open-v2','emit-link','backend-before','publish-guard','backend-after','auth-after']:
   self.assertIn(required,commands)
  steps=job['steps'];index=lambda token:next(i for i,s in enumerate(steps) if token in s.get('run',''))
  self.assertLess(index('open-v2'),index('backend-before'));self.assertLess(index('backend-before'),index('--only hosting'))
  self.assertLess(index('auth-before'),index('--only hosting'));self.assertLess(index('--only hosting'),index('backend-after'))
  self.assertFalse(any('GITHUB_WORKFLOW_REF' in s.get('env',{}) for s in steps))
 def test_readiness_never_receives_backup_key_or_claims_to_open(self):
  job=self.workflows['readiness']['jobs']['optional-access-completion'];self.assertEqual(len(job['strategy']['matrix']['include']),2)
  raw=json.dumps(job);self.assertNotIn('LIVEPALMES_CODE_BACKUP_KEY',raw);self.assertNotIn('open-v2',raw)
  for mode,workflow in self.workflows.items():
   steps=workflow['jobs']['optional-access-completion']['steps'];ci=next(i for i,s in enumerate(steps) if "steps.ci.outputs.verified" in s.get('run',''))
   self.assertTrue(any(s.get('name')=='Distinguer installations et tests' and s['timeout-minutes']==1 for s in steps))
   for i,s in enumerate(steps):
    if 'auth@' in s.get('uses',''):self.assertGreater(i,ci)
    if 'setup-node@' in s.get('uses',''):self.assertEqual(s['timeout-minutes'],3)

class AuxiliaryOrderTests(unittest.TestCase):
 def test_actual_optional_post_source_branch_accepts_only_order_difference(self):
  tree=ast.parse((ROOT/'tools/publish-approved-pdf-functions.py').read_text(encoding='utf-8'))
  main=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='main')
  branch=next(n for n in main.body if isinstance(n,ast.If) and 'source_policy(request).enabled' in ast.unparse(n.test))
  for request,selection,ok in [({'optionalAccessObservationRelease':{}},['b','a'],True),({'optionalAccessObservationRelease':{}},['a','a'],False),
   ({'optionalAccessObservationRelease':{}},['a'],False),({'optionalAccessObservationRelease':{}},['a','b','extra'],False),({'other':{}},['b','a'],False)]:
   guarded=[];policy=SimpleNamespace(enabled=lambda r:True,approved=lambda r:True,manifest=lambda p:{'selected':['a','b']},guard=lambda p:guarded.append(True))
   cycle=SimpleNamespace(source_policy=lambda r:policy,read=lambda p:selection,require=m.require)
   wrapper=ast.FunctionDef(name='exercise',args=ast.arguments(posonlyargs=[],args=[],kwonlyargs=[],kw_defaults=[],defaults=[]),body=[branch],decorator_list=[],type_params=[])
   scope={'cycle':cycle,'request':request,'plan':Path('fixture')};exec(compile(ast.fix_missing_locations(ast.Module(body=[wrapper],type_ignores=[])),'actual-post-source','exec'),scope)
   if ok:scope['exercise']();self.assertEqual(guarded,[True])
   else:
    with self.assertRaises(ValueError):scope['exercise']()
    self.assertEqual(guarded,[])

if __name__=='__main__':unittest.main()
