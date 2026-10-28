"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { enabled, project, syncBatch, createSynchronizer, PAGE_SIZE } = require("../functions/nap-club-account-emails");
const { CREATE_SQL, ensure } = require("../functions/nap-club-account-emails-schema");
const { scan, MAX_ACCOUNTS, loadFirebaseSdk } = require("../tools/rebuild-nap-club-account-emails");

const snapshot = (id, data) => ({ id, exists: data !== null, data: () => data });

function fixture() {
  const calls = [], profiles = new Map();
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(query, values) { calls.push({ sql: query.sql, values }); return [[]]; },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); }
  };
  const pool = { async getConnection() { calls.push("connection"); return connection; } };
  const db = {
    collection(name) { assert.equal(name, "users"); return { doc: id => ({ id }) }; },
    async getAll(...args) {
      const options = args.pop();
      assert.deepEqual(options.fieldMask, ["email", "clubId", "status", "emailPreferences.competitionNotifications"]);
      assert.match(calls.at(-1).sql, /FOR UPDATE$/);
      calls.push("read-current");
      return args.map(ref => snapshot(ref.id, profiles.get(ref.id) ?? null));
    }
  };
  return { calls, profiles, connection, pool, db };
}

async function main() {
  // Resolve package exports from functions/, without initializing an app or contacting Firebase.
  const sdk = loadFirebaseSdk();
  for (const name of ["initializeApp", "applicationDefault", "getFirestore"]) assert.equal(typeof sdk[name], "function");
  assert.equal(enabled("livepalmes"), true);
  for (const projectId of ["livepalmes-test", "", undefined, "other"]) {
    const result = await createSynchronizer({ projectId, createPool() { throw Error("TEST opened NAP"); }, db: null })("u");
    assert.equal(result.disabled, true);
    assert.equal((await syncBatch({ projectId })).disabled, true);
  }
  const f = fixture();
  const sync = createSynchronizer({ projectId: "livepalmes", createPool: () => f.pool, db: f.db });
  f.profiles.set("u", { email: " Club@Example.org ", clubId: "17", status: "active" });
  await sync("u");
  let write = f.calls.filter(call => call.sql?.includes("competition_notifications)")).at(-1);
  assert.deepEqual(write.values, ["u", "17", "club@example.org", "active", 1]);
  f.profiles.set("u", { email: "new@example.org", clubId: "42", status: "active", emailPreferences: { competitionNotifications: false } });
  await sync("u"); // Delayed events reread current data, not an obsolete email or club.
  write = f.calls.filter(call => call.sql?.includes("competition_notifications)")).at(-1);
  assert.deepEqual(write.values, ["u", "42", "new@example.org", "active", 0]);
  f.profiles.set("u", { email: "new@example.org", clubId: "42", status: "disabled" });
  await sync("u");
  assert.equal(f.calls.filter(call => call.sql?.includes("competition_notifications)")).at(-1).values[3], "inactive");
  f.profiles.delete("u");
  await sync("u");
  assert.deepEqual(f.calls.filter(call => call.sql?.includes("competition_notifications)")).at(-1).values,
    ["u", null, null, "deleted", 0]);
  f.profiles.set("u", { email: "return@example.org", clubId: "9", status: "active" });
  await sync("u"); // Recreated account, even after a delayed deletion event.
  assert.equal(f.calls.filter(call => call.sql?.includes("competition_notifications)")).at(-1).values[1], "9");
  assert.equal(f.calls.filter(call => call === "commit").length, 5);
  assert.equal(f.calls.filter(call => call === "release").length, 5);
  const grouped = fixture();
  await syncBatch({ projectId: "livepalmes", pool: grouped.pool, db: grouped.db, uids: ["z", "a"] });
  assert.equal(grouped.calls.filter(call => call === "read-current").length, 1);
  assert.equal(grouped.calls.filter(call => call.sql).length, 3);
  assert.deepEqual(grouped.calls.find(call => call.sql).values, ["a", "z"]);
  const failure = fixture();
  failure.connection.execute = async () => { throw new Error("private@example.org SQL bound secret"); };
  await assert.rejects(syncBatch({ projectId: "livepalmes", pool: failure.pool, db: failure.db, uids: ["u"] }),
    error => !error.message.includes("private@") && /reprise/.test(error.message));
  assert.deepEqual(failure.calls.slice(-2), ["rollback", "release"]);
  for (const uids of [[], ["a", "a"], ["a/b"], Array(PAGE_SIZE + 1).fill("u")]) {
    await assert.rejects(syncBatch({ projectId: "livepalmes", pool: null, db: null, uids }));
  }
  assert.throws(() => project(snapshot("u", { email: "bad address" })));
  assert.equal(project(snapshot("u", { email: "admin@example.org", status: "active" })).clubId, null);
  const sql = [];
  let created = false;
  const columns = [
    ["firebase_uid", "varchar(128)", "NO", "utf8mb4_bin"], ["club_id", "varchar(40)", "YES", "utf8mb4_bin"],
    ["email", "varchar(254)", "YES", "utf8mb4_bin"], ["status", "enum('active','inactive','deleted')", "NO", "utf8mb4_bin"],
    ["competition_notifications", "tinyint(3) unsigned", "NO", null], ["synchronized_at", "timestamp(6)", "NO", null]
  ].map(([COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME]) => ({ COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME }));
  const schemaPool = { async execute(query) {
    sql.push(query.sql);
    if (query.sql === CREATE_SQL) { created = true; return [[]]; }
    if (query.sql.includes("schema.COLUMNS")) return [created ? columns : []];
    if (query.sql.includes("schema.STATISTICS")) return [[
      { INDEX_NAME: "club_status", NON_UNIQUE: 1, SEQ_IN_INDEX: 1, COLUMN_NAME: "club_id" },
      { INDEX_NAME: "club_status", NON_UNIQUE: 1, SEQ_IN_INDEX: 2, COLUMN_NAME: "status" },
      { INDEX_NAME: "PRIMARY", NON_UNIQUE: 0, SEQ_IN_INDEX: 1, COLUMN_NAME: "firebase_uid" }
    ]];
    return [[{ ENGINE: "InnoDB" }]];
  } };
  await ensure(schemaPool);
  assert.ok(sql.includes(CREATE_SQL));
  assert.equal((await ensure(schemaPool)).created, false);
  assert.equal(sql.filter(query => query === CREATE_SQL).length, 1);
  columns[0].COLLATION_NAME = "utf8mb4_general_ci";
  await assert.rejects(ensure(schemaPool), /incompatible/);
  assert.doesNotMatch(CREATE_SQL, /DROP|ALTER|password/i);
  assert.match(CREATE_SQL, /KEY club_status \(club_id, status\)/);
  let readCount = 0;
  function pagedDb(total) {
    return { collection(name) {
      assert.equal(name, "users"); let after = 0;
      const query = { select() { return query; }, orderBy() { return query; }, limit(size) { assert.equal(size, 100); return query; },
        startAfter(id) { after = Number(id); return query; }, async get() {
          readCount++;
          const docs = Array.from({ length: Math.min(100, Math.max(0, total - after)) }, (_, i) => ({ id: String(after + i + 1).padStart(5, "0") }));
          return { size: docs.length, docs };
        } };
      return query;
    } };
  }
  let visited = 0;
  assert.equal(await scan(pagedDb(205), "id", async ids => { visited += ids.length; }), 205);
  assert.equal(visited, 205);
  assert.equal(readCount, 3);
  await assert.rejects(scan(pagedDb(MAX_ACCOUNTS + 1), "id"), /budget/);
  const index = fs.readFileSync("functions/index.js", "utf8");
  assert.match(index, /ENVIRONMENT.projectId === "livepalmes" \? \{ secrets: \[defineSecret\("LIVEPALMES_NAP_PASSWORD"\)\]/);
  assert.match(index, /exports.syncNapClubAccountEmails = onDocumentWritten\(/);
  const mailTrigger = index.slice(index.indexOf("exports.syncEngagementMailRecipientIndex ="), index.indexOf("exports.rebuildEngagementMailRecipientIndexNextPage ="));
  assert.doesNotMatch(mailTrigger, /syncNapClubAccountEmail|LIVEPALMES_NAP_PASSWORD/);
  console.log("NAP account emails: PROD-only guard, lifecycle, current reads under SQL locks, preferences, rollback/privacy and bounded pages passed offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
