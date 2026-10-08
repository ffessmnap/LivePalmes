"use strict";
const assert = require("node:assert/strict");
const { removeNativeTeamLeader, emptyDossier, beforeLeader } = require("../functions/nap-team-leader-remove");
const { fingerprint } = require("../functions/nap-portal-workspaces");
const { SPECS } = require("../functions/nap-portal-competition-change");
const leader = { id: 99, compet: 5162, nom: "Chef", prenom: "Test", date: "1980-01-02", club: "106", pourclub: "" };
const base = { competitionId: "5162", clubId: "106", leaders: [leader], swimmers: [], inscriptions: [], individual: [], officials: [], relays: [], members: [], options: null };
const input = { competitionId: 5162, clubId: "106", leaderId: 99, actorUid: "trusted", expectedFingerprint: fingerprint(base) };
const authority = { competition: Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5162:null])), parameters: Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"?901:key==="compet"?5162:null])) };
function fixture(options = {}) {
  let target = null, deleted = false, count = 0;
  const events = [];
  const connection = { release:()=>events.push("release"), destroy:()=>events.push("destroy"), execute: async ({sql},values=[]) => {
    assert.equal((sql.match(/\?/g)||[]).length, values.length);
    if (sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if (sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:1}]];
    if (sql.startsWith("SELECT TRIGGER")) return [options.trigger ? [{}] : []];
    if (sql.startsWith("EXPLAIN")) return [[{table:"chefsdequipe",type:"range",key:options.unindexed?null:"PRIMARY",rows:1}]];
    if (sql.startsWith("DELETE")) {
      assert.equal(target.phase,"writing"); events.push("delete"); count++;
      assert.match(sql,/NOT EXISTS .*nageursengager/); assert.match(sql,/NOT EXISTS .*officielsengager/); assert.match(sql,/NOT EXISTS .*engagements_relais/);
      if (options.race) return [{affectedRows:0}];
      deleted = true;
      if (options.interrupted) throw Error("lost response");
      return [{affectedRows:1}];
    }
    if (sql.startsWith("SELECT id FROM chefsdequipe")) return [deleted?[]:[leader]];
    throw Error("Unexpected query");
  }};
  const audit = { read:async()=>target, prepare:async(op,value)=>{events.push("backup"); target=structuredClone(value);}, checkpoint:async(op,value)=>{target=structuredClone(value);}, complete:async()=>events.push("complete") };
  const readers = { competition:async(c,id,authorize)=>{await authorize({});return {event:{entryStatus:options.closed?"closed":"open",entryDeadlineAt:"2099-11-07T20:00:00.000Z"},nativeSnapshot:authority};}, entry:async(c,value,authorize)=>{await authorize({clubId:"106"});return {...base,leaders:deleted?[]:[leader],officials:options.participant?[{}]:[]};} };
  return { run:()=>removeNativeTeamLeader({getConnection:async()=>connection},input,audit,()=>{if(options.denied)throw Error("denied");},readers),events,count:()=>count };
}
(async()=>{
  assert.throws(()=>beforeLeader({...base,leaders:[{...leader,pourclub:"999"}]},input),/autre club/);
  assert.throws(()=>beforeLeader({...base,leaders:[{...leader,club:"999",pourclub:"106"}]},input),/autre club/);
  for (const key of ["inscriptions","individual","officials","relays","members"]) assert.throws(()=>emptyDossier({...base,[key]:[{}]}),/participants/);
  const normal=fixture(); await normal.run(); assert.equal(normal.count(),1); assert.ok(normal.events.indexOf("backup")<normal.events.indexOf("delete")); assert.ok(normal.events.includes("complete"));
  await normal.run(); assert.equal(normal.count(),1,"Retry after verified deletion must not delete again");
  for(const option of ["participant","closed","denied","trigger","unindexed"]) {const f=fixture({[option]:true});await assert.rejects(f.run());assert.equal(f.count(),0);assert.ok(!f.events.includes("backup"));}
  const interrupted=fixture({interrupted:true});await assert.rejects(interrupted.run(),/lost response/);await interrupted.run();assert.equal(interrupted.count(),1,"Uncertain response must be reconciled by reading, never another DELETE");
  const race=fixture({race:true});await assert.rejects(race.run(),/non confirme/);await assert.rejects(race.run(),/verifier/);assert.equal(race.count(),1);
  console.log("Native empty leader withdrawal: participants, scope, closure, backup-before-delete, atomic guards and uncertain response recovery verified without network.");
})().catch(error=>{console.error(error);process.exitCode=1;});
