"use strict";
const assert = require("node:assert/strict");
const { FILE_SCHEMA, NULLABLE_FILE_FIELDS, FEATURED_INDEX, documentOptionsContract } = require("../functions/nap-document-options-contract");
function schema(extended) {
  const columns = FILE_SCHEMA.map(([COLUMN_NAME,COLUMN_TYPE]) => ({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:extended && NULLABLE_FILE_FIELDS.has(COLUMN_NAME) ? "YES" : "NO",COLUMN_DEFAULT:null,EXTRA:""}));
  const indexes = [{INDEX_NAME:"PRIMARY",COLUMN_NAME:"document_id",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}];
  if (extended) {
    columns.push({COLUMN_NAME:"featured_rank",COLUMN_TYPE:"tinyint unsigned",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""});
    indexes.unshift({INDEX_NAME:FEATURED_INDEX,COLUMN_NAME:"featured_rank",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null});
  }
  return {columns,indexes};
}
for (const extended of [false,true]) {
  const {columns,indexes} = schema(extended);
  assert.equal(documentOptionsContract(columns,indexes),extended ? "featured" : "original");
  const displayWidths = structuredClone(columns);
  for (const column of displayWidths) column.COLUMN_TYPE = column.COLUMN_TYPE.replace(/\b(bigint|tinyint|int)\b/,"$1(11)");
  assert.equal(documentOptionsContract(displayWidths,indexes),extended ? "featured" : "original");
  for (const alter of [
    state => state.columns.push({...state.columns[0],COLUMN_NAME:"unexpected"}),
    state => state.columns[0].IS_NULLABLE="YES",
    state => state.columns[0].COLUMN_DEFAULT="0",
    state => state.columns[0].EXTRA="auto_increment",
    state => state.indexes.push({...state.indexes[0],INDEX_NAME:"unexpected"}),
    state => state.indexes[0].NON_UNIQUE=1,
    state => state.indexes[0].SUB_PART=3
  ]) {
    const state=schema(extended);alter(state);
    assert.throws(()=>documentOptionsContract(state.columns,state.indexes),/incompatible/);
  }
}
const missingIndex=schema(true);missingIndex.indexes.shift();
assert.throws(()=>documentOptionsContract(missingIndex.columns,missingIndex.indexes),/incompatible/);
const partial=schema(false);partial.columns.push(schema(true).columns.at(-1));
assert.throws(()=>documentOptionsContract(partial.columns,partial.indexes),/incompatible/);
const missingColumn=schema(true);missingColumn.columns.pop();
assert.throws(()=>documentOptionsContract(missingColumn.columns,missingColumn.indexes),/incompatible/);
const docs=require("../functions/nap-competition-documents");
assert.ok(!docs.OPTIONS.includes("featured_rank"));
const row={id:42,name:"Document",type:7,location:"/documents/example.pdf",date:"2026-10-13",public:"Y",competition:1};
assert.equal(docs.item({...row,featured_rank:1}).napFingerprint,docs.item({...row,featured_rank:6}).napFingerprint);
console.log("Document options: exact original/extended contracts, partial migration refusal, editorial/file isolation passed offline.");
