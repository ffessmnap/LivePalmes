"use strict";
// Existing club edit: six SQL calls maximum; no new club and no historical deletion.
const {createHash}=require("node:crypto");
const {nativeEqual}=require("./nap-native-compare");
const directory=require("./nap-club-directory");
const COLUMNS=["num_club","federal_club","nom_club","abre_club","hc_club","comite_club","actif_club","postalcode","longitude","latitude","ville","web","enf","cnnp","email","tel","logo","integrationdate"];
const hash=row=>createHash("sha256").update(JSON.stringify(COLUMNS.map(key=>row[key]))).digest("hex");
const MUTABLE=["federal_club","nom_club","abre_club","comite_club","actif_club","postalcode","ville"];
function afterRow(before,input) {
 const cleaned=require("./engagement-clubs").cleanClubPayload(input.club,directory.club(before));
 return {...before,federal_club:cleaned.federalNumber,nom_club:cleaned.clubName,abre_club:cleaned.clubCode,comite_club:cleaned.regionId===directory.club(before).regionId?before.comite_club:directory.region(cleaned.regionId),actif_club:cleaned.active?1:0,postalcode:cleaned.postalCode,ville:cleaned.city};
}
function statement(before,after) {
 return {sql:`UPDATE clubs c SET ${MUTABLE.map(key=>`c.\`${key}\`=?`).join(",")} WHERE c.num_club=? AND ${COLUMNS.map(key=>nativeEqual(`c.\`${key}\``)).join(" AND ")} AND NOT EXISTS (SELECT 1 FROM (SELECT num_club FROM clubs FORCE INDEX (livepalmes_federal_id) WHERE federal_club=? LIMIT 2) duplicate WHERE duplicate.num_club<>?) LIMIT 1`,values:[...MUTABLE.map(key=>after[key]),before.num_club,...COLUMNS.map(key=>before[key]),after.federal_club,before.num_club]};
}
async function edit(pool,input,audit,authorize) {
 if(!/^[1-9]\d{0,9}$/.test(input?.clubId||"") || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"") || !input.actorUid || typeof authorize!=="function") throw new TypeError("Club et fiche affichee requis.");
 await authorize();
 const operation=createHash("sha256").update(JSON.stringify([input.clubId,input.actorUid,input.expectedFingerprint,input.club])).digest("hex");
 const query=async(sql,values=[]) => (await pool.execute({sql,timeout:10000},values))[0];
 const read=async()=>{const rows=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM clubs WHERE num_club=? LIMIT 1`,[Number(input.clubId)]);if(rows.length!==1)throw new TypeError("Club NAP introuvable.");return rows[0];};
 const current=await read();const existing=await audit.read(operation);let saved=existing;
 if(!saved) {
  if(directory.fingerprint(current)!==input.expectedFingerprint) throw new TypeError("La fiche club a change. Rechargez-la.");
  const after=afterRow(current,input);
  if(current.federal_club!==after.federal_club && input.confirmFederalNumberChange!==true) throw new TypeError("Confirmez la correction du numero federal.");
  saved={operation,actorUid:input.actorUid,clubId:input.clubId,before:current,after,beforeHash:hash(current),afterHash:hash(after)};
 }
 if(saved.operation!==operation || saved.actorUid!==input.actorUid || saved.clubId!==input.clubId || directory.fingerprint(saved.before)!==input.expectedFingerprint || saved.beforeHash!==hash(saved.before) || saved.afterHash!==hash(saved.after) || saved.afterHash!==hash(afterRow(saved.before,input))) throw new TypeError("Sauvegarde club incompatible.");
 if(hash(current)!==saved.afterHash) {
  if(hash(current)!==saved.beforeHash) throw new TypeError("Le club a change. Rechargez sa fiche.");
  if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='clubs' LIMIT 1")).length) throw new TypeError("Declencheur club a verifier.");
  const write=statement(saved.before,saved.after),plans=await query(`EXPLAIN ${write.sql}`,write.values);
  if(!plans.some(row=>row.table==="c" && row.key==="PRIMARY") || !plans.some(row=>row.key==="livepalmes_federal_id")) throw new TypeError("Index des numeros federaux absent.");
  if(!existing) await audit.prepare(operation,saved);
  const changed=await query(write.sql,write.values);if(changed.affectedRows!==1)throw new TypeError("Club modifie ou numero federal deja utilise. Rechargez la fiche.");
 }
 const verified=await read();if(hash(verified)!==saved.afterHash) throw new Error("Club NAP a verifier ; sauvegarde conservee.");
 await audit.complete(operation,{clubId:input.clubId,verified:true});return {ok:true,source:"nap",created:false,club:directory.club(verified)};
}
module.exports={COLUMNS,MUTABLE,hash,afterRow,statement,edit};
