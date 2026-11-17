"""One Hosting-only completion of a fully attested A3.3 source publication."""
import hashlib
import importlib.util
import io
import zipfile
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'.github/releases/evidence/20261117-access-revocation-hosting-completion.json'
DIGEST='ee2eb34ff816f4a0aab0b2acdd474e50fbfe0ce34a502c74cceacfe89bfa8d85'
INITIAL_RUN=43980814596
spec=importlib.util.spec_from_file_location('a33_completion_common',ROOT/'tools/standard-source-policy.py')
common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
require,digest=common.require,common.digest
def policy():return common.load('access-revocation-production-policy.py')
def read(p):return json.loads(Path(p).read_text())
def write(p,v):Path(p).write_text(json.dumps(v))


def contract():
    raw=PATH.read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest()==DIGEST,'Contrat de cloture A3.3 modifie')
    c=json.loads(raw);p=policy()
    require(c['initialRun']==INITIAL_RUN and c['candidate']==p.CANDIDATE and c['originalContractSha256']==p.DIGEST
            and c['selectedCount']==107 and c['inventoryCount']==119 and c['sourceWrites']==0
            and c['configurationChanges'] is c['bindingChanges'] is False,'Cloture A3.3 hors perimetre')
    return c


def active():return os.environ.get('A33_RECOVERY_RUN','0')!='0'


def context(root):
    c=contract();require(os.environ.get('A33_RECOVERY_RUN')==str(INITIAL_RUN),'Reprise A3.3 non qualifiee')
    value=policy().reader_context(root)
    if 'production-release.yml@' in value['workflowRef']:
        require(os.environ.get('PREPARATION_RUN')=='0' and os.environ.get('RESUME',str(INITIAL_RUN))==str(INITIAL_RUN),
                'Reprise A3.3 exige le plan initial, aucune nouvelle baseline')
    return {**value,'initialRun':INITIAL_RUN,'completionContractSha256':DIGEST,'initialPreflightRun':c['preflightRun']}


def evidence(root):
    root=Path(root);c=contract();p=policy();value=p.manifest(root)
    require(digest(value)==c['manifestSha256'] and sorted(read(root/'selection.json'))==value['selected'],
            'Plan ou selection de cloture A3.3 different')
    for name,expected in c['criticalFiles'].items():
        require(hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,'Preuve initiale de cloture alteree: '+name)
    guards=root/'previous/standard-guards'
    after=read(root/'previous/production-after.json');functions={f['name']:f for f in after['functions']}
    source=read(guards/'standard-source-receipts.json');selected={p.PREFIX+n for n in value['selected']}
    require(after['candidate']==p.CANDIDATE and after['errors']==[] and len(after['functions'])==len(functions)==119
            and all(f['state']=='ACTIVE' for f in functions.values()),'Fonctions A3.3 incompletes ou non actives')
    require(source['candidate']==p.CANDIDATE and source['manifestSha256']==digest(value)
            and set(source['functions'])==selected and all(r['identity']==functions[n]
                and r['allPathsAndFileBytesIdentical'] is True and r['generationReadAndReferencesRechecked'] is True
                for n,r in source['functions'].items()),'Archives des 107 sources A3.3 non demontrees')
    before={f['name']:f for f in value['origins']}
    require(set(before)==set(functions) and all(functions[n]=={k:before[n][k] for k in ['name','revision','updateTime','state']}
            for n in set(before)-selected),'Fonctions conservees A3.3 modifiees')
    require((guards/'standard-controls-before.json').read_bytes()==(guards/'standard-controls-after.json').read_bytes()
            and read(guards/'standard-controls-before.json')==value['controls'],'Temoins de cloture A3.3 differents')
    require(read(guards/'standard-access-revocation-prerequisites-before.json')['ready'] is True,
            'Derniere garde des sources A3.3 non concluante')
    return value


