"use strict";
const assert=require("node:assert/strict");
const {statements}=require("../functions/nap-individual-entry-statements");
const {SPECS}=require("../functions/nap-portal-competition-change");
const authority=Object.fromEntries(["competitions","compet_parametres"].map(table=>[table,Object.fromEntries(SPECS[table].columns.map(key=>[key,key==="id"?5140:null]))]));
authority.options=null;
authority.compet_parametres.compet=5140; authority.compet_parametres.actif=1;
const end="2026-10-07T19:59:00.000Z";
const old={id:20,engagement:11,course:"100SF",tps:"14200"},removed={id:21,engagement:11,course:"50SF",tps:"3000"};
const plan={competitionId:5140,clubId:"106",plans:[{swimmerId:1,inscriptionId:11,before:[old,removed],updates:[{before:old,tps:"14100"}],removals:[removed],additions:[{engagement:11,course:"200SF",tps:"30000"}]}]};
const sql=statements(plan,authority,end);
assert.deepEqual(sql.map(row=>row.kind),["delete","update","insert"]);
for(const row of sql) {
  assert.equal((row.sql.match(/\?/g)||[]).length,row.values.length);
  assert.match(row.sql,/UTC_TIMESTAMP\(\) < \?/);
  assert.match(row.sql,/scope_n.club=BINARY \?/);
  assert.match(row.sql,/scope_i.compet=\?/);
  assert.match(row.sql,/LIMIT 5000$/);
  assert.ok(!row.sql.includes("14200"));
}
assert.match(sql[2].sql,/LEFT JOIN engagements existing FORCE INDEX \(engagements_clef\)/);
assert.doesNotMatch(sql[2].sql,/SELECT .* FROM engagements WHERE/);
assert.deepEqual(statements({...plan,plans:[]},authority,end),[]);
assert.throws(()=>statements(plan,{...authority,options:undefined},end));
assert.throws(()=>statements(plan,authority,"2026-10-07"));
assert.throws(()=>statements(plan,{...authority,compet_parametres:{...authority.compet_parametres,actif:0}},end));
const bad=structuredClone(plan); bad.plans[0].updates[0].before={...bad.plans[0].updates[0].before,id:99};
assert.throws(()=>statements(bad,authority,end));
console.log("NAP individual entry statements tests passed");
