"use strict";
const fs=require("node:fs"),{execFileSync}=require("node:child_process");
const {JOB,assertJob}=require("./configure-home-events-test");
const scope=["--project=livepalmes-test","--location=europe-west1"],options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
const run=args=>execFileSync("gcloud",args,options).trim();
async function main(){
 const deletion=process.env.LIVEPALMES_HOME_DATA_CONFIRMATION==="delete-livepalmes-test-home-events";
 if(process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test"||!deletion&&process.env.LIVEPALMES_HOME_DATA_CONFIRMATION!=="pause-livepalmes-test-home-events")throw Error("TEST confirmation required");
 const reader=await fetch("https://europe-west1-livepalmes-test.cloudfunctions.net/readNapPublicSwimmer?action=home-events",{signal:AbortSignal.timeout(15000)});
 if(!reader.ok||reader.headers.get("X-LivePalmes-Home-Source")!=="nap-direct")throw Error("Direct TEST reader required before pause");
 const value=await reader.json();if(value.source!=="nap"||value.stale!==false||!Array.isArray(value.events))throw Error("Fresh direct reader required");
 const fn=JSON.parse(run(["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=json(name,state,serviceConfig.uri)"]));
 if(fn.name!=="projects/livepalmes-test/locations/europe-west1/functions/exportNapPublicPage"||fn.state!=="ACTIVE")throw Error("TEST function required");
 const describe=()=>JSON.parse(run(["scheduler","jobs","describe",JOB,...scope,"--format=json"]));
 const before=describe();if(!["ENABLED","PAUSED"].includes(before.state))throw Error("Unexpected state");assertJob({...before,state:"ENABLED"},fn.serviceConfig.uri);
 if(deletion){
  if(before.state!=="PAUSED")throw Error("Only the retired paused job may be deleted");
  run(["scheduler","jobs","delete",JOB,...scope,"--quiet"]);
  let absent=false;try{describe();}catch(error){if(!/NOT_FOUND/.test(String(error.stderr||"")))throw error;absent=true;}
  if(!absent)throw Error("Deletion not verified");
  const proof={verifiedAt:new Date().toISOString(),job:before.name,state:"DELETED",absenceVerified:true,napWrites:0,deletedFiles:0};fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync("outputs/home-events-delete-proof.json",JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify(proof));return;
 }
 if(before.state==="ENABLED")run(["scheduler","jobs","pause",JOB,...scope,"--quiet"]);
 const after=describe();assertJob({...after,state:"ENABLED"},fn.serviceConfig.uri);if(after.state!=="PAUSED")throw Error("Pause not verified");
 const proof={verifiedAt:new Date().toISOString(),job:after.name,state:after.state,napWrites:0,deletedFiles:0};fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync("outputs/home-events-pause-proof.json",JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify(proof));
}
main().catch(()=>{console.error("Retrait du seul job TEST interrompu ; aucun secret affiché. Vérifier son état avant reprise.");process.exitCode=1;});
