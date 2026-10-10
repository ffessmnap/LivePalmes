"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const directory=require("../functions/nap-club-directory");
const source=fs.readFileSync("functions/index.js","utf8");
const body=source.slice(source.indexOf("async function engagementClubAccessContext(request)"),source.indexOf("async function assertEngagementsAccess(request)"));
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
(async()=>{
 let sqlReads=0;
 const pool={execute:async query=>{sqlReads++;assert.match(query.sql,/FORCE INDEX \(PRIMARY\) WHERE num_club = \? LIMIT 1/);assert.deepEqual(query.values,[106]);assert.equal(query.timeout,10000);return [[{num_club:106,nom_club:"Club actuel NAP",abre_club:"CNHC",comite_club:23,actif_club:1}]];}};
 let legacy=0,userReads=0,canSwitch=true,found=true,unavailable=false;
 const sandbox={ENVIRONMENT:{sportingDataSource:"nap"},process:{env:{LIVEPALMES_NAP_PASSWORD:"offline-fixture"}},HttpsError,TypeError,cleanText:x=>String(x??"").trim(),ADMIN_UIDS:new Set(),normalizedAccessScope:x=>x||{},CLUB_REFERENCE_REGION_LABELS:{"12":"Corse"},engagementClubRegionId:club=>club.regionId,engagementClubById:async()=>{legacy++;throw Error("Legacy sports data forbidden");},db:{collection:name=>{assert.equal(name,"users");return {doc:()=>({get:async()=>{userReads++;return {exists:true,data:()=>({status:"active",clubId:"1",clubName:"Home",regionId:"1",capabilities:{"engagements.club.manage":true,"engagements.club.switch":canSwitch}})};}})};}},require:name=>name==="./nap-portal-swimmers"?{portalPool:password=>{assert.equal(password,"offline-fixture");return pool;}}:name==="./nap-club-directory"?{findClub:async(p,id)=>{if(unavailable)throw Error("credential must not leak");return found?directory.findClub(p,id):null;}}:(()=>{throw Error(name);})()};
 vm.runInNewContext(body+";globalThis.resolveContext=engagementClubAccessContext",sandbox);
 const request={auth:{uid:"actor",token:{}},data:{activeClubId:"106"}};
 let result=await sandbox.resolveContext(request);
 assert.equal(result.clubId,"106");assert.equal(result.clubName,"Club actuel NAP");assert.equal(result.regionId,"12");assert.equal(result.switchedClub,true);assert.equal(sqlReads,1);assert.equal(legacy,0);
 canSwitch=false;await assert.rejects(()=>sandbox.resolveContext(request),e=>e.code==="permission-denied");assert.equal(sqlReads,1);
 canSwitch=true;found=false;await assert.rejects(()=>sandbox.resolveContext(request),e=>e.code==="invalid-argument");
 found=true;unavailable=true;await assert.rejects(()=>sandbox.resolveContext(request),e=>e.code==="unavailable"&&!e.message.includes("credential"));assert.equal(legacy,0);
 unavailable=false;result=await sandbox.resolveContext({...request,data:{}});assert.equal(result.clubId,"1");assert.equal(sqlReads,1);
 await assert.rejects(()=>directory.findClub(pool,"106 OR 1=1"),TypeError);assert.equal(sqlReads,1);
 for(const name of ["previewEngagementClubEntryTimes","saveEngagementClubSwimmers"]){
  const start=source.indexOf("exports."+name+" =");const end=source.indexOf("\nexports.",start+1);
  const context={exports:{},onCall:(_,fn)=>fn,CALLABLE_OPTIONS:{},ENVIRONMENT:{sportingDataSource:"nap"},HttpsError,engagementClubAccessContext:()=>{throw Error("Should not read after retired action");}};
  vm.runInNewContext(source.slice(start,end),context);
  await assert.rejects(()=>context.exports[name]({}),e=>e.code==="failed-precondition");
 }
 assert.match(source,/exports.preloadEngagementClubWorkspaces = onCall\([^\n]+LIVEPALMES_NAP_PASSWORD/);
 console.log("NAP club switching: bounded primary lookup, native region/name, authorization before SQL, missing/unavailable without fallback, home club, retired writes and prefetch secret verified. User reads:",userReads);
})().catch(error=>{console.error(error);process.exitCode=1;});
