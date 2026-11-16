"use strict";
// Runs only in a Docker container without a network, credentials or published ports.
const fs=require("node:fs"),cp=require("node:child_process"),crypto=require("node:crypto"),path=require("node:path");
const {fail,canonical,hash}=require("./a2-backup-core"),data=require("./a2-firebase-data");
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const local="demo-a2-restore",prefix="projects/"+local+"/databases/(default)/documents/";
function remap(value,from,to){if(Array.isArray(value))return value.map(item=>remap(item,from,to));if(!value||typeof value!=="object")return value;return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==="referenceValue"&&typeof item==="string"&&item.startsWith(from)?to+item.slice(from.length):remap(item,from,to)]));}
async function request(port,route,body,raw=false,headers={}){
 if(![8080,9099,9199].includes(port)||!route.startsWith("/")||route.startsWith("//"))fail("RESTORE_LOCAL_ENDPOINT_REQUIRED");const url=new URL(route,"http://127.0.0.1:"+port);if(url.hostname!=="127.0.0.1"||url.port!==String(port))fail("RESTORE_LOCAL_ENDPOINT_REQUIRED");
 const response=await fetch(url,{method:body===undefined?"GET":"POST",headers:{Authorization:"Bearer owner",...(body===undefined?{}:{"Content-Type":"application/json"}),...headers},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)fail("RESTORE_LOCAL_HTTP_"+response.status);return raw?Buffer.from(await response.arrayBuffer()):response.json();
}
async function main(){
 if(process.env.A2_OFFLINE_RESTORE!=="true"||process.env.GOOGLE_APPLICATION_CREDENTIALS||process.env.GITHUB_TOKEN)fail("RESTORE_ISOLATION_REQUIRED");
 const bundle=JSON.parse(fs.readFileSync(0,"utf8"));if(bundle.schema!==1||!["livepalmes","livepalmes-test"].includes(bundle.project))fail("RESTORE_BUNDLE_INVALID");
 fs.mkdirSync("/scratch/home",{recursive:true});fs.mkdirSync("/scratch/project",{recursive:true});
 fs.writeFileSync("/scratch/project/firestore.rules","rules_version = '2'; service cloud.firestore { match /databases/{db}/documents { match /{doc=**} { allow read, write: if false; } } }");
 fs.writeFileSync("/scratch/project/storage.rules","rules_version = '2'; service firebase.storage { match /b/{bucket}/o { match /{path=**} { allow read, write: if false; } } }");
 fs.writeFileSync("/scratch/project/firebase.json",JSON.stringify({firestore:{rules:"firestore.rules"},storage:{rules:"storage.rules"},emulators:{ui:{enabled:false},singleProjectMode:true,firestore:{host:"127.0.0.1",port:8080},auth:{host:"127.0.0.1",port:9099},storage:{host:"127.0.0.1",port:9199},hub:{host:"127.0.0.1",port:4400},logging:{host:"127.0.0.1",port:4500}}}));
 const emulator=cp.spawn(process.execPath,["/deps/firebase-tools/lib/bin/firebase.js","emulators:start","--only","firestore,auth,storage","--project",local,"--config","/scratch/project/firebase.json","--non-interactive"],{cwd:"/scratch/project",stdio:"ignore",env:{PATH:process.env.PATH,HOME:"/scratch/home",JAVA_HOME:process.env.JAVA_HOME,FIREBASE_EMULATORS_PATH:"/emulators",CI:"true",JAVA_TOOL_OPTIONS:"-Xmx768m"}});
 try{
  let ready=false;for(let attempt=0;attempt<120;attempt++){if(emulator.exitCode!==null)fail("RESTORE_EMULATOR_EXITED");try{await Promise.all([8080,9099,9199].map(port=>fetch("http://127.0.0.1:"+port+"/",{signal:AbortSignal.timeout(1000)})));ready=true;break;}catch{await pause(500);}}if(!ready)fail("RESTORE_EMULATOR_NOT_READY");
  const originalPrefix=data.database(bundle.project)+"/documents/";
  for(let offset=0;offset<bundle.firestore.documents.length;offset+=100){const writes=bundle.firestore.documents.slice(offset,offset+100).map(document=>({update:{name:prefix+data.docPath(bundle.project,document.name),fields:remap(document.fields||{},originalPrefix,prefix)}}));await request(8080,"/v1/projects/"+local+"/databases/(default)/documents:commit",{writes});}
  const documents=[];let cursor;
  for(let page=0;page<=Math.ceil(bundle.firestore.documents.length/100);page++){const response=await request(8080,"/v1/projects/"+local+"/databases/(default)/documents:runQuery",{structuredQuery:{from:[{allDescendants:true}],orderBy:[{field:{fieldPath:"__name__"},direction:"ASCENDING"}],limit:100,...(cursor?{startAt:{values:[{referenceValue:cursor}],before:false}}:{})}});const batch=response.filter(item=>item.document).map(item=>item.document);documents.push(...batch.map(doc=>({name:originalPrefix+doc.name.slice(prefix.length),fields:remap(doc.fields||{},prefix,originalPrefix)})));if(batch.length<100)break;const next=batch.at(-1).name;if(next===cursor)fail("RESTORE_CURSOR_STALLED");cursor=next;}
  if(documents.length!==bundle.firestore.documents.length||data.firestoreSignature(bundle.project,documents)!==data.firestoreSignature(bundle.project,bundle.firestore.documents))fail("RESTORED_FIRESTORE_DIFFERS");
  const authRoute="/identitytoolkit.googleapis.com/v1/projects/"+local+"/accounts:";
  for(let offset=0;offset<bundle.auth.users.length;offset+=1000){const result=await request(9099,authRoute+"batchCreate",{users:bundle.auth.users.slice(offset,offset+1000),...Object.fromEntries(Object.entries(bundle.auth.config.signIn?.hashConfig||{}).map(([key,value])=>[key==="algorithm"?"hashAlgorithm":key,value]))});if(result.error?.length)fail("AUTH_IMPORT_REJECTED");}
  const users=[];let nextPageToken;
  do{const result=await request(9099,authRoute+"batchGet?"+new URLSearchParams({maxResults:"1000",...(nextPageToken?{nextPageToken}:{})}));users.push(...(result.users||[]));if(users.length>bundle.auth.users.length)fail("RESTORED_AUTH_COUNT_DIFFERS");if(nextPageToken&&nextPageToken===result.nextPageToken)fail("RESTORE_CURSOR_STALLED");nextPageToken=result.nextPageToken;}while(nextPageToken);
  if(users.length!==bundle.auth.users.length||data.authSignature(users)!==data.authSignature(bundle.auth.users))fail("RESTORED_AUTH_DIFFERS");
  let fileCount=0,fileBytes=0;
  for(const bucket of bundle.storage.buckets){const target="a2-restore-"+hash(bucket.name).slice(0,20);for(const object of bucket.objects){const content=Buffer.from(object.content,"base64");if(hash(content)!==object.sha256)fail("STORAGE_ARCHIVE_DIFFERS");const meta=object.metadata;const names=["contentType","cacheControl","contentDisposition","contentEncoding","metadata"];
    const metadata={name:meta.name,...Object.fromEntries(names.filter(key=>meta[key]!==undefined).map(key=>[key,meta[key]]))},boundary="a2_"+crypto.randomBytes(16).toString("hex");const body=Buffer.concat([Buffer.from("--"+boundary+"\r\nContent-Type: application/json\r\n\r\n"+JSON.stringify(metadata)+"\r\n--"+boundary+"\r\nContent-Type: application/octet-stream\r\n\r\n"),content,Buffer.from("\r\n--"+boundary+"--\r\n")]);
    const restored=await request(9199,"/upload/storage/v1/b/"+target+"/o?uploadType=multipart&name="+encodeURIComponent(meta.name),body,false,{"Content-Type":"multipart/related; boundary="+boundary});
    for(const key of names.filter(key=>meta[key]!==undefined)){if(key==="metadata"){for(const [entry,value]of Object.entries(meta.metadata))if(restored.metadata?.[entry]!==value)fail("RESTORED_FILE_METADATA_DIFFERS");}else if(restored[key]!==meta[key])fail("RESTORED_FILE_METADATA_DIFFERS");}
    const bytes=await request(9199,"/storage/v1/b/"+target+"/o/"+encodeURIComponent(meta.name)+"?alt=media",undefined,true);if(hash(bytes)!==object.sha256)fail("RESTORED_FILE_BYTES_DIFFER");fileCount++;fileBytes+=bytes.length;
  }}
  console.log(JSON.stringify({schema:1,project:bundle.project,documents:documents.length,users:users.length,files:fileCount,fileBytes,firestoreSha256:data.firestoreSignature(bundle.project,documents),authSha256:data.authSignature(users),restoredAndCompared:true,network:"none",externalSignInTested:false}));
 }finally{emulator.kill("SIGTERM");}
}
main().then(()=>process.exit(0)).catch(error=>{console.log(JSON.stringify({error:error.safeCode||"ISOLATED_RESTORE_FAILED"}));process.exit(1);});
