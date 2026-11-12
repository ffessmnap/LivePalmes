"""Authenticate per-suite PR proofs before reusing identical Git content on main."""
from functools import lru_cache
import hashlib
import io
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = '.github/workflows/livepalmes-verification-preview.yml'
CONTROLLERS = (WORKFLOW, 'tools/ci-suite-evidence.py', 'tools/verify-livepalmes.js',
               'tools/test-verification-evidence.py', '.github/ci-runtime.json', '.github/ci-suite-policy.json', '.node-version',
               'tools/ci-pinned-runtime.py', '.github/ci-container.json', '.github/ci-seccomp.json',
               'tests/ci-pinned-runtime-tests.py', '.gitattributes',
               'tools/ci-runtime-sandbox-check.js', 'tools/browser-test-launcher.js')
DEADLINE = None
GROUPS = {'application': 'ci-application-suites', 'firestore': 'ci-application-suites',
          'mysql': 'ci-application-suites', 'publication': 'ci-publication-suites',
          'browser': 'ci-browser-suites'}


def require(value, message):
    if not value:
        raise ValueError(message)


def run(args):
    return subprocess.check_output(args, cwd=ROOT, timeout=60).decode('utf-8').strip()


def git(*args):
    return run(['git', *args])


def gh(endpoint, binary=False):
    timeout = min(10, DEADLINE - time.monotonic()) if DEADLINE else 10
    require(timeout > 0, 'Budget de lecture CI atteint')
    value = subprocess.check_output(['gh', 'api', endpoint], timeout=timeout)
    return value if binary else json.loads(value)


def content(ref):
    require(re.fullmatch('[a-f0-9]{40}', ref), 'SHA complet requis')
    data = subprocess.check_output(['git', 'ls-tree', '-r', '-z', ref], cwd=ROOT)
    # Every tracked source, dependency, test and workflow participates. Unknown
    # dependencies cannot accidentally be omitted from an allowlist.
    require(data and b'160000 commit ' not in data, 'Contenu Git inconnu')
    return {'tree': git('rev-parse', ref + '^{tree}'),
            'manifestSha256': hashlib.sha256(data).hexdigest(),
            'controllers': {p: git('rev-parse', ref + ':' + p) for p in CONTROLLERS}}


def runtime_identity():
    spec = importlib.util.spec_from_file_location('ci_pinned_runtime', ROOT/'tools/ci-pinned-runtime.py')
    runtime = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runtime)
    return runtime.identity()


def host_audit():
    # Audit the rolling VM without pretending its userland ran the suites.
    return {'image': os.environ.get('ImageOS', ''), 'version': os.environ.get('ImageVersion', ''),
            'kernel': platform.release()}


def environment(suite):
    value = {'runtime': runtime_identity(), 'node': run(['node', '--version']),
             'platform': sys.platform, 'architecture': platform.machine(),
             'python': run(['python3', '--version']), 'git': run(['git', '--version']),
             'githubCLI': run(['gh', '--version']).splitlines()[0]}
    if suite == 'firestore':
        result = subprocess.run(['java', '-version'], capture_output=True, text=True, check=True)
        value['java'] = result.stderr.strip().splitlines()[0]
    if suite == 'mysql':
        value['image'] = json.loads((ROOT / '.github/ci-suite-policy.json').read_text())['mysqlImage']
        require(re.fullmatch(r'mysql:5\.7\.30@sha256:[0-9a-f]{64}', value['image']),
                'Image MySQL immuable requise')
    if suite == 'browser':
        value['browser'] = run([os.environ['EDGE_BIN'], '--version'])
    return value


def origin():
    value = {'repository': os.environ['GITHUB_REPOSITORY'], 'run': int(os.environ['GITHUB_RUN_ID']),
             'attempt': int(os.environ.get('GITHUB_RUN_ATTEMPT', '1')),
             'event': os.environ['GITHUB_EVENT_NAME'], 'head': os.environ['GITHUB_SHA']}
    if value['event'] == 'pull_request':
        event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
        pr = event['pull_request']
        value.update(head=pr['head']['sha'], base=pr['base']['sha'],
                     number=event['number'], headRepository=pr['head']['repo']['full_name'],
                     baseBranch=pr['base']['ref'])
    return value


