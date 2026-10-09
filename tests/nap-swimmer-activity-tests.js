"use strict";
const assert=require("node:assert/strict");
const activity=require("../functions/nap-swimmer-activity");
const {COLUMNS}=require("../functions/nap-approved-swimmer-correction");
async function scenario(options={}) {
 let row=Object.fromEntries(COLUMNS.map(k=>[k,null]));Object.assign(row,{id:912,club:"106",actif:1,nom:"Test",prenom:"Test",date:"1992-07-01",number:"A-05-222647"});
 const original={...row},input={id:912,clubId:"106",actorUid:"test",status:"inactive",expectedFingerprint:activity.fingerprint(row)};
 let saved,updates=0,completed=0,failComplete=options.failComplete;
 const audit={read:async()=>saved,prepare:async(_,plan)=>{if(options.backupFails)throw Error("backup");saved=plan;},complete:async()=>{if(failComplete){failComplete=false;throw Error("audit");}completed++;}};
 const connection={execute:async({sql},values)=>{
  if(sql.startsWith("SELECT TRIGGER"))return [options.trigger?[{TRIGGER_NAME:"unexpected"}]:[]];
  if(sql.startsWith("SELECT "))return [[{...row}]];
  if(sql.startsWith("UPDATE")){updates++;assert.equal(values[0],0);assert.match(sql,/WHERE .*`id`/);if(options.race)return [{affectedRows:0}];row.actif=0;return [{affectedRows:1}];}
  throw Error(sql);
 }};
 if(options.stale)input.expectedFingerprint="a".repeat(64);
 if(options.wrongClub)input.clubId="999";
 if(options.stale||options.wrongClub||options.trigger||options.backupFails||options.race) {
  await assert.rejects(activity.change(connection,input,audit));assert.equal(updates,options.race?1:0);assert.deepEqual(row,original);return;
 }
 if(options.failComplete)await assert.rejects(activity.change(connection,input,audit));
 const result=await activity.change(connection,input,audit);
 assert.equal(result.swimmer.clubActivityStatus,"inactive");assert.equal(result.swimmer.licenseNumber,original.number);
 assert.deepEqual(row,{...original,actif:0});assert.equal(updates,1);assert.equal(completed,1);
 await activity.change(connection,input,audit);assert.equal(updates,1);
}
(async()=>{
 assert.equal(activity.status({actif:1}),"active");assert.equal(activity.status({actif:0}),"inactive");assert.throws(()=>activity.status({actif:2}));
 for(const options of [{},{stale:true},{wrongClub:true},{trigger:true},{backupFails:true},{race:true},{failComplete:true}])await scenario(options);
 console.log("NAP swimmer activity tests passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
