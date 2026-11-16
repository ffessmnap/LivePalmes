"""Offline closed recovery: initial provenance, complete preservation, source and receipt refusals."""
import copy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('recovery', Path(__file__).resolve().parents[1]/'tools/a3-test-public-access-recovery.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
sealed = p.contract()
assert sealed['deploymentRun'] == 43904934447 and sealed['baselineRun'] == 43764755229
env = dict(GITHUB_REPOSITORY=p.REPOSITORY, GITHUB_REF='refs/heads/main', GITHUB_RUN_ATTEMPT='1',
           TARGET_FIREBASE_PROJECT=p.PROJECT, CONFIRMATION=p.PROJECT, GITHUB_SHA='a'*40, EXPECTED_COMMIT='a'*40)
p.guard(env, 'a'*40)
for key in env:
    try:
        p.guard({**env, key: 'invalid'}, 'a'*40)
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid scope accepted: '+key)


def refused(call):
    try:
        call()
    except ValueError:
        return
    raise AssertionError('Invalid recovery evidence accepted')


def row(name):
    return dict(name=p.PREFIX+name, environment='GEN_2', state='ACTIVE', updateTime='2026-11-16T16:24:00Z',
                labels={'livepalmes-commit': p.APP, 'deployment-callable': 'true'},
                buildConfig={'runtime': 'nodejs22', 'entryPoint': name},
                serviceConfig={'revision': 'fixture-'+name, 'maxInstanceRequestConcurrency': 80,
                    'environmentVariables': {'FUNCTION_SIGNATURE_TYPE': 'http', 'FIXTURE_SETTING': 'preserved'},
                    'secretEnvironmentVariables': [{'key': 'FIXTURE_SECRET', 'version': '1'}]})


old = [row(n) for n in [*p.NAMES, *['untouched'+str(i) for i in range(118)]]]
state = {'functions': copy.deepcopy(old), 'hosting': {'name': 'release', 'version': {'name': 'version'}, 'message': 'unchanged'}}
w = p.load('test-public-access-guards-state.py')
value = copy.deepcopy(sealed)
value['initialMetadataHashes'] = {r['name'].split('/')[-1]: p.digest(w.stable_state({'functions': [r]})['functions'][0]) for r in old}
value['protectedConfigurationHashes'] = {r['name'].split('/')[-1]: p.digest(w.configuration(r, r['name'].split('/')[-1] in p.PUBLIC)) for r in old[:3]}
for item in state['functions'][:3]:
    if item['name'].split('/')[-1] in p.PUBLIC:
        item['serviceConfig'].update(maxInstanceCount=2, maxInstanceRequestConcurrency=4)
    item['serviceConfig']['environmentVariables'].pop('FUNCTION_SIGNATURE_TYPE')
value['deployedState'] = {'functions': [p.summary(r) for r in state['functions'][:3]]}
baseline = {'candidate': value['baselineCandidate'], 'state': {'functions': [p.summary(r) for r in old],
             'hosting': {'name': 'release', 'version': 'version', 'message': 'unchanged'}}}
value['baselineProofSha256'] = p.digest(baseline)
value['initialStateSha256'] = p.digest(baseline['state']['functions'])
p.verify_baseline(baseline, value)
p.verify_state(state, baseline, value)
for mutate in [lambda s: s['functions'].pop(), lambda s: s['hosting'].update(message='changed'),
               lambda s: s['functions'][3]['serviceConfig']['environmentVariables'].update(FIXTURE_SETTING='changed'),
               lambda s: s['functions'][3]['serviceConfig']['environmentVariables'].pop('FUNCTION_SIGNATURE_TYPE'),
               lambda s: s['functions'][0]['serviceConfig']['secretEnvironmentVariables'][0].update(version='2'),
               lambda s: s['functions'][0]['serviceConfig'].update(maxInstanceCount=3),
               lambda s: s['functions'][1]['serviceConfig'].update(maxInstanceCount=2),
               lambda s: s['functions'][2]['serviceConfig'].update(maxInstanceRequestConcurrency=80),
               lambda s: s['functions'][0]['serviceConfig']['environmentVariables'].update(FUNCTION_SIGNATURE_TYPE='cloudevent'),
               lambda s: s['functions'][0].update(eventTrigger={'eventType': 'fixture-event'}),
               lambda s: s['functions'][0]['serviceConfig']['environmentVariables'].update(FIXTURE_SETTING='changed'),
               lambda s: s['functions'][0].update(updateTime='2026-11-16T17:00:00Z')]:
    bad = copy.deepcopy(state)
    mutate(bad)
    refused(lambda: p.verify_state(bad, baseline, value))
bad = copy.deepcopy(baseline)
bad['state']['functions'][0]['revision'] = 'another'
refused(lambda: p.verify_baseline(bad, value))

info = {'id': p.DEPLOYMENT_RUN, 'head_sha': p.APP, 'head_branch': 'main', 'event': 'workflow_dispatch',
        'run_attempt': 1, 'status': 'completed', 'conclusion': 'failure', 'path': '.github/workflows/livepalmes-test-backend.yml',
        'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY}}
names = ['Vérifier LivePalmes et la classification des Functions', 'Calculer et borner le contrat A3.2 avec mails TEST deja desactives',
         'Refuser toute derive A3.2 juste avant publication', 'Déployer uniquement les Functions du lot TEST']
steps = [{'name': n, 'conclusion': 'success', 'started_at': '2026-11-16T16:23:00Z', 'completed_at': '2026-11-16T16:25:00Z'} for n in names]
steps.append({'name': 'Controler le contrat A3.2, les configurations et les traitements conserves', 'conclusion': 'failure'})
jobs = [{'name': 'Vérifier puis déployer le lot email en TEST', 'steps': steps}]
logs = '\n'.join('functions['+n+'(europe-west1)] Successful update operation.' for n in p.NAMES)
logs += '\nValueError: Configuration ou liaison modifiee : getPublicEngagementClubDirectory'
p.verify_original(info, jobs, logs, value)
for key, replacement in [('id', 1), ('head_sha', 'b'*40), ('run_attempt', 2), ('conclusion', 'success'), ('head_branch', 'other')]:
    refused(lambda: p.verify_original({**info, key: replacement}, jobs, logs, value))
refused(lambda: p.verify_original(info, jobs, logs.replace('getPublicEngagementClubDirectory', 'another'), value))
bad = copy.deepcopy(jobs)
bad[0]['steps'][0]['conclusion'] = 'failure'
refused(lambda: p.verify_original(info, bad, logs, value))

managed = {n: {'storageSource': {'bucket': 'gcf-v2-sources-206080168534-europe-west1', 'object': n+'/function-source.zip', 'generation': '1'},
              'archiveSha256': 'a'*64, 'archiveIdentity': 'b'*64, 'allPathsAndFileBytesIdentical': True,
              'generationReadAndReferencesRechecked': True} for n in p.NAMES}
receipt = dict(schema=1, kind='a3-public-access-readonly-proof-v1', contractSha256=p.DIGEST, candidate='b'*40,
               applicationCandidate=p.APP, recoveredRun=p.DEPLOYMENT_RUN, baselineRun=p.BASELINE_RUN,
               originalRunConclusion='failure', selected=p.NAMES, state=sealed['deployedState'], managedSources=managed)
for key in ['readOnlyRecovery', 'otherFunctionsUnchanged', 'configurationsPreserved', 'publicCapacitiesVerified',
            'hostingUnchanged', 'mailsDisabled', 'mailSettingPreservedDuringVerification']:
    receipt[key] = True
fingerprints = lambda sha: {n: 'same' for n in p.NAMES}
p.validate_receipt(receipt, {'head_sha': 'b'*40}, fingerprints)
for key in ['contractSha256', 'applicationCandidate', 'recoveredRun', 'baselineRun', 'originalRunConclusion', 'readOnlyRecovery', 'mailsDisabled']:
    refused(lambda: p.validate_receipt({**receipt, key: 'wrong'}, {'head_sha': 'b'*40}, fingerprints))
refused(lambda: p.validate_receipt(receipt, {'head_sha': 'c'*40}, fingerprints))
refused(lambda: p.validate_receipt(receipt, {'head_sha': 'b'*40}, lambda sha: {n: sha for n in p.NAMES}))

source = {'id': 1001, 'status': 'completed', 'conclusion': 'success', 'run_attempt': 1, 'event': 'workflow_dispatch',
          'head_branch': 'main', 'head_sha': 'b'*40, 'path': p.WORKFLOW,
          'repository': {'full_name': p.REPOSITORY}, 'head_repository': {'full_name': p.REPOSITORY}}
calls = []
def artifact(run, name, target, workflow):
    calls.append((run, name, workflow))
    return source
api = SimpleNamespace(gh=lambda route: {'workflow_runs': [source]}, artifact=artifact, read=lambda path: receipt,
                      matching_functions=p.load('release-cycle.py').matching_functions, test_backend_fingerprints=fingerprints)
current = {'functions': copy.deepcopy(sealed['deployedState']['functions'])}
assert p.trusted_revisions('.', current, api) == {r['name'] for r in current['functions']}
assert calls == [(1001, 'a3-test-public-access-proof', p.WORKFLOW)]
changed = copy.deepcopy(current)
changed['functions'][0]['revision'] = 'another'
assert len(p.trusted_revisions('.', changed, api)) == 2
source['conclusion'] = 'failure'
assert not p.trusted_revisions('.', current, api)
source['conclusion'] = 'success'
source['path'] = '.github/workflows/another.yml'
assert not p.trusted_revisions('.', current, api)
assert not p.trusted_revisions('.', {'functions': [{'name': p.PREFIX+'unrelated', 'commit': 'old'}]},
                              SimpleNamespace(gh=lambda path: (_ for _ in ()).throw(AssertionError('No unrelated lookup'))))

with patch.object(p.load('production-release-state.py'), 'request', return_value={}) as request:
    p.source_request(p.API+p.PREFIX+p.NAMES[0])
    p.source_request(p.API+p.PREFIX+p.NAMES[0]+':generateDownloadUrl', 'POST', {})
    for args in [(p.API+p.PREFIX+p.NAMES[0], 'PATCH', {}), (p.API+p.PREFIX+'other', 'GET', None),
                 ('https://europe-west1-livepalmes-test.cloudfunctions.net/'+p.NAMES[0], 'POST', {})]:
        refused(lambda: p.source_request(*args))
    assert request.call_count == 2

print('A3.2 recovery: closed failed-run provenance, initial anchor, 121 functions, HTTP default only, exact capacities, secret preservation, archive receipts and read-only request gate verified offline.')
