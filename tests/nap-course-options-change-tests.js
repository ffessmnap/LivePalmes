"use strict";
const assert=require('node:assert/strict'),options=require('../functions/nap-course-options-change');
const columns=require('../functions/nap-approved-portal-schema').tables[1].columns.map(row=>row.name);
const change=require('../functions/nap-portal-competition-change');
const pack={event:{id:'legacy-nap-5162',competitionType:'pool'},nativeSnapshot:{competition:Object.fromEntries(change.SPECS.competitions.columns.map(key=>[key,key==='id'?5162:null])),parameters:Object.fromEntries(change.SPECS.compet_parametres.columns.map(key=>[key,key==='id'?1:key==='compet'?5162:null]))},nativeParameters:{qualif:0},courses:[{id:1,course:'50BI',sexe:'M',relais:0}],courseOptions:[],options:null,groups:[],standards:[],qualifyingCompetitions:[],fees:null,committees:[],detailedProgram:null};
const input={actorUid:'national',eventDefinitions:new Map([['50BI',{code:'50BI',type:'individual'}]]),normalizeEvents:raw=>raw.map(row=>({...row,type:'individual'}))};
const item=options.plan(pack,[{code:'50BI',categoryRestrictions:['S']}],input,'2026-10-08 12:00:00.000000');
assert.equal(item.after[0].competition_id,5162);assert.deepEqual(item.after[0].category_restrictions,['S']);assert.equal(item.after[0].version,'1');assert.equal(item.after[0].created_by,'national');
assert.throws(()=>options.plan(pack,[{code:'100BI'}],input,'now'),/absente/);
assert.throws(()=>options.plan(pack,[{code:'50BI'},{code:'50BI'}],input,'now'),/dupliquee/);
assert.deepEqual(options.plan({...pack,courseOptions:item.after},[{code:'50BI',categoryRestrictions:['S']}],input,'later').after,item.after,'Unchanged settings keep tracking/version');
const virtual=require('../functions/nap-qualification-target-pack').targetPack(pack,[item]);assert.deepEqual(virtual.courseOptions,item.after);assert.deepEqual(pack.courseOptions,[]);
let state=[],backup=[],commits=0,rollbacks=0,queries=0,denyInsert=false;
const connection={beginTransaction:async()=>{backup=structuredClone(state);},commit:async()=>commits++,rollback:async()=>{state=backup;rollbacks++;},execute:async(statement,values)=>{queries++;
 if(statement.sql.startsWith('SELECT *')){assert.match(statement.sql,/WHERE competition_id=\? ORDER BY event_code LIMIT 301/);return [structuredClone(state)];}
 assert.match(statement.sql,/EXISTS \(SELECT 1 FROM `competitions`/);assert.match(statement.sql,/EXISTS \(SELECT 1 FROM `compet_parametres`/);
 if(statement.sql.startsWith('DELETE')){assert.match(statement.sql,/LIMIT 300$/);const affectedRows=state.length;state=[];return [{affectedRows}];}
 if(statement.sql.startsWith('INSERT')){if(denyInsert)return [{affectedRows:0}];state=item.after.map((_,index)=>Object.fromEntries(columns.map((key,k)=>[key,values[index*columns.length+k]])));return [{affectedRows:item.after.length}];}
 throw Error('Unexpected statement');}};
(async()=>{
 const authority={competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters};
 await options.apply(connection,item,5162,authority);assert.equal(commits,1);assert.equal(queries,4);assert.deepEqual(options.normalize(state),item.after);
 assert.equal((await options.apply(connection,item,5162,authority)).resumed,true);assert.equal(commits,2);assert.equal(queries,5);
 const beforeQueries=queries;await assert.rejects(options.apply(connection,{...item,after:[{...item.after[0],competition_id:1}]},5162,authority),/Perimetre/);assert.equal(queries,beforeQueries);
 state=[];denyInsert=true;await assert.rejects(options.apply(connection,item,5162,authority),/Perimetre/);assert.equal(rollbacks,1);assert.deepEqual(state,[]);
 state=[{...item.after[0],version:'99'}];await assert.rejects(options.apply(connection,item,5162,authority),/change/);assert.equal(state[0].version,'99');assert.equal(rollbacks,2);
 console.log('NAP course settings: grouped atomic replacement, native authority guards, unchanged versions, retry, rollback and virtual qualification preview; offline.');
})().catch(error=>{console.error(error);process.exitCode=1;});
