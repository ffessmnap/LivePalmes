"use strict";
const assert=require('node:assert/strict');
const {isDeepStrictEqual}=require('node:util');
const {planDistanceReferences,FIELDS}=require('../functions/nap-open-water-reference-plan');
const {ensureDistanceReferences,CATALOG,COLUMNS,ENGINE,TRIGGERS}=require('../functions/nap-open-water-reference-addition');
const {backupVerified,seal,open}=require('../functions/nap-open-water-reference-backup');
const legacyCrypto=require('../tools/production-backup-crypto');
const water=require('../functions/nap-open-water-courses');
const clone=value=>structuredClone(value);
const ids={SF:[98,99],BI:[273,274],SUP:[405,406]};
const templates=['SF','BI','SUP'].flatMap(discipline=>['F','M'].map((sexe,index)=>({id:ids[discipline][index],course:discipline==='SF'?'5000':discipline==='BI'?'5000BI':'5000 SUPPORT',sexe,final:0,relais:0,categorie:0,p:0,ld:1,bi:discipline==='BI'?1:0,_order:discipline==='SUP'?null:ids[discipline][index],mixte:0,style:'SF',type_:1,longueur:'5000',nbnageur:1,validation:1,actif:1,wplabel:discipline==='SF'?'LD05KM':discipline==='BI'?'LD05KMBI':'LD5000SUP'})));
const types={id:'int(11)',course:'varchar(15)',sexe:'char(2)',wplabel:'varchar(16)',style:'varchar(5)',longueur:'bigint(20)'};
const columns=['id',...FIELDS].map(COLUMN_NAME=>({COLUMN_NAME,COLUMN_TYPE:types[COLUMN_NAME]||'int(11)',IS_NULLABLE:['bi','_order','actif'].includes(COLUMN_NAME)?'YES':'NO',COLUMN_DEFAULT:null,EXTRA:COLUMN_NAME==='id'?'auto_increment':''}));
const engine=[{TABLE_NAME:'course_dispo',ENGINE:'MyISAM'}];
function fixture(options={}){
 const state={catalog:clone(options.catalog||templates),columns:clone(columns),sql:[],locked:false,lockAttempts:0,inserts:0,backups:[],completions:[],released:0,destroyed:0,...options};
 const docs=new Map();
 const database={collection:name=>{assert.equal(name,'auditLogs');return {doc:id=>({id,create:async value=>{assert(!state.locked,'Backup network work must precede the SQL write lock');if(state.backupFailure)throw Error('backup unavailable');assert(!docs.has(id));docs.set(id,clone(value));state.backups.push(clone(value));},get:async()=>{const value=clone(docs.get(id));if(state.tamperBackup)value.target.encrypted='tampered';return {exists:!!value,data:()=>value};},update:async value=>{assert(!state.locked,'Receipt network work must follow unlocking');if(state.receiptFailure)throw Error('receipt unavailable');state.completions.push(clone(value));}})};}};
 const addRows=items=>{let next=Math.max(0,...state.catalog.map(row=>row.id))+1;state.catalog.push(...items.map(item=>({id:next++,...clone(item.row)})));};
 const connection={release:()=>state.released++,destroy:()=>{state.destroyed++;state.locked=false;},query:async({sql})=>{
  state.sql.push(sql);
  if(sql.startsWith('LOCK')){state.lockAttempts++;state.locked=true;if(state.lockFailure)throw Error('lock timeout');}
  else if(sql==='UNLOCK TABLES'){if(state.unlockFailure)throw Error('unlock unavailable');state.locked=false;}
  else throw Error('Unexpected unprepared statement');return [{}];
 },execute:async({sql},values=[])=>{
  state.sql.push(sql);assert.equal((sql.match(/\?/g)||[]).length,values.length);
  if(sql==='EXPLAIN '+CATALOG)return [[{table:'course_dispo',type:state.badIndex?'ALL':'range',key:state.badIndex?null:'PRIMARY'}]];
  if(sql===CATALOG)return [clone(state.catalog)];
  if(sql===COLUMNS)return [clone(state.columns)];
  if(sql===ENGINE)return [state.badEngine?[{TABLE_NAME:'course_dispo',ENGINE:'InnoDB'}]:clone(engine)];
  if(sql===TRIGGERS)return [state.trigger?[{TRIGGER_NAME:'unknown'}]:[]];
  if(sql.startsWith('INSERT INTO course_dispo')){
   assert(state.locked);assert(state.backups.length);assert(!state.tamperBackup);state.inserts++;
   const rows=[];for(let offset=0;offset<values.length;offset+=FIELDS.length)rows.push({row:Object.fromEntries(FIELDS.map((field,i)=>[field,values[offset+i]]))});
   if(state.partialFailure){addRows(rows.slice(0,2));state.partialFailure=false;throw Error('connection interrupted after partial insert');}
   addRows(rows);if(state.changeOldOnWrite)state.catalog[0].p=1;
   return [{affectedRows:rows.length}];
  }
  throw Error('Unexpected SQL: '+sql);
 }};
 const backup=async payload=>{
  const result=await backupVerified(database,'admin',payload,'test-reference-secret');
  if(state.concurrentComplete){addRows(payload.plan.additions);state.concurrentComplete=false;}
  if(state.concurrentPartial){addRows(payload.plan.additions.slice(0,1));state.concurrentPartial=false;}
  if(state.concurrentOldChange)state.catalog[0].p=1;
  if(state.schemaDrift)state.columns[0].COLUMN_TYPE='bigint(20)';
  return result;
 };
 return {state,pool:{getConnection:async()=>connection},backup,docs};
}
const ensure=f=>ensureDistanceReferences(f.pool,{distance:1200,actorUid:'admin'},f.backup);
async function run(){
 const bytes=Buffer.from('catalogue technique fictif');assert.deepEqual(legacyCrypto.open(seal(bytes,'key'),'key'),bytes);assert.deepEqual(open(legacyCrypto.seal(bytes,'key'),'key'),bytes);
 assert.throws(()=>open(seal(bytes,'key'),'wrong'));
 for(const [alias,code] of [['750M','OW750SF'],['1,850KM','OW1850SF'],['20KM','OW20000SF'],['4KMSUPPORT','OW4000SUP'],['150BIEL','OW150ELIMBI']])assert.equal(water.definition(alias).code,code);
 assert.equal(water.definition('150M'),null);assert.equal(water.definition('1.2M'),null);
 const before=clone(templates),plan=planDistanceReferences(1200,templates);assert.equal(plan.additions.length,6);assert.deepEqual(templates,before);assert(plan.additions.every(item=>item.row._order===null&&item.row.longueur==='1200'));
 assert(plan.additions.filter(item=>item.code==='OW1200BI').every(item=>item.row.bi===1));
 const half={...clone(templates[0]),id:490,course:'1,2KM',longueur:'1200',wplabel:'LD012KM'};
 const halfPlan=planDistanceReferences(1200,[...templates,half]);const partner=halfPlan.additions.find(item=>item.code==='OW1200SF');assert.equal(partner.row.sexe,'M');assert.equal(partner.row.course,half.course);assert.equal(partner.row.wplabel,half.wplabel);
 assert.throws(()=>planDistanceReferences(1200,[...templates,half,{...half,id:491}]),/ambigu/);
 assert.throws(()=>planDistanceReferences(1200,[...templates,{...half,actif:0}]),/utilisé|désactivé/);
 const broken=clone(templates);broken[2].bi=0;assert.throws(()=>planDistanceReferences(1200,broken),/Modèle/);
 assert.throws(()=>planDistanceReferences(150,templates),/élimination/);
 const full=Array.from({length:301},(_,i)=>({...templates[0],id:i+1}));assert.throws(()=>planDistanceReferences(1200,full),/hors limites/);
 const almostFull=[...templates,...Array.from({length:289},(_,i)=>({...templates[0],id:1000+i,course:'OTHER'+i,ld:0,wplabel:'OTHER'+i}))];assert.throws(()=>planDistanceReferences(1200,almostFull),/Limite/);
 let f=fixture();const result=await ensure(f);assert.equal(result.created,6);assert.equal(result.referenceIds.length,6);assert.equal(f.state.inserts,1);assert.equal(f.state.completions.length,1);assert.equal(f.state.locked,false);assert(f.state.catalog.slice(0,6).every((row,i)=>isDeepStrictEqual(row,templates[i])));
 const encrypted=f.state.backups[0];assert.equal(JSON.stringify(encrypted).includes('5000 SUPPORT'),false);assert.equal(JSON.stringify(encrypted).includes('test-reference-secret'),false);const restored=JSON.parse(legacyCrypto.open(Buffer.from(encrypted.target.encrypted,'base64'),'test-reference-secret'));assert.deepEqual(restored.before,templates);
 await ensure(f);assert.equal(f.state.inserts,1,'Repeating a completed request never inserts duplicate references');assert.equal(f.state.backups.length,1,'A complete existing distance needs no backup write');
 for(const options of [{backupFailure:true},{tamperBackup:true},{badIndex:true},{badEngine:true},{trigger:true},{schemaDrift:true},{concurrentOldChange:true},{lockFailure:true}]){
  f=fixture(options);await assert.rejects(ensure(f));assert.equal(f.state.inserts,0,JSON.stringify(options));assert.equal(f.state.locked,false);assert.equal(f.state.released,1);
 }
 f=fixture({concurrentComplete:true});assert.equal((await ensure(f)).created,0);assert.equal(f.state.inserts,0);assert.equal(f.state.catalog.length,12);
 f=fixture({concurrentPartial:true});await assert.rejects(ensure(f),/modifié/);assert.equal(f.state.inserts,0);assert.equal((await ensure(f)).created,5);assert.equal(f.state.catalog.length,12);
 f=fixture({partialFailure:true});await assert.rejects(ensure(f),/interrupted/);assert.equal(f.state.catalog.length,8);assert.equal((await ensure(f)).created,4);assert.equal(f.state.catalog.length,12);assert.equal(f.state.inserts,2);
 f=fixture({receiptFailure:true});await assert.rejects(ensure(f),error=>error.nativeReferencesCreated===6);f.state.receiptFailure=false;assert.equal((await ensure(f)).created,0);assert.equal(f.state.inserts,1);
 f=fixture({changeOldOnWrite:true});await assert.rejects(ensure(f),error=>error.nativeReferencesCreated===6);assert.equal(f.state.locked,false);
 f=fixture({unlockFailure:true});await assert.rejects(ensure(f),/unlock/);assert.equal(f.state.destroyed,1);assert.equal(f.state.released,0);
 console.log('Références eau libre : six ajouts maximum, références existantes préservées, sauvegarde chiffrée rouverte avant verrou, concurrence, reprise partielle et refus vérifiés hors réseau.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
