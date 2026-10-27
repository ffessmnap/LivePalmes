"""Offline closed-scope, runtime, pause, scheduler and exclusion regressions."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).resolve().parents[1]
def module(name, file):
    spec = importlib.util.spec_from_file_location(name,ROOT/'tools'/file)
    value = importlib.util.module_from_spec(spec); spec.loader.exec_module(value); return value
cycle = module('oct27_cycle','release-cycle.py')
request = json.loads((ROOT/'.github/releases/20261027-validated.json').read_text(encoding='utf8'))
p = cycle.bcc.for_request(request); c = p.contract()
guard = module('oct27_base_guard','check-production-bcc.py')
g = module('oct27_new_guard','validated-20261027-guard.py')
state = module('oct27_state','production-release-state.py')

def function(name=p.LICENSE):
    return {'name':state.PREFIX+name,'environment':'GEN_2','state':'ACTIVE','labels':{'old':'kept'},
        'buildConfig':{'runtime':'nodejs22','entryPoint':name},
        'serviceConfig':{'timeoutSeconds':60,'availableMemory':'256Mi','serviceAccountEmail':'718081132564-compute@developer.gserviceaccount.com',
            'secretEnvironmentVariables':[{'key':'LIVEPALMES_NAP_PASSWORD','secret':'LIVEPALMES_NAP_PASSWORD',
                'projectId':'718081132564','version':'latest'}]}}

class PublicationTests(unittest.TestCase):
    def test_exact_scope_and_rejects_extensions(self):
        self.assertEqual(len(p.approved(request)),16); self.assertEqual(len(c['retained']),97)
        self.assertTrue(set(c['selected']).isdisjoint(c['retained']))
        for key,value in [('candidate','0'*40),('productionCommit','0'*40),('testRun',1),
            ('initialAutomaticMailEnabled',False),('additionalBccFunctions',c['selected'][:-1]),
            ('additionalDtnFunctions',['refreshDtnListingCache']),('productionAccountHistoryIndexes',{'apply':True}),
            ('limitedMailMaintenance',{**p.MAINTENANCE,'scope':'idf'}),('limitedMailMaintenance',{**p.MAINTENANCE,'noReplay':False})]:
            changed=copy.deepcopy(request); changed[key]=value
            with self.subTest(key=key), self.assertRaises(ValueError): p.approved(changed)
        with self.assertRaises(ValueError): p.selection(request,c['selected']+[c['retained'][0]])
        functions={n:{'state':'ACTIVE'} for n in c['selected']+c['retained']}
        p.verify_fingerprints(c['beforeHashes'],c['afterHashes'],functions)
        with self.assertRaises(ValueError): p.verify_fingerprints(c['beforeHashes'],{},functions)

    def test_only_licensed_callable_gets_seven_bindings_and_timeout(self):
        before=function(); body=p.source_patch(before,{'bucket':'fixture'},c['candidate'])
        self.assertEqual(set(body['serviceConfig']),{'timeoutSeconds','secretEnvironmentVariables'})
        self.assertEqual(body['serviceConfig']['timeoutSeconds'],300)
        self.assertEqual({s['key'] for s in body['serviceConfig']['secretEnvironmentVariables']},p.base.MAIL_KEYS)
        after=copy.deepcopy(before); after['serviceConfig'].update(body['serviceConfig']); p.assert_config(before,after,state)
        after['serviceConfig']['serviceAccountEmail']='other@fixture'
        with self.assertRaises(ValueError): p.assert_config(before,after,state)
        for key,value in [('timeoutSeconds',301),('secretEnvironmentVariables',[])]:
            after=copy.deepcopy(before); after['serviceConfig'].update(body['serviceConfig']); after['serviceConfig'][key]=value
            with self.assertRaises(ValueError): p.assert_config(before,after,state)
        for name in set(c['selected'])-{p.LICENSE}:
            source=p.source_patch(function(name),{},c['candidate'])
            self.assertNotIn('serviceConfig',source); self.assertEqual(p.update_mask(source),'build_config.source,labels')
        before['serviceConfig']['timeoutSeconds']=120
        with self.assertRaises(ValueError): p.source_patch(before,{},c['candidate'])
        with self.assertRaises(ValueError): p.source_patch(function(c['retained'][0]),{},c['candidate'])

    def test_initial_runtime_accepts_worker_but_rejects_wrong_bindings(self):
        worker=function(c['worker'])['serviceConfig']; worker['secretEnvironmentVariables']=p.license_service(function())['secretEnvironmentVariables']
        p.initial_runtime(c['worker'],worker,lambda s:not s.get('secretEnvironmentVariables'))
        worker['secretEnvironmentVariables'][0]['projectId']='another-project'
        with self.assertRaises(ValueError): p.initial_runtime(c['worker'],worker,lambda s:True)

    def test_pause_and_fresh_resume_never_expand_scope_or_replay(self):
        doc={'fields':{'scope':{'stringValue':'all'},'enabled':{'booleanValue':False},'revision':{'integerValue':'8'},
            'enabledSince':{'stringValue':c['enabledSince']},'discardThrough':{'stringValue':'2026-10-27T12:00:00Z'},
            'updatedAt':{'stringValue':'2026-10-27T12:00:00Z'}}}
        cfg={**c,'immutableMailSha256':guard.immutable_mail(doc)}
        paused=g.mail(doc,'paused',cfg,guard)
        resume=copy.deepcopy(doc); resume['fields'].update(enabled={'booleanValue':True},revision={'integerValue':'9'},
            enabledSince={'stringValue':'2026-10-27T12:05:00Z'},updatedAt={'stringValue':'2026-10-27T12:05:00Z'})
        g.mail(resume,'resumed',cfg,guard,paused)
        for key,value in [('scope',{'stringValue':'idf'}),('discardThrough',{'stringValue':'2026-10-26T12:00:00Z'}),
            ('enabledSince',{'stringValue':'2026-10-27T12:00:00Z'})]:
            bad=copy.deepcopy(resume);bad['fields'][key]=value
            with self.assertRaises(ValueError):g.mail(bad,'resumed',cfg,guard,paused)
        bad=copy.deepcopy(doc);bad['fields']['revision']={'integerValue':'10'}
        with self.assertRaises(ValueError):g.mail(bad,'paused',cfg,guard)

    def test_scheduler_only_schedule_after_matching_backup_and_pause(self):
        old={'name':'fixed-scheduler','schedule':'*/5 * * * *','timeZone':'Europe/Paris','state':'ENABLED','httpTarget':{'uri':'kept'}}
        cfg={**c,'schedulerSha256':guard.digest(g.scheduler_view(old))}; target={**old,'schedule':'0 * * * *'}
        fake=SimpleNamespace(contract=lambda:cfg)
        response=MagicMock();response.__enter__.return_value.read.return_value=b'{}'
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);(root/'scheduler.json').write_text(json.dumps(old))
            with patch.object(guard,'main') as paused,patch.object(guard,'get',side_effect=[old,target]),patch.object(g.urllib.request,'urlopen',return_value=response) as network:
                g.finish_scheduler(root,root,fake,'offline',guard)
                paused.assert_called_once_with('paused',root)
                req=network.call_args.args[0]; self.assertEqual(req.get_method(),'PATCH')
                self.assertEqual(req.full_url,guard.SCHEDULER_URL+'?updateMask=schedule')
                self.assertEqual(json.loads(req.data),{'name':old['name'],'schedule':'0 * * * *'})
            with patch.object(guard,'main'),patch.object(guard,'get',return_value={**old,'timeZone':'UTC'}),patch.object(g.urllib.request,'urlopen') as network:
                with self.assertRaises(ValueError):g.finish_scheduler(root,root,fake,'offline',guard)
                network.assert_not_called()
            (root/'scheduler.json').write_text('{}')
            with patch.object(g.urllib.request,'urlopen') as network:
                with self.assertRaises(ValueError):g.finish_scheduler(root,root,fake,'offline',guard)
                network.assert_not_called()

    def test_retained_sources_need_equivalence_and_exact_revisions(self):
        functions=[{'name':state.PREFIX+o['name'],'state':'ACTIVE','commit':o['commit'],'revision':o['revision']} for o in c['retainedOrigins']]
        hashes={n:'same' for n in c['retained']}
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);cycle.write(root/'request.json',request)
            with patch.object(cycle,'production_selection_fingerprints',return_value=hashes):
                p.verify_retained(root,{'functions':functions},c['selected'],cycle)
                functions[0]['revision']='drift'
                with self.assertRaises(ValueError):p.verify_retained(root,{'functions':functions},c['selected'],cycle)
            functions[0]['revision']=c['retainedOrigins'][0]['revision']
            with patch.object(cycle,'production_selection_fingerprints',side_effect=[hashes,{**hashes,c['retained'][0]:'changed'}]):
                with self.assertRaises(ValueError):p.verify_retained(root,{'functions':functions},c['selected'],cycle)

    def test_complete_guard_checks_queue_iam_scheduler_and_pause_witness(self):
        doc={'fields':{'scope':{'stringValue':'all'},'enabled':{'booleanValue':False},'revision':{'integerValue':'8'},
            'enabledSince':{'stringValue':c['enabledSince']},'discardThrough':{'stringValue':'2026-10-27T12:00:00Z'},
            'updatedAt':{'stringValue':'2026-10-27T12:00:00Z'}}}
        scheduler={'name':'fixture','schedule':'*/5 * * * *','timeZone':'Europe/Paris','state':'ENABLED'}
        queue={'name':guard.policy.QUEUE,'state':'RUNNING','retryConfig':{'maxAttempts':3,'minBackoff':'60s','maxBackoff':'300s'},
            'rateLimits':{'maxConcurrentDispatches':1,'maxDispatchesPerSecond':1}}
        iam={'bindings':[{'role':'roles/run.invoker','members':['serviceAccount:private@fixture']} ]}
        cfg={**c,'immutableMailSha256':guard.immutable_mail(doc),'schedulerSha256':guard.scheduler_digest(scheduler),
            'queueSha256':guard.check_queue(queue),'workerIamSha256':guard.digest(iam)}
        scope=SimpleNamespace(contract=lambda:cfg)
        def get(url,token):
            return doc if url==guard.MAIL_URL else scheduler if url==guard.SCHEDULER_URL else queue if url==guard.QUEUE_URL else iam
        with tempfile.TemporaryDirectory() as d,patch.object(guard,'get',side_effect=get),patch.object(g.urllib.request,'urlopen') as cloud_write:
            root=Path(d);g.check('paused',root,scope,'offline',guard)
            with self.assertRaises(ValueError):g.check('after',root,scope,'offline',guard)
            scheduler['schedule']='0 * * * *';g.check('after',root,scope,'offline',guard)
            g.check('paused',root,scope,'offline',guard)  # Resume keeps the attested hourly scheduler.
            queue['state']='PAUSED'
            with self.assertRaises(ValueError):g.check('after',root,scope,'offline',guard)
            queue['state']='RUNNING';iam['bindings'][0]['members']=['allUsers']
            with self.assertRaises(ValueError):g.check('after',root,scope,'offline',guard)
            cloud_write.assert_not_called()

    def test_targeted_test_receipt_requires_same_application_and_disabled_mail(self):
        sha='261c676de2e913122be3ea9f5d1f0f33a0024e1f'; names=c['targetedTestFunctions']
        targeted={'schema':1,'candidate':sha,'state':{'functions':[{'name':'projects/livepalmes-test/locations/europe-west1/functions/'+n} for n in names]}}
        source={'id':1,'head_sha':sha}; hashes={n:'same' for n in names}
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);control={'project':'livepalmes-test','candidate':sha,'before':{'enabled':False},'after':{'enabled':False},'mailsSent':0}
            cycle.write(root/'.notification-control/notification-control.json',control)
            with patch.object(cycle.subprocess,'run'),patch.object(cycle,'git',return_value='tools/only.py'),patch.object(cycle,'test_backend_fingerprints',return_value=hashes),patch.object(cycle,'artifact'):
                p.verify_targeted(request,targeted,source,root,cycle)
                control['after']['enabled']=True;cycle.write(root/'.notification-control/notification-control.json',control)
                with self.assertRaises(ValueError):p.verify_targeted(request,targeted,source,root,cycle)
            with patch.object(cycle.subprocess,'run'),patch.object(cycle,'git',return_value='functions/index.js'):
                with self.assertRaises(ValueError):p.verify_targeted(request,targeted,source,root,cycle)
            with patch.object(cycle.subprocess,'run'),patch.object(cycle,'git',return_value='docs/only.md'),patch.object(cycle,'test_backend_fingerprints',side_effect=[hashes,{**hashes,names[0]:'changed'}]):
                with self.assertRaises(ValueError):p.verify_targeted(request,targeted,source,root,cycle)

if __name__=='__main__':unittest.main()
