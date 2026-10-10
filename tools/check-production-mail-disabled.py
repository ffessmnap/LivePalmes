"""Read one technical setting; never write it or invoke a notification."""
import json
import hashlib
import os
from pathlib import Path
import subprocess
import urllib.error
import urllib.request


def disabled(document):
    fields = document.get('fields', {})
    value = fields.get('enabled')
    if value is None:
        return True
    if set(value) != {'booleanValue'} or not isinstance(value['booleanValue'], bool):
        raise ValueError('Reglage des notifications invalide')
    return not value['booleanValue']


def main():
    request = json.loads((Path(os.environ['PLAN']) / 'request.json').read_text())
    if not request.get('additionalNotificationFunctions') and not request.get('additionalPublicNapFunctions'):
        print('Aucune extension notifications ; aucun acces Firestore.')
        return
    if request.get('initialAutomaticMailEnabled') is not False:
        raise ValueError('Mails desactives requis pour la bascule')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    if credentials.get('project_id') != 'livepalmes':
        raise ValueError('Compte PROD requis')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'],
                                   text=True, stderr=subprocess.DEVNULL).strip()
    query = urllib.request.Request('https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/engagementConfigurations/notificationDelivery',
                                   headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(query, timeout=30) as response:
            document = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise ValueError('Controle du reglage indisponible') from None
        document = {}
    if not disabled(document):
        raise ValueError('Mails automatiques actifs : publication interrompue, desactivation nationale requise')
    scheduler_query = urllib.request.Request('https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1',
                                            headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(scheduler_query, timeout=30) as response:
            scheduler = json.load(response)
    except Exception:
        raise ValueError('Controle de la planification indisponible') from None
    if scheduler.get('schedule') != '*/5 * * * *' or scheduler.get('timeZone') != 'Europe/Paris':
        raise ValueError('Planification de cloture differente du perimetre approuve')
    fingerprint = scheduler_fingerprint(scheduler)
    witness = Path(os.environ['PLAN']) / 'notification-scheduler-before.json'
    if witness.exists():
        if json.loads(witness.read_text()) != fingerprint:
            raise ValueError('Planification modifiee depuis la sauvegarde : publication interrompue')
    else:
        witness.write_text(json.dumps(fingerprint))
    print('Mails automatiques desactives ; une lecture technique, aucune ecriture.')


def scheduler_fingerprint(value):
    fields = ['name', 'schedule', 'timeZone', 'state', 'retryConfig', 'attemptDeadline', 'httpTarget', 'pubsubTarget', 'appEngineHttpTarget']
    configuration = {key: value[key] for key in fields if key in value}
    return {'schema': 1, 'sha256': hashlib.sha256(json.dumps(configuration, sort_keys=True).encode()).hexdigest()}


if __name__ == '__main__':
    main()
