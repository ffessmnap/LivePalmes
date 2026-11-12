"""Run the five CI suites in one authenticated, read-only Linux userland.

The GitHub VM remains an audited transport: it supplies Docker, never the
interpreters or browser that decide whether a suite proof is compatible.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
POLICY = '.github/ci-container.json'
SECCOMP = '.github/ci-seccomp.json'


def require(value, reason):
    if not value:
        raise ValueError(reason)


def digest(path):
    with open(path, 'rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def policy():
    value = json.loads((ROOT/POLICY).read_text())
    require(value['schema'] == 1 and re.fullmatch(
        r'mcr\.microsoft\.com/playwright/python@sha256:[0-9a-f]{64}', value['image']),
        'Image CI immuable requise')
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', value['imageId']), 'Identite OCI requise')
    require(digest(ROOT/SECCOMP) == value['seccompSha256'], 'Profil seccomp modifie')
    require(value['tools']['node']['version'] == json.loads(
        (ROOT/'.github/ci-runtime.json').read_text())['node'], 'Pin Node divergent')
    for tool in value['tools'].values():
        require(re.fullmatch('[0-9a-f]{64}', tool['sha256']), 'Archive non epinglee')
        require(tool['url'].startswith(('https://nodejs.org/dist/',
            'https://github.com/adoptium/temurin21-binaries/releases/download/',
            'https://github.com/cli/cli/releases/download/')), 'Origine outil inconnue')
        require('/' not in tool['directory'] and tool['directory'] not in ('', '.', '..'),
                'Racine archive invalide')
    return value


def fetch(tool, cache):
    """A cache hit is still hashed; neither a redirect nor a cache is trusted."""
    archive = cache/(tool['sha256'] + '.tar')
    if archive.exists() and digest(archive) == tool['sha256']:
        return archive
    for attempt in range(2):
        temporary = archive.with_suffix('.download')
        try:
            started, size = time.monotonic(), 0
            with urllib.request.urlopen(tool['url'], timeout=30) as response, temporary.open('wb') as output:
                while block := response.read(1024*1024):
                    size += len(block)
                    require(size < 512*1024**2 and time.monotonic()-started < 180,
                            'Telechargement outil hors budget')
                    output.write(block)
            require(digest(temporary) == tool['sha256'], 'Empreinte archive outil differente')
            temporary.replace(archive)
            return archive
        except Exception:
            temporary.unlink(missing_ok=True)
            if attempt:
                raise


def extract(archive, destination, top):
    destination.mkdir(parents=True, exist_ok=False)
    with tarfile.open(archive) as source:
        members = source.getmembers()
        require(members and all(m.name == top or m.name.startswith(top + '/') for m in members),
                'Archive outil hors racine')
        # Reject devices, absolute paths and symlinks escaping this tool.
        source.extractall(destination, members=members, filter='data')
    require((destination/top/'bin').is_dir(), 'Outil extrait incomplet')


def locations():
    temporary = Path(os.environ['RUNNER_TEMP']).resolve()
    workspace = Path(os.environ['GITHUB_WORKSPACE']).resolve()
    require(workspace == ROOT and temporary.is_absolute() and temporary != workspace
            and str(workspace).startswith('/home/runner/work/')
            and str(temporary).startswith('/home/runner/work/'), 'Montages hors runner GitHub')
    return temporary, workspace


def prepare():
    require(sys.platform == 'linux' and os.environ.get('GITHUB_ACTIONS') == 'true'
            and os.getuid() != 0, 'Preparation reservee au runner non root')
    config = policy()
    temporary, _ = locations()
    cache = temporary/'ci-runtime-downloads'
    cache.mkdir(exist_ok=True)
    tools = temporary/'ci-runtime-tools'
    tools.mkdir(exist_ok=False)
    def install(item):
        name, tool = item
        extract(fetch(tool, cache), tools/name, tool['directory'])
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(install, config['tools'].items()))
    (tools/'bin').mkdir()
    (tools/'bin/python').symlink_to('/usr/bin/python3')
    subprocess.run(['docker', 'pull', '--platform=linux/amd64', config['image']], check=True, timeout=240)
    actual = subprocess.check_output(['docker', 'image', 'inspect', config['image'],
                                     '--format', '{{.Id}}'], text=True, timeout=30).strip()
    require(actual == config['imageId'], 'Configuration de l image OCI differente')
    for folder in ['ci-runtime-home', 'ci-runtime-downloads']:
        (temporary/folder).mkdir(exist_ok=True)
    (Path.home()/'.npm').mkdir(exist_ok=True)
    receipt = {'image': config['image'], 'imageId': actual, 'policySha256': digest(ROOT/POLICY)}
    (tools/'identity.json').write_text(json.dumps(receipt)+'\n')
    # This fresh check is never reused, including when all five suites are.
    require(execute(['python3', 'tools/ci-pinned-runtime.py', 'check'], ready=True) == 0,
            'Controle frais du runtime refuse')
    with open(os.environ['GITHUB_ENV'], 'a') as output:
        output.write('LP_CI_RUNTIME_READY=true\n')


def container_command(command, environment, config, temporary, workspace, uid, gid, npm_cache):
    """Build an argv, never a shell command; forward no ambient credentials."""
    require(uid != 0 and gid != 0, 'Execution root interdite')
    tools = temporary/'ci-runtime-tools'
    args = ['docker', 'run', '--rm', '--init', '--platform=linux/amd64', '--read-only',
            '--user', f'{uid}:{gid}', '--cap-drop=ALL',
            '--security-opt', 'no-new-privileges=true',
            '--security-opt', 'seccomp='+str(workspace/SECCOMP),
            '--network=host', '--shm-size=1g', '--tmpfs', '/tmp:rw,nosuid,nodev,size=1g',
            '--workdir', str(workspace)]
    for path, readonly in [(workspace, False), (temporary, False), (tools, True), (npm_cache, False)]:
        args += ['--mount', f'type=bind,src={path},dst={path}' + (',readonly' if readonly else '')]
    allowed = {'CI', 'BASE_SHA', 'HEAD_SHA', 'FIRESTORE_REQUIRED', 'GH_TOKEN', 'NODE_PATH', 'ImageOS', 'ImageVersion',
               'NAP_TEAM_FIXTURE_ALLOWED', 'NAP_TEAM_FIXTURE_PASSWORD'}
    forwarded = {k: v for k, v in environment.items() if k in allowed
                 or k.startswith('npm_config_')
                 or (k.startswith(('GITHUB_', 'RUNNER_')) and k != 'GITHUB_TOKEN')}
    binaries = [str(tools/'bin')] + [str(tools/name/tool['directory']/'bin') for name, tool in config['tools'].items()]
    forwarded.update(PATH=':'.join(binaries + ['/usr/local/bin', '/usr/bin', '/bin']),
        HOME=str(temporary/'ci-runtime-home'), LANG='C.UTF-8', LC_ALL='C.UTF-8', TZ='UTC',
        PYTHONDONTWRITEBYTECODE='1', LP_CI_CONTAINER='true',
        LP_CI_POLICY_SHA256=digest(workspace/POLICY), LP_CI_IMAGE_ID=config['imageId'],
        npm_config_cache=str(npm_cache), PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD='1')
    # Values are inherited by Docker by name: no token appears in its argv/log.
    for name in sorted(forwarded):
        args += ['--env', name]
    args += [config['image'], 'bash', '--noprofile', '--norc', '-e', '-o', 'pipefail', '-c',
             'browsers=(/ms-playwright/chromium-*/chrome-linux*/chrome); '
             'test "${#browsers[@]}" = 1; test -x "${browsers[0]}"; '
             'export EDGE_BIN="${browsers[0]}" LIVEPALMES_BROWSER_EXECUTABLE="${browsers[0]}"; '
             'exec "$@"', 'ci', *command]
    return args, forwarded


def execute(command, ready=False):
    require(ready or os.environ.get('LP_CI_RUNTIME_READY') == 'true', 'Environnement CI non prepare')
    temporary, workspace = locations()
    config = policy()
    receipt = json.loads((temporary/'ci-runtime-tools/identity.json').read_text())
    require(receipt == {'image': config['image'], 'imageId': config['imageId'],
                       'policySha256': digest(ROOT/POLICY)}, 'Recu de preparation incompatible')
    args, environment = container_command(command, dict(os.environ), config, temporary,
        workspace, os.getuid(), os.getgid(), Path.home()/'.npm')
    return subprocess.call(args, env=environment)


def identity():
    config = policy()
    require(sys.platform == 'linux' and Path('/.dockerenv').is_file() and os.geteuid() != 0
            and os.environ.get('LP_CI_CONTAINER') == 'true'
            and os.environ.get('LP_CI_POLICY_SHA256') == digest(ROOT/POLICY)
            and os.environ.get('LP_CI_IMAGE_ID') == config['imageId'], 'Preuve hors image authentifiee')
    status = dict(line.split(':', 1) for line in Path('/proc/self/status').read_text().splitlines() if ':' in line)
    require(int(status['CapEff'].strip(), 16) == 0 and status['NoNewPrivs'].strip() == '1'
            and status['Seccomp'].strip() == '2', 'Protections du conteneur manquantes')
    # The tools and root filesystem must actually be mounted read-only.
    mounts = [line.split() for line in Path('/proc/self/mountinfo').read_text().splitlines()]
    tools = str(Path(os.environ['RUNNER_TEMP'])/'ci-runtime-tools')
    require(all(any(row[4] == path and 'ro' in row[5].split(',') for row in mounts)
                for path in ['/', tools]), 'Image ou outils modifiables')
    return {'image': config['image'], 'imageId': config['imageId'],
            'policySha256': digest(ROOT/POLICY), 'seccompSha256': config['seccompSha256'],
            'tools': {name: tool['sha256'] for name, tool in config['tools'].items()}}


def check():
    value = identity()
    for args in [['node', '--version'], ['python3', '--version'], ['git', '--version'],
                 ['java', '-version'], ['gh', '--version'], ['dbus-run-session', '--version']]:
        subprocess.run(args, check=True, timeout=15, capture_output=True)
    # No site, SDK, authentication, account or data endpoint: Chromium's own
    # internal sandbox page must report the namespace and seccomp sandboxes.
    browser = os.environ['EDGE_BIN']
    result = subprocess.run(['dbus-run-session', '--', browser, '--headless=new', '--disable-gpu',
        '--disable-background-networking', '--no-first-run', '--disable-component-update',
        '--user-data-dir=/tmp/ci-sandbox-check', '--dump-dom', 'chrome://sandbox'],
        check=False, text=True, capture_output=True, timeout=30)
    if result.returncode:
        # Only this internal, credential-free invocation is reported. Never
        # dump the ambient environment or a page belonging to the application.
        print(result.stderr[-6000:], file=sys.stderr)
        for path in ['/proc/self/attr/current', '/proc/sys/kernel/apparmor_restrict_unprivileged_userns',
                     '/proc/sys/kernel/unprivileged_userns_clone', '/proc/sys/user/max_user_namespaces']:
            file = Path(path)
            if file.is_file():
                print(path+': '+file.read_text().strip(), file=sys.stderr)
    require(result.returncode == 0, 'Chromium refuse le controle du sandbox')
    for label in ['Namespace Sandbox', 'Seccomp-BPF sandbox']:
        require(re.search(re.escape(label)+r'</td>\s*<td[^>]*>Yes', result.stdout, re.I),
                'Sandbox Chromium non confirme : '+label)
    print(json.dumps({'runtime': value, 'chromiumSandbox': 'namespace+seccomp verified'}))


if __name__ == '__main__':
    phase, *arguments = sys.argv[1:]
    if phase == 'prepare':
        prepare()
    elif phase == 'check':
        check()
    elif phase == 'shell':
        require(len(arguments) == 1, 'Un script GitHub requis')
        raise SystemExit(execute(['bash', '--noprofile', '--norc', '-e', '-o', 'pipefail', arguments[0]]))
    elif phase == 'exec':
        require(arguments, 'Commande de suite requise')
        raise SystemExit(execute(arguments))
    else:
        raise ValueError('Phase CI inconnue')
