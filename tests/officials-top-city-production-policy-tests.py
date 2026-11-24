"""Offline regression tests for the closed officials and TOP city PROD plan."""
from copy import deepcopy
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def import_tool(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = import_tool('officials-top-city-production-policy.py')
router = import_tool('production-source-policy.py')


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.fixed = policy.contract()
        self.request = {key: self.fixed[key] for key in policy.REFERENCE_FIELDS}
        self.request.update(schema=1, freezeTestCandidate=True, changes=[], standardSources={
            'schema': 2, 'productionRun': self.fixed['productionRun'],
            'functions': self.fixed['allowedFunctions'], 'approval': self.fixed['approval'],
            policy.MARKER: policy.CONTRACT_SHA256})

    def test_only_the_closed_adapter_can_select_the_protected_resolver(self):
        self.assertEqual(router.for_request(self.request).approved(self.request), policy.FUNCTIONS)
        self.assertNotIn('resolveEngagementSwimmerChangeRequest', policy.v2.eligible())
        for field, value in [('functions', policy.FUNCTIONS[:-1]),
                             ('functions', policy.FUNCTIONS+['exportNapPublicPage']),
                             ('approval', {**self.fixed['approval'], 'text': 'TEST only'}),
                             ('schema', 2.0),
                             ('productionRun', self.fixed['productionRun']+1),
                             (policy.MARKER, '0'*64)]:
            with self.subTest(field=field):
                request = deepcopy(self.request)
                request['standardSources'][field] = value
                with self.assertRaises(ValueError):
                    router.for_request(request)
        for key in policy.REFERENCE_FIELDS:
            with self.subTest(key=key), self.assertRaises(ValueError):
                policy.approved({**self.request, key: 'other'})

    def test_only_the_exact_top_route_can_change_in_index(self):
        def git(*args):
            if args[0] == 'diff':
                if '--name-only' in args:
                    return '\n'.join(self.fixed['changedPaths'])
                return f'--- a/{policy.INDEX}\n+++ b/{policy.INDEX}\n- {policy.OLD_ROUTE}\n+ {policy.NEW_ROUTE}'
            ref = args[-1]
            if ref.endswith(':'+policy.INDEX):
                return self.fixed['indexBefore'] if ref.startswith(self.fixed['productionCommit']) else self.fixed['indexAfter']
            return 'same-blob'

        policy.paths(self.request, self.fixed['changedPaths'], git)
        with self.assertRaisesRegex(ValueError, 'Autre changement'):
            policy.paths(self.request, self.fixed['changedPaths'],
                         lambda *args: git(*args)+'\n+extra' if '--unified=0' in args else git(*args))
        with self.assertRaisesRegex(ValueError, 'Configuration hors contrat'):
            policy.paths(self.request, self.fixed['changedPaths'],
                         lambda *args: args[-1] if args[-1].endswith(':firebase.json') else git(*args))
        with self.assertRaisesRegex(ValueError, 'Diff complet'):
            policy.paths(self.request, self.fixed['changedPaths'][:-1], git)

    def test_resolver_can_change_source_and_label_but_never_a_binding(self):
        name = 'resolveEngagementSwimmerChangeRequest'
        before = {'name': policy.PREFIX+name, 'state': 'ACTIVE', 'environment': 'GEN_2', 'updateTime':'before',
                  'buildConfig': {'runtime':'nodejs22', 'entryPoint':name,
                                  'source':{'storageSource':{'generation':'1'}}},
                  'serviceConfig': {'revision':'old', 'serviceAccountEmail':'existing@example.invalid',
                                    'secretEnvironmentVariables':[{'key':'EXISTING', 'secret':'EXISTING', 'version':'1'}]},
                  'labels': {'livepalmes-commit': self.fixed['productionCommit'], 'other':'kept'}}
        after = deepcopy(before)
        after['buildConfig']['source']['storageSource']['generation'] = '2'
        after['labels']['livepalmes-commit'] = self.fixed['candidate']
        after['updateTime'] = 'after'
        after['serviceConfig']['revision'] = 'new'
        policy.assert_selected(before, after, self.fixed['candidate'])
        after['serviceConfig']['secretEnvironmentVariables'][0]['version'] = '2'
        with self.assertRaisesRegex(ValueError, 'Configuration, binding'):
            policy.assert_selected(before, after, self.fixed['candidate'])

    def test_manifest_rejects_inventory_drift_and_configuration_edits(self):
        names = policy.FUNCTIONS + [f'kept{i}' for i in range(111)]
        rows = [{'name':policy.PREFIX+n, 'state':'ACTIVE', 'revision':f'rev{i}',
                 'updateTime':'fixture', 'commit':self.fixed['productionCommit']} for i, n in enumerate(names)]
        fixed = {**self.fixed, 'originsSha256':policy.digest([{k:r[k] for k in policy.ORIGIN_FIELDS} for r in rows])}
        fields = (*policy.REFERENCE_FIELDS, 'productionRun', 'approval', 'inventoryCount', 'staticPaths')
        manifest = {k:fixed[k] for k in fields}
        manifest.update(schema=2, kind=policy.KIND, selected=policy.FUNCTIONS, origins=rows, newFunctions=[],
                        deletedFunctions=[], configurationChanges=False, bindingChanges=False, mailPause=False,
                        businessInvocations=0)
        with patch.object(policy, 'contract', return_value=fixed):
            self.assertEqual(policy.validate_manifest(manifest), manifest)
            for key, value in [('configurationChanges', True), ('bindingChanges', True), ('mailPause', True),
                               ('businessInvocations', 1), ('selected', policy.FUNCTIONS[:-1])]:
                with self.subTest(key=key), self.assertRaises(ValueError):
                    policy.validate_manifest({**manifest, key:value})
            corrupted = deepcopy(manifest)
            corrupted['origins'][0]['revision'] = 'unexpected'
            with self.assertRaisesRegex(ValueError, 'Origines PROD'):
                policy.validate_manifest(corrupted)

    def test_resume_is_refused_before_any_policy_reads(self):
        with TemporaryDirectory() as tmp:
            directory = Path(tmp)
            (directory/'previous').mkdir()
            with self.assertRaisesRegex(ValueError, 'Reprise officiels/TOP'):
                policy.guard(directory)


if __name__ == '__main__':
    unittest.main()
