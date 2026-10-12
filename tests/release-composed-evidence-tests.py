"""Offline adversarial scenarios: composed proofs cannot reset a live baseline."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('cycle', Path(__file__).parents[1]/'tools/release-cycle.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EvidenceTests(unittest.TestCase):
    def function(self, name, revision='old'):
        return dict(name='projects/livepalmes-test/locations/europe-west1/functions/'+name,
                    commit='a'*40, revision=revision, updateTime='2026-10-11', state='ACTIVE')

    def test_targeted_composition_and_unrelated_drift(self):
        one, two = self.function('one'), self.function('two')
        new = self.function('one', 'new')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m.write(root/'request.json', dict(candidate='a'*40, testRun=1, testBackendRuns=[2]))
            m.write(root/'test/test-proof.json', dict(candidate='a'*40, state=dict(hosting={'version':'v'}, functions=[one,two])))
            target = dict(schema=1, candidate='a'*40, state=dict(functions=[new]))
            m.write(root/'test-targeted-2/test-backend-proof.json', target)
            state = dict(hosting={'version':'v'}, functions=[new,two])
            with patch.object(m,'artifact',return_value={'head_sha':'a'*40}), patch.object(m,'verify_test_candidate'), patch.object(m,'snapshot',return_value=state):
                m.verify_test(root)
                self.assertEqual(m.read(root/'test-proof.json')['state'], state)
            for bad in [dict(state, hosting={'version':'other'}), dict(state, functions=[new,self.function('two','other')]), dict(state, functions=[new])]:
                with patch.object(m,'artifact',return_value={'head_sha':'a'*40}), patch.object(m,'verify_test_candidate'), patch.object(m,'snapshot',return_value=bad), self.assertRaises(ValueError):
                    m.verify_test(root)
            for wrong in [dict(target,candidate='b'*40), dict(target,state={'functions':[dict(new,state='FAILED')]}), dict(target,state={'functions':[self.function('unknown')]}), dict(target,state={'functions':[new,new]})]:
                m.write(root/'test-targeted-2/test-backend-proof.json',wrong)
                with patch.object(m,'artifact',return_value={'head_sha':'a'*40}), patch.object(m,'verify_test_candidate'), self.assertRaises(ValueError):
                    m.verify_test(root,live=False)

    def test_cleanup_exact_replay_only(self):
        one, two = [dict(self.function(n), name=self.function(n)['name'].replace('livepalmes-test','livepalmes')) for n in ['retired','keep']]
        functions = sorted([one,two],key=lambda f:f['name'])
        hosting = dict(version='v',message='release')
        state = dict(hosting=dict(hosting,name='h'),functions=functions)
        step = dict(completedAt='now', backupVerified=True, backupSha256='c'*64, napWrites=0,mailSends=0,hosting=hosting,before=functions,deleted=[one['name']],after=[two])
        proof = dict(schema=1,productionRun=12,project='livepalmes',approval='Explicit',steps=[step])
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            def apply(p, digest=None):
                raw=json.dumps(p)+'\n'
                m.write(root/'request.json',{'productionCleanupEvidence':dict(path='.github/releases/evidence/cleanup.json',sha256=digest or hashlib.sha256(raw.encode()).hexdigest())})
                with patch.object(m,'git',return_value=raw.strip()),patch.object(m,'run',return_value='["retired"]'):
                    return m.apply_cleanup_evidence(root,state,12)
            self.assertEqual(apply(proof)['functions'],[two])
            reordered=copy.deepcopy(proof);reordered['steps'][0]['before'].reverse()
            self.assertEqual(apply(reordered)['functions'],[two])
            with self.assertRaises(ValueError): apply(proof,'0'*64)
            for key,value in [('before',[two]),('before',[one,one,two]),('after',[two,two]),('after',[dict(two,revision='changed')]),('deleted',[two['name']]),('backupVerified',False),('hosting',dict(hosting,version='wrong')),('napWrites',1)]:
                wrong=copy.deepcopy(proof);wrong['steps'][0][key]=value
                with self.assertRaises(ValueError):apply(wrong)
            wrong=copy.deepcopy(proof);wrong['productionRun']=13
            with self.assertRaises(ValueError):apply(wrong)
            wrong=copy.deepcopy(proof);wrong['steps'].append(step)
            with self.assertRaises(ValueError):apply(wrong)


class BlockedAttemptTests(unittest.TestCase):
    def fixture(self, root):
        repo = Path(__file__).parents[1]
        proof_path = '.github/releases/evidence/20261012-production-blocked-attempt.json'
        proof = json.loads((repo / proof_path).read_text(encoding='utf-8'))
        original = json.loads((repo / '.github/releases/20261012-retouches-infra.json').read_text(encoding='utf-8'))
        raw = json.dumps(proof, ensure_ascii=False) + '\n'
        current = dict(original, productionBlockedAttemptEvidence=dict(path=proof_path, sha256=hashlib.sha256(raw.encode()).hexdigest()))
        m.write(root / 'request.json', current)
        m.write(root / 'blocked-attempt-plan/request.json', original)
        m.write(root / 'blocked-attempt-plan/baseline.json', {'productionRun': 38228508477})
        info = dict(path='.github/workflows/livepalmes-production-release.yml', head_branch='main',
                    head_sha=proof['headSha'], status='completed', conclusion='failure', run_attempt=1)
        skipped = ['Verifier les mails desactives avant la bascule NAP', 'Sauvegarder le code PROD avant publication',
                   'Chiffrer puis tester la sauvegarde', 'Ouvrir la sauvegarde initiale pour une reprise',
                   'Associer les controles au commit', 'Preparer les Functions selectionnees',
                   'Simuler les Functions par petits lots', 'Publier les Functions par petits lots',
                   'Controler toutes les Functions et les exclusions', 'Confirmer les mails desactives avant Hosting',
                   'Publier Hosting apres les controles', 'Controler les pages publiees', 'Relever Hosting apres la tentative']
        steps = [dict(name='Relire TEST avant toute ecriture PROD', status='completed', conclusion='success'),
                 dict(name='Verifier que PROD correspond encore au bilan', status='completed', conclusion='failure')]
        steps += [dict(name=n, status='completed', conclusion='skipped') for n in skipped]
        steps += [dict(name='Conclure', status='completed', conclusion='failure'),
                  dict(name='Complete job', status='completed', conclusion='success')]
        jobs = {'total_count': 1, 'jobs': [{'steps': steps}]}
        sources = {name: m.git('show', proof['headSha'] + ':' + name) for name in proof['sourceSha256']}
        return dict(raw=raw, proof=proof, info=info, jobs=jobs, sources=sources, latest=38306975865)

    def verify(self, root, fixture):
        def git(*args):
            path = args[1].split(':', 1)[1]
            return fixture['sources'].get(path, fixture['raw']).strip()
        def gh(path):
            if '/workflows/' in path:
                return {'workflow_runs': [{'id': fixture['latest']}]}
            return fixture['jobs'] if '/jobs?' in path else fixture['info']
        with patch.object(m, 'git', side_effect=git), patch.object(m, 'gh', side_effect=gh), \
             patch.object(m, 'artifact'), patch.object(m, 'latest_run', return_value=38228508477) as latest, \
             patch.dict(m.os.environ, {'GITHUB_REPOSITORY': 'ffessmnap/LivePalmes'}):
            result = m.reviewed_blocked_production_run(root)
            latest.assert_called_once_with('livepalmes-production-release.yml', skip=38306975865)
            return result

    def test_reviewed_stop_before_deployment_can_use_original_success(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); fixture = self.fixture(root)
            self.assertEqual(self.verify(root, fixture), 38228508477)
            self.assertTrue(m.read(root / 'production-blocked-attempt-proof.json')['verifiedNoDeployment'])

    def test_default_still_refuses_latest_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(m, 'latest_run', side_effect=ValueError('examen requis')) as latest:
                with self.assertRaises(ValueError): m.reviewed_blocked_production_run(Path(directory))
                latest.assert_called_once_with('livepalmes-production-release.yml')

    def test_other_run_origin_attempt_or_failure_is_refused(self):
        cases = [('head_branch', 'other'), ('head_sha', 'a'*40), ('run_attempt', 2),
                 ('status', 'in_progress'), ('conclusion', 'success'), ('path', 'other.yml')]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); original = self.fixture(root)
            for key, value in cases:
                fixture = copy.deepcopy(original); fixture['info'][key] = value
                with self.subTest(key=key), self.assertRaises(ValueError): self.verify(root, fixture)
            fixture = copy.deepcopy(original); fixture['latest'] = 999
            with self.assertRaises(ValueError): self.verify(root, fixture)
            fixture = copy.deepcopy(original); fixture['jobs']['total_count'] = 2
            with self.assertRaises(ValueError): self.verify(root, fixture)
            self.assertFalse((root / 'production-blocked-attempt-proof.json').exists())

    def test_mutation_or_unknown_step_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); original = self.fixture(root)
            for name in ['Sauvegarder le code PROD avant publication', 'Publier les Functions par petits lots',
                         'Publier Hosting apres les controles', 'Simuler les Functions par petits lots']:
                fixture = copy.deepcopy(original)
                next(s for s in fixture['jobs']['jobs'][0]['steps'] if s['name'] == name)['conclusion'] = 'success'
                with self.subTest(name=name), self.assertRaises(ValueError): self.verify(root, fixture)
            fixture = copy.deepcopy(original)
            fixture['jobs']['jobs'][0]['steps'].append(dict(name='Unexpected command', status='completed', conclusion='success'))
            with self.assertRaises(ValueError): self.verify(root, fixture)
            fixture = copy.deepcopy(original); fixture['jobs']['jobs'][0]['steps'][1]['conclusion'] = 'success'
            with self.assertRaises(ValueError): self.verify(root, fixture)
            self.assertFalse((root / 'production-blocked-attempt-proof.json').exists())

    def test_modified_scope_source_or_hash_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); fixture = self.fixture(root)
            current = m.read(root / 'request.json'); current['candidate'] = 'a'*40; m.write(root / 'request.json', current)
            with self.assertRaises(ValueError): self.verify(root, fixture)
            fixture = self.fixture(root); fixture['sources']['tools/release-cycle.py'] += '# altered'
            with self.assertRaises(ValueError): self.verify(root, fixture)
            fixture = self.fixture(root); current = m.read(root / 'request.json')
            current['productionBlockedAttemptEvidence']['sha256'] = '0'*64; m.write(root / 'request.json', current)
            with self.assertRaises(ValueError): self.verify(root, fixture)
            self.assertFalse((root / 'production-blocked-attempt-proof.json').exists())


if __name__ == '__main__':
    unittest.main()
