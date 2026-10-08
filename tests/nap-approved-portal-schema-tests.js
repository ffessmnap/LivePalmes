"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { tables, plan, planHash, approvedPortalSchema, validateExisting } = require("../functions/nap-approved-portal-schema");
function fixture(initial = []) {
  const present = new Set(initial); let creations = 0, released = 0, unlocked = 0;
  const metadata = () => ({
    tables:tables.filter(t=>present.has(t.name)).map(t=>({TABLE_NAME:t.name,ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"})).sort((a,b)=>a.TABLE_NAME.localeCompare(b.TABLE_NAME)),
    columns:tables.filter(t=>present.has(t.name)).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(t=>t.columns.map(c=>({TABLE_NAME:t.name,COLUMN_NAME:c.name,COLUMN_TYPE:c.type,IS_NULLABLE:c.nullable?"YES":"NO",COLUMN_DEFAULT:c.defaultValue,EXTRA:c.extra}))),
    indexes:tables.filter(t=>present.has(t.name)).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(t=>[...t.keys].sort((a,b)=>a.name.localeCompare(b.name)).flatMap(k=>k.columns.map((c,i)=>({TABLE_NAME:t.name,INDEX_NAME:k.name,SEQ_IN_INDEX:i+1,COLUMN_NAME:c,NON_UNIQUE:k.unique?0:1,SUB_PART:null}))))
  });
  const connection = {
    execute:async ({sql},values) => {
      if (sql.startsWith("SELECT GET_LOCK")) return [[{acquired:fixtureState.busy?0:1}]];
      if (sql.startsWith("SELECT RELEASE_LOCK")) { unlocked++; return [[{released:1}]]; }
      assert.deepEqual(values,tables.map(t=>t.name));
      const kind = sql.includes("information_schema.TABLES") ? "tables" : sql.includes("information_schema.COLUMNS") ? "columns" : "indexes";
      let rows = metadata()[kind];
      if (fixtureState.drift && kind === "columns" && rows.length) rows[0]={...rows[0],COLUMN_TYPE:"varchar(1)"};
      return [rows];
    },
    query:async ({sql}) => {
      assert.ok(sql.startsWith("CREATE TABLE `livepalmes_"));
      assert.ok(!/\b(?:ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE|REPLACE)\b/.test(sql));
      const index = plan.indexOf(sql); assert.ok(index >= 0);
      if (fixtureState.failAfter === creations) throw new Error("Interruption simulee");
      present.add(tables[index].name); creations++; return [{}];
    },
    release:()=>{released++;}
  };
  const fixtureState = {busy:false,drift:false,failAfter:null,present,pool:{getConnection:async()=>connection},counts:()=>({creations,released,unlocked})};
  return fixtureState;
}
(async()=>{
  const additive={tables:[{TABLE_NAME:tables[0].name,ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}],columns:tables[0].columns.map(c=>({TABLE_NAME:tables[0].name,COLUMN_NAME:c.name,COLUMN_TYPE:c.type,IS_NULLABLE:c.nullable?"YES":"NO",COLUMN_DEFAULT:c.defaultValue,EXTRA:c.extra})),indexes:[{TABLE_NAME:tables[0].name,INDEX_NAME:"PRIMARY",SEQ_IN_INDEX:1,COLUMN_NAME:"competition_id",NON_UNIQUE:0,SUB_PART:null}]};
  const marker={TABLE_NAME:tables[0].name,COLUMN_NAME:"event_type",COLUMN_TYPE:"varchar(16)",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""};
  validateExisting({...additive,columns:[...additive.columns,marker]});
  for(const change of [{COLUMN_TYPE:"varchar(32)"},{IS_NULLABLE:"NO"},{COLUMN_DEFAULT:"pool"},{EXTRA:"generated"}]) assert.throws(()=>validateExisting({...additive,columns:[...additive.columns,{...marker,...change}]}),/type incompatible/);
  const input={phase:"prepare",confirmation:"nap-create-livepalmes-portal-complements"};
  const state=fixture();
  await assert.rejects(approvedPortalSchema(state.pool,{...input,confirmation:"anything"}),TypeError);
  const before=await approvedPortalSchema(state.pool,input);
  assert.equal(state.counts().creations,0);
  assert.equal(before.tables.length,8);
  assert.equal(before.planHash,planHash);
  const apply={...input,phase:"apply",planHash,schemaHash:before.schemaHash};
  await assert.rejects(approvedPortalSchema(state.pool,{...apply,planHash:"wrong"}),TypeError);
  state.busy=true; await assert.rejects(approvedPortalSchema(state.pool,apply),/deja en cours/); state.busy=false;
  await assert.rejects(approvedPortalSchema(state.pool,{...apply,schemaHash:"wrong"}),/modifiee/);
  assert.equal(state.counts().creations,0);
  const result=await approvedPortalSchema(state.pool,apply);
  assert.equal(result.verified,true); assert.equal(result.dataRowsWritten,false); assert.equal(result.created.length,8);
  const presentBefore=await approvedPortalSchema(state.pool,input);
  assert.deepEqual((await approvedPortalSchema(state.pool,{...apply,schemaHash:presentBefore.schemaHash})).created,[]);
  state.drift=true; await assert.rejects(approvedPortalSchema(state.pool,input),/incompatibles/);
  const partial=fixture(); const prepared=await approvedPortalSchema(partial.pool,input); partial.failAfter=3;
  await assert.rejects(approvedPortalSchema(partial.pool,{...apply,schemaHash:prepared.schemaHash}),/Interruption/);
  assert.equal(partial.counts().unlocked,1);
  partial.failAfter=null;
  const resumed=await approvedPortalSchema(partial.pool,input);
  const completed=await approvedPortalSchema(partial.pool,{...apply,schemaHash:resumed.schemaHash});
  assert.equal(completed.created.length,5); assert.equal(partial.counts().creations,8);
  const existingSeven=fixture(tables.slice(0,7).map(t=>t.name));
  const sevenBackup=await approvedPortalSchema(existingSeven.pool,input);
  const extension=await approvedPortalSchema(existingSeven.pool,{...apply,schemaHash:sevenBackup.schemaHash});
  assert.deepEqual(extension.created,["livepalmes_competition_programs"]);
  assert.equal(existingSeven.counts().creations,1);
  assert.ok(tables.every(t=>t.columns.some(c=>c.name==="version") && t.columns.every(c=>!/(?:licen|password|pin)/i.test(c.name))));
  const workflow=fs.readFileSync(".github/workflows/nap-authorized-portal-schema.yml","utf8");
  assert.ok(workflow.indexOf("name: nap-portal-schema-before") < workflow.indexOf("NAP_PORTAL_SCHEMA_PHASE: apply"));
  assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
  for (const name of ["livepalmes-test-common.yml","livepalmes-test-backend.yml"]) assert.ok(!fs.readFileSync(`.github/workflows/${name}`,"utf8").includes("create-nap-portal-complements"));
  console.log("Complements NAP : preparation sans ecriture, huit tables fixes, schema divergent refuse, verrou, idempotence et reprise partielle verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
