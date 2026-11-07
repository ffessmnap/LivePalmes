"use strict";
// One indexed page plus one grouped primary-key pointer read. Never fetch the
// TXT, before-images or result bodies to render the history.
const {pointerId,parse}=require("./nap-import-lifecycle");
async function readImportHistory(pool){
  const q=async(sql,values=[])=>(await pool.execute({sql,timeout:10000},values))[0];
  const rows=await q("SELECT id,competition_id,file_name,source_type,status,created_at,JSON_EXTRACT(metadata,'$.display') AS display,JSON_LENGTH(metadata,'$.people') AS swimmer_count,JSON_LENGTH(metadata,'$.clubs') AS club_count FROM livepalmes_performance_imports FORCE INDEX (created_import) ORDER BY created_at DESC,id DESC LIMIT 50");
  const imports=rows.filter(r=>!["pointer","results-deletion"].includes(r.source_type));
  const ids=[...new Set(imports.map(r=>pointerId(Number(r.competition_id))))];
  const pointers=ids.length?await q(`SELECT id,metadata FROM livepalmes_performance_imports FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) AND source_type='pointer' LIMIT 50`,ids):[];
  const current=new Map(pointers.map(row=>[row.id,parse(row.metadata)||{}]));
  const count=value=>value===null||value===undefined?null:Number(value);
  return {ok:true,source:"nap",imports:imports.map(row=>{
    const display=parse(row.display)||{},pointer=current.get(pointerId(Number(row.competition_id)))||{},summary=display.summary||{};
    const total=part=>Number.isSafeInteger(part?.unchanged)&&Number.isSafeInteger(part?.additions)?part.unchanged+part.additions:null;
    return {source:"nap",importId:row.id,competitionId:Number(row.competition_id),fileName:row.file_name,sourceType:display.sourceType==="winpalme-zip"?"winpalme-zip":row.source_type,status:row.status,importedAt:row.created_at,metadata:display.metadata||{},summary,
      metrics:{performances:total(summary.individual),relays:total(summary.relays),statuses:count(summary.statuses),swimmers:count(row.swimmer_count),clubs:count(row.club_count)},
      current:pointer.currentImportId===row.id,resultsDeleted:pointer.currentImportId===row.id&&pointer.resultsDeleted===true,
      activeDeletionId:pointer.currentImportId===row.id?pointer.activeDeletionId||"":"",deletionSummary:pointer.currentImportId===row.id?pointer.deletionSummary||null:null,
      canDelete:pointer.currentImportId===row.id&&!pointer.activeImportId&&!pointer.activeDeletionId&&row.status==="completed"};
  })};
}
module.exports={readImportHistory};
