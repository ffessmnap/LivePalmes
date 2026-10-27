"""Reusable code releases. No Firestore, business Function or data migration calls."""
import hashlib
from functools import lru_cache
from types import SimpleNamespace
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SHA = re.compile(r"[0-9a-f]{40}\Z")
PROJECTS = {'livepalmes', 'livepalmes-test'}
PDF_FUNCTIONS = {'prepareEngagementClubRecapEmails', 'closeDueEngagementCompetitions'}
_group_spec = importlib.util.spec_from_file_location('grouped_policy', ROOT / 'tools/grouped-publication-policy.py')
grouped = importlib.util.module_from_spec(_group_spec)
_group_spec.loader.exec_module(grouped)
_bcc_spec = importlib.util.spec_from_file_location('bcc_policy', ROOT / 'tools/bcc-publication-policy.py')
bcc = importlib.util.module_from_spec(_bcc_spec)
_bcc_spec.loader.exec_module(bcc)


def approved_bcc_functions(value):
    return bcc.for_request(value).approved(value)



def approved_grouped_functions(value):
    return grouped.approved(value)



def approved_pdf_functions(value):
    names = value.get('additionalPdfFunctions', [])
    require(isinstance(names, list) and len(names) == len(set(names)) and set(names).issubset(PDF_FUNCTIONS), 'Extension PDF interdite')
    require(not names or (set(names) == PDF_FUNCTIONS and value.get('additionalPdfApproval')), 'Accord specifique des deux traitements PDF requis')
    return names


DTN_FUNCTIONS = {'resumePerformancePublicationJobs', 'resolveEngagementSwimmerChangeRequest'}


def approved_dtn_functions(value):
    names = value.get('additionalDtnFunctions', [])
    require(isinstance(names, list) and all(isinstance(n, str) for n in names) and len(names) == len(set(names)) and set(names).issubset(DTN_FUNCTIONS), 'Extension DTN interdite')
    require(not names or (set(names) == DTN_FUNCTIONS and value.get('additionalDtnApproval')), 'Accord specifique des deux traitements DTN requis')
    return names


def approved_native_identity_secret(value):
    approval = value.get('nativeIdentityNapSecretApproval')
    if approval is None:
        return False
    require(isinstance(approval, str) and bool(approval.strip())
            and 'resolveEngagementSwimmerChangeRequest' in approved_dtn_functions(value),
            'Accord specifique de liaison NAP pour les corrections requis')
    return True


def approved_extra_functions(value):
    approved_native_identity_secret(value)
    names = approved_pdf_functions(value) + approved_dtn_functions(value) + approved_notification_functions(value) + approved_public_nap_functions(value) + approved_access_request_functions(value) + approved_club_directory_functions(value) + approved_grouped_functions(value) + approved_bcc_functions(value)
    require(len(names) == len(set(names)), 'Extensions de publication superposees')
    return names


PUBLIC_READER_IDF_PAIR = ('21d0fb8541d70c16cda397f2238820ec64cfc636', '63652ce4b8588fb1906245fbd5f6ac4c0d8c4389')
PUBLIC_READER_IDF_HASHES = ('9d936ce26b0f14b55cb2b2818e752cfd23b66da3fb6e41c53b3da8566ac01552', '161ad9f1b8cf4faa7df14427e3ee47f88edbe7b62263d34ee8b336742ba53e59')


def public_reader_idf_preservation(value):
    preservation = value.get('publicReaderIdfPreservation')
    if preservation is None:
        return None
    require((value.get('productionCommit'), value.get('candidate')) == PUBLIC_READER_IDF_PAIR
            and value.get('additionalPublicNapFunctions') == ['readNapPublicSwimmer']
            and value.get('initialAutomaticMailEnabled') is True
            and isinstance(preservation, dict) and set(preservation) == {'scope', 'revision', 'approval'}
            and preservation.get('scope') == 'idf' and type(preservation.get('revision')) is int
            and preservation['revision'] == 4
            and isinstance(preservation.get('approval'), str) and bool(preservation['approval'].strip())
            and not any(value.get(key) for key in ['additionalPdfFunctions', 'additionalDtnFunctions',
                'additionalNotificationFunctions', 'additionalAccessRequestFunctions', 'notificationMaintenancePlan',
                'notificationPilotIdfApproval', 'nativeIdentityNapSecretApproval', 'productionHomeRouting',
                'productionStaticCleanup', 'testEquivalentCandidate', 'clubDirectoryIdfPreservation',
                'additionalClubDirectoryFunctions']),
            'Conservation IDF reservee a la paire et au seul lecteur public approuves')
    return preservation


CLUB_DIRECTORY_PAIR = ('63652ce4b8588fb1906245fbd5f6ac4c0d8c4389', 'a15be36778cf62f1936f1e0b35bf873733997d5a')
CLUB_DIRECTORY_HASHES = {
    'requestEngagementClubSwimmerChange': ('0612e97ddf6e18d3f8096a9704691aaf823a4502440281f10074d56d17d82469', '92cecdba73d393139932abb17693d2e7829149211f52b40dd7d1c92b067ebc03'),
    'listEngagementSwimmerChangeRequests': ('d4a41566804def3749db04d5871a3cff2463feea35f7608ab243c75c6e43b4a0', 'd42c6ecbd319a5924b7281aa80c03e84e2ff02415561f404b13aea114cf4dac8'),
    'resolveEngagementSwimmerChangeRequest': ('b7679a41a2b1a9151acd48ef5c91bd85b902cbc8b65dbf3e7898505eca95209e', 'ed8ef83ba164424f40977286604c3c52ca421b19e62df5b92dbf88bfc732fc8f'),
}


def club_directory_idf_preservation(value):
    preservation = value.get('clubDirectoryIdfPreservation')
    names = value.get('additionalClubDirectoryFunctions', [])
    if preservation is None and not names:
        return None
    require((value.get('productionCommit'), value.get('candidate')) == CLUB_DIRECTORY_PAIR
            and isinstance(names, list) and len(names) == 3 and set(names) == set(CLUB_DIRECTORY_HASHES)
            and value.get('initialAutomaticMailEnabled') is True
            and isinstance(preservation, dict) and set(preservation) == {'scope', 'revision', 'approval'}
            and preservation.get('scope') == 'idf' and type(preservation.get('revision')) is int
            and preservation['revision'] == 4
            and isinstance(preservation.get('approval'), str) and bool(preservation['approval'].strip())
            and not any(value.get(key) for key in ['additionalPdfFunctions', 'additionalDtnFunctions',
                'additionalNotificationFunctions', 'additionalAccessRequestFunctions', 'additionalPublicNapFunctions',
                'publicReaderIdfPreservation', 'notificationMaintenancePlan', 'notificationPilotIdfApproval',
                'nativeIdentityNapSecretApproval', 'productionHomeRouting', 'productionStaticCleanup', 'testEquivalentCandidate']),
            'Repertoires club reserves a la paire, aux trois fonctions et a IDF actif approuves')
    return preservation


def approved_club_directory_functions(value):
    return list(CLUB_DIRECTORY_HASHES) if club_directory_idf_preservation(value) is not None else []


def idf_preservation(value):
    # Existing reader authorization stays closed; this is a second, separately approved pair.
    return grouped.preservation(value) or club_directory_idf_preservation(value) or public_reader_idf_preservation(value)


def approved_public_nap_functions(value):
    names = value.get('additionalPublicNapFunctions', [])
    require(isinstance(names, list) and (names == [] or names == ['readNapPublicSwimmer']), 'Extension publique NAP interdite')
    require(not names or (isinstance(value.get('additionalPublicNapApproval'), str)
            and bool(value['additionalPublicNapApproval'].strip())
            and (value.get('initialAutomaticMailEnabled') is False or public_reader_idf_preservation(value) is not None)),
            'Accord lecteur public NAP avec mails desactives requis')
    public_reader_idf_preservation(value)
    return names


NOTIFICATION_FUNCTIONS = {'updateCurrentEmailNotificationPreferences', 'disableCompetitionEmailNotifications',
    'notifyEngagementCompetitionDocuments', 'listEngagementCompetitionMailJobs',
    'prepareEngagementOpeningNotificationEmails', 'prepareEngagementClubRecapEmails',
    'sendEngagementPreparedEmails', 'processNapCompetitionNotifications', 'closeDueEngagementCompetitions'}
IDF_NOTIFICATION_FUNCTIONS = NOTIFICATION_FUNCTIONS - {'updateCurrentEmailNotificationPreferences', 'disableCompetitionEmailNotifications'}
IDF_NOTIFICATION_PAIR = ('f5e9d2067d1a73de9fad8ca29cfbfa13db97da16', '1b30062b9a68a23ac0f257a1fdc7da415d9614af')
IDF_MAILS_PAIR = ('1b30062b9a68a23ac0f257a1fdc7da415d9614af', '32d70fc20cc60ca971e9229d706aa8269556f1af')


