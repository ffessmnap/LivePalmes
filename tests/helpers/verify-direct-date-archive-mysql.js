'use strict';
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createStore}=require('../../functions/nap-direct-store'),txt=require('../../assets/direct/winpalme-txt'),model=require('../../functions/nap-direct-model');
async function verify({pool,id,actor}){
  const clock=()=>Date.parse('2026-11-08T23:00:00Z'),store=createStore(pool,'test',{clock});
  const current=await store.config(id),original=current.state;
  const sql='SELECT d.*,c.date AS direct_date,c.enddate AS direct_enddate FROM livepalmes_direct_competitions d LEFT JOIN competitions c ON c.id=d.competition_id WHERE d.environment=? AND d.competition_id=? LIMIT 1';
  const [plan]=await pool.execute('EXPLAIN '+sql,['test',id]);assert.ok(plan.every(row=>row.key==='PRIMARY'&&Number(row.rows)<=1),'Dates et activation sur deux clés primaires : '+JSON.stringify(plan));
  assert.equal(current.direct_date,'2026-11-07');assert.equal(current.direct_enddate,'2026-11-08');assert.equal(store.configView(current).state,'archived');
  const snapshot=await store.watchContext(id,{archiveCorrection:true}),event=snapshot.events.find(e=>e.eventCode==='100sf');assert.ok(event);
  const entries=snapshot.entries.filter(row=>row.eventId===event.id),series=entries[0].series,heat=entries.filter(row=>row.series===series),text=heat.map(row=>row.lane+';012000;000000;000000;000000;000000;000000').join('\n');
  const group=txt.buildGroup({name:`FIXTURE_AS_${event.sessionKey}_01_${series}_100SF.txt`,text,hash:model.hash(text)},snapshot,event.id,{txtFirstLane:1,seriesFirstLane:1}),input={archiveCorrection:true,groups:[group]},preview=await store.previewBatch(id,input);
  const before=snapshot.entries.map(({result,splits,rank,delta,...rest})=>rest);
  await store.publishBatch(id,actor,{...input,fingerprint:preview.fingerprint,confirmReplacement:true});
  const after=await store.watchContext(id,{archiveCorrection:true});assert.equal((await store.config(id)).state,original);assert.equal(after.config.state,'archived');
  assert.deepEqual(after.entries.map(({result,splits,rank,delta,...rest})=>rest),before,'La correction SQL ne modifie aucune identité/ligne/engagement');
  assert.ok(after.entries.filter(row=>row.eventId===event.id&&row.series===series).every(row=>row.result.cs===8000));
  console.log('Archive MySQL isolé : jointure PK bornée, archivage effectif sans mutation et correction transactionnelle de résultats sans rouvrir le Direct vérifiés.');
}
module.exports={verify};
