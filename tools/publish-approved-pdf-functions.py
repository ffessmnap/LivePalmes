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


def main(candidate, plan, backup, project="livepalmes"):
    if project not in {"livepalmes", "livepalmes-test"}:
        raise ValueError("Projet interdit")
    request = json.loads((plan / 'request.json').read_text())
    spec = importlib.util.spec_from_file_location('cycle', Path(__file__).with_name('release-cycle.py'))
    cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
    names = cycle.approved_extra_functions(request)
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
    state.PREFIX = 'projects/' + project + '/locations/europe-west1/functions/'
    if project == 'livepalmes-test':
        state.inventory = lambda: test_inventory(cycle, project)
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
        body = source_patch(before[full], upload['storageSource'], request['candidate'])
        state.wait_operation(state.request(state.API + full + '?updateMask=build_config.source,labels', 'PATCH', body))
        print('Source autorisee actualisee : ' + name, flush=True)
    state.check_after(backup, backup / 'after.json', True)


def test_inventory(cycle, project):
    from urllib.parse import quote
    result, page = [], ''
    for _ in range(50):
        data = cycle.api(project, 'functions' + ('&pageToken=' + quote(page, safe='') if page else ''))
        if data.get('unreachable'):
            raise ValueError('Inventaire TEST incomplet')
        result.extend(data.get('functions', []))
        page = data.get('nextPageToken')
        if not page:
            return result
    raise ValueError('Pagination TEST incomplete')


def test_dtn(candidate, directory):
    if os.environ.get('DTN_EXTENSION_APPROVED') != 'true':
        raise ValueError('Extension TEST non autorisee')
    spec = importlib.util.spec_from_file_location('cycle', Path(__file__).with_name('release-cycle.py'))
    cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
    sha = os.environ['CANDIDATE_SHA']
    names = sorted(cycle.DTN_FUNCTIONS)
    before = test_inventory(cycle, 'livepalmes-test')
    directory.mkdir(parents=True, exist_ok=False)
    value = {'candidate': sha, 'additionalDtnFunctions': names,
             'additionalDtnApproval': 'Antoine, 30 septembre 2026 22:55 Paris; workflow TEST explicite'}
    (directory / 'request.json').write_text(json.dumps(value))
    (directory / 'functions.json').write_text(json.dumps(before))
    (directory / 'report.json').write_text(json.dumps({**value, 'commitLabel': True,
        'functions': [{'name': f['name']} for f in before if f['name'].split('/')[-1] in names],
        'newFunctions': [], 'appCheck': 'false'}))
    main(candidate, directory, directory, 'livepalmes-test')


if __name__ == '__main__':
    if sys.argv[1] == 'test-dtn':
        test_dtn(*(Path(arg).resolve() for arg in sys.argv[2:]))
    else:
        main(*(Path(arg).resolve() for arg in sys.argv[1:]))
