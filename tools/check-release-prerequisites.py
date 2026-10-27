"""Read-only prerequisite report before final approval. Never grants permissions."""
import importlib.util
import json
import os
from pathlib import Path
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


def main(directory, run_id, kind):
    cycle.require(os.environ.get('GITHUB_REF') == 'refs/heads/main' and os.environ.get('GITHUB_RUN_ATTEMPT') == '1',
                  'Lecture main/tentative1 requise')
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
    report = {'schema': 1, 'planRun': int(run_id), 'candidate': request['candidate'], 'kind': kind,
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
        scope = cycle.bcc.for_request(request)
        limited_oct27 = scope.contract().get('limitedOct27')
        if kind == 'backend' and limited_oct27:
            expected += ['cloudscheduler.jobs.get','cloudscheduler.jobs.update']
        granted = read(IAM, {'permissions': expected}).get('permissions', [])
        report['missingPermissions'] = sorted(set(expected) - set(granted))
        if kind == 'backend' and selected:
            state = load('readiness_state', 'production-release-state.py')
            functions = state.inventory()
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
        report['ready'] = True
    finally:
        cycle.write(directory / ('prerequisites-'+kind+'.json'), report)
    print('Prerequis '+kind+' : controles en lecture seule termines, aucune autorisation modifiee.')


if __name__ == '__main__':
    main(*sys.argv[1:])
