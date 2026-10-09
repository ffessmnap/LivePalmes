"use strict";
const {createHash}=require("node:crypto");
// Non-timed sporting statuses live in the approved native import journal.
// Exactly two indexed reads, never a sporting Firebase fallback.
async function readImportStatusResults(pool,competitionId) {
  const pointer=createHash("sha256").update(JSON.stringify(["nap-results-current",competitionId])).digest("hex");
  const [pointers]=await pool.execute({sql:"SELECT metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",timeout:10000},[pointer]);
  const data=typeof pointers[0]?.metadata==="string"?JSON.parse(pointers[0].metadata):pointers[0]?.metadata;
  if(data?.activeImportId)throw new TypeError("Import de résultats en cours : réessayez après sa fin.");
  if(!data?.currentImportId)return [];
  const [rows]=await pool.execute({sql:"SELECT row_number,expected_row FROM livepalmes_performance_import_rows FORCE INDEX (PRIMARY) WHERE import_id=? AND status='status' ORDER BY row_number LIMIT 5001",timeout:10000},[data.currentImportId]);
  if(rows.length>5000)throw new RangeError("Trop de statuts de résultats.");
  return rows.map(record=>{
    const stored=typeof record.expected_row==="string"?JSON.parse(record.expected_row):record.expected_row;
    const row=stored?.row;
    if(stored?.table!=="status"||!row||!["ABD","DSQ","FRT"].includes(row.status))throw new TypeError("Statut de résultat incohérent.");
    return {id:`status:${data.currentImportId}:${record.row_number}`,course:row.course,sex:row.sex||(/^F/.test(row.category)?"F":/^H/.test(row.category)?"M":"X"),swimmer:[row.firstName,row.lastName].filter(Boolean).join(" ")||row.clubCode,swimmerId:row.kind==="REL"?"":String(row.swimmerId||""),isRelay:row.kind==="REL",club:row.clubCode,category:row.category,categoryLabel:row.category,time:({ABD:"Abandon",DSQ:"Disqualification",FRT:"Forfait"})[row.status],status:row.status,personalBest:false,seasonBest:false};
  });
}
module.exports={readImportStatusResults};
