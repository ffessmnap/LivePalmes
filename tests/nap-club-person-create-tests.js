"use strict";
const assert=require("node:assert/strict");
const {creation,createNativePerson}=require("../functions/nap-club-person-create");
const {columns}=require("../functions/nap-approved-people-schema");
const {OPTION_COLUMNS}=require("../functions/nap-club-people");
const input={clubId:"106",actorUid:"club-admin",creationId:"11111111-1111-4111-8111-111111111111",person:{firstName:"Test",lastName:"EXEMPLE",birthDate:"1980-01-03",roles:{teamLeader:true,official:false}}};
function fixture() {
  const s={allowed:false,audit:null,native:null,options:null,nativeWrites:0,optionsWrites:0,queries:[],peers:[],checkpoints:0};
  const conn={execute:async({sql},values=[])=>{
    assert.equal(s.allowed,true);s.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:s.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{released:1}]];
    if(sql.includes("information_schema.TABLES")) return [[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
    if(sql.includes("information_schema.COLUMNS")) return [columns.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""}))];
    if(sql.includes("information_schema.STATISTICS")) return [Object.entries({PRIMARY:["source","person_id"],club_person:["club_id","source","person_id"]}).flatMap(([INDEX_NAME,names])=>names.map((COLUMN_NAME,i)=>({INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:i+1,NON_UNIQUE:INDEX_NAME==="PRIMARY"?0:1,SUB_PART:null})))];
    if(sql.includes("TRIGGERS")) return [s.trigger?[{}]:[]];
    if(sql.startsWith("SELECT num_club")) return [s.noClub?[]:[{num_club:106}]];
    if(sql.includes("FORCE INDEX")) return [s.peers];
    if(sql.startsWith("INSERT INTO officiels")) {
      assert.equal(s.audit.phase,"writing","intent persisted before insertion");assert.deepEqual(values,["EXEMPLE","Test","1980-01-03","106","106"]);
      if(s.zeroRows) return [{affectedRows:0,insertId:0}];
      s.native={id:99,...s.audit.proposed.native};s.nativeWrites++;
      if(s.lostInsertResponse) throw Error("network uncertain");
      return [{affectedRows:1,insertId:99}];
    }
    if(sql.startsWith("SELECT") && sql.includes("FROM officiels")) return [s.native?[{...s.native}]:[]];
    if(sql.startsWith("INSERT INTO livepalmes_club_people_options")) {
      assert.equal(s.audit.phase,"identified");
      if(s.failOptions) {s.failOptions=false;throw Error("options interrupted");}
      if(s.options) throw Object.assign(Error("duplicate"),{code:"ER_DUP_ENTRY"});
      s.options=Object.fromEntries(OPTION_COLUMNS.map((key,i)=>[key,values[i]]));s.optionsWrites++;return [{affectedRows:1}];
    }
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_club_people_options")) return [s.options?[{...s.options}]:[]];
    throw Error(`Unexpected statement ${sql}`);
  },release:()=>{s.released=true;},destroy:()=>{s.destroyed=true;}};
  s.run=(data=input,authorize=()=>{s.allowed=true;})=>createNativePerson({getConnection:async()=>conn},data,{
    read:async()=>s.audit,
    prepare:async(_,plan)=>{s.audit=structuredClone(plan);},
    checkpoint:async(_,plan)=>{s.checkpoints++;if(s.failIdCheckpoint && plan.phase==="identified") throw Error("checkpoint interrupted");s.audit=structuredClone(plan);},
    complete:async()=>{if(s.failComplete) throw Error("audit interrupted");s.done=true;}
  },authorize);
  return s;
}
(async()=>{
  const denied=fixture();await assert.rejects(denied.run(input,()=>{throw Error("denied");}),/denied/);assert.equal(denied.queries.length,0);
  const s=fixture(),result=await s.run();assert.equal(s.nativeWrites,1);assert.equal(s.optionsWrites,1);assert.equal(s.done,true);assert.ok(s.queries.length<=12);assert.equal(result.person.licenseNumber,"");assert.deepEqual(result.person.roles,{teamLeader:true,official:false});assert.equal(result.person.active,true);assert.equal(result.person.nativePersonId,"99");
  await s.run();assert.equal(s.nativeWrites,1);assert.equal(s.optionsWrites,1,"retry never creates another identity or replaces roles");
  for(const tweak of [s=>s.noClub=true,s=>s.busy=true,s=>s.trigger=true,s=>s.peers=[{id:7,...creation(input).native}],s=>s.peers=Array(801).fill({})]) {const bad=fixture();tweak(bad);await assert.rejects(bad.run());assert.equal(bad.nativeWrites,0);}
  for(const tweak of [s=>s.lostInsertResponse=true,s=>s.failIdCheckpoint=true]) {const uncertain=fixture();tweak(uncertain);await assert.rejects(uncertain.run());assert.equal(uncertain.nativeWrites,1);await assert.rejects(uncertain.run(),/identifiant non confirme/);assert.equal(uncertain.nativeWrites,1);}
  const interrupted=fixture();interrupted.failOptions=true;await assert.rejects(interrupted.run(),/interrupted/);assert.equal(interrupted.nativeWrites,1);await interrupted.run();assert.equal(interrupted.nativeWrites,1);assert.equal(interrupted.optionsWrites,1);assert.equal(interrupted.done,true);
  const completed=fixture();completed.failComplete=true;await assert.rejects(completed.run(),/interrupted/);completed.failComplete=false;await completed.run();assert.equal(completed.nativeWrites,1);assert.equal(completed.optionsWrites,1);
  const changed=fixture();changed.failOptions=true;await assert.rejects(changed.run());changed.native.nom="Correction IntraNAP";await assert.rejects(changed.run(),/fiche creee a change/);assert.equal(changed.optionsWrites,0);
  const zero=fixture();zero.zeroRows=true;await assert.rejects(zero.run(),/aucune personne creee/);assert.equal(zero.nativeWrites,0);assert.equal(zero.audit.phase,"prepared");
  for(const data of [{...input,creationId:"invalid"},{...input,person:{...input.person,licenseNumber:"A-12-123"}},{...input,person:{...input.person,birthDate:""}},{...input,person:{...input.person,birthDate:"2026-02-30"}},{...input,person:{...input.person,roles:{teamLeader:false,official:false}}}]) assert.throws(()=>creation(data),TypeError);
  console.log("Creation personne NAP : chef sans role officiel, droits, sauvegarde, doublon, insertion incertaine non repetee, reprise des roles et aucun engagement cree verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
