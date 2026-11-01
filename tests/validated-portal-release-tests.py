"""Offline release authorization, source-only updates, drift and resume guards."""
import copy
import importlib.util
import json
import subprocess
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


policy = load('validated_portal_tests_policy', 'validated-portal-release-policy.py')


class ValidatedPortalPolicyTests(unittest.TestCase):
    def test_retained_dependency_proof_rejects_unreviewed_mutations(self):
        result = subprocess.check_output(['node',str(ROOT/'tests/validated-portal-compatibility-tests.js')],cwd=ROOT,text=True)
        self.assertEqual(json.loads(result), {'retained':55,'networkCalls':0,'result':'success','negativeCases':3})

    def request(self):
        c = policy.contract()
        return {**{k:c[k] for k in ['schema','candidate','productionCommit','productionHosting','testRun']},
                'freezeTestCandidate':True, 'validatedPortalRelease':{'approval':c['approval'],'contractSha256':policy.DIGEST}}

    def test_exact_candidate_selection_and_no_extra_authorization(self):
        request = self.request()
        self.assertEqual(policy.approved({}), [])
        self.assertEqual(policy.approved(request), policy.contract()['sourceOnly'])
        policy.selection(request, policy.contract()['selected'])
        for key, value in [('candidate','f'*40), ('productionCommit','e'*40), ('testRun',1),
                           ('freezeTestCandidate',False), ('migration',True), ('additionalNotificationFunctions',['sendEngagementPreparedEmails'])]:
            with self.assertRaises(ValueError): policy.approved({**request,key:value})
        for names in [policy.contract()['selected'][:-1], policy.contract()['selected']+['sendEngagementPreparedEmails']]:
            with self.assertRaises(ValueError): policy.selection(request,names)

    def fixture(self, name):
        return {'name':'projects/livepalmes/locations/europe-west1/functions/'+name,'state':'ACTIVE',
                'labels':{'existing':'keep'}, 'buildConfig':{'runtime':'nodejs22','entryPoint':name},
                'serviceConfig':{'timeoutSeconds':60,'serviceAccountEmail':'fixture','secretEnvironmentVariables':[{'key':'unchanged'}]}}

    def test_source_patch_cannot_touch_settings_or_other_function(self):
        state = SimpleNamespace(rollback_patch=lambda f,_:copy.deepcopy({k:f.get(k) for k in ['buildConfig','serviceConfig','eventTrigger']}))
        for name in policy.contract()['sourceOnly']:
            before = self.fixture(name)
            patch_body = policy.source_patch(before, {'bucket':'fixture','object':'source'})
            self.assertEqual(set(patch_body), {'name','buildConfig','labels'})
            self.assertEqual(set(patch_body['buildConfig']), {'source'})
            after = copy.deepcopy(before); after['labels'] = patch_body['labels']
            policy.assert_config(before,after,state)
            after['serviceConfig']['timeoutSeconds'] += 1
            with self.assertRaises(ValueError): policy.assert_config(before,after,state)
        with self.assertRaises(ValueError): policy.source_patch(self.fixture('sendEngagementPreparedEmails'), {})

    def test_new_callable_has_no_secret_or_automatic_trigger(self):
        function = self.fixture(policy.contract()['newFunction'])
        function['environment'] = 'GEN_2'
        function['labels']['livepalmes-commit'] = policy.contract()['candidate']
        function['serviceConfig']['secretEnvironmentVariables'] = []
        policy.assert_new(function)
        for key, value in [('eventTrigger',{'fixture':True}), ('environment','GEN_1')]:
            with self.assertRaises(ValueError): policy.assert_new({**function,key:value})
        function['serviceConfig']['secretEnvironmentVariables'] = [{'key':'SMTP'}]
        with self.assertRaises(ValueError): policy.assert_new(function)

    def test_publisher_uses_three_source_patches_and_refuses_drift(self):
        for drift, resume in [(False,False),(True,False),(False,True)]:
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp); plan=root/'plan'; backup=root/'backup'; plan.mkdir(); backup.mkdir()
                (plan/'request.json').write_text(json.dumps(self.request()))
                (plan/'selection.json').write_text(json.dumps(policy.contract()['selected']))
                (backup/'report.json').write_text(json.dumps({'candidate':policy.contract()['candidate'],
                    'additionalValidatedPortalFunctions':policy.contract()['sourceOnly']}))
                before = [self.fixture(n) for n in policy.contract()['sourceOnly']]
                current = copy.deepcopy(before)
                if drift: current[0]['revision']='unexpected'
                if resume:
                    for f in current: f['labels']['livepalmes-commit']=policy.contract()['candidate']
                    previous=plan/'previous'; previous.mkdir()
                    (previous/'production-after.json').write_text(json.dumps({'candidate':policy.contract()['candidate'],'functions':current}))
                (backup/'functions.json').write_text(json.dumps(before))
                calls=[]
                def request(url,method,body):
                    calls.append((url,method,body))
                    return {'uploadUrl':'https://storage.googleapis.com/fixture','storageSource':{'bucket':'fixture'}}
                state=SimpleNamespace(PREFIX='projects/livepalmes/locations/europe-west1/functions/',API='https://cloudfunctions.googleapis.com/v2/',
                    identity=lambda f:copy.deepcopy(f), inventory=lambda:current, request=request,
                    rollback_patch=lambda f,_:{k:f[k] for k in ['buildConfig','serviceConfig']}, wait_operation=lambda op:None,
                    check_after=lambda *args:None)
                def dispatch(name,file):
                    if file=='production-release-state.py': return state
                    return load(name,file)
                cycle=SimpleNamespace(read=lambda p:json.loads(Path(p).read_text()))
                with patch.object(policy,'load',side_effect=dispatch), patch.object(policy,'guard'), patch.object(policy.urllib.request,'urlopen'):
                    if drift:
                        with self.assertRaises(ValueError): policy.publish(root,plan,backup,cycle,lambda *a:b'fixture')
                    else: policy.publish(root,plan,backup,cycle,lambda *a:b'fixture')
                self.assertEqual(len(calls),0 if drift or resume else 4)
                for url,method,body in calls:
                    if method=='PATCH':
                        self.assertTrue(url.endswith('?updateMask=build_config.source,labels'))
                        self.assertNotIn('serviceConfig',body)


if __name__ == '__main__':
    unittest.main()
