"""Private ACL reader: exact scope, bounded reads, no contents or exported metadata."""
import copy,importlib.util,json,os,subprocess,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('private_acl',ROOT/'tools/a3-private-storage-acl.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def environment():
 return {'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch',
  'GITHUB_RUN_ATTEMPT':'1','GITHUB_SHA':'a'*40,'EXPECTED_COMMIT':'a'*40,'GITHUB_RUN_ID':'777','VERIFIED_MAIN_CI':'true',
  'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/'+m.WORKFLOW+'@refs/heads/main'}
class FakeReader:
 def __init__(self,permissions=None):self.calls=[];self.permissions=list(m.PERMISSIONS) if permissions is None else permissions
 def __call__(self,url):
  self.calls.append(url);bucket=next(b for b in m.BUCKETS if b in url);kind=next(k for k,u in m.urls(bucket).items() if u==url)
  return {'permissions':{'permissions':self.permissions},'bucket':{'name':bucket,'iamConfiguration':{'uniformBucketLevelAccess':{'enabled':False},'publicAccessPrevention':'inherited'}},
   'iam':{'version':3,'bindings':[{'role':'roles/storage.admin','members':['user:SECRET-PRIVATE-EMAIL']}]},
   'default':{'items':[{'entity':'user-SECRET-OWNER','role':'OWNER'}]},
   'objects':{'items':[{'name':'entry-documents/SECRET-NAME/recap.pdf','acl':[{'entity':'user-SECRET-OWNER','role':'OWNER'}]}]}}[kind]
class PrivateAclTests(unittest.TestCase):
 def test_exact_context_before_credentials_or_token(self):
  m.context(environment())
  for key,bad in [('GITHUB_REPOSITORY','other/repo'),('GITHUB_REF','refs/heads/other'),('GITHUB_EVENT_NAME','push'),
   ('GITHUB_RUN_ATTEMPT','2'),('GITHUB_SHA','short'),('EXPECTED_COMMIT','b'*40),('GITHUB_RUN_ID','0'),('VERIFIED_MAIN_CI','false'),('GITHUB_WORKFLOW_REF','foreign')]:
   with self.subTest(key=key),patch.object(m.subprocess,'check_output') as token,self.assertRaises(ValueError):m.observe('unused',{**environment(),key:bad})
   token.assert_not_called()
 def test_exact_url_whitelist_refuses_content_metadata_token_pagination_or_foreign_bucket(self):
  reader=m.Reader('SECRET-AUTH');valid=m.urls(m.BUCKETS[0])['objects']
  with patch.object(m.urllib.request,'build_opener') as network:
   for url in [valid+'&pageToken=SECRET',valid.replace('maxResults=1000','maxResults=1001'),valid.replace('entry-documents','competition-pdfs'),
    valid.replace(m.BUCKETS[0],'foreign'),valid+'&fields=metadata',m.BASE+m.BUCKETS[0]+'/o/private?alt=media','https://outside.invalid']:
    with self.subTest(url=url),self.assertRaises(ValueError):reader(url)
   network.assert_not_called();self.assertEqual(reader.calls,[])
  self.assertNotIn('metadata',valid);self.assertNotIn('firebaseStorageDownloadTokens',valid)
 def test_transport_response_duplicate_and_request_budgets(self):
  class Response:
   def __enter__(self):return self
   def __exit__(self,*args):pass
   def read(self,limit):return b'x'*limit
  reader=m.Reader('SECRET-AUTH');url=m.urls(m.BUCKETS[0])['permissions']
  with patch.object(m.urllib.request,'build_opener') as network:
   network.return_value.open.return_value=Response()
   with self.assertRaisesRegex(ValueError,'RESPONSE_BUDGET'):reader(url)
   with self.assertRaisesRegex(ValueError,'READ_BUDGET'):reader(url)
   self.assertEqual(network.call_count,1)
  reader.calls=['budget']*10
  with self.assertRaises(ValueError):reader(url)
  with self.assertRaises(ValueError):m.parent.NoRedirect().redirect_request(None,None,302,'',{},'https://outside.invalid')
 def test_complete_metadata_is_aggregated_without_global_privacy_claim(self):
  reader=FakeReader()
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'report.json';self.assertTrue(m.observe(p,environment(),reader));raw=p.read_text();report=json.loads(raw)
  self.assertNotIn('SECRET-',raw);self.assertEqual(len(reader.calls),10);self.assertEqual(report['requestCount'],10)
  self.assertFalse(report['globalPrivacyProved']);self.assertFalse(report['inheritedProjectIamIncluded'])
  self.assertFalse(report['tokensRequested']);self.assertFalse(report['contentsRequested']);self.assertEqual(report['accessChanges'],0)
  self.assertTrue(all(b['aclMetadataReadComplete'] for b in report['buckets']))
 def test_missing_permissions_stop_after_two_tests_without_retry_or_grant(self):
  reader=FakeReader(['storage.objects.list'])
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'report.json';self.assertFalse(m.observe(p,environment(),reader));report=json.loads(p.read_text())
  self.assertEqual(len(reader.calls),2)
  self.assertTrue(all(len(b['missingPermissions'])==3 for b in report['buckets']))
 def test_access_error_is_redacted_and_cannot_become_success(self):
  def denied(url):raise urllib.error.HTTPError(url,403,'SECRET-ERROR',{},None)
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'report.json';self.assertFalse(m.observe(p,environment(),denied));raw=p.read_text()
  self.assertNotIn('SECRET-',raw);self.assertNotIn('storage.googleapis.com',raw);self.assertEqual(raw.count('403'),2)
 def test_public_acl_and_conditional_public_bucket_binding_remain_visible(self):
  acl=m.object_acl({'items':[{'name':'entry-documents/one/export.txt','acl':[{'entity':'allUsers','role':'READER'},{'entity':'allAuthenticatedUsers','role':'OWNER'}]}]})
  self.assertEqual(acl['counts']['entriesTxt'],{'objects':1,'publicReadAcl':1,'publicWriteAcl':1});self.assertFalse(acl['privateAccessProved'])
  iam=m.bucket_iam({'bindings':[{'role':'roles/storage.objectViewer','members':['allUsers'],'condition':{'expression':'fixture'}}]})
  self.assertEqual(iam['publicBindings'],[{'role':'roles/storage.objectViewer','conditional':True}])
 def test_extra_fields_foreign_names_duplicate_missing_acl_and_page_are_not_complete(self):
  item={'name':'entry-documents/one/recap.pdf','acl':[]}
  for data in [{'items':[item,item]},{'items':[{**item,'name':'other/recap.pdf'}]},{'items':[{'name':item['name']}]},
   {'items':[{**item,'metadata':{'firebaseStorageDownloadTokens':'SECRET'}}]},{'items':[item]*1001},{'items':[],'unrequested':'SECRET'}]:
   with self.subTest(dataType=list(data)),self.assertRaises(ValueError):m.object_acl(data)
  partial=m.object_acl({'items':[item],'nextPageToken':'SECRET-PAGE'});self.assertFalse(partial['listingComplete']);self.assertNotIn('SECRET',json.dumps(partial))
 def test_workflow_has_only_existing_hosting_identity_after_exact_ci(self):
  script="const fs=require('fs'),y=require('./tests/firestore-rules/node_modules/yaml');process.stdout.write(JSON.stringify(y.parse(fs.readFileSync('.github/workflows/a3-private-storage-acl.yml','utf8'))))"
  w=json.loads(subprocess.check_output(['node','-e',script],cwd=ROOT));self.assertEqual(list(w['on']),['workflow_dispatch'])
  self.assertEqual(w['permissions'],{'contents':'read','actions':'read'});job=w['jobs']['observe'];self.assertEqual(job['environment'],'production')
  steps=job['steps'];auth=next(i for i,s in enumerate(steps) if 'auth@' in s.get('uses',''));ci=next(i for i,s in enumerate(steps) if 'steps.ci.outputs.verified' in s.get('run',''))
  self.assertLess(ci,auth);self.assertEqual(steps[auth]['with'],{'credentials_json':'${{ secrets.FIREBASE_SERVICE_ACCOUNT_LIVEPALMES }}','project_id':'livepalmes'})
  raw=json.dumps(w)
  for forbidden in ['A2_BACKUP','id-token','add-iam','set-iam','firebase deploy','LIVEPALMES_CODE_BACKUP_KEY']:self.assertNotIn(forbidden,raw)
  self.assertIn("inputs.expected_commit == github.sha",job['if']);self.assertIn('github.run_attempt == 1',job['if'])
if __name__=='__main__':unittest.main()
