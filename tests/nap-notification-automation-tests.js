"use strict";
const assert = require('node:assert/strict');
const automation = require('../functions/nap-notification-automation');
const now='2026-10-09T10:00:00.000Z', deadline='2026-10-10T10:00:00.000Z';
const deleted=Symbol('deleted');
function memoryDb(){
  const rows=new Map();
  const ref=(collection,id)=>({id,path:`${collection}/${id}`});
  const snapshot=reference=>({exists:rows.has(reference.path),data:()=>rows.get(reference.path)});
  return {rows,collection:name=>({doc:id=>ref(name,id)}),runTransaction:async callback=>{
    const writes=[];
    const tx={get:async reference=>snapshot(reference),getAll:async(...refs)=>refs.map(snapshot),
      create:(reference,value)=>writes.push(()=>{assert.ok(!rows.has(reference.path));rows.set(reference.path,value);}),
      set:(reference,value)=>writes.push(()=>rows.set(reference.path,value)),
      update:(reference,value)=>writes.push(()=>{const next={...rows.get(reference.path)};for(const [key,item]of Object.entries(value)){if(item===deleted)delete next[key];else next[key]=item;}rows.set(reference.path,next);})};
    const result=await callback(tx);writes.forEach(write=>write());return result;
  }};
}
async function run(){
  const db=memoryDb(),operation='a'.repeat(64),competition={id:'5162',source:'nap',napSource:true,entryStatus:'open',entryDeadlineAt:deadline};
  const input={competitionId:'5162',operation,action:'open',deadline,openingRequested:true};
  await automation.arm(db,input,now);
  assert.equal(db.rows.size,3);
  assert.equal((await automation.arm(db,input,now)).reused,true);
  const opening=automation.eventRef(db,'5162',operation,'opening');
  let pages=0;
  const services={simulation:true,deleteField:()=>deleted,competition:async()=>competition,
    page:async()=>{pages++;return {jobs:[{id:'mail-1'}],done:true,attachmentCount:0};},job:(_event,_comp,job)=>({...job,status:'disabled'})};
  const first=await automation.processEvent(db,opening,services,now);
  assert.equal(first.sentCount,0);assert.equal(first.disabled,true);assert.equal(first.done,true);
  await automation.processEvent(db,opening,services,now);assert.equal(pages,1);
  const closure=automation.eventRef(db,'5162',operation,'closure');
  await automation.processEvent(db,closure,services,now);assert.equal(pages,1,'deadline must be reached');
  competition.entryStatus='closed';
  await automation.processEvent(db,closure,services,deadline);
  assert.equal(db.rows.get(closure.path).preparedCount,0,'existing job is not reset or counted twice');
  assert.equal(db.rows.get('engagementMailJobs/mail-1').status,'disabled');

  // Reopen invalidates a partially prepared closure, even during its page read.
  const second='b'.repeat(64);competition.entryStatus='open';
  await automation.arm(db,{...input,operation:second},now);
  const secondOpening=automation.eventRef(db,'5162',second,'opening');
  const stale=await automation.processEvent(db,secondOpening,{...services,page:async()=>{
    await automation.arm(db,{...input,operation:'c'.repeat(64)},now);
    return {jobs:[{id:'obsolete'}],done:true};
  }},now);
  assert.equal(stale.reason,'superseded');assert.ok(!db.rows.has('engagementMailJobs/obsolete'));

  // Existing open competitions are adopted for closure only and only once.
  const adopted=memoryDb();let seasonReads=0,auth=0;
  const adopter={authorize:async()=>{auth++;},season:async()=>{seasonReads++;return {source:'nap',events:[competition]};}};
  const adoptedResult=await automation.adoptOpenCompetitions(adopted,{season:2027},adopter,now);
  assert.equal(adoptedResult.adopted,1);assert.equal(adoptedResult.openingCount,0);assert.equal(adopted.rows.size,2);
  assert.equal((await automation.adoptOpenCompetitions(adopted,{season:2027},adopter,now)).adopted,0);
  assert.equal(seasonReads,2);assert.equal(auth,2);
  assert.ok([...adopted.rows.values()].every(event=>event.kind!=='opening'));
  await assert.rejects(automation.adoptOpenCompetitions(adopted,{season:2027},{...adopter,authorize:async()=>{throw Error('denied');}},now),/denied/);
  assert.equal(seasonReads,2,'authorization precedes SQL');
  await assert.rejects(automation.arm(db,{...input,competitionId:'legacy-nap-5162'},now),/NAP/);
  await assert.rejects(automation.arm(db,{...input,openingRequested:'true'},now),/Choix/);

  // Changed native data block automatic retries rather than loop forever.
  const blockedDb=memoryDb();await automation.arm(blockedDb,input,now);
  const blockedRef=automation.eventRef(blockedDb,'5162',operation,'opening');
  blockedDb.rows.get(blockedRef.path).sourceHash='original';
  await assert.rejects(automation.processEvent(blockedDb,blockedRef,{...services,page:async()=>({jobs:[],sourceHash:'changed',done:true})},now),/change/);
  assert.equal(blockedDb.rows.get(blockedRef.path).status,'blocked');
  assert.ok(!Object.hasOwn(blockedDb.rows.get(blockedRef.path),'runAt'));
  await automation.resumeBlocked(blockedDb,blockedRef,services,now);
  assert.equal(blockedDb.rows.get(blockedRef.path).generation,1);
  assert.equal(blockedDb.rows.get(blockedRef.path).sourceHash,'');
  assert.equal(blockedDb.rows.get(blockedRef.path).runAt,now);
  assert.equal((await automation.resumeBlocked(blockedDb,blockedRef,services,now)).reused,true);
  console.log('NAP notification automation: lifecycle, replay, stale pages, adoption, authorization and blocked retries passed.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
