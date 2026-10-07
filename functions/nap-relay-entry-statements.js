"use strict";
// Three grouped writes at most; no SQL is executed by this module.
const {positiveId}=require("./nap-direct-calendar");
const {entryAuthority,deadline}=require("./nap-official-entry-statements");
const RELAY_COLUMNS=["id","compet","categorie","club","course","tps"];
function statements(plan,authority,end) {
  const competitionId=positiveId(plan?.competitionId),clubId=String(plan?.clubId);
  if(!/^\d{1,16}$/.test(clubId) || !Array.isArray(plan.plans) || plan.plans.length>10 || Number(authority?.competitions?.id)!==competitionId || Number(authority?.compet_parametres?.compet)!==competitionId || Number(authority.compet_parametres.actif)!==1) throw new TypeError("Plan de relais ouvert et borne requis.");
  const guard=entryAuthority(authority,competitionId,clubId),result=[],updates=plan.plans.filter(item=>!item.remove),removals=plan.plans.filter(item=>item.remove);
  const seen=new Set();
  for(const item of plan.plans) {
    const id=positiveId(item?.relayId);
    if(seen.has(id) || typeof item.remove!=="boolean" || positiveId(item.before?.id)!==id) throw new TypeError("Identifiant relais unique et coherent requis.");
    seen.add(id);
  }
  function witness(row,alias,values) {
    if(!row || RELAY_COLUMNS.some(key=>!Object.hasOwn(row,key)) || positiveId(row.compet)!==competitionId || String(row.club)!==clubId) throw new TypeError("Relais hors du dossier.");
    positiveId(row.id);positiveId(row.course);
    values.push(...RELAY_COLUMNS.map(key=>row[key]));
    return RELAY_COLUMNS.map(key=>key==="id"?`${alias}id=?`:`BINARY ${alias}\`${key}\` <=> BINARY ?`).join(" AND ");
  }
  const finishing=(sql,values,kind,expectedRows,limit)=>{
    values.push(...guard.values,deadline(end));
    result.push({kind,expectedRows,sql:`${sql} AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT ${limit}`,values});
  };
  if(updates.length) {
    const values=[],cases=updates.map(item=>{
      if(typeof item.after?.tps!=="string" || !/^\d{6}$/.test(item.after.tps) || Number(item.after.tps.slice(-4,-2))>=60 || RELAY_COLUMNS.some(key=>key!=="tps" && item.before[key]!==item.after[key])) throw new TypeError("Correction de temps seule requise.");
      values.push(positiveId(item.before.id),item.after.tps);return "WHEN ? THEN ?";
    });
    const predicates=updates.map(item=>`(${witness(item.before,"",values)})`);
    finishing(`UPDATE engagements_relais SET tps=CASE id ${cases.join(" ")} ELSE tps END WHERE (${predicates.join(" OR ")})`,values,"time",updates.length,10);
  }
  const members=removals.flatMap(item=>{
    if(!Array.isArray(item.membersBefore)) throw new TypeError("Relayeurs sauvegardes requis.");
    return item.membersBefore.map(member=>({member,relay:item.before}));
  });
  if(members.length>1200) throw new RangeError("Retrait de relayeurs trop volumineux.");
  if(members.length) {
    const values=[],predicates=members.map(({member,relay})=>{
      if(positiveId(member.relais)!==positiveId(relay.id)) throw new TypeError("Relayeur hors relais.");
      positiveId(member.id);positiveId(member.nageur);
      values.push(member.id,member.relais,member.pos,member.nageur);
      return `(id=? AND relais=? AND BINARY pos <=> BINARY ? AND nageur=? AND EXISTS (SELECT 1 FROM engagements_relais scope_r FORCE INDEX (PRIMARY) WHERE ${witness(relay,"scope_r.",values)}))`;
    });
    finishing(`DELETE FROM engagements_relayeurs WHERE (${predicates.join(" OR ")})`,values,"members",members.length,1200);
  }
  if(removals.length) {
    const values=[],predicates=removals.map(item=>`(${witness(item.before,"",values)})`);
    finishing(`DELETE FROM engagements_relais WHERE (${predicates.join(" OR ")}) AND NOT EXISTS (SELECT 1 FROM engagements_relayeurs scope_m FORCE INDEX (livepalmes_relais_pos_id) WHERE scope_m.relais=engagements_relais.id)`,values,"relays",removals.length,10);
  }
  return result;
}
module.exports={statements};
