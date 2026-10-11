"""No network: compare deployment witnesses for the two-function TEST scope."""
import copy
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('witness', Path(__file__).resolve().parents[1] / 'tools/test-access-request-state.py')
witness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(witness)
before = {'functions': [{'name': 'functions/' + name, 'state': 'ACTIVE', 'commit': 'old'}
                        for name in [*sorted(witness.NAMES), 'preservedFunction']]}
after = copy.deepcopy(before)
for row in after['functions']:
    if row['name'].split('/')[-1] in witness.NAMES:
        row['commit'] = 'candidate'
witness.unchanged(before, after, 'candidate')
for index in range(3):
    bad = copy.deepcopy(after)
    bad['functions'][index]['commit'] = 'unexpected'
    try:
        witness.unchanged(before, bad, 'candidate')
    except ValueError:
        pass
    else:
        raise AssertionError('Unexpected runtime modification accepted')
print('Access-request deployment witnesses: exact pair and preserved functions OK')
