"""Offline scope/configuration tests: no credentials or network."""
import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


policy = load('portal_ns_test_policy', 'portal-access-ns-release-policy.py')


class PortalNsPolicyTests(unittest.TestCase):
    def request(self):
        c = policy.contract()
        return {**{key: c[key] for key in ['schema','candidate','productionCommit','productionHosting','testRun']},
                'changes': [], 'excludedBackendReview': 'fixture', 'excludedBackendEvidence': {},
                'freezeTestCandidate': True, 'portalAccessNsRelease': {'approval':'ok','contractSha256':policy.DIGEST}}

    def test_exact_scope_and_rejection_of_expansion(self):
        request = self.request()
        self.assertEqual(policy.approved(request), [policy.NAME])
        self.assertEqual(policy.approved({}), [])
        policy.selection(request, policy.contract()['selected'])
        for key, value in [('candidate','f'*40), ('testRun',1), ('freezeTestCandidate',False),
                           ('additionalDtnFunctions',[policy.NAME]), ('dataMigration',True)]:
            bad = {**request, key:value}
            with self.assertRaises(ValueError): policy.approved(bad)
        with self.assertRaises(ValueError): policy.selection(request, [policy.NAME])

    def fixture(self, name):
        return {'name':'projects/livepalmes/locations/europe-west1/functions/'+name,
                'state':'ACTIVE','environment':'GEN_2','labels':{'existing':'keep'},
                'buildConfig':{'runtime':'nodejs22','entryPoint':name},
                'serviceConfig':{'timeoutSeconds':60,'serviceAccountEmail':'same-fixture',
                    'secretEnvironmentVariables':copy.deepcopy(policy.contract()['napBinding'])}}

    def test_binding_only_and_source_only_preserve_every_other_setting(self):
        c = policy.contract()
        state = SimpleNamespace(rollback_patch=lambda f,_:copy.deepcopy({key:f[key] for key in ['buildConfig','serviceConfig']}))
        for name in [policy.ACCOUNT,policy.NAME]:
            before = self.fixture(name)
            if name == policy.ACCOUNT: before['serviceConfig']['secretEnvironmentVariables'] = []
            after = copy.deepcopy(before)
            after['labels']['livepalmes-commit'] = c['candidate']
            after['serviceConfig']['secretEnvironmentVariables'] = copy.deepcopy(c['napBinding'])
            policy.assert_config(before,after,state)
            for section,key,value in [('serviceConfig','timeoutSeconds',300),('buildConfig','runtime','nodejs24'),
                                      ('serviceConfig','serviceAccountEmail','other'),('serviceConfig','secretEnvironmentVariables',[])]:
                bad=copy.deepcopy(after);bad[section][key]=value
                if name==policy.NAME and key=='secretEnvironmentVariables': value=[]
                with self.assertRaises(ValueError):policy.assert_config(before,bad,state)

    def test_existing_inventory_and_nap_reference(self):
        c=policy.contract()
        rows={name:self.fixture(name) for name in c['selected']}
        rows.update({row['name']:self.fixture(row['name']) for row in c['retained']})
        rows[policy.ACCOUNT]['serviceConfig'].update(secretEnvironmentVariables=[],revision=c['accountRevision'])
        policy.initial(list(rows.values()))
        rows[policy.ACCOUNT]['serviceConfig']['secretEnvironmentVariables']=c['napBinding']
        with self.assertRaises(ValueError):policy.initial(list(rows.values()))

    def test_mail_guard_only_observes_and_stops_on_drift(self):
        import json
        guard=load('portal_ns_test_guard','check-portal-access-ns-release.py')
        observed={'mailSha256':'mail','schedulerSha256':'scheduler','queueSha256':'queue'}
        calls=[]
        fake=SimpleNamespace(controls=lambda project,c:(calls.append(project) or copy.deepcopy(observed)))
        with tempfile.TemporaryDirectory(prefix='portal-ns-fixture-', dir=ROOT) as folder, patch.object(guard,'load',side_effect=lambda name,file:policy if file.startswith('portal-access') else fake):
            self.assertTrue(Path(folder).resolve().is_relative_to(ROOT.resolve()))
            directory=Path(folder);(directory/'request.json').write_text(json.dumps(self.request()))
            with self.assertRaises(ValueError):guard.guard(directory,True)
            guard.guard(directory);guard.guard(directory,True)
            observed['queueSha256']='changed'
            with self.assertRaises(ValueError):guard.guard(directory,True)
        self.assertEqual(calls,['livepalmes']*4)


if __name__=='__main__':unittest.main()
