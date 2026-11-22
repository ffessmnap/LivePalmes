"""Resume only Hosting after all ordinary existing sources have been attested."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import os
from pathlib import Path
import re

WORKFLOW = '.github/workflows/livepalmes-production-release.yml'
PLAN = 'standard-hosting-completion-policy.json'
RECEIPTS = 'standard-source-receipts.json'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'


def plan_record(manifest):
    return {'schema': 1, 'candidate': manifest['candidate'],
            'requestSha256': manifest['requestSha256'], 'sourceWrites': []}


def evidence(root, cycle):
    request = cycle.read(root/'request.json')
    policy = cycle.source_policy(request)
    manifest = policy.manifest(root, request)
    cycle.require(manifest['kind'] == 'standard-existing-sources-v2' and manifest['selected']
                  and cycle.read(root/PLAN) == plan_record(manifest), 'Plan standard hors finition Hosting')
    cycle.standard_sources.load('standard-source-policy-v2.py').check_selection(root, manifest)
    after = cycle.read(root/'previous/production-after.json')
    receipts = cycle.read(root/'previous'/RECEIPTS)
    expected = {row['name']: row for row in after['functions']}
    origins = {row['name']: row for row in manifest['origins']}
    selected = {PREFIX + name for name in manifest['selected']}
    cycle.require(after['candidate'] == receipts['candidate'] == manifest['candidate']
                  and after['errors'] == [] and receipts['manifestSha256'] == policy.digest(manifest)
                  and len(expected) == len(after['functions']) == manifest['inventoryCount']
                  and expected.keys() == origins.keys() and set(receipts['functions']) == selected,
                  'Preuves des sources et de l inventaire incompletes')
    for name, row in expected.items():
        origin = origins[name]
        cycle.require(row['state'] == 'ACTIVE' and row['revision'] and row['updateTime'],
                      'Fonction attestee inactive ou sans revision')
        if name in selected:
            archive = receipts['functions'][name]
            cycle.require(row['revision'] != origin['revision'] and archive['identity'] == row
                          and re.fullmatch('[0-9a-f]{64}', archive['archiveSha256'])
                          and archive['allPathsAndFileBytesIdentical'] is True
                          and archive['generationReadAndReferencesRechecked'] is True,
                          'Archive installee non attestee : ' + name)
        else:
            cycle.require(row == {k: origin[k] for k in ('name', 'revision', 'updateTime', 'state')},
                          'Fonction conservee modifiee : ' + name)
    return manifest, expected, receipts


def qualify(root, preparation, resume, info, items, cycle):
    cycle.require(preparation == '0'
                  and info['id'] == int(resume) and info['head_branch'] == 'main'
                  and info['path'] == WORKFLOW and info['status'] == 'completed'
                  and info['event'] == 'workflow_dispatch' and info['run_attempt'] == 1
                  and info['conclusion'] == 'failure'
                  and not any(item['name'] == 'production-hosting-after' for item in items),
                  'Origine de finition Hosting invalide ou Hosting deja tente')
    repo = os.environ['GITHUB_REPOSITORY']
    runs = cycle.gh(f'repos/{repo}/actions/workflows/{Path(WORKFLOW).name}/runs'
                    '?branch=main&event=workflow_dispatch&per_page=20')['workflow_runs']
    prior = [run['id'] for run in runs if str(run['id']) != os.environ['GITHUB_RUN_ID']]
    cycle.require(bool(prior) and prior[0] == int(resume), 'Une autre publication PROD est intervenue')
    jobs = cycle.gh(f'repos/{repo}/actions/runs/{resume}/jobs?per_page=100')['jobs']
    publication = [job for job in jobs if job['name'] == 'release']
    cycle.require(len(publication) == 1 and publication[0]['conclusion'] == 'failure',
                  'Job initial de publication non atteste')
    steps = {step['name']: step['conclusion'] for step in publication[0]['steps']}
    cycle.require(steps.get('Publier les Functions par petits lots') == 'success'
                  and steps.get('Controler toutes les Functions et les exclusions') == 'success'
                  and steps.get('Publier Hosting apres les controles') == 'skipped',
                  'Sources incompletes ou absence de preuve que Hosting a ete ignore')
    _, _, receipts = evidence(root, cycle)
    cycle.write(root/RECEIPTS, receipts)
    cycle.write(root/'standard-hosting-selection.json', [])


def verify_hosting_before(root, cycle):
    release = cycle.api('livepalmes', 'hosting')['releases'][0]
    current = {'name': release['name'], 'version': release['version']['name'],
               'message': release.get('message', '')}
    cycle.require(current == cycle.read(root/'prod-before.json')['hosting'],
                  'Derive de la release Hosting initiale')


def verify_revisions(root, cycle):
    _, expected, _ = evidence(root, cycle)
    state = cycle.standard_sources.load('production-release-state.py')
    current = state.inventory()
    observed = {f['name']: state.identity(f) for f in current}
    cycle.require(len(observed) == len(current) and observed == expected, 'Derive des revisions apres les sources')


def verify_resume(root, backup, cycle):
    manifest, expected, receipts = evidence(root, cycle)
    source_run = int(os.environ['RESUME'])
    proof = cycle.read(Path(os.environ['RUNNER_TEMP'])/'code-backup-source.json')
    report = cycle.read(backup/'report.json')
    policy = cycle.source_policy(cycle.read(root/'request.json'))
    cycle.require(proof['chainVerified'] is True and proof['chainLength'] == 1
                  and proof['originRun'] == proof['sourceRun'] == source_run
                  and proof['candidate'] == report['candidate'] == manifest['candidate']
                  and report['errors'] == [] and report['newFunctions'] == []
                  and report['standardSourceManifestSha256'] == policy.digest(manifest)
                  and cycle.read(backup/'standard-source-manifest.json') == manifest,
                  'Sauvegarde V2 initiale hors candidat ou manifeste')
    state = cycle.standard_sources.load('production-release-state.py')
    transport = cycle.standard_sources.load('standard-source-publish.py')
    originals = cycle.read(backup/'functions.json')
    policy.initial(originals, manifest)
    before = {f['name']: f for f in originals}
    inventory = state.inventory()
    current = {f['name']: f for f in inventory}
    selected = receipts['functions']
    cycle.require(len(current) == len(inventory) == len(expected) and current.keys() == expected.keys()
                  and all(state.identity(f) == expected[name] for name, f in current.items()),
                  'Revisions differentes de l attestation originale')
    policy.assert_retained(before, current, set(selected), state)

    def verify(name):
        policy.assert_selected(before[name], current[name], manifest['candidate'])
        row = selected[name]
        actual = transport.attest_content(current[name], state,
                                          lambda raw: hashlib.sha256(raw).hexdigest() == row['archiveSha256'])
        cycle.require(actual == row, 'Archive ou generation modifiee : '+name)

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(verify, sorted(selected)))
    verify_revisions(root, cycle)
