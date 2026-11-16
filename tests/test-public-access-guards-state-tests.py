"""Offline A3.2 deployment witnesses reject unrelated, config and secret drift."""
import copy
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('policy', Path(__file__).resolve().parents[1] / 'tools/test-public-access-guards-state.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
before = {'hosting': {'version': 'unchanged'}, 'functions': [
    {'name': 'functions/' + name, 'state': 'ACTIVE', 'labels': {'livepalmes-commit': 'old'},
     'serviceConfig': {'revision': 'old', 'maxInstanceRequestConcurrency': 80, 'secretEnvironmentVariables': [{'key': 'fixture-secret', 'version': '1'}]},
     'buildConfig': {'runtime': 'nodejs22', 'source': {'old': 'archive'}}}
    for name in [*policy.NAMES, 'untouched']]}
after = copy.deepcopy(before)
for row in after['functions']:
    name = row['name'].split('/')[-1]
    if name in policy.NAMES:
        row['labels']['livepalmes-commit'] = 'candidate'
        row['serviceConfig']['revision'] = 'new'
        row['buildConfig']['source'] = {'new': 'archive'}
        if name in policy.PUBLIC:
            row['serviceConfig'].update(maxInstanceCount=2, maxInstanceRequestConcurrency=4)
policy.unchanged(before, after, 'candidate')


def rejected(mutate):
    bad = copy.deepcopy(after)
    mutate(bad)
    try:
        policy.unchanged(before, bad, 'candidate')
    except ValueError:
        return
    raise AssertionError('Unexpected deployment drift accepted')


rejected(lambda state: state['hosting'].update(version='changed'))
rejected(lambda state: state['functions'].pop())
rejected(lambda state: state['functions'].append(copy.deepcopy(state['functions'][0])))
for index in range(4):
    rejected(lambda state: state['functions'][index]['labels'].update({'livepalmes-commit': 'wrong'}))
    rejected(lambda state: state['functions'][index]['serviceConfig']['secretEnvironmentVariables'][0].update(version='2'))
    rejected(lambda state: state['functions'][index]['buildConfig'].update(runtime='nodejs24'))
for index in [0, 2]:
    rejected(lambda state: state['functions'][index]['serviceConfig'].update(maxInstanceCount=3))
    rejected(lambda state: state['functions'][index]['serviceConfig'].update(maxInstanceRequestConcurrency=80))
rejected(lambda state: state['functions'][1]['serviceConfig'].update(maxInstanceCount=2))
print('A3.2 TEST witnesses: full inventory, Hosting, runtime configuration, secret versions and exact public capacities verified.')

# The live API reordered this conjunction without changing any criterion.
filters = [{'attribute': 'database', 'value': 'fixture'}, {'attribute': 'document', 'value': 'fixture/{id}', 'operator': 'match-path-pattern'}]
first = copy.deepcopy(before)
first['functions'][-1]['eventTrigger'] = {'eventFilters': filters}
reordered = copy.deepcopy(first)
reordered['functions'][-1]['eventTrigger']['eventFilters'].reverse()
policy.no_drift(first, reordered)
after_reordered = copy.deepcopy(after)
after_reordered['functions'][-1]['eventTrigger'] = reordered['functions'][-1]['eventTrigger']
policy.unchanged(first, after_reordered, 'candidate')
for mutation in ['value', 'operator', 'attribute', 'removed', 'duplicate']:
    changed = copy.deepcopy(reordered)
    items = changed['functions'][-1]['eventTrigger']['eventFilters']
    if mutation == 'removed':
        items.pop()
    elif mutation == 'duplicate':
        items.append(copy.deepcopy(items[0]))
    else:
        items[0][mutation] = 'changed'
    changed_after = copy.deepcopy(after_reordered)
    changed_after['functions'][-1]['eventTrigger'] = changed['functions'][-1]['eventTrigger']
    for check in [lambda: policy.no_drift(first, changed), lambda: policy.unchanged(first, changed_after, 'candidate')]:
        try:
            check()
        except ValueError:
            pass
        else:
            raise AssertionError('Real event filter drift accepted')
print('Eventarc filter conjunction: order only normalized; every criterion, operator and multiplicity remains checked.')
