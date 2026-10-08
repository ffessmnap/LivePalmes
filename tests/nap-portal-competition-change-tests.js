"use strict";
const assert=require("node:assert/strict");
const {SPECS,planCompetitionChange,applyCompetitionChange,operationHash,buildStatement}=require("../functions/nap-portal-competition-change");
const native=require("../functions/nap-portal-competitions");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const now=Date.parse("2026-10-06T12:00:00Z");
function fixturePack() {
  const competition={id:5140,libelle:"Competition &amp; historique",lieu:"Antibes",date:"2026-10-11",enddate:null,comite:7,description:"Texte ancien",bassin:50,chrono:"M",ld:0};
  const parameters={id:5000,compet:5140,actif:1,dateactif:"2026-09-30 19:03:01",date_limit:"2026-10-07 21:59:17",officiel:1,nb_lignes:8,mailtxt:null,mailjuges:"",tps_d:null,tps_f:null,niveau:3,saisie:0,relais:0};
  return {source:"nap",readAt:"now",event:{id:"legacy-nap-5140",date:"2026-10-11",competitionType:"pool",level:"national"},nativeParameters:{parameter_id:5000,...parameters},nativeSnapshot:{competition,parameters},courses:[{id:1,course:"50AP",sexe:"F"}],options:null,fees:null,courseOptions:[],committees:[],groups:[],standards:[],detailedProgram:null};
}
const pack=fixturePack();
const input=patch=>({competitionId:"legacy-nap-5140",actorUid:"admin",national:true,expectedFingerprint:fingerprint(pack),patch});
assert.throws(()=>planCompetitionChange(pack,{...input({level:"regional",regionId:"3"}),national:false},now),/reserve au national/);
const transfer=planCompetitionChange(pack,input({level:"regional",regionId:"Ile de France"}),now);
assert.equal(transfer.operations.find(o=>o.table==="competitions").after.comite,3);
assert.equal(transfer.operations.find(o=>o.table==="compet_parametres").after.niveau,1);
assert.equal(transfer.operations.find(o=>o.table==="compet_parametres").after.actif,1);
const international=planCompetitionChange(pack,input({level:"international",regionId:""}),now);
assert.equal(international.operations.find(o=>o.table==="competitions").after.comite,5);
assert.equal(international.operations.find(o=>o.table==="compet_parametres").after.niveau,8);
for(const patch of [{level:"unknown"},{level:"regional",regionId:"garbage"},{level:"national",regionId:"3"},{level:"regional",regionId:"3",nativeNationalLevelCode:4}]) assert.throws(()=>planCompetitionChange(pack,input(patch),now));
const regional={...fixturePack(),event:{...pack.event,level:"regional"},committees:[{id:1,comite:2},{id:2,comite:3}]};
const regionalInput=patch=>({...input(patch),national:false,expectedFingerprint:fingerprint(regional)});
const invitations=planCompetitionChange(regional,regionalInput({invitedRegionIds:["Ile de France","Grand Est"]}),now);
assert.deepEqual(invitations.operations.find(o=>o.table==="compet_comites").after,[1,3]);
assert.deepEqual(invitations.operations.find(o=>o.table==="compet_comites").before,regional.committees);
assert.equal(invitations.operations.some(o=>o.table==="competitions"||o.table==="compet_parametres"),false);
for(const committees of [[{id:1,comite:99}],[{id:1,comite:2},{id:2,comite:2}]]) {const legacy={...regional,committees};assert.throws(()=>planCompetitionChange(legacy,{...regionalInput({invitedRegionIds:[]}),expectedFingerprint:fingerprint(legacy)},now),/ancienne|doublon/);}
const openPack={...regional,committees:[{id:1,comite:2},{id:2,comite:19}]};
const openPlan=planCompetitionChange(openPack,{...regionalInput({invitedRegionIds:["Grand Est"]}),expectedFingerprint:fingerprint(openPack)},now);
assert.deepEqual(openPlan.operations.find(o=>o.table==="compet_comites").after,[1,19],"Unused native Open must remain unchanged while regions can be edited");
const nationalKind=planCompetitionChange(pack,input({nativeNationalLevelCode:4}),now);
assert.deepEqual(nationalKind.operations.map(o=>o.table),["compet_parametres"]);
assert.equal(nationalKind.operations[0].after.niveau,4);
for(const key of SPECS.compet_parametres.columns.filter(k=>k!=="niveau")) assert.deepEqual(nationalKind.operations[0].after[key],pack.nativeSnapshot.parameters[key]);
assert.throws(()=>planCompetitionChange(pack,{...input({nativeNationalLevelCode:4}),national:false},now),/administration nationale/);
for(const value of [0,1,6,8,99,"4"]) assert.throws(()=>planCompetitionChange(pack,input({nativeNationalLevelCode:value}),now),/invalide/);
for(const change of [{event:{...pack.event,level:"regional"}},{event:{...pack.event,competitionType:"training"}},{nativeSnapshot:{...pack.nativeSnapshot,parameters:{...pack.nativeSnapshot.parameters,niveau:99}}}]) {
 const legacy={...pack,...change};assert.throws(()=>planCompetitionChange(legacy,{...input({nativeNationalLevelCode:4}),expectedFingerprint:fingerprint(legacy)},now),/administration nationale/);
}
const period=planCompetitionChange(pack,input({qualificationStartDate:"2025-09-01",qualificationEndDate:"2026-08-31"}),now);
assert.equal(period.operations[0].after.tps_d,"2025-09-01");assert.equal(period.operations[0].after.tps_f,"2026-08-31");assert.equal(period.operations[0].after.saisie,0);assert.equal(period.operations[0].after.actif,1);
assert.throws(()=>planCompetitionChange(pack,input({qualificationStartDate:"2026-09-01",qualificationEndDate:"2025-08-31"}),now),/Periode/);
// Client patches must preserve untouched native settings and express an explicit switch to all times.
const portalSource=require("node:fs").readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const clientStart=portalSource.indexOf("  function nativeCompetitionFormValues()");
const clientSource=portalSource.slice(clientStart,portalSource.indexOf("  async function saveNativeCompetitionDetail",clientStart));
const clientFields={qualificationMode:{value:"period"},qualificationStart:{value:"2025-09-01"},qualificationEnd:{value:"2026-08-31"}};
const client={elements:{engagementsEditNationalKindLabel:{hidden:false},engagementsEditNationalKind:{value:"3",disabled:false}},editCompetitionFields:()=>clientFields,selectedEngagementFeesFromForm:()=>({enabled:false}),selectedEngagementProgramSessionsFromForm:()=>[],nativeCompetitionEditBaseline:null};
require("node:vm").createContext(client);require("node:vm").runInContext(clientSource,client);
client.nativeCompetitionEditBaseline=client.nativeCompetitionFormValues();
client.elements.engagementsEditNationalKind.value="4";
assert.deepEqual(JSON.parse(JSON.stringify(client.nativeCompetitionPatchFromForm())),{nativeNationalLevelCode:4});
client.elements.engagementsEditNationalKind.value="3";clientFields.qualificationMode.value="all";
assert.deepEqual(JSON.parse(JSON.stringify(client.nativeCompetitionPatchFromForm())),{qualificationStartDate:"",qualificationEndDate:""});
client.elements.engagementsEditNationalKindLabel.hidden=true;
assert.equal(Object.hasOwn(client.nativeCompetitionFormValues(),"nativeNationalLevelCode"),false);
const timePack=fixturePack();timePack.nativeParameters.saisie=1;timePack.nativeSnapshot.parameters.saisie=1;
const timeInput={...input({missingEntryTimeMode:"forbidden"}),expectedFingerprint:fingerprint(timePack)};
const modePlan=planCompetitionChange(timePack,timeInput,now);
assert.deepEqual(modePlan.operations.map(o=>o.table),["compet_parametres"]);
assert.equal(modePlan.operations[0].after.saisie,-1);
assert.equal(modePlan.operations[0].after.actif,1,"setting a time choice must not close the competition");
assert.equal(timePack.nativeSnapshot.parameters.saisie,1);
assert.equal(planCompetitionChange(pack,input({missingEntryTimeMode:"manual"}),now).operations[0].after.saisie,1);
for (const patch of [{qualif:1},{saisie:-1}]) {
  const blocked={...timePack,nativeParameters:{...timePack.nativeParameters,...patch}};
  assert.equal(planCompetitionChange(blocked,{...timeInput,expectedFingerprint:fingerprint(blocked)},now).operations[0].after.saisie,-1);
}
assert.throws(()=>planCompetitionChange(timePack,{...timeInput,patch:{missingEntryTimeMode:"invented"}},now),/invalide/);
assert.throws(()=>planCompetitionChange(timePack,{...timeInput,patch:{missingEntryTimeMode:"constructor"}},now),/invalide/);
const close=planCompetitionChange(pack,input({entryStatus:"closed"}),now);
assert.deepEqual(close.operations.map(o=>o.table),["compet_parametres","livepalmes_competition_options"]);
assert.equal(close.operations[0].after.actif,0);
assert.equal(close.operations[0].after.date_limit,"2026-10-07 21:59:17");
assert.equal(close.operations[0].after.dateactif,pack.nativeSnapshot.parameters.dateactif);
assert.equal(close.operations[1].after.entry_closed,1);
assert.equal(close.operations[1].after.updated_at,"2026-10-06 12:00:00.000000");
const rename=planCompetitionChange(pack,input({name:"Nom corrige"}),now);
const renameSql=buildStatement(rename.operations[0],{competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters});
assert.ok(renameSql.sql.includes("EXISTS (SELECT 1 FROM `compet_parametres` scope_p"));
assert.ok(!renameSql.sql.includes("FROM `competitions`"),"No same-target subquery");
assert.equal((renameSql.sql.match(/\?/g)||[]).length,renameSql.values.length);
const closeInsert=buildStatement(close.operations[1],{competitions:pack.nativeSnapshot.competition,compet_parametres:close.operations[0].after});
assert.ok(closeInsert.sql.includes("FROM DUAL WHERE EXISTS"));
assert.ok(closeInsert.sql.includes("scope_c.`id`=?") && closeInsert.sql.includes("scope_p.`id`=?"));
assert.equal((closeInsert.sql.match(/\?/g)||[]).length,closeInsert.values.length);
assert.equal(rename.operations.length,1); assert.equal(rename.operations[0].after.enddate,null);
assert.equal(rename.operations[0].after.comite,7); assert.equal(rename.operations[0].after.chrono,"M");
const fees=planCompetitionChange(pack,input({fees:{enabled:true,swimmerFee:1.25,individualEventFee:2.50,relayFee:3,helloAssoUrl:"https://www.helloasso.com/test"}}),now);
assert.equal(fees.operations[0].after.swimmer_fee,"1.25");
const rawProgram=[{id:"session-1",date:"2026-10-11",startTime:"09:30",items:[{eventCode:"50AP",genderMode:"female",phase:"direct"}]}];
const programPlan=planCompetitionChange(pack,{...input({programSessions:rawProgram}),eventDefinitions:new Map([["50AP",{code:"50AP"}]]),normalizeProgram:raw=>structuredClone(raw)},now);
assert.deepEqual(programPlan.operations.map(operation=>operation.table),["livepalmes_competition_programs"]);
assert.deepEqual(programPlan.operations[0].after.program_sessions,rawProgram);
const retiredPack={...pack,courses:[],detailedProgram:programPlan.operations[0].after};
const repairedProgram=planCompetitionChange(retiredPack,{...input({programSessions:[]}),expectedFingerprint:fingerprint(retiredPack),eventDefinitions:new Map([["50AP",{code:"50AP"}]]),normalizeProgram:raw=>raw},now);
assert.deepEqual(repairedProgram.operations[0].after.program_sessions,[]);
assert.throws(()=>planCompetitionChange(retiredPack,{...input({programSessions:[]}),expectedFingerprint:fingerprint(retiredPack),eventDefinitions:new Map(),normalizeProgram:raw=>raw},now),/ancienne/);
assert.equal(pack.nativeSnapshot.parameters.actif,1);assert.equal(pack.courses.length,1);
assert.throws(()=>planCompetitionChange(pack,{...input({programSessions:rawProgram}),normalizeProgram:raw=>raw},now),/ancienne/);
for(const patch of [{level:"regional"},{name:""},{location:"x".repeat(65)},{date:"2026-02-30"},{entryDeadlineLocal:"2026-10-25 02:30:00"},{entryStatus:"wrong"},{poolLaneCount:20},{fees:{enabled:true,swimmerFee:1.001,individualEventFee:0,relayFee:0}}]) assert.throws(()=>planCompetitionChange(pack,input(patch),now),TypeError);
assert.throws(()=>planCompetitionChange(pack,{...input({name:"New"}),expectedFingerprint:"0".repeat(64)},now), /a change/);
assert.throws(()=>planCompetitionChange(pack,input({date:"2026-10-12",endDate:"2026-10-11"}),now),/date de fin/);
assert.throws(()=>planCompetitionChange(pack,input({entryStatus:"open",entryDeadlineLocal:"2026-10-05 21:59:00"}),now),/future/);
assert.equal(operationHash(input({name:"A",fees:{enabled:false,swimmerFee:0}})),operationHash(input({fees:{swimmerFee:0,enabled:false},name:"A"})));
function fixture(settings={}) {
  const tables=new Map([["competitions",structuredClone(pack.nativeSnapshot.competition)],["compet_parametres",structuredClone(pack.nativeSnapshot.parameters)]]);
  const state={writes:[],prepared:0,completed:0,released:0,saved:null,tables,failInsert:settings.failInsert};
  state.pool={getConnection:async()=>({release:()=>state.released++,execute:async({sql},values=[])=>{
    if(sql.startsWith("SELECT")) { const table=sql.match(/FROM `([^`]+)`/)[1]; return [tables.has(table)?[structuredClone(tables.get(table))]:[]]; }
    const table=sql.match(/(?:UPDATE|INSERT INTO) `([^`]+)`/)[1];
    if(sql.startsWith("UPDATE")) {
      const columns=[...sql.split(" WHERE ")[0].matchAll(/`([^`]+)`=\?/g)].map(m=>m[1]);
      assert.ok(sql.includes(`WHERE \`${SPECS[table].key}\`=? AND`),"Indexed primary-key write required"); assert.ok(sql.endsWith("LIMIT 1"));
      if(settings.race) return [{affectedRows:0}];
      const row=tables.get(table); columns.forEach((key,i)=>row[key]=values[i]); state.writes.push(table); return [{affectedRows:1}];
    }
    assert.ok(table.startsWith("livepalmes_"),"Never insert native sporting rows in this change");
    if(settings.insertRace) return [{affectedRows:0}];
    if(state.failInsert) throw new Error("Interrupted after native row");
    tables.set(table,Object.fromEntries(SPECS[table].columns.map((key,i)=>[key,values[i]]))); state.writes.push(table); return [{affectedRows:1}];
  }})};
  state.audit={read:async()=>state.saved,prepare:async(_,value)=>{if(settings.auditFailure) throw new Error("Backup unavailable");state.saved=JSON.parse(JSON.stringify(value));state.prepared++;},complete:async()=>state.completed++};
  state.read=async(_,id,authorize)=>{assert.equal(id,input({}).competitionId);await authorize(pack.event);return {...pack,nativeSnapshot:{competition:structuredClone(tables.get("competitions")),parameters:structuredClone(tables.get("compet_parametres"))},options:tables.get("livepalmes_competition_options") || null};};
  return state;
}
(async()=>{
  const original=native.readNativeCompetition;
  try {
    let state=fixture(); native.readNativeCompetition=state.read;
    await assert.rejects(applyCompetitionChange(state.pool,input({entryStatus:"closed"}),state.audit,()=>{throw new Error("Scope denied");}),/Scope/);assert.equal(state.prepared,0);assert.equal(state.writes.length,0);
    await applyCompetitionChange(state.pool,input({entryStatus:"closed"}),state.audit,()=>{});assert.deepEqual(state.writes,["compet_parametres","livepalmes_competition_options"]);assert.equal(state.completed,1);
    // Firestore may reorder fields: a saved plan must remain verifiable on retry.
    state.saved=Object.fromEntries(Object.entries(state.saved).reverse());
    const retry=await applyCompetitionChange(state.pool,input({entryStatus:"closed"}),state.audit,()=>{});assert.equal(retry.resumed,true);assert.equal(state.writes.length,2);
    for(const settings of [{auditFailure:true},{race:true}]) {
      state=fixture(settings);native.readNativeCompetition=state.read;
      await assert.rejects(applyCompetitionChange(state.pool,input({name:"New name"}),state.audit,()=>{}));assert.equal(state.writes.length,0);
    }
    state=fixture({insertRace:true});native.readNativeCompetition=state.read;
    await assert.rejects(applyCompetitionChange(state.pool,input({address:"Address"}),state.audit,()=>{}),/concurrente/);
    assert.equal(state.writes.length,0);assert.equal(state.completed,0);
    state=fixture({failInsert:true});native.readNativeCompetition=state.read;
    await assert.rejects(applyCompetitionChange(state.pool,input({entryStatus:"closed"}),state.audit,()=>{}),/Interrupted/);assert.equal(state.tables.get("compet_parametres").actif,0);assert.equal(state.prepared,1);assert.equal(state.completed,0);
    state.failInsert=false; await applyCompetitionChange(state.pool,input({entryStatus:"closed"}),state.audit,()=>{});assert.equal(state.completed,1);assert.equal(state.writes.length,2);
    assert.equal(state.tables.get("competitions").libelle,pack.nativeSnapshot.competition.libelle);
    assert.equal(state.tables.get("compet_parametres").saisie,0);
    const {inspectCompetitionWritePlans,indexedPlanRow}=require("../functions/nap-competition-write-plans");
    const destination={table:"livepalmes_competition_options",selectType:"INSERT",type:"ALL",key:null,rows:0};
    const insert={table:destination.table,before:null};
    assert.equal(indexedPlanRow(destination,insert,0),true);
    assert.equal(indexedPlanRow({...destination,rows:null},insert,0),true);
    for(const row of [{...destination,table:"scope_c"},{...destination,rows:1},{...destination,selectType:"SIMPLE"}]) assert.equal(indexedPlanRow(row,insert,0),false);
    assert.equal(indexedPlanRow(destination,{...insert,before:{}},0),false);
    assert.equal(indexedPlanRow(destination,insert,1),false);
    let explains=0,released=0;
    native.readNativeCompetition=async()=>pack;
    const plans=await inspectCompetitionWritePlans({getConnection:async()=>({release:()=>released++,execute:async({sql},values)=>{
      if(sql.startsWith("EXPLAIN SELECT")) return [[{table:"chefsdequipe",type:"ref",key:"livepalmes_compet_id",rows:1}]];
      if(sql.startsWith("SELECT")) return [[{id:51,compet:5140,nom:"Chef",prenom:"Native",date:"1980-01-02",club:"123",pourclub:"0"}]];
      assert.ok(sql.startsWith("EXPLAIN UPDATE") || sql.startsWith("EXPLAIN INSERT") || sql.startsWith("EXPLAIN DELETE"));
      assert.equal((sql.match(/\?/g)||[]).length,values.length);
      explains++;return [[{table:"scope_c",type:"const",key:"PRIMARY",rows:1,Extra:""}]];
    }})});
    assert.equal(explains,9);assert.equal(released,1);assert.equal(plans.writesExecuted,false);
    assert.ok(!JSON.stringify(plans).includes("Antibes"));
    const rejected=await inspectCompetitionWritePlans({getConnection:async()=>({release:()=>released++,execute:async({sql})=>sql.startsWith("EXPLAIN SELECT")?[[{table:"chefsdequipe",type:"ref",key:"livepalmes_compet_id",rows:1}]]:sql.startsWith("SELECT")?[[{id:51,compet:5140,nom:"Chef",prenom:"Native",date:"1980-01-02",club:"123",pourclub:"0"}]]:[[{table:"scope_c",type:"ALL",key:null,rows:6000}]]})});
    assert.equal(rejected.complete,false);assert.equal(rejected.errors.length,9);assert.equal(rejected.plans.length,9);assert.ok(rejected.errors.every(error=>error.reason==="non-indexed"));
    native.readNativeCompetition=async()=>{throw Object.assign(new Error("Do not expose private SQL values"),{code:"ER_BAD_FIELD_ERROR"});};
    const readerFailure=await inspectCompetitionWritePlans({getConnection:async()=>({release:()=>released++})});
    assert.equal(readerFailure.errors[0].reason,"column");assert.equal(readerFailure.complete,false);assert.ok(!JSON.stringify(readerFailure).includes("private SQL"));
  } finally {native.readNativeCompetition=original;}
  console.log("Competition NAP : patch explicite, sauvegarde avant ecriture, CAS indexe, fermeture sans pertes et reprise MyISAM verifies sans reseau.");
})().catch(error=>{console.error(error);process.exitCode=1;});
