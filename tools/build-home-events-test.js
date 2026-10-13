"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const {createHash}=require("node:crypto");
const {civilAt}=require("../functions/nap-paris-time");
const {OBJECT_PATH,MAX_BYTES,validateSnapshot}=require("../functions/nap-home-events");
const BUCKET="livepalmes-test-public-data-206080168534";
async function gatherPages(fetchPage,now=Date.now()){
 const today=civilAt(now).slice(0,10),events=[];let after=0,calls=0;
 while(true){
  if(++calls>100)throw Error("Bornes de préparation dépassées.");
  const page=await fetchPage({after,today});
  if(page.source!=="nap"||page.today!==today||!Array.isArray(page.events)||page.events.length>100||typeof page.hasMore!=="boolean")throw Error("Page calendrier invalide.");
  events.push(...page.events);
  if(events.length>10000)throw Error("Calendrier trop volumineux.");
  if(!page.hasMore)break;
  if(!Number.isSafeInteger(page.nextAfterId)||page.nextAfterId<=after)throw Error("Curseur calendrier invalide.");
  after=page.nextAfterId;
 }
 if(new Set(events.map(event=>event.id)).size!==events.length)throw Error("Calendrier ambigu.");
 const snapshot={schemaVersion:1,source:"nap",generatedAt:new Date(now).toISOString(),events};
 const canonical={schemaVersion:1,...validateSnapshot(snapshot,now)};
 if(Buffer.byteLength(JSON.stringify(canonical))>MAX_BYTES)throw Error("Calendrier trop volumineux.");
 return {snapshot:canonical,calls};
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
 if(process.env.LIVEPALMES_HOME_DATA_CONFIRMATION!=="publish-livepalmes-test-home-events"||process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test")throw Error("Publication TEST non confirmée.");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));if(credentials.project_id!=="livepalmes-test")throw Error("Compte TEST requis.");
 const inputBytes=fs.readFileSync(output);if(inputBytes.length>MAX_BYTES)throw Error("Fichier trop volumineux.");
 const value={schemaVersion:1,...validateSnapshot(JSON.parse(inputBytes))},bytes=Buffer.from(JSON.stringify(value)+"\n");
 const {initializeApp,applicationDefault}=require("../functions/node_modules/firebase-admin/app");
 const {getStorage}=require("../functions/node_modules/firebase-admin/storage");
 const app=initializeApp({credential:applicationDefault(),projectId:"livepalmes-test"},"test-home-events");
 const file=getStorage(app).bucket(BUCKET).file(OBJECT_PATH);let generation=0;
 try{const [metadata]=await file.getMetadata();generation=Number(metadata.generation);if(!Number.isSafeInteger(generation)||generation<1)throw Error("Génération invalide.");}
 catch(error){if(Number(error.code)!==404)throw error;}
 await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:generation},metadata:{contentType:"application/json; charset=utf-8",cacheControl:"public, max-age=60, must-revalidate",metadata:{kind:"livepalmes-test-home-events",generatedAt:value.generatedAt}}});
 const [verified]=await file.download();const hash=buffer=>createHash("sha256").update(buffer).digest("hex");
 if(hash(verified)!==hash(bytes))throw Error("Publication à vérifier.");
 console.log(JSON.stringify({published:true,bucket:BUCKET,path:OBJECT_PATH,events:value.events.length,sha256:hash(bytes),verified:true}));
}
async function main(){
 const [mode,output]=process.argv.slice(2);if(!["--prepare","--publish"].includes(mode)||!output)throw Error("Mode et fichier explicites requis.");
 if(mode==="--prepare")await prepare(path.resolve(output));else await publish(path.resolve(output));
}
if(require.main===module)main().catch(()=>{console.error("Préparation/publication des rendez-vous TEST interrompue ; aucun secret ni détail interne affiché.");process.exitCode=1;});
module.exports={gatherPages,BUCKET};
