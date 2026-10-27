"use strict";
// Explicit, bounded migration. Only PROD reports are official source records.
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const cryptoBackup=require("./production-backup-crypto");
function sealedBackup(file,data,key){const bytes=Buffer.from(JSON.stringify(data));const encrypted=cryptoBackup.seal(bytes,key);fs.writeFileSync(file,encrypted,{mode:0o600});if(!cryptoBackup.open(fs.readFileSync(file),key).equals(bytes))throw Error("Sauvegarde chiffrée non vérifiée");}
const root=path.resolve(__dirname,".."),{store,ddl,tables,hash,query}=require("../functions/nap-license-reports");
const {inspect,validate,source,migrate,columns}=require("../functions/nap-license-report-migration");
function officialDatabase(credentials,load=require("node:module").createRequire(path.join(root,"functions/package.json"))) {
 const {initializeApp,cert}=load("firebase-admin/app"),{getFirestore}=load("firebase-admin/firestore");
 return getFirestore(initializeApp({credential:cert(credentials),projectId:"livepalmes"}));
}
async function main(services={officialDatabase}){
 const phase=process.env.NAP_LICENSE_PHASE;
 if(!["export","prepare","apply"].includes(phase)||process.env.NAP_LICENSE_CONFIRMATION!=="nap-license-reports-history")throw Error("Confirmation requise");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
 if(phase==="export"){
  if(credentials.project_id!=="livepalmes")throw Error("Source PROD requise");
  const reports=await source(services.officialDatabase(credentials));fs.mkdirSync("outputs/nap-license-reports",{recursive:true});
  const exported={sourceProject:"livepalmes",reports,hash:hash(reports)};fs.writeFileSync("outputs/nap-license-reports/source.json",JSON.stringify(exported));sealedBackup("outputs/nap-license-reports/source.enc",exported,credentials.private_key);return;
 }
 if(credentials.project_id!=="livepalmes-test")throw Error("Compte TEST requis pour NAP");
 const exported=JSON.parse(fs.readFileSync("outputs/nap-license-reports/source.json","utf8"));
 if(exported.sourceProject!=="livepalmes"||hash(exported.reports)!==exported.hash)throw Error("Sauvegarde source invalide");
 const options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
 const uri=execFileSync("gcloud",["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"],options).trim();
 const url=new URL(uri);if(url.protocol!=="https:"||!url.hostname.endsWith(".run.app")||url.username||url.password||url.search)throw Error("Endpoint privé incorrect");
 const token=execFileSync("gcloud",["auth","print-identity-token",`--audiences=${uri}`],options).trim();
 const input={phase,confirmation:"nap-license-reports-history",reports:exported.reports,...(phase==="apply"?{backup:JSON.parse(fs.readFileSync("outputs/nap-license-reports/before.json","utf8"))}:{})};
 if(Buffer.byteLength(JSON.stringify(input))>8000000)throw Error("Reprise à découper explicitement");
 url.searchParams.set("action","approved-license-reports");
 const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(170000)});
 if(!response.ok)throw Error("Maintenance privée refusée, HTTP "+response.status);
 const result=await response.json();
 if(phase==="apply"&&result.verified!==true)throw Error("Reprise non vérifiée");
 fs.writeFileSync(`outputs/nap-license-reports/${phase==="prepare"?"before":"result"}.json`,JSON.stringify(result));
 if(phase==="prepare")sealedBackup("outputs/nap-license-reports/before.enc",result,credentials.private_key);
}
if(require.main===module)main().catch(error=>{console.error("Diagnostic technique :",error.name,/^[A-Z_0-9-]{1,60}$/.test(String(error.code))?error.code:"operation-refused");console.error("Reprise des bilans arrêtée ; conserver les preuves et examiner le conflit. Aucun secret affiché.");process.exitCode=1;});
module.exports={inspect,validate,source,migrate,columns,officialDatabase,main};
