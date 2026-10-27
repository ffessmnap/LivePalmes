"""Bounded technical guard; scheduler writer only called by the backed-up publisher."""
import copy
import json
from pathlib import Path
import urllib.request
from datetime import datetime, timedelta, timezone

def scheduler_view(value):
    return {k:v for k,v in value.items() if k not in ['lastAttemptTime','scheduleTime','status']}

def hourly_view(before, value, c, guard, now=None):
    expected = copy.deepcopy(before); expected['schedule'] = '0 * * * *'
    # The API changed this output-only timestamp during the approved PATCH.
    # Keep it pinned in the after-witness; never ignore it for later drift.
    if 'userUpdateTime' in before or 'userUpdateTime' in value:
        guard.policy.require('userUpdateTime' in before and 'userUpdateTime' in value, 'Horodatage Scheduler absent ou ajoute')
        old = guard.instant(before['userUpdateTime']); new = guard.instant(value['userUpdateTime'])
        guard.policy.require(old <= new <= (now or datetime.now(timezone.utc))+timedelta(seconds=60), 'Horodatage Scheduler invalide')
        if new != old:
            guard.policy.require(new >= guard.instant(c['preparedAfter']), 'Horodatage Scheduler anterieur au plan')
        expected['userUpdateTime'] = value['userUpdateTime']
    guard.policy.require(value == expected, 'Autre champ Scheduler modifie')
    return expected

def verified_resume(directory, c):
    path = directory/'previous/production-after.json'
    if not path.exists(): return False
    result = json.loads(path.read_text()); rows = result.get('functions',[])
    names = [f.get('name','').split('/')[-1] for f in rows]
    return (result.get('candidate') == c['candidate'] and result.get('errors') == []
        and len(names) == len(set(names)) == c['inventoryCount']
        and set(names) == set(c['selected']+c['retained']) and all(f.get('state') == 'ACTIVE' for f in rows))

def mail(document, mode, c, guard, previous=None):
    fields = document.get('fields',{})
    guard.policy.require(guard.immutable_mail(document) == c['immutableMailSha256']
        and fields.get('scope') == {'stringValue':'all'}, 'Champs mail27octobre modifies')
    if mode == 'initial':
        guard.policy.require(guard.digest(document) == c['mailSha256'], 'Reglage initial27octobre modifie')
    elif mode in ['paused','after']:
        stamp = fields.get('discardThrough',{}).get('stringValue')
        guard.policy.require(fields.get('enabled') == {'booleanValue':False} and fields.get('revision') == {'integerValue':'8'}
            and fields.get('enabledSince') == {'stringValue':c['enabledSince']}
            and stamp == fields.get('updatedAt',{}).get('stringValue')
            and guard.instant(stamp) > guard.instant(c['enabledSince'])
            and guard.instant(stamp) >= guard.instant(c['preparedAfter']), 'Coupure27octobre ou seuil non conforme')
        if previous: guard.policy.require(previous['mailSha256'] == guard.digest(document), 'Coupure modifiee pendant publication')
    elif mode == 'resumed':
        stamp = fields.get('enabledSince',{}).get('stringValue')
        guard.policy.require(previous and fields.get('enabled') == {'booleanValue':True}
            and fields.get('revision') == {'integerValue':'9'}
            and fields.get('discardThrough') == {'stringValue':previous['discardThrough']}
            and stamp == fields.get('updatedAt',{}).get('stringValue')
            and guard.instant(stamp) > guard.instant(previous['discardThrough']), 'Reprise27octobre sans seuil frais')
    else: raise ValueError('Mode27octobre interdit')
    return {'mailSha256':guard.digest(document),'discardThrough':fields.get('discardThrough',{}).get('stringValue')}

