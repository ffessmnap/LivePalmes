"use strict";
const assert=require("node:assert/strict");
const {plan}=require("../functions/nap-qualification-plan");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const pack={event:{id:"legacy-nap-5162",competitionType:"pool"},nativeParameters:{qualif:29},options:null,groups:[],standards:[],qualifyingCompetitions:[]};
const events=[{type:"individual",code:"50BI",categories:["S"]}];
const rules={enabled:true,groups:[{categories:["S"],mode:"each",startDate:"2025-01-01",endDate:"2026-12-31",pools:["50"],competitionMode:"selected",competitionIds:["legacy-nap-5140"]}],standards:{"S|F|50BI":null,"S|M|50BI":2500}};
const input={national:true,expectedFingerprint:fingerprint(pack),events,rules};
const result=plan(pack,input);
assert.equal(result.changed,true);assert.equal(result.competitionId,5162);assert.deepEqual(result.after.groups[0].qualifyingCompetitionIds,[5140]);assert.equal(result.after.groups[0].electronic_only,1);assert.equal(result.after.standards[0].minimum_centiseconds,null);assert.equal(Object.hasOwn(result.after.groups[0],"id"),false,"Do not invent generated native group ids");
assert.deepEqual(pack.groups,[]);assert.equal(result.before.options,null);
for(const change of [{national:false},{expectedFingerprint:"wrong"},{rules:{...rules,standards:{"S|M|50BI":2500}}},{rules:{...rules,groups:[{...rules.groups[0],competitionIds:["firebase-old-id"]}]}}]) assert.throws(()=>plan(pack,{...input,...change}));
for(const changed of [{event:{...pack.event,competitionType:"openWater"}},{nativeParameters:{qualif:28}}]) {const other={...pack,...changed};assert.throws(()=>plan(other,{...input,expectedFingerprint:fingerprint(other)}));}
assert.equal(plan(pack,{...input,rules:{enabled:false}}).changed,false);
console.log("NAP grid preparation: national scope, complete existing minima, native selected ids, preserved snapshots and unknown native qualifier refusal; offline.");
