require("./helpers/offline-network");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "livepalmes-admin-auth.js"), "utf8");

function createHarness({ profile, serverError = null, serverGate = null, authConfig = {}, tokenClaims = {}, requiredCapability = "" } = {}) {
  let signInCalls = 0;
  let signOutCalls = 0;
  let callableCalls = 0;
  let authStateListener;
  let profileRequested;
  const whenProfileRequested = new Promise(resolve => { profileRequested = resolve; });
  const tokenRefreshFlags = [];
  const user = {
    uid: "test-user",
    email: "admin-test@example.test",
    async getIdTokenResult(forceRefresh) { tokenRefreshFlags.push(forceRefresh); return { claims: tokenClaims }; }
  };
  const authService = {
    currentUser: null,
    setPersistence: async () => {},
    onAuthStateChanged(listener) { authStateListener = listener; return () => {}; },
    async signInWithEmailAndPassword() {
      signInCalls += 1;
      authService.currentUser = user;
      return { user };
    },
    async signOut() {
      signOutCalls += 1;
      authService.currentUser = null;
    },
    async sendPasswordResetEmail() {}
  };
  const functionsService = {
    httpsCallable(name) {
      assert.equal(name, "getCurrentAccessUser");
      return async () => {
        callableCalls += 1;
        profileRequested();
        if (serverGate) await serverGate;
        if (serverError) throw serverError;
        return { data: profile };
      };
    }
  };
  const firebase = {
    apps: [{}],
    auth: Object.assign(() => authService, { Auth: { Persistence: { LOCAL: "local" } } }),
    app: () => ({ functions: () => functionsService }),
    functions: () => functionsService
  };
  const window = {
    firebase,
    LivePalmesAppConfig: {
      firebaseFunctionsRegion: "europe-west1",
      configureFunctionsService: (service) => service
    },
    LivePalmesEnvironment: { authOrigin: "https://livepalmes-test.firebaseapp.com" }
  };
  vm.runInNewContext(source, { window, console, Date, Error, Promise, Set });
  const auth = window.LivePalmesAdminAuth.init({ firebase, authConfig, requiredCapability });
  return {
    auth,
    restore: () => { authService.currentUser = user; return authStateListener(user); },
    tokenRefreshFlags,
    whenProfileRequested,
    calls: () => ({ callableCalls, signInCalls, signOutCalls })
  };
}

