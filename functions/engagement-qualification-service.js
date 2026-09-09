"use strict";

const crypto = require("node:crypto");
const engine = require("./engagement-qualification");
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function createQualificationService({ db, HttpsError, categoryFor, eventsFor, rowsFor, automaticEntryFor = (entry) => entry, cacheIdFor, access, clubAccess, entryIdFor, assertOpen, audit }) {
  const competitions = db.collection("engagementCompetitions");
  const entries = db.collection("engagementClubEntries");
  const jobs = db.collection("engagementQualificationJobs");
  const grants = db.collection("engagementQualificationGrants");
  const targets = db.collection("engagementQualificationTargets");
  const sportingHash = (data = {}) => hash({ swimmers: data.swimmers || [], relays: data.relays || [] });
  const fail = (message, code = "failed-precondition") => { throw new HttpsError(code, message); };
  const now = () => new Date().toISOString();
  const auditRemovals = (items = []) => items.map((item) => ({ eventCode: item.eventCode, ...(item.swimmerIndexId ? { swimmerIndexId: item.swimmerIndexId } : {}), ...(item.relayId ? { relayId: item.relayId } : {}) }));
  const grantId = (competitionId, swimmerId) => hash([competitionId, swimmerId]);

  // Called inside the entry transaction, using already-read authoritative entries.
  // No additional reads; one merged write per swimmer losing an exception.
  function revokeRemovedExceptions(tx, competitionId, before = [], after = [], uid = "") {
    const remaining = new Map(after.map((swimmer) => [swimmer.swimmerIndexId, new Set((swimmer.individualEntries || []).map((entry) => entry.eventCode))]));
    for (const swimmer of before) {
      const courses = {};
      for (const entry of swimmer.individualEntries || []) {
        if (entry.qualification?.approved && !remaining.get(swimmer.swimmerIndexId)?.has(entry.eventCode)) {
          courses[entry.eventCode] = { eventCode: entry.eventCode, status: "revoked", revokedBy: uid, revokedAt: now() };
        }
      }
      if (Object.keys(courses).length) tx.set(grants.doc(grantId(competitionId, swimmer.swimmerIndexId)), { courses }, { merge: true });
    }
  }

  async function acknowledgeAlert(request) {
    const context = await clubAccess(request);
    const competitionId = String(request.data?.competitionId || "");
    const alertAt = String(request.data?.alertAt || "");
    if (!competitionId || competitionId.includes("/") || competitionId.length > 128 || !alertAt) fail("Compétition et alerte requises.", "invalid-argument");
    const ref = entries.doc(entryIdFor(competitionId, context.clubId));
    await db.runTransaction(async (tx) => {
      const entry = await tx.get(ref);
      if (!entry.exists || entry.data().clubId !== context.clubId) fail("Engagements du club introuvables.", "permission-denied");
      const alert = entry.data().qualificationAlert;
      if (!alert) return;
      if (alert.at !== alertAt) fail("Une nouvelle alerte est disponible. Rechargez la compétition avant de la confirmer.");
      tx.update(ref, { qualificationAlert: null, qualificationAlertAcknowledged: { at: now(), by: context.uid, alertAt } });
    });
    return { ok: true };
  }

  async function evaluate(swimmer, competition, rows) {
    const input = { rules: competition.qualifications, category: categoryFor(competition.date, swimmer.birthDate), sex: swimmer.sex,
      events: eventsFor(competition), rows: rows || await rowsFor(swimmer, competition) };
    let result = engine.evaluate(input);
    if (competition.hasQualificationGrants && result.enabled && Object.values(result.courses).some((course) => !course.qualified)) {
      const approved = await grants.doc(grantId(competition.id, swimmer.swimmerIndexId || swimmer.id)).get();
      if (approved.exists && approved.data().clubId === swimmer.clubId) result = engine.evaluate({ ...input, approvals: Object.values(approved.data().courses || {}) });
    }
    return result;
  }

  async function reconcile(data, competition, affectedCacheId = "") {
    const evaluations = {};
    const removed = [];
    const swimmers = [];
    // One history read per swimmer, reused across every event and relay.
    const sourceSwimmers = data.swimmers || [];
    for (let offset = 0; offset < sourceSwimmers.length; offset += 10) {
      const results = await Promise.all(sourceSwimmers.slice(offset, offset + 10).map(async (swimmer) => {
        const checkHistory = competition.qualifications?.enabled && (swimmer.individualEntries || []).length && (!affectedCacheId || cacheIdFor(swimmer) === affectedCacheId);
        const rows = checkHistory ? await rowsFor(swimmer, competition) : undefined;
        const evaluation = !competition.qualifications?.enabled ? { enabled: false } : !(swimmer.individualEntries || []).length
          ? { enabled: true, courses: {}, mode: "each" } : affectedCacheId && cacheIdFor(swimmer) !== affectedCacheId
          ? { enabled: true, mode: competition.qualifications.groups.find((group) => group.categories.includes(categoryFor(competition.date, swimmer.birthDate)))?.mode || "each", courses: Object.fromEntries((swimmer.individualEntries || []).map((entry) => [entry.eventCode, entry.qualification || {}])) }
          : await evaluate(swimmer, competition, rows);
        const result = engine.reconcile(swimmer.individualEntries || [], evaluation);
        if (checkHistory) result.entries = result.entries.map((entry) => automaticEntryFor(entry, rows, competition));
        return { swimmer, evaluation, result };
      }));
      for (const { swimmer, evaluation, result } of results) {
        evaluations[swimmer.swimmerIndexId] = evaluation;
        removed.push(...result.removed.map((entry) => ({ swimmerIndexId: swimmer.swimmerIndexId, name: `${swimmer.lastName || ""} ${swimmer.firstName || ""}`.trim(), eventCode: entry.eventCode })));
        swimmers.push({ ...swimmer, individualEntries: result.entries.map((entry) => ({ ...entry, ...(evaluation.enabled ? { qualification: { ...evaluation.courses[entry.eventCode], mode: evaluation.mode } } : {}) })) });
      }
    }
    const relays = (data.relays || []).filter((relay) => {
      const allowed = !competition.qualifications?.enabled || engine.relayEligible(relay, swimmers, evaluations);
      if (!allowed) removed.push({ relayId: relay.relayId, eventCode: relay.eventCode, name: "Relais" });
      return allowed;
    });
    return { swimmers, relays, removed };
  }

  async function national(request) {
    const context = await access(request);
    if (!context.national) fail("Droit national des engagements requis.", "permission-denied");
    return context;
  }

  async function begin(request, competitionRef, payload, expectedMillis) {
    const context = await national(request);
    const jobRef = jobs.doc();
    await db.runTransaction(async (tx) => {
      const current = await tx.get(competitionRef);
      if (expectedMillis !== undefined && current.updateTime.toMillis() !== expectedMillis) fail("La compétition a changé. Rechargez la fiche avant confirmation.");
      if (current.data()?.qualificationJobId) fail("Un contrôle est déjà en cours. Reprenez-le ou annulez-le.");
      tx.create(jobRef, { competitionId: competitionRef.id, actorUid: context.uid, payload, state: "preview", cursor: "", count: 0, createdAt: now() });
      tx.update(competitionRef, { qualificationJobId: jobRef.id });
    });
    return { qualificationJobId: jobRef.id, state: "preview" };
  }

  async function process(request) {
    const context = await national(request);
    const jobRef = jobs.doc(String(request.data?.jobId || "invalid"));
    const job = await jobRef.get();
    if (!job.exists) fail("Contrôle introuvable.");
    const data = job.data();
    const competitionRef = competitions.doc(data.competitionId);
    if (request.data?.action === "cancel") {
      if (data.applyStarted || !["preview", "ready"].includes(data.state)) fail("Application commencée : reprenez le traitement.");
      await db.runTransaction(async (tx) => {
        const currentJob = await tx.get(jobRef);
        const competition = await tx.get(competitionRef);
        if (currentJob.data()?.applyStarted || !["preview", "ready"].includes(currentJob.data()?.state)) fail("Application commencée.");
        if (competition.data()?.qualificationJobId === jobRef.id) tx.update(competitionRef, { qualificationJobId: "" });
        tx.update(jobRef, { state: "cancelled" });
      });
      return { state: "cancelled" };
    }
    if (data.state === "ready" && request.data?.action === "confirm") {
      await db.runTransaction(async (tx) => {
        const latest = await tx.get(jobRef);
        if (latest.data()?.state !== "ready") fail("Le contrôle a changé.");
        tx.update(jobRef, { state: "apply", cursor: "", applyStarted: true, confirmedBy: context.uid });
      });
      return { state: "apply", count: data.count };
    }
    if (data.state === "ready" && request.data?.action === "details") {
      let query = jobRef.collection("entries").orderBy("__name__").limit(25);
      if (request.data?.cursor) query = query.startAfter(String(request.data.cursor));
      const page = await query.get();
      return { state: "ready", count: data.count, removed: page.docs.flatMap((doc) => doc.data().removed || []), cursor: page.size === 25 ? page.docs.at(-1).id : "" };
    }
    if (!["preview", "apply"].includes(data.state)) return { state: data.state, count: data.count, applyStarted: data.applyStarted === true };
    let query = entries.where("competitionId", "==", data.competitionId).orderBy("__name__").limit(5);
    if (data.cursor) query = query.startAfter(data.cursor);
    const page = await query.get();
    const competitionSnapshot = await competitionRef.get();
    if (competitionSnapshot.data()?.qualificationJobId !== jobRef.id) fail("Le verrou de qualification a changé.");
    const competition = { ...competitionSnapshot.data(), ...data.payload, id: data.competitionId };
    const removed = [];
    for (const document of page.docs) {
      const planRef = jobRef.collection("entries").doc(document.id);
      if (data.state === "preview") {
        let result;
        try {
          result = await reconcile(document.data(), competition);
        } catch (error) {
          // A failed preview has changed no engagements. Release only this job's
          // lock, and never cancel a job whose application has already started.
          const cancelled = await db.runTransaction(async (tx) => {
            const latest = await tx.get(jobRef);
            const current = await tx.get(competitionRef);
            if (latest.data()?.state !== "preview" || latest.data()?.applyStarted || current.data()?.qualificationJobId !== jobRef.id) return false;
            tx.update(jobRef, { state: "cancelled", updatedAt: now() });
            tx.update(competitionRef, { qualificationJobId: "" });
            return true;
          });
          if (cancelled) throw new HttpsError(error.code === "unavailable" ? "unavailable" : "failed-precondition", `${error.message} Le contrôle a été annulé ; vous pouvez réessayer l'enregistrement.`, { qualificationJobCancelled: true });
          throw error;
        }
        removed.push(...result.removed.map((item) => ({ ...item, club: document.data().clubName || document.data().clubId })));
        await planRef.set({ sourceHash: sportingHash(document.data()), removed: result.removed.map((item) => ({ ...item, club: document.data().clubName || document.data().clubId })), swimmers: result.swimmers, relays: result.relays });
      } else {
        const plan = await planRef.get();
        if (!plan.exists) fail("Prévisualisation absente. Le traitement doit être repris.");
        // Recheck proofs immediately before applying a stored preview. A changed
        // history requires another impact preview and explicit confirmation.
        const fresh = await reconcile(document.data(), competition);
        const value = plan.data();
        const desired = sportingHash(value);
        const proofChanged = sportingHash(fresh) !== desired;
        const conflict = await db.runTransaction(async (tx) => {
          const current = await tx.get(document.ref);
          const currentHash = sportingHash(current.data());
          if (currentHash === desired && !proofChanged) return false;
          if (proofChanged || currentHash !== value.sourceHash) return true;
          tx.update(document.ref, { swimmers: value.swimmers, relays: value.relays, qualificationAppliedJobId: jobRef.id,
            ...(value.removed.length ? { qualificationAlert: { at: now(), reason: "Modification des règles de qualification", removed: value.removed }, "documents.clubRecapPdf": {} } : {}), updatedAt: now() });
          return false;
        });
        if (conflict) {
          await jobRef.update({ state: "preview", cursor: "", count: 0 });
          return { state: "preview", count: 0, message: "Des données ont changé : un nouvel aperçu sera soumis à confirmation." };
        }
        // Establish dependencies before releasing the competition lock, including
        // when qualification is being enabled for the first time.
        let batch = db.batch(), writes = 0;
        for (const cacheId of new Set((value.swimmers || []).map(cacheIdFor).filter(Boolean))) {
          const target = targets.doc(cacheId).collection("entries").doc(document.id);
          if (competition.qualifications?.enabled) batch.set(target, { competitionId: data.competitionId }); else batch.delete(target);
          if (++writes === 450) { await batch.commit(); batch = db.batch(); writes = 0; }
        }
        if (writes) await batch.commit();
      }
    }
    const count = data.count + (data.state === "preview" ? removed.length : 0);
    const finished = page.size < 5;
    const state = finished ? (data.state === "preview" ? "ready" : "done") : data.state;
    await db.runTransaction(async (tx) => {
      const latest = await tx.get(jobRef);
      if (latest.data()?.cursor !== data.cursor || latest.data()?.state !== data.state) fail("Traitement concurrent : rechargez le contrôle.");
      tx.update(jobRef, { cursor: page.docs.at(-1)?.id || data.cursor, state, count, updatedAt: now() });
      if (state === "done") tx.update(competitionRef, { ...data.payload, ...(competition.qualifications?.enabled ? { missingEntryTimeMode: "default595999" } : {}), qualificationJobId: "", updatedAt: now(), updatedBy: context.uid });
    });
    if (state === "done") await audit("engagementQualifications.applied", context.uid, { competitionId: data.competitionId, jobId: jobRef.id, removedCount: count });
    return { state, count, removed, applyStarted: data.applyStarted === true };
  }

  async function listSources(request) {
    await national(request);
    const startDate = String(request.data?.startDate || "");
    const endDate = String(request.data?.endDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) fail("Renseignez la période avant de charger les compétitions.");
    let position;
    try { position = request.data?.cursor ? JSON.parse(request.data.cursor) : { phase: "legacy" }; }
    catch { fail("Pagination invalide."); }
    const phase = position.phase;
    if (!["legacy", "imports"].includes(phase)) fail("Pagination invalide.");
    const field = phase === "legacy" ? "date" : "metadata.date";
    // Load the calendar years touched by the rules. Filtering checkboxes and
    // searching loaded sources are entirely local to the editor.
    let query = db.collection(phase === "legacy" ? "engagementCalendarEvents" : "performanceImports")
      .where(field, ">=", `${startDate.slice(0, 4)}-01-01`).where(field, "<=", `${endDate.slice(0, 4)}-12-31`)
      .orderBy(field).orderBy("__name__").limit(50);
    if (position.id) query = query.startAfter(position.date, position.id);
    const page = await query.get();
    const sources = page.docs.flatMap((doc) => {
      const item = doc.data();
      if (phase === "legacy") {
        if (item.eventType !== "pool" || !item.legacyImport?.legacyCompetitionId) return [];
        return [{ id: String(item.legacyImport.legacyCompetitionId), name: item.name || doc.id, date: item.date || "", pool: item.poolLength || "", chrono: item.timingType || "" }];
      }
      if (item.status === "deleted") return [];
      return [{ id: item.metadata?.qualificationCompetitionId || doc.id, name: item.metadata?.competitionName || item.metadata?.competition || item.metadata?.name || item.fileName || doc.id, date: item.metadata?.date || "", pool: item.metadata?.poolSize || "", chrono: item.metadata?.timingType || item.metadata?.chrono || "" }];
    });
    const last = page.docs.at(-1);
    return { sources, cursor: page.size === 50 ? JSON.stringify({ phase, id: last.id, date: phase === "legacy" ? last.data().date : last.data().metadata.date }) : phase === "legacy" ? JSON.stringify({ phase: "imports" }) : "" };
  }

  async function grantException(request) {
    const actor = await national(request);
    const context = await clubAccess(request);
    const competitionId = String(request.data?.competitionId || "");
    const swimmerId = String(request.data?.swimmerIndexId || "");
    const eventCode = String(request.data?.eventCode || "");
    if (request.data?.confirmed !== true || !competitionId || !swimmerId || !/^[A-Z0-9]+$/.test(eventCode) ||
        [competitionId, swimmerId].some((id) => id.includes("/") || id.length > 128)) fail("Confirmation, nageur et course requis.", "invalid-argument");
    const competitionRef = competitions.doc(competitionId);
    const entryRef = entries.doc(entryIdFor(competitionId, context.clubId));
    const [competition, entry] = await db.getAll(competitionRef, entryRef);
    const value = { ...competition.data(), id: competitionId };
    if (!competition.exists || !value.qualifications?.enabled) fail("Cette compétition n'applique pas de grille.");
    if (value.qualificationJobId) fail("Un contrôle des qualifications est en cours.");
    assertOpen(value);
    const swimmer = (entry.data()?.swimmers || []).find((item) => item.swimmerIndexId === swimmerId);
    if (!swimmer || entry.data()?.clubId !== context.clubId) fail("Nageur absent des engagements du club sélectionné.", "permission-denied");
    const category = categoryFor(value.date, swimmer.birthDate);
    const event = eventsFor(value).find((item) => item.code === eventCode && item.type === "individual" && item.categories.includes(category));
    if (!event || !value.qualifications.groups.some((group) => group.categories.includes(category)) || !["F", "M"].includes(swimmer.sex)) fail("Course non ouverte pour ce nageur.");
    const rows = await rowsFor(swimmer, value);
    const input = { rules: value.qualifications, category, sex: swimmer.sex, events: eventsFor(value), rows };
    const evaluation = engine.evaluate(input);
    const ref = grants.doc(grantId(competitionId, swimmerId));
    const reason = evaluation.mode === "one" && !(swimmer.individualEntries || []).some((item) => evaluation.courses[item.eventCode]?.qualified)
      ? "Aucune course qualifiée engagée. " + evaluation.courses[eventCode].reason : evaluation.courses[eventCode].reason;
    const decision = await db.runTransaction(async (tx) => {
      const latestCompetition = await tx.get(competitionRef);
      const latestEntry = await tx.get(entryRef);
      const previous = await tx.get(ref);
      if (latestCompetition.updateTime.toMillis() !== competition.updateTime.toMillis() || sportingHash(latestEntry.data()) !== sportingHash(entry.data())) fail("Les engagements ou les règles ont changé. Rechargez avant de confirmer.");
      if (latestCompetition.data()?.qualificationJobId) fail("Un contrôle des qualifications est en cours.");
      assertOpen(latestCompetition.data());
      if (previous.exists && previous.data().clubId !== context.clubId) fail("Autorisation rattachée à un autre club.", "permission-denied");
      const courses = previous.data()?.courses || {};
      const accepted = courses[eventCode]?.status === "accepted" ? courses[eventCode]
        : { eventCode, status: "accepted", source: "national-exception", approvedBy: actor.uid, approvedAt: now(), reason };
      tx.set(ref, { clubId: context.clubId, competitionId, swimmerIndexId: swimmerId, courses: { [eventCode]: accepted } }, { merge: true });
      tx.update(competitionRef, { hasQualificationGrants: true, updatedAt: now() });
      return { accepted, approvals: Object.values({ ...courses, [eventCode]: accepted }) };
    });
    await audit("engagementQualificationException.granted", actor.uid, { competitionId, clubId: context.clubId, swimmerIndexId: swimmerId, eventCode });
    const result = engine.evaluate({ ...input, approvals: decision.approvals });
    return { ok: true, qualification: { ...result.courses[eventCode], mode: result.mode }, exception: decision.accepted };
  }

  async function syncTargets(event) {
    const before = event.data?.before?.exists ? event.data.before.data() : {};
    const after = event.data?.after?.exists ? event.data.after.data() : {};
    const competitionId = after.competitionId || before.competitionId;
    if (!competitionId) return;
    const oldIds = new Set((before.swimmers || []).map(cacheIdFor));
    const newIds = new Set((after.swimmers || []).map(cacheIdFor));
    const force = before.qualificationAppliedJobId !== after.qualificationAppliedJobId;
    if (hash([...oldIds].sort()) === hash([...newIds].sort())) return;
    const competition = await competitions.doc(competitionId).get();
    const nextIds = competition.data()?.qualifications?.enabled ? newIds : new Set();
    let batch = db.batch(), writes = 0;
    for (const cacheId of new Set([...oldIds, ...nextIds])) {
      if (!force && oldIds.has(cacheId) === nextIds.has(cacheId)) continue;
      const ref = targets.doc(cacheId).collection("entries").doc(event.params.entryId);
      if (nextIds.has(cacheId)) batch.set(ref, { competitionId }); else batch.delete(ref);
      if (++writes === 450) { await batch.commit(); batch = db.batch(); writes = 0; }
    }
    if (writes) await batch.commit();
    // A correction can race the creation of a swimmer's first dependency.
    // Recheck newly indexed swimmers once; ordinary checkbox edits do not run this.
    for (const cacheId of nextIds) {
      if (!oldIds.has(cacheId)) await revalidateCache({ params: { cacheId }, data: {} });
    }
  }

  async function revalidateCache(event) {
    if (event.data?.after?.exists) return;
    const cacheId = event.params.cacheId;
    let cursor = "";
    do {
      let query = targets.doc(cacheId).collection("entries").orderBy("__name__").limit(25);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const target of page.docs) {
        const competitionRef = competitions.doc(target.data().competitionId);
        const entryRef = entries.doc(target.id);
        const [competition, entry] = await db.getAll(competitionRef, entryRef);
        if (!entry.exists || !competition.data()?.qualifications?.enabled) continue;
        if (competition.data()?.qualificationJobId) fail("Contrôle en cours : revalidation différée.");
        const result = await reconcile(entry.data(), { ...competition.data(), id: competition.id }, cacheId);
        if (sportingHash(result) === sportingHash(entry.data())) continue;
        await db.runTransaction(async (tx) => {
          const latest = await tx.get(entryRef);
          const latestCompetition = await tx.get(competitionRef);
          if (hash(latest.data()) !== hash(entry.data()) || latestCompetition.data()?.qualificationJobId || latestCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) fail("Engagement modifié pendant le contrôle : nouvelle tentative.");
          tx.update(entryRef, { swimmers: result.swimmers, relays: result.relays, updatedAt: now(), "documents.clubRecapPdf": {},
            ...(result.removed.length ? { qualificationAlert: { at: now(), reason: "Performance justificative modifiée ou supprimée", removed: result.removed } } : {}) });
        });
        await audit("engagementQualifications.performanceChanged", "system:qualifications", { competitionId: competition.id, entryId: entry.id, removed: auditRemovals(result.removed) });
      }
      cursor = page.size === 25 ? page.docs.at(-1).id : "";
    } while (cursor);
  }
  return { evaluate, reconcile, begin, process, listSources, grantException, revokeRemovedExceptions, acknowledgeAlert, syncTargets, revalidateCache };
}

module.exports = { createQualificationService };
