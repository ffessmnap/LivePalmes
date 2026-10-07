"use strict";
const {positiveId}=require("./nap-direct-calendar");
const {entryAuthority,deadline}=require("./nap-official-entry-statements");
const json=value=>value==null?null:typeof value==="string"?value:JSON.stringify(value);
function detailStatement(input,before,after,authority,end) {
  const competitionId=positiveId(input.competitionId),clubId=String(input.clubId);
  if(!/^\d{1,16}$/.test(clubId) || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(input.timestamp) || !after || typeof after!=="object") throw new TypeError("Complement de relais autorise requis.");
  const guard=entryAuthority(authority,competitionId,clubId);
  if(before===null) return {kind:"insert-details",expectedRows:1,sql:`INSERT INTO livepalmes_club_entry_options (competition_id,club_id,submission_metadata,version,created_at,updated_at,created_by,updated_by) SELECT ?,?,CAST(? AS JSON),1,?,?,?,? FROM competitions scope_native FORCE INDEX (PRIMARY) WHERE scope_native.id=? AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 1`,values:[competitionId,clubId,JSON.stringify(after),input.timestamp,input.timestamp,input.actorUid,input.actorUid,competitionId,...guard.values,deadline(end)]};
  if(!before || Number(before.competition_id)!==competitionId || String(before.club_id)!==clubId || !/^\d+$/.test(String(before.version))) throw new TypeError("Complement existant du dossier requis.");
  return {kind:"update-details",expectedRows:1,sql:`UPDATE livepalmes_club_entry_options SET submission_metadata=CAST(? AS JSON),version=version+1,updated_at=?,updated_by=? WHERE competition_id=? AND club_id=? AND version=? AND submission_metadata <=> CAST(? AS JSON) AND team_leader_waiver <=> ? AND team_leader_contact <=> CAST(? AS JSON) AND ${guard.sql} AND UTC_TIMESTAMP() < ? LIMIT 1`,values:[JSON.stringify(after),input.timestamp,input.actorUid,competitionId,clubId,before.version,json(before.submission_metadata),before.team_leader_waiver,json(before.team_leader_contact),...guard.values,deadline(end)]};
}
module.exports={detailStatement};
