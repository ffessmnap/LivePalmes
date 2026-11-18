"""MFA state/explicit coordinated rollback; preserve the historical state reader."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import sys
from types import SimpleNamespace
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
KIND='a34b-admin-mfa-existing-v1'


def load(name):
    spec=importlib.util.spec_from_file_location('admin_mfa_state_'+name.replace('-','_'),ROOT/'tools'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


def check(backup,destination,success):
    p=load('admin-mfa-production-policy.py');state=load('production-release-state.py')
    report=json.loads((backup/'report.json').read_text());manifest=p.validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    p.require(report['candidate']==manifest['candidate'] and report['newFunctions']==[]
              and report['sourcePolicyKind']==p.KIND and report['standardSourceManifestSha256']==p.digest(manifest),
              'Rapport MFA hors sauvegarde/manifeste')
    original=json.loads((backup/'functions.json').read_text());p.initial(original,manifest)
    current=state.inventory();before={f['name']:f for f in original};after={f['name']:f for f in current}
    selected={p.PREFIX+n for n in manifest['selected']}
    p.require({f['name'] for f in report['functions']}==selected and len(current)==len(after)==119
              and set(after)==set(before),'Inventaire MFA cree/supprime ou incomplet')
    errors=[]
    try:
        p.assert_retained(before,after,selected,state)
        for name in sorted(selected):p.assert_selected(before[name],after[name],manifest['candidate'])
        p.require(p.common.controls()==manifest['controls'],'Temoins mails/automates modifies')
    except ValueError as error:errors.append(str(error))
    result={'candidate':manifest['candidate'],'functions':[state.identity(f) for f in current],'errors':errors}
    destination.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    p.require(not errors,'Controle final MFA incomplet : '+str(errors))
    p.require(success,'Publication sources MFA non reussie : aucun passage Rules/Hosting')


def final(backup,after_path,destination):
    p=load('admin-mfa-production-policy.py');state=load('production-release-state.py')
    manifest=p.validate_manifest(json.loads((backup/'standard-source-manifest.json').read_text()))
    report=json.loads((backup/'report.json').read_text())
    p.require(report['candidate']==manifest['candidate'] and report['newFunctions']==[]
              and report['sourcePolicyKind']==p.KIND and report['errors']==[]
              and report['standardSourceManifestSha256']==p.digest(manifest),'Sauvegarde MFA finale hors manifeste')
    prior=json.loads(after_path.read_text());current=state.inventory()
    expected={f['name']:f for f in prior['functions']}
    p.require(prior['candidate']==manifest['candidate'] and prior['errors']==[]
              and len(prior['functions'])==len(current)==len(expected)==119 and {f['name'] for f in current}==set(expected)
              and all(state.identity(f)==expected[f['name']] for f in current),'Derive MFA apres Hosting')
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())}
    p.require(all(p.configuration(f)==p.configuration(original[f['name']]) for f in current)
              and p.common.controls()==manifest['controls'],'Configuration/temoins MFA modifies apres Hosting')
    destination.write_text(json.dumps({'candidate':manifest['candidate'],'errors':[],
        'functionsUnchangedSinceSources':True,'inventoryCount':119,'controlsUnchanged':True,
        'readOnly':True,'businessInvocations':0},indent=2)+'\n',encoding='utf-8')


def rollback(backup,after_path,apply):
    p=load('admin-mfa-production-policy.py');state=load('production-release-state.py')
    report=json.loads((backup/'report.json').read_text());after=json.loads(after_path.read_text())
    original={f['name']:f for f in json.loads((backup/'functions.json').read_text())}
    current=state.inventory()
    p.rollback_guard(backup,after,current,SimpleNamespace(**vars(state)),apply=apply)
    selected={f['name'] for f in report['functions']};archives={}
    expected={f['name']:f for f in after['functions']}
    p.require(report['newFunctions']==[] and selected<=set(original),'Aucune creation/suppression en retour MFA')
    for source in report['sources']:
        path=backup/'sources'/(source['functions'][0]+'.zip')
        p.require(hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256'],'Archive initiale MFA alteree')
        for name in source['functions']:archives[p.PREFIX+name]=path
    p.require(set(archives)==selected,'Couverture archives initiales MFA incomplete')
    if not apply:return
    def restore(name):
        p.require(state.identity(state.request(state.API+name))==expected[name],'Derive avant upload retour MFA')
        upload=state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl','POST',{})
        url=urllib.parse.urlsplit(upload['uploadUrl']);target=upload['storageSource']
        p.require(url.scheme=='https' and (url.hostname=='storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')),
                  'Destination archive MFA interdite')
        parts=urllib.parse.unquote(url.path).lstrip('/').split('/',1)
        actual=parts if url.hostname=='storage.googleapis.com' else [url.hostname.removesuffix('.storage.googleapis.com'),urllib.parse.unquote(url.path).lstrip('/')]
        p.require(actual==[target.get('bucket'),target.get('object')],'Reference upload retour MFA differente')
        req=urllib.request.Request(upload['uploadUrl'],method='PUT',data=archives[name].read_bytes(),headers={'Content-Type':'application/zip'})
        with urllib.request.urlopen(req,timeout=120) as response:generation=response.headers.get('x-goog-generation')
        if generation:target={**target,'generation':generation}
        body,mask=p.rollback_patch(original[name],target)
        p.require(mask=='build_config.source,labels','Masque de retour MFA elargi')
        p.require(state.identity(state.request(state.API+name))==expected[name],'Derive avant PATCH retour MFA')
        state.wait_operation(state.request(state.API+name+'?updateMask='+mask,'PATCH',body))
        p.assert_rollback(original[name],state.request(state.API+name))
    with ThreadPoolExecutor(max_workers=4) as executor:list(executor.map(restore,sorted(selected)))
    p.rollback_complete(backup,SimpleNamespace(**vars(state)),archives)


def dispatch(args):
    if len(args) not in {3,4} or args[0] not in {'check','final','hosting-state','validate-rollback','rollback','hosting-rollback'}:
        raise ValueError('Mode etat MFA inconnu')
    mode,backup,destination,*outcome=args;backup,destination=Path(backup),Path(destination)
    report=json.loads((backup/'report.json').read_text())
    manifest_path=backup/'standard-source-manifest.json'
    manifest=json.loads(manifest_path.read_text()) if manifest_path.is_file() else {}
    is_mfa=report.get('sourcePolicyKind')==KIND or manifest.get('kind')==KIND
    if not is_mfa:return load('direct-csp-production-state.py').dispatch(args)
    p=load('admin-mfa-production-policy.py')
    p.require(report.get('sourcePolicyKind')==manifest.get('kind')==KIND,'Type sauvegarde MFA incoherent')
    workflow='livepalmes-production-release.yml' if mode in {'check','final','hosting-state'} else 'livepalmes-production-rollback.yml'
    p.require(os.environ.get('GITHUB_REF')=='refs/heads/main' and os.environ.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes'
              and os.environ.get('GITHUB_RUN_ATTEMPT')=='1' and os.environ.get('GITHUB_EVENT_NAME')=='workflow_dispatch'
              and os.environ.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/'+workflow+'@refs/heads/main'
              and re.fullmatch('[a-f0-9]{40}',os.environ.get('GITHUB_SHA','')), 'Contexte etat MFA non officiel')
    credentials=json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    p.require(credentials.get('project_id')=='livepalmes','Identite etat MFA hors PROD')
    reader=p.common.load('access-revocation-production-policy.py');caps=p.common.load('admin-mfa-production-capabilities.py')
    kind='hosting' if mode.startswith('hosting-') else 'backend'
    p.require(reader.reader_identity(kind)==caps.READERS[kind],'Identite etat MFA inattendue')
    if mode=='check':
        p.require(len(outcome)==1,'Issue de publication MFA absente');return check(backup,destination,outcome[0]=='success')
    if mode=='final':
        p.require(len(outcome)==1,'Recu final MFA absent');return final(backup,destination,Path(outcome[0]))
    if mode in {'rollback','validate-rollback'}:
        p.require(not outcome,'Arguments retour MFA invalides');return rollback(backup,destination,mode=='rollback')
    state=load('production-release-state.py')
    if mode=='hosting-rollback':
        current=state.request('https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1')['releases'][0]
        p.rollback_hosting_guard(backup,current)
    return state.hosting(backup,destination,mode=='hosting-rollback')


if __name__=='__main__':dispatch(sys.argv[1:])
