"use strict";
const assert = require("node:assert/strict");
const { portalModule, deferred } = require("./helpers/portal-module-runtime");

async function main() {
  const calls = [], timers = new Map(); let nextTimer = 0, response = async () => ({ data: { ok: true } });
  const config = { PORTAL_FRENCH_ERROR_REPLACEMENTS: [[/\bAcces\b/g, "Accès"]], portalCallSamples: new Map() };
  const module = portalModule("navigation.js", "LivePalmesPortalNavigation", {
    state: {}, actions: {}, config, elements: {}
  }, {
    window: {
      LivePalmesAppConfig: { firebaseConfig: {}, firebaseFunctionsRegion: "europe-west1" },
      firebase: { apps: [{}], initializeApp() { throw Error("No SDK initialization in this fixture"); }, functions: {}, app: () => ({
        functions: () => ({ httpsCallable: name => input => { calls.push({ name, input }); return response(); } })
      }) }
    },
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  const transientCases = [["unavailable", "UNAVAILABLE"], ["deadline-exceeded", "DEADLINE_EXCEEDED"], ["internal", "INTERNAL"],
    ["unavailable", "Firebase: Error (functions/unavailable)."], ["unavailable", "ECONNREFUSED private-host fixture"]];
  for (const [code, message] of transientCases) {
    const original = Object.assign(new Error(message), { code: "functions/" + code, details: { fixture: true } });
    response = async () => { throw original; };
    await assert.rejects(module.callFunction("fixtureRead", {}), error => {
      assert.equal(error.code, original.code); assert.equal(error.details, original.details);
      assert.match(error.message, /service|serveur/i); assert.notEqual(error.message, message); return true;
    });
  }
  const domain = Object.assign(new Error("Acces refusé pour ce club."), { code: "functions/permission-denied" });
  response = async () => { throw domain; };
  await assert.rejects(module.callFunction("fixtureRead", {}), error => error === domain && error.message === "Accès refusé pour ce club.");
  const frozen = Object.freeze(Object.assign(new Error("Acces indisponible."), { code: "functions/failed-precondition", details: { reason: "fixture" } }));
  const normalized = module.normalizePortalFrenchError(frozen);
  assert.equal(normalized.message, "Accès indisponible."); assert.equal(normalized.code, frozen.code); assert.equal(normalized.details, frozen.details);
  const humanMessage = "Annuaire NAP indisponible. Réessayez.";
  const human = Object.assign(new Error(humanMessage), { code: "functions/unavailable" });
  assert.equal(module.normalizePortalFrenchError(human).message, humanMessage, "Keep meaningful domain explanations");

  let pending = deferred(); response = () => pending.promise;
  const timed = module.callFunctionWithTimeout("fixtureRead", { page: 1 }, 30);
  assert.equal(timers.size, 1);
  [...timers.values()][0]();
  await assert.rejects(timed, /Délai de lecture dépassé/); assert.equal(timers.size, 0);
  const before = calls.length; pending.resolve({ data: { outdated: true } }); await Promise.resolve(); await Promise.resolve();
  assert.equal(calls.length, before, "No automatic retry after timeout");
  response = async () => ({ data: { ok: true, people: [] } });
  assert.equal((await module.callFunctionWithTimeout("fixtureRead", {}, 30)).ok, true); assert.equal(timers.size, 0);
  response = async () => { throw Object.assign(new Error("UNAVAILABLE"), { code: "functions/unavailable" }); };
  const writes = calls.length;
  await assert.rejects(module.callFunction("fixtureWrite", { id: "fixture" }));
  assert.equal(calls.length, writes + 1, "Failed writes are never replayed");
  assert.equal(module.portalCallMetrics().fixtureRead.errorCount, transientCases.length + 1);
  console.log("Actual portal RPC module: transient errors, business errors, immutable errors, timeouts, late responses and manual recovery passed offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
