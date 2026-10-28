"use strict";
// EXPLAIN classification shared by the writer and its read-only diagnostic.

function indexed(statement,rows) {
  return rows.length>0 && rows.every(row=>statement.kind==="insert" && row.select_type==="INSERT" && row.table==="nageursengager" || String(row.table).startsWith("<") || ["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && row.type==null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table|No tables used)$/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key));
}

module.exports = { indexed };