def proof(suite, reused=None):
    require(suite in GROUPS, 'Suite inconnue')
    candidate = git('rev-parse', 'HEAD')
    require(candidate == os.environ['GITHUB_SHA'], 'Checkout de preuve different')
    provenance = origin()
    require(provenance['event'] in ['push', 'pull_request'], 'Evenement de preuve interdit')
    if provenance['event'] == 'push':
        require(os.environ['GITHUB_REF'] == 'refs/heads/main', 'Push de preuve hors main')
    return {'schema': 3, 'host': host_audit(), 'suite': suite, 'result': 'success', 'candidate': candidate,
            'content': content(candidate), 'environment': environment(suite),
            'origin': provenance, 'mode': 'reused' if reused else 'executed',
            'source': reused}


@lru_cache(maxsize=16)
def artifact(run_id, group):
    repo = os.environ['GITHUB_REPOSITORY']
    info = gh(f'repos/{repo}/actions/runs/{run_id}')
    require(info.get('path') == WORKFLOW and info.get('event') == 'pull_request'
            and info.get('status') == 'completed' and info.get('conclusion') == 'success'
            and info.get('run_attempt') == 1
            and info.get('head_repository', {}).get('full_name') == repo,
            'Provenance CI PR incompatible')
    inventory = gh(f'repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100')
    require(inventory.get('total_count', 0) <= 100, 'Inventaire artefacts tronque')
    rows = [a for a in inventory['artifacts'] if a['name'] == group and not a['expired']]
    require(len(rows) == 1, 'Preuve PR absente, expiree ou ambigue')
    meta = gh(f'repos/{repo}/actions/artifacts/{rows[0]["id"]}')
    require(meta['name'] == group and not meta['expired']
            and meta['workflow_run']['id'] == int(run_id)
            and meta['workflow_run']['head_sha'] == info['head_sha'],
            'Artefact hors run PR')
    data = gh(f'repos/{repo}/actions/artifacts/{meta["id"]}/zip', binary=True)
    require(meta.get('digest') == 'sha256:' + hashlib.sha256(data).hexdigest(),
            'Empreinte ZIP PR incompatible')
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(sum(f.file_size for f in archive.infolist()) < 2 * 1024**2,
                'Artefact de preuve trop volumineux')
        for entry in archive.infolist():
            require(entry.filename in [s + '.json' for s, g in GROUPS.items() if g == group]
                    and entry.filename not in files, 'Chemin ou doublon de preuve PR interdit')
            files[entry.filename] = json.loads(archive.read(entry))
    return info, files, {'run': int(run_id), 'artifact': meta['id'], 'sha256': meta['digest']}


@lru_cache(maxsize=16)
def merged_pull_request(repo, number):
    # Public repository metadata, using the existing read-only token. Any
    # unavailable/denied response keeps the ordinary full-suite fallback.
    return gh(f'repos/{repo}/pulls/{number}')


def accepts(value, suite, candidate, info, parent, head):
    expected = content(candidate)
    require(set(value) == {'schema', 'suite', 'result', 'candidate', 'content',
                          'environment', 'host', 'origin', 'mode', 'source'}
            and value['schema'] == 3 and value['suite'] == suite
            and value['result'] == 'success' and value['mode'] == 'executed'
            and value['source'] is None
            and re.fullmatch('[0-9a-f]{40}', value['candidate'] or ''),
            'Resultat de suite absent ou incompatible')
    require(set(value['host']) == {'image', 'version', 'kernel'}
            and all(isinstance(v, str) and v for v in value['host'].values()),
            'Audit de l hote GitHub absent')
    provenance = value['origin']
    require(provenance == {'repository': os.environ['GITHUB_REPOSITORY'], 'run': info['id'],
            'attempt': 1, 'event': 'pull_request', 'head': head, 'base': parent,
            'number': provenance.get('number'),
            'headRepository': os.environ['GITHUB_REPOSITORY'], 'baseBranch': 'main'}
            and type(provenance['number']) is int and provenance['number'] > 0
            and info['head_sha'] == head,
            'PR ou base de preuve differente de la fusion')
    # A PR cannot teach main to trust a modified workflow or proof writer.
    controllers = content(parent)['controllers']
    require(value['content'] == expected
            and expected['controllers'] == controllers
            and value['environment'] == environment(suite),
            'Contenu, controleur ou environnement different')
    links = info.get('pull_requests', [])
    require(isinstance(links, list), 'Metadonnees PR invalides')
    if links:
        # Contradictory metadata is never replaced by a more permissive lookup.
        require(any(p.get('number') == provenance['number']
                    and p.get('base', {}).get('ref') == 'main'
                    and p.get('base', {}).get('sha') == parent
                    and p.get('head', {}).get('sha') == head for p in links),
                'PR ou base de preuve differente de la fusion')
    else:
        pr = merged_pull_request(os.environ['GITHUB_REPOSITORY'], provenance['number'])
        require(pr.get('number') == provenance['number'] and pr.get('merged') is True
                and pr.get('state') == 'closed' and pr.get('merge_commit_sha') == candidate
                and pr.get('base', {}).get('ref') == 'main'
                and pr.get('base', {}).get('sha') == parent
                and pr.get('base', {}).get('repo', {}).get('full_name') == os.environ['GITHUB_REPOSITORY']
                and pr.get('head', {}).get('sha') == head
                and (pr.get('head', {}).get('repo') or {}).get('full_name') == os.environ['GITHUB_REPOSITORY'],
                'PR fusionnee incompatible avec les parents du commit')
    return True


