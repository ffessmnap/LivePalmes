"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const migration=require("../functions/nap-dtn-settings-migration"),schema=require("../functions/nap-approved-dtn-schema"),seed=require("../functions/config/dtn-season-2025-2026.json");
function fixture() {
  const state={source:structuredClone(seed),catalog:null,native:new Map(),writes:0,commits:0,rollbacks:0,release:0,sourceReads:0,failWrite:false,mutateSource:false};
  const db={collection:name=>{assert.equal(name,"dtnSeasons");return {doc:id=>({id,get:async()=>({exists:id==="catalog",data:()=>({revision:0,current:seed.id,previous:"",draft:""})})})};},getAll:async(...refs)=>{
    state.sourceReads+=refs.length;
    if(state.mutateSource && state.sourceReads>(state.mutateAfter||1)) state.source.revision++;
    return refs.map(ref=>({exists:true,data:()=>structuredClone(state.source)}));
  }};
  let saved;
  const connection={beginTransaction:async()=>{saved={catalog:structuredClone(state.catalog),native:structuredClone(state.native)};},commit:async()=>state.commits++,rollback:async()=>{state.rollbacks++;state.catalog=saved.catalog;state.native=saved.native;},release:()=>state.release++,execute:async({sql},values=[])=>{
    if(sql.includes("GET_LOCK")) return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{}]];
    if(sql.includes("information_schema")) {
      const d=schema.definitions.find(d=>d.name===values[0]);assert.ok(d);
      if(sql.includes(".TABLES")) return [[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_general_ci"}]];
      if(sql.includes(".COLUMNS")) return [d.columns.map(([COLUMN_NAME,COLUMN_TYPE,def])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:def===null?"YES":"NO",COLUMN_DEFAULT:def===""?"":null,EXTRA:""}))];
      return [Object.entries(d.indexes).flatMap(([INDEX_NAME,fields])=>fields.map((COLUMN_NAME,i)=>({INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:i+1,NON_UNIQUE:0,SUB_PART:null})))];
    }
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_dtn_catalogue")) return [state.catalog?[state.catalog]:[]];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_dtn_saisons")) return [[...state.native.values()].filter(r=>values.includes(r.id)).sort((a,b)=>a.id.localeCompare(b.id))];
    assert.match(sql,/^INSERT INTO livepalmes_dtn_(saisons|catalogue) /);
    state.writes++;if(state.failWrite && state.writes===2) throw new Error("Interrupted");
    if(sql.includes("saisons")) state.native.set(values[0],{id:values[0],revision:values[1],configuration:values[2]});
    else state.catalog={id:1,revision:values[0],saison_active:values[1],saison_precedente:values[2],saison_brouillon:values[3]};
    return [{affectedRows:1}];
  }};
  return {state,db,pool:{getConnection:async()=>connection}};
}
(async()=>{
  const f=fixture(),prepare={phase:"prepare",confirmation:"nap-recover-dtn-settings"};
  await assert.rejects(()=>migration.migrateDtnSettings(f.pool,f.db,{...prepare,confirmation:"bad"}),/Confirmation/);assert.equal(f.state.sourceReads,0);
  const before=await migration.migrateDtnSettings(f.pool,f.db,prepare);assert.equal(f.state.writes,0);assert.deepEqual(before.settingsBackup.seasons[0],seed);
  const apply={...prepare,phase:"apply",sourceHash:before.sourceHash,beforeHash:before.beforeHash};
  await assert.rejects(()=>migration.migrateDtnSettings(f.pool,f.db,{...apply,sourceHash:"wrong"}),/Parametres modifies/);
  await assert.rejects(()=>migration.migrateDtnSettings(f.pool,f.db,{...apply,beforeHash:"wrong"}),/NAP modifies/);
  const result=await migration.migrateDtnSettings(f.pool,f.db,apply);assert.equal(result.verified,true);assert.equal(result.writesExecuted,2);assert.equal(f.state.commits,1);assert.equal(result.performanceRowsCopied,0);
  const repeat=await migration.migrateDtnSettings(f.pool,f.db,prepare);
  const second=await migration.migrateDtnSettings(f.pool,f.db,{...apply,beforeHash:repeat.beforeHash});assert.equal(second.writesExecuted,0);assert.equal(f.state.writes,2);
  const interrupted=fixture();interrupted.state.failWrite=true;
  const b=await migration.migrateDtnSettings(interrupted.pool,interrupted.db,prepare);
  await assert.rejects(()=>migration.migrateDtnSettings(interrupted.pool,interrupted.db,{...apply,sourceHash:b.sourceHash,beforeHash:b.beforeHash}),/Interrupted/);
  assert.equal(interrupted.state.native.size,0);assert.equal(interrupted.state.catalog,null);assert.equal(interrupted.state.rollbacks,1);
  const conflict=fixture();const c=await migration.migrateDtnSettings(conflict.pool,conflict.db,prepare);conflict.state.mutateSource=true;
  await assert.rejects(()=>migration.migrateDtnSettings(conflict.pool,conflict.db,{...apply,sourceHash:c.sourceHash,beforeHash:c.beforeHash}),/Parametres modifies/);assert.equal(conflict.state.writes,0);
  const concurrent=fixture();const concurrentBackup=await migration.migrateDtnSettings(concurrent.pool,concurrent.db,prepare);concurrent.state.mutateSource=true;concurrent.state.mutateAfter=2;
  await assert.rejects(()=>migration.migrateDtnSettings(concurrent.pool,concurrent.db,{...apply,sourceHash:concurrentBackup.sourceHash,beforeHash:concurrentBackup.beforeHash}),/pendant la reprise/);
  assert.equal(concurrent.state.writes,0);assert.equal(concurrent.state.rollbacks,1);
  const existing=fixture();existing.state.catalog={id:1,revision:9,saison_active:seed.id,saison_precedente:"",saison_brouillon:""};
  const e=await migration.migrateDtnSettings(existing.pool,existing.db,prepare);
  await assert.rejects(()=>migration.migrateDtnSettings(existing.pool,existing.db,{...apply,sourceHash:e.sourceHash,beforeHash:e.beforeHash}),/existants differents/);assert.equal(existing.state.writes,0);
  const workflow=fs.readFileSync(".github/workflows/nap-authorized-dtn-settings.yml","utf8");
  assert.ok(workflow.indexOf("name: nap-dtn-settings-before")<workflow.indexOf("NAP_DTN_SETTINGS_PHASE: apply"));
  assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
  console.log("DTN settings recovery: exact live settings, fixed collection, backup, source/native conflicts, transactional rollback, no performance copy and idempotent resume verified offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});
