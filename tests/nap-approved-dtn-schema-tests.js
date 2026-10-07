"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const schema=require("../functions/nap-approved-dtn-schema");
function metadata(d,present) {return present?{tables:[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_general_ci"}],columns:d.columns.map(([COLUMN_NAME,COLUMN_TYPE,def])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:def===null?"YES":"NO",COLUMN_DEFAULT:def===""?"":null,EXTRA:""})),indexes:Object.entries(d.indexes).flatMap(([INDEX_NAME,fields])=>fields.map((COLUMN_NAME,i)=>({INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:i+1,NON_UNIQUE:0,SUB_PART:null})))}:{tables:[],columns:[],indexes:[]};}
for(const d of schema.definitions) {
  assert.equal(schema.validate(d,metadata(d,false)),false);
  assert.equal(schema.validate(d,metadata(d,true)),true);
  for(const mutate of [m=>m.tables[0].ENGINE="MyISAM",m=>m.columns[0].COLUMN_TYPE="text",m=>m.indexes[0].NON_UNIQUE=1,m=>m.columns.pop()]) {
    const m=metadata(d,true);mutate(m);assert.throws(()=>schema.validate(d,m),/incompatible/i);
  }
}
function fixture() {
  const state={present:new Set(),creates:[],writing:false,busy:false,released:0,unlocked:0,failAfter:null};
  const connection={execute:async({sql},values)=>{
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) {state.unlocked++;return [[{}]];}
    if(sql.includes("PROCESSLIST")) return [state.writing?[{ID:1}]:[]];
    const d=schema.definitions.find(d=>d.name===values?.[0]);assert.ok(d);
    const m=metadata(d,state.present.has(d.name));
    return [sql.includes("information_schema.TABLES")?m.tables:sql.includes("information_schema.COLUMNS")?m.columns:m.indexes];
  },query:async({sql})=>{
    if(state.failAfter===state.creates.length) throw new Error("DDL interrupted");
    const i=schema.statements.indexOf(sql);assert.ok(i>=0);state.creates.push(sql);state.present.add(schema.definitions[i].name);return [{}];
  },release:()=>state.released++};
  state.pool={getConnection:async()=>connection};return state;
}
(async()=>{
  const s=fixture(),input={phase:"prepare",confirmation:"nap-create-dtn-complements"};
  await assert.rejects(()=>schema.approvedDtnSchema(s.pool,{...input,confirmation:"no"}),/Confirmation/);assert.equal(s.released,0);
  const before=await schema.approvedDtnSchema(s.pool,input);assert.equal(s.creates.length,0);
  const apply={...input,phase:"apply",planHash:schema.planHash,schemaHash:before.schemaHash};
  await assert.rejects(()=>schema.approvedDtnSchema(s.pool,{...apply,planHash:"wrong"}),/Plan/);
  await assert.rejects(()=>schema.approvedDtnSchema(s.pool,{...apply,schemaHash:"wrong"}),/Structure/);
  s.busy=true;await assert.rejects(()=>schema.approvedDtnSchema(s.pool,apply),/deja/);s.busy=false;
  s.writing=true;await assert.rejects(()=>schema.approvedDtnSchema(s.pool,apply),/Ecriture/);s.writing=false;
  s.failAfter=2;await assert.rejects(()=>schema.approvedDtnSchema(s.pool,apply),/interrupted/);assert.equal(s.present.size,2);
  await assert.rejects(()=>schema.approvedDtnSchema(s.pool,apply),/Structure/);
  s.failAfter=null;
  const resume=await schema.approvedDtnSchema(s.pool,input);
  const result=await schema.approvedDtnSchema(s.pool,{...apply,schemaHash:resume.schemaHash});assert.equal(result.verified,true);assert.equal(result.dataRowsWritten,false);assert.equal(s.creates.length,4);
  const again=await schema.approvedDtnSchema(s.pool,input);await schema.approvedDtnSchema(s.pool,{...apply,schemaHash:again.schemaHash});assert.equal(s.creates.length,4);
  assert.ok(schema.statements.every(sql=>/^CREATE TABLE `livepalmes_dtn_/.test(sql) && !/IF NOT EXISTS|ALTER|DROP|INSERT/.test(sql)));
  const workflow=fs.readFileSync(".github/workflows/nap-authorized-dtn-schema.yml","utf8");
  assert.ok(workflow.indexOf("name: nap-dtn-schema-before")<workflow.indexOf("NAP_DTN_SCHEMA_PHASE: apply"));
  assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
  for(const name of ["livepalmes-test-common.yml","livepalmes-test-backend.yml"]) assert.ok(!fs.readFileSync(`.github/workflows/${name}`,"utf8").includes("add-nap-dtn-options"));
  console.log("DTN schema: fixed approved additive scope, strict structure, backup hash, active writes, partial DDL recovery and idempotency verified offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});
