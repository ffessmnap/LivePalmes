const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "livepalmes-admin-auth.js"), "utf8");

function createHarness({ profile, serverError = null, authConfig = {}, tokenClaims = {} } = {}) {
  let signInCalls = 0;
  let signOutCalls = 0;
  let callableCalls = 0;
  const user = {
    uid: "test-user",
    email: "admin-test@example.test",
    async getIdTokenResult() { return { claims: tokenClaims }; }
  };
  const authService = {
    currentUser: null,
    setPersistence: async () => {},
    onAuthStateChanged() { return () => {}; },
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
  const auth = window.LivePalmesAdminAuth.init({ firebase, authConfig });
  return {
    auth,
    calls: () => ({ callableCalls, signInCalls, signOutCalls })
  };
}

(async () => {
  const testAdmin = createHarness({
    authConfig: { adminUids: [], adminEmails: [], serverProfileAuthentication: true },
    profile: { status: "active", capabilities: ["admin.full"] }
  });
  await testAdmin.auth.signIn("admin-test@example.test", "password");
  assert.equal(testAdmin.auth.status().signedIn, true);
  assert.equal(testAdmin.calls().callableCalls, 1);

  const testWithoutAdmin = createHarness({
    authConfig: { serverProfileAuthentication: true },
    profile: { status: "active", capabilities: ["engagements.club.manage"] }
  });
  await assert.rejects(
    testWithoutAdmin.auth.signIn("club-test@example.test", "password"),
    /n'est pas autorise comme admin/
  );
  assert.equal(testWithoutAdmin.calls().signOutCalls, 1);

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
