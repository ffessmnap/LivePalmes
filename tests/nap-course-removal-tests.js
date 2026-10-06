"use strict";
const assert=require("node:assert/strict");
const native=require("../functions/nap-portal-competitions");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {removeNativeCourse,buildRemovalStatement}=require("../functions/nap-course-removal");
const {SPECS}=require("../functions/nap-portal-competition-change");
const original=native.readNativeCompetition;
const row={id:90,compet:5140,pos:1,id_course:79,opencourse:0,cost:"0",limitnageur:0};
const pack={nativeSnapshot:{competition:{...Object.fromEntries(SPECS.competitions.columns.map(key=>[key,null])),id:5140,date:"2026-10-11",comite:7},parameters:{...Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,null])),id:50,compet:5140,actif:1,niveau:1}},courses:[row]};
const input=national=>({competitionId:5140,actorUid:"admin",national,expectedFingerprint:fingerprint(pack),patch:{removeNativeCourseId:90,confirmCourseRemoval:true}});
function fixture(options={}) {
  const state={row:{...row},saved:null,prepared:0,completed:0,released:0,deletes:0,sql:[],...options};
  state.pool={getConnection:async()=>({release:()=>state.released++,execute:async({sql},values=[])=>{
    state.sql.push(sql);
    assert.equal((sql.match(/\?/g)||[]).length,values.length);
    if(sql.startsWith("SELECT id FROM nageursengager")) return [state.entries ? [{id:1}] : []];
    if(sql.startsWith("SELECT id FROM engagements_relais")) return [state.relays ? [{id:2}] : []];
    if(sql.includes("information_schema.TRIGGERS")) return [state.trigger ? [{TRIGGER_NAME:"blocked"}] : []];
    if(sql.startsWith("SELECT `id`")) return [state.row ? [state.row] : []];
    if(sql.startsWith("DELETE FROM compet_courses")) {assert.equal(state.prepared,1,"backup before delete");state.deletes++;if(state.conflict) return [{affectedRows:0}];state.row=null;return [{affectedRows:1}];}
    if(sql.startsWith("SELECT id FROM compet_courses")) return [state.row ? [{id:90}] : []];
    throw new Error("Unexpected query");
  }})};
  state.audit={read:async()=>state.saved,prepare:async(_operation,saved)=>{state.prepared++;state.saved=structuredClone(saved);},complete:async()=>{if(state.failComplete) throw new Error("Audit interrupted");state.completed++;}};
  return state;
}
(async()=>{
  native.readNativeCompetition=async(_connection,_id,authorize)=>{await authorize(pack);return pack;};
  try {
    let state=fixture({entries:true});
    await assert.rejects(removeNativeCourse(state.pool,input(false),state.audit,()=>{}),/seul un administrateur national/);assert.equal(state.deletes,0);assert.equal(state.prepared,0);assert.equal(state.released,1);
    state=fixture({relays:true});await assert.rejects(removeNativeCourse(state.pool,input(false),state.audit,()=>{}),/seul un administrateur national/);
    state=fixture({entries:true});await assert.rejects(removeNativeCourse(state.pool,{...input(true),patch:{removeNativeCourseId:90,confirmCourseRemoval:false}},state.audit,()=>{}),/Confirmation/);assert.equal(state.prepared,0);
    state=fixture({entries:true});await removeNativeCourse(state.pool,input(true),state.audit,()=>{});assert.equal(state.deletes,1);assert.equal(state.completed,1);assert.deepEqual(state.saved.before,row);
    assert.equal(state.sql.filter(sql=>/^(DELETE|UPDATE|INSERT)/.test(sql)).length,1);assert.ok(!state.sql.some(sql=>/^(DELETE|UPDATE|INSERT).*engagement/i.test(sql)));
    state=fixture();await removeNativeCourse(state.pool,input(false),state.audit,()=>{});const sql=state.sql.find(sql=>sql.startsWith("DELETE"));assert.ok(sql.includes("NOT EXISTS (SELECT 1 FROM nageursengager"));assert.ok(sql.includes("NOT EXISTS (SELECT 1 FROM engagements_relais"));assert.ok(sql.includes("scope_c") && sql.includes("scope_p") && sql.endsWith("LIMIT 1"));
    state=fixture({conflict:true});await assert.rejects(removeNativeCourse(state.pool,input(true),state.audit,()=>{}),/ont change/);assert.equal(state.completed,0);
    state=fixture({trigger:true});await assert.rejects(removeNativeCourse(state.pool,input(true),state.audit,()=>{}),/Declencheur/);assert.equal(state.prepared,0);
    state=fixture();await assert.rejects(removeNativeCourse(state.pool,input(true),state.audit,()=>{throw new Error("Scope denied");}),/Scope denied/);assert.equal(state.sql.length,0);assert.equal(state.released,1);
    state=fixture();state.row.compet=999;await assert.rejects(removeNativeCourse(state.pool,input(true),state.audit,()=>{}),/absente/);assert.equal(state.prepared,0);
    state=fixture({failComplete:true});await assert.rejects(removeNativeCourse(state.pool,input(true),state.audit,()=>{}),/Audit interrupted/);state.failComplete=false;await removeNativeCourse(state.pool,input(true),state.audit,()=>{});assert.equal(state.deletes,1);assert.equal(state.completed,1);
    const statement=buildRemovalStatement(row,{competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters},true);assert.equal((statement.sql.match(/\?/g)||[]).length,statement.values.length);
    console.log("Retrait de course NAP : sauvegarde, droits nationaux, confirmation, concurrence, reprise et engagements preserves verifies hors reseau.");
  } finally {native.readNativeCompetition=original;}
})().catch(error=>{console.error(error);process.exitCode=1;});
