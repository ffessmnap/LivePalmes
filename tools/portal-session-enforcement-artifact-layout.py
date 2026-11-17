"""Read exactly one authenticated Hosting ZIP with one recorded diagnostic path."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT/'.github/releases/evidence/20261117-session-enforcement-hosting-artifact-layout.json'
DIGEST = '7ace159311c61c59d42bec9d147b50d69a61aff397721ad76a2215793cb4b9ca'


def require(value, message):
    if not value: raise ValueError(message)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def layout():
    raw = PATH.read_bytes().replace(b'\r\n', b'\n')
    require(sha(raw) == DIGEST, 'Description du seul artefact Hosting B modifiee')
    value = json.loads(raw)
    require(value['run'] == 44120289139 and value['artifactId'] == 14344399374
            and value['artifactName'] == 'production-hosting-after' and len(value['members']) == 6
            and {name for name in value['members'] if '/' in name} == {'release-plan/completion-rules-observed-after.json'}
            and all(row['output'] == Path(name).name and '/' not in row['output'] and '\\' not in row['output']
                    for name, row in value['members'].items())
            and len({r['output'] for r in value['members'].values()}) == 6, 'Disposition Hosting B inconnue')
    return value


def artifact(run, name, destination, workflow=None, *, gh, download=None):
    value = layout(); repo = value['repository']
    require(os.environ.get('GITHUB_REPOSITORY') == repo == 'ffessmnap/LivePalmes'
            and str(run) == str(value['run']) and name == value['artifactName']
            and workflow in {None, value['workflow']}, 'Lecture speciale hors artefact Hosting B ferme')
    info = gh(f'repos/{repo}/actions/runs/{run}')
    require(info['status'] == 'completed' and info['conclusion'] == 'success' and info['run_attempt'] == 1
            and info['head_branch'] == 'main' and info['event'] == 'workflow_dispatch'
            and info['head_sha'] == value['head'] and info['path'] == value['workflow'], 'Run Hosting B incompatible')
    items = gh(f'repos/{repo}/actions/runs/{run}/artifacts?per_page=100')
    candidates = [a for a in items['artifacts'] if a['name'] == name and not a['expired']]
    require(items['total_count'] < 100 and len(candidates) == 1 and candidates[0]['id'] == value['artifactId'],
            'Artefact Hosting B absent expire ou ambigu')
    meta = gh(f'repos/{repo}/actions/artifacts/{value["artifactId"]}')
    require(meta['workflow_run']['id'] == int(run) and meta['id'] == value['artifactId'] and meta['name'] == name
            and meta['expired'] is False and meta['digest'] == value['artifactDigest'], 'Provenance Hosting B alteree')
    raw = (download or (lambda: subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/artifacts/{value["artifactId"]}/zip'])))()
    require(len(raw) < 1024**2 and 'sha256:'+sha(raw) == value['artifactDigest'], 'ZIP Hosting B altere')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        members = archive.infolist()
        require(len(members) == 6 and {f.filename for f in members} == set(value['members'])
                and all(not f.is_dir() for f in members) and sum(f.file_size for f in members) < 1024**2,
                'Chemins Hosting B hors disposition fermee')
        files = {}
        for member in members:
            expected = value['members'][member.filename]; data = archive.read(member)
            require(len(data) == expected['bytes'] and sha(data) == expected['sha256'], 'Fichier Hosting B altere')
            files[expected['output']] = data
    hosting = json.loads(files['production-hosting-after.json'])
    rules = json.loads(files['production-session-enforcement-rules-after.json'])
    require(hosting == value['hosting'] and rules['candidate'] == value['candidate']
            and rules['contractSha256'] == value['originalRulesContractSha256'] and rules['after'] == value['rulesAfter']
            and rules['result'] == 'success' and rules['readOnly'] is True, 'Contenu de preuve Hosting B incompatible')
    destination = Path(destination)
    # Validate everything before writing; preserve every original file byte.
    for output, data in files.items():
        target = destination/output
        require(not target.exists() or target.read_bytes() == data, 'Destination de preuve Hosting B deja differente')
    destination.mkdir(parents=True, exist_ok=True)
    for output, data in files.items(): (destination/output).write_bytes(data)
    return info
