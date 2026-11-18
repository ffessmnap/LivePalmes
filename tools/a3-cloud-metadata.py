"""Bounded administrative metadata; never reads objects/users or changes state."""
import datetime,hashlib,importlib.util,json,os,re,subprocess,sys,urllib.error,urllib.request
from pathlib import Path
from urllib.parse import quote

TARGETS={
 'livepalmes':{'number':'718081132564','firebase':'livepalmes.firebasestorage.app','public':'livepalmes-public-data-718081132564','identity':'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com'},
 'livepalmes-test':{'number':'206080168534','firebase':'livepalmes-test.firebasestorage.app','public':'livepalmes-test-public-data-206080168534','identity':'github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com'}
}
HOSTING_READER='github-actions-livepalmes@livepalmes.iam.gserviceaccount.com'
AUTH_ERROR_CODES={
 'Auth project drift':'auth-project-mismatch',
 'Unknown Auth subtype':'auth-subtype-unknown',
 'Unknown Auth domain metadata':'auth-domain-format-unknown',
 'MFA provider budget exceeded':'mfa-provider-budget',
 'Unknown MFA state':'mfa-state-unknown',
 'Unknown MFA provider':'mfa-provider-unknown',
 'Unknown MFA provider state':'mfa-provider-state-unknown',
}
PUBLIC={'allUsers','allAuthenticatedUsers'}
PERMISSIONS={'storage.objects.get','storage.objects.list','storage.objects.create','storage.objects.update','storage.objects.delete','storage.buckets.setIamPolicy','storage.buckets.update'}
RUN_FIELDS='services(name,generation,observedGeneration,reconciling,latestCreatedRevision,latestReadyRevision,scaling(minInstanceCount,maxInstanceCount,scalingMode,manualInstanceCount),template(revision,scaling(minInstanceCount,maxInstanceCount),maxInstanceRequestConcurrency),trafficStatuses(revision,percent,tag)),nextPageToken,unreachable'

def app_check_endpoint(project):
    require(project in TARGETS,'Unknown project')
    return ('https://firebaseappcheck.googleapis.com/v1/projects/'+TARGETS[project]['number']+
        '/services?pageSize=20&fields=services(name,enforcementMode,replayProtection),nextPageToken')


def collect_app_check_services(project,read):
    data=read(app_check_endpoint(project))
    require(isinstance(data,dict) and not data.get('nextPageToken'),'App Check inventory incomplete')
    services=data.get('services',[])
    require(isinstance(services,list) and len(services)<=20,'App Check service budget exceeded')
    rows=[];modes=(None,'OFF','UNENFORCED','ENFORCED');rank={'OFF':0,'UNENFORCED':1,'ENFORCED':2}
    for service in services:
        require(isinstance(service,dict),'Unknown App Check service')
        name=service.get('name','')
        require(isinstance(name,str) and re.fullmatch('projects/'+TARGETS[project]['number']+r'/services/[a-z][a-z0-9.-]{0,99}\.googleapis\.com',name),'App Check project/service drift')
        mode,replay=service.get('enforcementMode'),service.get('replayProtection')
        require(mode in modes and replay in modes,'Unknown App Check enforcement mode')
        require(mode is None or replay is None or rank[replay]<=rank[mode],'Inconsistent App Check protections')
        rows.append({'name':name,'enforcementMode':mode,'replayProtection':replay})
    require(len({row['name'] for row in rows})==len(rows),'Duplicate App Check service')
    return {'schema':1,'project':project,'requestCount':1,'explicitlyConfiguredServices':sorted(rows,key=lambda row:row['name']),
        'unlistedServicesInferred':False,'missingModesInferred':False,'configurationWrites':0,'tokensRead':0,'usersRead':0,
        'enforcementActivated':False,'securityQualificationComplete':False,
        'limitations':['Only explicitly configured service baselines are returned by this API.',
            'Missing services/modes are not qualified as protected or unprotected.',
            'Child resource policies, callable enforcement flags, provider/app registration and real traffic are not read.']}


