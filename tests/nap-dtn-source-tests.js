"use strict";
const assert=require("node:assert/strict"),source=require("../functions/nap-dtn-source");
function raw(id,extra={}) {return {id,course:"100SF",cat:"J",tps:"14200",passage:0,relais:0,competition_id:1,libelle:"Competition",lieu:"Lieu",date:"2026-01-02",bassin:50,chrono:"E",ld:0,swimmer_id:1,nom:"Example",prenom:"Test",birth_date:"2010-01-01",sexe:"F",swimmer_club:"106",selected_club:106,abre_club:"CLUB",...extra};}
function pool(rows,unsafe=false) {
  const state={connections:0,reads:0,released:0,statements:[]};
  const connection={execute:async(query,values)=>{state.statements.push(query.sql);assert.equal((query.sql.match(/\?/g)||[]).length,values.length);if(query.sql.startsWith("EXPLAIN")) return [[{table:"p",type:unsafe?"ALL":"range",key:unsafe?null:"livepalmes_compet_id",rows:5}]];state.reads++;return [rows];},release:()=>state.released++};
  return {state,getConnection:async()=>{state.connections++;return connection;}};
}
(async()=>{
  const p=pool([raw(1),raw(2,{tps:"000000"}),raw(3,{swimmer_id:null})]);
  const input={year:2026,competitionIds:[1]};
  await assert.rejects(()=>source.readPage(p,input,async()=>{throw new Error("Denied");}),/Denied/);assert.equal(p.state.connections,0);
  const page=await source.readPage(p,input,async()=>{});assert.equal(page.rows.length,1);assert.equal(page.rows[0].time,"1:42.00");assert.equal(page.rows[0].timeValue,10200);assert.equal(page.rows[0].swimmerId,"1");assert.equal(page.rows[0].source,"nap");assert.equal(page.excludedRows,2);assert.equal(page.scannedRows,3);assert.equal(p.state.released,1);
  const many=pool(Array.from({length:501},(_,i)=>raw(i+1)));
  const first=await source.readPage(many,input,async()=>{});assert.equal(first.rows.length,500);assert.equal(first.hasMore,true);assert.equal(first.cursor.performanceId,500);
  const second=await source.readPage(pool([raw(501)]),{...input,cursor:first.cursor},async()=>{});assert.equal(second.scannedRows,501);assert.equal(second.hasMore,false);
  const unsafe=pool([],true);await assert.rejects(()=>source.readPage(unsafe,input,async()=>{}),/Plan/);assert.equal(unsafe.state.reads,0);assert.equal(unsafe.state.released,1);
  await assert.rejects(()=>source.readPage(pool(Array.from({length:501},(_,i)=>raw(i+1))),{...input,cursor:{competitionId:1,performanceId:1,scannedRows:99500}},async()=>{}),/borne/);
  await assert.rejects(()=>source.readPage(pool([raw(2),raw(1)]),input,async()=>{}),/Ordre/);
  assert.throws(()=>source.statement(2026,null,["1 OR 1=1"]),/Competitions/);
  assert.throws(()=>source.cursor({competitionId:1,performanceId:1,scannedRows:100000},2026),/Pagination/);
  assert.ok(p.state.statements.every(sql=>/^(?:EXPLAIN )?SELECT /.test(sql)),"No writes, exports or abandoned database");
  let metadataReads=0;
  const calendar={execute:async(query,values)=>{
    assert.deepEqual(values,["2025-09-01","2026-08-31"]);
    assert.match(query.sql,/FORCE INDEX \(livepalmes_date_id\)/);
    assert.match(query.sql,/LIMIT 1201/);
    metadataReads++;
    return [query.sql.startsWith("EXPLAIN")?[{table:"competitions",type:"range",key:"livepalmes_date_id",rows:2}]:[{id:3},{id:1}]];
  }};
  await assert.rejects(()=>source.readCompetitionIds(calendar,2026,async()=>{throw new Error("Denied");}),/Denied/);
  assert.equal(metadataReads,0);
  assert.deepEqual(await source.readCompetitionIds(calendar,2026,async()=>{}),[3,1]);
  assert.equal(metadataReads,2);
  const overflow={execute:async(query)=>[query.sql.startsWith("EXPLAIN")?[{type:"range",key:"livepalmes_date_id"}]:Array.from({length:1201},(_,i)=>({id:i+1}))]};
  await assert.rejects(()=>source.readCompetitionIds(overflow,2026,async()=>{}),/volumineuse/);
  const empty={execute:async(query)=>[query.sql.startsWith("EXPLAIN")?[{type:"range",key:"livepalmes_date_id"}]:[]]};
  assert.deepEqual(await source.readCompetitionIds(empty,2026,async()=>{}),[]);
  console.log("DTN native source: auth before SQL, parameterized grouped pages, raw compact times, native identities, cursor order and no partial overflow verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
