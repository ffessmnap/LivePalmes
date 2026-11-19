"use strict";
// A5 data lifecycle primitives. Network/identity/provenance are supplied by the
// protected workflow; importing this module never accesses a real service.
const core=require("./a2-backup-core"),data=require("./a2-firebase-data");
const IDS=Object.freeze(["livepalmes-active","livepalmes-test"]);
const BUCKETS=Object.freeze({livepalmes:["livepalmes-public-data-718081132564","livepalmes.firebasestorage.app"],"livepalmes-test":["livepalmes-test-public-data-206080168534","livepalmes-test.firebasestorage.app"]});
const COLLECTIONS=new Set(["alerts","consoleGrants","frenchTouch","historyArchives","liveData","presence","public","roleLocks","secrets","seriesPdfs","summaries","testMode","resultArchives","results","resultPdfs","sessionResultsPdfs"]);
const LIMITS=Object.freeze({maxDocuments:2000,pageSize:200,maxFirestoreBytes:64*1024*1024,maxObjects:128,maxFileBytes:8*1024*1024,maxStorageBytes:32*1024*1024,maxBackupBytes:128*1024*1024});
const fail=core.fail,hash=core.hash,canonical=core.canonical;
function project(value){if(!Object.hasOwn(BUCKETS,value))fail("A5_PROJECT_REFUSED");return value;}
function scopeDigest(value){project(value);return hash(canonical({project:value,ids:IDS,collections:[...COLLECTIONS].sort(),protected:"performanceData",buckets:BUCKETS[value],limits:LIMITS}));}
function documentScope(value,name){
 const relative=data.docPath(project(value),name),parts=relative.split("/");
 if(parts.some(p=>!p||p==="."||p==="..")||parts[0]!=="competitions"||!IDS.includes(parts[1]))fail("A5_FOREIGN_DOCUMENT");
 if(parts.length===2)return "target";
 if(parts[2]==="performanceData")return "protected";
 if(!COLLECTIONS.has(parts[2]))fail("A5_UNQUALIFIED_COLLECTION");
 return "target";
}
function documentIdentity(value,document){
 if(documentScope(value,document.name)!=="target"||!Number.isFinite(Date.parse(document.updateTime)))fail("A5_DOCUMENT_IDENTITY");
 return hash(canonical({kind:"document",name:document.name,updateTime:document.updateTime}));
}
function objectIdentity(value,object){
 const meta=object.metadata;
 if(!BUCKETS[project(value)].includes(object.bucket)||!meta||typeof meta.name!=="string"||!IDS.some(id=>meta.name.startsWith("competition-pdfs/"+id+"/"))||!meta.name.endsWith(".pdf")||meta.name.split("/").some(p=>!p||p==="."||p==="..")||!/^[1-9][0-9]*$/.test(String(meta.generation))||!Number.isSafeInteger(Number(meta.size))||Number(meta.size)<1||Number(meta.size)>LIMITS.maxFileBytes)fail("A5_FOREIGN_OBJECT");
 return hash(canonical({kind:"object",bucket:object.bucket,name:meta.name,generation:String(meta.generation)}));
}
function validateSnapshot(snapshot){
 const value=project(snapshot.project);
 if(!Array.isArray(snapshot.documents)||!Array.isArray(snapshot.protectedDocuments)||!Array.isArray(snapshot.objects)||snapshot.documents.length+snapshot.protectedDocuments.length>IDS.length*(LIMITS.maxDocuments+1)||snapshot.objects.length>LIMITS.maxObjects)fail("A5_SNAPSHOT_BUDGET");
 const docNames=new Set(),objectNames=new Set();let bytes=0,storageBytes=0;
 for(const d of snapshot.documents){documentIdentity(value,d);if(docNames.has(d.name))fail("A5_DUPLICATE_DOCUMENT");docNames.add(d.name);bytes+=Buffer.byteLength(JSON.stringify(d));}
 for(const d of snapshot.protectedDocuments){if(documentScope(value,d.name)!=="protected"||docNames.has(d.name)||!Number.isFinite(Date.parse(d.updateTime)))fail("A5_PROTECTED_DOCUMENT");docNames.add(d.name);bytes+=Buffer.byteLength(JSON.stringify(d));}
 for(const o of snapshot.objects){const id=objectIdentity(value,o);if(objectNames.has(id))fail("A5_DUPLICATE_OBJECT");objectNames.add(id);storageBytes+=Number(o.metadata.size);}
 if(bytes>IDS.length*LIMITS.maxFirestoreBytes||storageBytes>LIMITS.maxStorageBytes)fail("A5_SNAPSHOT_BYTE_BUDGET");
 return {project:value,documentHashes:snapshot.documents.map(d=>documentIdentity(value,d)).sort(),objectHashes:snapshot.objects.map(o=>objectIdentity(value,o)).sort(),protectedHash:hash(canonical([...snapshot.protectedDocuments].sort((a,b)=>a.name.localeCompare(b.name))))};
}
async function collect(value,api,{contents=false,buckets=BUCKETS[value]}={}){
 project(value);if(!Array.isArray(buckets)||!buckets.length||new Set(buckets).size!==buckets.length||buckets.some(b=>!BUCKETS[value].includes(b)))fail("A5_READ_BUCKET_SCOPE");const result={project:value,readBuckets:[...buckets],documents:[],protectedDocuments:[],objects:[]};
 const base="https://firestore.googleapis.com/v1/"+data.database(value)+"/documents";
 for(const id of IDS){
  const parent=base+"/competitions/"+id;
  const scoped=async(url,body)=>{
   if(![base+":runAggregationQuery",base+":runQuery"].includes(url))fail("A5_UNSCOPED_FIRESTORE_REQUEST");
   return api(parent+url.slice(base.length),body);
  };
  const exported=await data.exportDocuments(scoped,value,LIMITS);
  const root=await api(parent);
  for(const d of [...exported.documents,...(root?.missing?[]:[root])]){
   if(documentScope(value,d.name)==="protected")result.protectedDocuments.push(d);else result.documents.push(d);
  }
 }
 for(const bucket of buckets)for(const id of IDS){
  const prefix="competition-pdfs/"+id+"/",query=new URLSearchParams({prefix,versions:"true",maxResults:String(LIMITS.maxObjects+1),fields:"nextPageToken,items(name,generation,size,crc32c,md5Hash)"});
  const listing=await api("https://storage.googleapis.com/storage/v1/b/"+bucket+"/o?"+query);
  if(listing.nextPageToken)fail("A5_INCOMPLETE_OBJECT_INVENTORY");
  for(const metadata of listing.items||[]){
   if(result.objects.length>=LIMITS.maxObjects||!metadata.name.startsWith(prefix))fail("A5_OBJECT_BUDGET_OR_SCOPE");
   const object={bucket,metadata};objectIdentity(value,object);
   if(contents){
    const query=new URLSearchParams({alt:"media",generation:String(metadata.generation),ifGenerationMatch:String(metadata.generation)});
    const bytes=await api("https://storage.googleapis.com/storage/v1/b/"+bucket+"/o/"+encodeURIComponent(metadata.name)+"?"+query,undefined,true);
    if(bytes.subarray(0,5).toString()!=="%PDF-")fail("A5_PDF_SIGNATURE");
    object.sha256=data.verifyObject(metadata,bytes);object.content=bytes.toString("base64");
   }
   result.objects.push(object);
  }
 }
 validateSnapshot(result);return result;
}
function backup(snapshot,key){
 const manifest=validateSnapshot(snapshot);
 if(snapshot.readBuckets&&canonical([...snapshot.readBuckets].sort())!==canonical([...BUCKETS[snapshot.project]].sort()))fail("A5_FULL_BACKUP_READ_REQUIRED");
 for(const object of snapshot.objects){
  if(!object.content||!object.sha256)fail("A5_BACKUP_PDF_CONTENT_REQUIRED");
  const bytes=Buffer.from(object.content,"base64");if(data.verifyObject(object.metadata,bytes)!==object.sha256)fail("A5_BACKUP_PDF_CHANGED");
 }
 // Reuse the standing A2 encryption and verify recovery before any deletion.
 const payload={schema:1,scopeSha256:scopeDigest(snapshot.project),project:snapshot.project,documents:snapshot.documents,objects:snapshot.objects};
 const packed=core.pack(payload,key,LIMITS.maxBackupBytes),restored=core.unpack(packed.encrypted,key,LIMITS.maxBackupBytes);
 if(canonical(restored)!==canonical(payload))fail("A5_BACKUP_RECOVERY_DIFFERS");
 for(const object of restored.objects)if(data.verifyObject(object.metadata,Buffer.from(object.content,"base64"))!==object.sha256)fail("A5_BACKUP_PDF_RECOVERY_DIFFERS");
 return {encrypted:packed.encrypted,report:{schema:1,scopeSha256:payload.scopeSha256,project:snapshot.project,recoveryVerified:true,fullReadScope:true,storageCountsByBucket:Object.fromEntries(BUCKETS[snapshot.project].map(bucket=>[bucket,snapshot.objects.filter(o=>o.bucket===bucket).length])),encryptedSha256:hash(packed.encrypted),plainSha256:packed.sha256,documentHashes:manifest.documentHashes,objectHashes:manifest.objectHashes,protectedHash:manifest.protectedHash,documentCount:manifest.documentHashes.length,objectVersionCount:manifest.objectHashes.length}};
}
function approvedSubset(current,report){
 if(report.schema!==1||report.project!==current.project||report.scopeSha256!==scopeDigest(current.project)||report.recoveryVerified!==true||!/^[a-f0-9]{64}$/.test(report.encryptedSha256||"")||!/^[a-f0-9]{64}$/.test(report.plainSha256||""))fail("A5_VERIFIED_BACKUP_REQUIRED");
 if(!Array.isArray(report.documentHashes)||!Array.isArray(report.objectHashes)||report.documentHashes.length>IDS.length*(LIMITS.maxDocuments+1)||report.objectHashes.length>LIMITS.maxObjects||report.documentCount!==report.documentHashes.length||report.objectVersionCount!==report.objectHashes.length||new Set(report.documentHashes).size!==report.documentHashes.length||new Set(report.objectHashes).size!==report.objectHashes.length||![...report.documentHashes,...report.objectHashes].every(id=>/^[a-f0-9]{64}$/.test(id)))fail("A5_BACKUP_MANIFEST_REFUSED");
 if(current.protectedHash!==report.protectedHash||current.documentHashes.some(id=>!report.documentHashes.includes(id))||current.objectHashes.some(id=>!report.objectHashes.includes(id)))fail("A5_DRIFT_AFTER_BACKUP");
}
async function apply(snapshot,report,{remove,refresh,saveProgress}){
 const current=validateSnapshot(snapshot);approvedSubset(current,report);
 if(typeof remove!=="function"||typeof refresh!=="function"||typeof saveProgress!=="function")fail("A5_PROTECTED_DRIVER_REQUIRED");
 const progress={schema:1,project:snapshot.project,scopeSha256:scopeDigest(snapshot.project),backupEncryptedSha256:report.encryptedSha256,acknowledgedDocuments:0,acknowledgedObjectVersions:0,alreadyAbsent:report.documentHashes.length+report.objectHashes.length-current.documentHashes.length-current.objectHashes.length,result:"partial"};
 try{
  for(const document of snapshot.documents){
   documentIdentity(snapshot.project,document);
   const name=document.name.split("/").map(encodeURIComponent).join("/"),query=new URLSearchParams({"currentDocument.updateTime":document.updateTime});
   const response=await remove("https://firestore.googleapis.com/v1/"+name+"?"+query);
   if(![200,204].includes(response.status))fail("A5_DOCUMENT_DELETE_UNCONFIRMED");progress.acknowledgedDocuments++;await saveProgress(progress);
  }
  for(const object of snapshot.objects){
   objectIdentity(snapshot.project,object);const meta=object.metadata,query=new URLSearchParams({generation:String(meta.generation),ifGenerationMatch:String(meta.generation)});
   const response=await remove("https://storage.googleapis.com/storage/v1/b/"+object.bucket+"/o/"+encodeURIComponent(meta.name)+"?"+query);
   if(![200,204].includes(response.status))fail("A5_OBJECT_DELETE_UNCONFIRMED");progress.acknowledgedObjectVersions++;await saveProgress(progress);
  }
  const after=validateSnapshot(await refresh());
  if(after.project!==current.project||after.documentHashes.length||after.objectHashes.length||after.protectedHash!==report.protectedHash)fail("A5_FINAL_STATE_DIFFERS");
  progress.result="success";progress.protectedRecordsUnchanged=true;return progress;
 }finally{await saveProgress(progress);}
}
module.exports={IDS,BUCKETS,COLLECTIONS,LIMITS,scopeDigest,documentScope,documentIdentity,objectIdentity,validateSnapshot,collect,backup,approvedSubset,apply};
