"use strict";
// Bounded reads and EXPLAIN classification; no writer or dossier dependency.
const {SOURCES,OPTION_COLUMNS,normalizeOptions}=require("./nap-club-people");
const {selectedStatement}=require("./nap-official-entry-statements");

function indexed(statement,rows) {
  return Array.isArray(rows) && rows.length>0 && rows.every(row=>statement.kind==="insert" && row.select_type==="INSERT" && row.table==="officielsengager" || String(row.table).startsWith("<") || ["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && row.type==null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table|No tables used)$/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key));
}

async function readPeople(connection,ids,clubId) {
  if(!ids.length) return [];
  const statement=selectedStatement(ids,clubId),[rows]=await connection.execute({sql:statement.sql,timeout:10000},statement.values);
  if(rows.length>80) throw new RangeError("Selection de personnes trop volumineuse.");
  return rows.map(row=>({native:Object.fromEntries(SOURCES.officials.columns.map(key=>[key,row[key]])),options:row.option_person_id==null?null:normalizeOptions(Object.fromEntries(OPTION_COLUMNS.map(key=>[key,row[`option_${key}`]])))}));
}

module.exports = { indexed, readPeople };
