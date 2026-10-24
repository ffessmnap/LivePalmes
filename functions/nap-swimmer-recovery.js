"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
// Preview: two indexed reads, two licence matches and 2,001 history witnesses.
// Transfer: bounded historical snapshots, durable backup, only club changes.
// No old sporting directory, result-time inference or silent truncation.
const licenses = require("./nap-license-state");
const {person} = require("./nap-portal-swimmers");
const {visiblePerformanceSql} = require("./nap-performance-visibility");
const {createHash}=require("node:crypto");
const {COLUMNS,hash}=require("./nap-approved-swimmer-correction");
const {fingerprint}=require("./nap-portal-swimmer-change");
const {nativeEqual}=require("./nap-native-compare");
const {isDeepStrictEqual}=require("node:util");
const historical=require("./nap-swimmer-recovery-clubs");
const mergePlans=require("./nap-swimmer-merge-plan");
const {pending,sameRows}=require("./nap-swimmer-merge");
async function previewRecovery(connection, input, authorize) {
  if (typeof authorize !== "function" || typeof input?.clubId !== "string" || !/^\d{1,16}$/.test(input.clubId)) throw new TypeError("Club autorise requis.");
  if (typeof input.licenseNumber !== "string" || !/^[A-Z]-\d{2}-\d+$/.test(input.licenseNumber) || input.licenseNumber.length > 100) throw new TypeError("Numero de licence invalide.");
  const season = licenses.seasonInfo(input.season || licenses.currentSeason());
  await authorize({clubId:input.clubId});
  const [matches] = await connection.execute({sql:`SELECT n.id,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,cl.abre_club,cl.nom_club,${licenses.projection()} FROM nageurs n FORCE INDEX (livepalmes_license_number_id) LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${licenses.join("n","v",season.label)} WHERE n.number=? AND ${notMerged("n")} ORDER BY n.id LIMIT 2`,timeout:10000},[input.licenseNumber]);
  if (!Array.isArray(matches) || matches.length > 1) throw new TypeError("Plusieurs nageurs portent cette licence. Verification nationale requise.");
  if (!matches.length) return {source:"nap",found:false,licenseNumber:input.licenseNumber};
  const native = matches[0];
  if (!Number.isSafeInteger(Number(native.id)) || Number(native.id) < 1 || licenses.number(native.number).toUpperCase() !== input.licenseNumber) throw new TypeError("Fiche de licence NAP incoherente.");
  const [history] = await connection.execute({sql:`SELECT p.id,p.nageur,c.id AS competition_id,c.date,${visiblePerformanceSql()} AS published FROM (SELECT id,nageur,compet FROM perfs FORCE INDEX (nageur) WHERE nageur=? LIMIT 2001) p LEFT JOIN competitions c FORCE INDEX (PRIMARY) ON c.id=p.compet ORDER BY p.id`,timeout:10000},[Number(native.id)]);
  if (!Array.isArray(history) || history.length > 2000) throw new RangeError("Historique trop volumineux : verification nationale requise avant recuperation.");
  let last = 0, publishedResult = false;
  for (const row of history) {
    if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) <= last || Number(row.nageur) !== Number(native.id) || ![0,1].includes(Number(row.published))) throw new TypeError("Historique NAP incoherent.");
    last = Number(row.id);
    if (!Number(row.published)) continue;
    if (!row.competition_id || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(Date.parse(`${row.date}T00:00:00Z`)) || new Date(`${row.date}T00:00:00Z`).toISOString().slice(0,10)!==row.date) throw new TypeError("Date de resultat NAP a verifier avant recuperation.");
    if (row.date >= season.startDate && row.date <= season.endDate) publishedResult = true;
  }
  const swimmer = person(native), sameClub = swimmer.clubId === input.clubId;
  return {source:"nap",found:true,sameClub,eligible:!sameClub && !publishedResult,publishedResult,swimmer,season:{label:season.label,startDate:season.startDate,endDate:season.endDate},sqlBudget:{queriesMax:2,rowsMax:2003}};
}
function transferStatement(before,after,season) {
  if(COLUMNS.some(key=>!Object.hasOwn(before,key)) || COLUMNS.some(key=>key!=="club" && before[key]!==after[key]) || !/^\d{1,16}$/.test(after.club)) throw new TypeError("Transfert NAP invalide.");
  const bounded="SELECT id,compet FROM perfs FORCE INDEX (nageur) WHERE nageur=? LIMIT 2001";
  return {sql:`UPDATE nageurs n SET n.club=? WHERE ${notMerged("n")} AND n.id=? AND ${COLUMNS.map(key=>nativeEqual(`n.\`${key}\``)).join(" AND ")} AND EXISTS (SELECT 1 FROM clubs cl FORCE INDEX (PRIMARY) WHERE cl.num_club=?) AND (SELECT COUNT(*) FROM (${bounded}) counted)<=2000 AND NOT EXISTS (SELECT 1 FROM (${bounded}) p LEFT JOIN competitions c FORCE INDEX (PRIMARY) ON c.id=p.compet WHERE ${visiblePerformanceSql()} AND (c.date BETWEEN ? AND ? OR MONTH(c.date)=0 OR DAY(c.date)=0 OR c.date IS NULL)) LIMIT 1`,values:[after.club,before.id,...COLUMNS.map(key=>before[key]),after.club,before.id,before.id,season.startDate,season.endDate]};
}
async function recoverSwimmer(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId) || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"") || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.mutationId||"") || typeof input.licenseNumber!=="string" || !/^[A-Z]-\d{2}-\d+$/.test(input.licenseNumber) || input.licenseNumber.length>100) throw new TypeError("Recuperation confirmee et fiche requises.");
  await authorize({clubId:input.clubId});
  const season=licenses.seasonInfo(licenses.currentSeason());
  const operation=createHash("sha256").update(JSON.stringify(["swimmer-recovery",input.actorUid,input.clubId,input.mutationId])).digest("hex");
  const connection=await pool.getConnection();let locked=false,tablesLocked=false,safe=true,queries=0;
  const lock=`lp-swimmer-${createHash("sha256").update(input.licenseNumber).digest("hex").slice(0,40)}`;
  const query=async(sql,values=[]) => {if(++queries>50)throw new RangeError("Budget de recuperation depasse.");return (await connection.execute({sql,timeout:10000},values))[0];};
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Nageur en cours de modification. Reessayez.");
    locked=true;
    let plan=await audit.read(operation);const saved=Boolean(plan);
    if(plan && (plan.kind!=="native-swimmer-recovery" || plan.operation!==operation || plan.actorUid!==input.actorUid || plan.clubId!==input.clubId || plan.mutationId!==input.mutationId || plan.licenseNumber!==input.licenseNumber || plan.expectedFingerprint!==input.expectedFingerprint || hash(plan.before)!==plan.beforeHash || hash(plan.after)!==plan.afterHash || plan.after.club!==input.clubId || fingerprint(plan.before)!==input.expectedFingerprint || COLUMNS.some(key=>key!=="club" && plan.before[key]!==plan.after[key]))) throw new TypeError("Sauvegarde de recuperation incompatible.");
    if(plan && !isDeepStrictEqual(plan.season,licenses.seasonInfo(plan.season?.label))) throw new TypeError("Saison sauvegardee incompatible.");
    // Old completed receipts remain retryable. Never reinterpret an unfinished
    // transfer that did not capture its historical clubs before mutation.
    if(plan&&!plan.performanceClubs){
      const [current]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,[plan.before.id]);
      if(!current||hash(current)!==plan.afterHash)throw new TypeError("Ancienne recuperation sans historique sauvegarde : verification nationale requise.");
      await audit.complete(operation,{swimmerId:String(current.id),fromClubId:String(plan.before.club),clubId:input.clubId,seasonLabel:plan.season.label,verified:true,changedColumns:["club"]});
      return {ok:true,source:"nap",operation,alreadyApplied:true,swimmer:person(current)};
    }
    let preview;
    if(!plan) {
      preview=await previewRecovery({execute:async({sql},values)=>[await query(sql,values)]},{clubId:input.clubId,licenseNumber:input.licenseNumber,season:season.label},authorize);
      if(!preview.found || preview.sameClub || !preview.eligible) throw new TypeError("Recuperation impossible : fiche deja rattachee ou resultat publie cette saison. Verification nationale requise.");
    }
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('nageurs','perfs','perfs_relais') LIMIT 1")).length)throw new TypeError("Declencheur NAP a verifier avant recuperation.");
    // MyISAM: grouped CAS alone cannot protect a concurrent import. Hold the
    // same native table locks from snapshot through final identity change.
    safe=false;
    await connection.query({sql:"LOCK TABLES nageurs WRITE,perfs WRITE,perfs_relais WRITE,clubs READ,competitions AS c READ,livepalmes_performance_visibility AS lpv READ,livepalmes_swimmer_merges READ",timeout:10000});tablesLocked=true;safe=true;
    if(!plan){
      const [before]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,[Number(preview.swimmer.id)]);
      if(!before || fingerprint(before)!==input.expectedFingerprint || before.club===input.clubId || licenses.number(before.number).toUpperCase()!==input.licenseNumber) throw new TypeError("La fiche a change. Recherchez de nouveau le nageur.");
      const after={...before,club:input.clubId};
      const snapshots=await historical.readRows(query,before.id);
      plan={kind:"native-swimmer-recovery",operation,actorUid:input.actorUid,clubId:input.clubId,mutationId:input.mutationId,licenseNumber:input.licenseNumber,expectedFingerprint:input.expectedFingerprint,season,before,after,beforeHash:hash(before),afterHash:hash(after),performanceClubs:await historical.prepare(query,before,snapshots)};
      historical.validate(plan);
    }
    historical.validate(plan);
    const [current]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,[plan.before.id]);
    const alreadyApplied=current && hash(current)===plan.afterHash;
    if(!alreadyApplied) {
      if(!current || hash(current)!==plan.beforeHash) throw new TypeError("La fiche a change. Recuperation a verifier.");
      if(plan.season.label!==season.label) throw new TypeError("La saison a change. Recherchez de nouveau le nageur.");
      const history=await query(`SELECT perfs.id,c.date,${visiblePerformanceSql("perfs")} AS published FROM perfs FORCE INDEX (nageur) LEFT JOIN competitions c FORCE INDEX (PRIMARY) ON c.id=perfs.compet WHERE perfs.nageur=? ORDER BY perfs.id LIMIT 2001`,[plan.before.id]);
      if(history.length>2000||history.some(row=>Number(row.published)&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.date||"")||!Number.isFinite(Date.parse(`${row.date}T00:00:00Z`))||new Date(`${row.date}T00:00:00Z`).toISOString().slice(0,10)!==row.date||(row.date>=season.startDate&&row.date<=season.endDate))))throw new TypeError("Resultats modifies : verification nationale requise avant recuperation.");
    }
    const rows=await historical.readRows(query,plan.before.id);
    const work=plan.performanceClubs.changes.map(change=>({...change,...pending(rows[change.table],plan.performanceClubs.snapshots[change.table],change)}));
    if(alreadyApplied&&work.some(change=>change.updates.length))throw new TypeError("Clubs historiques incomplets apres recuperation. Verification nationale requise.");
    const destination=await query("SELECT num_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=? LIMIT 1",[Number(input.clubId)]);
    const oldClub=String(plan.before.club??"");
    if(!destination.length)throw new TypeError("Club de destination introuvable.");
    if(plan.performanceClubs.changes.some(change=>change.updates.length)&&!(await query("SELECT num_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=? LIMIT 1",[Number(oldClub)])).length)throw new TypeError("Ancien club disparu. Recuperation a verifier.");
    if(!saved)await audit.prepare(operation,plan);
    const apply=async statement=>{
      if(!statement)return;
      const proof=await query(`EXPLAIN ${statement.sql}`,statement.values);
      if(!proof.length||proof.some(row=>row.table&&!String(row.table).startsWith("<")&&(!row.key||row.type==="ALL")))throw new TypeError("Plan de recuperation NAP non indexe.");
      if((await query(statement.sql,statement.values)).affectedRows!==statement.count)throw new Error("Recuperation interrompue ; sauvegarde conservee.");
    };
    for(const change of work)await apply(mergePlans.statement(change.table,change.key,change.updates));
    const checked=await historical.readRows(query,plan.before.id);
    if(work.some(change=>!sameRows(checked[change.table],change.expected)))throw new Error("Verification des clubs historiques incomplete.");
    if(!alreadyApplied)await apply(mergePlans.statement("nageurs",["id"],[{before:plan.before,after:plan.after}]));
    const [verified]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`,[plan.before.id]);
    if(!verified || hash(verified)!==plan.afterHash) throw new Error("Verification de recuperation incomplete.");
    const historicalClubUpdateCount=plan.performanceClubs.changes.reduce((sum,change)=>sum+change.updates.length,0);
    safe=false;await connection.query({sql:"UNLOCK TABLES",timeout:10000});tablesLocked=false;safe=true;
    await audit.complete(operation,{swimmerId:String(verified.id),fromClubId:String(plan.before.club),clubId:input.clubId,seasonLabel:plan.season.label,verified:true,changedColumns:["club"],historicalClubUpdateCount,historicalClubPlanHash:plan.performanceClubs.hash});
    return {ok:true,source:"nap",operation,alreadyApplied,historicalClubUpdateCount,swimmer:person(verified)};
  } finally {
    try{if(tablesLocked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch{safe=false;}
    finally{if(safe) connection.release();else connection.destroy();}
  }
}
module.exports = {previewRecovery,transferStatement,recoverSwimmer};
