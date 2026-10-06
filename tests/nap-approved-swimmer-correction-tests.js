"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { OPERATION, COLUMNS, hash, approvedSwimmerCorrection } = require("../functions/nap-approved-swimmer-correction");
const original = { id: 912, nom: "FAUVEAU", prenom: "Antoine", date: "2000-01-01", sexe: "M", club: "106", actif: 1, wc: null, edf: 0, creation: "2001-01-01 00:00:00", number: "unchanged" };
function fixture(options = {}) {
  let row = { ...original, ...options.row }, backup, completed, writes = 0;
  const pool = { execute: async (query, values) => {
    if (query.sql.startsWith("SELECT")) { assert.deepEqual(values, [912]); assert.ok(query.sql.endsWith("LIMIT 1")); return [[{ ...row }]]; }
    assert.ok(backup, "durable backup before UPDATE");
    assert.ok(query.sql.startsWith("UPDATE nageurs SET nom=? WHERE "));
    assert.ok(!query.sql.includes("SET prenom"));
    assert.equal(values[0], "FAUVAU");
    assert.deepEqual(values.slice(1), COLUMNS.map(key => backup.before[key]));
    writes++;
    if (options.race) return [{ affectedRows: 0 }];
    row.nom = values[0];
    if (options.corrupt) row.club = "different";
    return [{ affectedRows: 1 }];
  } };
  const audit = { read: async () => backup, prepare: async data => { if (options.backupFailure) throw new Error("backup failed"); backup = structuredClone(data); }, complete: async data => { if (options.auditFailure) throw new Error("audit failed"); completed = data; } };
  const run = (phase, extra = {}) => approvedSwimmerCorrection(pool, { phase, confirmation: OPERATION, beforeHash: backup?.beforeHash, ...extra }, audit);
  return { run, row: () => row, backup: () => backup, writes: () => writes, completed: () => completed };
}
(async () => {
  const f = fixture();
  const prepared = await f.run("prepare");
  assert.equal(prepared.writesExecuted, false);
  assert.equal(f.writes(), 0);
  assert.deepEqual(prepared.before, original);
  const result = await f.run("apply");
  assert.equal(result.verified, true);
  assert.equal(f.writes(), 1);
  assert.deepEqual(f.row(), { ...original, nom: "FAUVAU" });
  assert.equal(f.completed().afterHash, hash(f.row()));
  assert.equal((await f.run("apply")).alreadyApplied, true);
  assert.equal(f.writes(), 1);
  for (const options of [{ row: { nom: "AUTRE" } }, { row: { prenom: "Autre" } }, { backupFailure: true }]) {
    const refused = fixture(options); await assert.rejects(refused.run("prepare")); assert.equal(refused.writes(), 0);
  }
  const changed = fixture(); await changed.run("prepare"); changed.row().actif = 0;
  await assert.rejects(changed.run("apply"), /modifiee/); assert.equal(changed.writes(), 0);
  const noHash = fixture(); await noHash.run("prepare");
  await assert.rejects(noHash.run("apply", { beforeHash: "invalid" })); assert.equal(noHash.writes(), 0);
  for (const options of [{ race: true }, { corrupt: true }, { auditFailure: true }]) {
    const failed = fixture(options); await failed.run("prepare"); await assert.rejects(failed.run("apply")); assert.equal(failed.writes(), 1);
  }
  await assert.rejects(f.run("apply", { confirmation: "other" }));
  const workflow = fs.readFileSync(".github/workflows/nap-authorized-swimmer-correction.yml", "utf8");
  assert.ok(workflow.indexOf("name: nap-swimmer-912-before") < workflow.indexOf("NAP_CORRECTION_PHASE: apply"));
  assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
  const index = fs.readFileSync("functions/index.js", "utf8");
  assert.ok(index.includes('["approved-index", "approved-swimmer-correction", "approved-portal-schema", "approved-closure-schema"].includes(request.query.action)'));
  console.log("Authorized NAP surname correction protections passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
