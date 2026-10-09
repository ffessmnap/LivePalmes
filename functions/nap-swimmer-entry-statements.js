"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
const {nativeEqual}=require("./nap-native-compare");
const {positiveId}=require("./nap-direct-calendar");
const {entryAuthority,deadline}=require("./nap-official-entry-statements");
// Four grouped statements maximum. This module never executes SQL.
function statements(plan,authority,end) {
  const competitionId=positiveId(plan?.competitionId),clubId=String(plan?.clubId);
  if(!/^\d{1,16}$/.test(clubId) || !Array.isArray(plan.additions) || !Array.isArray(plan.removals) || plan.additions.length+plan.removals.length>50 || Number(authority?.competitions?.id)!==competitionId || Number(authority?.compet_parametres?.compet)!==competitionId || Number(authority?.compet_parametres?.actif)!==1) throw new TypeError("Selection ouverte et bornee requise.");
  const guard=entryAuthority(authority,competitionId),leader=authority.nativeLeader,columns=["id","compet","nom","prenom","date","club","pourclub"];
  if(!leader || columns.some(key=>!Object.hasOwn(leader,key)) || Number(leader.compet)!==competitionId || ![String(leader.club),String(leader.pourclub)].includes(clubId)) throw new TypeError("Chef d'equipe hors du dossier.");
  guard.sql+=` AND EXISTS (SELECT 1 FROM chefsdequipe scope_l FORCE INDEX (PRIMARY) WHERE scope_l.id=? AND ${columns.map(key=>nativeEqual(`scope_l.\`${key}\``)).join(" AND ")})`;
  guard.values.push(positiveId(leader.id),...columns.map(key=>leader[key]));
  // Do not interpret the ambiguous historic forfait.engagement linkage.
  const withoutForfeits="NOT EXISTS (SELECT 1 FROM forfait scope_f FORCE INDEX (livepalmes_compet_engagement_id) WHERE scope_f.compet=?)";
  const result=[];
  function personScope(person,values) {
    if(String(person.clubId)!==clubId) throw new TypeError("Nageur hors du dossier.");
    values.push(positiveId(person.id),clubId,person.lastName,person.firstName,person.birthDate,person.sex);
    return `EXISTS (SELECT 1 FROM nageurs scope_n FORCE INDEX (PRIMARY) WHERE scope_n.id=? AND ${notMerged("scope_n")} AND BINARY scope_n.club=BINARY ? AND ${nativeEqual("scope_n.nom")} AND ${nativeEqual("scope_n.prenom")} AND BINARY scope_n.date <=> BINARY ? AND BINARY scope_n.sexe <=> BINARY ?)`;
  }
  const individuals=[],members=[],inscriptions=[];
  for(const removal of plan.removals) {
    const i=removal.inscription,p=removal.swimmer;
    if(Number(i.compet)!==competitionId || Number(i.nageur)!==Number(p.id)) throw new TypeError("Inscription hors du dossier.");
    for(const row of removal.entries) {
      if(Number(row.engagement)!==Number(i.id)) throw new TypeError("Course hors inscription.");
      individuals.push({row,person:p,inscription:i});
    }
    for(const row of removal.members) {
      if(Number(row.nageur)!==Number(p.id)) throw new TypeError("Relayeur hors inscription.");
      members.push({row,person:p});
    }
    inscriptions.push({row:i,person:p});
  }
  if(individuals.length>5000 || members.length>1200) throw new RangeError("Retrait trop volumineux.");
  function remove(table,rows,keys,extra,limit) {
    if(!rows.length) return;
    const values=[],predicates=rows.map(item=>{
      const fields=keys.map(key=>{values.push(item.row[key]);return key==="id"?"id=?":`BINARY \`${key}\` <=> BINARY ?`;});
      fields.push(personScope(item.person,values));
      fields.push(extra(item,values));
      return `(${fields.join(" AND ")})`;
    });
    values.push(...guard.values,competitionId,deadline(end));
    result.push({kind:table,sql:`DELETE FROM ${table} WHERE (${predicates.join(" OR ")}) AND ${guard.sql} AND ${withoutForfeits} AND UTC_TIMESTAMP() < ? LIMIT ${limit}`,values});
  }
  remove("engagements",individuals,["id","engagement","course","tps"],(item,values)=>{
    values.push(positiveId(item.inscription.id),competitionId,positiveId(item.person.id));
    return "EXISTS (SELECT 1 FROM nageursengager scope_i FORCE INDEX (PRIMARY) WHERE scope_i.id=? AND scope_i.compet=? AND scope_i.nageur=?)";
  },5000);
  remove("engagements_relayeurs",members,["id","relais","pos","nageur"],(item,values)=>{
    values.push(positiveId(item.row.relais),competitionId,clubId);
    return "EXISTS (SELECT 1 FROM engagements_relais scope_r FORCE INDEX (PRIMARY) WHERE scope_r.id=? AND scope_r.compet=? AND BINARY scope_r.club=BINARY ?)";
  },1200);
  remove("nageursengager",inscriptions,["id","nageur","compet"],(item,values)=>{
    values.push(positiveId(item.row.id),competitionId,clubId,positiveId(item.person.id));
    return "NOT EXISTS (SELECT 1 FROM engagements scope_e FORCE INDEX (engagements_clef) WHERE scope_e.engagement=?) AND NOT EXISTS (SELECT 1 FROM engagements_relais scope_r FORCE INDEX (livepalmes_compet_club_id) JOIN engagements_relayeurs scope_m FORCE INDEX (livepalmes_relais_pos_id) ON scope_m.relais=scope_r.id WHERE scope_r.compet=? AND scope_r.club=? AND scope_m.nageur=?)";
  },50);
  if(plan.additions.length) {
    const values=[competitionId,competitionId],rows=plan.additions.map(person=>{
      const scopeValues=[];personScope(person,scopeValues);
      values.push(...scopeValues);
      return `(n.id=? AND BINARY n.club=BINARY ? AND ${nativeEqual("n.nom")} AND ${nativeEqual("n.prenom")} AND BINARY n.date <=> BINARY ? AND BINARY n.sexe <=> BINARY ?)`;
    });
    values.push(...guard.values,deadline(end));
    result.push({kind:"insert",sql:`INSERT INTO nageursengager (compet,nageur) SELECT ?,n.id FROM nageurs n FORCE INDEX (PRIMARY) LEFT JOIN nageursengager existing FORCE INDEX (livepalmes_compet_nageur_id) ON existing.compet=? AND existing.nageur=n.id WHERE existing.id IS NULL AND ${notMerged("n")} AND (${rows.join(" OR ")}) AND ${guard.sql} AND UTC_TIMESTAMP() < ? ORDER BY n.id LIMIT 50`,values});
  }
  return result;
}
module.exports={statements};
