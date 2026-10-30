"use strict";
const assert=require('node:assert/strict');
const native=require('../functions/nap-portal-competitions');
const {fingerprint}=require('../functions/nap-portal-workspaces');
const library=require('../functions/nap-open-water-library');
const water=require('../functions/nap-open-water-courses');
const {planAdditions}=require('../functions/nap-course-addition');
const {removeNativeCourses}=require('../functions/nap-open-water-course-removal');
const {SPECS}=require('../functions/nap-portal-competition-change');
const course=(distance,discipline)=>({id:`${distance===150?'150-elimination':distance}-${discipline}`,distance,discipline,label:`${distance} m ${discipline}`,format:distance===150?'elimination':'standard',active:true});
const defaults=['opencourse','cost','limitnageur'].map(COLUMN_NAME=>({COLUMN_NAME,COLUMN_TYPE:COLUMN_NAME==='cost'?'decimal(10,0)':'int(11)',COLUMN_DEFAULT:COLUMN_NAME==='opencourse'?'0':null,IS_NULLABLE:'NO',EXTRA:''}));
const pack={event:{id:'legacy-nap-5220',eventType:'openWater',competitionType:'openWater'},nativeSnapshot:{competition:{...Object.fromEntries(SPECS.competitions.columns.map(k=>[k,null])),id:5220},parameters:{...Object.fromEntries(SPECS.compet_parametres.columns.map(k=>[k,null])),id:1,compet:5220}},nativeParameters:{qualif:0},groups:[],courses:[]};
const catalog=['150SFEL','150BIEL','1000','3000BI','5000 SUPPORT'].flatMap((name,index)=>['F','M'].map((sexe,i)=>({id:index*2+i+1,course:name,sexe,final:0,relais:0,categorie:0,ld:1,mixte:0,actif:1})));
const codes=['OW150ELIMSF','OW150ELIMBI','OW1000SF','OW3000BI','OW5000SUP'];
const planned=planAdditions(pack,codes.map(code=>({code})),catalog,defaults,new Map());
assert.equal(planned.length,10);assert.deepEqual(planned.map(x=>x.id_course),catalog.map(x=>x.id));
assert.throws(()=>planAdditions(pack,[{code:'OW1000SUP'}],catalog,defaults,new Map()),/inconnue|absente/);
assert.throws(()=>planAdditions(pack,[{code:codes[0]}],[...catalog,catalog[0]],defaults,new Map()),/ambigue/);
assert.equal(water.definition('150'),null,'A bare 150 m never becomes elimination');
assert.equal(water.definition('150BIEL').code,'OW150ELIMBI');assert.equal(water.definition('3000 SUPPORT').code,'OW3000SUP');assert.equal(water.fromCode('OW150SUP'),null);
const current=library.snapshot({id:1,version:1,courses:[course(1000,'SF')]});
const distance=library.plan(current,{action:'addDistance',courses:['SF','BI','SUP'].map(s=>course(2000,s)),expectedFingerprint:current.fingerprint});
assert.equal(distance.after.courses.length,4);assert.equal(current.courses.length,1);
const completed=library.plan(current,{action:'addDistance',courses:['SF','BI','SUP'].map(s=>course(1000,s)),expectedFingerprint:current.fingerprint});assert.equal(completed.after.courses.length,3);
assert.throws(()=>library.plan(current,{action:'addDistance',courses:[course(2000,'SF')],expectedFingerprint:current.fingerprint}),/incompletes/);
const rows=[{id:90,compet:5220,pos:1,id_course:1,opencourse:0,cost:'0',limitnageur:0},{id:91,compet:5220,pos:2,id_course:2,opencourse:0,cost:'0',limitnageur:0},{id:92,compet:5220,pos:3,id_course:3,opencourse:0,cost:'0',limitnageur:0}];
const original=native.readNativeCompetition;
function fixture(options={}){
 const state={rows:structuredClone(rows),saved:null,deletes:0,done:0,locked:false,sql:[],released:0,...options};
 const input={competitionId:5220,actorUid:'admin',national:!!options.national,expectedFingerprint:fingerprint({...pack,courses:rows}),patch:{removeNativeCourseIds:[90,91],confirmCourseRemoval:true}};
 const connection={release:()=>state.released++,destroy:()=>{},execute:async({sql},values)=>{
  state.sql.push(sql);assert.equal((sql.match(/\?/g)||[]).length,values.length);
  if(sql.startsWith('EXPLAIN'))return [[{table:'compet_courses',type:'ref',key:'compet'}]];
  if(sql.includes('information_schema.TRIGGERS'))return [state.trigger?[{}]:[]];
  if(sql.startsWith('SELECT 1 AS authorized'))return [state.denied?[]:[{authorized:1}]];
  if(sql.includes('FROM nageursengager')||sql.includes('FROM engagements_relais'))return [state.entries?[{id:1}]:[]];
  if(sql.startsWith('SELECT id,compet'))return [structuredClone(state.rows)];
  if(sql.startsWith('DELETE')){assert(state.locked);assert(state.saved,'backup before any deletion');state.deletes++;state.rows=state.rows.filter(r=>![90,91].includes(r.id));return [{affectedRows:2}];}
  throw Error('Unexpected query');
 },query:async({sql})=>{assert.match(sql,/^(LOCK TABLES|UNLOCK TABLES)/);state.locked=sql.startsWith('LOCK');state.sql.push(sql);return [{}];}};
 const audit={read:async()=>state.saved,prepare:async(_k,value)=>{if(state.backupFailure)throw Error('backup failed');state.saved=structuredClone(value);},complete:async()=>{if(state.failComplete)throw Error('receipt failed');state.done++;}};
 native.readNativeCompetition=async(_c,_id,authorize)=>{await authorize(pack.event);return {...pack,courses:state.rows};};
 return {state,input,audit,pool:{getConnection:async()=>connection}};
}
async function run(){try{
 let f=fixture();await removeNativeCourses(f.pool,f.input,f.audit,()=>{});assert.deepEqual(f.state.rows.map(r=>r.id),[92]);assert.equal(f.state.deletes,1);assert.equal(f.state.locked,false);await removeNativeCourses(f.pool,f.input,f.audit,()=>{});assert.equal(f.state.deletes,1,'replay never removes another row');
 f=fixture({entries:true});await assert.rejects(removeNativeCourses(f.pool,f.input,f.audit,()=>{}),/national/);assert.equal(f.state.deletes,0);assert.equal(f.state.saved,null);
 f=fixture({entries:true,national:true});await removeNativeCourses(f.pool,f.input,f.audit,()=>{});assert(f.state.sql.filter(x=>x.startsWith('DELETE')).every(x=>x.startsWith('DELETE FROM compet_courses')));
 for(const opts of [{denied:true},{trigger:true},{backupFailure:true}]){f=fixture(opts);await assert.rejects(removeNativeCourses(f.pool,f.input,f.audit,()=>{}));assert.equal(f.state.deletes,0);assert.equal(f.state.locked,false);assert.equal(f.state.released,1);}
 f=fixture({failComplete:true});await assert.rejects(removeNativeCourses(f.pool,f.input,f.audit,()=>{}),/receipt/);f.state.failComplete=false;await removeNativeCourses(f.pool,f.input,f.audit,()=>{});assert.equal(f.state.deletes,1);
 f=fixture();await assert.rejects(removeNativeCourses(f.pool,{...f.input,expectedFingerprint:'a'.repeat(64)},f.audit,()=>{}),/change/);assert.equal(f.state.deletes,0);
 console.log('Eau libre : correspondances, ajout groupé de distance, refus des références absentes, retraits groupés, sauvegarde, droits, reprise et conservation des engagements vérifiés hors réseau.');
}finally{native.readNativeCompetition=original;}}
run().catch(e=>{console.error(e);process.exitCode=1;});
