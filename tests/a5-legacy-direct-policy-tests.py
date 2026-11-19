import copy,importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("a5_policy",ROOT/"tools/a5-legacy-direct-policy.py");policy=importlib.util.module_from_spec(spec);spec.loader.exec_module(policy)
class Scope(unittest.TestCase):
 def test_rules_exact_and_shared_signal_unchanged(self):
  before=(ROOT/".github/releases/evidence/20261119-a5-historical-before.rules").read_text(encoding="utf-8")
  after=(ROOT/"firestore.rules").read_text(encoding="utf-8");policy.validate_rules(before,after)
  marker="    // NAP authorizes short-lived membership server-side."
  self.assertEqual(before[before.index(marker):],after[after.index(marker):])
  for altered in [after.replace('return false; // National','return true; // National',1),after.replace('allow list, write: if false;','allow list, write: if true;')]:
   with self.assertRaises(ValueError):policy.validate_rules(before,altered)
 def test_hosting_exact_and_other_settings_refused(self):
  c=policy.scope();policy.validate_hosting(c["hostingBefore"],c["hostingAfter"])
  bad=copy.deepcopy(c["hostingAfter"]);bad["hosting"]["redirects"].append({"source":"/series","destination":"/direct.html","type":301})
  with self.assertRaises(ValueError):policy.validate_hosting(c["hostingBefore"],bad)
 def test_only_historical_scope(self):
  c=policy.scope();self.assertEqual(len(c["retiredPages"]),13);self.assertEqual(len(c["functions"]),5)
  self.assertIn("performances/public/app.js",c["sharedBlobs"]);self.assertNotIn("performances/public/app.js",c["retiredPaths"])
  self.assertIn("assets/livepalmes-series-import.js",c["sharedBlobs"])
if __name__=="__main__":unittest.main()
