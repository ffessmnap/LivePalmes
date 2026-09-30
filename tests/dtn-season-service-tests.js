"use strict";
const assert = require("node:assert/strict");
const { createDtnSeasonService } = require("../functions/dtn-season-service");
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
      orderBy: (field) => query(path, filters, cursor, limit, [...orders, field]), startAfter: (...position) => query(path, filters, position.map((p) => typeof p === "object" ? p.id : p), limit, orders), limit: (size) => query(path, filters, cursor, size, orders),
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
    return { get: (reference) => { if (writes.length) throw new Error("Transaction read after write"); return reference.get(); }, create: (reference, data) => writes.push(() => reference.set(data)), set: (reference, data, options) => writes.push(() => reference.set(data, options)), update: (reference, data) => writes.push(() => reference.update(data)), delete: (reference) => writes.push(() => reference.delete()), commit: async () => { for (const write of writes) await write(); } };
  }
  return { collection: query, getAll: (...refs) => Promise.all(refs.map((reference) => reference.get())), batch: transaction,
    runTransaction: async (fn) => { const tx = transaction(); const result = await fn(tx); await tx.commit(); return result; }, reads };
}

async function main() {
  const db = database();
  const service = createDtnSeasonService({ db, fieldPath: { documentId: () => "__name__" }, normalizeRow: (r) => r,
    authorize: async (r) => { if (!r.auth || r.read === false) throw new Error("forbidden"); }, canManage: (r) => r.manage === true,
    fail: (message, code) => { const error = new Error(message); error.code = code; throw error; } });
  const request = (data = {}, manage = true) => ({ auth: { uid: "manager" }, manage, data });
  let catalog = await service.list(request());
  assert.equal(catalog.seasons.length, 1); assert.equal(catalog.catalog.current, "2025-2026");
  assert.equal((await db.collection("dtnSeasons").doc("catalog").get()).exists, false, "Read does not initialize data");
  await assert.rejects(service.list({ read: false }), /forbidden/);
  await assert.rejects(service.update(request({ action: "create", id: "2026-2027", catalogRevision: 0 }, false)), /gestion/);
  const created = await service.update(request({ action: "create", id: "2026-2027", catalogRevision: 0, duplicate: true }));
  assert.equal(created.season.edf[0].pools[0], "50"); assert.equal(created.season.edf[0].electronicOnly, true);
  assert.equal(created.season.edf[0].competitions.length, 0);
  assert.equal((await service.list(request({}, false))).seasons.length, 1, "Readers cannot see draft");
  await assert.rejects(service.overview(request({ id: "2026-2027", device: "france" }, false)), /accessible/);
  await assert.rejects(service.update(request({ action: "create", id: "2026-2027", catalogRevision: 1 })), /préparation/);
  const s = created.season;
  for (const d of ["france", "edf", "listing"]) for (const p of s[d]) p.competitionMode = "all";
  const saved = await service.update(request({ action: "save", id: s.id, revision: 1, catalogRevision: 1, season: s }));
  assert.equal(saved.season.revision, 2);
  await assert.rejects(service.update(request({ action: "save", id: s.id, revision: 1, catalogRevision: 2, season: s })), /configuration a changé/);
  await assert.rejects(service.update(request({ action: "activate", id: s.id, revision: 2, catalogRevision: 2, confirmed: true })), /Calculez/);
  // Reading a missing result never scans performances or creates a job.
  let before = (await db.collection("dtnQualificationJobs").limit(100).get()).size;
  assert.equal((await service.overview(request({ id: s.id, device: "france" }))).hit, false);
  assert.equal((await db.collection("dtnQualificationJobs").limit(100).get()).size, before);
  for (let i = 0; i < 501; i++) await db.collection("performances").doc(String(i).padStart(4, "0")).set({ seasonYear: 2027, swimmerId: `athlete-${i}`, swimmer: `Athlete ${i}`, date: "2027-02-01", birthDate: "2007-01-01", course: "100SF", sex: "F", pool: "50", chrono: "E", timeValue: 60000 });
  await service.overview(request({ id: s.id, device: "france", rebuild: true }));
  before = (await db.collection("dtnQualificationJobs").limit(100).get()).size;
  await service.overview(request({ id: s.id, device: "edf", rebuild: true }));
  assert.equal((await db.collection("dtnQualificationJobs").limit(100).get()).size, before, "Concurrent rebuild requests coalesce");
  async function runPending() {
    for (const doc of (await db.collection("dtnQualificationJobs").limit(100).get()).docs) if (doc.data().view === "season" && doc.data().status === "pending") await service.build(doc);
  }
  await runPending();
  let view = await service.overview(request({ id: s.id, device: "edf" }));
  assert.equal(view.hit, true); assert.equal(view.scannedRows, 501, "Pages are traversed exactly once");
  await service.overview(request({ id: "2025-2026", device: "france", rebuild: true })); await runPending();
  const activated = await service.update(request({ action: "activate", id: s.id, revision: 2, catalogRevision: 2, confirmed: true }));
  assert.equal(activated.catalog.previous, "2025-2026"); assert.equal(activated.catalog.current, s.id); assert.equal(activated.catalog.draft, "");
  await assert.rejects(service.update(request({ action: "save", id: "2025-2026", revision: 1, catalogRevision: 3, season: s })), /consultation seule/);
  await db.collection("dtnQualificationViewState").doc("2026").set({ version: 1 });
  assert.equal((await service.overview(request({ id: "2025-2026", device: "france" }))).frozen, true);
  const following = await service.update(request({ action: "create", id: "2027-2028", catalogRevision: 3 }));
  assert.equal(following.season.year, 2028);
  assert.equal((await service.list(request({}, false))).seasons.length, 2);
  // A concurrent performance change invalidates the whole rebuild, no partial views.
  await service.overview(request({ id: s.id, device: "france", rebuild: true }));
  await db.collection("dtnQualificationViewState").doc("2027").set({ version: 1 });
  await runPending();
  view = await service.overview(request({ id: s.id, device: "france" }));
  assert.equal(view.hit, false); assert.match(view.error, /modifiées/); assert.equal(view.profiles.length, 0);
  await service.overview(request({ id: s.id, device: "france", rebuild: true })); await runPending();
  assert.equal((await service.overview(request({ id: s.id, device: "france" }))).hit, true, "Failed calculation can be retried");
  // Withdraw the oldest season by activating a third, without deleting its data.
  const s3 = following.season;
  for (const d of ["france", "edf", "listing"]) for (const p of s3[d]) p.competitionMode = "all";
  await service.update(request({ action: "save", id: s3.id, revision: 1, catalogRevision: 4, season: s3 }));
  await service.overview(request({ id: s3.id, device: "france", rebuild: true })); await runPending();
  await service.update(request({ action: "activate", id: s3.id, revision: 2, catalogRevision: 5, confirmed: true }));
  assert.deepEqual((await service.list(request({}, false))).seasons.map((s) => s.id), ["2026-2027", "2027-2028"]);
  await assert.rejects(service.overview(request({ id: "2025-2026", device: "france" })), /accessible/);
  assert.equal((await db.collection("dtnSeasons").doc("2025-2026").get()).exists, true);
  assert.equal((await db.collection("performances").limit(1000).get()).size, 501);
  console.log("DTN season service: rights, draft, conflicts, bounded pages, rebuilds, activation, retention and stale results OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
