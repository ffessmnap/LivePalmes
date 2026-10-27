"""Finish an exact TEST release, then queue main; never substitute its candidate."""
import json
import os
import re
import subprocess
import sys

WORKFLOW = 'livepalmes-test-common.yml'
SHA = re.compile(r'[0-9a-f]{40}')
INPUTS = {'production_commit', 'approved_top_files', 'approved_records_cleanup',
          'approved_public_export_cleanup', 'dtn_extension', 'approved_home_routing',
          'verification_only', 'hosting_only', 'followup_depth', 'automatic_candidate'}


def gh(path, payload=None):
    command = ['gh', 'api', path]
    if payload is not None:
        command += ['--method', 'POST', '--input', '-']
    result = subprocess.run(command, input=json.dumps(payload) if payload is not None else None,
                            text=True, capture_output=True, check=True)
    return json.loads(result.stdout) if result.stdout.strip() else None


def latest(repository, candidate):
    if not SHA.fullmatch(candidate):
        raise ValueError('Commit TEST invalide')
    head = gh(f'repos/{repository}/git/ref/heads/main')['object']['sha']
    if not SHA.fullmatch(head):
        raise ValueError('Commit main invalide')
    if head != candidate:
        comparison = gh(f'repos/{repository}/compare/{candidate}...{head}')
        if comparison['status'] != 'ahead':
            raise ValueError('main ne descend plus du candidat TEST : intervention requise')
    return head


def coordinate(phase, repository, candidate, inputs):
    if set(inputs) - INPUTS:
        raise ValueError('Entree TEST inconnue')
    depth = int(inputs.get('followup_depth', 0))
    if not 0 <= depth <= 3:
        raise ValueError('Limite de suivi TEST invalide')
    dry = inputs.get('verification_only', False) in (True, 'true')
    head = latest(repository, candidate)
    automatic = inputs.get('automatic_candidate', '')
    if automatic:
        if not SHA.fullmatch(automatic) or automatic != candidate or inputs.get('hosting_only') not in (True, 'true'):
            raise ValueError('Candidat automatique different ou restriction Hosting absente')
        # A newer main needs its own successful CI and classification. Never forward
        # an automatic authorization to a newer, possibly sensitive candidate.
        if phase == 'prepare':
            return {'publish': head == candidate, 'head': head}
        if phase == 'followup':
            return {'queued': False, 'head': head}
        raise ValueError('Phase inconnue')
    if phase == 'prepare':
        return {'publish': dry or head == candidate, 'head': head}
    if phase != 'followup':
        raise ValueError('Phase inconnue')
    if dry or head == candidate:
        return {'queued': False, 'head': head}
    if depth == 3:
        raise ValueError('main evolue encore apres trois suivis : regrouper les travaux puis relancer TEST')
    # Copy every original restriction. In particular hosting_only is never widened.
    forwarded = {key: str(value).lower() if isinstance(value, bool) else str(value)
                 for key, value in inputs.items()}
    forwarded['followup_depth'] = str(depth + 1)
    gh(f'repos/{repository}/actions/workflows/{WORKFLOW}/dispatches',
       {'ref': 'main', 'inputs': forwarded})
    return {'queued': True, 'head': head}


def main():
    result = coordinate(sys.argv[1], os.environ['GITHUB_REPOSITORY'],
                        os.environ['GITHUB_SHA'], json.loads(os.environ['TEST_INPUTS']))
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as stream:
        for key, value in result.items():
            stream.write(f'{key}={str(value).lower() if isinstance(value, bool) else value}\n')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
        stream.write('Coordination TEST : ' + json.dumps(result) + '\n')


if __name__ == '__main__':
    main()
