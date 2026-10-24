"""Closed preparation for the reviewed 24 October pair; no network or secret reads."""
import copy
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / '.github/releases/evidence/20261024-grouped-backend-contract.json'
CONTRACT_SHA = 'ffaab8956566c7e52888a07a1a1c03b2a02d4eeff3b9971e3c3a04a6b513f4d2'
CORRECTION_PATH = '.github/releases/evidence/20261024-grouped-mail-scope-correction.json'
CORRECTION_SHA = 'b567994aaaf0db0d3727cd238033fe016a9b1ac6b78dcd0269071981b2763636'
NOTIFY = 'notifyEngagementCompetitionDocuments'
MAIL_SECRETS = ['LIVEPALMES_SMTP_HOST', 'LIVEPALMES_SMTP_PORT', 'LIVEPALMES_SMTP_USER',
                'LIVEPALMES_SMTP_PASS', 'LIVEPALMES_SMTP_SECURE', 'LIVEPALMES_MAIL_FROM',
                'LIVEPALMES_NOTIFICATION_LINK_SECRET']


def contract():
    raw = CONTRACT_PATH.read_bytes().replace(b'\r\n', b'\n')
    if hashlib.sha256(raw).hexdigest() != CONTRACT_SHA:
        raise ValueError('Contrat groupe different de la revue')
    return json.loads(raw)


def correction():
    raw = (ROOT / CORRECTION_PATH).read_bytes().replace(b'\r\n', b'\n')
    if hashlib.sha256(raw).hexdigest() != CORRECTION_SHA:
        raise ValueError('Preuve de correction du perimetre mail differente')
    return json.loads(raw)


def all_mail_preservation(value):
    preservation = value.get('groupedAllMailPreservation')
    reference = value.get('groupedMailScopeCorrectionEvidence')
    if preservation is None and reference is None:
        return None
    observed = correction()['observed']
    expected = {k: observed[k] for k in ['scope', 'revision', 'documentSha256', 'schedulerSha256']}
    expected['approval'] = 'On conserve tous les clubs'
    if (preservation != expected or type(preservation.get('revision')) is not int
            or reference != {'path': CORRECTION_PATH, 'sha256': CORRECTION_SHA}
            or value.get('groupedIdfPreservation') is not None
            or value.get('productionBlockedAttemptEvidence') is not None):
        raise ValueError('Conservation tous clubs hors etat complet et accord revus')
    return preservation


def approved(value):
    names = value.get('additionalGroupedFunctions', [])
    all_mail = all_mail_preservation(value)
    preservation = all_mail or value.get('groupedIdfPreservation')
    if not names and preservation is None and value.get('documentMailRuntimeApproval') is None:
        return []
    c = contract()
    forbidden = ['additionalPdfFunctions', 'additionalDtnFunctions', 'additionalNotificationFunctions',
                 'additionalPublicNapFunctions', 'additionalAccessRequestFunctions', 'additionalClubDirectoryFunctions',
                 'publicReaderIdfPreservation', 'clubDirectoryIdfPreservation', 'notificationMaintenancePlan',
                 'notificationPilotIdfApproval', 'nativeIdentityNapSecretApproval', 'productionHomeRouting',
                 'productionStaticCleanup', 'testEquivalentCandidate']
    if (any(value.get(key) for key in forbidden)
            or any(value.get(key) != c[key] for key in ['candidate', 'productionCommit', 'testRun'])
            or value.get('productionHosting') != 'sites/livepalmes/versions/dcbeb4e43623263f'
            or value.get('initialAutomaticMailEnabled') is not True
            or names != c['selected']
            or not isinstance(preservation, dict)
            or (all_mail is None and (set(preservation) != {'scope', 'revision', 'approval'}
                or preservation.get('scope') != 'idf' or type(preservation.get('revision')) is not int
                or preservation['revision'] != 4))
            or not isinstance(preservation.get('approval'), str)
            or not preservation['approval'].strip()
            or value.get('documentMailRuntimeApproval') != 'Oui, préparer cette exception limitée'):
        raise ValueError('Lot groupe hors paire, fonctions, IDF ou exception approuves')
    return list(names)


def preservation(value):
    return (all_mail_preservation(value) or value.get('groupedIdfPreservation')) if approved(value) else None


