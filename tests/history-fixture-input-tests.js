"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process"), crypto = require("node:crypto");
const fixture = require("./helpers/history-git-fixture");
const raw = fs.readFileSync(path.join(__dirname, "helpers/history-fixtures.json"), "utf8").replace(/\r\n/g, "\n");
const digest = text => crypto.createHash("sha256").update(text).digest("hex");
const data = fixture.validate(raw, digest(raw));
const old = "ac677ad530aab6b121b3a038accc0fb4860fa5e6", item = data.commits[old];
assert(item);
assert.throws(() => fixture.validate(raw + " ", digest(raw)));
for (const mutate of [
  v => { v.extra = true; }, v => { v.scope.push("../outside"); },
  v => { v.commits[old].metadataOnly = ["functions/index.js"]; },
  v => { v.commits[old].rows.push("100644 blob " + "a".repeat(40) + "\tfunctions/../outside.js"); },
  v => { v.commits[old].rows.push(v.commits[old].rows[0]); },
]) {
  const v = structuredClone(data); mutate(v); const bad = JSON.stringify(v);
  assert.throws(() => fixture.validate(bad, digest(bad)));
}
const original = item.rows.join("\n") + "\n";
fixture.checkRows(item, original, true);
assert.throws(() => fixture.checkRows(item, original + "\n", true));
const clean = item.rows.filter(row => !item.metadataOnly.includes(row.split("\t")[1])).join("\n") + "\n";
fixture.checkRows(item, clean, false);
const changed = clean.replace(/blob [a-f0-9]{40}/, "blob " + "f".repeat(40));
assert.throws(() => fixture.checkRows({ ...item, cleanRowsSha256: digest(changed) }, changed, false),
  "Even a new digest cannot admit changed executable input");
fixture.install();
for (const name of ["20261012-production-blocked-attempt.json", "20261024-grouped-mail-scope-correction.json"]) {
  const blocked = JSON.parse(fs.readFileSync(path.join(fixture.ROOT, ".github/releases/evidence", name), "utf8"));
  for (const [source, expected] of Object.entries(blocked.sourceSha256))
    assert.equal(digest(fixture.bytes(blocked.headSha, source).data), expected,
      "Blocked-run test sources must retain the immutable proof's exact bytes");
}
const retired = "functions/intranap-swimmers-reference.json";
assert.throws(() => fixture.bytes(old, retired), "Retired JSON payload must stay unavailable");
const metadata = fixture.bytes(old, retired, true);
assert.equal(metadata.data.length, 0);
assert.match(metadata.entry.blob, /^[a-f0-9]{40}$/);
const privacy = JSON.parse(fs.readFileSync(path.join(fixture.ROOT,
  ".github/releases/evidence/20261115-production-public-privacy-contract.json"), "utf8"));
assert.throws(() => fixture.bytes(privacy.productionCommit, "performances/public/data/admin-reference.js"));
assert.equal(fixture.bytes(privacy.productionCommit, "performances/public/data/admin-reference.js", true).data.length, 0,
  "Retired JavaScript data must never be mistaken for executable test input");
for (const args of [["reset", "--hard", old], ["show", old + ":../outside"], ["diff", "--name-only", old, old]])
  assert.throws(() => fixture.fixtureGit("git", args, { cwd: fixture.ROOT }));
const entry = path.join(fixture.ROOT, "tools/release-cycle.py");
const denied = cp.spawnSync(process.execPath, ["-e", "process.argv[1]=process.argv[2];require(process.argv[3]).install()",
  "unused", entry, path.join(__dirname, "helpers/history-git-fixture.js")], { encoding: "utf8" });
assert.notEqual(denied.status, 0, "Operational entry points cannot install this test double");
const base = "b0020e51ebd6e686054efd3451882dd2c1d60d94", candidate = "ef96caca97f70554ee1f2c2b950cebeb5130e85e";
const names = ["closeDueEngagementCompetitions", "notifyEngagementCompetitionDocuments", "prepareEngagementClubRecapEmails",
  "listEngagementCompetitionMailJobs", "prepareEngagementOpeningNotificationEmails", "sendEngagementPreparedEmails", "processNapCompetitionNotifications"];
const rows = names.map(name => ({ name, commit: "1df545a62de67a24ff32ca4d1046cce4be6d499f" }));
const normal = cp.spawnSync(process.execPath, [path.join(__dirname, "release-excluded-backend-compatibility-tests.js"),
  fixture.ROOT, base, candidate, JSON.stringify(rows)], { encoding: "utf8", timeout: 60000 });
const object = cp.spawnSync("git", ["cat-file", "--batch-check=%(objecttype)"], { cwd: fixture.ROOT, input: base + "\n", encoding: "utf8" });
assert.equal(object.status, 0);
if (object.stdout.trim() === "commit") {
  assert.equal(normal.status, 0, normal.stderr);
  const receipt = JSON.parse(normal.stdout); assert.equal(receipt.result, "success");
  assert.equal(receipt.testFixtureOnly, undefined); assert.equal(receipt.fixture, undefined);
} else {
  assert.equal(object.stdout.trim(), base + " missing");
  assert.notEqual(normal.status, 0, "Normal publication proof must remain closed without its original history");
}
console.log("Historical test inputs: exact metadata/code, altered projections, path bounds, missing payloads, writes and operational entry points covered offline.");
