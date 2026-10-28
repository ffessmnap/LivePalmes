"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const review = require("./release-architecture-retained-compatibility");
const shared = require("./release-excluded-backend-compatibility-tests");
const { productionCommit: base, candidate, functions } = review.contract;
const rows = functions.map(({ name, commit }) => ({ name, commit }));
const context = { root: path.resolve(__dirname, ".."), base, candidate, rows, ...shared };
assert.equal(review.matches(base, "0".repeat(40)), false);
assert.throws(() => review.validateScope(base, "0".repeat(40), rows), /Exact reviewed/);
assert.throws(() => review.validateScope(base, candidate, rows.slice(1)), /All 15/);
assert.throws(() => review.validateScope(base, candidate, [...rows, rows[0]]), /All 15/);
assert.throws(() => review.validateScope(base, candidate, rows.map((r, i) => i ? r : { ...r, commit: "0".repeat(40) })), /Retained origin changed/);
assert.throws(() => review.validateScope(base, candidate, rows.map((r, i) => i ? r : { ...r, revision: "untrusted" })), /strictly deep-equal/);
assert.throws(() => review.validateScope(base, candidate, rows.map((r, i) => i ? r : { ...r, name: "unknownHandler" })), /All 15/);
const altered = replace => ({ ...context, source: (sha, file) => {
  const text = shared.source(sha, file); return sha === candidate && file === "functions/index.js" ? replace(text) : text;
} });
assert.throws(() => review.verifyWiring(altered(text => text.replace("return serverAccessService().portalReadStats(...arguments);", "return serverAccessService().portalReadStats();"))), /strictly equal|forwarding/i);
assert.throws(() => review.verifyWiring(altered(text => text.replace("get db() { return db; }", "get db() { return anotherDb; }"))), /Changed live dependency/);
assert.throws(() => review.verifyWiring(altered(text => text.replace("return serverAccessService.instance;", "return serverImportService.instance;"))), /strictly equal/);
for (const client of ["node:https", "node:net", "node:fs", "node:child_process", "mysql2/promise", "firebase-admin", "nodemailer"])
  assert.throws(() => shared.loader(candidate, () => `module.exports=require(${JSON.stringify(client)});`)("functions/fixture.js"), /External import blocked/);
review.prove(context).then(result => {
  assert.equal(result.result, "success"); assert.equal(result.networkCalls, 0);
  assert.equal(result.passedFunctions.length, 15); assert.ok(result.declarations >= 790);
  console.log(JSON.stringify(result));
}).catch(error => { console.error(error.stack); process.exitCode = 1; });
