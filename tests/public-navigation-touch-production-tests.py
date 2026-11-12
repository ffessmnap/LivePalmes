"""Offline checks of one selected source, 118 retained functions and publication guards."""
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
from threading import Event
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('public_navigation_touch_tests', ROOT/'tools/public-navigation-touch-production-policy.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
c = m.contract()
state = m.load('public_navigation_touch_test_state','production-release-state.py')
NAP = {'key':'LIVEPALMES_NAP_PASSWORD','secret':'LIVEPALMES_NAP_PASSWORD','projectId':'livepalmes','version':'1'}


def request():
    return {'schema':1, **{k:c[k] for k in ['candidate','productionCommit','productionHosting','testRun']},
            m.OPTION:{'contractSha256':m.DIGEST}}


def inventory():
    rows = []
    for name in [f['name'].split('/')[-1] for f in c['origins']]:
        rows.append({'name':m.PREFIX+name,'environment':'GEN_2','state':'ACTIVE','updateTime':'before',
            'labels':{'preserved':'yes','livepalmes-commit':'old'},
            'buildConfig':{'entryPoint':name,'runtime':'nodejs22'},
            'serviceConfig':{'revision':'old','timeoutSeconds':60,'availableMemory':'256M',
                'serviceAccountEmail':c['runtimeAccount'],'environmentVariables':{'LIVEPALMES_ENFORCE_APP_CHECK':'true'}}})
    for name in [c['napReference']]+c['selected']:
        next(f for f in rows if f['name']==m.PREFIX+name)['serviceConfig']['secretEnvironmentVariables'] = [deepcopy(NAP)]
    next(f for f in rows if f['name']==m.PREFIX+c['smtpFunction'])['serviceConfig']['secretEnvironmentVariables'] = deepcopy(c['smtpBindings'])
    return rows


def files(root, rows):
    plan,backup = root/'plan',root/'backup'; plan.mkdir();backup.mkdir()
    (plan/'request.json').write_text(json.dumps(request()))
    (plan/'selection.json').write_text(json.dumps(c['selected']))
    (backup/'functions.json').write_text(json.dumps(rows))
    report = {'candidate':c['candidate'],'additionalPublicNavigationTouchFunctions':c['sourceOnly'],
              'public_navigation_touchNapBinding':NAP,'newFunctions':[],'functions':[{'name':f['name']} for f in rows if f['name'].split('/')[-1] in c['selected']]}
    (backup/'report.json').write_text(json.dumps(report))
    return plan,backup


class PublicNavigationTouchTests(unittest.TestCase):
    def test_closed_request_origins_and_selection(self):
        self.assertEqual(m.approved({}),[])
        self.assertEqual(len(m.approved(request())),1)
        self.assertEqual(c['selected'],c['sourceOnly'])
        for mutation in [{'candidate':'a'*40},{'testRun':1},{'productionHosting':'sites/livepalmes/versions/other'},
                         {'freezeTestCandidate':True},{'additionalPdfFunctions':[]},
                         {m.OPTION:{'contractSha256':'0'*64}}]:
            with self.assertRaises(ValueError):m.approved({**request(),**mutation})
        for names in [c['selected'][:-1],c['selected']+[c['selected'][0]],c['selected']+['newFunction']]:
            with self.assertRaises(ValueError):m.selection(request(),names)
        fingerprints,legacy = {},{}
        for row in c['reviewedSelectionOrigins']+c['reviewedRetainedOrigins']:
            fingerprints.setdefault(row['commit'],{})[row['name']] = row['before']
            fingerprints.setdefault(c['candidate'],{})[row['name']] = row['after']
            legacy.setdefault(row['commit'],{})[row['name']] = row['legacyBefore']
            legacy.setdefault(c['candidate'],{})[row['name']] = row['legacyAfter']
        origins = {f['name'].split('/')[-1]:deepcopy(f) for f in c['origins']}
        proof = m.verify(request(),{'productionRun':c['productionRun']},origins,fingerprints.__getitem__,legacy.__getitem__)
        self.assertEqual(proof['hostingCacheChanges'],0)
        self.assertEqual(proof['networkCalls'],0)
        retained = c['reviewedRetainedOrigins'][0]
        changed=deepcopy(legacy);changed[c['candidate']][retained['name']]='0'*64
        with self.assertRaisesRegex(ValueError,'Empreinte'):
            m.verify(request(),{'productionRun':c['productionRun']},origins,fingerprints.__getitem__,changed.__getitem__)
        origins[next(iter(origins))]['revision'] = 'drift'
        with self.assertRaisesRegex(ValueError,'Origines'):
            m.verify(request(),{'productionRun':c['productionRun']},origins,fingerprints.__getitem__,legacy.__getitem__)

    def test_real_diff_coverage_and_unchanged_hosting_configuration(self):
        cycle=m.load('public_navigation_touch_test_cycle','release-cycle.py')
        paths=cycle.git('diff','--name-only','--no-renames',c['productionCommit'],c['candidate']).splitlines()
        self.assertEqual(m.approved_paths(request(),paths,cycle.git),set())
        self.assertNotIn('firebase.json',paths)
        self.assertFalse(any(p.startswith('performances/public/data/') for p in paths))
        value={**request(),'changes':[{'title':'Touch navigation, compact trophy and mobile home order','status':'validated','validation':'Authentic human validation of both lots, separately from the conditional Infra PROD agreement','paths':paths}],
            'excludedBackendReview':'One existing source, 118 retained, configurations and all mails preserved',
            'excludedBackendEvidence':{'schema':1,'candidate':c['candidate'],'productionRun':c['productionRun'],'suite':'retained-calendar-consumers-v1','functions':[]}}
        self.assertTrue(cycle.validate_request(value,paths))
        for omitted in ['assets/public/livepalmes-public-shell.js','functions/assets/public-home-template.json']:
            changed=deepcopy(value);changed['changes'][0]['paths'].remove(omitted)
            with self.assertRaisesRegex(ValueError,'sans validation'):cycle.validate_request(changed,paths)
        def different(*args):
            result=cycle.git(*args)
            if args[0]=='show' and args[1].endswith(':firebase.json'):
                cfg=json.loads(result);cfg['unauthorized']=True;return json.dumps(cfg)
            return result
        with self.assertRaisesRegex(ValueError,'Hosting'):m.approved_paths(request(),paths,different)
        def different_template(*args):
            result=cycle.git(*args)
            if args[0]=='show' and args[1]==c['candidate']+':'+c['homeTemplate']['path']:
                return result+' changed'
            return result
        with self.assertRaisesRegex(ValueError,'URL JS'):
            m.approved_paths(request(),paths,different_template)
        self.assertEqual(cycle.approved_extra_functions({k:v for k,v in value.items() if k!=m.OPTION}),[])

    def test_initial_inventory_and_no_configuration_or_binding_patch(self):
        rows=inventory();self.assertEqual(m.initial(rows),NAP)
        self.assertEqual(c['napBindingFunctions'],[])
        for mutation in ['inventory','runtime','account','nap','smtp']:
            changed=deepcopy(rows);target=next(f for f in changed if f['name']==m.PREFIX+c['selected'][0])
            if mutation=='inventory':changed.append(deepcopy(changed[0]))
            if mutation=='runtime':target['buildConfig']['runtime']='nodejs20'
            if mutation=='account':target['serviceConfig']['serviceAccountEmail']='other@example.test'
            if mutation=='nap':next(f for f in changed if f['name']==m.PREFIX+c['napReference'])['serviceConfig']['secretEnvironmentVariables'][0]['projectId']='other'
            if mutation=='smtp':next(f for f in changed if f['name']==m.PREFIX+c['smtpFunction'])['serviceConfig']['secretEnvironmentVariables'][0]['version']='latest'
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):m.initial(changed)
        for before in [f for f in rows if f['name'].split('/')[-1] in c['selected']]:
            body,mask=m.source_patch(before,{'bucket':'source','object':'code.zip'},NAP)
            self.assertEqual(set(body),{'name','buildConfig','labels'})
            self.assertEqual(mask,'build_config.source,labels')
            after=deepcopy(before);after['labels']=body['labels'];after['buildConfig'].update(body['buildConfig']);after['serviceConfig']['revision']='new'
            m.assert_config(before,after,state,NAP)
            for key,value in [('timeoutSeconds',300),('secretEnvironmentVariables',[NAP]),('environmentVariables',{}),('serviceAccountEmail','other@example.test')]:
                changed=deepcopy(after);changed['serviceConfig'][key]=value
                if changed['serviceConfig']==after['serviceConfig']:continue
                with self.subTest(function=before['name'],key=key),self.assertRaises(ValueError):m.assert_config(before,changed,state,NAP)

    def test_event_filters_only_order_is_normalized(self):
        before=next(f for f in inventory() if f['name']==m.PREFIX+c['selected'][0])
        before['eventTrigger']={'eventType':'google.cloud.firestore.document.v1.written','eventFilters':[
            {'attribute':'database','value':'(default)'},{'attribute':'document','value':'users/{uid}','operator':'match-path-pattern'}]}
        after=deepcopy(before);after['labels']['livepalmes-commit']=c['candidate']
        after['eventTrigger']['eventFilters'].reverse()
        m.assert_config(before,after,state,NAP)
        for mutation in ['value','operator','duplicate','field','shape']:
            changed=deepcopy(after);filters=changed['eventTrigger']['eventFilters']
            if mutation=='value':filters[0]['value']='other/{uid}'
            if mutation=='operator':filters[0]['operator']='other'
            if mutation=='duplicate':filters.append(deepcopy(filters[0]))
            if mutation=='field':del filters[0]['operator']
            if mutation=='shape':changed['eventTrigger']['eventFilters']={}
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):m.assert_config(before,changed,state,NAP)

    def test_backup_of_one_source_in_full_inventory(self):
        module=m.load('public_navigation_touch_full_backup','preflight-production-release.py')
        original=subprocess.check_output
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w') as zipped:zipped.writestr('index.js','offline source')
        source=archive.getvalue()
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);rows=inventory();plan=root/'plan';plan.mkdir()
            for f in rows:f['buildConfig']['source']={'storageSource':{'bucket':'offline','object':'shared.zip','generation':'1'}}
            (root/'credentials.json').write_text(json.dumps({'project_id':'livepalmes'}))
            (plan/'request.json').write_text(json.dumps(request()));(plan/'selection.json').write_text(json.dumps(c['selected']))
            calls=[]
            def output(args,**kwargs):return 'offline-token' if args[0]=='gcloud' else original(args,**kwargs)
            def urlopen(req,**_):
                url=req if isinstance(req,str) else req.full_url;calls.append(url)
                if url=='https://storage.googleapis.com/offline/shared.zip':return io.BytesIO(source)
                if url.endswith(':testIamPermissions'):value={'permissions':['cloudfunctions.functions.setIamPolicy']}
                elif url.endswith(':generateDownloadUrl'):value={'downloadUrl':'https://storage.googleapis.com/offline/shared.zip'}
                elif url.endswith('/releases?pageSize=1'):value={'releases':[{'name':'offline','version':{'name':c['productionHosting']}}]}
                elif url.endswith('/'+c['productionHosting']):value={'status':'FINALIZED'}
                elif url.endswith('/functions?pageSize=100'):value={'functions':rows[:100],'nextPageToken':'second'}
                elif url.endswith('/functions?pageSize=100&pageToken=second'):value={'functions':rows[100:]}
                else:self.fail('Unexpected backup API: '+url)
                return io.BytesIO(json.dumps(value).encode())
            env={'GOOGLE_APPLICATION_CREDENTIALS':str(root/'credentials.json'),'CANDIDATE_DIRECTORY':str(ROOT),
                'CANDIDATE_SHA':c['candidate'],'RUNNER_TEMP':str(root),'PLAN':str(plan),
                'RELEASE_SELECTION':str(plan/'selection.json'),'RELEASE_BACKUP_DIRECTORY':str(root/'backup'),
                'EXPECTED_HOSTING_VERSION':c['productionHosting'],'GITHUB_STEP_SUMMARY':str(root/'summary'),'GITHUB_OUTPUT':str(root/'output')}
            with patch.dict(os.environ,env),patch.object(module.subprocess,'check_output',side_effect=output),patch.object(module.urllib.request,'urlopen',side_effect=urlopen):
                self.assertEqual(module.main(),0)
            report=json.loads((root/'backup/report.json').read_text())
            self.assertEqual(report['additionalPublicNavigationTouchFunctions'],c['selected']);self.assertEqual(report['public_navigation_touchNapBinding'],NAP)
            self.assertEqual(report['errors'],[]);self.assertEqual(report['newFunctions'],[]);self.assertEqual(len(report['functions']),1)
            self.assertEqual(json.loads((root/'backup/functions.json').read_text()),rows)
            self.assertEqual(len(report['sources']),1);self.assertEqual(report['sources'][0]['sha256'],hashlib.sha256(source).hexdigest())
            self.assertEqual(sum(url.endswith(':generateDownloadUrl') for url in calls),1)

    def test_publisher_one_and_final_state_119_no_cli_no_iam_no_business_call(self):
        rows=inventory();current={f['name']:deepcopy(f) for f in rows};calls=[]
        def api(url,method='GET',body=None):
            calls.append((url,method,body))
            if url.endswith(':generateUploadUrl'):return {'uploadUrl':'https://storage.googleapis.com/source/upload','storageSource':{'bucket':'source','object':'code.zip'}}
            full=url.removeprefix(state.API).split('?')[0];self.assertIn(full,current)
            if method=='PATCH':
                current[full]['buildConfig'].update(deepcopy(body['buildConfig']));current[full]['labels']=deepcopy(body['labels'])
                current[full]['serviceConfig'].update(deepcopy(body.get('serviceConfig',{})));current[full]['serviceConfig']['revision']='new'
                return {'done':True}
            self.assertEqual(method,'GET');return deepcopy(current[full])
        fake=SimpleNamespace(API=state.API,inventory=lambda:list(current.values()),identity=state.identity,rollback_patch=state.rollback_patch,request=api,wait_operation=lambda _:None)
        cycle=m.load('public_navigation_touch_full_cycle','release-cycle.py')
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);plan,backup=files(root,rows)
            with patch.object(m,'load',return_value=fake),patch.object(m,'guard'),patch.object(m.urllib.request,'urlopen',return_value=MagicMock()):
                m.publish_sources(root,plan,backup,cycle,lambda *_:b'offline-source')
            with patch.object(state,'inventory',return_value=list(current.values())),patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary')}):
                state.check_after(backup,root/'after.json',True)
            self.assertEqual(json.loads((root/'after.json').read_text())['errors'],[])
            credentials=root/'credentials';credentials.write_text(json.dumps({'project_id':'livepalmes'}))
            with patch.dict(os.environ,{'PLAN':str(plan),'GOOGLE_APPLICATION_CREDENTIALS':str(credentials),'CANDIDATE_SHA':c['candidate']}),patch.object(cycle,'deploy_command') as cli:
                cycle.deploy_batches('livepalmes',ROOT,root/'unused-stage',plan/'selection.json',False)
                cli.assert_not_called()
            changed=deepcopy(current);changed[next(iter(changed))]['serviceConfig']['timeoutSeconds']=999
            with patch.object(state,'inventory',return_value=list(changed.values())),patch.dict(os.environ,{'GITHUB_STEP_SUMMARY':str(root/'summary')}):
                with self.assertRaises(ValueError):state.check_after(backup,root/'bad-after.json',True)
        patches=[r for r in calls if r[1]=='PATCH']
        self.assertEqual(len(patches),1);self.assertEqual(sum('serviceConfig' in r[2] for r in patches),0)
        self.assertFalse(any('IamPolicy' in r[0] or 'run.app' in r[0] or 'cloudfunctions.net' in r[0] for r in calls))

    def test_retained_revision_configuration_and_inventory_drift_refused_before_patch(self):
        rows=inventory();before={f['name']:f for f in rows}
        retained=next(f['name'] for f in rows if f['name'].split('/')[-1] not in c['selected'])
        for mutation in ['revision','configuration','labels','source','missing','extra']:
            current=deepcopy(before)
            if mutation=='revision':current[retained]['serviceConfig']['revision']='drift'
            if mutation=='configuration':current[retained]['serviceConfig']['timeoutSeconds']=999
            if mutation=='labels':current[retained]['labels']['unknown']='value'
            if mutation=='source':current[retained]['buildConfig']['source']={'storageSource':{'object':'other'}}
            if mutation=='missing':del current[retained]
            if mutation=='extra':current['unexpected']=deepcopy(rows[0])
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                m.assert_retained(before,current,state)

    def test_resume_guard_refuses_missing_or_changed_initial_templates(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'request.json').write_text(json.dumps(request()));source=root/'previous/guards';source.mkdir(parents=True)
            (root/'previous/production-after.json').write_text('{}')
            with self.assertRaises(ValueError):m.restore_witness(root,source)
            with patch.object(m,'observe_controls') as observe:
                with self.assertRaisesRegex(ValueError,'absent'):m.guard(root)
                observe.assert_not_called()
            witness={**c['controls'],'templatesSha256':'a'*64};(source/'public_navigation_touch-controls-before.json').write_text(json.dumps(witness))
            m.restore_witness(root,source)
            with patch.object(m,'observe_controls',return_value=witness):m.guard(root);m.guard(root,True)
            with patch.object(m,'observe_controls',return_value={**witness,'templatesSha256':'b'*64}):
                with self.assertRaisesRegex(ValueError,'Derive'):m.guard(root)

    def test_publisher_stops_queued_writes_after_error_or_deadline(self):
        for failure in ['read','patch','deadline']:
            rows=inventory();stop=Event();writes=[];first=m.PREFIX+c['selected'][0]
            def api(url,method='GET',body=None):
                if url.endswith(':generateUploadUrl'):return {'uploadUrl':'https://storage.googleapis.com/source/upload','storageSource':{'bucket':'source','object':'code.zip'}}
                full=url.removeprefix(state.API).split('?')[0]
                if full==first:
                    if failure=='read':raise ValueError('first failed')
                    if method=='PATCH':writes.append(full);raise ValueError('first patch failed')
                    return deepcopy(next(f for f in rows if f['name']==full))
                self.assertTrue(stop.wait(3));return deepcopy(next(f for f in rows if f['name']==full))
            fake=SimpleNamespace(API=state.API,inventory=lambda:deepcopy(rows),identity=state.identity,rollback_patch=state.rollback_patch,request=api,wait_operation=lambda _:None)
            cycle=SimpleNamespace(read=lambda p:json.loads(p.read_text()))
            with tempfile.TemporaryDirectory() as directory:
                root=Path(directory);plan,backup=files(root,rows)
                with patch.object(m,'load',return_value=fake),patch.object(m,'guard'),patch.object(m,'Event',return_value=stop),patch.object(m.urllib.request,'urlopen',return_value=MagicMock()):
                    with self.assertRaises(ValueError):m.publish_sources(root,plan,backup,cycle,lambda *_:b'code',0 if failure=='deadline' else None)
            self.assertEqual(writes,[first] if failure=='patch' else [])

    def test_publisher_resume_accepts_only_attested_revisions(self):
        rows=inventory();current=deepcopy(rows);cycle=SimpleNamespace(read=lambda p:json.loads(p.read_text()))
        for f in [r for r in current if r['name'].split('/')[-1] in c['selected']]:
            f['labels']['livepalmes-commit']=c['candidate'];f['serviceConfig']['revision']='new'
            if f['name'].split('/')[-1] in c['napBindingFunctions']:f['serviceConfig']['secretEnvironmentVariables']=[deepcopy(NAP)]
        fake=SimpleNamespace(inventory=lambda:deepcopy(current),identity=state.identity,rollback_patch=state.rollback_patch)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);plan,backup=files(root,rows);(plan/'previous').mkdir()
            after={'candidate':c['candidate'],'functions':[state.identity(f) for f in current]}
            (plan/'previous/production-after.json').write_text(json.dumps(after))
            with patch.object(m,'load',return_value=fake),patch.object(m,'guard'),patch.object(m.urllib.request,'urlopen') as network:
                m.publish_sources(root,plan,backup,cycle,lambda *_:b'code');network.assert_not_called()
                next(f for f in after['functions'] if f['name']==m.PREFIX+c['selected'][0])['revision']='unattested';(plan/'previous/production-after.json').write_text(json.dumps(after))
                with self.assertRaisesRegex(ValueError,'sans preuve'):m.publish_sources(root,plan,backup,cycle,lambda *_:b'code')

    def test_historical_contract_and_generic_reader_still_refuse_active_mail_candidate(self):
        cycle=m.load('touch_historical_checks','release-cycle.py')
        with self.assertRaises(ValueError):
            cycle.approved_public_nap_functions({**request(),'additionalPublicNapFunctions':c['selected'],
                'additionalPublicNapApproval':'active mails preserved','initialAutomaticMailEnabled':True})
        old=cycle.public_navigation_direct
        value={k:v for k,v in request().items() if k!=m.OPTION}
        with self.assertRaises(ValueError):
            old.approved({**value,old.OPTION:{'contractSha256':old.DIGEST}})
        with tempfile.TemporaryDirectory() as directory:
            plan=Path(directory);(plan/'request.json').write_text('{}')
            with patch.object(m.urllib.request,'urlopen') as network:
                m.main(ROOT,plan,plan/'backup');network.assert_not_called()

    def test_hosting_navigation_direct_and_retained_guide_static_reads_only(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory);(target/'request.json').write_text(json.dumps(request()));urls=[]
            def read(url):
                urls.append(url);path=url.removeprefix('https://livepalmes.web.app/').split('?')[0]
                return 200,(ROOT/path).read_bytes(),{}
            m.check_hosting(ROOT,target,target/'receipt.json',read)
            self.assertEqual(len(urls),len(c['staticPaths']))
            self.assertTrue(all(url.startswith('https://livepalmes.web.app/') for url in urls))
            with patch.object(m.time,'sleep'),self.assertRaisesRegex(ValueError,'Hosting'):
                m.check_hosting(ROOT,target,target/'bad.json',lambda _: (200,b'old',{}))

if __name__=='__main__':unittest.main()
