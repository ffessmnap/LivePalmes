"""Closed A5 retirement scope. No new rights, new Direct or sporting data changes."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCOPE=ROOT/"tools/a5-legacy-direct-scope.json"
def require(value,message):
    if not value:raise ValueError(message)
def digest(data):
    if isinstance(data,str):data=data.encode()
    return hashlib.sha256(data.replace(b"\r\n",b"\n")).hexdigest()
def scope():
    require(digest(SCOPE.read_bytes())=="5b90578e473f9acb3068112cfed3b0293c5e25cf09caad3de41a082503acaa88","A5_SCOPE_CHANGED")
    value=json.loads(SCOPE.read_text(encoding="utf-8"));require(value["schema"]==1,"A5_SCOPE_SCHEMA")
    require(value["functions"]==sorted(["verifyPin","setRolePins","storeCompetitionPdf","deleteCompetitionPdf","syncOfficialResultToPublicIndex"]),"A5_FUNCTION_SCOPE")
    return value
def rules_after(before):
    after=before.replace("\r\n","\n")
    for expression in ['competitionId == "livepalmes-active" || competitionId == "livepalmes-test"','competitionId == "livepalmes-active"','competitionId == "livepalmes-test"']:
        old="return "+expression+";";require(after.count(old)==1,"A5_RULE_BASELINE")
        after=after.replace(old,"return false; // National Direct retired; no client access remains.",1)
    old='match /secrets/{documentId} {\n        allow read, write: if isAdmin();'
    require(after.count(old)==1,"A5_SECRET_BASELINE")
    return after.replace(old,'match /secrets/{documentId} {\n        allow read, write: if competitionId != "livepalmes-active"\n          && competitionId != "livepalmes-test" && isAdmin();',1)
def validate_rules(before,after):
    require(rules_after(before)==after.replace("\r\n","\n"),"A5_RULE_SCOPE_CHANGED")
def validate_hosting(before,after):
    c=scope();require(before==c["hostingBefore"] and after==c["hostingAfter"],"A5_HOSTING_PAIR_CHANGED")
    expected=json.loads(json.dumps(before));h=expected["hosting"]
    retired={"/"+p for p in c["retiredPages"]}|{"/series","/resultats"}
    h["rewrites"]=[row for row in h.get("rewrites",[]) if row["source"] not in retired]
    h["headers"]=[row for row in h.get("headers",[]) if row["source"] not in retired|{"/assets/pages/resultats.js","/assets/pages/series-public.js"}]
    require(expected==after,"A5_HOSTING_OTHER_CHANGE")
def validate_candidate(candidate,git=None):
    c=scope()
    if git is None:
        def git(*args):return subprocess.check_output(["git",*args],cwd=ROOT,text=True).rstrip("\n")
    anchor="8dc6cfa6f3da31ddc936547a872d8c32d8ff8273"
    git("merge-base","--is-ancestor",anchor,candidate)
    later=git("diff","--name-only","--no-renames",anchor,candidate).splitlines()
    require(all(p.startswith(("tools/","tests/","docs/",".github/")) for p in later),"A5_APPLICATION_CHANGED_AFTER_FREEZE")
    changed=git("diff","--name-only","--no-renames",c["baseline"],candidate,"--","functions").splitlines()
    require(set(changed)==set(c["backendBlobs"]),"A5_BACKEND_OTHER_CHANGE")
    for name,expected in {**c["backendBlobs"],**c["sharedBlobs"]}.items():
        require(git("rev-parse",candidate+":"+name)==expected,"A5_SOURCE_CHANGED: "+name)
    for name in c["retiredPaths"]:require(not git("ls-tree","--name-only",candidate,"--",name),"A5_RETIRED_PATH_PRESENT: "+name)
    validate_rules(git("show",c["baseline"]+":firestore.rules")+"\n",git("show",candidate+":firestore.rules")+"\n")
    validate_hosting(json.loads(git("show",c["baseline"]+":firebase.json")),json.loads(git("show",candidate+":firebase.json")))
    return c