def log_from_archive(data, expected):
    # Keep terminal control bytes inside memory. Nothing from a log is rendered.
    # The binary endpoint avoids the CLI text-output escape-sequence protection.
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos=archive.infolist()
        require(len(infos)<=250 and sum(i.file_size for i in infos)<=32*1024**2,
                'Archive de journaux hors limite')
        matches=[archive.read(i) for i in infos if not i.is_dir()
                 and hashlib.sha256(archive.read(i)).hexdigest()==expected]
    require(len(matches)==1,'Journal scelle absent, modifie ou ambigu')
    return matches[0]


def authenticate_origin(root,cycle):
    root=Path(root);ctx=context(root);c=contract();evidence(root)
    stamp=root/'standard-access-revocation-completion-origin.json'
    if stamp.exists():
        require(read(stamp)==ctx,'Contexte initial de cloture A3.3 different');return
    info=cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}')
    require(info['status']=='completed' and info['conclusion']=='failure' and info['head_branch']=='main'
            and info['run_attempt']==1 and info['head_sha']==c['initialController']
            and info['path']=='.github/workflows/livepalmes-production-release.yml','Run initial de cloture different')
    values=cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}/artifacts?per_page=100')
    require(values['total_count']==len(c['artifacts']) and len(values['artifacts'])==values['total_count'],
            'Inventaire des preuves initiales different')
    actual={a['name']:{k:a[k] for k in ['id','digest']} for a in values['artifacts'] if not a['expired']}
    require(actual==c['artifacts'],'Artefacts initiaux de cloture non authentiques ou expires')
    jobs=cycle.gh(f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}/jobs?per_page=20')['jobs']
    require(len(jobs)==1 and jobs[0]['id']==c['initialJob'] and jobs[0]['conclusion']=='failure','Job initial different')
    require([s['name'] for s in jobs[0]['steps'] if s['conclusion']=='failure']==c['failedSteps'],
            'Autre echec que le controle d ordre A3.3')
    archive=subprocess.check_output(['gh','api',f'repos/ffessmnap/LivePalmes/actions/runs/{INITIAL_RUN}/logs'])
    logs=log_from_archive(archive,c['jobLogSha256'])
    require(hashlib.sha256(logs).hexdigest()==c['jobLogSha256']
            and b'ValueError: Selection standard apres sources differente' in logs,'Cause de cloture A3.3 non demontree')
    require(not (root/'previous/production-hosting-after.json').exists(),'Hosting a deja change, cloture refusee')
    write(stamp,ctx)


def restore_witness(root,source):
    root=Path(root);require(Path(source)==root/'previous/standard-guards','Mauvaise origine des temoins A3.3')
    cycle=common.load('release-cycle.py');authenticate_origin(root,cycle)
    value=evidence(root);witness=Path(source)/'standard-controls-before.json'
    target=root/witness.name
    require(read(witness)==value['controls'] and (not target.exists() or read(target)==value['controls']),
            'Temoin initial de cloture A3.3 different')
    target.write_bytes(witness.read_bytes())
    data=(Path(source)/'standard-source-receipts.json').read_bytes()
    target=root/'standard-source-receipts.json'
    require(not target.exists() or target.read_bytes()==data,'Recu sources A3.3 different')
    target.write_bytes(data)


def require_readiness(root,cycle):
    ctx=context(root);c=contract();run=os.environ.get('A33_RECOVERY_READINESS_RUN','0')
    require(run.isdigit() and int(run)>0,'Prerequis officiels de cloture A3.3 absents')
    for kind in ['backend','hosting']:
        target=Path(root)/('completion-readiness-'+kind)
        info=cycle.artifact(run,'production-prerequisites-'+kind,target,
                            '.github/workflows/livepalmes-production-readiness.yml')
        report=read(target/('prerequisites-'+kind+'.json'))
        require(info['head_sha']==ctx['toolingCommit'] and report['ready'] is True and report['readOnly'] is True
                and report['missingPermissions']==[] and report['candidate']==c['candidate']
                and report['planRun']==c['preflightRun'],'Prerequis de cloture A3.3 incompatibles')
        if kind=='backend':
            proof=report.get('accessRevocationCompletion',{})
            require(proof.get('completionContractSha256')==DIGEST and proof.get('initialRun')==INITIAL_RUN
                    and proof.get('run')==int(run) and proof.get('attempt')==1
                    and proof.get('toolingCommit')==ctx['toolingCommit'] and proof.get('manifestSha256')==ctx['manifestSha256']
                    and proof.get('encryptedBackupSha256')==c['encryptedBackupSha256']
                    and proof.get('functionsActive')==119 and proof.get('sourceWrites')==0
                    and proof.get('existingSourcesQualified')==107 and proof.get('newBaseline') is False
                    and proof.get('originalBackupOpenedInOfficialRunner') is True
                    and report.get('accessRevocation',{}).get('ready') is True
                    and report['accessRevocation'].get('sameRunReadersVerified') is True
                    and report['accessRevocation'].get('run')==int(run)
                    and report['accessRevocation'].get('runtimeProfileReadPermissionVerified') is True
                    and report['accessRevocation'].get('enabledAdministrativeAuthAccounts',0)>0,
                    'Qualification technique de cloture A3.3 incomplete')


