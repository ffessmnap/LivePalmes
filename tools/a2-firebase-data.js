"use strict";
const {fail,hash,canonical}=require("./a2-backup-core");
function database(project){if(!["livepalmes","livepalmes-test"].includes(project))fail("PROJECT_REFUSED");return "projects/"+project+"/databases/(default)";}
function docPath(project,name){const prefix=database(project)+"/documents/";if(typeof name!=="string"||!name.startsWith(prefix)||!name.slice(prefix.length)||name.slice(prefix.length).split("/").length%2!==0)fail("DOCUMENT_PATH_REFUSED");return name.slice(prefix.length);}
async function countDocuments(api,project,maxDocuments){
 const values=await api("https://firestore.googleapis.com/v1/"+database(project)+"/documents:runAggregationQuery",{structuredAggregationQuery:{structuredQuery:{from:[{allDescendants:true}]},aggregations:[{alias:"total",count:{upTo:String(maxDocuments+1)}}]}});
 if(!Array.isArray(values)||values.length!==1)fail("COUNT_RESPONSE_INVALID");const count=Number(values[0].result?.aggregateFields?.total?.integerValue),readTime=values[0].readTime;
 if(!Number.isSafeInteger(count)||count<0||count>maxDocuments||!Number.isFinite(Date.parse(readTime)))fail("DOCUMENT_BUDGET_EXCEEDED");return {count,readTime};
}
async function exportDocuments(api,project,settings){
 const snapshot=await countDocuments(api,project,settings.maxDocuments),documents=[];let cursor,byteCount=0;
 for(let page=0;page<=Math.ceil(settings.maxDocuments/settings.pageSize);page++){
  const query={from:[{allDescendants:true}],orderBy:[{field:{fieldPath:"__name__"},direction:"ASCENDING"}],limit:settings.pageSize,...(cursor?{startAt:{values:[{referenceValue:cursor}],before:false}}:{})};
  const response=await api("https://firestore.googleapis.com/v1/"+database(project)+"/documents:runQuery",{structuredQuery:query,readTime:snapshot.readTime});
  if(!Array.isArray(response))fail("QUERY_RESPONSE_INVALID");const batch=response.filter(value=>value.document).map(value=>value.document);
  for(const document of batch){docPath(project,document.name);if(cursor&&document.name===cursor)fail("DOCUMENT_CURSOR_STALLED");byteCount+=Buffer.byteLength(JSON.stringify(document));if(byteCount>settings.maxFirestoreBytes||documents.length>=settings.maxDocuments)fail("DOCUMENT_BUDGET_EXCEEDED");documents.push(document);}
  if(batch.length<settings.pageSize)break;const next=batch.at(-1).name;if(next===cursor)fail("DOCUMENT_CURSOR_STALLED");cursor=next;
 }
 if(documents.length!==snapshot.count||new Set(documents.map(doc=>doc.name)).size!==documents.length)fail("DOCUMENT_COUNT_DIFFERS");return {...snapshot,documents,bytes:byteCount};
}
async function authSnapshot(api,project,settings){
 database(project);const users=[];let pageToken;
 do{const query=new URLSearchParams({maxResults:String(Math.min(1000,settings.maxUsers-users.length+1)),...(pageToken?{nextPageToken:pageToken}:{})});const page=await api("https://identitytoolkit.googleapis.com/v1/projects/"+project+"/accounts:batchGet?"+query);if(!Array.isArray(page.users)&&page.users!==undefined)fail("AUTH_RESPONSE_INVALID");users.push(...(page.users||[]));if(users.length>settings.maxUsers)fail("AUTH_BUDGET_EXCEEDED");if(pageToken&&page.nextPageToken===pageToken)fail("AUTH_CURSOR_STALLED");pageToken=page.nextPageToken;}while(pageToken);
 if(new Set(users.map(user=>user.localId)).size!==users.length||users.some(user=>!user.localId||user.tenantId||user.passwordHash==="UkVEQUNURUQ="))fail("AUTH_RECORDS_INCOMPLETE");
 const config=await api("https://identitytoolkit.googleapis.com/admin/v2/projects/"+project+"/config");
 if(config.multiTenant?.allowTenants)fail("AUTH_TENANTS_REQUIRE_REVIEW");
 if(users.some(user=>user.passwordHash)&&!["algorithm","signerKey","saltSeparator","rounds","memoryCost"].every(key=>config.signIn?.hashConfig?.[key]!==undefined))fail("AUTH_HASH_CONFIG_REQUIRED");
 const providers={};for(const kind of ["defaultSupportedIdpConfigs","oauthIdpConfigs","inboundSamlConfigs"]){const result=await api("https://identitytoolkit.googleapis.com/admin/v2/projects/"+project+"/"+kind+"?pageSize=100");if(result.nextPageToken)fail("AUTH_PROVIDER_BUDGET_EXCEEDED");providers[kind]=result;}
 return {users,config,providers};
}
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0x82f63b78^(n>>>1):n>>>1;return n>>>0;});
function crc32c(buffer){let value=0xffffffff;for(const byte of buffer)value=crcTable[(value^byte)&255]^(value>>>8);const out=Buffer.alloc(4);out.writeUInt32BE((value^0xffffffff)>>>0);return out.toString("base64");}
function verifyObject(metadata,content){if(Number(metadata.size)!==content.length||metadata.md5Hash&&metadata.md5Hash!==require("node:crypto").createHash("md5").update(content).digest("base64")||metadata.crc32c&&metadata.crc32c!==crc32c(content))fail("STORAGE_OBJECT_DIFFERS");if(!metadata.md5Hash&&!metadata.crc32c)fail("STORAGE_CHECKSUM_REQUIRED");return hash(content);}
async function storageInventory(api,project,settings){
 const buckets=[];let totalBytes=0;
 for(const bucket of settings.buckets[project]){
  const objects=[];let pageToken;do{const query=new URLSearchParams({maxResults:"1000",...(pageToken?{pageToken}:{})});const page=await api("https://storage.googleapis.com/storage/v1/b/"+bucket+"/o?"+query);for(const metadata of page.items||[]){if(objects.length>=settings.maxObjects||!metadata.name||!/^\d+$/.test(metadata.generation||"")||Number(metadata.size)>settings.maxFileBytes)fail("STORAGE_BUDGET_EXCEEDED");totalBytes+=Number(metadata.size);if(!Number.isFinite(totalBytes)||totalBytes>settings.maxStorageBytes)fail("STORAGE_BUDGET_EXCEEDED");objects.push({metadata});}if(pageToken&&page.nextPageToken===pageToken)fail("STORAGE_CURSOR_STALLED");pageToken=page.nextPageToken;}while(pageToken);
  buckets.push({name:bucket,objects});
 }return {buckets,bytes:totalBytes};
}
async function storageSnapshot(api,project,settings){const inventory=await storageInventory(api,project,settings);for(const bucket of inventory.buckets)for(const object of bucket.objects){const meta=object.metadata,query=new URLSearchParams({alt:"media",generation:meta.generation,ifGenerationMatch:meta.generation});const content=await api("https://storage.googleapis.com/storage/v1/b/"+bucket.name+"/o/"+encodeURIComponent(meta.name)+"?"+query,undefined,true);object.sha256=verifyObject(meta,content);object.content=content.toString("base64");}return inventory;}
function normalizedValue(value,project,replacement=project){
 if(Array.isArray(value))return value.map(item=>normalizedValue(item,project,replacement));if(!value||typeof value!=="object")return Object.is(value,-0)?"-0":value;
 return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==="referenceValue"&&typeof item==="string"&&item.startsWith(database(project)+"/documents/")?"projects/"+replacement+"/databases/(default)/documents/"+docPath(project,item):normalizedValue(item,project,replacement)]));
}
function firestoreSignature(project,documents){return hash(canonical(documents.map(doc=>({path:docPath(project,doc.name),fields:normalizedValue(doc.fields||{},project)})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)));}
function authSignature(users){
 const keys=["localId","email","displayName","photoUrl","phoneNumber","passwordHash","salt","customAttributes"];
 const clean=users.map(user=>({...Object.fromEntries(keys.filter(key=>user[key]!==undefined&&user[key]!=="").map(key=>[key,user[key]])),emailVerified:!!user.emailVerified,disabled:!!user.disabled,providerUserInfo:(user.providerUserInfo||[]).map(provider=>Object.fromEntries(Object.entries(provider).filter(([,value])=>value!==""))).sort((a,b)=>canonical(a).localeCompare(canonical(b))),mfaInfo:user.mfaInfo||[]})).sort((a,b)=>a.localId.localeCompare(b.localId));return hash(canonical(clean));
}
module.exports={database,docPath,countDocuments,exportDocuments,authSnapshot,crc32c,verifyObject,storageInventory,storageSnapshot,normalizedValue,firestoreSignature,authSignature};
