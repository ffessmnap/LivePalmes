"use strict";
// Bounded native exception storage primitives. The callable must authorize the
// competition/club and verify the current sporting snapshot before any write.
const {positiveId}=require("./nap-direct-calendar");
const {specs}=require("./nap-approved-qualification-schema");
const columns=specs[0].columns.map(([name])=>name);
function scope(input) {
  const competitionId=positiveId(input.competitionId),swimmerId=positiveId(input.swimmerId),clubId=String(input.clubId);
  if(!/^[0-9]{1,16}$/.test(clubId)) throw new TypeError("Club NAP invalide.");
  return {competitionId,swimmerId,clubId};
}
function validate(rows,input) {
  const {competitionId,swimmerId,clubId}=scope(input),seen=new Set();
  if(!Array.isArray(rows)||rows.length>64) throw new RangeError("Trop d'exceptions pour ce nageur.");
  for(const row of rows) {
    if(Number(row.competition_id)!==competitionId||Number(row.swimmer_id)!==swimmerId||String(row.club_id)!==clubId||!['accepted','revoked'].includes(row.status)||!/^[A-Z0-9]{1,32}$/.test(row.event_code)||seen.has(row.event_code)||!/^[1-9][0-9]*$/.test(String(row.version))) throw new TypeError("Exception NAP hors perimetre ou incompatible.");
    seen.add(row.event_code);
  }
  return rows;
}
async function readGrants(connection,input) {
  const {competitionId,swimmerId}=scope(input);
  // Read the complete swimmer scope, including a grant attached to another
  // club: silently filtering that grant would permit an unauthorized overwrite.
  const [rows]=await connection.execute({sql:`SELECT ${columns.map(name=>`\`${name}\``).join(',')} FROM livepalmes_qualification_grants WHERE competition_id=? AND swimmer_id=? ORDER BY event_code LIMIT 65`,timeout:10000},[competitionId,swimmerId]);
  return validate(rows,input);
}
function acceptStatement(input,previous=null) {
  const {competitionId,swimmerId,clubId}=scope(input);
  if(input.national!==true||input.confirmed!==true||typeof input.actorUid!=="string"||!input.actorUid.trim()||input.actorUid.length>128||!/^[A-Z0-9]{1,32}$/.test(input.eventCode)||typeof input.reason!=="string"||input.reason.length>1000||/[\u0000-\u001f]/.test(input.reason)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(input.now)) throw new TypeError("Confirmation nationale incomplete.");
  if(previous) {
    validate([previous],input);
    if(previous.event_code!==input.eventCode) throw new TypeError("Course de l'exception incompatible.");
    if(previous.status==='accepted') return {unchanged:true,previous};
    return {sql:"UPDATE livepalmes_qualification_grants SET status='accepted',reason=?,approved_by=?,approved_at=?,revoked_by=NULL,revoked_at=NULL,version=version+1 WHERE competition_id=? AND swimmer_id=? AND event_code=? AND BINARY club_id=BINARY ? AND status='revoked' AND version=? LIMIT 1",values:[input.reason,input.actorUid,input.now,competitionId,swimmerId,input.eventCode,clubId,String(previous.version)]};
  }
  // A concurrent grant uses the primary key and fails, rather than overwriting
  // another administrator's decision via INSERT ... ON DUPLICATE KEY UPDATE.
  return {sql:"INSERT INTO livepalmes_qualification_grants (competition_id,swimmer_id,event_code,club_id,status,reason,approved_by,approved_at,revoked_by,revoked_at,version) VALUES (?,?,?,?,'accepted',?,?,?,NULL,NULL,1)",values:[competitionId,swimmerId,input.eventCode,clubId,input.reason,input.actorUid,input.now]};
}
module.exports={scope,validate,readGrants,acceptStatement};
