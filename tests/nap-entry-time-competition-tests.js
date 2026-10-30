"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict");
const {readNativeCompetition,readEntryTimeCompetition}=require("../functions/nap-portal-competitions");
const {competitionItem,fingerprint}=require("../functions/nap-portal-workspaces");
function fixture({sessions=true,failTable="",overflows="",allow=true}={}){
  const calls=[];let authorized=false;
  const connection={execute:async({sql})=>{
    assert.match(sql,/^SELECT /);calls.push(sql);
    if(sql.includes("FROM competitions c"))return [[{id:1,date:"2026-10-30",libelle:"Fictive",niveau:1,qualif:0,saisie:1}]];
    assert.equal(authorized,true,"No supplemental read before authorization");
    if(failTable&&sql.includes(failTable))throw Error("Fixture SQL error");
    if(overflows&&sql.includes(overflows))return [Array(301).fill({})];
    if(sql.includes("FROM livepalmes_competition_fees"))return [[{enabled:1,swimmer_fee:12}]];
    if(sql.includes("FROM livepalmes_competition_programs"))return [[{program_sessions:'[{"label":"Programme fictif"}]'}]];
    if(sql.includes("FROM winpalme_sessions"))return [sessions?[{id:1}]:[]];
    if(sql.includes("FROM winpalme_courses"))return [[{id:1,session:1,course:"100SF"}]];
    if(sql.includes("FROM livepalmes_qualification_groups"))return [[{id:1}]];
    return [[]];
  }};
  return {calls,read:reader=>reader(connection,1,()=>{if(!allow)throw Error("Denied");authorized=true;})};
}
async function main(){
  for(const sessions of [true,false]){
    const f=fixture({sessions}),t=fixture({sessions});
    const full=await f.read(readNativeCompetition),targeted=await t.read(readEntryTimeCompetition);
    const {readAt:_,fees,detailedProgram,sessions:nativeSessions,program,...sporting}=full;
    const {readAt:__,fees:tf,detailedProgram:td,sessions:ts,program:tp,...targetSporting}=targeted;
    assert.deepEqual(targetSporting,sporting,"Every sporting input remains identical");
    assert.equal(tf,null);assert.equal(td,null);assert.deepEqual(ts,[]);assert.deepEqual(tp,[]);
    assert.equal(fees.swimmer_fee,12);assert.ok(detailedProgram.program_sessions);assert.equal(nativeSessions.length,Number(sessions));
    assert.equal(f.calls.length-t.calls.length,sessions?4:3);assert.equal(t.calls.length,10);
    assert.ok(t.calls.every(sql=>f.calls.includes(sql)),"Remaining SQL is an unchanged subset of the full reader");
    assert.ok(!t.calls.some(sql=>/FROM (?:livepalmes_competition_fees|livepalmes_competition_programs|winpalme_sessions|winpalme_courses)\b/.test(sql)));
    const a=competitionItem(full),b=competitionItem(targeted);
    for(const field of ["events","nativeParameters","nativeRules","qualificationStartDate","qualificationEndDate","qualificationTimesMode","missingEntryTimeMode","qualifications"])assert.deepEqual(b[field],a[field]);
    const fresh=await fixture({sessions}).read(readNativeCompetition);assert.equal(fingerprint(full),fingerprint(fresh),"Full reader fingerprint inputs stay unchanged");
  }
  for(const reader of [readNativeCompetition,readEntryTimeCompetition]){
    const denied=fixture({allow:false});await assert.rejects(denied.read(reader),/Denied/);assert.equal(denied.calls.length,1);
    await assert.rejects(fixture({failTable:"courses_swim"}).read(reader),/Fixture SQL error/);
    await assert.rejects(fixture({overflows:"compet_courses"}).read(reader),RangeError);
    assert.equal(await reader({execute:async()=>[[]]},1,()=>{throw Error("No authorization for missing record");}),null);
  }
  console.log("Time competition reader: 3–4 SELECT removed, all sporting inputs equal, full details/fingerprints preserved, authorization/error/limit checks passed offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
