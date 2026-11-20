"""Offline tests of the A6 contract, single ready index and selected backup."""
from copy import deepcopy
import hashlib
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('a6', ROOT/'tools/a6-production-reliability.py')
a6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a6)


class TestA6(unittest.TestCase):
    def test_only_frozen_request(self):
        c = a6.contract()
        req = {**c['request'],a6.OPTION:{'contractSha256':a6.DIGEST}}
        self.assertEqual(a6.approved(req), ['closeDueEngagementCompetitions',
                                            'readNapPublicSwimmer','syncNapClubAccountEmails'])
        for change in [{'candidate':'0'*40}, {'a4DependenciesRelease':{}}, {'testRun':1}]:
            with self.assertRaises(ValueError):
                a6.approved({**req, **change})

    def test_only_exact_ready_index(self):
        row = {'name':a6.INDEX+'/id','state':'READY','queryScope':'COLLECTION','fields':a6.FIELDS}
        self.assertEqual(a6.ready_index([row]),row['name'])
        for rows in ([], [row,row], [{**row,'state':'CREATING'}], [{**row,'queryScope':'COLLECTION_GROUP'}],
                     [{**row,'fields':list(reversed(a6.FIELDS))}], [{**row,'name':row['name'].replace('/livepalmes/','/livepalmes-test/')}]):
            with self.assertRaises(ValueError):
                a6.ready_index(rows)

    def test_backup_does_not_expand_to_retained_sources(self):
        names = a6.contract()['selected']
        value = {'selected':names,'candidate':a6.contract()['candidate']}
        before, entries = {}, []
        report = {'candidate':value['candidate'],'sourcePolicyKind':a6.KIND,'newFunctions':[],
                  'standardSourceManifestSha256':a6.digest(value),'sources':entries,
                  'functions':[{'name':a6.PREFIX+n} for n in names]}
        with TemporaryDirectory() as temp, patch.object(a6, 'validate_manifest'), patch.object(a6.inverse, 'runtime'):
            directory = Path(temp)
            (directory/'sources').mkdir()
            for n in names:
                source = {'bucket':'fixture','object':n+'/function-source.zip','generation':'1'}
                data = n.encode()
                (directory/'sources'/(n+'.zip')).write_bytes(data)
                entries.append({'functions':[n],'source':source,'sha256':hashlib.sha256(data).hexdigest()})
                before[a6.PREFIX+n] = {'name':a6.PREFIX+n,'buildConfig':{'source':{'storageSource':source}},'labels':{}}
            before[a6.PREFIX+'foreign'] = {}
            a6.verify_backup_inverse(directory,report,before,value)
            bad = deepcopy(report)
            bad['sources'][0]['functions'].append('foreign')
            with self.assertRaises(ValueError):
                a6.verify_backup_inverse(directory,bad,before,value)
            (directory/'sources'/(names[0]+'.zip')).write_bytes(b'changed')
            with self.assertRaises(ValueError):
                a6.verify_backup_inverse(directory,report,before,value)


if __name__ == '__main__':
    unittest.main()
