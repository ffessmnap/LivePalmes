"use strict";
const assert=require("node:assert/strict");
const {columns}=require("../functions/nap-approved-people-schema");
const {person}=require("../functions/nap-club-people");
const {reference,buildStatusStatement,changeNativePersonStatus,inspectStatusWritePlans}=require("../functions/nap-club-person-status");
const native={id:7,nom:"Ancien",prenom:"Officiel",date:"0000-00-00",club:"00123"};
for(const id of ["", "7", "nap-official-0", "nap-official-2147483648", "nap-official-7 OR 1=1"]) assert.throws(()=>reference(id),TypeError);
function fixture() {
  const state={native:{...native},options:null,writes:0,queries:[],allowed:false,busy:false,triggers:false,cas:false,release:0,audit:null,auditDone:false};
  const connection={execute:async({sql},values=[])=>{
    assert.equal(state.allowed,true);state.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{}]];
    if(sql.includes("information_schema.TABLES")) return [[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
    if(sql.includes("information_schema.COLUMNS")) return [columns.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""}))];
    if(sql.includes("information_schema.STATISTICS")) return [Object.entries({PRIMARY:["source","person_id"],club_person:["club_id","source","person_id"]}).flatMap(([INDEX_NAME,names])=>names.map((COLUMN_NAME,i)=>({INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:i+1,NON_UNIQUE:INDEX_NAME==="PRIMARY"?0:1,SUB_PART:null})))];
    if(sql.includes("TRIGGERS")) return [state.triggers?[{TRIGGER_NAME:"unknown"}]:[]];
    if(sql.startsWith("SELECT") && sql.includes("FROM `officiels`")) return [[state.native]];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_club_people_options")) return [state.options?[state.options]:[]];
    assert.ok(/^(INSERT INTO|UPDATE) livepalmes_club_people_options/.test(sql),"never writes a native identity/entry");
    assert.ok(state.audit,"backup precedes SQL write");
    const statement=buildStatusStatement("officials",state.audit.native,state.audit.before,state.audit.after);
    assert.equal(sql,statement.sql);assert.deepEqual(values,statement.values);
    if(state.cas) return [{affectedRows:0}];
    state.options={...state.audit.after};state.writes++;return [{affectedRows:1}];
  },release:()=>state.release++};
  state.pool={getConnection:async()=>connection};
  state.auditAdapter={read:async()=>state.audit,prepare:async(_,plan)=>{state.audit=JSON.parse(JSON.stringify(plan));},complete:async()=>{if(state.auditFail) throw Error("audit interrupted");state.auditDone=true;}};
  state.input={clubId:"00123",actorUid:"admin",personId:"nap-official-7",active:false,expectedFingerprint:person(state.native,"officials").napFingerprint};
  state.run=(input=state.input,authorize=()=>{state.allowed=true;})=>changeNativePersonStatus(state.pool,input,state.auditAdapter,authorize);
  return state;
}
(async()=>{
  const denied=fixture();await assert.rejects(denied.run(denied.input,()=>{throw Error("denied");}),/denied/);assert.equal(denied.queries.length,0);
  const historical=fixture();await assert.rejects(historical.run({...historical.input,personId:"nap-leader-7"}),/anciennes declarations/);assert.equal(historical.queries.length,0);
  const s=fixture();const result=await s.run();assert.equal(result.person.active,false);assert.equal(result.person.licenseNumber,"");assert.equal(s.writes,1);assert.equal(s.auditDone,true);assert.ok(s.queries.length<=12);assert.deepEqual(s.native,native);
  await s.run();assert.equal(s.writes,1,"same operation retry does not write twice");
  s.audit=null;s.input={...s.input,active:true,expectedFingerprint:result.person.napFingerprint};await s.run();assert.equal(s.options.version,2);assert.equal(s.options.active,1);assert.equal(s.writes,2);
  for(const tweak of [s=>s.native.club="999",s=>s.input.expectedFingerprint="a".repeat(64),s=>s.triggers=true,s=>s.busy=true,s=>s.cas=true]) {const bad=fixture();tweak(bad);await assert.rejects(bad.run());assert.equal(bad.writes,0);assert.equal(bad.release,1);}
  const interrupted=fixture();interrupted.auditFail=true;await assert.rejects(interrupted.run(),/interrupted/);assert.equal(interrupted.writes,1);interrupted.auditFail=false;await interrupted.run();assert.equal(interrupted.writes,1);assert.equal(interrupted.auditDone,true);
  const stale=fixture();await stale.run();stale.native.nom="Change dans IntraNAP";await assert.rejects(stale.run(),/Sauvegarde/);assert.equal(stale.writes,1);
  let scan=false,plans=0;
  const readonly={execute:async({sql})=>{
    if(sql.startsWith("EXPLAIN")) {plans++;return [[{select_type:"SIMPLE",table:"n",type:scan?"ALL":"const",key:scan?null:"PRIMARY",rows:1}]];}
    assert.ok(sql.startsWith("SELECT"),"diagnostic never executes a write");
    if(sql.includes("nageursengager")) return [[{club:native.club}]];
    return [[sql.includes("chefsdequipe")?{...native,compet:5140,pourclub:"0"}:native]];
  }};
  const proof=await inspectStatusWritePlans(readonly);assert.equal(proof.complete,true);assert.equal(proof.writesExecuted,false);assert.equal(plans,4);
  assert.ok(!JSON.stringify(proof).includes(native.nom));scan=true;assert.equal((await inspectStatusWritePlans(readonly)).complete,false);
  console.log("Statut NAP : droits avant lecture, fiche perimee, sauvegarde avant ecriture, CAS natif, aucun engagement modifie et reprise apres interruption verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
