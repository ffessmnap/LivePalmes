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
  const db = database(); let historyReads = 0, historyError = false;
  const rules = { enabled: true, groups: [{ categories: ["C"], mode: "one", startDate: "2025-09-01", endDate: "2026-08-31", pools: ["50"], competitionMode: "all", competitionIds: [], bonusRequiresSelectedCompetition: true }], standards: { "C|F|100SF": 6000, "C|F|50SF": 6000 } };
  const competition = { id: "meet", date: "2026-05-01", qualifications: rules, events: ["100SF", "50SF"].map((code) => ({ code, categories: ["C"], type: "individual" })) };
  const history = [{ course: "100SF", date: "2026-01-01", pool: "50", chrono: "E", timeValue: 6000, publicKey: "p" }, { course: "50SF", date: "2026-01-01", pool: "50", chrono: "E", timeValue: 6500 }];
  const swimmer = { swimmerIndexId: "athlete", clubId: "club", sex: "F", birthDate: "2011-01-01", individualEntries: [{ eventCode: "100SF" }, { eventCode: "50SF" }] };
  const service = createQualificationService({ db, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code; } },
    categoryFor: () => "C", eventsFor: (item) => item.events, rowsFor: async () => { historyReads++; if (historyError) throw new Error("Historique indisponible"); return structuredClone(history); }, cacheIdFor: (item) => item.swimmerIndexId,
    automaticEntryFor: (entry, rows) => entry.entryTimeMode === "manual" ? { ...entry, entryTimeMode: "known", manualEntryTime: "", entryTimeValue: rows.find((row) => row.course === entry.eventCode).timeValue } : entry,
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

  const beforeAutomatic = historyReads;
  const automatic = await service.reconcile({ swimmers: [{ ...swimmer, individualEntries: [{ eventCode: "100SF", entryTimeMode: "manual", manualEntryTime: "00:45.00" }] }], relays: [{ relayId: "empty", memberIds: [], manualEntryTime: "04:00.00" }] }, competition);
  assert.equal(automatic.swimmers[0].individualEntries[0].entryTimeMode, "known");
  assert.equal(automatic.swimmers[0].individualEntries[0].entryTimeValue, 6000);
  assert.equal(automatic.swimmers[0].individualEntries[0].manualEntryTime, "");
  assert.equal(automatic.relays[0].manualEntryTime, "04:00.00");
  assert.equal(historyReads - beforeAutomatic, 1, "Le recalcul des temps réutilise les performances de qualification.");

  historyError = true;
  const failedJob = await service.begin({}, compRef, competition);
  await assert.rejects(service.process({ data: { jobId: failedJob.qualificationJobId } }), /Historique indisponible.*contrôle a été annulé/);
  assert.equal((await compRef.get()).data().qualificationJobId, "", "Un aperçu échoué libère son verrou.");
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 2, "Un historique inconnu ne supprime rien.");
  assert.equal((await service.process({ data: { jobId: failedJob.qualificationJobId } })).state, "cancelled");
  const beforeEmpty = historyReads;
  await service.reconcile({ swimmers: [{ ...swimmer, individualEntries: [] }], relays: [{ relayId: "empty", memberIds: [] }] }, competition);
  assert.equal(historyReads, beforeEmpty, "Un nageur sans engagement individuel ne nécessite pas d'historique.");
  historyError = false;
  const applyJob = await service.begin({}, compRef, competition);
  await service.process({ data: { jobId: applyJob.qualificationJobId } });
  await service.process({ data: { jobId: applyJob.qualificationJobId, action: "confirm" } });
  historyError = true;
  await assert.rejects(service.process({ data: { jobId: applyJob.qualificationJobId } }), /Historique indisponible/);
  assert.equal((await compRef.get()).data().qualificationJobId, applyJob.qualificationJobId, "Après confirmation, le traitement reste reprenable.");
  await assert.rejects(service.process({ data: { jobId: applyJob.qualificationJobId, action: "cancel" } }), /commencée/);
  historyError = false;
  await service.process({ data: { jobId: applyJob.qualificationJobId } });

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

  const exceptionRequest = { competitionId: "meet", swimmerIndexId: "athlete", eventCode: "50SF", confirmed: true };
  await assert.rejects(service.grantException({ national: false, data: exceptionRequest }), /national/);
  await assert.rejects(service.grantException({ data: { ...exceptionRequest, confirmed: false } }), /Confirmation/);
  await assert.rejects(service.grantException({ data: { ...exceptionRequest, swimmerIndexId: "other-club" } }), /club/);
  await assert.rejects(service.grantException({ data: { ...exceptionRequest, eventCode: "800SF" } }), /non ouverte/);
  await compRef.update({ qualificationJobId: "locked" });
  await assert.rejects(service.grantException({ data: exceptionRequest }), /contrôle/);
  await compRef.update({ qualificationJobId: "" });
  const granted = await service.grantException({ data: exceptionRequest });
  assert.equal(granted.qualification.approved, true);
  assert.equal(granted.qualification.qualified, false);
  assert.equal(granted.exception.approvedBy, "admin");
  assert.ok(granted.exception.approvedAt);
  assert.equal(granted.exception.source, "national-exception");
  const duplicate = await service.grantException({ data: exceptionRequest });
  assert.equal(duplicate.exception.approvedAt, granted.exception.approvedAt, "Une répétition conserve l'auteur et la date initiaux.");
  const approvedCompetition = { ...(await compRef.get()).data(), id: "meet" };
  const approved = await service.evaluate(swimmer, approvedCompetition);
  assert.equal(approved.courses["50SF"].approved, true);
  assert.equal(approved.courses["50SF"].qualified, false);
  const exceptionOnly = await service.reconcile({ swimmers: [{ ...swimmer, individualEntries: [{ eventCode: "50SF" }, { eventCode: "100SF" }] }], relays: [{ relayId: "composed", memberIds: ["athlete"] }, { relayId: "empty", memberIds: [] }] }, approvedCompetition);
  assert.deepEqual(exceptionOnly.swimmers[0].individualEntries.map((item) => item.eventCode), ["50SF"], "L'exception ne débloque pas les bonus.");
  assert.deepEqual(exceptionOnly.relays.map((item) => item.relayId), ["empty"], "L'exception ne qualifie pas un relais composé.");
  assert.equal((await entryRef.get()).data().swimmers[0].individualEntries.length, 0, "La confirmation autorise la sélection, qui reste enregistrée par la sauvegarde normale.");

  const readsBeforeRevocation = db.reads.count;
  await db.runTransaction(async (tx) => service.revokeRemovedExceptions(tx, "meet", exceptionOnly.swimmers, [], "club-admin"));
  assert.equal(db.reads.count, readsBeforeRevocation, "La révocation réutilise les engagements déjà lus.");
  assert.equal((await service.evaluate(swimmer, approvedCompetition)).courses["50SF"].approved, false, "Décocher retire l'autorisation côté serveur.");
  const grantedAgain = await service.grantException({ data: exceptionRequest });
  assert.equal(grantedAgain.qualification.approved, true, "Une nouvelle confirmation nationale est possible.");
  await db.runTransaction(async (tx) => service.revokeRemovedExceptions(tx, "meet", exceptionOnly.swimmers, exceptionOnly.swimmers, "club-admin"));
  assert.equal((await service.evaluate(swimmer, approvedCompetition)).courses["50SF"].approved, true, "Une course conservée garde son exception.");

  await entryRef.update({ qualificationAlert: { at: "alert-1", reason: "Suppression", removed: [] } });
  await assert.rejects(service.acknowledgeAlert({ data: { competitionId: "meet", alertAt: "older" } }), /nouvelle alerte/);
  const readsBeforeAck = db.reads.count;
  await service.acknowledgeAlert({ data: { competitionId: "meet", alertAt: "alert-1" } });
  assert.equal(db.reads.count - readsBeforeAck, 1, "Acquittement : une seule lecture ciblée.");
  assert.equal((await entryRef.get()).data().qualificationAlert, null);
  await service.acknowledgeAlert({ data: { competitionId: "meet", alertAt: "alert-1" } });
  await entryRef.update({ qualificationAlert: { at: "alert-2", reason: "Nouvelle suppression", removed: [] } });
  await assert.rejects(service.acknowledgeAlert({ data: { competitionId: "meet", alertAt: "alert-1" } }), /nouvelle alerte/);
  assert.equal((await entryRef.get()).data().qualificationAlert.at, "alert-2", "Une ancienne confirmation ne masque pas une nouvelle alerte.");

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
