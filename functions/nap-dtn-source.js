"use strict";
const {visiblePerformanceSql}=require("./nap-performance-visibility");
// Direct read preparation. This module registers no endpoint, performs no
// writes and accepts a trusted pool only after the caller's authorization.
const {performanceRow}=require("./nap-direct-swimmer");
const {person}=require("./nap-portal-swimmers");
const PAGE_SIZE=500,MAX_ROWS=100000,MAX_COMPETITIONS=1200;
function bounds(year) {
  if(!Number.isInteger(year) || year<2001 || year>2100) throw new TypeError("Saison DTN invalide.");
  return {start:`${year-1}-09-01`,end:`${year}-08-31`};
}
function cursor(value,year) {
  bounds(year);
  if(value===null || value===undefined) return {competitionId:0,performanceId:0,scannedRows:0};
  if(!value || typeof value!=="object" || Array.isArray(value) || Object.keys(value).some(key=>!["competitionId","performanceId","scannedRows"].includes(key)) || !Number.isSafeInteger(value.competitionId) || value.competitionId<=0 || !Number.isSafeInteger(value.performanceId) || value.performanceId<=0 || !Number.isSafeInteger(value.scannedRows) || value.scannedRows<1 || value.scannedRows>=MAX_ROWS) throw new TypeError("Pagination DTN invalide.");
  return {...value};
}
function statement(year,position,competitionIds) {
  const {start,end}=bounds(year),p=cursor(position,year);
  if(!Array.isArray(competitionIds) || !competitionIds.length || competitionIds.length>MAX_COMPETITIONS || competitionIds.some(id=>!Number.isSafeInteger(id) || id<=0) || new Set(competitionIds).size!==competitionIds.length) throw new TypeError("Competitions natives DTN bornees requises.");
  return {sql:`SELECT p.id,p.course,p.cat,p.tps,p.passage,p.relais,c.id AS competition_id,c.libelle,c.lieu,c.date,c.bassin,c.chrono,c.ld,n.id AS swimmer_id,n.nom,n.prenom,n.date AS birth_date,n.sexe,n.club AS swimmer_club,COALESCE(cp.num_club,cn.num_club) AS selected_club,COALESCE(cp.abre_club,cn.abre_club) AS abre_club,COALESCE(cp.nom_club,cn.nom_club) AS nom_club,COALESCE(cp.comite_club,cn.comite_club) AS comite_club FROM perfs p FORCE INDEX (livepalmes_compet_id) STRAIGHT_JOIN competitions c FORCE INDEX (PRIMARY) ON c.id=p.compet LEFT JOIN nageurs n ON n.id=p.nageur LEFT JOIN clubs cp ON cp.num_club=p.club AND CAST(cp.num_club AS CHAR)=p.club LEFT JOIN clubs cn ON cn.num_club=n.club AND CAST(cn.num_club AS CHAR)=n.club WHERE ${visiblePerformanceSql()} AND p.compet IN (${competitionIds.map(()=>"?").join(",")}) AND (p.compet>? OR (p.compet=? AND p.id>?)) AND c.date>=? AND c.date<=? ORDER BY p.compet,p.id LIMIT 501`,values:[...competitionIds,p.competitionId,p.competitionId,p.performanceId,start,end]};
}
function indexed(rows) {
  return Array.isArray(rows) && rows.length>0 && rows.every(row=>["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && /^(?:Impossible WHERE|No tables used|no matching row in const table)/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key));
}
async function readPage(pool,input,authorize) {
  if(typeof authorize!=="function") throw new TypeError("Autorisation DTN requise.");
  const position=cursor(input?.cursor,input?.year),prepared=statement(input.year,input.cursor,input.competitionIds);
  await authorize();
  const connection=await pool.getConnection();
  try {
    const [plan]=await connection.execute({sql:`EXPLAIN ${prepared.sql}`,timeout:10000},prepared.values);
    if(!indexed(plan)) throw new TypeError("Plan de lecture DTN NAP a verifier.");
    const [raw]=await connection.execute({sql:prepared.sql,timeout:10000},prepared.values);
    if(!Array.isArray(raw) || raw.length>PAGE_SIZE+1) throw new RangeError("Lot DTN trop volumineux.");
    const items=raw.slice(0,PAGE_SIZE),scannedRows=position.scannedRows+items.length,hasMore=raw.length>PAGE_SIZE;
    if(scannedRows>MAX_ROWS || hasMore && scannedRows>=MAX_ROWS) throw new RangeError("Calcul DTN borne interrompu : aucun resultat partiel ne doit etre publie.");
    for(let i=0;i<items.length;i++) {
      const row=items[i],previous=i?items[i-1]:{competition_id:position.competitionId,id:position.performanceId};
      if(!Number.isSafeInteger(Number(row.id)) || Number(row.id)<=0 || !input.competitionIds.includes(Number(row.competition_id)) || typeof row.date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || row.date<bounds(input.year).start || row.date>bounds(input.year).end || Number(row.competition_id)<Number(previous.competition_id) || Number(row.competition_id)===Number(previous.competition_id) && Number(row.id)<=Number(previous.id)) throw new TypeError("Ordre des performances natives a verifier.");
    }
    const rows=items.map(row=> {
      if(!row.swimmer_id) return null;
      const swimmer=person({id:row.swimmer_id,nom:row.nom,prenom:row.prenom,date:row.birth_date,sexe:row.sexe,club:row.swimmer_club});
      return performanceRow(row,swimmer);
    }).filter(Boolean);
    const last=items.at(-1);
    return {source:"nap",year:input.year,rows,scannedRows,excludedRows:items.length-rows.length,hasMore,
      cursor:hasMore?{competitionId:Number(last.competition_id),performanceId:Number(last.id),scannedRows}:null,
      sqlBudget:{queriesExecuted:2,rawRowsMax:501},readAt:new Date().toISOString()};
  }finally {connection.release();}
}
async function readCompetitionIds(pool,year,authorize) {
  const {start,end}=bounds(year);
  if(typeof authorize!=="function") throw new TypeError("Autorisation DTN requise.");
  await authorize();
  const sql="SELECT id FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date>=? AND date<=? ORDER BY date,id LIMIT 1201",values=[start,end];
  const [plan]=await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000},values);
  if(!indexed(plan)) throw new TypeError("Plan du calendrier DTN NAP a verifier.");
  const [rows]=await pool.execute({sql,timeout:10000},values);
  if(rows.length>MAX_COMPETITIONS) throw new RangeError("Saison DTN trop volumineuse.");
  const ids=rows.map(row=>Number(row.id));
  if(ids.some(id=>!Number.isSafeInteger(id) || id<=0) || new Set(ids).size!==ids.length) throw new TypeError("Competitions natives DTN a verifier.");
  return ids;
}
module.exports={PAGE_SIZE,MAX_ROWS,MAX_COMPETITIONS,bounds,cursor,statement,indexed,readPage,readCompetitionIds};
