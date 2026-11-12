"""Pinned CI runtime and read-only GitHub step timings; never a release gate."""
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def validate():
    config = json.loads((ROOT / '.github/ci-runtime.json').read_text(encoding='utf-8'))
    version = config['node']
    if not re.fullmatch(r'22\.\d+\.\d+', version):
        raise ValueError('Version corrective Node 22 exacte requise')
    if (ROOT / '.node-version').read_text().strip() != version:
        raise ValueError('Pin local et CI differents')
    for name in config['workflows']:
        text = (ROOT / '.github/workflows' / name).read_text(encoding='utf-8')
        pins = re.findall(r"(?m)^\s+node-version: ['\"]?([^'\s\"]+)['\"]?\s*$", text)
        if not pins or any(pin != version for pin in pins):
            raise ValueError('Pin Node divergent : ' + name)
        if re.search(r'check-latest: true', text):
            raise ValueError('Mise a jour Node implicite : ' + name)
        for key, expected in [('npm_config_fetch_retries', config['fetchRetries']),
                              ('npm_config_fetch_timeout', config['fetchTimeoutMs'])]:
            if not re.search(key + r": ['\"]?" + str(expected) + r"['\"]?\s*$", text, re.M):
                raise ValueError('Telechargement non borne : ' + name)
    runner = config['verificationRunner']
    if not re.fullmatch(r'ubuntu-\d{2}\.04', runner):
        raise ValueError('Label Ubuntu explicite requis pour la verification')
    workflow = (ROOT/'.github/workflows/livepalmes-verification-preview.yml').read_text(encoding='utf-8')
    labels = re.findall(r'(?m)^\s+runs-on: ([a-z0-9.-]+)\s*$', workflow)
    if not labels or any(label != runner for label in labels):
        raise ValueError('Runner CI divergent du pin explicite')
    print('Node ' + version + ' : chaine commune coherente, npm ci et caches conserves.')


def seconds(start, end):
    if not start or not end:
        return 0
    return max(0, int((dt.datetime.fromisoformat(end.replace('Z', '+00:00')) -
                       dt.datetime.fromisoformat(start.replace('Z', '+00:00'))).total_seconds()))


def category(step):
    name = step['name'].lower()
    if any(word in name for word in ['setup-node', 'setup-java', 'installer', 'install ', 'cache', 'node.js']):
        return 'installation'
    if any(word in name for word in ['tester', 'verifier', 'verify', 'test ', 'verification']):
        return 'verification'
    return 'autre'


def report(jobs):
    rows = ['### Durees CI observees (secondes)',
            '', '| Job | Installations | Verifications | Autres etapes | Etat |',
            '| --- | ---: | ---: | ---: | --- |']
    for job in jobs:
        totals = {key: 0 for key in ['installation', 'verification', 'autre']}
        for step in job.get('steps', []):
            totals[category(step)] += seconds(step.get('started_at'), step.get('completed_at'))
        name = re.sub(r'[|\r\n]', ' ', job.get('name', 'job'))
        state = job.get('conclusion') or job.get('status', 'inconnu')
        rows.append(f"| {name} | {totals['installation']} | {totals['verification']} | {totals['autre']} | {state} |")
        failures = [s for s in job.get('steps', []) if category(s) == 'installation'
                    and s.get('conclusion') in ['failure', 'timed_out', 'cancelled']]
        if failures:
            rows.append(f"\nEchec/expiration pendant une installation ({name}) : distinct d'un resultat de test.\n")
    rows.append('\nSommes des etapes terminees, jobs paralleles non additionnes en duree de livraison. '
                'Attente de runner et attente humaine hors de ces mesures.\n')
    return '\n'.join(rows)


def timings():
    try:
        repo, run = os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_RUN_ID']
        if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo) or not run.isdecimal():
            raise ValueError('Identite du run invalide')
        request = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/actions/runs/{run}/jobs?per_page=100",
            headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                     'Accept': 'application/vnd.github+json'})
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.load(response)
        if data.get('total_count', 0) > 100:
            raise ValueError('Inventaire tronque')
        value = report(data['jobs'])
    except Exception:
        value = 'Mesure des etapes CI indisponible ; consulter les horodatages GitHub.\n'
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as output:
            output.write(value)
    print(value)


