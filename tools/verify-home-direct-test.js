"use strict";
const fs=require("node:fs");
const endpoint="https://europe-west1-livepalmes-test.cloudfunctions.net/readNapPublicSwimmer?action=home-events";
async function read(){
 const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000)});
 if(!response.ok||response.headers.get("X-LivePalmes-Home-Source")!=="nap-direct")throw Error("Direct TEST reader not active");
 const value=await response.json();
 if(value.source!=="nap"||value.stale!==false||!Array.isArray(value.events)||!Number.isFinite(Date.parse(value.generatedAt)))throw Error("Fresh response required");
 return {generatedAt:value.generatedAt,events:value.events.length};
}
async function main(){
 if(process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test")throw Error("TEST required");
 const started=Date.now(),initial=await read(),burst=await Promise.all(Array.from({length:4},()=>read()));
 const generations=[...new Set([initial,...burst].map(value=>value.generatedAt))];
 if(generations.length>2)throw Error("Requests not shared by two-instance cache");
 console.log(JSON.stringify({initial,burstResponses:burst.length,cacheGenerations:generations.length}));
 // Observe actual expiry without changing any data or the server clock.
 while(Date.now()-started<310000){await new Promise(resolve=>setTimeout(resolve,30000));console.log("Attente de l’expiration réelle du cache cinq minutes.");}
 const refreshed=await read();
 if(Date.parse(refreshed.generatedAt)<=started)throw Error("Expired cache did not renew from NAP");
 const proof={verifiedAt:new Date().toISOString(),project:"livepalmes-test",source:"nap-direct",initial,burstResponses:burst.length,cacheGenerations:generations.length,refreshed,observedMs:Date.now()-started,napWrites:0};
 fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync("outputs/home-direct-test-proof.json",JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify(proof));
}
main().catch(error=>{console.error(`Direct TEST check stopped: ${error.message}`);process.exitCode=1;});
