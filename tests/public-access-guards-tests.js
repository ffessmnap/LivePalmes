"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), crypto = require("node:crypto");
const { cleanPublicAccessName, nextPortalAccessRateLimit } = require("../functions/portal-access-protection");
const { createDirectoryService_consumePublicAccessRequestRateLimit } = require("../functions/backend/server-directory-service/consume-public-access-request-rate-limit");
const { createDirectoryService_cleanEngagementAccessRequestPayload } = require("../functions/backend/server-directory-service/clean-engagement-access-request-payload");
const cache = require("../functions/public-club-directory-cache");
class HttpsError extends Error { constructor(code, message, details) { super(message); Object.assign(this, { code, details }); } }
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
function quotaFixture() {
  const rows = new Map(), stats = { reads: 0, writes: 0, transactions: 0 }; let queue = Promise.resolve();
  const db = { collection(name) { assert.equal(name, "fixture-rates"); return { doc: id => ({ id }) }; },
    runTransaction(callback, options) {
      assert.equal(options.maxAttempts, 5);
      const work = queue.then(async () => {
        stats.transactions++; const writes = []; let hasWrite = false, reads = 0;
        const value = await callback({ async get(ref) { assert.equal(hasWrite, false, "All reads precede every write"); stats.reads++; reads++; return { data: () => rows.get(ref.id) }; },
          set(ref, data, opts) { assert.equal(opts.merge, false); hasWrite = true; writes.push([ref.id, data]); } });
        assert.equal(reads, 2); assert.equal(writes.length, 2);
        for (const [id, data] of writes) rows.set(id, structuredClone(data)); stats.writes += writes.length; return value;
      });
      queue = work.catch(() => {}); return work;
    } };
  const guard = createDirectoryService_consumePublicAccessRequestRateLimit({ db, HttpsError, stableHash: hash,
    cleanText: value => String(value || "").trim(), PORTAL_ACCESS_RATE_LIMIT_COLLECTION: "fixture-rates", nextPortalAccessRateLimit }).consumePublicAccessRequestRateLimit;
  return { rows, stats, guard };
}
const request = (uid = "", agent = "fixture-browser", ip = "192.0.2.1") => ({ ...(uid ? { auth: { uid } } : {}), rawRequest: { headers: { "user-agent": agent, "x-forwarded-for": ip } } });
const start = Date.parse("2026-11-16T10:00:00Z"), time = offset => new Date(start + offset).toISOString();
async function main() {
  for (const name of ["Élodie", "D’Ávila", "O'Connor", "Jean‑Pierre", "J.-Pierre", "St. John", "Светлана", "ليلى", "张伟", "ジャン・ピエール", "محمد‌رضا"]) assert.equal(cleanPublicAccessName(name), name.normalize("NFC"));
  assert.equal(cleanPublicAccessName("  Anne   Marie  "), "Anne Marie");
  for (const name of ["", "123", "<b>Alice</b>", "Alice\nBob", "https://example.invalid", "www.example.invalid", "example.com", "a@example.invalid", "x".repeat(81), null, {}]) {
    assert.throws(() => cleanPublicAccessName(name), error => error instanceof TypeError && !error.message.includes("example.invalid"));
  }
  const cleaner = createDirectoryService_cleanEngagementAccessRequestPayload({ HttpsError,
    cleanText: value => String(value || "").trim(), normalizeEmail: value => String(value || "").trim().toLowerCase(), assertEmail: value => assert(value.includes("@")) }).cleanEngagementAccessRequestPayload;
  const payload = { firstName: "Élodie", lastName: "D’Ávila", email: "fixture@example.invalid", clubId: "fixture-club", regionId: "CMAS" };
  assert.equal(cleaner(payload).lastName, "D’ÁVILA");
  assert.throws(() => cleaner({ ...payload, firstName: "https://example.invalid" }), error => error.code === "invalid-argument");
  {
    const f = quotaFixture(); await f.guard(request(), time(0), payload);
    assert.equal(f.stats.reads, 2); assert.equal(f.stats.writes, 2);
    assert(f.rows.has(hash("192.0.2.1|fixture-browser").slice(0, 40)), "Legacy anonymous identity is preserved");
    await assert.rejects(() => f.guard(request("", "another-browser", "192.0.2.2"), time(1000), payload), error => error.code === "resource-exhausted" && error.details.retryAfterSeconds === 14);
    assert.equal(f.stats.writes, 2, "Rejected transaction writes no counter, including a new identity");
    for (let i = 1; i < 8; i++) await f.guard(request("", "browser-" + i), time(i * 16000), payload);
    await assert.rejects(() => f.guard(request(), time(8 * 16000), payload), error => error.code === "resource-exhausted");
    await f.guard(request(), time(61 * 60 * 1000), payload);
    const persisted = JSON.stringify([...f.rows]);
    for (const value of [payload.email, "192.0.2.1", "fixture-browser"]) assert(!persisted.includes(value), "Only hashed identities and existing counter fields are stored");
  }
  {
    const f = quotaFixture(); await f.guard(request("fixture-account"), time(0), payload);
    await assert.rejects(() => f.guard(request("fixture-account", "changed"), time(1000), { email: "other@example.invalid" }), error => error.code === "resource-exhausted");
    assert.equal(f.stats.writes, 2, "A connected account cannot bypass the limiter or change address to evade it");
    const results = await Promise.allSettled([f.guard(request("second-account"), time(20000), payload), f.guard(request("second-account"), time(20000), payload)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1, "Concurrent requests consume one allowance atomically");
    assert(!JSON.stringify([...f.rows]).includes("fixture-account"));
    await assert.rejects(() => f.guard(request(), time(0), {}), error => error.code === "invalid-argument");
  }
  {
    let now = 0, reads = 0, release, load = () => new Promise(resolve => { release = resolve; });
    const read = cache.createPublicClubDirectoryReader(() => { reads++; return load(); }, { now: () => now });
    const a = read(), b = read(); await Promise.resolve(); assert.equal(reads, 1);
    const original = { ok: true, source: "nap", clubs: [{ clubId: "fixture-club", clubName: "Fixture" }], sqlBudget: { queriesMax: 1, rowsMax: 1001 } };
    release(original); const [first, second] = await Promise.all([a, b]); first.clubs[0].clubName = "Changed"; assert.equal(second.clubs[0].clubName, "Fixture");
    now = 29999; assert.equal((await read()).clubs[0].clubName, "Fixture"); assert.equal(reads, 1);
    now = 30000; load = () => Promise.reject(Error("fixture-unavailable")); await assert.rejects(read, /fixture-unavailable/); assert.equal(reads, 2);
    load = () => Promise.resolve(original); await read(); assert.equal(reads, 3, "Failure is not cached and expired data is never a fallback");
    now += 30000; load = () => Promise.resolve({ ...original, clubs: Array.from({ length: 1001 }, () => ({})) }); await assert.rejects(read, /invalide/);
  }
  {
    let reads = 0; const pool = { async execute(query) { reads++; assert(query.sql.includes("LIMIT 1001")); return [[{ num_club: 1, federal_club: "0100001", nom_club: "Fixture", abre_club: "FIX", actif_club: 1, comite_club: 1 }]]; } };
    await cache.directory(pool); await cache.directory(pool); assert.equal(reads, 1);
    await require("../functions/nap-club-directory-page").directory(pool); await require("../functions/nap-club-directory-page").directory(pool);
    assert.equal(reads, 3, "Private directory reads remain fresh and bypass the public cache");
    const other = { async execute() { return [[]]; } }; assert.equal((await cache.directory(other)).clubs.length, 0, "No cross-pool cache reuse");
  }
  console.log("Public access: international names, link rejection, stable anonymous/account quotas, atomic budgets, private-read separation and public cache outage/recovery verified offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