def notification_maintenance(value):
    maintenance = value.get('notificationMaintenancePlan')
    if maintenance is None:
        return None
    require((value.get('productionCommit'), value.get('candidate')) == IDF_MAILS_PAIR
            and isinstance(maintenance, dict)
            and set(maintenance) == {'scope', 'observedRevision', 'pauseRevision', 'resumeRevision', 'noReplay', 'approval'}
            and maintenance.get('scope') == 'idf' and maintenance.get('noReplay') is True
            and all(type(maintenance.get(key)) is int for key in ['observedRevision', 'pauseRevision', 'resumeRevision'])
            and maintenance['observedRevision'] >= 0
            and maintenance.get('pauseRevision') == maintenance['observedRevision'] + 1
            and maintenance.get('resumeRevision') == maintenance['observedRevision'] + 2
            and isinstance(maintenance.get('approval'), str) and bool(maintenance['approval'].strip()),
            'Maintenance IDF hors paire ou transitions approuvees')
    return maintenance


def approved_notification_functions(value):
    names = value.get('additionalNotificationFunctions', [])
    require(isinstance(names, list) and all(isinstance(n, str) for n in names) and len(names) == len(set(names))
            and set(names).issubset(NOTIFICATION_FUNCTIONS), 'Extension notifications interdite')
    pilot = value.get('notificationPilotIdfApproval')
    if pilot is not None:
        require(isinstance(pilot, str) and bool(pilot.strip())
                and (value.get('productionCommit'), value.get('candidate')) in {IDF_NOTIFICATION_PAIR, IDF_MAILS_PAIR}
                and set(names) == IDF_NOTIFICATION_FUNCTIONS,
                'Pilote IDF hors paire ou perimetre approuve')
        if (value.get('productionCommit'), value.get('candidate')) == IDF_MAILS_PAIR:
            require(notification_maintenance(value) is not None, 'Plan de coupure/remise IDF requis')
    if value.get('notificationMaintenancePlan') is not None:
        require(pilot is not None, 'Maintenance reservee au pilote IDF explicite')
        notification_maintenance(value)
    expected = IDF_NOTIFICATION_FUNCTIONS if pilot is not None else NOTIFICATION_FUNCTIONS
    require(not names or (set(names) == expected and isinstance(value.get('additionalNotificationApproval'), str)
            and bool(value['additionalNotificationApproval'].strip()) and value.get('initialAutomaticMailEnabled') is False),
            'Accord specifique notifications avec mails desactives requis')
    return names


ACCESS_REQUEST_FUNCTIONS = {'submitEngagementAccessRequest', 'resolveEngagementAccessRequest'}
ACCESS_REQUEST_SECRETS = ['LIVEPALMES_NAP_PASSWORD', 'LIVEPALMES_SMTP_HOST', 'LIVEPALMES_SMTP_PORT',
    'LIVEPALMES_SMTP_USER', 'LIVEPALMES_SMTP_PASS', 'LIVEPALMES_SMTP_SECURE', 'LIVEPALMES_MAIL_FROM']


def approved_access_request_functions(value):
    names = value.get('additionalAccessRequestFunctions', [])
    require(isinstance(names, list) and all(isinstance(n, str) for n in names)
            and len(names) == len(set(names)) and set(names).issubset(ACCESS_REQUEST_FUNCTIONS), 'Extension demandes interdite')
    require(not names or (set(names) == ACCESS_REQUEST_FUNCTIONS
            and isinstance(value.get('additionalAccessRequestApproval'), str)
            and bool(value['additionalAccessRequestApproval'].strip())
            and value.get('initialAutomaticMailEnabled') is False
            and not any(value.get(key) for key in ['additionalPdfFunctions', 'additionalDtnFunctions',
                        'additionalNotificationFunctions', 'additionalPublicNapFunctions'])),
            'Accord exclusif des deux demandes avec mails desactives requis')
    return names


def require_access_request_selection(request, selected):
    bcc.for_request(request).selection(request, selected)
    grouped.selection(request, selected)
    club = approved_club_directory_functions(request)
    require(not club or (len(selected) == 3 and set(selected) == set(club)),
            'Repertoires club : seules les trois fonctions sont autorisees')
    names = approved_access_request_functions(request)
    require(not names or set(selected) == set(names), 'Publication demandes : seules les deux fonctions sont autorisees')
    if public_reader_idf_preservation(request) is not None:
        require(selected == ['readNapPublicSwimmer'], 'Conservation IDF : seul le lecteur public existant est autorise')


def require(value, message):
    if not value:
        raise ValueError(message)


def run(args, cwd=None):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def git(*args):
    return run(['git', *args], ROOT)


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def output(**values):
    with open(os.environ['GITHUB_OUTPUT'], 'a') as file:
        for key, value in values.items():
            require('\n' not in str(value), 'Sortie invalide')
            file.write(f'{key}={value}\n')


def safe_functions(root, project='livepalmes'):
    require(project in PROJECTS, 'Projet interdit')
    return json.loads(run(['node', '-e', 'const {ALL_SAFE_LOTS,activeLotFunctions,TEST_NON_MAIL_FUNCTIONS=[]}=require(process.argv[1]);console.log(JSON.stringify(ALL_SAFE_LOTS.flatMap(activeLotFunctions).concat(process.argv[2]==="livepalmes-test"?TEST_NON_MAIL_FUNCTIONS:[])))', str(Path(root).resolve() / 'tools/firebase-test-backend-lots.js'), project]))


@lru_cache(maxsize=64)
def backend_fingerprints(sha):
    require(isinstance(sha, str) and SHA.fullmatch(sha), 'Commit backend absent')
    return json.loads(run(['node', str(ROOT / 'tools/release-function-fingerprints.js'), str(ROOT), sha]))['functions']


@lru_cache(maxsize=64)
def test_backend_fingerprints(sha):
    require(isinstance(sha, str) and SHA.fullmatch(sha), 'Commit backend TEST absent')
    return json.loads(run(['node', str(ROOT / 'tools/release-test-function-fingerprints.js'), str(ROOT), sha]))['functions']


@lru_cache(maxsize=64)
def production_selection_fingerprints(sha):
    require(isinstance(sha, str) and SHA.fullmatch(sha), 'Commit backend PROD absent')
    return json.loads(run(['node', str(ROOT / 'tools/release-production-function-fingerprints.js'), str(ROOT), sha]))['functions']


def needs_function(function, name, candidate, *, project='livepalmes'):
    require(project in PROJECTS, 'Projet de comparaison interdit')
    fingerprints = test_backend_fingerprints if project == 'livepalmes-test' else production_selection_fingerprints
    if not function or function.get('state') != 'ACTIVE':
        return True
    old = function.get('commit')
    if not old or not SHA.fullmatch(old):
        return True
    try:
        previous = fingerprints(old)
    except (ValueError, subprocess.CalledProcessError):
        return True  # Unknown provenance: republish; never guess equivalence.
    desired = fingerprints(candidate)
    require(name in desired, 'Export candidat absent: ' + name)
    return previous.get(name) != desired[name]


def latest_run(workflow, skip=0, reuse_revisions=False):
    require(not reuse_revisions or workflow == 'livepalmes-test-common.yml', 'Reutilisation par revision reservee aux preuves TEST')
    runs = gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/workflows/{workflow}/runs?branch=main&event=workflow_dispatch&per_page=20')['workflow_runs']
    runs = [r for r in runs if r['id'] != int(skip)]
    if workflow == 'livepalmes-test-common.yml':
        runs = [r for r in runs if r.get('display_title') != 'Verification TEST sans deploiement']
        cancelled = [r['id'] for r in runs if r.get('status') == 'completed' and r.get('conclusion') == 'cancelled']
        if cancelled:
            print(f'Lancements TEST annules exclus des preuves : {cancelled}; comparaison exacte des revisions conservee')
        runs = [r for r in runs if r['id'] not in cancelled]
    if reuse_revisions:
        # An unsuccessful run is never evidence. Its unchanged functions may
        # still match an earlier successful proof exactly; changed revisions
        # remain untrusted in matching_functions and block Hosting-only mode.
        runs = [r for r in runs if r.get('status') == 'completed' and r.get('conclusion') == 'success']
        # A queued obsolete run may only coordinate a successor, without publishing.
        # Skip only an explicitly skipped deployment job; never treat it as proof.
        while runs:
            jobs = gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{runs[0]["id"]}/jobs?per_page=100').get('jobs', [])
            if not any(j.get('name') == 'test' and j.get('conclusion') == 'skipped' for j in jobs):
                break
            print(f'Lancement TEST {runs[0]["id"]} de coordination sans publication exclu des preuves')
            runs.pop(0)
    require(runs, 'Aucune publication de reference')
    current = runs[0]
    require(current['status'] == 'completed' and current['conclusion'] == 'success', 'Derniere publication non terminee ou en echec : examen requis')
    return current['id']


def matching_functions(proof, current):
    """Trust revisions individually; a Hosting or another Function change is unrelated."""
    recorded = {f['name']: f for f in proof.get('state', {}).get('functions', [])}
    return {f['name'] for f in current['functions']
            if f.get('revision') and f.get('updateTime') and f.get('commit')
            and f.get('state') == 'ACTIVE' and recorded.get(f['name']) == f}


