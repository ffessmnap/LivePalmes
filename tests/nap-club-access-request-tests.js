"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const service=require("../functions/nap-club-access-request");
async function run(){
 const row={num_club:720,federal_club:"001234",nom_club:"Club",abre_club:"CN",comite_club:23,actif_club:1,ville:"Paris",postalcode:"75001"};
 let queries=0;
 const pool={execute:async query=>{queries++;assert.match(query.sql,/FORCE INDEX \(livepalmes_federal_id\).*WHERE federal_club=\? LIMIT 2/);assert.deepEqual(query.values,["001234"]);return [[row]];}};
 assert.equal(await service.findByFederalNumber(pool,""),null);assert.equal(queries,0);
 const found=await service.findByFederalNumber(pool," 001234 ");assert.equal(found.clubId,"720");assert.equal(found.regionId,"12");assert.equal(found.source,"nap");
 await assert.rejects(service.findByFederalNumber({execute:async()=>[[row,row]]},"001234"),/Plusieurs clubs/);
 await assert.rejects(service.findByFederalNumber({execute:async()=>{throw Error("offline");}},"001234"),/offline/);
 const input={actorUid:"admin",requestId:"request-1",payload:{newClub:{federalNumber:"001234"},regionId:"12"}};
 assert.deepEqual(await service.createFromRequest(pool,input,{read:async()=>null}),{club:found,created:false});
 assert.match(service.creationId("request-1"),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.equal(service.creationId("request-1"),service.creationId("request-1"));assert.notEqual(service.creationId("request-1"),service.creationId("request-2"));
 assert.throws(()=>service.creationId(""),/requise/);
 let saved,createdRow,writes=0;
 const creationPool={execute:async()=>[[]],getConnection:async()=>({release(){},destroy(){},execute:async({sql})=>{
  if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
  if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
  if(sql.startsWith("SELECT TRIGGER"))return [[]];
  if(sql.startsWith("EXPLAIN"))return [[{table:"duplicate",key:"livepalmes_federal_id"}]];
  if(sql.startsWith("INSERT")){writes++;createdRow={num_club:721,...saved.native,integrationdate:saved.timestamp};return [{affectedRows:1,insertId:721}];}
  if(sql.startsWith("SELECT"))return [[createdRow]];
  throw Error(sql);
 }})};
 const fullInput={...input,payload:{regionId:"Ile de France",newClub:{federalNumber:"001234",clubCode:"CN",clubName:"Club",city:"Paris",postalCode:"75001"}}};
 const audit={read:async()=>saved,prepare:async(_,value)=>{saved=value;},checkpoint:async(_,value)=>{saved=value;},complete:async()=>{}};
 assert.equal((await service.createFromRequest(creationPool,fullInput,audit)).club.clubId,"721");
 assert.equal((await service.createFromRequest(creationPool,fullInput,audit)).club.clubId,"721");assert.equal(writes,1);
 // An uncertain receipt must reach native recovery, never reuse a club by number.
 await assert.rejects(service.createFromRequest({execute:async()=>{throw Error("lookup must not run");},getConnection:async()=>{throw Error("native recovery");}},
 {...input,payload:{regionId:"Ile de France",newClub:{federalNumber:"001234",clubCode:"CN",clubName:"Club",city:"Paris",postalCode:"75001"}}},{read:async()=>({phase:"writing"})}),/native recovery/);
 const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
 for(const name of ["submitEngagementAccessRequest","resolveEngagementAccessRequest"]){assert.match(source,new RegExp(`exports\\.${name} = onCall\\([^\\n]+defineSecret\\("LIVEPALMES_NAP_PASSWORD"\\)`));}
 assert.match(source,/createClubFromEngagementAccessRequest\(resolvedData, context.uid, requestId\)/);
 console.log("NAP new-club access request: indexed lookup, duplicates, recovery, secret bindings OK");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
