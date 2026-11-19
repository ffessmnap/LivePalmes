"""A5: close only the two retired namespaces, from the observed PROD Rules."""
import hashlib,importlib.util,json,os,re,subprocess,sys,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROJECT="livepalmes";NUMBER="718081132564";BASE="https://firebaserules.googleapis.com/v1/"
RELEASE="projects/livepalmes/releases/cloud.firestore"
RULESET=re.compile(r"projects/(?:livepalmes|718081132564)/rulesets/[A-Za-z0-9_-]+\Z")
PERMISSIONS=["firebaserules.releases.get","firebaserules.releases.update","firebaserules.rulesets.get","firebaserules.rulesets.create"]
def load(name):
 s=importlib.util.spec_from_file_location("a5_prod_rules_"+name.replace("-","_"),ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
closed=load("a5-legacy-direct-policy.py");require=closed.require;digest=closed.digest
def sources(c):
 r=c["rules"];require(r["beforeFile"]==".github/releases/evidence/20261118-admin-mfa-production-before.rules","A5_PROD_RULE_PATH")
 before=(ROOT/r["beforeFile"]).read_text(encoding="utf-8").replace("\r\n","\n");after=closed.rules_after(before)
 require(digest(before)==r["beforeSha256"]=="ef955e075af13b4de189401d3f148a807e99704fcf83651c85fe72598caf44f2" and digest(after)==r["afterSha256"],"A5_PROD_RULE_SOURCE")
 return before,after
def context(plan,mode):
 parent=load("a5-legacy-direct-production-policy.py");request=json.loads((Path(plan)/"request.json").read_text());require(parent.approved(request),"A5_PROD_CONTRACT_REQUIRED");c=parent.contract();sources(c)
 workflow="livepalmes-production-readiness.yml" if mode=="readiness" else "livepalmes-production-release.yml"
 require(os.environ.get("GITHUB_REPOSITORY")=="ffessmnap/LivePalmes" and os.environ.get("GITHUB_REF")=="refs/heads/main" and os.environ.get("GITHUB_RUN_ATTEMPT")=="1" and os.environ.get("GITHUB_EVENT_NAME")=="workflow_dispatch" and os.environ.get("GITHUB_WORKFLOW_REF")=="ffessmnap/LivePalmes/.github/workflows/"+workflow+"@refs/heads/main","A5_PROD_RULE_WORKFLOW")
 creds=json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text());identity=load("check-release-prerequisites.py").publication_identity(creds,"hosting")
 require(identity["client_email"]=="github-actions-livepalmes@livepalmes.iam.gserviceaccount.com","A5_PROD_RULE_IDENTITY")
 token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True,stderr=subprocess.DEVNULL).strip();require(token and "\n" not in token,"A5_RULE_TOKEN")
 return c,token,hashlib.sha256(identity["client_email"].encode()).hexdigest()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):raise ValueError("A5_RULE_REDIRECT_REFUSED")
