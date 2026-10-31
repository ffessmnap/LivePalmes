"use strict";
const {assertRetained}=require("./helpers/nap-archived-tables");
const assert=require("node:assert/strict"),{isDeepStrictEqual:equal}=require("node:util");
const service=require("../functions/nap-swimmer-merge"),plans=require("../functions/nap-swimmer-merge-plan"),schema=require("../functions/nap-approved-swimmer-merge-schema"),{fingerprint}=require("../functions/nap-portal-swimmer-change"),{COLUMNS}=require("../functions/nap-approved-swimmer-correction");
// The fixed schema has separate exhaustive tests; this executor test never
// creates a connection or performs a real database operation.
schema.inspect=async()=>({});schema.validate=()=>({table:true,indexes:Array(schema.indexes.length).fill(true)});
function fixture(failAfter=0,historic=false){
  const source={id:12,nom:"TEST",prenom:"Source",date:"1980-01-01",sexe:"M",club:"106",actif:1,wc:0,edf:0,creation:"2020-01-01",number:"A-05-222647"},target={...source,id:13,prenom:"Cible",number:null};
  const input={sourceSwimmerId:"12",targetSwimmerId:"13",sourceFingerprint:fingerprint(source),targetFingerprint:fingerprint(target),sourceLicenseNumber:source.number,targetLicenseNumber:"",actorUid:"national",confirmMerge:true};
  if(historic)source.actif=0;
  const state=Object.fromEntries(plans.TABLES.map(spec=>[spec.table,[]]));
  state.forfait=[];
  state.perfs=[{id:1,nageur:12,tps:"14200",points:"123"}];
  for(const table of ["engagements_relayeurs","txt_nageurs"])state[table]=[{id:40,nageur:12,relais:20}];
  state.perfs_relais=[{id:41,nageur1:12,nageur2:20,nageur3:21,nageur4:22,tps1:"12345"}];
  state.livepalmes_qualification_grants=[{competition_id:10,swimmer_id:12,event_code:"50BI"}];
  state.livepalmes_swimmer_merges=[{swimmer_id:11,target_id:12,merged_at:"2026-01-01",merged_by:"national"}];
  if(historic)state.livepalmes_swimmer_merges.push({swimmer_id:12,target_id:13,merged_at:"2026-01-02",merged_by:"previous-admin"});
  state.nageursengager=[{id:2,nageur:12,compet:10},{id:3,nageur:13,compet:10}];
  state.engagements=[{id:4,engagement:2,course:"50BI",tps:"1234"},{id:5,engagement:3,course:"50BI",tps:"1250"},{id:6,engagement:2,course:"100BI",tps:"4567"}];
  state.nageurs=[structuredClone(source),structuredClone(target)];
  state.livepalmes_swimmer_license_seasons=[{swimmer_id:12,season:"2026-2027",license_number:source.number,status:"valid",source:"national_manual",federal_validity_end_date:null,validated_at:"2026-10-09 10:00:00.000000",validated_by:"national",version:"3"}];
  let saved,writes=0,failed=false,completed=0,connections=0;
  const audit={read:async()=>saved,prepare:async(op,plan)=>{assert.equal(writes,0);saved=structuredClone(plan);},complete:async()=>{completed++;}};
  const connection={execute:async({sql,timeout},values=[])=>{
    assert.equal(timeout,10000);assertRetained(sql,values);
    if(sql.startsWith("EXPLAIN"))return [[{table:"native",type:"range",key:"PRIMARY"}]];
    if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("information_schema.TRIGGERS")||sql.startsWith("SELECT id FROM forfait"))return [[]];
    if(sql===require("../functions/nap-swimmer-merge-forfeits").SQL)return [structuredClone(state.forfait)];
    if(sql.startsWith("SELECT num_club"))return [sql.includes(" IN (")?[106,107,999].filter(id=>values.includes(id)).map(num_club=>({num_club,abre_club:"FIC",nom_club:"Club fictif"})):[{num_club:107,abre_club:"FIC",nom_club:"Club fictif"}]];
    if(sql.startsWith("SELECT id FROM nageurs"))return [[]];
    if(sql.startsWith("SELECT")&&sql.includes("FROM nageurs FORCE INDEX"))return [structuredClone(state.nageurs)];
    if(sql.startsWith("SELECT swimmer_id,target_id"))return [structuredClone(state.livepalmes_swimmer_merges.filter(row=>values.includes(row.swimmer_id)))];
    if(sql.startsWith("SELECT")&&sql.includes("FROM livepalmes_swimmer_license_seasons"))return [structuredClone(state.livepalmes_swimmer_license_seasons)];
    if(sql.startsWith("SELECT * FROM")){
      const table=sql.match(/^SELECT \* FROM `?([a-z_]+)`?/)[1],field=sql.match(/WHERE `([a-z0-9_]+)` IN/)?.[1]||"engagement";
      const rows=state[table].filter(row=>values.includes(row[field])&&(table!=="livepalmes_swimmer_merges"||![12,13].includes(row.swimmer_id)));
      return [structuredClone(rows)];
    }
    assert.ok(saved,"No write before durable backup");
    let count=0;
    if(sql.startsWith("INSERT INTO livepalmes_swimmer_merges")){state.livepalmes_swimmer_merges.push(structuredClone(saved.marker));count=1;}
    else{
      const table=sql.match(/^(?:UPDATE|DELETE FROM) `([a-z_]+)`/)[1],remove=sql.startsWith("DELETE");
      if(table==="nageurs"){
        const id=values[values.length-COLUMNS.length],before=id===12?(remove?saved.sourceAfter:saved.source):saved.target,after=id===12?saved.sourceAfter:saved.targetAfter;
        const index=state.nageurs.findIndex(row=>equal(row,before));assert.ok(index>=0);if(remove)state.nageurs.splice(index,1);else state.nageurs[index]=structuredClone(after);count=1;
      }else{
        const change=table==="livepalmes_swimmer_license_seasons"?{updates:saved.licensePlan.transfers,removals:saved.licensePlan.replacements}:saved.changes.find(item=>item.table===table);
        if(remove){const candidates=change.removals.filter(row=>state[table].some(actual=>equal(actual,row)));count=candidates.length;state[table]=state[table].filter(row=>!candidates.some(item=>equal(item,row)));}
        else for(const item of change.updates){const index=state[table].findIndex(row=>equal(row,item.before));if(index>=0){state[table][index]=structuredClone(item.after);count++;}}
      }
    }
    writes++;if(state.changeForfeitAfterWrite&&state.forfait.length)state.forfait[0].forfait=0;
    if(writes===failAfter&&!failed){failed=true;throw Error("Simulated lost response");}
    return [{affectedRows:count}];
  },query:async({sql})=>{assertRetained(sql);assert.match(sql,/^(LOCK TABLES|UNLOCK TABLES)/);return [{}];},release(){},destroy(){throw Error("Unsafe connection");}};
  return {input,state,audit,pool:{getConnection:async()=>{connections++;return connection;}},stats:()=>({writes,completed,connections})};
}
(async()=>{
  const normal=fixture();const result=await service.mergeSwimmers(normal.pool,normal.input,normal.audit,async()=>{});
  assert.equal(result.sourceDeleted,true);assert.equal(normal.state.nageurs.some(row=>row.id===12),false);assert.equal(result.licenseSeasonTransferCount,1);assert.equal(normal.state.nageurs.find(row=>row.id===13).number,"A-05-222647");assert.equal(normal.state.livepalmes_swimmer_license_seasons[0].swimmer_id,13);assert.equal(normal.state.livepalmes_swimmer_license_seasons[0].status,"valid");
  assert.equal(normal.state.perfs[0].tps,"14200");assert.equal(normal.state.perfs[0].nageur,13);assert.equal(normal.state.engagements.length,2);assert.equal(normal.state.engagements.find(row=>row.id===6).engagement,3);assert.equal(normal.state.nageursengager.length,1);
  assert.equal(normal.state.perfs[0].club,"106");assert.equal(normal.state.perfs_relais[0].club,"106");assert.equal(result.historicalClubUpdateCount,2);
  const priorPlan=structuredClone(await normal.audit.read());priorPlan.snapshots.cnc_edf=[];
  const priorStats=normal.stats();await assert.rejects(service.mergeSwimmers(normal.pool,normal.input,{...normal.audit,read:async()=>priorPlan},async()=>{}),/Reprise manuelle/);assert.deepEqual(normal.stats(),priorStats,"An old saved plan is refused before obtaining a connection or writing");
  const total=normal.stats().writes;await service.mergeSwimmers(normal.pool,normal.input,normal.audit,async()=>{});assert.equal(normal.stats().writes,total);
  for(const spec of plans.TABLES.filter(spec=>spec.table!=="engagements"))assert.ok(normal.state[spec.table].every(row=>spec.fields.every(field=>Number(row[field])!==12)),spec.table);
  assert.equal(normal.state.livepalmes_swimmer_merges.find(row=>row.swimmer_id===11).target_id,13);
  assert.equal(normal.state.txt_nageurs[0].nageur,13,"Retained import links follow the merged identity");assert.equal(normal.state.txt_nageurs[0].id,40);
  const refreshed=await service.mergeSwimmers(normal.pool,{...normal.input,targetLicenseNumber:"A-05-222647"},normal.audit,async()=>{});assert.equal(refreshed.target.licenseSeasonStatus,"valid");assert.equal(normal.stats().writes,total);
  for(let stop=1;stop<=total;stop++){
    const f=fixture(stop);await assert.rejects(service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{}));
    await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});assert.equal(f.state.perfs[0].nageur,13);assert.equal(f.state.livepalmes_swimmer_license_seasons[0].swimmer_id,13);assert.equal(f.state.nageurs.some(row=>row.id===12),false);assert.equal(f.stats().writes,total);
  }
  for(let stop=1;stop<=total;stop++){
    const f=fixture(stop);f.input.finalClubId="107";f.state.perfs[0].club="999";
    await assert.rejects(service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{}));
    await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});assert.equal(f.state.nageurs[0].club,"107");assert.equal(f.state.perfs[0].club,"999");
  }
  const selected=fixture();selected.input.finalClubId="107";selected.state.perfs[0].club="999";
  await service.mergeSwimmers(selected.pool,selected.input,selected.audit,async()=>{});assert.equal(selected.state.nageurs[0].club,"107");assert.equal(selected.state.perfs[0].club,"999");
  await service.mergeSwimmers(selected.pool,selected.input,selected.audit,async()=>{});
  await assert.rejects(service.mergeSwimmers(selected.pool,{...selected.input,finalClubId:"0"},selected.audit,async()=>{}));
  const denied=fixture();await assert.rejects(service.mergeSwimmers(denied.pool,denied.input,denied.audit,async()=>{throw Error("Denied");}));assert.equal(denied.stats().connections,0);
  const lostAudit=fixture(),complete=lostAudit.audit.complete;let fail=true;
  lostAudit.audit.complete=async(...args)=>{if(fail){fail=false;throw Error("Audit unavailable");}return complete(...args);};
  await assert.rejects(service.mergeSwimmers(lostAudit.pool,lostAudit.input,lostAudit.audit,async()=>{}),/Audit unavailable/);
  assert.equal(lostAudit.state.nageurs.some(row=>row.id===12),false);
  const writes=lostAudit.stats().writes;
  assert.equal((await service.mergeSwimmers(lostAudit.pool,lostAudit.input,lostAudit.audit,async()=>{})).sourceDeleted,true);
  assert.equal(lostAudit.stats().writes,writes);
  const historic=fixture(0,true);
  assert.equal((await service.mergeSwimmers(historic.pool,historic.input,historic.audit,async()=>{})).sourceDeleted,true);
  assert.equal(historic.state.nageurs.some(row=>row.id===12),false);
  assert.equal(historic.state.livepalmes_swimmer_merges.find(row=>row.swimmer_id===12).merged_by,"previous-admin");
  const conflict=fixture();conflict.state.livepalmes_swimmer_license_seasons.push({...conflict.state.livepalmes_swimmer_license_seasons[0],swimmer_id:13,license_number:"B-OTHER"});
  await assert.rejects(service.mergeSwimmers(conflict.pool,conflict.input,conflict.audit,async()=>{}),/meme saison/);assert.equal(conflict.stats().writes,0);
  const unrelated=fixture();unrelated.state.forfait=[{id:86,compet:10,engagement:919,forfait:1}];
  const originalForfaits=structuredClone(unrelated.state.forfait);
  await service.mergeSwimmers(unrelated.pool,unrelated.input,unrelated.audit,async()=>{});
  assert.deepEqual(unrelated.state.forfait,originalForfaits);
  assert.deepEqual((await unrelated.audit.read()).forfeitPolicy.rows,originalForfaits);
  for(const engagement of [2,3,4,5,6])for(const compet of [10,199]){
    const linked=fixture();linked.state.forfait=[{id:86,compet,engagement,forfait:1}];
    await assert.rejects(service.mergeSwimmers(linked.pool,linked.input,linked.audit,async()=>{}),/forfait historique reference/);
    assert.equal(linked.stats().writes,0);assert.equal(await linked.audit.read(),undefined);
  }
  const overflow=fixture();overflow.state.forfait=Array.from({length:501},(_,i)=>({id:i+1,compet:10,engagement:919,forfait:1}));
  await assert.rejects(service.mergeSwimmers(overflow.pool,overflow.input,overflow.audit,async()=>{}),/Trop de forfaits/);assert.equal(overflow.stats().writes,0);
  const staleForfeit=fixture(1);staleForfeit.state.forfait=[{id:86,compet:10,engagement:919,forfait:1}];
  await assert.rejects(service.mergeSwimmers(staleForfeit.pool,staleForfeit.input,staleForfeit.audit,async()=>{}),/lost response/);
  staleForfeit.state.forfait[0].forfait=0;const previousWrites=staleForfeit.stats().writes;
  await assert.rejects(service.mergeSwimmers(staleForfeit.pool,staleForfeit.input,staleForfeit.audit,async()=>{}),/forfaits historiques ont change/);assert.equal(staleForfeit.stats().writes,previousWrites);
  const legacyAudit=fixture();await service.mergeSwimmers(legacyAudit.pool,legacyAudit.input,legacyAudit.audit,async()=>{});
  delete (await legacyAudit.audit.read()).forfeitPolicy;
  await service.mergeSwimmers(legacyAudit.pool,legacyAudit.input,legacyAudit.audit,async()=>{});
  const during=fixture();during.state.forfait=[{id:86,compet:10,engagement:919,forfait:1}];during.state.changeForfeitAfterWrite=true;
  await assert.rejects(service.mergeSwimmers(during.pool,during.input,during.audit,async()=>{}),/forfaits historiques ont change pendant/);
  assert(during.state.nageurs.some(row=>row.id===12));assert.equal(during.stats().completed,0);
  // Every uncertain write can still resume with unrelated forfaits intact.
  for(let stop=1;stop<=total;stop++){
    const f=fixture(stop);f.state.forfait=[{id:86,compet:10,engagement:919,forfait:1}];
    await assert.rejects(service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{}));
    await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});
    assert.equal(f.state.nageurs.some(row=>row.id===12),false);assert.equal(f.state.forfait[0].forfait,1);
  }
  console.log("Native swimmer merge executor: licence season retained, raw result times unchanged, entries joined, authorization, no-op retries and every lost-write-response stage passed without network.");
  for(let stop=0;stop<=total;stop++){
    const f=fixture(stop);f.state.engagements.push({...f.state.engagements[1],id:7,tps:"1200"},{...f.state.engagements[2],id:8});
    let summary;try{await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});assert.fail("Conflict expected");}catch(error){summary=error.mergeConflicts;assert.ok(summary);}
    assert.equal(f.stats().writes,0);assert.equal(await f.audit.read(),undefined);
    f.input.entryConflictToken=summary.token;f.input.entryConflictChoices=summary.conflicts.map(row=>({key:row.key,id:"7"}));
    if(stop)await assert.rejects(service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{}),/lost response/);
    await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});
    assert.deepEqual(f.state.engagements.map(row=>row.id).sort((a,b)=>a-b),[6,7]);assert.equal(f.state.engagements.find(row=>row.id===7).tps,"1200");
    assert.equal(f.state.nageursengager.length,1);assert.equal(f.state.nageurs.some(row=>row.id===12),false);
  }
  console.log("Duplicate-course execution: no backup/write before choice, selected raw time retained, union and every lost-write-response stage passed.");
  for(const stop of [1,total]){
    const f=fixture(stop),backup=require("../functions/nap-swimmer-merge-backup"),audit=f.audit;let durable;
    f.state.perfs=Array.from({length:600},(_,id)=>({...f.state.perfs[0],id:id+1,note:"Historique fictif volumineux. ".repeat(20)}));
    f.audit={...audit,prepare:async(operation,plan)=>{durable=backup.encode(plan);await audit.prepare(operation,plan);},read:async()=>durable?backup.decode(durable):undefined};
    await assert.rejects(service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{}),/lost response/);assert.equal(durable.encoding,"swimmer-merge-gzip-v1");
    await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});assert.equal(f.state.nageurs.some(row=>row.id===12),false);assert.equal(f.state.perfs.length,600);assert.ok(f.state.perfs.every(row=>row.nageur===13&&row.tps==="14200"));
  }
  console.log("Large compressed plans: first/final uncertain writes resume with all 600 performances and raw times preserved.");
})().catch(error=>{console.error(error);process.exitCode=1;});
