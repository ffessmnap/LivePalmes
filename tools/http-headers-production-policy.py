"""A3.6a only: ten Hosting header pairs; no function or business operation."""
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OPTION = 'httpHeadersRelease'
CONTRACT = '.github/releases/evidence/20261117-production-http-headers-contract.json'
CONTRACT_SHA256 = '54ba4845ccd178cf7d1bb69d7ce4e675f41204f195577b301380a366f012f352'
CANDIDATE = '709cd01c4cba11dde42991a19a59f2795e9432b2'
BASE = '43fbd5a9bb544199255de37dd239584f2c502d78'
ROUTES = ['/', '/index.html', '/direct.html', '/direct-admin.html', '/direct-consoles.html']
HEADERS = {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin'}


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def load(file):
    spec = importlib.util.spec_from_file_location('http_headers_' + file.replace('-', '_'), ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def contract():
    raw = (ROOT / CONTRACT).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat HTTP PROD altere')
    return json.loads(raw)


def enabled(value):
    return OPTION in value


def approved(value):
    if not enabled(value):
        return False
    c = contract()
    require(set(value) == {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun', 'changes', OPTION}
            and value.get('schema') == 1
            and value[OPTION] == {'contractSha256': CONTRACT_SHA256}, 'Demande HTTP sans autre option requise')
    require(all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun'])
            and c['candidate'] == CANDIDATE and c['productionCommit'] == BASE,
            'Paire TEST/PROD HTTP differente du contrat')
    changes = value['changes']
    require(isinstance(changes, list) and len(changes) == 1 and isinstance(changes[0], dict)
            and changes[0].get('paths') == ['firebase.json'] and changes[0].get('status') == 'validated'
            and changes[0].get('source') == c['validationSource']
            and changes[0].get('validation') and changes[0].get('title'), 'Validation humaine HTTP exacte absente')
    return True


def validate_sources(before, after):
    c = contract()
    require(digest(before) == c['firebaseBeforeSha256'] and digest(after) == c['firebaseAfterSha256'],
            'Configuration Firebase HTTP hors paire fermee')
    expected = [{'source': route, 'headers': [{'key': k, 'value': v} for k, v in HEADERS.items()]} for route in ROUTES]
    restored = deepcopy(after)
    require(restored.get('hosting', {}).get('headers', [])[:5] == expected, 'Dix paires HTTP exactes requises')
    del restored['hosting']['headers'][:5]
    require(restored == before, 'Autre configuration Firebase modifiee')


def approved_paths(value, paths, git):
    if not approved(value):
        return set()
    c = contract()
    require(sorted(paths) == c['changedPaths']
            and sorted(git('diff', '--name-only', '--no-renames', BASE, CANDIDATE).splitlines()) == c['changedPaths'],
            'Diff complet HTTP different du contrat')
    validate_sources(*[json.loads(git('show', sha + ':firebase.json')) for sha in [BASE, CANDIDATE]])
    require(all(git('rev-parse', sha + ':functions') == c['functionsTree'] for sha in [BASE, CANDIDATE]),
            'Arbre backend different de la PROD validee')
    return {'firebase.json'}


def minimal(functions):
    return sorted([{**{k: f.get(k) for k in ['name', 'updateTime', 'state']},
                    'revision': f.get('revision', f.get('serviceConfig', {}).get('revision')),
                    'commit': f.get('commit', f.get('labels', {}).get('livepalmes-commit'))}
                   for f in functions], key=lambda f: f['name'])


def initial(functions):
    c = contract()
    rows = minimal(functions)
    require(len(rows) == c['inventoryCount'] == 119 and len({f['name'] for f in rows}) == 119
            and all(f['state'] == 'ACTIVE' and f['revision'] and f['updateTime'] for f in rows)
            and digest(rows) == c['functionsSnapshotSha256'], 'Inventaire/revisions PROD HTTP modifies')
    return rows


def scope():
    c = contract()
    return {'schema': 1, 'contractSha256': CONTRACT_SHA256, 'candidate': CANDIDATE,
            'productionRun': c['productionRun'], 'routes': ROUTES, 'headers': HEADERS,
            'selected': [], 'retainedFunctions': 119, 'functionsTree': c['functionsTree'],
            'functionConfigurationChanges': False, 'bindingChanges': False, 'businessWrites': False}


def freeze(value, baseline, names, selected, git, paths):
    approved_paths(value, paths, git)
    require(selected == [] and baseline.get('productionRun') == contract()['productionRun']
            and baseline.get('productionCommit') == BASE, 'Selection ou reference PROD HTTP differente')
    initial(list(names.values()))
    return scope()


def plan(directory):
    directory = Path(directory)
    value = json.loads((directory / 'request.json').read_text())
    require(approved(value) and json.loads((directory / 'selection.json').read_text()) == []
            and json.loads((directory / 'http_headers-scope-proof.json').read_text()) == scope(),
            'Plan HTTP incomplet ou selection non vide')
    require(not (directory / 'previous').exists(), 'Reprise HTTP automatique non autorisee')
    return value


def function_witness(functions):
    standard = load('standard-source-policy.py')
    return digest(sorted([{'identity': minimal([f])[0], 'configuration': standard.configuration(f),
                           'labels': f.get('labels', {}), 'source': f.get('buildConfig', {}).get('source'),
                           'sourceProvenance': f.get('buildConfig', {}).get('sourceProvenance')}
                          for f in functions], key=lambda f: f['identity']['name']))


def assert_retained(before, after):
    initial(list(before.values()))
    initial(list(after.values()))
    require(set(before) == set(after) and function_witness(list(before.values())) == function_witness(list(after.values())),
            'Source/configuration/labels/bindings des fonctions modifies pendant Hosting')


def guard(directory, after=False):
    directory = Path(directory)
    plan(directory)
    observed = load('standard-source-policy.py').controls()
    require(observed == contract()['controls'], 'Derive des mails actifs/automates/modeles HTTP')
    before = directory / 'http_headers-controls-before.json'
    if before.exists():
        require(json.loads(before.read_text()) == observed, 'Temoin initial HTTP different')
    else:
        require(not after, 'Temoin initial HTTP absent')
        before.write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')
    if after:
        (directory / 'http_headers-controls-after.json').write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')


def check_config(config, after=False):
    c = contract()
    require(digest(config) == c['hostingConfigAfterSha256' if after else 'hostingConfigBeforeSha256'],
            'Configuration Hosting observee differente du contrat HTTP')
    return digest(config)


def latest_hosting():
    state = load('production-release-state.py')
    return state.request('https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1')['releases'][0]


def before_hosting(directory):
    directory = Path(directory)
    plan(directory)
    observed = latest_hosting()
    expected = json.loads((directory / 'prod-before.json').read_text())['hosting']
    require({'name': observed['name'], 'version': observed['version']['name'], 'message': observed.get('message', '')} == expected,
            'Hosting a derive avant les dix ajouts HTTP')
    check_config(observed['version']['config'])
    return {'contractSha256': CONTRACT_SHA256, 'hosting': expected, 'configurationSha256': digest(observed['version']['config'])}


def prerequisites(directory, kind):
    directory = Path(directory)
    plan(directory)
    if kind == 'hosting':
        return before_hosting(directory)
    require(kind == 'backend', 'Identite HTTP inconnue')
    functions = load('production-release-state.py').inventory()
    initial(functions)
    guard(directory)
    return {'contractSha256': CONTRACT_SHA256, 'selected': [], 'preservedFunctions': 119,
            'functionsWitnessSha256': function_witness(functions), 'controls': contract()['controls']}


def readiness(directory, preparation, run):
    directory = Path(directory)
    plan(directory)
    require(str(preparation).isdigit() and int(preparation) > 0 and str(run).isdigit() and int(run) > 0,
            'Preflight et prerequis HTTP officiels obligatoires')
    cycle = load('release-cycle.py')
    preflight = cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{preparation}')
    require(preflight['head_sha'] == os.environ['GITHUB_SHA'] and preflight['run_attempt'] == 1
            and preflight['path'] == '.github/workflows/livepalmes-production-preflight.yml'
            and preflight['conclusion'] == 'success', 'Preflight HTTP du meme outillage requis')
    for kind in ['hosting', 'backend']:
        destination = directory / ('http_headers-readiness-' + kind)
        info = cycle.artifact(run, 'production-prerequisites-' + kind, destination,
                              '.github/workflows/livepalmes-production-readiness.yml')
        report = json.loads((destination / ('prerequisites-' + kind + '.json')).read_text())
        require(info['head_sha'] == os.environ['GITHUB_SHA'] and report['planRun'] == int(preparation)
                and report['candidate'] == CANDIDATE and report['kind'] == kind and report['readOnly'] is True
                and report['ready'] is True and report['missingPermissions'] == [], 'Prerequis HTTP incompatibles')
        proof = report.get(OPTION, {})
        require(proof.get('contractSha256') == CONTRACT_SHA256, 'Prerequis sans contrat HTTP')
        if kind == 'backend':
            require(proof.get('selected') == [] and proof.get('preservedFunctions') == 119
                    and proof.get('controls') == contract()['controls'] and len(proof.get('functionsWitnessSha256', '')) == 64,
                    'Prerequis backend HTTP incomplets')
        else:
            require(proof.get('configurationSha256') == contract()['hostingConfigBeforeSha256']
                    and proof.get('hosting') == json.loads((directory / 'prod-before.json').read_text())['hosting'],
                    'Prerequis Hosting HTTP differents')


def backup_review(directory, selected, functions, hosting):
    directory = Path(directory)
    plan(directory)
    require(selected == [], 'Aucune source Functions autorisee pour HTTP')
    initial(functions)
    check_config(hosting['config'])
    ready = json.loads((directory / 'http_headers-readiness-backend/prerequisites-backend.json').read_text())[OPTION]
    require(function_witness(functions) == ready['functionsWitnessSha256'], 'Configuration backend a derive depuis les prerequis HTTP')
    return CONTRACT_SHA256


def rollback_check(report, current, previous):
    require(report.get(OPTION) == CONTRACT_SHA256 and report.get('candidate') == CANDIDATE
            and report.get('functions') == [] and report.get('newFunctions') == [], 'Sauvegarde HTTP hors contrat')
    check_config(current['version']['config'], after=True)
    check_config(previous['version']['config'])
    require(previous['version']['name'] == contract()['productionHosting'], 'Version de repli HTTP differente')
    restored = deepcopy(current['version']['config'])
    require(restored.get('headers', [])[:5] == [{'glob': r, 'headers': HEADERS} for r in ROUTES], 'Ajouts HTTP distants differents')
    del restored['headers'][:5]
    require(restored == previous['version']['config'], 'Retour arriere HTTP modifierait un autre reglage')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(route, method):
    req = urllib.request.Request('https://livepalmes.web.app' + route, method=method)
    with urllib.request.build_opener(NoRedirect).open(req, timeout=30) as response:
        body = response.read(4 * 1024**2 + 1) if method == 'GET' else b''
        require(len(body) <= 4 * 1024**2, 'Fichier HTTP au-dela de la limite')
        return response.status, body, response.headers


def check_hosting(root, directory, receipt, read=fetch, sleep=time.sleep):
    directory = Path(directory)
    plan(directory)
    observations = []
    result = {'schema': 1, 'candidate': CANDIDATE, 'contractSha256': CONTRACT_SHA256, 'verified': False, 'observations': observations}
    try:
        observed = latest_hosting()
        require(observed.get('message', '') == f'LivePalmes {CANDIDATE} run {os.environ["GITHUB_RUN_ID"]}', 'Release HTTP finale inattendue')
        result['hostingVersion'] = observed['version']['name']
        result['configurationSha256'] = check_config(observed['version']['config'], after=True)
        for route in ROUTES:
            method = 'HEAD' if route in ['/', '/index.html'] else 'GET'
            expected = None if method == 'HEAD' else hashlib.sha256((Path(root) / route.lstrip('/')).read_bytes()).hexdigest()
            # Home has exactly two bounded HEADs, never a GET or an automatic retry.
            delays = (0,) if method == 'HEAD' else (0, 5, 15)
            for attempt, delay in enumerate(delays, 1):
                if delay:
                    sleep(delay)
                try:
                    status, body, headers = read(route, method)
                except (urllib.error.URLError, TimeoutError) as error:
                    status, body, headers = getattr(error, "code", 0), b"", {}
                actual = None if method == 'HEAD' else hashlib.sha256(body).hexdigest()
                valid_headers = all(headers.get(k) == v for k, v in HEADERS.items())
                valid_home = method != 'HEAD' or (body == b'' and headers.get('X-LivePalmes-Home-Source') == 'nap-server-html'
                                                  and headers.get('Cache-Control') == 'private, no-store')
                observations.append({'route': route, 'method': method, 'attempt': attempt, 'status': status,
                                     'bytesReceived': len(body), 'expectedSha256': expected, 'actualSha256': actual,
                                     'headers': {k: headers.get(k) for k in HEADERS}, 'homeContract': valid_home})
                if status == 200 and headers.get('Content-Type', '').startswith('text/html') and valid_headers and valid_home and actual == expected:
                    break
            else:
                raise ValueError('Controle HTTP final refuse : ' + route)
        result['verified'] = True
        return result
    finally:
        Path(receipt).write_text(json.dumps(result, indent=2), encoding='utf-8')


if __name__ == '__main__':
    mode, directory, *args = sys.argv[1:]
    value = json.loads((Path(directory) / 'request.json').read_text())
    if enabled(value):
        if mode == 'readiness' and len(args) == 2:
            readiness(directory, *args)
        elif mode == 'before-hosting' and not args:
            before_hosting(directory)
        elif mode == 'hosting' and len(args) == 2:
            check_hosting(args[0], directory, args[1])
        else:
            raise ValueError('Mode HTTP PROD inconnu')
