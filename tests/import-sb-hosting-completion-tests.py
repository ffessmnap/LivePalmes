"""Offline checks for the SB completion boundaries and source order."""
from copy import deepcopy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]

def load(file):
    spec = importlib.util.spec_from_file_location(file, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

completion = load('import-sb-hosting-completion.py')
order = load('publish-approved-pdf-functions.py').same_selection

class Boundaries(unittest.TestCase):
    def test_order_accepts_permutation_only(self):
        expected = completion.contract()['alreadyInstalled']
        self.assertTrue(order(list(reversed(expected)), expected))
        for wrong in (expected[:-1], expected+[expected[0]], expected[:-1]+[expected[0]],
                      expected[:-1]+['other'], [None]+expected[1:], tuple(expected)):
            with self.subTest(wrong=wrong):
                self.assertFalse(order(wrong, expected))
        self.assertFalse(order(expected+[expected[0]], expected+[expected[0]]))

    def test_generic_resume_stays_closed(self):
        c=completion.contract()
        self.assertFalse(completion.policy.contract()['resumeAllowed'])
        self.assertEqual(c['authority'],completion.policy.contract()['approval'])
        self.assertEqual(c['sourceWrites'], [])
        completion.require_mode('0',str(c['initialRun']),'true')
        for values in (('0',str(c['initialRun']),None),('0',str(c['initialRun']),'false'),
                       ('1',str(c['initialRun']),'true'),('0','1','true')):
            with self.assertRaises(ValueError): completion.require_mode(*values)

    def test_origin_rejects_other_run_hosting_or_artifact_drift(self):
        c=completion.contract()
        info={'id':c['initialRun'],'status':'completed','conclusion':'failure','run_attempt':1,
              'head_branch':'main','path':completion.PRODUCTION,'head_sha':c['initialController'],'event':'workflow_dispatch'}
        files=[{'name':name,**entry,'expired':False} for name,entry in c['initialArtifacts'].items()]
        job={'id':c['initialJob'],'run_id':c['initialRun'],'conclusion':'failure','steps':[
            {'name':'Chiffrer puis tester la sauvegarde','conclusion':'success'},
            {'name':'Publier Hosting apres les controles','conclusion':'skipped'},
            *[{'name':s,'conclusion':'failure'} for s in c['failedSteps']]]}
        completion.assert_origin(info,files,job,c)
        with self.assertRaises(ValueError): completion.assert_origin({**info,'run_attempt':2},files,job,c)
        with self.assertRaises(ValueError): completion.assert_origin(info,files[1:],job,c)
        wrong=deepcopy(job);wrong['steps'][1]['conclusion']='success'
        with self.assertRaises(ValueError): completion.assert_origin(info,files,wrong,c)

    def test_all_identities_and_installed_labels_must_match(self):
        c=completion.contract();selection=set(c['alreadyInstalled'])
        observed=[];rows=[]
        for f in completion.policy.contract()['origins']:
            short=f['name'].split('/')[-1]
            row={k:f[k] for k in ('name','revision','updateTime','state')}
            if short in selection: row['revision']+='-fixture'
            rows.append(row)
            observed.append({**row,'serviceConfig':{'revision':row['revision']},'environment':'GEN_2',
                'buildConfig':{'entryPoint':short,'runtime':'nodejs22'},'labels':{'livepalmes-commit':c['candidate']}})
        state=SimpleNamespace(identity=lambda f:{k:f[k] for k in ('name','revision','updateTime','state')})
        after={'functions':rows}
        self.assertEqual(len(completion.installed(observed,after,c,state)),6)
        with self.assertRaises(ValueError): completion.installed(observed[1:],after,c,state)
        with self.assertRaises(ValueError): completion.installed(observed+[observed[0]],after,c,state)
        next(f for f in observed if f['name'].split('/')[-1] in selection)['labels']={}
        with self.assertRaises(ValueError): completion.installed(observed,after,c,state)

if __name__ == '__main__':
    unittest.main()
