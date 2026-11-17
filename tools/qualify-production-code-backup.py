"""Authenticate the protected synthetic probe before enabling code backup V2.

Four bounded GitHub reads, no Google credentials, key or real archive access.
Only the fixed public qualification receipt is written; existing receipts survive.
"""
import hashlib
import io
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = 'ffessmnap/LivePalmes'
WORKFLOW = '.github/workflows/production-code-backup-key-check.yml'
POLICY = '.github/releases/evidence/20261117-code-backup-key-v2.json'
OUTPUT = '.github/releases/evidence/code-backup-v2-qualification.json'
FILES = ['tools/production-code-backup-archive.js', 'tools/production-code-backup-crypto.js',
         'tools/production-backup-crypto.js', 'tools/production-code-backup-key-check.js', WORKFLOW, POLICY]
TRUE_FLAGS = ['syntheticCodeOnly', 'restoredExactly', 'archiveRoundtripVerified', 'copyContextPreserved',
              'legacyFixtureRecovered', 'originChainVerified', 'foreignSameCandidateRejected']
FALSE_FLAGS = ['googleCredentialsRead', 'existingArchivesRead', 'businessDataRead', 'keyMaterialExported']


def require(value):
    if not value:
        raise ValueError('Qualification sauvegarde code refusee')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def exact(value, keys):
    require(isinstance(value, dict) and set(value) == set(keys))


def positive(value):
    require(type(value) is int and 0 < value <= 9007199254740991)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, stderr=subprocess.PIPE)


def current_sources():
    # Git blobs match Linux checkout bytes; Windows CRLF working bytes do not.
    require(not git('status', '--porcelain', '--', *FILES).strip())
    blobs = {file: git('show', 'HEAD:' + file) for file in FILES}
    profile = re.findall(rb"node-version: ['\"]([0-9.]+)['\"]", blobs[WORKFLOW])
    require(len(profile) == 1)
    return blobs, 'v' + profile[0].decode('ascii')


def gh(endpoint, raw=False):
    data = subprocess.check_output(['gh', 'api', 'repos/' + REPO + '/' + endpoint],
                                   cwd=ROOT, stderr=subprocess.PIPE, timeout=60)
    require(len(data) <= 2 * 1024 * 1024)
    return data if raw else json.loads(data)


def qualify(run_id, api=gh, sources=current_sources):
    positive(run_id)
    blobs, node = sources()
    policy = json.loads(blobs[POLICY])
    require(policy['schema'] == 1 and policy['purpose'] == 'production-code'
            and policy['environment'] == 'production' and policy['secretName'] == 'LIVEPALMES_CODE_BACKUP_KEY_V2')
    run = api(f'actions/runs/{run_id}')
    require(run.get('id') == run_id and run.get('run_attempt') == 1 and run.get('status') == 'completed'
            and run.get('conclusion') == 'success' and run.get('event') == 'workflow_dispatch'
            and run.get('path') == WORKFLOW and run.get('head_branch') == 'main'
            and run.get('head_repository', {}).get('full_name') == REPO
            and run.get('repository', {}).get('full_name') == REPO
            and re.fullmatch('[0-9a-f]{40}', run.get('head_sha', '')))
    listed = api(f'actions/runs/{run_id}/artifacts?per_page=100')
    require(type(listed.get('total_count')) is int and listed['total_count'] <= 100
            and len(listed['artifacts']) == listed['total_count'])
    candidates = [a for a in listed['artifacts'] if a.get('name') == 'code-backup-key-proof']
    require(len(candidates) == 1 and candidates[0].get('expired') is False)
    artifact_id = candidates[0]['id']
    positive(artifact_id)
    metadata = api(f'actions/artifacts/{artifact_id}')
    require(metadata.get('id') == artifact_id and metadata.get('name') == 'code-backup-key-proof'
            and metadata.get('expired') is False and metadata.get('workflow_run', {}).get('id') == run_id
            and metadata['workflow_run'].get('head_sha') == run['head_sha']
            and metadata['workflow_run'].get('head_branch') == 'main'
            and type(metadata.get('size_in_bytes')) is int and 0 < metadata['size_in_bytes'] <= 262144
            and re.fullmatch('sha256:[0-9a-f]{64}', metadata.get('digest', '')))
    packed = api(f'actions/artifacts/{artifact_id}/zip', raw=True)
    require(len(packed) <= 262144 and 'sha256:' + sha(packed) == metadata['digest'])
    with zipfile.ZipFile(io.BytesIO(packed)) as archive:
        members = archive.infolist()
        require(len(members) == 1 and members[0].filename == 'code-backup-key-check.json'
                and not members[0].is_dir() and members[0].file_size <= 32768
                and (members[0].external_attr >> 16) & 0o170000 != 0o120000)
        raw = archive.read(members[0])
    receipt = json.loads(raw)
    exact(receipt, ['schema', 'context', 'checkedAtUtc', 'keyId', 'keyFingerprint', 'ciphertextSha256',
                    'restoredSha256', 'archiveCiphertextSha256', 'codeHashes', 'nodeVersion', *TRUE_FLAGS, *FALSE_FLAGS])
    require(receipt['schema'] == 1 and receipt['keyId'] == policy['keyId']
            and receipt['keyFingerprint'] == policy['keyFingerprint'] and receipt['nodeVersion'] == node
            and all(receipt[k] is True for k in TRUE_FLAGS) and all(receipt[k] is False for k in FALSE_FLAGS))
    require(all(re.fullmatch('[0-9a-f]{64}', receipt[k]) for k in
                ['keyFingerprint', 'ciphertextSha256', 'restoredSha256', 'archiveCiphertextSha256']))
    require(isinstance(receipt['checkedAtUtc'], str) and len(receipt['checkedAtUtc']) <= 40
            and re.fullmatch(r'\d{4}-\d\d-\d\dT[0-9:.]+Z', receipt['checkedAtUtc']))
    require(receipt['context'] == {'project': 'livepalmes', 'repository': REPO, 'kind': 'production-code',
                                   'candidate': run['head_sha'], 'runId': run_id})
    require(receipt['codeHashes'] == {file: sha(blobs[file]) for file in FILES})
    return {'schema': 1, 'keyId': policy['keyId'], 'keyFingerprint': policy['keyFingerprint'],
            'source': {'run': run_id, 'head': run['head_sha'], 'artifact': artifact_id,
                       'digest': metadata['digest'], 'workflow': WORKFLOW, 'memberSha256': sha(raw)},
            'receipt': receipt}


def main(argv):
    require(len(argv) == 1 and re.fullmatch('[1-9][0-9]*', argv[0]))
    require(not (ROOT / OUTPUT).exists())
    qualified = qualify(int(argv[0]))
    with (ROOT / OUTPUT).open('x', encoding='utf-8', newline='\n') as output:
        output.write(json.dumps(qualified, ensure_ascii=False, indent=2) + '\n')
    print('Qualification fictive authentifiee ; recu public cree, aucune cle ou archive reelle lue.')


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except Exception:
        print('Qualification sauvegarde code refusee ; aucun contenu distant affiche.', file=sys.stderr)
        sys.exit(1)
