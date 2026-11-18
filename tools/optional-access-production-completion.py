"""One closed Hosting completion after110attested sources; no source/Rules writer."""
import hashlib,importlib.util,json,os,re,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'.github/releases/evidence/20261118-production-optional-access-completion-contract.json'
DIGEST='6c7908c6489365523a8775741cc3cb022142a43a372b4287d9e473b0958c0b07'
KIND='a3-optional-access-hosting-completion-v1'
CANDIDATE='1e27374ef9728413d9eea990f9c48975c7871ccd'
INITIAL_RUN=44405688714
WORKFLOWS={name:'.github/workflows/livepalmes-production-'+name+'.yml' for name in ['preflight','readiness','release']}
def load(name):
 s=importlib.util.spec_from_file_location('optional_completion_'+name.replace('-','_'),ROOT/'tools'/name)
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
common=load('standard-source-policy.py');require,digest=common.require,common.digest
def policy():return load('optional-access-production-policy.py')
def read(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def write(path,value):Path(path).write_text(json.dumps(value,sort_keys=True,indent=2)+'\n',encoding='utf-8')
def sha(data):return hashlib.sha256(data).hexdigest()
def contract():
 raw=PATH.read_bytes().replace(b'\r\n',b'\n');require(sha(raw)==DIGEST,'Contrat de cloture facultative altere')
 c=json.loads(raw);p=policy();p.contract()
 require(c['schema']==1 and c['kind']==KIND and c['candidate']==CANDIDATE and c['completionOfRun']==INITIAL_RUN
  and c['originalController']=='342f91f1062ea33bc023361916174797a0000bb5'
  and c['initialPreflightRun']==44404692650 and c['initialReadinessRun']==44405313787
  and c['originalContractSha256']==p.DIGEST and c['sourceWrites']==0 and c['genericResume'] is False
  and c['selectedCount']==110 and c['retainedCount']==9 and c['inventoryCount']==119
  and c['mandatoryMfa'] is c['rulesDeployment'] is c['configurationChanges'] is c['bindingChanges'] is False,
  'Cloture facultative hors perimetre')
 for name,expected in c['pins'].items():require(sha((ROOT/name).read_bytes().replace(b'\r\n',b'\n'))==expected,'Lecteur de cloture modifie : '+name)
 return c
def context(mode):
 env=os.environ
 require(mode in WORKFLOWS and env.get('OPTIONAL_ACCESS_COMPLETION')=='true'
  and env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
  and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1'
  and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/'+WORKFLOWS[mode]+'@refs/heads/main'
  and re.fullmatch('[a-f0-9]{40}',env.get('GITHUB_SHA','')) and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')),
  'Workflow officiel main/premiere tentative du complement requis')
 return {'candidate':CANDIDATE,'contractSha256':DIGEST,'controllerCommit':env['GITHUB_SHA'],
  'run':int(env['GITHUB_RUN_ID']),'workflow':WORKFLOWS[mode],'completionOfRun':INITIAL_RUN,'sourceWrites':0}
def authenticate(run,name,destination,expected,workflow,conclusion='success',head=None):
 # Existing bounded completion transport checks failed producer separately before
 # using the unchanged flat artifact reader. No generic validation is relaxed.
 return load('portal-session-enforcement-completion.py').authenticate(run,name,destination,expected,workflow,conclusion,head)
def validate_sources(manifest,state,receipts,selection):
 c=contract();p=policy();p.validate_manifest(manifest)
 require(digest(manifest)==c['originalManifestSha256'] and digest(state)==c['failedStateSha256']
  and digest(receipts)==c['sourceReceiptsSha256'],'Preuves sources facultatives differentes')
 require(isinstance(selection,list) and len(selection)==len(set(selection))==110 and sorted(selection)==manifest['selected']
  and selection!=manifest['selected'],'Seul ecart d ordre attendu, aucun retrait ou ajout')
 expected={p.PREFIX+n for n in manifest['selected']};functions={f['name']:f for f in state['functions']}
 before={f['name']:f for f in manifest['origins']}
 require(state['candidate']==receipts['candidate']==CANDIDATE and state['errors']==[]
  and state['optionalAccessContractSha256']==p.DIGEST and len(state['functions'])==len(functions)==119
  and set(functions)==set(before) and set(receipts['functions'])==expected and receipts['manifestSha256']==digest(manifest)
  and all(f['state']=='ACTIVE' and f['updateTime'] and f['revision'] for f in functions.values()),'Sources/etat facultatifs incomplets')
 for name,f in functions.items():
  if name in expected:
   r=receipts['functions'][name];source=r['storageSource']
   require(r['identity']==f and r['allPathsAndFileBytesIdentical'] is r['generationReadAndReferencesRechecked'] is True
    and re.fullmatch('[a-f0-9]{64}',r['archiveSha256']) and source['bucket']=='gcf-v2-sources-718081132564-europe-west1'
    and source['object']==name.removeprefix(p.PREFIX)+'/function-source.zip'
    and re.fullmatch('[1-9][0-9]*',str(source['generation']))
    and f['revision']!=before[name]['revision'] and f['updateTime']!=before[name]['updateTime'],'Archive source facultative non attestee')
  else:require(f=={k:before[name][k] for k in ['name','state','revision','updateTime']},'Fonction conservee modifiee')
def marker(plan):
 plan=Path(plan);c=contract();m=read(plan/'optional-completion.json')
 require(m['schema']==1 and m['kind']==KIND and m['contractSha256']==DIGEST and m['candidate']==CANDIDATE
  and m['completionOfRun']==INITIAL_RUN and m['controllerCommit']==os.environ['GITHUB_SHA']
  and m['originalBackupSha256']==c['originalBackupSha256'] and m['sourceWrites']==0
  and isinstance(m['preflightRun'],int) and m['preflightRun']>0,'Plan de cloture facultative incompatible')
 for name,expected in c['criticalFiles'].items():require(sha((plan/name).read_bytes())==expected,'Preuve de cloture alteree : '+name)
 validate_sources(read(plan/'standard-source-manifest.json'),read(plan/'optional-completion-initial-after.json'),
  read(plan/'standard-source-receipts.json'),read(plan/'selection.json'))
 policy().manifest(plan);return m
def preflight(plan,request_path):
 context('preflight');c=contract();plan=Path(plan);plan.mkdir(parents=True,exist_ok=False)
 require(read(request_path)=={'schema':1,'candidate':CANDIDATE,'completionOfRun':INITIAL_RUN,
  'initialPreflightRun':c['initialPreflightRun'],'contractSha256':DIGEST},'Demande de cloture hors version')
 source=plan.parent/'optional-completion-original';source.mkdir(exist_ok=False)
 for name in ['release-plan','production-after','production-idf-preservation']:
  authenticate(INITIAL_RUN,name,source/name,c['originalArtifacts'][name],WORKFLOWS['release'],'failure',c['originalController'])
 authenticate(c['initialPreflightRun'],'release-plan',source/'preflight',c['initialPreflightArtifact'],WORKFLOWS['preflight'],head=c['originalController'])
 for f in (source/'preflight').iterdir():require(f.read_bytes()==(source/'release-plan'/f.name).read_bytes(),'Plan initial modifie apres preflight')
 cycle=load('release-cycle.py');items=cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}/artifacts?per_page=100')
 actual={a['name']:{k:a[k] for k in ['id','digest']} for a in items['artifacts'] if not a['expired']}
 require(items['total_count']==len(items['artifacts'])==5 and actual=={n:{k:a[k] for k in ['id','digest']} for n,a in c['originalArtifacts'].items()},'Inventaire initial de preuves different')
 jobs=cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}/jobs?per_page=100')['jobs']
 require(sorted([{k:j[k] for k in ['id','name','conclusion']} for j in jobs],key=lambda j:j['id'])==c['initialJobs'],'Jobs du producteur initial differents')
 job=next(j for j in jobs if j['id']==c['jobId'])
 require([s['name'] for s in job['steps'] if s['conclusion']=='failure']==c['failedSteps'],'Autre echec initial que le controle d ordre')
 boundary=[{k:s[k] for k in ['name','conclusion','started_at','completed_at']} for s in job['steps'] if s['name'] in c['boundaryNames']]
 require(digest(boundary)==c['jobBoundarySha256'],'Une bascule Hosting ou un autre etat initial est present')
 raw_logs=subprocess.check_output(['gh','api',f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}/logs'])
 logs=load('access-revocation-production-recovery.py').log_from_archive(raw_logs,c['jobLogSha256'])
 require(b'ValueError: Selection standard apres sources differente' in logs and b'publish-approved-pdf-functions.py' in logs,
  'Cause initiale de cloture differente')
 for f in (source/'release-plan').iterdir():shutil.copyfile(f,plan/f.name)
 shutil.copyfile(source/'production-after/production-after.json',plan/'optional-completion-initial-after.json')
 shutil.copyfile(source/'production-idf-preservation/standard-source-receipts.json',plan/'standard-source-receipts.json')
 shutil.copyfile(source/'production-idf-preservation/standard-optional-access-controls-before.json',plan/'initial-optional-controls-before.json')
 shutil.copyfile(plan/'standard-optional-access-auth-before.json',plan/'initial-optional-auth-before.json')
 write(plan/'optional-completion.json',{'schema':1,'kind':KIND,'contractSha256':DIGEST,'candidate':CANDIDATE,
  'completionOfRun':INITIAL_RUN,'controllerCommit':os.environ['GITHUB_SHA'],'preflightRun':int(os.environ['GITHUB_RUN_ID']),
  'originalBackupSha256':c['originalBackupSha256'],'sourceWrites':0})
 marker(plan);policy().test_evidence(plan,cycle)
def fetch_plan(plan,run,mode):
 context(mode);require(str(run).isdigit() and int(run)>0,'Preflight courant du complement requis')
 authenticate(run,'release-plan',plan,None,WORKFLOWS['preflight'],head=os.environ['GITHUB_SHA'])
 require(marker(plan)['preflightRun']==int(run),'Plan hors preflight de cloture')
def backup_download(plan,target):
 marker(plan);c=contract()
 authenticate(INITIAL_RUN,'production-code-backup',target,c['originalArtifacts']['production-code-backup'],WORKFLOWS['release'],'failure',c['originalController'])
 target=Path(target)
 require(sha((target/'prod-backup.enc').read_bytes())==c['originalBackupSha256']
  and sha((target/'code-backup-context.json').read_bytes())==c['originalBackupContextSha256'],'Sauvegarde V2 initiale differente')
def backup_validate(plan,backup):
 marker(plan);p=policy();value=p.manifest(plan);backup=Path(backup);report=read(backup/'report.json')
 require(os.environ.get('COMPLETION_BACKUP_OPENED')=='true' and report['candidate']==CANDIDATE and report['errors']==[]
  and report['newFunctions']==[] and report['sourcePolicyKind']==p.KIND and report['standardSourceManifestSha256']==digest(value)
  and read(backup/'standard-source-manifest.json')==value,'Sauvegarde V2 non ouverte ou incompatible')
 before=read(backup/'functions.json');p.initial(before,value)
 return {f['name']:f for f in before}
def current_sources(plan,functions,backup=None):
 marker(plan);plan=Path(plan);p=policy();state=load('production-release-state.py')
 actual={f['name']:f for f in functions};expected={f['name']:f for f in read(plan/'optional-completion-initial-after.json')['functions']}
 require(len(functions)==len(actual)==len(expected)==119 and set(actual)==set(expected)
  and all(state.identity(f)==expected[n] for n,f in actual.items()),'Derive depuis les119revisions attestees')
 receipts=read(plan/'standard-source-receipts.json')['functions']
 for name,r in receipts.items():
  f=actual[name];p.runtime(f)
  require(f.get('labels',{}).get('livepalmes-commit')==CANDIDATE
   and f.get('buildConfig',{}).get('source',{}).get('storageSource')==r['storageSource']
   and f.get('buildConfig',{}).get('sourceProvenance',{}).get('resolvedStorageSource')==r['storageSource'],
   'Source ou generation derivee depuis attestation')
 if backup is not None:
  before=backup_validate(plan,backup);p.assert_retained(before,actual,set(receipts),state)
  for name in sorted(receipts):p.assert_selected(before[name],actual[name],CANDIDATE)
 return [state.identity(f) for f in sorted(functions,key=lambda f:f['name'])]
def backend(plan,mode,backup=None,after=False):
 ctx=context(mode);plan=Path(plan);m=marker(plan);p=policy();c=p.contract()
 functions=load('production-release-state.py').inventory();identities=current_sources(plan,functions,backup)
 runtime=p.capabilities('backend',references=functions);controls=common.controls()
 require(controls==c['controls'],'Derive mails/automates/modeles pendant cloture')
 proof={**ctx,'preflightRun':m['preflightRun'],'readOnly':True,'ready':True,'functionsActive':119,
  'sourcesPreviouslyAttested':110,'managedReferencesRechecked':True,'newBaseline':False,'configurationChanges':False,
  'bindingChanges':False,'originalBackupOpenedInOfficialRunner':backup is not None,
  'configurationVerifiedAgainstOpenedBackup':backup is not None,'configurationBeforeHostingRequiresOpenedOriginalBackup':True,
  'functionsSha256':digest(identities),'controls':controls,'runtime':runtime,'runtimeSha256':p.capability_digest(runtime),
  'originalBackupSha256':contract()['originalBackupSha256']}
 if mode=='readiness':write(plan/'optional-completion-ready-backend.json',proof)
 else:
  require(backup is not None,'Sauvegarde originale obligatoire avant Hosting')
  prefix='optional-completion-backend-';suffix='after' if after else 'before'
  if after:
   initial=read(plan/(prefix+'before.json'))
   require(initial['run']==ctx['run'] and initial['functionsSha256']==proof['functionsSha256']
    and initial['controls']==proof['controls'] and initial['runtimeSha256']==proof['runtimeSha256'],'Temoins de cloture modifies')
  write(plan/(prefix+suffix+'.json'),proof)
  write(plan/'production-after.json',{'candidate':CANDIDATE,'functions':identities,'errors':[],
   'optionalAccessContractSha256':p.DIGEST,'completionContractSha256':DIGEST,'sourceWrites':0})
 return proof
def hosting_before(plan):
 c=contract();live=load('release-cycle.py').api('livepalmes','hosting')['releases'][0]
 require({'name':live['name'],'version':live['version']['name'],'message':live.get('message','')}==c['initialHosting'],
  'Hosting a change depuis le producteur initial, aucune bascule autorisee')
 return live
def administration(plan,mode,after=False):
 ctx=context(mode);plan=Path(plan);m=marker(plan);p=policy()
 capability=p.capabilities('hosting');rules=p.rules_snapshot(plan)
 if not after:hosting_before(plan)
 proof={**ctx,'preflightRun':m['preflightRun'],'readOnly':True,'ready':True,'capability':capability,
  'capabilitySha256':p.capability_digest(capability),'rules':rules,'originalBackupSha256':contract()['originalBackupSha256']}
 name='ready-hosting' if mode=='readiness' else 'auth-after' if after else 'auth-before'
 write(plan/('optional-completion-'+name+'.json'),proof);return proof
def require_readiness(plan,run):
 context('release');plan=Path(plan);m=marker(plan);c=contract();p=policy()
 require(str(run).isdigit() and int(run)>0,'Prerequis officiels de cloture requis')
 for kind in ['backend','hosting']:
  target=plan.parent/('optional-completion-readiness-'+kind)
  authenticate(run,'production-optional-completion-'+kind,target,None,WORKFLOWS['readiness'],head=os.environ['GITHUB_SHA'])
  proof=read(target/('optional-completion-ready-'+kind+'.json'))
  require(proof['contractSha256']==DIGEST and proof['candidate']==CANDIDATE and proof['run']==int(run)
   and proof['controllerCommit']==os.environ['GITHUB_SHA'] and proof['preflightRun']==m['preflightRun']
   and proof['workflow']==WORKFLOWS['readiness'] and proof['completionOfRun']==INITIAL_RUN
   and proof['ready'] is proof['readOnly'] is True and proof['sourceWrites']==0
   and proof['originalBackupSha256']==c['originalBackupSha256'],'Prerequis de cloture incompatibles')
  if kind=='backend':
   require(proof['functionsActive']==119 and proof['sourcesPreviouslyAttested']==110 and proof['managedReferencesRechecked'] is True
    and proof['controls']==p.contract()['controls'] and proof['runtimeSha256']==p.contract()['backendCapabilitySha256']
    and proof['originalBackupOpenedInOfficialRunner'] is False,'Preuve metadonnees/runtime de cloture absente')
  else:require(proof['capabilitySha256']==p.contract()['hostingCapabilitySha256']
   and proof['rules']['observed']==p.contract()['productionRulesObserved'],'Preuve administrative/Rules de cloture absente')
def publish_guard(plan):
 ctx=context('release');plan=Path(plan);marker(plan);p=policy();hosting_before(plan)
 for name in ['backend-before','auth-before']:
  proof=read(plan/('optional-completion-'+name+'.json'))
  require(proof['run']==ctx['run'] and proof['controllerCommit']==ctx['controllerCommit'] and proof['contractSha256']==DIGEST
   and proof['ready'] is True and proof['sourceWrites']==0,'Gardes courantes de cloture absentes')
  if name=='backend-before':require(proof['configurationVerifiedAgainstOpenedBackup'] is True,'Configurations non verifiees avant Hosting')
  else:require(proof['capabilitySha256']==p.contract()['hostingCapabilitySha256'] and proof['rules']['observed']==p.contract()['productionRulesObserved'],
   'Continuite/regles courantes incompatibles')
def hosting_checks(plan,candidate,receipt):
 context('release');marker(plan);candidate=Path(candidate)
 require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=candidate,text=True).strip()==CANDIDATE,'Candidat Hosting different')
 publisher=load('standard-source-publish.py');publisher.hosting(candidate,plan,receipt)
 config=json.loads(subprocess.check_output(['git','show',CANDIDATE+':firebase.json'],cwd=ROOT,text=True))
 targets=config['hosting'] if isinstance(config['hosting'],list) else [config['hosting']]
 entries=[entry for target in targets for entry in target['headers'] if entry['source']=='/portail.html']
 require(len(entries)==1,'Configuration portail ambigue')
 expected={row['key'].lower():row['value'] for row in entries[0]['headers'] if row['key'].lower() in {'content-security-policy','cache-control'}}
 fetch=load('check-production-hosting.py').fetch
 status,body,headers=fetch('https://livepalmes.web.app/portail.html?release='+os.environ['GITHUB_RUN_ID'])
 observed={k:headers.get(k) for k in expected}
 require(status==200 and observed==expected,'CSP/cache portail differents apres cloture')
 write(Path(plan)/'optional-completion-portal-headers.json',{'status':status,'exactExpectedHeaders':True,'headersSha256':digest(observed)})
if __name__=='__main__':
 command,*args=sys.argv[1:]
 if command=='preflight':preflight(*args)
 elif command=='fetch-plan':fetch_plan(*args)
 elif command=='backup-download':backup_download(*args)
 elif command=='ready-backend':backend(args[0],'readiness')
 elif command=='ready-hosting':administration(args[0],'readiness')
 elif command=='require-readiness':require_readiness(*args)
 elif command=='backend-before':backend(args[0],'release',args[1])
 elif command=='backend-after':backend(args[0],'release',args[1],after=True)
 elif command=='auth-before':administration(args[0],'release')
 elif command=='auth-after':administration(args[0],'release',after=True)
 elif command=='publish-guard':publish_guard(*args)
 elif command=='hosting-checks':hosting_checks(*args)
 else:raise ValueError('Mode de cloture facultative inconnu')
