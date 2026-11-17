"""Closed A3.4a A promotion: offline fixtures only, no cloud or business invocation."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('session_prod_tests', ROOT/'tools/portal-session-prepare-production-policy.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)

def save(path, value):
    Path(path).write_text(json.dumps(value), encoding='utf-8')

class SessionProductionTests(unittest.TestCase):
    def test_actual_contract_request_and_router(self):
        c = p.contract()
        request = json.loads((ROOT/'.github/releases/20261117-a34-session-prepare.json').read_text(encoding='utf-8'))
        self.assertEqual(p.approved(request), ['getCurrentAccessUser'])
        router = p.common.load('production-source-policy.py')
        self.assertEqual(router.for_request(request).KIND, p.KIND)
        self.assertEqual(c['inventoryCount'], 119)
        self.assertFalse(c['productionEnforcement'])
        self.assertNotEqual(c['rulesSha256'], c['productionRulesSha256'])
        self.assertEqual(c['staticPaths'], sorted(set(c['staticPaths'])))
        self.assertEqual(c['protectedBlobs']['functions/portal-session.js'][0], c['protectedBlobs']['functions/portal-session.js'][1])
        for key, value in [('candidate', 'f'*40), ('standardSources', {}), ('accessRevocationRelease', {}),
                           ('portalSessionPrepareRelease', {'contractSha256': '0'*64}), ('freezeTestCandidate', True)]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                p.approved({**request, key: value})
        self.assertEqual(p.approved({}), [])

    def fixture(self):
        c = copy.deepcopy(p.contract())
        names = sorted(['getCurrentAccessUser', 'inherited'] + ['fixture%03d'%i for i in range(117)])
        origins = [{'name':p.PREFIX+n, 'state':'ACTIVE', 'revision':n+'-00001-fixture',
                    'updateTime':'2026-11-17T00:00:00Z', 'commit':'a'*40} for n in names]
        base = {n:'b'*64 for n in names}; desired = {**base, 'getCurrentAccessUser':'c'*64}
        old = {**base, 'inherited':'d'*64}
        legacy = lambda commit: old if commit == 'a'*40 else desired if commit == p.CANDIDATE else base
        optimized = lambda commit: base if commit != p.CANDIDATE else desired
        reviews = {'functionReviews':[{'name':'inherited','commit':'a'*40,'revision':'inherited-00001-fixture',
            'legacyChanged':True,'legacyBefore':'d'*64,'legacyAfter':'b'*64,'optimizedBefore':'b'*64,
            'optimizedAfter':'b'*64,'normalizedBefore':'e'*64,'normalizedAfter':'e'*64}]}
        rows = []
        for f in origins:
            n = f['name'].split('/')[-1]; changed = n == 'getCurrentAccessUser'; inherited = n == 'inherited'
            rows.append({**f, 'shortName':n, 'before':'b'*64, 'after':desired[n], 'legacyBefore':old[n],
                         'legacyAfter':desired[n], 'changed':changed, 'legacyChanged':changed or inherited,
                         'method':'authenticated-inherited-equivalence-unchanged-since-production' if inherited else
                                  'both-comparators-changed' if changed else 'both-comparators-unchanged'})
        expected = {'schema':1, 'candidate':p.CANDIDATE, 'productionRun':c['productionRun'], 'inventoryCount':119,
            'selected':['getCurrentAccessUser'], 'inheritedNames':['inherited'], 'rows':rows,
            'historicalProof':c['historicalProof'], 'completeOriginsSha256':p.digest(origins)}
        c.update(originsSha256=p.digest(origins), selectionProofSha256=p.digest(expected), manifestOriginsSha256=p.digest(rows))
        return c, origins, optimized, legacy, reviews, expected

    def test_full_selection_and_closed_manifest(self):
        c, origins, optimized, legacy, reviews, expected = self.fixture()
        with patch.object(p, 'contract', return_value=c):
            self.assertEqual(p.complete_selection(origins, optimized, legacy, reviews), expected)
            value = p.expected_manifest(expected['rows']); p.validate_manifest(value)
            for key, change in [('selected', []), ('candidate','f'*40), ('configurationChanges',True),
                                ('bindingChanges',True), ('kind','other'), ('contractSha256','0'*64), ('inventoryCount',118)]:
                with self.subTest(key=key), self.assertRaises(ValueError):p.validate_manifest({**value,key:change})

    def test_inherited_pair_cannot_hide_new_difference(self):
        c, origins, optimized, legacy, reviews, expected = self.fixture()
        with patch.object(p, 'contract', return_value=c):
            for key, value in [('revision','other'), ('commit','f'*40), ('legacyBefore','0'*64),
                    ('optimizedAfter','0'*64), ('normalizedAfter','0'*64), ('normalizedBefore',None), ('legacyChanged',False)]:
                bad=copy.deepcopy(reviews);bad['functionReviews'][0][key]=value
                with self.subTest(key=key), self.assertRaises(ValueError):p.complete_selection(origins,optimized,legacy,bad)
            with self.assertRaises(ValueError):p.complete_selection(origins[:-1],optimized,legacy,reviews)
            bad=copy.deepcopy(origins);bad[0]['commit']='f'*40
            with self.assertRaises(ValueError):p.complete_selection(bad,optimized,legacy,reviews)
            def changed(commit):
                result=dict(optimized(commit))
                if commit==p.CANDIDATE:result['fixture000']='0'*64
                return result
            with self.assertRaises(ValueError):p.complete_selection(origins,changed,legacy,reviews)

    def test_complete_paths_and_protected_sources(self):
        c=p.contract(); request={**c['request'], p.OPTION:{'contractSha256':p.DIGEST}}
        # Paths digest is tied to the complete actual diff, not a file allowlist.
        cycle=p.common.load('release-cycle.py')
        paths=cycle.git('diff','--name-only',c['productionCommit'],p.CANDIDATE).splitlines()
        p.paths(request,paths,cycle.git)
        with self.assertRaises(ValueError):p.paths(request,paths+['firestore.rules'],cycle.git)
        with self.assertRaises(ValueError):p.paths(request,paths,lambda *args:'0'*40)

    def test_runtime_and_source_only_configuration(self):
        c=copy.deepcopy(p.contract());account='fixture@livepalmes.iam.gserviceaccount.com'
        c['runtimeAccountSha256']=hashlib.sha256(account.encode()).hexdigest()
        before={'name':p.PREFIX+'getCurrentAccessUser','state':'ACTIVE','environment':'GEN_2','updateTime':'before',
            'buildConfig':{'runtime':'nodejs22','entryPoint':'getCurrentAccessUser','source':{}},
            'serviceConfig':{'serviceAccountEmail':account,'revision':'before','maxInstanceCount':2},'labels':{'old':'kept'}}
        after=copy.deepcopy(before);after['updateTime']='after';after['serviceConfig']['revision']='after'
        after['labels']['livepalmes-commit']=p.CANDIDATE
        with patch.object(p,'contract',return_value=c):
            p.assert_selected(before,after,p.CANDIDATE)
            for mutate in [lambda f:f['serviceConfig'].update(maxInstanceCount=3),
                           lambda f:f['serviceConfig'].update(serviceAccountEmail='other'),
                           lambda f:f['labels'].update(old='changed'),lambda f:f.update(state='FAILED')]:
                bad=copy.deepcopy(after);mutate(bad)
                with self.assertRaises(ValueError):p.assert_selected(before,bad,p.CANDIDATE)

    def test_controls_same_run_admin_and_permission_drift(self):
        c=p.contract();value={'selected':['getCurrentAccessUser']}
        runtime={'ready':True,'readOnly':True,'missingRuntimePermissions':[],
            'runtimeRolePermissionsSha256':c['runtimeRolePermissionsSha256'],'rolePermissionScope':'exact-role-resource'}
        caps=SimpleNamespace(qualify=lambda *a:copy.deepcopy(runtime))
        env={'GITHUB_RUN_ID':'123','GITHUB_SHA':'a'*40,
             'GITHUB_WORKFLOW_REF':'ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main'}
        admin={'run':123,'toolingCommit':'a'*40,'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),
               'ready':True,'readOnly':True,'accountOrRightChanges':0}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,env), patch.object(p,'manifest',return_value=value),              patch.object(p.common,'load',return_value=caps), patch.object(p.common,'controls',return_value=c['controls']):
            directory=Path(tmp)
            with self.assertRaises(ValueError):p.guard(directory)
            save(directory/'standard-session-prepare-auth-before.json',admin)
            p.guard(directory)
            with self.assertRaises(ValueError):p.guard(directory,True)
            save(directory/'standard-session-prepare-auth-after.json',admin);p.guard(directory,True)
            self.assertEqual((directory/'standard-session-prepare-controls-before.json').read_bytes(),
                             (directory/'standard-session-prepare-controls-after.json').read_bytes())
            save(directory/'standard-session-prepare-auth-after.json',{**admin,'run':122})
            with self.assertRaises(ValueError):p.guard(directory,True)
            runtime['runtimeRolePermissionsSha256']='0'*64
            with self.assertRaises(ValueError):p.guard(directory)
            runtime['runtimeRolePermissionsSha256']=c['runtimeRolePermissionsSha256']
            with patch.object(p.common,'controls',return_value={**c['controls'],'mailSha256':'0'*64}):
                with self.assertRaises(ValueError):p.guard(directory)
            with self.assertRaises(ValueError):p.restore_witness(directory,directory)

    def test_rules_read_only_and_production_specific(self):
        c=p.contract();observed={'sha256':c['productionRulesSha256'],'rulesetName':'projects/livepalmes/rulesets/fixture'}
        calls=[]
        def snapshot(token):calls.append(token);return observed,'fixture rules'
        rules=SimpleNamespace(snapshot=snapshot)
        with tempfile.TemporaryDirectory() as tmp, patch.object(p.common,'load',return_value=rules),              patch.object(p.subprocess,'check_output',return_value='fixture-token'):
            proof=p.rules_snapshot(tmp,observed)
            self.assertFalse(proof['deployed']);self.assertTrue(proof['readOnly'])
            self.assertEqual(calls,['fixture-token'])
            with self.assertRaises(ValueError):p.rules_snapshot(tmp,{**observed,'rulesetName':'other'})
            observed['sha256']=c['rulesSha256']
            with self.assertRaises(ValueError):p.rules_snapshot(tmp)
            self.assertTrue((Path(tmp)/'standard-session-prepare-rules-observed.json').is_file())

    def test_official_readiness_requires_exact_plan_controller_and_both_proofs(self):
        c=p.contract();value={'selected':['getCurrentAccessUser']};head='a'*40
        pre={'head_sha':head,'conclusion':'success','run_attempt':1,'path':'.github/workflows/livepalmes-production-preflight.yml'}
        reports={}
        for kind in ['backend','hosting']:
            proof={'contractSha256':p.DIGEST,'manifestSha256':p.digest(value),'ready':True,
                'selected':['getCurrentAccessUser'],'retainedFunctions':118,'controls':c['controls'],
                'runtime':{'ready':True,'runtimeRolePermissionsSha256':c['runtimeRolePermissionsSha256']},
                'accountOrRightChanges':0,'enabledAdministrativeAuthAccounts':2,
                'rules':{'observed':{'sha256':c['productionRulesSha256']}}}
            reports[kind]={'planRun':11,'candidate':p.CANDIDATE,'kind':kind,'ready':True,'readOnly':True,
                           'missingPermissions':[],'portalSessionPrepare':proof}
        def artifact(run,name,destination,workflow):
            self.assertEqual(str(run),'12');self.assertEqual(workflow,'.github/workflows/livepalmes-production-readiness.yml')
            kind=name.removeprefix('production-prerequisites-');Path(destination).mkdir(exist_ok=True)
            save(Path(destination)/('prerequisites-'+kind+'.json'),reports[kind]);return {'head_sha':head}
        cycle=SimpleNamespace(gh=lambda endpoint:pre,artifact=artifact)
        with tempfile.TemporaryDirectory() as tmp, patch.object(p,'manifest',return_value=value),              patch.object(p.common,'load',return_value=cycle), patch.dict(os.environ,{'GITHUB_SHA':head,'GITHUB_REPOSITORY':'ffessmnap/LivePalmes'}):
            p.readiness(tmp,'11','12')
            for key,change in [('head_sha','b'*40),('run_attempt',2),('conclusion','failure')]:
                original=pre[key];pre[key]=change
                with self.subTest(key=key),self.assertRaises(ValueError):p.readiness(tmp,'11','12')
                pre[key]=original
            for kind in reports:
                reports[kind]['missingPermissions']=['fixture.permission']
                with self.assertRaises(ValueError):p.readiness(tmp,'11','12')
                reports[kind]['missingPermissions']=[]
            with self.assertRaises(ValueError):p.readiness(tmp,'11','0')

    def test_workflow_restores_backend_and_checks_before_any_write(self):
        text=(ROOT/'.github/workflows/livepalmes-production-release.yml').read_text(encoding='utf-8')
        before=text.index('portal-session-prepare-production-policy.py auth-before')
        restore=text.index('Restaurer le compte backend A3.4a')
        backup=text.index('Sauvegarder le code PROD avant publication')
        self.assertLess(before,restore);self.assertLess(restore,backup)
        self.assertIn("if: always() && steps.plan.outputs.portal_session_prepare_reader == 'true'",text)
        self.assertLess(text.index('Chiffrer puis tester la sauvegarde'),text.index('id: functions'))
        self.assertLess(text.index('portal-session-prepare-production-policy.py auth-after'),text.index('id: hosting'))
        self.assertIn('portal-session-prepare-production-policy.py rules-final',text)
        self.assertIn('production-session-prepare-rules-after.json',text)
        suites=json.loads((ROOT/'tools/verification-tests.json').read_text(encoding='utf-8'))
        for suite in ['publication','publicationFallback']:
            self.assertIn('tests/portal-session-production-tests.py',suites[suite])

if __name__=='__main__':unittest.main()
