"""A3.6b: five closed CSP values; no function, Rules or business write."""
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
OPTION = 'directCspRelease'
CONTRACT = '.github/releases/evidence/20261117-production-direct-csp-contract.json'
CONTRACT_SHA256 = 'f14453a52e374e50525558dc8e0511fc470337c30c0ebb064a5377e83c5bec53'
CANDIDATE = 'b8a2a56118d2932af7ac35f1ccc285de631f2e7e'
BASE = '689d523b423615cb1faad9f564c1a6b2f44f1b96'
ROUTES = ['/', '/index.html', '/direct.html', '/direct-admin.html', '/direct-consoles.html']
HEADERS = {'/': {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebasestorage.app wss://*.firebaseio.com; frame-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"}, '/index.html': {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebasestorage.app wss://*.firebaseio.com; frame-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"}, '/direct.html': {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebasestorage.app wss://*.firebaseio.com; frame-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"}, '/direct-admin.html': {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebasestorage.app wss://*.firebaseio.com; frame-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"}, '/direct-consoles.html': {'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.gstatic.com/firebasejs/ 'sha256-xTFjty3TzmOkPrbLzdA2Ot29lLql5sayO6bbumlrOJ4='; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.firebasestorage.app wss://*.firebaseio.com; frame-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"}}


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def load(file):
    spec = importlib.util.spec_from_file_location('direct_csp_' + file.replace('-', '_'), ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def contract():
    raw = (ROOT / CONTRACT).read_bytes().replace(b'\r\n', b'\n')
    require(hashlib.sha256(raw).hexdigest() == CONTRACT_SHA256, 'Contrat CSP PROD altere')
    return json.loads(raw)


def enabled(value):
    return OPTION in value


def approved(value):
    if not enabled(value):
        return False
    c = contract()
    require(set(value) == {'schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun', 'changes', OPTION}
            and value.get('schema') == 1
            and value[OPTION] == {'contractSha256': CONTRACT_SHA256}, 'Demande CSP sans autre option requise')
    require(all(value.get(k) == c[k] for k in ['candidate', 'productionCommit', 'productionHosting', 'testRun'])
            and c['candidate'] == CANDIDATE and c['productionCommit'] == BASE,
            'Paire TEST/PROD CSP differente du contrat')
    changes = value['changes']
    require(isinstance(changes, list) and len(changes) == 1 and isinstance(changes[0], dict)
            and changes[0].get('paths') == ['firebase.json'] and changes[0].get('status') == 'validated'
            and changes[0].get('source') == c['validationSource']
            and changes[0].get('validation') and changes[0].get('title'), 'Validation technique deleguee CSP exacte absente')
    return True


def validate_sources(before, after):
    c = contract()
    require(digest(before) == c['firebaseBeforeSha256'] and digest(after) == c['firebaseAfterSha256'], 'Configuration CSP hors paire fermee')
    restored = deepcopy(after)
    seen = []
    for row in restored['hosting']['headers']:
        route = row.get('source')
        if route not in ROUTES:
            continue
        require({h['key']:h['value'] for h in row['headers']} == HEADERS[route], 'En-tetes CSP exacts requis')
        row['headers'] = [h for h in row['headers'] if h['key'] != 'Content-Security-Policy']
        seen.append(route)
    require(seen == ROUTES and restored == before, 'Autre configuration modifiee')



def approved_paths(value, paths, git):
    if not approved(value):
        return set()
    c = contract()
    require(sorted(paths) == c['changedPaths']
            and sorted(git('diff', '--name-only', '--no-renames', BASE, CANDIDATE).splitlines()) == c['changedPaths'],
            'Diff complet CSP different du contrat')
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
            and digest(rows) == c['functionsSnapshotSha256'], 'Inventaire/revisions PROD CSP modifies')
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
            and baseline.get('productionCommit') == BASE, 'Selection ou reference PROD CSP differente')
    initial(list(names.values()))
    return scope()


def plan(directory):
    directory = Path(directory)
    value = json.loads((directory / 'request.json').read_text())
    require(approved(value) and json.loads((directory / 'selection.json').read_text()) == []
            and json.loads((directory / 'direct_csp-scope-proof.json').read_text()) == scope(),
            'Plan CSP incomplet ou selection non vide')
    require(not (directory / 'previous').exists(), 'Reprise CSP automatique non autorisee')
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
    require(observed == contract()['controls'], 'Derive des mails actifs/automates/modeles CSP')
    before = directory / 'direct_csp-controls-before.json'
    if before.exists():
        require(json.loads(before.read_text()) == observed, 'Temoin initial CSP different')
    else:
        require(not after, 'Temoin initial CSP absent')
        before.write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')
    if after:
        (directory / 'direct_csp-controls-after.json').write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')


def check_config(config, after=False):
    c = contract()
    require(digest(config) == c['hostingConfigAfterSha256' if after else 'hostingConfigBeforeSha256'],
            'Configuration Hosting observee differente du contrat CSP')
    return digest(config)


def latest_hosting():
    state = load('production-release-state.py')
    return state.request('https://firebasehosting.googleapis.com/v1beta1/sites/livepalmes/releases?pageSize=1')['releases'][0]


def rules_guard(directory, phase):
    reader = load('portal-session-enforcement-production-rules.py')
    import subprocess
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'], text=True, stderr=subprocess.DEVNULL).strip()
    observed, _ = reader.snapshot(token)
    require(observed == contract()['rulesObserved'], 'Rules PROD ont derive : aucun changement autorise')
    (Path(directory) / ('direct_csp-rules-' + phase + '.json')).write_text(json.dumps(observed, sort_keys=True), encoding='utf-8')
    return observed


def before_hosting(directory):
    directory = Path(directory)
    plan(directory)
    rules_guard(directory, 'before')
    observed = latest_hosting()
    expected = json.loads((directory / 'prod-before.json').read_text())['hosting']
    require({'name': observed['name'], 'version': observed['version']['name'], 'message': observed.get('message', '')} == expected,
            'Hosting a derive avant les dix ajouts CSP')
    check_config(observed['version']['config'])
    return {'contractSha256': CONTRACT_SHA256, 'hosting': expected, 'configurationSha256': digest(observed['version']['config'])}


def prerequisites(directory, kind):
    directory = Path(directory)
    plan(directory)
    if kind == 'hosting':
        return before_hosting(directory)
    require(kind == 'backend', 'Identite CSP inconnue')
    functions = load('production-release-state.py').inventory()
    initial(functions)
    guard(directory)
    return {'contractSha256': CONTRACT_SHA256, 'selected': [], 'preservedFunctions': 119,
            'functionsWitnessSha256': function_witness(functions), 'controls': contract()['controls']}


def readiness(directory, preparation, run):
    directory = Path(directory)
    plan(directory)
    require(str(preparation).isdigit() and int(preparation) > 0 and str(run).isdigit() and int(run) > 0,
            'Preflight et prerequis CSP officiels obligatoires')
    cycle = load('release-cycle.py')
    preflight = cycle.gh(f'repos/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{preparation}')
    require(preflight['head_sha'] == os.environ['GITHUB_SHA'] and preflight['run_attempt'] == 1
            and preflight['path'] == '.github/workflows/livepalmes-production-preflight.yml'
            and preflight['conclusion'] == 'success', 'Preflight CSP du meme outillage requis')
    for kind in ['hosting', 'backend']:
        destination = directory / ('direct_csp-readiness-' + kind)
        info = cycle.artifact(run, 'production-prerequisites-' + kind, destination,
                              '.github/workflows/livepalmes-production-readiness.yml')
        report = json.loads((destination / ('prerequisites-' + kind + '.json')).read_text())
        require(info['head_sha'] == os.environ['GITHUB_SHA'] and report['planRun'] == int(preparation)
                and report['candidate'] == CANDIDATE and report['kind'] == kind and report['readOnly'] is True
                and report['ready'] is True and report['missingPermissions'] == [], 'Prerequis CSP incompatibles')
        proof = report.get(OPTION, {})
        require(proof.get('contractSha256') == CONTRACT_SHA256, 'Prerequis sans contrat CSP')
        if kind == 'backend':
            require(proof.get('selected') == [] and proof.get('preservedFunctions') == 119
                    and proof.get('controls') == contract()['controls'] and len(proof.get('functionsWitnessSha256', '')) == 64,
                    'Prerequis backend CSP incomplets')
        else:
            require(proof.get('configurationSha256') == contract()['hostingConfigBeforeSha256']
                    and proof.get('hosting') == json.loads((directory / 'prod-before.json').read_text())['hosting'],
                    'Prerequis Hosting CSP differents')


def backup_review(directory, selected, functions, hosting):
    directory = Path(directory)
    plan(directory)
    require(selected == [], 'Aucune source Functions autorisee pour CSP')
    initial(functions)
    check_config(hosting['config'])
    ready = json.loads((directory / 'direct_csp-readiness-backend/prerequisites-backend.json').read_text())[OPTION]
    require(function_witness(functions) == ready['functionsWitnessSha256'], 'Configuration backend a derive depuis les prerequis CSP')
    return CONTRACT_SHA256


def rollback_check(report, current, previous):
    require(report.get(OPTION) == CONTRACT_SHA256 and report.get('candidate') == CANDIDATE and report.get('functions') == [] and report.get('newFunctions') == [], 'Sauvegarde CSP hors contrat')
    check_config(current['version']['config'], after=True)
    check_config(previous['version']['config'])
    require(previous['version']['name'] == contract()['productionHosting'], 'Repli CSP different')
    restored = deepcopy(current['version']['config'])
    for row in restored['headers']:
        if row.get('glob') in ROUTES:
            require(row['headers'] == HEADERS[row['glob']], 'CSP distantes differentes')
            del row['headers']['Content-Security-Policy']
    require(restored == previous['version']['config'], 'Autre delta pendant retour CSP')



class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(route, method):
    req = urllib.request.Request('https://livepalmes.web.app' + route, method=method)
    with urllib.request.build_opener(NoRedirect).open(req, timeout=30) as response:
        body = response.read(4 * 1024**2 + 1) if method == 'GET' else b''
        require(len(body) <= 4 * 1024**2, 'Fichier CSP au-dela de la limite')
        return response.status, body, response.headers


def check_hosting(root, directory, receipt, read=fetch, sleep=time.sleep):
    directory = Path(directory)
    plan(directory)
    observations = []
    result = {'schema': 1, 'candidate': CANDIDATE, 'contractSha256': CONTRACT_SHA256, 'verified': False, 'observations': observations}
    try:
        result['rules'] = rules_guard(directory, 'after')
        observed = latest_hosting()
        require(observed.get('message', '') == f'LivePalmes {CANDIDATE} run {os.environ["GITHUB_RUN_ID"]}', 'Release CSP finale inattendue')
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
                valid_headers = all(headers.get(k) == v for k, v in HEADERS[route].items())
                valid_home = method != 'HEAD' or (body == b'' and headers.get('X-LivePalmes-Home-Source') == 'nap-server-html'
                                                  and headers.get('Cache-Control') == 'private, no-store')
                observations.append({'route': route, 'method': method, 'attempt': attempt, 'status': status,
                                     'bytesReceived': len(body), 'expectedSha256': expected, 'actualSha256': actual,
                                     'headers': {k: headers.get(k) for k in HEADERS[route]}, 'homeContract': valid_home})
                if status == 200 and headers.get('Content-Type', '').startswith('text/html') and valid_headers and valid_home and actual == expected:
                    break
            else:
                raise ValueError('Controle CSP final refuse : ' + route)
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
            raise ValueError('Mode CSP PROD inconnu')
