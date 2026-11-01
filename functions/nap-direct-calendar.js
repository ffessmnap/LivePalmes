"use strict";
const { positiveId, date, text, publicUrl } = require("./nap-calendar-values");
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");
const { competitionSeasonYear: __nativeMember0 } = require("./nap-performance-dates");
const rules = { competitionSeasonYear: __nativeMember0 };
const { MAX_EVENTS, nativeLevel, eventFromRow, SELECT_EVENT, EVENT_JOINS } = require("./nap-calendar-event");
const MAX_DOCUMENTS = 100;
const MAX_PROGRAM = 300;
const MAX_RESULTS = 5000;






// Optional additive fields stay server-side; eventFromRow whitelists the public response.
// Same indexed query and row bound before/after the approved column addition.


const { execute } = require("./nap-query");
async function readCalendarManifest(pool) {
  const first = await execute(pool, "SELECT date FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date >= '1900-01-01' ORDER BY date,id LIMIT 1");
  const last = await execute(pool, "SELECT date FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date < '2101-01-01' ORDER BY date DESC,id DESC LIMIT 1");
  const earliest = first[0]?.date, latest = last[0]?.date;
  if (!earliest || !latest) return { source: "nap", seasons: [] };
  const start = rules.competitionSeasonYear(earliest), end = rules.competitionSeasonYear(latest);
  if (!start || !end || end < start || end - start > 201) throw new RangeError("Saisons invalides.");
  return { source: "nap", seasons: Array.from({ length: end - start + 1 }, (_, index) => ({ endYear: end - index })) };
}
async function readCalendarSeason(pool, input) {
  const year = Number(input);
  if (!Number.isInteger(year) || year < 1901 || year > 2101) throw new TypeError("Saison invalide.");
  const rows = await execute(pool, `${SELECT_EVENT} FORCE INDEX (livepalmes_date_id)${EVENT_JOINS} WHERE c.date >= ? AND c.date < ? ORDER BY c.date,c.id LIMIT ${MAX_EVENTS + 1}`, [`${year - 1}-09-01`, `${year}-09-01`]);
  if (rows.length > MAX_EVENTS) throw new RangeError("Saison trop volumineuse.");
  return { source: "nap", readAt: new Date().toISOString(), events: rows.map(eventFromRow).filter(event => event.date && event.name) };
}
async function readCompetition(pool, input) {
  const id = positiveId(input);
  // Detailed program is loaded only on the single competition page, never for
  // every row of a season. The supplemental join is on its primary key.
  const detailSelect=SELECT_EVENT.replace(" FROM competitions c",",pg.program_sessions AS portal_program_sessions FROM competitions c");
  const rows = await execute(pool, `${detailSelect}${EVENT_JOINS} LEFT JOIN livepalmes_competition_programs pg ON pg.competition_id=c.id WHERE c.id=? LIMIT 2`, [id]);
  if (rows.length > 1) throw new RangeError("Parametres de competition ambigus.");
  if (!rows.length) return { source: "nap", event: null };
  const event = eventFromRow(rows[0]);
  const documents = await require("./nap-competition-documents").readDocuments(pool,id);
  event.documents = documents.map(({id,title,description,category,url})=>({id,title,description,category,url}));
  const poster = publicUrl(rows[0].affiche);
  if (poster && !event.documents.some(document => document.url === poster)) event.documents.push({ title: "Affiche", category: "poster", url: poster });
  if (!event.results.pdfUrl) event.results.pdfUrl = event.documents.find(document => document.category === "results" && /\.pdf(?:$|[?#])/i.test(document.url))?.url || "";
  const program = await execute(pool, `SELECT cc.pos,cd.course,cd.sexe,cd.relais FROM compet_courses cc LEFT JOIN course_dispo cd ON cd.id=cc.id_course WHERE cc.compet=? ORDER BY cc.pos,cc.id LIMIT ${MAX_PROGRAM + 1}`, [id]);
  if (program.length > MAX_PROGRAM) throw new RangeError("Programme trop volumineux.");
  if (program.length) event.program = [{ title: "Programme", date: event.date, items: program.map(row => ({ label: text(row.course) || "Épreuve", detail: [({ F: "Femmes", M: "Hommes", X: "Mixte" })[text(row.sexe)], Number(row.relais) ? "Relais" : ""].filter(Boolean).join(" · ") })) }];
  if(rows[0].portal_program_sessions != null) {
    const raw=rows[0].portal_program_sessions;
    const sessions=typeof raw==="string" ? JSON.parse(raw) : raw;
    if(!Array.isArray(sessions) || sessions.length>12 || Buffer.byteLength(JSON.stringify(sessions))>100000 || sessions.some(session=>!Array.isArray(session.items) || session.items.length>160)) throw new RangeError("Programme detaille NAP invalide.");
    event.program=require("./public-calendar").publicCalendarDetail({programSessions:sessions}).program;
  }
  if(require("./nap-calendar-event-details").KINDS.has(event.eventType)) {
    const details=await require("./nap-calendar-event-details").read(pool,id,event.eventType);
    Object.assign(event,details,{program:details.programSessions});
    delete event.programSessions;
  }
  return { source: "nap", readAt: new Date().toISOString(), event };
}
module.exports = { MAX_EVENTS, MAX_DOCUMENTS, MAX_PROGRAM, MAX_RESULTS, SELECT_EVENT, EVENT_JOINS, positiveId, date, text, publicUrl, eventFromRow, execute, readCalendarManifest, readCalendarSeason, readCompetition, nativeLevel };