def app_check_error_code(error):
    try:
        raw=error.read(16385)
        if len(raw)>16384:return None
        details=json.loads(raw).get('error',{}).get('details',[])
        if not isinstance(details,list) or len(details)>20:return None
        reasons={'SERVICE_DISABLED':'app-check-api-disabled','IAM_PERMISSION_DENIED':'app-check-permission-denied',
            'ACCESS_TOKEN_SCOPE_INSUFFICIENT':'app-check-token-scope-insufficient','CONSUMER_INVALID':'app-check-consumer-invalid'}
        for item in details:
            if isinstance(item,dict) and item.get('@type')=='type.googleapis.com/google.rpc.ErrorInfo':
                reason=item.get('reason')
                if isinstance(reason,str) and reason in reasons:return reasons[reason]
    except (ValueError,TypeError,AttributeError,OSError):pass
    return None


def run_endpoint(project):
    require(project in TARGETS,'Unknown project')
    return 'https://run.googleapis.com/v2/projects/'+project+'/locations/europe-west1/services?pageSize=500&fields='+RUN_FIELDS

def collect_run_services(project,read):
    data=read(run_endpoint(project))
    require(not data.get('nextPageToken') and not data.get('unreachable'),'Cloud Run inventory incomplete')
    services=data.get('services',[])
    require(isinstance(services,list) and 0<len(services)<=500,'Cloud Run inventory incomplete')
    rows=[]
    projects='(?:'+re.escape(project)+'|'+TARGETS[project]['number']+')'
    prefix=r'projects/'+projects+r'/locations/europe-west1/services/'
    for service in services:
        name=service.get('name','')
        require(re.fullmatch(prefix+r'[a-z][a-z0-9-]{0,62}',name),'Foreign Cloud Run service')
        service_id=name.split('/')[-1]
        def revision(value):
            require(value is None or isinstance(value,str) and re.fullmatch(r'(?:'+prefix+re.escape(service_id)+r'/revisions/)?'+re.escape(service_id)+r'-[a-z0-9-]+',value),'Foreign Cloud Run revision')
            return value
        template=service.get('template',{});scaling=service.get('scaling',{});revision_scaling=template.get('scaling',{})
        mode=scaling.get('scalingMode')
        require(mode in {None,'SCALING_MODE_UNSPECIFIED','AUTOMATIC','MANUAL'},'Unknown Cloud Run scaling mode')
        require(isinstance(service.get('reconciling',False),bool),'Invalid reconciliation state')
        traffic=service.get('trafficStatuses',[])
        require(isinstance(traffic,list) and len(traffic)<=20,'Cloud Run traffic budget exceeded')
        statuses=[]
        for target in traffic:
            percent=numeric(target.get('percent'))
            require(percent is None or percent<=100,'Invalid Cloud Run traffic percent')
            statuses.append({'revision':revision(target.get('revision')),'percent':percent,'tagged':bool(target.get('tag'))})
        rows.append({'name':name,'generation':numeric(service.get('generation')),'observedGeneration':numeric(service.get('observedGeneration')),
            'reconciling':service.get('reconciling',False),'latestCreatedRevision':revision(service.get('latestCreatedRevision')),
            'latestReadyRevision':revision(service.get('latestReadyRevision')),'templateRevision':revision(template.get('revision')),
            'serviceMaxInstances':numeric(scaling.get('maxInstanceCount')),'serviceMinInstances':numeric(scaling.get('minInstanceCount')),
            'scalingMode':mode,'manualInstances':numeric(scaling.get('manualInstanceCount')),
            'revisionMaxInstances':numeric(revision_scaling.get('maxInstanceCount')),'revisionMinInstances':numeric(revision_scaling.get('minInstanceCount')),
            'concurrency':numeric(template.get('maxInstanceRequestConcurrency')),'trafficStatuses':statuses})
    require(len({row['name'] for row in rows})==len(rows),'Duplicate Cloud Run service')
    return {'schema':1,'project':project,'requestCount':1,'services':sorted(rows,key=lambda row:row['name']),
        'configurationWrites':0,'environmentValuesRead':False,'sqlBudgetApproved':False,
        'limitations':['Absent caps stay unknown; no platform defaults substituted.','Current template and traffic only; older revision settings and rollout overlap are not inferred.','Function/service/revision matching is required before using these capacities.']}

def require(condition,message):
    if not condition: raise ValueError(message)

