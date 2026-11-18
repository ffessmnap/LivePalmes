"""Current private-document ACL metadata only; existing Hosting reader, no grants."""
import datetime,hashlib,importlib.util,json,os,re,subprocess,sys,urllib.error,urllib.request
from pathlib import Path
from urllib.parse import urlencode
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('existing_storage_acl',ROOT/'tools/a3-storage-exposure-metadata.py')
parent=importlib.util.module_from_spec(spec);spec.loader.exec_module(parent)
BUCKETS=parent.BUCKETS;PERMISSIONS=parent.PERMISSIONS;BASE=parent.BASE
IDENTITY='github-actions-livepalmes@livepalmes.iam.gserviceaccount.com'
WORKFLOW='.github/workflows/a3-private-storage-acl.yml'
require=parent.require
def context(env):
 require(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
  and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1'
  and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/'+WORKFLOW+'@refs/heads/main'
  and re.fullmatch('[0-9a-f]{40}',env.get('GITHUB_SHA','')) and env.get('EXPECTED_COMMIT')==env['GITHUB_SHA']
  and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')) and env.get('VERIFIED_MAIN_CI')=='true',
  'EXACT_VERIFIED_PRIVATE_ACL_WORKFLOW_REQUIRED')
def urls(bucket):
 require(bucket in BUCKETS,'FOREIGN_BUCKET')
 root=BASE+bucket
 return {'permissions':parent.permissions_url(bucket),
  'bucket':root+'?'+urlencode({'fields':'name,iamConfiguration'}),
  'iam':root+'/iam?'+urlencode({'optionsRequestedPolicyVersion':3,'fields':'version,bindings(role,members,condition)'}),
  'default':parent.default_acl_url(bucket),
  'objects':root+'/o?'+urlencode({'prefix':'entry-documents/','maxResults':1000,'versions':'false','projection':'full',
    'fields':'items(name,acl(entity,role)),nextPageToken'})}
class Reader:
 def __init__(self,token):self.token,self.calls=token,[]
 def __call__(self,url):
  require(url in {u for b in BUCKETS for u in urls(b).values()},'ENDPOINT_REFUSED')
  require(url not in self.calls and len(self.calls)<10,'READ_BUDGET_EXCEEDED');self.calls.append(url)
  request=urllib.request.Request(url,headers={'Authorization':'Bearer '+self.token})
  with urllib.request.build_opener(parent.NoRedirect).open(request,timeout=30) as response:
   raw=response.read(4_000_001);require(len(raw)<=4_000_000,'RESPONSE_BUDGET_EXCEEDED');return json.loads(raw)
def object_acl(data):
 require(set(data)<= {'items','nextPageToken'},'UNEXPECTED_OBJECT_METADATA')
 items=data.get('items',[]);require(isinstance(items,list) and len(items)<=1000,'OBJECT_BUDGET_EXCEEDED')
 counts={n:{'objects':0,'publicReadAcl':0,'publicWriteAcl':0} for n in ['recapPdf','officialsPdf','entriesTxt','other']};seen=set()
 for item in items:
  require(isinstance(item,dict) and set(item)=={'name','acl'},'UNREQUESTED_OBJECT_FIELD')
  name=item['name'];require(isinstance(name,str) and name.startswith('entry-documents/') and len(name.encode())<=1024 and name not in seen,'FOREIGN_DUPLICATE_OBJECT')
  seen.add(name);exposure=parent.public_acl(item['acl'])
  kind='recapPdf' if name.endswith('/recap.pdf') else 'officialsPdf' if name.endswith('/officiels/liste-officiels.pdf') else 'entriesTxt' if name.endswith('/export.txt') else 'other'
  counts[kind]['objects']+=1
  for field in ['publicRead','publicWrite']:counts[kind][field+'Acl']+=exposure[field]
 return {'objects':len(items),'counts':counts,'listingComplete':not bool(data.get('nextPageToken')),'currentVersionsOnly':True,
  'namesExported':False,'tokensRequested':False,'contentsRequested':False,'privateAccessProved':False}
def bucket_iam(value):
 require(set(value)<={'version','bindings'},'UNEXPECTED_IAM_METADATA')
 rows=value.get('bindings',[]);require(isinstance(rows,list) and len(rows)<=500,'IAM_BUDGET_EXCEEDED')
 public=[]
 for binding in rows:
  require(isinstance(binding,dict) and set(binding)<={'role','members','condition'} and re.fullmatch('(?:roles/|projects/(?:livepalmes|livepalmes-test)/roles/)[A-Za-z0-9_.]+',binding.get('role','')),'INVALID_IAM_ROLE')
  members=binding.get('members',[]);require(isinstance(members,list) and len(members)<=1000 and all(isinstance(x,str) and len(x)<=2048 for x in members),'INVALID_IAM_MEMBERS')
  if any(x in parent.PUBLIC for x in members):public.append({'role':binding['role'],'conditional':bool(binding.get('condition'))})
 return {'bindingCount':len(rows),'publicBindings':public,'privatePrincipalsExported':False,'inheritedProjectIamIncluded':False}
