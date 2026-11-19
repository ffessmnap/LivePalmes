"""Qualify two existing publication consumers only; no IAM or publication write."""
import datetime,hashlib,importlib.util,json,os,re,stat,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/'.github/releases/evidence/20261119-production-wif-plan.json'
DIGEST='5107ee71cc9c90229f3baaac3ac8b4f96996960fef815ead3b9320f689d2dba0'
WORKFLOW='.github/workflows/a3-production-wif-qualification.yml'
def need(value):
 if not value:raise ValueError('PRODUCTION_WIF_QUALIFICATION_REFUSED')
def sha(raw):return hashlib.sha256(raw).hexdigest()
def contract():
 raw=PLAN.read_bytes().replace(b'\r\n',b'\n');need(sha(raw)==DIGEST);p=json.loads(raw)
 need(p['schema']==1 and p['project']=='livepalmes' and p['poolId']=='livepalmes-github' and p['providerId']=='github-production-delivery'
  and p['newBindings']==['hosting','backend'] and p['attributeMapping']['google.subject']=="'production-delivery:' + assertion.sub"
  and p['principalMember'].endswith('/subject/production-delivery:repo:ffessmnap/LivePalmes:environment:production')
  and p['bindingRole']=='roles/iam.workloadIdentityUser' and p['oldDiagnosticProviderUnchanged'] is p['existingGoogleRolesUnchanged'] is p['keysAndArchivesRetained'] is p['a2Unchanged'] is True)
 need(len(p['allowedWorkflows'])==4 and p['allowedWorkflows'][0]==Path(WORKFLOW).name
  and p['publicationSwitchNotPerformedByThisPreparation'] is True and p['originalSubjectMustNotGainBackendTrust'] is True)
 for name,digest in p['readerPins'].items():need(sha((ROOT/name).read_bytes().replace(b'\r\n',b'\n'))==digest)
 return p
def context(env):
 p=contract();need(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REPOSITORY_ID')==p['repositoryId']
  and env.get('GITHUB_REPOSITORY_OWNER_ID')==p['ownerId'] and env.get('GITHUB_REF')=='refs/heads/main'
  and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1'
  and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/'+WORKFLOW+'@refs/heads/main'
  and env.get('VERIFIED_MAIN_CI')=='true' and re.fullmatch('[0-9a-f]{40}',env.get('GITHUB_SHA',''))
  and env.get('EXPECTED_COMMIT')==env['GITHUB_SHA'] and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID',''))
  and env.get('WIF_READER_KIND') in p['accounts'])
 return {'candidate':env['GITHUB_SHA'],'run':int(env['GITHUB_RUN_ID']),'kind':env['WIF_READER_KIND'],'workflow':WORKFLOW,
  'contractSha256':DIGEST,'provider':'projects/718081132564/locations/global/workloadIdentityPools/livepalmes-github/providers/github-production-delivery',
  'account':p['accounts'][env['WIF_READER_KIND']]}
def prepare(env,directory):
 ctx=context(env);p=contract()
 # Reuse the exact original ADC endpoint/header validator in a private module
 # instance. Only the closed provider/account/context differ for this new probe.
 spec=importlib.util.spec_from_file_location('publication_wif_adc_reader',ROOT/'tools/a3-wif-hosting-readonly.py')
 reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
 reader.context=lambda source,qualification='hosting-consumers':context(source)
 reader.PROVIDER=ctx['provider'];reader.ACCOUNT=ctx['account']
 original=reader.credential(env);raw=original.read_bytes();record=json.loads(raw)
 record.update(project_id='livepalmes',client_email=ctx['account'],service_account_impersonation={'token_lifetime_seconds':600})
 target=Path(directory)/'qualified-adc.json'
 with target.open('x',encoding='utf-8') as file:json.dump(record,file)
 target.chmod(0o600)
 return ctx,original,raw,target,record
def technical_url(kind):
 need(kind in {'hosting','backend'})
 return 'https://firebasehosting.googleapis.com/v1beta1/projects/livepalmes/sites/livepalmes' if kind=='hosting' else \
  'https://cloudfunctions.googleapis.com/v2/projects/livepalmes/locations/-/functions?pageSize=500&fields=functions(name,state),nextPageToken,unreachable'
