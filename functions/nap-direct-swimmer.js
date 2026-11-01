"use strict";
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");
const { cleanText: __nativeMember0, swimmerIdentityKey: __nativeMember1 } = require("./nap-performance-identity");
const { annotateIntermediateOrigins: __nativeMember2 } = require("./nap-performance-intermediates");
const rules = { cleanText: __nativeMember0, swimmerIdentityKey: __nativeMember1, annotateIntermediateOrigins: __nativeMember2 };
const MAX_HISTORY = 2000;
const { swimmerId } = require("./nap-swimmer-values");
const { performanceRow } = require("./nap-performance-row");
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
