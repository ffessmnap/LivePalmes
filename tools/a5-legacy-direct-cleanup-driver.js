"use strict";
// Protected A5 lifecycle. Only the final full A2 read may confirm completion.
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const cleanup=require("./a5-legacy-direct-cleanup"),core=require("./a2-backup-core"),data=require("./a2-firebase-data");
const ROOT=path.resolve(__dirname,".."),WF="ffessmnap/LivePalmes/.github/workflows/a5-legacy-direct-cleanup.yml@refs/heads/main";
const requireThat=(v,c)=>{if(!v)core.fail(c);};
function read(file){const stat=fs.lstatSync(file);requireThat(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<2*1024*1024,"A5_GATE_FILE");return JSON.parse(fs.readFileSync(file,"utf8"));}
function context(mode,project,directory,env=process.env){
 requireThat(["backup","apply","verify"].includes(mode)&&Object.hasOwn(cleanup.BUCKETS,project),"A5_MODE_PROJECT");
 requireThat(env.GITHUB_REPOSITORY==="ffessmnap/LivePalmes"&&env.GITHUB_REF==="refs/heads/main"&&env.GITHUB_WORKFLOW_REF===WF&&env.GITHUB_EVENT_NAME==="workflow_dispatch"&&env.GITHUB_RUN_ATTEMPT==="1"&&/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||"")&&env.GITHUB_SHA===env.EXPECTED_COMMIT&&env.VERIFIED_MAIN_CI==="true","A5_MAIN_WORKFLOW");
 requireThat(execFileSync("git",["rev-parse","HEAD"],{cwd:ROOT,encoding:"utf8"}).trim()===env.GITHUB_SHA&&!execFileSync("git",["status","--porcelain","--untracked-files=no"],{cwd:ROOT,encoding:"utf8"}).trim(),"A5_CHECKOUT_CHANGED");
 const gate=read(path.join(directory,"closure-proof.json"));
 requireThat(gate.schema===1&&gate.project===project&&gate.toolingCommit===env.GITHUB_SHA&&gate.scopeSha256===cleanup.scopeDigest(project)&&gate.authenticated===true&&gate.retiredHttpChecked===true&&/^[1-9][0-9]*$/.test(String(gate.closureRun))&&/^[a-f0-9]{64}$/.test(gate.rulesAfterSha256)&&Array.isArray(gate.functions)&&gate.functions.length===5,"A5_CLOSURE_REQUIRED");
 return gate;
}
function readBuckets(project,mode){return project==="livepalmes"&&mode==="apply"?[cleanup.BUCKETS[project][0]]:[...cleanup.BUCKETS[project]];}
function client(token,project,buckets,request=fetch){
 let calls=0;
 return async(url,body,media=false)=>{
  requireThat(++calls<=200&&typeof url==="string","A5_READ_BUDGET");const u=new URL(url);requireThat(u.protocol==="https:"&&!u.username&&!u.password,"A5_READ_URL");
  let allowed=false,missing=false;
  if(u.hostname==="firestore.googleapis.com"){
   const base="/v1/"+data.database(project)+"/documents/competitions/",tail=u.pathname.slice(base.length);
   if(u.pathname.startsWith(base)&&cleanup.IDS.includes(tail)&&body===undefined&&!u.search){allowed=true;missing=true;}
   if(body!==undefined&&cleanup.IDS.some(id=>u.pathname===base+id+":runQuery"||u.pathname===base+id+":runAggregationQuery")&&!u.search){
    const q=body.structuredQuery||body.structuredAggregationQuery?.structuredQuery;
    allowed=JSON.stringify(q?.from)===JSON.stringify([{allDescendants:true}])&&(body.structuredQuery?Number(q.limit)<=cleanup.LIMITS.pageSize&&Number(q.limit)>0:body.structuredAggregationQuery?.aggregations?.[0]?.count?.upTo===String(cleanup.LIMITS.maxDocuments+1));
   }
  }else if(u.hostname==="storage.googleapis.com"&&body===undefined){
   const match=u.pathname.match(/^\/storage\/v1\/b\/([^/]+)\/o(?:\/(.+))?$/),bucket=match&&decodeURIComponent(match[1]);
   if(match&&buckets.includes(bucket)){
    if(!match[2])allowed=cleanup.IDS.some(id=>u.searchParams.get("prefix")==="competition-pdfs/"+id+"/")&&u.searchParams.get("versions")==="true"&&u.searchParams.get("maxResults")===String(cleanup.LIMITS.maxObjects+1);
    else{const name=decodeURIComponent(match[2]),generation=u.searchParams.get("generation");allowed=media&&cleanup.IDS.some(id=>name.startsWith("competition-pdfs/"+id+"/"))&&name.endsWith(".pdf")&&u.searchParams.get("alt")==="media"&&/^[1-9][0-9]*$/.test(generation||"")&&generation===u.searchParams.get("ifGenerationMatch");}
   }
  }else if(u.hostname==="firebaserules.googleapis.com"&&body===undefined&&!media&&!u.search){allowed=new RegExp("^/v1/projects/(?:"+project+"|"+(project==="livepalmes"?"718081132564":"206080168534")+")/(?:releases/cloud[.]firestore|rulesets/[A-Za-z0-9_-]+)$").test(u.pathname);}
  else if(u.hostname==="cloudfunctions.googleapis.com"&&body===undefined&&!media&&!u.search){allowed=new RegExp("^/v2/projects/"+project+"/locations/europe-west1/functions/(?:deleteCompetitionPdf|setRolePins|storeCompetitionPdf|syncOfficialResultToPublicIndex|verifyPin)$").test(u.pathname);}
  requireThat(allowed,"A5_READ_SCOPE");const response=await request(u.href,{method:body===undefined?"GET":"POST",headers:{Authorization:"Bearer "+token,...(body===undefined?{}:{"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:"error",signal:AbortSignal.timeout(60000)});
  if(missing&&response.status===404){await response.body?.cancel();return {missing:true};}
  const bytes=await core.bytes(response,media?cleanup.LIMITS.maxFileBytes:cleanup.LIMITS.maxFirestoreBytes);return media?bytes:JSON.parse(bytes.toString("utf8"));
 };
}
async function currentRules(api,project,expected){
 const release=await api("https://firebaserules.googleapis.com/v1/projects/"+project+"/releases/cloud.firestore"),name=release.rulesetName;
 requireThat(new RegExp("^projects/(?:"+project+"|"+(project==="livepalmes"?"718081132564":"206080168534")+")/rulesets/[A-Za-z0-9_-]+$").test(name||""),"A5_RULE_IDENTITY");
 const files=(await api("https://firebaserules.googleapis.com/v1/"+name)).source?.files;
 requireThat(Array.isArray(files)&&files.length===1&&files[0].name==="firestore.rules"&&typeof files[0].content==="string"&&core.hash(Buffer.from(files[0].content.replace(/\r\n/g,"\n")))===expected,"A5_RULE_REOPENED");
}
async function currentFunctions(api,gate){
 for(const f of gate.functions){
  const expected="projects/"+gate.project+"/locations/europe-west1/functions/"+f.name.split("/").at(-1);requireThat(expected===f.name,"A5_FUNCTION_PROJECT");
  const current=await api("https://cloudfunctions.googleapis.com/v2/"+expected);
  requireThat(current.name===f.name&&current.state==="ACTIVE"&&f.state==="ACTIVE"&&current.updateTime===f.updateTime&&current.serviceConfig?.revision===f.revision&&current.labels?.["livepalmes-commit"]===f.commit,"A5_SOURCE_DRIFT");
 }
}
function deletionUrls(snapshot){
 const urls=new Set();for(const d of snapshot.documents){cleanup.documentIdentity(snapshot.project,d);urls.add("https://firestore.googleapis.com/v1/"+d.name.split("/").map(encodeURIComponent).join("/")+"?"+new URLSearchParams({"currentDocument.updateTime":d.updateTime}));}
 for(const o of snapshot.objects){cleanup.objectIdentity(snapshot.project,o);urls.add("https://storage.googleapis.com/storage/v1/b/"+o.bucket+"/o/"+encodeURIComponent(o.metadata.name)+"?"+new URLSearchParams({generation:String(o.metadata.generation),ifGenerationMatch:String(o.metadata.generation)}));}return urls;
}
function finalReport(snapshot,gate,report,env){
 const project=snapshot.project;
 requireThat(Array.isArray(snapshot.readBuckets)&&core.canonical([...snapshot.readBuckets].sort())===core.canonical([...cleanup.BUCKETS[project]].sort()),"A5_FULL_FINAL_COVERAGE");
 const after=cleanup.validateSnapshot(snapshot);
 requireThat(after.documentHashes.length===0&&after.objectHashes.length===0&&after.protectedHash===report.protectedHash,"A5_FULL_FINAL_STATE");
 requireThat(env.A5_APPLY_RESULT==="writable-targets-removed"&&env.A5_BACKUP_SHA===report.encryptedSha256,"A5_APPLY_JOB_REQUIRED");
 requireThat([env.A5_DELETED_DOCUMENTS,env.A5_DELETED_OBJECTS,env.A5_ALREADY_ABSENT].every(v=>typeof v==="string"&&/^(0|[1-9][0-9]*)$/.test(v)),"A5_FINAL_COUNT_FORMAT");
 const deletedDocuments=Number(env.A5_DELETED_DOCUMENTS),deletedObjects=Number(env.A5_DELETED_OBJECTS),alreadyAbsent=Number(env.A5_ALREADY_ABSENT);
 requireThat([deletedDocuments,deletedObjects,alreadyAbsent].every(n=>Number.isSafeInteger(n)&&n>=0)&&deletedDocuments<=report.documentCount&&deletedObjects<=report.objectVersionCount&&deletedDocuments+deletedObjects+alreadyAbsent===report.documentCount+report.objectVersionCount,"A5_FINAL_COUNTS");
 return {schema:1,phase:"full-verification",project,closureRun:gate.closureRun,scopeSha256:cleanup.scopeDigest(project),backupEncryptedSha256:report.encryptedSha256,deletedDocuments,deletedObjectVersions:deletedObjects,alreadyAbsent,allOldTargetsAbsent:true,protectedRecordsUnchanged:true,allStoragePrefixesRead:true,napWrites:0,result:"success"};
}
async function main(mode,project,directory,env=process.env){
 const gate=context(mode,project,directory,env),credential=read(env.GOOGLE_APPLICATION_CREDENTIALS),buckets=readBuckets(project,mode);let token;
 if(mode==="apply"){
  const account=project==="livepalmes"?"github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com":"github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com";
  requireThat(credential.type==="service_account"&&credential.project_id===project&&credential.client_email===account,"A5_CLEANUP_EXISTING_IDENTITY");
  token=execFileSync("gcloud",["auth","print-access-token"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 }else token=await core.tokenFromAccount(credential,read(path.join(ROOT,"tools/a2-backup-config.json")).serviceAccount);
 requireThat(token&&!token.includes("\n"),"A5_CLEANUP_TOKEN");const api=client(token,project,buckets),output=path.join(directory,"result.json");
 if(mode!=="apply")await currentRules(api,project,gate.rulesAfterSha256);else await currentFunctions(api,gate);
 if(mode==="backup"){
  const snapshot=await cleanup.collect(project,api,{contents:true}),key=core.keyFromEnvironment(env);let packed;
  try{packed=cleanup.backup(snapshot,key);}finally{key.fill(0);}
  fs.writeFileSync(path.join(directory,"backup.enc"),packed.encrypted,{flag:"wx",mode:0o600});fs.writeFileSync(path.join(directory,"backup-report.json"),JSON.stringify(packed.report,null,2)+"\n",{flag:"wx",mode:0o600});
  fs.writeFileSync(output,JSON.stringify({schema:1,phase:"backup",project,recoveryVerified:true,encryptedSha256:packed.report.encryptedSha256,documentCount:packed.report.documentCount,objectVersionCount:packed.report.objectVersionCount,result:"success"},null,2)+"\n");return;
 }
 const report=read(path.join(directory,"backup-report.json"));requireThat(gate.backupEncryptedSha256===report.encryptedSha256&&report.project===project&&report.scopeSha256===cleanup.scopeDigest(project)&&report.recoveryVerified===true&&core.hash(fs.readFileSync(path.join(directory,"backup.enc")))===report.encryptedSha256,"A5_BACKUP_BYTES");
 if(mode==="verify"){
  const result=finalReport(await cleanup.collect(project,api),gate,report,env);fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n");return;
 }
 requireThat(report.fullReadScope===true&&Object.keys(report.storageCountsByBucket||{}).sort().join("|")===[...cleanup.BUCKETS[project]].sort().join("|"),"A5_FULL_BACKUP_REQUIRED");
 for(const bucket of cleanup.BUCKETS[project].filter(b=>!buckets.includes(b)))requireThat(report.storageCountsByBucket[bucket]===0,"A5_UNWRITABLE_BUCKET_HAS_TARGETS");
 const snapshot=await cleanup.collect(project,api,{buckets}),allowed=deletionUrls(snapshot);let removed=0;
 const remove=async url=>{
  requireThat(allowed.has(url)&&++removed<=cleanup.LIMITS.maxDocuments*2+2+cleanup.LIMITS.maxObjects,"A5_DELETE_SCOPE");allowed.delete(url);
  const response=await fetch(url,{method:"DELETE",headers:{Authorization:"Bearer "+token},redirect:"error",signal:AbortSignal.timeout(60000)});await response.body?.cancel();return {status:response.status};
 };
 const result=await cleanup.apply(snapshot,report,{remove,refresh:()=>cleanup.collect(project,api,{buckets}),saveProgress:progress=>fs.writeFileSync(output,JSON.stringify({...progress,phase:"writable-targets-only",fullCleanupConfirmed:false},null,2)+"\n")});
 result.result="writable-targets-removed";result.fullCleanupConfirmed=false;result.readBuckets=buckets;fs.writeFileSync(output,JSON.stringify(result,null,2)+"\n");
 if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,"result="+result.result+"\nbackup_sha="+report.encryptedSha256+"\ndeleted_documents="+result.acknowledgedDocuments+"\ndeleted_objects="+result.acknowledgedObjectVersions+"\nalready_absent="+result.alreadyAbsent+"\n");
}
module.exports={context,readBuckets,client,currentRules,currentFunctions,deletionUrls,finalReport,main};
if(require.main===module)main(...process.argv.slice(2)).catch(error=>{console.error(error.safeCode||"A5_CLEANUP_FAILED");process.exitCode=1;});
