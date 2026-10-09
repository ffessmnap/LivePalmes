"use strict";
const assert=require("node:assert/strict");
const {recoverSwimmer,transferStatement}=require("../functions/nap-swimmer-recovery");
const {fingerprint}=require("../functions/nap-portal-swimmer-change");
const {hash}=require("../functions/nap-approved-swimmer-correction");
const licenses=require("../functions/nap-license-state");
const before={id:912,nom:"EXEMPLE",prenom:"Test",date:"1980-01-02",sexe:"M",number:"A-05-222647",club:"107",actif:1,wc:null,edf:0,creation:"2020-01-01 00:00:00"};
const input={actorUid:"club-admin",clubId:"106",licenseNumber:before.number,expectedFingerprint:fingerprint(before),mutationId:"11111111-1111-4111-8111-111111111111"};
function fixture() {
  const state={native:{...before},history:[],queries:[],writes:0,audit:null,allowed:false};
  const connection={execute:async({sql},values=[])=>{
    assert.equal(state.allowed,true);state.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) {if(state.failUnlock) throw Error("unlock failure");return [[{released:1}]];}
    if(sql.includes("FROM nageurs n")) return [[{...state.native}]];
    if(sql.includes(" AS published FROM")) return [state.history];
    if(sql.startsWith("SELECT") && sql.includes("FROM nageurs WHERE")) return [[{...state.native}]];
    if(sql.includes("information_schema.TRIGGERS")) return [state.trigger?[{}]:[]];
    if(sql.startsWith("EXPLAIN")) return [[{table:"n",key:"PRIMARY"},{table:"perfs",key:state.badPlan?null:"nageur"},{table:"perfs",key:"nageur"}]];
    if(sql.startsWith("UPDATE nageurs")) {
      assert.ok(state.audit,"durable backup before the native write");assert.equal(hash(state.audit.before),hash(before));
      assert.equal(values[0],"106");assert.match(sql,/COUNT\(\*\).*<=2000/);assert.equal((sql.match(/LIMIT 2001/g)||[]).length,2);
      assert.match(sql,/c.date IS NULL/);assert.match(sql,/livepalmes_performance_visibility/);assert.match(sql,/EXISTS \(SELECT 1 FROM clubs/);
      if(state.concurrentResult || state.concurrentClub) return [{affectedRows:0}];
      state.native.club="106";state.writes++;
      if(state.lostResponse) {state.lostResponse=false;throw Error("network uncertain");}
      return [{affectedRows:1}];
    }
    throw Error(`Unexpected ${sql}`);
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
  const success=fixture();let result=await success.run();assert.equal(result.source,"nap");assert.equal(success.writes,1);assert.equal(success.done,true);assert.equal(success.queries.length,10);assert.deepEqual(success.native,{...before,club:"106"});
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
  console.log("NAP recovery write: only club changes, durable backup, indexed atomic season guards, concurrent changes, uncertain response and idempotent retry verified without network.");
})().catch(error=>{console.error(error);process.exitCode=1;});
