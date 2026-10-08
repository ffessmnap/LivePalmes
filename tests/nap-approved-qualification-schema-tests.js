"use strict";
const assert=require("node:assert/strict");
const schema=require("../functions/nap-approved-qualification-schema");
function metadata(present) {
  const specs=schema.specs.filter(s=>present.has(s.name));
  return {tables:specs.map(s=>({TABLE_NAME:s.name,ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"})),columns:specs.flatMap(s=>s.columns.map(([COLUMN_NAME,COLUMN_TYPE,nullable])=>({TABLE_NAME:s.name,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:nullable?"YES":"NO",COLUMN_DEFAULT:null,EXTRA:""}))),indexes:specs.flatMap(s=>Object.entries(s.keys).flatMap(([INDEX_NAME,names])=>names.map((COLUMN_NAME,i)=>({TABLE_NAME:s.name,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:i+1,NON_UNIQUE:INDEX_NAME==="PRIMARY"?0:1,SUB_PART:null}))))};
}
schema.validate(metadata(new Set()));schema.validate(metadata(new Set(schema.specs.map(s=>s.name))));
for(const mutate of [m=>m.tables[0].ENGINE="MyISAM",m=>m.columns[0].COLUMN_TYPE="text",m=>m.columns.pop(),m=>m.indexes[0].SUB_PART=1]) {const m=metadata(new Set(schema.specs.map(s=>s.name)));mutate(m);assert.throws(()=>schema.validate(m),/incompatible/);}
function fixture() {
  const state={present:new Set(),creates:[],busy:false,writing:false,released:0};
  const connection={release:()=>state.released++,execute:async({sql},values=[])=>{
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{released:1}]];
    if(sql.includes("PROCESSLIST")) return [state.writing?[{ID:1}]:[]];
    assert.deepEqual(values,schema.specs.map(s=>s.name));
    const key=sql.includes("information_schema.TABLES")?"tables":sql.includes("information_schema.COLUMNS")?"columns":"indexes";
    return [metadata(state.present)[key]];
  },query:async({sql})=>{const index=schema.sql.indexOf(sql);assert.ok(index>=0,"Only the reviewed CREATE statements can run");state.creates.push(sql);state.present.add(schema.specs[index].name);return [{}];}};
  state.pool={getConnection:async()=>connection};return state;
}
(async()=>{
  const state=fixture(),input={phase:"prepare",confirmation:"nap-create-qualification-complements"};
  const before=await schema.approvedQualificationSchema(state.pool,input);assert.equal(state.creates.length,0);
  const apply={...input,phase:"apply",planHash:before.planHash,schemaHash:before.schemaHash};
  await assert.rejects(schema.approvedQualificationSchema(state.pool,{...apply,schemaHash:"bad"}),/Structure/);assert.equal(state.creates.length,0);
  state.writing=true;await assert.rejects(schema.approvedQualificationSchema(state.pool,apply),/Ecriture/);assert.equal(state.creates.length,0);state.writing=false;
  state.busy=true;await assert.rejects(schema.approvedQualificationSchema(state.pool,apply),/deja en cours/);state.busy=false;
  const result=await schema.approvedQualificationSchema(state.pool,apply);assert.equal(result.verified,true);assert.equal(result.dataRowsWritten,false);assert.equal(state.creates.length,2);
  const again=await schema.approvedQualificationSchema(state.pool,input);await schema.approvedQualificationSchema(state.pool,{...apply,schemaHash:again.schemaHash});assert.equal(state.creates.length,2,"Do not recreate existing tables");
  await assert.rejects(schema.approvedQualificationSchema(state.pool,{...input,confirmation:"wrong"}),/Confirmation/);
  console.log("Qualification schema proposal: read-only preparation, approved hash, write refusal, fixed additive tables and idempotence verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
