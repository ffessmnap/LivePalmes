"use strict";
const assert=require("node:assert/strict");
const native=require("../functions/nap-portal-competitions");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
const {planAdditions,missingAdditions,addNativeCourses,COLUMNS}=require("../functions/nap-course-addition");
const definitions=new Map([["50SF",{code:"50SF",type:"individual"}],["4X100SB",{code:"4X100SB",type:"relay",relayMixedRule:"required"}]]);
const catalog=[...['M','F'].map((sexe,i)=>({id:i+1,course:'50SF',sexe,final:0,relais:0,categorie:0,ld:0,mixte:0,actif:1})),{id:285,course:'4X100SB Mixte',sexe:'0',final:0,relais:1,categorie:0,ld:0,mixte:1,actif:1}];
const defaults=['opencourse','cost','limitnageur'].map(COLUMN_NAME=>({COLUMN_NAME,COLUMN_TYPE:COLUMN_NAME==='cost'?'decimal(10,0)':'int(11)',COLUMN_DEFAULT:COLUMN_NAME==='opencourse'?'0':null,IS_NULLABLE:'NO',EXTRA:''}));
const pack={event:{id:'legacy-nap-5220',eventType:'pool'},nativeSnapshot:{competition:{...Object.fromEntries(SPECS.competitions.columns.map(key=>[key,null])),id:5220},parameters:{...Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,null])),id:99,compet:5220}},nativeParameters:{qualif:0},groups:[],courses:[]};
const selected=[{code:'50SF'},{code:'4X100SB'}];
const proposed=planAdditions(pack,selected,catalog,defaults,definitions);
assert.deepEqual(proposed.map(row=>row.id_course),[1,2,285]);
assert.deepEqual(proposed.map(row=>row.pos),[1,2,3]);
assert.throws(()=>planAdditions(pack,[{code:'unknown'}],catalog,defaults,definitions),/inconnue/);
assert.throws(()=>planAdditions(pack,[selected[0],selected[0]],catalog,defaults,definitions),/invalide/);
assert.throws(()=>planAdditions(pack,selected,[...catalog,catalog[0]],defaults,definitions),/ambigue/);
assert.throws(()=>planAdditions({...pack,groups:[{}]},selected,catalog,defaults,definitions),/qualification/);
assert.throws(()=>planAdditions(pack,selected,catalog,[],definitions),/Structure native/);
for(const change of [{COLUMN_TYPE:'varchar(10)'},{IS_NULLABLE:'YES'},{COLUMN_DEFAULT:'5'},{EXTRA:'DEFAULT_GENERATED'}]){
  const drift=defaults.map(row=>row.COLUMN_NAME==='cost'?{...row,...change}:row);
  assert.throws(()=>planAdditions(pack,selected,catalog,drift,definitions),/Structure native/);
}
assert.equal(proposed[0].cost,'0');assert.equal(proposed[0].limitnageur,0);assert.equal(proposed[0].opencourse,0);
const old={id:88,compet:5220,pos:7,id_course:999,opencourse:1,cost:'2.50',limitnageur:3};
const retained=planAdditions({...pack,courses:[old]},selected,catalog,defaults,definitions);
assert.equal(retained[0].pos,8);assert.equal(old.id_course,999);
assert.deepEqual(missingAdditions([old,{id:100,...retained[0]}],[old],retained),retained.slice(1));
assert.throws(()=>missingAdditions([{...old,cost:'9'}],[old],retained),/ont change/);
assert.throws(()=>missingAdditions([old,{id:101,...retained[0],id_course:777}],[old],retained),/concurrent/);
const original=native.readNativeCompetition;
function fixture(options={}){
  const state={rows:[],saved:null,inserts:0,completed:0,released:0,locked:false,sql:[],...options};
  const input={competitionId:5220,actorUid:'admin',expectedFingerprint:fingerprint(pack),patch:{addNativeCourses:selected},eventDefinitions:definitions};
  const connection={release:()=>state.released++,destroy:()=>{},execute:async({sql},values=[])=>{
    state.sql.push(sql);assert.equal((sql.match(/\?/g)||[]).length,values.length);
    if(sql.startsWith('SELECT id,course'))return [structuredClone(catalog)];
    if(sql.includes('information_schema.COLUMNS'))return [structuredClone(defaults)];
    if(sql.includes('information_schema.TRIGGERS'))return [state.trigger?[{}]:[]];
    if(sql.startsWith('EXPLAIN'))return [[{table:'compet_courses',key:'compet',type:'ref'}]];
    if(sql.startsWith('SELECT 1 AS authorized'))return [state.denied?[]:[{authorized:1}]];
    if(sql.startsWith('SELECT id,compet'))return [structuredClone(state.rows)];
    if(sql.startsWith('INSERT INTO')){
      assert.ok(state.saved,'backup before insert');assert.ok(state.locked,'native lock before write');state.inserts++;
      for(let i=0;i<values.length;i+=COLUMNS.length){state.rows.push({id:100+i,...Object.fromEntries(COLUMNS.map((key,j)=>[key,values[i+j]]))});if(state.interrupt){state.interrupt=false;throw Error('Uncertain MyISAM response');}}
      return [{affectedRows:values.length/COLUMNS.length}];
    }
    throw Error('Unexpected query '+sql);
  }};
  connection.query=async({sql})=>{
    assert.match(sql,/^(LOCK TABLES|UNLOCK TABLES)/);state.sql.push(sql);
    state.locked=sql.startsWith('LOCK TABLES');return [{}];
  };
  state.pool={getConnection:async()=>connection};
  state.audit={read:async()=>state.saved,prepare:async(_op,row)=>{state.saved=structuredClone(row);},complete:async()=>state.completed++};
  native.readNativeCompetition=async(_c,_id,authorize)=>{await authorize(pack);return {...pack,courses:state.rows};};
  return {state,input};
}
(async()=>{try{
  let {state,input}=fixture();await addNativeCourses(state.pool,input,state.audit,()=>{});
  assert.equal(state.rows.length,3);assert.equal(state.inserts,1);assert.equal(state.completed,1);assert.equal(state.locked,false);
  await addNativeCourses(state.pool,input,state.audit,()=>{});assert.equal(state.inserts,1,'replay does not duplicate');
  ({state,input}=fixture({interrupt:true}));await assert.rejects(addNativeCourses(state.pool,input,state.audit,()=>{}),/Uncertain/);assert.equal(state.rows.length,1);assert.equal(state.locked,false);
  await addNativeCourses(state.pool,input,state.audit,()=>{});assert.equal(state.rows.length,3);assert.equal(new Set(state.rows.map(row=>row.id_course)).size,3);
  ({state,input}=fixture({denied:true}));await assert.rejects(addNativeCourses(state.pool,input,state.audit,()=>{}),/perimetre/);assert.equal(state.inserts,0);
  ({state,input}=fixture({trigger:true}));await assert.rejects(addNativeCourses(state.pool,input,state.audit,()=>{}),/Declencheur/);assert.equal(state.saved,null);
  ({state,input}=fixture());await assert.rejects(addNativeCourses(state.pool,{...input,expectedFingerprint:'a'.repeat(64)},state.audit,()=>{}),/a change/);assert.equal(state.saved,null);
  ({state,input}=fixture());await assert.rejects(addNativeCourses(state.pool,input,state.audit,()=>{throw Error('Scope denied');}),/Scope denied/);assert.equal(state.sql.length,0);
  assert.ok(state.sql.every(sql=>!sql.startsWith('DELETE')&&!sql.startsWith('UPDATE')));
  console.log('Native course addition tests passed (offline, no real data)');
}finally{native.readNativeCompetition=original;}})().catch(error=>{console.error(error);process.exitCode=1;});
