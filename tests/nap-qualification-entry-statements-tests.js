"use strict";
const assert=require('node:assert/strict');
const {statements}=require('../functions/nap-qualification-entry-statements');
const {SPECS}=require('../functions/nap-portal-competition-change');
const id='a'.repeat(64),input={national:true,actorUid:'national',competitionId:5162,jobId:id,confirmed:true,previous:{id,competition_id:5162,state:'apply',version:'3',cursor:'',payload:{applyStarted:true}}};
const pack={nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(c=>[c,c==='id'?5162:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(c=>[c,c==='id'?4000:c==='compet'?5162:null]))},nativeParameters:{qualif:29},options:{version:'9'}};
const row={kind:'update',before:{nativeId:1,nativeTime:'14200',eventCode:'50BI'},inscriptionId:100,swimmerId:912,clubId:'00106',tps:'013900'};
const plan={restart:false,writes:[row,{...row,kind:'delete',before:{nativeId:2,nativeTime:'020000',eventCode:'200BI'}}]};
const sql=statements(input,plan,pack);assert.equal(sql.length,2);assert.deepEqual(sql.map(s=>s.kind),['delete','update']);
for(const statement of sql){assert.equal((statement.sql.match(/\?/g)||[]).length,statement.values.length);assert.match(statement.sql,/scope_j.state='apply'/);assert.match(statement.sql,/scope_j.version=\?/);assert.match(statement.sql,/scope_o.version=\?/);assert.match(statement.sql,/scope_q.qualif <=> \?/);assert.match(statement.sql,/BINARY CONVERT\(scope_n.club USING utf8mb4\)/);assert.ok(statement.values.includes('00106'));assert.equal(statement.expectedRows,1);assert.doesNotMatch(statement.sql,/INSERT|UTC_TIMESTAMP/);}
assert.deepEqual(statements(input,{restart:false,writes:[]},pack),[]);
assert.match(statements(input,{restart:false,writes:[row]},{...pack,options:null})[0].sql,/NOT EXISTS \(SELECT 1 FROM livepalmes_competition_options/);
assert.throws(()=>statements({...input,confirmed:false},plan,pack));
assert.throws(()=>statements(input,{...plan,restart:true},pack));
assert.throws(()=>statements(input,{restart:false,writes:[row,row]},pack));
assert.throws(()=>statements(input,plan,{...pack,nativeParameters:{qualif:28}}));
assert.throws(()=>statements(input,{restart:false,writes:[{...row,tps:'016000'}]},pack));
console.log('NAP qualification entry statements: offline grouped conditional writes, exact native time, club/identity/job/options/qualification guards and no additions.');
