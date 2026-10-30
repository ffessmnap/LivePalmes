"""Update only the source of explicitly approved existing PDF/DTN treatments.

No invocation, IAM change, Scheduler API, secret access or business data call.
The ordinary deployment path continues to exclude email and scheduled functions.
"""
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone

ALLOWED = {'prepareEngagementClubRecapEmails', 'closeDueEngagementCompetitions', 'resumePerformancePublicationJobs', 'resolveEngagementSwimmerChangeRequest', 'requestEngagementClubSwimmerChange', 'listEngagementSwimmerChangeRequests'}


def source_patch(before, source, sha, native_identity=False):
    if before['name'].split('/')[-1] not in ALLOWED:
        raise ValueError('Traitement hors autorisation PDF')
    result = {'name': before['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': sha}}
    if native_identity:
        if before['name'].split('/')[-1] != 'resolveEngagementSwimmerChangeRequest':
            raise ValueError('Liaison NAP reservee aux corrections de nageurs')
        result['serviceConfig'] = {'secretEnvironmentVariables': [{'key': 'LIVEPALMES_NAP_PASSWORD',
            'secret': 'LIVEPALMES_NAP_PASSWORD', 'projectId': 'livepalmes', 'version': 'latest'}]}
    return result


def archive(candidate, sha):
    if subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=candidate, text=True).strip() != sha:
        raise ValueError('Candidat different du bilan')
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=candidate).strip():
        raise ValueError('Candidat modifie')
    files = subprocess.check_output(['git', 'ls-files', '-z', 'functions/'], cwd=candidate, text=True).split('\0')
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w', zipfile.ZIP_DEFLATED) as target:
        for name in filter(None, files):
            path = Path(name)
            if any(p.startswith('.') for p in path.parts) or path.name == 'AGENTS.md':
                continue
            full = candidate / path
            if full.is_symlink() or not full.resolve().is_relative_to(candidate.resolve() / 'functions'):
                raise ValueError('Source hors dossier Functions')
            target.write(full, str(path.relative_to('functions')))
    if data.tell() > 64 * 1024 * 1024:
        raise ValueError('Archive trop volumineuse')
    return data.getvalue()


def pending_club_sources(names, before, current, previous, candidate, state):
    """Resume only an attested deployment of this candidate, never an unknown revision."""
    pending = []
    for name in names:
        full = state.PREFIX + name
        if full not in before or full not in current or before[full].get('state') != 'ACTIVE':
            raise ValueError('Traitement club existant indisponible')
        if state.identity(current[full]) == state.identity(before[full]):
            pending.append(name)
            continue
        if (previous.get(full) != state.identity(current[full])
                or current[full].get('state') != 'ACTIVE'
                or current[full].get('labels', {}).get('livepalmes-commit') != candidate):
            raise ValueError('Revision club sans preuve de reprise')
        old = state.rollback_patch(before[full], {})
        new = state.rollback_patch(current[full], {})
        if any(old.get(k) != new.get(k) for k in ['serviceConfig', 'buildConfig', 'eventTrigger']):
            raise ValueError('Configuration club modifiee pendant reprise')
    return pending


