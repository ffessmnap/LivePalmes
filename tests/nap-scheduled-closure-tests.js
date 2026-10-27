"use strict";
const assert=require('node:assert/strict');
const automation=require('../functions/nap-notification-automation');
const tasks=require('../functions/nap-notification-task');
const deleted=Symbol('delete');
function fixture(){
  const rows=new Map();let reads=0;
  const apply=(ref,data,merge)=>{const next=merge?{...rows.get(ref.path)}:{};for(const [key,value]of Object.entries(data)){if(value===deleted)delete next[key];else next[key]=structuredClone(value);}rows.set(ref.path,next);};
  const snap=ref=>{reads++;return {exists:rows.has(ref.path),data:()=>structuredClone(rows.get(ref.path))};};
  const db={rows,get reads(){return reads;},collection:name=>({doc:id=>{const ref={id,path:`${name}/${id}`,get:async()=>snap(ref),set:async(data,opts)=>apply(ref,data,opts?.merge)};return ref;}}),
    runTransaction:async callback=>{const writes=[];const result=await callback({get:async ref=>snap(ref),getAll:async(...refs)=>refs.map(snap),
      create:(ref,data)=>writes.push(()=>{assert.ok(!rows.has(ref.path));apply(ref,data);}),set:(ref,data)=>writes.push(()=>apply(ref,data)),update:(ref,data)=>writes.push(()=>apply(ref,data,true))});writes.forEach(write=>write());return result;}};
  return db;
}
async function run(){
  const start=Date.parse('2026-10-27T09:00:00Z'),deadline='2026-11-11T20:59:00.000Z';let tick=start,prepared=0,delivered=0;
  const db=fixture(),queued=[],ids=new Set();
  const competition={id:'5141',source:'nap',napSource:true,entryStatus:'open',entryDeadlineAt:deadline};
  const services={clock:()=>tick,projectId:'livepalmes',deleteField:()=>deleted,
    enqueue:async(data,options)=>{if(ids.has(options.id)){const error=Error('duplicate');error.code='functions/task-already-exists';throw error;}ids.add(options.id);queued.push({data,options});},
    competition:async()=>competition,page:async()=>{prepared++;return {jobs:[{id:'club-pdf'}],done:true};},job:(_event,_comp,job)=>({...job,status:'ready'}),
    deliver:async()=>{delivered++;return {done:true,sent:1};}};
  const open=async(operation,date=deadline)=>{competition.entryStatus='open';competition.entryDeadlineAt=date;await automation.arm(db,{competitionId:'5141',operation,action:'open',deadline:date,openingRequested:false,newCycle:false,deliveryMode:'bcc-v1'},new Date(tick).toISOString());return automation.eventRef(db,'5141',operation,'closure');};
  const first=await open('a'.repeat(64));const before=db.reads;
  await tasks.enqueue(db,first.id,services);
  assert.equal(db.reads-before,2,'one event and one lifecycle pointer, no list scan');
  assert.equal(queued[0].options.scheduleTime.toISOString(),deadline);assert.equal(prepared,0);assert.equal(delivered,0);
  await tasks.enqueue(db,first.id,services);assert.equal(queued.length,1,'retry preserves the same scheduled task');

  // Move the deadline later, then earlier. Old task dispatches cannot prepare
  // mail, even if they arrive after the replacement closure has become due.
  const laterDate='2026-11-13T21:00:00.000Z',later=await open('b'.repeat(64),laterDate);
  await tasks.enqueue(db,later.id,services);assert.equal(queued.at(-1).options.scheduleTime.toISOString(),laterDate);
  await tasks.run(db,first.id,services);assert.equal(db.rows.get(first.path).status,'cancelled');assert.equal(prepared,0);
  const earlierDate='2026-11-05T22:59:00.000Z',earlier=await open('c'.repeat(64),earlierDate);
  await tasks.enqueue(db,earlier.id,services);assert.equal(queued.at(-1).options.scheduleTime.toISOString(),earlierDate);
  tick=Date.parse(earlierDate);competition.entryStatus='closed';
  await tasks.run(db,later.id,services);assert.equal(prepared,0);assert.equal(db.rows.get(later.path).status,'cancelled');
  await tasks.run(db,earlier.id,services);await tasks.run(db,earlier.id,services);
  assert.equal(prepared,1);assert.equal(delivered,1,'one dispatch and its replay deliver once');

  tick=start;const cancellation=await open('d'.repeat(64));
  await automation.arm(db,{competitionId:'5141',operation:'e'.repeat(64),action:'upcoming'},new Date(tick).toISOString());
  await tasks.enqueue(db,cancellation.id,services);assert.equal(db.rows.get(cancellation.path).status,'cancelled');
  assert.equal(prepared,1,'closed/open lifecycle changes invalidate the task before preparation');

  const distantDate='2027-05-22T21:59:00.000Z',distant=await open('f'.repeat(64),distantDate);
  await tasks.enqueue(db,distant.id,services);const checkpoint=queued.at(-1);
  assert.ok(checkpoint.options.scheduleTime.getTime()>tick);assert.ok(checkpoint.options.scheduleTime.getTime()-tick<=tasks.HORIZON_MS);
  tick+=3600000;await tasks.enqueue(db,distant.id,services);assert.equal(queued.at(-1),checkpoint,'checkpoint is stable across an hourly retry');
  await assert.rejects(tasks.run(db,distant.id,{...services,enqueue:async()=>{throw Error('temporary outage');}}),/reprendre/,'a failed successor must trigger Cloud Tasks retry');
  const beforeCheckpoints=queued.length;
  tick=checkpoint.options.scheduleTime.getTime();await tasks.run(db,distant.id,{...services,projectId:'livepalmes-test'});
  assert.equal(db.rows.get(distant.path).status,'pending','a TEST checkpoint does not cancel its future closure');
  assert.equal(queued.length,beforeCheckpoints+1);assert.ok(queued.at(-1).options.scheduleTime.getTime()>tick);
  while(queued.at(-1).options.scheduleTime.toISOString()!==distantDate){
    tick=queued.at(-1).options.scheduleTime.getTime();await tasks.run(db,distant.id,services);
    assert.ok(queued.at(-1).options.scheduleTime.getTime()-tick<=tasks.HORIZON_MS);
  }
  assert.equal(prepared,1);assert.equal(delivered,1,'no checkpoint prepares or sends mail');
  tick=Date.parse(distantDate);competition.entryStatus='closed';
  await tasks.run(db,distant.id,{...services,projectId:'livepalmes-test'});assert.equal(prepared,1);assert.equal(delivered,1);
  assert.equal(db.rows.get(distant.path).reason,'test-emails-disabled');

  // The existing recovery path remains useful after a temporary enqueue error.
  tick=start;const retry=await open('1'.repeat(64));
  assert.equal((await tasks.enqueue(db,retry.id,{...services,enqueue:async()=>{throw Error('offline');}})).queued,false);
  assert.equal(db.rows.get(retry.path).status,'pending');await tasks.enqueue(db,retry.id,services);
  assert.equal(queued.at(-1).options.scheduleTime.toISOString(),deadline);
  assert.throws(()=>tasks.scheduleAt(NaN,start),/invalide/);
  console.log('Scheduled closures: exact deadline, stable checkpoints, earlier/later edits, obsolete cancellation, no replay, bounded reads, retry and TEST no-send verified offline.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
