"use strict";
// Explicit two-function TEST deployment. No business calls, mail sends or setting changes.
const fs=require("node:fs"),path=require("node:path"),{createRequire}=require("node:module");
const NAMES=Object.freeze(["submitEngagementAccessRequest","resolveEngagementAccessRequest"]);
const SECRETS=Object.freeze(["LIVEPALMES_NAP_PASSWORD","LIVEPALMES_SMTP_HOST","LIVEPALMES_SMTP_PORT","LIVEPALMES_SMTP_USER","LIVEPALMES_SMTP_PASS","LIVEPALMES_SMTP_SECURE","LIVEPALMES_MAIL_FROM"]);
function verifyRuntime(value,candidate){
 const service=value.serviceConfig||{},secrets=service.secretEnvironmentVariables||[];
 if(value.state!=="ACTIVE"||value.labels?.["livepalmes-commit"]!==candidate||secrets.length!==SECRETS.length||new Set(secrets.map(item=>item.key)).size!==SECRETS.length||secrets.some(item=>!SECRETS.includes(item.key)||item.secret!==item.key||!["livepalmes-test","206080168534"].includes(String(item.projectId))||!(/^(latest|[1-9][0-9]*)$/).test(String(item.version))))throw Error("Runtime ou secrets TEST non confirmes.");
}
function guard(env){
 for(const key of ["TARGET_FIREBASE_PROJECT","GCLOUD_PROJECT","GOOGLE_CLOUD_PROJECT"])if(env[key]!=="livepalmes-test")throw Error("Cible TEST obligatoire.");
 if(env.ACCESS_REQUESTS_ONLY!=="true"||env.NOTIFICATION_FINAL_CHECK!=="false"||env.NAP_NOTIFICATION_SCHEDULER_ONLY!=="false"||env.GITHUB_REF!=="refs/heads/main"||!/^[a-f0-9]{40}$/.test(env.CANDIDATE_SHA||""))throw Error("Perimetre demandes TEST non confirme.");
}
function narrow(source){
 if(!source.includes('environment.projectId !== "livepalmes-test"')||!source.includes('environment.name !== "test"'))throw Error("Protection TEST absente.");
 const pattern=/const names = \[[\s\S]*?\];/g;if((source.match(pattern)||[]).length!==1)throw Error("Selection inattendue.");
 return source.replace(pattern,"const names = "+JSON.stringify(NAMES)+";");
}
async function verifyDisabled(db){if((await require("../functions/engagement-mail-control").read(db)).enabled)throw Error("Mails TEST actifs : arret sans modification.");}
async function main(){
 guard(process.env);const [mode,selector]=process.argv.slice(2);if(!["prepare","verify"].includes(mode))throw Error("Mode interdit.");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));if(credentials.project_id!=="livepalmes-test")throw Error("Compte TEST requis.");
 const localRequire=createRequire(path.resolve("functions/package.json"));localRequire("firebase-admin/app").initializeApp({projectId:"livepalmes-test"});
 await verifyDisabled(localRequire("firebase-admin/firestore").getFirestore());
 if(mode==="prepare"){
  if(!selector)throw Error("Sortie requise.");const file=".firebase-test-functions/functions/index.js";
  fs.writeFileSync(file,narrow(fs.readFileSync(file,"utf8")));fs.writeFileSync(selector,NAMES.join(",")+"\n");
 }else for(const name of NAMES){
  const value=JSON.parse(require("node:child_process").execFileSync("gcloud",["functions","describe",name,"--gen2","--region=europe-west1","--project=livepalmes-test","--format=json"],{encoding:"utf8"}));
  verifyRuntime(value,process.env.CANDIDATE_SHA);
 }
 console.log("Deux fonctions de demandes uniquement ; mails TEST desactives, aucune donnee modifiee.");
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={NAMES,SECRETS,guard,narrow,verifyDisabled,verifyRuntime};
