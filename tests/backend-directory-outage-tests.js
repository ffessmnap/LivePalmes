"use strict";
const assert = require("node:assert/strict");
const Module = require("node:module");
const { createClubHandlers } = require("../functions/portal-club-handlers");
const { createNationalHandlers } = require("../functions/portal-national-handlers");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }

async function main() {
  const originalLoad = Module._load, pool = Object.freeze({ fixture: true });
  const previousPassword = process.env.LIVEPALMES_NAP_PASSWORD;
  process.env.LIVEPALMES_NAP_PASSWORD = "fixture-not-a-secret";
  let reads = 0, poolCalls = 0, reply = async () => ({ source: "nap", people: [], hasMore: false });
  Module._load = function(request, parent, ...rest) {
    if (/portal-(?:club|national)-handlers\.js$/.test(parent?.filename || "")) {
      if (request === "./nap-portal-swimmers") return { portalPool(password) { assert.equal(password, "fixture-not-a-secret"); poolCalls++; return pool; } };
      if (request === "./nap-club-people") return { async readClubPeople(actualPool, input, authorize) {
        assert.equal(actualPool, pool); assert.equal(input.clubId, "fixture-club"); authorize({ clubId: input.clubId }); reads++; return reply(input);
      } };
      if (request === "./nap-club-directory") return { async directory(actualPool) { assert.equal(actualPool, pool); reads++; return reply(); } };
    }
    return originalLoad.call(this, request, parent, ...rest);
  };
  try {
    const context = {
      ENVIRONMENT: { sportingDataSource: "nap" }, HttpsError,
      engagementClubAccessContext: async () => ({ clubId: "fixture-club" }),
      engagementAccessContext: async () => ({ national: true }),
      portalReadStats: (name, started, budget) => budget,
      get db() { throw Error("No Firestore fallback is allowed during a NAP outage"); },
      rebuildEngagementClubPeopleRoster() { throw Error("No reconstruction is allowed during an outage"); }
    };
    const club = createClubHandlers(context), national = createNationalHandlers(context);
    for (const [failure, code] of [
      [new Error("ECONNREFUSED private-host secret-fixture"), "unavailable"],
      [new TypeError("Curseur incorrect"), "invalid-argument"],
      [new RangeError("Limite atteinte"), "resource-exhausted"],
      [new HttpsError("permission-denied", "Périmètre refusé"), "permission-denied"]
    ]) {
      reply = async () => { throw failure; };
      const before = reads;
      await assert.rejects(club.listEngagementClubPeople({ data: { clubId: "other-club" } }), error => {
        assert.equal(error.code, code); assert.ok(!error.message.includes("secret-fixture"));
        if (failure instanceof HttpsError) assert.equal(error, failure); return true;
      });
      assert.equal(reads, before + 1, "One attempt, no silent retry or fallback");
    }
    reply = async input => ({ source: "nap", people: [{ id: "fixture-person" }], nextCursor: input.cursor, hasMore: false });
    const result = await club.listEngagementClubPeople({ data: { cursor: { officials: 7 } } });
    assert.equal(result.clubId, "fixture-club"); assert.equal(result.people[0].id, "fixture-person"); assert.equal(result.nextCursor.officials, 7);
    reply = async () => { throw Error("ETIMEDOUT private-host secret-fixture"); };
    await assert.rejects(national.listEngagementNationalClubs({ data: {} }), error => error.code === "unavailable" && !error.message.includes("secret-fixture"));
    reply = async () => ({ source: "nap", clubs: [], hasMore: false });
    assert.equal((await national.listEngagementNationalClubs({ data: {} })).clubs.length, 0);
    const before = poolCalls;
    const deniedContext = Object.assign(Object.create(context), { engagementAccessContext: async () => ({ national: false }) });
    await assert.rejects(createNationalHandlers(deniedContext).listEngagementNationalClubs({ data: {} }), error => error.code === "permission-denied");
    assert.equal(poolCalls, before, "Permission denied before selecting a pool");
    console.log("Actual server handlers: scoped native reads, outage sanitization, preserved errors, no fallback/rebuild/retry and recovery passed with in-memory services.");
  } finally {
    Module._load = originalLoad;
    if (previousPassword === undefined) delete process.env.LIVEPALMES_NAP_PASSWORD;
    else process.env.LIVEPALMES_NAP_PASSWORD = previousPassword;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
