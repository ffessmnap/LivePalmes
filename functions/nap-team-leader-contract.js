"use strict";
// Private read-only sample: seven metadata columns, one EXPLAIN and at most
// 201 latest declarations through PRIMARY. No names or birth dates returned.
const {date,positiveId}=require("./nap-direct-calendar");
const COLUMNS=["id","compet","nom","prenom","date","club","pourclub"];
const SELECT="SELECT id,compet,nom,prenom,date,club,pourclub FROM chefsdequipe FORCE INDEX (PRIMARY) ORDER BY id DESC LIMIT 201";
function marker(row) {
  const normalized=[row.nom,row.prenom].map(value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")).join("");
  if(["aucunchef","aucunchefdequipe","sanschef","sanschefdequipe","pasdechef","pasdechefdequipe","renonciation","renonciationaudroitdereclamation"].includes(normalized)) return "possible-waiver-label";
  if(!String(row.nom||"").trim() || !String(row.prenom||"").trim()) return "incomplete-identity";
  return null;
}
async function inspectNativeLeaderContract(pool) {
  const query=async(sql,values=[]) => (await pool.execute({sql,timeout:10000},values))[0];
  const metadata=await query(`SELECT COLUMN_NAME,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='chefsdequipe' AND COLUMN_NAME IN (${COLUMNS.map(()=>"?").join(",")}) ORDER BY ORDINAL_POSITION LIMIT 8`,COLUMNS);
  if(metadata.length!==7 || new Set(metadata.map(row=>row.COLUMN_NAME)).size!==7 || metadata.some(row=>!COLUMNS.includes(row.COLUMN_NAME))) throw new TypeError("Structure du chef a verifier.");
  const explain=await query(`EXPLAIN ${SELECT}`);
  if(explain.length!==1 || explain[0].key!=="PRIMARY" || !["index","range","const"].includes(explain[0].type)) throw new TypeError("Lecture recente non indexee.");
  const rows=await query(SELECT);
  if(rows.length>201) throw new RangeError("Echantillon trop volumineux.");
  let previous=Infinity;
  for(const row of rows) {
    const id=positiveId(row.id);
    if(id>=previous || COLUMNS.some(key=>!Object.hasOwn(row,key))) throw new TypeError("Echantillon natif incoherent.");
    previous=id;
  }
  const sample=rows.slice(0,200),candidates=sample.filter(row=>marker(row)).map(row=>({
    declarationId:String(row.id),competitionId:String(row.compet),clubId:/^\d{1,16}$/.test(String(row.club))?String(row.club):null,representedClubId:/^\d{1,16}$/.test(String(row.pourclub))?String(row.pourclub):null,
    reason:marker(row),birthDateUnknown:!date(row.date)
  }));
  return {source:"nap",mode:"portal-team-leader-contract-readonly",complete:true,sampleOnly:true,sampled:sample.length,olderRowsNotInspected:rows.length>200,
    defaults:metadata.map(row=>({column:row.COLUMN_NAME,kind:row.COLUMN_DEFAULT==null?"absent":row.COLUMN_DEFAULT===""?"empty":String(row.COLUMN_DEFAULT)==="0"?"zero":"other"})),
    plans:explain.map(({table,type,key,rows,Extra})=>({table,type,key,rows,Extra})),
    candidateCount:candidates.length,candidates:candidates.slice(0,20),candidatesTruncated:candidates.length>20,
    // These markers are leads, never a rule for the live portal. Confirm the
    // selected waiver in IntraNAP before assigning any sporting meaning.
    interpretationConfirmed:false,sqlBudget:{queriesMax:3,rowsMax:209},writesExecuted:false};
}
module.exports={marker,inspectNativeLeaderContract};
