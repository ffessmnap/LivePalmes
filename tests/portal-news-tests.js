"use strict";
const assert = require("node:assert/strict");
const { managePortalNews, INITIAL_ENTRY, MAX_ENTRIES } = require("../functions/portal-news");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function fixture() {
  let content;
  const counts = { reads: 0, writes: 0 };
  const profiles = { national: { status: "active", capabilities: { "engagements.national.manage": true } },
    regional: { status: "active", capabilities: { "engagements.region.manage": true } },
    club: { status: "active", capabilities: { "engagements.club.manage": true } },
    full: { status: "active", capabilities: { "admin.full": true } },
    revoked: { status: "inactive", capabilities: { "engagements.national.manage": true } } };
  const snapshot = value => ({ exists: value !== undefined, data: () => structuredClone(value) });
  const db = {
    collection(name) {
      assert.ok(["users", "engagementConfigurations"].includes(name));
      return { doc(id) { if (name === "engagementConfigurations") assert.equal(id, "portalNews");
        return { async get() { counts.reads++; return snapshot(name === "users" ? profiles[id] : content); } };
      } };
    },
    async runTransaction(fn, options) {
      assert.equal(options.maxAttempts, 5);
      return fn({ get: ref => ref.get(), set(ref, data) { counts.writes++; content = structuredClone(data); } });
    }
  };
  const call = (uid, data, token = {}) => managePortalNews({ db, HttpsError, ADMIN_UIDS: new Set(["legacy"]) }, { auth: uid ? { uid, token } : null, data });
  return { call, counts, set: value => { content = value; }, get: () => content };
}
async function main() {
  const f = fixture(), initial = await f.call("regional", { action: "list" });
  assert.deepEqual(initial, { revision: 0, entries: [INITIAL_ENTRY] });
  assert.deepEqual(f.counts, { reads: 2, writes: 0 }, "One live profile and one content read; never seed on read");
  for (const uid of [null, "club", "revoked", "absent"]) await assert.rejects(f.call(uid, { action: "list" }), error => ["permission-denied", "unauthenticated"].includes(error.code));
  await assert.rejects(f.call("club", { action: "list" }, { livepalmesCapabilities: { "admin.full": true } }), { code: "permission-denied" }, "Claims cannot grant permissions absent from the live profile");
  for (const action of ["save", "delete"]) await assert.rejects(f.call("regional", { action, expectedRevision: 0, id: INITIAL_ENTRY.id }), { code: "permission-denied" });
  assert.equal(f.counts.writes, 0);
  for (const text of ["  \n ", "a".repeat(8001), Array(82).join("x\n")]) await assert.rejects(f.call("national", { action: "save", text, publishedAt: "2026-11-01T18:00:00Z", expectedRevision: 0 }), { code: "invalid-argument" });
  const created = await f.call("national", { action: "save", text: "Nouveauté récente\n\nDeuxième ligne <script>alert(1)</script>", publishedAt: "2026-11-01T18:00:00Z", expectedRevision: 0 });
  assert.equal(created.entries.length, 2); assert.equal(created.entries[0].lines.length, 2);
  assert.equal(f.get().entries.find(item => item.id === created.entries[0].id).updatedBy, "national");
  assert.deepEqual(created.entries[1], INITIAL_ENTRY, "First write adopts the original publication atomically");
  const reads = f.counts.reads, writes = f.counts.writes;
  await assert.rejects(f.call("national", { action: "delete", id: INITIAL_ENTRY.id, expectedRevision: 0 }), { code: "aborted" });
  assert.equal(f.counts.reads - reads, 2); assert.equal(f.counts.writes, writes, "Stale writes never overwrite another editor");
  const edited = await f.call("full", { action: "save", id: INITIAL_ENTRY.id, text: "Ancienne publication corrigée", publishedAt: INITIAL_ENTRY.publishedAt, expectedRevision: 1 });
  assert.equal(edited.entries[1].id, INITIAL_ENTRY.id); assert.deepEqual(edited.entries[1].lines, ["Ancienne publication corrigée"]);
  assert.equal(Date.parse(edited.entries[1].publishedAt), Date.parse(INITIAL_ENTRY.publishedAt), "Editing preserves the publication date/order");
  let deleted = await f.call("national", { action: "delete", id: INITIAL_ENTRY.id, expectedRevision: 2 });
  deleted = await f.call("national", { action: "delete", id: deleted.entries[0].id, expectedRevision: 3 });
  assert.deepEqual(deleted.entries, []); assert.deepEqual((await f.call("regional", { action: "list" })).entries, [], "Deleted seed never reappears");
  await assert.rejects(f.call("national", { action: "delete", id: "missing", expectedRevision: 4 }), { code: "not-found" });
  const full = Array.from({ length: MAX_ENTRIES }, (_, i) => ({ ...INITIAL_ENTRY, id: "entry-" + i }));
  f.set({ revision: 10, entries: full });
  await assert.rejects(f.call("national", { action: "save", text: "One more", publishedAt: INITIAL_ENTRY.publishedAt, expectedRevision: 10 }), { code: "resource-exhausted" });
  f.set({ revision: 10, entries: full.map(item => ({ ...item, lines: ["é".repeat(4000)] })) });
  await assert.rejects(f.call("national", { action: "save", id: "entry-0", text: "Corrected", publishedAt: INITIAL_ENTRY.publishedAt, expectedRevision: 10 }), { code: "resource-exhausted" });
  f.set(undefined);
  assert.equal((await f.call("legacy", { action: "list" })).entries.length, 1);
  console.log("Portal news: live permissions, bounded reads/writes, original publication, CRUD, chronology, conflicts, empty state and capacity verified offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