def technical(value,kind):
 need(kind in {'hosting','backend'})
 if kind=='hosting':
  need(value.get('name') in {'projects/livepalmes/sites/livepalmes','projects/718081132564/sites/livepalmes'} and value.get('defaultUrl')=='https://livepalmes.web.app')
  result={'site':'livepalmes','defaultUrl':value['defaultUrl']}
 else:
  need(isinstance(value,dict) and not value.get('nextPageToken') and not value.get('unreachable'))
  rows=value.get('functions',[]);need(isinstance(rows,list) and len(rows)==119)
  need(all(set(f)=={'name','state'} and f['name'].startswith('projects/livepalmes/locations/europe-west1/functions/') and f['state']=='ACTIVE' for f in rows))
  need(len({f['name'] for f in rows})==119);result={'functionsActive':119,'identitiesSha256':sha(json.dumps(sorted(rows,key=lambda f:f['name']),sort_keys=True).encode())}
 return result
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):raise ValueError('REDIRECT_REFUSED')
def gcloud_read(env,kind):
 process=subprocess.run(['gcloud','auth','application-default','print-access-token'],env=env,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=60)
 need(process.returncode==0 and 0<len(process.stdout)<=16384);token=process.stdout.decode().strip();need(token and not re.search(r'\s',token))
 request=urllib.request.Request(technical_url(kind),headers={'Authorization':'Bearer '+token})
 with urllib.request.build_opener(NoRedirect).open(request,timeout=30) as response:
  raw=response.read(1_000_001);need(len(raw)<=1_000_000);value=json.loads(raw)
 return technical(value,kind)
def child(command,env,directory):
 process=subprocess.Popen(command,cwd=directory,env=env,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 deadline=time.monotonic()+850
 try:
  while True:
   need(time.monotonic()<deadline)
   try:need(process.wait(timeout=min(30,deadline-time.monotonic()))==0);return
   except subprocess.TimeoutExpired:print('Qualification des consommateurs : attente bornee sans jeton affiche.',flush=True)
 finally:
  if process.poll() is None:process.kill();process.wait(timeout=10)
def main(output,env=os.environ):
 ctx=context(env);p=contract();need(not Path(output).exists())
 with tempfile.TemporaryDirectory(prefix='lp-publication-wif-',dir=env['RUNNER_TEMP']) as tmp:
  directory=Path(tmp)
  clean={k:env[k] for k in ['PATH','LANG','LC_ALL','TMPDIR','SystemRoot'] if k in env}
  profile=subprocess.run(['node',str(ROOT/'tools/a3-production-wif-consumers.js'),'--profile'],env=clean,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=40,check=True)
  need(json.loads(profile.stdout)=={key:p[key] for key in ['nodeVersion','firebaseCliVersion','cliGoogleAuthVersion','adminVersion','adminGoogleAuthVersion']})
  ctx,original,raw,adc,record=prepare(env,directory)
  clean.update(GOOGLE_APPLICATION_CREDENTIALS=str(adc),CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE=str(adc),CLOUDSDK_CONFIG=str(directory/'gcloud'),
   GOOGLE_CLOUD_PROJECT='livepalmes',GCLOUD_PROJECT='livepalmes',XDG_CONFIG_HOME=str(directory),CI='true',NO_UPDATE_NOTIFIER='1',
   WIF_READER_KIND=ctx['kind'],WIF_ACCOUNT=ctx['account'],WIF_PROVIDER=ctx['provider'],WIF_CONSUMER_GUARD='validated-exact-original-adc',
   WIF_CONSUMER_OUTPUT=str(directory/'consumer-report.json'))
  (directory/'configstore').mkdir();(directory/'configstore/firebase-tools.json').write_text('{"usage":false}',encoding='utf-8')
  version=subprocess.run(['gcloud','version','--format=json'],env=clean,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=40,check=True)
  need(json.loads(version.stdout)['Google Cloud SDK']==p['gcloudVersion'])
  before=gcloud_read(clean,ctx['kind']);child(['node',str(ROOT/'tools/a3-production-wif-consumers.js')],clean,directory);after=gcloud_read(clean,ctx['kind'])
  need(before==after and original.read_bytes()==raw and json.loads(adc.read_bytes())==record)
  report_file=directory/'consumer-report.json';need(report_file.stat().st_size<=16384 and not report_file.is_symlink())
  consumer=json.loads(report_file.read_text(encoding='utf-8'));need(consumer['kind']==ctx['kind'] and consumer['renewedAfterRealExpiry'] is True
   and consumer['sdkCredentialsRenewed']==2 and consumer['cliReads']==2 and consumer['publicationInvocations']==0
   and consumer['tokensExported'] is False and 610000<=consumer['waitedMilliseconds']<=750000)
 result={'schema':1,**ctx,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'gcloudReads':2,'technicalMetadata':before,
  'originalAdcUnchanged':True,'externalAccountTypePreserved':True,'publicProjectAndAccountFieldsAdded':True,'credentialCopyEphemeral':True,
  'sourceHashes':{name:sha((ROOT/name).read_bytes().replace(b'\r\n',b'\n')) for name in ['tools/a3-production-wif-qualification.py','tools/a3-production-wif-consumers.js',WORKFLOW]},
  'accountsRead':0,'businessInvocations':0,'configurationWrites':0,'iamWrites':0,'keysRead':0,'keysCreated':0,'publicationIdentityChanged':False,**consumer}
 Path(output).write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print('Consommateurs ephemeres qualifies en lecture seule ; aucune publication.')
if __name__=='__main__':
 try:need(len(sys.argv)==2);main(sys.argv[1])
 except Exception:print('Qualification WIF refusee ; aucun credential, jeton ou reponse privee affiche.');sys.exit(1)