def hosting_only(root,request,selected,cycle):
    authenticate_origin(root,cycle);value=evidence(root)
    require(policy().approved(request)==value['selected'] and sorted(selected)==value['selected'],
            'Reduction ou extension de selection A3.3 refusee')
    if 'production-release.yml@' in context(root)['workflowRef']:require_readiness(root,cycle)
    return True


def prepare(root,plan_run,cycle):
    require(str(plan_run)==str(contract()['preflightRun']),'Plan initial de cloture A3.3 requis')
    cycle.fetch_plan('0',str(INITIAL_RUN),root)


def initial_after(root,functions):
    root=Path(root);ctx=context(root);value=evidence(root);p=policy()
    before={f['name']:f for f in read(root/'completion-backup/functions.json')}
    actual={f['name']:f for f in functions};selected={p.PREFIX+n for n in value['selected']}
    state=common.load('production-release-state.py')
    require(len(actual)==len(functions)==119,'Inventaire courant de cloture incomplet')
    p.assert_retained(before,actual,selected,state)
    for name in sorted(selected):p.assert_selected(before[name],actual[name],p.CANDIDATE)
    require({n:state.identity(f) for n,f in actual.items()}=={f['name']:f for f in read(root/'previous/production-after.json')['functions']},
            'Derive depuis les revisions initiales A3.3')
    return ctx


def qualify(root):
    root=Path(root);cycle=common.load('release-cycle.py');authenticate_origin(root,cycle)
    ctx=context(root);policy().reader_identity('backend');c=contract()
    require('production-readiness.yml@' in ctx['workflowRef'],'Qualification reservee aux prerequis officiels')
    encrypted=root/'encrypted/prod-backup.enc'
    require(hashlib.sha256(encrypted.read_bytes()).hexdigest()==c['encryptedBackupSha256'],'Sauvegarde initiale de cloture differente')
    backup=root/'completion-backup'
    subprocess.run(['node',str(ROOT/'tools/production-backup-crypto.js'),'open',str(encrypted),str(backup)],check=True)
    cycle.verify_resume(root,backup)
    state=common.load('production-release-state.py')
    initial_after(root,state.inventory())
    receipt={**ctx,'encryptedBackupSha256':c['encryptedBackupSha256'],'functionsActive':119,
             'existingSourcesQualified':107,'sourceWrites':0,'newBaseline':False,
             'originalBackupOpenedInOfficialRunner':True}
    write(root/'standard-access-revocation-completion-qualified.json',receipt)


def qualification(root):
    root=Path(root);ctx=context(root);value=read(root/'standard-access-revocation-completion-qualified.json')
    require(all(value.get(k)==v for k,v in ctx.items()) and value.get('functionsActive')==119
            and value.get('sourceWrites')==0 and value.get('originalBackupOpenedInOfficialRunner') is True,
            'Qualification courante de cloture A3.3 absente ou incompatible')
    return value


if __name__=='__main__':
    require(len(sys.argv)==3 and sys.argv[1]=='qualify','Mode de cloture A3.3 invalide')
    qualify(sys.argv[2])
    print('Cloture A3.3 : sauvegarde initiale et 119 revisions/configurations verifiees, zero ecriture de source.')