(async () => {
  let releaseProfile;
  const serverGate = new Promise(resolve => { releaseProfile = resolve; });
  const restored = createHarness({authConfig:{serverProfileAuthentication:true},serverGate,
    profile:{status:"active",capabilities:["engagements.club.manage"]},
    tokenClaims:{livepalmesAccess:true,livepalmesCapabilities:{"admin.full":true}}});
  const restoring = restored.restore(); await restored.whenProfileRequested;
  assert.deepEqual(restored.tokenRefreshFlags,[false],"Restored server-profile sessions delegate expiry checks to Firebase");
  assert.equal(restored.calls().callableCalls,1);assert.equal(restored.auth.status().ready,false);assert.equal(restored.auth.status().signedIn,false);
  releaseProfile();await restoring;assert.equal(restored.auth.status().signedIn,true);
  assert.equal(restored.auth.hasCapability("admin.full"),false,"Cached claims cannot override the current server profile");
  assert.equal(restored.auth.hasCapability("engagements.club.manage"),true);
  for(const options of [{profile:{status:"inactive",capabilities:["admin.full"]}},{serverError:Error("Unavailable")},{profile:{status:"active",capabilities:[]}}]){
    const denied=createHarness({...options,authConfig:{serverProfileAuthentication:true},tokenClaims:{livepalmesAccess:true,livepalmesCapabilities:{"admin.full":true}}});
    await denied.restore();assert.equal(denied.auth.status().signedIn,false);assert.equal(denied.calls().callableCalls,1);
  }
  const legacyRestore=createHarness({authConfig:{adminUids:["test-user"]},profile:{status:"active",capabilities:["admin.full"]}});
  await legacyRestore.restore();assert.deepEqual(legacyRestore.tokenRefreshFlags,[true],"Legacy claim-based consumers keep forced renewal");
  const testAdmin = createHarness({
    authConfig: { adminUids: [], adminEmails: [], serverProfileAuthentication: true },
    profile: { status: "active", capabilities: ["admin.full"] }
  });
  await testAdmin.auth.signIn("admin-test@example.test", "password");
  assert.deepEqual(testAdmin.tokenRefreshFlags,[true],"Explicit sign-in still forces fresh claims");
  assert.equal(testAdmin.auth.status().signedIn, true);
  assert.equal(testAdmin.calls().callableCalls, 1);

  for (const capabilities of [["engagements.club.manage"], ["engagements.region.manage"], ["engagements.club.manage", "engagements.region.manage"]]) {
    const limited = createHarness({
      authConfig: { serverProfileAuthentication: true, adminUids: ["test-user"] },
      profile: { status: "active", capabilities },
      tokenClaims: { livepalmesAccess: true, livepalmesCapabilities: { "admin.full": true } }
    });
    await limited.auth.signIn("limited@example.test", "password");
    assert.equal(limited.auth.status().signedIn, true);
    assert.equal(limited.calls().callableCalls, 1);
    for (const capability of capabilities) assert.equal(limited.auth.hasCapability(capability), true);
    for (const forbidden of ["admin.full", "records.manage", "engagements.national.manage"]) assert.equal(limited.auth.hasCapability(forbidden), false);
  }
  for (const capabilities of [[], ["unknown.capability"]]) {
    const denied = createHarness({authConfig:{serverProfileAuthentication:true}, profile:{status:"active",capabilities}});
    await assert.rejects(denied.auth.signIn("denied@example.test","password"), /n'est pas autorise/);
  }
  const wrongSpace = createHarness({authConfig:{serverProfileAuthentication:true},requiredCapability:"records.manage",profile:{status:"active",capabilities:["engagements.club.manage","engagements.region.manage"]}});
  await assert.rejects(wrongSpace.auth.signIn("limited@example.test","password"), /n'est pas autorise/);

  const testInactiveProfile = createHarness({
    authConfig: { serverProfileAuthentication: true },
    profile: { status: "inactive", capabilities: ["admin.full"] }
  });
  await assert.rejects(
    testInactiveProfile.auth.signIn("inactive-test@example.test", "password"),
    /n'est pas autorise comme admin/
  );

  const testMissingProfile = createHarness({
    authConfig: { serverProfileAuthentication: true },
    serverError: new Error("Profil introuvable")
  });
  await assert.rejects(
    testMissingProfile.auth.signIn("missing-test@example.test", "password"),
    /n'est pas autorise comme admin/
  );

  const testServerFailure = createHarness({
    authConfig: { serverProfileAuthentication: true },
    serverError: new Error("Functions indisponibles"),
    tokenClaims: { livepalmesAccess: true, livepalmesCapabilities: { "admin.full": true } }
  });
  await assert.rejects(
    testServerFailure.auth.signIn("admin-test@example.test", "password"),
    /n'est pas autorise comme admin/
  );
  assert.equal(testServerFailure.auth.status().signedIn, false);

  const productionWithoutAllowlist = createHarness({ authConfig: {} });
  await assert.rejects(
    productionWithoutAllowlist.auth.signIn("admin@example.test", "password"),
    /Aucun admin Firebase/
  );
  assert.equal(productionWithoutAllowlist.calls().signInCalls, 0);

  const productionLegacy = createHarness({
    authConfig: { adminUids: ["test-user"] },
    serverError: new Error("Functions indisponibles")
  });
  await productionLegacy.auth.signIn("admin@example.test", "password");
  assert.equal(productionLegacy.auth.status().signedIn, true);

  console.log("Authentification admin TEST/PROD : OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
