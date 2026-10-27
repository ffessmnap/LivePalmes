"""Offline IAM delta checks; no policy writer or real grant."""
import copy
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('scheduler_iam',ROOT/'tools/prepare-scheduler-iam.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.policy={'version':3,'etag':'unchanged-etag','bindings':[{'role':'roles/viewer','members':['user:fixture@example.invalid']}]}
        self.now=datetime(2026,10,27,12,0,tzinfo=timezone.utc)

    def test_exact_single_permission_member_and_two_hour_window(self):
        original=copy.deepcopy(self.policy);result=m.proposal(self.policy,None,self.now)
        self.assertEqual(result['roleDefinition']['includedPermissions'],['cloudscheduler.jobs.update'])
        self.assertEqual(result['bindingToAdd']['members'],[m.MEMBER])
        self.assertEqual(result['bindingToAdd']['role'],m.ROLE)
        self.assertEqual(result['maximumDurationSeconds'],7200)
        self.assertEqual(result['expiresAt'],'2026-10-27T14:00:00Z')
        self.assertEqual(result['bindingToAdd']['condition']['expression'],
            'request.time >= timestamp("2026-10-27T12:00:00Z") && request.time < timestamp("2026-10-27T14:00:00Z")')
        self.assertFalse(result['iamSingleJobRestriction']);self.assertFalse(result['iamFieldRestriction'])
        self.assertFalse(result['applyAuthorized']);self.assertFalse(result['automaticRenewal'])
        self.assertEqual(result['cloudWrites'],0);self.assertEqual(self.policy,original)
        self.assertTrue(result['backupAndFreshEtagRequiredBeforeApply'])

    def test_unknown_broader_or_existing_unbounded_role_is_rejected(self):
        role={'name':m.ROLE,**m.ROLE_BODY}
        self.assertFalse(m.proposal(self.policy,role,self.now)['roleCreationRequired'])
        for field,value in [('includedPermissions',['cloudscheduler.jobs.update','cloudscheduler.jobs.run']),
            ('name','projects/other/roles/other'),('deleted',True),('stage','DISABLED')]:
            bad={**role,field:value}
            with self.subTest(field=field),self.assertRaises(ValueError):m.proposal(self.policy,bad,self.now)
        self.policy['bindings'].append({'role':m.ROLE,'members':[m.MEMBER]})
        with self.assertRaises(ValueError):m.proposal(self.policy,role,self.now)

    def test_missing_policy_version_etag_or_clock_is_rejected(self):
        for field,value in [('version',1),('version',0),('etag',''),('bindings',{})]:
            with self.subTest(field=field),self.assertRaises(ValueError):m.proposal({**self.policy,field:value},None,self.now)
        with self.assertRaises(ValueError):m.proposal(self.policy,None,datetime(2026,10,27))

    def test_no_cloud_writer_can_be_used(self):
        with patch.object(m.urllib.request,'urlopen') as network:
            for url,body in [(m.POLICY_URL,{'policy':self.policy}),
                (m.POLICY_URL.replace('getIamPolicy','setIamPolicy'),{'policy':self.policy}),
                (m.ROLE_URL,m.ROLE_BODY),(m.TEST_URL,{'permissions':['iam.roles.create']}),
                ('https://cloudscheduler.googleapis.com/v1/projects/livepalmes/locations/europe-west1/jobs/job',None)]:
                with self.subTest(url=url),self.assertRaises(ValueError):m.read(url,'offline',body)
            network.assert_not_called()

    def test_sources_have_no_iam_grant_command(self):
        source=(ROOT/'tools/prepare-scheduler-iam.py').read_text(encoding='utf8')
        self.assertNotIn('setIamPolicy',source);self.assertNotIn('add-iam-policy-binding',source)
        self.assertNotIn('roles/cloudscheduler.admin',source)
        workflow=(ROOT/'.github/workflows/livepalmes-scheduler-iam-prepare.yml').read_text(encoding='utf8')
        self.assertIn('cancel-in-progress: false',workflow)
        self.assertIn('github.run_attempt == 1',workflow)

if __name__=='__main__':unittest.main()
