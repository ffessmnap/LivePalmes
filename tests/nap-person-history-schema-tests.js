"use strict";
const assert=require("node:assert/strict"),schema=require("../functions/nap-approved-person-history-schema");
function fixture() {
  const state={history:false,index:false,writes:[],saved:false,busy:false,released:false};
  const index=(name,names,unique)=>names.map((n,i)=>({INDEX_NAME:name,COLUMN_NAME:n,SEQ_IN_INDEX:i+1,NON_UNIQUE:unique?0:1,SUB_PART:null}));
  const connection={execute:async({sql})=>{
    if(sql.includes("GET_LOCK")) return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("PROCESSLIST"))return [state.busy?[{ID:1}]:[]];
    if(sql.includes("SHOW CREATE"))return [[{"Create Table":"native structure"}]];
    if(sql.includes("information_schema.TABLES"))return [state.history?[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]:[]];
    if(sql.includes("information_schema.COLUMNS"))return [state.history?schema.columns.map(([n,t])=>({COLUMN_NAME:n,COLUMN_TYPE:t,IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""})):[]];
    if(sql.includes("TABLE_NAME='officielsengager'"))return [state.index?index(schema.index,["officiel","id"],false):[]];
    if(sql.includes("information_schema.STATISTICS"))return [state.history?[...index("PRIMARY",["engagement_id"],true),...index("person_engagement",["person_id","engagement_id"],false)]:[]];
    throw Error(sql);
  },query:async({sql})=>{assert.equal(state.saved,true,"Backup required before DDL");state.writes.push(sql);if(sql.startsWith("CREATE"))state.history=true;else state.index=true;return [];},release:()=>{state.released=true;},destroy:()=>{state.released=true;}};
  return {state,pool:{getConnection:async()=>connection},backup:async saved=>{state.saved=true;assert.ok(saved.nativeStructure);return saved.hash;}};
}
(async()=>{
  let f=fixture();const result=await schema.applyApproved(f.pool,{confirmation:"approved-person-history-and-link-index"},f.backup);assert.equal(result.verified,true);assert.equal(result.dataRowsWritten,false);assert.equal(f.state.writes.length,2);assert.equal(f.state.released,true);
  await schema.applyApproved(f.pool,{confirmation:"approved-person-history-and-link-index"},()=>{throw Error("Already present must not back up again");});assert.equal(f.state.writes.length,2);
  f=fixture();f.state.busy=true;await assert.rejects(schema.applyApproved(f.pool,{confirmation:"approved-person-history-and-link-index"},f.backup),TypeError);assert.equal(f.state.writes.length,0);
  f=fixture();await assert.rejects(schema.applyApproved(f.pool,{confirmation:"approved-person-history-and-link-index"},async()=>"bad"),TypeError);assert.equal(f.state.writes.length,0);
  await assert.rejects(schema.applyApproved(f.pool,{},f.backup),TypeError);
  console.log("Person history schema: fixed approved changes, verified backup before DDL, active-write refusal, strict metadata and idempotence passed offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});
