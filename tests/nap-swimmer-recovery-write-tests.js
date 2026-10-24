"use strict";
const assert=require("node:assert/strict");
const {recoverSwimmer,transferStatement}=require("../functions/nap-swimmer-recovery");
const {fingerprint}=require("../functions/nap-portal-swimmer-change");
const {hash}=require("../functions/nap-approved-swimmer-correction");
const licenses=require("../functions/nap-license-state");
const before={id:912,nom:"EXEMPLE",prenom:"Test",date:"1980-01-02",sexe:"M",number:"A-05-222647",club:"107",actif:1,wc:null,edf:0,creation:"2020-01-01 00:00:00"};
const input={actorUid:"club-admin",clubId:"106",licenseNumber:before.number,expectedFingerprint:fingerprint(before),mutationId:"11111111-1111-4111-8111-111111111111"};
function fixture() {
  const state={native:{...before},history:[],rows:{perfs:[],perfs_relais:[]},clubs:[106,107,108],queries:[],writes:0,historicalWrites:0,audit:null,allowed:false};
  const connection={execute:async({sql},values=[])=>{
    assert.equal(state.allowed,true);state.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) {if(state.failUnlock) throw Error("unlock failure");return [[{released:1}]];}
    if(sql.includes("FROM nageurs n")) return [[{...state.native}]];
    if(sql.includes(" AS published FROM")) return [state.history];
    if(sql.startsWith("SELECT * FROM")) {
      const table=sql.includes("`perfs_relais`")?"perfs_relais":"perfs";
      const field=sql.match(/WHERE `([^`]+)`/)[1];
      return [state.rows[table].filter(row=>Number(row[field])===912).map(row=>({...row}))];
    }
    if(sql.includes("FROM clubs FORCE INDEX"))return [state.clubs.filter(id=>values.map(Number).includes(id)).map(num_club=>({num_club}))];
    if(sql.startsWith("SELECT") && sql.includes("FROM nageurs WHERE")) return [[{...state.native}]];
    if(sql.includes("information_schema.TRIGGERS")) return [state.trigger?[{}]:[]];
    if(sql.startsWith("EXPLAIN")) return [[{table:"native",key:state.badPlan?null:"PRIMARY",type:state.badPlan?"ALL":"range"}]];
    if(sql.startsWith("UPDATE `perfs")){
      assert.ok(state.audit);assert.equal(state.tableLock,true);
      const table=sql.includes("`perfs_relais`")?"perfs_relais":"perfs";
      const updates=state.audit.performanceClubs.changes.find(change=>change.table===table).updates;
      assert.match(sql,/SET `club`=CASE/);assert.doesNotMatch(sql,/SET `nageur/);
      for(const item of updates){const index=state.rows[table].findIndex(row=>row.id===item.before.id);state.rows[table][index]={...item.after};}
      state.historicalWrites+=updates.length;
      if(state.lostHistoricalResponse){state.lostHistoricalResponse=false;throw Error("historical network uncertain");}
      return [{affectedRows:updates.length}];
    }
    if(sql.startsWith("UPDATE `nageurs`")) {
      assert.ok(state.audit,"durable backup before the native write");assert.equal(hash(state.audit.before),hash(before));
      assert.equal(state.tableLock,true);assert.match(sql,/SET `club`=CASE/);
      for(const change of state.audit.performanceClubs.changes)for(const item of change.updates)assert.deepEqual(state.rows[change.table].find(row=>row.id===item.after.id),item.after,"historical clubs fixed before identity transfer");
      if(state.concurrentResult || state.concurrentClub) return [{affectedRows:0}];
      state.native.club="106";state.writes++;
      if(state.lostResponse) {state.lostResponse=false;throw Error("network uncertain");}
      return [{affectedRows:1}];
    }
    throw Error(`Unexpected ${sql}`);
  },query:async({sql})=>{
    if(sql.startsWith("LOCK TABLES")){if(state.failLock)throw Error("uncertain lock");state.tableLock=true;assert.match(sql,/perfs_relais WRITE/);return [];}
    if(state.failTableUnlock)throw Error("uncertain unlock");state.tableLock=false;return [];
  },release:()=>{state.released=true;},destroy:()=>{state.destroyed=true;}};
  state.run=(patch={},authorize=()=>{state.allowed=true;})=>recoverSwimmer({getConnection:async()=>connection},{...input,...patch},{
    read:async()=>state.audit,
    prepare:async(operation,plan)=>{if(state.failBackup) throw Error("backup unavailable");state.audit=structuredClone(plan);},
    complete:async()=>{if(state.failComplete) throw Error("journal unavailable");state.done=true;}
  },authorize);
  return state;
}
(async()=>{
  const denied=fixture();await assert.rejects(denied.run({},()=>{throw Error("denied");}),/denied/);assert.equal(denied.queries.length,0);
  const success=fixture();let result=await success.run();assert.equal(result.source,"nap");assert.equal(success.writes,1);assert.equal(success.done,true);assert.ok(success.queries.length<=50);assert.deepEqual(success.native,{...before,club:"106"});
  result=await success.run();assert.equal(result.alreadyApplied,true);assert.equal(success.writes,1);
  for(const tweak of [s=>s.failBackup=true,s=>s.busy=true,s=>s.trigger=true,s=>s.badPlan=true,s=>s.concurrentResult=true,s=>s.concurrentClub=true,s=>s.history=[{id:1,nageur:912,competition_id:5162,date:licenses.seasonInfo(licenses.currentSeason()).startDate,published:1}],s=>s.history=Array(2001).fill({})]) {
    const blocked=fixture();tweak(blocked);await assert.rejects(blocked.run());assert.equal(blocked.writes,0);
  }
  for(const tweak of [s=>s.lostResponse=true,s=>s.failComplete=true]) {
    const interrupted=fixture();tweak(interrupted);await assert.rejects(interrupted.run());assert.equal(interrupted.writes,1);
    interrupted.failComplete=false;await interrupted.run();assert.equal(interrupted.writes,1);assert.equal(interrupted.done,true);
  }
  const changed=fixture();changed.failBackup=true;await assert.rejects(changed.run());changed.failBackup=false;changed.native.nom="Correction";await assert.rejects(changed.run(),/fiche a change/);assert.equal(changed.writes,0);
  const journal=fixture();journal.failComplete=true;await assert.rejects(journal.run());journal.audit.after.nom="Different";await assert.rejects(journal.run(),/Sauvegarde/);assert.equal(journal.writes,1);
  const locked=fixture();locked.failUnlock=true;await locked.run();assert.equal(locked.destroyed,true);assert.equal(locked.released,undefined);
  for(const patch of [{mutationId:"invalid"},{expectedFingerprint:""},{licenseNumber:""},{clubId:"106 OR 1=1"}]) {const bad=fixture();await assert.rejects(bad.run(patch),TypeError);assert.equal(bad.queries.length,0);}
  assert.throws(()=>transferStatement(before,{...before,club:"106",nom:"Other"},{}),TypeError);
  const historical=fixture();historical.rows.perfs=[{id:1,nageur:912,club:"9999",temps:123},{id:2,nageur:912,club:"108",temps:456},{id:3,nageur:912,club:null,temps:789}];historical.rows.perfs_relais=[{id:4,nageur1:15,nageur2:912,nageur3:912,nageur4:19,club:"0",temps:321}];
  const original=structuredClone(historical.rows);result=await historical.run();assert.equal(result.historicalClubUpdateCount,3);assert.equal(historical.historicalWrites,3);assert.equal(historical.rows.perfs[1].club,"108");
  assert.deepEqual(historical.rows,{perfs:original.perfs.map(row=>({...row,club:row.id===2?"108":"107"})),perfs_relais:original.perfs_relais.map(row=>({...row,club:"107"}))});
  await historical.run();assert.equal(historical.historicalWrites,3);assert.equal(historical.writes,1);
  const unknown=fixture();unknown.clubs=[106,108];unknown.rows.perfs=[{id:1,nageur:912,club:null}];await unknown.run();assert.equal(unknown.rows.perfs[0].club,null);assert.equal(unknown.historicalWrites,0);
  const interruptedHistory=fixture();interruptedHistory.rows.perfs=[{id:1,nageur:912,club:"999"}];interruptedHistory.lostHistoricalResponse=true;await assert.rejects(interruptedHistory.run());assert.equal(interruptedHistory.writes,0);await interruptedHistory.run();assert.equal(interruptedHistory.historicalWrites,1);assert.equal(interruptedHistory.writes,1);
  const altered=fixture();altered.rows.perfs=[{id:1,nageur:912,club:"999"}];altered.lostHistoricalResponse=true;await assert.rejects(altered.run());altered.rows.perfs[0].temps=9;await assert.rejects(altered.run(),/liens ont change/);assert.equal(altered.writes,0);
  const old=fixture();await old.run();delete old.audit.performanceClubs;await old.run();assert.equal(old.writes,1);old.native.club="107";await assert.rejects(old.run(),/Ancienne recuperation/);
  for(const key of ["failLock","failTableUnlock"]){const uncertain=fixture();uncertain[key]=true;await assert.rejects(uncertain.run());assert.equal(uncertain.destroyed,true);}
  const oversized=fixture();oversized.rows.perfs=Array.from({length:4001},(_,i)=>({id:i+1,nageur:912,club:null}));await assert.rejects(oversized.run(),/volumineux/);assert.equal(oversized.writes,0);assert.equal(oversized.audit,null);
  const backupFailure=fixture();backupFailure.rows.perfs=[{id:1,nageur:912,club:null}];backupFailure.failBackup=true;await assert.rejects(backupFailure.run());assert.equal(backupFailure.historicalWrites,0);assert.equal(backupFailure.writes,0);
  const damaged=fixture();damaged.failComplete=true;await assert.rejects(damaged.run());damaged.audit.performanceClubs.hash="damaged";await assert.rejects(damaged.run(),/Sauvegarde/);
  const largeBackup=fixture();largeBackup.rows.perfs=[{id:1,nageur:912,club:null,raw:"x".repeat(260000)}];await assert.rejects(largeBackup.run(),/volumineuse/);assert.equal(largeBackup.historicalWrites,0);assert.equal(largeBackup.audit,null);
  console.log("NAP recovery: historical clubs frozen before transfer, known/unknown clubs, relay deduplication, audit, bounded reads, concurrent changes and interrupted retries verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
