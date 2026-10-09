"use strict";
// Pure preparation: no connection, schema change or real deletion.
// The executor must authorize nationally, save the plan and lock the four tables
// before rereading the exact native witnesses. Maximum 2,000 linked entries.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {reference}=require("./nap-club-person-status");
const {SOURCES,normalizeOptions,person,OPTION_COLUMNS}=require("./nap-club-people");
const {nativeEqual}=require("./nap-native-compare");
const COLUMNS=["engagement_id","person_id","competition_id","entry_club","nom","prenom","date","club","deleted_at","deleted_by"];
const TABLE="livepalmes_deleted_people_history";
function planDeletion(input,native,options,entries) {
  const ref=reference(input?.personId);
  if(ref.kind!=="officials") throw new TypeError("Les declarations historiques par competition sont conservees.");
  if(input.confirmPermanent!==true || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")) throw new TypeError("Confirmation nationale et fiche affichee requises.");
  if(!native || Number(native.id)!==ref.id) throw new TypeError("Personne NAP introuvable.");
  const previous=normalizeOptions(options);
  if(person(native,"officials",previous).napFingerprint!==input.expectedFingerprint) throw new TypeError("La fiche a change. Rechargez avant de supprimer.");
  if(!Array.isArray(entries) || entries.length>2000) throw new RangeError("Historique trop volumineux pour cette suppression bornee.");
  let previousId=0;
  for(const row of entries) {
    if(!Number.isSafeInteger(Number(row.id)) || Number(row.id)<=previousId || Number(row.id)>2147483647 || Number(row.officiel)!==ref.id || !Number.isSafeInteger(Number(row.compet)) || Number(row.compet)<=0 || !/^\d{1,16}$/.test(String(row.club))) throw new TypeError("Historique incoherent.");
    previousId=Number(row.id);
  }
  if(typeof input.timestamp!=="string" || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{6}$/.test(input.timestamp)) throw new TypeError("Horodatage invalide.");
  const operation=createHash("sha256").update(JSON.stringify(["person-delete",input.actorUid,input.personId,input.expectedFingerprint])).digest("hex");
  const history=entries.map(row=>({engagement_id:Number(row.id),person_id:ref.id,competition_id:Number(row.compet),entry_club:String(row.club),nom:String(native.nom??""),prenom:String(native.prenom??""),date:String(native.date??""),club:String(native.club),deleted_at:input.timestamp,deleted_by:input.actorUid}));
  const plan={kind:"native-person-delete",operation,actorUid:input.actorUid,personId:input.personId,expectedFingerprint:input.expectedFingerprint,native:{...native},options:previous,entries:entries.map(row=>({...row})),history};
  if(Buffer.byteLength(JSON.stringify(plan))>500000) throw new RangeError("Sauvegarde historique trop volumineuse pour cette suppression bornee.");
  return plan;
}
function statements(plan) {
  if(plan.kind!=="native-person-delete" || !Array.isArray(plan.history) || plan.history.length>2000) throw new TypeError("Plan de suppression requis.");
  const writes=[];
  if(plan.history.length) writes.push({kind:"archive",sql:`INSERT INTO ${TABLE} (${COLUMNS.map(c=>`\`${c}\``).join(",")}) VALUES ${plan.history.map(()=>`(${COLUMNS.map(()=>"?").join(",")})`).join(",")}`,values:plan.history.flatMap(row=>COLUMNS.map(c=>row[c]))});
  writes.push({kind:"delete-person",sql:`DELETE FROM officiels WHERE id=? AND ${SOURCES.officials.columns.slice(1).map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,values:[plan.native.id,...SOURCES.officials.columns.slice(1).map(c=>plan.native[c])]});
  if(plan.options) writes.push({kind:"delete-options",sql:`DELETE FROM livepalmes_club_people_options WHERE source=? AND person_id=? AND ${OPTION_COLUMNS.map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,values:["officiels",plan.native.id,...OPTION_COLUMNS.map(c=>plan.options[c])]});
  return writes;
}
function validateSaved(plan,input) {
  const expected=planDeletion({...input,timestamp:plan.history[0]?.deleted_at || input.timestamp},plan.native,plan.options,plan.entries);
  if(!isDeepStrictEqual(expected,plan)) throw new TypeError("Sauvegarde de suppression incompatible.");
  return plan;
}
module.exports={TABLE,COLUMNS,planDeletion,statements,validateSaved};
