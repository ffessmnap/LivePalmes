"use strict";
const assert=require("node:assert/strict"),service=require("../functions/nap-club-deletion"),{COLUMNS}=require("../functions/nap-club-change"),directory=require("../functions/nap-club-directory");
function fixture({used=false,account=false,changed=false,historical=false,failBackup=false,lost=false}={}){
 const original=Object.fromEntries(COLUMNS.map(c=>[c,""]));Object.assign(original,{num_club:123,federal_club:"12345",nom_club:"Test",abre_club:"TEST",integrationdate:"2026-10-09 10:00:00"});
 const input={clubId:"123",actorUid:"national",confirmPermanent:true,expectedFingerprint:directory.fingerprint(original)};
 let row=structuredClone(original),saved,authorized=false,writes=0,fail=lost,checks=0;const calls=[];
 if(changed)row.nom_club="Changed";
 const connection={execute:async({sql})=>{assert.ok(authorized);calls.push(sql);
  if(sql.includes("information_schema.TRIGGERS"))return[[]];
  if(sql.startsWith("SELECT `num_club`"))return[row?[structuredClone(row)]:[]];
  if(sql.startsWith("SELECT 1 FROM"))return[used&&sql.includes("`perfs`")?[{1:1}]:[]];
  if(sql.startsWith("DELETE")){assert.ok(saved);writes++;row=null;if(fail){fail=false;throw Error("Lost response");}return[{affectedRows:1}];}
  throw Error(sql);
 },query:async({sql})=>{calls.push(sql);return[{}];},release(){},destroy(){}};
 const audit={creation:async()=>{if(historical)throw new TypeError("Historical");return{nativeId:123,phase:"identified",timestamp:original.integrationdate,operation:"a".repeat(64)};},assertNoAccounts:async()=>{checks++;if(account)throw new TypeError("Account");},read:async()=>saved,prepare:async(key,plan)=>{if(failBackup)throw Error("Backup");saved=structuredClone(plan);},complete:async()=>{}};
 return{input,audit,calls,pool:{getConnection:async()=>{assert.ok(authorized);return connection;}},authorize:async()=>{authorized=true;},state:()=>({row,writes,checks})};
}
(async()=>{
 for(const lost of [false,true]){const f=fixture({lost});if(lost)await assert.rejects(service.deleteClub(f.pool,f.input,f.audit,f.authorize),/Lost response/);let previous=f.calls.length;await service.deleteClub(f.pool,f.input,f.audit,f.authorize);assert.ok(f.calls.length-previous<=40);previous=f.calls.length;await service.deleteClub(f.pool,f.input,f.audit,f.authorize);assert.ok(f.calls.length-previous<=40);assert.equal(f.state().writes,1);assert.equal(f.state().row,null);}
 for(const option of ["used","account","changed","historical","failBackup"]){const f=fixture({[option]:true});await assert.rejects(service.deleteClub(f.pool,f.input,f.audit,f.authorize));assert.equal(f.state().writes,0,option);}
 const f=fixture();await assert.rejects(service.deleteClub(f.pool,f.input,f.audit,async()=>{throw Error("Denied");}),/Denied/);assert.equal(f.calls.length,0);
 console.log("Native club deletion: history, accounts, stale identity, backup failure, authorization and lost-response recovery verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
