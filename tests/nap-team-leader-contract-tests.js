"use strict";
const assert=require("node:assert/strict");
const {marker,inspectNativeLeaderContract}=require("../functions/nap-team-leader-contract");
const columns=["id","compet","nom","prenom","date","club","pourclub"];
const ordinary={id:12,compet:5140,nom:"PRIVE",prenom:"PERSONNE",date:"1980-01-03",club:"106",pourclub:""};
assert.equal(marker(ordinary),null);
assert.equal(marker({...ordinary,nom:"sans chef d'équipe",prenom:""}),"possible-waiver-label");
assert.equal(marker({...ordinary,prenom:""}),"incomplete-identity");
function pool({rows=[ordinary,{...ordinary,id:11,nom:"Sans chef d'équipe",prenom:"",date:"0000-00-00"}],plan=[{table:"chefsdequipe",type:"index",key:"PRIMARY",rows:10000,Extra:null}],metadata=columns.map(COLUMN_NAME=>({COLUMN_NAME,COLUMN_DEFAULT:""}))}={}) {
  const calls=[];return {calls,execute:async({sql},values)=>{
    calls.push({sql,values});assert.match(sql,/^(SELECT|EXPLAIN SELECT) /);assert.ok(calls.length<=3);
    return [sql.includes("information_schema")?metadata:sql.startsWith("EXPLAIN")?plan:rows];
  }};
}
(async()=>{
  const p=pool(),result=await inspectNativeLeaderContract(p);assert.equal(p.calls.length,3);assert.equal(result.writesExecuted,false);assert.equal(result.interpretationConfirmed,false);assert.equal(result.candidates.length,1);
  const json=JSON.stringify(result);assert.ok(!json.includes(ordinary.nom));assert.ok(!json.includes(ordinary.prenom));assert.ok(!json.includes(ordinary.date));assert.ok(!json.includes("Sans chef"));
  await assert.rejects(()=>inspectNativeLeaderContract(pool({plan:[{type:"ALL",key:null}]})));
  await assert.rejects(()=>inspectNativeLeaderContract(pool({metadata:[]})));
  await assert.rejects(()=>inspectNativeLeaderContract(pool({rows:[ordinary,ordinary]})));
  await assert.rejects(()=>inspectNativeLeaderContract(pool({rows:Array(202).fill(ordinary)})));
  const many=Array.from({length:201},(_,i)=>({...ordinary,id:300-i,prenom:""}));
  const sample=await inspectNativeLeaderContract(pool({rows:many}));assert.equal(sample.sampled,200);assert.equal(sample.olderRowsNotInspected,true);assert.equal(sample.candidates.length,20);assert.equal(sample.candidatesTruncated,true);
  console.log("Contrat chef NAP : trois lectures indexees et bornees, aucun nom/date ni interpretation automatique, volumes et plans divergents refuses.");
})().catch(error=>{console.error(error);process.exitCode=1;});