def api(path,token,method="GET",body=None,*,c=None):
 allowed=method=="GET" and body is None and (path==RELEASE or RULESET.fullmatch(path))
 if c is not None:
  _,after=sources(c)
  if method=="POST" and path=="projects/livepalmes/rulesets":allowed=body=={"source":{"files":[{"name":"firestore.rules","content":after}]}}
  elif method=="PATCH" and path==RELEASE:
   r=body.get("release",{}) if isinstance(body,dict) else {}
   allowed=set(body)=={"release"} and set(r)=={"name","rulesetName"} and r["name"]==RELEASE and RULESET.fullmatch(str(r["rulesetName"]))
 require(allowed,"A5_RULE_API_SCOPE")
 req=urllib.request.Request(BASE+path,method=method,data=None if body is None else json.dumps(body).encode(),headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
 try:
  with urllib.request.build_opener(NoRedirect()).open(req,timeout=30) as response:return json.load(response)
 except urllib.error.HTTPError as e:raise ValueError("A5_RULE_HTTP_"+str(e.code)) from None
def snapshot(token):
 release=api(RELEASE,token);name=release.get("rulesetName","")
 require(RULESET.fullmatch(name) and release.get("name") in {RELEASE,"projects/"+NUMBER+"/releases/cloud.firestore"},"A5_RULE_PROJECT")
 files=api(name,token).get("source",{}).get("files",[])
 require(len(files)==1 and files[0].get("name")=="firestore.rules" and isinstance(files[0].get("content"),str),"A5_RULE_FILES")
 text=files[0]["content"].replace("\r\n","\n")
 return {"releaseName":release["name"],"rulesetName":name,"sha256":digest(text),"updateTime":release.get("updateTime")},text
def readiness(plan):
 c,token,identity=context(plan,"readiness");observed,text=snapshot(token)
 require(observed==c["rules"]["observedBefore"] and text==sources(c)[0],"A5_RULE_BASE_DRIFT")
 return {"schema":1,"candidate":c["candidate"],"project":PROJECT,"before":observed,"expectedAfterSha256":c["rules"]["afterSha256"],"identitySha256":identity,"readOnly":True,"allOtherRulesUnchanged":True}
def backup(plan,backup,readiness_run):
 plan,backup=Path(plan),Path(backup);c,token,identity=context(plan,"backup");cycle=load("release-cycle.py");dest=plan/"a5-rules-prerequisites"
 info=cycle.artifact(readiness_run,"production-prerequisites-hosting",dest,".github/workflows/livepalmes-production-readiness.yml");proof=cycle.read(dest/"prerequisites-hosting.json")
 require(proof["ready"] is True and proof["missingPermissions"]==[] and proof["readOnly"] is True and proof["planRun"]==int(os.environ["PREPARATION_RUN"]) and proof["candidate"]==c["candidate"] and info["head_sha"]==os.environ["GITHUB_SHA"],"A5_RULE_PREREQUISITES")
 expected=proof["a5RetirementRules"];current,text=snapshot(token)
 require(expected["identitySha256"]==identity and expected["expectedAfterSha256"]==c["rules"]["afterSha256"] and current==expected["before"] and text==sources(c)[0],"A5_RULE_PREREQUISITE_DRIFT")
 report=cycle.read(backup/"report.json");manifest=load("a5-legacy-direct-production-policy.py").expected_manifest()
 require(report["candidate"]==c["candidate"] and report["newFunctions"]==[] and report.get("standardSourceManifestSha256")==load("standard-source-policy.py").digest(manifest),"A5_RULE_CODE_BACKUP")
 dest=backup/"a5-retirement-rules";require(not dest.exists(),"A5_RULE_BACKUP_EXISTS");dest.mkdir();(dest/"before.rules").write_text(text,encoding="utf-8",newline="\n")
 witness={"schema":1,"candidate":c["candidate"],"identitySha256":identity,"before":current,"afterSha256":c["rules"]["afterSha256"],"readinessRun":int(readiness_run)}
 (dest/"before.json").write_text(json.dumps(witness,indent=2)+"\n");(plan/"a5-rules-before.json").write_text(json.dumps(witness,indent=2)+"\n")
def publish(plan,backup,receipt):
 plan,backup,receipt=Path(plan),Path(backup),Path(receipt);c,token,identity=context(plan,"publish")
 require(os.environ.get("RULES_BACKUP_VERIFIED")=="true" and Path(os.environ["ENCRYPTED_BACKUP_FILE"]).is_file(),"A5_RULE_ENCRYPTED_RECOVERY_REQUIRED")
 witness=json.loads((backup/"a5-retirement-rules/before.json").read_text());original=(backup/"a5-retirement-rules/before.rules").read_text()
 require(witness==json.loads((plan/"a5-rules-before.json").read_text()) and witness["candidate"]==c["candidate"] and witness["identitySha256"]==identity and original==sources(c)[0] and digest(original)==witness["before"]["sha256"],"A5_RULE_BACKUP_IDENTITY")
 state=json.loads(Path(os.environ["PRODUCTION_AFTER_FILE"]).read_text());receipts=json.loads((plan/"standard-source-receipts.json").read_text());parent=load("a5-legacy-direct-production-policy.py")
 require(state["candidate"]==c["candidate"] and state["errors"]==[] and receipts["candidate"]==c["candidate"] and receipts["manifestSha256"]==parent.digest(parent.expected_manifest()) and set(receipts["functions"])=={parent.PREFIX+n for n in c["selected"]},"A5_RULE_FIVE_SOURCE_RECEIPTS_REQUIRED")
 before,_=snapshot(token);require(before==witness["before"],"A5_RULE_FRESH_DRIFT")
 result={"schema":1,"candidate":c["candidate"],"project":PROJECT,"before":before,"expectedAfterSha256":c["rules"]["afterSha256"],"indexesDeployed":False,"businessInvocations":0,"result":"failure"}
 try:
  _,after=sources(c);created=api("projects/livepalmes/rulesets",token,"POST",{"source":{"files":[{"name":"firestore.rules","content":after}]}},c=c);name=created.get("name","")
  require(RULESET.fullmatch(name) and name!=before["rulesetName"],"A5_RULE_CREATED_IDENTITY");result["createdRuleset"]=name
  files=api(name,token).get("source",{}).get("files",[])
  require(len(files)==1 and files[0].get("name")=="firestore.rules" and files[0].get("content")==after,"A5_RULE_COMPILED_SOURCE")
  require(snapshot(token)[0]==before,"A5_RULE_DRIFT_BEFORE_PATCH")
  api(RELEASE,token,"PATCH",{"release":{"name":RELEASE,"rulesetName":name}},c=c)
  current,text=snapshot(token);require(current["rulesetName"]==name and current["sha256"]==c["rules"]["afterSha256"] and text==after,"A5_RULE_FINAL")
  result.update(after=current,result="success",allOtherRulesUnchanged=True,testSessionRestrictionPublished=False);(plan/"a5-rules-published.json").write_text(json.dumps(result,indent=2)+"\n")
 finally:receipt.write_text(json.dumps(result,indent=2)+"\n")
def final(plan,receipt):
 plan=Path(plan);c,token,_=context(plan,"final");published=json.loads((plan/"a5-rules-published.json").read_text());current,text=snapshot(token)
 require(published["result"]=="success" and published["candidate"]==c["candidate"] and current==published["after"] and text==sources(c)[1],"A5_RULE_FINAL_DRIFT")
 Path(receipt).write_text(json.dumps({"schema":1,"candidate":c["candidate"],"project":PROJECT,"after":current,"readOnly":True,"result":"success","indexesDeployed":False,"businessInvocations":0},indent=2)+"\n")
if __name__=="__main__":
 mode,plan,*args=sys.argv[1:];parent=load("a5-legacy-direct-production-policy.py");request=json.loads((Path(plan)/"request.json").read_text())
 if parent.enabled(request):{ "backup":backup,"publish":publish,"final":final}[mode](plan,*args)
