"""Closed read-only discovery for optional current-access guards and App Check."""
import hashlib,importlib.util,os,re,subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CANDIDATE='b0000e8763e9f11b4c21077dbb80012a442d58aa'
SOURCE_ANCHOR='50acd7ab0860c4d0b716022e3ad7d373c5dac359'
FUNCTIONS_TREE='3734faac09c271875755523ede61e27877368bfa'
INSTALLED_NAMES_SHA256='1898925f520e2b7974229bea1a31bb4df96d7a967d7e7802fa7aa463e452240a'
READERS={'backend':'32e5a65af14194d922027c0c9471e5cf8115928b4960ab481a997141f167303a',
         'hosting':'1822d195d739ff1f40ba87acc45028f9e7c4234e57c13eafb253604a7e94cf48'}
READER_PERMISSIONS={'backend':['resourcemanager.projects.getIamPolicy'],
                    'hosting':['firebaseauth.users.get','datastore.entities.get','datastore.entities.list']}
QUALIFICATION={'verifierFile':'tools/admin-mfa-selection-proof.js','verifierSha256':'aacfa3826f3ae399f53c0faf0cfd0f0355478209d14a897b39e3a4e1f28a04d4',
 'evidenceFile':'.github/releases/evidence/20261118-optional-access-production-equivalence.json','evidenceSha256':'203b423307cf1502f140143f1b67594d44525e209a9877e3e3ebaf055bc16fa9'}
ENGINES={'tools/release-function-fingerprints.js':'fc708972b8aa31d905321c6445695285405d0c3399da4adc34376d60f012ef10',
 'tools/release-test-function-fingerprints.js':'a49d29d7b0cc0110243ba7a41bd2e6bf194d044c12683d3c2df2628481b72e2e',
 'tools/release-production-function-fingerprints.js':'f3db20a5ae8b8315661995ecbb43223b1a5f4b75d5bed1c76b066f641d4c7274',
 'tools/backend-factory-model.js':'e704205e8c442a8649d93e7d020981bd4fdf28b13986cf12ad3ef92708bedf13',
 'tools/history-source-provenance.py':'dffd1d5fc3b1e273ed58048c32cfb7bd28ccaeea40034d358aff2f5789ef7523',
 'tests/helpers/lexical-references.js':'22f52b6c4bd667c563515ced973551add5d994bebd137339fa754874915b02f2'}

def require(value,message):
    if not value:raise ValueError(message)

def load(name):
    spec=importlib.util.spec_from_file_location('optional_access_'+name.replace('-','_'),ROOT/'tools'/name)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()

def validate_local(candidate):
    require(candidate==CANDIDATE,'Decouverte facultative hors candidat ferme')
    git('merge-base','--is-ancestor',CANDIDATE,'HEAD')
    require(git('rev-parse',CANDIDATE+':functions')==FUNCTIONS_TREE==git('rev-parse',SOURCE_ANCHOR+':functions'),
            'Sources facultatives differentes de TEST')
    for file_key,hash_key in [('verifierFile','verifierSha256'),('evidenceFile','evidenceSha256')]:
        require(hashlib.sha256((ROOT/QUALIFICATION[file_key]).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==QUALIFICATION[hash_key],
                'Preuve/verificateur facultatif altere')
    for name,expected in ENGINES.items():
        require(hashlib.sha256((ROOT/name).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==expected,
                'Moteur de selection facultative modifie')

def context(candidate,kind,env):
    require(kind in READERS and env.get('GITHUB_REPOSITORY')=='ffessmnap/LivePalmes'
        and env.get('GITHUB_REF')=='refs/heads/main' and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch'
        and env.get('GITHUB_RUN_ATTEMPT')=='1'
        and env.get('GITHUB_WORKFLOW_REF')=='ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'
        and re.fullmatch('[a-f0-9]{40}',env.get('GITHUB_SHA',''))
        and re.fullmatch('[1-9][0-9]*',env.get('GITHUB_RUN_ID','')),'Diagnostic facultatif manuel main/tentative1 requis')
    validate_local(candidate)

def source_selection(functions):
    source=load('publish-test-admin-mfa-sources.py');cycle=source.cycle
    minimal=[{'name':f['name'],'state':f['state'],'updateTime':f['updateTime'],
        'revision':f.get('revision',f.get('serviceConfig',{}).get('revision')),
        'commit':f.get('commit',f.get('labels',{}).get('livepalmes-commit'))} for f in functions]
    names=sorted(f['name'].removeprefix('projects/livepalmes/locations/europe-west1/functions/') for f in minimal)
    digest=load('standard-source-policy.py').digest
    require(len(names)==119 and digest(names)==INSTALLED_NAMES_SHA256,'Inventaire facultatif incomplet')
    rows=source.qualify_selection({'applicationAnchor':SOURCE_ANCHOR,'selectionQualification':QUALIFICATION},
        minimal,CANDIDATE,'livepalmes',cycle.production_selection_fingerprints,cycle.backend_fingerprints)
    selected=sorted(r['shortName'] for r in rows if r['changed'])
    require(len(selected)==110,'Selection complete facultative differente, aucun choix manuel')
    return {'selected':selected,'rows':rows,'inventoryCount':119,'retainedCount':9,
        'sourceAnchor':SOURCE_ANCHOR,'selectionQualification':QUALIFICATION,
        'networkCalls':0,'applicationModulesExecuted':False}

def runtime_permissions(functions,read,selected):
    require(len(selected)==110 and selected==sorted(set(selected)),'Couverture runtime facultative incomplete')
    shared=load('portal-session-enforcement-capabilities.py')
    # A separate module instance preserves the historical B controller on disk.
    shared.selected=lambda:list(selected);shared.INSTALLED_NAMES_SHA256=INSTALLED_NAMES_SHA256
    result=shared.runtime_permissions(functions,read)
    require(result['selected']==selected,'Runtimes facultatifs non concordants')
    return {**result,'selectedCount':110,'retainedCount':9}

def discover(candidate,kind,references=None,read=None,identity=None,env=os.environ):
    context(candidate,kind,env)
    reader=load('access-revocation-production-policy.py')
    actual=identity if identity is not None else reader.reader_identity(kind)
    require(actual==READERS[kind],'Identite existante facultative differente')
    read=read or reader._read
    if kind=='backend':
        functions=references if references is not None else load('production-release-state.py').inventory()
        selection=source_selection(functions)
        proof={**runtime_permissions(functions,read,selection['selected']),'sourceSelection':selection}
    else:
        proof=reader.administrative_prerequisites([],read=read)
        proof.update(authLookupLimit=2,factorMetadataRead=False,signInInvoked=False)
    return {'schema':1,'candidate':candidate,'phase':'optional-current-access-and-app-check-observation','kind':kind,
        'readerIdentitySha256':actual,'businessInvocations':0,'newPermissions':0,'configurationChanges':False,
        'mandatoryMfa':False,'rulesWrites':0,'publicationAllowed':False,**proof}
