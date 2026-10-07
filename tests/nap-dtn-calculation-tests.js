"use strict";
const assert=require("node:assert/strict"),engine=require("../functions/dtn-season-engine"),{calculateSeason}=require("../functions/nap-dtn-calculation");
const season=structuredClone(require("../functions/config/dtn-season-2025-2026.json"));
for(const device of engine.DEVICES) for(const profile of season[device]) {
  profile.enabled=true;profile.minAge=0;profile.maxAge=120;profile.grid={"F|100SF":{time:6000,top:null}};delete profile.sourceId;
  profile.pools=["50"];profile.electronicOnly=true;profile.competitionMode="all";profile.competitions=[];
  profile.requirements={mode:"any",groups:[{count:1,courses:["100SF"]}]};
}
const rows=[{source:"nap",swimmerId:"1",swimmerIdentityKey:"one",swimmer:"One",birthDate:"2010-01-01",sex:"F",course:"100SF",timeValue:5900,date:"2026-01-02",pool:"50",chrono:"E",competitionId:"1"}, {source:"nap",swimmerId:"2",swimmerIdentityKey:"two",swimmer:"Two",birthDate:"2010-01-01",sex:"F",course:"100SF",timeValue:5800,date:"2026-01-02",pool:"25",chrono:"E",competitionId:"1"}];
(async()=>{
  let reads=0;
  const services={authorize:async()=>{},readCompetitionIds:async()=>[1],readPage:async()=>{reads++;return {source:"nap",rows,scannedRows:2,excludedRows:0,hasMore:false};}};
  await assert.rejects(()=>calculateSeason({},season,{...services,authorize:async()=>{throw new Error("Denied");}}),/Denied/);assert.equal(reads,0);
  const result=await calculateSeason({},season,services);assert.equal(reads,1,"One shared source pass for all three devices");assert.equal(result.source,"nap");assert.equal(result.sqlBudget.writesExecuted,0);
  for(const device of engine.DEVICES) {
    const accumulator=engine.createAccumulator(season,device);rows.forEach(row=>engine.consume(accumulator,season,row));
    assert.deepEqual(result.views[device].profiles,engine.finish(accumulator,season,device),"Unchanged qualification, Top and listing priorities");
  }
  await assert.rejects(()=>calculateSeason({},season,{...services,readPage:async()=>({source:"firebase",rows,scannedRows:2,excludedRows:0,hasMore:false})}),/incompatible/);
  await assert.rejects(()=>calculateSeason({},season,{...services,readPage:async()=>({source:"nap",rows,scannedRows:2,excludedRows:0,hasMore:true,cursor:null})}),/incompatible/);
  const empty=await calculateSeason({},season,{...services,readCompetitionIds:async()=>[]});assert.equal(empty.pages,0);assert.equal(reads,1);
  console.log("DTN calculation: unchanged existing engine, one native pass for three devices, auth, empty season and incompatible/partial page refusal verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
