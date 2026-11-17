"""Closed PROD B snapshot denial, coordinated backup and explicit rollback only."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
BASE='https://firebaserules.googleapis.com/v1/'
RELEASE='projects/livepalmes/releases/cloud.firestore'
RULESET=re.compile(r'projects/(?:livepalmes|718081132564)/rulesets/[A-Za-z0-9_-]+\Z')
PERMISSIONS=['firebaserules.releases.get','firebaserules.releases.update','firebaserules.rulesets.get','firebaserules.rulesets.create']
HOSTING_IDENTITY='1822d195d739ff1f40ba87acc45028f9e7c4234e57c13eafb253604a7e94cf48'


def policy():
    spec=importlib.util.spec_from_file_location('closed_session_b_parent',ROOT/'tools/portal-session-enforcement-production-policy.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


def require(value,message):
    if not value:raise ValueError(message)


def digest(text):return hashlib.sha256(text.replace('\r\n','\n').encode()).hexdigest()


def sources(c=None):
    c=c or policy().contract();r=c['rules']
    return tuple((ROOT/r[key]).read_text(encoding='utf-8').replace('\r\n','\n') for key in ['beforeFile','afterFile'])


def identity_token(workflow):
    require(os.environ.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and os.environ.get('GITHUB_REF')=='refs/heads/main'
        and os.environ.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and os.environ.get('GITHUB_RUN_ATTEMPT')=='1'
        and os.environ.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/'+workflow+'@refs/heads/main'
        and re.fullmatch('[a-f0-9]{40}',os.environ.get('GITHUB_SHA',''))
        and re.fullmatch('[1-9][0-9]*',os.environ.get('GITHUB_RUN_ID','')),'Workflow officiel main/tentative1 Rules B requis')
    identity=policy().common.load('access-revocation-production-policy.py').reader_identity('hosting')
    require(identity==HOSTING_IDENTITY,'Lecteur Rules B different de l identite existante')
    token=subprocess.check_output(['gcloud','auth','application-default','print-access-token'],text=True,stderr=subprocess.DEVNULL).strip()
    require(token and '\n' not in token,'Jeton officiel Rules B absent');return token,identity


def context(plan,mode):
    p=policy();value=p.manifest(plan);c=p.contract()
    workflow='livepalmes-production-readiness.yml' if mode=='readiness' else 'livepalmes-production-release.yml'
    require(mode in {'readiness','backup','publish','final'},'Mode Rules B inconnu')
    token,identity=identity_token(workflow);return p,value,c,token,identity


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise ValueError('Redirection Rules B interdite')


def api(path,token,method='GET',body=None,*,write=False,target=None):
    allowed=method=='GET' and body is None and (path==RELEASE or RULESET.fullmatch(path))
    if write:
        if method=='POST' and path=='projects/livepalmes/rulesets':
            allowed=body=={'source':{'files':[{'name':'firestore.rules','content':sources()[1]}]}}
        elif method=='PATCH' and path==RELEASE:
            allowed=(RULESET.fullmatch(str(target or '')) and body=={'release':{'name':RELEASE,'rulesetName':target}})
    require(allowed,'Appel Rules B hors cible/source/masque')
    request=urllib.request.Request(BASE+path,method=method,data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request,timeout=30) as response:return json.load(response)
    except urllib.error.HTTPError as error:raise ValueError('API Rules B refusee : HTTP '+str(error.code)) from None


def file_matches(files,text):
    return isinstance(files,list) and len(files)==1 and files[0].get('name')=='firestore.rules' and files[0].get('content')==text


def snapshot(token):
    release=api(RELEASE,token);name=release.get('rulesetName','')
    require(RULESET.fullmatch(name) and release.get('name') in {RELEASE,'projects/718081132564/releases/cloud.firestore'},'Release Rules B hors PROD')
    files=api(name,token).get('source',{}).get('files',[])
    require(len(files)==1 and files[0].get('name')=='firestore.rules' and isinstance(files[0].get('content'),str),'Source Rules B inconnue')
    text=files[0]['content'].replace('\r\n','\n')
    return {'releaseName':release['name'],'rulesetName':name,'sha256':digest(text),'updateTime':release.get('updateTime')},text


def readiness(plan):
    p,value,c,token,identity=context(plan,'readiness');before,text=snapshot(token)
    proof={'schema':1,'candidate':c['candidate'],'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),
        'identitySha256':identity,'before':before,'expectedAfterSha256':c['rules']['afterSha256'],
        'readOnly':True,'indexesDeployed':False,'businessInvocations':0,'onlySnapshotGetChanged':True}
    Path(plan,'standard-session-enforcement-rules-observed.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')
    require(before==c['rules']['observedBefore'] and text==sources(c)[0],'Derive Rules B : aucune reference reinitialisee')
    return proof


def backup(plan,backup_directory):
    plan,backup_directory=Path(plan),Path(backup_directory);p,value,c,token,identity=context(plan,'backup')
    report=json.loads((backup_directory/'report.json').read_text())
    require(report['candidate']==c['candidate'] and report['newFunctions']==[] and report.get('errors')==[]
        and report.get('sourcePolicyKind')==p.KIND and report.get('standardSourceManifestSha256')==p.digest(value),
        'Sauvegarde code B hors manifeste')
    ready=json.loads((plan/'standard-session-enforcement-ready-hosting/prerequisites-hosting.json').read_text())
    require(ready['ready'] and ready['missingPermissions']==[] and ready['planRun']==int(os.environ['PREPARATION_RUN'])
        and ready['portalSessionEnforcementRules']['contractSha256']==p.DIGEST,'Prerequis Rules B absents')
    current,text=snapshot(token);require(current==ready['portalSessionEnforcementRules']['before']==c['rules']['observedBefore']
        and text==sources(c)[0],'Derive Rules avant sauvegarde B')
    target=backup_directory/'session-enforcement-rules';require(not target.exists(),'Sauvegarde Rules B initiale deja presente');target.mkdir()
    (target/'before.rules').write_text(text,encoding='utf-8',newline='\n')
    witness={'schema':1,'candidate':c['candidate'],'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),
        'identitySha256':identity,'before':current,'afterSha256':c['rules']['afterSha256'],'readinessRun':int(os.environ['READINESS_RUN'])}
    (target/'before.json').write_text(json.dumps(witness,indent=2),encoding='utf-8')
    (plan/'standard-session-enforcement-rules-before.json').write_text(json.dumps(witness,indent=2),encoding='utf-8')


def publish(plan,backup_directory,receipt):
    plan,backup_directory,receipt=Path(plan),Path(backup_directory),Path(receipt);p,value,c,token,identity=context(plan,'publish')
    require(os.environ.get('RULES_BACKUP_VERIFIED')=='true' and Path(os.environ['ENCRYPTED_BACKUP_FILE']).is_file(),
        'Sauvegarde chiffree rouverte/comparee requise avant Rules B')
    witness=json.loads((backup_directory/'session-enforcement-rules/before.json').read_text());original=(backup_directory/'session-enforcement-rules/before.rules').read_text(encoding='utf-8')
    require(witness==json.loads((plan/'standard-session-enforcement-rules-before.json').read_text())
        and witness['contractSha256']==p.DIGEST and witness['manifestSha256']==p.digest(value)
        and witness['identitySha256']==identity and original==sources(c)[0],'Sauvegarde initiale Rules B incompatible')
    # All selected sources must be authenticated before closing direct snapshot access.
    state=json.loads(Path(os.environ['PRODUCTION_AFTER_FILE']).read_text())
    require(state['candidate']==c['candidate'] and state['errors']==[] and len(state['functions'])==119
        and {f['name'] for f in state['functions']}=={f['name'] for f in value['origins']}
        and all(f['state']=='ACTIVE' for f in state['functions']),'Sources B non conclues avant Rules')
    source_receipts=json.loads((plan/'standard-source-receipts.json').read_text())
    require(source_receipts['candidate']==c['candidate'] and source_receipts['manifestSha256']==p.digest(value)
        and set(source_receipts['functions'])=={p.PREFIX+n for n in c['selected']}
        and all(r.get('allPathsAndFileBytesIdentical') and r.get('generationReadAndReferencesRechecked')
                and r.get('identity')==next(f for f in state['functions'] if f['name']==name)
                for name,r in source_receipts['functions'].items()),'102 archives B non attestees')
    current,_=snapshot(token);require(current==witness['before'],'Derive Rules avant creation B')
    result={'schema':1,'candidate':c['candidate'],'contractSha256':p.DIGEST,'before':current,
        'expectedAfterSha256':c['rules']['afterSha256'],'indexesDeployed':False,'businessInvocations':0,'result':'failure'}
    try:
        after=sources(c)[1];created=api('projects/livepalmes/rulesets',token,'POST',{'source':{'files':[{'name':'firestore.rules','content':after}]}},write=True)
        name=created.get('name','');require(RULESET.fullmatch(name) and name!=current['rulesetName'],'Ruleset B cree inconnu')
        result['createdRuleset']=name
        require(file_matches(api(name,token).get('source',{}).get('files'),after),'Ruleset B compile different')
        fresh,_=snapshot(token);require(fresh==current,'Derive Rules avant PATCH B')
        api(RELEASE,token,'PATCH',{'release':{'name':RELEASE,'rulesetName':name}},write=True,target=name)
        fresh,text=snapshot(token);require(fresh['rulesetName']==name and fresh['sha256']==c['rules']['afterSha256'] and text==after,'Rules B non attestees')
        result.update(after=fresh,result='success',onlySnapshotGetChanged=True,allOtherRulesUnchanged=True)
        (plan/'standard-session-enforcement-rules-published.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    finally:receipt.write_text(json.dumps(result,indent=2),encoding='utf-8')


def final(plan,receipt):
    p,value,c,token,identity=context(plan,'final');published=json.loads(Path(plan,'standard-session-enforcement-rules-published.json').read_text());current,text=snapshot(token)
    require(published['result']=='success' and published['candidate']==c['candidate'] and current==published['after'] and text==sources(c)[1],'Derive Rules B apres Hosting')
    Path(receipt).write_text(json.dumps({'schema':1,'candidate':c['candidate'],'contractSha256':p.DIGEST,'after':current,
        'readOnly':True,'result':'success','indexesDeployed':False,'businessInvocations':0},indent=2),encoding='utf-8')


def rollback_context(backup_directory):
    p=policy();c=p.contract();backup_directory=Path(backup_directory)
    value=p.validate_manifest(json.loads((backup_directory/'standard-source-manifest.json').read_text()))
    require(os.environ.get('CONFIRM_CODE_ROLLBACK')=='livepalmes' and os.environ.get('B_RESTORE_HOSTING')=='true'
        and re.fullmatch('[1-9][0-9]*',os.environ.get('RELEASE_RUN','')),'Retour B coordonne explicite requis')
    token,identity=identity_token('livepalmes-production-rollback.yml');p.capabilities('hosting',rollback=True);return p,value,c,token,identity


def rollback_validate(backup_directory,hosting_directory):
    backup_directory,hosting_directory=Path(backup_directory),Path(hosting_directory)
    p,value,c,token,identity=rollback_context(backup_directory)
    published=json.loads((hosting_directory/'production-session-enforcement-rules-after.json').read_text())
    before=json.loads((backup_directory/'session-enforcement-rules/before.json').read_text())
    original=(backup_directory/'session-enforcement-rules/before.rules').read_text(encoding='utf-8')
    require(published['candidate']==c['candidate'] and published['contractSha256']==p.DIGEST and published['result']=='success'
        and original==sources(c)[0] and before['before']==c['rules']['observedBefore']
        and before['contractSha256']==p.DIGEST and before['manifestSha256']==p.digest(value),'Preuves de retour Rules B incompatibles')
    current,_=snapshot(token);require(current==published['after'] and current['sha256']==c['rules']['afterSha256'],'Regles modifiees depuis PROD B')
    expected=json.loads((hosting_directory/'production-hosting-after.json').read_text())
    state=p.common.load('production-release-state.py')
    hosting=state.request('https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1')['releases'][0]
    require({'name':hosting['name'],'version':hosting['version']['name']}==expected,'Hosting modifie depuis PROD B')
    proof={'candidate':c['candidate'],'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),'releaseRun':int(os.environ['RELEASE_RUN']),
        'rollbackRun':int(os.environ['GITHUB_RUN_ID']),'rulesAfter':current,'hostingAfter':expected,'readOnly':True}
    (backup_directory/'session-enforcement-rules/rollback-validated.json').write_text(json.dumps(proof,indent=2),encoding='utf-8')


def rollback_restore(backup_directory,receipt):
    backup_directory=Path(backup_directory);p,value,c,token,identity=rollback_context(backup_directory)
    validated=json.loads((backup_directory/'session-enforcement-rules/rollback-validated.json').read_text())
    restored=json.loads((backup_directory/'session-enforcement-rules/rollback-sources-restored.json').read_text())
    require(validated['releaseRun']==int(os.environ['RELEASE_RUN']) and validated['rollbackRun']==int(os.environ['GITHUB_RUN_ID'])
        and restored['rollbackRun']==int(os.environ['GITHUB_RUN_ID']) and restored['contractSha256']==p.DIGEST
        and restored['manifestSha256']==p.digest(value) and restored['allSourcesRestored'] is True,'Sources B non restaurees avant Rules')
    current,_=snapshot(token);require(current==validated['rulesAfter'],'Derive Rules pendant retour code B')
    name=c['rules']['observedBefore']['rulesetName'];before=sources(c)[0]
    require(file_matches(api(name,token).get('source',{}).get('files'),before),'Ruleset original B indisponible')
    api(RELEASE,token,'PATCH',{'release':{'name':RELEASE,'rulesetName':name}},write=True,target=name)
    current,text=snapshot(token);require(current['rulesetName']==name and text==before,'Retour Rules B non atteste')
    Path(receipt).write_text(json.dumps({'candidate':c['candidate'],'contractSha256':p.DIGEST,'after':current,
        'result':'success','businessInvocations':0,'indexesDeployed':False},indent=2),encoding='utf-8')


def main():
    mode,directory,*args=sys.argv[1:];p=policy();directory=Path(directory)
    if mode in {'rollback-validate','rollback-restore'}:
        report=json.loads((directory/'report.json').read_text())
        if report.get('sourcePolicyKind')!=p.KIND:return
        require(len(args)==1,'Arguments retour B invalides')
        (rollback_validate if mode=='rollback-validate' else rollback_restore)(directory,*args);return
    request=json.loads((directory/'request.json').read_text())
    if not p.enabled(request):return
    if mode=='backup' and len(args)==1:backup(directory,*args)
    elif mode=='publish' and len(args)==2:publish(directory,*args)
    elif mode=='final' and len(args)==1:final(directory,*args)
    else:raise ValueError('Mode Rules B invalide')


if __name__=='__main__':main()
