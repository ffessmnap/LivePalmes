"""Read-only qualification and the closed Hosting gate for SB run 45062801612."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import importlib.util
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'ffessmnap/LivePalmes'
PRODUCTION = '.github/workflows/livepalmes-production-release.yml'
READINESS = '.github/workflows/livepalmes-production-readiness.yml'
INITIAL_RUN = 45062801612
CONTRACT = '.github/releases/evidence/20261122-import-sb-hosting-completion-contract.json'
DIGEST = 'a23a15f9ec53372192d64ca453cd7932d0807467773ee621581eadc9623889bf'
MARKER = 'sb-hosting-completion.json'


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = load('import-sb-production-policy.py')
require, digest, read = policy.require, policy.digest, lambda p: json.loads(Path(p).read_text(encoding='utf8'))


def contract():
    raw = (ROOT/CONTRACT).read_bytes().replace(b'\r\n', b'\n')
    require(sha256(raw).hexdigest() == DIGEST, 'Contrat de cloture SB modifie')
    c = json.loads(raw)
    require(c['schema'] == 1 and c['id'] == 'import-sb-hosting-completion-v1'
            and c['initialRun'] == INITIAL_RUN and c['initialContractSha256'] == policy.CONTRACT_SHA256
            and policy.contract()['resumeAllowed'] is False and c['sourceWrites'] == []
            and c['authority'] == policy.contract()['approval']
            and c['explicitHostingModeRequired'] is True, 'Cloture SB hors contrat initial')
    return c


def workflow(path):
    require(os.environ.get('GITHUB_REPOSITORY') == REPO and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1' and os.environ.get('GITHUB_EVENT_NAME') == 'workflow_dispatch'
            and os.environ.get('GITHUB_WORKFLOW_REF') == REPO+'/'+path+'@refs/heads/main',
            'Qualification SB reservee au workflow protege main')


def assert_origin(info, items, job, c):
    require(info['id'] == c['initialRun'] and info['status'] == 'completed' and info['conclusion'] == 'failure'
            and info['run_attempt'] == 1 and info['head_branch'] == 'main' and info['path'] == PRODUCTION
            and info['head_sha'] == c['initialController'] and info['event'] == 'workflow_dispatch', 'Run initial SB incompatible')
    require(len(items) == len(c['initialArtifacts']) and all(not a['expired'] for a in items)
            and {a['name']:{k:a[k] for k in ('id','digest')} for a in items} == c['initialArtifacts'],
            'Artefacts initiaux SB differents ou expires')
    steps = {s['name']:s['conclusion'] for s in job['steps']}
    require(job['id']==c['initialJob'] and job['run_id']==INITIAL_RUN and job['conclusion']=='failure'
            and steps.get('Chiffrer puis tester la sauvegarde')=='success'
            and steps.get('Publier Hosting apres les controles')=='skipped'
            and [s['name'] for s in job['steps'] if s['conclusion']=='failure']==c['failedSteps'],
            'Etat du job initial SB incompatible')


def evidence(root, c):
    request = read(root/'request.json')
    value = policy.manifest(root, request)
    selected = read(root/'selection.json')
    after = read(root/'previous/production-after.json')
    require(value['candidate'] == c['candidate'] and value['testRun'] == c['testRun']
            and value['selected'] == c['alreadyInstalled'] and len(value['origins']) == c['inventoryCount']
            and sorted(selected) == c['alreadyInstalled'] and selected != c['alreadyInstalled']
            and after['candidate'] == c['candidate'] and digest(after) == c['afterStateSha256']
            and after['errors'] == ['Publication des sources non reussie']
            and not (root/'previous/production-hosting-after.json').exists()
            and read(root/'prod-before.json')['hosting'] == c['initialHosting'], 'Plan ou etat initial SB different')
    ctx = read(root/'encrypted/code-backup-context.json')
    link = read(root/f'code-backup-link-{INITIAL_RUN}.json')
    require(sha256((root/'encrypted/prod-backup.enc').read_bytes()).hexdigest()==c['backupCiphertextSha256']
            and ctx['ciphertextSha256']==link['ciphertextSha256']==c['backupCiphertextSha256']
            and ctx['context']['runId']==link['originRun']==link['producerRun']==INITIAL_RUN
            and ctx['context']['candidate']==link['candidate']==c['candidate'] and link['type']=='original'
            and sha256((root/'encrypted/code-backup-context.json').read_bytes()).hexdigest()==link['contextSha256'],
            'Sauvegarde initiale SB hors contrat')
    return value, after


def installed(observed, after, c, state):
    actual = {f['name']:f for f in observed}
    expected = {f['name']:f for f in after['functions']}
    require(len(observed)==len(actual)==len(expected)==c['inventoryCount'] and actual.keys()==expected.keys()
            and all(state.identity(f)==expected[n] and f['state']=='ACTIVE' for n,f in actual.items()),
            'Derive des 119 revisions SB')
    selected = [f for f in observed if f['name'].split('/')[-1] in c['alreadyInstalled']]
    require(len(selected)==len(c['alreadyInstalled']) and all(
        f.get('labels', {}).get('livepalmes-commit')==c['candidate'] for f in selected), 'Labels SB derives')
    for f in selected:
        policy.runtime(f)
    return selected


def archive_proof(after, c):
    state = load('production-release-state.py')
    selected = installed(state.inventory(), after, c, state)
    reader = load('standard-source-publish.py').attest_content
    receipt = load('isolated-publication-inputs.py').source_archive_receipt
    def matches(raw):
        result = receipt(raw)
        return all(result[k]==c['installedArchive'][k] for k in ('files','contentSha256'))
    with ThreadPoolExecutor(max_workers=3) as pool:
        archives = list(pool.map(lambda f: reader(f,state,matches), selected))
    installed(state.inventory(), after, c, state)
    return {a['identity']['name'].split('/')[-1]:a for a in archives}


def hosting_before(cycle, c):
    r = cycle.api('livepalmes','hosting')['releases'][0]
    require({'name':r['name'],'version':r['version']['name'],'message':r.get('message','')}==c['initialHosting'],
            'Hosting a change depuis l arret SB')


def readiness(root, plan_run, kind, cycle, identity, missing):
    workflow(READINESS)
    c = contract()
    require(int(plan_run)==c['preflightRun'] and kind in {'backend','hosting'}, 'Prerequis SB hors plan')
    root.mkdir(parents=True,exist_ok=True)
    endpoint = f'repos/{REPO}/actions/runs/{INITIAL_RUN}'
    info = cycle.gh(endpoint)
    items = cycle.gh(endpoint+'/artifacts?per_page=100')['artifacts']
    assert_origin(info,items,cycle.gh(f'repos/{REPO}/actions/jobs/{c["initialJob"]}'),c)
    proof = {'contractSha256':DIGEST,'initialRun':INITIAL_RUN,'sourceWrites':[],'inventoryCount':119}
    if kind=='backend':
        for artifact,dest in [('release-plan',root),('production-after',root/'previous'),
                              ('production-code-backup',root/'encrypted'),('isolated-production-inputs',root/'isolated')]:
            cycle.artifact(INITIAL_RUN,artifact,dest)
        isolated = load('isolated-publication-inputs.py').validate(read(root/'isolated/production-inputs.json'),c['candidate'])
        require(isolated['sourceArchive']==c['installedArchive'], 'Empreinte de fabrication SB differente')
        _, after = evidence(root,c)
        require(not missing, 'Permissions de lecture des archives SB manquantes')
        proof['archives'] = archive_proof(after,c)
    else:
        hosting_before(cycle,c)
        proof['hostingBefore'] = c['initialHosting']
    cycle.write(root/f'prerequisites-{kind}.json',{'schema':1,'candidate':c['candidate'],'planRun':c['preflightRun'],
        'kind':kind,'identity':identity,'readOnly':True,'ready':not missing,'missingPermissions':missing,'sbHostingCompletion':proof})
    require(not missing, 'Prerequis de cloture SB incomplets')


def require_mode(preparation, resume, opt_in):
    require(preparation=='0' and resume==str(INITIAL_RUN) and opt_in=='true',
            'Complement Hosting SB explicite requis, reprise generique interdite')


def qualify(root, preparation, resume, info, items, cycle):
    workflow(PRODUCTION)
    require_mode(preparation,resume,os.environ.get('SB_HOSTING_COMPLETION'))
    c = contract()
    require_readiness(root,c,cycle)
    assert_origin(info,items,cycle.gh(f'repos/{REPO}/actions/jobs/{c["initialJob"]}'),c)
    evidence(root,c)
    cycle.write(root/'sb-hosting-selection.json',[])
    cycle.write(root/MARKER,{'contractSha256':DIGEST,'initialRun':INITIAL_RUN,'candidate':c['candidate'],
        'sourceWrites':[],'approval':c['authority']})


def require_readiness(root,c,cycle):
    run = os.environ.get('A33_RECOVERY_READINESS_RUN','0')
    require(run.isdigit() and int(run)>0,'Prérequis SB requis')
    for kind in ('backend','hosting'):
        dest=root/('sb-readiness-'+kind)
        info=cycle.artifact(run,'production-prerequisites-'+kind,dest,READINESS)
        require(info['head_sha']==os.environ['GITHUB_SHA'], 'Controleur modifie depuis les prerequis SB')
        v=read(dest/f'prerequisites-{kind}.json');q=v['sbHostingCompletion']
        require(v['ready'] is True and v['readOnly'] is True and v['missingPermissions']==[] and v['kind']==kind
                and v['candidate']==c['candidate'] and v['planRun']==c['preflightRun']
                and q['contractSha256']==DIGEST and q['initialRun']==INITIAL_RUN and q['sourceWrites']==[]
                and q['inventoryCount']==119, 'Prérequis SB hors contrat')
        if kind=='backend':
            require(set(q['archives'])==set(c['alreadyInstalled']) and all(
                f['allPathsAndFileBytesIdentical'] is True and f['generationReadAndReferencesRechecked'] is True
                for f in q['archives'].values()),'Six attestations SB requises')
        else:
            require(q['hostingBefore']==c['initialHosting'], 'Preuve Hosting SB differente')


def verify_resume(root, backup, cycle):
    workflow(PRODUCTION)
    c=contract();v, after=evidence(root,c)
    require(read(root/MARKER)=={'contractSha256':DIGEST,'initialRun':INITIAL_RUN,'candidate':c['candidate'],
            'sourceWrites':[],'approval':c['authority']} and read(root/'sb-hosting-selection.json')==[], 'Cloture SB hors autorisation')
    proof=read(Path(os.environ['RUNNER_TEMP'])/'code-backup-source.json')
    require(proof['chainVerified'] is True and proof['chainLength']==1 and proof['originRun']==proof['sourceRun']==INITIAL_RUN
            and proof['sourceHead']==c['initialController'] and proof['candidate']==c['candidate']
            and proof['ciphertextSha256']==c['backupCiphertextSha256']
            and read(backup/'standard-source-manifest.json')==v, 'Sauvegarde rouverte hors tentative SB')
    policy.state_check(backup,root/'sb-functions-compared.json',True)
    archives=archive_proof(after,c)
    hosting_before(cycle,c)
    cycle.write(root/'sb-hosting-recovery-verified.json',{'contractSha256':DIGEST,'initialRun':INITIAL_RUN,
        'candidate':c['candidate'],'archives':archives,'functions':119,'sourceWrites':[],
        'backupCiphertextSha256':c['backupCiphertextSha256']})


def final(root, backup, destination):
    workflow(PRODUCTION)
    c=contract();v,after=evidence(root,c)
    require(read(root/'sb-hosting-recovery-verified.json')['contractSha256']==DIGEST, 'Attestation pre-Hosting absente')
    policy.state_check(backup,destination,True)
    observed=read(destination)
    require({f['name']:f for f in observed['functions']}=={f['name']:f for f in after['functions']},
            'Derive SB apres publication Hosting')


if __name__ == '__main__':
    import sys
    mode, plan, *args = sys.argv[1:]
    root = Path(plan)
    if mode=='pre-hosting' and not args:
        workflow(PRODUCTION)
        c = contract()
        require(read(root/'sb-hosting-recovery-verified.json')['contractSha256']==DIGEST
                and read(root/'sb-hosting-selection.json')==[], 'Cloture SB non verifiee')
        hosting_before(load('release-cycle.py'),c)
    elif mode=='post-hosting' and len(args)==2:
        final(root,*map(Path,args))
    else:
        raise ValueError('Mode de cloture SB inconnu')
