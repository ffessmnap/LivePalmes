"use strict";
const assert=require("node:assert/strict"),plans=require("../functions/nap-swimmer-merge-plan"),{fingerprint}=require("../functions/nap-portal-swimmer-change");
const source={id:12,nom:"TEST",prenom:"Source",date:"1980-01-01",sexe:"M",club:"106",actif:1,wc:0,edf:0,creation:"2020-01-01",number:"A-05-222647"},target={...source,id:13,prenom:"Cible",number:null};
const input={sourceSwimmerId:"12",targetSwimmerId:"13",sourceFingerprint:fingerprint(source),targetFingerprint:fingerprint(target),sourceLicenseNumber:source.number,targetLicenseNumber:"",actorUid:"national",confirmMerge:true,timestamp:"2026-10-09 15:00:00.000000"};
const snapshots=Object.fromEntries(plans.TABLES.map(spec=>[spec.table,[]]));
snapshots.perfs=[{id:1,nageur:12,tps:"14200",course:"100SF",points:"123",newpoints:"456"}];
snapshots.perfs_relais=[{id:2,nageur1:12,nageur2:20,nageur3:21,nageur4:22,tps1:"12345",compet:1}];
snapshots.nageursengager=[{id:3,nageur:12,compet:10},{id:4,nageur:13,compet:10},{id:5,nageur:12,compet:11}];
snapshots.engagements=[{id:6,engagement:3,course:"50BI",tps:"1234"},{id:7,engagement:4,course:"50BI",tps:"1250"},{id:8,engagement:3,course:"100BI",tps:"4567"}];
const saved=JSON.stringify(snapshots),plan=plans.planMerge(input,source,target,snapshots,[]);
assert.equal(JSON.stringify(snapshots),saved);assert.equal(plan.targetAfter.number,"A-05-222647");assert.equal(plan.sourceAfter.actif,0);assert.equal(plan.targetAfter.prenom,"Cible");
assert.equal(plan.changes.find(item=>item.table==="perfs").updates[0].after.tps,"14200");
assert.equal(plan.changes.find(item=>item.table==="perfs_relais").updates[0].after.nageur1,13);
const entries=plan.changes.find(item=>item.table==="engagements");assert.deepEqual(entries.removals.map(row=>row.id),[6]);assert.equal(entries.updates[0].after.engagement,4);assert.equal(entries.updates[0].after.tps,"4567");
assert.deepEqual(plan.changes.find(item=>item.table==="nageursengager").removals.map(row=>row.id),[3]);
plans.validateSaved(plan,input);
const changed=structuredClone(plan);changed.targetAfter.number="FAKE";assert.throws(()=>plans.validateSaved(changed,input),TypeError);
const different=structuredClone(snapshots);different.perfs_relais[0].nageur2=13;assert.throws(()=>plans.planMerge(input,source,target,different,[]),/meme resultat relais/);
assert.throws(()=>plans.planMerge({...input,targetLicenseNumber:"FAKE"},source,target,snapshots,[]),/licence a change/);
const sql=plans.statement("perfs",["id"],plan.changes.find(item=>item.table==="perfs").updates);
assert.match(sql.sql,/SET `nageur`=CASE/);assert.doesNotMatch(sql.sql,/`tps`=CASE/);assert.ok(sql.values.includes("14200"));
assert.match(sql.sql,/WHERE \(`id`=\? AND/);assert.doesNotMatch(sql.sql,/BINARY `id`/);
assert.match(plans.statement("engagements",["id"],entries.removals,true).sql,/^DELETE/);
assert.equal(plans.statement("perfs",["id"],[]),null);
assert.throws(()=>plans.statement("arbitrary",["id"],[{id:1}],true),TypeError);
console.log("Native swimmer merge plan: chosen identity, exact raw times/points, entry deduplication, relay collision refusal, source/target fingerprints and saved-plan integrity passed.");

const selected=plans.planMerge({...input,finalClubId:"107"},source,target,snapshots,[]);assert.equal(selected.targetAfter.club,"107");plans.validateSaved(selected,{...input,finalClubId:"107"});assert.throws(()=>plans.validateSaved(selected,{...input,finalClubId:"108"}));
assert.throws(()=>plans.planMerge({...input,confirmClubMismatch:true}, {...source,club:"999"},target,snapshots,[]));

const otherSource={...source,club:"999"};const otherInput={...input,sourceFingerprint:fingerprint(otherSource),confirmClubMismatch:true};assert.throws(()=>plans.planMerge(otherInput,otherSource,target,snapshots,[]),/club final/);assert.equal(plans.planMerge({...otherInput,finalClubId:"999"},otherSource,target,snapshots,[]).targetAfter.club,"999");

// Duplicate courses on either identity: target wins, then identical rows use
// the smallest native id. Never compare sporting times to pick a winner.
const duplicates=structuredClone(snapshots);
duplicates.engagements.push({...duplicates.engagements[0],id:9,tps:"1100"},{...duplicates.engagements[1],id:10},{...duplicates.engagements[2],id:11});
const deduplicated=plans.planMerge(input,source,target,duplicates,[]);
assert.deepEqual(deduplicated.changes.find(row=>row.table==="engagements").removals.map(row=>row.id),[6,9,10,11]);
assert.equal(deduplicated.changes.find(row=>row.table==="engagements").updates[0].before.id,8);
plans.validateSaved(deduplicated,input);
const conflicts=structuredClone(duplicates);conflicts.engagements.find(row=>row.id===10).tps="1200";conflicts.engagements.find(row=>row.id===11).tps="4500";
let summary;try{plans.planMerge(input,source,target,conflicts,[]);assert.fail("Choice required");}catch(error){summary=error.mergeConflicts;assert.equal(summary.conflicts.length,2);}
const choices=summary.conflicts.map(row=>({key:row.key,id:row.choices.at(-1).id}));
const chosenInput={...input,entryConflictToken:summary.token,entryConflictChoices:choices};
const chosen=plans.planMerge(chosenInput,source,target,conflicts,[]),chosenEntries=chosen.changes.find(row=>row.table==="engagements");
assert.ok(chosenEntries.removals.some(row=>row.id===7));assert.equal(chosenEntries.updates[0].before.id,11);
plans.validateSaved(chosen,chosenInput);plans.validateSaved(chosen,input); // Retry also works after a lost choice response.
assert.throws(()=>plans.validateSaved(chosen,{...chosenInput,entryConflictChoices:choices.map(row=>({...row,id:"999"}))}),/choix d'engagements/);
assert.throws(()=>plans.planMerge({...chosenInput,entryConflictToken:"0".repeat(64)},source,target,conflicts,[]),/ont change/);
assert.throws(()=>plans.planMerge({...chosenInput,entryConflictChoices:[...choices,choices[0]]},source,target,conflicts,[]),/invalides/);
assert.throws(()=>plans.planMerge({...chosenInput,entryConflictChoices:choices.map(row=>({...row,id:"6"}))},source,target,conflicts,[]),/hors de la fiche prioritaire/);
const stale=structuredClone(conflicts);stale.engagements[0].tps="9999";assert.throws(()=>plans.planMerge(chosenInput,source,target,stale,[]),/ont change/);
assert.equal(JSON.stringify(snapshots),saved,"No snapshot mutation");
console.log("Duplicate entries: priority, union, identical rows, explicit conflicts, stale and foreign choices, journal validation and retry passed.");