def collect(bucket,read):
 endpoints=urls(bucket);grants=read(endpoints['permissions']).get('permissions',[])
 require(isinstance(grants,list) and len(grants)==len(set(grants)) and set(grants)<=set(PERMISSIONS),'UNEXPECTED_PERMISSIONS')
 result={'bucket':bucket,'permissions':sorted(grants),'missingPermissions':sorted(set(PERMISSIONS)-set(grants)),
  'readOnly':True,'aclMetadataReadComplete':False,'accessChangeAllowed':False}
 if result['missingPermissions']:return result
 metadata=read(endpoints['bucket']);require(metadata.get('name')==bucket and set(metadata)<={'name','iamConfiguration'},'FOREIGN_BUCKET_METADATA')
 config=metadata.get('iamConfiguration',{});require(isinstance(config,dict),'INVALID_BUCKET_CONFIGURATION')
 uniform=config.get('uniformBucketLevelAccess',{}).get('enabled');require(isinstance(uniform,bool),'UNKNOWN_UNIFORM_ACCESS')
 result['uniformBucketLevelAccess']=uniform;result['publicAccessPrevention']=config.get('publicAccessPrevention','unknown')
 result['bucketIam']=bucket_iam(read(endpoints['iam']))
 if uniform:
  result['defaultAcl']={'applicable':False};result['objectAcl']={'applicable':False}
 else:
  default=read(endpoints['default']);require(set(default)<={'items'},'UNEXPECTED_DEFAULT_ACL_METADATA')
  result['defaultAcl']={'applicable':True,**parent.public_acl(default.get('items',[]))}
  result['objectAcl']=object_acl(read(endpoints['objects']))
 result['aclMetadataReadComplete']=uniform or result['objectAcl']['listingComplete']
 return result
def observe(output,env=os.environ,read=None):
 context(env)
 if read is None:
  raw=Path(env['GOOGLE_APPLICATION_CREDENTIALS']).read_bytes();require(len(raw)<=32768,'CREDENTIAL_SIZE_REFUSED');identity=json.loads(raw)
  require(identity.get('type')=='service_account' and identity.get('project_id')=='livepalmes' and identity.get('client_email')==IDENTITY,'EXISTING_HOSTING_IDENTITY_REQUIRED')
  token=subprocess.check_output(['gcloud','auth','application-default','print-access-token'],text=True,stderr=subprocess.DEVNULL,timeout=40).strip();read=Reader(token)
 report={'schema':1,'candidate':env['GITHUB_SHA'],'run':int(env['GITHUB_RUN_ID']),'workflow':WORKFLOW,
  'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'readerIdentitySha256':hashlib.sha256(IDENTITY.encode()).hexdigest(),
  'readOnly':True,'buckets':[],'namesExported':False,'tokensRequested':False,'tokensExported':False,'contentsRequested':False,
  'businessInvocations':0,'accessChanges':0,'globalPrivacyProved':False,'inheritedProjectIamIncluded':False,
  'limitations':['Two fixed Firebase buckets; current entry-documents ACLs only, one page of1000. No old versions or public PDF families read.',
   'Bucket IAM excludes inherited project policies; these require their separate administrative proof. ACL metadata alone is not global privacy or publication intent.']}
 for bucket in BUCKETS:
  try:report['buckets'].append(collect(bucket,read))
  except (urllib.error.HTTPError,urllib.error.URLError,ValueError,KeyError,TypeError,TimeoutError) as error:
   report['buckets'].append({'bucket':bucket,'aclMetadataReadComplete':False,'httpStatus':getattr(error,'code',None),'errorType':type(error).__name__})
 report['requestCount']=len(getattr(read,'calls',[]));report['aclMetadataReadComplete']=all(b.get('aclMetadataReadComplete') is True for b in report['buckets'])
 Path(output).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print('Metadonnees ACL agregees uniquement ; aucun droit ajoute ni contenu lu.')
 return report['aclMetadataReadComplete']
if __name__=='__main__':
 try:require(len(sys.argv)==2,'OUTPUT_REQUIRED');sys.exit(0 if observe(sys.argv[1]) else 1)
 except Exception:print('Lecture ACL refusee ; aucun contenu sensible affiche.');sys.exit(1)
