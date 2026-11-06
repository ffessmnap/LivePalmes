"use strict";
// Real SQL for the new Direct tables, only inside the existing loopback CI container.
// The native calendar SELECT is a fixture; no real NAP credentials are accepted.
const assert=require('node:assert/strict'),mysql=require('../functions/node_modules/mysql2/promise');
const schema=require('../functions/nap-direct-schema'),{createStore}=require('../functions/nap-direct-store'),{readPublic}=require('../functions/nap-direct-public');
const {randomUUID}=require('node:crypto');
async function main(){
  assert.equal(process.env.NAP_TEAM_FIXTURE_ALLOWED,'isolated-ci');assert.ok(process.env.NAP_TEAM_FIXTURE_PASSWORD);
  const database='lp_direct_fixture_'+Date.now()+'_'+process.pid;assert.match(database,/^lp_direct_fixture_[0-9]+_[0-9]+$/);
  const settings={host:'127.0.0.1',port:33317,user:'root',password:process.env.NAP_TEAM_FIXTURE_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false,connectionLimit:3};
  const admin=await mysql.createConnection(settings);const [[runtime]]=await admin.query('SELECT VERSION() AS version');assert.match(runtime.version,/^5\.7\./);
  await admin.query('CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  const pool=mysql.createPool({...settings,database});let failJournal=0;
  const native={id:900009,libelle:'Compétition fictive isolée',date:'2026-11-07',enddate:'2026-11-08',lieu:'Piscine fictive',type_label:'Piscine',native_level_code:1,comite:'09',bassin:50};
  const wrapped={execute:async(options,values=[])=>{
    const sql=typeof options==='string'?options:options.sql;
    if(sql.includes(' FROM competitions c')){
      if(sql.includes('d.state AS')){const [[config]]=await pool.execute('SELECT * FROM livepalmes_direct_competitions WHERE environment=? AND competition_id=? LIMIT 1',values);return [[{...native,direct_state:config?.state,direct_visible:config?.public_visible,direct_revision:config?.public_revision,direct_documents:config?.documents_json}]];}
      return [[native]];
    }
    return pool.execute(options,values);
  },getConnection:async()=>{const connection=await pool.getConnection();return {beginTransaction:()=>connection.beginTransaction(),commit:()=>connection.commit(),rollback:()=>connection.rollback(),release:()=>connection.release(),execute:async(options,values)=>{const sql=typeof options==='string'?options:options.sql;if(sql.startsWith('INSERT INTO livepalmes_direct_publications')&&failJournal>0&&--failJournal===0)throw Error('Interruption de journal simulée');assert.ok(!/^(INSERT|UPDATE|DELETE)/.test(sql)||/^(?:INSERT INTO|UPDATE|DELETE FROM) livepalmes_direct_/.test(sql));return connection.execute(options,values);}};}};
  const actor={uid:'isolated-fixture'},store=createStore(wrapped,'test'),id=900009;
  const person=(name,series)=>({lastName:'EXEMPLE',firstName:name,birthYear:2008,club:'CLUB',category:'FJU',series,lane:4,entryTime:'595999'});
  const event={eventCode:'100sf',sex:'F',sessionKey:'1',date:'2026-11-07',order:7};
  const request=(kind,rows,seriesNumber=null)=>({kind,event:{...event,order:kind==='results'?undefined:event.order},rows,seriesNumber,source:{type:'pdf',name:'fixture.pdf'},operationKey:randomUUID()});
  const publish=async draft=>{const preview=await store.preview(id,draft);return store.publish(id,actor,{...draft,fingerprint:preview.fingerprint,confirmReplacement:true});};
  try{
    const before=await schema.approvedDirectSchema(pool,{phase:'prepare',confirmation:'nap-create-livepalmes-direct-tables'});
    await schema.approvedDirectSchema(pool,{phase:'apply',confirmation:'nap-create-livepalmes-direct-tables',schemaHash:before.schemaHash,planHash:schema.planHash});
    assert.equal((await pool.query('SHOW TABLES'))[0].length,5);
    await store.settings(id,actor,{consoles:['computer'],operationKey:randomUUID()});
    await publish(request('series',[person('Alice',1),person('Béatrice',2)]));
    for(const [name,series,time]of [['Béatrice',2,'01:12.34'],['Alice',1,'01:10.12']])await publish(request('results',[{...person(name,series),resultTime:time}],series));
    assert.equal((await store.detail(id)).events[0].order,7,'Les résultats sans ordre ne déplacent pas la course dans le programme');
    let [rows]=await pool.query("SELECT * FROM livepalmes_direct_entries WHERE environment='test' ORDER BY series_number");assert.equal(rows.length,2);assert.ok(rows.every(row=>row.entry_time_cs===null&&row.entry_time_status==='no_reference'&&Number(row.has_series)===1&&Number(row.has_result)===1));assert.equal(Number(rows[1].result_time_cs),7234);
    const retry=request('results',[{...person('Alice',1),resultTime:'01:09.99'}],1);const receipt=await publish(retry);assert.equal(receipt.ok,true);assert.equal((await store.publish(id,actor,{...retry,fingerprint:'lost-response'})).replayed,true,'Une reprise survit à la normalisation JSON de MySQL');
    const snapshot=JSON.stringify((await pool.query('SELECT * FROM livepalmes_direct_entries ORDER BY participant_key'))[0]);
    failJournal=true;await assert.rejects(publish(request('results',[{...person('Alice',1),resultTime:'01:00.00'}],1)),/Interruption/);failJournal=false;assert.equal(JSON.stringify((await pool.query('SELECT * FROM livepalmes_direct_entries ORDER BY participant_key'))[0]),snapshot,'Rollback réel des résultats et versions');
    const batch={groups:['200sf','400sf'].map((code,index)=>({...request('series',[person('Même nageuse',1)]),event:{...event,eventCode:code,scheduledAt:`09:0${index}`,heatSchedule:[{number:1,scheduledAt:`09:0${index}`}]} }))};
    const previewBatch=await store.previewBatch(id,batch);await store.publishBatch(id,actor,{...batch,fingerprint:previewBatch.fingerprint});
    assert.equal((await store.publishBatch(id,actor,{...batch,fingerprint:'response-lost'})).replayed,true,'Reprise JSON MySQL du lot entier');
    const scheduleView=(await store.detail(id)).events.filter(e=>['200sf','400sf'].includes(e.eventCode));assert.equal(scheduleView.length,2);assert.ok(scheduleView.every(e=>e.heatSchedule.length===1));
    const beforeBatch=JSON.stringify((await pool.query('SELECT * FROM livepalmes_direct_entries ORDER BY event_id,participant_key'))[0]);
    const changedBatch={groups:batch.groups.map(group=>({...group,operationKey:randomUUID(),rows:group.rows.map(row=>({...row,entryTime:'01:01.00'}))}))},changedPreview=await store.previewBatch(id,changedBatch);
    failJournal=2;await assert.rejects(store.publishBatch(id,actor,{...changedBatch,fingerprint:changedPreview.fingerprint,confirmReplacement:true}),/Interruption/);failJournal=0;
    assert.equal(JSON.stringify((await pool.query('SELECT * FROM livepalmes_direct_entries ORDER BY event_id,participant_key'))[0]),beforeBatch,'Le second échec annule toutes les épreuves du lot');
    const watch=await store.watchContext(id),watchedEvent=watch.events.find(e=>e.eventCode==='200sf'),watched={...request('results',[{...person('Même nageuse',1),resultTime:'01:12.00'}],1),event:watchedEvent,seriesFingerprint:watch.seriesFingerprints[watchedEvent.id+':1']};
    const watchPreview=await store.previewBatch(id,{groups:[watched]});await store.publishBatch(id,actor,{groups:[watched],fingerprint:watchPreview.fingerprint});
    const [watchedRows]=await pool.execute('SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id=?',['test',id,watchedEvent.id]);assert.equal(watchedRows.length,1);assert.equal(watchedRows[0].result_time_cs,7200);
    const moved={...batch.groups[0],operationKey:randomUUID(),rows:batch.groups[0].rows.map(row=>({...row,lane:5}))},movePreview=await store.previewBatch(id,{groups:[moved]});await store.publishBatch(id,actor,{groups:[moved],fingerprint:movePreview.fingerprint,confirmReplacement:true});
    await assert.rejects(store.previewBatch(id,{groups:[{...watched,operationKey:randomUUID()}]}),/répartition des séries a changé/,'Un changement réel de ligne invalide la veille');
    const relayEvent={...event,eventCode:'4x50sf',sex:'X'},relayRow={lastName:'EQUIPE',club:'CLUB',relay:true,series:1,lane:2,entryTime:'02:00.00'},relaySeries={...request('series',[{...relayRow,sourceEntryId:'relay-slot-2'}]),event:relayEvent};
    await publish(relaySeries);await publish({...request('results',[{...relayRow,resultTime:'01:59.99'}]),event:relayEvent});await publish({...relaySeries,operationKey:randomUUID(),seriesNumber:1,rows:[relayRow]});
    const [relayRows]=await pool.query("SELECT * FROM livepalmes_direct_entries WHERE environment='test' AND entry_kind='relay'");assert.equal(relayRows.length,1);assert.equal(relayRows[0].source_entry_id,'relay-slot-2');assert.equal(relayRows[0].result_time_cs,11999,'Séries et résultat PDF restent sur une même équipe');
    const detail=await store.detail(id),version=detail.config.version,target=detail.events.find(event=>event.eventCode==='100sf').id;await store.visibility(id,actor,{version,eventId:target,kind:'results',visible:false,operationKey:randomUUID()});
    const progressModule=require('../functions/nap-direct-progress'),[progressPlan]=await pool.execute('EXPLAIN '+progressModule.QUERY,['test',id]);assert.ok(progressPlan.some(row=>row.table==='livepalmes_direct_entries'&&row.key),'Agrégat borné : index de compétition utilisé');
    assert.equal(detail.events.find(event=>event.id===target).progress.resultEntries,2);assert.equal(detail.events.find(event=>event.id===target).progress.completeSeriesCount,2);
    const publicHidden=await readPublic(wrapped,'test',{id,eventId:target});assert.ok(publicHidden.entries.every(row=>row.result.cs===null));
    assert.equal(publicHidden.events.find(event=>event.id===target).progress.resultEntries,0,'Les compteurs publics masquent aussi les résultats retirés');
    await assert.rejects(readPublic(wrapped,'production',{id}),error=>error.directCode==='not-found','TEST et PROD restent indépendants dans la même base');
    const plans=[];for(const [sql,params]of [["SELECT * FROM livepalmes_direct_events WHERE environment=? AND competition_id=? ORDER BY program_order,id LIMIT 301",['test',id]],["SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? AND event_id=? ORDER BY series_number,lane,participant_key LIMIT 1001",['test',id,detail.events[0].id]]]){const [plan]=await pool.execute('EXPLAIN '+sql,params);plans.push(plan.map(row=>({table:row.table,key:row.key,rows:row.rows})));assert.ok(plan.every(row=>Number(row.rows)<=1001));}
    console.log('Direct MySQL 5.7 isolé : cinq tables, séries/résultats dans le désordre, remplacement partiel, reprise JSON, rollback, visibilité, environnements et plans indexés vérifiés. '+JSON.stringify(plans));
  }finally{await pool.end();await admin.query('DROP DATABASE `'+database+'`');await admin.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
