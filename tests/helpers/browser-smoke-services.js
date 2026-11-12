// Transport fixture for the legacy UI smoke only; never served by the application.
(function installSmokeServices(global) {
  "use strict";
  if (!["127.0.0.1", "localhost"].includes(global.location.hostname)) {
    throw new Error("Smoke services require localhost.");
  }
  if (global.__livepalmesSmokeServices) return;
  const counters = { authAttempts: 0, firestoreCalls: 0, functionCalls: 0, deniedExternalFetches: 0, fixtureRestReads: 0 };
  global.__livepalmesSmokeServices = counters;
  const originalFetch = global.fetch.bind(global);
  global.fetch = function localFetch(input, options) {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, global.location.href);
    if (url.origin !== global.location.origin) {
      const method = String(options?.method || input?.method || "GET").toUpperCase();
      if (method === "GET" && url.hostname === "firestore.googleapis.com"
          && /^\/v1\/projects\/demo-livepalmes-smoke\/databases\/\(default\)\/documents\/competitions\/livepalmes-active\/(alerts|results)$/.test(url.pathname)) {
        counters.fixtureRestReads += 1;
        return Promise.resolve(new Response(JSON.stringify({ documents: [] }), { headers: { "Content-Type": "application/json" } }));
      }
      if (method === "GET" && url.hostname === "firestore.googleapis.com"
          && url.pathname === "/v1/projects/demo-livepalmes-smoke/databases/(default)/documents/competitions/livepalmes-active/liveData/current") {
        counters.fixtureRestReads += 1;
        return Promise.resolve(new Response("{}", { status: 404 }));
      }
      counters.deniedExternalFetches += 1;
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    return originalFetch(input, options);
  };
  const unavailable = (kind) => {
    counters[kind] += 1;
    return Promise.reject(new Error("Local smoke fixture: service unavailable."));
  };
  const authService = {
    currentUser: null,
    setPersistence: () => Promise.resolve(),
    onAuthStateChanged(callback) {
      let active = true;
      queueMicrotask(() => { if (active) callback(null); });
      return () => { active = false; };
    },
    signInAnonymously: () => unavailable("authAttempts"),
    signInWithCustomToken: () => unavailable("authAttempts"),
    signInWithEmailAndPassword: () => unavailable("authAttempts"),
    signOut: () => Promise.resolve()
  };
  const auth = () => authService;
  auth.Auth = { Persistence: { LOCAL: "local" } };
  function ref() {
    return {
      collection: ref, doc: ref, where: ref, orderBy: ref, limit: ref,
      // No remote events. The real UI continues to use its synthetic cached data.
      onSnapshot: () => () => {},
      get: () => unavailable("firestoreCalls"),
      set: () => unavailable("firestoreCalls"),
      update: () => unavailable("firestoreCalls"),
      delete: () => unavailable("firestoreCalls")
    };
  }
  const db = {
    collection: ref, doc: ref,
    batch: () => ({ set() {}, update() {}, delete() {}, commit: () => unavailable("firestoreCalls") })
  };
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => new Date().toISOString(), delete: () => null };
  const functions = () => ({ httpsCallable: () => () => unavailable("functionCalls") });
  const app = { auth, firestore, functions, options: { projectId: "demo-livepalmes-smoke" } };
  global.firebase = {
    apps: [], auth, firestore, functions,
    initializeApp() { if (!this.apps.length) this.apps.push(app); return app; },
    app: () => app
  };
})(window);
