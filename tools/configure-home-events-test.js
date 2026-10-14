"use strict";
const {execFileSync}=require("node:child_process");
const fs=require("node:fs");
const {BUCKET}=require("../functions/nap-home-events-refresh");
const {OBJECT_PATH,validateSnapshot}=require("../functions/nap-home-events");
const PROJECT="livepalmes-test",LOCATION="europe-west1",JOB="livepalmes-test-home-events";
const ACCOUNT="github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com";
const SCHEDULE="17 * * * *",DESCRIPTION="LivePalmes TEST: site-home/events-v1.json only";
let phase="validation";
const gcloud=args=>execFileSync("gcloud",args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
const parse=args=>JSON.parse(gcloud(args));
const scope=[`--project=${PROJECT}`,`--location=${LOCATION}`];
const sameUri=(actual,expected)=>{try{return new URL(actual).href===new URL(expected).href;}catch{return false;}};
function jobArgs(uri,schedule=SCHEDULE){
 const url=new URL(uri);if(url.protocol!=="https:"||!url.hostname.endsWith(".run.app")||url.username||url.password||url.search||url.hash||url.pathname!=="/")throw Error("Service TEST invalide.");
 return [...scope,`--schedule=${schedule}`,"--time-zone=Europe/Paris",`--uri=${uri}?action=home-events-refresh`,"--http-method=POST",`--oidc-service-account-email=${ACCOUNT}`,`--oidc-token-audience=${uri}`,"--headers=Content-Type=application/json",'--message-body={"confirmation":"publish-livepalmes-test-home-events"}',"--attempt-deadline=180s","--max-retry-attempts=3","--min-backoff=30s","--max-backoff=300s","--max-doublings=3",`--description=${DESCRIPTION}`,"--quiet"];
}
function assertJob(value,uri,schedule=SCHEDULE){
 const checks={name:value.name===`projects/${PROJECT}/locations/${LOCATION}/jobs/${JOB}`,enabled:value.state==="ENABLED",schedule:value.schedule===schedule,timeZone:value.timeZone==="Europe/Paris",description:value.description===DESCRIPTION,uri:sameUri(value.httpTarget?.uri,`${uri}?action=home-events-refresh`),method:value.httpTarget?.httpMethod==="POST",identity:value.httpTarget?.oidcToken?.serviceAccountEmail===ACCOUNT,audience:value.httpTarget?.oidcToken?.audience===uri,deadline:value.attemptDeadline==="180s",retryCount:value.retryConfig?.retryCount===3,minBackoff:value.retryConfig?.minBackoffDuration==="30s",maxBackoff:value.retryConfig?.maxBackoffDuration==="300s",maxDoublings:value.retryConfig?.maxDoublings===3,confirmation:Buffer.from(value.httpTarget?.body||"","base64").toString()==='{"confirmation":"publish-livepalmes-test-home-events"}'};
 if(Object.values(checks).some(ok=>!ok))throw Object.assign(Error("Configuration du seul job TEST non conforme."),{checks});
 return value;
}
async function main(){
 if(process.env.TARGET_FIREBASE_PROJECT!==PROJECT||process.env.LIVEPALMES_HOME_DATA_CONFIRMATION!=="publish-livepalmes-test-home-events")throw Error("Configuration TEST non confirmée.");
 phase="private-export";
 const fn=parse(["functions","describe","exportNapPublicPage","--gen2",`--region=${LOCATION}`,`--project=${PROJECT}`,"--format=json(name,state,serviceConfig.uri)"]);
 if(fn.name!==`projects/${PROJECT}/locations/${LOCATION}/functions/exportNapPublicPage`||fn.state!=="ACTIVE")throw Error("Export privé TEST non vérifié.");
 const uri=fn.serviceConfig.uri;jobArgs(uri);
 const describe=()=>parse(["scheduler","jobs","describe",JOB,...scope,"--format=json"]);
 let exists=false;
 phase="inspect-job";
 try{const old=describe();if(old.description!==DESCRIPTION||old.httpTarget?.oidcToken?.serviceAccountEmail!==ACCOUNT||!sameUri(old.httpTarget?.uri,`${uri}?action=home-events-refresh`))throw Error("Job existant différent ; arrêt sans remplacement.");exists=true;}
 catch(error){if(!/NOT_FOUND/.test(String(error.stderr||"")))throw error;}
 phase="configure-hourly-job";gcloud(["scheduler","jobs",exists?"update":"create","http",JOB,...jobArgs(uri)]);
 assertJob(describe(),uri);
 const object=()=>parse(["storage","objects","describe",`gs://${BUCKET}/${OBJECT_PATH}`,`--project=${PROJECT}`,"--format=json(generation,metadata)"]);
 const before=object(),observations=[];let lastGeneration=String(before.generation);
 const started=Date.now();
 // Exercise the actual timer twice with current public data, then restore hourly.
 // No fake file, IAM change, database write or GitHub dispatch is involved.
 try{
  phase="automatic-verification";
  gcloud(["scheduler","jobs","update","http",JOB,...jobArgs(uri,"* * * * *")]);assertJob(describe(),uri,"* * * * *");
  console.log("Vérification de deux déclenchements automatiques du seul job TEST.");
  while(observations.length<2&&Date.now()-started<210000){
   await new Promise(resolve=>setTimeout(resolve,5000));
   const metadata=object();
   if(String(metadata.generation)!==lastGeneration&&Date.parse(metadata.metadata?.generatedAt||"")>=started){
    const job=describe(),attempt=Date.parse(job.lastAttemptTime||"");if(!Number.isFinite(attempt)||attempt<started||observations.some(item=>item.lastAttemptTime===job.lastAttemptTime)||Number(job.status?.code||0)!==0)continue;
    observations.push({generation:String(metadata.generation),generatedAt:metadata.metadata.generatedAt,lastAttemptTime:job.lastAttemptTime});lastGeneration=String(metadata.generation);
    console.log(`Actualisation automatique vérifiée ${observations.length}/2.`);
   }
  }
  if(observations.length!==2)throw Error("Deux déclenchements automatiques non attestés dans la fenêtre.");
 }finally{
  phase="restore-hourly-job";
  gcloud(["scheduler","jobs","update","http",JOB,...jobArgs(uri)]);assertJob(describe(),uri);
  console.log("Rythme horaire rétabli et vérifié.");
 }
 let live;
 phase="public-reader";
 for(let attempt=0;attempt<15;attempt++){
  const response=await fetch(`https://${LOCATION}-${PROJECT}.cloudfunctions.net/readNapPublicSwimmer?action=home-events`,{signal:AbortSignal.timeout(15000)});
  if(response.ok){const value=await response.json();if(value.stale===false&&Date.parse(value.generatedAt)>=started){validateSnapshot({schemaVersion:1,...value});live=value;break;}}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 if(!live)throw Error("Lecture publique fraîche non attestée.");
 const job=assertJob(describe(),uri),proof={verifiedAt:new Date().toISOString(),project:PROJECT,job:job.name,schedule:job.schedule,timeZone:job.timeZone,retryCount:job.retryConfig.retryCount,authenticatedAccount:ACCOUNT,automaticExecutions:observations,publicReader:{events:live.events.length,generatedAt:live.generatedAt,stale:live.stale},napWrites:0,iamChanges:0};
 fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync("outputs/home-events-scheduler-proof.json",JSON.stringify(proof,null,2)+"\n");
 console.log(JSON.stringify({schedulerVerified:true,automaticExecutions:2,events:live.events.length,schedule:job.schedule}));
}
if(require.main===module)main().catch(error=>{const code=String(error.stderr||"").match(/PERMISSION_DENIED|INVALID_ARGUMENT|NOT_FOUND|UNAUTHENTICATED|ALREADY_EXISTS|unrecognized arguments/)?.[0]||"verification";console.error(`Configuration/vérification du job TEST interrompue (${phase}, ${code}) ; aucun secret affiché.`);if(error.checks)console.error(JSON.stringify({conformance:error.checks}));process.exitCode=1;});
module.exports={jobArgs,assertJob,ACCOUNT,JOB,SCHEDULE,DESCRIPTION};
