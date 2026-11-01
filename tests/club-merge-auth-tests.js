"use strict";
const assert=require("node:assert/strict"),auth=require("../tools/club-merge-auth");
async function main(){
  let created=0,reads=0;
  const adc=auth.tokenProvider({adc:()=>{created++;return{getAccessToken:async()=>{reads++;return{access_token:"adc-fixture"};}};}});
  assert.equal(created,0);assert.equal(await adc(),"adc-fixture");assert.equal(created,1);assert.equal(reads,1);
  assert.throws(()=>auth.tokenProvider({mode:"other"}),/INVALID_OPERATOR/);
  assert.throws(()=>auth.tokenProvider({mode:"gcloud"}),/EXPLICIT/);
  assert.throws(()=>auth.tokenProvider({mode:"gcloud",account:"fixture@example.invalid & command"}),/EXPLICIT/);
  let calls=0,clock=0;
  const token=auth.tokenProvider({mode:"gcloud",account:"fixture@example.invalid",now:()=>clock,execute:(command,args)=>{calls++;assert(["cmd.exe","gcloud"].includes(command));assert(JSON.stringify(args).includes("--account=fixture@example.invalid"));return"fixture-bearer-token\n";}});
  assert.equal(calls,0);assert.equal(await token(),"fixture-bearer-token");await token();assert.equal(calls,1);clock=45001;await token();assert.equal(calls,2);
  const failed=auth.tokenProvider({mode:"gcloud",account:"fixture@example.invalid",execute:()=>{throw Error("PRIVATE_STDERR_MUST_NOT_ESCAPE");}});
  await assert.rejects(()=>failed(),error=>error.message==="EXISTING_GCLOUD_SESSION_REQUIRED");
  let requested=0;
  assert.equal(await auth.existingNapPassword(async()=>"fixture",async(url,options)=>{requested++;assert.equal(url,"https://secretmanager.googleapis.com/v1/projects/livepalmes/secrets/LIVEPALMES_NAP_PASSWORD/versions/latest:access");assert.equal(options.headers.Authorization,"Bearer fixture");assert.equal(options.method,undefined);return{ok:true,json:async()=>({payload:{data:Buffer.from("fiction-only").toString("base64")}})};}),"fiction-only");
  assert.equal(requested,1);
  await assert.rejects(()=>auth.existingNapPassword(async()=>"fixture",async()=>({ok:false,status:403})),/NAP_EXISTING_SECRET_ACCESS_403/);
  const merge=require("../tools/club-merge");await assert.rejects(()=>merge.connect({}),/NAP_CREDENTIALS_REQUIRED/);
  console.log("Club merge operator auth: explicit account/mode, lazy ADC, bounded token reuse, no silent identity fallback, fixed existing secret opt-in and sanitized failures; offline only.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
