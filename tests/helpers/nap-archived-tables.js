"use strict";
const assert=require("node:assert/strict");
const archived=["clubs_cnnp", "clubs_users", "cnc_club", "cnc_edf", "cnc_items", "cnc_medailles", "cnc_nageurs", "cnc_summaries", "compet_access", "compet_enf", "compet_file", "compet_open", "documents_controles", "nageurs_derogations", "nageurs_enf", "nageurs_verifications", "nbconnect", "old_club", "open_courses", "open_nageurs", "outclassing", "qualif_types", "qualifs", "sessions", "winpalme_serie"];
function assertRetained(sql,parameters=[]){
  assert.ok(!(sql.match(/[A-Za-z_][A-Za-z0-9_]*/g)||[]).some(token=>archived.includes(token.toLowerCase())),"Archived tables must never be queried or locked");
  assert.ok(!parameters.flat().some(value=>typeof value==="string"&&archived.includes(value)),"Archived tables must not be requested through metadata parameters");
}
module.exports={archived,assertRetained};
