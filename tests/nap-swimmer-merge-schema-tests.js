"use strict";
const assert=require("node:assert/strict");
const schema=require("../functions/nap-approved-swimmer-merge-schema");
function metadata(own=false,present=[]){
  const tables=schema.nativeTables.map(TABLE_NAME=>({TABLE_NAME,ENGINE:"MyISAM",TABLE_COLLATION:"latin1_swedish_ci"}));
  const columns=schema.nativeTables.flatMap(table=>[...new Set(schema.indexes.filter(def=>def.table===table).flatMap(def=>def.columns))].map(COLUMN_NAME=>({TABLE_NAME:table,COLUMN_NAME,COLUMN_TYPE:"int",IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""})));
  const indexes=schema.indexes.flatMap((def,i)=>present[i]?def.columns.map((COLUMN_NAME,j)=>({TABLE_NAME:def.table,INDEX_NAME:def.name,COLUMN_NAME,SEQ_IN_INDEX:j+1,NON_UNIQUE:1,SUB_PART:null})):[]);
  if(own){
    tables.push({TABLE_NAME:schema.table,ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"});
    columns.push(...schema.columns.map(([COLUMN_NAME,COLUMN_TYPE])=>({TABLE_NAME:schema.table,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""})));
    for(const [INDEX_NAME,names] of [["PRIMARY",["swimmer_id"]],["target_swimmer",["target_id","swimmer_id"]]])indexes.push(...names.map((COLUMN_NAME,j)=>({TABLE_NAME:schema.table,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX:j+1,NON_UNIQUE:INDEX_NAME==="PRIMARY"?0:1,SUB_PART:null})));
  }
  return {tables,columns,indexes};
}
function fixture(options={}){
  let own=false,present=[],backed=false,ddl=0,reads=0;
  const connection={execute:async({sql})=>{
    reads++;
    if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("PROCESSLIST"))return [options.busy?[{ID:1}]:[]];
    const meta=metadata(own,present);
    if(sql.includes("information_schema.TABLES"))return [meta.tables];
    if(sql.includes("information_schema.COLUMNS"))return [meta.columns];
    if(sql.includes("information_schema.STATISTICS"))return [meta.indexes];
    if(sql.startsWith("SHOW CREATE TABLE"))return [[{Table:"native","Create Table":"CREATE TABLE native (id INT)"}]];
    throw Error("Unexpected query");
  },query:async({sql})=>{
    assert.equal(backed,true,"DDL requires verified prior backup");ddl++;
    if(sql.startsWith("CREATE"))own=true;
    else{
      const table=sql.match(/^ALTER TABLE `([^`]+)`/)[1];
      schema.indexes.forEach((def,i)=>{if(def.table===table)present[i]=true;});
    }
    return [{}];
  },release(){},destroy(){throw Error("Unexpected unsafe connection");}};
  return {pool:{getConnection:async()=>connection},backup:async saved=>{assert.equal(saved.statements.length,12);assert.equal(saved.nativeStructure.length,11);assert.equal(schema.hash(saved.before),saved.hash);backed=true;return options.badBackup?"wrong":saved.hash;},stats:()=>({ddl,reads})};
}
(async()=>{
  assert.equal(schema.indexes.length,14);assert.equal(schema.statements(schema.validate(metadata())).length,12);
  assert.equal(schema.statements(schema.validate(metadata(true,Array(14).fill(true)))).length,0);
  const changed=metadata(true,Array(14).fill(true));changed.columns.find(row=>row.TABLE_NAME===schema.table).COLUMN_TYPE="bigint";
  assert.throws(()=>schema.validate(changed),TypeError);
  const wrong=metadata(true,Array(14).fill(true));wrong.indexes[0].NON_UNIQUE=0;assert.throws(()=>schema.validate(wrong),TypeError);
  const approval={confirmation:"approved-swimmer-merge-table-and-14-indexes"};
  const normal=fixture();const result=await schema.applyApproved(normal.pool,approval,normal.backup);assert.equal(result.indexCount,14);assert.equal(result.dataRowsWritten,false);assert.equal(normal.stats().ddl,12);
  await schema.applyApproved(normal.pool,approval,()=>{throw Error("No backup on no-op");});assert.equal(normal.stats().ddl,12);
  for(const options of [{busy:true},{badBackup:true}]){const f=fixture(options);await assert.rejects(schema.applyApproved(f.pool,approval,f.backup),TypeError);assert.equal(f.stats().ddl,0);}
  const denied=fixture();await assert.rejects(schema.applyApproved(denied.pool,{},denied.backup),TypeError);assert.equal(denied.stats().reads,0);
  console.log("Approved swimmer merge schema: fixed 14 indexes, table validation, backup before DDL, idle guard, idempotence and authorization passed without network.");
})().catch(error=>{console.error(error);process.exitCode=1;});
