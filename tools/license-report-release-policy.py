"""Closed source-only licence controller promotion; no cloud access or mutation."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / '.github/releases/evidence/20261027-license-reports-contract.json'
DIGEST = '0ff2fb1fc583b7338957bc9cf09440f0da2bc703aa67240f99f23138bef0281c'
NAME = 'prepareEngagementLicenseControlBatch'
MAIL_KEYS = {'LIVEPALMES_NAP_PASSWORD', 'LIVEPALMES_SMTP_HOST', 'LIVEPALMES_SMTP_PORT',
             'LIVEPALMES_SMTP_USER', 'LIVEPALMES_SMTP_PASS', 'LIVEPALMES_SMTP_SECURE',
             'LIVEPALMES_MAIL_FROM', 'LIVEPALMES_NOTIFICATION_LINK_SECRET'}

def require(value, message):
    if not value:
        raise ValueError(message)

def contract():
    raw = CONTRACT.read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == DIGEST, 'Contrat licences modifie')
    return json.loads(raw)

def approved(value):
    option = value.get('licenseReportRelease')
    if option is None:
        return []
    c = contract()
    allowed = {'schema','candidate','productionCommit','productionHosting','testRun','changes',
               'excludedBackendReview','excludedBackendEvidence','freezeTestCandidate','licenseReportRelease'}
    require(set(value) <= allowed and option == {'approval':'ok','contractSha256':DIGEST}
            and all(value.get(k) == c[k] for k in ['candidate','productionCommit','productionHosting','testRun'])
            and value.get('freezeTestCandidate') is True, 'Exception licences hors version ou perimetre')
    return [NAME]

def preservation(value):
    return contract()['mailPreservation'] if approved(value) else None

def selection(value, selected):
    if approved(value):
        require(sorted(selected) == contract()['selected'], 'Selection licences differente du contrat')

def verify(value, baseline, before, after, functions):
    approved(value); c = contract()
    require(baseline['productionRun'] == c['productionRun'] and len(functions) == 113
            and functions[NAME]['commit'] == c['productionCommit']
            and functions[NAME]['revision'] == c['revision']
            and before[NAME] == c['beforeHash'] and after[NAME] == c['afterHash'],
            'Origine du controleur licences differente de la revue')
    return {'schema':1,'candidate':c['candidate'],'contractSha256':DIGEST,
            'sourceOnly':[NAME],'configurationChanges':False,'mailPause':False,'networkCalls':0}

def runtime(function):
    service = function.get('serviceConfig', {})
    secrets = service.get('secretEnvironmentVariables', [])
    valid_secrets = all(s.get('secret') == s.get('key')
        and str(s.get('projectId')) in {'livepalmes','718081132564'}
        and (s.get('version') == 'latest' or str(s.get('version','')).isdigit()
             and int(s['version']) > 0) for s in secrets)
    require(function.get('state') == 'ACTIVE' and function.get('environment') == 'GEN_2'
            and function.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and function.get('buildConfig', {}).get('entryPoint') == NAME
            and not function.get('eventTrigger') and service.get('timeoutSeconds') == 300
            and len(secrets) == 8 and {s.get('key') for s in secrets} == MAIL_KEYS
            and valid_secrets, 'Runtime licences incompatible')

def assert_config(before, after, state):
    runtime(before); runtime(after)
    old, new = state.rollback_patch(before, {}), state.rollback_patch(after, {})
    require(all(old.get(k) == new.get(k) for k in ['serviceConfig','buildConfig','eventTrigger']),
            'Configuration licences modifiee')

def source_patch(before, source, value):
    require(approved(value) == [NAME] and before['name'].split('/')[-1] == NAME, 'Source licences hors accord')
    runtime(before)
    return {'name':before['name'],'buildConfig':{'source':{'storageSource':source}},
            'labels':{**before.get('labels', {}),'livepalmes-commit':value['candidate']}}
