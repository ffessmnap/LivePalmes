"use strict";
const fs=require("node:fs"),{execFileSync}=require("node:child_process");
const {OPERATION}=require("../functions/nap-nora-performance-clubs");
async function main(){
 const phase=process.env.NORA_CLUBS_PHASE;
 if(process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test"||process.env.NORA_CLUBS_CONFIRMATION!==OPERATION||!["prepare","apply"].includes(phase))throw Error("Fixed scope required");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
 if(credentials.project_id!=="livepalmes-test"||credentials.client_email!=="github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com")throw Error("Wrong account");
 const options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
 const uri=execFileSync("gcloud",["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"],options).trim(),url=new URL(uri);
 if(url.protocol!=="https:"||!url.hostname.endsWith(".run.app")||url.username||url.password||url.search)throw Error("Wrong endpoint");
 const token=execFileSync("gcloud",["auth","print-identity-token",`--audiences=${uri}`],options).trim();
 const beforePath="outputs/nora-performance-clubs-before.json",planHash=phase==="apply"?JSON.parse(fs.readFileSync(beforePath,"utf8")).plan.planHash:undefined;
 url.searchParams.set("action","approved-nora-performance-clubs");
 const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({phase,confirmation:OPERATION,planHash}),signal:AbortSignal.timeout(180000)});
 if(!response.ok){const failure=await response.json();console.error(`Reprise Nora refusee (${response.status}) : ${String(failure.error||"indisponible").slice(0,200)}`);throw Error("Repair unavailable");}const result=await response.json();
 if(result.source!=="nap"||result.mode!==OPERATION)throw Error("Wrong receipt");fs.mkdirSync("outputs",{recursive:true});
 if(phase==="prepare"){
  if(result.writesExecuted!==false||result.plan?.swimmerId!==13787||!/^[a-f0-9]{64}$/.test(result.plan?.planHash||""))throw Error("Wrong backup");
  fs.writeFileSync(beforePath,JSON.stringify(result,null,2));console.log("Sauvegarde et plan certain de Nora prepares ; aucune performance modifiee.");
 }else{
  if(result.verified!==true||result.swimmerId!==13787||result.planHash!==planHash)throw Error("Unverified result");
  fs.writeFileSync("outputs/nora-performance-clubs-result.json",JSON.stringify(result,null,2));console.log(`Correction des clubs de Nora verifiee : ${result.changed} lignes, ${result.skipped.length} lignes laissees intactes faute de preuve suffisante.`);
 }
}
main().catch(()=>{console.error("Reprise Nora arretee : conserver la sauvegarde et l'audit avant toute nouvelle tentative. Aucun detail personnel ni secret affiche.");process.exitCode=1;});
