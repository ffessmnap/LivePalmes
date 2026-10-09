"use strict";
const rules = require("./nap-performance-normalization");
const { swimmerId } = require("./nap-direct-swimmer");
const {notMerged}=require("./nap-swimmer-merge-state");
function likeLiteral(value) { return value.replace(/[=%_]/g, character => `=${character}`); }
async function searchDirectSwimmers(pool, input) {
  if (typeof input !== "string") throw new TypeError("Recherche invalide.");
  const query = input.trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > 80) throw new TypeError("Recherche entre 2 et 80 caracteres requise.");
  let candidates;
  let parameters;
  if (/^\d+$/.test(query)) {
    candidates = "SELECT COALESCE((SELECT target_id FROM livepalmes_swimmer_merges WHERE swimmer_id=nageurs.id),id) AS id FROM nageurs WHERE id = ? LIMIT 1";
    parameters = [swimmerId(query)];
  } else {
    const tokens = query.split(" ");
    const prefix = `${likeLiteral(tokens[0])}%`;
    const remainder = tokens.slice(1).map(() => " AND CONCAT(nom, ' ', prenom) LIKE ? ESCAPE '='").join("");
    const values = [prefix, ...tokens.slice(1).map(token => `%${likeLiteral(token)}%`)];
    // FORCE INDEX fails closed if an approved index has not yet been installed.
    // Two index ranges, at most 42 candidates, one grouped club join, 21 results.
    candidates = `(SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom LIKE ? ESCAPE '='${remainder} AND ${notMerged()} ORDER BY nom, prenom, date LIMIT 21) UNION (SELECT id FROM nageurs FORCE INDEX (livepalmes_prenom_nom) WHERE prenom LIKE ? ESCAPE '='${remainder} AND ${notMerged()} ORDER BY prenom, nom, date, id LIMIT 21)`;
    parameters = [...values, ...values];
  }
  const [rows] = await pool.execute({ sql: `SELECT n.id, n.nom, n.prenom, n.date, n.sexe, n.club, cl.abre_club, cl.nom_club FROM (${candidates}) matches JOIN nageurs n ON n.id = matches.id LEFT JOIN clubs cl ON cl.num_club = n.club AND CAST(cl.num_club AS CHAR) = n.club ORDER BY n.nom, n.prenom, n.date, n.id LIMIT 21`, timeout: 10000 }, parameters);
  const swimmers = rows.slice(0, 20).map(row => {
    const firstName = rules.cleanText(row.prenom);
    const lastName = rules.cleanText(row.nom);
    return { id: String(row.id), firstName, lastName, name: [firstName, lastName].filter(Boolean).join(" "), birthDate: row.date,
      sex: rules.cleanText(row.sexe), clubId: String(row.club || ""), club: rules.cleanText(row.abre_club || row.nom_club), clubName: rules.cleanText(row.nom_club),
      identityKey: rules.swimmerIdentityKey(firstName, lastName, row.date), aliases: [], sourceIds: [String(row.id)] };
  });
  return { source: "nap", readAt: new Date().toISOString(), swimmers, hasMore: rows.length > 20 };
}
module.exports = { likeLiteral, searchDirectSwimmers };
