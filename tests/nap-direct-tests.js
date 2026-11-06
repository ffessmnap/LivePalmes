"use strict";
const assert=require('node:assert/strict'),model=require('../functions/nap-direct-model'),schema=require('../functions/nap-direct-schema');
const {createStore}=require('../functions/nap-direct-store'),{createService,readActor}=require('../functions/nap-direct-service');
const {readPublic,attachLinks}=require('../functions/nap-direct-public'),{decode}=require('../functions/nap-direct-documents');
const competition={id:'legacy-nap-900001',date:'2026-11-07'},person={lastName:'EXEMPLE',firstName:'Alice',birthYear:2008,club:'CLUB TEST',category:'FJU',series:1,lane:4,entryTime:'595999',resultTime:'01:10.12'};
const draft={kind:'results',event:{eventCode:'100sf',sex:'F',sessionKey:'1'},rows:[person],operationKey:'fixture-operation-00001',source:{name:'fixture.pdf',type:'pdf'}};
function sqlFixture(){
  let config={environment:'test',competition_id:900001,state:'active',public_visible:1,enabled_consoles_json:'["computer"]',documents_json:'[]',version:1,public_revision:1};
  let eventRows=[],entryRows=[],logs=[],saved;const calls=[];let commits=0,rollbacks=0,failJournal=false;
  const native={id:900001,libelle:'Compétition fictive',date:'2026-11-07',enddate:'2026-11-08',lieu:'Piscine fictive',type_label:'Piscine',native_level_code:1,comite:'09',bassin:50};
  const execute=async(query,values=[])=>{const sql=typeof query==='string'?query:query.sql;calls.push({sql,values});
    assert.equal((sql.match(/\?/g)||[]).length,values.length,`Nombre de paramètres : ${sql.slice(0,100)}`);
    if(/^(INSERT|UPDATE|DELETE)/.test(sql))assert.match(sql,/^(?:INSERT INTO|UPDATE|DELETE FROM) livepalmes_direct_/,'Aucune table native modifiable');
    if(sql.includes(' FROM competitions c'))return [[{...native,...(sql.includes('d.state AS')?{direct_state:config.state,direct_visible:config.public_visible,direct_revision:config.public_revision,direct_documents:config.documents_json}:{})}]];
    if(sql.includes('SELECT COUNT(*) AS total'))return [[{total:entryRows.length}]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_competitions'))return [[{...config}]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_events'))return [[...eventRows]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_entries'))return [[...entryRows]];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_publications'))return [logs.filter(r=>r.operation_key===values[2])];
    if(sql.startsWith('SELECT')&&sql.includes('livepalmes_direct_access'))return [[]];
    if(sql.startsWith('INSERT INTO livepalmes_direct_events')){const fields=sql.match(/\(([^)]+)\) VALUES/)[1].split(',');let row=Object.fromEntries(fields.slice(0,15).map((field,i)=>[field,values[i]]));const existing=eventRows.find(e=>e.id===row.id);if(existing)Object.assign(existing,row,{version:Number(existing.version)+1});else eventRows.push({...row,version:1});return [{affectedRows:1}];}
    if(sql.startsWith('INSERT INTO livepalmes_direct_entries')){const columns=sql.match(/\(([^)]+)\) VALUES/)[1].split(',').slice(0,28);for(let i=0;i<values.length;i+=28){const row=Object.fromEntries(columns.map((field,j)=>[field,values[i+j]]));const existing=entryRows.find(r=>r.participant_key===row.participant_key);if(existing){const updates=[...sql.matchAll(/(\w+)=VALUES\(/g)].map(m=>m[1]);for(const field of updates)existing[field]=row[field];}else entryRows.push(row);}return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE livepalmes_direct_entries')){for(const row of entryRows){if(sql.endsWith('AND series_number=?')&&row.series_number!==values.at(-1))continue;if(sql.includes("entry_time_raw=''"))Object.assign(row,{entry_time_raw:'',entry_time_cs:null,entry_time_status:'missing',has_series:0,series_number:null,lane:null});else Object.assign(row,{has_result:0,result_time_raw:'',result_time_cs:null,result_status:'',published_rank:null,splits_json:'[]'});}return [{affectedRows:entryRows.length}];}
    if(sql.startsWith('DELETE FROM livepalmes_direct_entries')){entryRows=entryRows.filter(row=>!(row.has_series===0&&row.has_result===0));return [{affectedRows:0}];}
    if(sql.startsWith('INSERT INTO livepalmes_direct_publications')){if(failJournal)throw Error('Journal interrompu');logs.push({operation_key:values[5],after_json:values[11]});return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE livepalmes_direct_competitions')){config.version++;config.public_revision++;return [{affectedRows:1}];}
    throw Error('SQL non prévu : '+sql);
  };
  const c={execute,beginTransaction:async()=>{saved=structuredClone({config,eventRows,entryRows,logs});},commit:async()=>{commits++;},rollback:async()=>{({config,eventRows,entryRows,logs}=saved);rollbacks++;},release(){}};
  return {execute,getConnection:async()=>c,calls,native,inspect:()=>({config,eventRows,entryRows,logs,commits,rollbacks}),failJournal:()=>{failJournal=true;}};
}
function schemaFixture(){const present=new Set();let created=0;
 const c={execute:async(query,values=[])=>{const sql=typeof query==='string'?query:query.sql;if(sql.includes('GET_LOCK'))return [[{acquired:1}]];if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];const table=schema.tables.find(t=>t.name===values[0]);assert.ok(table);if(!present.has(table.name))return [[]];if(sql.includes('information_schema.TABLES'))return [[{ENGINE:'InnoDB',TABLE_COLLATION:'utf8mb4_unicode_ci'}]];if(sql.includes('information_schema.COLUMNS'))return [table.columns.map(c=>({COLUMN_NAME:c.name,COLUMN_TYPE:c.type,IS_NULLABLE:c.nullable?'YES':'NO',COLUMN_DEFAULT:c.defaultValue,EXTRA:''}))];return [table.keys.flatMap(([name,unique,...columns])=>columns.map((column,i)=>({INDEX_NAME:name,COLUMN_NAME:column,NON_UNIQUE:unique?0:1,SEQ_IN_INDEX:i+1,SUB_PART:null})))];},query:async({sql})=>{assert.ok(schema.sql.includes(sql));assert.match(sql,/^CREATE TABLE `livepalmes_direct_/);assert.doesNotMatch(sql,/\b(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE|REPLACE)\b/);present.add(schema.tables[schema.sql.indexOf(sql)].name);created++;},release(){},destroy(){}};
 return {getConnection:async()=>c,created:()=>created};
}
(async()=>{
  for(const value of ['595999','59:59.99','59:59,99','00:59:59.99'])assert.deepEqual(model.time(value,true),{raw:value,cs:null,status:'no_reference'});
  assert.equal(model.time('01:10.12').cs,7012);assert.equal(model.time('00:01:10.12').cs,7012);assert.equal(model.time('14200').cs,10200);assert.equal(model.time('1 000001').cs,360001);
  assert.equal(model.time('').cs,null);assert.equal(model.time('DSQ').status,'invalid');
  assert.throws(()=>model.prepare({...draft,rows:[person,person]},competition),/dupliquée/);
  assert.equal(model.entry(person).key,model.entry({...person,sourceEntryId:'future-winpalme-id'}).key);
  assert.equal(model.hash({b:1,a:2}),model.hash({a:2,b:1}));
  assert.equal(model.event(draft.event,competition).id,model.event({...draft.event,sourceEventId:'future-winpalme-event'},competition).id);
  assert.throws(()=>model.prepare({...draft,rows:[{...person,birthYear:''}]},competition),/année/);
  assert.throws(()=>model.prepare({...draft,seriesNumber:2},competition),/Périmètre/);
  assert.throws(()=>model.prepare({...draft,rows:Array(1001).fill(person)},competition),/1 000/);
  assert.throws(()=>model.event({...draft.event,eventCode:'100sf;DROP'},competition));
  const schemaPool=schemaFixture(),input={phase:'prepare',confirmation:'nap-create-livepalmes-direct-tables'};
  const before=await schema.approvedDirectSchema(schemaPool,input);assert.equal(schemaPool.created(),0);assert.equal(before.dataRowsWritten,false);
  await assert.rejects(schema.approvedDirectSchema(schemaPool,{...input,phase:'apply',planHash:'bad',schemaHash:before.schemaHash}));
  const applied=await schema.approvedDirectSchema(schemaPool,{...input,phase:'apply',planHash:before.planHash,schemaHash:before.schemaHash});assert.equal(applied.verified,true);assert.equal(schemaPool.created(),5);
  const again=await schema.approvedDirectSchema(schemaPool,input);await schema.approvedDirectSchema(schemaPool,{...input,phase:'apply',planHash:again.planHash,schemaHash:again.schemaHash});assert.equal(schemaPool.created(),5);
  const fixture=sqlFixture(),store=createStore(fixture,'test'),actor={uid:'fixture'};
  const preview=await store.preview(900001,draft);await assert.rejects(store.publish(900001,actor,{...draft,fingerprint:'bad'}),/aperçu/);
  await store.publish(900001,actor,{...draft,fingerprint:preview.fingerprint});assert.equal(fixture.inspect().commits,1);assert.equal(fixture.inspect().entryRows[0].entry_time_cs,null);assert.equal(fixture.inspect().entryRows[0].result_time_cs,7012);
  assert.equal((await store.publish(900001,actor,{...draft,fingerprint:preview.fingerprint})).replayed,true);assert.equal(fixture.inspect().logs.length,1);
  const seriesDraft={...draft,kind:'series',operationKey:'fixture-operation-00002',rows:[{...person,resultTime:''}]};const seriesPreview=await store.preview(900001,seriesDraft);await store.publish(900001,actor,{...seriesDraft,fingerprint:seriesPreview.fingerprint,confirmReplacement:true});assert.equal(fixture.inspect().entryRows[0].result_time_cs,7012,'Importer les séries après les résultats préserve les temps réalisés');
  const replacement={...draft,operationKey:'fixture-operation-00003',rows:[{...person,resultTime:'01:09.99'}]},p=await store.preview(900001,replacement);await assert.rejects(store.publish(900001,actor,{...replacement,fingerprint:p.fingerprint}),/Confirmer/);fixture.failJournal();await assert.rejects(store.publish(900001,actor,{...replacement,fingerprint:p.fingerprint,confirmReplacement:true}),/interrompu/);assert.equal(fixture.inspect().entryRows[0].result_time_cs,7012);assert.equal(fixture.inspect().rollbacks,1);
  const publicFixture=sqlFixture(),pubStore=createStore(publicFixture,'test');const pub=await pubStore.preview(900001,draft);await pubStore.publish(900001,actor,{...draft,fingerprint:pub.fingerprint});publicFixture.calls.length=0;
  const responses=await Promise.all(Array.from({length:400},()=>readPublic(publicFixture,'test',{id:900001})));assert.equal(responses.length,400);assert.equal(publicFixture.calls.filter(c=>c.sql.includes('SELECT * FROM livepalmes_direct_events')).length,1);assert.equal(publicFixture.calls.filter(c=>c.sql.includes('SELECT * FROM livepalmes_direct_entries')).length,1);assert.equal(responses[0].entries[0].delta,null);assert.ok(!JSON.stringify(responses[0]).includes('created_by'));
  const hidden={...publicFixture.inspect().entryRows[0],has_series:0,has_result:0,entry_time_raw:'',result_time_raw:'',result_status:'',series_number:null};assert.equal(model.visibleEntry(hidden,false,true),false);
  const partialFixture=sqlFixture(),partialStore=createStore(partialFixture,'test');
  for(const n of [2,1]){const chunk={...draft,seriesNumber:n,operationKey:'fixture-series-result-000'+n,rows:[{...person,firstName:'Alice'+n,series:n}]},preview=await partialStore.preview(900001,chunk);await partialStore.publish(900001,actor,{...chunk,fingerprint:preview.fingerprint,confirmReplacement:true});}
  assert.equal(partialFixture.inspect().entryRows.filter(row=>row.has_result).length,2,'Le dépôt de la série 1 conserve la série 2');
  const service=createService({getPool:()=>sqlFixture(),environment:'test',authorize:async()=>({uid:'outsider',national:false,region:false}),lookupUser:async()=>null,matchRegion:(a,b)=>a===b});await assert.rejects(service({data:{action:'detail',competitionId:900001}}),error=>error.directCode==='permission-denied');
  let reads=0;const db={collection:()=>({doc:()=>({get:async()=>{reads++;return {exists:true,data:()=>({status:'inactive',capabilities:{'admin.full':true}})};}})})};await assert.rejects(readActor({auth:{uid:'disabled'}},{db,adminUids:new Set()}));assert.equal(reads,1);
  await assert.rejects(readActor({},{db,adminUids:new Set()}),error=>error.directCode==='unauthenticated');assert.equal(reads,1);
  assert.throws(()=>decode({documentKind:'series',pdfDataUrl:'data:application/pdf;base64,'+Buffer.from('bad').toString('base64')}));assert.equal(decode({documentKind:'results',pdfDataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-fixture').toString('base64')}).length,12);
  const noTable={execute:async()=>{throw Object.assign(Error(),{code:'ER_NO_SUCH_TABLE'});}};assert.deepEqual(await attachLinks(noTable,'test',[{id:'legacy-nap-900001'}]),[{id:'legacy-nap-900001'}]);
  assert.ok(fixture.calls.filter(c=>/^(INSERT|UPDATE|DELETE)/.test(c.sql)).every(c=>c.values.includes('test')));
  console.log('Direct NAP : création additive, cloisonnement, refus des accès, publication transactionnelle, reprise, limites et 400 lectures concurrentes vérifiés hors réseau.');
})().catch(error=>{console.error(error);process.exitCode=1;});
