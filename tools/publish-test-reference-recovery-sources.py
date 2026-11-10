"""Closed recovery of one interrupted TEST release; no business invocation."""
import copy
import importlib.util
import json
from pathlib import Path
import re
import sys
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('club_recovery_primitives', ROOT / 'tools/publish-test-reference-cleanup-sources.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
ORIGINAL = p.contract()
BASE_ALLOWED, BASE_BINDINGS = p.ALLOWED, p.BINDING_FUNCTIONS
RELEASE = 'club_reference_cleanup_recovery'
CONTRACT_SHA256 = '768663bc7880f4c01082d71719bcd02a622a3e57b3ab6b6c509ba9963c5f5ea2'
ORIGIN = {'id': 42851355935, 'job': 129952591495,
    'candidate': '76cada556cec27f96ee48a23cbab0711a5f828cb',
    'contractSha256': 'ecce557a8898b7906e1dea8cce6775cec14318441ab893b29bc4c2b070871d45',
    'artifactId': 13782374193, 'artifactName': 'test-mail-failure-diagnostic',
    'artifactSha256': '84ef7346ba0d61e27a8239eca02f1fd0af0c1b9418ffe47c61d4c5d048413e73'}
PENDING = frozenset({'disableCompetitionEmailNotifications', 'resolveEngagementAccessRequest',
    'submitEngagementAccessRequest', 'syncEngagementMailRecipientIndex',
    'updateCurrentEmailNotificationPreferences', 'updateEngagementAutomaticMailControl', 'verifyPin'})
HISTORICAL_BINDINGS = BASE_BINDINGS - {'syncEngagementMailRecipientIndex'}
cycle, require, publisher = p.cycle, p.require, p.publisher
p.RELEASE = RELEASE
p.CONTRACT = ROOT / '.github/releases/evidence/20261110-club-reference-recovery-contract.json'
p.CONTRACT_SHA256 = CONTRACT_SHA256
p.BINDING_FUNCTIONS = frozenset({'syncEngagementMailRecipientIndex'})
publisher.DIGEST = CONTRACT_SHA256
_contract, _raw_request = p.contract, p._request


def contract():
    entry = _contract()
    require(entry.get('originalRun') == ORIGIN and set(entry['allowedFunctions']) == BASE_ALLOWED
            and set(entry.get('pendingFunctions', [])) == PENDING
            and set(entry.get('publishedFunctions', [])) == BASE_ALLOWED - PENDING
            and set(entry.get('historicalNapBindingFunctions', [])) == HISTORICAL_BINDINGS
            and entry['fingerprints'] == ORIGINAL['fingerprints']
            and entry['applicationCommit'] == ORIGINAL['applicationCommit']
            and entry['baselineRuns'] == ORIGINAL['baselineRuns']
            and entry['baseCommit'] == ORIGINAL['baseCommit'], 'Contrat de reprise elargi')
    return entry


def canonical_metadata(row):
    """Event filters are unordered in this API; retain every full entry/duplicate."""
    result = copy.deepcopy(row)
    filters = result.get('eventTrigger', {}).get('eventFilters')
    if filters is not None:
        require(isinstance(filters, list) and all(isinstance(item, dict) for item in filters),
                'Filtres Eventarc de reprise invalides')
        result['eventTrigger']['eventFilters'] = sorted(filters, key=lambda item: json.dumps(item, sort_keys=True))
    return result


def canonical_request(url, method='GET', body=None):
    result = _raw_request(url, method, body)
    if method == 'GET' and url.startswith(publisher.state.API + p.PREFIX):
        return canonical_metadata(result)
    return result


p.contract = contract
p._request = canonical_request


def source_run(info, conclusion, candidate):
    return (info.get('head_sha') == candidate and info.get('head_branch') == 'main'
        and info.get('path') == publisher.WORKFLOW and info.get('event') == 'workflow_dispatch'
        and info.get('run_attempt') == 1 and info.get('status') == 'completed'
        and info.get('conclusion') == conclusion
        and info.get('repository', {}).get('full_name') == p.REPOSITORY
        and info.get('head_repository', {}).get('full_name') == p.REPOSITORY)


def original_diagnostic(directory, api=cycle):
    """Authenticate the failed attempt; it is a diagnostic, never a success proof."""
    destination = Path(directory) / 'interrupted-run'
    info = api.artifact(ORIGIN['id'], ORIGIN['artifactName'], destination)
    require(info.get('id') == ORIGIN['id'] and source_run(info, 'failure', ORIGIN['candidate']),
            'Origine de reprise non authentifiee')
    artifact = api.gh(f'repos/{p.REPOSITORY}/actions/artifacts/{ORIGIN["artifactId"]}')
    require(artifact.get('id') == ORIGIN['artifactId'] and artifact.get('name') == ORIGIN['artifactName']
            and artifact.get('workflow_run', {}).get('id') == ORIGIN['id']
            and artifact.get('digest') == 'sha256:' + ORIGIN['artifactSha256']
            and artifact.get('expired') is False, 'Diagnostic de reprise hors empreinte')
    jobs = api.gh(f'repos/{p.REPOSITORY}/actions/runs/{ORIGIN["id"]}/jobs?per_page=100')['jobs']
    require(len(jobs) == 1 and jobs[0].get('id') == ORIGIN['job'], 'Job de reprise ambigu')
    steps = {step['name']: step.get('conclusion') for step in jobs[0]['steps']}
    require(steps.get('Authentifier les preuves et constater les preconditions deja satisfaites') == 'success'
            and steps.get('Publier seulement les sources calculees et autorisees') == 'failure'
            and steps.get('Verifier revisions et preservation de tous les etats') == 'skipped',
            'Etapes du run interrompu incompatibles')
    logs = publisher.closed_run_logs(ORIGIN['job'])
    names = re.findall(r'Source TEST actualisee : ([A-Za-z0-9]+)', logs)
    require(len(names) == len(set(names)) == 114 and set(names) == BASE_ALLOWED - PENDING
            and 'ValueError: Configuration modifiee avant raccordement NAP : syncEngagementMailRecipientIndex' in logs,
            'Trace de reprise incompatible')
    result = api.read(destination / 'failure-diagnostic.json')
    require(result.get('candidate') == ORIGIN['candidate'] and str(result.get('runId')) == str(ORIGIN['id'])
            and result.get('release') == 'club_reference_cleanup'
            and result.get('successProof') is False and result.get('outcome') == 'failure-diagnostic-only'
            and result.get('plan', {}).get('candidate') == ORIGIN['candidate']
            and result.get('plan', {}).get('release') == 'club_reference_cleanup'
            and result.get('plan', {}).get('contractSha256') == ORIGIN['contractSha256']
            and len(result['plan'].get('selected', [])) == 121
            and set(result['plan']['selected']) == BASE_ALLOWED
            and set(result.get('beforeFunctionWitnesses', {})) == {p.PREFIX + name for name in BASE_ALLOWED},
            'Diagnostic incomplet ou fausse preuve de succes')
    return result


def native_binding(rows, account):
    for name in p.BINDING_READERS:
        config = rows[name].get('serviceConfig', {})
        if config.get('serviceAccountEmail') != account:
            continue
        for binding in config.get('secretEnvironmentVariables', []):
            if p.valid_binding(binding):
                return binding
    raise ValueError('Compte de reprise sans reference NAP preexistante')


def baseline_configuration(row, expected, rows, historical):
    if not historical:
        require(publisher.configuration_identity(row) == expected, 'Configuration de reprise modifiee : ' + row['name'])
        return None
    result = copy.deepcopy(row)
    config = result['serviceConfig']
    bindings = config.get('secretEnvironmentVariables', [])
    added = [binding for binding in bindings if binding.get('key') == 'LIVEPALMES_NAP_PASSWORD']
    require(len(added) == 1 and added[0] == native_binding(rows, config.get('serviceAccountEmail')),
            'Binding historique de reprise different')
    config['secretEnvironmentVariables'] = [binding for binding in bindings if binding not in added]
    identities = {publisher.configuration_identity(result)}
    if not config['secretEnvironmentVariables']:
        del config['secretEnvironmentVariables']
        identities.add(publisher.configuration_identity(result))
    require(expected in identities, 'Configuration historique hors des cinq bindings autorises')
    return copy.deepcopy(added[0])


def inspect_partial(before, diagnostic):
    rows = {row['name'].split('/')[-1]: row for row in before}
    require(set(rows) == BASE_ALLOWED, 'Inventaire de reprise hors des 121 fonctions')
    historical = {}
    for name, row in rows.items():
        publisher.runtime(row, name)
        witness = diagnostic['beforeFunctionWitnesses'][row['name']]
        if name in PENDING:
            require(publisher.digest(row) == witness['functionSha256'], 'Fonction restante modifiee : ' + name)
        else:
            require(row.get('labels', {}).get('livepalmes-commit') == ORIGIN['candidate']
                    and row['serviceConfig'].get('revision') != witness['revision']
                    and row.get('updateTime') != witness['updateTime'], 'Revision partielle inconnue : ' + name)
        binding = baseline_configuration(row, witness['configurationSha256'], rows, name in HISTORICAL_BINDINGS)
        if binding:
            historical[name] = binding
    require(set(historical) == HISTORICAL_BINDINGS, 'Bindings historiques incomplets')
    return rows, historical


def recover_archives(candidate, sha, before, diagnostic):
    rows = {row['name'].split('/')[-1]: row for row in before}
    archives = diagnostic['plan']['archives']
    names = [name for archive in archives for name in archive['names']]
    require(len(names) == len(set(names)) == 121 and set(names) == BASE_ALLOWED, 'Archives interrompues hors selection')
    uploaded = diagnostic['uploadedSources']
    require(set(uploaded) <= BASE_ALLOWED and BASE_ALLOWED - PENDING <= set(uploaded), 'Recus des sources partielles incomplets')
    recovered = {}
    for archive in archives:
        members = set(archive['names'])
        recorded = members.intersection(uploaded)
        require(not recorded or recorded == members, 'Recu partiel dans une archive')
        if not recorded:
            continue
        require(all(uploaded[name]['archiveSha256'] == archive['sha256'] for name in recorded), 'Empreinte upload interrompu differente')
        keys = {secret['key'] for name in members for secret in rows[name].get('serviceConfig', {}).get('secretEnvironmentVariables', [])}
        if members.intersection(BASE_BINDINGS):
            keys.add('LIVEPALMES_NAP_PASSWORD')
        data = publisher.archive_helper.test_archive(candidate, sha, keys, sorted(members))
        for name in sorted(members - PENDING):
            evidence = publisher.attest_source(rows[name], data)
            # Managed archives may have different ZIP metadata/compression. The
            # existing attestor compares every path and file byte, not ZIP mtime.
            evidence['originalUploadArchiveSha256'] = uploaded[name]['archiveSha256']
            evidence['originalUploadZipBytesIdentical'] = evidence['archiveSha256'] == uploaded[name]['archiveSha256']
            recovered[name] = evidence
    require(set(recovered) == BASE_ALLOWED - PENDING, 'Attestation des 114 archives incomplete')
    return recovered


def prepare(directory, candidate):
    entry = contract()
    sha = p.guard(candidate, entry)
    evidence = publisher.load('club_recovery_ci', 'test-verification-evidence.py')
    require(evidence.reusable(sha, directory / 'application')
            and evidence.reusable(sha, directory / 'publication', 'publication-offline-v1'), 'CI main exacte non confirmee')
    publisher.credential_identity()
    baseline = publisher.baseline(entry, directory)
    require(not cycle.run(['git', 'diff', '--name-only', ORIGIN['candidate'], sha, '--', 'functions/'], candidate),
            'Sources applicatives differentes pendant la reprise')
    diagnostic = original_diagnostic(directory)
    before, witness = publisher.inventory(), publisher.controls()
    # Keep technical hashes available to the existing failure diagnostic even if
    # the subsequent strict comparison stops before any archive/upload.
    cycle.write(directory / 'before.json', before)
    cycle.write(directory / 'controls.json', witness)
    require(witness == diagnostic['controlsWitness'], 'Etats techniques modifies depuis le run interrompu')
    snapshot = cycle.snapshot(p.PROJECT)
    require(snapshot['hosting'] == baseline['hosting'] and snapshot['functions'] == publisher.compact(before), 'Etat TEST instable ou Hosting modifie')
    rows, historical = inspect_partial(before, diagnostic)
    selected = p.select(before, sha, entry)
    require(set(selected) == PENDING and len(selected) == 7, 'Selection calculee de reprise differente des sept fonctions')
    recovered = recover_archives(candidate, sha, before, diagnostic)
    require(publisher.inventory() == before and publisher.controls() == witness, 'Derive pendant attestation partielle')
    cycle.write(directory / 'hosting.json', snapshot['hosting'])
    cycle.write(directory / 'recovered.json', {'managedSources': recovered, 'historicalBindings': historical,
        'originalRun': ORIGIN, 'metadataSha256': {name: publisher.digest(row) for name, row in rows.items()}})
    groups = {}
    for name in selected:
        keys = tuple(sorted(secret['key'] for secret in rows[name].get('serviceConfig', {}).get('secretEnvironmentVariables', [])))
        groups.setdefault(keys, []).append(name)
    plans = []
    for index, (keys, names) in enumerate(groups.items()):
        data = publisher.archive_helper.test_archive(candidate, sha, keys, sorted(names))
        filename = f'source-{index}.zip'
        (directory / filename).write_bytes(data)
        plans.append({'file': filename, 'sha256': p.hashlib.sha256(data).hexdigest(), 'names': sorted(names)})
    cycle.write(directory / 'plan.json', {'candidate': sha, 'release': RELEASE, 'contractSha256': CONTRACT_SHA256,
        'selected': selected, 'archives': plans})
    print('Reprise attestee : 114 sources conservees ; sept mises a jour calculees ; un binding NAP restant.', flush=True)


def finish(directory):
    proof = cycle.read(directory / 'test-backend-proof.json')
    recovered = cycle.read(directory / 'recovered.json')
    require(recovered['originalRun'] == ORIGIN and set(proof['selected']) == PENDING, 'Recu de reprise different du plan')
    current = proof['currentTestState']['functions']
    require({row['name'] for row in current} == {p.PREFIX + name for name in BASE_ALLOWED}, 'Etat final incomplet')
    for row in current:
        name = row['name'].split('/')[-1]
        expected = proof['candidate'] if name in PENDING else ORIGIN['candidate']
        require(row['commit'] == expected, 'Commit reel de reprise incoherent')
    proof.update(originalInterruptedRun=ORIGIN, recoveredSelected=sorted(BASE_ALLOWED - PENDING),
        state={'functions': current}, managedSources={**recovered['managedSources'], **proof['managedSources']},
        addedNapBindings={**recovered['historicalBindings'], **proof['addedNapBindings']},
        bindingsAddedInThisRun=proof['addedNapBindings'], recoveredFunctionsUnchangedDuringResume=True,
        originalFullMetadataAvailable=False, originalWritableConfigurationsVerified=True,
        originalNonCommitLabelEqualityReconstructed=False, originalDiagnosticIsSuccessProof=False)
    require(set(proof['managedSources']) == BASE_ALLOWED and set(proof['addedNapBindings']) == BASE_BINDINGS,
            'Preuve combinee de reprise incomplete')
    cycle.write(directory / 'test-backend-proof.json', proof)


def main(mode, release, directory, candidate):
    require(release == RELEASE and mode in {'prepare', 'deploy', 'verify', 'diagnostic'}, 'Mode de reprise interdit')
    directory, candidate = Path(directory).resolve(), Path(candidate).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    if mode == 'prepare':
        prepare(directory, candidate)
    else:
        p.main(mode, release, directory, candidate)
        if mode == 'verify':
            finish(directory)


def trusted_revisions(directory, current, api):
    relevant = [row for row in current.get('functions', []) if row.get('name') in {p.PREFIX + name for name in BASE_ALLOWED}]
    if not relevant:
        return set()
    entry, trusted = contract(), set()
    runs = api.gh(f'repos/{p.REPOSITORY}/actions/workflows/livepalmes-test-mail-sources.yml/runs?branch=main&per_page=20')['workflow_runs']
    for info in runs:
        if info.get('status') != 'completed' or info.get('conclusion') != 'success' or info.get('run_attempt') != 1:
            continue
        if not any(row.get('commit') == info.get('head_sha') for row in relevant):
            continue
        try:
            destination = Path(directory) / ('club-recovery-' + str(info['id']))
            source = api.artifact(info['id'], 'test-backend-proof', destination, publisher.WORKFLOW)
            require(source.get('id') == info['id'] and source_run(source, 'success', info['head_sha']), 'Origine du recu de reprise invalide')
            proof = api.read(destination / 'test-backend-proof.json')
            require(proof.get('schema') == 1 and proof.get('candidate') == info['head_sha']
                    and proof.get('release') == RELEASE and proof.get('contractSha256') == CONTRACT_SHA256
                    and proof.get('applicationAnchor') == entry['applicationCommit']
                    and proof.get('baselineRun') == entry['baselineRuns'][0]['id']
                    and proof.get('originalInterruptedRun') == ORIGIN, 'Recu de reprise hors contrat')
            names, old = proof.get('selected', []), proof.get('recoveredSelected', [])
            require(len(names) == 7 and set(names) == PENDING and len(old) == 114 and set(old) == BASE_ALLOWED - PENDING,
                    'Selection de reprise differente')
            rows = proof.get('state', {}).get('functions', [])
            require(len(rows) == 121 and {row.get('name') for row in rows} == {p.PREFIX + name for name in BASE_ALLOWED}
                    and all(row.get('commit') == (proof['candidate'] if row['name'].split('/')[-1] in PENDING else ORIGIN['candidate']) for row in rows),
                    'Versions reelles de reprise differentes')
            desired = api.test_backend_fingerprints(proof['candidate'])
            require(all(desired.get(name) == entry['fingerprints'][name] for name in BASE_ALLOWED), 'Empreintes de reprise differentes')
            changes, added = proof.get('addedNapBindings', {}), proof.get('bindingsAddedInThisRun', {})
            controls = proof.get('controlsBefore')
            require(set(changes) == BASE_BINDINGS and set(added) == {'syncEngagementMailRecipientIndex'}
                    and all(p.valid_binding(value) for value in changes.values())
                    and added['syncEngagementMailRecipientIndex'] == changes['syncEngagementMailRecipientIndex']
                    and proof.get('configurationsUnchanged') is False
                    and all(proof.get(key) is True for key in ['configurationsUnchangedExceptApprovedNapBindings', 'otherFunctionsUnchanged',
                        'hostingUnchanged', 'controlsUnchanged', 'recoveredFunctionsUnchangedDuringResume', 'originalWritableConfigurationsVerified'])
                    and proof.get('taskContentsRead') is False and proof.get('originalDiagnosticIsSuccessProof') is False
                    and proof.get('originalFullMetadataAvailable') is False and proof.get('originalNonCommitLabelEqualityReconstructed') is False
                    and isinstance(controls, dict) and controls == proof.get('controlsAfter')
                    and controls.get('mailEnabled') is False and controls.get('schedulerSuspended') is True and controls.get('queuePaused') is True,
                    'Garde de reprise absent')
            managed = proof.get('managedSources', {})
            require(set(managed) == BASE_ALLOWED and all(value.get('allPathsAndFileBytesIdentical') is True
                    and value.get('generationReadAndReferencesRechecked') is True
                    and re.fullmatch('[a-f0-9]{64}', value.get('archiveSha256', ''))
                    and re.fullmatch('[a-f0-9]{64}', value.get('archiveIdentity', ''))
                    and value.get('storageSource', {}).get('bucket') == 'gcf-v2-sources-206080168534-europe-west1'
                    and value['storageSource'].get('object') == name + '/function-source.zip'
                    and re.fullmatch('[1-9][0-9]*', str(value['storageSource'].get('generation', '')))
                    for name, value in managed.items()), 'Archives de reprise non attestees')
            trusted.update(api.matching_functions({'state': {'functions': rows}}, current))
        except (ValueError, KeyError, TypeError, publisher.subprocess.CalledProcessError, urllib.error.HTTPError) as error:
            print(f"Recu de reprise {info['id']} non reutilisable : {error}")
    return trusted


if __name__ == '__main__':
    main(*sys.argv[1:])
