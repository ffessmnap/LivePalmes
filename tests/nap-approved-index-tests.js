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
  console.log("Index NAP : preparation sans ecriture, liste fixe, empreinte, refus de saisie et idempotence verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
