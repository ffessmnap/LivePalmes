"""A5 bounded static HTTP checks, without redirects or script execution."""
import hashlib,importlib.util,json,os,subprocess,sys,time,urllib.request,urllib.error,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location("a5_http_scope",ROOT/"tools/a5-legacy-direct-policy.py");closed=importlib.util.module_from_spec(s);s.loader.exec_module(closed)
PRESERVED=["direct.html","direct-admin.html","direct-consoles.html","direct-guide.html","assets/direct/import.js","assets/livepalmes-series-import.js","assets/livepalmes-result-parser.js","performances/public/app.js"]
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
def fetch(url):
 try:
  with urllib.request.build_opener(NoRedirect()).open(url,timeout=30) as response:
   data=response.read(4*1024*1024+1);closed.require(len(data)<=4*1024*1024,"A5_HTTP_BYTES");return response.status,data,dict(response.headers)
 except urllib.error.HTTPError as error:
  status=error.code;headers=dict(error.headers);error.close();return status,b"",headers
def check(project,candidate,output,read=fetch):
 closed.require(project in {"livepalmes","livepalmes-test"},"A5_HTTP_PROJECT");closed.validate_candidate(candidate)
 base="https://"+project+".web.app/";scope=closed.scope();rows=[]
 retired=sorted({*scope["retiredPages"],"series","resultats",*[p for p in scope["retiredPaths"] if p.endswith(".js") and not p.startswith("tools/")]})
 try:
  for name in retired:
   for attempt,delay in enumerate((0,3,10),1):
    if delay:time.sleep(delay)
    status,_,headers=read(base+urllib.parse.quote(name)+"?a5="+candidate+"&archive=retired")
    rows.append({"path":name,"attempt":attempt,"status":status,"redirect":any(k.lower()=="location" for k in headers)})
    if status==404 and rows[-1]["redirect"] is False:break
   else:raise ValueError("A5_OLD_URL_VISIBLE: "+name)
  for name in PRESERVED:
   expected=subprocess.check_output(["git","show",candidate+":"+name],cwd=ROOT)
   expected_hash=hashlib.sha256(expected).hexdigest()
   for attempt,delay in enumerate((0,3,10),1):
    if delay:time.sleep(delay)
    status,body,headers=read(base+urllib.parse.quote(name)+"?a5="+candidate)
    actual_hash=hashlib.sha256(body).hexdigest()
    rows.append({"path":name,"attempt":attempt,"status":status,"expectedSha256":expected_hash,"actualSha256":actual_hash,"redirect":any(k.lower()=="location" for k in headers)})
    if status==200 and expected_hash==actual_hash and rows[-1]["redirect"] is False:break
   else:raise ValueError("A5_PRESERVED_URL_CHANGED: "+name)
  result="success"
 finally:
  Path(output).write_text(json.dumps({"schema":1,"project":project,"candidate":candidate,"maximumRequests":3*(len(retired)+len(PRESERVED)),"businessInvocations":0,"scriptsExecuted":False,"result":locals().get("result","failure"),"rows":rows},indent=2)+"\n")
 return rows
if __name__=="__main__":check(*sys.argv[1:])
