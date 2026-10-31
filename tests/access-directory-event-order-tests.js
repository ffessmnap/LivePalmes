"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createDirectoryService } = require("../functions/server-directory-service");
const { createDirectorySyncService } = require("../functions/server-directory-sync-service");

const DELETE = Symbol("delete");
const copy = value => value === DELETE ? DELETE : Array.isArray(value) ? value.map(copy)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)])) : value;
function merge(target, patch) {
  const next = copy(target || {});
  for (const [key, value] of Object.entries(patch)) {
    if (value === DELETE) delete next[key];
    else next[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(next[key], value) : copy(value);
  }
  return next;
}
function profile(clubId = "518", regionId = "13", extra = {}) {
  return { clubId, clubName: `Club fictif ${clubId}`, regionId, status: "active", firstName: "Fictif",
    capabilities: { "engagements.club.manage": true }, accessScopes: { "engagements.club.manage": { scopeType: "club", scopeId: clubId } },
    lastLoginAt: "2026-01-01T00:00:00Z", ...extra };
}
function fixture(current = profile(), status = "ready") {
  const documents = new Map(), versions = new Map(), reads = [], commits = [];
  const put = (key, value) => { if (value === null) documents.delete(key); else documents.set(key, copy(value)); versions.set(key, (versions.get(key) || 0) + 1); };
  put("users/fictif", current);
  if (status !== null) put("state/default", { status });
  put("snapshots/national", { entries: { unrelated: { clubId: "999" } } });
  const snapshot = key => ({ exists: documents.has(key), data: () => copy(documents.get(key)) });
  const f = { documents, reads, commits, put, beforeCommit: null, failCommit: false };
  const db = {
    collection(name) { assert.equal(name, "users", "No collection scan or new collection"); return { doc: uid => ({ key: `users/${uid}` }) }; },
    async runTransaction(update, options) {
      assert.equal(options.maxAttempts, 5);
      for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        const seen = new Map(), writes = [];
        const transaction = {
          async getAll(...refs) { assert.equal(writes.length, 0, "All reads precede writes"); assert.equal(refs.length, 2);
            reads.push(refs.map(ref => ref.key));
            return refs.map(ref => { seen.set(ref.key, versions.get(ref.key) || 0); return snapshot(ref.key); }); },
          set(ref, value, settings) { assert.equal(settings.merge, true); assert(ref.key.startsWith("snapshots/"), "Never write users or rights"); writes.push([ref.key, copy(value)]); }
        };
        await update(transaction);
        if (f.beforeCommit) await f.beforeCommit(attempt);
        if ([...seen].some(([key, version]) => (versions.get(key) || 0) !== version)) continue;
        if (f.failCommit) throw new Error("fictional transaction unavailable");
        for (const [key, value] of writes) put(key, merge(documents.get(key), value));
        commits.push(writes.map(([key]) => key));
        return;
      }
      throw new Error("fictional contention exhausted");
    }
  };
  const context = { db, FieldValue: { delete: () => DELETE }, ACCESS_DIRECTORY_SNAPSHOT_VERSION: 2,
    activeCapabilitiesFromMap: values => Object.keys(values).filter(key => values[key] === true),
    accessUserRegionIdFromData: data => data.regionId,
    accessDirectorySnapshotStateRef: () => ({ key: "state/default" }),
    accessDirectorySnapshotRef: (type, id) => ({ key: type === "national" ? "snapshots/national" : `snapshots/region:${id}` }),
    accessDirectorySnapshotEntryKey: () => "fictif" };
  const service = createDirectorySyncService({ ...context, ...createDirectoryService(context) });
  f.sync = (before, after) => service.syncAccessDirectorySnapshotFromUserChange("fictif", before, after, "2026-10-31T00:00:00Z");
  f.entry = key => documents.get(key)?.entries?.fictif;
  return f;
}

