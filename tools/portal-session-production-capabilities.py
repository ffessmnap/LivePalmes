"""Read-only A3.4a A prerequisites: existing runtime grants and administrative continuity."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = '63fb92732a448401035f24bcd0a7c466cfce4f82'
RUNTIME = 'c32f15b6f14c1a0d922d454fdb57ced56555a02c04ca265a58fd0b5d907f1afa'
READERS = {'backend': '32e5a65af14194d922027c0c9471e5cf8115928b4960ab481a997141f167303a',
           'hosting': '1822d195d739ff1f40ba87acc45028f9e7c4234e57c13eafb253604a7e94cf48'}
READER_PERMISSIONS = {'backend': ['resourcemanager.projects.getIamPolicy', 'iam.roles.get'],
                      'hosting': ['firebaseauth.users.get', 'datastore.entities.get', 'datastore.entities.list']}
REQUIRED = frozenset({'datastore.databases.get', 'datastore.entities.get',
                      'datastore.entities.create', 'datastore.entities.update'})
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
IAM = 'https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:getIamPolicy?fields=bindings(role,members,condition)'
ROLE = re.compile(r'roles/[A-Za-z0-9_.]+|projects/livepalmes/roles/[A-Za-z0-9_.]+')


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def load(file):
    spec = importlib.util.spec_from_file_location('session_caps_' + file.replace('-', '_'), ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def context(candidate, kind, env):
    require(candidate == CANDIDATE and kind in READERS, 'Qualification reservee au candidat A3.4a A')
    require(env.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
            and env.get('GITHUB_REF') == 'refs/heads/main' and env.get('GITHUB_RUN_ATTEMPT') == '1'
            and env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch'
            and env.get('GITHUB_WORKFLOW_REF') in {
                'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main',
                'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main'}
            and re.fullmatch('[a-f0-9]{40}', env.get('GITHUB_SHA', ''))
            and re.fullmatch('[1-9][0-9]*', env.get('GITHUB_RUN_ID', '')),
            'Qualification session reservee aux workflows officiels main/tentative1')


def runtime_permissions(reference, read):
    account = reference.get('serviceConfig', {}).get('serviceAccountEmail', '')
    require(reference.get('name') == PREFIX+'getCurrentAccessUser' and reference.get('state') == 'ACTIVE'
            and reference.get('environment') == 'GEN_2' and reference.get('buildConfig', {}).get('runtime') == 'nodejs22'
            and reference.get('buildConfig', {}).get('entryPoint') == 'getCurrentAccessUser'
            and re.fullmatch(r'[A-Za-z0-9._-]+@[a-z0-9.-]+[.]gserviceaccount[.]com', account)
            and hashlib.sha256(account.encode()).hexdigest() == RUNTIME, 'Runtime existant different de la reference A3.4a')
    policy = read(IAM, {'options': {'requestedPolicyVersion': 3}})
    bindings = policy.get('bindings', [])
    require(isinstance(bindings, list) and len(bindings) <= 250, 'Politique IAM hors budget')
    roles = sorted({b['role'] for b in bindings if 'serviceAccount:'+account in b.get('members', []) and not b.get('condition')})
    require(len(roles) <= 10 and all(ROLE.fullmatch(role) for role in roles), 'Roles runtime hors budget ou inconnus')
    permissions, observed = set(), {}
    for role in roles:
        metadata = read('https://iam.googleapis.com/v1/'+role+'?fields=includedPermissions')
        values = metadata.get('includedPermissions', [])
        require(isinstance(values, list) and len(values) <= 20000 and all(isinstance(v, str) for v in values),
                'Permissions de role incompletes')
        permissions.update(values); observed[role] = sorted(set(values))
    missing = sorted(REQUIRED-permissions)
    return {'readOnly': True, 'ready': not missing, 'runtimeAccountSha256': RUNTIME,
            'requiredRuntimePermissions': sorted(REQUIRED), 'missingRuntimePermissions': missing,
            'runtimeRolesChecked': len(roles), 'runtimeRolePermissionsSha256': digest(observed),
            'proofMethod': 'existing-unconditional-project-role-grants', 'impersonation': False,
            'sessionReads': 0, 'sessionWrites': 0, 'accountOrRightChanges': 0, 'iamWrites': 0}


def qualify(candidate, kind, reference=None, read=None, identity=None, env=os.environ):
    context(candidate, kind, env)
    common = load('access-revocation-production-policy.py')
    actual_identity = identity if identity is not None else common.reader_identity(kind)
    require(actual_identity == READERS[kind], 'Lecteur existant de session different')
    read = read or common._read
    if kind == 'backend':
        if reference is None:
            state = load('production-release-state.py')
            reference = state.request(state.API+PREFIX+'getCurrentAccessUser?fields=name,state,environment,buildConfig(runtime,entryPoint),serviceConfig(serviceAccountEmail)')
        proof = runtime_permissions(reference, read)
    else:
        # Same bounded reader as A3.3; current active admins only, no legacy lookup.
        proof = common.administrative_prerequisites([], read=read)
        proof['authLookupLimit'] = 2
    return {'schema': 1, 'candidate': CANDIDATE, 'phase': 'prepare-compatible', 'kind': kind,
            'readerIdentitySha256': actual_identity, 'businessInvocations': 0,
            'newPermissions': 0, 'configurationChanges': False, **proof}
