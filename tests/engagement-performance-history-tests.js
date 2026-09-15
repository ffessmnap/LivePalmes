"use strict";
const assert = require("node:assert/strict");
const { readIndexedHistory } = require("../functions/engagement-performance-history");
async function main() {
  const docs = new Map(); let reads = 0;
  const db = { collection: (name) => ({ doc: (id) => `${name}/${id}` }), runTransaction: (fn) => fn({ get: async (path) => { reads++; return { exists: docs.has(path), data: () => docs.get(path) }; } }) };
  const options = { db, indexId: "athlete", HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code; } } };
  assert.equal(await readIndexedHistory(options), null);
  docs.set("performanceSwimmerIndex/athlete", { pageCount: 21, rowCount: 10500, updatedAt: "v1" });
  reads = 0;
  assert.equal(await readIndexedHistory(options), null);
  assert.equal(reads, 1, "La limite interdit toute lecture de page supplémentaire.");
  docs.set("performanceSwimmerIndex/athlete", { pageCount: 1, rowCount: 1, updatedAt: "v1" });
  await assert.rejects(readIndexedHistory(options), /incomplet/);
  const page = { swimmerIndexId: "athlete", pageIndex: 0, rowCount: 1, rows: [{ publicKey: "proof", competitionId: "meet", timeValue: 6000 }], updatedAt: "v1" };
  docs.set("performanceSwimmerPages/athlete_0000", page);
  reads = 0;
  assert.deepEqual((await readIndexedHistory(options)).rows, page.rows);
  assert.equal(reads, 2);
  page.updatedAt = "v2";
  await assert.rejects(readIndexedHistory(options), /incomplet/);
  page.updatedAt = "v1"; page.rowCount = 2;
  await assert.rejects(readIndexedHistory(options), /incomplet/);
  docs.set("performanceSwimmerIndex/athlete", { pageCount: 0, rowCount: 0, updatedAt: "v2" });
  assert.deepEqual((await readIndexedHistory(options)).rows, [], "Seul un index explicitement vide constitue un historique vide.");
  console.log("Historique paginé : complétude, cohérence, absence et borne de lectures OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
