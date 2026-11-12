"""Deployment metadata and code rollback only; no business data API calls."""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time
from types import SimpleNamespace
import urllib.parse
import urllib.request

PREFIX = "projects/livepalmes/locations/europe-west1/functions/"
API = "https://cloudfunctions.googleapis.com/v2/"


def request(url, method="GET", body=None):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in {"cloudfunctions.googleapis.com", "firebasehosting.googleapis.com"}:
        raise ValueError("API non autorisee")
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"], text=True, stderr=subprocess.DEVNULL).strip()
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def inventory():
    result, page = [], ""
    for _ in range(50):
        value = request(API + "projects/livepalmes/locations/-/functions?pageSize=100" + ("&pageToken=" + urllib.parse.quote(page) if page else ""))
        if value.get("unreachable"):
            raise ValueError("Inventaire incomplet")
        result.extend(value.get("functions", []))
        page = value.get("nextPageToken", "")
        if not page:
            return result
    raise ValueError("Pagination non terminee")


def identity(function):
    return {key: function.get(key) for key in ["name", "updateTime", "state"]} | {"revision": function.get("serviceConfig", {}).get("revision")}


def check_after(backup, destination, require_success):
    report = json.loads((backup / "report.json").read_text())
    before = {f["name"]: f for f in json.loads((backup / "functions.json").read_text())}
    after = {f["name"]: f for f in inventory()}
    selected = {f["name"] for f in report["functions"]} | {PREFIX + name for name in report["newFunctions"]}
    direct_policy = None
    if report.get('directRelease'):
        spec = importlib.util.spec_from_file_location('direct_state_policy', Path(__file__).with_name('direct-production-policy.py'))
        direct_policy = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(direct_policy)
        direct_policy.require(report['candidate'] == direct_policy.CANDIDATE and len(before) == 116
            and selected == {PREFIX+name for name in direct_policy.SELECTED}
            and report['newFunctions'] == [direct_policy.NEW], 'Rapport Direct hors contrat')
    bcc_policy = None
    if report.get('additionalBccFunctions'):
        spec = importlib.util.spec_from_file_location('bcc_state_policy', Path(__file__).with_name('bcc-publication-policy.py'))
        bcc_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(bcc_policy)
        bcc_policy = bcc_policy.for_request(report)
        if sorted(report['additionalBccFunctions']) != bcc_policy.contract()['selected']:
            raise ValueError('Selection CCI du rapport differente')
    errors = []
    public_navigation_direct_policy = None
    if report.get('additionalPublicNavigationDirectFunctions'):
        spec = importlib.util.spec_from_file_location('public_navigation_direct_state_policy', Path(__file__).with_name('public-navigation-direct-production-policy.py'))
        public_navigation_direct_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(public_navigation_direct_policy)
        c = public_navigation_direct_policy.contract()
        public_navigation_direct_policy.require(report['additionalPublicNavigationDirectFunctions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == []
            and report.get('public_navigation_directNapBinding') == public_navigation_direct_policy.initial(list(before.values())),
            'Rapport navigation publique/Direct hors contrat')
        try:
            public_navigation_direct_policy.assert_retained(before,after,SimpleNamespace(identity=identity,rollback_patch=rollback_patch))
        except ValueError as error:
            errors.append(str(error))
    public_navigation_touch_policy = None
    if report.get('additionalPublicNavigationTouchFunctions'):
        spec = importlib.util.spec_from_file_location('public_navigation_touch_state_policy', Path(__file__).with_name('public-navigation-touch-production-policy.py'))
        public_navigation_touch_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(public_navigation_touch_policy)
        c = public_navigation_touch_policy.contract()
        public_navigation_touch_policy.require(report['additionalPublicNavigationTouchFunctions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == []
            and report.get('public_navigation_touchNapBinding') == public_navigation_touch_policy.initial(list(before.values())),
            'Rapport navigation tactile hors contrat')
        try:
            public_navigation_touch_policy.assert_retained(before,after,SimpleNamespace(identity=identity,rollback_patch=rollback_patch))
        except ValueError as error:
            errors.append(str(error))
    reference_policy = None
    if report.get('additionalReferenceCleanupFunctions'):
        spec = importlib.util.spec_from_file_location('reference_cleanup_state_policy', Path(__file__).with_name('reference-cleanup-production-policy.py'))
        reference_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(reference_policy)
        c = reference_policy.contract()
        reference_policy.require(report['additionalReferenceCleanupFunctions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == []
            and report.get('reference_cleanupNapBinding') == reference_policy.initial(list(before.values())), 'Rapport nageurs/migrations hors contrat')
    november10_policy = None
    if report.get('additionalNovember10Functions'):
        spec = importlib.util.spec_from_file_location('november10_state_policy', Path(__file__).with_name('november10-validated-release-policy.py'))
        november10_policy = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(november10_policy)
        c = november10_policy.contract()
        november10_policy.require(report['additionalNovember10Functions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == []
            and report.get('november10NapBinding') == november10_policy.initial(list(before.values())),
            'Rapport du 10 novembre hors contrat')
    november_policy = None
    if report.get('additionalNovemberFunctions'):
        spec = importlib.util.spec_from_file_location('november_state_policy', Path(__file__).with_name('november-validated-release-policy.py'))
        november_policy = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(november_policy)
        c = november_policy.contract()
        november_policy.require(report['additionalNovemberFunctions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == c['newFunctions'],
            'Rapport du 8 novembre hors contrat')
    team_policy = None
    if report.get('additionalTeamTrophyFunctions'):
        spec = importlib.util.spec_from_file_location('team_state_policy', Path(__file__).with_name('team-trophy-release-policy.py'))
        team_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(team_policy)
        team_policy.require(report['additionalTeamTrophyFunctions'] == team_policy.SOURCE_ONLY
                            and report['candidate'] == team_policy.CANDIDATE
                            and report['newFunctions'] == [team_policy.NEW] and len(before) == 115,
                            'Rapport equipes/trophee hors contrat')
    validated_policy = None
    if report.get('additionalValidatedPortalFunctions'):
        spec = importlib.util.spec_from_file_location('validated_portal_state', Path(__file__).with_name('validated-portal-release-policy.py'))
        validated_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(validated_policy)
        c = validated_policy.contract()
        validated_policy.require(report['additionalValidatedPortalFunctions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == [c['newFunction']],
            'Rapport CMAS/CCI/nouveautes hors contrat')
    portal_policy = None
    if report.get('additionalPortalAccessNsFunctions'):
        spec = importlib.util.spec_from_file_location('portal_ns_state_policy', Path(__file__).with_name('portal-access-ns-release-policy.py'))
        portal_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(portal_policy)
        c = portal_policy.contract()
        portal_policy.require(report['additionalPortalAccessNsFunctions'] == c['sourceOnly']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and not report['newFunctions'], 'Rapport portail NS/acces hors contrat')
    account_policy = None
    if report.get('additionalNapAccountFunctions'):
        spec = importlib.util.spec_from_file_location('account_state_policy', Path(__file__).with_name('nap-account-release-policy.py'))
        account_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(account_policy)
        c = account_policy.contract()
        account_policy.require(report['additionalNapAccountFunctions'] == c['selected']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX+n for n in c['selected']} and report['newFunctions'] == [account_policy.NAME],
            'Rapport annuaire NAP hors contrat')
    nap_policy = None
    if report.get('additionalNapRetainedFunctions'):
        spec = importlib.util.spec_from_file_location('nap_retained_state_policy', Path(__file__).with_name('nap-retained-source-policy.py'))
        nap_policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(nap_policy)
        c = nap_policy.contract()
        nap_policy.require(report['additionalNapRetainedFunctions'] == c['selected']
            and report['candidate'] == c['candidate'] and len(before) == c['inventoryCount']
            and selected == {PREFIX + n for n in c['selected']} and not report['newFunctions'],
            'Rapport complement NAP hors contrat')
    for name in set(before) - selected:
        if name not in after or identity(before[name]) != identity(after[name]):
            errors.append("Function exclue modifiee: " + name.split("/")[-1])
    for name in selected:
        f = after.get(name)
        if f and direct_policy:
            try:
                if name == PREFIX+direct_policy.NEW:
                    direct_policy.assert_new(f)
                    direct_policy.require(f['serviceConfig']['serviceAccountEmail'] == report['directRuntimeAccount'],
                                          'Compte runtime Direct different de la reference NAP')
                else:
                    direct_policy.assert_reader(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error))
        if not f or f.get("state") != "ACTIVE":
            errors.append("Function non active: " + name.split("/")[-1])
        elif public_navigation_direct_policy is not None:
            try:
                public_navigation_direct_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch), report['public_navigation_directNapBinding'])
            except ValueError as error:
                errors.append(str(error))
        elif public_navigation_touch_policy is not None:
            try:
                public_navigation_touch_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch), report['public_navigation_touchNapBinding'])
            except ValueError as error:
                errors.append(str(error))
        elif reference_policy is not None:
            try:
                reference_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch), report['reference_cleanupNapBinding'])
            except ValueError as error:
                errors.append(str(error))
        elif november10_policy is not None:
            try:
                november10_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch), report['november10NapBinding'])
            except ValueError as error:
                errors.append(str(error))
        elif november_policy is not None and name.split('/')[-1] in november_policy.contract()['sourceOnly']:
            try:
                november_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error))
        elif account_policy is not None:
            try:
                if name == PREFIX+account_policy.NAME:
                    account_policy.assert_new(f)
                else:
                    account_policy.assert_existing(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error)+': '+name.split('/')[-1])
        elif nap_policy is not None:
            try:
                nap_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error) + ': ' + name.split('/')[-1])
        elif bcc_policy is not None and name.split('/')[-1] in report['additionalBccFunctions']:
            try:
                if name.split('/')[-1] == bcc_policy.contract()['worker']:
                    bcc_policy.assert_worker(f, report['bccWorkerService'], SimpleNamespace(rollback_patch=rollback_patch))
                else:
                    bcc_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch,
                        bcc_runtime_reference=before.get(PREFIX+'processNapCompetitionNotifications')))
                if f.get('labels', {}).get('livepalmes-commit') != report['candidate']:
                    raise ValueError('Commit CCI different')
            except ValueError as error:
                errors.append(str(error) + ': ' + name.split('/')[-1])
        elif f.get("serviceConfig", {}).get("environmentVariables", {}).get("LIVEPALMES_ENFORCE_APP_CHECK", "false") != (before[name].get('serviceConfig', {}).get('environmentVariables', {}).get('LIVEPALMES_ENFORCE_APP_CHECK', 'false') if name.split('/')[-1] in (report.get('additionalPdfFunctions', []) + report.get('additionalDtnFunctions', []) + report.get('additionalClubDirectoryFunctions', []) + report.get('additionalGroupedFunctions', []) + report.get('additionalLicenseReportFunctions', [])) else report["appCheck"]):
            errors.append("App Check different: " + name.split("/")[-1])
        elif report.get("commitLabel") and f.get("labels", {}).get("livepalmes-commit") != report["candidate"]:
            errors.append("Commit Function different: " + name.split("/")[-1])
        elif not report.get("commitLabel") and name in before and f.get("updateTime") == before[name].get("updateTime"):
            errors.append("Function non actualisee: " + name.split("/")[-1])
        if f and team_policy:
            try:
                if name == PREFIX+team_policy.NEW:
                    team_policy.assert_new(f)
                elif name.split('/')[-1] in team_policy.SOURCE_ONLY:
                    team_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error))
        if f and november_policy and name.split('/')[-1] in november_policy.contract()['newFunctions']:
            try:
                november_policy.assert_new(f)
            except ValueError as error:
                errors.append(str(error))
        if f and portal_policy and name.split('/')[-1] in [portal_policy.NAME, portal_policy.ACCOUNT]:
            try:
                portal_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error))
        if f and validated_policy and name.split('/')[-1] in validated_policy.contract()['sourceOnly']:
            try:
                validated_policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error))
        if f and validated_policy and name.split('/')[-1] == validated_policy.contract()['newFunction']:
            try:
                validated_policy.assert_new(f)
            except ValueError as error:
                errors.append(str(error))
        if f and name.split('/')[-1] in (report.get('additionalPdfFunctions', []) + report.get('additionalDtnFunctions', []) + report.get('additionalClubDirectoryFunctions', []) + report.get('additionalLicenseReportFunctions', [])):
            old = rollback_patch(before[name], {})
            new = rollback_patch(f, {})
            if name.split('/')[-1] == 'resolveEngagementSwimmerChangeRequest' and report.get('nativeIdentityNapSecret'):
                expected = [{'key': 'LIVEPALMES_NAP_PASSWORD', 'secret': 'LIVEPALMES_NAP_PASSWORD',
                             'projectId': 'livepalmes', 'version': 'latest'}]
                actual = new['serviceConfig'].get('secretEnvironmentVariables', [])
                actual = [{**item, 'projectId': 'livepalmes' if str(item.get('projectId')) in {'livepalmes', '718081132564'} else item.get('projectId')} for item in actual]
                if actual != expected:
                    errors.append('Liaison NAP corrections differente')
                old['serviceConfig'].pop('secretEnvironmentVariables', None)
                new['serviceConfig'].pop('secretEnvironmentVariables', None)
            if any(old.get(k) != new.get(k) for k in ['serviceConfig', 'eventTrigger', 'buildConfig']):
                errors.append('Configuration PDF modifiee: ' + name.split('/')[-1])
            if name.split('/')[-1] in report.get('additionalLicenseReportFunctions', []):
                spec = importlib.util.spec_from_file_location('license_state_policy', Path(__file__).with_name('license-report-release-policy.py'))
                policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(policy)
                try:
                    if report['additionalLicenseReportFunctions'] != [policy.NAME] or report['candidate'] != policy.contract(report)['candidate']:
                        raise ValueError('Rapport licences hors contrat')
                    policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
                except ValueError as error:
                    errors.append(str(error))
        if f and name.split('/')[-1] in report.get('additionalGroupedFunctions', []):
            spec = importlib.util.spec_from_file_location('grouped_policy', Path(__file__).with_name('grouped-publication-policy.py'))
            policy = importlib.util.module_from_spec(spec); spec.loader.exec_module(policy)
            if sorted(report['additionalGroupedFunctions']) != policy.contract()['selected']:
                errors.append('Selection groupee differente')
            try:
                policy.assert_config(before[name], f, SimpleNamespace(rollback_patch=rollback_patch))
            except ValueError as error:
                errors.append(str(error) + ': ' + name.split('/')[-1])
        short = name.split('/')[-1]
        if f and short in report.get('additionalAccessRequestFunctions', []):
            secrets = f.get('serviceConfig', {}).get('secretEnvironmentVariables', [])
            expected = report.get('accessRequestExpectedSecrets', [])
            if len(expected) != 7 or len(secrets) != len(expected) or {s.get('key') for s in secrets} != set(expected) or any(
                    s.get('secret') != s.get('key') or str(s.get('projectId')) not in {'livepalmes', '718081132564'}
                    or re.fullmatch(r'latest|[1-9][0-9]*', str(s.get('version'))) is None for s in secrets):
                errors.append('Secrets demandes NAP differents: ' + short)
        if f and short in report.get('additionalPublicNapFunctions', []):
            secrets = f.get('serviceConfig', {}).get('secretEnvironmentVariables', [])
            if len(secrets) != 1 or secrets[0].get('key') != 'LIVEPALMES_NAP_PASSWORD' or secrets[0].get('secret') != 'LIVEPALMES_NAP_PASSWORD' or str(secrets[0].get('projectId')) not in {'livepalmes', '718081132564'}:
                errors.append('Secret lecteur NAP different: ' + short)
        if f and short in report.get('additionalNotificationFunctions', []):
            secrets = f.get('serviceConfig', {}).get('secretEnvironmentVariables', [])
            expected_secrets = report.get('notificationExpectedSecrets', {}).get(short)
            if expected_secrets is None or len(secrets) != len(expected_secrets) or {s.get('key') for s in secrets} != set(expected_secrets) or any(
                    s.get('secret') != s.get('key') or str(s.get('projectId')) not in {'livepalmes', '718081132564'} for s in secrets):
                errors.append('Secrets notifications differents: ' + short)
            if short == 'closeDueEngagementCompetitions' and (not before.get(name) or
                    f.get('eventTrigger', {}).get('eventType') != before[name].get('eventTrigger', {}).get('eventType') or
                    f.get('eventTrigger', {}).get('pubsubTopic') != before[name].get('eventTrigger', {}).get('pubsubTopic')):
                errors.append('Declencheur de cloture modifie: ' + short)
    if set(after) != set(before) | selected:
        errors.append("Inventaire inattendu")
    destination.write_text(json.dumps({"candidate": report["candidate"], "functions": [identity(f) for f in after.values()], "errors": errors}, indent=2))
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write(f"\nFunctions selectionnees : {len(selected)}. Inventaire PROD : {len(after)}. Ecarts : {len(errors)}.\n")
        for error in errors:
            summary.write("- " + error + "\n")
    if require_success and errors:
        raise ValueError("Controle des Functions en echec")


