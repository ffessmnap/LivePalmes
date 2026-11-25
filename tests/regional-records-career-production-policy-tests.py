"""Fail-closed tests for the exact regional records and public swimmer PROD plan."""
from copy import deepcopy
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


policy = load('regional-records-career-production-policy.py')
router = load('production-source-policy.py')


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.fixed = policy.contract()
        self.request = {key: self.fixed[key] for key in policy.REFERENCE_FIELDS}
        self.request.update(schema=1, freezeTestCandidate=True, changes=[], standardSources={
            'schema': 2, 'productionRun': self.fixed['productionRun'],
            'functions': self.fixed['allowedFunctions'], 'approval': self.fixed['approval'],
            policy.MARKER: policy.CONTRACT_SHA256})
        self.allowlist = 'if (!'+policy.OLD_ACTIONS+' "top"].includes(action)) throw new TypeError("Action invalide.");'

    def git(self, *args):
        if args[0] == 'diff':
            if '--name-only' in args:
                return '\n'.join(self.fixed['changedPaths'])
            return ('- '+self.allowlist+'\n+ '+self.allowlist.replace(policy.OLD_ACTIONS, policy.NEW_ACTIONS, 1)
                    +'\n+ '+policy.NEW_ROUTE)
        ref = args[-1]
        if ref.endswith(':'+policy.INDEX):
            return self.fixed['indexBefore'] if ref.startswith(self.fixed['productionCommit']) else self.fixed['indexAfter']
        return 'same-blob'

    def test_exact_candidate_authority_and_only_existing_reader(self):
        self.assertEqual(router.for_request(self.request).approved(self.request), ['readNapPublicSwimmer'])
        for field, value in [('functions', []), ('functions', ['readNapPublicSwimmer', 'exportNapPublicPage']),
                             ('approval', {**self.fixed['approval'], 'text': 'TEST uniquement'}),
                             ('schema', 2.0), (policy.MARKER, '0'*64)]:
            request = deepcopy(self.request)
            request['standardSources'][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                router.for_request(request)
        with self.assertRaises(ValueError):
            policy.approved({**self.request, 'candidate':'0'*40})

    def test_exact_public_action_and_no_protected_configuration_drift(self):
        paths = self.fixed['changedPaths']
        policy.paths(self.request, paths, self.git)
        standard = deepcopy(self.request)
        standard['standardSources'].pop(policy.MARKER)
        with self.assertRaisesRegex(ValueError, 'hors sources seules'):
            router.for_request(standard).paths(standard, paths, self.git)
        with self.assertRaisesRegex(ValueError, 'Autre changement'):
            policy.paths(self.request, paths,
                         lambda *args: self.git(*args)+'\n+extra' if '--unified=0' in args else self.git(*args))
        with self.assertRaisesRegex(ValueError, 'Configuration hors contrat'):
            policy.paths(self.request, paths,
                         lambda *args: args[-1] if args[-1].endswith(':firebase.json') else self.git(*args))

    def test_manifest_rejects_origin_and_binding_changes(self):
        origins = [{'name':policy.PREFIX+name, 'state':'ACTIVE', 'revision':f'rev{i}',
                    'updateTime':'fixture', 'commit':self.fixed['productionCommit']}
                   for i,name in enumerate(policy.FUNCTIONS+[f'kept{i}' for i in range(118)])]
        fixed = {**self.fixed, 'originsSha256':policy.digest(origins)}
        fields = (*policy.REFERENCE_FIELDS, 'productionRun', 'approval', 'inventoryCount', 'staticPaths')
        manifest = {k:fixed[k] for k in fields}
        manifest.update(schema=2, kind=policy.KIND, origins=origins, selected=policy.FUNCTIONS,
                        newFunctions=[], deletedFunctions=[], configurationChanges=False,
                        bindingChanges=False, mailPause=False, businessInvocations=0)
        with patch.object(policy, 'contract', return_value=fixed):
            policy.validate_manifest(manifest)
            for key,value in [('bindingChanges',True),('configurationChanges',True),('businessInvocations',1),('selected',[])]:
                with self.subTest(key=key),self.assertRaises(ValueError):
                    policy.validate_manifest({**manifest,key:value})
            corrupted = deepcopy(manifest)
            corrupted['origins'][0]['revision'] = 'different'
            with self.assertRaisesRegex(ValueError, 'Origines PROD'):
                policy.validate_manifest(corrupted)

    def test_resume_is_refused(self):
        with TemporaryDirectory() as tmp:
            directory=Path(tmp)
            (directory/'previous').mkdir()
            with self.assertRaisesRegex(ValueError, 'Reprise'):
                policy.guard(directory)


if __name__ == '__main__':
    unittest.main()
