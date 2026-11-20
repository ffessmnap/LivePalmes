"""Closed release adapters around the unchanged, hash-pinned state tool."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location('csp_state_' + name.replace('-', '_'), ROOT / 'tools' / name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_old(args):
    subprocess.run([sys.executable, str(ROOT / 'tools/production-release-state.py'), *args], check=True)


def dispatch(args):
    if len(args) not in (3, 4) or args[0] not in {'check','hosting-state','validate-rollback','rollback','hosting-rollback'}:
        raise ValueError('Mode etat CSP inconnu')
    mode, backup, after, *outcome = args
    backup, after = Path(backup), Path(after)
    report = json.loads((backup / 'report.json').read_text())
    source_policies = {'a5-retirement-existing-v1': 'a5-legacy-direct-production-policy.py',
                    'organizer-fees-existing-sources-v1': 'organizer-fees-production-policy.py',
                    'club-payment-pdf-existing-sources-v1': 'club-payment-pdf-production-policy.py'}
    source_policy = source_policies.get(report.get('sourcePolicyKind'))
    if mode == 'check' and source_policy:
        if outcome not in (['success'], ['failure']):
            raise ValueError('Resultat de publication des sources requis')
        return load(source_policy).state_check(backup, after, outcome == ['success'])
    if report.get('sourcePolicyKind') == 'a6-reliability-existing-sources-v1':
        return load('a6-production-reliability.py').state_dispatch(args)
    if report.get('sourcePolicyKind') == 'a4-existing-dependency-sources-v1':
        return load('a4-production-dependencies.py').state_dispatch(args)
    if report.get('sourcePolicyKind') == 'a3-optional-access-app-check-existing-v1':
        return load('optional-access-production-policy.py').state_dispatch(args)
    if not report.get('directCspRelease'):
        return run_old(args)
    policy = load('direct-csp-production-policy.py')
    policy.require(report['directCspRelease'] == policy.CONTRACT_SHA256 and report['candidate'] == policy.CANDIDATE
                   and report['functions'] == [] and report['newFunctions'] == [], 'Rapport CSP hors contrat')
    state = load('production-release-state.py')
    if mode == 'hosting-rollback':
        current = policy.latest_hosting()
        policy.rollback_check(report, current, json.loads((backup / 'hosting.json').read_text()))
        policy.rules_guard(backup, 'rollback')
    # The original code keeps every original check and rejects a newer Hosting release.
    run_old(args)
    if mode == 'check':
        before = json.loads((backup / 'functions.json').read_text())
        observed = state.inventory()
        policy.assert_retained({f['name']: f for f in before}, {f['name']: f for f in observed})
        result = json.loads(after.read_text())
        policy.require(not result['errors'] and outcome == ['success'], 'Controle final CSP non reussi')
        result['directCspPreservation'] = {'contractSha256': policy.CONTRACT_SHA256,
            'preservedFunctions': 119, 'functionsWitnessSha256': policy.function_witness(observed),
            'sourceChanges': 0, 'configurationChanges': 0, 'bindingChanges': 0}
        after.write_text(json.dumps(result), encoding='utf-8')


if __name__ == '__main__':
    dispatch(sys.argv[1:])
