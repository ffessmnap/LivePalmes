"""Read one technical setting; never write it or invoke a notification."""
import json
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
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


def paused_idf_state(document, maintenance):
    fields = document.get('fields', {})
    if (fields.get('enabled') != {'booleanValue': False} or fields.get('scope') != {'stringValue': 'idf'}
            or fields.get('revision') != {'integerValue': str(maintenance['pauseRevision'])}):
        raise ValueError('Coupure IDF ou revision differente du bilan')
    result = {key: fields.get(key) for key in ['enabled', 'scope', 'revision', 'enabledSince', 'discardThrough', 'updatedAt']}
    for key in ['enabledSince', 'discardThrough', 'updatedAt']:
        if not isinstance(fields.get(key, {}).get('stringValue'), str) or not fields[key]['stringValue']:
            raise ValueError('Horodatage de coupure IDF absent')
    if fields['discardThrough']['stringValue'] < fields['enabledSince']['stringValue']:
        raise ValueError('Seuil de non-rattrapage IDF incoherent')
    return result


def check_pause_witness(document, maintenance, witness):
    observed = paused_idf_state(document, maintenance)
    if witness.exists() and json.loads(witness.read_text()) != observed:
        raise ValueError('Reglage IDF modifie pendant publication')
    witness.write_text(json.dumps(observed))


def check_idf_preservation(document, preservation, directory, after=False):
    fields = document.get('fields', {})
    expected_scope = 'all' if preservation.get('scope') == 'all' and preservation.get('documentSha256') else 'idf'
    if (fields.get('enabled') != {'booleanValue': True} or fields.get('scope') != {'stringValue': expected_scope}
            or fields.get('revision') != {'integerValue': str(preservation['revision'])}):
        raise ValueError('Etat IDF actif different du bilan approuve')
    for key in ['enabledSince', 'discardThrough', 'updatedAt']:
        if not isinstance(fields.get(key, {}).get('stringValue'), str) or not fields[key]['stringValue']:
            raise ValueError('Horodatage IDF absent')
    observed = {'schema': 1, 'sha256': hashlib.sha256(json.dumps(document, sort_keys=True).encode()).hexdigest()}
    if expected_scope == 'all' and observed['sha256'] != preservation['documentSha256']:
        raise ValueError('Reglage tous clubs complet different du bilan corrige')
    witness = directory / 'public-reader-idf-before.json'
    if witness.exists():
        if json.loads(witness.read_text()) != observed:
            raise ValueError('Reglage IDF complet modifie pendant publication')
    elif after:
        raise ValueError('Temoin IDF initial absent')
    else:
        witness.write_text(json.dumps(observed))
    if after:
        (directory / 'public-reader-idf-after.json').write_text(json.dumps(observed))


def main():
    request = json.loads((Path(os.environ['PLAN']) / 'request.json').read_text())
    if not request.get('additionalNotificationFunctions') and not request.get('additionalPublicNapFunctions') and not request.get('additionalAccessRequestFunctions') and not request.get('additionalClubDirectoryFunctions') and not request.get('additionalGroupedFunctions'):
        print('Aucune extension notifications ; aucun acces Firestore.')
        return
    spec = importlib.util.spec_from_file_location('notification_cycle', Path(__file__).with_name('release-cycle.py'))
    cycle = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cycle)
    preservation = cycle.idf_preservation(request)
    after = sys.argv[1:] == ['--after']
    if sys.argv[1:] not in ([], ['--after']) or (after and preservation is None):
        raise ValueError('Controle final IDF hors perimetre')
    if preservation is not None:
        cycle.approved_public_nap_functions(request)
        cycle.require_access_request_selection(request, json.loads((Path(os.environ['PLAN']) / 'selection.json').read_text()))
    if request.get('initialAutomaticMailEnabled') is not False and preservation is None:
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
    if preservation is not None:
        check_idf_preservation(document, preservation, Path(os.environ['PLAN']), after=after)
    elif not disabled(document):
        raise ValueError('Mails automatiques actifs : publication interrompue, desactivation nationale requise')
    maintenance = cycle.notification_maintenance(request)
    if maintenance is not None:
        check_pause_witness(document, maintenance, Path(os.environ['PLAN']) / 'notification-pause-before.json')
    scheduler_query = urllib.request.Request('https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/firebase-schedule-closeDueEngagementCompetitions-europe-west1',
                                            headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(scheduler_query, timeout=30) as response:
            scheduler = json.load(response)
    except Exception:
        raise ValueError('Controle de la planification indisponible') from None
    if scheduler.get('schedule') != '*/5 * * * *' or scheduler.get('timeZone') != 'Europe/Paris':
        raise ValueError('Planification de cloture differente du perimetre approuve')
    if preservation is not None and scheduler.get('state') != 'ENABLED':
        raise ValueError('Scheduler IDF non actif')
    fingerprint = scheduler_fingerprint(scheduler)
    if preservation is not None and preservation.get('schedulerSha256') and fingerprint['sha256'] != preservation['schedulerSha256']:
        raise ValueError('Scheduler complet different du bilan tous clubs')
    witness = Path(os.environ['PLAN']) / 'notification-scheduler-before.json'
    if witness.exists():
        if json.loads(witness.read_text()) != fingerprint:
            raise ValueError('Planification modifiee depuis la sauvegarde : publication interrompue')
    else:
        if after:
            raise ValueError('Temoin scheduler initial absent')
        witness.write_text(json.dumps(fingerprint))
    print(('Tous clubs actifs inchanges ; aucune ecriture.' if preservation.get('scope') == 'all' else 'IDF actif inchange ; aucune ecriture.') if preservation is not None else
          'Mails automatiques desactives ; une lecture technique, aucune ecriture.')


def scheduler_fingerprint(value):
    fields = ['name', 'schedule', 'timeZone', 'state', 'retryConfig', 'attemptDeadline', 'httpTarget', 'pubsubTarget', 'appEngineHttpTarget']
    configuration = {key: value[key] for key in fields if key in value}
    return {'schema': 1, 'sha256': hashlib.sha256(json.dumps(configuration, sort_keys=True).encode()).hexdigest()}


if __name__ == '__main__':
    main()
