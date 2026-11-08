"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), vm = require("node:vm"), fs = require("./helpers/source-files");
const decisionMail = require("../functions/request-decision-mail");
const deletionFactory = require("../functions/backend/portal-access-handlers/resolve-access-user-deletion-request").createAccessHandlers_resolveAccessUserDeletionRequest;
const source = fs.readFileSync("functions/index.js", "utf8");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function fixture(type, decision) {
  let data = { status: "pending", requestedAt: "2026-11-08T10:00:00Z", requestedByEmail: "requester@example.test", email: "access@example.test",
    firstName: "Test", targetUid: "target", targetEmail: "deleted@example.test", clubId: "106", current: { firstName: "Test" },
    ...(type === "duplicate" ? { reportType: "duplicate", expectedFingerprint: "fingerprint" } : {}),
    ...(type === "ns" ? { requestType: "swimmer-ns" } : type === "official" ? { requestType: "person-change" } : {}) };
  let mutations = 0, catalogReads = 0;
  const snapshot = () => ({ id: "request", exists: true, data: () => structuredClone(data) });
  const ref = { id: "request", get: async () => snapshot(), set: async (patch, config) => { data = config?.merge ? { ...data, ...structuredClone(patch) } : structuredClone(patch); } };
  const db = { collection: () => ({ doc: () => ref }), runTransaction: async fn => fn({ get: async () => snapshot(),
    set: (_, patch) => { data = { ...data, ...structuredClone(patch) }; } }) };
  const services = () => ({ projectId: "livepalmes-test", readTemplates: async () => { catalogReads++; return { schema: 1, revision: 0, templates: {} }; },
    smtpConfig: () => { throw Error("No SMTP on TEST"); } });
  const context = { national: true, uid: "national", email: "national@example.test" };
  const dependencies = { exports: {}, ENVIRONMENT: { sportingDataSource: "nap" }, PORTAL_ACCESS_REQUEST_OPTIONS: {}, ENGAGEMENT_MAIL_SECRETS: [],
    ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS: {}, ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS: {}, defineSecret: value => value,
    onCall: (_, callback) => callback, portalSessionService: () => ({ assertSession: async () => {} }), engagementAccessContext: async () => context,
    accessManagementContext: async () => context, cleanText: value => String(value || ""), db, HttpsError,
    assertEngagementAccessRequestScope: () => {}, cleanEngagementAccessRequestPayload: value => value, resolveExistingClubForAccessRequest: async value => value,
    engagementExistingAccessAccount: async () => null, cleanAccessProfile: value => value,
    saveAccessUserProfile: async profile => { mutations++; return { uid: "new", email: profile.email }; },
    engagementAccessRequestItem: snapshot => ({ id: snapshot.id, ...snapshot.data(), resolutionNotification: decisionMail.publicState(snapshot.data().resolutionNotification) }),
    engagementSwimmerChangeRequestItem: snapshot => ({ id: snapshot.id, ...snapshot.data(), resolutionNotification: decisionMail.publicState(snapshot.data().resolutionNotification) }),
    requestDecisionMailServices: services, cleanFirestoreValue: value => value, process: { env: {} }, writeAuditLog: async () => {}, writeAuditLogOnce: async () => {},
    ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION: "requests", stableHash: value => value,
    deleteAccessUserAccount: async () => { mutations++; return { ok: true }; },
    require: name => { if (name === "./request-decision-mail") return decisionMail; if (["./nap-person-change-requests","./nap-swimmer-change-requests","./nap-swimmer-ns"].includes(name)) return {prepareResolution:()=>({key:"fixture-key"})}; if(name === "./nap-portal-swimmers") return {portalPool:()=>({getConnection:async()=>({execute:async()=>[[{acquired:1}]],release(){}})})}; throw Error("Unexpected native mutation: " + name); }, Date
  };
  let handler;
  if (type === "account") handler = deletionFactory(dependencies).resolveAccessUserDeletionRequest;
  else {
    const name = type === "access" ? "resolveEngagementAccessRequest" : "resolveEngagementSwimmerChangeRequest";
    const end = type === "access" ? "/* extracted-function:" : "exports.updateEngagementNationalSwimmerIdentity =";
    const start = source.indexOf(`exports.${name} =`);
    vm.runInNewContext(source.slice(start, type === "access" ? source.indexOf("\n});",start)+4 : source.indexOf(end, start)), dependencies);
    handler = dependencies.exports[name];
  }
  return { call: input => handler({ data: { requestId: "request", decision, ...input } }), get data() { return data; },
    get mutations() { return mutations; }, get catalogReads() { return catalogReads; } };
}
(async () => {
  for (const type of ["access", "swimmer", "official", "ns", "duplicate", "account"]) {
    const invalid = fixture(type, "rejected");
    await assert.rejects(invalid.call({ notifyRequester: false }), error => error.code === "invalid-argument");
    assert.equal(invalid.data.status, "pending"); assert.equal(invalid.mutations, 0); assert.equal(invalid.catalogReads, 0);
    const rejected = fixture(type, "rejected");
    const result = await rejected.call({ notifyRequester: false, resolutionNote: "Motif public", resolutionReason: "Motif public" });
    assert.equal(rejected.data.status, "rejected"); assert.equal(rejected.data.resolutionNotification.status, "opted_out"); assert.equal(rejected.catalogReads, 0);
    assert.ok(result.ok);
  }
  for (const type of ["access", "account", "duplicate"]) for (const decision of ["approved", "rejected"]) {
    const f = fixture(type, decision);
    const result = await f.call({ resolutionNote: decision === "rejected" ? "Motif" : "", resolutionReason: decision === "rejected" ? "Motif" : "" });
    assert.ok(result.ok); assert.equal(f.data.resolutionNotification.status, "blocked_test");
    assert.equal(f.catalogReads, 1);
    const before = f.mutations;
    await f.call({ action: "retryNotification", notificationKey: f.data.resolutionNotification.key });
    assert.equal(f.mutations, before); assert.equal(f.catalogReads, 1);
  }
  // A targeted retry of an identity request must never enter prepareResolution or SQL.
  const pending = fixture("official", "rejected");
  await pending.call({ resolutionNote: "Motif", notifyRequester: false });
  await pending.call({ action: "retryNotification", notificationKey: pending.data.resolutionNotification.key });
  assert.equal(pending.mutations, 0);
  const history = require("../functions/request-decision-history");
  let budget = 0, after, filter;
  const docs = Array.from({ length: 26 }, (_, i) => ({ id: `id${i}`, data: () => ({ status: "approved" }) }));
  const query = { where: (...args) => { filter = args; return query; }, orderBy: field => { assert.equal(field, "__name__"); return query; },
    startAfter: value => { after = value; return query; }, limit: count => { assert.equal(count, 26); return query; },
    get: async () => { budget += 26; return { docs }; } };
  const page = await history.list({ collection: () => query }, "requests", {}, doc => ({ id: doc.id }));
  assert.deepEqual(filter, ["status", "in", ["approved", "rejected"]]); assert.equal(page.requests.length, 25); assert.equal(page.nextCursor, "id24");
  await history.list({ collection: () => query }, "requests", { cursor: page.nextCursor }, doc => ({ id: doc.id }));
  assert.equal(after, "id24"); assert.equal(budget, 52);
  await assert.rejects(history.list({ collection: () => { throw Error("must not read"); } }, "requests", { cursor: "bad/path" }, () => {}), /invalide/);
  const visible = decisionMail.publicState({ status: "failed", prepared: { to: "private@example.test", snapshot: "private" }, token: "private" });
  assert.deepEqual(visible, { status: "failed" });
  console.log("Decision routes: refusal required before mutation even opted out, access/account/duplicate decisions, TEST guard and targeted retries without business replay passed offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