def comparison(repo, pr, main, pr_jobs, main_jobs, proofs):
    """Measure one authenticated PR/merge pair; this never authorizes a skip."""
    workflow = '.github/workflows/livepalmes-verification-preview.yml'
    def require(value, reason):
        if not value:
            raise ValueError(reason)
    for info, event in [(pr, 'pull_request'), (main, 'push')]:
        require(info.get('event') == event and info.get('path') == workflow
                and info.get('status') == 'completed' and info.get('conclusion') == 'success'
                and info.get('run_attempt') == 1
                and info.get('head_repository', {}).get('full_name') == repo,
                'Runs CI reussis et authentiques requis')
    require(pr['id'] != main['id'] and main.get('head_branch') == 'main', 'Paire PR/main invalide')
    steps = {
        'application': ('Verification applicative', 'Verifier LivePalmes'),
        'firestore': ('Verification applicative', 'Tester les regles Firestore'),
        'mysql': ('Verification applicative', 'Verifier les ecritures par equipes dans MySQL isole'),
        'publication': ('Verification du circuit de publication', 'Tester le circuit de publication sans acces Firebase'),
        'browser': ('Verification navigateur hors ligne', 'Verifier les parcours navigateur isoles'),
    }
    names = {job for job, _ in steps.values()} | {'Verification technique'}
    def jobs_by_name(jobs):
        result = {}
        for name in names:
            matching = [job for job in jobs if job.get('name') == name]
            require(len(matching) == 1 and matching[0].get('conclusion') == 'success',
                    'Jobs obligatoires incomplets ou ambigus')
            result[name] = matching[0]
        return result
    before, after = jobs_by_name(pr_jobs), jobs_by_name(main_jobs)
    def outcome(jobs, suite):
        job, name = steps[suite]
        found = [step for step in jobs[job].get('steps', []) if step.get('name') == name]
        require(len(found) == 1, 'Etape de suite absente ou ambigue')
        return found[0].get('conclusion')
    require(set(proofs) == set(steps), 'Cinq preuves distinctes requises pour cette mesure')
    reused = []
    for suite, pair in proofs.items():
        source, target, receipt = pair['pr'], pair['main'], pair['receipt']
        require(source.get('schema') == target.get('schema'), 'Schemas de preuve PR/main differents')
        if source.get('schema') == 3:
            for proof in (source, target):
                host = proof.get('host') or {}
                require(set(host) == {'image', 'version', 'kernel'}
                        and all(isinstance(v, str) and v for v in host.values()),
                        'Audit de l hote absent de la mesure OCI')
        for proof, info in [(source, pr), (target, main)]:
            require(proof.get('schema') in (2, 3) and proof.get('suite') == suite
                    and proof.get('result') == 'success'
                    and proof.get('origin', {}).get('repository') == repo
                    and proof['origin'].get('run') == info['id']
                    and proof['origin'].get('attempt') == 1
                    and proof['origin'].get('event') == info['event'], 'Origine de preuve incompatible')
        require(source.get('mode') == 'executed' and source.get('source') is None
                and source['origin'].get('head') == pr['head_sha']
                and source['origin'].get('headRepository') == repo
                and source['origin'].get('baseBranch') == 'main'
                and source.get('content') == target.get('content')
                and target.get('candidate') == main['head_sha']
                and target['origin'].get('head') == main['head_sha']
                and outcome(before, suite) == 'success', 'Preuve PR/main ou execution PR incompatible')
        if target.get('mode') == 'reused':
            link = target.get('source') or {}
            require(target.get('environment') == source.get('environment')
                    and all(link.get(key) == receipt[key] for key in ('run', 'artifact', 'sha256'))
                    and link.get('suite') == suite
                    and link.get('pullRequest') == source['origin'].get('number')
                    and outcome(after, suite) == 'skipped', 'Reutilisation non confirmee')
            reused.append(suite)
        else:
            require(target.get('mode') == 'executed' and target.get('source') is None
                    and outcome(after, suite) == 'success', 'Execution main non confirmee')
    def elapsed(info, jobs):
        starts = [j.get('started_at') for j in jobs.values()]
        ends = [j.get('completed_at') for j in jobs.values()]
        require(info.get('created_at') and all(starts) and all(ends), 'Horodatages CI incomplets')
        return {'seconds': seconds(info['created_at'], max(ends)),
                'initialRunnerWaitSeconds': seconds(info['created_at'], min(starts)),
                'jobsWindowSeconds': seconds(min(starts), max(ends))}
    pr_time, main_time = elapsed(pr, before), elapsed(main, after)
    require(pr_time['seconds'] > 0 and main_time['seconds'] > 0, 'Duree CI non mesurable')
    jobs = []
    for name in sorted(names):
        row = {'name': name}
        for label, job in [('pr', before[name]), ('main', after[name])]:
            totals = {key: 0 for key in ('installation', 'verification', 'autre')}
            for step in job.get('steps', []):
                totals[category(step)] += seconds(step.get('started_at'), step.get('completed_at'))
            row[label] = {'seconds': seconds(job['started_at'], job['completed_at']), **totals}
        jobs.append(row)
    saved = pr_time['seconds'] - main_time['seconds']
    return {'schema': 1, 'repository': repo, 'prRun': pr['id'], 'mainRun': main['id'],
            'prHead': pr['head_sha'], 'mainCommit': main['head_sha'],
            'reusedSuites': sorted(reused), 'executedMainSuites': sorted(set(steps) - set(reused)),
            'pr': pr_time, 'main': main_time, 'savedSeconds': saved,
            'sequence': {'ciSeconds': pr_time['seconds'] + main_time['seconds'],
                         'betweenRunsSeconds': seconds(max(j['completed_at'] for j in before.values()), main['created_at']),
                         'firstRunToFinalCheckSeconds': seconds(pr['created_at'], max(j['completed_at'] for j in after.values()))},
            'reductionPercent': round(100 * saved / pr_time['seconds'], 1), 'jobs': jobs,
            'environments': {suite: {'pr': pair['pr']['environment'], 'main': pair['main']['environment'],
                                     'compatible': pair['pr']['environment'] == pair['main']['environment']}
                             for suite, pair in proofs.items()},
            'hosts': {suite: {'pr': pair['pr'].get('host'), 'main': pair['main'].get('host')}
                      for suite, pair in proofs.items()},
            'measurement': 'Delai entre creation du run et fin des quatre jobs obligatoires, attente initiale incluse. Jobs paralleles non additionnes. Observation de cette paire, sans promesse de gain futur.'}


