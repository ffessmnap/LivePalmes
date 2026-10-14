"use strict";
const fs=require("node:fs"),{execFileSync}=require("node:child_process");
async function main(){
 if(process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test")throw Error("TEST required");
 const options={encoding:"utf8",stdio:["ignore","pipe","pipe"]};
 const uri=execFileSync("gcloud",["functions","describe","exportNapPublicPage","--gen2","--region=europe-west1","--project=livepalmes-test","--format=value(serviceConfig.uri)"],options).trim();
 const url=new URL(uri);if(url.protocol!=="https:"||!url.hostname.endsWith(".run.app")||url.search||url.username||url.password)throw Error("Private endpoint required");
 const token=execFileSync("gcloud",["auth","print-identity-token",`--audiences=${uri}`],options).trim();
 url.searchParams.set("action","home-events-measure");
 if(process.argv.includes("--direct"))url.searchParams.set("direct","1");
 const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error(`Measurement HTTP ${response.status}`);
 const proof=await response.json();if(proof.source!=="nap"||proof.napWrites!==0||!Array.isArray(proof.checks))throw Error("Invalid proof");
 fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync("outputs/home-nap-measurement.json",JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify(proof));
}
main().catch(error=>{const code=String(error.stderr||"").match(/PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND/)?.[0]||error.message?.match(/Measurement HTTP \d+/)?.[0]||"verification";console.error(`Read-only measurement stopped (${code}); no credentials or rows displayed.`);process.exitCode=1;});
