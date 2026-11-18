"""Protected WIF consumer qualification: site metadata only, never publication."""
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import stat
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PROVIDER = 'projects/718081132564/locations/global/workloadIdentityPools/livepalmes-github/providers/github-a3-production'
ACCOUNT = 'github-actions-livepalmes@livepalmes.iam.gserviceaccount.com'
WORKFLOW = 'ffessmnap/LivePalmes/.github/workflows/a3-wif-readonly.yml@refs/heads/main'
SITE_URL = 'https://firebasehosting.googleapis.com/v1beta1/projects/livepalmes/sites/livepalmes'
PROFILE = {'node': 'v22.23.5', 'gcloud': '593.0.0', 'firebaseCli': '15.24.0', 'googleAuth': '9.15.1'}


def need(value):
    if not value:
        raise ValueError('Controle Hosting WIF refuse')


def exact(value, keys):
    need(isinstance(value, dict) and set(value) == set(keys))


def context(env, qualification='hosting-consumers'):
    need(qualification in {'hosting-consumers', 'hosting-renewal'})
    expected = {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes', 'GITHUB_REPOSITORY_ID': '1240638222',
                'GITHUB_REPOSITORY_OWNER_ID': '284726282', 'GITHUB_REF': 'refs/heads/main',
                'GITHUB_EVENT_NAME': 'workflow_dispatch', 'GITHUB_RUN_ATTEMPT': '1',
                'GITHUB_WORKFLOW_REF': WORKFLOW, 'VERIFIED_MAIN_CI': 'true',
                'WIF_QUALIFICATION': qualification}
    need(all(env.get(k) == v for k, v in expected.items()))
    need(re.fullmatch('[0-9a-f]{40}', env.get('GITHUB_SHA', ''))
         and env.get('EXPECTED_COMMIT') == env['GITHUB_SHA'])
    run = env.get('GITHUB_RUN_ID', '')
    need(re.fullmatch('[1-9][0-9]*', run) and int(run) < 2**53)
    return {'repository': 'ffessmnap/LivePalmes', 'project': 'livepalmes',
            'candidate': env['GITHUB_SHA'], 'run': int(run), 'workflow': WORKFLOW}


def credential(env, qualification='hosting-consumers'):
    context(env, qualification)  # Before reading any credential or OIDC endpoint/token.
    workspace = Path(env['GITHUB_WORKSPACE']).resolve()
    file = Path(env['GOOGLE_APPLICATION_CREDENTIALS'])
    need(file.is_absolute() and file.parent.resolve() == workspace
         and re.fullmatch('gha-creds-[A-Za-z0-9_-]{8,80}[.]json', file.name))
    info = file.lstat()
    need(stat.S_ISREG(info.st_mode) and not file.is_symlink() and info.st_size <= 65536)
    value = json.loads(file.read_text(encoding='utf8'))
    exact(value, ['type', 'audience', 'subject_token_type', 'token_url',
                  'credential_source', 'service_account_impersonation_url'])
    need(value['type'] == 'external_account' and value['audience'] == '//iam.googleapis.com/' + PROVIDER
         and value['subject_token_type'] == 'urn:ietf:params:oauth:token-type:jwt'
         and value['token_url'] == 'https://sts.googleapis.com/v1/token'
         and value['service_account_impersonation_url'] ==
         'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/' + ACCOUNT + ':generateAccessToken')
    source = value['credential_source']
    exact(source, ['url', 'headers', 'format'])
    exact(source['headers'], ['Authorization'])
    need(source['format'] == {'type': 'json', 'subject_token_field_name': 'value'})
    base = urllib.parse.urlsplit(env['ACTIONS_ID_TOKEN_REQUEST_URL'])
    need(base.scheme == 'https' and base.hostname and base.hostname.endswith('.actions.githubusercontent.com')
         and not base.username and not base.password and not base.fragment and base.port in {None, 443})
    pairs = urllib.parse.parse_qsl(base.query, keep_blank_values=True)
    need(len({k for k, _ in pairs}) == len(pairs))
    audience = 'https://iam.googleapis.com/' + PROVIDER
    query = [(k, audience if k == 'audience' else v) for k, v in pairs]
    if not any(k == 'audience' for k, _ in query):
        query.append(('audience', audience))
    expected_url = urllib.parse.urlunsplit(base._replace(query=urllib.parse.urlencode(query)))
    token = env['ACTIONS_ID_TOKEN_REQUEST_TOKEN']
    need(isinstance(token, str) and token and source['url'] == expected_url
         and source['headers']['Authorization'] == 'Bearer ' + token)
    return file


