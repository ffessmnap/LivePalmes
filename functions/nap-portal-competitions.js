"use strict";
// Authoritative native competition and its additive options. No Firestore fallback.
// Keep unrecognised native values visible; never silently replace them with defaults.
const calendar = require("./nap-direct-calendar");
const { entryState } = require("./nap-paris-time");
const LIMITS = Object.freeze({ courses: 300, restrictions: 3000, participations: 200, committees: 50, groups: 12, standards: 3000, qualifyingCompetitions: 2400, sessions: 12, program: 1920 });
const PARAMETERS = "cp.id AS parameter_id,cp.actif,cp.dateactif,cp.date_limit,cp.cat_d,cp.cat_f,cp.tps_d,cp.tps_f,cp.qualif,cp.saisie,cp.relais,cp.officiel,cp.niveau,cp.mailtxt,cp.mailjuges,cp.mailcontrole,cp.`open` AS native_open,cp.nb_nageurs,cp.no_premiere_ligne";
// IntraNAP's form codes are authoritative for portal permissions. The historical
// reference labels disagree for code 3 and omit 4/5/6. Never infer rights from them.
function portalEventFromRow(row) {
  const code = row.niveau == null ? "" : String(row.niveau);
  const level = ({ 0: "departemental", 1: "regional", 2: "national", 3: "national", 4: "national", 5: "national", 6: "regional", 7: "national", 8: "international" })[code];
  const event = calendar.eventFromRow({ ...row, level_label: ({ departemental: "Départementale", regional: "Régionale", national: "Nationale", international: "International" })[level] || "Nationale", scope_label: "" });
  return { ...event, ...entryState(row), competitionType: event.eventType, nativeLevelCode: row.niveau ?? null,
    nativeLevelRecognized: Boolean(level), nationalManagementOnly: !level || ["national", "international"].includes(level),
    // Unknown legacy codes fail closed for regional management.
    level: level || "national", regionId: level && ["regional", "departemental"].includes(level) ? event.regionId : "",
    regionLabel: level && ["regional", "departemental"].includes(level) ? event.regionLabel : "" };
}
async function bounded(connection, sql, values, maximum) {
  const rows = await calendar.execute(connection, sql, values);
  if (rows.length > maximum) throw new RangeError("Fiche NAP trop volumineuse : pagination requise.");
  return rows;
}
// Same season budget as the public calendar: one indexed SELECT, at most 500
// competitions. Listing uses the same native scope as the detail reader.
async function readNativeCompetitionSeason(connection, input) {
  const year = Number(input);
  if (!Number.isInteger(year) || year < 1901 || year > 2101) throw new TypeError("Saison invalide.");
  const select = calendar.SELECT_EVENT.replace(" FROM competitions c", ",cp.niveau,cp.actif,cp.date_limit FROM competitions c");
  const rows = await bounded(connection, `${select} FORCE INDEX (livepalmes_date_id)${calendar.EVENT_JOINS} WHERE c.date >= ? AND c.date < ? ORDER BY c.date,c.id LIMIT 501`, [`${year - 1}-09-01`, `${year}-09-01`], calendar.MAX_EVENTS);
  if (new Set(rows.map(row => String(row.id))).size !== rows.length) throw new RangeError("Parametres de competition ambigus.");
  return { source: "nap", readAt: new Date().toISOString(), events: rows.map(portalEventFromRow).filter(event => event.date && event.name) };
}
async function readNativeCompetition(connection, input, authorize) {
  if (typeof authorize !== "function") throw new TypeError("Controle du perimetre requis.");
  const id = calendar.positiveId(input);
  const rows = await bounded(connection, `${calendar.SELECT_EVENT.replace(" FROM competitions c", `,${PARAMETERS},c.organisateur,c.delegue,c.comments FROM competitions c`)}${calendar.EVENT_JOINS} WHERE c.id=? LIMIT 2`, [id], 1);
  if (!rows.length) return null;
  const row = rows[0], event = portalEventFromRow(row);
  // Scope check precedes every contact, rule, or supplemental data query.
  await authorize({ ...event, competitionType: event.eventType });
  const nativeParameters = Object.fromEntries(["parameter_id", "actif", "dateactif", "date_limit", "cat_d", "cat_f", "tps_d", "tps_f", "qualif", "saisie", "relais", "officiel", "niveau", "mailtxt", "mailjuges", "mailcontrole", "native_open", "nb_lignes", "nb_nageurs", "no_premiere_ligne"].map(key => [key, row[key] ?? null]));
  const courses = await bounded(connection, "SELECT cc.id,cc.pos,cc.id_course,cc.opencourse,cc.cost,cc.limitnageur,d.course,d.sexe,d.relais FROM compet_courses cc LEFT JOIN course_dispo d ON d.id=cc.id_course WHERE cc.compet=? ORDER BY cc.pos,cc.id LIMIT 301", [id], LIMITS.courses);
  const restrictions = await bounded(connection, "SELECT id,course,categorie,swim FROM courses_swim FORCE INDEX (livepalmes_compet_course_cat_id) WHERE compet=? ORDER BY course,categorie,id LIMIT 3001", [id], LIMITS.restrictions);
  const participations = await bounded(connection, "SELECT id,participation,modeengagement FROM compet_participations FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 201", [id], LIMITS.participations);
  const committees = await bounded(connection, "SELECT id,comite FROM compet_comites FORCE INDEX (livepalmes_compet_comite_id) WHERE compet=? ORDER BY comite,id LIMIT 51", [id], LIMITS.committees);
  const options = await bounded(connection, "SELECT * FROM livepalmes_competition_options WHERE competition_id=? LIMIT 1", [id], 1);
  const courseOptions = await bounded(connection, "SELECT * FROM livepalmes_course_options WHERE competition_id=? ORDER BY event_code LIMIT 301", [id], LIMITS.courses);
  const fees = await bounded(connection, "SELECT * FROM livepalmes_competition_fees WHERE competition_id=? LIMIT 1", [id], 1);
  const detailedProgram = await bounded(connection, "SELECT * FROM livepalmes_competition_programs WHERE competition_id=? LIMIT 1", [id], 1);
  const groups = await bounded(connection, "SELECT * FROM livepalmes_qualification_groups WHERE competition_id=? ORDER BY position LIMIT 13", [id], LIMITS.groups);
  const standards = await bounded(connection, "SELECT * FROM livepalmes_qualification_standards WHERE competition_id=? ORDER BY category,sex,event_code LIMIT 3001", [id], LIMITS.standards);
  const qualifyingCompetitions = groups.length ? await bounded(connection, `SELECT * FROM livepalmes_qualification_competitions WHERE group_id IN (${groups.map(() => "?").join(",")}) ORDER BY group_id,qualifying_competition_id LIMIT 2401`, groups.map(group => group.id), LIMITS.qualifyingCompetitions) : [];
  const sessions = await bounded(connection, "SELECT id,label,description,session,state,`begin` FROM winpalme_sessions FORCE INDEX (livepalmes_compet_session_id) WHERE compet=? ORDER BY session,id LIMIT 13", [id], LIMITS.sessions);
  const program = sessions.length ? await bounded(connection, `SELECT id,session,course,sexe,pos,final FROM winpalme_courses FORCE INDEX (livepalmes_session_pos_id) WHERE session IN (${sessions.map(() => "?").join(",")}) ORDER BY session,pos,id LIMIT 1921`, sessions.map(session => session.id), LIMITS.program) : [];
  return { source: "nap", readAt: new Date().toISOString(), event, nativeParameters, nativeOrganizerId: row.organisateur, nativeDelegate: row.delegue, nativeComments: row.comments,
    courses, restrictions, participations, committees, options: options[0] || null, courseOptions, fees: fees[0] || null, detailedProgram: detailedProgram[0] || null, groups, standards, qualifyingCompetitions, sessions, program };
}
// Private compatibility proof, deliberately excludes names, contacts and descriptions.
async function inspectNativeCompetitions(connection) {
  const competitions = [];
  for (const id of [5140, 5206, 5207]) {
    const data = await readNativeCompetition(connection, id, () => {});
    if (!data) { competitions.push({ id, present: false }); continue; }
    competitions.push({ id, present: true, level: data.event.level, competitionType: data.event.eventType,
      parameters: Object.fromEntries(["actif", "dateactif", "date_limit", "saisie", "relais", "officiel", "native_open", "nb_lignes", "nb_nageurs", "no_premiere_ligne"].map(key => [key, data.nativeParameters[key]])),
      counts: Object.fromEntries(["courses", "restrictions", "participations", "committees", "courseOptions", "groups", "standards", "qualifyingCompetitions", "sessions", "program"].map(key => [key, data[key].length])),
      optionsPresent: data.options !== null, feesPresent: data.fees !== null, detailedProgramPresent: data.detailedProgram !== null });
  }
  return { source: "nap", mode: "portal-competition-contract-readonly", competitions, writesExecuted: false };
}
module.exports = { LIMITS, bounded, portalEventFromRow, readNativeCompetitionSeason, readNativeCompetition, inspectNativeCompetitions };