def main(candidate, plan, backup):
    project = "livepalmes"
    request = json.loads((plan / 'request.json').read_text())
    spec = importlib.util.spec_from_file_location('cycle', Path(__file__).with_name('release-cycle.py'))
    cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
    if cycle.nap_account.approved(request):
        spec = importlib.util.spec_from_file_location('nap_account_publisher', Path(__file__).with_name('publish-nap-account-release.py'))
        publisher = importlib.util.module_from_spec(spec); spec.loader.exec_module(publisher)
        publisher.publish(candidate, plan, backup, cycle, archive)
        return
    if cycle.nap_retained.approved(request):
        spec = importlib.util.spec_from_file_location('nap_retained_publisher', Path(__file__).with_name('nap-retained-sources.py'))
        publisher = importlib.util.module_from_spec(spec); spec.loader.exec_module(publisher)
        publisher.publish(candidate, plan, backup, cycle, archive)
        return
    if cycle.approved_bcc_functions(request):
        spec = importlib.util.spec_from_file_location('bcc_publisher', Path(__file__).with_name('publish-approved-bcc-functions.py'))
        publisher = importlib.util.module_from_spec(spec); spec.loader.exec_module(publisher)
        publisher.publish(candidate, plan, backup, cycle, archive)
        return
    if cycle.approved_grouped_functions(request):
        spec = importlib.util.spec_from_file_location('grouped_publisher', Path(__file__).with_name('publish-approved-grouped-functions.py'))
        publisher = importlib.util.module_from_spec(spec); spec.loader.exec_module(publisher)
        publisher.publish(candidate, plan, backup, cycle, archive)
        return
    native_identity = cycle.approved_native_identity_secret(request)
    licence_names = cycle.approved_license_report_functions(request)
    portal_names = cycle.portal_access_ns.approved(request)
    names = cycle.approved_pdf_functions(request) + cycle.approved_dtn_functions(request) + cycle.approved_club_directory_functions(request) + licence_names + portal_names
    if not names:
        print('Aucun traitement PDF supplementaire demande.')
        return
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    if credentials.get('project_id') != project:
        raise ValueError('Compte PROD requis')
    cycle.require_access_request_selection(request, json.loads((plan / 'selection.json').read_text()))
    report = json.loads((backup / 'report.json').read_text())
    if report['candidate'] != request['candidate'] or set(report.get('additionalPdfFunctions', []) + report.get('additionalDtnFunctions', []) + report.get('additionalClubDirectoryFunctions', []) + report.get('additionalLicenseReportFunctions', []) + report.get('additionalPortalAccessNsFunctions', [])) != set(names):
        raise ValueError('Sauvegarde hors bilan')
    spec = importlib.util.spec_from_file_location('release_state', Path(__file__).with_name('production-release-state.py'))
    state = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(state)
    before = {f['name']: f for f in json.loads((backup / 'functions.json').read_text())}
    current = {f['name']: f for f in state.inventory()}
    if cycle.approved_club_directory_functions(request) or licence_names or portal_names:
        previous_path = plan / 'previous/production-after.json'
        previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
        if previous and previous.get('candidate') != request['candidate']:
            raise ValueError('Reprise club hors candidat')
        names = pending_club_sources(names, before, current,
            {f['name']: f for f in previous.get('functions', [])}, request['candidate'], state)
        if not names:
            if licence_names:
                (plan/'license-report-source-update.json').write_text(json.dumps({'candidate':request['candidate'],'updatedAt':datetime.now(timezone.utc).isoformat()}))
            state.check_after(backup, backup / 'after.json', True)
            return
    else:
        for name in names:
            full = state.PREFIX + name
            if full not in before or full not in current or before[full]['state'] != 'ACTIVE':
                raise ValueError('Traitement existant indisponible')
            # A partial attempt requires its own reviewed resume; never overwrite a drift.
            if state.identity(current[full]) != state.identity(before[full]):
                raise ValueError('Traitement PDF modifie depuis la sauvegarde')
    data = archive(candidate, request['candidate'])
    upload = state.request(state.API + 'projects/' + project + '/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    if url.scheme != 'https' or not (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')):
        raise ValueError('Destination source interdite')
    req = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
    with urllib.request.urlopen(req, timeout=120):
        pass
    for name in names:
        full = state.PREFIX + name
        identity_binding = native_identity and name == 'resolveEngagementSwimmerChangeRequest'
        if bool(report.get('nativeIdentityNapSecret')) != native_identity:
            raise ValueError('Liaison NAP hors sauvegarde approuvee')
        body = cycle.license_release.source_patch(before[full], upload['storageSource'], request) if name in licence_names else source_patch(before[full], upload['storageSource'], request['candidate'], identity_binding)
        mask = 'build_config.source,labels' + (',service_config.secret_environment_variables' if identity_binding else '')
        state.wait_operation(state.request(state.API + full + '?updateMask=' + mask, 'PATCH', body))
        print('Source autorisee actualisee : ' + name, flush=True)
    if licence_names:
        (plan/'license-report-source-update.json').write_text(json.dumps({'candidate':request['candidate'],'updatedAt':datetime.now(timezone.utc).isoformat()}))
    state.check_after(backup, backup / 'after.json', True)



if __name__ == '__main__':
    main(*(Path(arg).resolve() for arg in sys.argv[1:]))
