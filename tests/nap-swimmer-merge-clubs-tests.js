"use strict";
const assert=require("node:assert/strict"),clubs=require("../functions/nap-swimmer-merge-clubs"),plans=require("../functions/nap-swimmer-merge-plan"),{fingerprint}=require("../functions/nap-portal-swimmer-change");
const source={id:12,nom:"TEST",prenom:"Source",date:"1980-01-01",sexe:"M",club:"90",actif:1,wc:0,edf:0,creation:"2020-01-01",number:""},target={...source,id:13,club:"107",prenom:"Cible"};
const input={sourceSwimmerId:"12",targetSwimmerId:"13",sourceFingerprint:fingerprint(source),targetFingerprint:fingerprint(target),sourceLicenseNumber:"",targetLicenseNumber:"",actorUid:"national",confirmMerge:true,confirmClubMismatch:true,finalClubId:"583",timestamp:"2026-10-24 00:00:00.000000"};
(async()=>{
 const snapshots=Object.fromEntries(plans.TABLES.map(spec=>[spec.table,[]]));
 snapshots.perfs=[{id:1,nageur:12,club:"13310",tps:"005168",points:"456"},{id:2,nageur:12,club:"583",tps:"005200"},{id:3,nageur:13,club:"",tps:"015000"}];
 snapshots.perfs_relais=[{id:4,nageur1:12,nageur2:20,nageur3:21,nageur4:22,club:null,tps1:"12345"}];
 let reads=0;const connection={execute:async(query,values)=>{reads++;assert.match(query.sql,/FORCE INDEX \(PRIMARY\).*WHERE num_club IN/);assert.match(query.sql,/LIMIT 4003$/);assert.deepEqual(values,[90,107,583,13310]);return [[90,107,583].map(num_club=>({num_club}))];}};
 const policy=await clubs.preparePolicy(connection,source,target,snapshots);assert.equal(reads,1);const before=structuredClone(snapshots);
 const plan=plans.planMerge(input,source,target,snapshots,[],policy);const changes=plan.changes.find(c=>c.table==="perfs");
 assert.deepEqual(changes.updates.map(c=>[c.after.id,c.after.club,c.after.nageur]),[[1,"90",13],[2,"583",13],[3,"107",13]]);assert.equal(plan.targetAfter.club,"583");assert.equal(plan.changes.find(c=>c.table==="perfs_relais").updates[0].after.club,"90");assert.deepEqual(snapshots,before);assert.equal(changes.updates[0].after.tps,"005168");assert.equal(changes.updates[0].after.points,"456");
 plans.validateSaved(plan,input);const broken=structuredClone(plan);broken.changes.find(c=>c.table==="perfs").updates[0].after.club="107";assert.throws(()=>plans.validateSaved(broken,input),/incompatible/);
 assert.throws(()=>clubs.historicalClub("perfs",snapshots.perfs[0],source,target,{version:1,recognizedClubIds:["107"]}),/origine inconnu/);
 assert.throws(()=>clubs.historicalClub("perfs_relais",{nageur1:12,nageur2:13,club:""},source,target,policy),/ambigue/);
 const legacy=plans.planMerge(input,source,target,snapshots,[]);plans.validateSaved(legacy,input);assert.equal(legacy.changes.find(c=>c.table==="perfs").updates[0].after.club,"13310");
 console.log("Merge historical clubs: one indexed grouped lookup, preserved known club, source/target original club fallback, final club independent, relay, raw times and immutable replay verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
