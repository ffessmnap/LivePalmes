"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
(async()=>{
 for(const name of ["previewEngagementClubSwimmerCreation","createEngagementClubSwimmer"]) {
  const start=source.indexOf(`exports.${name} =`),end=source.indexOf("\nexports.",start+1),block=source.slice(start,end);
  let calls=0,authorized=false;
  const native=async(pool,input,...rest)=>{calls++;assert.equal(authorized,true);assert.equal(input.clubId,"106");const authorize=rest.find(v=>typeof v==="function");await authorize({clubId:"106"});assert.equal(input.swimmer.licenseNumber,"A-05-000001");return {ok:true,source:"nap"};};
  const sandbox={exports:{},ENVIRONMENT:{sportingDataSource:"nap"},CALLABLE_OPTIONS:{},process:{env:{}},Date,TypeError,RangeError,HttpsError:class extends Error{},defineSecret:v=>v,onCall:(options,fn)=>Object.assign(fn,{options}),engagementClubAccessContext:async()=>{authorized=true;return {clubId:"106",uid:"test"};},engagementNewSwimmerAlertFromMatch:()=>{},db:new Proxy({},{get(){throw Error("Legacy sporting base forbidden");}}),require:name=>name==="./nap-portal-swimmers"?{portalPool:()=>({})}:{previewCreation:native,createSwimmer:native}};
  vm.runInNewContext(block,sandbox);const callable=sandbox.exports[name];assert.equal(callable.options.secrets[0],"LIVEPALMES_NAP_PASSWORD");assert.equal((await callable({data:{swimmer:{licenseNumber:"A-05-000001"}}})).source,"nap");assert.equal(calls,1);
 }
 console.log("NAP creation callables: authorization, native routing and no legacy sporting reads verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