def targeted_test_evidence(directory, current):
    trusted = set()
    repo = os.environ['GITHUB_REPOSITORY']
    runs = gh(f'repos/{repo}/actions/workflows/livepalmes-test-backend.yml/runs?branch=main&per_page=20')['workflow_runs']
    for info in runs:
        if info['status'] != 'completed' or info['conclusion'] != 'success' or info.get('run_attempt', 1) != 1:
            continue
        if not any(f.get('commit') == info['head_sha'] and f['name'] not in trusted for f in current['functions']):
            continue
        destination = Path(directory) / ('backend-' + str(info['id']))
        try:
            source = artifact(info['id'], 'test-backend-proof', destination, '.github/workflows/livepalmes-test-backend.yml')
            proof = read(destination / 'test-backend-proof.json')
            require(proof.get('schema') == 1 and proof.get('candidate') == source['head_sha'], 'Preuve backend invalide')
            require(all(f.get('commit') == proof['candidate'] for f in proof['state']['functions']), 'Commit backend non atteste')
            trusted.update(matching_functions(proof, current))
        except (ValueError, KeyError, subprocess.CalledProcessError, urllib.error.HTTPError) as error:
            print(f"Preuve backend {info['id']} non reutilisable : {error}")
    return trusted


def test_selection(directory, candidate):
    root = Path(directory)
    sha = os.environ['CANDIDATE_SHA']
    before = snapshot('livepalmes-test')
    trusted = set()
    try:
        previous = latest_run('livepalmes-test-common.yml', os.environ['GITHUB_RUN_ID'], reuse_revisions=True)
        artifact(previous, 'test-proof', root / 'previous-test', '.github/workflows/livepalmes-test-common.yml')
        trusted.update(matching_functions(read(root / 'previous-test/test-proof.json'), before))
    except (ValueError, subprocess.CalledProcessError, urllib.error.HTTPError) as error:
        print(f'Preuve commune non reutilisable : {error}')
    try:
        trusted.update(targeted_test_evidence(root, before))
    except (ValueError, subprocess.CalledProcessError, urllib.error.HTTPError) as error:
        print(f'Preuves ciblees non disponibles : {error}')
    safe = safe_functions(candidate, 'livepalmes-test')
    names = {f['name'].split('/')[-1]: f for f in before['functions']}
    selected, reasons = [], {}
    for name in safe:
        function = names.get(name)
        if not function or function['name'] not in trusted:
            reasons[name] = 'revision sans preuve concordante'
        elif needs_function(function, name, sha, project='livepalmes-test'):
            reasons[name] = 'code ou dependances differents'
        else:
            reasons[name] = 'revision prouvee, code et dependances equivalents'
        if reasons[name] != 'revision prouvee, code et dependances equivalents':
            selected.append(name)
        print(f'{name} : {reasons[name]}')
    write(root / 'test-before.json', before)
    write(root / 'test-selection.json', selected)
    write(root / 'test-selection-reasons.json', reasons)
    print(f'Functions TEST a publier : {len(selected)} / {len(safe)} ; revisions prouvees : {len(trusted)}.')
    print('Selection : ' + (', '.join(selected) or 'aucune'))
    require(os.environ.get('HOSTING_ONLY') != 'true' or not selected,
            'Hosting seul refuse : backend different ou sans preuve ; aucun deploiement autorise')
    output(backend=str(bool(selected)).lower())


def backend_proof(directory, selector):
    require(os.environ['TARGET_FIREBASE_PROJECT'] == 'livepalmes-test', 'Cible TEST requise')
    sha = os.environ['CANDIDATE_SHA']
    require(SHA.fullmatch(sha), 'Commit backend absent')
    selected = Path(selector).read_text().strip().split(',')
    require(selected and len(selected) == len(set(selected)), 'Selection backend invalide')
    state = snapshot('livepalmes-test')
    names = {f['name'].split('/')[-1]: f for f in state['functions']}
    require(all(name in names and names[name]['state'] == 'ACTIVE' and names[name]['commit'] == sha
                and names[name].get('revision') and names[name].get('updateTime') for name in selected),
            'Revision backend non confirmee')
    write(Path(directory) / 'test-backend-proof.json', {'schema': 1, 'candidate': sha,
          'state': {'functions': sorted([names[name] for name in selected], key=lambda f: f['name'])}})

def check_test(directory, candidate):
    root = Path(directory)
    before = {f['name']: f for f in read(root / 'test-before.json')['functions']}
    after = {f['name']: f for f in snapshot('livepalmes-test')['functions']}
    selected = set(read(root / 'test-selection.json'))
    full_selected = {'projects/livepalmes-test/locations/europe-west1/functions/' + n for n in selected}
    require(set(after) == set(before) | full_selected, 'Inventaire TEST inattendu')
    require(all(after.get(n) == f for n, f in before.items() if n not in full_selected), 'Function TEST non selectionnee modifiee')
    names = {n.split('/')[-1]: f for n, f in after.items()}
    require(all(not needs_function(names.get(n), n, os.environ['CANDIDATE_SHA'], project='livepalmes-test') for n in safe_functions(candidate, 'livepalmes-test')), 'Backend TEST incomplet')


TEST_TOP_FILES = {
    'performances/public/data/performance-public/tops/200BI/M-S.json': '200020e546ec3a58310073c559c7977b82460a8f',
    'performances/public/data/performance-public/tops-preview/200BI/M-S.json': '1cc085edcfc90a6e83e814be05cf300aa8217cdd',
}


TOP_PREFIXES = tuple('performances/public/data/' + directory + '/' + kind + '/'
                     for directory in ('performance-public', 'performance-public-firestore')
                     for kind in ('tops', 'tops-preview'))


def ignored_top_paths(paths, candidate):
    """Exclude only TOP files demonstrably absent from every Hosting payload."""
    tops = [p for p in paths if p.startswith(TOP_PREFIXES)]
    if not tops:
        return []
    config = json.loads(git('show', candidate + ':firebase.json'))
    hosting = config.get('hosting', [])
    targets = hosting if isinstance(hosting, list) else [hosting]
    return [p for p in tops if targets and all(isinstance(t, dict) and t.get('public') == '.'
            and any(p.startswith(prefix) and prefix + '**' in t.get('ignore', [])
                    for prefix in TOP_PREFIXES) for t in targets)]


RECORDS_CLEANUP_BASE = '0de982df25eb51f4957497f905d7b05dbf6c173e'
RECORDS_STATIC_PATH = 'performances/public/data/records-data.js'


def approved_records_cleanup_paths(paths, candidate):
    """Antoine, 12 October: TEST-only removal of one obsolete snapshot/header."""
    relevant = set(paths) & {'firebase.json', RECORDS_STATIC_PATH}
    if not relevant:
        return set()
    require(not git('ls-tree', candidate, '--', RECORDS_STATIC_PATH).strip(),
            'La copie RF/MPF doit etre absente, jamais remplacee')
    expected = json.loads(git('show', RECORDS_CLEANUP_BASE + ':firebase.json'))
    header = {'source': '/' + RECORDS_STATIC_PATH, 'headers': [
        {'key': 'Cache-Control', 'value': 'public, max-age=300, stale-while-revalidate=86400'}]}
    targets = expected['hosting'] if isinstance(expected['hosting'], list) else [expected['hosting']]
    removed = sum(t.get('headers', []).count(header) for t in targets)
    require(removed == 1, 'En-tete historique RF/MPF inattendu')
    for target in targets:
        target['headers'] = [h for h in target.get('headers', []) if h != header]
    require(json.loads(git('show', candidate + ':firebase.json')) == expected,
            'Configuration differente du seul retrait cache RF/MPF autorise')
    for page in ('performances/records.html', 'performances/mpf.html', 'performances/nageur.html',
                 'pilotage-livepalmes.html', 'speaker.html', 'bureau-perf.html', 'series-public.html'):
        require('data/records-data.js' not in git('show', candidate + ':' + page),
                'Page encore dependante de la copie retiree: ' + page)
    return relevant


PUBLIC_EXPORT_CLEANUP_BASE = '8155fb1d83cbfcb17b9b462245165e2f1a0791de'
PUBLIC_EXPORT_PREFIXES = tuple('performances/public/data/performance-public/' + name + '/'
                               for name in ('tops', 'tops-preview', 'swimmers', 'search', 'ids'))
PUBLIC_EXPORT_METADATA = {'performances/public/data/intranap-summary.js',
                          'performances/public/data/intranap-swimmers-index.js',
                          'performances/public/data/performance-public/manifest.json',
                          'performances/public/data/performance-public/version.js'}


def approved_public_export_cleanup_paths(paths, candidate):
    """Antoine, 12 October: deletion only of the audited historical public exports."""
    relevant = {p for p in paths if p in PUBLIC_EXPORT_METADATA or p.startswith(PUBLIC_EXPORT_PREFIXES)}
    if not relevant:
        return set()
    roots = list(PUBLIC_EXPORT_PREFIXES) + sorted(PUBLIC_EXPORT_METADATA)
    original = set(git('ls-tree', '-r', '--name-only', PUBLIC_EXPORT_CLEANUP_BASE, '--', *roots).splitlines())
    require(relevant <= original, 'Export hors inventaire autorise')
    require(not git('ls-tree', '-r', '--name-only', candidate, '--', *roots).strip(),
            'Les exports doivent etre retires, jamais remplaces')
    require(json.loads(git('show', candidate + ':firebase.json')) ==
            json.loads(git('show', PUBLIC_EXPORT_CLEANUP_BASE + ':firebase.json')),
            'Configuration Hosting changee pendant le retrait des exports')
    for page in ('performances/tops.html', 'performances/nageur.html'):
        source = git('show', candidate + ':' + page)
        require('intranap-summary.js' not in source and 'performance-public/version.js' not in source
                and 'public/reference.js' in source, 'Page non decouplee des anciens exports')
    return relevant