def compare(pr_run, main_run, directory):
    import importlib.util
    def load(name, filename):
        spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/filename)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    suites = load('ci_suites_measurement', 'ci-suite-evidence.py')
    cycle = load('release_cycle_measurement', 'release-cycle.py')
    suites.require(pr_run.isdecimal() and main_run.isdecimal() and pr_run != main_run, 'Runs distincts requis')
    repo = os.environ['GITHUB_REPOSITORY']
    suites.require(re.fullmatch(r'[\w.-]+/[\w.-]+', repo), 'Depot invalide')
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    proofs, pr_info, main_info = {}, None, None
    metadata = suites.gh(f'repos/{repo}/actions/runs/{main_run}/artifacts?per_page=100')
    suites.require(metadata.get('total_count', 0) <= 100, 'Inventaire artefacts tronque')
    receipts = []
    for group in sorted(set(suites.GROUPS.values())):
        info, files, receipt = suites.artifact(pr_run, group)
        target = directory/group
        main = cycle.artifact(main_run, group, target, suites.WORKFLOW)
        matching = [item for item in metadata['artifacts'] if item['name'] == group and not item['expired']]
        suites.require(len(matching) == 1, 'Artefact main ambigu')
        receipts.append({'group': group, 'pr': receipt, 'main': {
            'run': int(main_run), 'artifact': matching[0]['id'], 'sha256': matching[0]['digest']}})
        pr_info, main_info = info, main
        for suite, selected in suites.GROUPS.items():
            if selected == group:
                proofs[suite] = {'pr': files[suite+'.json'],
                                 'main': json.loads((target/(suite+'.json')).read_text()),
                                 'receipt': receipt}
    pr_number = proofs['application']['pr']['origin']['number']
    suites.require(type(pr_number) is int and pr_number > 0, 'Numero PR invalide')
    pr = suites.merged_pull_request(repo, pr_number)
    suites.require(pr.get('number') == pr_number and pr.get('merged') is True and pr.get('state') == 'closed'
                   and pr.get('merge_commit_sha') == main_info['head_sha']
                   and pr.get('base', {}).get('ref') == 'main'
                   and pr.get('base', {}).get('repo', {}).get('full_name') == repo
                   and pr.get('base', {}).get('sha') == proofs['application']['pr']['origin']['base']
                   and pr.get('head', {}).get('sha') == pr_info['head_sha']
                   and (pr.get('head', {}).get('repo') or {}).get('full_name') == repo,
                   'Fusion de la paire non confirmee')
    job_sets = []
    for run_id in (pr_run, main_run):
        inventory = suites.gh(f'repos/{repo}/actions/runs/{run_id}/jobs?per_page=100')
        suites.require(inventory.get('total_count', 0) <= 100, 'Inventaire jobs tronque')
        job_sets.append(inventory['jobs'])
    result = comparison(repo, pr_info, main_info, *job_sets, proofs)
    result['pullRequest'] = pr_number
    result['authenticatedArtifacts'] = receipts
    (directory/'comparison.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    if sys.argv[1] == 'compare':
        compare(*sys.argv[2:])
    else:
        {'validate': validate, 'timings': timings}[sys.argv[1]]()
