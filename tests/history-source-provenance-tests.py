"""Offline refusal and selection scenarios across an intentionally missing history."""
from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('history_test_cycle', ROOT/'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cycle)
h = cycle.history_provenance
OLD = '1'*40
FUNCTION = 'fixtureReader'


def fixture():
    return {'schema':1, 'kind':'a1-source-provenance-v1',
            'evidence':{'productionRun':1,'testRun':2,'artifacts':{'fixture':'a'*64}},
            'engines':h.engine_hashes(ROOT),
            'commits':{OLD:{a:{FUNCTION:'a'*64} for a in h.ALGORITHMS}},
            'baselines':{OLD:{'commit':'2'*40,'tree':'3'*40}}}


def validate(value, engines=None):
    raw = json.dumps(value).encode()
    return h.validate(raw,hashlib.sha256(raw).hexdigest(),engines or h.engine_hashes(ROOT))


class HistoryProvenanceTests(unittest.TestCase):
    def tearDown(self):
        cycle.backend_fingerprints.cache_clear()
        cycle.production_selection_fingerprints.cache_clear()
        cycle.test_backend_fingerprints.cache_clear()

    def repository(self, directory):
        root = Path(directory)
        def git(*args):
            return subprocess.check_output(['git','-c','user.name=Fixture','-c','user.email=fixture@example.invalid',
                '-c','commit.gpgsign=false',*args],cwd=root,stderr=subprocess.DEVNULL,text=True).strip()
        git('init','-q')
        for name in cycle.standard_sources.PROTECTED:
            path=root/name; path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text('fixture\n',encoding='utf-8')
        (root/'public.txt').write_text('fixture public content\n',encoding='utf-8')
        git('add','.')
        git('commit','-qm','Synthetic clean baseline')
        commit=git('rev-parse','HEAD')
        checkpoint=fixture()
        checkpoint['baselines'][OLD]={'commit':commit,'tree':git('rev-parse','HEAD^{tree}')}
        return root,git,checkpoint,commit

    def test_altered_bytes_and_duplicate_json_keys_are_rejected(self):
        raw=json.dumps(fixture()).encode()
        with self.assertRaises(h.ProvenanceError):
            h.validate(raw+b' ',hashlib.sha256(raw).hexdigest(),h.engine_hashes(ROOT))
        duplicate=b'{"schema":1,"schema":1}'
        with self.assertRaisesRegex(h.ProvenanceError,'dupliquee'):
            h.validate(duplicate,hashlib.sha256(duplicate).hexdigest(),h.engine_hashes(ROOT))

    def test_unknown_schema_algorithm_or_changed_engine_cannot_be_accepted(self):
        for change in ['schema','algorithm','engine']:
            value=fixture()
            if change=='schema': value['extra']=True
            elif change=='algorithm': value['commits'][OLD]['unknown']={FUNCTION:'b'*64}
            else: value['engines'][h.ENGINES[0]]='b'*64
            with self.subTest(change=change), self.assertRaises(h.ProvenanceError): validate(value)

    def test_only_hashes_and_bounded_function_maps_are_accepted(self):
        for replacement in ['full source text',{}, {FUNCTION:'not-a-hash'}]:
            value=fixture();value['commits'][OLD]['legacy']=replacement
            with self.subTest(replacement=replacement), self.assertRaises(h.ProvenanceError): validate(value)

    def test_missing_origin_uses_attested_hashes_without_reading_application_source(self):
        with tempfile.TemporaryDirectory() as d:
            root,git,value,commit=self.repository(d)
            with patch.object(h,'checkpoint',return_value=validate(value)):
                live=lambda _: self.fail('The old application must not be read or executed')
                self.assertEqual(h.fingerprints(root,OLD,'legacy',live),{FUNCTION:'a'*64})
                with self.assertRaisesRegex(h.ProvenanceError,'non couverte'):
                    h.fingerprints(root,'f'*40,'legacy',live)

    def test_git_failure_or_non_commit_object_never_uses_the_checkpoint(self):
        with tempfile.TemporaryDirectory() as d:
            with patch.object(h,'checkpoint') as checkpoint,self.assertRaises(h.ProvenanceError):
                h.fingerprints(Path(d),OLD,'legacy',lambda _:None)
            checkpoint.assert_not_called()
            root,git,value,commit=self.repository(d)
            blob=git('rev-parse','HEAD:public.txt')
            with patch.object(h,'checkpoint') as checkpoint,self.assertRaises(h.ProvenanceError):
                h.fingerprints(root,blob,'legacy',lambda _:None)
            checkpoint.assert_not_called()

    def test_full_selection_remains_computed_and_unknown_origin_never_becomes_a_broad_deploy(self):
        with tempfile.TemporaryDirectory() as d:
            root,git,value,commit=self.repository(d)
            state={'state':'ACTIVE','commit':OLD}
            with patch.object(cycle,'ROOT',root),patch.object(h,'checkpoint',return_value=validate(value)):
                for desired,changed in [('a'*64,False),('b'*64,True)]:
                    cycle.production_selection_fingerprints.cache_clear()
                    with patch.object(cycle,'run',return_value=json.dumps({'functions':{FUNCTION:desired}})):
                        self.assertEqual(cycle.needs_function(state,FUNCTION,commit),changed)
                cycle.production_selection_fingerprints.cache_clear()
                with self.assertRaises(h.ProvenanceError):
                    cycle.needs_function({**state,'commit':'f'*40},FUNCTION,commit)
                with self.assertRaisesRegex(h.ProvenanceError,'Fonction absente'):
                    cycle.needs_function(state,'unknownFunction',commit)

    def test_alias_preserves_original_identity_and_requires_the_exact_recorded_tree(self):
        with tempfile.TemporaryDirectory() as d:
            root,git,value,commit=self.repository(d)
            original=('show',OLD+':public.txt')
            with patch.object(h,'checkpoint',return_value=validate(value)):
                resolved=h.resolve_git_arguments(root,original)
                self.assertEqual(resolved,('show',commit+':public.txt'))
                self.assertEqual(original,('show',OLD+':public.txt'))
                self.assertEqual(git(*resolved),'fixture public content')
                self.assertEqual(h.resolve_git_arguments(root,('rev-parse',OLD+'^{tree}')),
                                 ('rev-parse',commit+'^{tree}'))
            bad=deepcopy(value);bad['baselines'][OLD]['tree']='f'*40
            with patch.object(h,'checkpoint',return_value=validate(bad)),self.assertRaisesRegex(h.ProvenanceError,'Arbre'):
                h.resolve_git_arguments(root,original)

    def test_configuration_change_is_still_rejected_by_the_existing_source_only_policy(self):
        with tempfile.TemporaryDirectory() as d:
            root,git,value,commit=self.repository(d)
            (root/'firebase.json').write_text('changed fixture\n',encoding='utf-8')
            git('add','firebase.json');git('commit','-qm','Synthetic config divergence')
            current=git('rev-parse','HEAD')
            def read(*args): return git(*h.resolve_git_arguments(root,args))
            with patch.object(h,'checkpoint',return_value=validate(value)):
                with self.assertRaisesRegex(ValueError,'hors sources seules'):
                    cycle.standard_sources.source_paths(OLD,current,['firebase.json'],read)

    def test_real_checkpoint_matches_the_immutable_a1_production_contract(self):
        value=h.checkpoint()
        spec=importlib.util.spec_from_file_location('privacy_contract',ROOT/'tools/public-privacy-production-policy.py')
        policy=importlib.util.module_from_spec(spec);spec.loader.exec_module(policy)
        manifest=policy.expected_manifest()
        self.assertEqual(value['evidence']['productionRun'],43707826259)
        for row in manifest['origins']:
            name=row['name'].split('/')[-1]
            for algorithm,before,after in [('legacy','legacyBefore','legacyAfter'),('production-selection','before','after')]:
                self.assertEqual(value['commits'][row['commit']][algorithm][name],row[before])
                self.assertEqual(value['commits'][manifest['candidate']][algorithm][name],row[after])


if __name__=='__main__': unittest.main()