def server_home_routing_only(before, after):
    expected = json.loads(json.dumps(before))
    hosting = expected['hosting']
    require(isinstance(hosting, dict), 'Cible Hosting unique requise pour accueil serveur')
    routes = [{'source': source, 'function': {'functionId': 'readNapPublicSwimmer', 'region': 'europe-west1'}}
              for source in ('/', '/index.html')]
    hosting['rewrites'] = routes + hosting.get('rewrites', [])
    hosting['ignore'] = ['index.html'] + hosting.get('ignore', [])
    require(after == expected, 'Seul le routage exact accueil serveur est autorise')


def approved_production_home_routing(value, paths):
    """Preparation approved 19 October; no general configuration exception."""
    approval = value.get('productionHomeRouting')
    if approval is None:
        return set()
    require(isinstance(approval, dict) and set(approval) == {'approval'}
            and isinstance(approval['approval'], str) and bool(approval['approval'].strip()),
            'Accord borne accueil PROD requis')
    require(value['productionCommit'] == 'ac78b50759ca209cddaa15d374eb5e01dd926268'
            and value['candidate'] == '25ac21b69c8fd09c44399f1f65b3bd4e6a0e58bd',
            'Paire accueil PROD non revue')
    require('firebase.json' in paths and 'readNapPublicSwimmer' in approved_public_nap_functions(value),
            'Accueil PROD : configuration et lecteur public requis')
    server_home_routing_only(json.loads(git('show', value['productionCommit'] + ':firebase.json')),
                             json.loads(git('show', value['candidate'] + ':firebase.json')))
    return {'firebase.json'}


def classify_test(paths, approved_top_files=False, approved_records_cleanup=False, approved_public_export_cleanup=False, approved_home_routing=False):
    # Exact files authorized by Antoine on TEST, 5 October 2026.
    # Ordinary and production classification remain unchanged.
    allowed = set(ignored_top_paths(paths, 'HEAD'))
    if approved_home_routing and 'firebase.json' in paths:
        require(os.environ.get('TARGET_FIREBASE_PROJECT') == 'livepalmes-test', 'Routage accueil reserve a TEST')
        base = os.environ.get('BASE_SHA', '')
        require(SHA.fullmatch(base), 'Base exacte requise pour routage accueil')
        server_home_routing_only(json.loads(git('show', base + ':firebase.json')),
                                 json.loads(git('show', 'HEAD:firebase.json')))
        allowed.add('firebase.json')
    if approved_public_export_cleanup:
        allowed |= approved_public_export_cleanup_paths(paths, 'HEAD')
    if approved_records_cleanup:
        allowed |= approved_records_cleanup_paths(paths, 'HEAD')
    explicitly_approved = set(TEST_TOP_FILES).intersection(paths) - allowed if approved_top_files else set()
    for path in sorted(explicitly_approved):
        require(git('rev-parse', 'HEAD:' + path) == TEST_TOP_FILES[path], 'Fichier TOP different de la version autorisee: ' + path)
    return classify([path for path in paths if path not in allowed | explicitly_approved])


def classify(paths):
    blocked = [p for p in paths if p in {'firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json', 'storage.rules'} or p.startswith(('performances/public/data/', 'archives/', 'sources/', 'sauvegardes/')) or p.endswith('.rules')]
    require(not blocked, 'Perimetre specifique requis (configuration/regles/index/donnees): ' + ', '.join(blocked))
    application = [p for p in paths if not p.startswith(('.github/', 'docs/', 'tools/', 'tests/')) and p not in {'AGENTS.MD', 'AGENTS.md', 'README.md', 'CHANGELOG.md'}]
    return application, any(p.startswith('functions/') for p in application)


def validate_request(value, paths):
    require(value.get('schema') == 1, 'Schema inconnu')
    for key in ['candidate', 'productionCommit']:
        require(isinstance(value.get(key), str) and SHA.fullmatch(value[key]), 'SHA complet requis: ' + key)
    require(re.fullmatch(r'sites/livepalmes/versions/[A-Za-z0-9_-]+', value.get('productionHosting', '')), 'Version Hosting PROD requise')
    require(isinstance(value.get('testRun'), int) and value['testRun'] > 0, 'Preuve TEST requise')
    path_set = set(paths)
    ignored = set(ignored_top_paths(paths, value['candidate']))
    cleanup = value.get('productionStaticCleanup')
    if cleanup is not None:
        require(isinstance(cleanup, dict) and set(cleanup) == {'records', 'publicExports', 'approval'}
                and cleanup['records'] is True and cleanup['publicExports'] is True
                and isinstance(cleanup['approval'], str) and bool(cleanup['approval'].strip()),
                'Accord borne de nettoyage statique requis')
        # These checks deliberately remain separate from classify(): no ordinary
        # release acquires a general configuration/generated-data exception.
        ignored |= approved_records_cleanup_paths(paths, value['candidate'])
        ignored |= approved_public_export_cleanup_paths(paths, value['candidate'])
    home_routing = approved_production_home_routing(value, paths)
    application, backend = classify([p for p in paths if p not in ignored | home_routing])
    # The exact configuration still needs an explicitly validated change row.
    application += sorted(home_routing)
    extra = approved_extra_functions(value)
    backend = backend or bool(approved_public_nap_functions(value))
    require(not extra or backend, 'Extension PDF sans changement backend')
    covered = set()
    require(isinstance(value.get('changes'), list) and value['changes'], 'Bilan des evolutions requis')
    for change in value['changes']:
        require(change.get('status') == 'validated' and change.get('validation') and change.get('title'), 'Evolution non validee ou preuve utilisateur absente')
        require(isinstance(change.get('paths'), list) and all(p in path_set for p in change['paths']), 'Chemins du bilan inexacts')
        covered.update(change['paths'])
    require(set(application).issubset(covered), 'Fichiers applicatifs sans validation: ' + ', '.join(sorted(set(application) - covered)))
    if backend:
        require(value.get('excludedBackendReview'), 'Revue des impacts email/schedulers requis pour le backend partage')
        review = value.get('excludedBackendEvidence')
        require(isinstance(review, dict) and set(review) == {'schema', 'candidate', 'productionRun', 'suite', 'functions'}
                and review['schema'] == 1 and review['candidate'] == value['candidate']
                and isinstance(review['productionRun'], int) and review['productionRun'] > 0
                and review['suite'] == 'retained-calendar-consumers-v1'
                and isinstance(review['functions'], list), 'Preuve structuree des exclusions backend requise')
        names = set()
        for row in review['functions']:
            require(isinstance(row, dict) and set(row) == {'name', 'commit', 'revision', 'before', 'after', 'reason'}
                    and isinstance(row['name'], str) and re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', row['name'])
                    and row['name'] not in names and SHA.fullmatch(str(row['commit']))
                    and isinstance(row['revision'], str) and bool(row['revision'])
                    and all(re.fullmatch(r'[0-9a-f]{64}', str(row[k])) for k in ['before', 'after'])
                    and isinstance(row['reason'], str) and bool(row['reason'].strip()),
                    'Ligne de revue backend invalide')
            names.add(row['name'])
    return backend


def prepare_request(request_path, directory):
    value = read(request_path)
    for key in ['candidate', 'productionCommit']:
        require(SHA.fullmatch(str(value.get(key, ''))), 'SHA complet requis')
        require(git('rev-parse', value[key] + '^{commit}') == value[key], 'Commit absent')
    subprocess.run(['git', 'merge-base', '--is-ancestor', value['productionCommit'], value['candidate']], cwd=ROOT, check=True)
    subprocess.run(['git', 'merge-base', '--is-ancestor', value['candidate'], 'HEAD'], cwd=ROOT, check=True)
    paths = git('diff', '--name-only', '--no-renames', value['productionCommit'], value['candidate']).splitlines()
    backend = validate_request(value, paths)
    if approved_bcc_functions(value) and value.get('resolveBccProof') is True and value.get('testBackendRuns') == []:
        run_id = latest_run('livepalmes-test-notifications-reconcile.yml')
        proof_dir = Path(directory) / 'resolved-bcc-proof'
        info = artifact(run_id, 'test-backend-proof', proof_dir, '.github/workflows/livepalmes-test-notifications-reconcile.yml')
        bcc.for_request(value).reconciled_proof(value, read(proof_dir / 'test-backend-proof.json'), info)
        value['testBackendRuns'] = [run_id]
    write(Path(directory) / 'request.json', value)
    write(Path(directory) / 'paths.json', paths)
    output(candidate=value['candidate'], backend=str(backend).lower())


def gh(endpoint):
    return json.loads(run(['gh', 'api', endpoint]))


