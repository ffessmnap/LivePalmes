"""Read-only mail/scheduler/source guards for the exact licence promotion."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('license_guard_policy', ROOT/'tools/license-report-release-policy.py')
policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(policy)
MAIL = 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/notificationDelivery'
SCHEDULER = 'https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1'

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()

def get(url,token):
    policy.require(url in {MAIL,SCHEDULER}, 'Lecture licences hors perimetre')
    req=urllib.request.Request(url,headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req,timeout=30) as response:
        return json.load(response)

def validate(mail,scheduler,c):
    fields=mail.get('fields', {})
    policy.require(fields.get('enabled') == {'booleanValue':True}
        and fields.get('scope') == {'stringValue':'all'} and fields.get('revision') == {'integerValue':'9'}
        and digest(mail) == c['mailPreservation']['documentSha256'], 'Reglage mail licences modifie')
    view={k:v for k,v in scheduler.items() if k not in ['lastAttemptTime','scheduleTime','status']}
    policy.require(scheduler.get('schedule') == '0 * * * *' and scheduler.get('timeZone') == 'Europe/Paris'
        and scheduler.get('state') == 'ENABLED' and digest(view) == c['mailPreservation']['schedulerSha256'],
        'Scheduler licences modifie')
    return {'mailSha256':digest(mail),'schedulerSha256':digest(view)}

def settle(receipt,now):
    stamp=datetime.fromisoformat(receipt['updatedAt'].replace('Z','+00:00'))
    policy.require(stamp.tzinfo is not None and receipt.get('candidate') == policy.contract()['candidate'], 'Temoin source licences invalide')
    elapsed=(now-stamp).total_seconds()
    policy.require(elapsed >= -60, 'Horodatage source licences futur')
    return max(0,305-elapsed)

def main(directory,after=False):
    directory=Path(directory); request=json.loads((directory/'request.json').read_text())
    policy.require(policy.approved(request), 'Garde licences sans accord')
    credentials=json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    policy.require(credentials.get('project_id') == 'livepalmes', 'Compte PROD requis')
    receipt=directory/'license-report-source-update.json'
    if receipt.exists():
        delay=settle(json.loads(receipt.read_text()),datetime.now(timezone.utc))
        if delay:
            print('Observation du delai maximal des anciens appels licences avant bascule, sans coupure des mails.',flush=True)
            time.sleep(delay)
    elif after:
        raise ValueError('Temoin de publication du controleur licences absent')
    token=subprocess.check_output(['gcloud','auth','application-default','print-access-token'],text=True,stderr=subprocess.DEVNULL).strip()
    c=policy.contract(); observed=validate(get(MAIL,token),get(SCHEDULER,token),c)
    source=json.loads(subprocess.check_output(['node',str(ROOT/'tools/check-license-report-source.js'),c['sourceHash']],text=True))
    policy.require(source == {'schema':1,'sourceHash':c['sourceHash'],'count':10,'readOnly':True}, 'Preuve source licences invalide')
    observed['sourceHash']=source['sourceHash']
    before=directory/'license-report-before.json'
    if before.exists():
        policy.require(json.loads(before.read_text()) == observed, 'Derive licences depuis le premier controle')
    elif after:
        raise ValueError('Temoin initial licences absent')
    else:
        before.write_text(json.dumps(observed))
    if after:
        (directory/'license-report-after.json').write_text(json.dumps(observed))
    print('Mails tous clubs actifs inchanges, Scheduler horaire et bilans officiels verifies ; aucune ecriture.')

if __name__ == '__main__':
    main(os.environ['PLAN'],sys.argv[1:] == ['--after'])
