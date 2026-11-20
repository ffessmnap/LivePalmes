"""Inspect or add the single A6 index from an authenticated protected preflight."""
import importlib.util
import json
import os
from pathlib import Path
import sys


def load(file):
    spec = importlib.util.spec_from_file_location(file.stem, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main(mode, directory, plan_run):
    policy = load(Path(__file__).with_name('a6-production-reliability.py'))
    index = policy.common.load('production-account-history-indexes.py')
    cycle = policy.common.load('release-cycle.py')
    root = Path(directory)
    policy.require(os.environ.get('GITHUB_WORKFLOW_REF') ==
                   'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-account-history-indexes.yml@refs/heads/main'
                   and os.environ['GITHUB_EVENT_NAME'] == 'workflow_dispatch' and mode in ('inspect','apply'),
                   'Workflow ou mode A6 différent')
    info = cycle.artifact(plan_run,'release-plan',root/'plan','.github/workflows/livepalmes-production-preflight.yml')
    policy.require(info['head_sha'] == os.environ['GITHUB_SHA'] and info['event'] == 'workflow_dispatch',
                   'Contrôleur du plan différent')
    request = cycle.read(root/'plan/request.json')
    def check_plan(request):
        policy.require(bool(policy.approved(request)), 'Contrat A6 absent du plan')
    check_plan(request)
    index.CANDIDATE = policy.contract()['candidate']
    index.PREFIX = policy.INDEX
    index.URL = 'https://firestore.googleapis.com/v1/'+policy.INDEX
    index.DEFINITIONS = [{'queryScope':'COLLECTION','fields':policy.FIELDS}]
    index.CONFIRMATION = 'approved-production-a6-notification-index'
    index.check_plan = check_plan
    index.main(mode, root, plan_run)
    receipt = cycle.read(root/'index-receipt.json')
    before = cycle.read(root/'indexes-before.json')
    def retained(rows):
        return sorted((v for v in rows if not index.matching(v,index.DEFINITIONS[0])),key=lambda v:v['name'])
    policy.require(retained(before) == retained(receipt['indexes']), 'Autre index modifié')
    if mode == 'apply':
        policy.ready_index(receipt['indexes'])
    if mode == 'inspect':
        rights = policy.common.load('check-release-prerequisites.py')
        names = ['datastore.indexes.list','datastore.indexes.create']
        granted = rights.read(rights.IAM, {'permissions':names}).get('permissions', [])
        cycle.write(root/'index-capabilities.json', {'candidate':index.CANDIDATE,'granted':sorted(granted),
                    'missing': sorted(set(names)-set(granted)),'missingDefinitions':len(receipt['missing'])})


if __name__ == '__main__':
    main(*sys.argv[1:])
