"use strict";
// Fixed read-only investigation requested by Antoine; no arbitrary SQL or id.
const {queryFor}=require("./nap-direct-tops");
async function inspect(pool) {
  const [version]=await pool.execute({sql:"SELECT VERSION() AS version",timeout:10000});
  const sql="SELECT STRAIGHT_JOIN p.id,p.course,p.club,p.compet,c.libelle,c.date,cl.abre_club,n.club AS currentClub FROM perfs p FORCE INDEX (perf) LEFT JOIN competitions c ON c.id=p.compet LEFT JOIN clubs cl ON cl.num_club=p.club AND CAST(cl.num_club AS CHAR)=p.club JOIN nageurs n ON n.id=p.nageur WHERE p.nageur=? ORDER BY p.id LIMIT 5001";
  const [plan]=await pool.execute({sql:`EXPLAIN ${sql}`,timeout:10000},[912]);
  const [rows]=await pool.execute({sql,timeout:10000},[912]);
  if(rows.length>5000)throw new RangeError("Historique trop volumineux.");
  const groups=new Map();
  for(const row of rows){const key=String(row.club||"");const group=groups.get(key)||{rawClub:key,label:row.abre_club||null,count:0,matchesCompetition:0,examples:[]};group.count++;if(String(row.compet)===key)group.matchesCompetition++;if(group.examples.length<3)group.examples.push({performanceId:row.id,course:row.course,competitionId:row.compet,competition:row.libelle,date:row.date});groups.set(key,group);}
  const [importSchema]=await pool.execute({sql:"SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('txt_clubs','import_clubs') ORDER BY TABLE_NAME,ORDINAL_POSITION LIMIT 101",timeout:10000});
  if(importSchema.length>100)throw new RangeError("Structure d'import trop volumineuse.");
  const importClubMappings=[];
  const ids=[...groups.keys()].filter(value=>/^[1-9]\d{0,9}$/.test(value)&&Number(value)<=2147483647);
  for(const table of ["txt_clubs","import_clubs"]){
    const columns=importSchema.filter(row=>row.TABLE_NAME===table);
    if(!ids.length||!["id","compet","club"].every(name=>columns.some(row=>row.COLUMN_NAME===name))||!columns.some(row=>row.COLUMN_NAME==="id"&&row.COLUMN_KEY==="PRI"))continue;
    const [links]=await pool.execute({sql:`SELECT t.id,t.compet,t.club,cl.abre_club FROM ${table} t FORCE INDEX (PRIMARY) LEFT JOIN clubs cl ON cl.num_club=t.club AND CAST(cl.num_club AS CHAR)=t.club WHERE t.id IN (${ids.map(()=>"?").join(",")}) ORDER BY t.id LIMIT 5001`,timeout:10000},ids);
    if(links.length>5000)throw new RangeError("Correspondances d'import trop volumineuses.");
    importClubMappings.push(...links.map(link=>({table,id:link.id,competitionId:link.compet,clubId:link.club,label:link.abre_club,matchingPerformances:rows.filter(row=>String(row.club)===String(link.id)&&String(row.compet)===String(link.compet)).length})));
  }
  const top=queryFor({course:"100SF",sex:"M",limit:5000});
  let topPlan,topPlanError;
  try{[topPlan]=await pool.execute({sql:`EXPLAIN ${top.sql}`,timeout:10000},top.values);}
  catch(error){topPlanError={code:error.code||"SQL_ERROR",errno:error.errno||null,context:String(error.sqlMessage||"").replace(/\s+/g," ").slice(0,400)};}
  return {source:"nap",mode:"performance-clubs-readonly",writesExecuted:0,swimmerId:912,rowCount:rows.length,currentClub:rows[0]?.currentClub,version:version[0]?.version,groups:[...groups.values()],importSchema,importClubMappings,plan,topPlan,topPlanError};
}
module.exports={inspect};
