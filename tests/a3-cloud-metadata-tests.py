import contextlib,importlib.util,io,json,tempfile,unittest,urllib.error
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('cloud',Path(__file__).resolve().parents[1]/'tools/a3-cloud-metadata.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class Fixture:
    def __init__(self,project='livepalmes',parent=None,ubla=True):
        self.project,self.parent,self.ubla=project,parent,ubla
        self.calls=[];self.target=m.TARGETS[project];self.inventoryChange={}
    def read(self,url,body=None):
        self.calls.append((url,body));p=self.project
        if url=='https://cloudresourcemanager.googleapis.com/v3/projects/'+p:return {'name':'projects/'+self.target['number'],'projectId':p,**({'parent':self.parent} if self.parent else {})}
        if url.endswith(':getIamPolicy'):
            assert body=={'options':{'requestedPolicyVersion':3}}
            return {'bindings':[{'role':'roles/storage.objectViewer','members':['allUsers','private@example.invalid'],'condition':{'expression':'DO-NOT-EXPORT'}}]}
        if url.startswith('https://storage.googleapis.com/storage/v1/b/'):
            if '/iam?' in url:return {'bindings':[{'role':'roles/owner','members':['user:private@example.invalid']}]}
            bucket=url.split('/b/')[1].split('?')[0]
            return {'name':bucket,'projectNumber':self.target['number'],'iamConfiguration':{'uniformBucketLevelAccess':{'enabled':self.ubla},'publicAccessPrevention':'inherited'},'encryption':{'defaultKmsKeyName':'DO-NOT-EXPORT'},'softDeletePolicy':{'retentionDurationSeconds':'604800'}}
        if url=='https://iam.googleapis.com/v1/roles/storage.objectViewer':return {'includedPermissions':['storage.objects.get','storage.objects.list','DO-NOT-EXPORT']}
        if url.startswith('https://identitytoolkit.googleapis.com/admin/v2/projects/'+p+'/config?fields='):
            return {'name':'projects/'+p+'/config','subtype':'FIREBASE_AUTH','authorizedDomains':[p+'.web.app'],'mfa':{'state':'DISABLED'}}
        if '/releases/firebase.storage/' in url:return {'name':'release','rulesetName':'projects/'+p+'/rulesets/fixture'}
        if url=='https://firebaserules.googleapis.com/v1/projects/'+p+'/rulesets/fixture':return {'source':{'files':[{'name':'storage.rules','content':"rules_version = '2'; // DO-NOT-EXPORT"}]}}
        if url.startswith('https://cloudfunctions.googleapis.com/v2/projects/'+p+'/locations/-/functions?'):
            assert 'serviceConfig(maxInstanceCount' in url and 'secretEnvironmentVariables' not in url
            return {'functions':[{'name':'projects/'+p+'/locations/europe-west1/functions/example','state':'ACTIVE','environment':'GEN_2','labels':{'livepalmes-commit':'a'*40,'privateLabel':'DO-NOT-EXPORT'},'serviceConfig':{'maxInstanceCount':2,'maxInstanceRequestConcurrency':4,'availableCpu':'1','availableMemory':'256Mi','environmentVariables':{'PASSWORD':'DO-NOT-EXPORT'}}}],**self.inventoryChange}
        if url==m.run_endpoint(p):return {'services':[{'name':'projects/'+p+'/locations/europe-west1/services/example'}]}
        raise AssertionError('Unexpected endpoint '+url)

class CloudTests(unittest.TestCase):
    def test_run_single_list_projection_preserves_unknowns_and_filters_values(self):
        calls=[]
        def read(url,body=None):
            calls.append(url);self.assertTrue(m.allowed_request(url,body))
            self.assertNotIn('containers',url);self.assertNotIn('environment',url)
            return {'services':[{'name':'projects/718081132564/locations/europe-west1/services/example',
                'generation':'12','observedGeneration':'11','reconciling':True,
                'latestCreatedRevision':'example-00012-abc','latestReadyRevision':'example-00011-abc',
                'scaling':{'maxInstanceCount':8,'scalingMode':'AUTOMATIC'},
                'template':{'scaling':{'maxInstanceCount':2},'maxInstanceRequestConcurrency':4,'containers':[{'env':'DO-NOT-EXPORT'}]},
                'trafficStatuses':[{'revision':'example-00011-abc','percent':100,'tag':'DO-NOT-EXPORT'}]}]}
        result=m.collect_run_services('livepalmes',read);self.assertEqual(len(calls),1)
        row=result['services'][0];self.assertEqual(row['serviceMaxInstances'],8);self.assertEqual(row['revisionMaxInstances'],2)
        self.assertTrue(row['reconciling']);self.assertTrue(row['trafficStatuses'][0]['tagged'])
        self.assertNotIn('DO-NOT-EXPORT',json.dumps(result));self.assertFalse(result['sqlBudgetApproved'])
        missing=m.collect_run_services('livepalmes',Fixture().read)['services'][0]
        self.assertIsNone(missing['serviceMaxInstances']);self.assertIsNone(missing['revisionMaxInstances']);self.assertIsNone(missing['concurrency'])

    def test_run_rejects_incomplete_foreign_duplicate_and_unbounded_metadata(self):
        base={'name':'projects/livepalmes/locations/europe-west1/services/example'}
        invalid=[{'services':[base],'nextPageToken':'DO-NOT-EXPORT'}, {'services':[base],'unreachable':['europe-west1']},
            {'services':[]},{'services':[base]*501},{'services':[base,base]},
            {'services':[{**base,'name':'projects/foreign/locations/europe-west1/services/example'}]},
            {'services':[{**base,'name':'projects/livepalmes/locations/us-central1/services/example'}]},
            {'services':[{**base,'latestReadyRevision':'another-00001-abc'}]},
            {'services':[{**base,'latestReadyRevision':'projects/foreign/locations/europe-west1/services/example/revisions/example-00001-abc'}]},
            {'services':[{**base,'trafficStatuses':[{'revision':'example-00001-abc','percent':101}]}]},
            {'services':[{**base,'trafficStatuses':[{}]*21}]},
            {'services':[{**base,'scaling':{'maxInstanceCount':-1}}]},
            {'services':[{**base,'scaling':{'scalingMode':'UNRECOGNIZED'}}]},
            {'services':[{**base,'reconciling':'false'}]}]
        for value in invalid:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):m.collect_run_services('livepalmes',lambda *args:value)
        for url in [m.run_endpoint('livepalmes').replace('pageSize=500','pageSize=501'),m.run_endpoint('livepalmes')+'&pageToken=next',m.run_endpoint('livepalmes').replace('europe-west1','-')]:
            self.assertFalse(m.allowed_request(url))
        self.assertFalse(m.allowed_request(m.run_endpoint('livepalmes'),{'scaling':{'maxInstanceCount':1}}))

    def test_failed_storage_read_preserves_other_observations_and_hides_credentials(self):
        project='livepalmes';fixture=Fixture(project)
        class FakeReader:
            def __init__(self,token):self.calls=[];self.token=token
            def __call__(self,url,body=None):
                self.calls.append(url)
                if url.startswith('https://storage.googleapis.com/'):
                    raise urllib.error.HTTPError(url,403,'DO-NOT-EXPORT',{},None)
                return fixture.read(url,body)
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);credential=root/'credential.json'
            credential.write_text(json.dumps({'type':'service_account','project_id':project,'client_email':m.TARGETS[project]['identity'],'private_key':'DO-NOT-EXPORT'}))
            env={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_SHA':'a'*40,'EXPECTED_COMMIT':'a'*40,'GITHUB_RUN_ID':'123','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/a3-cloud-metadata.yml@refs/heads/main','GOOGLE_APPLICATION_CREDENTIALS':str(credential)}
            output=io.StringIO()
            with patch.object(m.subprocess,'check_output',return_value='FAKE-TOKEN'),patch.object(m,'MetadataReader',FakeReader),contextlib.redirect_stdout(output):
                self.assertFalse(m.observe(project,root/'report',env))
            report=json.loads((root/'report/metadata-report.json').read_text())
            self.assertEqual(report['stages']['cloud']['httpStatus'],403)
            self.assertEqual(report['stages']['auth']['status'],'observed')
            self.assertEqual(report['stages']['functions']['status'],'observed')
            self.assertFalse(report['metadataReadsComplete'])
            serialized=output.getvalue()+''.join(p.read_text() for p in (root/'report').glob('*.json'))
            for marker in ['DO-NOT-EXPORT','FAKE-TOKEN','private_key']:self.assertNotIn(marker,serialized)
    def test_request_budget_and_cache_are_enforced(self):
        reader=m.MetadataReader('FAKE-TOKEN')
        endpoint='https://cloudresourcemanager.googleapis.com/v3/projects/livepalmes'
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):return b'{"fixture":true}'
        with patch.object(m.urllib.request,'urlopen',return_value=Response()) as remote:
            self.assertEqual(reader(endpoint),{'fixture':True});self.assertEqual(reader(endpoint),{'fixture':True})
            self.assertEqual(remote.call_count,1)
        reader.calls=['budget']*23
        with patch.object(m.urllib.request,'urlopen') as remote:
            with self.assertRaises(ValueError):reader('https://cloudresourcemanager.googleapis.com/v3/projects/livepalmes-test')
            remote.assert_not_called()
    def test_context_rejects_spoofed_scope_and_attempts(self):
        env={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_SHA':'a'*40,'EXPECTED_COMMIT':'a'*40,'GITHUB_RUN_ID':'123','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/a3-cloud-metadata.yml@refs/heads/main'}
        m.context(env,'cloud')
        for key in env:
            with self.assertRaises(ValueError):m.context({**env,key:'wrong'},'cloud')
        with self.assertRaises(ValueError):m.context(env,'sql')
    def test_transport_refuses_non_metadata_operations_before_network(self):
        reader=m.MetadataReader('FAKE-TOKEN')
        for url,body in [('https://outside.invalid/metadata',None),('https://storage.googleapis.com/storage/v1/b/bucket/o?maxResults=1',None),('https://identitytoolkit.googleapis.com/admin/v2/projects/livepalmes/config',{'mfa':{'state':'ENABLED'}}),('https://firebaserules.googleapis.com/v1/projects/livepalmes/releases',{}),('https://identitytoolkit.googleapis.com/admin/v2/projects/livepalmes/accounts:batchGet',None)]:
            with self.assertRaises(ValueError):reader(url,body)
        self.assertEqual(reader.calls,[])
    def test_auth_config_projection_and_no_user_reads(self):
        calls=[]
        def read(url,body=None):
            calls.append(url)
            self.assertEqual(url,'https://identitytoolkit.googleapis.com/admin/v2/projects/livepalmes/config?fields=name,subtype,authorizedDomains,mfa(state,enabledProviders,providerConfigs(state,totpProviderConfig(adjacentIntervals)))')
            self.assertIsNone(body)
            return {'name':'projects/livepalmes/config','subtype':'FIREBASE_AUTH','authorizedDomains':['localhost','livepalmes.web.app'],'notification':{'smtp':{'password':'DO-NOT-EXPORT'}},'mfa':{'state':'DISABLED','providerConfigs':[]}}
        result=m.collect_auth('livepalmes',read)
        self.assertEqual(len(calls),1)
        self.assertEqual(result['subtype'],'FIREBASE_AUTH')
        self.assertNotIn('DO-NOT-EXPORT',json.dumps(result))
        self.assertEqual(result['usersRead'],0)
        self.assertFalse(result['configurationChanged'])
    def test_auth_numeric_project_is_known_and_foreign_projects_fail(self):
        for project,target in m.TARGETS.items():
            for identity in [project,target['number']]:
                value={'name':'projects/'+identity+'/config','subtype':'FIREBASE_AUTH'}
                self.assertEqual(m.collect_auth(project,lambda *args:value)['project'],project)
            for identity in ['999999999999','unrelated',m.TARGETS['livepalmes-test' if project=='livepalmes' else 'livepalmes']['number']]:
                with self.assertRaisesRegex(ValueError,'Auth project drift'):
                    m.collect_auth(project,lambda *args:{'name':'projects/'+identity+'/config','subtype':'FIREBASE_AUTH'})
    def test_existing_hosting_reader_is_narrow_and_does_not_read_users(self):
        fixture=Fixture('livepalmes')
        class FakeReader:
            def __init__(self,token):self.calls=[]
            def __call__(self,url,body=None):
                self.calls.append(url)
                if len(self.calls)>3:raise AssertionError('Hosting reader exceeded three metadata calls')
                return fixture.read(url,body)
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);credential=root/'credential.json'
            credential.write_text(json.dumps({'type':'service_account','project_id':'livepalmes','client_email':m.HOSTING_READER,'private_key':'DO-NOT-EXPORT'}))
            env={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_SHA':'a'*40,'EXPECTED_COMMIT':'a'*40,'GITHUB_RUN_ID':'123','GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/a3-cloud-metadata.yml@refs/heads/main','GOOGLE_APPLICATION_CREDENTIALS':str(credential),'A3_METADATA_READER':'hosting'}
            with patch.object(m.subprocess,'check_output',return_value='FAKE-TOKEN'),patch.object(m,'MetadataReader',FakeReader),contextlib.redirect_stdout(io.StringIO()):
                self.assertTrue(m.observe('livepalmes',root/'report',env))
            report=json.loads((root/'report/metadata-report.json').read_text())
            self.assertEqual(set(report['stages']),{'auth','storage-rules'})
            self.assertEqual(report['requestCount'],3)
            self.assertFalse(report['securityQualificationComplete'])
            self.assertFalse(report['publicationAllowed'])
            for change in [{'A3_METADATA_READER':'other'},{'A3_METADATA_READER':'backend'}]:
                with self.assertRaises(ValueError):m.credentials_identity('livepalmes',{**env,**change})
            with self.assertRaises(ValueError):m.credentials_identity('livepalmes-test',env)
            text=''.join(p.read_text() for p in (root/'report').glob('*.json'))
            self.assertNotIn('DO-NOT-EXPORT',text)
            self.assertNotIn('FAKE-TOKEN',text)
            self.assertTrue(all('/accounts' not in url and '/storage/v1/' not in url for url,_ in fixture.calls))
    def test_fixed_project_targets_and_privacy(self):
        for project in m.TARGETS:
            f=Fixture(project)
            def checked_read(url,body=None):
                self.assertTrue(m.allowed_request(url,body),url)
                return f.read(url,body)
            r=m.collect(project,checked_read)
            self.assertEqual(len(f.calls),10)
            self.assertTrue(r['ancestorPolicyRead'])
            self.assertEqual(r['functions'][0]['maxInstances'],2)
            self.assertIsNone(r['functions'][0]['minInstances'])
            self.assertFalse(r['accessOrSqlBudgetApproved'])
            self.assertTrue(r['projectPublicBindings'][0]['conditional'])
            for marker in ['DO-NOT-EXPORT','private@example.invalid','PASSWORD']:
                self.assertNotIn(marker,json.dumps(r))
            self.assertTrue(all('/o?' not in url and '/documents/' not in url for url,_ in f.calls))
    def test_inherited_and_object_acl_unknowns_not_cleared(self):
        f=Fixture(parent='folders/123',ubla=False);r=m.collect(f.project,f.read)
        self.assertFalse(r['ancestorPolicyRead'])
        self.assertGreaterEqual(len(r['limitations']),5)
        self.assertTrue(all(not b['objectPrivacyProved'] for b in r['buckets']))
    def test_no_unknown_project_reads(self):
        f=Fixture()
        with self.assertRaises(ValueError):m.collect('foreign',f.read)
        self.assertEqual(f.calls,[])
    def test_unsafe_role_refused(self):
        with self.assertRaises(ValueError):m.public_bindings({'bindings':[{'role':'https://foreign.invalid/token','members':['allUsers']}]})
    def test_incomplete_inventory_refused(self):
        for change in [{'nextPageToken':'more'},{'unreachable':['region']},{'functions':[]}]:
            f=Fixture();f.inventoryChange=change
            with self.assertRaises(ValueError):m.collect(f.project,f.read)
    def test_numeric_unknown_or_invalid(self):
        self.assertIsNone(m.numeric(None));self.assertEqual(m.numeric('2'),2)
        for value in [-1,'secret',2.5,True]:
            with self.assertRaises(ValueError):m.numeric(value)

if __name__=='__main__':unittest.main()
