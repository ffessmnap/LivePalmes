"""One new Firestore trigger and source-only updates; no invocation, IAM, mail or SQL API."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


policy = load('account_release_policy', 'nap-account-release-policy.py')


def guard(directory, after=False):
    directory = Path(directory)
    policy.require(policy.approved(json.loads((directory/'request.json').read_text())), 'Garde annuaire sans accord')
    observed = load('account_preservation', 'nap-retained-sources.py').controls('livepalmes', policy.contract())
    before = directory/'nap-account-before.json'
    if before.exists():
        policy.require(json.loads(before.read_text()) == observed, 'Derive mails/scheduler/file annuaire NAP')
    else:
        policy.require(not after, 'Temoin initial annuaire absent')
        before.write_text(json.dumps(observed))
    if after:
        (directory/'nap-account-after.json').write_text(json.dumps(observed))


def pending(before, current, previous, state):
    """Only initial identities or identities attested by the interrupted release may be used."""
    c = policy.contract()
    policy.require(set(before) == set(current)-({policy.PREFIX+policy.NAME} if policy.PREFIX+policy.NAME in current else set()),
                   'Inventaire annuaire inattendu')
    todo = []
    selected = {policy.PREFIX+n for n in c['existingSelected']}
    for full, original in before.items():
        if state.identity(original) == state.identity(current[full]):
            if full in selected:
                todo.append(full.split('/')[-1])
        else:
            policy.require(full in selected and previous.get(full) == state.identity(current[full]),
                           'Revision annuaire sans preuve de reprise')
            policy.assert_existing(original, current[full], state)
    new = policy.PREFIX+policy.NAME
    if new in current:
        policy.require(previous.get(new) == state.identity(current[new]), 'Creation NAP sans preuve de reprise')
        policy.assert_new(current[new])
    return todo, new not in current


def publish(candidate, plan, backup, cycle, archive):
    value = cycle.read(plan/'request.json')
    names = policy.approved(value)
    policy.require(names, 'Publication annuaire sans accord')
    policy.selection(value, cycle.read(plan/'selection.json'))
    report = cycle.read(backup/'report.json')
    policy.require(report.get('additionalNapAccountFunctions') == names
                   and report['candidate'] == value['candidate'] and report.get('newFunctions') == [policy.NAME],
                   'Sauvegarde annuaire hors plan')
    state = load('account_state', 'production-release-state.py')
    before = {f['name']: f for f in cycle.read(backup/'functions.json')}
    current = {f['name']: f for f in state.inventory()}
    path = plan/'previous/production-after.json'
    previous = cycle.read(path) if path.exists() else {}
    policy.require(not previous or previous.get('candidate') == value['candidate'], 'Reprise hors candidat')
    todo, create = pending(before, current, {f['name']: f for f in previous.get('functions', [])}, state)
    guard(plan)
    if not todo and not create:
        # Every revision was just checked against the authenticated interrupted
        # run and original backup. Do not upload, rebuild or recreate anything.
        receipt = cycle.read(plan/'previous/guards/nap-account-source-update.json')
        policy.require(receipt.get('candidate') == value['candidate'] and receipt.get('created') is True
                       and sorted(receipt.get('updated', [])) == policy.contract()['existingSelected'],
                       'Recu de publication annuaire incomplet')
        cycle.write(plan/'nap-account-source-update.json', {**receipt, 'resumedWithoutWrites': True})
        state.check_after(backup, backup/'after.json', True)
        guard(plan, True)
        return
    data = archive(candidate, value['candidate'])
    upload = state.request(state.API+'projects/livepalmes/locations/europe-west1/functions:generateUploadUrl', 'POST', {})
    url = urllib.parse.urlsplit(upload['uploadUrl'])
    policy.require(url.scheme == 'https' and (url.hostname == 'storage.googleapis.com'
                   or (url.hostname or '').endswith('.storage.googleapis.com')), 'Destination source interdite')
    with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'], method='PUT', data=data,
                                headers={'Content-Type': 'application/zip'}), timeout=120):
        pass
    def one(name):
        full = policy.PREFIX+name
        body = {'name': full, 'buildConfig': {'source': {'storageSource': upload['storageSource']}},
                'labels': {**before[full].get('labels', {}), 'livepalmes-commit': value['candidate']}}
        state.wait_operation(state.request(state.API+full+'?updateMask=build_config.source,labels', 'PATCH', body))
        print('Source existante actualisee : '+name, flush=True)
    with ThreadPoolExecutor(max_workers=3) as executor:
        list(executor.map(one, todo))
    # Create only after all existing updates succeeded. No profile or event is invoked.
    if create:
        state.wait_operation(state.request(state.API+'projects/livepalmes/locations/europe-west1/functions?functionId='+policy.NAME,
            'POST', policy.new_function(upload['storageSource'])))
    cycle.write(plan/'nap-account-source-update.json', {'candidate': value['candidate'],
                'sourceArchiveSha256': hashlib.sha256(data).hexdigest(), 'updated': todo, 'created': create})
    state.check_after(backup, backup/'after.json', True)
    guard(plan, True)
