"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("./firestore-rules/node_modules/acorn");
const { readCurrentAccessProfile } = require("../functions/current-access-profile");
const { createAccessService_assertAdmin } = require("../functions/backend/server-access-service/assert-admin");
const { createAccessService_assertCapability } = require("../functions/backend/server-access-service/assert-capability");
const { createAccessService_assertLivePalmesAccess } = require("../functions/backend/server-access-service/assert-live-palmes-access");
const { createAccessService_accessManagementContext } = require("../functions/backend/server-access-service/access-management-context");
const { createAccessService_auditManagementContext } = require("../functions/backend/server-access-service/audit-management-context");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function harness(initial) {
  let profile = initial, reads = 0;
  const db = { collection(name) { assert.equal(name, "users"); return { doc(uid) {
    assert.ok(uid.startsWith("fixture-"));
    return { async get() { reads++; if (profile instanceof Error) throw profile;
      return { exists: profile !== null, data: () => profile }; } };
  } }; } };
  const ctx = { db, HttpsError, ADMIN_UIDS: new Set(["fixture-root"]), FUNCTIONS_EMULATOR_ACTIVE: false,
    ACCESS_CAPABILITIES: ["admin.full", "records.manage", "competitions.import", "dtn.view"],
    cleanText: value => String(value || ""), local$activeCapabilitiesFromMap: map => Object.keys(map).filter(k => map[k] === true) };
  ctx.activeCapabilitiesFromMap = ctx.local$activeCapabilitiesFromMap;
  ctx.hasConsolePortalCapability = caps => ["admin.full", "consoles.manage", "consoles.access"].some(k => caps[k] === true);
  return { ctx, get reads() { return reads; }, set profile(value) { profile = value; },
    ...createAccessService_assertAdmin(ctx), ...createAccessService_assertCapability(ctx), ...createAccessService_assertLivePalmesAccess(ctx) };
}
function request(uid = "fixture-user") {
  return { auth: { uid, token: { livepalmesAccess: true, livepalmesCapabilities: {
    "admin.full": true, "records.manage": true, "competitions.import": true, "dtn.view": true, "dtn.manage": true
  } } }, data: {} };
}
async function denied(promise, code = "permission-denied") { await assert.rejects(promise, error => error.code === code); }
async function main() {
  for (const profile of [null, { status: "inactive", capabilities: { "admin.full": true } }, { status: "active", capabilities: {} }]) {
    const h = harness(profile), req = request("fixture-root");
    await denied(h.assertAdmin(req)); await denied(h.assertCapability(req, "records.manage"));
    await denied(h.assertLivePalmesAccess(req));
    await denied(createAccessService_accessManagementContext(h.ctx).accessManagementContext(req));
    await denied(createAccessService_auditManagementContext(h.ctx).auditManagementContext(req));
    await denied(require("../functions/backend/server-access-service/assert-engagements-access").createAccessService_assertEngagementsAccess(h.ctx).assertEngagementsAccess(req));
    await denied(require("../functions/backend/server-console-service/assert-console-portal-access").createConsoleService_assertConsolePortalAccess(h.ctx).assertConsolePortalAccess(req));
    await denied(require("../functions/backend/server-access-service/engagement-club-access-context").createAccessService_engagementClubAccessContext(h.ctx).engagementClubAccessContext(req));
    await denied(require("../functions/backend/portal-access-handlers/get-current-access-user").createAccessHandlers_getCurrentAccessUser(h.ctx).getCurrentAccessUser(req));
    const engagement = require("../functions/backend/server-access-service/engagement-access-context").createAccessService_engagementAccessContext({
      ...h.ctx, local$normalizedAccessScope: () => ({}), local$competitionEmailNotificationsEnabled: () => false
    });
    if (!profile || profile.status !== "active") await denied(engagement.engagementAccessContext(req));
    else {
      const result = await engagement.engagementAccessContext(req);
      assert.equal(result.national, false); assert.equal(result.region, false);
    }
    assert.equal(h.reads, 1, "One profile read even when several guards refuse");
  }
  const h = harness({ status: "active", capabilities: { "admin.full": true } }), req = request();
  req.auth.token.livepalmesCapabilities = {};
  await Promise.all([h.assertAdmin(req), h.assertCapability(req, "records.manage"), h.assertLivePalmesAccess(req)]);
  assert.equal(h.reads, 1, "Concurrent guards share the authoritative read");
  h.profile = { status: "inactive", capabilities: { "admin.full": true } };
  await denied(h.assertAdmin(request())); assert.equal(h.reads, 2, "A new call never reuses authorization");
  const removed = harness({ status: "active", capabilities: { "dtn.view": true } });
  await denied(removed.assertCapability(request(), "records.manage"));
  const importer = harness({ status: "active", capabilities: { "competitions.import": true } });
  const actor = await require("../functions/backend/server-legacy-service/authorize-native-performance").createLegacyService_authorizeNativePerformance({
    ...importer.ctx, assertCapability: importer.assertCapability
  }).authorizeNativePerformance(request("fixture-root"));
  assert.equal(actor.national, false, "Old national claim and legacy identity do not replace the current administrative right");
  assert.equal(importer.reads, 1);
  const unavailable = harness(Error("fixture-private-database-detail")), failed = request();
  await assert.rejects(unavailable.assertAdmin(failed), error => error.code === "unavailable" && !error.message.includes("private"));
  await denied(unavailable.assertAdmin(failed), "unavailable"); assert.equal(unavailable.reads, 1);
  const anonymous = harness(null); await denied(anonymous.assertAdmin({ data: {} }), "unauthenticated"); assert.equal(anonymous.reads, 0);
  const isolation = harness({ status: "active", capabilities: { "records.manage": true } });
  await denied(isolation.assertAdmin(req)); assert.equal(isolation.reads, 1, "Same request cannot reuse a different database's profile");
  // A real handler must await the profile before touching another user or Auth.
  let resolveProfile, effects = 0;
  const pending = { ...h.ctx, db: { collection(name) { assert.equal(name, "users"); return { doc(uid) {
    assert.equal(uid, "fixture-user", "No target access before actor authorization");
    return { get: () => new Promise(resolve => { resolveProfile = resolve; }) };
  } }; } }, auth: new Proxy({}, { get() { effects++; throw Error("Auth must stay untouched"); } }) };
  pending.assertAdmin = createAccessService_assertAdmin(pending).assertAdmin;
  const { setAccessUserStatus } = require("../functions/backend/portal-access-handlers/set-access-user-status").createAccessHandlers_setAccessUserStatus(pending);
  const operation = setAccessUserStatus({ ...request(), data: { uid: "fixture-target", status: "inactive" } });
  await Promise.resolve(); assert.equal(effects, 0);
  resolveProfile({ exists: true, data: () => ({ status: "inactive" }) }); await denied(operation); assert.equal(effects, 0);
  // DTN management must use the current profile after its awaited view guard.
  const dtn = harness({ status: "active", capabilities: { "dtn.view": true } });
  const service = require("../functions/backend/server-dtn-service/dtn-season-service").createDtnService_dtnSeasonService({
    ...dtn.ctx, ENVIRONMENT: { sportingDataSource: "fixture" }, createDtnSeasonService: options => options,
    assertLivePalmesAccess: dtn.assertLivePalmesAccess, assertCapability: dtn.assertCapability
  }).dtnSeasonService();
  const dtnRequest = request(); await service.authorize(dtnRequest); assert.equal(service.canManage(dtnRequest), false); assert.equal(dtn.reads, 1);
  assert.throws(() => service.canManage(request()), error => error.code === "permission-denied");
  // Async propagation is part of the security contract, not just syntax.
  const protectedNames = new Set(["assertAdmin", "assertCapability", "authorizeNativePerformance", "authorizeNapRecords", "local$authorizeNapRecords"]);
  const files = ["functions/index.js"];
  function collect(dir) { for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name); if (ent.isDirectory()) collect(file); else if (file.endsWith(".js")) files.push(file);
  } }
  collect("functions/backend");
  for (const file of files) {
    const ast = acorn.parse(fs.readFileSync(file, "utf8"), { ecmaVersion: "latest" });
    function walk(node, parent) {
      if (!node || typeof node !== "object") return;
      if (node.type === "CallExpression" && node.arguments[0]?.name === "request") {
        const callee = node.callee.type === "SequenceExpression" ? node.callee.expressions.at(-1) : node.callee;
        if (protectedNames.has(callee.name || callee.property?.name)) assert.equal(parent?.type, "AwaitExpression", `${file}: authorization must be awaited`);
      }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(child => walk(child, node)); else if (value && typeof value === "object") walk(value, node);
    }
    walk(ast);
  }
  console.log("Current access revocation: profile, rights, failures, isolation, ordering and async consumers OK");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
