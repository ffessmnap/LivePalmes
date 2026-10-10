"use strict";
const assert=require("node:assert/strict");
const details=require("../functions/nap-calendar-event-details");
async function run() {
  const sessions=[{label:"Accueil",date:"2026-11-07",startTime:"09:00",endTime:"10:00",summary:"Formation",items:[{label:"Presentation",time:"09:00"}]}];
  const result=details.normalize({registrationUrl:"https://example.org/inscription",entryDeadlineAt:"2026-11-06T20:00:00+01:00",programSessions:sessions});
  assert.equal(result.entryDeadlineAt,"2026-11-06T19:00:00.000Z");
  assert.equal(result.programSessions[0].title,"Accueil");
  assert.equal(result.programSessions[0].items[0].label,"Presentation");
  assert.deepEqual(details.fromRow({registration_url:result.registrationUrl,registration_deadline_at:"2026-11-06 19:00:00.000000",program_sessions:JSON.stringify(result.programSessions)}),result);
  assert.deepEqual(details.fromRow(),{registrationUrl:"",entryDeadlineAt:"",programSessions:[]});
  assert.equal(details.normalize({registrationUrl:"javascript:alert(1)"}).registrationUrl,"");
  assert.throws(()=>details.normalize({entryDeadlineAt:"not a date"}),/invalide/);
  assert.throws(()=>details.fromRow({program_sessions:"{"}),/illisible/);
  assert.throws(()=>details.normalize({programSessions:Array(13).fill({})}),/volumineux/);
  assert.throws(()=>details.normalize({programSessions:[{items:Array(161).fill({})}]}),/volumineux/);
  let reads=0;
  const connection={execute:async(query,values)=>{reads++;assert.match(query.sql,/FORCE INDEX \(PRIMARY\).*LIMIT 1/);assert.deepEqual(values,[5162]);return [[]];}};
  await details.read(connection,"legacy-nap-5162","training");assert.equal(reads,1);
  await assert.rejects(details.read(connection,"5162","pool"),/requis/);assert.equal(reads,1);
  let publicReads=0;
  const publicResult=await require("../functions/nap-direct-calendar").readCompetition({execute:async(query,values)=>{
    publicReads++;assert.deepEqual(values,[5162]);
    if(query.sql.includes("FROM competitions c"))return [[{id:5162,libelle:"Formation",date:"2026-11-07",event_type:"training",ld:2,has_results:0}]];
    if(query.sql.includes("FROM livepalmes_calendar_event_details"))return [[{registration_url:result.registrationUrl,registration_deadline_at:"2026-11-06 19:00:00.000000",program_sessions:JSON.stringify(result.programSessions),updated_by:"private-admin"}]];
    return [[]];
  }},5162);
  assert.equal(publicReads,4);assert.equal(publicResult.event.registrationUrl,result.registrationUrl);assert.equal(publicResult.event.entryDeadlineAt,result.entryDeadlineAt);assert.equal(publicResult.event.program[0].title,"Accueil");assert.ok(!JSON.stringify(publicResult).includes("private-admin"));
  console.log("NAP calendar details: UTC round trip, shared programme format, bounded read and event-type guard passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
