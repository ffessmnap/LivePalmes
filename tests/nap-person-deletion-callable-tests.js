"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8"),a=source.indexOf("exports.deleteEngagementNationalClubPerson ="),b=source.indexOf("\nexports.",a+1);
(async()=>{
 let national=true,reads=0;
 const sandbox={exports:{},ENVIRONMENT:{sportingDataSource:"nap"},CALLABLE_OPTIONS:{},process:{env:{}},TypeError,Date,HttpsError:class extends Error{},defineSecret:v=>v,onCall:(o,f)=>Object.assign(f,{options:o}),engagementAccessContext:async()=>({national,uid:"national"}),cleanText:v=>String(v||""),db:new Proxy({},{get(){throw Error("Legacy sporting database forbidden");}}),require:n=>n==="./nap-portal-swimmers"?{portalPool:()=>({})}:{deletePerson:async(p,input,audit,authorize)=>{reads++;await authorize();assert.equal(input.personId,"nap-official-7");assert.equal(input.confirmPermanent,true);assert.equal(input.expectedFingerprint,"fingerprint");return {ok:true,source:"nap"};}}};
 vm.runInNewContext(source.slice(a,b),sandbox);
 const callable=sandbox.exports.deleteEngagementNationalClubPerson;assert.equal(callable.options.secrets[0],"LIVEPALMES_NAP_PASSWORD");
 assert.equal((await callable({data:{personId:"nap-official-7",confirmPermanent:true,expectedFingerprint:"fingerprint"}})).source,"nap");
 await assert.rejects(callable({data:{personId:"nap-official-7"}}));national=false;await assert.rejects(callable({data:{personId:"nap-official-7",confirmPermanent:true}}));assert.equal(reads,1);
 const client=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8"),start=client.indexOf("  async function deleteEngagementNationalPerson("),end=client.indexOf("\n  async function ",start+1);
 assert.match(client.slice(start,end),/expectedFingerprint: person.napFingerprint/);
 for(const file of ["nap-portal-entries","nap-admin-entries"]) {
   const reader=fs.readFileSync(require.resolve(`../functions/${file}`),"utf8");
   assert.match(reader,/COALESCE\(h.nom,o.nom\) AS nom/);assert.match(reader,/h.engagement_id=e.id AND h.person_id=e.officiel AND h.competition_id=e.compet AND h.entry_club=e.club/);
 }
 console.log("National person deletion callable: authorization/confirmation before native service, displayed fingerprint, no legacy sporting access and per-entry historical read passed.");
})().catch(e=>{console.error(e);process.exitCode=1;});
