"use strict";
const {visiblePerformanceSql}=require("./nap-performance-visibility");
const rules = require("./nap-performance-normalization");
const MAX_EVENTS = 500;
const MAX_DOCUMENTS = 100;
const MAX_PROGRAM = 300;
const MAX_RESULTS = 5000;
const nativeLevel = value => ({0:"departemental",1:"regional",2:"national",3:"national",4:"national",5:"national",6:"regional",7:"national",8:"international"})[value == null ? "" : String(value)] || "";
function positiveId(input) {
  const value = String(input ?? "").replace(/^legacy-nap-/, "");
  if (!/^[1-9][0-9]{0,9}$/.test(value) || Number(value) > 2147483647) throw new TypeError("Competition invalide.");
  return Number(value);
}
function date(value) { return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(String(value || "")) ? String(value) : ""; }
function text(value) {
  const entities = { amp: "&", apos: "'", quot: '"', eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", ccedil: "ç", nbsp: " " };
  return String(value ?? "").replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] || match).trim();
}
function publicUrl(value) {
  const input = text(value);
  if (!input || /^\/\//.test(input) || /[\u0000-\u001f]/.test(input)) return "";
  try {
    const url = new URL(input, "https://nap.ffessm.fr/");
    if (url.protocol === "http:" && url.hostname === "nap.ffessm.fr") url.protocol = "https:";
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch (_) { return ""; }
}
function eventFromRow(row) {
  const name = text(row.libelle), kind = text(row.type_label);
  // Preserve the existing calendar classification for legacy default pool codes.
  const titleType = /formation|initiateur|juge|chronom|recyclage|[ée]valuateur|sauv.?nage/i.test(name) ? "training"
    : /stage|d[ée]tection/i.test(name) ? "stage"
    : /r[ée]union|assembl[ée]e|colloque|s[ée]minair|date limite/i.test(name) ? "meeting" : "";
  const explicitType = ["pool","openWater","training","stage","meeting","other"].includes(row.event_type) ? row.event_type : "";
  const eventType = explicitType || (Number(row.ld) === 1 ? "openWater" : ({ "Eau libre": "openWater", Formation: "training", Stage: "stage", "Réunion": "meeting" }[kind] || titleType || (kind === "Piscine" ? "pool" : "other")));
  const level = nativeLevel(row.native_level_code) || ({ "Départementale": "departemental", "Départemental": "departemental", "Régionale": "regional", "Régional": "regional", "Championnat de Zones": "regional", "Critériums Nationaux": "national", Nationale: "national", National: "national", International: "international", Internationale: "international" }[text(row.level_label)] || ({ MONDE: "international", EUROPE: "international", FRANCE: "national", ZONE: "regional", REGIONAUX: "regional" })[text(row.scope_label)] || "");
  const regionId = ["national", "international"].includes(level) ? "" : rules.committeeId(row.comite);
  const id = `legacy-nap-${row.id}`;
  const pdfUrl = publicUrl(row.filepdf);
  const entry = ["pool","openWater"].includes(eventType) ? require("./nap-paris-time").entryState(row) : {};
  return { id, legacyCompetitionId: String(row.id), name, date: date(row.date), endDate: date(row.enddate) || date(row.date),
    ...entry, engagementCompetitionId:["pool","openWater"].includes(eventType) ? id : "",
    teamLeadersWhatsAppUrl:["national","international"].includes(level) ? text(row.portal_whatsapp) : "",
    city: row.portal_city == null ? text(row.lieu) : text(row.portal_city), location: text(row.lieu), address:text(row.portal_address),
    organizer:text(row.portal_organizer), waterBodyType:text(row.portal_water_body_type), canceled:Number(row.portal_canceled)===1,
    description: text(row.description), eventType, level,
    regionId, regionLabel: rules.committeeLabel(regionId), poolLength: Number(row.bassin) > 0 ? String(row.bassin) : "",
    poolLaneCount: Number(row.nb_lignes) > 0 ? Number(row.nb_lignes) : 0,
    timingType: ({ E: "electronic", M: "manual" })[text(row.chrono)] || "",
    resultsPublishedAt: Number(row.has_results) ? date(row.date) : "",
    results: { pdfUrl, url: Number(row.has_results) ? `competition.html?id=${id}#competitionResultsTitle` : "", dataPath: Number(row.has_results) ? `results/${id}.json` : "" }, documents: [], program: [] };
}
// Optional additive fields stay server-side; eventFromRow whitelists the public response.
// Same indexed query and row bound before/after the approved column addition.
const SELECT_EVENT = `SELECT STRAIGHT_JOIN c.id,c.type AS native_type,c.libelle,c.lieu,c.date,c.enddate,c.comite,c.description,c.filepdf,c.affiche,c.bassin,c.chrono,c.ld,t.label AS type_label,l.label AS level_label,s.label AS scope_label,cp.nb_lignes,cp.niveau AS native_level_code,cp.actif,cp.date_limit,co.*,co.entry_closed,co.whatsapp_url AS portal_whatsapp,co.city AS portal_city,co.address AS portal_address,co.organizer_label AS portal_organizer,co.water_body_type AS portal_water_body_type,co.canceled AS portal_canceled,(EXISTS(SELECT 1 FROM perfs p FORCE INDEX (livepalmes_compet_id) WHERE ${visiblePerformanceSql()} AND p.compet=c.id LIMIT 1) OR EXISTS(SELECT 1 FROM perfs_relais r FORCE INDEX (livepalmes_compet_id) WHERE r.compet=c.id LIMIT 1) OR EXISTS(SELECT 1 FROM livepalmes_performance_imports ri FORCE INDEX (PRIMARY) WHERE ri.id=SHA2(CONCAT('["nap-results-current",',c.id,']'),256) AND ri.status='current' LIMIT 1)) AS has_results FROM competitions c`;
const EVENT_JOINS = " LEFT JOIN compet_parametres cp ON cp.compet=c.id LEFT JOIN compet_level l ON l.id=cp.niveau LEFT JOIN compet_types t ON t.id=c.type LEFT JOIN compet_type s ON s.id=c.typecnc LEFT JOIN livepalmes_competition_options co ON co.competition_id=c.id";
async function execute(pool, sql, values = []) { return (await pool.execute({ sql, timeout: 10000 }, values))[0]; }
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
