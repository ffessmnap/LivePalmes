"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {searchMergeTargets}=require("../functions/nap-swimmer-merge-search");
(async()=>{
  let calls=[],exists=true;
  const row=id=>({id,nom:"TEST",prenom:"Personne",date:"1980-01-01",sexe:"M",club:"106",number:"A-05-000001",actif:1});
  const pool={execute:async({sql,timeout},parameters)=>{
    assert.equal(timeout,10000);calls.push({sql,parameters});
    if(sql.startsWith("SELECT id,nom")){assert.match(sql,/FORCE INDEX \(PRIMARY\).*LIMIT 1/);return [exists?[{id:12,nom:"TEST"}]:[]];}
    if(sql.includes("FROM (")){assert.match(sql,/LIMIT 21/);if(typeof parameters[0]==="string")assert.match(sql,/livepalmes_prenom_nom/);else assert.match(sql,/WHERE id = \? LIMIT 1/);return [[row(12),row(13)]];}
    assert.match(sql,/WHERE n.id IN \(\?,\?\).*LIMIT 20/);assert.deepEqual(parameters,[12,13]);return [[row(12),row(13)]];
  }};
  const result=await searchMergeTargets(pool,{sourceSwimmerId:"12"});
  assert.equal(calls.length,3);assert.deepEqual(result.swimmers.map(item=>item.id),["13"]);
  assert.equal(result.swimmers[0].source,"reference");assert.equal(result.swimmers[0].licenseNumber,"A-05-000001");
  assert.ok(result.swimmers[0].napFingerprint);assert.equal(result.source,"nap");assert.equal(result.swimmers[0].active,true);
  calls=[];await searchMergeTargets(pool,{sourceSwimmerId:12,query:"13"});assert.deepEqual(calls[1].parameters,[13]);
  for(const input of [{sourceSwimmerId:0},{sourceSwimmerId:12,query:{}},{sourceSwimmerId:12,query:"a"},{sourceSwimmerId:12,query:"a".repeat(81)}]){
    calls=[];await assert.rejects(searchMergeTargets(pool,input),TypeError);assert.equal(calls.length,0);
  }
  exists=false;calls=[];await assert.rejects(searchMergeTargets(pool,{sourceSwimmerId:12}),TypeError);assert.equal(calls.length,1);
  const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8"),start=source.indexOf("exports.searchEngagementNationalSwimmerMergeTargets ="),end=source.indexOf("\nfunction performanceMergeTargetPayloadFromSwimmer",start);
  let national=true,reads=0;
  const sandbox={exports:{},ENVIRONMENT:{sportingDataSource:"nap"},CALLABLE_OPTIONS:{},process:{env:{}},TypeError,HttpsError:class extends Error{},defineSecret:v=>v,onCall:(o,f)=>Object.assign(f,{options:o}),engagementAccessContext:async()=>({national}),require:name=>name==="./nap-portal-swimmers"?{portalPool:()=>({})}:{searchMergeTargets:async(p,input)=>{reads++;assert.equal(input.sourceSwimmerId,"12");return {source:"nap"};}},db:new Proxy({},{get(){throw Error("Legacy sporting database forbidden");}})};
  vm.runInNewContext(source.slice(start,end),sandbox);
  const callable=sandbox.exports.searchEngagementNationalSwimmerMergeTargets;
  assert.equal(callable.options.secrets[0],"LIVEPALMES_NAP_PASSWORD");assert.equal((await callable({data:{sourceSwimmerId:"12"}})).source,"nap");
  national=false;await assert.rejects(callable({data:{}}));assert.equal(reads,1);
  const ui=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
  assert.match(ui,/query && global.LivePalmesEnvironment\?\.sportingDataSource !== "nap" \? searchEngagementAdminPublicSwimmers/);
  console.log("Native swimmer merge search: bounded queries, source excluded, licence string, authorization before reads and no legacy fallback passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
