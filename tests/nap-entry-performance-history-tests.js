"use strict";
const assert=require("node:assert/strict");
const {historyStatement,readEntryHistory}=require("../functions/nap-entry-performance-history");
const people=[{id:"1",firstName:"Exemple",lastName:"TEST",birthDate:"1990-01-01",sex:"M",identityKey:"TEST|EXEMPLE|1990-01-01"},{id:"2",birthDate:"1991-01-01",sex:"F"}];
const row={id:10,nageur:1,course:"100SF",cat:"S",tps:"14200",passage:0,relais:0,competition_id:5140,date:"2026-10-07",bassin:50,chrono:"E",ld:0};
const query=historyStatement(people);
assert.deepEqual(query.values,[1,2]);assert.match(query.sql,/FORCE INDEX \(nageur\)/);assert.match(query.sql,/LIMIT 20001$/);assert.equal((query.sql.match(/\?/g)||[]).length,2);
assert.throws(()=>historyStatement([...people,people[0]]));assert.throws(()=>historyStatement([]));
(async()=>{
  let calls=0;
  const rows=await readEntryHistory({execute:async()=>{calls++;return [[row]];}},people);
  assert.equal(calls,1);assert.equal(rows.get("1")[0].time,"1:42.00");assert.deepEqual(rows.get("2"),[]);assert.equal(row.tps,"14200");
  for (const course of ["25SF","25AP"]) {
    const short={...row,course,tps:"1200"};
    assert.equal(require("../functions/nap-direct-swimmer").performanceRow(short,people[0]),null,"25 m remain excluded from public swimmer profiles");
    assert.equal(require("../functions/nap-performance-normalization").CURRENT_POOL_COURSES.includes(course),false,"25 m remain excluded from public TOP");
    const entryRows=await readEntryHistory({execute:async()=>[[short]]},people);
    assert.equal(entryRows.get("1")[0].course,course);
    assert.equal(entryRows.get("1")[0].timeValue,1200);
  }
  await assert.rejects(()=>readEntryHistory({execute:async()=>[[{...row,nageur:3}]]},people));
  await assert.rejects(()=>readEntryHistory({execute:async()=>[[row,row]]},people));
  await assert.rejects(()=>readEntryHistory({execute:async()=>[Array.from({length:2001},(_,i)=>({...row,id:i+1}))]},people),RangeError);
  await assert.rejects(()=>readEntryHistory({execute:async()=>[Array(20001).fill(row)]},people),RangeError);
  console.log("NAP grouped entry history tests passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