def corrected_request(original):
    """Only the observed mail scope and its explanatory review may change."""
    value = copy.deepcopy(original)
    value.pop('groupedIdfPreservation')
    observed = correction()['observed']
    value['groupedAllMailPreservation'] = {k: observed[k] for k in ['scope', 'revision', 'documentSha256', 'schedulerSha256']}
    value['groupedAllMailPreservation']['approval'] = 'On conserve tous les clubs'
    value['groupedMailScopeCorrectionEvidence'] = {'path': CORRECTION_PATH, 'sha256': CORRECTION_SHA}
    value['excludedBackendReview'] = value['excludedBackendReview'].replace(
        'IDF actif/idf/revision4 document complet et scheduler intacts.',
        'Mails actifs/tous clubs/revision5 : document complet et scheduler intacts, conservation explicite du reglage existant.'
    ).replace('changement IDF', 'changement du reglage mail')
    return value


def review_blocked_attempt(root, git, gh, artifact, latest_run):
    """Accept only the pinned mail-guard stop, never a new production baseline."""
    proof = correction()
    for filename, digest in proof['sourceSha256'].items():
        raw = (git('show', proof['headSha'] + ':' + filename) + '\n').encode()
        if hashlib.sha256(raw).hexdigest() != digest:
            raise ValueError('Source de la tentative mail differente')
    import os
    repo = os.environ['GITHUB_REPOSITORY']
    info = gh(f'repos/{repo}/actions/runs/{proof["blockedRun"]}')
    if (info.get('path') != '.github/workflows/livepalmes-production-release.yml'
            or info.get('head_branch') != 'main' or info.get('head_sha') != proof['headSha']
            or info.get('status') != 'completed' or info.get('conclusion') != 'failure'
            or info.get('run_attempt') != 1):
        raise ValueError('Tentative mail hors origine examinee')
    runs = gh(f'repos/{repo}/actions/workflows/livepalmes-production-release.yml/runs?branch=main&event=workflow_dispatch&per_page=20')['workflow_runs']
    if not runs or runs[0]['id'] != proof['blockedRun']:
        raise ValueError('Nouvelle tentative PROD : nouvel examen requis')
    jobs = gh(f'repos/{repo}/actions/runs/{proof["blockedRun"]}/jobs?per_page=100')
    if jobs.get('total_count') != 1 or len(jobs.get('jobs', [])) != 1:
        raise ValueError('Jobs de la tentative mail ambigus')
    steps = jobs['jobs'][0]['steps']
    guards = [i for i, s in enumerate(steps) if s['name'] == 'Verifier les mails desactives avant la bascule NAP']
    if len(guards) != 1:
        raise ValueError('Garde mail absent ou ambigu')
    guard = guards[0]
    if (steps[guard]['conclusion'] != 'failure' or not all(s['conclusion'] == 'success' for s in steps[:guard])
            or not {'Relire TEST avant toute ecriture PROD', 'Verifier que PROD correspond encore au bilan'}.issubset({s['name'] for s in steps[:guard]})):
        raise ValueError('Arret different du garde mail revu')
    tail = steps[guard + 1:]
    skipped = {'Sauvegarder le code PROD avant publication', 'Chiffrer puis tester la sauvegarde',
        'Ouvrir la sauvegarde initiale pour une reprise', 'Associer les controles au commit',
        'Preparer les Functions selectionnees', 'Simuler les Functions par petits lots',
        'Publier les Functions par petits lots', 'Controler toutes les Functions et les exclusions',
        'Confirmer les mails desactives avant Hosting', 'Publier Hosting apres les controles',
        'Controler les pages publiees', 'Relever Hosting apres la tentative', 'Confirmer IDF inchange apres Hosting'}
    if (not skipped.issubset({s['name'] for s in tail if s['conclusion'] == 'skipped'})
            or not all(s['status'] == 'completed' for s in steps)
            or not all(s['conclusion'] == 'skipped' or (s['name'] == 'Conclure' and s['conclusion'] == 'failure')
                or ((s['name'].startswith('Post ') or s['name'] == 'Complete job') and s['conclusion'] == 'success') for s in tail)):
        raise ValueError('Etape executee apres garde mail : reprise refusee')
    destination = root / 'blocked-attempt-plan'
    artifact(proof['preparationRun'], 'release-plan', destination, '.github/workflows/livepalmes-production-preflight.yml')
    original = json.loads((destination / 'request.json').read_text())
    current = json.loads((root / 'request.json').read_text())
    if (current != corrected_request(original)
            or json.loads((destination / 'baseline.json').read_text())['productionRun'] != proof['productionRun']):
        raise ValueError('Perimetre different du bilan mail examine')
    baseline = latest_run('livepalmes-production-release.yml', skip=proof['blockedRun'])
    if baseline != proof['productionRun']:
        raise ValueError('Reference PROD differente du bilan mail')
    (root / 'production-blocked-attempt-proof.json').write_text(json.dumps({**proof,
        'verifiedNoDeployment': True, 'steps': [{'name': s['name'], 'conclusion': s['conclusion']} for s in steps]}, indent=2))
    return baseline


