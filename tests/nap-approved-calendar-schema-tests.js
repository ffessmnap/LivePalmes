"use strict";
const assert=require("node:assert/strict"),schema=require("../functions/nap-approved-calendar-schema");
const absent=()=>schema.specs.map(()=>({tables:[],columns:[],keys:[]}));
function present(i){const s=schema.specs[i];return {tables:[{ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}],columns:s.columns.map(([name,type,nullable,def])=>({COLUMN_NAME:name,COLUMN_TYPE:type,IS_NULLABLE:nullable,COLUMN_DEFAULT:def??null,EXTRA:""})),keys:[{INDEX_NAME:"PRIMARY",COLUMN_NAME:s.key,NON_UNIQUE:0,SEQ_IN_INDEX:1,SUB_PART:null}]};}
async function run(){
 assert.deepEqual(schema.validate(absent()),[false,false]);assert.deepEqual(schema.validate([present(0),present(1)]),[true,true]);
 const bad=present(0);bad.columns[0].COLUMN_TYPE="int";assert.throws(()=>schema.validate([bad,present(1)]),/incompatible/);
 const wrongKey=present(1);wrongKey.keys[0].SUB_PART=4;assert.throws(()=>schema.validate([present(0),wrongKey]),/incompatible/);
 for(const scenario of ["success","backup-failed","busy","existing"]){
  const meta=scenario==="existing"?[present(0),present(1)]:absent();let saved=false,writes=0,released=false;
  const connection={execute:async({sql},values=[])=>{
   if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
   if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
   if(sql.includes("PROCESSLIST"))return [scenario==="busy"?[{ID:7}]:[]];
   const index=schema.specs.findIndex(s=>s.table===values[0]);assert.ok(index>=0);
   return [meta[index][sql.includes("information_schema.TABLES")?"tables":sql.includes("information_schema.COLUMNS")?"columns":"keys"]];
  },query:async({sql})=>{assert.ok(saved,"Backup must precede DDL");const i=schema.sql.indexOf(sql);assert.ok(i>=0);meta[i]=present(i);writes++;},release:()=>released=true,destroy:()=>{throw Error("unexpected destroy");}};
  const action=()=>schema.applyApproved({getConnection:async()=>connection},{confirmation:"approved-calendar-library-and-event-details"},async data=>{saved=true;return scenario==="backup-failed"?"wrong":data.hash;});
  if(scenario==="busy"||scenario==="backup-failed"){await assert.rejects(action());assert.equal(writes,0);}else{assert.equal((await action()).verified,true);assert.equal(writes,scenario==="existing"?0:2);}
  assert.equal(released,true);
 }
 await assert.rejects(schema.applyApproved({}, {},()=>{}),/Accord/);
 console.log("Calendar schema: strict metadata, fixed DDL, backup, active-write refusal and idempotence passed offline.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