async function main() {
  const old = profile(), current = profile("126");
  const f = fixture(current);
  await f.sync(old, current);
  const delayedLogin = { ...old, lastLoginAt: "2026-01-01T00:00:01Z" };
  await f.sync(old, delayedLogin);
  assert.equal(f.entry("snapshots/national").clubId, "126");
  assert.equal(f.entry("snapshots/region:13").clubId, "126");
  assert.equal(f.entry("snapshots/national").accessScopes["engagements.club.manage"].scopeId, "126");
  assert.deepEqual(f.entry("snapshots/national").capabilities, ["engagements.club.manage"]);
  assert.deepEqual(f.documents.get("users/fictif"), current, "Profile and rights untouched");
  assert.deepEqual(f.documents.get("snapshots/national").entries.unrelated, { clubId: "999" });
  const previous = copy(f.documents.get("snapshots/national"));
  await f.sync(old, delayedLogin);
  assert.deepEqual(f.documents.get("snapshots/national"), previous, "Duplicate delivery is idempotent");
  assert(f.reads.every(refs => refs.length === 2));

  const concurrent = fixture(old);
  concurrent.beforeCommit = attempt => { if (attempt === 0) concurrent.put("users/fictif", current); };
  await concurrent.sync(null, old);
  assert.equal(concurrent.reads.length, 2, "Concurrent current-profile change retries transaction");
  assert.equal(concurrent.entry("snapshots/national").clubId, "126");
  assert.equal(concurrent.commits.length, 1, "Stale attempted writes were never committed");

  const moving = fixture(profile("126", "3"));
  moving.put("snapshots/region:13", { entries: { fictif: { clubId: "518" }, unrelated: { clubId: "999" } } });
  moving.put("snapshots/region:8", { entries: { fictif: { clubId: "older" } } });
  await moving.sync(old, profile("123", "8"));
  assert.equal(moving.entry("snapshots/region:13"), undefined);
  assert.equal(moving.entry("snapshots/region:8"), undefined);
  assert.equal(moving.entry("snapshots/region:3").clubId, "126");
  assert.equal(moving.commits[0].length, 4, "National plus at most three region hints");
  assert.equal(moving.documents.get("snapshots/region:13").entries.unrelated.clubId, "999");

  const deleted = fixture(null);
  deleted.put("snapshots/national", { entries: { fictif: { clubId: "126" } } });
  deleted.put("snapshots/region:13", { entries: { fictif: { clubId: "126" } } });
  await deleted.sync(null, old);
  assert.equal(deleted.entry("snapshots/national"), undefined, "Old creation cannot resurrect a deleted profile");
  assert.equal(deleted.entry("snapshots/region:13"), undefined);

  const recreated = fixture(current);
  await recreated.sync(old, null);
  assert.equal(recreated.entry("snapshots/national").clubId, "126", "Old deletion cannot erase a recreated profile");

  const restored = fixture(old);
  await restored.sync(current, { ...current, lastLoginAt: "2026-01-01T00:00:03Z" });
  assert.equal(restored.entry("snapshots/national").clubId, "518", "A delayed post-transfer event cannot undo a later restoration");

  const national = fixture(profile("126", "13", { capabilities: { "engagements.national.manage": true } }));
  national.put("snapshots/region:13", { entries: { fictif: { clubId: "518" } } });
  await national.sync(null, old);
  assert.equal(national.entry("snapshots/region:13"), undefined);
  assert.equal(national.entry("snapshots/national").clubId, "126");

  const inactive = fixture(profile("126", "13", { status: "inactive" }));
  await inactive.sync(null, old);
  assert.equal(inactive.entry("snapshots/national").status, "inactive", "Never reactivate from a delayed event");
  for (const status of [null, "missing", "building"]) {
    const state = fixture(current, status);
    await state.sync(null, old);
    assert.equal(state.commits[0].length > 0, status === "building", "No implicit index rebuild");
  }
  const noop = fixture(current);
  await noop.sync(current, current);
  assert.equal(noop.reads.length, 0);
  const reset = fixture(current);
  reset.beforeCommit = attempt => { if (attempt === 0) reset.put("state/default", { status: "missing" }); };
  await reset.sync(old, current);
  assert.equal(reset.entry("snapshots/national"), undefined, "Index-state changes are transactional too");

  const failed = fixture(current);
  failed.failCommit = true;
  await assert.rejects(failed.sync(null, old), /transaction unavailable/);
  assert.equal(failed.entry("snapshots/national"), undefined);
  const contention = fixture(old);
  contention.beforeCommit = attempt => contention.put("users/fictif", profile(String(100 + attempt)));
  await assert.rejects(contention.sync(null, old), /contention exhausted/);
  assert.equal(contention.reads.length, 5, "At most ten document reads");
  assert.equal(contention.commits.length, 0);

  // Exercise the actual trigger wrapper without loading Firebase or sending mail.
  const index = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
  const marker = "exports.syncEngagementMailRecipientIndex = onDocumentWritten(";
  const trigger = index.slice(index.indexOf(marker), index.indexOf("exports.rebuildEngagementMailRecipientIndexNextPage", index.indexOf(marker)));
  assert.match(trigger, /retry: true/);
  const fn = trigger.slice(trigger.indexOf("async (event) =>"), trigger.lastIndexOf("});") + 1);
  const handler = vm.runInNewContext(`(${fn})`, { cleanText: value => String(value || "").trim(),
    engagementMailRecipientFromUserDoc: () => ({ capabilities: [] }),
    syncAccessDirectorySnapshotFromUserChange: async () => { throw new Error("retry private snapshot"); },
    engagementMailRecipientIndexKey: () => "fictif", FieldValue: { delete: () => DELETE }, console });
  await assert.rejects(handler({ params: { uid: "fictif" }, data: { before: { exists: false }, after: { exists: false } } }), /retry private snapshot/);
  console.log("Private access directory: stale/duplicate events, concurrent retry, region cleanup, deletion/recreation, unchanged rights, bounded reads and trigger retry passed offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
