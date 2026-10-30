"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const controls = require("../tools/user-name-correction-controls");
const { readDocuments, DATABASE } = require("../tools/check-production-user-name-correction");
const response = value => ({ ok: true, body: [Buffer.from(JSON.stringify(value))] });
const uid = "fiction-correction", name = `${DATABASE}/documents/users/${uid}`;
const doc = { name, updateTime: "2026-10-30T09:00:00.123456789Z", fields: {
  firstName: { stringValue: "NOM" }, lastName: { stringValue: "Prénom" }, clubId: { stringValue: "fiction-club" }, email: { stringValue: "fiction@example.invalid" },
  capabilities: { mapValue: { fields: { "admin.full": { booleanValue: true }, "engagements.club.manage": { booleanValue: true } } } }
} };
(async () => {
  const rows = await readDocuments([name], "fiction-token", async (url, options) => {
    assert.equal(url, `https://firestore.googleapis.com/v1/${DATABASE}/documents:batchGet`); assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { documents: [name] }); return response([{ found: doc }]);
  });
  assert.deepEqual(rows.get(name), doc);
  await assert.rejects(readDocuments([name, name], "fiction-token"));
  await assert.rejects(readDocuments([name.replace("livepalmes", "livepalmes-test")], "fiction-token"));
  await assert.rejects(readDocuments([name], "fiction-token", async () => response([{ found: { ...doc, name: name + "-other" } }])));
  const specs = controls.projectionSpecs(doc); assert.equal(specs.length, 3); assert(specs.every(spec => !spec.name.includes("region:")));
  const projections = new Map(specs.map(spec => [spec.name, { name: spec.name, fields: {
    [spec.map]: { mapValue: { fields: { [spec.key]: { mapValue: { fields: { firstName: doc.fields.firstName, lastName: doc.fields.lastName, uid: { stringValue: uid } } } } } } }
  } }]));
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, "POST"); assert(url.endsWith(":batchGet"));
      return response(JSON.parse(options.body).documents.map(key => ({ found: projections.get(key) })));
    };
    const baseline = await controls.projectionBaseline(new Map([[name, doc]]), "fiction-token");
    const entry = { name, before: { firstName: doc.fields.firstName, lastName: doc.fields.lastName }, after: { firstName: doc.fields.lastName, lastName: doc.fields.firstName } };
    await assert.rejects(controls.verifyProjections([entry], baseline, "fiction-token", "apply"), /not converged/);
    // Mock remote responses are detached JSON, so changing the fixture cannot mutate baseline.
    for (const spec of specs) {
      const fields = projections.get(spec.name).fields[spec.map].mapValue.fields[spec.key].mapValue.fields;
      fields.firstName = entry.after.firstName; fields.lastName = entry.after.lastName;
    }
    assert.equal((await controls.verifyProjections([entry], baseline, "fiction-token", "apply")).entriesChecked, 3);
    const row = { firebase_uid: uid, club_id: "fiction-club", email: "fiction@example.invalid", status: "active", competition_notifications: 0, source_version: controls.microseconds(doc.updateTime).toString() };
    const connection = { execute: async (query, ids) => { assert.match(query.sql, /^SELECT .* WHERE firebase_uid IN \(\?\) LIMIT 10$/); assert.deepEqual(ids, [uid]); return [[structuredClone(row)]]; } };
    const napBaseline = new Map([[uid, structuredClone(row)]]), receipts = [{ name, afterVersion: doc.updateTime }];
    await controls.verifyNap(connection, [entry], napBaseline, receipts);
    row.email = "changed@example.invalid";
    await assert.rejects(controls.verifyNap(connection, [entry], napBaseline, receipts), /coordinates changed/);
    assert.equal(controls.microseconds("2026-10-30T09:15:01.123456789Z"), 1793351701123456n);
    await assert.rejects(controls.napRows(connection, Array(11).fill(name)));
  } finally { globalThis.fetch = oldFetch; }
  assert.throws(() => controls.zipMembers(Buffer.from("not an archive")));
  // In-memory stored ZIP with the real reviewed helpers; no extraction or network.
  const names = ["backend-index.js", "server-mail-service.js", "server-directory-service.js", "server-access-service.js"];
  const local = [], central = []; let offset = 0;
  for (const filename of names) {
    const source = fs.readFileSync(path.join(__dirname, "../functions", filename === "backend-index.js" ? "index.js" : filename));
    const file = Buffer.from(filename), head = Buffer.alloc(30); head.writeUInt32LE(0x04034b50); head.writeUInt32LE(source.length, 18); head.writeUInt32LE(source.length, 22); head.writeUInt16LE(file.length, 26);
    local.push(head, file, source);
    const record = Buffer.alloc(46); record.writeUInt32LE(0x02014b50); record.writeUInt32LE(source.length, 20); record.writeUInt32LE(source.length, 24); record.writeUInt16LE(file.length, 28); record.writeUInt32LE(offset, 42); central.push(record, file);
    offset += head.length + file.length + source.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  const archive = Buffer.concat([...local, directory, end]);
  assert.equal(controls.zipMembers(archive).size, 4);
  try {
    globalThis.fetch = async (url, options) => { assert(url.startsWith("https://storage.googleapis.com/download/storage/v1/")); assert.equal(options.method, "GET"); return { ok: true, body: [archive] }; };
    const proof = await controls.sourceProof({ present: true, state: "ACTIVE", name: "syncEngagementMailRecipientIndex", revision: "fiction", eventType: "google.cloud.firestore.document.v1.written",
      filters: [{ attribute: "document", value: "users/{uid}" }, { attribute: "database", value: "(default)" }], source: { storageSource: { bucket: "gcf-v2-sources-718081132564-europe-west1", object: "syncEngagementMailRecipientIndex/function-source.zip", generation: "123" } } }, "fiction");
    assert.equal(proof.matched, true); assert.equal(proof.reviewedModules.length, 3);
  } finally { globalThis.fetch = oldFetch; }
  console.log("Correction controls: bounded exact batch reads, immutable projection baselines, convergence, read-only SQL/version checks, nanoseconds and deployed-handler/source archive comparison passed offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
