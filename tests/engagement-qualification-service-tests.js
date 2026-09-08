"use strict";
const assert = require("node:assert/strict");
const { createQualificationService } = require("../functions/engagement-qualification-service");

// Small Firestore adapter: exercise service state transitions without credentials,
// network access or writes to any Firebase project.
function database() {
  const store = new Map(); let revision = 0, counter = 0;
  const reads = { count: 0 };
  const clone = (value) => value === undefined ? undefined : structuredClone(value);
  const merge = (target, values) => {
    const result = clone(target || {});
    for (const [key, value] of Object.entries(values)) {
      const path = key.split("."); let item = result;
      for (const field of path.slice(0, -1)) item = item[field] ||= {};
      const last = path.at(-1);
      item[last] = value && typeof value === "object" && !Array.isArray(value) ? merge(item[last], value) : clone(value);
    }
    return result;
  };
  function ref(path) {
    return { path, id: path.split("/").at(-1), collection: (name) => query(`${path}/${name}`),
      get: async () => { reads.count++; const current = store.get(path); return { id: path.split("/").at(-1), ref: ref(path), exists: Boolean(current), data: () => clone(current?.data), updateTime: { toMillis: () => current?.revision || 0 } }; },
      set: async (data, options) => { store.set(path, { data: options?.merge ? merge(store.get(path)?.data, data) : clone(data), revision: ++revision }); },
      update: async (data) => { if (!store.has(path)) throw new Error("missing"); await ref(path).set(data, { merge: true }); },
      delete: async () => { store.delete(path); revision++; } };
  }
  function query(path, filters = [], cursor = [], limit = Infinity, orders = []) {
    const fieldValue = (key, field) => field === "__name__" ? key.split("/").at(-1) : field.split(".").reduce((value, part) => value?.[part], store.get(key).data);
    const fields = orders.length ? orders : ["__name__"];
    const compare = (left, right) => { for (let index = 0; index < left.length; index++) { if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1; } return 0; };
    const values = (key) => fields.map((field) => fieldValue(key, field));
    return { doc: (id = `auto-${++counter}`) => ref(`${path}/${id}`), where: (field, op, value) => query(path, [...filters, [field, op, value]], cursor, limit, orders),
      orderBy: (field) => query(path, filters, cursor, limit, [...orders, field]), startAfter: (...position) => query(path, filters, position, limit, orders), limit: (size) => query(path, filters, cursor, size, orders),
      get: async () => {
        const paths = [...store.keys()].filter((key) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1 && (!cursor.length || compare(values(key), cursor) > 0) && filters.every(([field, op, value]) => {
          const actual = fieldValue(key, field);
          return op === "==" ? actual === value : op === ">=" ? actual >= value : op === "<=" ? actual <= value : false;
        })).sort((a, b) => compare(values(a), values(b))).slice(0, limit);
        const docs = await Promise.all(paths.map((key) => ref(key).get()));
        return { docs, size: docs.length };
      } };
  }
  function transaction() {
    const writes = [];
    return { get: (reference) => reference.get(), create: (reference, data) => writes.push(() => reference.set(data)), set: (reference, data, options) => writes.push(() => reference.set(data, options)), update: (reference, data) => writes.push(() => reference.update(data)), delete: (reference) => writes.push(() => reference.delete()), commit: async () => { for (const write of writes) await write(); } };
  }
  return { collection: query, getAll: (...refs) => Promise.all(refs.map((reference) => reference.get())), batch: transaction,
    runTransaction: async (fn) => { const tx = transaction(); const result = await fn(tx); await tx.commit(); return result; }, reads };
}

