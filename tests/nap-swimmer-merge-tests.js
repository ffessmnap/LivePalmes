"use strict";
const assert=require("node:assert/strict"),{isDeepStrictEqual:equal}=require("node:util");
const service=require("../functions/nap-swimmer-merge"),plans=require("../functions/nap-swimmer-merge-plan"),schema=require("../functions/nap-approved-swimmer-merge-schema"),{fingerprint}=require("../functions/nap-portal-swimmer-change"),{COLUMNS}=require("../functions/nap-approved-swimmer-correction");
// The fixed schema has separate exhaustive tests; this executor test never
// creates a connection or performs a real database operation.
schema.inspect=async()=>({});schema.validate=()=>({table:true,indexes:Array(14).fill(true)});
function fixture(failAfter=0){
  const source={id:12,nom:"TEST",prenom:"Source",date:"1980-01-01",sexe:"M",club:"106",actif:1,wc:0,edf:0,creation:"2020-01-01",number:"A-05-222647"},target={...source,id:13,prenom:"Cible",number:null};
  const input={sourceSwimmerId:"12",targetSwimmerId:"13",sourceFingerprint:fingerprint(source),targetFingerprint:fingerprint(target),sourceLicenseNumber:source.number,targetLicenseNumber:"",actorUid:"national",confirmMerge:true};
  const state=Object.fromEntries(plans.TABLES.map(spec=>[spec.table,[]]));
  state.perfs=[{id:1,nageur:12,tps:"14200",points:"123"}];
  state.nageursengager=[{id:2,nageur:12,compet:10},{id:3,nageur:13,compet:10}];
  state.engagements=[{id:4,engagement:2,course:"50BI",tps:"1234"},{id:5,engagement:3,course:"50BI",tps:"1250"},{id:6,engagement:2,course:"100BI",tps:"4567"}];
  state.nageurs=[structuredClone(source),structuredClone(target)];
  state.livepalmes_swimmer_license_seasons=[{swimmer_id:12,season:"2026-2027",license_number:source.number,status:"valid",source:"national_manual",federal_validity_end_date:null,validated_at:"2026-10-09 10:00:00.000000",validated_by:"national",version:"3"}];
  let saved,writes=0,failed=false,completed=0,connections=0;
  const audit={read:async()=>saved,prepare:async(op,plan)=>{assert.equal(writes,0);saved=structuredClone(plan);},complete:async()=>{completed++;}};
  const connection={execute:async({sql,timeout},values=[])=>{
    assert.equal(timeout,10000);
    if(sql.startsWith("EXPLAIN"))return [[{table:"native",type:"range",key:"PRIMARY"}]];
    if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("information_schema.TRIGGERS")||sql.startsWith("SELECT id FROM forfait"))return [[]];
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
        const id=values[values.length-COLUMNS.length],before=id===12?saved.source:saved.target,after=id===12?saved.sourceAfter:saved.targetAfter;
        const index=state.nageurs.findIndex(row=>equal(row,before));assert.ok(index>=0);state.nageurs[index]=structuredClone(after);count=1;
      }else{
        const change=table==="livepalmes_swimmer_license_seasons"?{updates:saved.licensePlan.transfers,removals:saved.licensePlan.replacements}:saved.changes.find(item=>item.table===table);
        if(remove){const candidates=change.removals.filter(row=>state[table].some(actual=>equal(actual,row)));count=candidates.length;state[table]=state[table].filter(row=>!candidates.some(item=>equal(item,row)));}
        else for(const item of change.updates){const index=state[table].findIndex(row=>equal(row,item.before));if(index>=0){state[table][index]=structuredClone(item.after);count++;}}
      }
    }
    writes++;if(writes===failAfter&&!failed){failed=true;throw Error("Simulated lost response");}
    return [{affectedRows:count}];
  },query:async({sql})=>{assert.match(sql,/^(LOCK TABLES|UNLOCK TABLES)/);return [{}];},release(){},destroy(){throw Error("Unsafe connection");}};
  return {input,state,audit,pool:{getConnection:async()=>{connections++;return connection;}},stats:()=>({writes,completed,connections})};
}
(async()=>{
  const normal=fixture();const result=await service.mergeSwimmers(normal.pool,normal.input,normal.audit,async()=>{});
  assert.equal(result.licenseSeasonTransferCount,1);assert.equal(normal.state.nageurs[1].number,"A-05-222647");assert.equal(normal.state.livepalmes_swimmer_license_seasons[0].swimmer_id,13);assert.equal(normal.state.livepalmes_swimmer_license_seasons[0].status,"valid");
  assert.equal(normal.state.perfs[0].tps,"14200");assert.equal(normal.state.perfs[0].nageur,13);assert.equal(normal.state.engagements.length,2);assert.equal(normal.state.engagements.find(row=>row.id===6).engagement,3);assert.equal(normal.state.nageursengager.length,1);
  const total=normal.stats().writes;await service.mergeSwimmers(normal.pool,normal.input,normal.audit,async()=>{});assert.equal(normal.stats().writes,total);
  const refreshed=await service.mergeSwimmers(normal.pool,{...normal.input,targetLicenseNumber:"A-05-222647"},normal.audit,async()=>{});assert.equal(refreshed.target.licenseSeasonStatus,"valid");assert.equal(normal.stats().writes,total);
  for(let stop=1;stop<=total;stop++){
    const f=fixture(stop);await assert.rejects(service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{}));
    await service.mergeSwimmers(f.pool,f.input,f.audit,async()=>{});assert.equal(f.state.perfs[0].nageur,13);assert.equal(f.state.livepalmes_swimmer_license_seasons[0].swimmer_id,13);assert.equal(f.stats().writes,total);
  }
  const denied=fixture();await assert.rejects(service.mergeSwimmers(denied.pool,denied.input,denied.audit,async()=>{throw Error("Denied");}));assert.equal(denied.stats().connections,0);
  console.log("Native swimmer merge executor: licence season retained, raw result times unchanged, entries joined, authorization, no-op retries and every lost-write-response stage passed without network.");
})().catch(error=>{console.error(error);process.exitCode=1;});
