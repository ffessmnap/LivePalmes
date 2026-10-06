"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { sql: approvedSql, planHash, validColumn, approvedClosureSchema } = require("../functions/nap-approved-closure-schema");
const column = { Field: "entry_closed", Type: "tinyint(4)", Null: "YES", Default: null, Extra: "", Key: "" };
assert.equal(validColumn([]), false); assert.equal(validColumn([column]), true);
for (const change of [{Type:"int"},{Default:"0"},{Null:"NO"},{Extra:"generated"},{Key:"MUL"}]) assert.throws(() => validColumn([{...column,...change}]), /incompatible/);
function fixture() {
  const state = { present: false, drift: false, busy: false, writing: false, alterations: 0, releases: 0, unlocks: 0 };
  const connection = { execute: async ({sql}) => {
    if (sql.includes("GET_LOCK")) return [[{ acquired: state.busy ? 0 : 1 }]];
    if (sql.includes("RELEASE_LOCK")) { state.unlocks++; return [[{}]]; }
    if (sql.startsWith("SHOW CREATE")) return [[{"Create Table": `CREATE TABLE x (${state.present ? "entry_closed tinyint" : "id int"}) ENGINE=${state.drift ? "MyISAM" : "InnoDB"}`}]];
    if (sql.startsWith("SHOW COLUMNS")) return [state.present ? [column] : []];
    assert.ok(sql.includes("PROCESSLIST") && sql.endsWith("LIMIT 101")); return [state.writing ? [{ID:1}] : []];
  }, query: async ({sql}) => { assert.equal(sql, approvedSql); state.present = true; state.alterations++; return [{}]; }, release: () => state.releases++ };
  state.pool = { getConnection: async () => connection }; return state;
}
(async () => {
  const state = fixture(), input = {phase:"prepare",confirmation:"nap-add-shared-entry-closure"};
  await assert.rejects(approvedClosureSchema(state.pool,{...input,confirmation:"wrong"}), /Confirmation/);
  const before = await approvedClosureSchema(state.pool,input); assert.equal(state.alterations,0);
  const apply = {...input,phase:"apply",planHash,schemaHash:before.schemaHash};
  await assert.rejects(approvedClosureSchema(state.pool,{...apply,planHash:"wrong"}), /Plan/);
  await assert.rejects(approvedClosureSchema(state.pool,{...apply,schemaHash:"wrong"}), /Structure/);
  state.busy=true; await assert.rejects(approvedClosureSchema(state.pool,apply), /deja en cours/); state.busy=false;
  state.writing=true; await assert.rejects(approvedClosureSchema(state.pool,apply), /Ecriture/); state.writing=false;
  const result=await approvedClosureSchema(state.pool,apply); assert.equal(result.verified,true); assert.equal(result.dataRowsWritten,false); assert.equal(state.alterations,1);
  const retry=await approvedClosureSchema(state.pool,input); await approvedClosureSchema(state.pool,{...apply,schemaHash:retry.schemaHash}); assert.equal(state.alterations,1);
  state.drift=true; await assert.rejects(approvedClosureSchema(state.pool,input), /incompatible/);
  assert.equal(state.releases,9); assert.equal(state.unlocks,4);
  const workflow=fs.readFileSync(".github/workflows/nap-authorized-closure-schema.yml","utf8");
  assert.ok(workflow.indexOf("name: nap-closure-schema-before") < workflow.indexOf("NAP_CLOSURE_SCHEMA_PHASE: apply"));
  assert.ok(workflow.includes('test "$EXPECTED_COMMIT" = "$GITHUB_SHA"'));
  for (const name of ["livepalmes-test-common.yml","livepalmes-test-backend.yml"]) assert.ok(!fs.readFileSync(`.github/workflows/${name}`,"utf8").includes("add-nap-entry-closure"));
  console.log("Fermeture commune : migration fixe, sauvegarde requise, concurrence, ecritures actives et idempotence verifies hors ligne.");
})().catch(error => { console.error(error); process.exitCode=1; });