def reuse(suites, directory):
    global DEADLINE
    DEADLINE = time.monotonic() + 45
    candidate = git('rev-parse', 'HEAD')
    results = {suite: {'verified': False, 'reason': 'preuve PR compatible absente'} for suite in suites}
    if (os.environ.get('GITHUB_EVENT_NAME') == 'push'
            and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_RUN_ATTEMPT', '1') == '1'):
        try:
            parents = git('rev-list', '--parents', '-n', '1', candidate).split()
            require(len(parents) == 3, 'Fusion a deux parents requise')
            parent, head = parents[1:]
            repo = os.environ['GITHUB_REPOSITORY']
            rows = gh(f'repos/{repo}/actions/workflows/livepalmes-verification-preview.yml/runs'
                      f'?event=pull_request&head_sha={head}&per_page=10')['workflow_runs']
            for suite in suites:
                for row in rows[:10]:
                    if time.monotonic() >= DEADLINE:
                        break
                    if row.get('status') != 'completed' or row.get('conclusion') != 'success':
                        continue
                    try:
                        info, files, receipt = artifact(row['id'], GROUPS[suite])
                        accepts(files[suite + '.json'], suite, candidate, info, parent, head)
                        results[suite] = {'verified': True, 'reason': 'contenu PR identique authentifie',
                                          'source': {**receipt, 'suite': suite, 'pullRequest': files[suite + '.json']['origin']['number'],
                                                     'provenance': 'workflow-run' if info.get('pull_requests') else 'merged-pull-request'}}
                        break
                    except Exception as error:
                        # No network, timeout, missing, failed or foreign proof can skip a test.
                        results[suite]['reason'] = str(error) if isinstance(error, ValueError) else 'Lecture de preuve indisponible'
                        continue
        except Exception as error:
            for result in results.values():
                result['reason'] = str(error) if isinstance(error, ValueError) else 'Lecture de preuve indisponible'
    else:
        for result in results.values():
            result['reason'] = 'nouveau contenu PR ou evenement non reutilisable'
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / 'reuse.json').write_text(json.dumps(results, indent=2) + '\n')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        for suite, result in results.items():
            output.write(suite + '=' + str(result['verified']).lower() + '\n')
            print(suite + ' : ' + ('reutilisee' if result['verified'] else 'executee')
                  + ' ; ' + result['reason'])


def record(suites, directory):
    directory = Path(directory)
    reused = json.loads((directory / 'reuse.json').read_text()) if (directory / 'reuse.json').exists() else {}
    for suite in suites:
        if suite == 'firestore' and os.environ.get('FIRESTORE_REQUIRED') != 'true':
            continue  # Explicitly not required is never a fake success proof.
        source = reused.get(suite, {}).get('source') if reused.get(suite, {}).get('verified') else None
        (directory / (suite + '.json')).write_text(json.dumps(proof(suite, source), indent=2) + '\n')


if __name__ == '__main__':
    phase, directory, *suites = sys.argv[1:]
    require(suites and len(suites) == len(set(suites)) and all(s in GROUPS for s in suites), 'Suites invalides')
    {'reuse': reuse, 'record': record}[phase](suites, directory)
