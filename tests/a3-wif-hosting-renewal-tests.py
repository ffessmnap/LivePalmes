"""Fictitious credentials, commands and clocks; no Google or GitHub calls."""
import copy
import datetime
import importlib.util
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module
probe=load('wif_hosting_renewal',ROOT/'tools/a3-wif-hosting-renewal.py')
fixtures=load('wif_original_fixtures',ROOT/'tests/a3-wif-hosting-readonly-tests.py')

def receipt():
    def iso(seconds):
        return datetime.datetime.fromtimestamp(2_000_000_000+seconds,datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
    return {'profile':{k:v for k,v in probe.consumer.PROFILE.items() if k!='gcloud'},
            'sameCliModuleProcess':True,'cliSiteReads':2,'site':'livepalmes',
            'requestedTokenLifetimeSeconds':600,'referenceCredentialTokenCalls':2,
            'referenceTokenChanged':True,'initialCliTokenExpiryObserved':False,
            'cliInitialTokenLifetimeInferredFromPinnedAdc':True,
            'longSinglePublicationCommandQualified':False,'tokensExported':False,
            'configurationWrites':0,'publicationInvocations':0,'accountsRead':0,
            'referenceFirstExpiresAt':iso(600),'referenceSecondExpiresAt':iso(1210),
            'secondCliStartedAt':iso(610),'waitedAfterFirstCliMs':610000}

class RenewalTests(unittest.TestCase):
    def setUp(self):
        self.fixture=fixtures.ProbeTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.env={**self.fixture.env,'WIF_QUALIFICATION':'hosting-renewal'}

    def test_closed_context_before_original_credential(self):
        probe.context(self.env)
        for key in ['WIF_QUALIFICATION','GITHUB_EVENT_NAME','GITHUB_WORKFLOW_REF','EXPECTED_COMMIT','VERIFIED_MAIN_CI','GITHUB_REF']:
            with patch.object(Path,'lstat',side_effect=AssertionError('Credential access')):
                with self.assertRaises(ValueError):
                    probe.consumer.credential({**self.env,key:'wrong'},qualification='hosting-renewal')
        with self.assertRaises(ValueError):
            probe.consumer.context(self.env,qualification='arbitrary')

    def exercise(self,bad=None):
        private=self.fixture.base/('renewal-'+str(len(list(self.fixture.base.iterdir()))))
        private.mkdir()
        calls=[]
        def run(args,env,cwd):
            calls.append(args)
            self.assertEqual(args,['node',str(probe.ROOT/'tools/a3-wif-hosting-renewal.js'),str(private/'consumer-report.json')])
            self.assertEqual(cwd,private)
            for key in ['FIREBASE_TOKEN','GOOGLE_OAUTH_ACCESS_TOKEN','GH_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','FIREBASE_HOSTING_URL','HOME']:
                self.assertNotIn(key,env)
            adc=Path(env['GOOGLE_APPLICATION_CREDENTIALS'])
            expected={**self.fixture.record,'service_account_impersonation':{'token_lifetime_seconds':600}}
            self.assertEqual(json.loads(adc.read_text()),expected)
            self.assertEqual(json.loads((private/'configstore/firebase-tools.json').read_text()),{'usage':False})
            value=receipt()
            if bad=='report':value['tokensExported']=True
            if bad=='original':self.fixture.file.write_text('{}')
            if bad=='copy':adc.write_text('{}')
            (private/'consumer-report.json').write_text(json.dumps(value),encoding='utf-8')
        result=probe.exercise(self.env,private,run)
        self.assertEqual(len(calls),1)
        self.assertEqual(result,receipt())
        self.assertEqual(json.loads(self.fixture.file.read_text()),self.fixture.record)
        for marker in ['PUBLIC-','FORBIDDEN','NOT-EXPORTED','private_key']:
            self.assertNotIn(marker,json.dumps(result))

    def test_two_read_protocol_private_copy_and_no_exports(self):
        self.exercise()

    def test_tampering_refused_before_public_receipt(self):
        for bad in ['report','copy','original']:
            self.fixture.file.write_text(json.dumps(self.fixture.record),encoding='utf-8')
            with self.assertRaises(ValueError):self.exercise(bad)
        self.fixture.file.write_text(json.dumps({**self.fixture.record,'service_account_impersonation':{'token_lifetime_seconds':600}}))
        with self.assertRaises(ValueError):self.exercise()

    def test_false_renewal_or_broader_scope_refused(self):
        self.assertEqual(probe.report(receipt()),receipt())
        for key,value in [('site','other'),('cliSiteReads',3),('tokensExported',True),('configurationWrites',1),
                          ('referenceTokenChanged',False),('initialCliTokenExpiryObserved',True),
                          ('longSinglePublicationCommandQualified',True),('waitedAfterFirstCliMs',609999),
                          ('waitedAfterFirstCliMs',750001),('publicationInvocations',False),('private_key','FORBIDDEN')]:
            changed={**receipt(),key:value}
            with self.assertRaises(ValueError):probe.report(changed)
        changed=receipt();changed['secondCliStartedAt']=changed['referenceFirstExpiresAt']
        with self.assertRaises(ValueError):probe.report(changed)

if __name__=='__main__':unittest.main()
