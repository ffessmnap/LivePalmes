"""Assemble an immutable candidate dossier from authenticated evidence and explicit validation records."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('draft_cycle', ROOT/'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)


def changes_from_records(records, paths, production, candidate):
    if not isinstance(records, list) or len(records) > 100:
        raise ValueError('Liste de validations bornee requise')
    changes, covered = [], set()
    for row in records:
        if not isinstance(row, dict) or set(row) != {'title', 'commits', 'status', 'validation'}:
            raise ValueError('Validation : titre, commits, statut et retour utilisateur exact requis')
        if not isinstance(row['title'], str) or not row['title'].strip():
            raise ValueError('Titre manquant')
        if row['status'] != 'validated' or not isinstance(row['validation'], str) or not row['validation'].strip():
            raise ValueError('Validation utilisateur absente : '+row['title'])
        if not isinstance(row['commits'], list) or not 1 <= len(row['commits']) <= 50:
            raise ValueError('Commits de la validation requis')
        affected = set()
        for commit in row['commits']:
            if not cycle.SHA.fullmatch(str(commit)):
                raise ValueError('SHA complet requis')
            # Each record belongs to this exact release interval, never to a future change.
            subprocess.run(['git', 'merge-base', '--is-ancestor', production, commit], cwd=ROOT, check=True)
            subprocess.run(['git', 'merge-base', '--is-ancestor', commit, candidate], cwd=ROOT, check=True)
            affected.update(cycle.git('diff', '--name-only', '--no-renames', commit+'^1', commit).splitlines())
        selected = sorted(affected.intersection(paths))
        if selected:
            changes.append({'title': row['title'], 'paths': selected, 'status': 'validated', 'validation': row['validation']})
            covered.update(selected)
    return changes, sorted(set(paths)-covered)


def build(directory, test_run, records):
    root = Path(directory); root.mkdir(parents=True, exist_ok=True)
    if type(test_run) is not int or test_run <= 0:
        raise ValueError('Run TEST explicite requis pour figer la version')
    info = cycle.artifact(test_run, 'test-proof', root/'test', '.github/workflows/livepalmes-test-common.yml')
    test = cycle.read(root/'test/test-proof.json')
    candidate = test.get('candidate', '')
    if candidate != info.get('head_sha') or not cycle.reusable_verification(test, candidate):
        raise ValueError('Preuve applicative TEST exacte requise')
    subprocess.run(['git', 'merge-base', '--is-ancestor', candidate, 'HEAD'], cwd=ROOT, check=True)
    state = cycle.production_evidence(root/'production')
    production = cycle.read(root/'production/baseline.json')['productionCommit']
    subprocess.run(['git', 'merge-base', '--is-ancestor', production, candidate], cwd=ROOT, check=True)
    paths = cycle.git('diff', '--name-only', '--no-renames', production, candidate).splitlines()
    application, backend = cycle.classify(paths)
    changes, missing = changes_from_records(records, application, production, candidate)
    value = {'schema': 1, 'candidate': candidate, 'productionCommit': production,
             'productionHosting': state['hosting']['version'], 'testRun': test_run,
             'changes': changes, 'excludedBackendReview': '', 'freezeTestCandidate': True}
    blockers = ['Validation manquante : '+p for p in missing]
    if not changes:
        blockers.append('Aucune evolution validee incluse')
    if backend:
        blockers.append('Revue structuree des exclusions backend a joindre avant le preflight')
    if not blockers:
        cycle.validate_request(value, paths)
    cycle.write(root/'request-draft.json', value)
    cycle.write(root/'draft-status.json', {'readyForPreflight': not blockers, 'blockers': blockers,
                'candidate': candidate, 'testRun': test_run, 'productionApproval': False})
    summary = '# Bilan propose — aucun accord PROD deduit\n\n'
    summary += '\n'.join('- '+c['title'].replace('\n', ' ') for c in changes)+'\n\n'
    summary += '\n'.join('- '+b for b in blockers) if blockers else 'Pret pour le preflight existant ; accord final toujours requis.'
    (root/'SUMMARY.md').write_text(summary+'\n', encoding='utf-8')
    return blockers


if __name__ == '__main__':
    raw = os.environ.get('VALIDATIONS_JSON', '')
    if len(raw.encode('utf-8')) > 65536:
        raise ValueError('Validations trop volumineuses')
    def unique(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Cle dupliquee')
            result[key] = value
        return result
    build(sys.argv[1], int(os.environ['TEST_RUN']), json.loads(raw, object_pairs_hook=unique))
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
        stream.write((Path(sys.argv[1])/'SUMMARY.md').read_text(encoding='utf-8'))
