"use strict";
const assert = require("node:assert/strict");
const { build } = require("../functions/nap-notification-txt");
const water = require("../functions/winpalme-open-water-manual");

async function run() {
  const row = { id_course: 120, course: "1500", sexe: "M", relais: 0, wplabel: "LD1500", longueur: 1500,
    style: "SF", type_: 1, nbnageur: 1, mixte: 0, ld: 1, actif: 1, validation: 1 };
  const competition = { id: "5136", name: "Fixture", date: "2026-11-01", competitionType: "openWater",
    events: [{ code: "OW1500SF", type: "individual", nativeCourses: [row] }] };
  const entries = [{ clubId: "1", clubCode: "TEST", relays: [], officials: [], swimmers: [
    { firstName: "Test", lastName: "Nageur", birthDate: "2000-01-01", sex: "M", swimmerIndexId: "1",
      category: "NAP-unknown", individualEntries: [{ eventCode: "OW1500SF", nativeTime: "599999", entryTime: "59:59.99" }] },
    { firstName: "Test", lastName: "Sans course", birthDate: "2000-01-01", sex: "M", swimmerIndexId: "2", individualEntries: [] }
  ] }];
  const clubs = new Map([["1", { clubCode: "TEST", federalNumber: "07780252", regionId: "2" }]]);
  const before = JSON.stringify([competition, entries]);
  let reads = 0, poolCalls = 0;
  const services = { pool: { execute: async (query, values) => {
    reads++;
    assert.match(query.sql, /FORCE INDEX \(PRIMARY\)/);
    if (query.sql.includes("FROM competitions ")) { assert.deepEqual(values, [5136]); return [[{ id: 5136, date: competition.date, comite: 2 }]]; }
    assert.match(query.sql, /WHERE id IN \(\?\).*LIMIT 301/); assert.deepEqual(values, [120]);
    return [[{ ...row, id: 120 }]];
  } }, category: () => "S", fileName: () => "fixture.txt", poolTxt: (_event, normalized) => {
    poolCalls++;
    assert.equal(normalized[0].swimmers[0].individualEntries[0].entryTimeMode, "default595999");
    return { buffer: Buffer.from("pool"), fileName: "pool.txt" };
  } };
  const result = await build(competition, entries, clubs, services);
  assert.equal(reads, 2); assert.equal(poolCalls, 0); assert.equal(result.fileName, "fixture.txt");
  const text = result.buffer.toString("utf8");
  assert.match(text, /WID;[A-Z]+202611015136/);
  assert.match(text, /DIS;LD1500;1500;1500;SF;1;1;120;0/);
  assert.match(text, /LD1500;000001;HSE/);
  assert.match(text, /NAG;Sans course;Test;01\/01\/2000;M;TEST;;REL;000000;;2;;/);
  const native = await water.readManualOpenWaterCompetition(services.pool, competition);
  const manual = water.buildNativeManualOpenWaterTxt(native, water.prepareManualOpenWaterEntries(entries)
    .map(entry => ({ ...entry, swimmers: entry.swimmers.map(person => ({ ...person, category: "S" })) })), clubs);
  const content = buffer => buffer.toString("utf8").split("\r\n").filter(line => !line.startsWith("XXX;GENERER PAR"));
  assert.deepEqual(content(result.buffer), content(manual.buffer), "same validated serializer as the manual download");
  assert.equal(JSON.stringify([competition, entries]), before, "no native mutation");
  reads = 0;
  const many = [{ ...entries[0], swimmers: Array.from({ length: 200 }, (_, i) => ({ ...entries[0].swimmers[0], swimmerIndexId: String(i + 1) })) }];
  await build(competition, many, clubs, services); assert.equal(reads, 2, "constant reads with 200 swimmers");
  reads = 0;
  await build({ ...competition, competitionType: "pool" }, entries, clubs, services);
  assert.equal(poolCalls, 1); assert.equal(reads, 0, "pool keeps its existing builder and read budget");
  await assert.rejects(build({ ...competition, competitionType: "meeting" }, entries, clubs, services), /incompatible/);
  await assert.rejects(build(competition, entries, clubs, { ...services, pool: { execute: async () => [[]] } }), /Reference e-NAP/);
  await assert.rejects(build(competition, entries, clubs, { ...services, pool: { execute: async query =>
    query.sql.includes("FROM competitions ") ? [[{ id: 5136, date: competition.date, comite: 2 }]] : [[]] } }), /Catalogue eau libre/);
  console.log("Notification TXT: identical water serialization, registered-only swimmers, fixed two-read budget, no mutation and closed failure passed.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
