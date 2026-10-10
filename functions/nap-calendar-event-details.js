"use strict";
// Prepared additive details for non-sporting calendar events only.
// No DDL, no migration, no write, no Firebase fallback.
const {positiveId}=require("./nap-direct-calendar");
const {cleanPublicCalendarProgram,cleanPublicCalendarUrl}=require("./public-calendar");
const KINDS=new Set(["training","stage","meeting"]);
function normalize(raw={}) {
  const registrationUrl=cleanPublicCalendarUrl(raw.registrationUrl,500);
  let entryDeadlineAt="";
  if(raw.entryDeadlineAt) {
    const value=String(raw.entryDeadlineAt);
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value))) throw new TypeError("Date limite d'inscription invalide.");
    entryDeadlineAt=new Date(value).toISOString();
  }
  const sessions=raw.programSessions??[];
  if(!Array.isArray(sessions)||sessions.length>12||sessions.some(session=>session?.items!=null&&(!Array.isArray(session.items)||session.items.length>160))) throw new RangeError("Programme de calendrier trop volumineux.");
  const programSessions=cleanPublicCalendarProgram(sessions);
  if(Buffer.byteLength(JSON.stringify(programSessions))>100000) throw new RangeError("Programme de calendrier trop volumineux.");
  return {registrationUrl,entryDeadlineAt,programSessions};
}
function fromRow(row) {
  if(!row) return normalize();
  let programSessions=row.program_sessions;
  try {if(typeof programSessions==="string") programSessions=JSON.parse(programSessions);}
  catch {throw new TypeError("Programme NAP illisible.");}
  let deadline=row.registration_deadline_at;
  // MySQL DATETIME is stored in UTC; do not apply the machine's local zone.
  if(deadline instanceof Date) deadline=deadline.toISOString();
  else if(deadline) deadline=String(deadline).replace(" ","T").replace(/(\.\d{3})\d+$/,"$1")+"Z";
  return normalize({registrationUrl:row.registration_url,entryDeadlineAt:deadline,programSessions});
}
async function read(connection,id,kind) {
  if(!KINDS.has(kind)) throw new TypeError("Formation, stage ou reunion requis.");
  const competitionId=positiveId(id);
  const [rows]=await connection.execute({sql:"SELECT registration_url,registration_deadline_at,program_sessions FROM livepalmes_calendar_event_details FORCE INDEX (PRIMARY) WHERE competition_id=? LIMIT 1",timeout:10000},[competitionId]);
  return fromRow(rows[0]);
}
module.exports={KINDS,normalize,fromRow,read};
