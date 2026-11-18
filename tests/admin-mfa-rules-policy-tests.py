import hashlib,importlib.util,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('mfa_rules',ROOT/'tools/admin-mfa-rules-policy.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RulesProjection(unittest.TestCase):
 def test_exact_two_independent_baselines(self):
  for project,label in [('livepalmes-test','test'),('livepalmes','production')]:
   before=(ROOT/f'.github/releases/evidence/20261118-admin-mfa-{label}-before.rules').read_text(encoding='utf8')
   after=(ROOT/'firestore.rules' if label=='test' else ROOT/'.github/releases/evidence/20261118-admin-mfa-production-after.rules').read_text(encoding='utf8')
   m.validate(before,after,project);self.assertEqual(m.digest(after),m.AFTER[project]);self.assertIn('allow get: if false;',after)
   for altered in [before+'\n',before.replace('allow get: if false;','allow get: if true;')]:
    with self.assertRaises(ValueError):m.project(altered,project)
   with self.assertRaises(ValueError):m.project(before,'other-project')
   other='livepalmes' if label=='test' else 'livepalmes-test'
   with self.assertRaises(ValueError):m.project(before,other)
   for altered in [after.replace('&& hasVerifiedTotp()','&& true',1),after.replace('allow list, write: if false;','allow list, write: if true;',1),after+'\n']:
    with self.assertRaises(ValueError):m.validate(before,altered,project)
if __name__=='__main__':unittest.main()
