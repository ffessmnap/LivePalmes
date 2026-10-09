"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
// Preparation only: generated identifiers are returned by MySQL and must be
// checkpointed before member insertion. No native INSERT is executed here.
const {positiveId}=require("./nap-direct-calendar");
const {entryAuthority,deadline}=require("./nap-official-entry-statements");
const FIELDS=["id","compet","categorie","club","course","tps"];
function openAuthority(plan,authority) {
  if(Number(authority?.competitions?.id)!==Number(plan?.competitionId) || Number(authority?.compet_parametres?.compet)!==Number(plan?.competitionId) || Number(authority?.compet_parametres?.actif)!==1) throw new TypeError("Competition native ouverte requise.");
  return entryAuthority(authority,plan.competitionId,plan.clubId);
}
function relayWitness(row,alias,values) {
  if(!row || FIELDS.some(key=>!Object.hasOwn(row,key))) throw new TypeError("Temoin natif du relais requis.");
  positiveId(row.id);positiveId(row.compet);positiveId(row.course);
  values.push(...FIELDS.map(key=>row[key]));
  return FIELDS.map(key=>key==="id"?`${alias}id=?`:`BINARY ${alias}\`${key}\` <=> BINARY ?`).join(" AND ");
}
function insertRelay(plan,course,authority,end) {
  if(plan?.action!=="create" || Object.hasOwn(plan.after||{},"id") || Number(plan.after?.compet)!==Number(plan.competitionId) || String(plan.after?.club)!==String(plan.clubId) || !/^\d{6}$/.test(plan.after?.tps) || Number(plan.after.tps.slice(-4,-2))>=60 || !Number.isSafeInteger(plan.after.categorie) || plan.after.categorie<0) throw new TypeError("Creation native resolue requise.");
  if(positiveId(course?.id_course)!==positiveId(plan.after.course) || Number(course.relais)!==1 || typeof course.course!=="string" || !["F","M","X","0",0].includes(course.sexe)) throw new TypeError("Course relais native a verifier.");
  const guard=openAuthority(plan,authority);
  const values=[plan.competitionId,plan.after.categorie,String(plan.clubId),plan.after.tps,course.id_course,course.course,course.sexe,course.relais,plan.competitionId,course.id_course,...guard.values,deadline(end)];
  return {kind:"insert-relay",expectedRows:1,sql:`INSERT INTO engagements_relais (compet,categorie,club,tps,course) SELECT ?,?,?,?,scope_d.id FROM course_dispo scope_d FORCE INDEX (PRIMARY) WHERE scope_d.id=? AND BINARY scope_d.course <=> BINARY ? AND BINARY scope_d.sexe <=> BINARY ? AND scope_d.relais=? AND EXISTS (SELECT 1 FROM compet_courses scope_cc WHERE scope_cc.compet=? AND scope_cc.id_course=?) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 1`,values};
}
function insertMembers(plan,relayId,additions,people,authority,end) {
  relayId=positiveId(relayId);
  if(!["create","compose"].includes(plan?.action) || !plan?.after || !Array.isArray(additions) || !additions.length || additions.length>4 || !Array.isArray(plan.membersAfter) || ![0,4].includes(plan.membersAfter.length) || !Array.isArray(people) || people.length>4 || new Set(additions.map(row=>row.pos)).size!==additions.length) throw new TypeError("Ajout groupe de relayeurs requis.");
  const guard=openAuthority(plan,authority),values=[];
  const candidates=additions.map(member=>{
    if(!plan.membersAfter.some(row=>row.pos===member.pos && Number(row.nageur)===Number(member.nageur)) || !Number.isInteger(member.pos) || member.pos<1 || member.pos>4) throw new TypeError("Relayeur hors de la composition validee.");
    const rows=people.filter(row=>Number(row.id)===Number(member.nageur));
    if(rows.length!==1 || String(rows[0].club)!==String(plan.clubId) || !["F","M"].includes(rows[0].sexe) || typeof rows[0].date!=="string") throw new TypeError("Identite native du relayeur a verifier.");
    values.push(positiveId(member.nageur),member.pos,rows[0].date,rows[0].sexe,String(rows[0].club));
    return "SELECT ? AS nageur,? AS pos,? AS birth_date,? AS sex,? AS club";
  });
  // An anti-join on the INSERT target is intentional: MySQL forbids reading
  // that same target in a nested subquery during INSERT SELECT.
  values.push(relayId,relayId,plan.competitionId);
  const row={...plan.after,id:relayId};
  if(Number(row.compet)!==Number(plan.competitionId) || String(row.club)!==String(plan.clubId)) throw new TypeError("Relais hors du dossier.");
  const witness=relayWitness(row,"scope_r.",values);
  values.push(...guard.values,deadline(end));
  return {kind:"insert-members",expectedRows:additions.length,sql:`INSERT INTO engagements_relayeurs (nageur,relais,pos) SELECT candidates.nageur,scope_r.id,candidates.pos FROM (${candidates.join(" UNION ALL ")}) candidates JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=candidates.nageur AND BINARY n.date <=> BINARY candidates.birth_date AND BINARY n.sexe <=> BINARY candidates.sex AND BINARY n.club <=> BINARY candidates.club JOIN engagements_relais scope_r FORCE INDEX (PRIMARY) ON scope_r.id=? LEFT JOIN engagements_relayeurs existing FORCE INDEX (livepalmes_relais_pos_id) ON existing.relais=? AND existing.pos=candidates.pos WHERE existing.id IS NULL AND ${notMerged("n")} AND EXISTS (SELECT 1 FROM nageursengager scope_e FORCE INDEX (livepalmes_compet_nageur_id) WHERE scope_e.compet=? AND scope_e.nageur=candidates.nageur) AND ${witness} AND ${guard.sql} AND UTC_TIMESTAMP() < ? ORDER BY candidates.pos LIMIT 4`,values};
}
function updateRelay(plan,course,authority,end) {
  if(plan?.action!=="compose" || positiveId(plan.relayId)!==positiveId(plan.before?.id) || Number(plan.before.compet)!==Number(plan.competitionId) || String(plan.before.club)!==String(plan.clubId) || Number(plan.after?.id)!==Number(plan.relayId) || Number(plan.after.compet)!==Number(plan.competitionId) || String(plan.after.club)!==String(plan.clubId) || !Number.isSafeInteger(plan.after.categorie) || plan.after.categorie<0 || !/^\d{6}$/.test(plan.after.tps) || Number(plan.after.tps.slice(-4,-2))>=60 || positiveId(course?.id_course)!==positiveId(plan.after.course) || Number(course.relais)!==1) throw new TypeError("Modification du relais cible seul requise.");
  const guard=openAuthority(plan,authority),values=[plan.after.categorie,plan.after.course,plan.after.tps];
  const before=relayWitness(plan.before,"",values);
  values.push(course.id_course,course.course,course.sexe,course.relais,plan.competitionId,course.id_course,...guard.values,deadline(end));
  return {kind:"update-relay",expectedRows:1,sql:`UPDATE engagements_relais SET categorie=?,course=?,tps=? WHERE ${before} AND EXISTS (SELECT 1 FROM course_dispo scope_d FORCE INDEX (PRIMARY) WHERE scope_d.id=? AND BINARY scope_d.course <=> BINARY ? AND BINARY scope_d.sexe <=> BINARY ? AND scope_d.relais=?) AND EXISTS (SELECT 1 FROM compet_courses scope_cc WHERE scope_cc.compet=? AND scope_cc.id_course=?) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 1`,values};
}
function removeMembers(plan,relayId,removals,authority,end) {
  relayId=positiveId(relayId);
  if(plan?.action!=="compose" || positiveId(plan.relayId)!==relayId || !Array.isArray(removals) || !removals.length || removals.length>1200 || !Array.isArray(plan.membersBefore)) throw new TypeError("Retrait des anciens relayeurs sauvegardes requis.");
  const guard=openAuthority(plan,authority),values=[];
  const predicates=removals.map(row=>{
    if(Number(row.relais)!==relayId || !plan.membersBefore.some(before=>["id","relais","pos","nageur"].every(key=>before[key]===row[key]))) throw new TypeError("Retrait de relayeur non sauvegarde.");
    values.push(positiveId(row.id),relayId,row.pos,positiveId(row.nageur));
    return "(id=? AND relais=? AND BINARY pos <=> BINARY ? AND nageur=?)";
  });
  const witness=relayWitness({...plan.after,id:relayId},"scope_r.",values);
  values.push(...guard.values,deadline(end));
  return {kind:"remove-members",expectedRows:removals.length,sql:`DELETE FROM engagements_relayeurs WHERE (${predicates.join(" OR ")}) AND EXISTS (SELECT 1 FROM engagements_relais scope_r FORCE INDEX (PRIMARY) WHERE ${witness}) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 1200`,values};
}
module.exports={insertRelay,insertMembers,relayWitness,updateRelay,removeMembers};
