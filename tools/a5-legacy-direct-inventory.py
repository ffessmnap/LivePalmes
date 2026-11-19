"""Read-only, bounded inventory of the two retired national Direct dossiers."""
import datetime,json,os,subprocess,sys,urllib.error,urllib.parse,urllib.request
from pathlib import Path
PROJECTS={"livepalmes":("livepalmes-public-data-718081132564","livepalmes.firebasestorage.app"),"livepalmes-test":("livepalmes-test-public-data-206080168534","livepalmes-test.firebasestorage.app")}
COMPETITIONS=("livepalmes-active","livepalmes-test")
MAX_ARCHIVES=100

def require(value,message):
    if not value:raise ValueError(message)

def targets():
    result=[]
    for project,buckets in PROJECTS.items():
        base=f"https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents"
        for cid in COMPETITIONS:
            parent=base+"/competitions/"+cid
            result.append((project,cid,"collections",parent+":listCollectionIds",{"pageSize":100}))
            for name in ("public/resultsIndex","liveData/current"):
                mask=urllib.parse.urlencode([("mask.fieldPaths","meet"),("mask.fieldPaths","data.meet")])
                result.append((project,cid,name,parent+"/"+name+"?"+mask,None))
            result.append((project,cid,"archives",parent+":runQuery",{"structuredQuery":{"from":[{"collectionId":"resultArchives"}],"select":{"fields":[{"fieldPath":"meet"},{"fieldPath":"createdAt"},{"fieldPath":"count"}]},"limit":MAX_ARCHIVES+1}}))
        for bucket in buckets:
            for cid in COMPETITIONS:
                prefix="competition-pdfs/"+cid+"/"
                params=urllib.parse.urlencode({"prefix":prefix,"maxResults":1000,"versions":"true","fields":"nextPageToken,items(name,generation,size,crc32c,md5Hash)"})
                result.append((project,bucket,prefix,"https://storage.googleapis.com/storage/v1/b/"+bucket+"/o?"+params,None))
    return result

def collect(read):
    rows=[]
    for project,target,kind,url,body in targets():
        value=read(url,body)
        if kind=="archives":
            require(isinstance(value,list),"ARCHIVE_RESPONSE_REQUIRED")
            require(sum("document" in row for row in value)<=MAX_ARCHIVES,"ARCHIVE_BOUND_EXCEEDED")
        else:
            require(isinstance(value,dict),"OBJECT_RESPONSE_REQUIRED")
            require(not value.get("nextPageToken"),"INCOMPLETE_INVENTORY")
        if kind.startswith("competition-pdfs/"):
            objects=value.get("items",[])
            require(len(objects)<=1000,"OBJECT_BOUND_EXCEEDED")
            require(all(item.get("name","").startswith(kind) and item.get("generation","").isdigit() for item in objects),"FOREIGN_OBJECT")
        rows.append({"project":project,"target":target,"kind":kind,"value":value})
    return {"schema":1,"observedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"readOnly":True,"napRequests":0,"maximumRequests":24,"maximumArchiveDocuments":400,"maximumObjectMetadataRows":8000,"rows":rows}

def main(destination):
    require(os.environ.get("VERIFIED_MAIN_CI")=="true","VERIFIED_MAIN_CI_REQUIRED")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    def read(url,body):
        request=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"})
        try:
            with urllib.request.urlopen(request,timeout=45) as response:return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code==404 and body is None and "/documents/competitions/" in url:return {"missing":True}
            raise ValueError("INVENTORY_HTTP_"+str(error.code)) from None
    result=collect(read)
    path=Path(destination);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Inventaire A5 complet : 24 requêtes au plus, aucune écriture ni contenu de PDF lu.")

if __name__=="__main__":main(sys.argv[1])
