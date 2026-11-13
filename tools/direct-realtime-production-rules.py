"""One closed PROD Direct rules addition; no database or IAM mutation API."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes'
NUMBER = '718081132564'
BASE = 'https://firebaserules.googleapis.com/v1/'
RELEASE = 'projects/livepalmes/releases/cloud.firestore'
RULESET = re.compile(r'projects/(?:livepalmes|718081132564)/rulesets/[A-Za-z0-9_-]+\Z')
PERMISSIONS = ['firebaserules.releases.get','firebaserules.releases.update',
               'firebaserules.rulesets.get','firebaserules.rulesets.create']


def require(value, message):
    if not value:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(value.replace('\r\n','\n').encode()).hexdigest()


def load_policy():
    spec = importlib.util.spec_from_file_location('closed_direct_realtime_rules_parent', ROOT/'tools/direct-realtime-production-policy.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def sources(c):
    r = c['rules']
    require(r['beforeFile'] == '.github/releases/evidence/20261113-direct-realtime-production-before.rules'
            and r['afterFile'] == '.github/releases/evidence/20261113-direct-realtime-production-after.rules',
            'Chemins des regles fermees differents')
    before,after = [(ROOT/r[k]).read_text(encoding='utf-8').replace('\r\n','\n') for k in ['beforeFile','afterFile']]
    require(digest(before) == r['beforeSha256'] == '21dba28a68feec4d0164d82cc5aec60395b30e3f9ef32fa2193ec0659e4f58dc'
            and digest(after) == r['afterSha256'] == '15941b6755d44cc106f81c33616025e630747a785bd92fb730149113a2113ff1',
            'Sources PROD fermees modifiees')
    marker = '    // NAP authorizes short-lived membership server-side.'
    start = after.index(marker); end = after.index('    match /{document=**}',start)
    block = after[start:end]
    require(len(block.splitlines()) == 10 and after[:start]+after[end:] == before
            and 'livepalmesDirectSignals' not in before and block.count('livepalmesDirectSignals') == 2,
            'Seul le match prive exact peut etre ajoute')
    return before,after,block


def validate_contract(c, git=None):
    before,after,block = sources(c)
    require(c['rules']['testBeforeSha256'] == 'c08143b2e616943508a84fdbcdc4ae677db736bb75b6ff7ff06b940b1074353d'
            and c['rules']['testAfterSha256'] == '435cec310d319499827c1f34a7758cb9c775daeedda7bc5d811017e85fda05c4'
            and c['rules']['project'] == PROJECT and c['rules']['addedLines'] == 10,
            'Regles privees hors perimetre')
    if git:
        old = git('show',c['productionCommit']+':firestore.rules')+'\n'
        new = git('show',c['candidate']+':firestore.rules')+'\n'
        require(digest(old) == c['rules']['testBeforeSha256'] and digest(new) == c['rules']['testAfterSha256']
                and new.replace(block,'',1) == old,
                'Delta TEST du signal incompatible avec la derivation PROD')
    return {'beforeSha256':digest(before),'afterSha256':digest(after),'addedLines':10,
            'allOtherRulesUnchanged':True,'testSessionRestrictionPublished':False}


def verify_test_evidence(plan, cycle=None):
    c = load_policy().contract(); validate_contract(c)
    if cycle is None:
        cycle = load_policy().load('direct_realtime_rules_test_cycle','release-cycle.py')
    rows = [(c['rules']['testSignalsRun'], 'direct-realtime-rules-proof',
             c['rules']['testSignalsArtifact'], c['rules']['testSignalsArtifactSha256'],
             'test-direct-realtime-rules-proof.json', 'ada6005cd5bbb62637f8b5a1fdc2c509fb9247d8'),
            (c['testRun'], 'portal-session-rules-proof', c['rules']['testReadonlyArtifact'],
             c['rules']['testReadonlyArtifactSha256'], 'test-portal-session-rules-proof.json', c['candidate'])]
    proofs = []
    for run, name, artifact_id, sha, filename, head in rows:
        directory = Path(plan)/('direct-realtime-test-'+str(run))
        info = cycle.artifact(run,name,directory,'.github/workflows/livepalmes-test-common.yml')
        metadata = cycle.gh('repos/ffessmnap/LivePalmes/actions/artifacts/'+str(artifact_id))
        require(info['head_sha'] == head and metadata['id'] == artifact_id
                and metadata['name'] == name and metadata['workflow_run']['id'] == run
                and metadata['digest'] == 'sha256:'+sha and metadata['expired'] is False,
                'Artefact Rules TEST hors contrat immuable')
        proof = cycle.read(directory/filename)
        require(proof['schema'] == 1 and proof['project'] == 'livepalmes-test'
                and proof['candidate'] == head and proof['indexesDeployed'] is False
                and proof['productionTouched'] is False and proof['businessInvocations'] == 0
                and proof['after']['sha256'] == c['rules']['testAfterSha256'],
                'Preuve Rules TEST incompatible')
        proofs.append(proof)
    require(proofs[0]['deployed'] is True
            and proofs[0]['approval'] == '20261113-direct-private-realtime-test'
            and proofs[0]['before']['sha256'] == c['rules']['testBeforeSha256']
            and proofs[1]['readOnly'] is True and proofs[1]['deployed'] is False
            and proofs[0]['after'] == proofs[1]['after'], 'Signal TEST non atteste au candidat mobile')
    return {'schema':1,'candidate':c['candidate'],'testRulesSha256':c['rules']['testAfterSha256'],
            'artifactIds':[r[2] for r in rows],'result':'success','noTestDeployment':True,
            'productionDerivation':validate_contract(c)}


def context(plan, mode):
    parent = load_policy(); request = json.loads((Path(plan)/'request.json').read_text())
    require(parent.approved(request), 'Regles sans contrat PROD ferme')
    c = parent.contract(); validate_contract(c)
    filename = 'livepalmes-production-readiness.yml' if mode == 'readiness' else 'livepalmes-production-release.yml'
    require(os.environ.get('GITHUB_REPOSITORY') == 'ffessmnap/LivePalmes'
            and os.environ.get('GITHUB_REF') == 'refs/heads/main'
            and os.environ.get('GITHUB_RUN_ATTEMPT') == '1'
            and os.environ.get('GITHUB_WORKFLOW_REF') == 'ffessmnap/LivePalmes/.github/workflows/'+filename+'@refs/heads/main',
            'Regles reservees au workflow officiel main')
    credentials = json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    identity = credentials.get('client_email','')
    require(credentials.get('type') == 'service_account' and credentials.get('project_id') == PROJECT
            and identity.endswith('@livepalmes.iam.gserviceaccount.com'),
            'Identite officielle PROD requise, aucune identite interactive')
    token = subprocess.check_output(['gcloud','auth','print-access-token'],text=True,stderr=subprocess.DEVNULL).strip()
    require(token and '\n' not in token, 'Jeton officiel absent')
    return c,token,hashlib.sha256(identity.encode()).hexdigest()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirection Rules interdite')


def api(path, token, method='GET', body=None, *, write=False, c=None):
    allowed = method == 'GET' and body is None and (path == RELEASE or RULESET.fullmatch(path))
    if write:
        require(c is not None, 'Ecriture sans contrat')
        _,after,_ = sources(c)
        if method == 'POST' and path == 'projects/livepalmes/rulesets':
            allowed = body == {'source':{'files':[{'name':'firestore.rules','content':after}]}}
        elif method == 'PATCH' and path == RELEASE:
            value = body.get('release',{}) if isinstance(body,dict) else {}
            allowed = (set(body) == {'release'} and set(value) == {'name','rulesetName'}
                       and value['name'] == RELEASE and RULESET.fullmatch(str(value['rulesetName'])))
    require(allowed, 'Appel Rules hors projet, source ou masque autorise')
    request = urllib.request.Request(BASE+path,method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request,timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError('API Rules officielle refusee : HTTP '+str(error.code)) from None


def snapshot(token):
    release = api(RELEASE,token); ruleset = release.get('rulesetName','')
    require(RULESET.fullmatch(ruleset) and release.get('name') in {RELEASE,'projects/'+NUMBER+'/releases/cloud.firestore'},
            'Release Rules hors PROD')
    files = api(ruleset,token).get('source',{}).get('files',[])
    require(len(files) == 1 and files[0].get('name') == 'firestore.rules'
            and isinstance(files[0].get('content'),str), 'Source Rules inconnue')
    text = files[0]['content'].replace('\r\n','\n')
    return {'releaseName':release['name'],'rulesetName':ruleset,'sha256':digest(text),
            'updateTime':release.get('updateTime')},text


def readiness(plan):
    c,token,identity = context(plan,'readiness'); before,text = snapshot(token)
    require(before['sha256'] == c['rules']['beforeSha256'] and text == sources(c)[0],
            'Base reelle Rules PROD differente du contrat : arret')
    return {'schema':1,'project':PROJECT,'readOnly':True,'candidate':c['candidate'],
            'identitySha256':identity,'before':before,'expectedAfterSha256':c['rules']['afterSha256'],
            'addedLines':10,'allOtherRulesUnchanged':True,'testSessionRestrictionPublished':False}


def backup(plan, backup, readiness_run, cycle):
    plan,backup = Path(plan),Path(backup); c,token,identity = context(plan,'backup')
    require(str(readiness_run).isdigit() and int(readiness_run)>0, 'Preuve officielle des prerequis Rules requise')
    destination = plan/'direct-realtime-prerequisites'
    info = cycle.artifact(readiness_run,'production-prerequisites-hosting',destination,
                          '.github/workflows/livepalmes-production-readiness.yml')
    proof = cycle.read(destination/'prerequisites-hosting.json')
    require(proof['ready'] is True and proof['missingPermissions'] == [] and proof['readOnly'] is True
            and proof['planRun'] == int(os.environ['PREPARATION_RUN']) and proof['candidate'] == c['candidate']
            and info['head_sha'] == os.environ['GITHUB_SHA'], 'Prerequis Rules hors plan ou outillage')
    expected = proof['directRealtimeRules']
    require(expected['identitySha256'] == identity and expected['expectedAfterSha256'] == c['rules']['afterSha256'],
            'Identite officielle Rules differente des prerequis')
    current,text = snapshot(token)
    require(current == expected['before'] and text == sources(c)[0], 'Derive Rules depuis les prerequis')
    report = cycle.read(backup/'report.json')
    require(report['candidate'] == c['candidate'] and report['additionalDirectRealtimeFunctions'] == c['selected']
            and report['newFunctions'] == [], 'Sauvegarde Rules hors candidat')
    rules = backup/'direct-realtime-rules'; require(not rules.exists(), 'Sauvegarde Rules initiale deja presente')
    rules.mkdir(); (rules/'before.rules').write_text(text,encoding='utf-8',newline='\n')
    witness = {'schema':1,'candidate':c['candidate'],'identitySha256':identity,'before':current,
               'afterSha256':c['rules']['afterSha256'],'readinessRun':int(readiness_run)}
    (rules/'before.json').write_text(json.dumps(witness,indent=2),encoding='utf-8')
    (plan/'direct-realtime-rules-before.json').write_text(json.dumps(witness,indent=2),encoding='utf-8')


def publish(plan, backup, receipt):
    plan,backup,receipt = Path(plan),Path(backup),Path(receipt); c,token,identity = context(plan,'publish')
    require(os.environ.get('RULES_BACKUP_VERIFIED') == 'true' and Path(os.environ['ENCRYPTED_BACKUP_FILE']).is_file(),
            'Sauvegarde chiffree rouverte/comparee requise avant Rules')
    witness = json.loads((backup/'direct-realtime-rules/before.json').read_text())
    original = (backup/'direct-realtime-rules/before.rules').read_text(encoding='utf-8')
    require(witness == json.loads((plan/'direct-realtime-rules-before.json').read_text())
            and witness['candidate'] == c['candidate'] and witness['identitySha256'] == identity
            and original == sources(c)[0] and digest(original) == witness['before']['sha256'],
            'Sauvegarde initiale Rules incompatible')
    before,_ = snapshot(token); require(before == witness['before'], 'Derive Rules avant toute ecriture')
    result = {'schema':1,'candidate':c['candidate'],'project':PROJECT,'before':before,
              'expectedAfterSha256':c['rules']['afterSha256'],'indexesDeployed':False,
              'businessInvocations':0,'sourceValidated':True,'result':'failure'}
    try:
        _,after,_ = sources(c)
        created = api('projects/livepalmes/rulesets',token,'POST',
                      {'source':{'files':[{'name':'firestore.rules','content':after}]}},write=True,c=c)
        name = created.get('name',''); require(RULESET.fullmatch(name) and name != before['rulesetName'], 'Ruleset cree inconnu')
        result['createdRuleset'] = name
        files = api(name,token).get('source',{}).get('files',[])
        require(len(files)==1 and files[0].get('name')=='firestore.rules' and files[0].get('content')==after,
                'Ruleset compile different de la source autorisee')
        current,_ = snapshot(token); require(current == before, 'Derive Rules avant PATCH')
        api(RELEASE,token,'PATCH',{'release':{'name':RELEASE,'rulesetName':name}},write=True,c=c)
        current,text = snapshot(token)
        require(current['rulesetName'] == name and current['sha256'] == c['rules']['afterSha256'] and text == after,
                'Publication Rules non attestee')
        result.update(after=current,result='success',addedLines=10,allOtherRulesUnchanged=True,
                      testSessionRestrictionPublished=False)
        (plan/'direct-realtime-rules-published.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    finally:
        receipt.write_text(json.dumps(result,indent=2),encoding='utf-8')


def final(plan, receipt):
    plan,receipt = Path(plan),Path(receipt); c,token,_ = context(plan,'final')
    published = json.loads((plan/'direct-realtime-rules-published.json').read_text())
    current,text = snapshot(token)
    require(published['result']=='success' and published['candidate']==c['candidate']
            and current == published['after'] and text == sources(c)[1], 'Derive Rules apres Hosting')
    receipt.write_text(json.dumps({'schema':1,'candidate':c['candidate'],'project':PROJECT,
                       'after':current,'readOnly':True,'result':'success','indexesDeployed':False,
                       'businessInvocations':0},indent=2),encoding='utf-8')


def main():
    mode,plan,*args = sys.argv[1:]
    parent = load_policy(); request = json.loads((Path(plan)/'request.json').read_text())
    if not parent.approved(request):
        return
    if mode == 'backup':
        cycle = parent.load('direct_realtime_rules_cycle','release-cycle.py'); backup(plan,*args,cycle)
    elif mode == 'publish':
        publish(plan,*args)
    elif mode == 'final':
        final(plan,*args)
    else:
        raise ValueError('Mode Rules inconnu')


if __name__ == '__main__':
    main()
