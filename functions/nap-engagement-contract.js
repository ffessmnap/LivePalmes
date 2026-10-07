"use strict";
// Private, bounded compatibility samples. No names, contacts or licences.
// Samples describe existing values; they do not approve a business mapping.
const QUERIES = [
  ["relayCategories", "SELECT id,abbr,age_d,age_f,sexe,record_categorie FROM categories FORCE INDEX (PRIMARY) WHERE id>0 ORDER BY id LIMIT 101"],
  ["parameters", "SELECT id,compet,actif,`open`,dateactif,date_limit,cat_d,cat_f,tps_d,tps_f,qualif,who,officiel,saisie,relais,niveau,nb_nageurs,nb_lignes FROM compet_parametres ORDER BY id DESC LIMIT 40"],
  ["individualLinks", "SELECT e.id,e.engagement,e.course,e.tps,n.id AS inscription_id,n.compet,c.id AS competition_id FROM (SELECT id,engagement,course,tps FROM engagements ORDER BY id DESC LIMIT 100) e LEFT JOIN nageursengager n ON n.id=e.engagement LEFT JOIN competitions c ON c.id=n.compet ORDER BY e.id DESC LIMIT 100"],
  ["relayCourses", "SELECT r.id,r.compet,r.categorie,r.course,r.tps,d.course AS course_code,d.sexe,d.relais FROM (SELECT id,compet,categorie,course,tps FROM engagements_relais ORDER BY id DESC LIMIT 60) r LEFT JOIN course_dispo d ON d.id=r.course ORDER BY r.id DESC LIMIT 60"],
  ["relayPositions", "SELECT e.id,e.relais,e.pos,r.id AS relay_id FROM (SELECT id,relais,pos FROM engagements_relayeurs ORDER BY id DESC LIMIT 60) e LEFT JOIN engagements_relais r ON r.id=e.relais ORDER BY e.id DESC LIMIT 60"],
  ["courses", "SELECT c.id,c.compet,c.id_course,c.pos,c.opencourse,c.cost,c.limitnageur,d.course,d.sexe,d.relais FROM (SELECT id,compet,id_course,pos,opencourse,cost,limitnageur FROM compet_courses ORDER BY id DESC LIMIT 60) c LEFT JOIN course_dispo d ON d.id=c.id_course ORDER BY c.id DESC LIMIT 60"],
  ["sessions", "SELECT id,compet,session,state,`begin` FROM winpalme_sessions ORDER BY id DESC LIMIT 40"],
  ["program", "SELECT c.id,c.session,c.course,c.sexe,c.pos,c.final,s.compet FROM (SELECT id,session,course,sexe,pos,final FROM winpalme_courses ORDER BY id DESC LIMIT 80) c LEFT JOIN winpalme_sessions s ON s.id=c.session ORDER BY c.id DESC LIMIT 80"],
  ["qualifications", "SELECT q.id,q.categorie,q.course,q.tps,q.type,t.short,t.begin,t.end FROM (SELECT id,categorie,course,tps,type FROM qualifs ORDER BY id DESC LIMIT 60) q LEFT JOIN qualif_types t FORCE INDEX (PRIMARY) ON t.id=q.type ORDER BY q.id DESC LIMIT 60"],
  ["forfeits", "SELECT f.id,f.engagement,f.compet,f.forfait,n.compet AS inscription_compet,e.engagement AS individual_inscription,n2.compet AS individual_compet FROM forfait f FORCE INDEX (PRIMARY) LEFT JOIN nageursengager n ON n.id=f.engagement LEFT JOIN engagements e ON e.id=f.engagement LEFT JOIN nageursengager n2 ON n2.id=e.engagement ORDER BY f.id DESC LIMIT 40"]
];
async function inspectEngagementContract(pool) {
  const samples = {}, plans = {}, errors = [];
  for (const [name,sql] of QUERIES) {
    try {
      const [plan] = await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000});
      plans[name] = plan.map(({table,type,key,rows,Extra})=>({table,type,key,rows,Extra}));
      // A proven empty/constant relation is not a table scan. Materialized
      // derived samples are themselves limited to at most 100 primary rows.
      if (plan.some(row => !String(row.table).startsWith("<") && !["system","const"].includes(row.type) && !(row.rows != null && Number(row.rows) === 0) && (row.type === "ALL" || !row.key))) {
        errors.push({query:name,reason:"non-indexed"}); continue;
      }
      const [rows] = await pool.execute({sql,timeout:10000});
      if (rows.length > 100) { errors.push({query:name,reason:"volume"}); continue; }
      samples[name] = rows;
    } catch (error) {
      // Never publish SQL/driver messages, raw queries or credentials.
      errors.push({query:name,reason:({ER_BAD_FIELD_ERROR:"column",ER_PARSE_ERROR:"syntax",ER_NO_SUCH_TABLE:"table"})[error.code] || "unavailable"});
    }
  }
  return {source:"nap",mode:"engagement-contract-readonly",inspectedAt:new Date().toISOString(),samples,plans,errors,complete:errors.length===0,writesExecuted:false,businessMappingsConfirmed:false};
}
module.exports = {QUERIES,inspectEngagementContract};
