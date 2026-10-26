"""Closed account-history PROD indexes. No document, rule or mail writer."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
import urllib.error

PROJECT = "livepalmes"
PREFIX = "projects/livepalmes/databases/(default)/collectionGroups/engagementAccessRequests/indexes"
URL = "https://firestore.googleapis.com/v1/" + PREFIX
CANDIDATE = "cbe39bff1d5bb465c29da5c99f5c3b6c740b9432"
FIELDS = [["status", "resolvedAt", "__name__"], ["regionId", "status", "resolvedAt", "__name__"]]
DEFINITIONS = [{"queryScope":"COLLECTION", "fields":[{"fieldPath":name,"order":"DESCENDING" if name in {"resolvedAt","__name__"} else "ASCENDING"} for name in names]} for names in FIELDS]
APPROVAL = {"candidate":CANDIDATE,"collection":"engagementAccessRequests","definitions":DEFINITIONS,"addOnly":True,"delete":False,"documents":False}

def require(value, message):
    if not value: raise ValueError(message)

def matching(index, definition):
    return index.get("name", "").startswith(PREFIX + "/") and all(index.get(k)==definition[k] for k in ["queryScope","fields"])

def check_plan(request):
    require(request.get("candidate")==CANDIDATE and request.get("productionAccountHistoryIndexes")==APPROVAL,
        "Plan hors candidat ou contrat exact des deux index")

def missing(indexes):
    require(isinstance(indexes,list) and len(indexes)<=2000, "Inventaire hors limite")
    result=[]
    for definition in DEFINITIONS:
        found=[x for x in indexes if matching(x,definition)]
        require(len(found)<=1, "Index ambigu")
        require(not found or found[0].get("state") in {"READY","CREATING"}, "Index a reparer : aucune suppression automatique")
        if not found: result.append(definition)
    return result

def main(mode, directory, plan_run=""):
    require(mode in {"inspect","apply"}, "Mode interdit")
    require(os.environ.get("GITHUB_REF")=="refs/heads/main" and os.environ.get("GITHUB_RUN_ATTEMPT")=="1", "main/tentative1 requis")
    credentials=json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
    require(credentials.get("project_id")==PROJECT and credentials.get("client_email")=="github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com", "Identite PROD backend existante requise")
    directory=Path(directory); directory.mkdir(parents=True,exist_ok=True)
    if mode=="apply":
        require(os.environ.get("INDEX_CONFIRMATION")=="approved-production-account-history-two-indexes", "Accord final explicite requis")
        spec=importlib.util.spec_from_file_location("index_cycle",Path(__file__).with_name("release-cycle.py")); cycle=importlib.util.module_from_spec(spec);spec.loader.exec_module(cycle)
        cycle.artifact(plan_run,"release-plan",directory,".github/workflows/livepalmes-production-preflight.yml")
        check_plan(cycle.read(directory/"request.json"))
    token=subprocess.check_output(["gcloud","auth","application-default","print-access-token"],text=True).strip()
    def api(url, body=None):
        require(url==URL or url.startswith(URL+"?pageSize=100"), "URL interdite")
        require(body is None or (mode=="apply" and body in DEFINITIONS), "Ecriture hors contrat")
        req=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
        try:
            with urllib.request.urlopen(req,timeout=60) as response: return json.load(response)
        except urllib.error.HTTPError as error:
            # This endpoint returns index metadata only. Do not print request
            # headers, credentials or arbitrary transport/debug objects.
            try:
                detail=json.loads(error.read(8192)).get('error',{})
                status=str(detail.get('status',''))[:80]
                message=str(detail.get('message',''))[:600]
            except (ValueError, TypeError):
                status=message=''
            raise ValueError(f'Index metadata HTTP {error.code}: {status} {message}') from None
    def listing():
        from urllib.parse import quote
        rows=[];page=""
        for _ in range(20):
            result=api(URL+"?pageSize=100"+("&pageToken="+quote(page,safe="") if page else ""));rows.extend(result.get("indexes",[]));page=result.get("nextPageToken","")
            if not page:return rows
        raise ValueError("Inventaire tronque : arret")
    before=listing();create=missing(before)
    (directory/"indexes-before.json").write_text(json.dumps(before,indent=2))
    if mode=="apply":
        for definition in create: api(URL,definition)
        for _ in range(90):
            after=listing();missing(after)
            if all(any(matching(x,d) and x.get("state")=="READY" for x in after) for d in DEFINITIONS):break
            time.sleep(10)
        else: raise ValueError("Index pas encore READY : ne pas publier le lecteur")
    else: after=before
    receipt={"project":PROJECT,"mode":mode,"candidate":CANDIDATE,"definitions":DEFINITIONS,"missing":create,"indexes":after,"created":len(create) if mode=="apply" else 0,"documentsWritten":0,"rulesChanged":False,"deleted":0,"mailChanged":False}
    (directory/"index-receipt.json").write_text(json.dumps(receipt,indent=2))
    print(json.dumps({k:v for k,v in receipt.items() if k!="indexes"}))

if __name__=="__main__":main(*sys.argv[1:])
