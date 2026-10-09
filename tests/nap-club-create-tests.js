"use strict";
const assert=require("node:assert/strict"),service=require("../functions/nap-club-create");
const input={actorUid:"test",creationId:"00000000-0000-4000-8000-000000000001",club:{federalNumber:"001234",clubCode:"CN",clubName:"Club",regionId:"Ile de France",city:"Paris",postalCode:"75001",active:true}};
async function scenario(options={}) {
 let saved,row,writes=0,allowed=false,failComplete=options.failComplete;
 const connection={release(){},destroy(){},execute:async({sql})=>{assert.equal(allowed,true);if(sql.includes("GET_LOCK"))return [[{acquired:options.busy?0:1}]];if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];if(sql.startsWith("SELECT TRIGGER"))return [options.trigger?[{}]:[]];if(sql.startsWith("EXPLAIN"))return [[{table:"duplicate",key:options.badIndex?null:"livepalmes_federal_id"}]];if(sql.startsWith("INSERT")){writes++;if(options.conflict)return [{affectedRows:0}];row={num_club:720,...saved.native,integrationdate:saved.timestamp};if(options.lostResponse)throw Error("lost response");return [{affectedRows:1,insertId:720}];}if(sql.startsWith("SELECT"))return [[{...row}]];throw Error(sql);}};
 const pool={getConnection:async()=>{assert.equal(allowed,true);return connection;}};
 const audit={read:async()=>saved,prepare:async(_,value)=>{if(options.backup)throw Error("backup");saved=value;},checkpoint:async(_,value)=>{saved=value;},complete:async()=>{if(failComplete){failComplete=false;throw Error("audit");}}};
 const authorize=()=>{if(options.denied)throw Error("denied");allowed=true;};
 if(options.denied||options.busy||options.trigger||options.badIndex||options.backup||options.conflict||options.lostResponse){await assert.rejects(service.create(pool,input,audit,authorize));assert.equal(writes,options.conflict||options.lostResponse?1:0);if(options.lostResponse){await assert.rejects(service.create(pool,input,audit,authorize),/identifiant non confirme/);assert.equal(writes,1);}return;}
 if(options.failComplete)await assert.rejects(service.create(pool,input,audit,authorize));
 const result=await service.create(pool,input,audit,authorize);assert.equal(result.club.clubId,"720");assert.equal(result.club.federalNumber,"001234");assert.equal(writes,1);assert.equal(row.cnnp,0);assert.equal(row.enf,0);
 await service.create(pool,input,audit,authorize);assert.equal(writes,1);
}
(async()=>{for(const options of [{},{denied:true},{busy:true},{trigger:true},{badIndex:true},{backup:true},{conflict:true},{lostResponse:true},{failComplete:true}])await scenario(options);assert.equal(service.proposed({...input.club,regionId:"Corse"}).comite_club,23);console.log("NAP club creation: national authorization, string federal number, duplicate refusal, durable generated ID and uncertain retry passed.");})().catch(e=>{console.error(e);process.exitCode=1;});