def public_bindings(policy):
    result=[]
    for binding in policy.get('bindings',[]):
        members=sorted(PUBLIC.intersection(binding.get('members',[])))
        if not members: continue
        role=binding.get('role','')
        require(re.fullmatch(r'roles/[A-Za-z0-9_.]+|projects/[a-z0-9-]+/roles/[A-Za-z0-9_.]+|organizations/[0-9]+/roles/[A-Za-z0-9_.]+',role),'Invalid role name')
        result.append({'publicMembers':members,'role':role,'conditional':bool(binding.get('condition'))})
    return result

def numeric(value):
    require(value is None or isinstance(value,(int,str)) and re.fullmatch(r'[0-9]+',str(value)),'Invalid capacity metadata')
    return None if value is None else int(value)

def collect_auth(project,read):
    require(project in TARGETS,'Unknown project')
    data=read('https://identitytoolkit.googleapis.com/admin/v2/projects/'+project+'/config?fields=name,subtype,authorizedDomains,mfa(state,enabledProviders,providerConfigs(state,totpProviderConfig(adjacentIntervals)))')
    require(data.get('name') in {'projects/'+project+'/config','projects/'+TARGETS[project]['number']+'/config'},'Auth project drift')
    subtype=data.get('subtype')
    require(subtype in {'IDENTITY_PLATFORM','FIREBASE_AUTH','SUBTYPE_UNSPECIFIED'},'Unknown Auth subtype')
    domains=data.get('authorizedDomains',[])
    require(isinstance(domains,list) and len(domains)<=100 and all(isinstance(x,str) and re.fullmatch('[A-Za-z0-9.-]{1,253}',x) for x in domains),'Unknown Auth domain metadata')
    mfa=data.get('mfa',{});providers=mfa.get('providerConfigs',[])
    require(len(providers)<=5,'MFA provider budget exceeded')
    state=mfa.get('state')
    require(state is None or re.fullmatch('[A-Z_]+',state),'Unknown MFA state')
    enabled=mfa.get('enabledProviders',[])
    require(isinstance(enabled,list) and len(enabled)<=5 and all(re.fullmatch('[A-Z_]+',x) for x in enabled),'Unknown MFA provider')
    factors=[]
    for provider in providers:
        status=provider.get('state')
        require(status is None or re.fullmatch('[A-Z_]+',status),'Unknown MFA provider state')
        factors.append({'state':status,'totpConfigured':'totpProviderConfig' in provider,'adjacentIntervals':numeric(provider.get('totpProviderConfig',{}).get('adjacentIntervals'))})
    return {'readOnly':True,'project':project,'subtype':subtype,'authorizedDomains':sorted(domains),'mfaState':state,'enabledProviders':enabled,'providerConfigs':factors,'usersRead':0,'factorsEnrolled':0,'emailsSent':0,'configurationChanged':False,'costCommitmentMade':False,'mandatoryMfaActivated':False}

