"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), { spawnSync } = require("node:child_process");
const { definitions, matching } = require("../tools/account-history-test-indexes");
assert.deepEqual(definitions.map(fields => fields.map(field => [field.fieldPath, field.order])), [
  [["status", "ASCENDING"], ["resolvedAt", "DESCENDING"], ["__name__", "DESCENDING"]],
  [["regionId", "ASCENDING"], ["status", "ASCENDING"], ["resolvedAt", "DESCENDING"], ["__name__", "DESCENDING"]]
]);
const good = { name: "projects/livepalmes-test/databases/(default)/collectionGroups/engagementAccessRequests/indexes/id", queryScope: "COLLECTION", fields: definitions[0] };
assert.equal(matching(good, definitions[0]), true);
assert.equal(matching({ ...good, name: good.name.replace("livepalmes-test", "livepalmes") }, definitions[0]), false);
assert.equal(matching({ ...good, fields: definitions[1] }, definitions[0]), false);
assert.equal(matching({ ...good, queryScope: "COLLECTION_GROUP" }, definitions[0]), false);
let result = spawnSync(process.execPath, ["tools/account-history-test-indexes.js"], { encoding: "utf8" });
assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).project, "livepalmes-test");
result = spawnSync(process.execPath, ["tools/account-history-test-indexes.js", "--apply-test"], { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" } });
assert.notEqual(result.status, 0); assert.match(result.stderr, /workflow main TEST/);
const source = fs.readFileSync("tools/account-history-test-indexes.js", "utf8");
assert.ok(!/\["firestore", "(?:documents|indexes", "composite", "delete)/.test(source));
console.log("Index historique : deux définitions exactes, ajout TEST uniquement, exécution locale refusée, zéro suppression OK");
