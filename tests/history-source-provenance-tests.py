"""Offline refusal and selection scenarios across an intentionally missing history."""
from copy import deepcopy
import base64
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


def baseline(commit, tree):
    return {'commit':commit,'sourceTree':tree,'tree':tree,'retiredPathsSha256':[],
            'redactedTestPathsSha256':[],'redactionProofSha256':None}


def literal_proof(before, after, indices, success=True):
    request = {'before':base64.b64encode(before.encode()).decode(),
               'after':base64.b64encode(after.encode()).decode(),'literalTokenIndices':indices}
    result = subprocess.run(['node',str(ROOT/'tools/history-fixture-projection.js')],
                            input=json.dumps(request),text=True,capture_output=True)
    if success:
        if result.returncode: raise AssertionError('Synthetic lexical fixture unexpectedly refused')
        return json.loads(result.stdout)
    if not result.returncode: raise AssertionError('Unsafe lexical fixture unexpectedly accepted')
    if before in result.stderr or after in result.stderr: raise AssertionError('Source leaked in diagnostic')


def fixture():
    return {'schema':2, 'kind':'a1-source-provenance-v2',
            'evidence':{'productionRun':1,'testRun':2,'artifacts':{'fixture':'a'*64}},
            'engines':h.engine_hashes(ROOT),
            'commits':{OLD:{a:{FUNCTION:'a'*64} for a in h.ALGORITHMS}},
            'baselines':{OLD:baseline('2'*40,'3'*40)}}


def validate(value, engines=None):
    raw = json.dumps(value).encode()
    return h.validate(raw,hashlib.sha256(raw).hexdigest(),engines or h.engine_hashes(ROOT))


