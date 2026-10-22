'use strict';
const assert=require('node:assert/strict');
const library=require('../functions/nap-national-documents');
const {FIELDS,OPTIONS}=require('../functions/nap-competition-documents');
const {FILE_SCHEMA,NULLABLE_FILE_FIELDS}=require('../functions/nap-document-options-contract');
function fixture(settings={}){
 let row={id:42,name:'Ancien document',type:3,location:'/documents/original.pdf',date:'2026-10-13 12:00:00',user:null,competition:0,sent:0,comment:'Description',public:'Y',element:47},extra=null,targets=[{id:1,cible:2}],audit=null,writes=0;
 const history=[];
 const c={release:()=>history.push('release'),execute:async({sql},values=[])=>{
  history.push(sql);
  if(sql.includes('GET_LOCK'))return [[{acquired:settings.locked?0:1}]];
  if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
  if(sql.includes('information_schema.COLUMNS'))return [[...FILE_SCHEMA.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:NULLABLE_FILE_FIELDS.has(COLUMN_NAME)?'YES':'NO',COLUMN_DEFAULT:null,EXTRA:''})),{COLUMN_NAME:'featured_rank',COLUMN_TYPE:'tinyint unsigned',IS_NULLABLE:'YES',COLUMN_DEFAULT:null,EXTRA:''}]];
  if(sql.includes('information_schema.STATISTICS'))return [[{INDEX_NAME:'livepalmes_document_featured_rank',COLUMN_NAME:'featured_rank',SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null},{INDEX_NAME:'PRIMARY',COLUMN_NAME:'document_id',SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}]];
  if(sql.includes('information_schema.TABLES'))return [[{TABLE_NAME:'documents',ENGINE:'MyISAM'},{TABLE_NAME:'livepalmes_document_options',ENGINE:'InnoDB',TABLE_COLLATION:'utf8mb4_unicode_ci'}]];
  if(sql.includes('information_schema.TRIGGERS'))return [[]];
  if(sql.startsWith('SELECT id,label,pos FROM cibles'))return [[{id:2,label:'Comité',pos:1},{id:3,label:'Juges',pos:2}]];
  if(sql.startsWith('SELECT id,name FROM elements'))return [[{id:34,name:'publications'}]];
  if(sql.startsWith('SELECT id,cible,element FROM elements_cibles'))return [[{id:1,cible:2,element:34},{id:2,cible:3,element:34}]];
  if(sql.startsWith('SELECT d.'))return [[...(row.public==='Y'&&row.id===values[0]?[{...row,...extra}]:[])]];
  if(sql.startsWith('SELECT id,cible FROM documents_cibles')){assert.match(sql,/WHERE document=\? ORDER BY cible LIMIT 101$/);return [structuredClone(targets).reverse()];}
  if(sql.startsWith('SELECT public FROM documents'))return [[{public:row.public}]];
  if(/^(INSERT|UPDATE|DELETE)/.test(sql)){
   assert.ok(audit,'Before journal required before every write');writes++;
   if(settings.failWrite)throw Error('MyISAM failure');
   assert.equal((sql.match(/\?/g)||[]).length,values.length);
   if(sql.startsWith('INSERT INTO documents ('))row={id:99,...Object.fromEntries(FIELDS.slice(1).map((k,i)=>[k,values[i]]))};
   if(sql.startsWith('UPDATE documents SET'))row=Object.fromEntries(FIELDS.map(k=>[k,k==='id'?row.id:values[FIELDS.filter(x=>x!=='id').indexOf(k)]]));
   if(sql.startsWith('DELETE FROM documents_cibles'))targets=[];
   if(sql.startsWith('INSERT INTO documents_cibles'))targets=values.filter((_,i)=>i%2===1).map((cible,i)=>({id:10+i,cible}));
   if(sql.startsWith('INSERT INTO livepalmes_document_options'))extra={...Object.fromEntries(OPTIONS.map((k,i)=>[k,values[i]])),featured_rank:null};
   return [{affectedRows:1,insertId:99}];
  }
  throw Error(`Unexpected SQL: ${sql}`);
 }};
 const pool={execute:c.execute,getConnection:async()=>c};
 const services={authorize:async()=>({national:!settings.denied,uid:'national'}),downloadUrl:()=> 'https://example.org/document.pdf',saveFile:async()=>{assert.ok(audit);history.push('storage');if(settings.failFile)throw Error('Storage failure');},audit:{read:async()=>settings.existingAudit||false,prepare:async(_id,data)=>{audit=data;history.push('before');},complete:async()=>history.push('complete')}};
 return {pool,c,services,history,get row(){return row;},get writes(){return writes;},get audit(){return audit;}};
}
const input={action:'upload',title:'Document national',description:'Informations',typeId:3,rubricId:47,themeIds:[2,3],fileName:'document.pdf',fileDataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\nSynthetic test').toString('base64')};
(async()=>{
 const f=fixture();const result=await library.mutate(f.pool,input,f.services);
 assert.equal(result.document.id,99);assert.deepEqual(result.document.themeIds,[2,3]);assert.equal(f.row.competition,0);assert.match(result.document.storagePath,/^national-documents\/nap\//);assert.ok(f.history.indexOf('before')<f.history.indexOf('storage'));
 const old=fixture(),before=await library.record(old.c,42);
 const updated=await library.mutate(old.pool,{...input,action:'update',documentId:42,expectedFingerprint:before.fingerprint},old.services);
 assert.equal(updated.document.url,'https://nap.ffessm.fr/documents/original.pdf');assert.equal(old.row.date,before.document.date);assert.ok(!old.history.includes('storage'));
 const stale=fixture();await assert.rejects(library.mutate(stale.pool,{...input,action:'update',documentId:42,expectedFingerprint:'stale'},stale.services),/changé/);assert.equal(stale.writes,0);
 const removed=fixture(),snapshot=await library.record(removed.c,42);
 await library.mutate(removed.pool,{action:'delete',documentId:42,expectedFingerprint:snapshot.fingerprint},removed.services);
 assert.equal(removed.row.public,'N');assert.equal(removed.row.location,snapshot.document.location);assert.equal(removed.writes,1);assert.ok(removed.history.includes('complete'));
 await assert.rejects(library.record(removed.c,42),/introuvable/);
 for(const settings of [{denied:true},{locked:true},{existingAudit:true},{failFile:true}]){const denied=fixture(settings);await assert.rejects(library.mutate(denied.pool,input,denied.services));assert.equal(denied.writes,0);}
 const failed=fixture({failWrite:true});await assert.rejects(library.mutate(failed.pool,input,failed.services),/MyISAM/);assert.ok(failed.audit);assert.ok(!failed.history.includes('complete'));assert.equal(failed.history.at(-1),'release');
 for(const themeIds of [[],[999],[2,2],['2']])assert.throws(()=>library.cleanInput({...input,themeIds},[{id:2}]),/rubrique/);
 const badFile=fixture();await assert.rejects(library.mutate(badFile.pool,{...input,fileDataUrl:'data:application/pdf;base64,YQ=='},badFile.services),/PDF valide/);assert.equal(badFile.writes,0);
 console.log('National library: upload, native themes, legacy update, CAS, national rights, withdrawal, journal failures and file validation passed offline.');
})().catch(error=>{console.error(error);process.exitCode=1;});
