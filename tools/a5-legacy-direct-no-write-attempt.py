"""Qualify only the reviewed A5 stop before any source upload or mutation."""
import hashlib,importlib.util,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/".github/releases/evidence/20261119-a5-no-source-write-attempt.json"
DIGEST="6786dc6192a86ab89a0448107ea1698a936405fd90e011a552c2fc40973dbfb2"
RUN=44544937416;HEAD="7eb2e8e9315b8ad28f0d834643e32cf7db67e81c";WF=".github/workflows/livepalmes-production-release.yml"
def load(name):
 s=importlib.util.spec_from_file_location("a5_no_write_"+name.replace("-","_"),ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
require=load("standard-source-policy.py").require
sha=lambda b:hashlib.sha256(b).hexdigest()
def contract():
 raw=PATH.read_bytes().replace(b"\r\n",b"\n");require(sha(raw)==DIGEST,"A5_NO_WRITE_RECORD_CHANGED");c=json.loads(raw)
 require(c["failedRun"]==RUN and c["controller"]==HEAD and c["productionRun"]==44513988803 and c["jobId"]==135633657841 and c["unchangedFunctions"]==119 and c["sourceWrites"]==c["rulesWrites"]==c["hostingWrites"]==c["businessInvocations"]==0,"A5_NO_WRITE_SCOPE")
 return c
def verify_states(record,plan,after,manifest,parent):
 parent.approved(plan["request"]);parent.validate_manifest(manifest)
 require(plan["baseline"]=={"productionRun":record["productionRun"],"productionCommit":parent.contract()["productionCommit"],"source":"verified-publication-artifacts"},"A5_NO_WRITE_BASELINE")
 before=plan["before"]["functions"];observed=after["functions"]
 expected=sorted([{k:f[k] for k in ["name","revision","updateTime","state"]} for f in before],key=lambda f:f["name"])
 require(len(before)==len({f["name"] for f in before})==len(observed)==119 and sorted(observed,key=lambda f:f["name"])==expected and after["candidate"]==record["candidate"] and after["a5RetirementContractSha256"]==parent.DIGEST and after["errors"]==["Nouvelle revision et horodatage non confirmes"],"A5_NO_WRITE_FUNCTION_DRIFT")
 require(sorted(plan["selection"])==manifest["selected"] and len(plan["selection"])==len(set(plan["selection"]))==5,"A5_NO_WRITE_SELECTION")
 return expected
def review(directory,cycle):
 directory=Path(directory);c=contract();parent=load("a5-legacy-direct-production-policy.py")
 request=cycle.read(directory/"request.json");parent.approved(request)
 runs=cycle.gh("repos/ffessmnap/LivePalmes/actions/workflows/livepalmes-production-release.yml/runs?branch=main&event=workflow_dispatch&per_page=20")["workflow_runs"]
 require(runs and runs[0]["id"]==RUN,"A5_NO_WRITE_NEW_ATTEMPT_REQUIRES_REVIEW")
 for file,expected in c["sourceSha256"].items():
  source=subprocess.check_output(["git","show",HEAD+":"+file],cwd=ROOT)
  require(sha(source)==expected,"A5_NO_WRITE_PRODUCER_CHANGED")
 reader=load("portal-session-enforcement-completion.py");dest=directory/"a5-no-source-write-attempt"
 for name,expected in c["artifacts"].items():reader.authenticate(RUN,name,dest/name,expected,WF,"failure",HEAD)
 plan=dict(request=cycle.read(dest/"release-plan/request.json"),baseline=cycle.read(dest/"release-plan/baseline.json"),before=cycle.read(dest/"release-plan/prod-before.json"),selection=cycle.read(dest/"release-plan/selection.json"))
 verify_states(c,plan,cycle.read(dest/"production-after/production-after.json"),cycle.read(dest/"release-plan/standard-source-manifest.json"),parent)
 jobs=cycle.gh("repos/ffessmnap/LivePalmes/actions/runs/"+str(RUN)+"/jobs?per_page=100")
 require(jobs.get("total_count",len(jobs["jobs"]))<=100,"A5_NO_WRITE_JOB_BUDGET")
 selected=[j for j in jobs["jobs"] if j["name"]=="release"];require(len(selected)==1 and selected[0]["id"]==c["jobId"] and selected[0]["conclusion"]=="failure","A5_NO_WRITE_JOB")
 steps=selected[0]["steps"];by_name={s["name"]:s for s in steps}
 for name in ["Chiffrer puis tester la sauvegarde","Attester le producteur initial apres comparaison exacte","Controler toutes les Functions et les exclusions"]:require(by_name[name]["conclusion"]=="success","A5_NO_WRITE_GUARD_MISSING")
 for name in ["Fermer les seuls dossiers historiques A5 apres les cinq sources verifiees","Publier Hosting apres les controles","Controler les pages publiees"]:require(by_name[name]["conclusion"]=="skipped","A5_NO_WRITE_LATE_MUTATION")
 require([s["name"] for s in steps if s["conclusion"]=="failure"]==["Conclure"],"A5_NO_WRITE_UNKNOWN_FAILURE")
 log=subprocess.check_output(["gh","api","repos/ffessmnap/LivePalmes/actions/jobs/"+str(c["jobId"])+"/logs"])
 require(sha(log)==c["jobLogSha256"] and b"ValueError: Candidat modifie" in log and b"publish-approved-pdf-functions.py" in log,"A5_NO_WRITE_LOG")
 require(not (dest/"production-idf-preservation/standard-source-receipts.json").exists(),"A5_NO_WRITE_UNEXPECTED_SOURCE_RECEIPT")
 cycle.write(directory/"a5-no-source-write-proof.json",{"schema":1,"failedRun":RUN,"candidate":c["candidate"],"unchangedFunctions":119,"sourceWrites":0,"rulesWrites":0,"hostingWrites":0,"recordSha256":DIGEST,"result":"verified-no-source-write","freshPreparationRequired":True})
 return c["productionRun"]
