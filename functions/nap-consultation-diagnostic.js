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
  const top=queryFor({course:"100SF",sex:"M",limit:5000});
  const [topPlan]=await pool.execute({sql:`EXPLAIN ${top.sql}`,timeout:10000},top.values);
  return {source:"nap",mode:"performance-clubs-readonly",writesExecuted:0,swimmerId:912,rowCount:rows.length,currentClub:rows[0]?.currentClub,version:version[0]?.version,groups:[...groups.values()],plan,topPlan};
}
module.exports={inspect};
