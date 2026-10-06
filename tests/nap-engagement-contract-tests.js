"use strict";
const assert = require("node:assert/strict");
const {QUERIES,inspectEngagementContract}=require("../functions/nap-engagement-contract");
(async()=>{
  let reads=0;
  const pool={execute:async ({sql})=>{
    assert.ok(/^(?:SELECT|EXPLAIN SELECT) /.test(sql));
    assert.ok(/LIMIT (?:40|60|80|100)$/.test(sql));
    assert.ok(!/\b(?:nom|prenom|lastname|firstname|mail|password|licence|tel)\b/i.test(sql));
    if (sql.startsWith("EXPLAIN")) return [[{table:"engagements",type:"index",key:"PRIMARY",rows:100}]];
    reads++;return [[]];
  }};
  const result=await inspectEngagementContract(pool);
  assert.equal(reads,QUERIES.length);assert.equal(result.writesExecuted,false);assert.equal(result.businessMappingsConfirmed,false);
  await assert.rejects(inspectEngagementContract({execute:async()=>[[{table:"engagements",type:"ALL",key:null}]]}),/non indexe/);
  await assert.rejects(inspectEngagementContract({execute:async ({sql})=>sql.startsWith("EXPLAIN")?[[{table:"engagements",type:"index",key:"PRIMARY"}]]:[Array(101).fill({})]}),/volumineux/);
  console.log("Contrat engagements NAP : echantillons bornes et sans identites, plans non indexes refuses, aucune ecriture.");
})().catch(error=>{console.error(error);process.exitCode=1;});
