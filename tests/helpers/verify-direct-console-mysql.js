'use strict';
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createStore}=require('../../functions/nap-direct-store'),{createConsoleStore}=require('../../functions/nap-direct-console-store'),flow=require('../../functions/nap-direct-console-model');
async function verify({pool,id,actor,native,failJournal}){
  const originalLevel=native.native_level_code;native.native_level_code=2;
  try{
    const store=createStore(pool,'test');await store.settings(id,actor,{version:(await store.config(id)).version,consoles:flow.roles,operationKey:randomUUID()});
    const consoles=createConsoleStore(pool,store),permissions={manage:true,roles:flow.roles,competition:await store.native(id)};
    let snapshot=await consoles.snapshot(id,{role:'computer'},permissions);const selected=snapshot.events.find(event=>event.phase==='series');assert.ok(selected);
    const eventId=selected.id,send=async(command,role,extra={})=>{const s=await consoles.snapshot(id,{role,eventId},permissions);return consoles.command(id,actor,{command,role,eventId,revision:s.revision,configVersion:s.configVersion,operationKey:randomUUID(),...extra},permissions);};
    const publicationBefore=(await store.config(id)).version;
    await send('configure','computer',{lanes:6,events:[{id:eventId,format:'a',lanes:6}]});
    snapshot=await consoles.snapshot(id,{role:'referee',eventId},permissions);const participant=snapshot.entries[0];
    await send('decision','referee',{participantKey:participant.key,type:'false_start'});
    snapshot=await consoles.snapshot(id,{role:'video',eventId},permissions);assert.equal(snapshot.workflow.alerts.at(-1).videoStatus,'pending');const alertId=snapshot.workflow.alerts.at(-1).id;
    const input={command:'videoReject',role:'video',eventId,alertId,revision:snapshot.revision,configVersion:snapshot.configVersion,operationKey:randomUUID()};
    const receipt=await consoles.command(id,actor,input,permissions),retry=await consoles.command(id,actor,input,permissions);assert.equal(retry.replayed,true);assert.equal(retry.revision,receipt.revision,'Reprise JSON MySQL idempotente');
    for(const [sql,values]of [["SELECT JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.revision')) FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=? LIMIT 1",['test',id,require('../../functions/nap-direct-console-store').stateId]],["SELECT source_hash,after_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND operation_key=? LIMIT 1",['test',id,require('../../functions/nap-direct-model').hash(['direct-console-command',input.operationKey])]]]){const [plan]=await pool.execute('EXPLAIN '+sql,values);assert.ok(plan.every(row=>row.key&&Number(row.rows)<=1),'État et reçu privés utilisent leurs clés sans scan');}
    snapshot=await consoles.snapshot(id,{role:'referee',eventId},permissions);
    const competing=[1,2].map(series=>consoles.command(id,actor,{command:'progress',role:'referee',eventId,series:participant.series,revision:snapshot.revision,configVersion:snapshot.configVersion,operationKey:randomUUID()},permissions));
    const results=await Promise.allSettled(competing);assert.equal(results.filter(r=>r.status==='fulfilled').length,1,'Deux écritures concurrentes ne se remplacent pas silencieusement');assert.equal(results.find(r=>r.status==='rejected').reason.directCode,'aborted');
    const stable=await consoles.snapshot(id,{role:'computer',eventId},permissions),unchanged=await consoles.snapshot(id,{role:'computer',eventId,revision:stable.revision,configVersion:stable.configVersion},permissions);assert.equal(unchanged.unchanged,true);
    failJournal(2);await assert.rejects(send('progress','referee',{series:participant.series}),/Interruption/);failJournal(0);const after=await consoles.snapshot(id,{role:'computer',eventId},permissions);assert.equal(after.revision,stable.revision,'Le rollback du journal annule l’UPDATE JSON de l’état');
    assert.equal((await store.config(id)).version,publicationBefore,'Les consoles ne perturbent pas les versions des imports TXT');
    const partialEvent={eventCode:'50ap',eventLabel:'50 m Apnée',sex:'M',sessionKey:'99',expectedSeries:1},partialRows=Array.from({length:7},(_,i)=>({lastName:'PARTIEL',firstName:String(i+1),birthYear:2006,club:'CLUB',category:'HJU',series:1,lane:i+1,entryTime:'595999',resultTime:'00:'+String(20+(i===6?5:i)).padStart(2,'0')+'.00'}));
    for(const kind of ['series','results']){const batch={groups:[{kind,event:partialEvent,rows:partialRows,operationKey:randomUUID()}]},preview=await store.previewBatch(id,batch);await store.publishBatch(id,actor,{...batch,fingerprint:preview.fingerprint});}
    const partialId=(await store.detail(id)).events.find(e=>e.eventCode==='50ap').id;
    const partialSend=async(command,role,extra={})=>{const current=await consoles.snapshot(id,{role,eventId:partialId},permissions);return consoles.command(id,actor,{command,role,eventId:partialId,revision:current.revision,configVersion:current.configVersion,operationKey:randomUUID(),...extra},permissions);};
    await partialSend('configure','computer',{lanes:6,events:[{id:partialId,format:'a',lanes:6}]});await partialSend('announceFinalists','speaker');
    let partial=await consoles.snapshot(id,{role:'computer',eventId:partialId},permissions);assert.equal(partial.finals.partial,true);assert.equal(partial.finals.roster.a.length,5);
    await partialSend('withdraw','secretary',{participantKey:partial.finals.roster.a[0]});await assert.rejects(partialSend('announceReplacement','speaker'),/confirmer l’annulation/);await partialSend('confirmSwimoffCancelled','referee');await partialSend('announceReplacement','speaker');
    partial=await consoles.snapshot(id,{role:'computer',eventId:partialId},permissions);assert.equal(partial.finals.partial,false);assert.equal(partial.finals.roster.a.length,6,'Annonce partielle, forfait et annonce complète conservés dans le JSON MySQL');
    const other=createConsoleStore(pool,createStore(pool,'production'));await assert.rejects(other.snapshot(id,{role:'computer'},permissions),/fermées/,'État opérationnel isolé de production');
    const deadlinePath='$.races."'+partialId+'".announced.at';await pool.execute('UPDATE livepalmes_direct_publications SET after_json=JSON_SET(after_json,?,?) WHERE environment=? AND competition_id=? AND id=?',[deadlinePath,new Date(Date.now()-31*60000).toISOString(),'test',id,require('../../functions/nap-direct-console-store').stateId]);
    partial=await consoles.snapshot(id,{role:'secretary',eventId:partialId},permissions);const lateKey=partial.finals.roster.a[0];await assert.rejects(partialSend('withdraw','secretary',{participantKey:lateKey}),/explicitement/);await partialSend('withdraw','secretary',{participantKey:lateKey,confirmLateWithdrawal:true});partial=await consoles.snapshot(id,{role:'secretary',eventId:partialId},permissions);assert.equal(partial.finals.withdrawals[lateKey].late,true);assert.equal(partial.workflow.history.at(-1).late,true,'Confirmation hors délai et journal conservés par MySQL');
    const [publicPlan]=await pool.execute("EXPLAIN SELECT JSON_EXTRACT(after_json,'$.races') AS races_json FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=? LIMIT 1",['test',id,require('../../functions/nap-direct-console-store').stateId]);assert.ok(publicPlan.every(row=>row.key&&Number(row.rows)<=1),'Projection publique par clé, sans scan');
    const protectedBefore=await store.detail(id),resetSnapshot=await consoles.snapshot(id,{role:'computer'},permissions);
    const reset={command:'resetConsoles',role:'computer',confirmation:'reset-consoles-'+id,revision:resetSnapshot.revision,configVersion:resetSnapshot.configVersion,operationKey:randomUUID()};
    failJournal(2);await assert.rejects(consoles.command(id,actor,reset,permissions),/Interruption/);failJournal(0);
    assert.equal((await consoles.snapshot(id,{role:'computer'},permissions)).revision,resetSnapshot.revision,'Reset SQL annulé intégralement si son reçu échoue');
    await consoles.command(id,actor,reset,permissions);assert.equal((await consoles.command(id,actor,reset,permissions)).replayed,true);
    const cleared=await consoles.snapshot(id,{role:'computer'},permissions);assert.equal(cleared.workflow.historyCount,0);assert.equal(cleared.workflow.alerts.length,0);assert.equal(Object.keys(cleared.workflow.races).length,0);assert.equal(cleared.revision,resetSnapshot.revision+1);
    const protectedAfter=await store.detail(id);assert.equal(protectedAfter.config.revision,protectedBefore.config.revision+1,'Le reset invalide uniquement les qualifications publiques en cache');assert.deepEqual({...protectedAfter,config:{...protectedAfter.config,revision:protectedBefore.config.revision}},protectedBefore,'Le vrai DELETE privé ne change ni imports ni activation ni accès');
    const [remaining]=await pool.execute("SELECT COUNT(*) AS total FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND action='console-command'",['test',id]);assert.equal(Number(remaining[0].total),1);
    console.log('Consoles MySQL isolé : JSON privé, reçus, verrouillage concurrent, refus des versions anciennes, rollback, annonce partielle/forfait/annulation du swim-off et isolation environnement vérifiés.');
  }finally{native.native_level_code=originalLevel;failJournal(0);}
}
module.exports={verify};
