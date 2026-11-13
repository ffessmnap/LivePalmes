"""Read-only prerequisite report before final approval. Never grants permissions."""
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes'
IAM = 'https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions'
QUOTAS = 'https://serviceusage.googleapis.com/v1beta1/projects/livepalmes/services/cloudbuild.googleapis.com/consumerQuotaMetrics?view=FULL&pageSize=200'
INDEXES = 'https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/collectionGroups/engagementAccessRequests/indexes?pageSize=0'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


cycle = load('readiness_cycle', 'release-cycle.py')


def permissions(kind, backend, indexes):
    if kind == 'hosting':
        return ['firebasehosting.sites.get', 'firebasehosting.sites.update']
    if kind != 'backend':
        raise ValueError('Identite inconnue')
    result = ['cloudfunctions.functions.get', 'cloudfunctions.functions.list']
    if backend:
        result += ['cloudfunctions.functions.update', 'cloudfunctions.operations.get']
    if indexes:
        result += ['datastore.indexes.list', 'datastore.indexes.create']
    return result


def read(url, body=None):
    # POST testIamPermissions is a read, never an IAM policy write.
    if not (url in {IAM, QUOTAS, INDEXES} or url.startswith('https://iam.googleapis.com/v1/projects/-/serviceAccounts/')
            and url.endswith(':testIamPermissions')):
        raise ValueError('Lecture hors prerequis')
    if url == QUOTAS:
        number = subprocess.check_output(['gcloud', 'projects', 'describe', PROJECT, '--format=value(projectNumber)'], text=True, stderr=subprocess.DEVNULL).strip()
        if not number.isdigit():
            raise ValueError('Numero de projet non verifie')
        url = url.replace('/projects/' + PROJECT + '/', '/projects/' + number + '/')
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'], text=True, stderr=subprocess.DEVNULL).strip()
    request = urllib.request.Request(url, method='POST' if body is not None else 'GET',
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def identity_context():
    cycle.require(os.environ.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
        and os.environ.get('GITHUB_REF') == 'refs/heads/main'
        and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
        and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch'
        and os.environ.get('GITHUB_WORKFLOW_REF') == 'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'
        and re.fullmatch('[a-f0-9]{40}',os.environ.get('GITHUB_SHA',''))
        and os.environ.get('GITHUB_RUN_ID','').isdigit(), 'Diagnostic identite reserve au workflow officiel main')


def prepare_hosting_identity(directory, run_id):
    identity_context(); directory = Path(directory)
    cycle.require(str(run_id).isdigit() and int(run_id)>0, 'Plan authentifie requis')
    cycle.artifact(run_id,'release-plan',directory,'.github/workflows/livepalmes-production-preflight.yml')
    request = cycle.read(directory/'request.json')
    cycle.require(cycle.direct_realtime.approved(request), 'Diagnostic borne au contrat Direct courant')
    verification = load('identity_publication_evidence','test-verification-evidence.py')
    cycle.require(verification.reusable(os.environ['GITHUB_SHA'],directory/'identity-ci','publication-offline-v1'),
                  'CI main exacte du diagnostic absente ou incompatible')
    cycle.write(directory/'production-hosting-identity-context.json',
        {'schema':1,'project':PROJECT,'candidate':request['candidate'],'planRun':int(run_id),
         'toolingCommit':os.environ['GITHUB_SHA'],'run':int(os.environ['GITHUB_RUN_ID']),
         'contractSha256':cycle.direct_realtime.DIGEST,'readOnly':True,'publicationCIAuthenticated':True})


def public_hosting_identity(raw):
    # Extract an explicit allowlist only; never return private_key, key ID or credential JSON.
    try:
        value = json.loads(raw)
    except (ValueError,TypeError):
        raise ValueError('Credential officiel invalide, contenu non expose') from None
    cycle.require(isinstance(value,dict) and value.get('type') == 'service_account'
        and value.get('project_id') == PROJECT, 'Metadonnees du compte PROD differentes')
    email = value.get('client_email','')
    cycle.require(isinstance(email,str) and re.fullmatch('[a-z0-9-]+@[a-z0-9.-]+gserviceaccount[.]com',email),
                  'Identifiant de service non valide')
    return {'credentialSource':'FIREBASE_SERVICE_ACCOUNT_LIVEPALMES', 'credentialType':'service_account',
            'client_email':email,'matchesClosedRulesIdentityPolicy':email.endswith('@livepalmes.iam.gserviceaccount.com')}


def hosting_identity(directory, run_id):
    identity_context(); directory = Path(directory)
    context = cycle.read(directory/'production-hosting-identity-context.json')
    cycle.require(context.get('schema') == 1 and context.get('project') == PROJECT
        and context.get('toolingCommit') == os.environ['GITHUB_SHA']
        and context.get('run') == int(os.environ['GITHUB_RUN_ID']) and context.get('planRun') == int(run_id)
        and context.get('contractSha256') == cycle.direct_realtime.DIGEST
        and context.get('candidate') == cycle.direct_realtime.contract()['candidate']
        and context.get('publicationCIAuthenticated') is True and context.get('readOnly') is True,
        'Contexte authentifie du diagnostic incompatible')
    raw = os.environ.pop('PRODUCTION_HOSTING_CREDENTIAL_METADATA','')
    public = public_hosting_identity(raw)
    cycle.write(directory/'production-hosting-identity.json',
        {**context,**public,'googleAuthentication':False,'cloudApiCalls':0,'iamWrites':0,
         'rulesCalls':0,'businessInvocations':0,'keyMaterialExported':False})


def observe_production_rules(directory, run_id):
    # A distinct diagnostic, never a successful prerequisites receipt or baseline reset.
    prepare_hosting_identity(directory,run_id)
    directory = Path(directory)
    rules = load('observed_production_rules','direct-realtime-production-rules.py')
    c,token,identity = rules.context(directory,'readiness')
    observed,source = rules.snapshot(token)
    cycle.require(rules.digest(source)==observed['sha256'], 'Source Rules observee incomplete')
    (directory/'observed-production-before.rules').write_text(source,encoding='utf-8',newline='\n')
    report = {'schema':1,'project':PROJECT,'candidate':c['candidate'],'planRun':int(run_id),
         'run':int(os.environ['GITHUB_RUN_ID']),'toolingCommit':os.environ['GITHUB_SHA'],
         'credentialSource':'FIREBASE_SERVICE_ACCOUNT_LIVEPALMES','identitySha256':identity,
         'observed':observed,'expectedBeforeSha256':c['rules']['beforeSha256'],
         'expectedBaseMatches':observed['sha256']==c['rules']['beforeSha256'],
         'publicationAllowed':False,'readOnly':True,'rulesWrites':0,'iamWrites':0,
         'businessInvocations':0,'credentialExported':False}
    try:
        block = rules.sources(c)[2]
        marker = '    match /{document=**}'
        cycle.require(source.count(marker)==1 and 'livepalmesDirectSignals' not in source,
                      'Insertion privee non univoque : rapprochement requis')
        index = source.index(marker); proposed = source[:index]+block+source[index:]
        cycle.require(proposed.replace(block,'',1)==source and len(block.splitlines())==10,
                      'Le seul bloc prive exact doit etre ajoute')
        (directory/'proposed-production-after.rules').write_text(proposed,encoding='utf-8',newline='\n')
        report.update(proposalSha256=rules.digest(proposed),proposalAddedLines=10,allOtherRulesPreserved=True,
                      proposalReviewed=False)
    except ValueError:
        report.update(proposalReviewed=False,proposalRequiresReconciliation=True)
    cycle.write(directory/'production-rules-observation.json',report)


def discover(directory, kind):
    """Observe a new need before inventing a baseline; this is never a release plan."""
    identity_context()
    raw = os.environ.get('PRODUCTION_DISCOVERY_JSON', '{}')
    cycle.require(len(raw.encode('utf-8')) <= 65536, 'Demande de decouverte hors limite')
    def unique(pairs):
        result = {}
        for key,value in pairs:
            cycle.require(key not in result, 'Cle dupliquee dans la decouverte')
            result[key] = value
        return result
    value = json.loads(raw,object_pairs_hook=unique)
    cycle.require(isinstance(value, dict) and set(value) == {'candidate','services'}
        and cycle.SHA.fullmatch(str(value['candidate'])) and isinstance(value['services'], list)
        and 1 <= len(value['services']) <= 3
        and all(isinstance(s,str) and s in {'hosting','sources','rules'} for s in value['services'])
        and len(set(value['services'])) == len(value['services']), 'Decouverte bornee au candidat et aux services connus requise')
    cycle.require(kind in {'hosting','backend'}, 'Identite de decouverte inconnue')
    cycle.git('merge-base', '--is-ancestor', value['candidate'], 'HEAD')
    directory = Path(directory); directory.mkdir(parents=True, exist_ok=True)
    verification = load('discovery_publication_evidence','test-verification-evidence.py')
    cycle.require(verification.reusable(os.environ['GITHUB_SHA'],directory/'discovery-ci','publication-offline-v1'),
                  'CI main exacte du diagnostic absente ou incompatible')
    credentials = cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    identity = public_hosting_identity(json.dumps(credentials))
    identity['credentialSource'] = 'FIREBASE_SERVICE_ACCOUNT_LIVEPALMES' + ('_BACKEND' if kind == 'backend' else '')
    report = {'schema':1,'project':PROJECT,'candidate':value['candidate'],'services':value['services'],
        'toolingCommit':os.environ['GITHUB_SHA'],'run':int(os.environ['GITHUB_RUN_ID']),
        'kind':kind,'identity':identity,'readOnly':True,'publicationAllowed':False,
        'iamWrites':0,'rulesWrites':0,'businessInvocations':0,'discoveryComplete':False,'missingPermissions':[]}
    stage = 'permissions'
    try:
        requested = permissions(kind, 'sources' in value['services'], False)
        rules = None
        if kind == 'hosting' and 'rules' in value['services']:
            rules = load('discovery_rules','direct-realtime-production-rules.py')
            requested += rules.PERMISSIONS
        report['requiredPermissions'] = requested
        granted = read(IAM, {'permissions':requested}).get('permissions', [])
        report['missingPermissions'] = sorted(set(requested) - set(granted))
        # Read everything already accessible, even when a write permission is absent.
        if kind == 'hosting' and 'firebasehosting.sites.get' in granted:
            stage = 'hosting-state'
            release = cycle.api(PROJECT,'hosting')['releases'][0]
            report['hosting'] = {k:release[k] for k in ['name','version','releaseTime'] if k in release}
        if rules and all(p in granted for p in ['firebaserules.releases.get','firebaserules.rulesets.get']):
            stage = 'rules-state'
            token = subprocess.check_output(['gcloud','auth','print-access-token'],text=True,stderr=subprocess.DEVNULL).strip()
            cycle.require(token and '\n' not in token, 'Jeton officiel absent')
            observed, source = rules.snapshot(token)
            cycle.require(rules.digest(source) == observed['sha256'], 'Source Rules observee incomplete')
            (directory/'discovered-production.rules').write_text(source,encoding='utf-8',newline='\n')
            report['rules'] = observed
        if kind == 'backend' and 'sources' in value['services'] and 'cloudfunctions.functions.list' in granted:
            stage = 'functions-state'
            state = load('discovery_state','production-release-state.py')
            observed = state.request(state.API+'projects/livepalmes/locations/-/functions?pageSize=500&fields=functions(name,state,updateTime,serviceConfig/revision,labels),nextPageToken,unreachable')
            functions = observed.get('functions',[])
            cycle.require(0 < len(functions) <= 500 and not observed.get('nextPageToken') and not observed.get('unreachable'), 'Inventaire de decouverte incomplet ou hors limite')
            report['functions'] = [{**{k:f[k] for k in ['name','state','updateTime'] if k in f},
                'revision':f.get('serviceConfig',{}).get('revision'),
                'commit':f.get('labels',{}).get('livepalmes-commit')} for f in functions]
        report['discoveryComplete'] = not report['missingPermissions']
    except Exception as error:
        # No exception text/body or subprocess output can leak a token or credential.
        report['failure'] = {'stage':stage,'type':type(error).__name__}
        raise
    finally:
        cycle.write(directory/('production-discovery-'+kind+'.json'),report)


def main(directory, run_id, kind):
    cycle.require(os.environ.get('GITHUB_REF') == 'refs/heads/main' and os.environ.get('GITHUB_RUN_ATTEMPT') == '1',
                  'Lecture main/tentative1 requise')
    if kind.startswith('discover-'):
        discover(directory,kind.removeprefix('discover-')); return
    if kind == 'rules-observe':
        observe_production_rules(directory,run_id); return
    if kind == 'identity-prepare':
        prepare_hosting_identity(directory,run_id); return
    if kind == 'identity':
        hosting_identity(directory,run_id); return
    if kind == 'prepare':
        cycle.artifact(run_id, 'release-plan', Path(directory), '.github/workflows/livepalmes-production-preflight.yml')
        cycle.output(license_reports=str(bool(cycle.approved_license_report_functions(cycle.read(Path(directory)/'request.json')))).lower())
        return
    credentials = cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    cycle.require(credentials.get('project_id') == PROJECT, 'Compte PROD existant requis')
    directory = Path(directory); directory.mkdir(parents=True, exist_ok=True)
    cycle.artifact(run_id, 'release-plan', directory, '.github/workflows/livepalmes-production-preflight.yml')
    request = cycle.read(directory/'request.json')
    selected = cycle.read(directory/'selection.json')
    identity = public_hosting_identity(json.dumps(credentials))
    identity['credentialSource'] = 'FIREBASE_SERVICE_ACCOUNT_LIVEPALMES' + ('_BACKEND' if kind == 'backend' else '')
    report = {'schema': 1, 'planRun': int(run_id), 'candidate': request['candidate'], 'kind': kind, 'identity':identity,
              'readOnly': True, 'ready': False, 'missingPermissions': []}
    try:
        # Drift is checked here and remains mandatory immediately before release.
        missing_indexes = []
        if kind == 'backend':
            cycle.compare_prod(directory)
            if request.get('productionAccountHistoryIndexes'):
                index = load('readiness_indexes', 'production-account-history-indexes.py')
                index.check_plan(request)
                values = read(INDEXES)
                cycle.require(not values.get('nextPageToken'), 'Inventaire index incomplet')
                missing_indexes = index.missing(values.get('indexes', []))
                report['missingIndexCount'] = len(missing_indexes)
                report['indexesReady'] = not missing_indexes and all(any(index.matching(row, definition)
                    and row.get('state') == 'READY' for row in values.get('indexes', [])) for definition in index.DEFINITIONS)
        else:
            live = cycle.api(PROJECT, 'hosting')['releases'][0]
            expected_hosting = cycle.read(directory/'prod-before.json')['hosting']
            cycle.require({'name': live['name'], 'version': live['version']['name'], 'message': live.get('message', '')}
                          == expected_hosting, 'Hosting a derive depuis le plan')
        expected = permissions(kind, bool(selected), bool(missing_indexes))
        if kind == 'hosting' and cycle.direct_realtime.approved(request):
            rules = load('readiness_direct_realtime_rules','direct-realtime-production-rules.py')
            expected += rules.PERMISSIONS
        scope = cycle.bcc.for_request(request)
        limited_oct27 = scope.contract().get('limitedOct27')
        if kind == 'backend' and limited_oct27:
            expected += ['cloudscheduler.jobs.get','cloudscheduler.jobs.update']
        if kind == 'backend' and cycle.nap_account.approved(request):
            expected += ['cloudfunctions.functions.create']
        if kind == 'backend' and (cycle.validated_portal.approved(request) or cycle.team_trophy.approved(request) or cycle.direct_release.approved(request) or cycle.november_release.approved(request)):
            expected += ['cloudfunctions.functions.create', 'cloudfunctions.functions.setIamPolicy']
        granted = read(IAM, {'permissions': expected}).get('permissions', [])
        report['missingPermissions'] = sorted(set(expected) - set(granted))
        if kind == 'backend' and selected:
            state = load('readiness_state', 'production-release-state.py')
            functions = state.inventory()
            if cycle.source_policy(request).enabled(request):
                manifest = cycle.source_policy(request).manifest(directory,request)
                cycle.source_policy(request).initial(functions,manifest)
                cycle.source_policy(request).guard(directory)
                report['standardSources'] = {'manifestSha256':cycle.source_policy(request).digest(manifest),
                    'existingSources':manifest['selected'],'retainedFunctions':manifest['inventoryCount']-len(manifest['selected']),
                    'configurationChanges':False,'bindingChanges':False,'mailPause':False,'newFunctions':[]}
            if cycle.public_navigation_direct.approved(request):
                cycle.public_navigation_direct.initial(functions)
                cycle.public_navigation_direct.guard(directory)
                report['publicNavigationDirectRelease'] = {'existingSources': cycle.public_navigation_direct.approved(request),
                    'retainedFunctions': 117, 'newFunctions': [], 'configurationChanges': False,
                    'bindingChanges': False, 'mailPause': False, 'historicalReplay': False, 'iamChanges': False}
            if cycle.direct_reliability.approved(request):
                cycle.direct_reliability.initial(functions)
                cycle.direct_reliability.guard(directory)
                report['directReliabilityRelease'] = {'existingSources': cycle.direct_reliability.approved(request),
                    'retainedFunctions': 117, 'newFunctions': [], 'configurationChanges': False,
                    'bindingChanges': False, 'mailPause': False, 'historicalReplay': False, 'iamChanges': False}
            if cycle.direct_realtime.approved(request):
                cycle.direct_realtime.initial(functions)
                cycle.direct_realtime.guard(directory)
                report['directRealtimeRelease'] = {'existingSources': cycle.direct_realtime.approved(request),
                    'retainedFunctions': 117, 'newFunctions': [], 'configurationChanges': False,
                    'bindingChanges': False, 'mailPause': False, 'historicalReplay': False, 'iamChanges': False}
            if cycle.public_navigation_touch.approved(request):
                cycle.public_navigation_touch.initial(functions)
                cycle.public_navigation_touch.guard(directory)
                report['publicNavigationTouchRelease'] = {'existingSources': cycle.public_navigation_touch.approved(request),
                    'retainedFunctions': 118, 'newFunctions': [], 'configurationChanges': False,
                    'bindingChanges': False, 'mailPause': False, 'historicalReplay': False, 'iamChanges': False}
            if cycle.reference_cleanup.approved(request):
                cycle.reference_cleanup.initial(functions)
                cycle.reference_cleanup.guard(directory)
                report['referenceCleanupRelease'] = {'existingSources': cycle.reference_cleanup.approved(request),
                    'newFunctions': [], 'configurationChanges': False, 'bindingChanges': False,
                    'mailPause': False, 'historicalReplay': False, 'iamChanges': False}
            if cycle.november10_release.approved(request):
                nap = cycle.november10_release.initial(functions)
                cycle.november10_release.guard(directory)
                report['november10Release'] = {'existingSources': cycle.november10_release.approved(request),
                    'napBindingFunctions': cycle.november10_release.contract()['napBindingFunctions'],
                    'napBinding': nap, 'smtpBindingsPreserved': True, 'newFunctions': [],
                    'sameExistingRuntimeAccount': True, 'mailPause': False,
                    'historicalReplay': False, 'iamChanges': False, 'smtpInvocation': False, 'secretValuesRead': False}
            if cycle.november_release.approved(request):
                cycle.november_release.initial(functions)
                cycle.november_release.guard(directory)
                report['novemberRelease'] = {'sourceOnly': cycle.november_release.approved(request),
                    'newFunctions': cycle.november_release.contract()['newFunctions'],
                    'smtpConfigurationException': cycle.november_release.contract()['smtpFunction'],
                    'smtpBindings': cycle.november_release.contract()['smtpBindings'],
                    'sameExistingRuntimeAccount': True, 'mailPause': False,
                    'historicalReplay': False, 'iamChanges': False, 'smtpInvocation': False, 'secretValuesRead': False}
            if cycle.team_trophy.approved(request):
                cycle.team_trophy.initial(functions)
                cycle.team_trophy.guard(directory)
            if cycle.portal_access_ns.approved(request):
                cycle.portal_access_ns.initial(functions)
                load('portal_ns_readiness', 'check-portal-access-ns-release.py').guard(directory)
                report['portalAccessNsRelease'] = {'existingSourcesOnly': True,
                    'accountNapBindingReference': 'listEngagementClubSwimmers',
                    'sameExistingRuntimeAccount': True, 'mailPause': False,
                    'smtpInvocation': False, 'secretValuesRead': False}
            if cycle.validated_portal.approved(request):
                cycle.validated_portal.initial(functions)
                cycle.validated_portal.guard(directory)
                report['validatedPortalRelease'] = {'newCallable': 'managePortalNews', 'sourceOnlyProtected': cycle.validated_portal.approved(request),
                    'mailPause': False, 'configurationChanges': False, 'smtpInvocation': False}
            if cycle.nap_account.approved(request):
                cycle.nap_account.references(functions)
                load('nap_account_readiness', 'publish-nap-account-release.py').guard(directory)
                report['napAccountRelease'] = {'newTrigger': cycle.nap_account.NAME,
                    'existingConfigurationChanges': False, 'mailPause': False,
                    'existingRuntimeSecretAccess': True, 'dataReconciliation': False}
            if cycle.nap_retained.approved(request):
                for function in functions:
                    if function['name'].split('/')[-1] in selected:
                        cycle.nap_retained.runtime(function)
                load('nap_retained_readiness', 'nap-retained-sources.py').guard(directory)
                report['napRetainedSources'] = {'sourceOnly': True, 'mailPause': False, 'configurationChanges': False}
            if cycle.approved_license_report_functions(request):
                for function in functions:
                    if function['name'].split('/')[-1] == cycle.license_release.NAME:
                        cycle.license_release.runtime(function)
                load('license_readiness_guard','check-license-report-release.py').main(directory)
                report['licenseReports'] = {'sourceOnly':True,'mailPause':False,'smtpInvocation':False,'sourceUnchangedSinceNapMigration':True}
            if limited_oct27:
                report['runtimeBindings'] = [{'name':f['name'].split('/')[-1],
                    'timeoutSeconds':f.get('serviceConfig',{}).get('timeoutSeconds'),
                    'secretVersionSelectors':{v.get('key'):v.get('version') for v in f.get('serviceConfig',{}).get('secretEnvironmentVariables',[])}}
                    for f in functions if f['name'].split('/')[-1] in selected]
                initial = load('oct27_initial_runtime','preflight-production-release.py')
                for f in functions:
                    name = f['name'].split('/')[-1]
                    if name in selected: scope.initial_runtime(name,f.get('serviceConfig',{}),initial.ordinary_runtime_allowed)
                target = next(f for f in functions if f['name'].split('/')[-1] == scope.LICENSE)
                reference = next(f for f in functions if f['name'].split('/')[-1] == cycle.bcc.REFERENCE)
                cycle.require(target['serviceConfig']['serviceAccountEmail'] == reference['serviceConfig']['serviceAccountEmail'], 'Acces mail du compte licences non prouve')
                guard = load('oct27_readiness_guard','check-production-bcc.py')
                guard.main('initial',directory)
                report['limitedOct27'] = {'runtimeAccountAlreadyUsedForMail':True,'initialMailSchedulerQueueIamVerified':True,
                    'mailPauseRequired':True,'smtpInvocation':False,'secretValuesRead':False}
            accounts = {f.get('serviceConfig', {}).get('serviceAccountEmail') for f in functions
                        if f['name'].split('/')[-1] in selected}
            cycle.require(None not in accounts and 0 < len(accounts) <= 10, 'Comptes runtime inconnus')
            for account in sorted(accounts):
                cycle.require('@' in account and '/' not in account, 'Compte runtime invalide')
                granted = read('https://iam.googleapis.com/v1/projects/-/serviceAccounts/'+account+':testIamPermissions',
                               {'permissions': ['iam.serviceAccounts.actAs']}).get('permissions', [])
                if 'iam.serviceAccounts.actAs' not in granted:
                    report['missingPermissions'].append('iam.serviceAccounts.actAs:'+account)
            quotas = read(QUOTAS)
            report['cloudBuildQuotas'] = quotas
            cycle.require(quotas.get('metrics') and not quotas.get('nextPageToken'), 'Quotas Cloud Build non verifies')
        cycle.require(not report['missingPermissions'], 'Permissions manquantes : voir le bilan prerequis')
        if kind == 'hosting' and cycle.direct_realtime.approved(request):
            report['directRealtimeRules'] = rules.readiness(directory, observation_directory=directory)
        report['ready'] = True
    except Exception as error:
        report['failure'] = {'type':type(error).__name__}
        raise
    finally:
        cycle.write(directory / ('prerequisites-'+kind+'.json'), report)
    print('Prerequis '+kind+' : controles en lecture seule termines, aucune autorisation modifiee.')


if __name__ == '__main__':
    main(*sys.argv[1:])
