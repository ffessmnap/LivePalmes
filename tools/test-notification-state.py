"""Read-only metadata witness for the explicitly approved four-function TEST refresh."""
import importlib.util
import os
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location('cycle', Path(__file__).with_name('release-cycle.py'))
cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cycle)
NAMES = {'closeDueEngagementCompetitions', 'disableCompetitionEmailNotifications',
         'processNapCompetitionNotifications', 'updateCurrentEmailNotificationPreferences'}
PILOT_NAMES = {'getEngagementAutomaticMailControl', 'updateEngagementAutomaticMailControl',
               'notifyEngagementCompetitionDocuments', 'listEngagementCompetitionMailJobs',
               'prepareEngagementOpeningNotificationEmails', 'prepareEngagementClubRecapEmails',
               'sendEngagementPreparedEmails', 'processNapCompetitionNotifications', 'closeDueEngagementCompetitions'}


def unchanged(before, after, candidate):
    names = PILOT_NAMES if os.environ.get('NOTIFICATION_PILOT_IDF') == 'true' else NAMES
    old = {f['name']: f for f in before['functions']}
    current = {f['name']: f for f in after['functions']}
    cycle.require(set(old) == set(current), 'Inventaire TEST modifie')
    cycle.require(all(current[name] == value for name, value in old.items()
                      if name.split('/')[-1] not in names), 'Traitement TEST hors selection modifie')
    selected = [f for f in current.values() if f['name'].split('/')[-1] in names]
    cycle.require(len(selected) == len(names) and all(f['state'] == 'ACTIVE' and f['commit'] == candidate
                  for f in selected), 'Traitements TEST selectionnes non confirmes')


if __name__ == '__main__':
    cycle.require(os.environ.get('TARGET_FIREBASE_PROJECT') == 'livepalmes-test'
                  and os.environ.get('NOTIFICATION_FINAL_CHECK') == 'true'
                  and os.environ.get('GITHUB_REF') == 'refs/heads/main', 'Perimetre TEST requis')
    cycle.require(os.environ.get('NOTIFICATION_PILOT_IDF') in {None, 'false', 'true'}, 'Perimetre pilote invalide')
    mode, filename = sys.argv[1:]
    cycle.require(mode in {'before', 'after'}, 'Mode interdit')
    state = cycle.snapshot('livepalmes-test')
    if mode == 'before':
        cycle.write(filename, state)
    else:
        unchanged(cycle.read(filename), state, os.environ['CANDIDATE_SHA'])
        print('Inventaire TEST stable : seuls les traitements autorises ont ete actualises.')
