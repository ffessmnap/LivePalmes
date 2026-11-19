"""Finish only the reviewed A5 attempt: no source publication, original backup."""
import hashlib,importlib.util,json,os,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/".github/releases/evidence/20261119-a5-rules-hosting-completion.json"
DIGEST="a0a4ad663ba79e7d1fe520334c9450881b68fc9076c0b40815c03bb4bf9738bc"
SOURCE_RUN="44554846479";SOURCE_HEAD="ddffdc49010ad139ff042d45bba125b330f4bfac"
WF=".github/workflows/livepalmes-production-release.yml"
def load(name):
 s=importlib.util.spec_from_file_location("a5_completion_"+name.replace("-","_"),ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
parent=load("a5-legacy-direct-production-policy.py");require=parent.require
read=lambda p:json.loads(Path(p).read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
def contract():
 raw=PATH.read_bytes().replace(b"\r\n",b"\n");require(sha(raw)==DIGEST,"A5_COMPLETION_CONTRACT_CHANGED");c=json.loads(raw)
 require(c["sourceRun"]==int(SOURCE_RUN) and c["sourceHead"]==SOURCE_HEAD and c["candidate"]==parent.contract()["candidate"] and c["newSourceWrites"]==0 and c["remaining"]==["rules","hosting","http-final"],"A5_COMPLETION_SCOPE")
 return c
def marker():return dict(schema=1,sourceRun=int(SOURCE_RUN),candidate=contract()["candidate"],completionSha256=DIGEST,sourceWrites=0)
def require_marker(root):
 require(os.environ.get("RESUME")==SOURCE_RUN and (Path(root)/"a5-rules-hosting-only.json").is_file() and read(Path(root)/"a5-rules-hosting-only.json")==marker(),"A5_COMPLETION_NOT_QUALIFIED")
def verify_sources(after,receipts,value):
 parent.validate_manifest(value);selected={parent.PREFIX+n for n in value["selected"]};actual={f["name"]:f for f in after["functions"]}
 require(after["candidate"]==value["candidate"] and after["errors"]==[] and after["a5RetirementContractSha256"]==parent.DIGEST and len(actual)==len(after["functions"])==119 and set(actual)=={r["name"] for r in value["origins"]},"A5_COMPLETION_INITIAL_STATE")
 require(receipts["candidate"]==value["candidate"] and receipts["manifestSha256"]==parent.digest(value) and set(receipts["functions"])==selected,"A5_COMPLETION_FIVE_RECEIPTS")
 for row in value["origins"]:
  current=actual[row["name"]];require(current["state"]=="ACTIVE","A5_COMPLETION_INACTIVE")
  if row["name"] not in selected:require(current=={k:row[k] for k in ["name","revision","updateTime","state"]},"A5_COMPLETION_RETAINED_DRIFT")
  else:
   r=receipts["functions"][row["name"]];source=r["storageSource"]
   require(r["identity"]==current and current["revision"]!=row["revision"] and current["updateTime"]!=row["updateTime"] and r["allPathsAndFileBytesIdentical"] is True and r["generationReadAndReferencesRechecked"] is True and re.fullmatch("[a-f0-9]{64}",r["archiveSha256"]) and source["bucket"]=="gcf-v2-sources-718081132564-europe-west1" and source["object"]==row["name"].split("/")[-1]+"/function-source.zip" and re.fullmatch("[1-9][0-9]*",str(source["generation"])),"A5_COMPLETION_SOURCE_RECEIPT")
 return actual
def sealed_files(root,source):
 root,source=Path(root),Path(source);c=contract()
 locations={"release-plan":root,"production-after":root/"previous","production-idf-preservation":source,"production-code-backup":root/"encrypted"}
 for kind,folder in locations.items():
  for name,digest in c["artifacts"][kind]["files"].items():
   require(name==Path(name).name and sha((folder/name).read_bytes())==digest,"A5_COMPLETION_SEALED_FILE: "+kind+"/"+name)
 parent.approved(read(root/"request.json"));value=parent.manifest(root)
 require(read(source/"standard-source-manifest.json")==value and read(source/"standard-controls-before.json")==value["controls"],"A5_COMPLETION_CONTROLS")
 verify_sources(read(root/"previous/production-after.json"),read(source/"standard-source-receipts.json"),value)
 return c
def restore(root,source):
 root,source=Path(root),Path(source)
 require(os.environ.get("RESUME")==SOURCE_RUN and source==root/"previous/standard-guards","A5_COMPLETION_RESTORE_SCOPE")
 sealed_files(root,source)
 for name in ["standard-controls-before.json","standard-source-receipts.json"]:(root/name).write_bytes((source/name).read_bytes())
def verify_run(c,resume,info,artifacts,selected,hosting_exists):
 require(resume==SOURCE_RUN and info["id"]==int(SOURCE_RUN) and info["head_sha"]==SOURCE_HEAD and info["event"]=="workflow_dispatch" and info["run_attempt"]==1 and info["head_branch"]=="main" and info["path"]==WF and info["status"]=="completed" and info["conclusion"]=="failure","A5_COMPLETION_RUN")
 require(sorted(selected)==parent.contract()["selected"] and len(selected)==len(set(selected))==5 and not hosting_exists,"A5_COMPLETION_SELECTION_OR_HOSTING")
 entries={a["name"]:a for a in artifacts}
 require(len(entries)==len(artifacts) and "production-hosting-after" not in entries and all(entries.get(n,{}).get("id")==p["id"] and entries[n].get("digest")==p["digest"] and not entries[n]["expired"] for n,p in c["artifacts"].items()),"A5_COMPLETION_ARTIFACTS")

def qualify(root,resume,info,artifacts,selected,cycle):
 root=Path(root);c=sealed_files(root,root/"previous/standard-guards")
 verify_run(c,resume,info,artifacts,selected,(root/"previous/production-hosting-after.json").exists())
 for file,digest in c["sourceSha256"].items():require(sha(subprocess.check_output(["git","show",SOURCE_HEAD+":"+file],cwd=ROOT))==digest,"A5_COMPLETION_PRODUCER")
 jobs=cycle.gh("repos/ffessmnap/LivePalmes/actions/runs/"+SOURCE_RUN+"/jobs?per_page=100");require(jobs.get("total_count",len(jobs["jobs"]))<=100,"A5_COMPLETION_JOB_BUDGET")
 release=[j for j in jobs["jobs"] if j["name"]=="release"];require(len(release)==1 and release[0]["id"]==c["jobId"] and release[0]["conclusion"]=="failure","A5_COMPLETION_JOB")
 steps={s["name"]:s["conclusion"] for s in release[0]["steps"]}
 for name in ["Chiffrer puis tester la sauvegarde","Attester le producteur initial apres comparaison exacte","Controler toutes les Functions et les exclusions"]:require(steps[name]=="success","A5_COMPLETION_GUARD")
 for name in ["Fermer les seuls dossiers historiques A5 apres les cinq sources verifiees","Publier Hosting apres les controles","Controler les pages publiees"]:require(steps[name]=="skipped","A5_COMPLETION_LATE_WRITE")
 require([n for n,v in steps.items() if v=="failure"]==["Conclure"],"A5_COMPLETION_FAILURE")
 log=load("a5-legacy-direct-no-write-attempt.py").job_log(c)
 require(b"ValueError: Selection standard apres sources differente" in log and all(("Operation source "+n+" : terminee").encode() in log for n in parent.contract()["selected"]),"A5_COMPLETION_CAUSE")
 (root/"a5-rules-hosting-only.json").write_text(json.dumps(marker(),indent=2)+"\n")
 return True
def verify(root,backup,state):
 root,backup=Path(root),Path(backup);require_marker(root);c=contract();value=parent.manifest(root)
 source=read(Path(os.environ["RUNNER_TEMP"])/"code-backup-source.json")
 require(source["chainVerified"] is True and source["candidate"]==c["candidate"] and source["originRun"]==source["sourceRun"]==int(SOURCE_RUN) and source["sourceHead"]==SOURCE_HEAD and read(backup/"standard-source-manifest.json")==value,"A5_COMPLETION_BACKUP_ORIGIN")
 witness=read(backup/"a5-retirement-rules/before.json");require(witness==read(root/"a5-rules-before.json") and sha((backup/"a5-retirement-rules/before.rules").read_bytes())==parent.contract()["rules"]["beforeSha256"],"A5_COMPLETION_RULES_BACKUP")
 verify_archives(root,state)
 parent.state_check(backup,root/"a5-completion-current-state.json",True)
 require({f["name"]:f for f in read(root/"a5-completion-current-state.json")["functions"]}=={f["name"]:f for f in read(root/"previous/production-after.json")["functions"]},"A5_COMPLETION_CURRENT_DRIFT")
 parent.guard(root)

def verify_archives(root,state):
 root=Path(root)
 expected=load("publish-approved-pdf-functions.py").archive(Path(os.environ["CANDIDATE_DIRECTORY"]),contract()["candidate"])
 functions={f["name"]:f for f in state.inventory()};receipts=read(root/"standard-source-receipts.json")["functions"]
 for name,receipt in receipts.items():require(functions[name].get("labels",{}).get("livepalmes-commit")==contract()["candidate"] and load("standard-source-publish.py").attest(functions[name],expected,state)==receipt,"A5_COMPLETION_FRESH_ARCHIVE")