class HistoryProvenanceTests(unittest.TestCase):
    def test_parser_bootstrap_checks_both_locked_archive_and_attested_bytes(self):
        spec=importlib.util.spec_from_file_location('parser_bootstrap',ROOT/'tools/prepare-history-parser.py')
        parser=importlib.util.module_from_spec(spec);spec.loader.exec_module(parser)
        import io,tarfile
        data=b'fixture parser bytes\n';archive=io.BytesIO()
        with tarfile.open(fileobj=archive,mode='w:gz') as tar:
            entry=tarfile.TarInfo('package/dist/acorn.js');entry.size=len(data);tar.addfile(entry,io.BytesIO(data))
        raw=archive.getvalue();integrity='sha512-'+base64.b64encode(hashlib.sha512(raw).digest()).decode()
        expected=hashlib.sha256(data).hexdigest()
        self.assertEqual(parser.parser_bytes(raw,integrity,expected),data)
        for content,signature,digest in [(raw+b'changed',integrity,expected),(raw,integrity,'0'*64),(b'x'*(1024**2+1),integrity,expected)]:
            with self.assertRaises(ValueError):parser.parser_bytes(content,signature,digest)

    def test_actual_git_ancestry_uses_only_the_attested_missing_baseline(self):
        with tempfile.TemporaryDirectory() as directory:
            root,git,value,commit=self.repository(directory)
            self.assertFalse(h.exists(root,OLD))
            with patch.object(cycle,'ROOT',root),patch.object(h,'checkpoint',return_value=validate(value)):
                self.assertEqual(cycle.git('merge-base','--is-ancestor',OLD,'HEAD'),'')
                self.assertEqual(cycle.git('diff','--name-only','--no-renames',OLD,'HEAD'),'')
                with self.assertRaises(h.ProvenanceError):cycle.git('merge-base','--is-ancestor','f'*40,'HEAD')
                git('checkout','--orphan','unrelated')
                git('commit','--allow-empty','-qm','Unrelated synthetic branch')
                with self.assertRaises(subprocess.CalledProcessError):cycle.git('merge-base','--is-ancestor',OLD,'HEAD')

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
        tree=git('rev-parse','HEAD^{tree}')
        checkpoint['baselines'][OLD]=baseline(commit,tree)
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
                for path in ['./public.txt','tools/../public.txt','/public.txt','tools//public.txt','tools\\file.js']:
                    with self.subTest(path=path),self.assertRaises(h.ProvenanceError):
                        h.resolve_git_arguments(root,('show',OLD+':'+path))
            bad=deepcopy(value);bad['baselines'][OLD].update(tree='f'*40,sourceTree='f'*40)
            with patch.object(h,'checkpoint',return_value=validate(bad)),self.assertRaisesRegex(h.ProvenanceError,'Arbre'):
                h.resolve_git_arguments(root,original)

    def test_only_the_two_reviewed_tool_projections_are_representable(self):
        value=fixture()
        value['baselines'][OLD].update(sourceTree='4'*40,retiredPathsSha256=['f'*64])
        with self.assertRaisesRegex(h.ProvenanceError,'Projection'):
            validate(value)

    def test_fixture_paths_and_aggregate_proof_are_closed_and_required(self):
        for redacted,proof in [(['f'*64],'a'*64),([next(iter(h.REDACTED_TEST_PATH_SHA256))],None),
                               ([], 'a'*64)]:
            value=fixture()
            value['baselines'][OLD].update(sourceTree='4'*40,retiredPathsSha256=sorted(h.RETIRED_TOOL_PATH_SHA256),
                                          redactedTestPathsSha256=redacted,redactionProofSha256=proof)
            with self.subTest(paths=redacted,proof=proof),self.assertRaises(h.ProvenanceError):validate(value)

    def test_lexical_fixture_substitutions_keep_operators_whitespace_flags_and_numbers(self):
        before='const x = "Alpha FICTIF|2004-02-03"; // Alpha FICTIF\n'
        after='const x = "Bravo FICTIF|2004-01-02"; // Bravo FICTIF\n'
        self.assertEqual(literal_proof(before,after,[3])['literalCount'],1)
        self.assertEqual(literal_proof('const id = 33001;','const id = 900001;',[3])['literalCount'],1)
        self.assertEqual(literal_proof('const x = /Alpha/gi;','const x = /Bravo/gi;',[3])['literalCount'],1)
        for old,new,indices in [
            (before,after,[]),(before,before,[3]),(before,after.replace(' = ',' += '),[3]),
            (before,after.replace('const x','const y'),[3]),(before,after+'\n', [3]),
            ('return\n"Alpha";','return "Bravo";',[1]),
            ('/* Alpha\nFICTIF */ 1;','/* Bravo FICTIF */ 1;',[]),
            ('const x = /Alpha/g;','const x = /Bravo/i;',[3]),
            ('const year = 2004;','const year = 900001;',[3]),
            ('const id = 33001;','const id = 900000;',[3]),
            ('const x = true;','const x = false;',[3]),
        ]:
            with self.subTest(indices=indices,old=old):literal_proof(old,new,indices,False)

    def test_projection_requires_exact_blob_receipt_and_independent_lexical_check(self):
        spec=importlib.util.spec_from_file_location('fixture_projection_producer',ROOT/'tools/prepare-history-source-provenance.py')
        producer=importlib.util.module_from_spec(spec);spec.loader.exec_module(producer)
        with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
            original,oldgit,_,_=self.repository(a)
            clean,newgit,_,_=self.repository(b)
            retired=['tools/fixture-a.js','tools/fixture-b.js']
            allowed={hashlib.sha256(p.encode()).hexdigest() for p in retired}
            name=sorted(h.REDACTED_TEST_PATHS)[0]
            before='const swimmer = "Alpha FICTIF|2004-02-03";\n'
            after='const swimmer = "Bravo FICTIF|2004-01-02";\n'
            for root,code in [(original,before),(clean,after)]:
                (root/name).parent.mkdir(exist_ok=True);(root/name).write_text(code,encoding='utf-8')
            for path in retired:(original/path).write_text('synthetic retired tool\n',encoding='utf-8')
            oldgit('add','.');oldgit('commit','-qm','Synthetic original fixtures')
            newgit('add','.');newgit('commit','-qm','Synthetic redacted fixtures')
            old=oldgit('rev-parse','HEAD');new=newgit('rev-parse','HEAD')
            old_blob=oldgit('rev-parse','HEAD:'+name);new_blob=newgit('rev-parse','HEAD:'+name)
            proof=literal_proof(before,after,[3])
            receipt=({old_blob:{'after':new_blob,'paths':[name],'literalTokenIndices':[3],
                               'shapeSha256':proof['shapeSha256']}},'b'*64)
            row=producer.projected_baseline(original,clean,old,new,allowed,receipt)
            self.assertEqual(row['redactedTestPathsSha256'],[hashlib.sha256(name.encode()).hexdigest()])
            value=fixture();value['baselines'][OLD]=row
            with patch.object(h,'RETIRED_TOOL_PATH_SHA256',allowed):
                checked=validate(value)
                with patch.object(h,'checkpoint',return_value=checked),self.assertRaises(h.ProvenanceError):
                    h.resolve_git_arguments(clean,('show',OLD+':'+name))
            for broken in [None,({},'b'*64),({old_blob:{**receipt[0][old_blob],'after':'f'*40}},'b'*64),
                           ({old_blob:{**receipt[0][old_blob],'literalTokenIndices':[]}},'b'*64)]:
                with self.subTest(receipt=bool(broken)),self.assertRaises(RuntimeError):
                    producer.projected_baseline(original,clean,old,new,allowed,broken)
            (clean/name).write_text(after.replace('const swimmer','const changed'),encoding='utf-8')
            newgit('add','.');newgit('commit','-qm','Synthetic code change')
            blob=newgit('rev-parse','HEAD:'+name)
            malicious=({old_blob:{**receipt[0][old_blob],'after':blob}},'b'*64)
            with self.assertRaisesRegex(RuntimeError,'lexical'):
                producer.projected_baseline(original,clean,old,newgit('rev-parse','HEAD'),allowed,malicious)

    def test_projection_producer_rejects_added_modified_and_unrelated_deleted_files(self):
        spec=importlib.util.spec_from_file_location('projection_producer',ROOT/'tools/prepare-history-source-provenance.py')
        producer=importlib.util.module_from_spec(spec);spec.loader.exec_module(producer)
        with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
            original,oldgit,value,_=self.repository(a)
            clean,newgit,_,_=self.repository(b)
            retired=['tools/fixture-a.js','tools/fixture-b.js']
            allowed={hashlib.sha256(p.encode()).hexdigest() for p in retired}
            for name in retired:(original/name).write_text('fixture-only retired code\n',encoding='utf-8')
            oldgit('add','.');oldgit('commit','-qm','Synthetic retired tools')
            before=oldgit('rev-parse','HEAD')
            projected=producer.projected_baseline(original,clean,before,newgit('rev-parse','HEAD'),allowed)
            self.assertNotEqual(projected['sourceTree'],projected['tree'])
            self.assertEqual(set(projected['retiredPathsSha256']),allowed)
            value['baselines'][OLD]=projected
            with patch.object(h,'RETIRED_TOOL_PATH_SHA256',allowed):
                checked=validate(value)
                with patch.object(h,'checkpoint',return_value=checked):
                    self.assertEqual(h.resolve_git_arguments(clean,('show',OLD+':public.txt'))[1],
                                     projected['commit']+':public.txt')
                    with self.assertRaisesRegex(h.ProvenanceError,'retire interdite'):
                        h.resolve_git_arguments(clean,('show',OLD+':'+retired[0]))
            for scenario in ['added','modified','deleted']:
                extra=clean/'extra-fixture.txt';config=clean/'firebase.json'
                if scenario=='added':extra.write_text('unexpected\n',encoding='utf-8')
                elif scenario=='modified':extra.unlink();config.write_text('unexpected\n',encoding='utf-8')
                else:config.unlink()
                newgit('add','-A');newgit('commit','-qm','Synthetic '+scenario)
                with self.subTest(scenario=scenario),self.assertRaisesRegex(RuntimeError,'Projection differente'):
                    producer.projected_baseline(original,clean,before,newgit('rev-parse','HEAD'),allowed)

    def test_retired_nominative_tools_are_absent_from_current_sources(self):
        paths={hashlib.sha256(p.relative_to(ROOT).as_posix().encode()).hexdigest()
               for p in (ROOT/'tools').glob('*.js')}
        self.assertFalse(paths & h.RETIRED_TOOL_PATH_SHA256)

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

    def test_windows_text_checkout_preserves_the_committed_seal(self):
        raw=(ROOT/h.CATALOGUE).read_bytes().replace(b'\r\n',b'\n')
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'checkpoint.json';path.write_bytes(raw.replace(b'\n',b'\r\n'))
            h.checkpoint.cache_clear()
            try:
                with patch.object(h,'CATALOGUE',path):
                    self.assertEqual(h.checkpoint()['evidence']['productionRun'],43707826259)
            finally:
                h.checkpoint.cache_clear()


if __name__=='__main__': unittest.main()
