"""Bounded MFA runtime/profile continuity reads; no grants, factors or sign-in."""
import hashlib
import importlib.util
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DISCOVERY_CANDIDATE = 'de49a1bae71156c5e0d1fd91a0991dd786290137'
READERS = {'backend':'32e5a65af14194d922027c0c9471e5cf8115928b4960ab481a997141f167303a',
           'hosting':'1822d195d739ff1f40ba87acc45028f9e7c4234e57c13eafb253604a7e94cf48'}
READER_PERMISSIONS = {'backend':['resourcemanager.projects.getIamPolicy'],
                      'hosting':['firebaseauth.users.get','datastore.entities.get','datastore.entities.list']}


def require(value,message):
    if not value:raise ValueError(message)


def load(name):
    spec=importlib.util.spec_from_file_location('admin_mfa_caps_'+name.replace('-','_'),ROOT/'tools'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module


def context(candidate,kind,env):
    policy=load('admin-mfa-production-policy.py');c=policy.contract()
    require(candidate==c['candidate'] and kind in READERS,'Capacites MFA hors contrat')
    require(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
        and env.get('GITHUB_RUN_ATTEMPT')=='1' and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch'
        and env.get('GITHUB_WORKFLOW_REF') in {
            'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main',
            'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main'}
        and re.fullmatch('[a-f0-9]{40}',env.get('GITHUB_SHA',''))
        and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')),'Workflow officiel MFA main/tentative1 requis')
    return c


def runtime_permissions(functions,read,selection=None,installed_names_sha256=None):
    policy=load('admin-mfa-production-policy.py')
    c=policy.contract() if selection is None else {'selected':selection,'installedNamesSha256':installed_names_sha256}
    # Isolated primitive instance; historical controllers remain unchanged on disk.
    shared=load('portal-session-enforcement-capabilities.py')
    shared.selected=lambda:list(c['selected'])
    names=sorted(f['name'].removeprefix(policy.PREFIX) for f in functions)
    require(len(names)==119 and len(set(names))==119
            and policy.digest(names)==c['installedNamesSha256'],'Inventaire runtime MFA different')
    shared.INSTALLED_NAMES_SHA256=c['installedNamesSha256']
    result=shared.runtime_permissions(functions,read)
    require(result['selected']==c['selected'],'Couverture runtime MFA incomplete')
    result['selectedCount']=len(c['selected']);result['retainedCount']=119-len(c['selected'])
    return result


def qualify(candidate,kind,references=None,read=None,identity=None,env=os.environ):
    context(candidate,kind,env);reader=load('access-revocation-production-policy.py')
    actual=identity if identity is not None else reader.reader_identity(kind)
    require(actual==READERS[kind],'Identite MFA differente de la reference existante');read=read or reader._read
    if kind=='backend':
        if references is None:references=load('production-release-state.py').inventory()
        proof=runtime_permissions(references,read)
    else:
        proof=reader.administrative_prerequisites([],read=read);proof['authLookupLimit']=2
        proof['factorMetadataRead']=False;proof['signInInvoked']=False
    return {'schema':1,'candidate':candidate,'phase':'enforce-admin-full-mfa','kind':kind,
        'readerIdentitySha256':actual,'businessInvocations':0,'newPermissions':0,'configurationChanges':False,**proof}


def discover(candidate,kind,references=None,read=None,identity=None,env=os.environ):
    """Read the new candidate's capabilities BEFORE sealing its PROD contract."""
    source=load('publish-test-admin-mfa-sources.py');entry=source.contract()
    require(entry['applicationCommit']=='02454e82658278b4e3450ad229e65147b4372711'
            and candidate == DISCOVERY_CANDIDATE and kind in READERS,
            'Diagnostic MFA ferme au candidat issu de l ancre TEST approuvee')
    source.cycle.git('merge-base','--is-ancestor',entry['applicationCommit'],candidate)
    changed=source.cycle.git('diff','--name-only','--no-renames',entry['applicationCommit'],candidate).splitlines()
    require(set(changed)<=set(entry['toolingPaths']),'Autre code applicatif dans le diagnostic MFA')
    require(env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes' and env.get('GITHUB_REF')=='refs/heads/main'
        and env.get('GITHUB_RUN_ATTEMPT')=='1' and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch'
        and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main',
            'Diagnostic MFA officiel en lecture seule requis')
    reader=load('access-revocation-production-policy.py')
    actual=identity if identity is not None else reader.reader_identity(kind)
    require(actual==READERS[kind],'Identite du diagnostic MFA inattendue');read=read or reader._read
    if kind=='backend':
        if references is None:references=load('production-release-state.py').inventory()
        q={**entry['selectionQualification'],
           'evidenceFile':'.github/releases/evidence/20261118-admin-mfa-production-equivalence.json',
           'evidenceSha256':'37c1da9194dce2ff4f35a81b478efbca62e1a454d595e3a901610c06c5ea5e36'}
        minimal={'applicationAnchor':entry['applicationCommit'],'selectionQualification':q}
        rows=source.qualify_selection(minimal,references,candidate,'livepalmes',
             source.cycle.production_selection_fingerprints,source.cycle.backend_fingerprints)
        selected=[r['shortName'] for r in rows if r['changed']]
        require(len(selected)==110,'Selection du diagnostic MFA differente, aucun choix manuel')
        names=sorted(r['shortName'] for r in rows)
        proof=runtime_permissions(references,read,selected,source.cycle.standard_sources.digest(names))
    else:
        proof=reader.administrative_prerequisites([],read=read);proof['authLookupLimit']=2
        proof['factorMetadataRead']=False;proof['signInInvoked']=False
    return {'schema':1,'candidate':candidate,'phase':'enforce-admin-full-mfa','kind':kind,
        'readerIdentitySha256':actual,'businessInvocations':0,'newPermissions':0,'configurationChanges':False,**proof}