def wait_operation(operation):
    started = time.monotonic()
    name = str(operation.get('metadata', {}).get('target', '')).split('/')[-1]
    name = name if re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,100}', name) else 'fonction-non-renseignee'
    result = 'interrompue'
    try:
        value = _wait_operation(operation)
        result = 'terminee'
        return value
    finally:
        seconds = round(time.monotonic() - started, 1)
        message = f'Operation source {name} : {result}, {seconds} s'
        print(message, flush=True)
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            try:
                with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
                    stream.write('\n' + message + '\n')
            except OSError:
                print('Resume de duree indisponible ; resultat de publication conserve.', flush=True)


def _wait_operation(operation):
    for _ in range(180):
        if operation.get("done"):
            if operation.get("error"):
                raise ValueError("Operation Firebase en echec")
            return
        time.sleep(10)
        operation = request(API + operation["name"])
    raise ValueError("Operation Firebase non terminee")


def rollback_patch(function, source):
    # Only writable ServiceConfig fields. No business calls or triggers invoked.
    writable = {"timeoutSeconds", "availableMemory", "availableCpu", "maxInstanceCount", "minInstanceCount", "maxInstanceRequestConcurrency", "ingressSettings", "serviceAccountEmail", "environmentVariables", "allTrafficOnLatestRevision", "vpcConnector", "vpcConnectorEgressSettings", "secretEnvironmentVariables", "secretVolumes", "securityLevel", "binaryAuthorizationPolicy", "directVpcNetworkInterface", "directVpcEgress"}
    build_fields = {"runtime", "entryPoint", "environmentVariables", "workerPool", "dockerRepository", "serviceAccount"}
    result = {"name": function["name"], "buildConfig": {k: v for k, v in function["buildConfig"].items() if k in build_fields}, "serviceConfig": {k: v for k, v in function["serviceConfig"].items() if k in writable}, "labels": function.get("labels", {})}
    result["buildConfig"]["source"] = {"storageSource": source}
    if function.get("eventTrigger"):
        event_fields = {"triggerRegion", "eventType", "eventFilters", "pubsubTopic", "serviceAccountEmail", "retryPolicy", "channel"}
        result["eventTrigger"] = {k: v for k, v in function["eventTrigger"].items() if k in event_fields}
    return result


