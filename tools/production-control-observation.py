"""Authenticate an explicit read-only control observation without resetting PROD."""
import hashlib
import json
import re
from pathlib import Path

WORKFLOW = '.github/workflows/livepalmes-production-readiness.yml'
CONTROLLERS = ['tools/production-control-observation.py', 'tools/check-release-prerequisites.py',
               'tools/standard-source-policy.py', WORKFLOW]
READ_PERMISSIONS = ['datastore.entities.get', 'cloudscheduler.jobs.get']
QUEUE = 'projects/livepalmes/locations/europe-west1/queues/processNapNotificationTask'
QUEUE_PERMISSION = {'resource':QUEUE, 'permission':'cloudtasks.queues.get', 'granted':True}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def reference(cycle, directory, candidate, production_run):
    cycle.require(type(production_run) is int and production_run > 0, 'Run PROD du temoin explicite requis')
    state = cycle.production_evidence(Path(directory)/'control-reference')
    baseline = cycle.read(Path(directory)/'control-reference/baseline.json')
    cycle.require(baseline['productionRun'] == production_run, 'Reference PROD du temoin depassee')
    cycle.git('merge-base', '--is-ancestor', baseline['productionCommit'], candidate)
    return baseline, state


def context(baseline, state):
    return {'schema':1, 'productionRun':baseline['productionRun'],
            'productionCommit':baseline['productionCommit'], 'stateSha256':digest(state)}


def assert_state(cycle, kind, report, state):
    if kind == 'hosting':
        observed = report.get('hosting', {})
        cycle.require(observed.get('name') == state['hosting']['name']
                      and observed.get('version', {}).get('name') == state['hosting']['version'],
                      'Hosting du temoin different de la reference PROD')
    else:
        rows = report.get('functions', [])
        cycle.require(isinstance(rows, list) and 0 < len(rows) <= 500
                      and len({f['name'] for f in rows}) == len(rows)
                      and all(f.get('state') == 'ACTIVE' for f in rows)
                      and sorted(rows, key=lambda f:f['name']) == state['functions'],
                      'Revisions du temoin differentes de la reference PROD')


def observe(cycle, kind, report, baseline, state):
    cycle.require(report['missingPermissions'] == [], 'Permissions du temoin manquantes')
    assert_state(cycle, kind, report, state)
    report['controlObservation'] = context(baseline, state)
    if kind == 'backend':
        cycle.require(report.get('queueReadPermission') == QUEUE_PERMISSION, 'Permission de lecture de la seule file non attestee')
        before = cycle.standard_sources.controls()
        after = cycle.standard_sources.controls()
        cycle.require(before == after, 'Derive des temoins pendant observation')
        report['controlsBefore'], report['controlsAfter'] = before, after


def consume(cycle, root, run, candidate, baseline, state):
    cycle.require(type(run) is int and run > 0, 'Run explicite du temoin requis')
    expected = context(baseline, state)
    controls = None
    for kind in ['hosting', 'backend']:
        directory = Path(root)/('observed-controls-'+kind)
        info = cycle.artifact(run, 'production-discovery-'+kind, directory, WORKFLOW)
        cycle.require(info.get('id') == run and info.get('event') == 'workflow_dispatch'
                      and info.get('repository', {}).get('full_name') == 'ffessmnap/LivePalmes'
                      and info.get('head_repository', {}).get('full_name') == 'ffessmnap/LivePalmes',
                      'Provenance du temoin inconnue')
        sha = info.get('head_sha', '')
        cycle.require(re.fullmatch('[a-f0-9]{40}', sha), 'Version du lecteur du temoin absente')
        for file in CONTROLLERS:
            cycle.require(cycle.git('rev-parse',sha+':'+file) == cycle.git('rev-parse','HEAD:'+file),
                          'Lecteur du temoin modifie : '+file)
        proof = cycle.read(directory/('production-discovery-'+kind+'.json'))
        cycle.require(proof.get('schema') == 1 and proof.get('project') == 'livepalmes'
                      and proof.get('candidate') == candidate and proof.get('toolingCommit') == sha
                      and proof.get('run') == run and proof.get('kind') == kind
                      and set(proof.get('services', [])) == {'hosting','sources'}
                      and proof.get('readOnly') is True and proof.get('publicationAllowed') is False
                      and proof.get('discoveryComplete') is True and proof.get('missingPermissions') == []
                      and all(proof.get(k) == 0 for k in ['iamWrites','rulesWrites','businessInvocations'])
                      and proof.get('controlObservation') == expected,
                      'Temoin incomplet ou hors candidat/reference')
        assert_state(cycle, kind, proof, state)
        if kind == 'backend':
            cycle.require(proof.get('queueReadPermission') == QUEUE_PERMISSION, 'Permission de la file non authentifiee')
            controls = proof.get('controlsBefore')
            cycle.require(isinstance(controls, dict) and set(controls) == cycle.standard_sources.CONTROL_KEYS
                          and all(re.fullmatch('[a-f0-9]{64}', str(v)) for v in controls.values())
                          and proof.get('controlsAfter') == controls,
                          'Temoins mails/automates differents ou absents')
    return controls
