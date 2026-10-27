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
function runtimeCheck(load=require("node:module").createRequire(path.join(root,"functions/package.json"))) {
 const app=load("firebase-admin/app"),firestore=load("firebase-admin/firestore");
 if(typeof app.initializeApp!=="function"||typeof app.cert!=="function"||typeof firestore.getFirestore!=="function"||typeof globalThis.fetch!=="function"||typeof AbortSignal.timeout!=="function")throw Error("Runtime du migrateur incompatible");
 return true;
}
function failure(code,message){return Object.assign(new Error(message),{code});}
function failureDiagnostic(error,phase){
 const phases={export:"Lecture des bilans PROD échouée. Cette étape ne modifie aucune donnée.",prepare:"Préparation NAP échouée avant toute demande d’écriture métier.",apply:"Application NAP interrompue : des écritures peuvent avoir eu lieu. Examiner les preuves avant toute reprise."};
 const codes={CONFIRMATION:"Confirmation ou phase manquante.",SOURCE_PROJECT:"Compte de source PROD incorrect.",TARGET_PROJECT:"Compte TEST requis pour la destination NAP.",SOURCE_BACKUP:"Sauvegarde source absente, altérée ou incompatible.",ENDPOINT:"Endpoint privé non conforme.",PAYLOAD:"Lot trop volumineux : découpage explicite nécessaire.",HTTP_REFUSED:"Maintenance privée refusée : vérifier accès et version du service.",RESULT:"Résultat de maintenance incomplet ou non vérifié.",ENOENT:"Un fichier requis est absent.",MODULE_NOT_FOUND:"Une dépendance est absente du runtime.",ERR_PACKAGE_PATH_NOT_EXPORTED:"Chargement du SDK incompatible.",ETIMEDOUT:"Délai réseau dépassé.",ABORT_ERR:"Requête interrompue ; son résultat distant doit être vérifié."};
 const code=Object.hasOwn(codes,String(error?.code))?String(error.code):"UNCLASSIFIED";
 return {phase:Object.hasOwn(phases,phase)?phase:"configuration",code,message:(phases[phase]||"Préparation locale interrompue.")+" "+(codes[code]||"Erreur technique non classée ; conserver les preuves pour diagnostic sans exposer de données ni de secrets.")};
}
async function main(services={officialDatabase}){
 const phase=process.env.NAP_LICENSE_PHASE;
 if(!["export","prepare","apply"].includes(phase)||process.env.NAP_LICENSE_CONFIRMATION!=="nap-license-reports-history")throw failure("CONFIRMATION","Confirmation requise");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
 if(phase==="export"){
  if(credentials.project_id!=="livepalmes")throw failure("SOURCE_PROJECT","Source PROD requise");
  const reports=await source(services.officialDatabase(credentials));fs.mkdirSync("outputs/nap-license-reports",{recursive:true});
  const exported={sourceProject:"livepalmes",reports,hash:hash(reports)};fs.writeFileSync("outputs/nap-license-reports/source.json",JSON.stringify(exported));sealedBackup("outputs/nap-license-reports/source.enc",exported,credentials.private_key);return;
 }
 if(credentials.project_id!=="livepalmes-test")throw failure("TARGET_PROJECT","Compte TEST requis pour NAP");
 const exported=JSON.parse(fs.readFileSync("outputs/nap-license-reports/source.json","utf8"));
 if(exported.sourceProject!=="livepalmes"||hash(exported.reports)!==exported.hash)throw failure("SOURCE_BACKUP","Sauvegarde source invalide");
 const execute=services.execFileSync||execFileSync,request=services.fetch||globalThis.fetch;
 const options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
 const uri=execute("gcloud",["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"],options).trim();
 const url=new URL(uri);if(url.protocol!=="https:"||!url.hostname.endsWith(".run.app")||url.username||url.password||url.search)throw failure("ENDPOINT","Endpoint privé incorrect");
 const token=execute("gcloud",["auth","print-identity-token",`--audiences=${uri}`],options).trim();
 const input={phase,confirmation:"nap-license-reports-history",reports:exported.reports,...(phase==="apply"?{backup:JSON.parse(fs.readFileSync("outputs/nap-license-reports/before.json","utf8"))}:{})};
 if(Buffer.byteLength(JSON.stringify(input))>8000000)throw failure("PAYLOAD","Reprise à découper explicitement");
 url.searchParams.set("action","approved-license-reports");
 const response=await request(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.timeout(170000)});
 if(!response.ok)throw failure("HTTP_REFUSED","Maintenance privée refusée");
 const result=await response.json();
 if(phase==="prepare"&&(result.sourceProject!=="livepalmes"||result.sourceHash!==exported.hash||!Array.isArray(result.reports)||hash(result.reports)!==exported.hash))throw failure("RESULT","Préparation non vérifiée");
 if(phase==="apply"&&result.verified!==true)throw failure("RESULT","Reprise non vérifiée");
 fs.writeFileSync(`outputs/nap-license-reports/${phase==="prepare"?"before":"result"}.json`,JSON.stringify(result));
 if(phase==="prepare")sealedBackup("outputs/nap-license-reports/before.enc",result,credentials.private_key);
}
if(require.main===module){
 const run=process.argv[2]==="--check"?Promise.resolve().then(()=>runtimeCheck()):main();
 run.then(()=>{if(process.argv[2]==="--check")console.log("Runtime Firebase et interfaces du migrateur vérifiés hors réseau, sans credentials.");}).catch(error=>{
  const diagnostic=failureDiagnostic(error,process.env.NAP_LICENSE_PHASE);
  console.error(`Diagnostic ${diagnostic.phase} / ${diagnostic.code} : ${diagnostic.message}`);
  if(process.env.GITHUB_ACTIONS==="true")console.error(`::error title=Reprise des bilans — ${diagnostic.phase}::${diagnostic.message}`);
  process.exitCode=1;
 });
}
module.exports={inspect,validate,source,migrate,columns,officialDatabase,main,runtimeCheck,failureDiagnostic};
