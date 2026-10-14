"use strict";
const assert=require("node:assert/strict"),{inspect}=require("../functions/nap-document-themes-inspect");
(async()=>{
 let calls=0;
 const result=await inspect({execute:async({sql})=>{calls++;assert.match(sql,/^(EXPLAIN SELECT|SELECT) /);return [sql.startsWith("EXPLAIN")?[{table:"ref",type:"range",key:"PRIMARY",rows:10}]:[]];}});
 assert.equal(calls,9);assert.equal(result.napWrites,0);assert.equal(result.checks.length,4);
 assert.equal((await inspect({execute:async()=>[[{type:"ALL",key:null}]]})).complete,false);
 let n=0;assert.equal((await inspect({execute:async()=>{n++;return [n%2?[{key:"PRIMARY",type:"range"}]:Array(101).fill({id:1})];}})).complete,false);
 console.log("Private document taxonomy: fixed read-only queries, indexed plans and volume bounds passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
