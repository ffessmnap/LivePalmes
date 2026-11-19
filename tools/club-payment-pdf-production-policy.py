"""Immutable source-only release of the clickable club payment link."""
import importlib.util
import json
import os
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# The isolated module uses the common source, inventory, archive and mail checks.
spec = importlib.util.spec_from_file_location('club_payment_sources', ROOT / 'tools/organizer-fees-production-policy.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
OPTION = policy.OPTION = 'clubPaymentPdfRelease'
KIND = policy.KIND = 'club-payment-pdf-existing-sources-v1'
DIGEST = policy.DIGEST = 'bdb9dfb123255714af4a11b103d35dbd19d175d8c7df5fb83f0f8a907411308a'
policy.CONTRACT = ROOT / '.github/releases/evidence/20261119-production-club-helloasso-pdf-contract.json'

contract, enabled, approved, paths = policy.contract, policy.enabled, policy.approved, policy.paths
freeze, manifest, validate_manifest = policy.freeze, policy.manifest, policy.validate_manifest
require, digest, configuration = policy.require, policy.digest, policy.configuration
initial, assert_retained, assert_selected = policy.initial, policy.assert_retained, policy.assert_selected


def state_check(backup, destination, success):
    return policy.state_check(backup, destination, success, contract_field='clubPaymentPdfContractSha256')


# Only the examined attempt may finish Hosting after a fresh read of every selected archive.
SOURCE_RUN = policy.SOURCE_RUN = '44510827264'
SOURCE_TOOLING = policy.SOURCE_TOOLING = '73766df166512aadd1ad4210761e223bd300339b'
policy.SOURCE_ARTIFACTS = {
    'production-after': 'sha256:d4502d92b6895da5e14f4e45f273e5e0b5e9cd3333853bbf2a84d4489dc526fa',
    'production-idf-preservation': 'sha256:0dc50a38e4faff33d28c3392d40ef6b78bb55f267199d5b5438c9202fc063ebb',
    'production-code-backup': 'sha256:134c68bfb0d5b0334ac40dabcb892c9c38427f0ac724e3ae74565a5593692be1',
    'release-plan': 'sha256:97ba6599b38e56f30b5087553586ebff43bfdb9f0cbe5d548774a0abe20df772',
    'isolated-production-inputs': 'sha256:b1b93002802590222fe7e409c9f5e3391d1cebd6daa8cfe98c6391a5085657ac',
}
guard = policy.guard
qualify_hosting_only = policy.qualify_hosting_only
read = policy.read


def restore_witness(directory, source):
    directory, source = Path(directory), Path(source)
    require(os.environ.get('RESUME') == SOURCE_RUN and source == directory / 'previous/standard-guards',
            'Tentative de reprise du PDF club differente')
    value = manifest(directory)
    before = source / 'standard-controls-before.json'
    require(read(source / 'standard-source-manifest.json') == value
            and read(before) == read(source / 'standard-controls-after.json') == value['controls']
            and not (source / 'standard-source-receipts.json').exists(), 'Temoins initiaux du PDF club differents')
    after = read(directory / 'previous/production-after.json')
    actual = {row['name']: row for row in after['functions']}
    require(after['errors'] == [] and after['candidate'] == value['candidate']
            and after['clubPaymentPdfContractSha256'] == DIGEST
            and len(actual) == len(after['functions']) == value['inventoryCount']
            and set(actual) == {row['name'] for row in value['origins']}, 'Inventaire initial du PDF club different')
    selected = {policy.PREFIX + name for name in value['selected']}
    for row in value['origins']:
        observed = actual[row['name']]
        require(observed['state'] == 'ACTIVE' and
                ((observed['revision'] != row['revision'] and observed['updateTime'] != row['updateTime'])
                 if row['name'] in selected else observed == {k: row[k] for k in ('name','revision','updateTime','state')}),
                'Revision initiale hors perimetre')
    (directory / before.name).write_bytes(before.read_bytes())


def verify_installed_archives(root, backup, state):
    value = manifest(root)
    require(os.environ.get('RESUME') == SOURCE_RUN and read(root / 'standard-organizer-hosting-only.json') == {
        'sourceRun': int(SOURCE_RUN), 'candidate': value['candidate'], 'manifestSha256': digest(value), 'sourceWrites': 0},
        'Reprise du PDF club non qualifiee')
    source = read(Path(os.environ['RUNNER_TEMP']) / 'code-backup-source.json')
    require(source['chainVerified'] is True and source['candidate'] == value['candidate']
            and source['originRun'] == source['sourceRun'] == int(SOURCE_RUN) and source['sourceHead'] == SOURCE_TOOLING
            and read(backup / 'standard-source-manifest.json') == value, 'Sauvegarde initiale du PDF club differente')
    saved = read(backup / 'functions.json')
    initial(saved, value)
    before = {f['name']: f for f in saved}
    observed = state.inventory()
    current = {f['name']: f for f in observed}
    previous = {f['name']: f for f in read(root / 'previous/production-after.json')['functions']}
    require(len(current) == len(observed) == value['inventoryCount']
            and {name: state.identity(f) for name, f in current.items()} == previous, 'Derive depuis la tentative')
    selected = {policy.PREFIX + name for name in value['selected']}
    assert_retained(before, current, selected, state)
    guard(root)
    data = policy.common.load('publish-approved-pdf-functions.py').archive(
        Path(os.environ['CANDIDATE_DIRECTORY']), value['candidate'])
    attest = policy.common.load('standard-source-publish.py').attest
    receipts = {}
    for name in sorted(selected):
        assert_selected(before[name], current[name], value['candidate'])
        for attempt in range(3):
            try:
                receipts[name] = attest(current[name], data, state)
                break
            except subprocess.CalledProcessError as error:
                if attempt == 2 or error.cmd != ['gcloud', 'auth', 'application-default', 'print-access-token']:
                    raise
                time.sleep(2 ** attempt)
    guard(root)
    (root / 'standard-source-receipts.json').write_text(json.dumps({
        'candidate': value['candidate'], 'manifestSha256': digest(value), 'functions': receipts}, indent=2))
