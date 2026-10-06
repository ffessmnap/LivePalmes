"use strict";
const assert = require("node:assert/strict");
const { readNativeCompetition, inspectNativeCompetitions } = require("../functions/nap-portal-competitions");
const { KINDS } = require("../tools/add-nap-portal-indexes");
const { SPECS, approvedIndexOperation } = require("../functions/nap-approved-index");
(async () => {
  let authorized = false, calls = [];
  const pool = { execute: async ({sql}, values) => {
    calls.push({sql,values}); assert.ok(sql.startsWith("SELECT ")); assert.match(sql, /LIMIT \d+$/);
    if (sql.includes("FROM competitions c")) return [[{id:5140,libelle:"Bi fins cup",date:"2026-10-11",enddate:"2026-10-11",ld:0,type_label:"Piscine",level_label:"Régionale",parameter_id:123,actif:1,saisie:1,relais:1,mailtxt:"private@example.test"}]];
    assert.equal(authorized,true,"scope checked before any dependent query");
    if (sql.includes("FROM compet_courses")) return [[{id:1,course:"legacy unknown course",cost:"3",sexe:"F"}]];
    if (sql.includes("FROM courses_swim")) return [[{id:1,course:"50BI",categorie:8,swim:0}]];
    return [[]];
  }};
  const result = await readNativeCompetition(pool, "legacy-nap-5140", event => { assert.equal(event.legacyCompetitionId,"5140"); authorized=true; });
  assert.equal(result.options,null); assert.equal(result.fees,null); assert.equal(result.courses[0].course,"legacy unknown course"); assert.equal(result.restrictions[0].swim,0);
  assert.equal(result.nativeParameters.saisie,1); assert.equal(result.nativeParameters.cat_d,null); assert.equal(result.detailedProgram,null); assert.equal(calls.length,12);
  assert.ok(!calls.some(c=>c.sql.includes("WHERE group_id IN") || c.sql.includes("WHERE session IN")),"empty sets do not query all children");
  calls=[];
  await assert.rejects(readNativeCompetition(pool,5140,()=>{throw new Error("scope denied");}), /scope denied/); assert.equal(calls.length,1);
  await assert.rejects(readNativeCompetition(pool,"1 OR 1=1",()=>{}),TypeError);
  await assert.rejects(readNativeCompetition(pool,5140),TypeError);
  await assert.rejects(readNativeCompetition({execute:async()=>[[{id:5140},{id:5140}]]},5140,()=>{}),RangeError);
  const proof = await inspectNativeCompetitions(pool); assert.equal(proof.writesExecuted,false); assert.ok(!JSON.stringify(proof).includes("private@example")); assert.equal(proof.competitions.length,3);
  let readCount=0;
  await assert.rejects(readNativeCompetition({execute:async({sql})=>{readCount++;return sql.includes("FROM competitions c")?[[{id:5140}]]:[Array(301).fill({})];}},5140,()=>{}),RangeError);
  assert.equal(readCount,2,"oversized course list stops all later reads");
  for (const kind of KINDS) {
    const spec = SPECS[kind]; let added=false;
    const indexPool = {
      execute:async({sql}) => [sql.startsWith("SHOW CREATE")?[{Table:spec.table,"Create Table":"structure"}]:added?spec.columns.map((Column_name,i)=>({Key_name:spec.name,Column_name,Seq_in_index:i+1,Non_unique:1,Sub_part:null})):[]],
      query:async({sql}) => {if(sql==="SHOW PROCESSLIST")return [[]]; assert.equal(sql,`ALTER TABLE \`${spec.table}\` ADD INDEX \`${spec.name}\` (${spec.columns.map(c=>`\`${c}\``).join(", ")})`); added=true;return [{}];}
    };
    const input={index:kind,confirmation:`nap-add-${kind}-index`,phase:"prepare"};
    const prepared=await approvedIndexOperation(indexPool,input);assert.equal(added,false);
    assert.equal((await approvedIndexOperation(indexPool,{...input,phase:"apply",schemaHash:prepared.schemaHash})).verified,true);
  }
  console.log("Competition NAP : perimetre avant lectures dependantes, limites, formats natifs preserves, complements absents non inventes, index fixes verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
