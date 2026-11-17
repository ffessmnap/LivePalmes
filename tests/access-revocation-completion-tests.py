"""Closed Hosting completion; fictitious metadata only, no credentials or services."""
import copy,hashlib,importlib.util,json
from pathlib import Path
from types import SimpleNamespace
import tempfile,unittest
from unittest.mock import Mock,patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name.replace('-','_'),ROOT/'tools'/name)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
m=load('access-revocation-production-recovery.py');p=m.policy()


class CompletionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        self.selected=p.contract()['selected'];account='existing@livepalmes.iam.gserviceaccount.com'
        self.before=[]
        for name in self.selected+['retained'+str(i) for i in range(12)]:
            self.before.append({'name':p.PREFIX+name,'state':'ACTIVE','environment':'GEN_2','updateTime':'old',
                'buildConfig':{'runtime':'nodejs22','entryPoint':name,'source':{'storageSource':{'object':'old'}}},
                'serviceConfig':{'serviceAccountEmail':account,'revision':'old','maxInstanceCount':20},
                'labels':{'livepalmes-commit':'b'*40,'existing':'unchanged'}})
        self.current=copy.deepcopy(self.before)
        for f in self.current:
            if f['name'].split('/')[-1] in self.selected:
                f['serviceConfig']['revision']='new';f['updateTime']='new'
                f['labels']['livepalmes-commit']=p.CANDIDATE
                f['buildConfig']['source']={'storageSource':{'object':'new'}}
        identity=lambda f:{'name':f['name'],'state':f['state'],'updateTime':f['updateTime'],'revision':f['serviceConfig']['revision']}
        self.after={'candidate':p.CANDIDATE,'errors':[],'functions':[identity(f) for f in self.current]}
        self.controls={'mailSha256':'a'*64,'schedulerSha256':'b'*64,'queueSha256':'c'*64,'templatesSha256':'d'*64}
        self.manifest={'selected':self.selected,'origins':[{**identity(f),'commit':'b'*40} for f in self.before],'controls':self.controls}
        self.source={'candidate':p.CANDIDATE,'manifestSha256':m.digest(self.manifest),
            'functions':{identity(f)['name']:{'identity':identity(f),'allPathsAndFileBytesIdentical':True,
                'generationReadAndReferencesRechecked':True} for f in self.current if f['name'].split('/')[-1] in self.selected}}
        self.c={**m.contract(),'manifestSha256':m.digest(self.manifest),'criticalFiles':{}}
        self.ctx={'candidate':p.CANDIDATE,'run':789,'attempt':1,'toolingCommit':'d'*40,'manifestSha256':m.digest(self.manifest),
            'workflowRef':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-readiness.yml@refs/heads/main'}
        self.guard=self.root/'previous/standard-guards'
        self.write('selection.json',list(reversed(self.selected)));self.write('previous/production-after.json',self.after)
        self.write('previous/standard-guards/standard-source-receipts.json',self.source)
        for phase in ['before','after']:self.write('previous/standard-guards/standard-controls-'+phase+'.json',self.controls)
        self.write('previous/standard-guards/standard-access-revocation-prerequisites-before.json',{'ready':True})
        self.write('completion-backup/functions.json',self.before)
        patches=[patch.object(m,'contract',return_value=self.c),patch.object(m,'policy',return_value=p),
            patch.object(p,'manifest',return_value=self.manifest),patch.object(p,'reader_context',return_value=self.ctx),
            patch.object(p,'contract',return_value={**p.contract(),'runtimeAccountSha256':hashlib.sha256(account.encode()).hexdigest()})]
        for item in patches:item.start();self.addCleanup(item.stop)
        self.env=patch.dict(m.os.environ,{'A33_RECOVERY_RUN':str(m.INITIAL_RUN)});self.env.start();self.addCleanup(self.env.stop)

    def write(self,name,value):
        dest=self.root/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(value));return dest

    def test_complete_source_evidence_keeps_all107_and_all119(self):
        self.assertEqual(m.evidence(self.root),self.manifest)
        with patch.object(m,'authenticate_origin'),patch.object(p,'approved',return_value=self.selected):
            self.assertTrue(m.hosting_only(self.root,{},list(reversed(self.selected)),SimpleNamespace()))
            for selected in [self.selected[:-1],self.selected+['unplanned'],self.selected+[self.selected[0]]]:
                with self.subTest(count=len(selected)),self.assertRaises(ValueError):m.hosting_only(self.root,{},selected,SimpleNamespace())

    def test_incomplete_wrong_or_inactive_source_evidence_refuses(self):
        for edit in ['missing','error','inactive','archive','generation','identity']:
            after=copy.deepcopy(self.after);source=copy.deepcopy(self.source)
            if edit=='missing':after['functions'].pop()
            if edit=='error':after['errors']=['unexpected']
            if edit=='inactive':after['functions'][0]['state']='FAILED'
            first=next(iter(source['functions']))
            if edit=='archive':source['functions'].pop(first)
            if edit=='generation':source['functions'][first]['generationReadAndReferencesRechecked']=False
            if edit=='identity':source['functions'][first]['identity']['revision']='untrusted'
            self.write('previous/production-after.json',after);self.write('previous/standard-guards/standard-source-receipts.json',source)
            with self.subTest(edit=edit),self.assertRaises(ValueError):m.evidence(self.root)

    def test_retained_and_byte_witness_drift_refuse(self):
        after=copy.deepcopy(self.after);after['functions'][-1]['revision']='changed'
        self.write('previous/production-after.json',after)
        with self.assertRaises(ValueError):m.evidence(self.root)
        self.write('previous/production-after.json',self.after)
        (self.guard/'standard-controls-after.json').write_text(json.dumps(self.controls,indent=2))
        with self.assertRaises(ValueError):m.evidence(self.root)

    def test_sealed_file_change_cannot_be_rebased_in_place(self):
        file=self.root/'selection.json';self.c['criticalFiles']={'selection.json':hashlib.sha256(file.read_bytes()).hexdigest()}
        file.write_text(json.dumps(self.selected))
        with self.assertRaises(ValueError):m.evidence(self.root)

    def test_last_source_guard_must_have_passed(self):
        self.write('previous/standard-guards/standard-access-revocation-prerequisites-before.json',{'ready':False})
        with self.assertRaises(ValueError):m.evidence(self.root)

    def test_original_witness_and_source_receipts_are_preserved_without_writer(self):
        with patch.object(m,'authenticate_origin'):
            m.restore_witness(self.root,self.guard)
        self.assertEqual((self.root/'standard-controls-before.json').read_bytes(),(self.guard/'standard-controls-before.json').read_bytes())
        self.assertEqual((self.root/'standard-source-receipts.json').read_bytes(),(self.guard/'standard-source-receipts.json').read_bytes())
        self.write('standard-controls-before.json',{'changed':True})
        with patch.object(m,'authenticate_origin'),self.assertRaises(ValueError):m.restore_witness(self.root,self.guard)

    def test_context_rejects_another_run_or_new_baseline(self):
        for run in ['0','1']:
            with patch.dict(m.os.environ,{'A33_RECOVERY_RUN':run}),self.assertRaises(ValueError):m.context(self.root)
        self.ctx['workflowRef']=self.ctx['workflowRef'].replace('readiness','release')
        with patch.dict(m.os.environ,{'PREPARATION_RUN':'1'}),self.assertRaises(ValueError):m.context(self.root)
        with patch.dict(m.os.environ,{'PREPARATION_RUN':'0','RESUME':'1'}),self.assertRaises(ValueError):m.context(self.root)

    def test_current_full_configuration_and_retained_revisions_are_rechecked(self):
        m.initial_after(self.root,self.current)
        for edit in ['configuration','binding','retained','label']:
            current=copy.deepcopy(self.current)
            if edit=='configuration':current[0]['serviceConfig']['maxInstanceCount']=1
            if edit=='binding':current[0]['serviceConfig']['secretEnvironmentVariables']=[{'key':'unplanned'}]
            if edit=='retained':current[-1]['serviceConfig']['revision']='changed'
            if edit=='label':current[0]['labels']['livepalmes-commit']='c'*40
            with self.subTest(edit=edit),self.assertRaises(ValueError):m.initial_after(self.root,current)

    def test_qualification_receipt_is_bound_to_current_run(self):
        ctx=m.context(self.root)
        value={**ctx,'functionsActive':119,'sourceWrites':0,'originalBackupOpenedInOfficialRunner':True}
        self.write('standard-access-revocation-completion-qualified.json',value)
        self.assertEqual(m.qualification(self.root),value)
        for key,other in [('run',790),('toolingCommit','a'*40),('sourceWrites',1),('functionsActive',118)]:
            self.write('standard-access-revocation-completion-qualified.json',{**value,key:other})
            with self.subTest(key=key),self.assertRaises(ValueError):m.qualification(self.root)

    def test_official_readiness_must_match_head_run_backup_and_active_readers(self):
        proof={**m.context(self.root),'run':456,'encryptedBackupSha256':self.c['encryptedBackupSha256'],
            'functionsActive':119,'sourceWrites':0,'existingSourcesQualified':107,'newBaseline':False,
            'originalBackupOpenedInOfficialRunner':True}
        base={'ready':True,'readOnly':True,'missingPermissions':[],'candidate':p.CANDIDATE,'planRun':self.c['preflightRun']}
        backend={**base,'accessRevocationCompletion':proof,'accessRevocation':{'ready':True,'run':456,
            'sameRunReadersVerified':True,'runtimeProfileReadPermissionVerified':True,'enabledAdministrativeAuthAccounts':2}}
        for change in ['none','head','permission','source-write','wrong-run','backup','reader']:
            report=copy.deepcopy(backend)
            if change=='permission':report['missingPermissions']=['unavailable']
            if change=='source-write':report['accessRevocationCompletion']['sourceWrites']=1
            if change=='wrong-run':report['accessRevocationCompletion']['run']=999
            if change=='backup':report['accessRevocationCompletion']['encryptedBackupSha256']='0'*64
            if change=='reader':report['accessRevocation']['sameRunReadersVerified']=False
            def artifact(run,name,target,workflow):
                self.assertEqual(str(run),'456');self.assertEqual(workflow,'.github/workflows/livepalmes-production-readiness.yml')
                target.mkdir(parents=True,exist_ok=True);kind=name.split('-')[-1]
                (target/('prerequisites-'+kind+'.json')).write_text(json.dumps(report if kind=='backend' else base))
                return {'head_sha':'e'*40 if change=='head' else self.ctx['toolingCommit']}
            with self.subTest(change=change),patch.dict(m.os.environ,{'A33_RECOVERY_READINESS_RUN':'456'}):
                if change=='none':m.require_readiness(self.root,SimpleNamespace(artifact=artifact))
                else:
                    with self.assertRaises(ValueError):m.require_readiness(self.root,SimpleNamespace(artifact=artifact))


