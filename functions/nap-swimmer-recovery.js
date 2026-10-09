"use strict";
// Preview: two indexed reads, two licence matches and 2,001 history witnesses.
// Transfer: ten SQL calls maximum; durable backup, only club changes, safe retry.
// No old sporting directory, result-time inference or silent truncation.
const licenses = require("./nap-license-state");
const {person} = require("./nap-portal-swimmers");
const {visiblePerformanceSql} = require("./nap-performance-visibility");
const {createHash}=require("node:crypto");
const {COLUMNS,hash}=require("./nap-approved-swimmer-correction");
const {fingerprint}=require("./nap-portal-swimmer-change");
const {nativeEqual}=require("./nap-native-compare");
const {isDeepStrictEqual}=require("node:util");
async function previewRecovery(connection, input, authorize) {
  if (typeof authorize !== "function" || typeof input?.clubId !== "string" || !/^\d{1,16}$/.test(input.clubId)) throw new TypeError("Club autorise requis.");
  if (typeof input.licenseNumber !== "string" || !/^[A-Z]-\d{2}-\d+$/.test(input.licenseNumber) || input.licenseNumber.length > 100) throw new TypeError("Numero de licence invalide.");
  const season = licenses.seasonInfo(input.season || licenses.currentSeason());
  await authorize({clubId:input.clubId});
  const [matches] = await connection.execute({sql:`SELECT n.id,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,cl.abre_club,cl.nom_club,${licenses.projection()} FROM nageurs n FORCE INDEX (livepalmes_license_number_id) LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${licenses.join("n","v",season.label)} WHERE n.number=? ORDER BY n.id LIMIT 2`,timeout:10000},[input.licenseNumber]);
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
  return {sql:`UPDATE nageurs n SET n.club=? WHERE n.id=? AND ${COLUMNS.map(key=>nativeEqual(`n.\`${key}\``)).join(" AND ")} AND EXISTS (SELECT 1 FROM clubs cl FORCE INDEX (PRIMARY) WHERE cl.num_club=?) AND (SELECT COUNT(*) FROM (${bounded}) counted)<=2000 AND NOT EXISTS (SELECT 1 FROM (${bounded}) p LEFT JOIN competitions c FORCE INDEX (PRIMARY) ON c.id=p.compet WHERE ${visiblePerformanceSql()} AND (c.date BETWEEN ? AND ? OR MONTH(c.date)=0 OR DAY(c.date)=0 OR c.date IS NULL)) LIMIT 1`,values:[after.club,before.id,...COLUMNS.map(key=>before[key]),after.club,before.id,before.id,season.startDate,season.endDate]};
}
async function recoverSwimmer(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId) || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"") || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.mutationId||"") || typeof input.licenseNumber!=="string" || !/^[A-Z]-\d{2}-\d+$/.test(input.licenseNumber) || input.licenseNumber.length>100) throw new TypeError("Recuperation confirmee et fiche requises.");
  await authorize({clubId:input.clubId});
  const season=licenses.seasonInfo(licenses.currentSeason());
  const operation=createHash("sha256").update(JSON.stringify(["swimmer-recovery",input.actorUid,input.clubId,input.mutationId])).digest("hex");
  const connection=await pool.getConnection();let locked=false;
  const lock=`lp-swimmer-${createHash("sha256").update(input.licenseNumber).digest("hex").slice(0,40)}`;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Nageur en cours de modification. Reessayez.");
    locked=true;
    let plan=await audit.read(operation);
    if(plan && (plan.kind!=="native-swimmer-recovery" || plan.operation!==operation || plan.actorUid!==input.actorUid || plan.clubId!==input.clubId || plan.mutationId!==input.mutationId || plan.licenseNumber!==input.licenseNumber || plan.expectedFingerprint!==input.expectedFingerprint || hash(plan.before)!==plan.beforeHash || hash(plan.after)!==plan.afterHash || plan.after.club!==input.clubId || fingerprint(plan.before)!==input.expectedFingerprint || COLUMNS.some(key=>key!=="club" && plan.before[key]!==plan.after[key]))) throw new TypeError("Sauvegarde de recuperation incompatible.");
    if(plan && !isDeepStrictEqual(plan.season,licenses.seasonInfo(plan.season?.label))) throw new TypeError("Saison sauvegardee incompatible.");
    if(!plan) {
      const preview=await previewRecovery(connection,{clubId:input.clubId,licenseNumber:input.licenseNumber,season:season.label},authorize);
      if(!preview.found || preview.sameClub || !preview.eligible) throw new TypeError("Recuperation impossible : fiche deja rattachee ou resultat publie cette saison. Verification nationale requise.");
      const [before]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`,[Number(preview.swimmer.id)]);
      if(!before || fingerprint(before)!==input.expectedFingerprint || before.club===input.clubId || licenses.number(before.number).toUpperCase()!==input.licenseNumber) throw new TypeError("La fiche a change. Recherchez de nouveau le nageur.");
      const after={...before,club:input.clubId};
      plan={kind:"native-swimmer-recovery",operation,actorUid:input.actorUid,clubId:input.clubId,mutationId:input.mutationId,licenseNumber:input.licenseNumber,expectedFingerprint:input.expectedFingerprint,season,before,after,beforeHash:hash(before),afterHash:hash(after)};
      await audit.prepare(operation,plan);
    }
    const [current]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`,[plan.before.id]);
    const alreadyApplied=current && hash(current)===plan.afterHash;
    if(!alreadyApplied) {
      if(!current || hash(current)!==plan.beforeHash) throw new TypeError("La fiche a change. Recuperation a verifier.");
      if(plan.season.label!==season.label) throw new TypeError("La saison a change. Recherchez de nouveau le nageur.");
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='nageurs' LIMIT 1")).length) throw new TypeError("Declencheur NAP a verifier avant recuperation.");
      const statement=transferStatement(plan.before,plan.after,plan.season);
      const explain=await query(`EXPLAIN ${statement.sql}`,statement.values);
      if(!explain.some(row=>row.table==="n" && row.key==="PRIMARY") || explain.filter(row=>row.table==="perfs" && row.key==="nageur").length!==2) throw new TypeError("Plan de recuperation NAP non indexe. Aucune fiche modifiee.");
      const result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1) throw new TypeError("Fiche, club ou resultats modifies. Recuperation non appliquee.");
    }
    const [verified]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`,[plan.before.id]);
    if(!verified || hash(verified)!==plan.afterHash) throw new Error("Verification de recuperation incomplete.");
    await audit.complete(operation,{swimmerId:String(verified.id),fromClubId:String(plan.before.club),clubId:input.clubId,seasonLabel:plan.season.label,verified:true,changedColumns:["club"]});
    return {ok:true,source:"nap",operation,alreadyApplied,swimmer:person(verified)};
  } finally {
    let safe=true;
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch{safe=false;}
    finally{if(safe) connection.release();else connection.destroy();}
  }
}
module.exports = {previewRecovery,transferStatement,recoverSwimmer};
