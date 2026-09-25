"""Reusable code releases. No Firestore, business Function or data migration calls."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SHA = re.compile(r"[0-9a-f]{40}\Z")
PROJECTS = {'livepalmes', 'livepalmes-test'}
PDF_FUNCTIONS = {'prepareEngagementClubRecapEmails', 'closeDueEngagementCompetitions'}


def approved_pdf_functions(value):
    names = value.get('additionalPdfFunctions', [])
    require(isinstance(names, list) and len(names) == len(set(names)) and set(names).issubset(PDF_FUNCTIONS), 'Extension PDF interdite')
    require(not names or (set(names) == PDF_FUNCTIONS and value.get('additionalPdfApproval')), 'Accord specifique des deux traitements PDF requis')
    return names


def require(value, message):
    if not value:
        raise ValueError(message)


def run(args, cwd=None):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def git(*args):
    return run(['git', *args], ROOT)


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def output(**values):
    with open(os.environ['GITHUB_OUTPUT'], 'a') as file:
        for key, value in values.items():
            require('\n' not in str(value), 'Sortie invalide')
            file.write(f'{key}={value}\n')


def safe_functions(root):
    return json.loads(run(['node', '-e', 'const {ALL_SAFE_LOTS,LOTS}=require(process.argv[1]);console.log(JSON.stringify(ALL_SAFE_LOTS.flatMap(x=>LOTS[x])))', str(Path(root).resolve() / 'tools/firebase-test-backend-lots.js')]))


def classify(paths):
    blocked = [p for p in paths if p in {'firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json', 'storage.rules'} or p.startswith(('performances/public/data/', 'archives/', 'sources/', 'sauvegardes/')) or p.endswith('.rules')]
    require(not blocked, 'Perimetre specifique requis (configuration/regles/index/donnees): ' + ', '.join(blocked))
    application = [p for p in paths if not p.startswith(('.github/', 'docs/', 'tools/', 'tests/')) and p not in {'AGENTS.MD', 'AGENTS.md', 'README.md', 'CHANGELOG.md'}]
    return application, any(p.startswith('functions/') for p in application)


def validate_request(value, paths):
    require(value.get('schema') == 1, 'Schema inconnu')
    for key in ['candidate', 'productionCommit']:
        require(isinstance(value.get(key), str) and SHA.fullmatch(value[key]), 'SHA complet requis: ' + key)
    require(re.fullmatch(r'sites/livepalmes/versions/[A-Za-z0-9_-]+', value.get('productionHosting', '')), 'Version Hosting PROD requise')
    require(isinstance(value.get('testRun'), int) and value['testRun'] > 0, 'Preuve TEST requise')
    application, backend = classify(paths)
    extra = approved_pdf_functions(value)
    require(not extra or backend, 'Extension PDF sans changement backend')
    covered = set()
    require(isinstance(value.get('changes'), list) and value['changes'], 'Bilan des evolutions requis')
    for change in value['changes']:
        require(change.get('status') == 'validated' and change.get('validation') and change.get('title'), 'Evolution non validee ou preuve utilisateur absente')
        require(isinstance(change.get('paths'), list) and all(p in paths for p in change['paths']), 'Chemins du bilan inexacts')
        covered.update(change['paths'])
    require(set(application).issubset(covered), 'Fichiers applicatifs sans validation: ' + ', '.join(sorted(set(application) - covered)))
    if backend:
        require(value.get('excludedBackendReview'), 'Revue des impacts email/schedulers requis pour le backend partage')
    return backend


def prepare_request(request_path, directory):
    value = read(request_path)
    for key in ['candidate', 'productionCommit']:
        require(SHA.fullmatch(str(value.get(key, ''))), 'SHA complet requis')
        require(git('rev-parse', value[key] + '^{commit}') == value[key], 'Commit absent')
    subprocess.run(['git', 'merge-base', '--is-ancestor', value['productionCommit'], value['candidate']], cwd=ROOT, check=True)
    subprocess.run(['git', 'merge-base', '--is-ancestor', value['candidate'], 'HEAD'], cwd=ROOT, check=True)
    paths = git('diff', '--name-only', '--no-renames', value['productionCommit'], value['candidate']).splitlines()
    backend = validate_request(value, paths)
    write(Path(directory) / 'request.json', value)
    write(Path(directory) / 'paths.json', paths)
    output(candidate=value['candidate'], backend=str(backend).lower())


def gh(endpoint):
    return json.loads(run(['gh', 'api', endpoint]))


def artifact(run_id, name, destination, workflow=None):
    require(str(run_id).isdigit(), 'Run invalide')
    repo = os.environ['GITHUB_REPOSITORY']
    run_info = gh(f'repos/{repo}/actions/runs/{run_id}')
    require(run_info['status'] == 'completed' and run_info['head_branch'] == 'main', 'Run source non termine ou hors main')
    if workflow:
        require(run_info['path'] == workflow and run_info['conclusion'] == 'success', 'Preuve de workflow incorrecte')
    # New reusable runs cannot be rerun: one immutable artifact of each kind per run.
    require(run_info.get('run_attempt', 1) == 1, 'Utiliser un nouveau run, pas une tentative ambigue')
    items = []
    for page in range(1, 21):
        batch = gh(f'repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100&page={page}')['artifacts']
        items.extend(batch)
        if len(batch) < 100:
            break
    candidates = [a for a in items if a['name'] == name and not a['expired']]
    require(len(candidates) == 1, 'Artefact absent, expire ou ambigu: ' + name)
    selected = candidates[0]
    metadata = gh(f'repos/{repo}/actions/artifacts/{selected["id"]}')
    require(metadata['workflow_run']['id'] == int(run_id) and metadata['name'] == name, 'Artefact hors run')
    digest = metadata.get('digest', '')
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', digest), 'Empreinte artefact absente')
    data = subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/artifacts/{selected["id"]}/zip'])
    require('sha256:' + hashlib.sha256(data).hexdigest() == digest, 'Artefact altere')
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(sum(i.file_size for i in archive.infolist()) < 1024**3, 'Artefact trop volumineux')
        for info in archive.infolist():
            require(not info.is_dir() and info.filename == Path(info.filename).name and info.filename not in {'.', '..'}, 'Chemin artefact invalide')
            (destination / info.filename).write_bytes(archive.read(info))
    return run_info


def api(project, path):
    require(project in PROJECTS, 'Projet interdit')
    credentials = read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    require(credentials['project_id'] == project, 'Compte du mauvais projet')
    if path == 'hosting':
        url = f'https://firebasehosting.googleapis.com/v1beta1/sites/{project}/releases?pageSize=1'
    else:
        require(path.startswith('functions'), 'Lecture non autorisee')
        url = f'https://cloudfunctions.googleapis.com/v2/projects/{project}/locations/-/functions?pageSize=100' + path[len('functions'):]
    token = run(['gcloud', 'auth', 'application-default', 'print-access-token'])
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=60) as response:
        return json.load(response)


def snapshot(project):
    from urllib.parse import quote
    functions, page = [], ''
    for _ in range(50):
        response = api(project, 'functions' + ('&pageToken=' + quote(page, safe='') if page else ''))
        require(not response.get('unreachable'), 'Inventaire incomplet')
        functions.extend(response.get('functions', []))
        page = response.get('nextPageToken')
        if not page:
            break
    else:
        raise ValueError('Pagination incomplete')
    releases = api(project, 'hosting')['releases']
    require(releases, 'Release absente')
    release = releases[0]
    return {'hosting': {'name': release['name'], 'version': release['version']['name'], 'message': release.get('message', '')}, 'functions': sorted([{'name': f['name'], 'revision': f.get('serviceConfig', {}).get('revision'), 'updateTime': f.get('updateTime'), 'state': f.get('state'), 'commit': f.get('labels', {}).get('livepalmes-commit')} for f in functions], key=lambda f: f['name'])}


def proof(directory):
    root = Path(directory)
    candidate = os.environ['CANDIDATE_SHA']
    state = snapshot('livepalmes-test')
    require(state['hosting']['message'] == f'LivePalmes {candidate} run {os.environ["GITHUB_RUN_ID"]}', 'Release TEST non confirmee')
    write(root / 'test-proof.json', {'candidate': candidate, 'state': state})


def verify_test(directory):
    root = Path(directory)
    request = read(root / 'request.json')
    info = artifact(request['testRun'], 'test-proof', root / 'test', '.github/workflows/livepalmes-test-common.yml')
    evidence = read(root / 'test/test-proof.json')
    require(evidence['candidate'] == request['candidate'] == info['head_sha'], 'Version TEST differente du candidat')
    require(snapshot('livepalmes-test') == evidence['state'], 'TEST a change depuis sa publication : refaire le bilan')
    write(root / 'test-proof.json', evidence)


def prepare_selection(directory, candidate):
    directory = Path(directory)
    request = read(directory / 'request.json')
    backend = validate_request(request, read(directory / 'paths.json'))
    selected = safe_functions(candidate) if backend else []
    if backend:
        state = read(directory / 'test-proof.json')['state']
        names = {f['name'].split('/')[-1]: f for f in state['functions']}
        require(all(n in names and names[n]['state'] == 'ACTIVE' and names[n]['commit'] == request['candidate'] for n in selected), 'Backend TEST incomplet ou pas au commit valide')
        selected += approved_pdf_functions(request)
    write(directory / 'selection.json', selected)


def freeze_plan(directory):
    root = Path(directory)
    request = read(root / 'request.json')
    state = snapshot('livepalmes')
    require(state['hosting']['version'] == request['productionHosting'], 'PROD differente du bilan')
    # Initial release recorded before reusable cycle. Subsequent Hosting releases carry the SHA.
    initial = request['productionCommit'] == '995ec7025e31cd147444e38a99afba69808a1406' and request['productionHosting'] == 'sites/livepalmes/versions/61bbdb3230029827'
    require(initial or state['hosting']['message'].startswith('LivePalmes ' + request['productionCommit'] + ' run '), 'Commit PROD non prouve par la release')
    write(root / 'prod-before.json', state)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write('\n## Bilan avant publication\n\n')
        summary.write(f"Version TEST : `{request['candidate']}`. Base PROD : `{request['productionCommit']}`.\n\n")
        for item in request['changes']:
            summary.write('- ' + item['title'].replace('\n', ' ') + ' — ' + item['validation'].replace('\n', ' ') + '\n')
        summary.write(f"\nFunctions selectionnees : {len(read(root / 'selection.json'))}. Regles/index/donnees exclus.\n")


def compare_prod(directory):
    require(snapshot('livepalmes') == read(Path(directory) / 'prod-before.json'), 'PROD a change depuis le bilan : nouvelle preparation requise')


def stage(candidate, project, destination, sha):
    require(project in PROJECTS and SHA.fullmatch(sha), 'Cible ou commit invalide')
    if project == 'livepalmes':
        subprocess.run(['node', str(ROOT / 'tools/prepare-production-functions.js'), candidate, destination, os.environ['APP_CHECK']], check=True)
    else:
        subprocess.run(['node', str(Path(candidate) / 'tools/prepare-firebase-test-functions.js'), 'all-safe', str(Path(destination).resolve())], check=True)
    index = Path(destination) / 'functions/index.js'
    index.write_text(index.read_text() + '\nfor (const fn of Object.values(exports)) { if (!fn.__endpoint) throw new Error("Endpoint absent"); fn.__endpoint.labels = { ...fn.__endpoint.labels, "livepalmes-commit": ' + json.dumps(sha) + ' }; }\n')


def deploy_batches(project, candidate, stage_path, selection_path, dry_run):
    require(project in PROJECTS, 'Projet interdit')
    require(read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])['project_id'] == project, 'Compte incorrect')
    selected = read(selection_path)
    extra = approved_pdf_functions(read(Path(os.environ['PLAN']) / 'request.json')) if project == 'livepalmes' and os.environ.get('PLAN') else []
    require(len(selected) == len(set(selected)) and set(selected).issubset(set(safe_functions(candidate)) | set(extra)), 'Selection interdite')
    selected = [name for name in selected if name not in extra]
    cli = str(Path(candidate).resolve() / 'tests/firestore-rules/node_modules/.bin/firebase')
    sha = os.environ['CANDIDATE_SHA']
    last_start = 0
    for offset in range(0, len(selected), 10):
        batch = selected[offset:offset + 10]
        if not dry_run:
            time.sleep(max(0, 61 - (time.monotonic() - last_start)))
        last_start = time.monotonic()
        command = [cli, 'deploy', '--project', project, '--config', str(Path(stage_path).resolve() / 'firebase.json'), '--only', ','.join('functions:' + n for n in batch), '--non-interactive', '--force']
        if dry_run:
            command.append('--dry-run')
        subprocess.run(command, check=True)
        if not dry_run:
            functions = {f['name'].split('/')[-1]: f for f in snapshot(project)['functions']}
            require(all(n in functions and functions[n]['state'] == 'ACTIVE' and functions[n]['commit'] == sha for n in batch), 'Lot incomplet : publication interrompue avant Hosting')
        print(f'Lot {offset // 10 + 1} controle ({len(batch)} Functions).', flush=True)


def fetch_plan(preparation, resume, directory):
    root = Path(directory)
    if resume != '0':
        info = gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{resume}')
        require(info['path'] == '.github/workflows/livepalmes-production-release.yml', 'Run de reprise incorrect')
        artifact(resume, 'release-plan', root)
        artifact(resume, 'production-code-backup', root / 'encrypted')
        artifact(resume, 'production-after', root / 'previous')
        # A Hosting attempt always records its resulting release, including on failure.
        items = gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{resume}/artifacts?per_page=100')['artifacts']
        if any(a['name'] == 'production-hosting-after' for a in items):
            artifact(resume, 'production-hosting-after', root / 'previous')
    else:
        artifact(preparation, 'release-plan', root, '.github/workflows/livepalmes-production-preflight.yml')
    value = read(root / 'request.json')
    require(SHA.fullmatch(value['candidate']), 'Commit invalide')
    output(candidate=value['candidate'], backend=str(bool(read(root / 'selection.json'))).lower())


def verify_resume(directory, backup):
    root = Path(directory)
    spec = importlib.util.spec_from_file_location('release_state', ROOT / 'tools/production-release-state.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    os.environ['CONFIRM_CODE_ROLLBACK'] = 'livepalmes'
    module.rollback(Path(backup), root / 'previous/production-after.json', apply=False)
    expected = read(root / 'previous/production-after.json')
    current = snapshot('livepalmes')
    require({f['name']: {k: f[k] for k in ['name', 'revision', 'updateTime', 'state']} for f in current['functions']} == {f['name']: f for f in expected['functions']}, 'Revisions modifiees depuis la tentative')
    after_hosting = root / 'previous/production-hosting-after.json'
    expected_hosting = read(after_hosting) if after_hosting.exists() else read(root / 'prod-before.json')['hosting']
    require(current['hosting']['name'] == expected_hosting['name'], 'Hosting modifie depuis la tentative')


def main():
    mode, *args = sys.argv[1:]
    if mode == 'fetch-plan':
        fetch_plan(*args)
    elif mode == 'verify-resume':
        verify_resume(*args)
    elif mode == 'request':
        prepare_request(*args)
    elif mode == 'artifact':
        artifact(*args)
    elif mode == 'proof':
        proof(*args)
    elif mode == 'verify-test':
        verify_test(*args)
    elif mode == 'selection':
        prepare_selection(*args)
    elif mode == 'freeze':
        freeze_plan(*args)
    elif mode == 'compare-prod':
        compare_prod(*args)
    elif mode == 'stage':
        stage(*args)
    elif mode == 'batches':
        require(args[-1] in {'dry-run', 'deploy'}, 'Mode de deploiement inconnu')
        deploy_batches(*args[:-1], dry_run=args[-1] == 'dry-run')
    else:
        raise ValueError('Mode inconnu')

if __name__ == '__main__':
    main()