class SourceOrderTests(unittest.TestCase):
    def test_completion_contract_is_immutable_and_original_contract_is_unchanged(self):
        self.assertEqual(m.contract()['originalContractSha256'],p.DIGEST)
        with patch.object(m,'DIGEST','0'*64),self.assertRaises(ValueError):m.contract()

    def test_real_source_only_final_branch_accepts_c33_permutation_and_rejects_changed_selection(self):
        entry=load('publish-approved-pdf-functions.py')
        selected=p.contract()['selected'];guard=Mock()
        fake_policy=SimpleNamespace(enabled=lambda _:True,approved=lambda _:selected,manifest=lambda _:{'selected':selected},guard=guard)
        with tempfile.TemporaryDirectory() as target:
            root=Path(target)
            fake_cycle=SimpleNamespace(source_policy=lambda _:fake_policy,require=m.require,read=lambda path:json.loads(Path(path).read_text()))
            fake_spec=SimpleNamespace(loader=SimpleNamespace(exec_module=lambda _:None))
            for option,observed,accepted in [('accessRevocationRelease',list(reversed(selected)),True),
                    ('accessRevocationRelease',selected[:-1],False),('accessRevocationRelease',selected+[selected[0]],False),
                    ('standardSources',list(reversed(selected)),False),('standardSources',selected,True)]:
                (root/'request.json').write_text(json.dumps({option:{}}));(root/'selection.json').write_text(json.dumps(observed));guard.reset_mock()
                with self.subTest(option=option,count=len(observed)),patch.object(entry.importlib.util,'spec_from_file_location',return_value=fake_spec),patch.object(entry.importlib.util,'module_from_spec',return_value=fake_cycle):
                    if accepted:entry.main(root,root,root);guard.assert_called_once_with(root)
                    else:
                        with self.assertRaises(ValueError):entry.main(root,root,root)
                        guard.assert_not_called()

    def test_workflow_keeps_all_function_writes_gated_and_fresh_test_before_resume(self):
        release=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text()
        source=release[release.index('    - name: Publier les Functions par petits lots'):release.index('    - name: Controler toutes les Functions')]
        self.assertIn("if: steps.plan.outputs.backend == 'true'",source)
        self.assertIn("if: inputs.resume_run == '0' || steps.plan.outputs.access_revocation_reader == 'true'",release)
        self.assertLess(release.index('Relire TEST avant toute ecriture PROD'),release.index('Ouvrir la sauvegarde initiale pour une reprise'))


if __name__=='__main__':unittest.main()
