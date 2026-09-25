"""Update only the source of two explicitly approved existing PDF treatments.

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

ALLOWED = {'prepareEngagementClubRecapEmails', 'closeDueEngagementCompetitions'}


def source_patch(before, source, sha):
    if before['name'].split('/')[-1] not in ALLOWED:
        raise ValueError('Traitement hors autorisation PDF')
    return {'name': before['name'], 'buildConfig': {'source': {'storageSource': source}},
            'labels': {**before.get('labels', {}), 'livepalmes-commit': sha}}


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
    request = json.loads((plan / 'request.json').read_text())
    names = request.get('additionalPdfFunctions', [])
    if not names:
        print('Aucun traitement PDF supplementaire demande.')
        return
    if set(names) != ALLOWED or len(names) != 2 or not request.get('additionalPdfApproval'):
        raise ValueError('Accord PDF specifique absent')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    if credentials.get('project_id') != 'livepalmes':
        raise ValueError('Compte PROD requis')
    report = json.loads((backup / 'report.json').read_text())
    if report['candidate'] != request['candidate'] or set(report.get('additionalPdfFunctions', [])) != ALLOWED:
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
    upload = state.request(state.API + 'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    if url.scheme != 'https' or not (url.hostname == 'storage.googleapis.com' or url.hostname.endswith('.storage.googleapis.com')):
        raise ValueError('Destination source interdite')
    req = urllib.request.Request(upload['uploadUrl'], method='PUT', data=data, headers={'Content-Type': 'application/zip'})
    with urllib.request.urlopen(req, timeout=120):
        pass
    for name in names:
        full = state.PREFIX + name
        body = source_patch(before[full], upload['storageSource'], request['candidate'])
        state.wait_operation(state.request(state.API + full + '?updateMask=build_config.source,labels', 'PATCH', body))
        print('Source PDF actualisee : ' + name, flush=True)


if __name__ == '__main__':
    main(*(Path(arg).resolve() for arg in sys.argv[1:]))
