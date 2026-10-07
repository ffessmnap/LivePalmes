"use strict";
const assert=require("node:assert/strict"),engine=require("../functions/dtn-season-engine"),repo=require("../functions/nap-dtn-season-repository"),seed=require("../functions/config/dtn-season-2025-2026.json");
const {createNativeDtnSeasonService}=require("../functions/nap-dtn-season-service");
function fixture() {
  const s={catalog:{revision:0,current:seed.id,previous:"",draft:""},seasons:new Map([[seed.id,structuredClone(seed)]]),views:new Map(),jobs:new Map(),queries:[],poolCalls:0,calculations:0,commits:0,rollbacks:0,manager:true,denied:false,version:"native-version",busy:false,failDevice:null,sourceChange:false,configChange:false};
  let snapshot;
  const executor={execute:async({sql},values=[])=>{
    s.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:s.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{}]];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_dtn_catalogue")) return [[{revision:s.catalog.revision,saison_active:s.catalog.current,saison_precedente:s.catalog.previous,saison_brouillon:s.catalog.draft}]];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_dtn_saisons")) return [[...s.seasons.values()].filter(v=>values.includes(v.id)).map(v=>({id:v.id,revision:v.revision,configuration:JSON.stringify(v)}))];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_dtn_resultats")) return [[...s.views.values()].filter(v=>values.includes(v.id)).map(v=>({saison:v.id,dispositif:v.device,revision:v.value.revision,empreinte:v.value.fingerprint,contenu:JSON.stringify(v.value)}))];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_dtn_calculs")) return [[...s.jobs.values()].filter(v=>values.includes(v.saison)).map(v=>({statut:v.statut,erreur:v.erreur,age_seconds:10}))];
    if(sql.startsWith("SELECT") && sql.includes("FROM competitions")) return [[{id:1,libelle:"Native",date:"2026-01-01"}]];
    if(sql.startsWith("INSERT INTO livepalmes_dtn_saisons")) {if(s.seasons.has(values[0])) throw new Error("duplicate");s.seasons.set(values[0],JSON.parse(values[2]));return [{affectedRows:1}];}
    if(sql.startsWith("UPDATE livepalmes_dtn_saisons")) {s.seasons.set(values[2],JSON.parse(values[1]));return [{affectedRows:1}];}
    if(sql.startsWith("UPDATE livepalmes_dtn_catalogue")) {s.catalog={revision:values[0],current:values[1],previous:values[2],draft:values[3]};return [{affectedRows:1}];}
    if(sql.startsWith("INSERT INTO livepalmes_dtn_calculs")) {s.jobs.set(values[0],{saison:values[0],operation:values[1],statut:"running",erreur:""});return [{affectedRows:1}];}
    if(sql.startsWith("INSERT INTO livepalmes_dtn_resultats")) {if(s.failDevice===values[1]) throw new Error("Interrupted");s.views.set(`${values[0]}|${values[1]}`,{id:values[0],device:values[1],value:JSON.parse(values[4])});return [{affectedRows:1}];}
    if(sql.startsWith("UPDATE livepalmes_dtn_calculs")) {const failed=sql.includes("'failed'"),j=s.jobs.get(values[failed?1:0]);assert.equal(j.operation,values[failed?2:1]);j.statut=failed?"failed":"completed";j.erreur=failed?values[0]:"";return [{affectedRows:1}];}
    throw new Error(`Unexpected SQL ${sql}`);
  },beginTransaction:async()=>{snapshot=structuredClone({catalog:s.catalog,seasons:s.seasons,views:s.views,jobs:s.jobs});},commit:async()=>s.commits++,rollback:async()=>{s.rollbacks++;Object.assign(s,snapshot);},release:()=>{}};
  const pool={execute:executor.execute,getConnection:async()=>executor};
  const service=createNativeDtnSeasonService({getPool:()=>{s.poolCalls++;return pool;},authorize:async()=>{if(s.denied) throw new Error("Denied");},canManage:()=>s.manager,fail:(message,code)=>{throw Object.assign(new Error(message),{code});},stamp:async()=>({fingerprint:s.version}),calculate:async(_pool,season)=>{
    s.calculations++;if(s.sourceChange) s.version="changed";if(s.configChange) s.seasons.get(season.id).revision++;
    const normalized=engine.validateSeason(season);
    return {generatedAt:"2026-10-07T15:00:00.000Z",excludedRows:0,views:Object.fromEntries(engine.DEVICES.map(d=>[d,{source:"nap",revision:normalized.revision,profiles:engine.finish(engine.createAccumulator(normalized,d),normalized,d)}]))};
  }});
  const request=data=>({auth:{uid:"authorized"},data:{id:seed.id,device:"france",...data}});
  return {s,service,request};
}
(async()=>{
  const f=fixture();f.s.denied=true;await assert.rejects(()=>f.service.list(f.request({})),/Denied/);assert.equal(f.s.poolCalls,0);assert.equal(f.s.queries.length,0);f.s.denied=false;
  assert.equal((await f.service.list(f.request({}))).source,"nap");
  const empty=await f.service.overview(f.request({}));assert.equal(empty.hit,false);assert.equal(f.s.calculations,0);assert.ok(f.s.queries.every(q=>q.startsWith("SELECT")));
  const result=await f.service.overview(f.request({rebuild:true}));assert.equal(result.hit,true);assert.equal(result.source,"nap");assert.equal(f.s.views.size,3);assert.equal(f.s.calculations,1);
  assert.equal((await f.service.overview(f.request({}))).hit,true);assert.equal(f.s.calculations,1);
  const source=(await f.service.sources(f.request({})));assert.deepEqual(source.rows,[{id:"1",name:"Native",date:"2026-01-01"}]);
  await assert.rejects(()=>f.service.sources(f.request({cursor:'{"date":"2026-01-01","id":"1 OR 1=1"}'})),/Pagination/);
  f.s.manager=false;await assert.rejects(()=>f.service.sources(f.request({})),/Droit/);await assert.rejects(()=>f.service.update(f.request({action:"create"})),/Droit/);
  for(const flag of ["sourceChange","configChange","failDevice"]) {
    const interrupted=fixture();interrupted.s[flag]=flag==="failDevice"?"listing":true;
    await assert.rejects(()=>interrupted.service.overview(interrupted.request({rebuild:true})),/change|Interrupted/);
    assert.equal(interrupted.s.views.size,0);assert.equal(interrupted.s.jobs.get(seed.id).statut,"failed");
    if(flag!=="sourceChange") assert.equal(interrupted.s.rollbacks,1);
  }
  const locked=fixture();locked.s.busy=true;assert.equal((await locked.service.overview(locked.request({rebuild:true}))).pending,true);assert.equal(locked.s.calculations,0);
  const settings=fixture();await assert.rejects(()=>settings.service.update(settings.request({action:"create",id:"2026-2027",catalogRevision:9})),/saisons ont change/);
  const created=await settings.service.update(settings.request({action:"create",id:"2026-2027",catalogRevision:0,duplicate:false}));assert.equal(created.catalog.draft,"2026-2027");assert.ok(engine.DEVICES.every(d=>created.season[d].every(p=>!p.enabled)));
  await assert.rejects(()=>settings.service.update(settings.request({action:"save",id:"2026-2027",catalogRevision:1,revision:99,season:created.season})),/configuration a change/);
  await assert.rejects(()=>settings.service.update(settings.request({action:"activate",id:"2026-2027",catalogRevision:1,revision:1,confirmed:false})),/Confirmez/);
  const historical=fixture(),next=repo.nextDraft(seed);historical.s.catalog={revision:1,current:next.id,previous:seed.id,draft:""};historical.s.seasons.set(next.id,next);
  for(const d of engine.DEVICES) historical.s.views.set(`${seed.id}|${d}`,{id:seed.id,device:d,value:{source:"nap",revision:seed.revision,sourceVersion:"old-source",fingerprint:repo.fingerprint(seed,"old-source"),profiles:[]}});
  assert.equal((await historical.service.overview(historical.request({}))).frozen,true);assert.equal(historical.s.calculations,0);
  await assert.rejects(()=>historical.service.overview(historical.request({rebuild:true})),/consultation seule/);
  console.log("Native DTN service: auth before pool, no silent rebuild, all-three atomic views, source/settings conflicts, rollback, existing rights, draft and frozen history verified offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});
