"""A3.5: bounded object metadata, aggregate output only, no content or mutation."""
import datetime,json,os,re,subprocess,sys,urllib.error,urllib.request
from pathlib import Path
from urllib.parse import urlencode

BUCKETS=('livepalmes.firebasestorage.app','livepalmes-test.firebasestorage.app')
PREFIXES=('entry-documents/','competition-documents/','national-documents/')
IDENTITY='a2-firebase-backup@livepalmes-test.iam.gserviceaccount.com'
PERMISSIONS=('storage.objects.list','storage.objects.getIamPolicy','storage.buckets.get','storage.buckets.getIamPolicy')
PUBLIC={'allUsers','allAuthenticatedUsers'}
BASE='https://storage.googleapis.com/storage/v1/b/'

def require(value,message='METADATA_CONTRACT_REFUSED'):
    if not value:raise ValueError(message)

def context(env):
    require(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
        and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1'
        and re.fullmatch('[0-9a-f]{40}',env.get('GITHUB_SHA','')) and env.get('EXPECTED_COMMIT')==env['GITHUB_SHA']
        and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')) and env.get('VERIFIED_MAIN_CI')=='true'
        and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/a3-storage-exposure-metadata.yml@refs/heads/main',
        'EXACT_VERIFIED_MANUAL_MAIN_REQUIRED')

def permissions_url(bucket):
    require(bucket in BUCKETS)
    return BASE+bucket+'/iam/testPermissions?'+urlencode([('permissions',value) for value in PERMISSIONS]+[('fields','permissions')])

def default_acl_url(bucket):
    require(bucket in BUCKETS)
    return BASE+bucket+'/defaultObjectAcl?'+urlencode({'fields':'items(entity,role)'})

def objects_url(bucket,prefix,acl):
    require(bucket in BUCKETS and prefix in PREFIXES and isinstance(acl,bool))
    fields='items(name,metadata/firebaseStorageDownloadTokens'+(',acl(entity,role)' if acl else '')+'),nextPageToken'
    return BASE+bucket+'/o?'+urlencode({'prefix':prefix,'maxResults':1000,'versions':'false','projection':'full' if acl else 'noAcl','fields':fields})

def allowed(url):
    return any(url in {permissions_url(bucket),default_acl_url(bucket),*(objects_url(bucket,prefix,acl) for prefix in PREFIXES for acl in (True,False))} for bucket in BUCKETS)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):raise ValueError('REDIRECT_REFUSED')

class Reader:
    def __init__(self,token):self.token,self.calls=token,[]
    def __call__(self,url):
        require(allowed(url),'ENDPOINT_REFUSED')
        require(url not in self.calls and len(self.calls)<10,'READ_BUDGET_EXCEEDED')
        self.calls.append(url)
        request=urllib.request.Request(url,headers={'Authorization':'Bearer '+self.token})
        with urllib.request.build_opener(NoRedirect).open(request,timeout=30) as response:
            raw=response.read(4_000_001);require(len(raw)<=4_000_000,'RESPONSE_BUDGET_EXCEEDED')
            return json.loads(raw)

def public_acl(entries):
    require(isinstance(entries,list) and len(entries)<=100,'ACL_BUDGET_EXCEEDED')
    result={'publicRead':False,'publicWrite':False}
    for entry in entries:
        require(isinstance(entry,dict) and isinstance(entry.get('entity'),str) and 0<len(entry['entity'])<=1024 and entry.get('role') in {'OWNER','READER','WRITER'},'UNKNOWN_ACL_ROLE')
        if entry.get('entity') in PUBLIC:
            result['publicRead']=True
            result['publicWrite']|=entry['role'] in {'OWNER','WRITER'}
    return result

def summarize(data,prefix,with_acl):
    require(prefix in PREFIXES and isinstance(with_acl,bool))
    items=data.get('items',[])
    require(isinstance(items,list) and len(items)<=1000,'OBJECT_METADATA_BUDGET_EXCEEDED')
    counts={name:{'objects':0,'withDownloadToken':0,'publicReadAcl':0 if with_acl else None,'publicWriteAcl':0 if with_acl else None} for name in ('recapPdf','officialsPdf','entriesTxt','other')}
    seen=set()
    for item in items:
        name=item.get('name')
        require(isinstance(name,str) and name.startswith(prefix) and len(name.encode('utf-8'))<=1024 and name not in seen,'FOREIGN_OR_DUPLICATE_OBJECT')
        seen.add(name)
        kind='recapPdf' if name.endswith('/recap.pdf') else 'officialsPdf' if name.endswith('/officiels/liste-officiels.pdf') else 'entriesTxt' if name.endswith('/export.txt') else 'other'
        metadata=item.get('metadata',{});require(isinstance(metadata,dict),'INVALID_TOKEN_METADATA')
        token=metadata.get('firebaseStorageDownloadTokens','')
        require(isinstance(token,str) and len(token.encode('utf-8'))<=4096,'INVALID_TOKEN_METADATA')
        row=counts[kind];row['objects']+=1;row['withDownloadToken']+=bool(token.strip())
        if with_acl:
            require('acl' in item,'OBJECT_ACL_NOT_RETURNED')
            exposure=public_acl(item['acl']);row['publicReadAcl']+=exposure['publicRead'];row['publicWriteAcl']+=exposure['publicWrite']
    return {'prefix':prefix,'listedObjects':len(items),'currentVersionsOnly':True,'listingComplete':not bool(data.get('nextPageToken')),
        'objectAclRead':with_acl,'counts':counts,'namesExported':False,'tokensExported':False,
        'privateAccessProved':False,'publicationIntentInferred':False}

