"use strict";
const {visiblePerformanceSql}=require("./nap-performance-visibility");
const rules = require("./nap-performance-normalization");
const MAX_HISTORY = 2000;
function swimmerId(input) {
  const id = Number(input);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw new TypeError("Identifiant nageur invalide.");
  return id;
}
function performanceRow(row, person, entryHistory = false) {
  const course = String(row.course || "");
  const timeValue = rules.parseCompactTime(row.tps);
  const entryOnlyCourse = entryHistory === true && ["25SF", "25AP"].includes(course);
  if ((!rules.CURRENT_POOL_COURSES.includes(course) && !entryOnlyCourse) || Number(row.relais || 0) !== 0 || Number(row.ld || 0) === 1 ||
      !row.competition_id || !timeValue || timeValue < (entryOnlyCourse ? 0 : rules.MIN_TIME_BY_COURSE[course])) return null;
  const category = rules.normalizePerformanceCategory(row.cat, person, { date: row.date });
  if (!category) return null;
  const details = entryOnlyCourse ? {label: `25 m ${course === "25SF" ? "Surface" : "Apnee"}`, shortLabel: `25 ${course.slice(2)}`, style: course.slice(2), length: 25} : rules.coursePayload(course);
  const regionId = rules.committeeId(row.comite_club);
  return {
    id: String(row.id), source: "nap", swimmerId: person.id, originalSwimmerId: person.id,
    swimmerIdentityKey: person.identityKey, swimmer: person.name, firstName: person.firstName, lastName: person.lastName,
    birthDate: person.birthDate, sex: person.sex, competitionId: String(row.competition_id), competition: rules.cleanText(row.libelle),
    date: row.date, seasonYear: rules.competitionSeasonYear(row.date), location: rules.cleanText(row.lieu),
    pool: Number(row.bassin) > 0 ? String(row.bassin) : "", chrono: rules.cleanText(row.chrono),
    clubId: String(row.selected_club || ""), club: rules.cleanText(row.abre_club || row.nom_club), clubName: rules.cleanText(row.nom_club),
    regionId, regionLabel: rules.committeeLabel(regionId), course, courseLabel: details.label, courseShortLabel: details.shortLabel,
    style: details.style, length: details.length, isIntermediate: rules.isIntermediateRow(row), originCourse: "", originPerformanceId: "",
    category, categoryCode: rules.categoryCode(category, person.sex), categoryLabel: rules.CATEGORY_LABELS[person.sex]?.[category] || category,
    timeValue, time: rules.formatTime(timeValue), passage: String(row.passage || "0")
  };
}
async function readDirectSwimmer(pool, input) {
  const requestedId = swimmerId(input);
  const [people] = await pool.execute({ sql: "SELECT n.id, n.nom, n.prenom, n.date, n.sexe, n.club, cl.abre_club, cl.nom_club FROM nageurs requested FORCE INDEX (PRIMARY) LEFT JOIN livepalmes_swimmer_merges m FORCE INDEX (PRIMARY) ON m.swimmer_id=requested.id JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=COALESCE(m.target_id,requested.id) LEFT JOIN clubs cl ON cl.num_club = n.club AND CAST(cl.num_club AS CHAR) = n.club WHERE requested.id = ? LIMIT 1", timeout: 10000 }, [requestedId]);
  if (!people.length) return { source: "nap", swimmer: null };
  const raw = people[0];
  const id = swimmerId(raw.id);
  const person = { id: String(raw.id), firstName: rules.cleanText(raw.prenom), lastName: rules.cleanText(raw.nom), birthDate: raw.date,
    sex: rules.cleanText(raw.sexe), clubId: String(raw.club || ""), club: rules.cleanText(raw.abre_club || raw.nom_club), clubName: rules.cleanText(raw.nom_club) };
  person.name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  person.identityKey = rules.swimmerIdentityKey(person.firstName, person.lastName, person.birthDate);
  const [rawRows] = await pool.execute({ sql: `SELECT p.id, p.course, p.cat, p.tps, p.passage, p.relais, c.id AS competition_id, c.libelle, c.lieu, c.date, c.bassin, c.chrono, c.ld, COALESCE(cp.num_club, cn.num_club) AS selected_club, COALESCE(cp.abre_club, cn.abre_club) AS abre_club, COALESCE(cp.nom_club, cn.nom_club) AS nom_club, COALESCE(cp.comite_club, cn.comite_club) AS comite_club FROM perfs p LEFT JOIN competitions c ON c.id = p.compet LEFT JOIN clubs cp ON cp.num_club = p.club AND CAST(cp.num_club AS CHAR) = p.club LEFT JOIN clubs cn ON cn.num_club = ? AND CAST(cn.num_club AS CHAR) = ? WHERE ${visiblePerformanceSql()} AND p.nageur = ? ORDER BY p.id LIMIT ${MAX_HISTORY + 1}`, timeout: 10000 }, [raw.club, raw.club, id]);
  if (rawRows.length > MAX_HISTORY) throw new RangeError("Historique trop volumineux pour cette lecture bornee.");
  const rows = rawRows.map(row => performanceRow(row, person)).filter(Boolean);
  if (!rows.length) return { source: "nap", swimmer: null };
  rules.annotateIntermediateOrigins(rows);
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(a.timeValue) - Number(b.timeValue));
  return { source: "nap", readAt: new Date().toISOString(), swimmer: { ...person, rows, rowCount: rows.length,
    performanceCount: rows.filter(row => !row.isIntermediate).length, aliases: [], sourceIds: [person.id] } };
}
module.exports = { MAX_HISTORY, swimmerId, performanceRow, readDirectSwimmer };