async function main() {
  const db = database(); let historyReads = 0;
  const rules = { enabled: true, groups: [{ categories: ["C"], mode: "one", startDate: "2025-09-01", endDate: "2026-08-31", pools: ["50"], competitionMode: "all", competitionIds: [], bonusRequiresSelectedCompetition: true }], standards: { "C|F|100SF": 6000, "C|F|50SF": 6000 } };
  const competition = { id: "meet", date: "2026-05-01", qualifications: rules, events: ["100SF", "50SF"].map((code) => ({ code, categories: ["C"], type: "individual" })) };
  const history = [{ course: "100SF", date: "2026-01-01", pool: "50", chrono: "E", timeValue: 6000, publicKey: "p" }, { course: "50SF", date: "2026-01-01", pool: "50", chrono: "E", timeValue: 6500 }];
  const swimmer = { swimmerIndexId: "athlete", clubId: "club", sex: "F", birthDate: "2011-01-01", individualEntries: [{ eventCode: "100SF" }, { eventCode: "50SF" }] };
  const service = createQualificationService({ db, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code; } },
    categoryFor: () => "C", eventsFor: (item) => item.events, rowsFor: async () => { historyReads++; return structuredClone(history); }, cacheIdFor: (item) => item.swimmerIndexId,
    access: async (request) => ({ uid: "admin", national: request.national !== false }), clubAccess: async () => ({ uid: "club-admin", clubId: "club" }),
    entryIdFor: () => "entry", assertOpen: () => {}, audit: async () => {} });
  const compRef = db.collection("engagementCompetitions").doc("meet");
  const entryRef = db.collection("engagementClubEntries").doc("entry");
  await compRef.set(competition);
  await entryRef.set({ competitionId: "meet", clubId: "club", swimmers: [swimmer], relays: [{ relayId: "empty", memberIds: [] }] });
  const evaluation = await service.evaluate(swimmer, competition);
  assert.equal(evaluation.courses["100SF"].qualified, true);
  assert.equal(historyReads, 1, "Une seule lecture d'historique pour toutes les courses.");
  assert.equal(db.reads.count, 0, "Sans dérogation, aucune lecture de demande ou d'accord.");

  const stricter = structuredClone(competition); stricter.qualifications.standards["C|F|100SF"] = 5900;
  await assert.rejects(service.begin({ national: false }, compRef, stricter), /national/);
  let job = await service.begin({}, compRef, stricter);
  assert.equal((await compRef.get()).data().qualificationJobId, job.qualificationJobId);
  let result = await service.process({ data: { jobId: job.qualificationJobId } });
  assert.equal(result.state, "ready"); assert.equal(result.count, 2);
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 2, "La prévisualisation ne supprime rien.");
  await service.process({ data: { jobId: job.qualificationJobId, action: "cancel" } });
  assert.equal((await compRef.get()).data().qualificationJobId, "");
  assert.equal((await compRef.get()).data().qualifications.standards["C|F|100SF"], 6000);

  job = await service.begin({}, compRef, stricter);
  await service.process({ data: { jobId: job.qualificationJobId } });
  await service.process({ data: { jobId: job.qualificationJobId, action: "confirm" } });
  result = await service.process({ data: { jobId: job.qualificationJobId } });
  assert.equal(result.state, "done");
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 0);
  assert.equal((await entryRef.get()).data().relays.length, 1, "Le relais sans composition reste engagé.");
  assert.equal((await entryRef.get()).data().qualificationAlert.removed.length, 2);
  assert.equal((await compRef.get()).data().qualificationJobId, "");
  assert.equal((await service.process({ data: { jobId: job.qualificationJobId } })).state, "done", "Reprise idempotente.");

  await service.requestDerogation({ data: { competitionId: "meet", swimmerIndexId: "athlete", eventCode: "50SF", reason: "Performance étrangère non importée" } });
  let list = await service.listRequests({ data: { competitionId: "meet" } });
  assert.equal(list.requests[0].status, "pending");
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 0, "Une demande ne crée pas d'engagement.");
  await assert.rejects(service.resolveRequest({ national: false, data: { requestId: list.requests[0].id, status: "accepted" } }), /national/);
  await service.resolveRequest({ data: { requestId: list.requests[0].id, status: "accepted" } });
  const approved = await service.evaluate(swimmer, { ...(await compRef.get()).data(), id: "meet" });
  assert.equal(approved.courses["50SF"].approved, true);
  assert.equal(approved.courses["50SF"].qualified, false);
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 0, "L'accord autorise, sans cocher à la place du club.");
  await assert.rejects(service.resolveRequest({ data: { requestId: list.requests[0].id, status: "refused" } }), /plus en attente/);
  await entryRef.update({ swimmers: [{ ...swimmer, individualEntries: [{ eventCode: "50SF", qualification: { ...approved.courses["50SF"], mode: approved.mode } }] }] });
  const revoked = await service.resolveRequest({ data: { requestId: list.requests[0].id, status: "revoked", decision: "Justificatif non valide" } });
  assert.equal(revoked.removed.length, 1);
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 0);
  assert.equal((await entryRef.get()).data().qualificationAlert.reason, "Dérogation retirée par le National");
  assert.equal((await service.evaluate(swimmer, { ...(await compRef.get()).data(), id: "meet" })).courses["50SF"].approved, false);

  // Revalidation is targeted, preserves an alternative proof and only deletes
  // the anchor/bonuses once every qualifying proof has disappeared.
  await compRef.set(competition);
  await entryRef.set({ competitionId: "meet", clubId: "club", swimmers: [swimmer], relays: [{ relayId: "empty", memberIds: [] }, { relayId: "composed", memberIds: ["athlete"] }] });
  const indexedEntry = await entryRef.get();
  await service.syncTargets({ params: { entryId: "entry" }, data: { before: { exists: false }, after: indexedEntry } });
  const target = await db.collection("engagementQualificationTargets").doc("athlete").collection("entries").doc("entry").get();
  assert.equal(target.exists, true);
  history.push({ ...history[0], publicKey: "alternative" });
  history[0].active = false;
  const beforeAlternative = historyReads;
  await service.revalidateCache({ params: { cacheId: "athlete" }, data: {} });
  assert.equal(historyReads - beforeAlternative, 1);
  let corrected = (await entryRef.get()).data();
  assert.equal(corrected.swimmers[0].individualEntries.length, 2);
  assert.equal(corrected.swimmers[0].individualEntries[0].qualification.proof.id, "alternative");
  assert.equal(corrected.relays.length, 2);
  history.at(-1).active = false;
  await service.revalidateCache({ params: { cacheId: "athlete" }, data: {} });
  corrected = (await entryRef.get()).data();
  assert.equal(corrected.swimmers[0].individualEntries.length, 0);
  assert.deepEqual(corrected.relays.map((relay) => relay.relayId), ["empty"]);
  assert.equal(corrected.qualificationAlert.removed.length, 3);
  const alerts = corrected.qualificationAlert;
  await service.revalidateCache({ params: { cacheId: "athlete" }, data: {} });
  assert.deepEqual((await entryRef.get()).data().qualificationAlert, alerts, "Une nouvelle livraison du même événement ne double pas les suppressions.");

  // Paging and resumption retain the full, confirmed impact list.
  history[0].active = true;
  for (let i = 0; i < 26; i++) await db.collection("engagementClubEntries").doc(`page-${String(i).padStart(2, "0")}`).set({ competitionId: "meet", clubId: "club", swimmers: [swimmer], relays: [] });
  job = await service.begin({}, compRef, stricter);
  result = await service.process({ data: { jobId: job.qualificationJobId } });
  assert.equal(result.state, "preview");
  do { result = await service.process({ data: { jobId: job.qualificationJobId } }); } while (result.state === "preview");
  assert.equal(result.state, "ready"); assert.equal(result.count, 52);
  let details = await service.process({ data: { jobId: job.qualificationJobId, action: "details" } });
  const remaining = await service.process({ data: { jobId: job.qualificationJobId, action: "details", cursor: details.cursor } });
  assert.equal(details.removed.length + remaining.removed.length, 52);
  await service.process({ data: { jobId: job.qualificationJobId, action: "confirm" } });
  // A late correction invalidates the old preview; no unconfirmed removal.
  history[0].timeValue = 5800;
  result = await service.process({ data: { jobId: job.qualificationJobId } });
  assert.equal(result.state, "preview");
  assert.equal((await db.collection("engagementClubEntries").doc("page-00").get()).data().swimmers[0].individualEntries.length, 2);
  await assert.rejects(service.process({ data: { jobId: job.qualificationJobId, action: "cancel" } }), /commencée/);
  do { result = await service.process({ data: { jobId: job.qualificationJobId } }); } while (result.state === "preview");
  assert.equal(result.count, 0);
  await service.process({ data: { jobId: job.qualificationJobId, action: "confirm" } });
  do { result = await service.process({ data: { jobId: job.qualificationJobId } }); } while (result.state === "apply");
  assert.equal(result.state, "done");
  await db.collection("engagementCalendarEvents").doc("calendar").set({ eventType: "pool", date: "2026-01-01", name: "Historique", legacyImport: { legacyCompetitionId: "4980" } });
  for (let i = 0; i < 51; i++) await db.collection("performanceImports").doc(`import-${String(i).padStart(2, "0")}`).set({ metadata: { date: "2026-03-01", competitionName: `Source ${i}` } });
  await db.collection("performanceImports").doc("old").set({ metadata: { date: "2023-03-01", competitionName: "Hors période" } });
  const period = { startDate: "2025-09-01", endDate: "2026-08-31" };
  let sources = await service.listSources({ data: period });
  assert.equal(sources.sources[0].id, "4980");
  sources = await service.listSources({ data: { ...period, cursor: sources.cursor } });
  assert.equal(sources.sources.length, 50);
  const sourceTail = await service.listSources({ data: { ...period, cursor: sources.cursor } });
  assert.equal(sourceTail.sources.length, 1); assert.equal(sourceTail.cursor, "");
  assert.equal(sourceTail.sources[0].id, "import-50");
  await assert.rejects(service.listSources({ national: false, data: period }), /national/);
  console.log("Service qualification : lectures, droits, prévisualisation, annulation, suppression, reprise et dérogations OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