def artifact(run_id, name, destination, workflow=None):
    require(str(run_id).isdigit(), 'Run invalide')
    repo = os.environ['GITHUB_REPOSITORY']
    run_info = gh(f'repos/{repo}/actions/runs/{run_id}')
    require(run_info['status'] == 'completed' and run_info['head_branch'] == 'main', 'Run source non termine ou hors main')
    if workflow:
        require(run_info['path'] == workflow and run_info['conclusion'] == 'success', 'Preuve de workflow incorrecte')
    # New reusable runs cannot be rerun: one immutable artifact of each kind per run.
    require(run_info.get('run_attempt', 1) == 1, 'Utiliser un nouveau run, pas une tentative ambigue')
    items = []
    for page in range(1, 21):
        batch = gh(f'repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100&page={page}')['artifacts']
        items.extend(batch)
        if len(batch) < 100:
            break
    candidates = [a for a in items if a['name'] == name and not a['expired']]
    require(len(candidates) == 1, 'Artefact absent, expire ou ambigu: ' + name)
    selected = candidates[0]
    metadata = gh(f'repos/{repo}/actions/artifacts/{selected["id"]}')
    require(metadata['workflow_run']['id'] == int(run_id) and metadata['name'] == name, 'Artefact hors run')
    digest = metadata.get('digest', '')
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', digest), 'Empreinte artefact absente')
    data = subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/artifacts/{selected["id"]}/zip'])
    require('sha256:' + hashlib.sha256(data).hexdigest() == digest, 'Artefact altere')
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(sum(i.file_size for i in archive.infolist()) < 1024**3, 'Artefact trop volumineux')
        for info in archive.infolist():
            require(not info.is_dir() and info.filename == Path(info.filename).name and info.filename not in {'.', '..'}, 'Chemin artefact invalide')
            (destination / info.filename).write_bytes(archive.read(info))
    return run_info


def api(project, path):
    require(project in PROJECTS, 'Projet interdit')
    credentials = read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    require(credentials['project_id'] == project, 'Compte du mauvais projet')
    if path == 'hosting':
        url = f'https://firebasehosting.googleapis.com/v1beta1/sites/{project}/releases?pageSize=1'
    else:
        require(path.startswith('functions'), 'Lecture non autorisee')
        url = f'https://cloudfunctions.googleapis.com/v2/projects/{project}/locations/-/functions?pageSize=100' + path[len('functions'):]
    token = run(['gcloud', 'auth', 'application-default', 'print-access-token'])
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=60) as response:
        return json.load(response)


def snapshot(project):
    from urllib.parse import quote
    functions, page = [], ''
    for _ in range(50):
        response = api(project, 'functions' + ('&pageToken=' + quote(page, safe='') if page else ''))
        require(not response.get('unreachable'), 'Inventaire incomplet')
        functions.extend(response.get('functions', []))
        page = response.get('nextPageToken')
        if not page:
            break
    else:
        raise ValueError('Pagination incomplete')
    releases = api(project, 'hosting')['releases']
    require(releases, 'Release absente')
    release = releases[0]
    return {'hosting': {'name': release['name'], 'version': release['version']['name'], 'message': release.get('message', '')}, 'functions': sorted([{'name': f['name'], 'revision': f.get('serviceConfig', {}).get('revision'), 'updateTime': f.get('updateTime'), 'state': f.get('state'), 'commit': f.get('labels', {}).get('livepalmes-commit')} for f in functions], key=lambda f: f['name'])}


def proof(directory):
    root = Path(directory)
    candidate = os.environ['CANDIDATE_SHA']
    state = snapshot('livepalmes-test')
    require(state['hosting']['message'] == f'LivePalmes {candidate} run {os.environ["GITHUB_RUN_ID"]}', 'Release TEST non confirmee')
    evidence = {'candidate': candidate, 'state': state}
    if os.environ.get('APPLICATION_CHECKS') == 'success':
        evidence['verification'] = {'schema': 1, 'candidate': candidate, 'suite': 'verify-livepalmes', 'result': 'success'}
    if os.environ.get('DTN_EXTENSION_CHECKS') == 'success':
        evidence['dtnExtensionVerification'] = {'schema': 1, 'candidate': candidate, 'suite': 'dtn-shared-invalidation', 'mode': 'offline-no-invocation', 'result': 'success', 'functions': sorted(DTN_FUNCTIONS)}
    write(root / 'test-proof.json', evidence)


def reusable_verification(evidence, candidate):
    # Only use inside an integrity-checked successful TEST/plan artifact, never
    # from a user-supplied request flag. Older proofs simply rerun the fast suite.
    return evidence.get('candidate') == candidate and evidence.get('verification') == {
        'schema': 1, 'candidate': candidate, 'suite': 'verify-livepalmes', 'result': 'success'}


def verify_test_candidate(request, evidence, info):
    require(evidence['candidate'] == info['head_sha'], 'Preuve TEST hors commit du run')
    if evidence['candidate'] == request['candidate']:
        return
    # Repair-only: keep the already-published application SHA, never substitute newer application code.
    equivalent = request.get('testEquivalentCandidate')
    require(approved_public_nap_functions(request) == ['readNapPublicSwimmer']
            and request['candidate'] == request['productionCommit']
            and isinstance(equivalent, str) and SHA.fullmatch(equivalent)
            and evidence['candidate'] == equivalent, 'Version TEST differente du candidat')
    subprocess.run(['git', 'merge-base', '--is-ancestor', request['candidate'], equivalent], cwd=ROOT, check=True)
    paths = git('diff', '--name-only', '--no-renames', request['candidate'], equivalent).splitlines()
    require(all(path.startswith(('.github/', 'docs/', 'tools/', 'tests/')) for path in paths),
            'Difference applicative interdite pour la preuve du lecteur NAP')
    require(backend_fingerprints(request['candidate']) == backend_fingerprints(equivalent),
            'Empreintes backend differentes pour la preuve du lecteur NAP')


def verify_test(directory, live=True):
    root = Path(directory)
    request = read(root / 'request.json')
    info = artifact(request['testRun'], 'test-proof', root / 'test', '.github/workflows/livepalmes-test-common.yml')
    evidence = read(root / 'test/test-proof.json')
    verify_test_candidate(request, evidence, info)
    # Compose explicitly requested, authenticated backend artifacts. Never infer a
    # revision from a label alone or silently accept unrelated TEST drift.
    runs = request.get('testBackendRuns', [])
    require(isinstance(runs, list) and len(runs) <= 20 and all(type(r) is int and r > 0 for r in runs)
            and len(runs) == len(set(runs)), 'Runs backend TEST invalides')
    functions = {f['name']: f for f in evidence['state'].get('functions', [])}
    limited_oct27 = bcc.for_request(request).contract().get('limitedOct27')
    updated = set()
    for run_id in runs:
        destination = root / ('test-targeted-' + str(run_id))
        bcc_reconciled = bool(approved_bcc_functions(request)) and not limited_oct27
        expected_workflow = '.github/workflows/livepalmes-test-notifications-reconcile.yml' if bcc_reconciled else '.github/workflows/livepalmes-test-backend.yml'
        source = artifact(run_id, 'test-backend-proof', destination, expected_workflow)
        targeted = read(destination / 'test-backend-proof.json')
        if limited_oct27:
            bcc.for_request(request).verify_targeted(request, targeted, source, root, SimpleNamespace(**globals()))
        elif bcc_reconciled:
            bcc.for_request(request).reconciled_proof(request, targeted, source)
            require(len(runs) == 1, 'Une seule reconciliation TEST CCI attendue')
            evidence['currentTestState'] = targeted['currentTestState']
        else:
            require(targeted.get('schema') == 1 and targeted.get('candidate') == source['head_sha']
                    and targeted['candidate'] == request['candidate'], 'Commit preuve ciblee TEST incompatible')
        rows = targeted.get('state', {}).get('functions', [])
        require(rows and len({f['name'] for f in rows}) == len(rows), 'Preuve ciblee vide ou dupliquee')
        for f in rows:
            require(f['name'] in functions and f['name'] not in updated
                    and f.get('state') == 'ACTIVE' and f.get('revision') and f.get('updateTime')
                    and f.get('commit') == targeted['candidate'], 'Revision ciblee TEST invalide')
            functions[f['name']] = f
            updated.add(f['name'])
        write(root / ('test-backend-' + str(run_id) + '.json'), targeted)
    if runs:
        evidence['state']['functions'] = sorted(functions.values(), key=lambda f: f['name'])
    if live:
        common_bcc = bool(approved_bcc_functions(request)) and bcc.for_request(request).contract().get('testProofMode') in ['common-exact','common-plus-targeted-sources']
        require(not common_bcc or not runs or limited_oct27, 'Preuve commune exacte CCI sans ajout cible attendu')
        expected_live = evidence['state'] if common_bcc or not approved_bcc_functions(request) else evidence['currentTestState']
        require(snapshot('livepalmes-test') == expected_live, 'TEST a change depuis sa publication : refaire le bilan')
    if os.environ.get('DTN_EXTENSION_CHECKS') == 'success':
        evidence['dtnExtensionVerification'] = {'schema': 1, 'candidate': candidate, 'suite': 'dtn-shared-invalidation', 'mode': 'offline-no-invocation', 'result': 'success', 'functions': sorted(DTN_FUNCTIONS)}
    write(root / 'test-proof.json', evidence)