def collect(project,read,emit=lambda report:None):
    require(project in TARGETS,'Unknown project')
    target=TARGETS[project]
    report={'schema':1,'project':project,'readOnly':True,'objectContentsRead':0,'objectsListed':0,'iamWrites':0,'rulesWrites':0,'businessInvocations':0,'buckets':[],'limitations':[]}
    hierarchy=read('https://cloudresourcemanager.googleapis.com/v3/projects/'+project)
    require(str(hierarchy.get('name','')).split('/')[-1]==target['number'] and hierarchy.get('projectId')==project,'Project identity drift')
    parent=hierarchy.get('parent')
    report['ancestorPolicyRead']=not bool(parent)
    if parent: report['limitations'].append('Project has an ancestor; inherited IAM not yet read or qualified.')
    emit(report)
    project_policy=read('https://cloudresourcemanager.googleapis.com/v1/projects/'+project+':getIamPolicy',{'options':{'requestedPolicyVersion':3}})
    report['projectPublicBindings']=public_bindings(project_policy)
    emit(report)
    roles={binding['role'] for binding in report['projectPublicBindings']}
    for kind in ['firebase','public']:
        bucket=target[kind]
        metadata=read('https://storage.googleapis.com/storage/v1/b/'+bucket+'?fields=name,projectNumber,iamConfiguration,versioning,retentionPolicy,softDeletePolicy,encryption')
        require(metadata.get('name')==bucket and str(metadata.get('projectNumber'))==target['number'],'Bucket identity drift')
        policy=read('https://storage.googleapis.com/storage/v1/b/'+bucket+'/iam?optionsRequestedPolicyVersion=3')
        grants=public_bindings(policy);roles.update(binding['role'] for binding in grants)
        configuration=metadata.get('iamConfiguration',{})
        ubla=configuration.get('uniformBucketLevelAccess',{}).get('enabled')
        require(isinstance(ubla,bool),'Unknown uniform bucket access')
        row={'kind':kind,'name':bucket,'uniformBucketLevelAccess':ubla,'publicAccessPrevention':configuration.get('publicAccessPrevention'),'publicBindings':grants,'objectAclInventoryRead':False,'objectTokenMetadataRead':False,'defaultObjectAclRead':False,'objectPrivacyProved':False,'versioningEnabled':metadata.get('versioning',{}).get('enabled'),'softDeleteRetentionSeconds':numeric(metadata.get('softDeletePolicy',{}).get('retentionDurationSeconds'))}
        if not ubla: report['limitations'].append(kind+': existing per-object ACLs not inspected.')
        report['buckets'].append(row)
        emit(report)
    require(len(roles)<=10,'Public role lookup budget exceeded')
    report['publicRolePermissions']={}
    for role in sorted(roles):
        policy=read('https://iam.googleapis.com/v1/'+role)
        report['publicRolePermissions'][role]=sorted(PERMISSIONS.intersection(policy.get('includedPermissions',[])))
    report['firebaseStorageRules']=collect_storage_rules(project,read)
    emit(report)
    report['functions']=collect_functions(project,read)
    report['limitations']+=['Download-token distribution/revocation and sporting publication intent remain separate qualifications.','Cloud Run rollout overlap, external NAP consumers and SQL administrative reserve are not inferred from this inventory.']
    report['accessOrSqlBudgetApproved']=False
    report['maximumReadRequests']=10+len(roles)
    emit(report)
    return report

def collect_storage_rules(project,read):
    require(project in TARGETS,'Unknown project')
    release=read('https://firebaserules.googleapis.com/v1/projects/'+project+'/releases/firebase.storage/'+TARGETS[project]['firebase'])
    ruleset=release.get('rulesetName','')
    require(re.fullmatch('projects/'+re.escape(project)+r'/rulesets/[A-Za-z0-9-]+',ruleset),'Ruleset identity drift')
    source=read('https://firebaserules.googleapis.com/v1/'+ruleset)
    files=source.get('source',{}).get('files',[])
    require(len(files)==1 and isinstance(files[0].get('content'),str) and len(files[0]['content'])<=200000,'Rules source budget exceeded')
    content=files[0]['content'].replace('\r\n','\n').encode()
    return {'releaseName':release.get('name'),'ruleset':ruleset,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content),'rawSourceExported':False,'reviewedAsSecure':False}

def collect_functions(project,read):
    require(project in TARGETS,'Unknown project')
    data=read('https://cloudfunctions.googleapis.com/v2/projects/'+project+'/locations/-/functions?pageSize=500&fields=functions(name,state,environment,labels,serviceConfig(maxInstanceCount,minInstanceCount,maxInstanceRequestConcurrency,availableCpu,availableMemory,timeoutSeconds,revision)),nextPageToken,unreachable')
    require(not data.get('nextPageToken') and not data.get('unreachable') and 0<len(data.get('functions',[]))<=500,'Installed inventory incomplete')
    functions=[]
    for function in data.get('functions',[]):
        name=function.get('name','')
        require(re.fullmatch('projects/'+re.escape(project)+r'/locations/[a-z0-9-]+/functions/[A-Za-z0-9_-]+',name),'Foreign function')
        config=function.get('serviceConfig',{})
        commit=function.get('labels',{}).get('livepalmes-commit','')
        require(not commit or re.fullmatch('[a-f0-9]{40}',commit),'Unknown source label')
        cpu,memory=config.get('availableCpu'),config.get('availableMemory')
        require(cpu is None or re.fullmatch(r'[0-9]+(?:\.[0-9]+)?|gcf_gen1',str(cpu)),'Unknown CPU format')
        require(memory is None or re.fullmatch(r'[0-9]+(?:Mi|Gi|M|G)',str(memory)),'Unknown memory format')
        functions.append({'name':name,'environment':function.get('environment'),'state':function.get('state'),'commit':commit or None,'revision':config.get('revision'),'maxInstances':numeric(config.get('maxInstanceCount')),'minInstances':numeric(config.get('minInstanceCount')),'concurrency':numeric(config.get('maxInstanceRequestConcurrency')),'cpu':cpu,'memory':memory,'timeoutSeconds':numeric(config.get('timeoutSeconds'))})
    functions.sort(key=lambda x:x['name'])
    require(len({x['name'] for x in functions})==len(functions),'Duplicate function')
    return functions

