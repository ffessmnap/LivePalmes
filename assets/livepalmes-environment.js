(function attachLivePalmesEnvironment(global) {
  "use strict";

  const PRODUCTION_PROJECT_ID = "livepalmes";
  const TEST_PROJECT_ID = "livepalmes-test";
  const environments = {
    production: {
      name: "production",
      isTest: false,
      firebaseConfig: {
        apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
        authDomain: "livepalmes.firebaseapp.com",
        projectId: PRODUCTION_PROJECT_ID,
        storageBucket: "livepalmes.firebasestorage.app",
        messagingSenderId: "718081132564",
        appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
      },
      functionsRegion: "europe-west1",
      hostingOrigin: "https://livepalmes.web.app",
      authOrigin: "https://livepalmes.firebaseapp.com",
      publicBucket: "livepalmes-public-data-718081132564",
      legacyAdminUids: ["AgvWJjvLOfe3uB0lz0Xr3wwJxzT2"]
    },
    test: {
      name: "test",
      isTest: true,
      firebaseConfig: {
        apiKey: "AIzaSyAFOL4tPzNm3NwDaEJ-tdNoBOer69TrrkY",
        authDomain: "livepalmes-test.firebaseapp.com",
        projectId: TEST_PROJECT_ID,
        storageBucket: "livepalmes-test.firebasestorage.app",
        messagingSenderId: "206080168534",
        appId: "1:206080168534:web:70dad29434b9878ecea1f7"
      },
      functionsRegion: "europe-west1",
      hostingOrigin: "https://livepalmes-test.web.app",
      authOrigin: "https://livepalmes-test.firebaseapp.com",
      publicBucket: "livepalmes-test-public-data-206080168534",
      legacyAdminUids: []
    }
  };

  function selectedEnvironmentName() {
    const explicit = String(global.LIVEPALMES_ENVIRONMENT || "").trim().toLowerCase();
    const hostname = String(global.location?.hostname || "").toLowerCase();
    const testHostname = hostname === "livepalmes-test.web.app" || hostname === "livepalmes-test.firebaseapp.com";
    if (explicit) {
      if (!(explicit in environments)) throw new Error(`Environnement LivePalmes inconnu : ${explicit}`);
      if (testHostname && explicit !== "test") throw new Error("Un domaine TEST ne peut pas charger la configuration de production.");
      return explicit;
    }
    return testHostname ? "test" : "production";
  }

  function publicStorageUrl(path = "") {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    return `https://storage.googleapis.com/${config.publicBucket}${cleanPath ? `/${cleanPath}` : ""}`;
  }

  function assertSafeConfiguration(candidate) {
    const firebase = candidate.firebaseConfig || {};
    if (candidate.isTest) {
      const serialized = JSON.stringify(candidate);
      if (firebase.projectId !== TEST_PROJECT_ID) throw new Error("La configuration TEST doit utiliser le projet livepalmes-test.");
      if (serialized.includes('"projectId":"livepalmes"') || serialized.includes("livepalmes.firebasestorage.app") || serialized.includes("livepalmes-public-data-718081132564")) {
        throw new Error("La configuration TEST contient une reference Firebase de production.");
      }
      if (!firebase.apiKey || !firebase.appId) {
        throw new Error("La configuration publique de l'application Web Firebase TEST est incomplete.");
      }
    } else if (firebase.projectId !== PRODUCTION_PROJECT_ID) {
      throw new Error("La configuration de production doit utiliser le projet livepalmes.");
    }
    return candidate;
  }

  function showTestBanner() {
    if (!config.isTest || document.querySelector("[data-livepalmes-test-banner]")) return;
    const sensitivePages = new Set([
      "portail.html", "pilotage-livepalmes.html", "live.html", "speaker.html", "ja.html",
      "video.html", "bureau-perf.html", "secretariat.html", "notifications.html",
      "reinitialiser-mot-de-passe.html"
    ]);
    const page = String(global.location?.pathname || "").split("/").pop() || "index.html";
    const sensitive = sensitivePages.has(page) || document.body?.classList.contains("admin-portal-page");
    const banner = document.createElement("div");
    banner.dataset.livepalmesTestBanner = "true";
    banner.dataset.variant = sensitive ? "sensitive" : "public";
    banner.setAttribute("role", "status");
    banner.textContent = "ENVIRONNEMENT TEST";
    const style = document.createElement("style");
    style.textContent = "[data-livepalmes-test-banner]{position:sticky;top:0;z-index:100000;padding:7px 16px;background:#7f1d1d;color:#fff;font:700 12px/1.2 system-ui,sans-serif;letter-spacing:.1em;text-align:center;box-shadow:0 2px 6px #0004}[data-livepalmes-test-banner][data-variant=sensitive]{padding:10px 16px;background:#b91c1c;font-size:14px;font-weight:800;letter-spacing:.12em;box-shadow:0 2px 8px #0005}";
    document.head.appendChild(style);
    document.body.prepend(banner);
  }

  const selected = environments[selectedEnvironmentName()];
  const config = {
    ...selected,
    firebaseConfig: { ...selected.firebaseConfig },
    legacyAdminUids: [...selected.legacyAdminUids]
  };
  config.publicStorageUrl = publicStorageUrl;
  config.assertSafe = () => assertSafeConfiguration(config);
  assertSafeConfiguration(config);
  global.LivePalmesEnvironment = config;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showTestBanner, { once: true });
  else showTestBanner();
})(window);
