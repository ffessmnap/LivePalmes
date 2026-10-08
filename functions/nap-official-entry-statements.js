"use strict";
const {nativeEqual}=require("./nap-native-compare");
// Unregistered preparation: one grouped PK lookup (80 people), one INSERT
// and one DELETE maximum. No statement is executed by this module.
const {SOURCES,OPTION_COLUMNS}=require("./nap-club-people");
const {positiveId}=require("./nap-direct-calendar");
const {authorityGuard}=require("./nap-portal-competition-change");
const columns=SOURCES.officials.columns;
function selectedStatement(ids,clubId) {
  if(!Array.isArray(ids) || !ids.length || ids.length>80 || !/^\d{1,16}$/.test(String(clubId))) throw new TypeError("Selection NAP bornee requise.");
  ids=[...new Set(ids.map(positiveId))];
  return {sql:`SELECT ${columns.map(key=>`n.\`${key}\``).join(",")},${OPTION_COLUMNS.map(key=>`q.\`${key}\` AS \`option_${key}\``).join(",")} FROM officiels n FORCE INDEX (PRIMARY) LEFT JOIN livepalmes_club_people_options q ON q.source='officiels' AND q.person_id=n.id WHERE n.id IN (${ids.map(()=>"?").join(",")}) AND BINARY n.club=BINARY ? ORDER BY n.id LIMIT 80`,values:[...ids,String(clubId)]};
}
function deadline(value) {
  if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new TypeError("Date limite NAP requise.");
  return value.replace("T"," ").replace("Z","");
}
function entryAuthority(authority,competitionId,clubId) {
  if(!authority || !Object.hasOwn(authority,"options")) throw new TypeError("Fermeture complementaire NAP requise.");
  const base=authorityGuard("officielsengager",authority),leader=authority.nativeLeader;
  if(clubId!==undefined && (!leader || Number(leader.compet)!==Number(competitionId) || ![String(leader.club),String(leader.pourclub)].includes(String(clubId)))) throw new TypeError("Chef d'equipe natif requis pour l'enregistrement.");
  const leaderColumns=SOURCES.leaders.columns;
  if(clubId!==undefined && leaderColumns.some(key=>!Object.hasOwn(leader,key))) throw new TypeError("Chef d'equipe natif incomplet.");
  const guard=clubId===undefined?base:{sql:`${base.sql} AND EXISTS (SELECT 1 FROM chefsdequipe scope_l WHERE ${leaderColumns.map(key=>key==="id"?"scope_l.id=?":nativeEqual(`scope_l.\`${key}\``)).join(" AND ")})`,values:[...base.values,...leaderColumns.map(key=>leader[key])]},options=authority.options;
  if(options===null) return {sql:`${guard.sql} AND NOT EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o WHERE scope_o.competition_id=?)`,values:[...guard.values,positiveId(competitionId)]};
  if(!options || typeof options!=="object" || Number(options.competition_id)!==Number(competitionId) || !Object.hasOwn(options,"canceled") || !Object.hasOwn(options,"entry_closed")) throw new TypeError("Fermeture NAP a verifier.");
  return {sql:`${guard.sql} AND EXISTS (SELECT 1 FROM livepalmes_competition_options scope_o WHERE scope_o.competition_id=? AND BINARY scope_o.canceled <=> BINARY ? AND BINARY scope_o.entry_closed <=> BINARY ? AND COALESCE(scope_o.canceled,0)=0 AND COALESCE(scope_o.entry_closed,0)=0)`,values:[...guard.values,positiveId(competitionId),options.canceled,options.entry_closed]};
}
function insertion(plan,people,authority,end) {
  if(!plan?.additions?.length || plan.additions.length>80 || !Array.isArray(people) || people.length>80) throw new TypeError("Ajouts NAP bornes requis.");
  const guard=entryAuthority(authority,plan.competitionId,plan.clubId),values=[plan.competitionId,plan.clubId,plan.competitionId,plan.clubId];
  const predicates=plan.additions.map(native=>{
    const peers=people.filter(item=>Number(item.native.id)===Number(native.id));
    if(peers.length!==1 || String(native.club)!==plan.clubId) throw new TypeError("Source officiel NAP a verifier.");
    const predicates=columns.map(key=>key==="id" ? "n.id=?" : nativeEqual(`n.\`${key}\``));
    values.push(...columns.map(key=>native[key]));
    if(peers[0].options) {
      predicates.push(...OPTION_COLUMNS.map(key=>`BINARY q.\`${key}\` <=> BINARY ?`));
      values.push(...OPTION_COLUMNS.map(key=>peers[0].options[key]));
    } else predicates.push("q.person_id IS NULL");
    return `(${predicates.join(" AND ")})`;
  });
  values.push(...guard.values,deadline(end));
  // Outer anti-join, not a subquery on the INSERT target. See MySQL's
  // INSERT SELECT restrictions: https://dev.mysql.com/doc/refman/8.4/en/insert-select.html
  return {kind:"insert",expectedRows:plan.additions.length,sql:`INSERT INTO officielsengager (compet,officiel,club) SELECT ?,n.id,? FROM officiels n FORCE INDEX (PRIMARY) LEFT JOIN livepalmes_club_people_options q ON q.source='officiels' AND q.person_id=n.id LEFT JOIN officielsengager existing FORCE INDEX (livepalmes_compet_club_id) ON existing.compet=? AND existing.club=? AND existing.officiel=n.id WHERE existing.id IS NULL AND (${predicates.join(" OR ")}) AND ${guard.sql} AND UTC_TIMESTAMP() < ? ORDER BY n.id LIMIT 80`,values};
}
function deletion(plan,rows,authority,end) {
  if(!Array.isArray(rows) || !rows.length || rows.length>200) throw new TypeError("Retraits NAP bornes requis.");
  const guard=entryAuthority(authority,plan.competitionId,plan.clubId),values=[];
  const predicates=rows.map(row=>{
    if(!plan.removals.some(before=>before.id===row.id && before.officiel===row.officiel && String(before.club)===String(row.club) && Number(before.compet)===Number(row.compet))) throw new TypeError("Retrait non sauvegarde.");
    values.push(positiveId(row.id),positiveId(row.compet),positiveId(row.officiel),String(row.club));
    return "(id=? AND compet=? AND officiel=? AND BINARY club=BINARY ?)";
  });
  values.push(...guard.values,deadline(end));
  return {kind:"delete",expectedRows:rows.length,sql:`DELETE FROM officielsengager WHERE (${predicates.join(" OR ")}) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 200`,values};
}
module.exports={selectedStatement,insertion,deletion,entryAuthority,deadline};
