"use strict";
const assert = require("node:assert/strict");
const { readClubsByIds } = require("../../functions/nap-clubs-by-ids");

// Called only inside the disposable MySQL 5.7 fixture database.
async function verify(pool) {
  assert.equal(process.env.NAP_TEAM_FIXTURE_ALLOWED, "isolated-ci");
  await pool.execute("CREATE TABLE clubs (num_club INT NOT NULL PRIMARY KEY, federal_club VARCHAR(24), nom_club VARCHAR(140), abre_club VARCHAR(40), comite_club INT, actif_club TINYINT, ville VARCHAR(100), postalcode VARCHAR(16)) ENGINE=MyISAM");
  const values = Array.from({ length: 100 }, (_, index) => [index + 1, `number-${index}`, `Club fictif ${index}`, index < 2 ? "SAME" : `C${index}`, index === 0 ? 23 : 12, 1, "Ville fictive", "00000"]);
  await pool.execute(`INSERT INTO clubs VALUES ${values.map(() => "(?,?,?,?,?,?,?,?)").join(",")}`, values.flat());
  let calls = 0, query;
  const reader = { execute: async options => { calls++; query = options; return pool.execute(options); } };
  const clubs = await readClubsByIds(reader, ["1", "2", "1"]);
  assert.equal(calls, 1); assert.equal(clubs.size, 2);
  assert.equal(clubs.get("1").regionId, "12"); assert.equal(clubs.get("2").regionId, "nap-12");
  assert.equal(clubs.get("1").clubCode, clubs.get("2").clubCode);
  assert.notEqual(clubs.get("1").federalNumber, clubs.get("2").federalNumber);
  const [plan] = await pool.execute("EXPLAIN " + query.sql, query.values);
  assert.equal(plan.length, 1); assert.equal(plan[0].key, "PRIMARY");
  assert.ok(Number(plan[0].rows) <= 2, "Primary-key lookup visits the requested clubs only");
  await pool.execute("UPDATE clubs SET nom_club='Nom actuel',abre_club='NEW' WHERE num_club=1");
  const fresh = await readClubsByIds(reader, ["1"]);
  assert.equal(fresh.get("1").clubName, "Nom actuel"); assert.equal(fresh.get("1").clubCode, "NEW");
  assert.equal(calls, 2, "A refresh uses one grouped query and sees the native change");
  console.log("Isolated MySQL 5.7: native club labels, duplicate abbreviations, committee conversion and PRIMARY plan verified.");
}
module.exports = { verify };
