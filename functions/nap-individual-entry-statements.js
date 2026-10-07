"use strict";
// Statement preparation only; no writes are executed here. Three grouped
// writes maximum regardless of the number of swimmers in the change.
const {positiveId}=require("./nap-direct-calendar");
const {entryAuthority,deadline}=require("./nap-official-entry-statements");
function statements(plan,authority,end) {
  if(!plan || !Array.isArray(plan.plans) || plan.plans.length>100) throw new TypeError("Plan individuel borne requis.");
  if(!/^\d{1,16}$/.test(String(plan.clubId)) || Number(authority?.competitions?.id)!==Number(plan.competitionId) || Number(authority?.compet_parametres?.compet)!==Number(plan.competitionId) || Number(authority?.compet_parametres?.actif)!==1) throw new TypeError("Competition ouverte et autorisee requise.");
  const guard=entryAuthority(authority,positiveId(plan.competitionId));
  if(authority.nativeLeader) {
    const leader=authority.nativeLeader,columns=["id","compet","nom","prenom","date","club","pourclub"];
    if(columns.some(key=>!Object.hasOwn(leader,key)) || Number(leader.compet)!==Number(plan.competitionId) || ![String(leader.club),String(leader.pourclub)].includes(String(plan.clubId))) throw new TypeError("Chef d'equipe hors dossier.");
    guard.sql+=` AND EXISTS (SELECT 1 FROM chefsdequipe scope_l FORCE INDEX (PRIMARY) WHERE scope_l.id=? AND ${columns.map(key=>`BINARY scope_l.\`${key}\` <=> BINARY ?`).join(" AND ")})`;
    guard.values.push(positiveId(leader.id),...columns.map(key=>leader[key]));
  }
  const result=[],updates=[],removals=[],additions=[],seen=new Set();
  for(const item of plan.plans) {
    const inscriptionId=positiveId(item.inscriptionId),swimmerId=positiveId(item.swimmerId);
    if(seen.has(inscriptionId)) throw new TypeError("Inscription dupliquee."); seen.add(inscriptionId);
    for(const key of ["before","updates","removals","additions"]) if(!Array.isArray(item[key]) || item[key].length>5000) throw new TypeError("Plan incomplet.");
    const source={inscriptionId,swimmerId};
    for(const row of item.removals) {
      if(!item.before.some(before=>same(before,row))) throw new TypeError("Retrait non sauvegarde.");
      removals.push({...source,before:row});
    }
    for(const row of item.updates) {
      if(!item.before.some(before=>same(before,row.before))) throw new TypeError("Correction non sauvegardee.");
      compact(row.tps); updates.push({...source,...row});
    }
    for(const row of item.additions) {
      if(Number(row.engagement)!==inscriptionId || item.before.some(before=>before.course===row.course)) throw new TypeError("Ajout incoherent.");
      compact(row.tps); code(row.course); additions.push({...source,...row});
    }
  }
  if(updates.length+removals.length>5000 || additions.length>5000) throw new RangeError("5000 courses maximum.");
  // Each native inscription and current swimmer affiliation are checked in
  // the same statement, alongside the unchanged competition and deadline.
  const scope=(alias,row,values)=>{
    values.push(row.inscriptionId,row.swimmerId,plan.competitionId,String(plan.clubId));
    return `EXISTS (SELECT 1 FROM nageursengager scope_i FORCE INDEX (PRIMARY) JOIN nageurs scope_n FORCE INDEX (PRIMARY) ON scope_n.id=scope_i.nageur WHERE scope_i.id=? AND scope_i.nageur=? AND scope_i.compet=? AND BINARY scope_n.club=BINARY ? AND ${alias}.engagement=scope_i.id)`;
  };
  const current=(row,values)=>{
    if(Number(row.before.engagement)!==row.inscriptionId) throw new TypeError("Course hors inscription.");
    values.push(positiveId(row.before.id),row.before.engagement,row.before.course,row.before.tps);
    return `(id=? AND engagement=? AND BINARY course <=> BINARY ? AND BINARY tps <=> BINARY ? AND ${scope("engagements",row,values)})`;
  };
  if(removals.length) {
    const values=[],where=removals.map(row=>current(row,values)); values.push(...guard.values,deadline(end));
    result.push({kind:"delete",sql:`DELETE FROM engagements WHERE (${where.join(" OR ")}) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 5000`,values});
  }
  if(updates.length) {
    const values=[],cases=updates.map(row=>{values.push(positiveId(row.before.id),row.tps);return "WHEN ? THEN ?";});
    const where=updates.map(row=>current(row,values));values.push(...guard.values,deadline(end));
    result.push({kind:"update",sql:`UPDATE engagements SET tps=CASE id ${cases.join(" ")} ELSE tps END WHERE (${where.join(" OR ")}) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 5000`,values});
  }
  if(additions.length) {
    const values=[],rows=additions.map(row=>{
      values.push(row.inscriptionId,row.course,row.tps,row.swimmerId); return "SELECT ? AS engagement,? AS course,? AS tps,? AS nageur";
    });
    values.push(plan.competitionId,String(plan.clubId),...guard.values,deadline(end));
    // Anti-join on the INSERT target avoids a forbidden target subquery and
    // prevents retrying an already present native course.
    result.push({kind:"insert",sql:`INSERT INTO engagements (engagement,course,tps) SELECT requested.engagement,requested.course,requested.tps FROM (${rows.join(" UNION ALL ")}) requested JOIN nageursengager scope_i FORCE INDEX (PRIMARY) ON scope_i.id=requested.engagement AND scope_i.nageur=requested.nageur JOIN nageurs scope_n FORCE INDEX (PRIMARY) ON scope_n.id=scope_i.nageur LEFT JOIN engagements existing FORCE INDEX (engagements_clef) ON existing.engagement=requested.engagement AND BINARY existing.course=BINARY requested.course WHERE existing.id IS NULL AND scope_i.compet=? AND BINARY scope_n.club=BINARY ? AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 5000`,values});
  }
  return result;
}
function same(a,b) {return ["id","engagement","course","tps"].every(key=>a[key]===b[key]);}
function compact(value) {if(typeof value!=="string" || !/^\d{1,6}$/.test(value) || Number(value.slice(-4,-2)||0)>59) throw new TypeError("Temps compact invalide.");}
function code(value) {if(typeof value!=="string" || !/^[A-Z0-9]{1,32}$/.test(value)) throw new TypeError("Course invalide.");}
module.exports={statements};
