"""Read-only B capability discovery across every selected installed runtime."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = '689d523b423615cb1faad9f564c1a6b2f44f1b96'
CONTRACT_SHA256 = '0a52fab256bd4f263a9f5e836d3f43eeeffcb0efc280f0f262513ada67711674'
INSTALLED_NAMES_SHA256 = '1898925f520e2b7974229bea1a31bb4df96d7a967d7e7802fa7aa463e452240a'
PREFIX = 'projects/livepalmes/locations/europe-west1/functions/'
READERS = {'backend':'32e5a65af14194d922027c0c9471e5cf8115928b4960ab481a997141f167303a',
           'hosting':'1822d195d739ff1f40ba87acc45028f9e7c4234e57c13eafb253604a7e94cf48'}
READER_PERMISSIONS = {'backend':['resourcemanager.projects.getIamPolicy'],
                      'hosting':['firebaseauth.users.get','datastore.entities.get','datastore.entities.list']}
IAM = 'https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:getIamPolicy?fields=bindings(role,members,condition)'
ROLE = re.compile(r'roles/[A-Za-z0-9_.]+|projects/livepalmes/roles/[A-Za-z0-9_.]+')
BOOTSTRAP_PERMISSIONS = frozenset({'datastore.databases.get','datastore.entities.get',
                                  'datastore.entities.create','datastore.entities.update'})


def require(value, message):
    if not value: raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def load(file):
    spec=importlib.util.spec_from_file_location('session_b_caps_'+file.replace('-','_'),ROOT/'tools'/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


def selected():
    raw=(ROOT/'.github/releases/evidence/20261117-test-portal-session-enforcement-contract.json').read_bytes().replace(b'\r\n',b'\n')
    require(hashlib.sha256(raw).hexdigest()==CONTRACT_SHA256,'Contrat de consommateurs B modifie')
    value=json.loads(raw);names=value['allowedFunctions']
    require(len(names)==102 and names==sorted(set(names)) and value['guardedCallableCount']==121,'Consommateurs B incomplets')
    return names


def context(candidate,kind,env):
    require(candidate==CANDIDATE and kind in READERS,'Qualification fermee a A3.4a B')
    require(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
        and env.get('GITHUB_RUN_ATTEMPT')=='1' and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch'
        and env.get('GITHUB_WORKFLOW_REF') in {
            'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main',
            'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main'}
        and re.fullmatch('[a-f0-9]{40}',env.get('GITHUB_SHA',''))
        and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')),'Workflow main/tentative1 B requis')


def runtime_permissions(functions,read):
    names=[f.get('name','').removeprefix(PREFIX) for f in functions]
    require(len(names)==119 and len(set(names))==119 and digest(sorted(names))==INSTALLED_NAMES_SHA256
        and all(f.get('name')==PREFIX+n and f.get('state')=='ACTIVE' for f,n in zip(functions,names)),
        'Inventaire PROD B inconnu ou incomplet')
    targets=set(selected());accounts={};runtime_bindings={}
    for f,n in zip(functions,names):
        if n not in targets:continue
        account=f.get('serviceConfig',{}).get('serviceAccountEmail','')
        require(f.get('environment')=='GEN_2' and f.get('buildConfig',{}).get('runtime')=='nodejs22'
            and f['buildConfig'].get('entryPoint')==n
            and re.fullmatch(r'[A-Za-z0-9._-]+@[a-z0-9.-]+[.]gserviceaccount[.]com',account),'Runtime B non qualifiable : '+n)
        accounts.setdefault(account,set()).add(n);runtime_bindings[n]=hashlib.sha256(account.encode()).hexdigest()
    require(set(runtime_bindings)==targets and 0<len(accounts)<=10,'Runtimes B hors budget')
    policy=read(IAM,{'options':{'requestedPolicyVersion':3}});bindings=policy.get('bindings',[])
    require(isinstance(bindings,list) and len(bindings)<=250,'Politique IAM B hors budget')
    grants={account:sorted({b['role'] for b in bindings if 'serviceAccount:'+account in b.get('members',[])
                           and not b.get('condition')}) for account in accounts}
    roles=sorted({r for group in grants.values() for r in group})
    require(len(roles)<=10 and all(ROLE.fullmatch(r) for r in roles),'Roles B inconnus ou hors budget')
    observed={}
    for role in roles:
        values=read('https://iam.googleapis.com/v1/'+role+'?fields=includedPermissions').get('includedPermissions',[])
        require(isinstance(values,list) and len(values)<=20000 and all(isinstance(v,str) for v in values),'Role B incomplet')
        observed[role]=sorted(set(values))
    proofs=[];missing=[]
    for account,names in accounts.items():
        required=BOOTSTRAP_PERMISSIONS if 'getCurrentAccessUser' in names else {'datastore.entities.get'}
        permissions={v for role in grants[account] for v in observed[role]};absent=sorted(required-permissions)
        key=hashlib.sha256(account.encode()).hexdigest();missing.extend(key+':'+p for p in absent)
        proofs.append({'accountSha256':key,'selectedFunctions':sorted(names),'rolesSha256':digest(grants[account]),
                       'requiredPermissions':sorted(required),'missingPermissions':absent})
    return {'readOnly':True,'ready':not missing,'inventoryCount':119,'selectedCount':102,'retainedCount':17,
        'selected':sorted(targets),'runtimeAccountCount':len(accounts),'runtimeAccounts':sorted(proofs,key=lambda v:v['accountSha256']),
        'runtimeBindingsSha256':digest(runtime_bindings),'missingRuntimePermissions':sorted(missing),
        'runtimeRolesChecked':len(roles),'roleDefinitionReadsSucceeded':len(roles),
        'runtimeRolePermissionsSha256':digest(observed),'rolePermissionScope':'exact-role-resource',
        'proofMethod':'existing-unconditional-project-role-grants','impersonation':False,
        'sessionReads':0,'sessionWrites':0,'accountOrRightChanges':0,'iamWrites':0}


def qualify(candidate,kind,references=None,read=None,identity=None,env=os.environ):
    context(candidate,kind,env);common=load('access-revocation-production-policy.py')
    actual=identity if identity is not None else common.reader_identity(kind)
    require(actual==READERS[kind],'Lecteur B different de l identite existante');read=read or common._read
    if kind=='backend':
        if references is None:references=load('production-release-state.py').inventory()
        proof=runtime_permissions(references,read)
    else:
        proof=common.administrative_prerequisites([],read=read);proof['authLookupLimit']=2
    return {'schema':1,'candidate':CANDIDATE,'phase':'enforce-portal-session','kind':kind,
        'readerIdentitySha256':actual,'businessInvocations':0,'newPermissions':0,'configurationChanges':False,**proof}
