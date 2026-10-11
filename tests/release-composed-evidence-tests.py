"""Offline adversarial scenarios: composed proofs cannot reset a live baseline."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('cycle', Path(__file__).parents[1]/'tools/release-cycle.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EvidenceTests(unittest.TestCase):
    def function(self, name, revision='old'):
        return dict(name='projects/livepalmes-test/locations/europe-west1/functions/'+name,
                    commit='a'*40, revision=revision, updateTime='2026-10-11', state='ACTIVE')

    def test_targeted_composition_and_unrelated_drift(self):
        one, two = self.function('one'), self.function('two')
        new = self.function('one', 'new')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m.write(root/'request.json', dict(candidate='a'*40, testRun=1, testBackendRuns=[2]))
            m.write(root/'test/test-proof.json', dict(candidate='a'*40, state=dict(hosting={'version':'v'}, functions=[one,two])))
            target = dict(schema=1, candidate='a'*40, state=dict(functions=[new]))
            m.write(root/'test-targeted-2/test-backend-proof.json', target)
            state = dict(hosting={'version':'v'}, functions=[new,two])
            with patch.object(m,'artifact',return_value={'head_sha':'a'*40}), patch.object(m,'verify_test_candidate'), patch.object(m,'snapshot',return_value=state):
                m.verify_test(root)
                self.assertEqual(m.read(root/'test-proof.json')['state'], state)
            for bad in [dict(state, hosting={'version':'other'}), dict(state, functions=[new,self.function('two','other')]), dict(state, functions=[new])]:
                with patch.object(m,'artifact',return_value={'head_sha':'a'*40}), patch.object(m,'verify_test_candidate'), patch.object(m,'snapshot',return_value=bad), self.assertRaises(ValueError):
                    m.verify_test(root)
            for wrong in [dict(target,candidate='b'*40), dict(target,state={'functions':[dict(new,state='FAILED')]}), dict(target,state={'functions':[self.function('unknown')]}), dict(target,state={'functions':[new,new]})]:
                m.write(root/'test-targeted-2/test-backend-proof.json',wrong)
                with patch.object(m,'artifact',return_value={'head_sha':'a'*40}), patch.object(m,'verify_test_candidate'), self.assertRaises(ValueError):
                    m.verify_test(root,live=False)

    def test_cleanup_exact_replay_only(self):
        one, two = [dict(self.function(n), name=self.function(n)['name'].replace('livepalmes-test','livepalmes')) for n in ['retired','keep']]
        functions = sorted([one,two],key=lambda f:f['name'])
        hosting = dict(version='v',message='release')
        state = dict(hosting=dict(hosting,name='h'),functions=functions)
        step = dict(completedAt='now', backupVerified=True, backupSha256='c'*64, napWrites=0,mailSends=0,hosting=hosting,before=functions,deleted=[one['name']],after=[two])
        proof = dict(schema=1,productionRun=12,project='livepalmes',approval='Explicit',steps=[step])
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            def apply(p, digest=None):
                raw=json.dumps(p)+'\n'
                m.write(root/'request.json',{'productionCleanupEvidence':dict(path='.github/releases/evidence/cleanup.json',sha256=digest or hashlib.sha256(raw.encode()).hexdigest())})
                with patch.object(m,'git',return_value=raw.strip()),patch.object(m,'run',return_value='["retired"]'):
                    return m.apply_cleanup_evidence(root,state,12)
            self.assertEqual(apply(proof)['functions'],[two])
            reordered=copy.deepcopy(proof);reordered['steps'][0]['before'].reverse()
            self.assertEqual(apply(reordered)['functions'],[two])
            with self.assertRaises(ValueError): apply(proof,'0'*64)
            for key,value in [('before',[two]),('before',[one,one,two]),('after',[two,two]),('after',[dict(two,revision='changed')]),('deleted',[two['name']]),('backupVerified',False),('hosting',dict(hosting,version='wrong')),('napWrites',1)]:
                wrong=copy.deepcopy(proof);wrong['steps'][0][key]=value
                with self.assertRaises(ValueError):apply(wrong)
            wrong=copy.deepcopy(proof);wrong['productionRun']=13
            with self.assertRaises(ValueError):apply(wrong)
            wrong=copy.deepcopy(proof);wrong['steps'].append(step)
            with self.assertRaises(ValueError):apply(wrong)


if __name__ == '__main__':
    unittest.main()
