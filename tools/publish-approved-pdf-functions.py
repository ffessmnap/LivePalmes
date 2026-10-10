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

ALLOWED = {'prepareEngagementClubRecapEmails', 'closeDueEngagementCompetitions', 'resumePerformancePublicationJobs', 'resolveEngagementSwimmerChangeRequest'}


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


def main(candidate, plan, backup):
    project = "livepalmes"
    request = json.loads((plan / 'request.json').read_text())
    spec = importlib.util.spec_from_file_location('cycle', Path(__file__).with_name('release-cycle.py'))
    cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
    native_identity = cycle.approved_native_identity_secret(request)
    names = cycle.approved_pdf_functions(request) + cycle.approved_dtn_functions(request)
    if not names:
        print('Aucun traitement PDF supplementaire demande.')
        return
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    if credentials.get('project_id') != project:
        raise ValueError('Compte PROD requis')
    report = json.loads((backup / 'report.json').read_text())
    if report['candidate'] != request['candidate'] or set(report.get('additionalPdfFunctions', []) + report.get('additionalDtnFunctions', [])) != set(names):
        raise ValueError('Sauvegarde hors bilan')
    spec = importlib.util.spec_from_file_location('release_state', Path(__file__).with_name('production-release-state.py'))
    state = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(state)
    before = {f['name']: f for f in json.loads((backup / 'functions.json').read_text())}
    current = {f['name']: f for f in state.inventory()}
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
        body = source_patch(before[full], upload['storageSource'], request['candidate'], identity_binding)
        mask = 'build_config.source,labels' + (',service_config.secret_environment_variables' if identity_binding else '')
        state.wait_operation(state.request(state.API + full + '?updateMask=' + mask, 'PATCH', body))
        print('Source autorisee actualisee : ' + name, flush=True)
    state.check_after(backup, backup / 'after.json', True)



if __name__ == '__main__':
    main(*(Path(arg).resolve() for arg in sys.argv[1:]))
