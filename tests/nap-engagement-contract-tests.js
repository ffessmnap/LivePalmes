"use strict";
const assert = require("node:assert/strict");
const {QUERIES,inspectEngagementContract}=require("../functions/nap-engagement-contract");
(async()=>{
  let reads=0;
  const pool={execute:async ({sql})=>{
    assert.ok(/^(?:SELECT|EXPLAIN SELECT) /.test(sql));
    assert.ok(/LIMIT (?:40|60|80|100|101)$/.test(sql));
    assert.ok(!/\b(?:nom|prenom|lastname|firstname|mail|password|licence|tel)\b/i.test(sql));
    if (sql.startsWith("EXPLAIN")) return [[{table:"engagements",type:"index",key:"PRIMARY",rows:100}]];
    reads++;return [[]];
  }};
  const result=await inspectEngagementContract(pool);
  assert.equal(reads,QUERIES.length);assert.equal(result.writesExecuted,false);assert.equal(result.businessMappingsConfirmed,false);
  const refused=await inspectEngagementContract({execute:async()=>[[{table:"engagements",type:"ALL",key:null,rows:500000}]]});
  assert.equal(refused.complete,false);assert.equal(Object.keys(refused.samples).length,0);assert.ok(refused.errors.every(e=>e.reason==="non-indexed"));
  const oversized=await inspectEngagementContract({execute:async ({sql})=>sql.startsWith("EXPLAIN")?[[{table:"engagements",type:"index",key:"PRIMARY"}]]:[Array(101).fill({})]});
  assert.ok(oversized.errors.every(e=>e.reason==="volume"));
  const empty=await inspectEngagementContract({execute:async({sql})=>sql.startsWith("EXPLAIN")?[[{table:"forfait",type:"ALL",key:null,rows:0}]]:[[]]});
  assert.equal(empty.complete,true);
  const failure=await inspectEngagementContract({execute:async()=>{throw Object.assign(new Error("password private SQL"),{code:"ER_BAD_FIELD_ERROR"});}});
  assert.ok(failure.errors.every(e=>e.reason==="column"));assert.ok(!JSON.stringify(failure).includes("password"));
  console.log("Contrat engagements NAP : echantillons bornes et sans identites, plans non indexes refuses, aucune ecriture.");
})().catch(error=>{console.error(error);process.exitCode=1;});
