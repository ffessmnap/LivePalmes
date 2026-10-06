"use strict";
const assert=require("node:assert/strict");
const {inspectCourseDocumentContract}=require("../functions/nap-course-document-contract");
(async()=>{
  const queries=[];
  const result=await inspectCourseDocumentContract({execute:async({sql,timeout})=>{
    queries.push(sql);assert.equal(timeout,10000);assert.ok(sql.startsWith("SELECT") || sql.startsWith("EXPLAIN SELECT"));
    assert.ok(!/\b(?:nom|prenom|name|mail|user|location|password|comment)\b/i.test(sql));
    if(sql.startsWith("EXPLAIN")) return [[{table:"fixed",type:"index",key:"PRIMARY",rows:301}]];
    if(sql.includes("FROM course_dispo")) return [Array.from({length:301},(_,i)=>({id:i+1,course:"50BI"}))];
    return [[]];
  }});
  assert.equal(queries.length,5);assert.equal(result.complete,true);assert.equal(result.writesExecuted,false);
  assert.equal(result.samples.catalog.length,300);assert.equal(result.samples.catalogHasMore,true);assert.equal(result.samples.catalogNextId,300);
  const refused=await inspectCourseDocumentContract({execute:async({sql})=>[sql.startsWith("EXPLAIN") ? [{table:"fixed",type:"ALL",key:null,rows:100000}] : []]});
  assert.equal(refused.complete,false);assert.deepEqual(refused.samples,{});
  const failure=await inspectCourseDocumentContract({execute:async({sql})=>{if(sql.startsWith("EXPLAIN")) throw Object.assign(new Error("private SQL"),{code:"ER_BAD_FIELD_ERROR"});return [[]];}});
  assert.ok(failure.errors.every(error=>error.reason==="column"));assert.ok(!JSON.stringify(failure).includes("private SQL"));
  console.log("References courses/documents NAP : cinq lectures/plans bornes, aucun contenu prive ni ecriture, pagination explicite verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