def prepare_selection(directory, candidate):
    directory = Path(directory)
    request = read(directory / 'request.json')
    backend = validate_request(request, read(directory / 'paths.json'))
    selected = safe_functions(candidate) if backend else []
    if backend:
        state = read(directory / 'test-proof.json')['state']
        names = {f['name'].split('/')[-1]: f for f in state['functions']}
        require(all(not needs_function(names.get(n), n, request['candidate'], project='livepalmes-test') for n in selected), 'Backend TEST incomplet ou pas au code valide')
        extra = approved_extra_functions(request)
        notification = approved_notification_functions(request)
        require(all(not needs_function(names.get(n), n, request['candidate'], project='livepalmes-test') for n in notification + approved_public_nap_functions(request) + approved_access_request_functions(request) + approved_club_directory_functions(request) + approved_grouped_functions(request) + approved_bcc_functions(request)),
                'Notifications TEST absentes ou pas au code valide')
        if approved_dtn_functions(request):
            require(read(directory / 'test-proof.json').get('dtnExtensionVerification') == {'schema': 1, 'candidate': request['candidate'], 'suite': 'dtn-shared-invalidation', 'mode': 'offline-no-invocation', 'result': 'success', 'functions': sorted(DTN_FUNCTIONS)}, 'Preuve des dependances DTN absente ou incompatible')
        selected += [n for n in extra if n not in selected]
    write(directory / 'selection.json', selected)


def reviewed_blocked_production_run(root):
    """Recognize only the reviewed 12 October stop before any deployment."""
    request = read(root / 'request.json') if (root / 'request.json').exists() else {}
    if grouped.all_mail_preservation(request) is not None:
        approved_grouped_functions(request)
        return grouped.review_blocked_attempt(root, git, gh, artifact, latest_run)
    reference = request.get('productionBlockedAttemptEvidence')
    if reference is None:
        return latest_run('livepalmes-production-release.yml')
    require(isinstance(reference, dict) and set(reference) == {'path', 'sha256'}, 'Reference tentative invalide')
    path = reference['path']
    require(isinstance(path, str) and re.fullmatch(r'\.github/releases/evidence/[A-Za-z0-9_-]+\.json', path),
            'Chemin tentative interdit')
    raw = git('show', 'HEAD:' + path).encode() + b'\n'
    require(hashlib.sha256(raw).hexdigest() == reference['sha256'], 'Empreinte tentative invalide')
    proof = json.loads(raw)
    reviewed_sources = {
        '.github/workflows/livepalmes-production-release.yml': 'bb1aa5722abe032770d11c03e7f85d135930ea738164d0aa8ef619f1c52cb8ba',
        'tools/release-cycle.py': 'c7359059b4a62e9b1666611b700633993dd11d4781814c8db7d1a121b0fe221c',
    }
    require(proof.get('schema') == 1 and proof.get('project') == 'livepalmes'
            and proof.get('productionRun') == 38228508477 and proof.get('blockedRun') == 38306975865
            and proof.get('preparationRun') == 38306261031
            and proof.get('headSha') == 'c9dc7a5047e8311458cc162a0d25521a99bbffc5'
            and proof.get('sourceSha256') == reviewed_sources and proof.get('approval'), 'Tentative non revue')
    for filename, digest in reviewed_sources.items():
        source = git('show', proof['headSha'] + ':' + filename).encode() + b'\n'
        require(hashlib.sha256(source).hexdigest() == digest, 'Source tentative differente')
    repo = os.environ['GITHUB_REPOSITORY']
    runs = gh(f'repos/{repo}/actions/workflows/livepalmes-production-release.yml/runs?branch=main&event=workflow_dispatch&per_page=20')['workflow_runs']
    require(runs and runs[0]['id'] == proof['blockedRun'], 'Nouvelle tentative PROD : examen requis')
    info = gh(f'repos/{repo}/actions/runs/{proof["blockedRun"]}')
    require(info['path'] == '.github/workflows/livepalmes-production-release.yml'
            and info['head_branch'] == 'main' and info['head_sha'] == proof['headSha']
            and info['status'] == 'completed' and info['conclusion'] == 'failure'
            and info.get('run_attempt') == 1, 'Origine tentative invalide')
    jobs = gh(f'repos/{repo}/actions/runs/{proof["blockedRun"]}/jobs?per_page=100')
    require(jobs['total_count'] == 1 and len(jobs['jobs']) == 1, 'Jobs tentative ambigus')
    steps = jobs['jobs'][0]['steps']
    guards = [i for i, step in enumerate(steps) if step['name'] == 'Verifier que PROD correspond encore au bilan']
    require(len(guards) == 1, 'Controle de derive absent ou ambigu')
    guard = guards[0]
    require(steps[guard]['conclusion'] == 'failure' and all(s['conclusion'] == 'success' for s in steps[:guard])
            and any(s['name'] == 'Relire TEST avant toute ecriture PROD' for s in steps[:guard]),
            'Echec different du controle de derive')
    required_skipped = {
        'Verifier les mails desactives avant la bascule NAP', 'Sauvegarder le code PROD avant publication',
        'Chiffrer puis tester la sauvegarde', 'Ouvrir la sauvegarde initiale pour une reprise',
        'Associer les controles au commit', 'Preparer les Functions selectionnees',
        'Simuler les Functions par petits lots', 'Publier les Functions par petits lots',
        'Controler toutes les Functions et les exclusions', 'Confirmer les mails desactives avant Hosting',
        'Publier Hosting apres les controles', 'Controler les pages publiees', 'Relever Hosting apres la tentative',
    }
    tail = steps[guard + 1:]
    require(required_skipped.issubset({s['name'] for s in tail if s['conclusion'] == 'skipped'})
            and all(s['status'] == 'completed' for s in steps)
            and all(s['conclusion'] == 'skipped' or (s['name'] == 'Conclure' and s['conclusion'] == 'failure')
                    or ((s['name'].startswith('Post ') or s['name'] == 'Complete job') and s['conclusion'] == 'success')
                    for s in tail), 'Publication ou etape inconnue apres le controle')
    destination = root / 'blocked-attempt-plan'
    artifact(proof['preparationRun'], 'release-plan', destination, '.github/workflows/livepalmes-production-preflight.yml')
    original = read(destination / 'request.json')
    current = read(root / 'request.json')
    require({k: v for k, v in current.items() if k not in {'productionCleanupEvidence', 'productionBlockedAttemptEvidence'}} == original
            and read(destination / 'baseline.json')['productionRun'] == proof['productionRun'],
            'Perimetre different du bilan examine')
    baseline = latest_run('livepalmes-production-release.yml', skip=proof['blockedRun'])
    require(baseline == proof['productionRun'], 'Reference PROD differente')
    write(root / 'production-blocked-attempt-proof.json', {**proof, 'verifiedNoDeployment': True,
          'steps': [{'name': s['name'], 'conclusion': s['conclusion']} for s in steps]})
    return baseline


def production_evidence(directory):
    root = Path(directory)
    run_id = reviewed_blocked_production_run(root)
    path = '.github/workflows/livepalmes-production-release.yml'
    artifact(run_id, 'release-plan', root / 'production-plan', path)
    artifact(run_id, 'production-after', root / 'production-state', path)
    artifact(run_id, 'production-hosting-after', root / 'production-hosting', path)
    plan = read(root / 'production-plan/request.json')
    old = read(root / 'production-plan/prod-before.json')
    selected = set(read(root / 'production-plan/selection.json'))
    after = read(root / 'production-state/production-after.json')
    hosting = read(root / 'production-hosting/production-hosting-after.json')
    require(after['candidate'] == plan['candidate'] and not after['errors'], 'Publication de reference incoherente')
    previous = {f['name']: f for f in old['functions']}
    functions = []
    for f in after['functions']:
        name = f['name'].split('/')[-1]
        commit = plan['candidate'] if name in selected else previous.get(f['name'], {}).get('commit')
        functions.append({**f, 'commit': commit})
    state = {'hosting': {**hosting, 'message': f'LivePalmes {plan["candidate"]} run {run_id}'},
             'functions': sorted(functions, key=lambda f: f['name'])}
    state = apply_cleanup_evidence(root, state, run_id)
    write(root / 'baseline.json', {'productionRun': run_id, 'productionCommit': plan['candidate'], 'source': 'verified-publication-artifacts'})
    return state