def rollback(backup, after_path, apply=True):
    if os.environ.get("CONFIRM_CODE_ROLLBACK") != "livepalmes":
        raise ValueError("Confirmation explicite du retour arriere requise")
    report = json.loads((backup / "report.json").read_text())
    after_report = json.loads(after_path.read_text())
    if after_report["candidate"] != report["candidate"]:
        raise ValueError("Sauvegarde et publication differentes")
    before = {f["name"]: f for f in json.loads((backup / "functions.json").read_text())}
    expected = {f["name"]: f for f in after_report["functions"]}
    current = {f["name"]: f for f in inventory()}
    selected = {f["name"] for f in report["functions"]} | {PREFIX + name for name in report["newFunctions"]}
    for name in selected:
        if not name.startswith(PREFIX):
            raise ValueError("Function hors perimetre PROD")
        if (name in current) != (name in expected) or (name in current and identity(current[name]) != expected[name]):
            raise ValueError("Production modifiee depuis la publication, retour arriere bloque")
    archives = {}
    for source in report["sources"]:
        archive = backup / "sources" / (source["functions"][0] + ".zip")
        if hashlib.sha256(archive.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError("Archive alteree")
        for name in source["functions"]:
            archives[PREFIX + name] = archive
    if not apply:
        print("Sauvegarde, archives et revisions de retour arriere verifiees.")
        return
    def restore(name):
        if name not in before:
            if name in current:
                wait_operation(request(API + name, "DELETE"))
            return
        if name in current and identity(current[name]) == identity(before[name]):
            return
        upload = request(API + "projects/livepalmes/locations/europe-west1/functions:generateUploadUrl", "POST", {})
        url = urllib.parse.urlsplit(upload["uploadUrl"])
        if url.scheme != "https" or not (url.hostname == "storage.googleapis.com" or url.hostname.endswith(".storage.googleapis.com")):
            raise ValueError("Destination archive interdite")
        req = urllib.request.Request(upload["uploadUrl"], method="PUT", data=archives[name].read_bytes(), headers={"Content-Type": "application/zip"})
        with urllib.request.urlopen(req, timeout=120):
            pass
        mask = "build_config.source,build_config.runtime,build_config.entry_point,build_config.environment_variables,build_config.worker_pool,build_config.docker_repository,build_config.service_account,service_config,labels"
        if before[name].get("eventTrigger"):
            mask += ",event_trigger"
        wait_operation(request(API + name + "?updateMask=" + mask, "PATCH", rollback_patch(before[name], upload["storageSource"])))
    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(restore, sorted(selected)))
    print("Retour arriere Functions termine ; aucune donnee metier modifiee.")


