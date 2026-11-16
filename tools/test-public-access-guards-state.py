"""Closed A3.2 TEST selection and read-only deployment witnesses."""
import copy
import importlib.util
import os
from pathlib import Path
import sys
from urllib.parse import quote


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cycle = load('release-cycle')
standard = load('publish-test-standard-sources')
NAMES = ['getPublicEngagementClubDirectory', 'resolveEngagementAccessRequest', 'submitEngagementAccessRequest']
PUBLIC = {'getPublicEngagementClubDirectory', 'submitEngagementAccessRequest'}


def snapshot():
    rows, page = [], ''
    for _ in range(50):
        response = cycle.api('livepalmes-test', 'functions' + ('&pageToken=' + quote(page, safe='') if page else ''))
        cycle.require(not response.get('unreachable'), 'Inventaire incomplet')
        rows.extend(response.get('functions', []))
        page = response.get('nextPageToken')
        if not page:
            break
    else:
        raise ValueError('Pagination incomplete')
    # Configurations retained only on the private runner, never uploaded as public artifacts.
    return {'functions': sorted(rows, key=lambda row: row['name']),
            'hosting': cycle.api('livepalmes-test', 'hosting')['releases'][0]}


def configuration(row, public):
    service = copy.deepcopy(row.get('serviceConfig', {}))
    service.pop('revision', None)
    if public:
        service.pop('maxInstanceCount', None)
        service.pop('maxInstanceRequestConcurrency', None)
    # These are build outputs, not runtime configuration or secret bindings.
    build = copy.deepcopy(row.get('buildConfig', {}))
    for key in ['build', 'source', 'sourceProvenance']:
        build.pop(key, None)
    labels = dict(row.get('labels', {}))
    for key in ['livepalmes-commit', 'firebase-functions-hash']:
        labels.pop(key, None)
    return {'service': service, 'build': build, 'labels': labels,
            'environment': row.get('environment'), 'eventTrigger': row.get('eventTrigger'), 'url': row.get('url')}


def unchanged(before, after, candidate):
    cycle.require(before['hosting'] == after['hosting'], 'Hosting TEST modifie')
    old = {row['name']: row for row in before['functions']}
    current = {row['name']: row for row in after['functions']}
    cycle.require(len(old) == len(before['functions']) and len(current) == len(after['functions'])
                  and set(old) == set(current), 'Inventaire TEST modifie')
    selected = []
    for path, row in current.items():
        name = path.split('/')[-1]
        if name not in NAMES:
            cycle.require(row == old[path], 'Fonction hors perimetre modifiee : ' + name)
            continue
        selected.append(name)
        cycle.require(row.get('state') == 'ACTIVE' and row.get('labels', {}).get('livepalmes-commit') == candidate,
                      'Revision A3.2 TEST non confirmee : ' + name)
        cycle.require(configuration(row, name in PUBLIC) == configuration(old[path], name in PUBLIC),
                      'Configuration ou liaison modifiee : ' + name)
        if name in PUBLIC:
            cycle.require(row['serviceConfig'].get('maxInstanceCount') == 2
                          and row['serviceConfig'].get('maxInstanceRequestConcurrency') == 4,
                          'Capacite publique non bornee : ' + name)
    cycle.require(sorted(selected) == NAMES, 'Selection A3.2 incomplete')


if __name__ == '__main__':
    candidate = os.environ['CANDIDATE_SHA']
    cycle.require(os.environ.get('TARGET_FIREBASE_PROJECT') == 'livepalmes-test'
                  and os.environ.get('PUBLIC_ACCESS_GUARDS_ONLY') == 'true'
                  and os.environ.get('GITHUB_REF') == 'refs/heads/main'
                  and os.environ.get('GITHUB_RUN_ATTEMPT') == '1', 'Contrat A3.2 TEST requis')
    mode, filename = sys.argv[1:]
    cycle.require(mode in {'before', 'after'}, 'Mode interdit')
    state = snapshot()
    if mode == 'before':
        # The full dependency selection is computed from every live origin, including sealed A1 provenance.
        standard.selection(state['functions'], candidate, NAMES, cycle.test_backend_fingerprints)
        cycle.write(filename, state)
    else:
        unchanged(cycle.read(filename), state, candidate)
        print('A3.2 TEST : selection complete de trois fonctions, capacite publique bornee, reste conserve.')
