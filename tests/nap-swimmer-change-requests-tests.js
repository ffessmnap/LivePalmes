"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { prepareRequest, prepareResolution } = require("../functions/nap-swimmer-change-requests");
const { fingerprint } = require("../functions/nap-portal-swimmer-change");
const { correctPortalIdentity } = require("../functions/nap-portal-swimmers");
const { createHash } = require("node:crypto");
const before = { id: 42, nom: "EXEMPLE", prenom: "Test", date: "2000-01-01", sexe: "F", club: "106" };
const context = { uid: "club-user", clubId: "106", clubName: "Club test", regionId: "1" };
const input = { napSource: true, swimmerId: "42", expectedFingerprint: fingerprint(before), proposed: { lastName: "CORRIGE", licenseNumber: "" }, reason: "Correction reelle demandee" };
const source = fs.readFileSync("functions/index.js", "utf8");
const requestCode = source.slice(source.indexOf("exports.requestEngagementClubSwimmerChange ="), source.indexOf("exports.listEngagementSwimmerChangeRequests ="));
const resolveCode = source.slice(source.indexOf("exports.resolveEngagementSwimmerChangeRequest ="), source.indexOf("exports.updateEngagementNationalSwimmerIdentity ="));
const stableHash = value => createHash("sha256").update(value).digest("hex");
class CallableError extends Error { constructor(code, message) { super(message); this.code = code; } }
function fixture(options = {}) {
  const records = new Map(), audits = new Map();
  let row = { ...before, actif: 0, wc: null, edf: 0, creation: "2001-01-01 00:00:00", number: null };
  let sqlWrites = 0, notifications = 0, queries = 0, locked = false, releases = 0, failComplete = !!options.failComplete;
  const connection = {
    execute: async (query, params) => {
      queries++;
      if (query.sql.includes("GET_LOCK")) { const acquired = !locked; if (acquired) locked = true; return [[{ acquired: acquired ? 1 : 0 }]]; }
      if (query.sql.includes("RELEASE_LOCK")) { locked = false; return [[{ released: 1 }]]; }
      if (query.sql.includes("FORCE INDEX")) return [[]];
      if (query.sql.startsWith("SELECT")) { assert.ok(query.sql.includes("WHERE id=? LIMIT 1")); assert.equal(params[0], 42); return [[{ ...row }]]; }
      assert.ok(query.sql.startsWith("UPDATE nageurs SET")); assert.ok(audits.size, "durable backup must precede SQL");
      sqlWrites++; row.nom = params[0]; return [{ affectedRows: 1 }];
    }, release: () => { releases++; }, destroy: () => { locked = false; }
  };
  const refFor = (recordsMap, id) => ({
    id,
    get: async () => ({ id, exists: recordsMap.has(id), data: () => structuredClone(recordsMap.get(id)) }),
    create: async value => { if (recordsMap.has(id)) throw new Error("already exists"); recordsMap.set(id, structuredClone(value)); },
    set: async (value, config) => {
      if (recordsMap === records && value.status === "approved" && failComplete) { failComplete = false; throw new Error("request store unavailable after SQL"); }
      recordsMap.set(id, structuredClone(config?.merge ? { ...recordsMap.get(id), ...value } : value));
    }
  });
  const sandbox = { exports: {}, onCall: (_, callback) => callback, ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS: {}, ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS: { secrets: [] },
    ENVIRONMENT: { projectId: "livepalmes-test" }, defineSecret: value => value, process: { env: {} }, TypeError, RangeError, HttpsError: CallableError,
    cleanText: value => String(value || ""), cleanFirestoreValue: value => value, stableHash,
    ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION: "requests",
    engagementClubAccessContext: async () => { if (options.clubDenied) throw new CallableError("permission-denied", "denied"); return context; },
    engagementAccessContext: async () => ({ national: options.national !== false, uid: "national-user" }),
    engagementSwimmerChangeRequestItem: doc => { const { nativeBefore, nativeResolution, expectedFingerprint, ...visible } = doc.data(); return visible; },
    writeAuditLogOnce: async () => {},
    sendEngagementSwimmerChangeResolutionNotification: async () => { notifications++; return { status: "sent" }; },
    db: {
      collection: name => { assert.ok(["requests", "auditLogs"].includes(name), `old sports collection ${name} forbidden`); return { doc: id => refFor(name === "requests" ? records : audits, id) }; },
      runTransaction: async callback => callback({ get: ref => ref.get(), set: (ref, value, config) => { records.set(ref.id, structuredClone(config?.merge ? { ...records.get(ref.id), ...value } : value)); } })
    },
    require: name => {
      if (name === "./nap-swimmer-change-requests") return { prepareRequest, prepareResolution };
      assert.equal(name, "./nap-portal-swimmers");
      return { portalPool: () => ({ execute: connection.execute, getConnection: async () => connection }), correctPortalIdentity };
    }
  };
  vm.runInNewContext(requestCode + resolveCode, sandbox);
  return { sandbox, records, audits, row, count: () => ({ sqlWrites, notifications, queries, locked, releases }),
    submit: data => sandbox.exports.requestEngagementClubSwimmerChange({ data: data || input }),
    resolve: data => sandbox.exports.resolveEngagementSwimmerChangeRequest({ data }) };
}
(async () => {
  let reads = 0;
  const connection = { execute: async (query, params) => { reads++; assert.equal(query.sql, "SELECT id,nom,prenom,date,sexe,club FROM nageurs WHERE id=? LIMIT 1"); assert.deepEqual(params, [42]); return [[before]]; } };
  const prepared = await prepareRequest(connection, input, context);
  assert.equal(reads, 1); assert.equal(prepared.proposed.lastName, "CORRIGE"); assert.equal(prepared.expectedFingerprint, fingerprint(before));
  for (const bad of [{ ...input, napSource: false }, { ...input, reason: "" }, { ...input, proposed: { club: "1" } }, { ...input, proposed: { licenseNumber: "A-12-12345" } }]) await assert.rejects(prepareRequest(connection, bad, context), TypeError);
  assert.equal(reads, 1, "invalid input must be rejected before SQL");
  await assert.rejects(prepareRequest(connection, input, { ...context, clubId: "107" }), /club actif/);
  await assert.rejects(prepareRequest(connection, { ...input, expectedFingerprint: "a".repeat(64) }, context), /change/);
  const saved = { ...prepared, clubId: "106" };
  assert.equal(prepareResolution(saved, { decision: "approved" }, "national").proposalAdjusted, false);
  assert.equal(prepareResolution(saved, { decision: "approved", proposed: { lastName: "AUTRE" } }, "national").proposalAdjusted, true);
  assert.throws(() => prepareResolution({ ...saved, clubId: "107" }, { decision: "approved" }, "national"), /incompatible/);
  assert.throws(() => prepareResolution({ ...saved, napSource: false }, { decision: "rejected" }, "national"), /ancienne demande/);
  const f = fixture(); const created = await f.submit();
  assert.equal(f.count().sqlWrites, 0); assert.equal(f.count().notifications, 0); assert.equal(created.request.napSource, true); assert.ok(!created.request.nativeBefore);
  await assert.rejects(f.submit(), error => error.code === "already-exists");
  const decision = { requestId: created.request.id, decision: "approved", actorUid: "spoof" };
  const result = await f.resolve(decision); assert.equal(result.result.source, "nap"); assert.equal(f.row.nom, "CORRIGE"); assert.equal(f.count().sqlWrites, 1); assert.equal(f.count().notifications, 1); assert.equal(f.count().locked, false);
  await f.resolve(decision); assert.equal(f.count().sqlWrites, 1); assert.equal(f.count().notifications, 1, "completed retry must not send duplicate notification");
  const rejected = fixture(); const r = await rejected.submit(); await rejected.resolve({ requestId: r.request.id, decision: "rejected" }); assert.equal(rejected.count().sqlWrites, 0);
  const concurrent = fixture(); const c = await concurrent.submit();
  const outcomes = await Promise.allSettled([concurrent.resolve({ requestId: c.request.id, decision: "approved" }), concurrent.resolve({ requestId: c.request.id, decision: "approved" })]);
  assert.equal(outcomes.filter(item => item.status === "fulfilled").length, 1); assert.equal(concurrent.count().sqlWrites, 1); assert.equal(concurrent.count().notifications, 1);
  const retry = fixture({ failComplete: true }); const pending = await retry.submit(); const retryInput = { requestId: pending.request.id, decision: "approved" };
  await assert.rejects(retry.resolve(retryInput), error => error.code === "unavailable"); assert.equal(retry.count().sqlWrites, 1); assert.equal(retry.count().notifications, 0); assert.equal(retry.count().locked, false);
  await assert.rejects(retry.resolve({ ...retryInput, proposed: { lastName: "DIFFERENT" } }), error => error.code === "failed-precondition");
  await retry.resolve(retryInput); assert.equal(retry.count().sqlWrites, 1); assert.equal(retry.count().notifications, 1);
  const stale = fixture(); const s = await stale.submit(); stale.row.prenom = "MODIFIE"; await assert.rejects(stale.resolve({ requestId: s.request.id, decision: "approved" }), error => error.code === "failed-precondition"); assert.equal(stale.count().sqlWrites, 0);
  assert.equal(stale.records.get(s.request.id).nativeResolution, null, "a failed first decision before SQL must not prevent rejecting the request");
  await stale.resolve({ requestId: s.request.id, decision: "rejected" }); assert.equal(stale.count().sqlWrites, 0);
  const denied = fixture({ national: false }); await assert.rejects(denied.resolve({ requestId: "x", decision: "approved" }), error => error.code === "permission-denied"); assert.equal(denied.count().queries, 0);
  const clubDenied = fixture({ clubDenied: true }); await assert.rejects(clubDenied.submit(), error => error.code === "permission-denied"); assert.equal(clubDenied.count().queries, 0);
  const browser = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8");
  assert.ok(browser.includes("if (swimmer.napSource && elements.engagementsSwimmerCorrectionForm)"));
  assert.ok(browser.includes('swimmer.napSource ? "" : swimmer.licenseNumber'));
  const snapshotCode = source.slice(source.indexOf("function engagementSwimmerIdentitySnapshot("), source.indexOf("function cleanEngagementSwimmerIdentityCorrection("));
  const dtoCode = source.slice(source.indexOf("function engagementSwimmerChangeRequestItem("), source.indexOf("async function sendEngagementSwimmerChangeResolutionNotification("));
  const dto = { cleanText: value => String(value || ""), cleanIsoDate: value => value || "", cleanFirestoreValue: value => value };
  vm.runInNewContext(snapshotCode + dtoCode, dto);
  const visible = dto.engagementSwimmerChangeRequestItem({ id: "request", data: () => saved });
  assert.equal(visible.napSource, true); assert.equal(visible.current.napSource, true); assert.equal(visible.current.napFingerprint, input.expectedFingerprint);
  assert.ok(!visible.nativeBefore); assert.ok(!visible.expectedFingerprint); assert.ok(!visible.nativeResolution);
  const elements = { engagementsSwimmerCorrectionDialog: { showModal: () => {} } };
  for (const key of ["Form", "License", "Mode", "Source", "Id", "IdentityKey", "LastName", "FirstName", "BirthDate", "Sex", "Title", "Context", "ReasonLabel", "Reason", "Submit"]) elements[`engagementsSwimmerCorrection${key}`] = { dataset: {}, focus: () => {} };
  const ui = { elements, HTMLElement: class {}, engagementSwimmerCorrectionOpener: null, engagementSwimmerCorrectionReview: null,
    resetEngagementSwimmerCorrectionDialog: () => { elements.engagementsSwimmerCorrectionForm.dataset = {}; elements.engagementsSwimmerCorrectionLicense.readOnly = false; },
    engagementSwimmerDisplayName: () => "Test", clubDisplayLabel: () => "Club" };
  vm.runInNewContext(browser.slice(browser.indexOf("  function openEngagementSwimmerCorrectionDialog("), browser.indexOf("  async function submitEngagementSwimmerCorrection(")), ui);
  for (const mode of ["request", "direct", "review"]) {
    ui.openEngagementSwimmerCorrectionDialog({ ...saved.current, licenseNumber: "OLD-LICENCE" }, mode);
    assert.equal(elements.engagementsSwimmerCorrectionForm.dataset.napSource, "true");
    assert.equal(elements.engagementsSwimmerCorrectionLicense.readOnly, true); assert.equal(elements.engagementsSwimmerCorrectionLicense.value, "");
    assert.equal(elements.engagementsSwimmerCorrectionLastName.maxLength, 64);
    assert.equal(elements.engagementsSwimmerCorrectionReason.required, mode !== "review");
  }
  console.log("Demandes NAP : club, validation nationale, sauvegarde, reprise apres SQL, refus, concurrence et absence d'ancienne base verifies sans reseau ni envoi.");
})().catch(error => { console.error(error); process.exitCode = 1; });