def hosting(backup, after_path, restore=False):
    url = "https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases"
    current = request(url + "?pageSize=1")["releases"][0]
    if not restore:
        after_path.write_text(json.dumps({"name": current["name"], "version": current["version"]["name"]}))
        print("Version Hosting active: " + current["version"]["name"])
        return
    expected = json.loads(after_path.read_text())
    if current["name"] != expected["name"]:
        raise ValueError("Hosting modifie depuis la publication")
    previous = json.loads((backup / "hosting.json").read_text())["version"]["name"]
    if not re.fullmatch(r"sites/livepalmes/versions/[A-Za-z0-9_-]+", previous):
        raise ValueError("Version Hosting de repli inattendue")
    if current["version"]["name"] != previous:
        request(url + "?versionName=" + urllib.parse.quote(previous, safe=""), "POST", {"message": "Retour arriere code LivePalmes"})
    print("Hosting revenu a la version sauvegardee.")


if __name__ == "__main__":
    credentials = json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
    if credentials.get("project_id") != "livepalmes":
        raise ValueError("Compte PROD requis")
    if sys.argv[1] == "check":
        check_after(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4] == "success")
    elif sys.argv[1] in {"rollback", "validate-rollback"}:
        rollback(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[1] == "rollback")
    elif sys.argv[1] in {"hosting-state", "hosting-rollback"}:
        hosting(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[1] == "hosting-rollback")
    else:
        raise ValueError("Mode inconnu")
