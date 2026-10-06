"use strict";
const assert = require("node:assert/strict");
const { approvedIndexOperation } = require("../functions/nap-approved-index");
(async () => {
  let present = false;
  let writes = false;
  let alterations = 0;
  const fields = ["prenom", "nom", "date", "id"];
  const pool = {
    execute: async query => [query.sql.startsWith("SHOW CREATE") ? [{ Table: "nageurs", "Create Table": "CREATE TABLE nageurs (...)" }] : present ? fields.map((Column_name, i) => ({ Key_name: "livepalmes_prenom_nom", Column_name, Seq_in_index: i + 1, Non_unique: 1, Sub_part: null })) : []],
    query: async query => {
      if (query.sql === "SHOW PROCESSLIST") return [[{ Info: writes ? "INSERT INTO perfs VALUES (...)" : null }]];
      assert.equal(query.sql, "ALTER TABLE `nageurs` ADD INDEX `livepalmes_prenom_nom` (`prenom`, `nom`, `date`, `id`)");
      alterations += 1; present = true; return [{}];
    }
  };
  const input = { index: "search", confirmation: "nap-add-search-index", phase: "prepare" };
  await assert.rejects(approvedIndexOperation(pool, { ...input, index: "perfs;DROP TABLE perfs" }), TypeError);
  const prepared = await approvedIndexOperation(pool, input);
  assert.equal(alterations, 0);
  await assert.rejects(approvedIndexOperation(pool, { ...input, phase: "apply", schemaHash: "wrong" }), TypeError);
  writes = true;
  await assert.rejects(approvedIndexOperation(pool, { ...input, phase: "apply", schemaHash: prepared.schemaHash }), /Ecriture en cours/);
  assert.equal(alterations, 0);
  writes = false;
  assert.equal((await approvedIndexOperation(pool, { ...input, phase: "apply", schemaHash: prepared.schemaHash })).verified, true);
  assert.equal((await approvedIndexOperation(pool, { ...input, phase: "apply", schemaHash: prepared.schemaHash })).alreadyPresent, true);
  assert.equal(alterations, 1);
  let competitionPresent = false;
  const competitionPool = {
    execute: async query => [query.sql.startsWith("SHOW CREATE") ? [{ Table: "perfs", "Create Table": "CREATE TABLE perfs (...)" }] : competitionPresent ? ["compet", "id"].map((Column_name, i) => ({ Key_name: "livepalmes_compet_id", Column_name, Seq_in_index: i + 1, Non_unique: 1, Sub_part: null })) : []],
    query: async query => {
      if (query.sql === "SHOW PROCESSLIST") return [[]];
      assert.equal(query.sql, "ALTER TABLE `perfs` ADD INDEX `livepalmes_compet_id` (`compet`, `id`)");
      competitionPresent = true; return [{}];
    }
  };
  const competitionInput = { index: "competition", confirmation: "nap-add-competition-index", phase: "prepare" };
  const competitionBackup = await approvedIndexOperation(competitionPool, competitionInput);
  assert.equal(competitionPresent, false);
  assert.equal((await approvedIndexOperation(competitionPool, { ...competitionInput, phase: "apply", schemaHash: competitionBackup.schemaHash })).verified, true);
  for (const spec of [
    { kind: "calendar", table: "competitions", name: "livepalmes_date_id", columns: ["date", "id"] },
    { kind: "documents", table: "documents", name: "livepalmes_compet_public_id", columns: ["competition", "public", "id"] },
    { kind: "roster", table: "nageurs", name: "livepalmes_club_id", columns: ["club", "id"] }
  ]) {
    let added = false;
    const indexPool = {
      execute: async query => [query.sql.startsWith("SHOW CREATE") ? [{ Table: spec.table, "Create Table": `CREATE TABLE ${spec.table} (...)` }] : added ? spec.columns.map((Column_name, i) => ({ Key_name: spec.name, Column_name, Seq_in_index: i + 1, Non_unique: 1, Sub_part: null })) : []],
      query: async query => {
        if (query.sql === "SHOW PROCESSLIST") return [[]];
        assert.equal(query.sql, `ALTER TABLE \`${spec.table}\` ADD INDEX \`${spec.name}\` (${spec.columns.map(column => `\`${column}\``).join(", ")})`);
        added = true; return [{}];
      }
    };
    const initial = { index: spec.kind, confirmation: `nap-add-${spec.kind}-index`, phase: "prepare" };
    const backup = await approvedIndexOperation(indexPool, initial);
    assert.equal(added, false);
    assert.equal((await approvedIndexOperation(indexPool, { ...initial, phase: "apply", schemaHash: backup.schemaHash })).verified, true);
  }
  console.log("Index NAP : preparation sans ecriture, liste fixe, empreinte, refus de saisie et idempotence verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
