"use strict";
const assert=require('node:assert/strict');
const {prepareSupportReference,fields}=require('../tools/plan-open-water-support-reference');
const {applySupportReference,CONFIRMATION,CATALOG,COLUMNS,TRIGGERS}=require('../tools/apply-open-water-support-reference');
const {seal,open}=require('../tools/production-backup-crypto');
const {randomBytes,createHash}=require('node:crypto');
const templates=['F','M'].map((sexe,i)=>({id:405+i,course:'5000 SUPPORT',sexe,final:0,relais:0,categorie:0,p:0,ld:1,bi:0,_order:null,wplabel:'LD5000SUP',mixte:0,style:'SF',type_:1,longueur:'5000',nbnageur:1,validation:1,actif:1}));
const catalog=[...Array.from({length:273},(_,i)=>({...templates[0],id:i+1,course:'OTHER'+i,wplabel:'OTHER'+i})),...templates];
const columns=['id',...fields].map(COLUMN_NAME=>({COLUMN_NAME})),approvedPlan=prepareSupportReference(catalog,templates);
function fixture(options={}){
 const state={rows:structuredClone(catalog),queries:[],inserts:0,backedUp:false,locked:false,...options};
 const connection={query:async({sql})=>{assert.match(sql,/^(LOCK TABLES|UNLOCK TABLES)/);state.locked=sql.startsWith('LOCK');return [{}];},execute:async({sql},values=[])=>{
  state.queries.push(sql);assert.equal((sql.match(/\?/g)||[]).length,values.length);
  if(sql===COLUMNS)return [state.schemaDrift?columns.slice(1):columns];
  if(sql.includes('information_schema.TABLES'))return [[{TABLE_NAME:'course_dispo',ENGINE:'MyISAM'}]];
  if(sql===TRIGGERS)return [state.trigger?[{TRIGGER_NAME:'unexpected'}]:[]];
  if(sql.startsWith('EXPLAIN'))return [[{table:'course_dispo',key:'PRIMARY',type:'range'}]];
  if(sql===CATALOG)return [structuredClone(state.rows)];
  if(sql.startsWith('INSERT INTO course_dispo')){assert(state.backedUp);assert(state.locked);state.inserts++;for(let i=0;i<values.length;i+=fields.length){state.rows.push({id:500+state.rows.length,...Object.fromEntries(fields.map((f,j)=>[f,values[i+j]]))});if(state.interrupted){state.interrupted=false;throw Error('Uncertain MyISAM response');}}return [{affectedRows:values.length/fields.length}];}
  throw Error('Unexpected SQL');
 }};
 const input={confirmation:CONFIRMATION,approvedPlan,expectedColumns:columns,backupVerified:async payload=>{if(state.backupFailure)throw Error('backup failed');const bytes=Buffer.from(JSON.stringify(payload)),key=randomBytes(32),encrypted=seal(bytes,key);assert.deepEqual(open(encrypted,key),bytes);state.backedUp=true;return {verified:true,sha256:createHash('sha256').update(encrypted).digest('hex')};}};
 return {state,input,connection};
}
(async()=>{
 let f=fixture();const result=await applySupportReference(f.connection,f.input);assert.equal(result.inserted,2);assert.equal(result.oldRowsUnchanged,true);assert.equal(f.state.rows.length,277);assert.equal(f.state.locked,false);assert.equal((await applySupportReference(f.connection,f.input)).inserted,0);assert.equal(f.state.inserts,1);
 f=fixture({interrupted:true});await assert.rejects(applySupportReference(f.connection,f.input),/Uncertain/);assert.equal(f.state.rows.length,276);assert.equal(f.state.locked,false);assert.equal((await applySupportReference(f.connection,f.input)).inserted,1);assert.equal(f.state.rows.length,277);
 for(const opts of [{trigger:true},{schemaDrift:true},{backupFailure:true}]){f=fixture(opts);await assert.rejects(applySupportReference(f.connection,f.input));assert.equal(f.state.inserts,0);assert.equal(f.state.locked,false);}
 f=fixture();await assert.rejects(applySupportReference(f.connection,{...f.input,confirmation:''}),/Accord/);assert.equal(f.state.queries.length,0);
 f=fixture();f.state.rows[0].actif=0;await assert.rejects(applySupportReference(f.connection,f.input),/differents/);assert.equal(f.state.inserts,0);
 assert(f.state.queries.every(sql=>!/^(DELETE|UPDATE|ALTER|CREATE)/.test(sql)));
 console.log('Ajout Support exact : accord avant accès, sauvegarde chiffrée rouverte, verrous, deux INSERT seulement, reprise partielle, dérive et déclencheurs bloqués ; tests hors réseau.');
})().catch(e=>{console.error(e);process.exitCode=1;});
