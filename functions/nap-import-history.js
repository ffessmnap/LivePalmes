"use strict";
// One indexed page, including pointer rows in the bound. No full before-images
// are returned and no legacy sporting collection is consulted.
async function readImportHistory(pool) {
  const [rows] = await pool.execute({sql: "SELECT id,competition_id,file_name,source_type,status,created_at,JSON_EXTRACT(metadata,'$.display') AS display FROM livepalmes_performance_imports FORCE INDEX (created_import) ORDER BY created_at DESC,id DESC LIMIT 50",timeout:10000});
  return {ok:true,source:"nap",imports:rows.filter(r=>r.source_type!=="pointer").map(row=>{
    const display=typeof row.display==="string"?JSON.parse(row.display):row.display||{};
    return {source:"nap",importId:row.id,competitionId:Number(row.competition_id),fileName:row.file_name,sourceType:row.source_type,status:row.status,importedAt:row.created_at,metadata:display.metadata||{},summary:display.summary||{}};
  })};
}
module.exports={readImportHistory};
