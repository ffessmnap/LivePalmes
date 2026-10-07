"use strict";
// On-demand native history for a grouped entry action. No export, cache or
// Firestore fallback. One indexed SQL query, <=100 people / 20000 raw rows.
const {swimmerId,performanceRow,MAX_HISTORY}=require("./nap-direct-swimmer");
const rules=require("./nap-performance-normalization");
const MAX_ROWS=20000;
function historyStatement(people) {
  if(!Array.isArray(people) || !people.length || people.length>100) throw new RangeError("De 1 a 100 nageurs NAP requis.");
  const ids=people.map(person=>swimmerId(person.id));
  if(new Set(ids).size!==ids.length) throw new TypeError("Nageurs NAP dupliques.");
  return {sql:`SELECT p.id,p.nageur,p.course,p.cat,p.tps,p.passage,p.relais,c.id AS competition_id,c.libelle,c.lieu,c.date,c.bassin,c.chrono,c.ld,COALESCE(cp.num_club,cn.num_club) AS selected_club,COALESCE(cp.abre_club,cn.abre_club) AS abre_club,COALESCE(cp.nom_club,cn.nom_club) AS nom_club,COALESCE(cp.comite_club,cn.comite_club) AS comite_club FROM perfs p FORCE INDEX (nageur) JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=p.nageur LEFT JOIN competitions c ON c.id=p.compet LEFT JOIN clubs cp ON cp.num_club=p.club AND CAST(cp.num_club AS CHAR)=p.club LEFT JOIN clubs cn ON cn.num_club=n.club AND CAST(cn.num_club AS CHAR)=n.club WHERE p.nageur IN (${ids.map(()=>"?").join(",")}) ORDER BY p.nageur,p.id LIMIT 20001`,values:ids};
}
async function readEntryHistory(connection,people) {
  const query=historyStatement(people);
  const [raw]=await connection.execute({sql:query.sql,timeout:10000},query.values);
  if(raw.length>MAX_ROWS) throw new RangeError("Historique groupe trop volumineux. Selectionnez moins de nageurs.");
  const grouped=new Map(people.map(person=>[String(person.id),[]])),ids=new Set();
  for(const row of raw) {
    const rows=grouped.get(String(row.nageur)),id=swimmerId(row.id);
    if(!rows || ids.has(id)) throw new TypeError("Historique natif hors selection ou ambigu.");
    ids.add(id);rows.push(row);
    if(rows.length>MAX_HISTORY) throw new RangeError("Historique nageur trop volumineux pour cette lecture bornee.");
  }
  return new Map(people.map(person=>{
    const raw=grouped.get(String(person.id));
    const rows=raw.map(row=>performanceRow(row,person,true)).filter(Boolean);
    rules.annotateIntermediateOrigins(rows);
    return [String(person.id),rows];
  }));
}
module.exports={MAX_ROWS,historyStatement,readEntryHistory};
