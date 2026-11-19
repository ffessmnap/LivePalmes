import copy,importlib.util,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location(name,ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
p=load("a5-legacy-direct-production-policy.py");rules=load("a5-legacy-direct-production-rules.py");cycle=load("release-cycle.py")
class Tests(unittest.TestCase):
 def request(self):return {**p.contract()["request"],p.OPTION:{"contractSha256":p.DIGEST}}
 def test_exact_request_and_complete_origin_manifest(self):
  value=self.request();c=p.contract();self.assertEqual(p.approved(value),c["selected"]);self.assertEqual(p.validate_manifest(p.expected_manifest())["inventoryCount"],119)
  for delta in [{"candidate":"a"*40},{"testRun":1},{p.OPTION:{"contractSha256":"a"*64}},{"standardSources":{}},{"additionalPdfFunctions":["storeCompetitionPdf"]}]:
   with self.subTest(delta=delta),self.assertRaises(ValueError):p.approved({**value,**delta})
  changed=copy.deepcopy(c["origins"]);changed[0]["revision"]+="-changed"
  with self.assertRaises(ValueError):p.expected_manifest(changed)
  manifest=p.expected_manifest();manifest["selected"]=[]
  with self.assertRaises(ValueError):p.validate_manifest(manifest)
 def test_whole_frozen_candidate_and_only_two_config_deltas(self):
  value=self.request();c=p.contract();paths=cycle.git("diff","--name-only","--no-renames",c["productionCommit"],c["candidate"]).splitlines()
  p.paths(value,paths,cycle.git)
  self.assertTrue(cycle.validate_request(value,paths))
  self.assertEqual(p.approved_config_paths(value,paths,cycle.git),{"firebase.json","firestore.rules"})
  with self.assertRaises(ValueError):p.paths(value,paths+["unrelated.html"],cycle.git)
 def test_rules_keep_every_other_rule_from_actual_production(self):
  c=p.contract();before,after=rules.sources(c);rules.closed.validate_rules(before,after)
  self.assertEqual(rules.digest(before),c["rules"]["observedBefore"]["sha256"])
  self.assertNotEqual(rules.digest(after),rules.closed.scope()["rulesAfterSha256"])
  for changed in [after.replace('return false; // National','return true; // National',1),after.replace('allow list, write: if false;','allow list, write: if true;')]:
   with self.assertRaises(ValueError):rules.closed.validate_rules(before,changed)
 def test_http_proof_covers_all_retirements_and_exact_preserved_bytes(self):
  c=p.contract();scope=rules.closed.scope();checker=load("a5-legacy-direct-hosting-check.py")
  retired={*scope["retiredPages"],"series","resultats",*[name for name in scope["retiredPaths"] if name.endswith(".js") and not name.startswith("tools/")]}
  rows=[dict(path=name,status=404,redirect=False) for name in sorted(retired)]+[dict(path=name,status=200,redirect=False,expectedSha256=c["staticSha256"][name],actualSha256=c["staticSha256"][name]) for name in checker.PRESERVED]
  value=dict(schema=1,project="livepalmes-test",candidate=c["candidate"],result="success",businessInvocations=0,scriptsExecuted=False,maximumRequests=90,rows=rows)
  p.validate_http_receipt(value,"livepalmes-test",c["candidate"])
  for changed in [{**value,"rows":rows[1:]},{**value,"project":"livepalmes"},{**value,"rows":[{**r,"redirect":True} if i==0 else r for i,r in enumerate(rows)]},{**value,"rows":[{**r,"actualSha256":"0"*64} if r["path"]==checker.PRESERVED[0] else r for r in rows]}]:
   with self.assertRaises(ValueError):p.validate_http_receipt(changed,"livepalmes-test",c["candidate"])
 def test_rules_api_refuses_other_project_source_and_mutation(self):
  c=p.contract()
  with patch.object(rules.urllib.request,"build_opener",side_effect=AssertionError("network forbidden")):
   for path,method,body in [("projects/livepalmes-test/releases/cloud.firestore","GET",None),(rules.RELEASE,"DELETE",None),("projects/livepalmes/rulesets","POST",{"source":{"files":[{"name":"firestore.rules","content":"allow all"}]}}),(rules.RELEASE,"PATCH",{"release":{"name":rules.RELEASE,"rulesetName":"projects/foreign/rulesets/id"}})]:
    with self.subTest(method=method),self.assertRaises(ValueError):rules.api(path,"fixture",method,body,c=c)
 def test_existing_adapter_dispatches_only_the_a5_state_kind(self):
  adapter=load("direct-csp-production-state.py")
  with tempfile.TemporaryDirectory() as d:
   folder=Path(d);(folder/"report.json").write_text(json.dumps({"sourcePolicyKind":p.KIND}))
   args=["check",str(folder),str(folder/"after.json"),"success"]
   with patch.object(adapter,"load",return_value=p),patch.object(p,"state_check") as checker,patch.object(adapter,"run_old",side_effect=AssertionError("old pinned checker must stay unchanged")):
    adapter.dispatch(args);checker.assert_called_once_with(folder,folder/"after.json",True)
 def test_a5_state_preserves_all_retained_functions_and_source_receipts(self):
  from types import SimpleNamespace
  c=p.contract();value=p.expected_manifest();state=load("production-release-state.py");saved=[]
  for row in c["origins"]:
   name=row["name"].split("/")[-1]
   saved.append(dict(name=row["name"],state="ACTIVE",environment="GEN_2",updateTime=row["updateTime"],labels={"livepalmes-commit":row["commit"]},buildConfig={"runtime":"nodejs22","entryPoint":name,"source":{"storageSource":{"bucket":"fixture","object":"before","generation":"1"}}},serviceConfig={"revision":row["revision"],"environmentVariables":{"FIXTURE":"same"},"secretEnvironmentVariables":[]}))
  smtp=next(f for f in saved if f["name"].endswith("/resolveAccessUserDeletionRequest"))
  smtp["serviceConfig"]["secretEnvironmentVariables"]=[{"key":key,"version":"latest","secret":key} for key in ["LIVEPALMES_SMTP_HOST","LIVEPALMES_SMTP_PORT","LIVEPALMES_SMTP_USER","LIVEPALMES_SMTP_PASS","LIVEPALMES_SMTP_SECURE","LIVEPALMES_MAIL_FROM"]]
  observed=copy.deepcopy(saved);selected={p.PREFIX+n for n in c["selected"]}
  for f in observed:
   if f["name"] in selected:
    f["updateTime"]="2026-11-19T14:00:00Z";f["serviceConfig"]["revision"]+="-new";f["labels"]["livepalmes-commit"]=c["candidate"];f["buildConfig"]["source"]["storageSource"]={"bucket":"fixture","object":"after","generation":"2"}
  original_load=p.common.load
  receipts={f["name"]:dict(identity=state.identity(f),storageSource=f["buildConfig"]["source"]["storageSource"],allPathsAndFileBytesIdentical=True,generationReadAndReferencesRechecked=True) for f in observed if f["name"] in selected}
  for mutation,valid in [(None,True),("retained",False),("config",False),("receipt",False),("source-drift",False)]:
   actual=copy.deepcopy(observed);witness=copy.deepcopy(receipts)
   if mutation=="retained":next(f for f in actual if f["name"] not in selected)["serviceConfig"]["revision"]+="-drift"
   if mutation=="config":next(f for f in actual if f["name"] in selected)["serviceConfig"]["environmentVariables"]["FIXTURE"]="changed"
   if mutation=="receipt":witness.pop(next(iter(witness)))
   if mutation=="source-drift":next(f for f in actual if f["name"] in selected)["updateTime"]="2026-11-19T14:01:00Z"
   with tempfile.TemporaryDirectory() as d:
    folder=Path(d);backup=folder/"backup";backup.mkdir();plan=folder/"plan";plan.mkdir();credential=folder/"credential.json";credential.write_text('{"project_id":"livepalmes"}')
    report=dict(sourcePolicyKind=p.KIND,candidate=c["candidate"],standardSourceManifestSha256=p.digest(value),newFunctions=[],functions=[{"name":name} for name in selected])
    for name,data in [("report.json",report),("standard-source-manifest.json",value),("functions.json",saved)]: (backup/name).write_text(json.dumps(data))
    (plan/"standard-source-receipts.json").write_text(json.dumps(dict(candidate=c["candidate"],manifestSha256=p.digest(value),functions=witness)))
    api=SimpleNamespace(inventory=lambda:actual,identity=state.identity)
    with patch.dict(os.environ,GOOGLE_APPLICATION_CREDENTIALS=str(credential),PLAN=str(plan)),patch.object(p.common,"load",side_effect=lambda name:api if name=="production-release-state.py" else original_load(name)):
     if valid:p.state_check(backup,folder/"after.json",True)
     else:
      with self.assertRaises(ValueError):p.state_check(backup,folder/"after.json",True)
    result=json.loads((folder/"after.json").read_text());self.assertEqual(not result["errors"],valid);self.assertEqual(len(result["functions"]),119)
 def test_rules_need_verified_recovery_before_any_write(self):
  c=p.contract()
  with patch.object(rules,"context",return_value=(c,"fixture","identity")),patch.dict(os.environ,{},clear=True),patch.object(rules,"api",side_effect=AssertionError("write forbidden")):
   with self.assertRaises(ValueError):rules.publish(ROOT,ROOT,ROOT/"tmp/a5/refused.json")
 def test_readiness_refuses_rule_drift(self):
  c=p.contract();before=rules.sources(c)[0]
  with patch.object(rules,"context",return_value=(c,"fixture","identity")),patch.object(rules,"snapshot",return_value=(c["rules"]["observedBefore"],before)):
   self.assertTrue(rules.readiness(ROOT)["allOtherRulesUnchanged"])
  with patch.object(rules,"context",return_value=(c,"fixture","identity")),patch.object(rules,"snapshot",return_value=({**c["rules"]["observedBefore"],"sha256":"0"*64},before)):
   with self.assertRaises(ValueError):rules.readiness(ROOT)
class CleanupGateTests(unittest.TestCase):
 def test_bad_context_and_target_fail_before_provenance_or_identity(self):
  gate=load("a5-legacy-direct-cleanup-gate.py")
  with patch.object(gate,"load",side_effect=AssertionError("no identity")),patch.dict(os.environ,{},clear=True):
   for mode,project in [("apply","foreign"),("arbitrary","livepalmes"),("apply","livepalmes")]:
    with self.subTest(mode=mode,project=project),self.assertRaises(ValueError):gate.authenticate(mode,project,"1","2",ROOT/"tmp/a5/refused-gate")
 def test_test_backup_gate_requires_successful_source_and_rule_proofs(self):
  from types import SimpleNamespace
  gate=load("a5-legacy-direct-cleanup-gate.py");c=p.contract();scope=rules.closed.scope()
  env=dict(GITHUB_REPOSITORY="ffessmnap/LivePalmes",GITHUB_REF="refs/heads/main",GITHUB_EVENT_NAME="workflow_dispatch",GITHUB_WORKFLOW_REF="ffessmnap/LivePalmes/"+gate.WF+"@refs/heads/main",GITHUB_RUN_ATTEMPT="1",EXPECTED_COMMIT="a"*40,GITHUB_SHA="a"*40,VERIFIED_MAIN_CI="true")
  rows=[dict(name="projects/livepalmes-test/locations/europe-west1/functions/"+name,commit="a"*40,state="ACTIVE",revision="r",updateTime="t") for name in c["selected"]]
  for mutation,valid in [(None,True),("rules",False),("functions",False),("run",False)]:
   current=copy.deepcopy(rows);rule_hash=scope["rulesAfterSha256"]
   if mutation=="rules":rule_hash="0"*64
   if mutation=="functions":current.pop()
   def artifact(run,name,dest,wf):
    self.assertEqual(wf,".github/workflows/livepalmes-test-common.yml")
    value={"candidate":c["candidate"],"state":{"functions":current}} if name=="test-proof" else dict(candidate=c["candidate"],project="livepalmes-test",after={"sha256":rule_hash},sourcesVerified=True,indexesDeployed=False,productionTouched=False,businessInvocations=0)
    gate.cycle.write(Path(dest)/("test-proof.json" if name=="test-proof" else "test-portal-session-rules-proof.json"),value)
    return {"head_sha":c["candidate"]}
   closed=SimpleNamespace(validate_candidate=lambda sha:scope,scope=lambda:scope)
   modules={"a5-legacy-direct-production-policy.py":p,"a5-legacy-direct-policy.py":closed,"a5-legacy-direct-hosting-check.py":SimpleNamespace(check=lambda *args:None)}
   with tempfile.TemporaryDirectory() as d,patch.dict(os.environ,env,clear=True),patch.object(gate,"load",side_effect=lambda name:modules[name]),patch.object(gate.cycle,"artifact",side_effect=artifact),patch.object(gate.cycle,"reusable_verification",return_value=True),patch("subprocess.check_output",return_value="b"*64):
    args=("backup","livepalmes-test",str(c["testRun"] if mutation!="run" else 1),"0",d)
    if valid:
     gate.authenticate(*args);self.assertTrue(json.loads((Path(d)/"closure-proof.json").read_text())["authenticated"])
    else:
     with self.assertRaises(ValueError):gate.authenticate(*args)

if __name__=="__main__":unittest.main()
