"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {createRequire}=require("node:module");
const {execFileSync}=require("node:child_process");
const {OBJECT_PATH,MAX_BYTES,validateSnapshot}=require("../functions/nap-home-events");
const {BUCKET,gatherPages,publishSnapshot}=require("../functions/nap-home-events-refresh");
const publicationError=code=>Object.assign(new Error("Publication TEST interrompue."),{code});
function loadStorageSdk(){
 const backendRequire=createRequire(path.resolve(__dirname,"../functions/package.json"));
 return {...backendRequire("firebase-admin/app"),...backendRequire("firebase-admin/storage")};
}
async function prepare(output){
 const options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
 const uri=execFileSync("gcloud",["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"],options).trim();
 const service=new URL(uri);if(service.protocol!=="https:"||!service.hostname.endsWith(".run.app")||service.search||service.username||service.password)throw Error("Service TEST invalide.");
 const token=execFileSync("gcloud",["auth","print-identity-token",`--audiences=${uri}`],options).trim();
 const result=await gatherPages(async input=>{
  const url=new URL(uri);url.searchParams.set("action","home-events-page");for(const [key,value]of Object.entries(input))url.searchParams.set(key,String(value));
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(170000)});
  if(!response.ok)throw Error("Préparation privée TEST indisponible.");return response.json();
 });
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result.snapshot)+"\n");
 console.log(JSON.stringify({prepared:true,events:result.snapshot.events.length,sqlPages:result.calls,remoteWrites:false}));
}
async function publish(output){
 if(process.env.LIVEPALMES_HOME_DATA_CONFIRMATION!=="publish-livepalmes-test-home-events"||process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test")throw publicationError("HOME_TEST_CONFIRMATION_REQUIRED");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));if(credentials.project_id!=="livepalmes-test")throw publicationError("HOME_TEST_ACCOUNT_REQUIRED");
 const inputBytes=fs.readFileSync(output);if(inputBytes.length>MAX_BYTES)throw Error("Fichier trop volumineux.");
 const {initializeApp,applicationDefault,getStorage}=loadStorageSdk();
 const app=initializeApp({credential:applicationDefault(),projectId:"livepalmes-test"},"test-home-events");
 const file=getStorage(app).bucket(BUCKET).file(OBJECT_PATH);
 const result=await publishSnapshot(file,JSON.parse(inputBytes));
 console.log(JSON.stringify({...result,bucket:BUCKET,path:OBJECT_PATH}));
}
async function main(){
 const [mode,output]=process.argv.slice(2);if(!["--prepare","--publish"].includes(mode)||!output)throw Error("Mode et fichier explicites requis.");
 if(mode==="--prepare")await prepare(path.resolve(output));else await publish(path.resolve(output));
}
if(require.main===module)main().catch(error=>{const code=["HOME_TEST_CONFIRMATION_REQUIRED","HOME_TEST_ACCOUNT_REQUIRED","ENOENT",401,403,404].includes(error.code)?String(error.code):"HOME_TEST_VERIFICATION_FAILED";console.error(`Préparation/publication des rendez-vous TEST interrompue (${code}) ; aucun secret ni détail interne affiché.`);process.exitCode=1;});
module.exports={gatherPages,BUCKET,loadStorageSdk};
