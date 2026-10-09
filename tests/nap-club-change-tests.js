"use strict";
const assert=require("node:assert/strict"),service=require("../functions/nap-club-change"),directory=require("../functions/nap-club-directory");
async function scenario(options={}) {
 let row=Object.fromEntries(service.COLUMNS.map(k=>[k,""]));Object.assign(row,{num_club:106,federal_club:"001234",nom_club:"Club",abre_club:"CN",comite_club:3,actif_club:1,ville:"Paris",postalcode:"75001",email:"private@example.test",enf:1,cnnp:1});
 const original={...row};let saved,writes=0,allowed=false,failComplete=options.failComplete;
 const input={clubId:"106",actorUid:"test",expectedFingerprint:directory.fingerprint(row),club:{...directory.club(row),clubName:"Club corrigé"}};
 if(options.stale)input.expectedFingerprint="a".repeat(64);
 if(options.federal)input.club.federalNumber="005678";
 const pool={execute:async({sql},values)=>{assert.equal(allowed,true);if(sql.startsWith("SELECT TRIGGER"))return [options.trigger?[{}]:[]];if(sql.startsWith("SELECT"))return [[{...row}]];if(sql.startsWith("EXPLAIN"))return [[{table:"c",key:options.badIndex?null:"PRIMARY"},{table:"clubs",key:"livepalmes_federal_id"}]];if(sql.startsWith("UPDATE")){writes++;assert.match(sql,/NOT EXISTS/);if(options.conflict)return [{affectedRows:0}];row={...saved.after};return [{affectedRows:1}];}throw Error(sql);}};
 const audit={read:async()=>saved,prepare:async(_,value)=>{if(options.backup)throw Error("backup");saved=value;},complete:async()=>{if(failComplete){failComplete=false;throw Error("audit");}}};
 const authorize=()=>{if(options.denied)throw Error("denied");allowed=true;};
 if(options.denied||options.stale||options.federal||options.trigger||options.badIndex||options.backup||options.conflict){await assert.rejects(service.edit(pool,input,audit,authorize));assert.equal(writes,options.conflict?1:0);assert.deepEqual(row,original);return;}
 if(options.failComplete)await assert.rejects(service.edit(pool,input,audit,authorize));
 const result=await service.edit(pool,input,audit,authorize);assert.equal(result.club.clubName,"Club corrigé");assert.equal(writes,1);assert.deepEqual(row,{...original,nom_club:"Club corrigé"});
 await service.edit(pool,input,audit,authorize);assert.equal(writes,1);
}
(async()=>{for(const value of [{},{denied:true},{stale:true},{federal:true},{trigger:true},{badIndex:true},{backup:true},{conflict:true},{failComplete:true}])await scenario(value);console.log("NAP club edit: scope, displayed fingerprint, preserved native fields, duplicate guard, backup and replay passed.");})().catch(e=>{console.error(e);process.exitCode=1;});
