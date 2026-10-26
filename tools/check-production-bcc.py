"""Read-only CCI transition/infrastructure guard. Never changes a setting or queue."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bcc_guard_policy', ROOT / 'tools/bcc-publication-policy.py')
policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(policy)
MAIL_URL = 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/notificationDelivery'
QUEUE_URL = 'https://cloudtasks.googleapis.com/v2/' + policy.QUEUE
SCHEDULER_URL = 'https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def immutable_mail(document):
    value = copy.deepcopy(document); value.pop('updateTime', None)
    for key in ['enabled', 'revision', 'enabledSince', 'discardThrough', 'updatedAt', 'updatedBy']:
        value.get('fields', {}).pop(key, None)
    return digest(value)


def instant(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        policy.require(parsed.tzinfo is not None, 'Date sans fuseau')
        return parsed.astimezone(timezone.utc)
    except (AttributeError, TypeError, ValueError):
        raise ValueError('Horodatage de transition invalide') from None


def check_mail(document, transition, mode, previous=None):
    fields = document.get('fields', {})
    policy.require(immutable_mail(document) == transition['immutableSha256'], 'Champs immuables du reglage modifies')
    policy.require(fields.get('scope') == {'stringValue': 'all'}, 'Perimetre tous clubs requis')
    if mode == 'initial':
        policy.require(digest(document) == transition['initialSha256'], 'Reglage initial different du plan CCI')
    elif mode == 'paused':
        policy.require(fields.get('enabled') == {'booleanValue': False}
            and fields.get('revision') == {'integerValue': str(transition['pauseRevision'])}
            and fields.get('enabledSince') == {'stringValue': transition['enabledSince']}, 'Coupure CCI differente du plan')
        paused_at = fields.get('discardThrough', {}).get('stringValue')
        policy.require(paused_at == fields.get('updatedAt', {}).get('stringValue')
            and instant(paused_at) >= instant(transition['enabledSince'])
            and instant(paused_at) >= instant(policy.contract()['preparedAfter']), 'Seuil de coupure invalide')
        if previous is not None:
            policy.require(digest(document) == previous['mailSha256'], 'Reglage complet modifie apres coupure')
    elif mode == 'resumed':
        policy.require(previous is not None and fields.get('enabled') == {'booleanValue': True}
            and fields.get('revision') == {'integerValue': str(transition['resumeRevision'])}, 'Remise en service CCI non attestee')
        since = fields.get('enabledSince', {}).get('stringValue')
        policy.require(since == fields.get('updatedAt', {}).get('stringValue')
            and fields.get('discardThrough') == {'stringValue': previous['discardThrough']}
            and instant(since) > instant(previous['discardThrough']), 'Seuil frais de non-rattrapage requis')
    else:
        raise ValueError('Mode de garde interdit')
    return {'mailSha256': digest(document), 'immutableSha256': immutable_mail(document),
            'discardThrough': fields.get('discardThrough', {}).get('stringValue')}


def scheduler_digest(value):
    policy.require(value.get('state') == 'ENABLED' and value.get('schedule') == '*/5 * * * *'
        and value.get('timeZone') == 'Europe/Paris', 'Scheduler CCI modifie')
    # Keep unknown configuration fields; exclude only documented execution output.
    return digest({k: v for k, v in value.items() if k not in ['lastAttemptTime', 'scheduleTime', 'status']})


def check_queue(value):
    retry, rate = value.get('retryConfig', {}), value.get('rateLimits', {})
    policy.require(value.get('name') == policy.QUEUE and value.get('state') == 'RUNNING'
        and rate.get('maxConcurrentDispatches') == 1 and rate.get('maxDispatchesPerSecond') == 1
        and retry.get('maxAttempts') == 3 and retry.get('minBackoff') == '60s'
        and retry.get('maxBackoff') == '300s', 'Configuration de file CCI inattendue')
    return digest({k: v for k, v in value.items() if k not in ['stats', 'purgeTime']})


def get(url, token):
    allowed = [MAIL_URL, QUEUE_URL, SCHEDULER_URL]
    policy.require(url in allowed or url == 'https://run.googleapis.com/v2/projects/livepalmes/locations/europe-west1/services/processnapnotificationtask:getIamPolicy', 'Lecture hors perimetre CCI')
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=30) as response:
        return json.load(response)


def main(mode, directory):
    directory = Path(directory)
    request = json.loads((directory / 'request.json').read_text())
    scope = policy.for_request(request)
    policy.require(scope.approved(request), 'Garde CCI sans plan')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    policy.require(credentials.get('project_id') == 'livepalmes', 'Compte PROD requis')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'], text=True).strip()
    if scope.contract().get('preserveActive'):
        check_active_oct26(mode, directory, scope, token)
        return
    path = directory / 'bcc-paused-witness.json'
    previous = json.loads(path.read_text()) if path.exists() else None
    if mode == 'after':
        policy.require(previous is not None, 'Temoin de coupure absent')
    actual_mode = 'paused' if mode in ['paused', 'after'] else mode
    witness = check_mail(get(MAIL_URL, token), request['bccMailTransition'], actual_mode, previous)
    witness['schedulerSha256'] = scheduler_digest(get(SCHEDULER_URL, token))
    policy.require(witness['schedulerSha256'] == scope.contract()['schedulerSha256'], 'Scheduler different du bilan initial')
    if mode != 'initial':
        witness['queueSha256'] = check_queue(get(QUEUE_URL, token))
    if previous:
        policy.require(all(previous.get(k) == witness.get(k) for k in ['schedulerSha256', 'queueSha256']), 'Infrastructure modifiee pendant publication')
    if mode in ['after', 'resumed']:
        worker_path = directory / 'bcc-worker-iam-witness.json'
        policy.require(worker_path.exists(), 'Temoin IAM worker absent')
        iam = get('https://run.googleapis.com/v2/projects/livepalmes/locations/europe-west1/services/processnapnotificationtask:getIamPolicy', token)
        policy.require(not any(m in {'allUsers','allAuthenticatedUsers'} for b in iam.get('bindings',[]) for m in b.get('members',[]))
            and json.loads(worker_path.read_text()) == {'sha256':digest(iam)}, 'IAM worker CCI modifie ou public')
    if mode == 'paused':
        path.write_text(json.dumps(witness, indent=2))
    elif mode in ['after', 'resumed']:
        (directory / ('bcc-' + mode + '-witness.json')).write_text(json.dumps(witness, indent=2))
    elif mode == 'initial':
        (directory / 'bcc-initial-witness.json').write_text(json.dumps(witness, indent=2))
    print('Garde CCI ' + mode + ' reussi ; lectures techniques uniquement.')


def check_active_oct26(mode, directory, scope, token):
    policy.require(mode in ['initial', 'paused', 'after', 'resumed'], 'Mode de garde interdit')
    c = scope.contract()
    document = get(MAIL_URL, token)
    policy.require(digest(document) == c['mailSha256']
        and document.get('fields', {}).get('enabled') == {'booleanValue': True}
        and document.get('fields', {}).get('scope') == {'stringValue': 'all'}
        and document.get('fields', {}).get('revision') == {'integerValue': '7'}, 'Reglage actif complet modifie')
    policy.require(scheduler_digest(get(SCHEDULER_URL, token)) == c['schedulerSha256'], 'Scheduler modifie')
    policy.require(check_queue(get(QUEUE_URL, token)) == c['queueSha256'], 'File modifiee')
    iam = get('https://run.googleapis.com/v2/projects/livepalmes/locations/europe-west1/services/processnapnotificationtask:getIamPolicy', token)
    policy.require(digest(iam) == c['workerIamSha256']
        and not any(m in {'allUsers', 'allAuthenticatedUsers'} for b in iam.get('bindings', []) for m in b.get('members', [])), 'IAM prive worker modifie')
    index_spec = importlib.util.spec_from_file_location('active_indexes', ROOT / 'tools/production-account-history-indexes.py')
    indexes = importlib.util.module_from_spec(index_spec); index_spec.loader.exec_module(indexes)
    url = indexes.URL + '?pageSize=0'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=30) as response:
        result = json.load(response)
    policy.require(not result.get('nextPageToken'), 'Index tronques : arret')
    rows = result.get('indexes', [])
    indexes.missing(rows)
    selected = [next((r for r in rows if indexes.matching(r, d)), None) for d in indexes.DEFINITIONS]
    policy.require(all(r and r.get('state') == 'READY' for r in selected), 'Deux index PROD READY requis avant publication')
    witness = {'mailSha256': c['mailSha256'], 'schedulerSha256': c['schedulerSha256'],
        'queueSha256': c['queueSha256'], 'indexSha256': digest(selected), 'activeUnchanged': True}
    path = directory / 'bcc-active-before-witness.json'
    if path.exists():
        policy.require(json.loads(path.read_text()) == witness, 'Etat actif ou index modifies pendant publication')
    else:
        policy.require(mode not in ['after', 'resumed'], 'Temoin actif initial requis')
        path.write_text(json.dumps(witness, indent=2))
    (directory / 'bcc-worker-iam-witness.json').write_text(json.dumps({'sha256': c['workerIamSha256']}))
    (directory / ('bcc-' + mode + '-witness.json')).write_text(json.dumps(witness, indent=2))
    print('Mails actifs tous clubs et deux index READY verifies ; aucune ecriture cloud.')


if __name__ == '__main__':
    main(*sys.argv[1:])
