"use strict";
const assert = require("node:assert/strict");
const { createPerformanceWriter } = require("../functions/nap-performance-write");
const { fingerprint } = require("../functions/nap-performance-change-plan");
const row = { id: 973, nageur: 168, compet: 2, course: "100SF", cat: "S", tps: "14200", points: "0", newpoints: "0", passage: 0, club: "106", relais: 0, pid: null, classement: 1 };
const operationId = "11111111-1111-4111-8111-111111111111";
function fixture(options = {}) {
  const state = { row: { ...row }, hidden: false, journal: null, journals: new Map(), writes: 0, pooled: 0, released: 0, tables: false, authorized: false, lostReply: options.lostReply };
  const conn = { release() { state.released++; }, async query({ sql }) {
    if (sql.startsWith("LOCK TABLES")) state.tables = true;
    else if (sql === "UNLOCK TABLES") state.tables = false;
    else throw Error(`Unexpected query: ${sql}`);
    return [undefined];
  }, async execute({ sql }, values = []) {
    assert.ok(state.authorized, "authorization before every database access");
    assert.equal((sql.match(/\?/g) || []).length, values.length);
    if (sql.includes("GET_LOCK")) return [[{ acquired: options.busy ? 0 : 1 }]];
    if (sql.includes("RELEASE_LOCK")) { state.namedReleased = true; return [[{ released: 1 }]]; }
    if (sql.includes("information_schema.TRIGGERS")) return [options.trigger ? [{}] : []];
    if (sql.startsWith("SELECT") && sql.includes("FROM perfs")) return [state.row ? [{ ...state.row }] : []];
    if (sql.startsWith("SELECT hidden")) return [[{ hidden: state.hidden ? 1 : 0 }]];
    if (sql.startsWith("SELECT performance_id")) return [state.journals.has(values[0]) ? [{ ...state.journals.get(values[0]) }] : []];
    if (sql.startsWith("SELECT num_club")) return [options.missingClub ? [] : [{ num_club: values[0] }]];
    if (sql.startsWith("INSERT INTO livepalmes_performance_changes")) {
      assert.ok(state.tables); assert.equal(state.journals.has(values[0]), false);
      state.journal = { performance_id: values[1], action: values[3], reason: values[4], before_image: values[5], after_image: values[6], created_by: values[7], status: "prepared" };
      state.journals.set(values[0], state.journal);
      assert.deepEqual(JSON.parse(values[5]).row, row); return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("UPDATE livepalmes_performance_changes")) { state.journals.get(values[0]).status = "completed"; return [{ affectedRows: 1 }]; }
    assert.ok(state.tables && state.journal, "durable before image before native/visibility mutation");
    if (sql.startsWith("UPDATE perfs")) {
      const fields = sql.match(/SET (.+) WHERE/)[1].split(",").map(s => s.match(/`([^`]+)`/)[1]);
      fields.forEach((field, i) => { state.row[field] = ["points", "newpoints"].includes(field) ? String(values[i]) : values[i]; }); state.writes++;
      if (state.lostReply) { state.lostReply = false; throw Error("reply lost after native write"); }
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("DELETE FROM perfs")) { state.row = null; state.writes++; return [{ affectedRows: 1 }]; }
    if (sql.startsWith("DELETE FROM livepalmes_performance_visibility")) { state.hidden = false; return [{ affectedRows: 1 }]; }
    if (sql.startsWith("INSERT INTO livepalmes_performance_visibility")) { state.hidden = Boolean(values[1]); state.writes++; return [{ affectedRows: 1 }]; }
    throw Error(`Unexpected statement: ${sql}`);
  } };
  const writer = createPerformanceWriter({ async authorize() { if (options.denied) throw Error("denied"); state.authorized = true; return { uid: "national", national: options.national !== false }; }, async getPool() { state.pooled++; return { execute: (...args) => conn.execute(...args), async getConnection() { return conn; } }; } });
  return { state, writer };
}
const input = { operationId, performanceId: 973, expectedFingerprint: fingerprint(row), action: "correct", reason: "Correction verifiee", patch: { classement: 2 } };
(async () => {
  let f = fixture();
  assert.equal((await f.writer.read({}, 973)).fingerprint, input.expectedFingerprint);
  await f.writer.change({}, input); assert.equal(f.state.row.classement, 2); assert.equal(f.state.row.tps, "14200");
  assert.equal(f.state.journal.status, "completed"); assert.equal(f.state.tables, false); assert.equal(f.state.released, 1);
  assert.equal((await f.writer.change({}, input)).replayed, true); assert.equal(f.state.writes, 1);
  await assert.rejects(f.writer.change({}, { ...input, patch: { classement: 3 } }), /contenu/);
  f = fixture({ lostReply: true }); await assert.rejects(f.writer.change({}, input), /reply lost/);
  assert.equal(f.state.journal.status, "prepared"); assert.equal(f.state.tables, false);
  assert.equal((await f.writer.change({}, input)).replayed, true); assert.equal(f.state.writes, 1); assert.equal(f.state.journal.status, "completed");
  f = fixture({ lostReply: true }); const pointsInput = { ...input, patch: { points: 123 } };
  await assert.rejects(f.writer.change({}, pointsInput), /reply lost/);
  assert.equal((await f.writer.change({}, pointsInput)).replayed, true); assert.equal(f.state.row.points, "123"); assert.equal(f.state.writes, 1);
  f = fixture({ denied: true }); await assert.rejects(f.writer.change({}, input), /denied/); assert.equal(f.state.pooled, 0);
  f = fixture({ national: false }); await assert.rejects(f.writer.change({}, { ...input, patch: undefined, action: "delete", confirmDeletion: true }), /national/); assert.equal(f.state.writes, 0);
  f = fixture(); await f.writer.change({}, { ...input, patch: undefined, action: "delete", confirmDeletion: true }); assert.equal(f.state.row, null); assert.equal(f.state.journal.status, "completed");
  f = fixture(); await f.writer.change({}, { ...input, patch: undefined, action: "hide" }); assert.equal(f.state.hidden, true); assert.deepEqual(f.state.row, row);
  await f.writer.change({}, { ...input, operationId: "22222222-2222-4222-8222-222222222222", expectedFingerprint: fingerprint(row, true), patch: undefined, action: "restore" }); assert.equal(f.state.hidden, false);
  f = fixture({ missingClub: true }); await assert.rejects(f.writer.change({}, { ...input, patch: { club: 999 } }), /Club NAP/); assert.equal(f.state.journal, null); assert.equal(f.state.writes, 0);
  f = fixture({ trigger: true }); await assert.rejects(f.writer.change({}, input), /Declencheur/); assert.equal(f.state.writes, 0); assert.ok(f.state.namedReleased);
  console.log("NAP performance writer: authorization, before image, lock release, lost-response replay, visibility, native club validation and national deletion passed; no live writes.");
})().catch(error => { console.error(error); process.exitCode = 1; });