def selection(value, names):
    expected = approved(value)
    if expected and (len(names) != len(expected) or set(names) != set(expected)):
        raise ValueError('Lot groupe : selection differente des 47 sources existantes')


def verify_fingerprints(before, after, functions):
    c = contract()
    if set(before) != set(after):
        raise ValueError('Exports groupes modifies')
    changed = {n: [before[n], after[n]] for n in after if before.get(n) != after[n]}
    if (set(before) != set(after) or changed != c['changedExportHashes']
            or len(functions) != 112 or any(functions.get(n, {}).get('state') != 'ACTIVE' for n in c['selected'])):
        raise ValueError('Empreintes ou inventaire groupes differents de la revue')
    return {'pair': [c['productionCommit'], c['candidate']], 'selected': c['selected'],
            'retainedCount': 65, 'sourceOnly': True, 'contractSha256': CONTRACT_SHA,
            'configurationException': {'function': NOTIFY, 'timeoutSeconds': 300, 'addedSecrets': MAIL_SECRETS},
            'idfUnchanged': True, 'networkCalls': 0}


def normalized_secrets(items):
    if not isinstance(items, list):
        raise ValueError('Liaisons de secrets invalides')
    result = []
    for item in items:
        if (set(item) != {'key', 'secret', 'projectId', 'version'} or item['key'] != item['secret']
                or str(item['projectId']) not in {'livepalmes', '718081132564'}
                or not re.fullmatch(r'latest|[1-9][0-9]*', str(item['version']))):
            raise ValueError('Metadonnees de secret hors projet ou version')
        result.append({**item, 'projectId': 'livepalmes', 'version': str(item['version'])})
    if len({s['key'] for s in result}) != len(result):
        raise ValueError('Secret duplique')
    return sorted(result, key=lambda s: s['key'])


def notification_service(before):
    old = normalized_secrets(before.get('secretEnvironmentVariables', []))
    if len(old) != 1 or old[0]['key'] != 'LIVEPALMES_NAP_PASSWORD' or before.get('secretVolumes'):
        raise ValueError('Notification documentaire : configuration NAP initiale inattendue')
    return {'timeoutSeconds': 300, 'secretEnvironmentVariables': old + [
        {'key': key, 'secret': key, 'projectId': 'livepalmes', 'version': 'latest'} for key in MAIL_SECRETS]}


def assert_config(before, after, state):
    """Preserve every writable field, except the single approved runtime delta."""
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    name = before['name'].split('/')[-1]
    if name not in contract()['selected'] or after.get('name') != before['name']:
        raise ValueError('Configuration hors lot groupe')
    if name == NOTIFY:
        expected = notification_service(before.get('serviceConfig', {}))
        for key, value in expected.items():
            actual = new['serviceConfig'].get(key)
            if key == 'secretEnvironmentVariables':
                actual, value = normalized_secrets(actual), normalized_secrets(value)
            if actual != value:
                raise ValueError('Exception documentaire differente de celle approuvee')
            old['serviceConfig'].pop(key, None)
            new['serviceConfig'].pop(key, None)
    if any(old.get(k) != new.get(k) for k in ['serviceConfig', 'buildConfig', 'eventTrigger']):
        raise ValueError('Configuration groupe modifiee hors exception')


def source_patch(before, source, sha):
    if sha != contract()['candidate'] or before['name'].split('/')[-1] not in contract()['selected']:
        raise ValueError('Source hors contrat groupe')
    body = {'name': before['name'], 'buildConfig': {'source': {'storageSource': copy.deepcopy(source)}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': sha}}
    mask = 'build_config.source,labels'
    if before['name'].split('/')[-1] == NOTIFY:
        body['serviceConfig'] = notification_service(before.get('serviceConfig', {}))
        mask += ',service_config.timeout_seconds,service_config.secret_environment_variables'
    return body, mask
