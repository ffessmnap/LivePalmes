"""Closed A5 TEST sources, Hosting and historical Rules retirement only."""
import importlib.util,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 spec=importlib.util.spec_from_file_location("a5_test_"+name.replace("-","_"),ROOT/"tools"/name)
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
closed=load("a5-legacy-direct-policy.py")
require=closed.require
SCOPE_SHA=closed.digest(closed.SCOPE.read_bytes())
def manifest(value):
 c=closed.validate_candidate(value["candidate"])
 require(value.get("a5Retirement")==SCOPE_SHA and value["functions"]==c["functions"],"A5_TEST_MANIFEST_SCOPE")
 require(value["approval"]["threadId"]==c["threadId"] and value["approval"]["messageId"]==c["approvalMessageId"] and value["approval"]["text"]=="Oui, fermer ces seuls accès historiques","A5_TEST_APPROVAL")
 require(value["baselineRun"]==44508423630 and value["baselineCandidate"]=="e256fcb070e48124f33de07909551e9aca4b40c8","A5_TEST_BASELINE")
 return c
def source_paths(value,paths,protected,git):
 manifest(value)
 for name in set(protected)-{"functions/index.js","firebase.json","firestore.rules"}:
  require(git("rev-parse",value["baselineCandidate"]+":"+name)==git("rev-parse",value["candidate"]+":"+name),"A5_TEST_PROTECTED: "+name)
 require(not any(p.startswith(("performances/public/data/","functions/private/","migrations/")) or p.endswith((".sql",".env")) for p in paths),"A5_TEST_FORBIDDEN_DATA")
 return [p for p in paths if p not in {"firebase.json","firestore.rules"}]
def hosting_context():
 require(os.environ.get("TARGET_FIREBASE_PROJECT")=="livepalmes-test" and os.environ.get("A5_HOSTING_MODE")=="true" and not os.environ.get("A5_AUTOMATIC_CANDIDATE") and os.environ.get("GITHUB_EVENT_NAME")=="workflow_dispatch" and os.environ.get("GITHUB_RUN_ATTEMPT")=="1","A5_TEST_MANUAL_HOSTING")
def context(root):
 root=Path(root).resolve();candidate=os.environ.get("CANDIDATE_SHA","")
 require(root==ROOT and os.environ.get("TARGET_FIREBASE_PROJECT")=="livepalmes-test" and os.environ.get("GITHUB_REF")=="refs/heads/main" and os.environ.get("GITHUB_REPOSITORY")=="ffessmnap/LivePalmes" and os.environ.get("GITHUB_WORKFLOW_REF")=="ffessmnap/LivePalmes/.github/workflows/livepalmes-test-common.yml@refs/heads/main" and os.environ.get("GITHUB_RUN_ATTEMPT")=="1" and candidate==os.environ.get("GITHUB_SHA") and candidate==subprocess.check_output(["git","rev-parse","HEAD"],cwd=root,text=True).strip(),"A5_TEST_CONTEXT")
 require(closed.digest((root/"firestore.rules").read_bytes())==closed.scope()["rulesAfterSha256"],"A5_TEST_RULES_SOURCE")
 cred=json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
 require(cred.get("type")=="service_account" and cred.get("project_id")=="livepalmes-test" and cred.get("client_email") in {"github-livepalmes-test@livepalmes-test.iam.gserviceaccount.com","github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com"},"A5_TEST_IDENTITY")
 return candidate,subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
def manual():
 return os.environ.get("A5_RULES_WRITE")=="true" and os.environ.get("A5_VERIFICATION_ONLY")!="true" and os.environ.get("A5_HOSTING_MODE")=="true" and not os.environ.get("A5_AUTOMATIC_CANDIDATE") and os.environ.get("GITHUB_EVENT_NAME")=="workflow_dispatch"
def check(root,output):
 candidate,token=context(root);current=load("test-portal-session-rules.py").rules(token);c=closed.scope()
 require(current["sha256"] in ({c["rulesBeforeSha256"],c["rulesAfterSha256"]} if manual() else {c["rulesAfterSha256"]}),"A5_TEST_RULES_DRIFT")
 Path(output).write_text(json.dumps({"schema":1,"project":"livepalmes-test","candidate":candidate,"after":current,"deployed":False,"indexesDeployed":False,"productionTouched":False,"businessInvocations":0,"readOnly":True},indent=2)+"\n")
def deploy(root,output):
 hosting_context();require(manual(),"A5_RULES_WRITE_APPROVAL");candidate,token=context(root);c=closed.validate_candidate(candidate)
 temp=Path(os.environ["RUNNER_TEMP"]);cycle=load("release-cycle.py");shared=load("test-portal-session-rules.py")
 require(json.loads((temp/"test-selection.json").read_text())==[],"A5_TEST_BACKEND_NOT_PROVEN")
 before_state=json.loads((temp/"test-before.json").read_text());current=cycle.snapshot("livepalmes-test")
 require(current==before_state and len(current["functions"])==121,"A5_TEST_BACKEND_DRIFT")
 names={f["name"].split("/")[-1]:f for f in current["functions"]}
 require(all(names[n]["state"]=="ACTIVE" and names[n]["commit"]==candidate for n in c["functions"]),"A5_TEST_SOURCES_NOT_INSTALLED")
 before=shared.rules(token);require(before["sha256"] in {c["rulesBeforeSha256"],c["rulesAfterSha256"]},"A5_TEST_RULES_DRIFT")
 changed=before["sha256"]!=c["rulesAfterSha256"]
 if changed:
  command=[str(ROOT/"tests/firestore-rules/node_modules/.bin/firebase"),"deploy","--project","livepalmes-test","--only","firestore:rules","--non-interactive"]
  subprocess.run(command+["--dry-run"],cwd=ROOT,check=True)
  require(shared.rules(token)==before and cycle.snapshot("livepalmes-test")==current,"A5_TEST_FRESH_DRIFT")
  subprocess.run(command,cwd=ROOT,check=True)
 after=shared.rules(token);require(after["sha256"]==c["rulesAfterSha256"],"A5_TEST_RULES_FINAL")
 Path(output).write_text(json.dumps({"schema":1,"project":"livepalmes-test","candidate":candidate,"scopeSha256":SCOPE_SHA,"before":before,"after":after,"deployed":changed,"sourcesVerified":True,"indexesDeployed":False,"productionTouched":False,"businessInvocations":0},indent=2)+"\n")
if __name__=="__main__": {"check":check,"deploy":deploy}[sys.argv[1]](*sys.argv[2:])