def command(args, env, cwd):
    result = subprocess.run(args, env=env, cwd=cwd, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=120, check=False)
    need(result.returncode == 0 and len(result.stdout) <= 1048576)
    return result.stdout.decode('utf8').strip()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirection refusee')


def read_site(token):
    request = urllib.request.Request(SITE_URL, headers={'Authorization': 'Bearer ' + token}, method='GET')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(request, timeout=30) as response:
        need(response.status == 200)
        raw = response.read(65537)
        need(len(raw) <= 65536)
        return json.loads(raw)


def site_name(value):
    need(isinstance(value, dict) and value.get('name') in {
        'projects/livepalmes/sites/livepalmes', 'projects/718081132564/sites/livepalmes'}
        and value.get('defaultUrl') == 'https://livepalmes.web.app')
    return value['name']


def exercise(env, temp, run=command, read=read_site):
    context(env)
    # Fresh config: no user login, token fallback, project alias or telemetry opt-in.
    config = temp / 'configstore'
    config.mkdir(mode=0o700)
    (config / 'firebase-tools.json').write_text('{"usage":false}', encoding='utf8')
    (config / 'firebase-tools.json').chmod(0o600)
    clean = {k: env[k] for k in ('PATH', 'LANG', 'LC_ALL', 'TMPDIR', 'SystemRoot') if k in env}
    clean.update({'GOOGLE_APPLICATION_CREDENTIALS': str(credential(env)), 'GOOGLE_CLOUD_PROJECT': 'livepalmes',
                  'GCLOUD_PROJECT': 'livepalmes', 'XDG_CONFIG_HOME': str(temp), 'CI': 'true',
                  'NO_UPDATE_NOTIFIER': '1', 'CLOUDSDK_CORE_DISABLE_USAGE_REPORTING': 'true',
                  'CLOUDSDK_CONFIG': str(temp / 'gcloud')})
    need(run(['node', '--version'], clean, temp) == PROFILE['node'])
    gcloud = json.loads(run(['gcloud', 'version', '--format=json'], clean, temp))
    need(gcloud.get('Google Cloud SDK') == PROFILE['gcloud'])
    token = run(['gcloud', 'auth', 'application-default', 'print-access-token'], clean, temp)
    need(token and len(token) <= 16384 and not re.search(r'\s', token))
    python_site = site_name(read(token))
    cli = ROOT / 'tests/firestore-rules/node_modules/firebase-tools/lib/bin/firebase.js'
    output = json.loads(run(['node', str(cli), 'hosting:sites:get', 'livepalmes',
                            '--project', 'livepalmes', '--json', '--non-interactive'], clean, temp))
    need(output.get('status') == 'success' and site_name(output.get('result')) == python_site)
    return {'pythonVersion': platform.python_version(), 'profile': PROFILE,
            'pythonGcloudSiteRead': True, 'firebaseCliSiteRead': True, 'site': 'livepalmes',
            'configurationWrites': 0, 'publicationInvocations': 0, 'accountsRead': 0,
            'credentialsExported': False, 'tokensExported': False,
            'publicationIdentityChanged': False, 'renewalQualifiedByThisControl': False}


def main(argv, env=os.environ):
    ctx = context(env)
    need(len(argv) == 1 and argv[0] and not Path(argv[0]).exists())
    # Inspect fixed package versions before any access to the credential.
    modules = ROOT / 'tests/firestore-rules/node_modules'
    for file, expected in [('firebase-tools/package.json', PROFILE['firebaseCli']),
                           ('google-auth-library/package.json', PROFILE['googleAuth'])]:
        need(json.loads((modules / file).read_text(encoding='utf8'))['version'] == expected)
    credential(env)
    with tempfile.TemporaryDirectory(prefix='lp-wif-hosting-', dir=env['RUNNER_TEMP']) as directory:
        report = exercise(env, Path(directory))
    hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in (
        'tools/a3-wif-hosting-readonly.py', '.github/workflows/a3-wif-readonly.yml',
        'tests/firestore-rules/package-lock.json')}
    destination = Path(argv[0])
    destination.mkdir(mode=0o700)
    with (destination / 'wif-hosting-proof.json').open('x', encoding='utf8') as stream:
        json.dump({'schema': 1, 'context': ctx, 'provider': PROVIDER, 'serviceAccount': ACCOUNT,
                   'sourceHashes': hashes, **report}, stream, indent=2)
        stream.write('\n')
    print('Controle Hosting WIF termine : metadonnees du seul site lues, aucun jeton exporte.')


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except Exception:
        print('Controle Hosting WIF refuse ; aucun credential ou detail de reponse affiche.', file=sys.stderr)
        sys.exit(1)
