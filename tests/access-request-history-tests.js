"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const { listHistory } = require("../functions/access-request-history");
const ui = require("../assets/livepalmes-access-request-history");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
async function main() {
  let trace = [], documents = [], profiles = [], batch = [];
  const query = Object.fromEntries(["where", "orderBy", "startAfter", "limit"].map(name => [name, (...args) => { trace.push([name, ...args]); return query; }]));
  query.get = async () => ({ docs: documents });
  const db = { collection: name => { trace.push(["collection", name]); return name === "users" ? { doc: id => ({ id }) } : query; },
    getAll: async (...refs) => { batch = refs; return profiles; } };
  const args = { db, HttpsError, FieldPath: { documentId: () => "__name__" }, item: doc => ({ id: doc.id, ...doc.data() }), context: { region: true, regionId: "IDF" } };
  for (const context of [{}, { region: true }, { region: true, regionId: "" }]) {
    await assert.rejects(listHistory({ ...args, context }), e => ["permission-denied", "failed-precondition"].includes(e.code));
    assert.equal(trace.length, 0, "Refuser avant toute lecture");
  }
  await assert.rejects(listHistory({ ...args, input: { cursor: { id: "bad/path", resolvedAt: "today" } } }), e => e.code === "invalid-argument");
  const stamp = "2026-10-26T13:32:00.000Z";
  documents = Array.from({ length: 26 }, (_, index) => ({ id: `request-${String(30-index).padStart(2,"0")}`, data: () => ({ resolvedAt: stamp, status: index % 2 ? "rejected" : "approved", resolvedBy: "actor", resolvedByEmail: "old@example.invalid" }) }));
  profiles = [{ id: "actor", exists: true, data: () => ({ firstName: "Camille", lastName: "Martin", email: "private@example.invalid", capabilities: { "admin.full": true } }) }];
  const page = await listHistory(args);
  assert.equal(page.requests.length, 25); assert.deepEqual(page.nextCursor, { resolvedAt: stamp, id: "request-06" });
  assert.deepEqual(batch, [{ id: "actor" }]); assert.equal(page.requests[0].resolvedByName, "Camille Martin");
  assert.equal(page.requests[0].capabilities, undefined); assert.equal(page.requests[0].email, undefined);
  assert.ok(trace.some(row => JSON.stringify(row) === JSON.stringify(["where", "regionId", "==", "IDF"])));
  assert.ok(trace.some(row => JSON.stringify(row) === JSON.stringify(["where", "status", "in", ["approved", "rejected"]])));
  assert.deepEqual(trace.filter(row => row[0] === "orderBy"), [["orderBy", "resolvedAt", "desc"], ["orderBy", "__name__", "desc"]]);
  assert.deepEqual(trace.find(row => row[0] === "limit"), ["limit", 26]);
  trace = []; documents = documents.slice(-1); profiles = [];
  const tail = await listHistory({ ...args, context: { national: true }, input: { cursor: page.nextCursor } });
  assert.equal(tail.nextCursor, null); assert.equal(tail.requests[0].resolvedByName, "");
  assert.ok(!trace.some(row => row[1] === "regionId"));
  assert.deepEqual(trace.find(row => row[0] === "startAfter"), ["startAfter", stamp, "request-06"]);
  documents = []; batch = []; await listHistory(args); assert.equal(batch.length, 0);
  const html = ui.card({ ...page.requests[0], firstName: "<script>", resolvedByName: 'Camille <admin>', status: "rejected", resolutionReason: '<img src=x onerror="bad()">' });
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("<img")); assert.ok(html.includes("&lt;admin&gt;"));
  assert.ok(html.includes("14:32")); assert.ok(html.includes("Compte validé") === false); assert.ok(html.includes("Motif du refus"));
  assert.equal(ui.dateLabel("invalid"), "Date non renseignée");
  const index = fs.readFileSync("functions/index.js", "utf8");
  const callable = index.slice(index.indexOf("exports.listEngagementAccessRequests ="), index.indexOf("exports.resolveEngagementAccessRequest ="));
  assert.ok(callable.indexOf("engagementAccessContext(request)") < callable.indexOf('status === "history"'));
  assert.ok(callable.includes('require("./access-request-history").listHistory'));
  console.log("Historique comptes : région imposée, refus avant lecture, 26 demandes + 25 auteurs maximum, pagination stable, anciens auteurs et échappement OK");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
