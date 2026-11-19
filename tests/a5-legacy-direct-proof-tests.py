import copy,importlib.util,json,tempfile,unittest,urllib.parse
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location(name,ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
http=load("a5-legacy-direct-hosting-check.py");cycle=load("release-cycle.py");standard=load("publish-test-standard-sources.py")
class Tests(unittest.TestCase):
 def test_http_rejects_redirect_and_changed_preserved_bytes(self):
  with tempfile.TemporaryDirectory() as d,patch.object(http.time,"sleep"),patch.object(http.closed,"validate_candidate"),patch.object(http.subprocess,"check_output",return_value=b"preserved"):
   def response(url):
    name=urllib.parse.urlsplit(url).path.lstrip("/")
    return (200,b"preserved",{}) if name in http.PRESERVED else (404,b"",{})
   rows=http.check("livepalmes-test","a"*40,Path(d)/"valid.json",response)
   self.assertEqual(len(rows),30);self.assertEqual(json.loads((Path(d)/"valid.json").read_text())["result"],"success")
   with self.assertRaises(ValueError):http.check("livepalmes-test","a"*40,Path(d)/"redirect.json",lambda url:(301,b"",{"Location":"/direct.html"}))
   def changed(url):
    status,body,headers=response(url);return status,b"changed" if status==200 else body,headers
   with self.assertRaises(ValueError):http.check("livepalmes-test","a"*40,Path(d)/"changed.json",changed)
   self.assertEqual(json.loads((Path(d)/"changed.json").read_text())["result"],"failure")
 def test_a5_filters_only_the_installed_five_and_delegates_full_authentication(self):
  c=http.closed.scope();rows=[dict(name="projects/livepalmes-test/locations/europe-west1/functions/"+n,commit=cycle.A5_SOURCE_ANCHOR) for n in c["functions"]]
  other=dict(name="projects/livepalmes-test/locations/europe-west1/functions/manageLivePalmesDirect",commit=cycle.A5_SOURCE_ANCHOR)
  called=[]
  reader=SimpleNamespace(trusted_revisions=lambda directory,current,api:called.append(current) or {f["name"] for f in current["functions"]})
  original=cycle.standard_sources.load
  with patch.object(cycle.standard_sources,"load",side_effect=lambda name:reader if name=="publish-test-standard-sources.py" else original(name)):
   self.assertEqual(cycle.a5_retirement_test_evidence(".",{"functions":rows+[other]}),{f["name"] for f in rows})
   self.assertEqual(called,[{"functions":rows}]);called.clear()
   self.assertEqual(cycle.a5_retirement_test_evidence(".",{"functions":[other]}),set());self.assertFalse(called)
 def test_standard_a5_receipt_still_rejects_tampered_archives_and_manifest(self):
  c=http.closed.scope();anchor=cycle.A5_SOURCE_ANCHOR
  manifest=dict(schema=1,candidate=anchor,baselineRun=44508423630,baselineCandidate="e256fcb070e48124f33de07909551e9aca4b40c8",baselineHosting="sites/livepalmes-test/versions/565a7b8b2ee54d98",functions=c["functions"],approval=dict(threadId=c["threadId"],messageId=c["approvalMessageId"],text="Oui, fermer ces seuls accès historiques"),a5Retirement=http.closed.digest(http.closed.SCOPE.read_bytes()))
  rows=[dict(name=standard.PREFIX+n,commit=anchor,state="ACTIVE",revision="revision",updateTime="2026-11-19T00:00:00Z") for n in c["functions"]]
  proof=dict(schema=1,release="standard",candidate=anchor,standardManifest=manifest,contractSha256=standard.policy.digest(manifest),baselineRun=44508423630,selected=c["functions"],state={"functions":rows},configurationsUnchanged=True,otherFunctionsUnchanged=True,hostingUnchanged=True,controlsUnchanged=True,taskContentsRead=False,managedSources={n:dict(allPathsAndFileBytesIdentical=True,generationReadAndReferencesRechecked=True,archiveSha256="a"*64,archiveIdentity="b"*64,storageSource=dict(bucket="gcf-v2-sources-206080168534-europe-west1",object=n+"/function-source.zip",generation="1")) for n in c["functions"]})
  source=dict(event="workflow_dispatch",head_branch="main",path=standard.WORKFLOW,run_attempt=1,conclusion="success",head_sha=anchor,repository={"full_name":standard.REPOSITORY},head_repository={"full_name":standard.REPOSITORY})
  run=dict(status="completed",conclusion="success",run_attempt=1,head_sha=anchor,id=123)
  original=standard.load
  def trusted_loader(name):
   m=original(name)
   if name=="a5-legacy-direct-test-policy.py":m.closed.validate_candidate=lambda candidate:c
   return m
  for mutation,valid in [(None,True),("archive",False),("manifest",False),("state",False)]:
   changed=copy.deepcopy(proof)
   if mutation=="archive":changed["managedSources"][c["functions"][0]]["generationReadAndReferencesRechecked"]=False
   if mutation=="manifest":changed["standardManifest"]["a5Retirement"]="0"*64
   if mutation=="state":changed["state"]["functions"][0]["commit"]="b"*40
   api=SimpleNamespace(gh=lambda path:{"workflow_runs":[run]},artifact=lambda *args:source,read=lambda path:changed,test_backend_fingerprints=lambda sha:{},matching_functions=cycle.matching_functions)
   with tempfile.TemporaryDirectory() as d,patch.object(standard,"load",side_effect=trusted_loader):
    actual=standard.trusted_revisions(d,{"functions":rows},api)
    self.assertEqual(actual,{f["name"] for f in rows} if valid else set())
if __name__=="__main__":unittest.main()
