"""Prepare a one-permission, two-hour IAM delta. No cloud writer exists here."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'livepalmes'
PERMISSION = 'cloudscheduler.jobs.update'
MEMBER = 'serviceAccount:github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com'
ROLE = 'projects/livepalmes/roles/livepalmesSchedulerUpdate'
ROLE_URL = 'https://iam.googleapis.com/v1/'+ROLE
POLICY_URL = 'https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:getIamPolicy'
TEST_URL = 'https://cloudresourcemanager.googleapis.com/v1/projects/livepalmes:testIamPermissions'
ROLE_BODY = {'title':'LivePalmes Scheduler update','description':'Only Scheduler job update; bind temporarily to the backend CI identity.',
             'includedPermissions':[PERMISSION],'stage':'GA'}

def require(value, message):
    if not value: raise ValueError(message)

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()

def proposal(policy, role, now):
    require(now.tzinfo is not None, 'Horloge UTC requise')
    require(policy.get('version') == 3 and isinstance(policy.get('etag'),str) and bool(policy['etag'])
        and isinstance(policy.get('bindings',[]),list), 'Politique IAM version3 et etag requis')
    if role is not None:
        require(role.get('name') == ROLE and not role.get('deleted') and role.get('stage') == 'GA'
            and role.get('includedPermissions') == [PERMISSION], 'Role existant plus large ou incompatible : arret')
    for binding in policy.get('bindings',[]):
        require(not (binding.get('role') == ROLE and MEMBER in binding.get('members',[])),
            'Attribution existante a examiner, aucune extension automatique')
    start = now.astimezone(timezone.utc).replace(microsecond=0)
    end = start+timedelta(hours=2)
    iso = lambda d:d.isoformat().replace('+00:00','Z')
    condition = {'title':'livepalmes-publication-scheduler-2h',
        'description':'Temporary job update permission; no automatic renewal.',
        'expression':'request.time >= timestamp("'+iso(start)+'") && request.time < timestamp("'+iso(end)+'")'}
    return {'schema':1,'readOnlyPreparation':True,'project':PROJECT,'member':MEMBER,'role':ROLE,
        'roleDefinition':copy.deepcopy(ROLE_BODY),'roleCreationRequired':role is None,
        'bindingToAdd':{'role':ROLE,'members':[MEMBER],'condition':condition},
        'policyBeforeSha256':digest(policy),'policyEtag':policy['etag'],
        'validFrom':iso(start),'expiresAt':iso(end),'maximumDurationSeconds':7200,
        'iamScope':'all Cloud Scheduler jobs of project livepalmes',
        'iamFieldRestriction':False,'iamSingleJobRestriction':False,
        'publisherRestriction':'only firebase-schedule-closeDueEngagementCompetitions-europe-west1, updateMask=schedule',
        'backupAndFreshEtagRequiredBeforeApply':True,'noOtherBindingsChanged':True,
        'automaticRenewal':False,'applyAuthorized':False,'cloudWrites':0}

def read(url, token, body=None):
    allowed = {ROLE_URL:None,POLICY_URL:{'options':{'requestedPolicyVersion':3}},TEST_URL:{'permissions':[PERMISSION]}}
    require(url in allowed and body == allowed[url], 'Operation IAM hors lecture autorisee')
    request = urllib.request.Request(url, method='GET' if body is None else 'POST',
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=30) as response:return json.load(response)
    except urllib.error.HTTPError as error:
        if url == ROLE_URL and error.code == 404:return None
        raise

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value

def main(directory, plan_run):
    require(os.environ.get('GITHUB_REF') == 'refs/heads/main' and os.environ.get('GITHUB_RUN_ATTEMPT') == '1', 'Main/tentative1 requis')
    credentials=json.loads(Path(os.environ['GOOGLE_APPLICATION_CREDENTIALS']).read_text())
    require(credentials.get('project_id') == PROJECT and 'serviceAccount:'+credentials.get('client_email','') == MEMBER,
        'Identite CI backend attendue requise')
    cycle=module('scheduler_iam_cycle','release-cycle.py'); guard=module('scheduler_iam_guard','check-production-bcc.py')
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    cycle.artifact(plan_run,'release-plan',directory/'.plan','.github/workflows/livepalmes-production-preflight.yml')
    request=cycle.read(directory/'.plan/request.json');scope=cycle.bcc.for_request(request)
    require(scope.contract().get('limitedOct27') and scope.approved(request), 'Plan ferme27octobre requis')
    cycle.compare_prod(directory/'.plan')
    guard.main('initial',directory/'.plan')
    token=subprocess.check_output(['gcloud','auth','application-default','print-access-token'],text=True,stderr=subprocess.DEVNULL).strip()
    policy=read(POLICY_URL,token,{'options':{'requestedPolicyVersion':3}})
    role=read(ROLE_URL,token)
    # Some policies have no conditions yet: ask v3 explicitly and retain the
    # complete returned policy for hashing; v1 can safely be represented as v3.
    require(policy.get('version',1) in [1,3], 'Version IAM inconnue')
    original_digest=digest(policy)
    policy={**policy,'version':3}
    result=proposal(policy,role,datetime.now(timezone.utc))
    result['policyApiResponseSha256']=original_digest
    result['planRun']=int(plan_run);result['candidate']=request['candidate']
    result['permissionCurrentlyGranted']=PERMISSION in read(TEST_URL,token,{'permissions':[PERMISSION]}).get('permissions',[])
    cycle.write(directory/'scheduler-iam-proposal.json',result)
    print('Proposition IAM preparee : un droit, une identite, deux heures, portee projet explicite. Aucune ecriture cloud.')

if __name__=='__main__':main(*sys.argv[1:])
