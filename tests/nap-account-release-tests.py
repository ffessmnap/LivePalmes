"""Offline scope, drift, configuration and publisher refusal tests. No Google credentials."""
import copy
import importlib.util
import json
import itertools
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


policy = load('account_tests_policy', 'nap-account-release-policy.py')
publisher = load('account_tests_publisher', 'publish-nap-account-release.py')
state = load('account_tests_state', 'production-release-state.py')
cycle = load('account_tests_cycle', 'release-cycle.py')


def request():
    c = policy.contract()
    return {**{k: c[k] for k in ['schema', 'candidate', 'productionCommit', 'productionHosting', 'testRun']},
        'changes': [], 'excludedBackendReview': 'Pinned offline proof',
        'excludedBackendEvidence': {}, 'napAccountRelease': {'approval': 'ok', 'contractSha256': policy.DIGEST}}


class AccountReleaseTests(unittest.TestCase):
    def test_exact_scope_and_old_requests(self):
        self.assertEqual(len(policy.approved(request())), 99)
        self.assertEqual(policy.approved({}), [])
        self.assertEqual(len(policy.contract()['existingSelected']), 98)
        self.assertEqual(len(policy.contract()['retained']), 15)

    def test_wrong_versions_or_proof_refused(self):
        for key, value in [('candidate','a'*40),('productionCommit','b'*40),('testRun',1),('productionHosting','sites/livepalmes/versions/other')]:
            row=request();row[key]=value
            with self.assertRaises(ValueError): policy.approved(row)

    def test_mixed_exception_and_freeze_refused(self):
        for key,value in [('additionalPdfFunctions',['closeDueEngagementCompetitions']),('freezeTestCandidate',True),('productionAccountHistoryIndexes',{})]:
            row=request();row[key]=value
            with self.assertRaises(ValueError): policy.approved(row)
        row=request();row['napAccountRelease']['contractSha256']='0'*64
        with self.assertRaises(ValueError):policy.approved(row)

    def test_cannot_reduce_or_expand_selection(self):
        names=policy.approved(request())
        policy.selection(request(),names)
        for selected in [names[:-1],names+['processNapNotificationTask'],names+[names[0]]]:
            with self.assertRaises(ValueError):policy.selection(request(),selected)

    def test_new_trigger_private_projection_only(self):
        body=policy.new_function({'bucket':'test','object':'fixture.zip'})
        self.assertEqual(body['eventTrigger']['eventType'],'google.cloud.firestore.document.v1.written')
        self.assertIn({'attribute':'document','value':'users/{uid}','operator':'match-path-pattern'},body['eventTrigger']['eventFilters'])
        self.assertEqual(body['serviceConfig']['secretEnvironmentVariables'],policy.contract()['napBinding'])
        self.assertEqual(body['serviceConfig']['maxInstanceCount'],3)
        self.assertNotIn('SMTP',json.dumps(body))
        body['state']='ACTIVE';policy.assert_new(body)

    def test_new_trigger_broad_filters_and_extra_secret_refused(self):
        for section,key,value in [('eventTrigger','eventFilters',[]),('serviceConfig','secretEnvironmentVariables',[]),
             ('serviceConfig','serviceAccountEmail','other@example.test'),('serviceConfig','maxInstanceCount',100),
             ('eventTrigger','retryPolicy','RETRY_POLICY_DO_NOT_RETRY')]:
            body=policy.new_function({});body['state']='ACTIVE';body[section][key]=value
            with self.assertRaises(ValueError):policy.assert_new(body)

    def existing(self):
        body=policy.new_function({});body['name']=policy.PREFIX+policy.contract()['existingSelected'][0]
        body['state']='ACTIVE';body['revision']='old';body['updateTime']='old';body['labels']={'kept':'yes'}
        return body

    def test_existing_config_and_trigger_exact(self):
        before=self.existing();after=copy.deepcopy(before);after['labels']['livepalmes-commit']=policy.contract()['candidate']
        policy.assert_existing(before,after,state)
        for section,key,value in [('serviceConfig','timeoutSeconds',300),('eventTrigger','eventFilters',[]),('buildConfig','runtime','nodejs24')]:
            bad=copy.deepcopy(after);bad[section][key]=value
            with self.assertRaises(ValueError):policy.assert_existing(before,bad,state)

    def filter_order_pair(self, mail=False):
        before=self.existing();before['name']=policy.PREFIX+('syncEngagementMailRecipientIndex' if mail else 'syncOfficialResultToPublicIndex')
        before['serviceConfig']['revision']='syncengagementmailrecipientindex-00023-pig' if mail else 'syncofficialresulttopublicindex-00052-gup'
        before['eventTrigger']['eventFilters']=[{'attribute':'namespace','value':'(default)'},
            {'attribute':'document','operator':'match-path-pattern','value':'users/{uid}' if mail else 'competitions/{competitionId}/results/{resultId}'},
            {'attribute':'database','value':'(default)'}]
        after=copy.deepcopy(before);after['serviceConfig']['revision']='syncengagementmailrecipientindex-00024-lak' if mail else 'syncofficialresulttopublicindex-00053-toz'
        after['eventTrigger']['eventFilters']=list(reversed(after['eventTrigger']['eventFilters']))
        after['labels']['livepalmes-commit']=policy.contract()['candidate']
        return before,after

    def test_exact_reviewed_filter_order_is_equivalent(self):
        before,after=self.filter_order_pair();policy.assert_existing(before,after,state)

    def test_all_72_filter_order_combinations_for_both_existing_triggers(self):
        for mail in [False,True]:
            before,after=self.filter_order_pair(mail)
            filters=before['eventTrigger']['eventFilters']
            for old_order,new_order in itertools.product(itertools.permutations(filters),repeat=2):
                original,current=copy.deepcopy(before),copy.deepcopy(after)
                original['eventTrigger']['eventFilters']=list(old_order)
                current['eventTrigger']['eventFilters']=list(new_order)
                policy.assert_existing(original,current,state)

    def test_mail_index_filters_and_configuration_stay_strict(self):
        before,after=self.filter_order_pair(True)
        for mutate in ['value','operator','region','account','revision']:
            current=copy.deepcopy(after)
            if mutate=='value':current['eventTrigger']['eventFilters'][1]['value']='other/{uid}'
            elif mutate=='operator':current['eventTrigger']['eventFilters'][1]['operator']='other'
            elif mutate=='region':current['eventTrigger']['triggerRegion']='other'
            elif mutate=='account':current['serviceConfig']['serviceAccountEmail']='other@example.test'
            else:current['serviceConfig']['revision']='syncengagementmailrecipientindex-00025-other'
            with self.assertRaises(ValueError):policy.assert_existing(before,current,state)

    def test_filter_changes_duplicates_and_other_configuration_refused(self):
        before,after=self.filter_order_pair()
        for change in ['value','operator','duplicate','type','account','timeout']:
            bad=copy.deepcopy(after)
            if change=='value':bad['eventTrigger']['eventFilters'][1]['value']='users/{uid}'
            elif change=='operator':bad['eventTrigger']['eventFilters'][1]['operator']='other'
            elif change=='duplicate':bad['eventTrigger']['eventFilters'].append(bad['eventTrigger']['eventFilters'][0])
            elif change=='type':bad['eventTrigger']['eventType']='other'
            elif change=='account':bad['serviceConfig']['serviceAccountEmail']='other@example.test'
            else:bad['serviceConfig']['timeoutSeconds']=300
            with self.assertRaises(ValueError):policy.assert_existing(before,bad,state)

    def test_filter_equivalence_cannot_be_reused_for_another_revision(self):
        before,after=self.filter_order_pair();after['serviceConfig']['revision']='syncofficialresulttopublicindex-00054-other'
        with self.assertRaises(ValueError):policy.assert_existing(before,after,state)

    def test_reference_nap_binding_cannot_change(self):
        c=policy.contract();rows=[{'name':policy.PREFIX+n} for n in c['existingSelected']+[r['name'] for r in c['retained']]]
        byname={r['name'].split('/')[-1]:r for r in rows}
        byname[c['referenceTrigger']].update({'eventTrigger':c['trigger'],'serviceConfig':{'serviceAccountEmail':c['runtimeAccount']}})
        byname[c['referenceNap']]['serviceConfig']={'serviceAccountEmail':c['runtimeAccount'],'secretEnvironmentVariables':c['napBinding']}
        policy.references(rows)
        byname[c['referenceNap']]['serviceConfig']['secretEnvironmentVariables']=[]
        with self.assertRaises(ValueError):policy.references(rows)

    def test_pending_preserves_excluded_identities(self):
        body=self.existing();before={body['name']:body};current=copy.deepcopy(before)
        todo,create=publisher.pending(before,current,{},state)
        self.assertEqual(todo,[body['name'].split('/')[-1]]);self.assertTrue(create)
        current[body['name']]['updateTime']='drift'
        with self.assertRaises(ValueError):publisher.pending(before,current,{},state)

    def test_resume_requires_attested_revision_and_configuration(self):
        body=self.existing();before={body['name']:body};current=copy.deepcopy(before)
        actual=current[body['name']];actual['updateTime']='new';actual['labels']['livepalmes-commit']=policy.contract()['candidate']
        previous={body['name']:state.identity(actual)}
        self.assertEqual(publisher.pending(before,current,previous,state),([],True))
        actual['serviceConfig']['timeoutSeconds']=300
        with self.assertRaises(ValueError):publisher.pending(before,current,previous,state)

    def test_new_trigger_unknown_creation_refused(self):
        new=policy.new_function({});new['state']='ACTIVE'
        with self.assertRaises(ValueError):publisher.pending({}, {new['name']:new}, {},state)

    def test_guard_requires_initial_witness_and_refuses_mail_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory);(path/'request.json').write_text(json.dumps(request()))
            fake=SimpleNamespace(controls=lambda *args:{'mailSha256':'first','schedulerSha256':'same','queueSha256':'same'})
            with patch.object(publisher,'load',return_value=fake):
                with self.assertRaises(ValueError):publisher.guard(path,True)
                publisher.guard(path);publisher.guard(path,True)
                fake.controls=lambda *args:{'mailSha256':'changed'}
                with self.assertRaises(ValueError):publisher.guard(path)

    def test_wiring_excludes_firebase_and_mail_mutations(self):
        names=cycle.approved_extra_functions(request())
        self.assertEqual(names,policy.contract()['selected'])
        self.assertEqual(cycle.idf_preservation(request())['scope'],'all')
        code=(ROOT/'tools/publish-nap-account-release.py').read_text()
        self.assertNotIn('setIamPolicy',code)
        self.assertNotIn('cloudtasks.googleapis.com',code)
        self.assertIn('?updateMask=build_config.source,labels',code)

    def run_publisher(self, fail_update=False, resume=False):
        c=policy.contract();rows=[]
        for name in c['existingSelected']+[r['name'] for r in c['retained']]:
            row=self.existing();row['name']=policy.PREFIX+name;rows.append(row)
        calls=[]
        def api(url,method='GET',body=None):
            calls.append((url,method,body))
            if url.endswith(':generateUploadUrl'):
                return {'uploadUrl':'https://storage.googleapis.com/fixture','storageSource':{'bucket':'fixture','object':'code.zip'}}
            if method=='PATCH' and url.endswith('?updateMask=build_config.source,labels'):
                self.assertEqual(set(body),{'name','buildConfig','labels'})
                if fail_update:raise ValueError('simulated build failure')
                return {'done':True}
            if method=='POST' and url.endswith('/functions?functionId='+policy.NAME):
                self.assertEqual(body,policy.new_function({'bucket':'fixture','object':'code.zip'}))
                return {'done':True}
            raise AssertionError('Forbidden API: '+method+' '+url)
        fake=SimpleNamespace(API=state.API,inventory=lambda:copy.deepcopy(rows),request=api,
            identity=state.identity,rollback_patch=state.rollback_patch,wait_operation=lambda op:None,check_after=lambda *args:None)
        if resume:
            current=copy.deepcopy(rows)
            for row in current:
                if row['name'].split('/')[-1] in c['existingSelected']:
                    row['updateTime']='new';row['labels']['livepalmes-commit']=c['candidate']
            new=policy.new_function({});new['state']='ACTIVE';current.append(new)
            fake.inventory=lambda:copy.deepcopy(current)
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);plan=root/'plan';backup=root/'backup';plan.mkdir();backup.mkdir()
            (plan/'request.json').write_text(json.dumps(request()));(plan/'selection.json').write_text(json.dumps(c['selected']))
            (backup/'functions.json').write_text(json.dumps(rows))
            (backup/'report.json').write_text(json.dumps({'additionalNapAccountFunctions':c['selected'],
                'candidate':c['candidate'],'newFunctions':[policy.NAME]}))
            if resume:
                previous=plan/'previous';(previous/'guards').mkdir(parents=True)
                (previous/'production-after.json').write_text(json.dumps({'candidate':c['candidate'],
                    'functions':[state.identity(f) for f in current]}))
                (previous/'guards/nap-account-source-update.json').write_text(json.dumps({'candidate':c['candidate'],
                    'created':True,'updated':c['existingSelected']}))
            with patch.object(publisher,'load',return_value=fake),patch.object(publisher,'guard'),patch.object(publisher.urllib.request,'urlopen'):
                if fail_update:
                    with self.assertRaises(ValueError):publisher.publish(root,plan,backup,cycle,lambda *args:b'fixture')
                else:publisher.publish(root,plan,backup,cycle,lambda *args:b'fixture')
        return calls

    def test_only_source_patches_and_one_create_no_invocation(self):
        calls=self.run_publisher()
        self.assertEqual(sum(method=='PATCH' for _,method,_ in calls),98)
        creates=[url for url,method,_ in calls if method=='POST' and '?functionId=' in url]
        self.assertEqual(len(creates),1)
        self.assertTrue(calls[-1][0].endswith('?functionId='+policy.NAME))

    def test_failed_source_update_prevents_trigger_creation(self):
        calls=self.run_publisher(True)
        self.assertFalse(any('?functionId=' in url for url,_,_ in calls))

    def test_attested_complete_resume_makes_no_source_api_call(self):
        self.assertEqual(self.run_publisher(resume=True),[])


if __name__=='__main__':unittest.main()
