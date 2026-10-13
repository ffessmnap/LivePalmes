"use strict";
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const base = "ef96caca97f70554ee1f2c2b950cebeb5130e85e", candidate = "ac78b50759ca209cddaa15d374eb5e01dd926268";
const names = ["closeDueEngagementCompetitions", "listEngagementCompetitionMailJobs", "notifyEngagementCompetitionDocuments",
  "prepareEngagementClubRecapEmails", "prepareEngagementOpeningNotificationEmails", "processNapCompetitionNotifications", "readNapPublicSwimmer", "sendEngagementPreparedEmails"];
const rows = names.map(name => ({ name, commit: name === "readNapPublicSwimmer" ? base : "1df545a62de67a24ff32ca4d1046cce4be6d499f" }));
function run(b, c, r) {
  return cp.spawnSync(process.execPath, [path.join(__dirname, "release-excluded-backend-compatibility-tests.js"), root, b, c, JSON.stringify(r)], { encoding: "utf8", timeout: 60000 });
}
const positive = run(base, candidate, rows); assert.equal(positive.status, 0, positive.stderr);
const receipt = JSON.parse(positive.stdout); assert.equal(receipt.networkCalls, 0); assert.deepEqual(receipt.passedFunctions, names);
assert.match(receipt.c0ProofSha256, /^[0-9a-f]{64}$/);
for (const [b, c, r] of [
  ["a".repeat(40), candidate, rows], [base, "a".repeat(40), rows],
  [base, candidate, rows.slice(1)], [base, candidate, [...rows, rows[0]]],
  [base, candidate, rows.map((r, i) => i ? r : { ...r, commit: base })],
  [base, candidate, rows.map(r => r.name === "readNapPublicSwimmer" ? { ...r, commit: "1df545a62de67a24ff32ca4d1046cce4be6d499f" } : r)],
  [base, candidate, [...rows.slice(1), { name: "unknownHandler", commit: base }]]
]) {
  const failure = run(b, c, r); assert.notEqual(failure.status, 0); assert.match(failure.stderr, /AssertionError/);
}
console.log("C0 retained packages: exact pair/scope/origins, public documents under both schemas, partial-schema refusal and seven adversarial cases passed offline.");
