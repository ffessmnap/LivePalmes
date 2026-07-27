const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  consoleRoleClaims,
  hasConsolePortalCapability
} = require("../functions/console-access.js");

const protectedConsolePages = [
  "pilotage-livepalmes.html",
  "live.html",
  "speaker.html",
  "ja.html",
  "video.html",
  "bureau-perf.html",
  "secretariat.html"
];

for (const page of protectedConsolePages) {
  const html = fs.readFileSync(path.resolve(__dirname, `../${page}`), "utf8");
  assert.match(html, /<html lang="fr" data-console-access="pending">/);
  assert.match(html, /id="consoleAccessPending"/);
}

const pageGateSource = fs.readFileSync(path.resolve(__dirname, "../assets/livepalmes-console-page-gate.js"), "utf8");
assert.match(pageGateSource, /removeAttribute\("data-console-access"\)/);
assert.match(pageGateSource, /data-console-account-form hidden/);
assert.match(pageGateSource, /V&eacute;rification de la connexion&hellip;/);

assert.equal(hasConsolePortalCapability({ "consoles.access": true }), true);
assert.equal(hasConsolePortalCapability({ "consoles.manage": true }), true);
assert.equal(hasConsolePortalCapability({ "admin.full": true }), true);
assert.equal(hasConsolePortalCapability({ "records.manage": true }), false);
assert.equal(hasConsolePortalCapability({}), false);

const mergedClaims = consoleRoleClaims({
  livepalmesAccess: true,
  livepalmesCapabilities: { "consoles.access": true },
  existingClaim: "preserved"
}, "speaker", "livepalmes-test");
assert.equal(mergedClaims.livepalmesAccess, true);
assert.equal(mergedClaims.livepalmesConsoleAccess, true);
assert.deepEqual(mergedClaims.livepalmesCapabilities, { "consoles.access": true });
assert.equal(mergedClaims.existingClaim, "preserved");
assert.equal(mergedClaims.livepalmesRole, "speaker");
assert.equal(mergedClaims.livepalmesCompetition, "livepalmes-test");
assert.equal(mergedClaims.livepalmesConsole, true);

const pinAuthSource = fs.readFileSync(path.resolve(__dirname, "../assets/livepalmes-pin-auth.js"), "utf8");

async function pinAuthWithUser(currentUser) {
  let anonymousCalls = 0;
  let callableCalls = 0;
  const auth = {
    currentUser,
    onAuthStateChanged(listener) {
      listener(this.currentUser);
      return () => {};
    },
    async signInAnonymously() {
      anonymousCalls += 1;
    }
  };
  const firebase = {
    apps: [{}],
    auth: () => auth,
    functions: () => null,
    app: () => ({
      functions: () => ({
        httpsCallable: () => async () => {
          callableCalls += 1;
          return { data: { ok: true, role: "speaker" } };
        }
      })
    })
  };
  const sandbox = { window: {}, setTimeout, clearTimeout };
  vm.runInNewContext(pinAuthSource, sandbox, { filename: "livepalmes-pin-auth.js" });
  const api = sandbox.window.LivePalmesPinAuth.init({ firebase });
  return { api, calls: () => ({ anonymousCalls, callableCalls }) };
}

(async () => {
  const signedOut = await pinAuthWithUser(null);
  await assert.rejects(
    signedOut.api.verifyRolePin({ role: "speaker", pin: "1234" }),
    /Connecte-toi au portail LivePalmes/
  );
  assert.deepEqual(signedOut.calls(), { anonymousCalls: 0, callableCalls: 0 });

  const user = {
    isAnonymous: false,
    async getIdToken() {},
    async getIdTokenResult() {
      return {
        claims: {
          livepalmesAccess: true,
          livepalmesConsoleAccess: true,
          livepalmesCapabilities: { "consoles.access": true },
          livepalmesConsole: true,
          livepalmesCompetition: "livepalmes-test",
          livepalmesRole: "speaker"
        }
      };
    }
  };
  const signedIn = await pinAuthWithUser(user);
  await signedIn.api.verifyRolePin({
    competitionId: "livepalmes-test",
    role: "speaker",
    pin: "1234"
  });
  assert.deepEqual(signedIn.calls(), { anonymousCalls: 0, callableCalls: 1 });

  console.log("LivePalmes console access tests OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
