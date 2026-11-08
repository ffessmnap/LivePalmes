"use strict";
const assert = require("node:assert/strict");
const { build } = require("../functions/nap-notification-txt");
const water = require("../functions/winpalme-open-water-manual");

async function run() {
  const row = { id_course: 120, course: "1500", sexe: "M", relais: 0, wplabel: "LD1500", longueur: 1500,
    style: "SF", type_: 1, nbnageur: 1, mixte: 0, ld: 1, actif: 1, validation: 1 };
  const competition = { id: "5136", name: "Fixture", date: "2026-11-01", competitionType: "openWater",
    events: [{ code: "OW1500SF", type: "individual", nativeCourses: [row] }] };
  const entries = [{ clubId: "1", clubCode: "TEST", relays: [], officials: [{lastName:"FICTIF",firstName:"Élodie",birthDate:"1980-02-29"}], swimmers: [
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
  assert.equal(text.split("\r\n").filter(line=>line.startsWith("OFF;")).length,1);
  assert.ok(text.indexOf("NAG;Sans course;")<text.indexOf("OFF;"));
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
  // Exercise the real pool download handler and mail builder with no services.
  const {createDocumentsService_buildEngagementCompetitionTxt}=require("../functions/backend/server-documents-service/build-engagement-competition-txt");
  const builders=createDocumentsService_buildEngagementCompetitionTxt({ageCategoryFromDates:()=>"S",
    buildWinPalmeCompetitionTxt:require("../functions/winpalme-export").buildWinPalmeCompetitionTxt,engagementPdfFileName:()=>"fixture"});
  const poolCompetition={...competition,competitionType:"pool"},poolEntries=entries.map(entry=>({...entry,swimmers:entry.swimmers.map(person=>({...person,
    individualEntries:person.individualEntries.map(course=>({...course,eventCode:"50SF"}))}))}));
  const {createCompetitionHandlers_generateEngagementCompetitionTxtExport}=require("../functions/backend/portal-competition-handlers/generate-engagement-competition-txt-export");
  const downloadPool=async downloadEntries=>createCompetitionHandlers_generateEngagementCompetitionTxtExport({...builders,ENVIRONMENT:{sportingDataSource:"nap"},
    cleanText:value=>String(value||""),engagementAccessContext:async()=>({}),engagementClubEntryHasParticipants:()=>true,
    nativeAdminCompetitionEntries:async()=>({competition:poolCompetition,entries:downloadEntries,clubsById:clubs,sqlBudget:{queriesMax:24}})})
    .generateEngagementCompetitionTxtExport({data:{competitionId:competition.id}});
  const downloaded=await downloadPool(poolEntries);
  const mailed=await build(poolCompetition,poolEntries,clubs,{...services,poolTxt:builders.buildEngagementCompetitionTxt});
  const downloadedBuffer=Buffer.from(downloaded.txtBase64,"base64");
  assert.deepEqual(content(downloadedBuffer),content(mailed.buffer),"Real manual pool handler and mail serializer keep identical content");
  assert.match(downloadedBuffer.toString("utf8"),/\r\nOFF;FICTIF;Élodie;TEST;29\/02\/1980;\r\n/);
  assert.equal(downloaded.sqlBudget.queriesMax,24);assert.equal(reads,0,"Shared OFF serialization adds no data access");
  for(const [raw,expected] of [["0000-00-00","00/00/0000"],["2000-00-00","00/00/2000"],["2000-02-31","31/02/2000"],
    ["2000-13-40","40/13/2000"],["2000-01-01","01/01/2000"],[null,""],[undefined,""],["",""],["00/00/2000","00/00/2000"],["inconnue","inconnue"]]) {
    for(const event of [poolCompetition,competition]) {
      const source=event.competitionType==="pool"?poolEntries:entries;
      const datedEntries=source.map(entry=>({...entry,officials:entry.officials.map(person=>({...person,txtBirthDate:raw}))}));
      const beforeDates=JSON.stringify(datedEntries);reads=0;
      const prepared=await build(event,datedEntries,clubs,{...services,poolTxt:builders.buildEngagementCompetitionTxt});
      assert.equal(reads,event.competitionType==="pool"?0:2,"Dates do not add queries");
      const manualBuffer=event.competitionType==="pool"?Buffer.from((await downloadPool(datedEntries)).txtBase64,"base64"):
        water.buildNativeManualOpenWaterTxt(native,water.prepareManualOpenWaterEntries(datedEntries)
          .map(entry=>({...entry,swimmers:entry.swimmers.map(person=>({...person,category:"S"}))})),clubs).buffer;
      assert.deepEqual(content(prepared.buffer),content(manualBuffer),"Pool/water manual and automatic TXT preserve the same OFF source date");
      const off=prepared.buffer.toString("utf8").split("\r\n").find(line=>line.startsWith("OFF;")).split(";");
      assert.equal(off[4],expected);assert.equal(off.length,6);assert.equal(JSON.stringify(datedEntries),beforeDates);
    }
  }
  await assert.rejects(build({ ...competition, competitionType: "meeting" }, entries, clubs, services), /incompatible/);
  await assert.rejects(build(competition, entries, clubs, { ...services, pool: { execute: async () => [[]] } }), /Reference e-NAP/);
  await assert.rejects(build(competition, entries, clubs, { ...services, pool: { execute: async query =>
    query.sql.includes("FROM competitions ") ? [[{ id: 5136, date: competition.date, comite: 2 }]] : [[]] } }), /Catalogue eau libre/);
  console.log("Notification TXT: identical water serialization, registered-only swimmers, fixed two-read budget, no mutation and closed failure passed.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
