"""Read deployment metadata and source archives. Never invoke business functions."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import io
import json
import os
import re
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import zipfile


def archive_manifest(data):
    if len(data) > 64 * 1024 * 1024:
        raise ValueError("Archive trop volumineuse")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos = [i for i in archive.infolist() if not i.is_dir()]
        if len(infos) > 3000 or sum(i.file_size for i in infos) > 256 * 1024 * 1024:
            raise ValueError("Contenu archive hors limites")
        names = [i.filename for i in infos]
        # ZipInfo normalizes backslashes on Windows. Validate the original ZIP
        # names before using normalized names for the manifest and lookups.
        originals = [i.orig_filename for i in infos]
        if len(set(names)) != len(names) or any(n.startswith("/") or ".." in n.split("/") or "\\" in n for n in originals):
            raise ValueError("Chemin archive invalide")
        # Hashes only; no old code is executed or extracted, no file contents logged.
        return {i.filename: hashlib.sha256(archive.read(i)).hexdigest() for i in infos}


def access_request_runtime_allowed(service):
    """Preserve the six existing SMTP bindings, optionally already connected to NAP."""
    expected = {"LIVEPALMES_SMTP_HOST", "LIVEPALMES_SMTP_PORT", "LIVEPALMES_SMTP_USER", "LIVEPALMES_SMTP_PASS", "LIVEPALMES_SMTP_SECURE", "LIVEPALMES_MAIL_FROM"}
    secrets = service.get('secretEnvironmentVariables', [])
    keys = [s.get('key') for s in secrets]
    return (not service.get('secretVolumes') and len(keys) == len(set(keys))
            and set(keys) in (expected, expected | {'LIVEPALMES_NAP_PASSWORD'})
            and all(set(s) == {'key', 'secret', 'projectId', 'version'}
                    and s['key'] == s['secret'] and str(s['projectId']) in {'livepalmes', '718081132564'}
                    and re.fullmatch(r'latest|[1-9][0-9]*', str(s['version'])) for s in secrets)
            and ordinary_runtime_allowed({**service, 'secretEnvironmentVariables': []}))


def ordinary_runtime_allowed(service):
    """Recognize the existing PROD NAP binding; never read secret values."""
    allowed_keys = {"EVENTARC_CLOUD_EVENT_SOURCE", "FIREBASE_CONFIG", "FUNCTION_SIGNATURE_TYPE", "FUNCTION_TARGET", "GCLOUD_PROJECT", "LIVEPALMES_ENFORCE_APP_CHECK", "LOG_EXECUTION_ID"}
    if set(service.get("environmentVariables", {})) - allowed_keys or service.get("secretVolumes"):
        return False
    secrets = service.get("secretEnvironmentVariables", [])
    if not secrets:
        return True
    if len(secrets) != 1:
        return False
    secret = secrets[0]
    return (set(secret) == {"key", "secret", "projectId", "version"}
            and secret["key"] == secret["secret"] == "LIVEPALMES_NAP_PASSWORD"
            and str(secret["projectId"]) in {"livepalmes", "718081132564"}
            and re.fullmatch(r"latest|[1-9][0-9]*", str(secret["version"])) is not None)


def club_directory_runtime_allowed(name, service):
    expected = [] if name == 'listEngagementSwimmerChangeRequests' else ['LIVEPALMES_NAP_PASSWORD']
    return (name in {'requestEngagementClubSwimmerChange', 'listEngagementSwimmerChangeRequests',
                     'resolveEngagementSwimmerChangeRequest'}
            and ordinary_runtime_allowed(service)
            and sorted(s.get('key', '') for s in service.get('secretEnvironmentVariables', [])) == expected)


def main():
    credentials = json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
    if credentials["project_id"] != "livepalmes":
        raise ValueError("Compte PROD requis")
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"], text=True, stderr=subprocess.DEVNULL).strip()

    def request(url, body=None):
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.hostname not in ["cloudfunctions.googleapis.com", "firebasehosting.googleapis.com", "cloudresourcemanager.googleapis.com"]:
            raise ValueError("API interdite")
        if body is not None and not (parsed.path.endswith(":generateDownloadUrl") or parsed.path.endswith(":testIamPermissions")):
            raise ValueError("Operation interdite")
        req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)

    root = Path(os.environ["CANDIDATE_DIRECTORY"])
    output = Path(os.environ["RUNNER_TEMP"]) / "production-preflight"
    output.mkdir()
    backup = Path(os.environ["RELEASE_BACKUP_DIRECTORY"]) if os.environ.get("RELEASE_BACKUP_DIRECTORY") else None
    if backup:
        backup.mkdir()
        (backup / "sources").mkdir()
    report = {"candidate": os.environ["CANDIDATE_SHA"], "functions": [], "sources": [], "errors": []}
    try:
        permissions = request("https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions", {"permissions": ["cloudfunctions.functions.setIamPolicy"]})
        report["newHttpsPermission"] = "cloudfunctions.functions.setIamPolicy" in permissions.get("permissions", [])
        releases = request("https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1").get("releases", [])
        if not releases:
            raise ValueError("Release Hosting absente")
        version = releases[0]["version"]["name"]
        if os.environ.get("EXPECTED_HOSTING_VERSION") and version != os.environ["EXPECTED_HOSTING_VERSION"]:
            raise ValueError("Hosting a change depuis le bilan")
        hosting = request("https://firebasehosting.googleapis.com/v1beta1/" + version)
        report["hostingRollback"] = {"version": version, "status": hosting.get("status")}
        if hosting.get("status") != "FINALIZED":
            report["errors"].append("Version Hosting de repli indisponible")
        if backup:
            releases = request("https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1").get("releases", [])
            if not releases or releases[0].get("version", {}).get("name") != version:
                raise ValueError("Version Hosting active differente du bilan")
            (backup / "hosting.json").write_text(json.dumps(releases[0]))
        functions = []
        page = ""
        seen = set()
        for _ in range(50):
            data = request("https://cloudfunctions.googleapis.com/v2/projects/livepalmes/locations/-/functions?pageSize=100" + ("&pageToken=" + urllib.parse.quote(page) if page else ""))
            if data.get("unreachable"):
                raise ValueError("Regions inaccessibles")
            functions.extend(data.get("functions", []))
            page = data.get("nextPageToken", "")
            if not page:
                break
            if page in seen:
                raise ValueError("Pagination repetee")
            seen.add(page)
        else:
            raise ValueError("Inventaire incomplet")
        selected = json.loads(subprocess.check_output(["node", "-e", 'const {ALL_SAFE_LOTS,activeLotFunctions}=require(process.argv[1]);console.log(JSON.stringify(ALL_SAFE_LOTS.flatMap(activeLotFunctions)))', str(root / "tools/firebase-test-backend-lots.js")], text=True))
        extra = []
        if os.environ.get('PLAN'):
            plan = json.loads((Path(os.environ['PLAN']) / 'request.json').read_text())
            spec = importlib.util.spec_from_file_location('cycle', Path(__file__).with_name('release-cycle.py'))
            cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
            extra = cycle.approved_extra_functions(plan)
        selected += extra
        if os.environ.get("RELEASE_SELECTION"):
            requested = json.loads(Path(os.environ["RELEASE_SELECTION"]).read_text())
            if not isinstance(requested, list) or len(requested) != len(set(requested)) or not set(requested).issubset(selected):
                raise ValueError("Selection hors perimetre")
            selected = requested
        selected_functions = [f for f in functions if f["name"].split("/")[-1] in selected]
        notification = cycle.approved_notification_functions(plan) if os.environ.get('PLAN') else []
        public_nap = cycle.approved_public_nap_functions(plan) if os.environ.get('PLAN') else []
        access_requests = cycle.approved_access_request_functions(plan) if os.environ.get('PLAN') else []
        if os.environ.get('PLAN'):
            cycle.require_access_request_selection(plan, selected)
        source_only = set(extra) - set(notification) - set(public_nap) - set(access_requests)
        bcc_names = cycle.approved_bcc_functions(plan) if os.environ.get('PLAN') else []
        bcc_contract = cycle.bcc.for_request(plan).contract() if bcc_names else {}
        allowed_new = {bcc_contract['worker']} if bcc_names and not bcc_contract.get('existingWorker') else set()
        account_names = cycle.nap_account.approved(plan) if os.environ.get('PLAN') else []
        if account_names:
            allowed_new = {cycle.nap_account.NAME}
            cycle.require(len(functions) == cycle.nap_account.contract()['inventoryCount']
                          and not any(f['name'].split('/')[-1] in allowed_new for f in functions),
                          'Inventaire initial annuaire NAP different')
            cycle.nap_account.references(functions)
        if not (source_only - allowed_new).issubset({f['name'].split('/')[-1] for f in selected_functions}):
            raise ValueError('Traitement PDF existant absent')
        report['additionalBccFunctions'] = bcc_names
        if bcc_names:
            cycle.require(len(functions) == bcc_contract.get('inventoryCount', 112) and not any(f['name'].split('/')[-1] in allowed_new for f in functions), 'Inventaire CCI avant sauvegarde different')
            ref = next(f for f in functions if f['name'].split('/')[-1] == cycle.bcc.REFERENCE)
            state_spec = importlib.util.spec_from_file_location('bcc_backup_state', Path(__file__).with_name('production-release-state.py'))
            state = importlib.util.module_from_spec(state_spec); state_spec.loader.exec_module(state)
            if bcc_contract.get('existingWorker'):
                worker_ref = next(f for f in functions if f['name'].split('/')[-1] == bcc_contract['worker'])
                report['bccWorkerService'] = state.rollback_patch(worker_ref, {})['serviceConfig']
            else:
                report['bccWorkerService'] = cycle.bcc.for_request(plan).worker_service(state.rollback_patch(ref, {}))
        report['additionalPdfFunctions'] = plan.get('additionalPdfFunctions', []) if os.environ.get('PLAN') else []
        report['additionalClubDirectoryFunctions'] = cycle.approved_club_directory_functions(plan) if os.environ.get('PLAN') else []
        report['additionalGroupedFunctions'] = cycle.approved_grouped_functions(plan) if os.environ.get('PLAN') else []
        report['additionalLicenseReportFunctions'] = cycle.approved_license_report_functions(plan) if os.environ.get('PLAN') else []
        report['additionalPortalAccessNsFunctions'] = cycle.portal_access_ns.approved(plan) if os.environ.get('PLAN') else []
        if report['additionalPortalAccessNsFunctions']:
            cycle.portal_access_ns.initial(functions)
        report['additionalNapRetainedFunctions'] = cycle.nap_retained.approved(plan) if os.environ.get('PLAN') else []
        report['additionalNapAccountFunctions'] = account_names
        report['additionalDtnFunctions'] = plan.get('additionalDtnFunctions', []) if os.environ.get('PLAN') else []
        report['nativeIdentityNapSecret'] = cycle.approved_native_identity_secret(plan) if os.environ.get('PLAN') else False
        report['additionalNotificationFunctions'] = notification
        report['additionalPublicNapFunctions'] = public_nap
        report['additionalAccessRequestFunctions'] = access_requests
        report['accessRequestExpectedSecrets'] = cycle.ACCESS_REQUEST_SECRETS if access_requests else []
        if notification:
            contract = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require(process.argv[1]).plan(process.argv[2])))',
                str(Path(__file__).with_name('prepare-production-notifications.js')), report['candidate']], text=True))
            report['notificationExpectedSecrets'] = contract['expectedSecrets']
        app_checks = set(f.get("serviceConfig", {}).get("environmentVariables", {}).get("LIVEPALMES_ENFORCE_APP_CHECK", "false") for f in selected_functions if f['name'].split('/')[-1] not in source_only)
        if not app_checks and set(selected).issubset(set(public_nap) | source_only):
            app_checks = {'false'}  # New public HTTP reader; no callable App Check setting.
        if selected and (len(app_checks) != 1 or not app_checks.issubset({"true", "false"})):
            raise ValueError("App Check heterogene ou invalide")
        report["appCheck"] = next(iter(app_checks), "false")
        report["newFunctions"] = sorted(set(selected) - {f["name"].split("/")[-1] for f in selected_functions})
        if backup:
            for f in selected_functions:
                service = f.get("serviceConfig", {})
                if f['name'].split('/')[-1] in report['additionalLicenseReportFunctions']:
                    cycle.license_release.runtime(f)
                if f['name'].split('/')[-1] in report['additionalNapRetainedFunctions']:
                    cycle.nap_retained.runtime(f)
                if f['name'].split('/')[-1] in report['additionalClubDirectoryFunctions'] and not club_directory_runtime_allowed(f['name'].split('/')[-1], service):
                    raise ValueError('Configuration ou binding NAP repertoires club inattendu')
                if f['name'].split('/')[-1] in report['additionalGroupedFunctions']:
                    if not ordinary_runtime_allowed(service):
                        raise ValueError('Configuration groupee initiale inattendue')
                    if f['name'].split('/')[-1] == cycle.grouped.NOTIFY:
                        cycle.grouped.notification_service(service)
                if f['name'].split('/')[-1] in bcc_names:
                    keys = {s.get('key') for s in service.get('secretEnvironmentVariables', [])}
                    mail_names = {'notifyEngagementCompetitionDocuments', 'processNapCompetitionNotifications', 'closeDueEngagementCompetitions'}
                    if bcc_contract.get('limitedOct27'):
                        cycle.bcc.for_request(plan).initial_runtime(f['name'].split('/')[-1], service, ordinary_runtime_allowed)
                    elif f['name'].split('/')[-1] in mail_names:
                        if keys != cycle.bcc.MAIL_KEYS or len(service.get('secretEnvironmentVariables', [])) != 8 or not ordinary_runtime_allowed({**service, 'secretEnvironmentVariables': []}):
                            raise ValueError('Configuration mail CCI initiale inattendue')
                    elif not ordinary_runtime_allowed(service):
                        raise ValueError('Configuration CCI initiale inattendue')
                if f['name'].split('/')[-1] in access_requests and not access_request_runtime_allowed(service):
                    raise ValueError('Configuration demandes acces inattendue')
                if f['name'].split('/')[-1] not in extra and not ordinary_runtime_allowed(service):
                    raise ValueError("Configuration runtime inattendue")
                if f.get("environment") != "GEN_2" or f.get("buildConfig", {}).get("runtime") != "nodejs22" or f.get("state") != "ACTIVE":
                    raise ValueError("Function PROD incompatible")
            (backup / "functions.json").write_text(json.dumps(functions))
            if bcc_contract.get('limitedOct27'):
                guard_spec = importlib.util.spec_from_file_location('oct27_backup_guard', Path(__file__).with_name('check-production-bcc.py'))
                guard = importlib.util.module_from_spec(guard_spec); guard_spec.loader.exec_module(guard)
                scheduler = guard.get(guard.SCHEDULER_URL, token)
                cycle.require(guard.scheduler_digest(scheduler) == bcc_contract['schedulerSha256'], 'Scheduler different avant sauvegarde')
                (backup/'scheduler.json').write_text(json.dumps(scheduler))
        sources = {}
        for f in selected_functions:
            source = f.get("buildConfig", {}).get("source", {}).get("storageSource")
            if not source:
                raise ValueError("Source de repli absente")
            key = json.dumps(source, sort_keys=True)
            sources.setdefault(key, []).append(f)
            report["functions"].append({"name": f["name"], "revision": f.get("serviceConfig", {}).get("revision"), "source": source, "environmentKeys": sorted(f.get("serviceConfig", {}).get("environmentVariables", {})), "secretCount": len(f.get("serviceConfig", {}).get("secretEnvironmentVariables", []))})
        def inspect_source(item):
            key, group = item
            f = group[0]
            try:
                signed = request("https://cloudfunctions.googleapis.com/v2/" + f["name"] + ":generateDownloadUrl", {})["downloadUrl"]
                parsed = urllib.parse.urlsplit(signed)
                if parsed.scheme != "https" or not (parsed.hostname == "storage.googleapis.com" or parsed.hostname.endswith(".storage.googleapis.com")):
                    raise ValueError("Hote source interdit")
                with urllib.request.urlopen(signed, timeout=60) as response:
                    archive = response.read(64 * 1024 * 1024 + 1)
                manifest = archive_manifest(archive)
                if backup:
                    (backup / "sources" / (f["name"].split("/")[-1] + ".zip")).write_bytes(archive)
                return {"source": json.loads(key), "functions": [x["name"].split("/")[-1] for x in group], "sha256": hashlib.sha256(archive).hexdigest(), "files": manifest}, None
            except urllib.error.HTTPError as error:
                return None, f"Source {f['name'].split('/')[-1]}: HTTP {error.code}"
            except Exception:
                return None, f"Source {f['name'].split('/')[-1]}: lecture indisponible"
        # Bounded parallel reads; only the main thread updates the report.
        with ThreadPoolExecutor(max_workers=6) as executor:
            for source_report, error in executor.map(inspect_source, sources.items()):
                if error:
                    report["errors"].append(error)
                else:
                    report["sources"].append(source_report)
        if not report["newHttpsPermission"]:
            report["errors"].append("Permission CLI manquante: cloudfunctions.functions.setIamPolicy")
    except urllib.error.HTTPError as error:
        report["errors"].append(f"API metadata: HTTP {error.code}")
    except Exception:
        report["errors"].append("Verification incomplete, aucun deploiement")
    (output / "report.json").write_text(json.dumps(report, indent=2))
    if backup:
        (backup / "report.json").write_text(json.dumps(report, indent=2))
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write("## Preparation PROD sans deploiement\n\n")
        summary.write(f"- Commit candidat : {report['candidate']}\n- Sources lisibles : {len(report['sources'])}\n- Functions existantes selectionnees : {len(report['functions'])}\n")
        summary.write(f"- Hosting de repli : {report.get('hostingRollback')}\n- App Check conserve : {report.get('appCheck')}\n")
        environment_keys = sorted({key for function in report["functions"] for key in function.get("environmentKeys", [])})
        summary.write(f"- Noms des variables runtime (aucune valeur) : {environment_keys}\n")
        summary.write(f"- Functions selectionnees avec secrets : {sum(bool(f.get('secretCount')) for f in report['functions'])}\n")
        for error in report["errors"]:
            summary.write(f"- BLOCAGE : {error}\n")
        summary.write("\nAucune donnee metier lue ou modifiee.\n")
        summary.write("Sources conservees temporairement pour chiffrement avant publication.\n" if backup else "Archives controlees, pas conservees en sauvegarde.\n")
    if report.get("appCheck"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as output_file:
            output_file.write("app_check=" + report["appCheck"] + "\n")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