def check(mode, directory, scope, token, guard):
    c = scope.contract(); require = guard.policy.require
    path = directory/'bcc-paused-witness.json'
    previous = json.loads(path.read_text()) if path.exists() else None
    require(mode in ['initial','paused','after','resumed'], 'Mode27octobre interdit')
    if mode in ['after','resumed']: require(previous is not None, 'Temoin de coupure27octobre absent')
    witness = mail(guard.get(guard.MAIL_URL,token), mode,c,guard,previous)
    scheduler = guard.get(guard.SCHEDULER_URL,token)
    before_path = directory/'bcc-scheduler-before-witness.json'
    before = json.loads(before_path.read_text()) if before_path.exists() else None
    view = scheduler_view(scheduler)
    if before is None:
        require(mode in ['initial','paused'] and guard.scheduler_digest(scheduler) == c['schedulerSha256'], 'Scheduler initial27octobre modifie')
        before = view; before_path.write_text(json.dumps(before))
    require(guard.digest(before) == c['schedulerSha256'], 'Temoin scheduler initial altere')
    after_path = directory/'bcc-scheduler-after-witness.json'
    hourly = after_path.exists() or mode in ['after','resumed'] or mode == 'paused' and verified_resume(directory,c)
    if hourly:
        hourly_view(before,view,c,guard)
        if after_path.exists():
            require(json.loads(after_path.read_text()) == {'sha256':guard.digest(view)}, 'Scheduler modifie apres son temoin horaire')
    else:
        require(view == before, 'Scheduler27octobre hors etape ou autre champ modifie')
    witness['schedulerSha256'] = guard.digest(view)
    require(guard.check_queue(guard.get(guard.QUEUE_URL,token)) == c['queueSha256'], 'File27octobre modifiee')
    iam = guard.get('https://run.googleapis.com/v2/projects/livepalmes/locations/europe-west1/services/processnapnotificationtask:getIamPolicy',token)
    require(guard.digest(iam) == c['workerIamSha256'] and not any(m in {'allUsers','allAuthenticatedUsers'}
        for b in iam.get('bindings',[]) for m in b.get('members',[])), 'IAM worker27octobre modifie')
    if hourly and not after_path.exists():
        after_path.write_text(json.dumps({'sha256':guard.digest(view)}))
    (directory/'bcc-worker-iam-witness.json').write_text(json.dumps({'sha256':c['workerIamSha256']}))
    if mode == 'paused' and previous is None: path.write_text(json.dumps(witness))
    (directory/('bcc-'+mode+'-witness.json')).write_text(json.dumps(witness))
    print('Garde27octobre '+mode+' : mails, scheduler, file et IAM verifies en lecture seule.')

def finish_scheduler(directory, backup, scope, token, guard):
    # Caller is the ordinary publisher, after encrypted backup verification and
    # source updates. This helper never pauses/resumes mail or schedules tasks.
    require = guard.policy.require; c = scope.contract()
    saved = json.loads((backup/'scheduler.json').read_text())
    require(guard.digest(scheduler_view(saved)) == c['schedulerSha256'], 'Sauvegarde scheduler27octobre invalide')
    guard.main('paused',directory)
    desired = scheduler_view(saved); desired['schedule'] = '0 * * * *'
    actual = guard.get(guard.SCHEDULER_URL,token)
    if actual.get('schedule') != '0 * * * *':
        require(guard.digest(scheduler_view(actual)) == c['schedulerSha256'], 'Derive scheduler avant modification')
        req = urllib.request.Request(guard.SCHEDULER_URL+'?updateMask=schedule', method='PATCH',
            data=json.dumps({'name':saved['name'],'schedule':'0 * * * *'}).encode(),
            headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        with urllib.request.urlopen(req,timeout=30) as response: json.load(response)
    actual_view = scheduler_view(guard.get(guard.SCHEDULER_URL,token))
    hourly_view(scheduler_view(saved),actual_view,c,guard)
    (directory/'bcc-scheduler-after-witness.json').write_text(json.dumps({'sha256':guard.digest(actual_view)}))
