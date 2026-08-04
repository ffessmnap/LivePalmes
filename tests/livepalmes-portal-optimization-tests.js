const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const portal = read("assets/livepalmes-admin-portal.js");
const records = read("performances/public/admin-records.js");
const imports = read("performances/public/import-competitions.js");
const publicSeries = read("assets/pages/series-public.js");
const publicResults = read("assets/pages/resultats.js");
const functions = read("functions/index.js");
const firebase = JSON.parse(read("firebase.json"));
const indexes = JSON.parse(read("firestore.indexes.json"));
const clubReferenceSource = read("performances/public/data/club-reference.js");
const sandbox = { window: {} };
vm.runInNewContext(clubReferenceSource, sandbox);

assert.ok(Array.isArray(sandbox.window.LIVEPALMES_CLUB_REFERENCE?.clubs));
assert.equal(Object.hasOwn(sandbox.window.LIVEPALMES_CLUB_REFERENCE, "swimmers"), false);
assert.equal(portal.includes("LIVEPALMES_ADMIN_REFERENCE"), false);
assert.equal(records.includes("LIVEPALMES_ADMIN_REFERENCE"), false);
assert.ok(firebase.hosting.ignore.includes("performances/public/data/admin-reference.js"));
assert.equal(firebase.firestore.indexes, "firestore.indexes.json");
assert.ok(indexes.indexes.some((index) => index.collectionGroup === "users"));
assert.equal(portal.includes("withTimeout(loadRemoteRecordsData"), false);
assert.ok(imports.includes('global.location.hash === "#import-competitions"'));
assert.ok(functions.includes("DTN_QUALIFICATION_MAX_ROWS_PER_COURSE + 1"));
assert.equal(functions.includes('licenseUpdatedBy: "engagement-roster-migration"'), false);
assert.ok(functions.includes("revokeRefreshTokens(uid)"));
assert.ok(functions.includes("nextPortalAccessRateLimit"));
assert.ok(publicSeries.includes("restoredPublicSeriesCache"));
assert.ok(publicSeries.includes("Index publics indisponibles."));
assert.ok(publicResults.includes("restoredPublicResultsCache"));

console.log("Optimisations portail : OK");