def collect_bucket(bucket,read):
    grants=read(permissions_url(bucket)).get('permissions',[])
    require(isinstance(grants,list) and set(grants)<=set(PERMISSIONS),'UNEXPECTED_PERMISSION_METADATA')
    result={'bucket':bucket,'readOnly':True,'permissions':sorted(set(grants)),'prefixes':[]}
    if {'storage.buckets.get','storage.buckets.getIamPolicy'}<=set(grants):
        try:result['defaultAcl']={'status':'observed',**public_acl(read(default_acl_url(bucket)).get('items',[]))}
        except (urllib.error.HTTPError,ValueError,TypeError) as error:result['defaultAcl']={'status':'incomplete','httpStatus':getattr(error,'code',None),'errorType':type(error).__name__}
    else:result['defaultAcl']={'status':'incomplete','reasonCode':'EXISTING_PERMISSION_NOT_HELD'}
    if 'storage.objects.list' not in grants:
        result['listingStatus']='incomplete';result['reasonCode']='EXISTING_LIST_PERMISSION_NOT_HELD';return result
    acl='storage.objects.getIamPolicy' in grants
    for prefix in PREFIXES:
        try:result['prefixes'].append(summarize(read(objects_url(bucket,prefix,acl)),prefix,acl))
        except (urllib.error.HTTPError,ValueError,TypeError) as error:result['prefixes'].append({'prefix':prefix,'listingComplete':False,'httpStatus':getattr(error,'code',None),'errorType':type(error).__name__})
    result['listingStatus']='observed' if all(row['listingComplete'] for row in result['prefixes']) else 'incomplete'
    return result

def observe(output,env=os.environ):
    context(env) # Before credentials, token, directory or remote access.
    with Path(env['GOOGLE_APPLICATION_CREDENTIALS']).open(encoding='utf-8') as stream:account=json.load(stream)
    require(account.get('type')=='service_account' and account.get('project_id')=='livepalmes-test' and account.get('client_email')==IDENTITY,'EXISTING_READ_ONLY_IDENTITY_REQUIRED')
    def run(args):return subprocess.check_output(['gcloud',*args],text=True,stderr=subprocess.DEVNULL,timeout=40).strip()
    require(run(['auth','list','--filter=status:ACTIVE','--format=value(account)'])==IDENTITY,'EXISTING_READ_ONLY_IDENTITY_REQUIRED')
    token=run(['auth','application-default','print-access-token'])
    require(bool(token),'CREDENTIAL_UNAVAILABLE');reader=Reader(token)
    report={'schema':1,'candidate':env['GITHUB_SHA'],'runId':int(env['GITHUB_RUN_ID']),'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'identity':IDENTITY,'buckets':[],'maximumRequests':10,'maximumObjectMetadataRows':6000,'objectContentsRead':0,
        'configurationWrites':0,'objectWrites':0,'deletions':0,'namesExported':False,'tokensExported':False,
        'securityQualificationComplete':False,'accessChangeAllowed':False,
        'limitations':['Current metadata of three fixed prefixes only; other prefixes, noncurrent versions, managed folders and actual use/revocation of links remain outside scope.','A listing, ACL or token does not establish sporting publication intent or authorize a data/access change.']}
    for bucket in BUCKETS:
        try:report['buckets'].append(collect_bucket(bucket,reader))
        except (urllib.error.HTTPError,urllib.error.URLError,ValueError,KeyError,TypeError,TimeoutError) as error:
            report['buckets'].append({'bucket':bucket,'status':'incomplete','errorType':type(error).__name__,'httpStatus':getattr(error,'code',None)})
    report['requestCount']=len(reader.calls)
    report['metadataReadComplete']=all(row.get('listingStatus')=='observed' and row.get('defaultAcl',{}).get('status')=='observed' and all(prefix.get('objectAclRead') for prefix in row['prefixes']) for row in report['buckets'])
    Path(output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Metadonnees Storage agregees uniquement ; aucun nom, jeton ou contenu exporte.')
    return report['metadataReadComplete']

if __name__=='__main__':
    try:
        require(len(sys.argv)==2,'OUTPUT_REQUIRED');sys.exit(0 if observe(sys.argv[1]) else 1)
    except Exception:
        print('Collecte Storage refusee ; aucun contenu sensible affiche.');sys.exit(1)
