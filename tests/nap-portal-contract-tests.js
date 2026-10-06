"use strict";
const assert = require("node:assert/strict");
const { TABLES, summarizePrivileges, inspectPortalContract } = require("../functions/nap-portal-contract");
assert.equal(TABLES.length, 20);
for (const table of ["engagements", "engagements_relais", "engagements_relayeurs", "sessions", "qualifs", "chefsdequipe", "officielsengager"]) assert.ok(TABLES.includes(table));
const grants = text => [{ "Grants for private-account": text }];
assert.equal(summarizePrivileges(grants("GRANT ALL PRIVILEGES ON `nage-palmes`.* TO 'private'@'host' IDENTIFIED BY PASSWORD 'secret'" )).nageurs.update, true);
assert.equal(summarizePrivileges(grants("GRANT SELECT, UPDATE ON `nage-palmes`.`nageurs` TO 'private'@'host'" )).clubs.update, false);
assert.equal(summarizePrivileges(grants("GRANT UPDATE ON `other`.* TO 'private'@'host'" )).nageurs.update, false);
assert.equal(summarizePrivileges(grants("GRANT UPDATE (`nom`) ON `nage-palmes`.`nageurs` TO 'private'@'host'" )).nageurs.update, false);
assert.equal(summarizePrivileges(grants("GRANT ALL PRIVILEGES ON *.* TO 'private'@'host'" )).documents.insert, true);
(async () => {
  const calls = [];
  const pool = { execute: async (request, parameters) => {
    calls.push({ request, parameters });
    assert.ok(/^(SHOW GRANTS|SELECT )/.test(request.sql));
    if (request.sql === "SHOW GRANTS") return [grants("GRANT SELECT, INSERT, UPDATE ON `nage-palmes`.* TO 'private-account'@'host' IDENTIFIED BY PASSWORD 'secret'")];
    assert.deepEqual(parameters, TABLES);
    if (request.sql.includes("information_schema.TABLES")) return [TABLES.map(TABLE_NAME => ({ TABLE_NAME, ENGINE: "MyISAM" }))];
    if (request.sql.includes("information_schema.COLUMNS")) return [[{ TABLE_NAME: "nageurs", COLUMN_NAME: "nom", COLUMN_DEFAULT: "private-configuration" }]];
    return [[]];
  } };
  const result = await inspectPortalContract(pool);
  assert.equal(calls.length, 5);
  assert.equal(result.writesExecuted, false);
  assert.equal(result.atomicAcrossTables, false);
  assert.equal(result.permissions.nageurs.insert, true);
  assert.equal(result.permissions.nageurs.delete, false);
  assert.equal(result.columns[0].HAS_DEFAULT, true);
  assert.ok(!/secret|private-account|private-configuration|Grants for/.test(JSON.stringify(result)));
  await assert.rejects(inspectPortalContract({ execute: async () => [Array(101).fill({})] }), RangeError);
  await assert.rejects(inspectPortalContract({ execute: async (request) => {
    if (request.sql === "SHOW GRANTS") return [[]];
    if (request.sql.includes("information_schema.COLUMNS")) return [Array(401).fill({})];
    return [[]];
  } }), RangeError);
  console.log("Contrat portail NAP : diagnostic sans ecriture, droits resumes sans secret et budgets verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
