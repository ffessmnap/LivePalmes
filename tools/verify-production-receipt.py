"""Generate a closure receipt from official standard PROD artifacts. GitHub reads only."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import hashlib
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REPO = 'ffessmnap/LivePalmes'
WORKFLOW = '.github/workflows/livepalmes-production-release.yml'
ARTIFACTS = {
    'release-plan': 'plan',
    'production-after': 'after',
    'production-hosting-after': 'hosting',
    'production-code-backup': 'backup',
}
IDENTITY = ('name', 'revision', 'updateTime', 'state')
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def read_git(candidate, path):
    return subprocess.check_output(['git', 'show', f'{candidate}:{path}'], cwd=ROOT)


def verify(cycle, directory, run, job, read_blob=read_git):
    def read(path):
        return cycle.read(directory/path)

    require = cycle.require
    request = read('plan/request.json')
    candidate = request['candidate']
    source = request.get('standardSources', {})
    require(cycle.SHA.fullmatch(candidate) and source.get('schema') == 2,
            'Bilan reserve aux sources PROD standard de schema 2')
    policy = cycle.source_policy(request)
    manifest = policy.manifest(directory/'plan', request)
    selected = manifest['selected']
    require(selected == source['functions'] == sorted(read('plan/selection.json')),
            'Selection finale differente du plan')
    after, hosting = read('after/production-after.json'), read('hosting/production-hosting-after.json')
    before = {f['name']: {k: f[k] for k in IDENTITY} for f in manifest['origins']}
    actual = {f['name']: {k: f[k] for k in IDENTITY} for f in after['functions']}
    require(after['candidate'] == candidate and after['errors'] == []
            and before.keys() == actual.keys() and len(actual) == len(after['functions']) == manifest['inventoryCount']
            and all(f['state'] == 'ACTIVE' for f in actual.values()), 'Inventaire ou candidat PROD non conforme')
    changed = {PREFIX+name for name in selected}
    require(changed <= before.keys() and all(
        before[name]['revision'] != row['revision'] and before[name]['updateTime'] != row['updateTime']
        if name in changed else before[name] == row for name, row in actual.items()),
        'Revisions PROD differentes du perimetre')
    require(re.fullmatch(r'sites/livepalmes/releases/[A-Za-z0-9_-]+', hosting['name'])
            and re.fullmatch(r'sites/livepalmes/versions/[A-Za-z0-9_-]+', hosting['version'])
            and hosting['version'] != request['productionHosting'], 'Version Hosting finale non confirmee')

    checks = read('hosting/production-standard-hosting-check.json')
    static, home = {}, {}
    for row in checks:
        (home if row.get('mode') == 'server-home' else static)[row['path']] = row
    expected_paths = set(manifest['staticPaths'])
    has_home = 'index.html' in expected_paths
    if has_home:
        expected_paths.remove('index.html')
    require(static.keys() == expected_paths and home.keys() == ({'/', '/index.html'} if has_home else set()),
            'Recu Hosting incomplet ou hors manifeste')
    for path, row in static.items():
        require(row['status'] == 200 and row['actualSha256'] == row['expectedSha256'] == sha256(read_blob(candidate, path)),
                'Octets Hosting differents : '+path)
    if has_home:
        presentation = cycle.standard_sources.load('standard-source-publish.py').home_sources(ROOT, manifest)
        require(len({row.get('managedArchiveSha256') for row in home.values()}) == 1, 'Archives accueil differentes')
        for path, row in home.items():
            require(row['status'] == 200 and row['candidate'] == candidate
                    and row['allSourcePathsAndBytesAttested'] is True and row['publicHeadersValid'] is True
                    and re.fullmatch('[a-f0-9]{64}', row.get('managedArchiveSha256', ''))
                    and all(row[k] == presentation[k] for k in ('sourceHtmlSha256', 'packagedTemplateSha256')),
                    'Recu accueil non conforme : '+path)

    backup_path = directory/'backup/code-backup-context.json'
    backup = read('backup/code-backup-context.json')
    cipher_sha = sha256((directory/'backup/prod-backup.enc').read_bytes())
    link = read(f'plan/code-backup-link-{run["id"]}.json')
    require(backup['schema'] == 2 and backup['format'] == 'code-v2' and backup['ciphertextSha256'] == cipher_sha
            and backup['context'] == {'project': 'livepalmes', 'repository': REPO, 'kind': 'production-code',
                                      'candidate': candidate, 'runId': run['id']}
            and link == {'schema': 1, 'type': 'original', 'producerRun': run['id'], 'producerHead': run['head_sha'],
                         'originRun': run['id'], 'candidate': candidate, 'parentRun': None, 'parentLinkSha256': None,
                         'ciphertextSha256': cipher_sha, 'contextSha256': sha256(backup_path.read_bytes())},
            'Sauvegarde initiale chiffree hors candidat ou hors run')
    steps = {step['name']: step for step in job['steps']}
    backup_step = steps['Chiffrer puis tester la sauvegarde']
    sources_step = steps['Publier les Functions par petits lots']
    hosting_step = steps['Publier Hosting apres les controles']
    require(job['run_id'] == run['id'] and job['conclusion'] == 'success'
            and backup_step['conclusion'] == hosting_step['conclusion'] == 'success'
            and (sources_step['conclusion'] == 'success' if selected else sources_step['conclusion'] == 'skipped')
            and backup_step['completed_at'] <= (sources_step if selected else hosting_step)['started_at'],
            'Controle de sauvegarde avant publication non prouve')
    release_finished = datetime.fromisoformat(job['completed_at'])
    elapsed_to_release_end = release_finished - datetime.fromisoformat(run['created_at'])
    release_duration = release_finished - datetime.fromisoformat(job['started_at'])
    return {'productionRun': run['id'], 'candidate': candidate, 'toolingCommit': run['head_sha'],
            'hosting': hosting, 'selectedSources': selected, 'activeFunctions': len(actual),
            'retainedFunctions': len(actual)-len(selected), 'staticFilesVerified': len(static),
            'serverHomeHeadVerified': len(home), 'backupCiphertextSha256': cipher_sha,
            'backupVerifiedBeforePublication': True,
            'runCreatedToReleaseEndSeconds': int(elapsed_to_release_end.total_seconds()),
            'releaseJobSeconds': int(release_duration.total_seconds())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run', type=int, help='Run PROD standard termine avec succes')
    parser.add_argument('directory', type=Path, help='Dossier neuf pour les preuves authentifiees et le bilan')
    args = parser.parse_args()
    args.directory.mkdir(parents=True, exist_ok=False)
    os.environ['GITHUB_REPOSITORY'] = REPO
    from importlib.util import module_from_spec, spec_from_file_location
    spec = spec_from_file_location('release_cycle', ROOT/'tools/release-cycle.py')
    cycle = module_from_spec(spec)
    spec.loader.exec_module(cycle)

    def get(entry):
        name, subdirectory = entry
        return cycle.artifact(args.run, name, args.directory/subdirectory, WORKFLOW)

    with ThreadPoolExecutor(max_workers=4) as pool:
        runs = list(pool.map(get, ARTIFACTS.items()))
    run = runs[0]
    cycle.require(run['id'] == args.run and all(other == run for other in runs), 'Metadonnees du run incompatibles')
    jobs = cycle.gh(f'repos/{REPO}/actions/runs/{args.run}/attempts/1/jobs?per_page=100')['jobs']
    release = [job for job in jobs if job['name'] == 'release']
    cycle.require(len(release) == 1, 'Job PROD courant absent ou ambigu')
    result = verify(cycle, args.directory, run, release[0])
    cycle.write(args.directory/'production-receipt.json', result)
    print(f'PROD {args.run} verifiee : Hosting {result["hosting"]["version"]}, '
          f'{len(result["selectedSources"])} sources, {result["retainedFunctions"]} fonctions conservees. '
          f'Recu : {args.directory / "production-receipt.json"}')


if __name__ == '__main__':
    main()
