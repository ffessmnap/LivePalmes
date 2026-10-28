"use strict";
// Fixed read-only investigation requested by Antoine; no arbitrary SQL or id.
const {queryFor}=require("./nap-direct-tops");
async function inspectReadOnly(pool) {
  const [version]=await pool.execute({sql:"SELECT VERSION() AS version",timeout:10000});
  const [tableNames]=await pool.execute({sql:"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME LIKE '%club%' OR TABLE_NAME LIKE '%perf%' OR TABLE_NAME LIKE '%engag%' OR TABLE_NAME LIKE '%inscri%' OR TABLE_NAME LIKE 'txt_%') ORDER BY TABLE_NAME LIMIT 201",timeout:10000});
  if(tableNames.length>200)throw new RangeError("Inventaire trop volumineux.");
  const sql="SELECT STRAIGHT_JOIN p.id,p.course,p.tps,p.passage,p.relais,p.pid,p.club,p.compet,c.libelle,c.date,cl.abre_club,n.club AS currentClub FROM perfs p FORCE INDEX (perf) LEFT JOIN competitions c ON c.id=p.compet LEFT JOIN clubs cl ON cl.num_club=p.club AND CAST(cl.num_club AS CHAR)=p.club JOIN nageurs n ON n.id=p.nageur WHERE p.nageur=? ORDER BY p.id LIMIT 5001";
  const [plan]=await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000},[912]);
  const [rows]=await pool.execute({sql,timeout:10000},[912]);
  if(rows.length>5000)throw new RangeError("Historique trop volumineux.");
  const groups=new Map();
  for(const row of rows){const key=String(row.club||"");const group=groups.get(key)||{rawClub:key,label:row.abre_club||null,count:0,matchesCompetition:0,examples:[]};group.count++;if(String(row.compet)===key)group.matchesCompetition++;if(group.examples.length<3)group.examples.push({performanceId:row.id,course:row.course,competitionId:row.compet,competition:row.libelle,date:row.date});groups.set(key,group);}
  const [importSchema]=await pool.execute({sql:"SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE '%club%' ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 201",timeout:10000});
  if(importSchema.length>200)throw new RangeError("Structure des clubs trop volumineuse.");
  const importClubMappings=[];
  const ids=[...groups.keys()].filter(value=>/^[1-9]\d{0,9}$/.test(value)&&Number(value)<=2147483647);
  for(const table of ["txt_clubs","import_clubs"]){
    const columns=importSchema.filter(row=>row.TABLE_NAME===table);
    if(!ids.length||!["id","compet","club"].every(name=>columns.some(row=>row.COLUMN_NAME===name))||!columns.some(row=>row.COLUMN_NAME==="id"&&row.COLUMN_KEY==="PRI"))continue;
    const [links]=await pool.execute({sql:`SELECT t.id,t.compet,t.club,cl.abre_club FROM ${table} t FORCE INDEX (PRIMARY) LEFT JOIN clubs cl ON cl.num_club=t.club AND CAST(cl.num_club AS CHAR)=t.club WHERE t.id IN (${ids.map(()=>"?").join(",")}) ORDER BY t.id LIMIT 5001`,timeout:10000},ids);
    if(links.length>5000)throw new RangeError("Correspondances d'import trop volumineuses.");
    importClubMappings.push(...links.map(link=>({table,id:link.id,competitionId:link.compet,clubId:link.club,label:link.abre_club,matchingPerformances:rows.filter(row=>String(row.club)===String(link.id)&&String(row.compet)===String(link.compet)).length})));
  }
  const historicalClubReferences=[];
  // Historical club sources are archived; preserve the diagnostic response shape.
  // Fixed counterexample supplied by Antoine: Quentin, 27.80, 03/02/2008.
  // Two bounded indexed reads, independent of the size of the whole database.
  const competitionSql="SELECT STRAIGHT_JOIN p.id,p.nageur,p.club,n.club AS currentClub,cp.abre_club AS performanceClubLabel,cn.abre_club AS currentClubLabel FROM perfs p FORCE INDEX (livepalmes_compet_id) LEFT JOIN nageurs n ON n.id=p.nageur LEFT JOIN clubs cp ON cp.num_club=p.club AND CAST(cp.num_club AS CHAR)=p.club LEFT JOIN clubs cn ON cn.num_club=n.club AND CAST(cn.num_club AS CHAR)=n.club WHERE p.compet=? ORDER BY p.id LIMIT 5001";
  const [competitionPlan]=await pool.execute({sql:`EXPLAIN ${competitionSql}`,timeout:10000},[275]);
  const [competitionRows]=await pool.execute({sql:competitionSql,timeout:10000},[275]);
  if(competitionRows.length>5000)throw new RangeError("Competition trop volumineuse.");
  const competitionGroups=new Map();
  for(const row of competitionRows){const key=JSON.stringify([row.club,row.currentClub]);const group=competitionGroups.get(key)||{rawClub:String(row.club||""),performanceClubLabel:row.performanceClubLabel,currentClub:String(row.currentClub||""),currentClubLabel:row.currentClubLabel,count:0};group.count++;competitionGroups.set(key,group);}
  const competitionComparison={competitionId:275,rowCount:competitionRows.length,plan:competitionPlan,groups:[...competitionGroups.values()],example:competitionRows.find(row=>String(row.id)==="63719")||null};
  const screenshotRows=rows.filter(row=>String(row.compet)==="3589");
  const [provenanceSchema]=await pool.execute({sql:"SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,COLUMN_KEY,COLUMN_COMMENT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('perfs','sauv_lp_20261006_perfs','txt_clubs','txt_nageurs','txt_import','winpalme_lignes','livepalmes_performance_changes') ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 301",timeout:10000});
  if(provenanceSchema.length>300)throw new RangeError("Structure de provenance trop volumineuse.");
  const [clubReferenceColumns]=await pool.execute({sql:"SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME NOT LIKE 'lp_%' AND TABLE_NAME NOT LIKE 'sauv_%' AND COLUMN_NAME IN ('club','club_id','clubID','num_club','clubId') ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 201",timeout:10000});
  if(clubReferenceColumns.length>200)throw new RangeError("References de club trop volumineuses.");
  const backupColumns=provenanceSchema.filter(row=>row.TABLE_NAME==="sauv_lp_20261006_perfs");
  let previousRows=[];
  if(["id","nageur","compet","club","course","tps","passage","relais","pid"].every(name=>backupColumns.some(row=>row.COLUMN_NAME===name))&&backupColumns.some(row=>row.COLUMN_NAME==="id"&&row.COLUMN_KEY==="PRI")){
    [previousRows]=await pool.execute({sql:"SELECT id,nageur,compet,club,course,tps,passage,relais,pid FROM sauv_lp_20261006_perfs FORCE INDEX (PRIMARY) WHERE id IN (434019,434020,434021,434390,63719) ORDER BY id LIMIT 6",timeout:10000});
  }
  let competitionImportClubs=[];
  if(importSchema.some(row=>row.TABLE_NAME==="txt_clubs"&&row.COLUMN_NAME==="compet"&&["MUL","PRI"].includes(row.COLUMN_KEY))){
    [competitionImportClubs]=await pool.execute({sql:"SELECT id,compet,club,abbr FROM txt_clubs WHERE compet IN (275,3589) ORDER BY compet,id LIMIT 1001",timeout:10000});
    if(competitionImportClubs.length>1000)throw new RangeError("Clubs d'import trop volumineux.");
  }
  const secondaryErrors=[],secondaryPlans={};
  async function secondary(name,sql,max){
    try{
      const [plan]=await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000});secondaryPlans[name]=plan;
      if(plan.some(row=>row.table&&row.type==="ALL"&&Number(row.rows)>0))throw Object.assign(new Error(),{code:"NAP_NON_INDEXED"});
      const [result]=await pool.execute({sql,timeout:10000});
      if(result.length>max)throw new RangeError();return result;
    }catch(error){secondaryErrors.push({source:name,code:error instanceof RangeError?"READ_BOUND_EXCEEDED":error.code||"SOURCE_UNAVAILABLE"});return [];}
  }
  const relaySources=await secondary("relays","SELECT id,club,distance,nageur1,nageur2,nageur3,nageur4,tps1,tps2,tps3,tps4 FROM perfs_relais FORCE INDEX (livepalmes_compet_id) WHERE compet=3589 AND (nageur1=912 OR nageur2=912 OR nageur3=912 OR nageur4=912) ORDER BY id LIMIT 1001",1000);
  const changeSources=await secondary("changes","SELECT performance_id,action,status,created_at,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(before_image,'$.row.club')),JSON_UNQUOTE(JSON_EXTRACT(before_image,'$.club'))) AS beforeClub,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(after_image,'$.row.club')),JSON_UNQUOTE(JSON_EXTRACT(after_image,'$.club'))) AS afterClub FROM livepalmes_performance_changes WHERE performance_id IN (434019,434020,434021,434390,63719) ORDER BY performance_id,created_at LIMIT 101",100);
  const importClubLines=await secondary("importClubLines","SELECT id,compet,pre,LEFT(txt,512) AS clubLine FROM txt_import WHERE compet IN (275,3589) AND pre='CLU' ORDER BY compet,id LIMIT 1001",1000);
  // Archived CNC sources are no longer queried; retained import sources remain available.
  const secondarySchema=[],championshipSources=[];
  const rowProvenance={screenshotRows,previousRows,competitionImportClubs,provenanceSchema,clubReferenceColumns,relaySources,changeSources,importClubLines,secondarySchema,championshipSources,secondaryPlans,secondaryErrors};
  const top=queryFor({course:"100SF",sex:"M",limit:5000});
  let topPlan,topPlanError;
  try{[topPlan]=await pool.execute({sql:`EXPLAIN ${top.sql}`,timeout:10000},top.values);}
  catch(error){topPlanError={code:error.code||"SQL_ERROR",errno:error.errno||null,context:String(error.sqlMessage||"").replace(/\s+/g," ").slice(0,400)};}
  return {source:"nap",mode:"performance-clubs-readonly",writesExecuted:0,swimmerId:912,rowCount:rows.length,currentClub:rows[0]?.currentClub,version:version[0]?.version,tableNames,groups:[...groups.values()],importSchema,importClubMappings,historicalClubReferences,competitionComparison,rowProvenance,plan,topPlan,topPlanError};
}
async function inspect(pool){
  let step=0;
  const measured={execute:async(...args)=>{step++;return pool.execute(...args);}};
  try{return {...await inspectReadOnly(measured),complete:true};}
  catch(error){return {source:"nap",mode:"performance-clubs-readonly",writesExecuted:0,complete:false,errors:[{step,code:error instanceof RangeError?"READ_BOUND_EXCEEDED":error.code||"DIAGNOSTIC_ERROR"}]};}
}
module.exports={inspect};
