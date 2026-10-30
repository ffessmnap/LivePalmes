"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict");
const {readEntryTimeContext}=require("../functions/nap-entry-time-context");
const {readNativeClubEntry}=require("../functions/nap-portal-entries");
const {readNativeCompetition}=require("../functions/nap-portal-competitions");
const {readEntryHistory}=require("../functions/nap-entry-performance-history");
const {previewNativeTimes}=require("../functions/nap-entry-time-preview");
function fixture(count=50,patch={}) {
  const people=Array.from({length:count},(_,i)=>({id:i+1,club:"106",nom:"FICTIF",prenom:`Nageur${i+1}`,date:"2000-01-01",sexe:"M"}));
  const leaders=[{id:1,club:"106",pourclub:"106",nom:"CHEF",prenom:"Fictif"}];
  const data={people,leaders,active:false,presence:false,missing:false,...patch},calls=[];
  const connection={execute:async(input,values=[])=>{
    const sql=typeof input==='string'?input:input.sql;assert.match(sql,/^SELECT /);calls.push({sql,values});
    if(sql.includes("FROM competitions c"))return [[{id:1,libelle:"Fictive",date:"2026-10-30",event_type:"pool",niveau:1,qualif:0,...data.parameters}]];
    if(sql.includes("FROM livepalmes_qualification_groups"))return [[{id:1}]];
    if(sql.includes("FROM winpalme_sessions"))return [[{id:1}]];
    if(sql.includes("FROM livepalmes_competition_options"))return [[{qualifications_enabled:data.active?1:0}]];
    if(sql.includes("FROM compet_participations"))return [data.presence?[{participation:99,modeengagement:"presencetps"}]:[]];
    if(sql.includes("FROM nageurs n FORCE INDEX")) {
      assert.match(sql,/m\.swimmer_id IS NULL/);
      const selected=sql.includes("n.id IN")?values.slice(0,-1):people.map(p=>p.id);
      return [data.people.filter(p=>selected.includes(p.id)&&!p.merged_into_id&&p.club==="106")];
    }
    if(sql.includes("FROM nageursengager FORCE")) {
      const ids=values.slice(1).filter(id=>!(data.missing&&id===1));
      return [sql.includes("GROUP BY nageur")?ids.map(nageur=>({nageur})):ids.flatMap(nageur=>[{id:nageur*2,nageur},{id:nageur*2+1,nageur}])];
    }
    if(sql.includes("FROM chefsdequipe"))return [data.leaders];
    if(sql.includes("FROM engagements_relais r"))return [[{id:9}]];
    if(sql.includes("FROM perfs FORCE INDEX (nageur)"))return [values.filter(id=>String(id)!=="99").map(nageur=>({nageur,compet:99}))];
    if(sql.includes("FROM perfs p FORCE INDEX (nageur)"))return [values.map(nageur=>({id:nageur,nageur,course:"100SF",cat:"S",tps:"014200",competition_id:99,date:"2026-01-01",bassin:50,chrono:"E",ld:0}))];
    return [[]];
  }};
  return {connection,calls,data};
}
async function run(reader,count,patch={}) {
  const f=fixture(count,patch),ids=Array.from({length:count},(_,i)=>i+1),input={competitionId:1,clubId:"106",swimmerIds:ids,enrolledOnly:true};
  const services={authorize:async()=>{},preview:(person,rows)=>rows,
    readers:{competition:readNativeCompetition,entry:reader,history:readEntryHistory},
    prepareQualifications:async(connection,{people})=>{
      await connection.execute({sql:"SELECT event_code FROM livepalmes_qualification_grants WHERE competition_id=? LIMIT 3201"},[1]);
      return new Map(people.map(person=>[person.id,{enabled:true}]));
    }};
  return {...f,result:await previewNativeTimes(f.connection,input,services)};
}
(async()=>{
  for(const count of [1,50])for(const active of [false,true])for(const presence of [false,true]){
    const before=await run(readNativeClubEntry,count,{active,presence}),after=await run(readEntryTimeContext,count,{active,presence});
    assert.deepEqual(after.result.swimmers,before.result.swimmers,"exact output, duplicate inscriptions keep membership");
    assert.equal(before.calls.length-after.calls.length,5);
    assert.equal(after.calls.length,18+Number(active)+Number(presence));
    assert.equal(after.result.sqlBudget.queriesMax,after.calls.length);
  }
  for(const reader of [readNativeClubEntry,readEntryTimeContext]){
    await assert.rejects(run(reader,1,{missing:true}),/non engage/);
    await assert.rejects(run(reader,1,{leaders:[]}),/Chef/);
    await assert.rejects(run(reader,1,{leaders:[{nom:"CHEF",prenom:"A"},{nom:"CHEF",prenom:"B"}]}),/Chef/);
    assert.equal((await run(reader,1,{leaders:[{nom:"-1",prenom:"-1",date:"0000-00-00",club:"106",pourclub:"106"}]})).result.swimmers.length,1);
    await assert.rejects(run(reader,1,{people:[{id:1,club:"106",merged_into_id:9}]}),/non engage/);
    await assert.rejects(run(reader,1,{parameters:{qualif:28}}),/qualifications/);
    assert.deepEqual((await run(reader,1,{parameters:{cat_d:"2001-01-01"}})).result.swimmers[0].individualEntries,[]);
    await assert.rejects(run(reader,1,{parameters:{cat_d:"invalid"}}),/Date/);
  }
  const f=fixture(),input={competitionId:1,clubId:"106",swimmerIds:[1]};
  await assert.rejects(readEntryTimeContext(f.connection,input,()=>{throw Error("Denied");}),/Denied/);assert.equal(f.calls.length,0);
  for(const patch of [{swimmerIds:[]},{swimmerIds:[1,1]},{swimmerIds:Array.from({length:51},(_,i)=>i+1)},{clubId:"1 OR 1=1"}])await assert.rejects(readEntryTimeContext(f.connection,{...input,...patch},()=>{}));
  assert.equal(f.calls.length,0);
  await assert.rejects(readEntryTimeContext({execute:async()=>[[{id:1,club:"99"}]]},input,()=>{}),/hors du club/);
  await assert.rejects(readEntryTimeContext({execute:async()=>[[{id:2,club:"106"}]]},input,()=>{}),/hors du club/);
  await assert.rejects(readEntryTimeContext({execute:async()=>[[{},{}]]},input,()=>{}),RangeError);
  const tooMany=fixture(1,{leaders:Array(21).fill({nom:"CHEF",prenom:"A"})});
  await assert.rejects(readEntryTimeContext(tooMany.connection,input,()=>{}),RangeError);
  const selected=fixture(50);await readEntryTimeContext(selected.connection,input,()=>{});
  assert.equal(selected.calls.length,3);assert.deepEqual(selected.calls[0].values,[1,"106"]);
  assert.match(selected.calls[0].sql,/FORCE INDEX \(PRIMARY\)/);assert.match(selected.calls[1].sql,/GROUP BY nageur/);
  assert.ok(selected.calls.every(call=>!/(?:engagements_relais|engagements_relayeurs|officielsengager|livepalmes_club_entry_options)/.test(call.sql)));
  console.log("Preview context: exact former results, 1/50 swimmers, 18–20 SELECT, scope/waiver/duplicates/limits and SELECT only OK");
})().catch(error=>{console.error(error);process.exitCode=1;});
