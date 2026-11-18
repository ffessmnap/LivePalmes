"""Closed MFA source selection and provenance refusal tests; no remote services."""
from copy import deepcopy
import hashlib,importlib.util,json,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_test_sources',ROOT/'tools/publish-test-admin-mfa-sources.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class SourceTests(unittest.TestCase):
    def test_sealed_scope_and_contract_tampering(self):
        value=p.contract()
        self.assertEqual((len(value['allowedFunctions']),len(value['installedFunctions']),len(value['notInstalledChanges'])),(111,121,27))
        for name in ['manageLivePalmesDirect', 'deleteCompetitionPdf', 'storeCompetitionPdf']:
            self.assertIn(name,value['allowedFunctions'])
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'contract.json';raw=p.CONTRACT.read_bytes();path.write_bytes(raw+b' ')
            with patch.object(p,'CONTRACT',path),self.assertRaises(ValueError):p.contract()
            for change in [{'project':'livepalmes'},{'applicationCommit':'a'*40},{'rulesAfterSha256':'f'*64},
                           {'toolingPaths':['functions/index.js']},{'allowedFunctions':value['allowedFunctions'][:-1]}]:
                modified={**value,**change};modified.pop('_contractSha256',None)
                raw=(json.dumps(modified)+'\n').encode();path.write_bytes(raw)
                with patch.object(p,'CONTRACT',path),patch.object(p,'CONTRACT_SHA256',hashlib.sha256(raw).hexdigest()),self.assertRaises(ValueError):p.contract()
        with self.assertRaises(ValueError):p.contract('standard')

    def fixture(self,directory):
        root=Path(directory);verifier=root/'proof.js';verifier.write_text('// synthetic trusted tool')
        row=dict(name='retained',commit='b'*40,revision='retained-r1',legacyBefore='2'*64,legacyAfter='3'*64,optimizedBefore='1'*64,optimizedAfter='1'*64)
        evidence={'schema':1,'candidate':'a'*40,'project':p.PROJECT,'rows':[row]}
        path=root/'proof.json';path.write_text(json.dumps(evidence))
        entry={'applicationCommit':'a'*40,'selectionQualification':{'verifierFile':'proof.js','verifierSha256':hashlib.sha256(verifier.read_bytes()).hexdigest(),'evidenceFile':'proof.json','evidenceSha256':hashlib.sha256(path.read_bytes()).hexdigest()}}
        origins=[dict(name=p.PREFIX+name,state='ACTIVE',commit='b'*40,revision=name+'-r1',updateTime='2026-11-18T10:00:00Z') for name in ['changed','retained']]
        def optimized(ref):return {'changed':('4' if ref=='b'*40 else '5')*64,'retained':'1'*64}
        def legacy(ref):return {'changed':('4' if ref=='b'*40 else '5')*64,'retained':('2' if ref=='b'*40 else '3')*64}
        return root,entry,origins,optimized,legacy,evidence

    def test_all_fresh_discrepancies_must_match_independent_proof(self):
        with tempfile.TemporaryDirectory() as directory:
            root,entry,origins,opt,legacy,evidence=self.fixture(directory)
            with patch.object(p,'ROOT',root),patch.object(p.publisher.subprocess,'check_output',return_value=json.dumps(evidence)) as verify:
                rows=p.qualify_selection(entry,origins,'a'*40,p.PROJECT,opt,legacy)
                self.assertEqual([r['shortName'] for r in rows if r['changed']],['changed'])
                self.assertEqual(len(json.loads(verify.call_args.kwargs['input'])['rows']),1)
                for invalid in [origins[:-1],origins+[origins[0]], [{**r,'revision':'other'} for r in origins], [{**r,'commit':''} for r in origins], [{**r,'state':'FAILED'} for r in origins]]:
                    with self.assertRaises(ValueError):p.qualify_selection(entry,invalid,'a'*40,p.PROJECT,opt,legacy)
                with patch.object(p.publisher.subprocess,'check_output',return_value=json.dumps({**evidence,'rows':[]})),self.assertRaises(ValueError):p.qualify_selection(entry,origins,'a'*40,p.PROJECT,opt,legacy)
                (root/'proof.js').write_text('// changed tool')
                with self.assertRaises(ValueError):p.qualify_selection(entry,origins,'a'*40,p.PROJECT,opt,legacy)

    def test_workflow_mixing_refused_before_delegate(self):
        env={'GITHUB_REPOSITORY':p.REPOSITORY,'RELEASE':p.RELEASE,'GITHUB_WORKFLOW_REF':p.REPOSITORY+'/'+p.WORKFLOW+'@refs/heads/main','GITHUB_EVENT_NAME':'workflow_dispatch'}
        for change in [{'RELEASE':'standard'},{'GITHUB_REPOSITORY':'other/repo'},{'GITHUB_WORKFLOW_REF':'other'},{'GITHUB_EVENT_NAME':'push'},{'STANDARD_SOURCE_REQUEST':'{}'}]:
            with patch.object(p,'_original_guard') as guard,self.assertRaises(ValueError):
                p.guard(ROOT,{},dict(env,**change))
            guard.assert_not_called()
        for mode in ['delete','recover','rollback']:
            with self.assertRaises(ValueError):p.main(mode,p.RELEASE,ROOT,ROOT)

    def test_baseline_digest_and_inventory_are_authenticated(self):
        entry=p.contract();row=entry['baselineRuns'][0]
        state={'hosting':{'version':entry['baselineHostingVersion']},'functions':[{'name':p.PREFIX+n} for n in entry['installedFunctions']]}
        metadata={'id':row['artifactId'],'name':'test-proof','expired':False,'digest':'sha256:'+row['artifactSha256'],'workflow_run':{'id':row['id']}}
        with patch.object(p,'_original_baseline',return_value=state),patch.object(p.cycle,'gh',return_value=metadata):
            self.assertEqual(p.baseline(entry,ROOT),state)
            metadata['expired']=True
            with self.assertRaises(ValueError):p.baseline(entry,ROOT)
            metadata['expired']=False;state['functions'].pop()
            with self.assertRaises(ValueError):p.baseline(entry,ROOT)

    def test_original_source_candidate_and_every_revision_are_authenticated(self):
        entry=p.contract();source_candidate='b'*40
        rows=[dict(name=p.PREFIX+n,commit=source_candidate,state='ACTIVE',revision=n+'-r1',updateTime='2026-11-18T10:00:00Z') for n in entry['allowedFunctions']]
        run={'id':12345,'head_sha':source_candidate,'head_branch':'main','path':p.WORKFLOW,'event':'workflow_dispatch','run_attempt':1,'status':'completed','conclusion':'success','repository':{'full_name':p.REPOSITORY},'head_repository':{'full_name':p.REPOSITORY}}
        proof={'schema':1,'release':p.RELEASE,'candidate':source_candidate,'contractSha256':p.CONTRACT_SHA256,'applicationAnchor':entry['applicationCommit'],'baselineRun':entry['baselineRuns'][0]['id'],'selected':entry['allowedFunctions'],'state':{'functions':deepcopy(rows)},'taskContentsRead':False,
               **{k:True for k in ['configurationsUnchanged','otherFunctionsUnchanged','hostingUnchanged','controlsUnchanged']},
               'managedSources':{n:{'allPathsAndFileBytesIdentical':True,'generationReadAndReferencesRechecked':True,'archiveSha256':'c'*64,'archiveIdentity':'d'*64,'storageSource':{'bucket':'gcf-v2-sources-206080168534-europe-west1','object':n+'/function-source.zip','generation':'1'}} for n in entry['allowedFunctions']}}
        api=SimpleNamespace(gh=lambda endpoint:{'workflow_runs':[run]},artifact=lambda *args:run,read=lambda *args:deepcopy(proof),matching_functions=p.cycle.matching_functions,test_backend_fingerprints=lambda candidate:entry['fingerprints'])
        with tempfile.TemporaryDirectory() as directory:
            current={'functions':deepcopy(rows)}
            trusted=p.trusted_revisions(directory,current,api)
            self.assertEqual(trusted,{p.PREFIX+n for n in entry['allowedFunctions']})
            self.assertEqual(proof['candidate'],source_candidate,'Never relabel the successful source proof to a later Hosting/tooling candidate')
            current['functions'][0]['revision']='external-change'
            self.assertEqual(len(p.trusted_revisions(directory,current,api)),110)
            current['functions']=deepcopy(rows)
            proof['managedSources'][entry['allowedFunctions'][0]]['generationReadAndReferencesRechecked']=False
            self.assertEqual(p.trusted_revisions(directory,current,api),set())

if __name__=='__main__':unittest.main()
