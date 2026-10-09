"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const {previewRecovery}=require("../functions/nap-swimmer-recovery");
const input={clubId:"106",licenseNumber:"A-05-222647",season:"2026-2027"};
const native={id:912,nom:"FAUVEAU",prenom:"Antoine",date:"1980-01-02",sexe:"M",number:input.licenseNumber,club:"107"};
const result=(id,date,published=1)=>({id,nageur:912,competition_id:5162,date,published});
(async()=>{
  let allowed=false,calls=0,matches=[native],history=[];
  const pool={execute:async({sql,timeout},values)=>{
    assert.equal(allowed,true);assert.equal(timeout,10000);calls++;
    if(sql.includes("FROM nageurs n")) {
      assert.match(sql,/FORCE INDEX \(livepalmes_license_number_id\)/);assert.match(sql,/WHERE n.number=\? ORDER BY n.id LIMIT 2$/);assert.deepEqual(values,[input.licenseNumber]);return [matches];
    }
    assert.match(sql,/FROM \(SELECT id,nageur,compet FROM perfs FORCE INDEX \(nageur\) WHERE nageur=\? LIMIT 2001\)/);
    assert.match(sql,/livepalmes_performance_visibility/);assert.deepEqual(values,[912]);return [history];
  }};
  const authorize=scope=>{assert.equal(scope.clubId,"106");allowed=true;};
  let preview=await previewRecovery(pool,input,authorize);
  assert.equal(calls,2);assert.equal(preview.eligible,true);assert.equal(preview.swimmer.licenseNumber,input.licenseNumber);assert.equal(preview.swimmer.licenseSeasonStatus,"to_check");
  for(const date of ["2026-09-01","2027-08-31","2026-10-09"]) {
    history=[result(1,date)];preview=await previewRecovery(pool,input,authorize);assert.equal(preview.eligible,false);assert.equal(preview.publishedResult,true);
  }
  for(const date of ["2026-08-31","2027-09-01"]) {
    history=[result(1,date)];assert.equal((await previewRecovery(pool,input,authorize)).eligible,true);
  }
  history=[result(1,"2026-10-09",0)];assert.equal((await previewRecovery(pool,input,authorize)).eligible,true,"hidden result is not published");
  matches=[{...native,club:"106"}];assert.equal((await previewRecovery(pool,input,authorize)).eligible,false);
  matches=[];const before=calls;assert.equal((await previewRecovery(pool,input,authorize)).found,false);assert.equal(calls,before+1);
  matches=[native,{...native,id:913}];await assert.rejects(previewRecovery(pool,input,authorize),/Plusieurs nageurs/);
  matches=[native];history=Array.from({length:2001},(_,i)=>result(i+1,"2020-01-01"));await assert.rejects(previewRecovery(pool,input,authorize),RangeError);
  for(const rows of [[result(1,null)],[result(1,"0000-00-00")],[result(1,"2026-10-09"),result(1,"2026-10-09")],[{...result(1,"2026-10-09"),nageur:913}]]) {
    history=rows;await assert.rejects(previewRecovery(pool,input,authorize),TypeError);
  }
  const initial=calls;await assert.rejects(previewRecovery(pool,input,()=>{throw Error("Denied");}),/Denied/);assert.equal(calls,initial);
  for(const patch of [{clubId:"106 OR 1=1"},{licenseNumber:912},{licenseNumber:""},{season:"2026-2028"}]) await assert.rejects(previewRecovery(pool,{...input,...patch},authorize),TypeError);
  const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
  const block=source.slice(source.indexOf("exports.previewEngagementClubSwimmerRecovery ="),source.indexOf("exports.recoverEngagementClubSwimmer ="));
  for(const projectId of ["livepalmes-test","livepalmes"]) {
    let nativeCalls=0;
    const sandbox={exports:{},ENVIRONMENT:{projectId,sportingDataSource:"nap"},CALLABLE_OPTIONS:{},process:{env:{}},Date,TypeError,RangeError,HttpsError:class extends Error{},cleanText:value=>String(value||"").trim(),defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),engagementClubAccessContext:async()=>({clubId:"106"}),db:new Proxy({},{get(){throw Error("Old sporting directory forbidden");}}),require:name=>name==="./nap-portal-swimmers"?{portalPool:()=>pool}:{previewRecovery:async(connection,value,authorizeScope)=>{nativeCalls++;assert.equal(value.licenseNumber,input.licenseNumber);await authorizeScope({clubId:"106"});return {source:"nap",found:true};}}};
    vm.runInNewContext(block,sandbox);const callable=sandbox.exports.previewEngagementClubSwimmerRecovery;
    assert.equal(callable.options.secrets[0],"LIVEPALMES_NAP_PASSWORD");assert.equal(callable.options.maxInstances,2);
    assert.equal((await callable({data:{licenseNumber:input.licenseNumber}})).source,"nap");assert.equal(nativeCalls,1);
  }
  console.log("NAP recovery preview: scoped indexed licence/history, season boundaries, duplicates, hidden results, bounded failures and TEST/PROD routing verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