def apply_cleanup_evidence(root, state, production_run):
    """Replay a reviewed, hash-pinned historical removal, never a live baseline reset."""
    request = read(root / 'request.json') if (root / 'request.json').exists() else {}
    reference = request.get('productionCleanupEvidence')
    if reference is None:
        return state
    require(isinstance(reference, dict) and set(reference) == {'path', 'sha256'}, 'Reference nettoyage invalide')
    path = reference['path']
    require(isinstance(path, str) and re.fullmatch(r'\.github/releases/evidence/[A-Za-z0-9_-]+\.json', path),
            'Chemin preuve nettoyage interdit')
    raw = git('show', 'HEAD:' + path).encode() + b'\n'
    require(hashlib.sha256(raw).hexdigest() == reference['sha256'], 'Empreinte nettoyage invalide')
    proof = json.loads(raw)
    require(proof.get('schema') == 1 and proof.get('productionRun') == production_run
            and proof.get('project') == 'livepalmes' and proof.get('approval'), 'Origine nettoyage invalide')
    allowed = set(json.loads(run(['node', '-e', 'const m=require(process.argv[1]);console.log(JSON.stringify([...m.NAP_RETIRED_FUNCTIONS,...m.NAP_UNUSED_FUNCTIONS]))', str(ROOT / 'tools/firebase-test-backend-lots.js')])))
    steps = proof.get('steps', [])
    require(steps and len(steps) <= 20, 'Etapes nettoyage absentes')
    for step in steps:
        require(step.get('completedAt') and step.get('backupVerified') is True
                and re.fullmatch(r'[0-9a-f]{64}', step.get('backupSha256', ''))
                and step.get('napWrites') == 0 and step.get('mailSends') == 0, 'Nettoyage non verifie')
        require(step.get('hosting') == {k: state['hosting'][k] for k in ['version', 'message']}, 'Hosting modifie par nettoyage')
        before = step.get('before', [])
        after = step.get('after', [])
        require(len({f['name'] for f in before}) == len(before)
                and sorted(before, key=lambda f: f['name']) == state['functions'],
                'Etat avant nettoyage different de la preuve PROD')
        deleted = step.get('deleted', [])
        require(deleted and len(deleted) == len(set(deleted))
                and all(n.startswith('projects/livepalmes/locations/europe-west1/functions/')
                        and n.split('/')[-1] in allowed for n in deleted)
                and set(deleted).issubset({f['name'] for f in state['functions']}), 'Suppressions historiques interdites')
        remaining = [f for f in state['functions'] if f['name'] not in deleted]
        require(len({f['name'] for f in after}) == len(after)
                and sorted(after, key=lambda f: f['name']) == remaining, 'Autre modification pendant nettoyage')
        state = {**state, 'functions': remaining}
    write(root / 'production-cleanup-proof.json', proof)
    return state


def freeze_plan(directory, evidence=False):
    root = Path(directory)
    request = read(root / 'request.json')
    state = production_evidence(root) if evidence else snapshot('livepalmes')
    require(state['hosting']['version'] == request['productionHosting'], 'PROD differente du bilan')
    # Initial release recorded before reusable cycle. Subsequent Hosting releases carry the SHA.
    initial = request['productionCommit'] == '995ec7025e31cd147444e38a99afba69808a1406' and request['productionHosting'] == 'sites/livepalmes/versions/61bbdb3230029827'
    require(initial or state['hosting']['message'].startswith('LivePalmes ' + request['productionCommit'] + ' run '), 'Commit PROD non prouve par la release')
    write(root / 'prod-before.json', state)
    names = {f['name'].split('/')[-1]: f for f in state['functions']}
    selected = read(root / 'selection.json')
    selected = [n for n in selected if n in approved_extra_functions(request) or needs_function(names.get(n), n, request['candidate'])]
    require_access_request_selection(request, selected)
    if public_reader_idf_preservation(request) is not None:
        before = backend_fingerprints(request['productionCommit'])
        after = backend_fingerprints(request['candidate'])
        require(set(before) == set(after)
                and {n for n in after if before[n] != after[n]} == {'readNapPublicSwimmer'}
                and (before['readNapPublicSwimmer'], after['readNapPublicSwimmer']) == PUBLIC_READER_IDF_HASHES
                and names.get('readNapPublicSwimmer', {}).get('state') == 'ACTIVE',
                'Dependances du lecteur public ou inventaire different du perimetre approuve')
        write(root / 'public-reader-idf-proof.json', {'pair': list(PUBLIC_READER_IDF_PAIR),
            'fingerprints': list(PUBLIC_READER_IDF_HASHES), 'onlyChangedFunction': 'readNapPublicSwimmer',
            'existingReader': True, 'networkCalls': 0})
    if club_directory_idf_preservation(request) is not None:
        before = backend_fingerprints(request['productionCommit'])
        after = backend_fingerprints(request['candidate'])
        require(set(before) == set(after)
                and {n for n in after if before[n] != after[n]} == set(CLUB_DIRECTORY_HASHES)
                and all((before[n], after[n]) == hashes for n, hashes in CLUB_DIRECTORY_HASHES.items())
                and all(names.get(n, {}).get('state') == 'ACTIVE' for n in CLUB_DIRECTORY_HASHES),
                'Dependances ou inventaire repertoires club hors perimetre approuve')
        write(root / 'club-directory-idf-proof.json', {'pair': list(CLUB_DIRECTORY_PAIR),
            'fingerprints': CLUB_DIRECTORY_HASHES, 'selected': selected, 'existingFunctions': True,
            'sourceOnly': True, 'configurationChanges': False, 'networkCalls': 0})
    if approved_grouped_functions(request):
        proof = grouped.verify_fingerprints(backend_fingerprints(request['productionCommit']),
            backend_fingerprints(request['candidate']), names)
        require(read(root / 'baseline.json')['productionRun'] == grouped.contract()['productionRun'],
                'Reference PROD groupee differente')
        if grouped.all_mail_preservation(request) is not None:
            proof.pop('idfUnchanged')
            proof['mailPreservation'] = grouped.all_mail_preservation(request)
        write(root / 'grouped-idf-proof.json', proof)
    if approved_bcc_functions(request):
        require(read(root / 'baseline.json')['productionRun'] == bcc.for_request(request).contract()['productionRun'], 'Reference PROD CCI differente')
        write(root / 'bcc-proof.json', bcc.for_request(request).verify_fingerprints(backend_fingerprints(request['productionCommit']),
            backend_fingerprints(request['candidate']), names))
    if request.get('excludedBackendEvidence') is not None:
        verify_excluded_backend(root, state, selected)
    else:
        # Existing UI-only requests need no review. New backend requests are
        # rejected earlier by validate_request without structured evidence.
        require(not selected, 'Preuve structuree des exclusions backend absente')
    write(root / 'selection.json', selected)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('\n## Bilan avant publication\n\n')
        summary.write(f"Version TEST : `{request['candidate']}`. Base PROD : `{request['productionCommit']}`.\n\n")
        for item in request['changes']:
            summary.write('- ' + item['title'].replace('\n', ' ') + ' — ' + item['validation'].replace('\n', ' ') + '\n')
        summary.write(f"\nFunctions selectionnees : {len(read(root / 'selection.json'))}. Regles/index/donnees exclus.\n")
        summary.write('\nTraitements : ' + (', '.join(selected) or 'aucun') + '.\n')
        if evidence:
            summary.write('\nBilan fonde sur les preuves de publication, sans acces Google. Firebase sera relu apres votre unique approbation et avant toute ecriture ; toute derive bloquera.\n')


def verify_excluded_backend(directory, state, selected):
    """Verify every retained changed function, never silently expand a lot."""
    root = Path(directory)
    request = read(root / 'request.json')
    scope = bcc.for_request(request)
    if scope.contract().get('limitedOct27'):
        scope.verify_retained(root, state, selected, SimpleNamespace(**globals()))
        return
    review = request['excludedBackendEvidence']
    baseline = read(root / 'baseline.json')
    require(review['productionRun'] == baseline['productionRun']
            and review['candidate'] == request['candidate'], 'Origine revue backend differente du bilan')
    desired = backend_fingerprints(request['candidate'])
    base = backend_fingerprints(request['productionCommit'])
    retained = {}
    for function in state['functions']:
        name = function['name'].split('/')[-1]
        if name in selected:
            continue
        require(function.get('state') == 'ACTIVE' and SHA.fullmatch(str(function.get('commit', '')))
                and function.get('revision'), 'Provenance fonction conservee inconnue: ' + name)
        previous = backend_fingerprints(function['commit'])
        require(name in desired and name in previous, 'Export conserve absent: ' + name)
        if previous[name] != desired[name]:
            retained[name] = (function, previous[name])
    rows = {row['name']: row for row in review['functions']}
    require(len(rows) == len(review['functions']) and set(rows) == set(retained),
            'Revue incomplete ou fonction exclue ajoutee')
    changed = []
    for name, (function, previous) in retained.items():
        row = rows[name]
        require(row['commit'] == function['commit'] and row['revision'] == function['revision']
                and row['before'] == previous and row['after'] == desired[name],
                'Empreinte ou revision exclue differente: ' + name)
        if base.get(name) != desired[name]:
            changed.append({'name': name, 'commit': function['commit']})
    # Earlier divergence is recorded, not treated as a reason to upgrade a
    # retained service. New divergence must pass the pinned offline suite.
    result = json.loads(run(['node', str(ROOT / 'tests/release-excluded-backend-compatibility-tests.js'),
                             str(ROOT), request['productionCommit'], request['candidate'],
                             json.dumps(sorted(changed, key=lambda row: row['name']))])) if changed else {
        'suite': review['suite'], 'candidate': request['candidate'], 'productionCommit': request['productionCommit'],
        'result': 'success', 'networkCalls': 0, 'passedFunctions': []}
    require(result.get('suite') == review['suite'] and result.get('candidate') == request['candidate']
            and result.get('productionCommit') == request['productionCommit']
            and result.get('result') == 'success' and result.get('networkCalls') == 0
            and result.get('passedFunctions') == sorted(row['name'] for row in changed),
            'Compatibilite des consommateurs exclus non demontree')
    result['reviewSha256'] = hashlib.sha256(json.dumps(review, sort_keys=True).encode()).hexdigest()
    result['suiteSha256'] = hashlib.sha256((ROOT / 'tests/release-excluded-backend-compatibility-tests.js').read_bytes()).hexdigest()
    result['retainedFunctions'] = sorted(rows)
    write(root / 'excluded-backend-verification.json', result)


