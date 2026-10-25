"""Read-only final audit of the approved 40233566184 publication. No writer."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RUN = 40239558546


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value)
    return value


cycle = module('resumed_cycle', 'release-cycle.py')
guard = module('resumed_guard', 'check-production-bcc.py')


def verify_state(request, after, hosting, current):
    policy = cycle.bcc.for_request(request)
    names = policy.approved(request)
    cycle.require(request['candidate'] == '8b868c7c1382698ee1d04274fcc5b9a56a95d274'
        and len(names) == 108 and after['candidate'] == request['candidate'] and after['errors'] == [],
        'Publication finale hors plan approuve')
    keys = ['name', 'revision', 'updateTime', 'state']
    expected = {f['name']: f for f in after['functions']}
    actual = {f['name']: {k:f[k] for k in keys} for f in current['functions']}
    cycle.require(len(after['functions']) == len(expected) == len(current['functions']) == len(actual) == 113
        and actual == expected and all(f['state'] == 'ACTIVE' for f in current['functions']),
        'Inventaire ou revisions PROD modifies apres publication')
    cycle.require(all(f['commit'] == request['candidate'] for f in current['functions']
        if f['name'].split('/')[-1] in names), 'Source selectionnee differente du candidat')
    cycle.require(all(current['hosting'][k] == hosting[k] for k in ['name','version']),
        'Hosting modifie apres publication')


def main(directory):
    directory = Path(directory)
    cycle.require(os.environ.get('GITHUB_REF') == 'refs/heads/main'
        and os.environ.get('GITHUB_RUN_ATTEMPT') == '1', 'Audit final main/tentative1 requis')
    credentials = cycle.read(os.environ['GOOGLE_APPLICATION_CREDENTIALS'])
    cycle.require(credentials.get('project_id') == 'livepalmes'
        and credentials.get('client_email') == 'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com',
        'Identite backend PROD existante requise')
    for artifact in ['release-plan','production-after','production-hosting-after','production-bcc-guards']:
        cycle.artifact(RUN, artifact, directory, '.github/workflows/livepalmes-production-release.yml')
    request = cycle.read(directory/'request.json')
    verify_state(request, cycle.read(directory/'production-after.json'),
        cycle.read(directory/'production-hosting-after.json'), cycle.snapshot('livepalmes'))
    guard.main('resumed', directory)
    witness = cycle.read(directory/'bcc-resumed-witness.json')
    token = subprocess.check_output(['gcloud','auth','application-default','print-access-token'], text=True).strip()
    document = guard.get(guard.MAIL_URL, token)
    cycle.require(guard.digest(document) == witness['mailSha256'], 'Reglage modifie pendant audit')
    fields = document['fields']
    enabled_since = fields['enabledSince']['stringValue']
    duration = (guard.instant(enabled_since)-guard.instant(witness['discardThrough'])).total_seconds()
    receipt = {'plan':40233566184,'productionRun':RUN,'candidate':request['candidate'],
        'inventory':113,'selected':108,'retained':5,'mailEnabled':True,'mailScope':'all','mailRevision':7,
        'enabledSince':enabled_since,'discardThrough':witness['discardThrough'],
        'pauseSeconds':duration,'sourceHostingRevisionsUnchanged':True,'noReplay':True,
        'readsOnly':True,'writes':0,'smtpInvocations':0}
    cycle.write(directory/'final-resumed-receipt.json',receipt)
    print(json.dumps(receipt))


if __name__ == '__main__': main(*sys.argv[1:])
