"""New WIF probe: isolated subject, exact ADC, consumer context and no writers."""
import copy,importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('publication_wif',ROOT/'tools/a3-production-wif-qualification.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def env(workspace='unused',kind='hosting'):
 return {'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REPOSITORY_ID':'1240638222','GITHUB_REPOSITORY_OWNER_ID':'284726282',
  'GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_RUN_ID':'777',
  'GITHUB_SHA':'a'*40,'EXPECTED_COMMIT':'a'*40,'VERIFIED_MAIN_CI':'true','WIF_READER_KIND':kind,'GITHUB_WORKSPACE':str(workspace),
  'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/'+m.WORKFLOW+'@refs/heads/main',
  'ACTIONS_ID_TOKEN_REQUEST_URL':'https://pipelines.actions.githubusercontent.com/fixed?id=fixture','ACTIONS_ID_TOKEN_REQUEST_TOKEN':'FIXTURE-TOKEN'}
def original(directory,kind='hosting'):
 e=env(directory,kind);ctx=m.context(e);file=Path(directory)/'gha-creds-12345678.json';e['GOOGLE_APPLICATION_CREDENTIALS']=str(file)
 audience='https://iam.googleapis.com/'+ctx['provider']
 value={'type':'external_account','audience':'//iam.googleapis.com/'+ctx['provider'],'subject_token_type':'urn:ietf:params:oauth:token-type:jwt',
  'token_url':'https://sts.googleapis.com/v1/token','service_account_impersonation_url':'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+ctx['account']+':generateAccessToken',
  'credential_source':{'url':'',
   'headers':{'Authorization':'Bearer FIXTURE-TOKEN'},'format':{'type':'json','subject_token_field_name':'value'}}}
 from urllib.parse import urlencode
 value['credential_source']['url']='https://pipelines.actions.githubusercontent.com/fixed?'+urlencode({'id':'fixture','audience':audience})
 file.write_text(json.dumps(value),encoding='utf-8');return e,file,value
class ProductionWifTests(unittest.TestCase):
 def test_real_contract_preserves_old_trust_and_uses_new_subject_for_both_accounts(self):
  p=m.contract();self.assertEqual(p['newBindings'],['hosting','backend']);self.assertEqual(len(p['readerPins']),5)
  subject=p['principalMember'].split('/subject/')[1];self.assertTrue(subject.startswith('production-delivery:'));self.assertLess(len(subject.encode()),128)
  self.assertNotEqual(subject,'repo:ffessmnap/LivePalmes:environment:production')
  expected={'a3-production-wif-qualification.yml','livepalmes-production-readiness.yml','livepalmes-production-release.yml','livepalmes-production-rollback.yml'}
  self.assertEqual(set(p['allowedWorkflows']),expected)
  self.assertEqual(p['allowedAudiences'],['https://iam.googleapis.com/'+m.context(env())['provider']])
  for name in expected:self.assertIn('ffessmnap/LivePalmes/.github/workflows/'+name+'@refs/heads/main',p['attributeCondition'])
  self.assertIn("assertion.repository_id == '1240638222'",p['attributeCondition']);self.assertIn("assertion.event_name == 'workflow_dispatch'",p['attributeCondition'])
 def test_altered_contract_is_refused(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'contract.json';p.write_text('{}')
   with patch.object(m,'PLAN',p),self.assertRaises(ValueError):m.contract()
 def test_context_refuses_other_repo_branch_attempt_reader_or_workflow_before_oidc(self):
  for kind in ['hosting','backend']:self.assertEqual(m.context(env(kind=kind))['kind'],kind)
  for field,value in [('GITHUB_REPOSITORY','other/repo'),('GITHUB_REPOSITORY_ID','1'),('GITHUB_REPOSITORY_OWNER_ID','1'),
   ('GITHUB_REF','refs/heads/other'),('GITHUB_EVENT_NAME','push'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_RUN_ID','0'),
   ('GITHUB_SHA','short'),('EXPECTED_COMMIT','b'*40),('VERIFIED_MAIN_CI','false'),('WIF_READER_KIND','other'),('GITHUB_WORKFLOW_REF','foreign')]:
   with self.subTest(field=field),self.assertRaises(ValueError):m.prepare({**env(),field:value},'unused')
 def test_copy_keeps_external_account_and_original_bytes_with_public_context_only(self):
  for kind in ['hosting','backend']:
   with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
    workspace=Path(tmp);e,file,value=original(workspace,kind);raw=file.read_bytes();destination=workspace/'private';destination.mkdir()
    ctx,source,observed,adc,record=m.prepare(e,destination)
    self.assertEqual(source,file);self.assertEqual(observed,raw);self.assertEqual(file.read_bytes(),raw)
    self.assertEqual(record['type'],'external_account');self.assertNotIn('private_key',record)
    self.assertEqual(record['project_id'],'livepalmes');self.assertEqual(record['client_email'],ctx['account'])
    self.assertEqual(record['service_account_impersonation'],{'token_lifetime_seconds':600})
    self.assertEqual({k:record[k] for k in value},value);self.assertEqual(json.loads(adc.read_bytes()),record)
 def test_foreign_audience_account_endpoint_header_or_extra_field_cannot_be_copied(self):
  for kind in ['audience','account','url','header','key','project']:
   with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
    e,file,value=original(Path(tmp));destination=Path(tmp)/'private';destination.mkdir()
    if kind=='audience':value['audience']='//iam.googleapis.com/foreign'
    if kind=='account':value['service_account_impersonation_url']=value['service_account_impersonation_url'].replace('github-actions-livepalmes@','foreign@')
    if kind=='url':value['credential_source']['url']='https://outside.invalid'
    if kind=='header':value['credential_source']['headers']['Authorization']='Bearer OTHER-FIXTURE'
    if kind=='key':value['private_key']='FIXTURE-NOT-A-REAL-KEY'
    if kind=='project':value['project_id']='foreign'
    file.write_text(json.dumps(value),encoding='utf-8')
    with self.assertRaises(ValueError):m.prepare(e,destination)
    self.assertFalse((destination/'qualified-adc.json').exists())
 def test_only_fixed_technical_apis_and_complete_119_active_inventory(self):
  self.assertIn('pageSize=500',m.technical_url('backend'));self.assertNotIn('identitytoolkit',m.technical_url('hosting'))
  rows=[{'name':'projects/livepalmes/locations/europe-west1/functions/fixture%03d'%i,'state':'ACTIVE'} for i in range(119)]
  self.assertEqual(m.technical({'functions':rows},'backend')['functionsActive'],119)
  for value in [{'functions':rows[:-1]},{'functions':rows,'nextPageToken':'FIXTURE-PAGE'},{'functions':rows,'unreachable':['region']},
   {'functions':rows[:-1]+[rows[0]]},{'functions':[{**rows[0],'state':'FAILED'}]+rows[1:]},{'functions':[{**rows[0],'name':'foreign'}]+rows[1:]}]:
   with self.assertRaises(ValueError):m.technical(value,'backend')
  for kind in ['other','test']:
   with self.assertRaises(ValueError):m.technical_url(kind)
  with self.assertRaises(ValueError):m.NoRedirect().redirect_request(None,None,302,'',{},'https://outside.invalid')
 def test_workflow_only_qualifies_existing_accounts_after_ci_without_json_secret(self):
  script="const fs=require('fs'),Y=require('./tests/firestore-rules/node_modules/yaml');process.stdout.write(JSON.stringify(Y.parse(fs.readFileSync('.github/workflows/a3-production-wif-qualification.yml','utf8'))))"
  w=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));job=w['jobs']['qualify'];self.assertEqual(list(w['on']),['workflow_dispatch'])
  self.assertEqual(job['environment'],'production');self.assertEqual(job['permissions'],{'contents':'read','actions':'read','id-token':'write'})
  self.assertEqual({r['kind']:r['account'] for r in job['strategy']['matrix']['include']},m.contract()['accounts'])
  steps=job['steps'];ci=next(i for i,s in enumerate(steps) if 'steps.ci.outputs.verified' in s.get('run',''));auth=next(i for i,s in enumerate(steps) if 'auth@' in s.get('uses',''))
  self.assertLess(ci,auth);self.assertEqual(steps[auth]['with']['service_account'],'${{ matrix.account }}')
  self.assertEqual(steps[auth]['with']['workload_identity_provider'],m.context(env())['provider'])
  raw=json.dumps(w)
  for forbidden in ['credentials_json','secrets.','firebase deploy','rollback.py','add-iam','set-iam','A2_BACKUP','LIVEPALMES_CODE_BACKUP_KEY']:
   self.assertNotIn(forbidden,raw)
  self.assertTrue(any(s.get('timeout-minutes')==3 for s in steps if 'setup-node@' in s.get('uses','')))
if __name__=='__main__':unittest.main()
