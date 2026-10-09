"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8"),start=source.indexOf("exports.mergeEngagementNationalClubSwimmer ="),end=source.indexOf("\nexports.repairEngagementNationalSwimmerMergePublication",start);
let national=true,reads=0,entered=0;
const sandbox={exports:{},ENVIRONMENT:{sportingDataSource:"nap"},ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS:{},process:{env:{}},TypeError,RangeError,HttpsError:class extends Error{},defineSecret:value=>value,onCall:(o,f)=>Object.assign(f,{options:o}),engagementAccessContext:async()=>({national,uid:"national"}),writeAuditLogOnce:async()=>{},require:name=>name==="./nap-portal-swimmers"?{portalPool:()=>({})}:name==="./nap-swimmer-merge-audit"?require("../functions/nap-swimmer-merge-audit"):{mergeSwimmers:async(pool,input,audit,authorize)=>{entered++;await authorize();assert.equal(input.sourceLicenseNumber,"A-05-222647");assert.equal(input.confirmMerge,true);await audit.read("operation");return {ok:true,source:"nap"};}},db:{collection:name=>{assert.equal(name,"auditLogs","Old sporting Firebase forbidden");reads++;return {doc:()=>({get:async()=>({exists:false})})};}}};
vm.runInNewContext(source.slice(start,end),sandbox);
const callable=sandbox.exports.mergeEngagementNationalClubSwimmer;
(async()=>{
  assert.equal(callable.options.secrets[0],"LIVEPALMES_NAP_PASSWORD");
  national=false;await assert.rejects(callable({data:{confirmMerge:true}}));assert.equal(reads,0);assert.equal(entered,0);
  national=true;await assert.rejects(callable({data:{confirmMerge:false}}));assert.equal(reads,0);assert.equal(entered,0);
  assert.equal((await callable({data:{sourceSwimmerId:"12",targetSwimmerId:"13",confirmMerge:true,sourceLicenseNumber:"A-05-222647"}})).source,"nap");assert.equal(reads,3);
  const ui=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
  const block=ui.slice(ui.indexOf('callFunction("mergeEngagementNationalClubSwimmer"'),ui.indexOf("resetEngagementNationalSwimmerMergeState();",ui.indexOf('callFunction("mergeEngagementNationalClubSwimmer"')));
  for(const field of ["sourceFingerprint","targetFingerprint","sourceLicenseNumber","targetLicenseNumber"])assert.ok(block.includes(field));
  console.log("Native swimmer merge callable: national confirmation before access, secret binding, technical audit only and displayed fingerprints/licences sent passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