def compare_prod(directory):
    require(snapshot('livepalmes') == read(Path(directory) / 'prod-before.json'), 'PROD a change depuis le bilan : nouvelle preparation requise')


def stage(candidate, project, destination, sha):
    require(project in PROJECTS and SHA.fullmatch(sha), 'Cible ou commit invalide')
    if project == 'livepalmes':
        subprocess.run(['node', str(ROOT / 'tools/prepare-production-functions.js'), candidate, destination, os.environ['APP_CHECK']], check=True)
    else:
        subprocess.run(['node', str(Path(candidate) / 'tools/prepare-firebase-test-functions.js'), 'all-safe', str(Path(destination).resolve())], check=True)
    index = Path(destination) / 'functions/index.js'
    if project == 'livepalmes' and os.environ.get('PLAN'):
        request = read(Path(os.environ['PLAN']) / 'request.json')
        if approved_public_nap_functions(request):
            subprocess.run(['node', str(ROOT / 'tools/prepare-production-nap-reader.js'), destination], check=True)
        notification = approved_notification_functions(request) + approved_public_nap_functions(request) + approved_access_request_functions(request)
        if notification:
            index.write_text(index.read_text() + '\nfor (const name of ' + json.dumps(notification) + ') { if (!backend[name]?.__endpoint) throw new Error("Export notifications absent: " + name); exports[name] = backend[name]; }\n')
    index.write_text(index.read_text() + '\nfor (const fn of Object.values(exports)) { if (!fn.__endpoint) throw new Error("Endpoint absent"); fn.__endpoint.labels = { ...fn.__endpoint.labels, "livepalmes-commit": ' + json.dumps(sha) + ' }; }\n')


def deploy_command(command, project):
    if project != 'livepalmes-test':
        subprocess.run(command, check=True)
        return
    for attempt in range(3):
        list_failure, upload_started = False, False
        with subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True) as process:
            for line in process.stdout:
                print(line, end='', flush=True)
                plain = re.sub(r'\x1b\[[0-9;]*m', '', line).strip()
                list_failure |= plain == 'Error: Failed to list functions for livepalmes-test'
                upload_started |= bool(re.search(r'functions: (?:functions source uploaded|(?:creating|updating|deleting) )', plain))
            result = process.wait()
        if result == 0:
            return
        if not list_failure or upload_started or attempt == 2:
            raise subprocess.CalledProcessError(result, command)
        delay = 20 * (attempt + 1)
        print(f'Consultation des Functions TEST interrompue avant publication ; nouvel essai du meme lot dans {delay} secondes.', flush=True)
        time.sleep(delay)


def deploy_batches(project, candidate, stage_path, selection_path, dry_run):
    require(project in PROJECTS, 'Projet interdit')
    require(read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])['project_id'] == project, 'Compte incorrect')
    selected = read(selection_path)
    extra = approved_extra_functions(read(Path(os.environ['PLAN']) / 'request.json')) if project == 'livepalmes' and os.environ.get('PLAN') else []
    require(len(selected) == len(set(selected)) and set(selected).issubset(set(safe_functions(candidate, project)) | set(extra)), 'Selection interdite')
    source_only = set(extra) - set(approved_notification_functions(read(Path(os.environ['PLAN']) / 'request.json'))) - set(approved_public_nap_functions(read(Path(os.environ['PLAN']) / 'request.json'))) - set(approved_access_request_functions(read(Path(os.environ['PLAN']) / 'request.json'))) if extra else set()
    if project == 'livepalmes' and os.environ.get('PLAN'):
        require_access_request_selection(read(Path(os.environ['PLAN']) / 'request.json'), selected)
    selected = [name for name in selected if name not in source_only]
    cli = str(Path(candidate).resolve() / 'tests/firestore-rules/node_modules/.bin/firebase')
    sha = os.environ['CANDIDATE_SHA']
    last_start = 0
    for offset in range(0, len(selected), 10):
        batch = selected[offset:offset + 10]
        if not dry_run:
            time.sleep(max(0, 61 - (time.monotonic() - last_start)))
        last_start = time.monotonic()
        batch_started = last_start
        command = [cli, 'deploy', '--project', project, '--config', str(Path(stage_path).resolve() / 'firebase.json'), '--only', ','.join('functions:' + n for n in batch), '--non-interactive', '--force']
        if dry_run:
            command.append('--dry-run')
        deploy_command(command, project)
        if not dry_run:
            functions = {f['name'].split('/')[-1]: f for f in snapshot(project)['functions']}
            require(all(n in functions and functions[n]['state'] == 'ACTIVE' and functions[n]['commit'] == sha for n in batch), 'Lot incomplet : publication interrompue avant Hosting')
        print(f'Lot {offset // 10 + 1} controle ({len(batch)} Functions).', flush=True)
        elapsed = round(time.monotonic() - batch_started, 1)
        timing = {'project': project, 'mode': 'simulation' if dry_run else 'deploy',
                  'batch': offset // 10 + 1, 'functions': batch, 'seconds': elapsed}
        print('Duree lot : ' + json.dumps(timing), flush=True)
        summary = os.environ.get('GITHUB_STEP_SUMMARY')
        if summary:
            with open(summary, 'a', encoding='utf-8') as stream:
                stream.write(f'\nLot {timing["batch"]} {project} ({timing["mode"]}) : {len(batch)} fonctions, {elapsed} s — ' + ', '.join(batch) + '\n')


def fetch_plan(preparation, resume, directory):
    root = Path(directory)
    if resume != '0':
        info = gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{resume}')
        require(info['path'] == '.github/workflows/livepalmes-production-release.yml', 'Run de reprise incorrect')
        artifact(resume, 'release-plan', root)
        artifact(resume, 'production-code-backup', root / 'encrypted')
        artifact(resume, 'production-after', root / 'previous')
        # A Hosting attempt always records its resulting release, including on failure.
        items = gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{resume}/artifacts?per_page=100')['artifacts']
        if any(a['name'] == 'production-hosting-after' for a in items):
            artifact(resume, 'production-hosting-after', root / 'previous')
        if approved_bcc_functions(read(root / 'request.json')):
            artifact(resume, 'production-bcc-guards', root)
    else:
        artifact(preparation, 'release-plan', root, '.github/workflows/livepalmes-production-preflight.yml')
    value = read(root / 'request.json')
    require(not value.get('verificationOnly'), 'Bilan de verification uniquement : publication interdite')
    require(SHA.fullmatch(value['candidate']), 'Commit invalide')
    evidence_path = root / 'test-proof.json'
    verified = reusable_verification(read(evidence_path), value['candidate']) if evidence_path.exists() else False
    output(candidate=value['candidate'], backend=str(bool(read(root / 'selection.json'))).lower(), verified=str(verified).lower(),
           idf_preservation=str(idf_preservation(value) is not None).lower(),
           bcc_preservation=str(bool(approved_bcc_functions(value))).lower())


def verify_resume(directory, backup):
    root = Path(directory)
    spec = importlib.util.spec_from_file_location('release_state', ROOT / 'tools/production-release-state.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    os.environ['CONFIRM_CODE_ROLLBACK'] = 'livepalmes'
    module.rollback(Path(backup), root / 'previous/production-after.json', apply=False)
    expected = read(root / 'previous/production-after.json')
    current = snapshot('livepalmes')
    require({f['name']: {k: f[k] for k in ['name', 'revision', 'updateTime', 'state']} for f in current['functions']} == {f['name']: f for f in expected['functions']}, 'Revisions modifiees depuis la tentative')
    after_hosting = root / 'previous/production-hosting-after.json'
    expected_hosting = read(after_hosting) if after_hosting.exists() else read(root / 'prod-before.json')['hosting']
    require(current['hosting']['name'] == expected_hosting['name'], 'Hosting modifie depuis la tentative')


def main():
    mode, *args = sys.argv[1:]
    if mode == 'fetch-plan':
        fetch_plan(*args)
    elif mode == 'verify-resume':
        verify_resume(*args)
    elif mode == 'request':
        prepare_request(*args)
    elif mode == 'artifact':
        artifact(*args)
    elif mode == 'proof':
        proof(*args)
    elif mode == 'verify-test':
        verify_test(*args)
    elif mode == 'verify-test-evidence':
        verify_test(*args, live=False)
    elif mode == 'freeze-evidence':
        freeze_plan(*args, evidence=True)
    elif mode == 'test-selection':
        test_selection(*args)
    elif mode == 'backend-proof':
        backend_proof(*args)
    elif mode == 'check-test':
        check_test(*args)
    elif mode == 'selection':
        prepare_selection(*args)
    elif mode == 'freeze':
        freeze_plan(*args)
    elif mode == 'compare-prod':
        compare_prod(*args)
    elif mode == 'stage':
        stage(*args)
    elif mode == 'batches':
        require(args[-1] in {'dry-run', 'deploy'}, 'Mode de deploiement inconnu')
        deploy_batches(*args[:-1], dry_run=args[-1] == 'dry-run')
    else:
        raise ValueError('Mode inconnu')

if __name__ == '__main__':
    main()
