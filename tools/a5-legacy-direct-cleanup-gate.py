"""Authenticate the closed A5 release and backup before any cleanup identity."""
import importlib.util,json,os,re,shutil,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location("a5_cleanup_"+name.replace("-","_"),ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
cycle=load("release-cycle.py");require=cycle.require
WF=".github/workflows/a5-legacy-direct-cleanup.yml"
def authenticate(mode,project,closure_run,backup_run,destination):
 require(mode in {"backup","apply","verify"} and project in {"livepalmes","livepalmes-test"},"A5_CLEANUP_SCOPE")
 require(os.environ.get("GITHUB_REPOSITORY")=="ffessmnap/LivePalmes" and os.environ.get("GITHUB_REF")=="refs/heads/main" and os.environ.get("GITHUB_EVENT_NAME")=="workflow_dispatch" and os.environ.get("GITHUB_WORKFLOW_REF")=="ffessmnap/LivePalmes/"+WF+"@refs/heads/main" and os.environ.get("GITHUB_RUN_ATTEMPT")=="1" and os.environ.get("EXPECTED_COMMIT")==os.environ.get("GITHUB_SHA") and os.environ.get("VERIFIED_MAIN_CI")=="true","A5_CLEANUP_CONTEXT")
 require(re.fullmatch("[1-9][0-9]*",str(closure_run)) and re.fullmatch("0|[1-9][0-9]*",str(backup_run)),"A5_CLEANUP_RUN")
 parent=load("a5-legacy-direct-production-policy.py");c=parent.contract();closed=load("a5-legacy-direct-policy.py");closed.validate_candidate(c["candidate"])
 dest=Path(destination);dest.mkdir(parents=True,exist_ok=True)
 if project=="livepalmes-test":
  require(int(closure_run)==c["testRun"],"A5_TEST_CLOSURE_RUN")
  info=cycle.artifact(closure_run,"test-proof",dest/"closure-state",".github/workflows/livepalmes-test-common.yml");proof=cycle.read(dest/"closure-state/test-proof.json")
  require(info["head_sha"]==proof["candidate"]==c["candidate"] and cycle.reusable_verification(proof,c["candidate"]),"A5_TEST_PROOF")
  functions=proof["state"]["functions"]
  cycle.artifact(closure_run,"portal-session-rules-proof",dest/"closure-rules",".github/workflows/livepalmes-test-common.yml");rules=cycle.read(dest/"closure-rules/test-portal-session-rules-proof.json")
  require(rules["candidate"]==c["candidate"] and rules["project"]==project and rules["after"]["sha256"]==closed.scope()["rulesAfterSha256"] and rules["sourcesVerified"] is True and rules["indexesDeployed"] is rules["productionTouched"] is False and rules["businessInvocations"]==0,"A5_TEST_RULES_CLOSURE")
  rules_hash=closed.scope()["rulesAfterSha256"]
 else:
  cycle.artifact(closure_run,"release-plan",dest/"closure-plan",".github/workflows/livepalmes-production-release.yml");request=cycle.read(dest/"closure-plan/request.json");parent.approved(request)
  selection=cycle.read(dest/"closure-plan/selection.json")
  require(sorted(selection)==c["selected"] and len(selection)==len(set(selection))==5 and cycle.read(dest/"closure-plan/standard-source-manifest.json")==parent.expected_manifest(),"A5_PROD_SELECTION")
  cycle.artifact(closure_run,"production-after",dest/"closure-state",".github/workflows/livepalmes-production-release.yml");state=cycle.read(dest/"closure-state/production-after.json")
  require(state["candidate"]==c["candidate"] and state["errors"]==[] and len(state["functions"])==119,"A5_PROD_SOURCE_PROOF")
  functions=[{**f,"commit":c["candidate"]} for f in state["functions"]]
  cycle.artifact(closure_run,"production-a5-retirement",dest/"closure-rules",".github/workflows/livepalmes-production-release.yml");rules=cycle.read(dest/"closure-rules/production-a5-rules-after.json")
  require(rules["candidate"]==c["candidate"] and rules["project"]==project and rules["after"]["sha256"]==c["rules"]["afterSha256"] and rules["result"]=="success" and rules["readOnly"] is True and rules["indexesDeployed"] is False and rules["businessInvocations"]==0,"A5_PROD_RULES_CLOSURE")
  parent.validate_http_receipt(cycle.read(dest/"closure-rules/production-a5-http.json"),project,c["candidate"])
  rules_hash=c["rules"]["afterSha256"]
 selected=[f for f in functions if f["name"].split("/")[-1] in c["selected"]]
 require(len(selected)==5 and len({f["name"] for f in selected})==5 and all(f["state"]=="ACTIVE" and re.fullmatch("[a-f0-9]{40}",f.get("commit","")) for f in selected),"A5_CLOSURE_FUNCTIONS")
 load("a5-legacy-direct-hosting-check.py").check(project,c["candidate"],dest/"closure-http.json")
 import subprocess
 scope_hash=subprocess.check_output(["node","-e","console.log(require(process.argv[1]).scopeDigest(process.argv[2]))",str(ROOT/"tools/a5-legacy-direct-cleanup.js"),project],text=True).strip()
 gate=dict(schema=1,project=project,toolingCommit=os.environ["GITHUB_SHA"],candidate=c["candidate"],closureRun=int(closure_run),scopeSha256=scope_hash,rulesAfterSha256=rules_hash,authenticated=True,retiredHttpChecked=True,functions=selected)
 if mode=="backup":require(backup_run=="0","A5_BACKUP_INITIAL_ONLY")
 else:
  require(int(backup_run)>0,"A5_BACKUP_RUN_REQUIRED")
  source=cycle.artifact(backup_run,"a5-cleanup-backup-"+project,dest/"authenticated-backup",WF)
  require(source["head_sha"]==os.environ["GITHUB_SHA"],"A5_BACKUP_TOOLING_CHANGED")
  report=cycle.read(dest/"authenticated-backup/backup-report.json");encrypted=dest/"authenticated-backup/backup.enc"
  import hashlib
  require(report["project"]==project and report["scopeSha256"]==scope_hash and report["recoveryVerified"] is True and report["fullReadScope"] is True and hashlib.sha256(encrypted.read_bytes()).hexdigest()==report["encryptedSha256"],"A5_BACKUP_AUTHENTICATION")
  shutil.copy2(encrypted,dest/"backup.enc");shutil.copy2(dest/"authenticated-backup/backup-report.json",dest/"backup-report.json")
  gate.update(backupRun=int(backup_run),backupEncryptedSha256=report["encryptedSha256"])
 cycle.write(dest/"closure-proof.json",gate)
 print("Publication et sauvegarde A5 authentifiees ; aucune identite de nettoyage encore utilisee.")
if __name__=="__main__":authenticate(*sys.argv[1:])
