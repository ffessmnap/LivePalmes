"use strict";
const assert=require("node:assert/strict");
const {saveNativeSwimmerSelection:save}=require("../functions/nap-swimmer-entry-change");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
function fixture() {
  let authorized=false,target=null,writes=0,fail=0,forfeits=false,prepareFails=false,closed=false,badPlan=false,guardChanged=false;
  const pack={source:"nap",competitionId:"5140",clubId:"106",readAt:"initial",swimmers:[1,2,3].map(id=>({id:String(id),clubId:"106",firstName:`Person${id}`,lastName:"Example",birthDate:"1990-01-01",sex:"M"})),inscriptions:[{id:11,nageur:1,compet:5140},{id:12,nageur:3,compet:5140}],individual:[{id:21,engagement:11,course:"100SF",tps:"14200"},{id:22,engagement:12,course:"50SF",tps:"3000"}],relays:[{id:30,compet:5140,club:"106"}],members:[{id:41,relais:30,pos:1,nageur:1},{id:42,relais:30,pos:2,nageur:3}],officials:[],leaders:[{id:50,compet:5140,nom:"Leader",prenom:"Example",date:"1980-01-01",club:"106",pourclub:""}],options:null};
  const competition={event:{entryStatus:"open",entryDeadlineAt:"2099-10-07T19:59:00.000Z"},nativeParameters:{qualif:0},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))},options:null};
  const initial=structuredClone(pack),queries=[];
  const connection={release:()=>queries.push("release"),destroy:()=>queries.push("destroy"),execute:async({sql},values)=>{
    assert.equal(authorized,true);queries.push(sql);assert.equal((sql.match(/\?/g)||[]).length,values.length,"every SQL placeholder is bound");
    if(sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if(sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:1}]];
    if(sql.startsWith("EXPLAIN ")) return [[{table:"n",type:badPlan?"ALL":"range",key:badPlan?null:"PRIMARY",rows:2}]];
    if(sql.includes("information_schema.TRIGGERS")) return [[]];
    if(sql.startsWith("SELECT id FROM forfait")) return [forfeits?[{id:9}]:[]];
    assert.ok(target,"before image saved before any native effect");assert.match(sql,/UTC_TIMESTAMP\(\) < \?/);assert.match(sql,/FROM chefsdequipe scope_l/);
    if(guardChanged) return [{affectedRows:0}];
    if(sql.startsWith("DELETE FROM engagements WHERE")) pack.individual=pack.individual.filter(row=>row.id!==21);
    else if(sql.startsWith("DELETE FROM engagements_relayeurs")) pack.members=pack.members.filter(row=>row.id!==41);
    else if(sql.startsWith("DELETE FROM nageursengager")) {assert.equal(pack.individual.some(row=>row.engagement===11),false);assert.equal(pack.members.some(row=>row.nageur===1),false);pack.inscriptions=pack.inscriptions.filter(row=>row.id!==11);}
    else if(sql.startsWith("INSERT INTO nageursengager")) {assert.equal(pack.inscriptions.some(row=>row.nageur===2),false);pack.inscriptions.push({id:13,nageur:2,compet:5140});pack.inscriptions.sort((a,b)=>a.nageur-b.nageur);}
    else throw new Error("Unexpected SQL");
    writes++;if(writes===fail) throw new Error("Interrupted after applied effect");return [{affectedRows:1}];
  }};
  const pool={getConnection:async()=>{assert.equal(authorized,true);return connection;}};
  const input={competitionId:5140,clubId:"106",actorUid:"test-actor",expectedFingerprint:fingerprint(pack),mutationId:"11111111-1111-4111-8111-111111111111",changes:[{swimmerId:1,selected:false},{swimmerId:2,selected:true}]};
  const services={authorize:async()=>{authorized=true;},validate:async()=>{},readers:{competition:async()=>({...structuredClone(competition),event:{...competition.event,entryStatus:closed?"closed":"open"}}),entry:async()=>structuredClone(pack)},audit:{read:async()=>target?structuredClone(target):null,prepare:async(op,value)=>{if(prepareFails) throw new Error("Journal unavailable");target=structuredClone(value);},complete:async()=>{}}};
  return {pool,input,services,queries,initial,pack,setBirthLimits:(start,end)=>{competition.nativeParameters.cat_d=start;competition.nativeParameters.cat_f=end;},setFail:value=>{fail=value;},setForfeits:()=>{forfeits=true;},close:()=>{closed=true;},failPrepare:()=>{prepareFails=true;},badPlan:()=>{badPlan=true;},changeGuard:()=>{guardChanged=true;},writes:()=>writes};
}
(async()=>{
  let f=fixture(),result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,4);assert.equal(f.pack.individual[0].id,22);assert.equal(f.pack.members[0].id,42);assert.deepEqual(f.pack.relays,f.initial.relays);assert.equal(f.queries.at(-1),"release");
  f.close();await save(f.pool,f.input,f.services);assert.equal(f.writes(),4,"completed retry after closure does not write");
  f=fixture();let effectAttempts=0,preparedEffects=0;
  f.services.prepareEffects=async()=>{preparedEffects++;return {grants:[{version:'1'}]};};
  f.services.afterSaved=async(c,target)=>{assert.deepEqual(target.effects,{grants:[{version:'1'}]});if(++effectAttempts===1)throw Error('Exception update interrupted');};
  await assert.rejects(save(f.pool,f.input,f.services),/Exception update/);assert.equal(f.writes(),4);f.close();await save(f.pool,f.input,f.services);assert.equal(f.writes(),4);assert.equal(preparedEffects,1);assert.equal(effectAttempts,2);
  for(const step of [1,2,3,4]) {f=fixture();f.setFail(step);await assert.rejects(()=>save(f.pool,f.input,f.services),/Interrupted/);f.setFail(0);await save(f.pool,f.input,f.services);assert.equal(f.writes(),4);}
  f=fixture();f.failPrepare();await assert.rejects(()=>save(f.pool,f.input,f.services),/Journal/);assert.equal(f.writes(),0);
  f=fixture();f.setBirthLimits("2090-01-01",null);await assert.rejects(()=>save(f.pool,f.input,f.services),/hors des limites/);assert.equal(f.writes(),0);assert.equal(f.queries.some(sql=>/^(?:INSERT|DELETE)/.test(sql)),false);
  f=fixture();f.setForfeits();await assert.rejects(()=>save(f.pool,f.input,f.services),/forfaits/);assert.equal(f.writes(),0);
  f=fixture();f.close();await assert.rejects(()=>save(f.pool,f.input,f.services),/fermes/);assert.equal(f.writes(),0);
  f=fixture();f.services.authorize=async()=>{throw new Error("Denied");};await assert.rejects(()=>save(f.pool,f.input,f.services),/Denied/);assert.deepEqual(f.queries,[]);
  f=fixture();f.setFail(1);await assert.rejects(()=>save(f.pool,f.input,f.services));f.pack.individual.push({id:99,engagement:11,course:"200SF",tps:"30000"});f.setFail(0);await assert.rejects(()=>save(f.pool,f.input,f.services),/ailleurs/);assert.equal(f.writes(),1);
  f=fixture();await assert.rejects(()=>save(f.pool,{...f.input,expectedFingerprint:"a".repeat(64)},f.services),/change/);assert.equal(f.writes(),0);
  f=fixture();f.badPlan();await assert.rejects(()=>save(f.pool,f.input,f.services),/Plan de recherche/);assert.equal(f.writes(),0);
  f=fixture();f.changeGuard();await assert.rejects(()=>save(f.pool,f.input,f.services),/pendant/);assert.equal(f.queries.filter(sql=>sql.startsWith("DELETE")).length,1,"conflicting first write stops before deleting members or parent");assert.deepEqual(f.pack,f.initial);
  console.log("Native swimmer selection: grouped SQL, saved before image, all four interruption points, closure, concurrent changes and unknown forfeits protected without network");
})().catch(error=>{console.error(error);process.exitCode=1;});