WORKFLOWS={'cloud':'a3-cloud-metadata.yml','sql':'nap-capacity-readonly.yml'}
ROOT=Path(__file__).resolve().parents[1]

def context(env,kind):
    require(kind in WORKFLOWS and env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes'
        and env.get('GITHUB_REF')=='refs/heads/main' and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch'
        and env.get('GITHUB_RUN_ATTEMPT')=='1' and re.fullmatch('[a-f0-9]{40}',env.get('GITHUB_SHA',''))
        and env.get('EXPECTED_COMMIT')==env['GITHUB_SHA'] and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID',''))
        and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/'+WORKFLOWS[kind]+'@refs/heads/main',
        'Exact manual main workflow required')

def verify_ci(directory,kind,env=os.environ):
    context(env,kind)
    spec=importlib.util.spec_from_file_location('metadata_ci',ROOT/'tools/test-verification-evidence.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    require(module.reusable(env['GITHUB_SHA'],Path(directory),'publication-offline-v1'),'Exact successful main CI proof required')
    print('CI main exacte authentifiee avant acces aux identites techniques.')

def credentials_identity(project,env):
    require(project in TARGETS,'Unknown project')
    with Path(env['GOOGLE_APPLICATION_CREDENTIALS']).open(encoding='utf8') as stream:account=json.load(stream)
    reader=env.get('A3_METADATA_READER','backend')
    require(reader in {'backend','hosting'} and (reader!='hosting' or project=='livepalmes'),'Unknown metadata reader scope')
    expected=HOSTING_READER if reader=='hosting' else TARGETS[project]['identity']
    require(account.get('type')=='service_account' and account.get('project_id')==project
        and account.get('client_email')==expected,'Existing metadata reader identity mismatch')
    return expected

class MetadataReader:
    def __init__(self,token):self.token,self.calls,self.cache=token,[],{}
    def __call__(self,url,body=None):
        require(allowed_request(url,body),'Unapproved metadata endpoint or operation')
        if url in self.cache:return self.cache[url]
        require(len(self.calls)<24,'Metadata request budget exceeded')
        self.calls.append(url)
        request=urllib.request.Request(url,method='GET' if body is None else 'POST',data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=30) as response:
            raw=response.read(3_000_001);require(len(raw)<=3_000_000,'Metadata response budget exceeded');value=json.loads(raw)
        self.cache[url]=value
        return value

def allowed_request(url,body=None):
    gets=set();policies=set()
    for project,target in TARGETS.items():
        gets.add(run_endpoint(project))
        gets.add(app_check_endpoint(project))
        gets.add('https://cloudresourcemanager.googleapis.com/v3/projects/'+project)
        policies.add('https://cloudresourcemanager.googleapis.com/v1/projects/'+project+':getIamPolicy')
        gets.add('https://firebaserules.googleapis.com/v1/projects/'+project+'/releases/firebase.storage/'+target['firebase'])
        gets.add('https://cloudfunctions.googleapis.com/v2/projects/'+project+'/locations/-/functions?pageSize=500&fields=functions(name,state,environment,labels,serviceConfig(maxInstanceCount,minInstanceCount,maxInstanceRequestConcurrency,availableCpu,availableMemory,timeoutSeconds,revision)),nextPageToken,unreachable')
        gets.add('https://identitytoolkit.googleapis.com/admin/v2/projects/'+project+'/config?fields=name,subtype,authorizedDomains,mfa(state,enabledProviders,providerConfigs(state,totpProviderConfig(adjacentIntervals)))')
        for kind in ['firebase','public']:
            bucket=target[kind]
            gets.add('https://storage.googleapis.com/storage/v1/b/'+bucket+'?fields=name,projectNumber,iamConfiguration,versioning,retentionPolicy,softDeletePolicy,encryption')
            gets.add('https://storage.googleapis.com/storage/v1/b/'+bucket+'/iam?optionsRequestedPolicyVersion=3')
    role=re.fullmatch(r'https://iam\.googleapis\.com/v1/(?:roles/[A-Za-z0-9_.]+|projects/[a-z0-9-]+/roles/[A-Za-z0-9_.]+|organizations/[0-9]+/roles/[A-Za-z0-9_.]+)',url)
    ruleset=re.fullmatch(r'https://firebaserules\.googleapis\.com/v1/projects/(?:livepalmes|livepalmes-test)/rulesets/[A-Za-z0-9-]+',url)
    return (body is None and (url in gets or bool(role) or bool(ruleset))) or (url in policies and body=={'options':{'requestedPolicyVersion':3}})

def write(file,value):
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

def observe(project,directory,env=os.environ):
    context(env,'cloud');identity=credentials_identity(project,env)
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    token=subprocess.check_output(['gcloud','auth','application-default','print-access-token'],text=True,stderr=subprocess.DEVNULL,timeout=40).strip()
    require(bool(token),'Credential unavailable')
    reader=MetadataReader(token)
    hosting=env.get('A3_METADATA_READER','backend')=='hosting'
    report={'schema':1,'project':project,'reader':'hosting' if hosting else 'backend','candidate':env['GITHUB_SHA'],'run':int(env['GITHUB_RUN_ID']),
        'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'identity':identity,'readOnly':True,
        'configurationWrites':0,'iamWrites':0,'rulesWrites':0,'objectsRead':0,'usersRead':0,'businessInvocations':0,
        'publicationAllowed':False,'securityQualificationComplete':False,'stages':{}}
    def stage(name,operation):
        try:
            value=operation();write(directory/(name+'.json'),value);report['stages'][name]={'status':'observed','file':name+'.json'}
        except (urllib.error.HTTPError,ValueError,KeyError,TypeError,urllib.error.URLError,TimeoutError) as error:
            report['stages'][name]={'status':'incomplete','errorType':type(error).__name__,'httpStatus':getattr(error,'code',None)}
            if name=='app-check' and isinstance(error,urllib.error.HTTPError):
                reason=app_check_error_code(error)
                if reason:report['stages'][name]['reasonCode']=reason
            if type(error) is ValueError and str(error) in AUTH_ERROR_CODES:
                report['stages'][name]['reasonCode']=AUTH_ERROR_CODES[str(error)]
        write(directory/'metadata-report.json',report)
    if not hosting:stage('cloud',lambda:collect(project,reader,lambda partial:write(directory/'cloud-partial.json',partial)))
    stage('auth',lambda:collect_auth(project,reader))
    if hosting:stage('storage-rules',lambda:collect_storage_rules(project,reader))
    elif report['stages']['cloud']['status']!='observed':
        functions_already_attempted=any(url.startswith('https://cloudfunctions.googleapis.com/') for url in reader.calls)
        if functions_already_attempted:report['stages']['functions']={'status':'incomplete','reason':'Initial functions metadata read failed; no duplicate retry.'}
        else:stage('functions',lambda:collect_functions(project,reader))
    if not hosting:stage('cloud-run',lambda:collect_run_services(project,reader))
    if hosting or project=='livepalmes-test':stage('app-check',lambda:collect_app_check_services(project,reader))
    report['requestCount']=len(reader.calls);report['metadataReadsComplete']=all(value['status']=='observed' for value in report['stages'].values())
    report['completedAtUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat();write(directory/'metadata-report.json',report)
    print(json.dumps(report,ensure_ascii=False))
    return report['metadataReadsComplete']

if __name__=='__main__':
    try:
        if len(sys.argv)==4 and sys.argv[1]=='verify-ci':verify_ci(sys.argv[2],sys.argv[3])
        elif len(sys.argv)==4 and sys.argv[1]=='observe':sys.exit(0 if observe(sys.argv[2],sys.argv[3]) else 1)
        else:raise ValueError('Unknown metadata command')
    except Exception as error:
        print(json.dumps({'status':'refused','errorType':type(error).__name__,'credentialPrinted':False}));sys.exit(1)
