"use strict";
const assert=require("node:assert/strict"),{references,indexes}=require("../functions/nap-club-deletion-references"),{SPECS,validIndex}=require("../functions/nap-approved-index");
assert.equal(indexes.length,19);assert.equal(new Set(indexes.map(spec=>spec.table+":"+spec.name)).size,19);
for(const spec of indexes){
 assert.deepEqual(SPECS[`clubDeletion_${spec.table}_${spec.columns[0]}`],spec);
 const rows=spec.columns.map((column,i)=>({Key_name:spec.name,Column_name:column,Seq_in_index:i+1,Non_unique:1,Sub_part:null}));
 assert.equal(validIndex(rows,spec),true);assert.throws(()=>validIndex(rows.map(row=>({...row,Non_unique:0})),spec));
 assert.ok(references.some(ref=>ref.table===spec.table&&ref.field===spec.columns[0]));
}
assert.equal(references.length,24);
console.log("Club deletion index proposal: nineteen fixed non-unique indexes, existing schema operation, no sporting changes or unbounded reference queries.");
