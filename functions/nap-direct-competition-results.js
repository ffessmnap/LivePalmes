"use strict";
const {visiblePerformanceSql}=require("./nap-performance-visibility");
const rules = require("./nap-performance-normalization");
const { performanceRow } = require("./nap-direct-swimmer");
const { MAX_RESULTS, positiveId, text, execute } = require("./nap-direct-calendar");
const MAX_HISTORY_ROWS = 100000;
const MAX_PARTICIPANTS = 1000;
const PROJECTION = "p.id,p.nageur,p.course,p.cat,p.tps,p.passage,p.relais,c.id AS competition_id,c.libelle,c.lieu,c.date,c.bassin,c.chrono,c.ld,n.nom,n.prenom,n.date AS birth_date,n.sexe";
function personFor(row) {
  const person = { id: String(row.nageur), firstName: text(row.prenom), lastName: text(row.nom), birthDate: row.birth_date, sex: text(row.sexe) };
  person.name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  person.identityKey = rules.swimmerIdentityKey(person.firstName, person.lastName, person.birthDate);
  return person;
}
async function readCompetitionResults(pool, input) {
  const id = positiveId(input);
  const rows = await execute(pool, `SELECT STRAIGHT_JOIN ${PROJECTION},COALESCE(cp.abre_club,cn.abre_club) AS abre_club,COALESCE(cp.nom_club,cn.nom_club) AS nom_club FROM perfs p FORCE INDEX (livepalmes_compet_id) JOIN competitions c ON c.id=p.compet LEFT JOIN nageurs n ON n.id=p.nageur LEFT JOIN clubs cp ON cp.num_club=p.club AND CAST(cp.num_club AS CHAR)=p.club LEFT JOIN clubs cn ON cn.num_club=n.club AND CAST(cn.num_club AS CHAR)=n.club WHERE ${visiblePerformanceSql()} AND p.compet=? ORDER BY p.id LIMIT ${MAX_RESULTS + 1}`, [id]);
  if (rows.length > MAX_RESULTS) throw new RangeError("Resultats trop volumineux.");
  const participants = [...new Set(rows.filter(row => !Number(row.relais)).map(row => Number(row.nageur)).filter(value => value > 0))];
  const personal = new Map(), seasonal = new Map();
  let markersAvailable = participants.length <= MAX_PARTICIPANTS;
  if (markersAvailable && participants.length) {
    const placeholders = participants.map(() => "?").join(",");
    const counted = await execute(pool, `SELECT COUNT(*) AS count FROM (SELECT nageur FROM perfs FORCE INDEX (nageur) WHERE nageur IN (${placeholders}) LIMIT ${MAX_HISTORY_ROWS + 1}) bounded`, participants);
    markersAvailable = Number(counted[0]?.count) <= MAX_HISTORY_ROWS;
    if (markersAvailable) {
      const history = await execute(pool, `SELECT STRAIGHT_JOIN ${PROJECTION} FROM perfs p FORCE INDEX (nageur) JOIN competitions c ON c.id=p.compet JOIN nageurs n ON n.id=p.nageur WHERE ${visiblePerformanceSql()} AND p.nageur IN (${placeholders}) LIMIT ${MAX_HISTORY_ROWS + 1}`, participants);
      if (history.length > MAX_HISTORY_ROWS) markersAvailable = false;
      else for (const row of history) {
        const performance = performanceRow(row, personFor(row));
        if (!performance || performance.isIntermediate) continue;
        const key = `${performance.swimmerId}|${performance.course}`, seasonKey = `${key}|${performance.seasonYear}`;
        personal.set(key, Math.min(personal.get(key) ?? Infinity, performance.timeValue));
        seasonal.set(seasonKey, Math.min(seasonal.get(seasonKey) ?? Infinity, performance.timeValue));
      }
    }
  }
  const groups = new Map();
  for (const row of rows) {
    const person = personFor(row), normalized = performanceRow(row, person);
    if (normalized?.isIntermediate || Number(row.passage) > 0) continue;
    const relay = Number(row.relais) !== 0;
    if (!relay && Number(row.ld) !== 1 && !normalized) continue;
    const course = text(row.course), timeValue = normalized?.timeValue || rules.parseCompactTime(row.tps);
    const details = rules.CURRENT_POOL_COURSES.includes(course) ? rules.coursePayload(course) : null;
    const sex = person.sex || (/^F/.test(text(row.cat)) ? "F" : /^H/.test(text(row.cat)) ? "M" : "X");
    const groupKey = `${course}|${sex}|${relay ? "relay" : "individual"}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { eventLabel: `${details?.label || course}${relay ? " · Relais" : ""}`, sexLabel: ({ F: "Femmes", M: "Hommes" })[sex] || "Mixte", performances: [] });
    const key = `${person.id}|${course}`, seasonKey = `${key}|${rules.competitionSeasonYear(row.date)}`;
    groups.get(groupKey).performances.push({ id: String(row.id), swimmer: relay ? text(row.nom_club || row.abre_club) || "Équipe non renseignée" : person.name || "Nageur non renseigné", swimmerId: relay || !person.name ? "" : person.id, isRelay: relay,
      club: text(row.abre_club || row.nom_club), category: normalized?.category || text(row.cat), categoryLabel: normalized?.categoryLabel || text(row.cat),
      time: timeValue ? rules.formatTime(timeValue) : text(row.tps), timeValue: timeValue || Infinity,
      personalBest: markersAvailable && !relay && Boolean(timeValue) && personal.get(key) === timeValue,
      seasonBest: markersAvailable && !relay && Boolean(timeValue) && seasonal.get(seasonKey) === timeValue });
  }
  return { source: "nap", readAt: new Date().toISOString(), competitionId: String(id), markersAvailable,
    groups: [...groups.values()].map(group => ({ ...group, markersAvailable, performances: group.performances.sort((a, b) => a.timeValue - b.timeValue || a.swimmer.localeCompare(b.swimmer, "fr")).map(({ timeValue, ...performance }) => performance) })) };
}
module.exports = { MAX_HISTORY_ROWS, MAX_PARTICIPANTS, personFor, readCompetitionResults };
