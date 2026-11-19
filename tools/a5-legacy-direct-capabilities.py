"""Read only: discover existing A5 rule/data-cleanup capabilities; never grant roles."""
import datetime,hashlib,json,os,subprocess,sys,urllib.parse,urllib.request
from pathlib import Path
PROJECTS={"livepalmes":{"backend":"github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com","hosting":"github-actions-livepalmes@livepalmes.iam.gserviceaccount.com","buckets":["livepalmes-public-data-718081132564","livepalmes.firebasestorage.app"]},"livepalmes-test":{"backend":"github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com","hosting":"github-livepalmes-test@livepalmes-test.iam.gserviceaccount.com","buckets":["livepalmes-test-public-data-206080168534","livepalmes-test.firebasestorage.app"]}}
PROJECT_PERMISSIONS=["datastore.entities.get","datastore.entities.list","datastore.entities.delete","firebaserules.releases.get","firebaserules.releases.update","firebaserules.rulesets.get","firebaserules.rulesets.create","cloudfunctions.functions.get","cloudfunctions.functions.list","cloudfunctions.functions.update"]
BUCKET_PERMISSIONS=["storage.objects.get","storage.objects.list","storage.objects.delete"]
def require(value,message):
 if not value:raise ValueError(message)
def targets(project):
 require(project in PROJECTS,"A5_PROJECT")
 yield "project","https://cloudresourcemanager.googleapis.com/v1/projects/"+project+":testIamPermissions",{"permissions":PROJECT_PERMISSIONS},PROJECT_PERMISSIONS
 for bucket in PROJECTS[project]["buckets"]:
  query=urllib.parse.urlencode([("permissions",p) for p in BUCKET_PERMISSIONS])
  yield bucket,"https://storage.googleapis.com/storage/v1/b/"+bucket+"/iam/testPermissions?"+query,None,BUCKET_PERMISSIONS

def collect(project,reader,read):
 require(reader in ("backend","hosting"),"A5_READER")
 rows=[]
 for target,url,body,allowed in targets(project):
  data=read(url,body);permissions=data.get("permissions",[])
  require(isinstance(permissions,list) and set(permissions)<=set(allowed),"A5_PERMISSION_RESPONSE")
  rows.append({"target":target,"permissions":sorted(permissions)})
 return {"schema":1,"project":project,"reader":reader,"readOnly":True,"maximumRequests":3,"napRequests":0,"rows":rows,"observedAt":datetime.datetime.now(datetime.timezone.utc).isoformat()}
def main(project,reader,destination):
 require(os.environ.get("VERIFIED_MAIN_CI")=="true","A5_MAIN_CI")
 require(project in PROJECTS and reader in ("backend","hosting"),"A5_CONTEXT")
 account=json.loads(Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]).read_text())
 require(account.get("type")=="service_account" and account.get("project_id")==project and account.get("client_email")==PROJECTS[project][reader],"A5_EXISTING_IDENTITY")
 token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
 def read(url,body):
  request=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
  with urllib.request.urlopen(request,timeout=30) as response:return json.load(response)
 value=collect(project,reader,read);p=Path(destination);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,indent=2)+"\n")
 print("Capacités existantes lues ; aucune permission ajoutée, aucune donnée lue ou modifiée.")
if __name__=="__main__":main(*sys.argv[1:])
