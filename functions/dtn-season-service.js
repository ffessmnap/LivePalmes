"use strict";

const engine = require("./dtn-season-engine");
const seed = require("./config/dtn-season-2025-2026.json");
const crypto = require("node:crypto");
const clone = (value) => JSON.parse(JSON.stringify(value));
const MAX_ROWS = 100000;
const PAGE_SIZE = 500;

function createDtnSeasonService({ db, fail, authorize, canManage, normalizeRow, fieldPath }) {
  const config = db.collection("dtnSeasons");
  const catalogRef = config.doc("catalog");
  const cache = db.collection("dtnQualificationViews");
  const states = db.collection("dtnQualificationViewState");
  const jobs = db.collection("dtnQualificationJobs");
  const catalogDefault = () => ({ revision: 0, current: seed.id, previous: "", draft: "" });
  const seasonData = (snapshot, id) => snapshot.exists ? snapshot.data() : id === seed.id ? clone(seed) : null;
  const cacheRef = (id, device) => cache.doc(`season-${id}-${device}`);
  const fingerprint = (season, version) => crypto.createHash("sha256").update(JSON.stringify({ engine: 1, season, version })).digest("hex");
  function checkConfig(value, incomplete = false) {
    try { return engine.validateSeason(value, { incomplete }); }
    catch (error) { fail(error.message, "invalid-argument"); }
  }
  function checkId(id) {
    if (!/^\d{4}-\d{4}$/.test(id || "") || Number(id.slice(5)) !== Number(id.slice(0, 4)) + 1 || Number(id.slice(5)) < 2001 || Number(id.slice(5)) > 2100) fail("Saison invalide.", "invalid-argument");
    return id;
  }
  async function context(request, id, manage = false) {
    await authorize(request);
    if (manage && !canManage(request)) fail("Droit de gestion DTN requis.", "permission-denied");
    const catalog = (await catalogRef.get()).data() || catalogDefault();
    if (id && ![catalog.current, catalog.previous, ...(canManage(request) ? [catalog.draft] : [])].includes(id)) fail("Saison non accessible.", "permission-denied");
    return catalog;
  }
  async function list(request) {
    const catalog = await context(request);
    const ids = [catalog.previous, catalog.current, ...(canManage(request) ? [catalog.draft] : [])].filter(Boolean);
    const snapshots = await db.getAll(...ids.map((id) => config.doc(id)));
    const seasons = snapshots.map((snapshot, i) => seasonData(snapshot, ids[i]));
    if (seasons.some((s) => !s)) fail("Configuration de saison manquante.", "failed-precondition");
    return { catalog, seasons, canManage: canManage(request) };
  }
  async function update(request) {
    await context(request, null, true);
    const action = request.data?.action;
    const id = checkId(request.data?.id);
    const now = new Date().toISOString();
    return db.runTransaction(async (tx) => {
      const catalog = (await tx.get(catalogRef)).data() || catalogDefault();
      if (request.data.catalogRevision !== catalog.revision) fail("Les saisons ont changé. Rechargez avant de continuer.", "aborted");
      const ref = config.doc(id);
      const snapshot = await tx.get(ref);
      const current = seasonData(snapshot, id);
      let nextCatalog = { ...catalog, revision: catalog.revision + 1 }, season;
      if (action === "create") {
        if (catalog.draft) fail("Une saison suivante est déjà en préparation.", "failed-precondition");
        const currentSnapshot = await tx.get(config.doc(catalog.current));
        const source = seasonData(currentSnapshot, catalog.current);
        const nextYear = source.year + 1;
        if (id !== `${nextYear - 1}-${nextYear}` || snapshot.exists) fail("La prochaine saison existe déjà ou est invalide.", "failed-precondition");
        season = clone(source);
        season.id = id; season.year = nextYear; season.revision = 1;
        for (const device of engine.DEVICES) for (const p of season[device]) {
          for (const key of ["startDate", "endDate"]) {
            const year = Number(p[key].slice(0, 4)) + 1;
            const suffix = p[key].slice(4) === "-02-29" && new Date(`${year}-02-29`).getUTCMonth() !== 1 ? "-02-28" : p[key].slice(4);
            p[key] = `${year}${suffix}`;
          }
          p.pools = ["50"]; p.electronicOnly = true; p.allowIntermediate = true;
          delete p.legacyUnrestricted; delete p.legacyFranceNames;
          p.competitions = [];
          if (request.data.duplicate === false) { p.grid = {}; p.enabled = false; }
        }
        season = checkConfig(season, true);
        nextCatalog.draft = id;
        // Materialize only the known historical configuration, not performances.
        if (!currentSnapshot.exists) tx.set(config.doc(catalog.current), source);
      } else {
        if (!current || ![catalog.current, catalog.draft].includes(id)) fail("La saison précédente est en consultation seule.", "permission-denied");
        if (request.data.revision !== current.revision) fail("La configuration a changé. Rechargez avant d’enregistrer.", "aborted");
        if (action === "save") {
          season = checkConfig({ ...request.data.season, id, year: current.year, revision: current.revision + 1 }, id === catalog.draft);
        } else if (action === "activate") {
          if (id !== catalog.draft || request.data.confirmed !== true) fail("Confirmez l’activation de la saison brouillon.", "failed-precondition");
          season = checkConfig(current);
          const state = (await tx.get(states.doc(String(season.year)))).data() || {};
          const expected = fingerprint(season, state.version || 0);
          for (const device of engine.DEVICES) {
            const computed = (await tx.get(cacheRef(id, device))).data();
            if (computed?.fingerprint !== expected) fail("Calculez et vérifiez les trois dispositifs du brouillon avant son activation.", "failed-precondition");
          }
          const previousSeason = seasonData(await tx.get(config.doc(catalog.current)), catalog.current);
          const previousState = (await tx.get(states.doc(String(previousSeason.year)))).data() || {};
          const previousFingerprint = fingerprint(previousSeason, previousState.version || 0);
          for (const device of engine.DEVICES) {
            const previousView = (await tx.get(cacheRef(catalog.current, device))).data();
            if (previousView?.fingerprint !== previousFingerprint) fail("Recalculez aussi la saison active avant la bascule pour conserver ses résultats en consultation.", "failed-precondition");
          }
          nextCatalog = { ...nextCatalog, previous: catalog.current, current: id, draft: "" };
        } else fail("Action inconnue.", "invalid-argument");
      }
      tx.set(ref, season);
      tx.set(catalogRef, nextCatalog);
      tx.set(db.collection("auditLogs").doc(), { action: `dtn.season.${action}`, actorUid: request.auth.uid, createdAt: now, target: { seasonId: id, revision: season.revision } });
      return { catalog: nextCatalog, season };
    });
  }
  async function overview(request) {
    const id = checkId(request.data?.id), device = request.data?.device;
    if (!engine.DEVICES.includes(device)) fail("Dispositif invalide.", "invalid-argument");
    const catalog = await context(request, id);
    const season = seasonData(await config.doc(id).get(), id);
    if (!season) fail("Configuration introuvable.", "failed-precondition");
    const [stateSnapshot, viewSnapshot] = await db.getAll(states.doc(String(season.year)), cacheRef(id, device));
    const version = stateSnapshot.data()?.version || 0;
    const expected = fingerprint(season, version), view = viewSnapshot.data();
    if (id === catalog.previous && view?.fingerprint === fingerprint(season, view.sourceVersion)) return { ...view, hit: true, frozen: true };
    if (view?.fingerprint === expected && request.data.rebuild !== true) return { ...view, hit: true };
    if (request.data.rebuild === true) {
      if (id === catalog.previous) fail("La saison précédente reste en consultation seule.", "permission-denied");
      checkConfig(season);
      // One explicit rebuild scans once for all three devices, not per tab/sex.
      const lockRef = jobs.doc(`season-lock-${id}`);
      await db.runTransaction(async (tx) => {
        const lock = (await tx.get(lockRef)).data();
        if (lock && ["pending", "running"].includes(lock.status) && Date.now() - Date.parse(lock.createdAt) < 10 * 60000) return;
        const ref = jobs.doc();
        const job = { view: "season", season, fingerprint: expected, sourceVersion: version, status: "pending", createdAt: new Date().toISOString(), lockId: lockRef.id };
        tx.set(lockRef, { status: "pending", createdAt: job.createdAt, jobId: ref.id });
        tx.set(ref, job);
      });
    }
    const lock = (await jobs.doc(`season-lock-${id}`).get()).data();
    const pending = lock && ["running", "pending"].includes(lock.status) && Date.now() - Date.parse(lock.createdAt) < 10 * 60000;
    // Never display results from another configuration as current results.
    return { hit: false, pending: Boolean(pending), error: lock?.status === "failed" ? lock.error : "", revision: season.revision, generatedAt: view?.generatedAt || "", profiles: [] };
  }
  async function build(snapshot) {
    const job = snapshot.data();
    if (job.view !== "season") return;
    const lockRef = jobs.doc(job.lockId);
    const claimed = await db.runTransaction(async (tx) => {
      const latest = (await tx.get(snapshot.ref)).data();
      if (latest?.status !== "pending") return false;
      tx.update(snapshot.ref, { status: "running" });
      tx.set(lockRef, { status: "running" }, { merge: true });
      return true;
    });
    if (!claimed) return;
    try {
      const season = checkConfig(job.season);
      const accumulators = Object.fromEntries(engine.DEVICES.map((d) => [d, engine.createAccumulator(season, d)]));
      let cursor = null, count = 0;
      const started = Date.now();
      for (;;) {
        let query = db.collection("performances").where("seasonYear", "==", season.year).orderBy(fieldPath.documentId()).limit(PAGE_SIZE);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        count += page.size;
        if (count > MAX_ROWS || Date.now() - started > 450000) throw new Error("Calcul borné interrompu : saison trop volumineuse. Aucun résultat partiel publié.");
        for (const doc of page.docs) {
          const row = normalizeRow({ ...doc.data(), id: doc.id });
          for (const device of engine.DEVICES) engine.consume(accumulators[device], season, row);
        }
        if (page.size < PAGE_SIZE) break;
        cursor = page.docs.at(-1);
      }
      const generatedAt = new Date().toISOString();
      const views = engine.DEVICES.map((device) => ({ device, data: { profiles: engine.finish(accumulators[device], season, device), fingerprint: job.fingerprint, revision: season.revision, sourceVersion: job.sourceVersion, generatedAt, scannedRows: count } }));
      if (views.some((v) => Buffer.byteLength(JSON.stringify(v.data)) >= 900000)) throw new Error("Résultats trop volumineux pour une vue DTN. Aucun résultat partiel publié.");
      await db.runTransaction(async (tx) => {
        const current = seasonData(await tx.get(config.doc(season.id)), season.id);
        const state = (await tx.get(states.doc(String(season.year)))).data() || {};
        const catalog = (await tx.get(catalogRef)).data() || catalogDefault();
        if (!current || ![catalog.current, catalog.draft].includes(season.id) || fingerprint(current, state.version || 0) !== job.fingerprint) throw new Error("Configuration ou performances modifiées pendant le calcul. Relancez le recalcul.");
        for (const view of views) tx.set(cacheRef(season.id, view.device), view.data);
        tx.update(snapshot.ref, { status: "completed", completedAt: generatedAt, scannedRows: count });
        tx.set(lockRef, { status: "completed", completedAt: generatedAt }, { merge: true });
      });
    } catch (error) {
      const state = { status: "failed", error: String(error.message).slice(0, 300), completedAt: new Date().toISOString() };
      const batch = db.batch(); batch.set(snapshot.ref, state, { merge: true }); batch.set(lockRef, state, { merge: true }); await batch.commit();
    }
  }
  async function sources(request) {
    await context(request, checkId(request.data?.id), true);
    const year = Number(request.data.id.slice(5));
    let position;
    try { position = request.data.cursor ? JSON.parse(request.data.cursor) : { phase: "legacy" }; }
    catch { fail("Pagination invalide.", "invalid-argument"); }
    if (!["legacy", "imports"].includes(position.phase) || (position.id && (typeof position.id !== "string" || typeof position.date !== "string"))) fail("Pagination invalide.", "invalid-argument");
    const legacy = position.phase === "legacy", field = legacy ? "date" : "metadata.date";
    let query = db.collection(legacy ? "engagementCalendarEvents" : "performanceImports").where(field, ">=", `${year - 1}-09-01`).where(field, "<=", `${year}-08-31`).orderBy(field).orderBy(fieldPath.documentId()).limit(50);
    if (position.id) query = query.startAfter(position.date, position.id);
    const page = await query.get();
    const rows = page.docs.flatMap((doc) => {
      const item = doc.data();
      if (legacy) return item.eventType === "pool" && item.legacyImport?.legacyCompetitionId ? [{ id: String(item.legacyImport.legacyCompetitionId), name: item.name || doc.id, date: item.date || "" }] : [];
      return item.status === "deleted" ? [] : [{ id: item.metadata?.qualificationCompetitionId || doc.id, name: item.metadata?.competitionName || item.metadata?.competition || item.metadata?.name || item.fileName || doc.id, date: item.metadata?.date || "" }];
    });
    const last = page.docs.at(-1);
    return { sources: rows, cursor: page.size === 50 ? JSON.stringify({ phase: position.phase, id: last.id, date: legacy ? last.data().date : last.data().metadata.date }) : legacy ? JSON.stringify({ phase: "imports" }) : "" };
  }
  return { list, update, overview, build, sources };
}
module.exports = { createDtnSeasonService, MAX_ROWS, PAGE_SIZE };
