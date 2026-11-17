import contextlib,copy,importlib.util,io,json,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('storage_metadata',Path(__file__).resolve().parents[1]/'tools/a3-storage-exposure-metadata.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class MetadataTests(unittest.TestCase):
    def test_transport_bounds_response_and_refuses_redirect_and_duplicate_request(self):
        endpoint=m.permissions_url(m.BUCKETS[0]);reader=m.Reader('SECRET-TOKEN')
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):
                self.limit=limit;return b'x'*4_000_001
        response=Response()
        with patch.object(m.urllib.request,'build_opener') as opener:
            opener.return_value.open.return_value=response
            with self.assertRaises(ValueError):reader(endpoint)
            self.assertEqual(response.limit,4_000_001)
            with self.assertRaises(ValueError):reader(endpoint)
            self.assertEqual(opener.call_count,1)
        with self.assertRaises(ValueError):m.NoRedirect().redirect_request(None,None,302,'redirect',{},'https://outside.invalid')

    def test_whitelist_rejects_content_writes_pagination_foreign_scope_before_network(self):
        reader=m.Reader('SECRET-TOKEN')
        with patch.object(m.urllib.request,'build_opener') as network:
            for url in [m.BASE+m.BUCKETS[0]+'/o/private?alt=media',m.objects_url(m.BUCKETS[0],m.PREFIXES[0],False)+'&pageToken=secret',
                m.objects_url(m.BUCKETS[0],m.PREFIXES[0],False).replace('maxResults=1000','maxResults=1001'),
                m.objects_url(m.BUCKETS[0],m.PREFIXES[0],False).replace('entry-documents','other-prefix'),
                m.permissions_url(m.BUCKETS[0]).replace(m.BUCKETS[0],'unrelated-bucket'),'https://outside.invalid/metadata']:
                with self.assertRaises(ValueError):reader(url)
            network.assert_not_called();self.assertEqual(reader.calls,[])
        reader.calls=['budget']*10
        with self.assertRaises(ValueError):reader(m.permissions_url(m.BUCKETS[0]))

    def test_aggregate_output_never_exports_names_tokens_or_private_acl_entities(self):
        item={'name':'entry-documents/SECRET-NAME/recap.pdf','metadata':{'firebaseStorageDownloadTokens':'SECRET-TOKEN','other':'SECRET-EXTRA'},
              'acl':[{'entity':'allUsers','role':'READER'},{'entity':'allAuthenticatedUsers','role':'OWNER'},{'entity':'user-SECRET-EMAIL','role':'OWNER'}]}
        report=m.summarize({'items':[item]},m.PREFIXES[0],True)
        self.assertEqual(report['counts']['recapPdf'],{'objects':1,'withDownloadToken':1,'publicReadAcl':1,'publicWriteAcl':1})
        self.assertTrue(report['listingComplete']);self.assertFalse(report['privateAccessProved'])
        self.assertNotIn('SECRET-',json.dumps(report))
        missing=m.summarize({'items':[{'name':'entry-documents/one/export.txt'}]},m.PREFIXES[0],False)
        self.assertFalse(missing['objectAclRead']);self.assertFalse(missing['privateAccessProved'])
        self.assertIsNone(missing['counts']['entriesTxt']['publicReadAcl'])

    def test_partial_listing_is_preserved_without_followup_or_exporting_page_token(self):
        data={'items':[{'name':'entry-documents/one/officiels/liste-officiels.pdf'}],'nextPageToken':'SECRET-NEXT'}
        report=m.summarize(data,m.PREFIXES[0],False)
        self.assertFalse(report['listingComplete']);self.assertEqual(report['listedObjects'],1);self.assertNotIn('SECRET-NEXT',json.dumps(report))
        self.assertEqual(report['counts']['officialsPdf']['objects'],1)

    def test_malformed_or_foreign_metadata_cannot_be_reported_as_private(self):
        base={'name':'entry-documents/one/recap.pdf'}
        for items in [[base,base],[{'name':'national-documents/one'}],[base]*1001,[{**base,'metadata':{'firebaseStorageDownloadTokens':{}}}],
                      [{**base,'metadata':{'firebaseStorageDownloadTokens':'x'*4097}}],[{**base,'name':'entry-documents/'+'x'*1024}]]:
            with self.assertRaises(ValueError):m.summarize({'items':items},m.PREFIXES[0],False)
        with self.assertRaises(ValueError):m.summarize({'items':[base]},m.PREFIXES[0],True)
        for acl in [[{'entity':'allUsers','role':'UNKNOWN'}],[{'role':'READER'}],[{'entity':'allUsers','role':'READER'}]*101]:
            with self.assertRaises(ValueError):m.public_acl(acl)

    def test_existing_permissions_choose_one_projection_without_retry_or_new_right(self):
        calls=[];bucket=m.BUCKETS[0]
        def read(url):
            self.assertTrue(m.allowed(url));calls.append(url)
            if url==m.permissions_url(bucket):return {'permissions':['storage.objects.list']}
            self.assertIn('projection=noAcl',url);return {'items':[]}
        report=m.collect_bucket(bucket,read)
        self.assertEqual(len(calls),4);self.assertEqual(report['defaultAcl']['reasonCode'],'EXISTING_PERMISSION_NOT_HELD')
        self.assertTrue(all(not row['objectAclRead'] for row in report['prefixes']))
        calls=[]
        def full(url):
            calls.append(url)
            if url==m.permissions_url(bucket):return {'permissions':list(m.PERMISSIONS)}
            if url==m.default_acl_url(bucket):return {'items':[{'entity':'project-owners-123','role':'OWNER'}]}
            self.assertIn('projection=full',url);return {'items':[]}
        report=m.collect_bucket(bucket,full);self.assertEqual(len(calls),5)
        self.assertFalse(report['defaultAcl']['publicRead']);self.assertTrue(all(row['objectAclRead'] for row in report['prefixes']))

    def test_denied_prefix_keeps_other_counts_and_no_error_body(self):
        bucket=m.BUCKETS[0]
        def read(url):
            if url==m.permissions_url(bucket):return {'permissions':list(m.PERMISSIONS)}
            if url==m.default_acl_url(bucket):raise urllib.error.HTTPError(url,403,'SECRET-ERROR',{},None)
            if 'prefix=entry-documents' in url:raise urllib.error.HTTPError(url,403,'SECRET-ERROR',{},None)
            return {'items':[]}
        report=m.collect_bucket(bucket,read)
        self.assertEqual(len(report['prefixes']),3);self.assertEqual(report['defaultAcl']['httpStatus'],403)
        self.assertEqual(report['listingStatus'],'incomplete');self.assertNotIn('SECRET-',json.dumps(report))

    def test_context_before_credentials_and_observation_has_only_safe_aggregates(self):
        env={'GITHUB_REPOSITORY':'ffessmnap/LivePalmes','GITHUB_REF':'refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1',
             'GITHUB_SHA':'a'*40,'EXPECTED_COMMIT':'a'*40,'GITHUB_RUN_ID':'123','VERIFIED_MAIN_CI':'true',
             'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/a3-storage-exposure-metadata.yml@refs/heads/main'}
        for field in env:
            with patch.object(m.Path,'open') as credentials,patch.object(m.subprocess,'check_output') as process:
                with self.assertRaises(ValueError):m.observe('unused',{**env,field:'wrong'})
                credentials.assert_not_called();process.assert_not_called()
        class FakeReader:
            def __init__(self,token):self.calls=[]
            def __call__(self,url):
                self.calls.append(url)
                return {'permissions':list(m.PERMISSIONS)} if '/iam/testPermissions?' in url else {'items':[]}
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);credential=root/'credential.json';output=root/'result.json'
            credential.write_text(json.dumps({'type':'service_account','project_id':'livepalmes-test','client_email':m.IDENTITY,'private_key':'SECRET-KEY'}))
            def process(args,**kwargs):return m.IDENTITY if 'list' in args else 'SECRET-TOKEN'
            with patch.object(m.subprocess,'check_output',side_effect=process),patch.object(m,'Reader',FakeReader),contextlib.redirect_stdout(io.StringIO()):
                self.assertTrue(m.observe(output,{**env,'GOOGLE_APPLICATION_CREDENTIALS':str(credential)}))
            result=output.read_text();self.assertNotIn('SECRET-',result);report=json.loads(result)
            self.assertEqual(report['requestCount'],10);self.assertEqual(report['objectContentsRead'],0)
            self.assertFalse(report['securityQualificationComplete']);self.assertFalse(report['accessChangeAllowed'])

if __name__=='__main__':unittest.main()
