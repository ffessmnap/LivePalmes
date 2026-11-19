import importlib.util,json,os,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location(name,ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=load("a5-legacy-direct-test-policy.py");publisher=load("publish-test-standard-sources.py");coord=load("coordinate-test-publication.py")
class Tests(unittest.TestCase):
 def request(self):
  c=m.closed.scope()
  return {"schema":1,"candidate":"a"*40,"baselineRun":44508423630,"baselineCandidate":"e256fcb070e48124f33de07909551e9aca4b40c8","baselineHosting":"sites/livepalmes-test/versions/test","functions":c["functions"],"approval":{"threadId":c["threadId"],"messageId":c["approvalMessageId"],"text":"Oui, fermer ces seuls accès historiques"},"a5Retirement":m.SCOPE_SHA}
 def test_exact_manifest_and_each_changed_boundary(self):
  value=self.request()
  with patch.object(m.closed,"validate_candidate",return_value=m.closed.scope()):
   self.assertEqual(m.manifest(value)["functions"],value["functions"])
   for delta in [{"a5Retirement":"0"*64},{"functions":["manageLivePalmesDirect"]},{"baselineRun":1},{"baselineCandidate":"b"*40},{"approval":{**value["approval"],"messageId":"0"*36}}]:
    with self.subTest(delta=delta),self.assertRaises(ValueError):m.manifest({**value,**delta})
 def test_ordinary_eligibility_is_still_closed(self):
  value=self.request();value.pop("a5Retirement")
  with self.assertRaises(ValueError):publisher.validate(value)
 def test_manual_hosting_only_never_follows(self):
  base={"approved_a5_retirement":True,"hosting_only":True}
  with patch.object(coord,"latest",return_value="a"*40):
   self.assertTrue(coord.coordinate("prepare","repo","a"*40,base)["publish"])
   self.assertFalse(coord.coordinate("followup","repo","a"*40,base)["queued"])
   for delta in [{"automatic_candidate":"a"*40},{"hosting_only":False},{"approved_app_check_csp":True},{"dtn_extension":True},{"followup_depth":1}]:
    with self.subTest(delta=delta),self.assertRaises(ValueError):coord.coordinate("prepare","repo","a"*40,{**base,**delta})
 def test_source_filter_preserves_every_other_protected_file(self):
  value=self.request();protected=("firebase.json","firestore.rules","functions/index.js","functions/package.json")
  with patch.object(m,"manifest",return_value=m.closed.scope()):
   self.assertEqual(m.source_paths(value,["firebase.json","firestore.rules","functions/index.js"],protected,lambda *args:"same"),["functions/index.js"])
   with self.assertRaises(ValueError):m.source_paths(value,["migrations/test.sql"],protected,lambda *args:"same")
   with self.assertRaises(ValueError):m.source_paths(value,[],protected,lambda *args:args[-1])
 def test_rules_read_never_tolerates_old_source_without_manual_write(self):
  c=m.closed.scope();shared=type("Shared",(),{"rules":lambda self,token:{"sha256":c["rulesBeforeSha256"]}})()
  with patch.object(m,"context",return_value=("a"*40,"fixture")),patch.object(m,"load",return_value=shared),patch.dict(os.environ,{},clear=True):
   with self.assertRaises(ValueError):m.check(ROOT,ROOT/"tmp/a5/refused-proof.json")
if __name__=="__main__":unittest.main()
