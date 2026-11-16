"use strict";
// Read-only prerequisite check, never a backup receipt or a SQL lock.
const fs=require("node:fs"),path=require("node:path");
const core=require("./a2-backup-core"),settings=require("./nap-backup-config.json");
const {publicUrl}=require("../functions/nap-calendar-values");
function inventory(rows){
 if(rows.length>4000)core.fail("LEGACY_REFERENCE_BUDGET_EXCEEDED");
 const unique=new Map();let firebase=0,empty=0,other=0;
 for(const row of rows){const url=publicUrl(row.location);if(!url){empty++;continue;}const value=new URL(url);if(value.hostname==="nap.ffessm.fr"&&!value.port){if(!unique.has(url))unique.set(url,{url,references:[]});unique.get(url).references.push(String(row.id));}else if(value.hostname==="firebasestorage.googleapis.com")firebase++;else other++;}
 return {references:rows.length,firebase,empty,other,files:[...unique.values()]};
}
async function header(url,request=fetch){
 for(let redirects=0;redirects<4;redirects++){
  const source=new URL(url);if(source.protocol!=="https:"||source.hostname!=="nap.ffessm.fr"||source.port||source.username||source.password)core.fail("LEGACY_URL_REFUSED");
  const response=await request(source.href,{method:"HEAD",redirect:"manual",headers:{"Accept-Encoding":"identity"},signal:AbortSignal.timeout(15000)});
  if([301,302,303,307,308].includes(response.status)){if(!response.headers.get("location"))core.fail("LEGACY_REDIRECT_INVALID");url=new URL(response.headers.get("location"),source).href;continue;}
  const size=response.headers.get("content-length");return {status:response.status,contentType:response.headers.get("content-type")||null,bytes:size!==null&&/^\d+$/.test(size)?Number(size):null};
 }core.fail("LEGACY_REDIRECT_LIMIT");
}
async function main(env=process.env){
 if(env.GITHUB_REF!=="refs/heads/main"||env.GITHUB_REPOSITORY!=="ffessmnap/LivePalmes"||env.GITHUB_EVENT_NAME!=="workflow_dispatch")core.fail("LEGACY_CHECK_MAIN_MANUAL_REQUIRED");
 const account=JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS,"utf8")),token=await core.tokenFromAccount(account,settings.serviceAccount);
 const response=await fetch("https://secretmanager.googleapis.com/v1/projects/"+settings.secretProject+"/secrets/"+settings.secretName+"/versions/latest:access",{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(30000)});
 const secret=JSON.parse((await core.bytes(response,65536)).toString("utf8")),password=Buffer.from(secret.payload.data,"base64").toString("utf8");
 const mysql=require("../functions/node_modules/mysql2/promise"),{napPoolOptions}=require("../functions/nap-connection"),{connectionLimit,waitForConnections,queueLimit,...options}=napPoolOptions(password);
 const connection=await mysql.createConnection(options);let rows;try{[rows]=await connection.query({sql:"SELECT id,LEFT(location,4096) AS location FROM documents ORDER BY id LIMIT 4001",timeout:5000});}finally{await connection.end();}
 const source=inventory(rows),indexes=[...new Set([0,...[1,2,3,4].map(n=>Math.floor(source.files.length*n/5)),source.files.length-1])].filter(n=>n>=0),samples=[];
 for(const index of indexes){if(samples.length)await new Promise(resolve=>setTimeout(resolve,1000));try{samples.push({sample:index,...await header(source.files[index].url)});}catch(e){samples.push({sample:index,error:e.safeCode||"LEGACY_HEAD_UNREACHABLE"});}}
 const report={schema:1,mode:"check",at:new Date().toISOString(),references:source.references,uniqueNapUrls:source.files.length,firebaseReferences:source.firebase,empty:source.empty,other:source.other,requests:samples.length,samples,fileContentDownloaded:false,backupStarted:false};
 const folder=path.resolve("outputs/a2-legacy-check");fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,"report.json"),JSON.stringify(report,null,2)+"\n",{flag:"wx",mode:0o600});console.log(JSON.stringify(report,null,2));
}
module.exports={inventory,header,main};
if(require.main===module)main().catch(e=>{console.error("Controle des archives NAP arrete : "+(e.safeCode||"LEGACY_CHECK_FAILED")+". Aucune donnee source modifiee.");process.exitCode=1;});