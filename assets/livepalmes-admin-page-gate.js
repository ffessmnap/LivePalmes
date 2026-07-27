(function attachLivePalmesAdminPageGate(global) {
  const SCRIPT_LIST_ID = "adminGateScripts";

  function ensureFirebaseApp() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !firebase?.auth || !config) return null;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return firebase;
  }

  function functionsService(firebase) {
    if (!firebase?.functions) return null;
    try {
      return firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    } catch {
      return firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    }
  }

  function setGateState(state, title, message) {
    document.body.dataset.adminGate = state;
    const panel = document.querySelector("#adminGatePanel");
    if (!panel) return;
    panel.hidden = state === "unlocked";
    const titleNode = panel.querySelector("[data-admin-gate-title]");
    const messageNode = panel.querySelector("[data-admin-gate-message]");
    if (titleNode) titleNode.textContent = title || "";
    if (messageNode) messageNode.textContent = message || "";
  }

  function waitForUser(firebase) {
    const auth = firebase.auth();
    if (!auth?.onAuthStateChanged) return Promise.resolve(auth?.currentUser || null);
    return new Promise((resolve) => {
      let done = false;
      const timeout = global.setTimeout(() => {
        if (done) return;
        done = true;
        resolve(auth.currentUser || null);
      }, 5000);
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (done) return;
        done = true;
        global.clearTimeout(timeout);
        if (typeof unsubscribe === "function") unsubscribe();
        resolve(user || null);
      });
    });
  }

  function gatedScripts() {
    const node = document.querySelector(`#${SCRIPT_LIST_ID}`);
    if (!node) return [];
    try {
      const parsed = JSON.parse(node.textContent || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (Array.from(document.querySelectorAll("script[data-admin-gate-loaded]")).some((script) => script.dataset.adminGateLoaded === src)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.dataset.adminGateLoaded = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadGatedScripts() {
    const scripts = gatedScripts();
    for (const src of scripts) {
      await loadScript(src);
    }
  }

  async function validateAccess() {
    setGateState("pending", "Vérification de l'accès administrateur", "Cette page est temporairement réservée aux administrateurs LivePalmes.");

    const firebase = ensureFirebaseApp();
    if (!firebase?.auth) {
      setGateState("locked", "Accès au portail requis", "Connectez-vous depuis le Portail LivePalmes pour consulter cette page.");
      return;
    }

    const user = await waitForUser(firebase);
    if (!user) {
      setGateState("locked", "Accès au portail requis", "Connectez-vous depuis le Portail LivePalmes pour consulter cette page.");
      return;
    }

    const functions = functionsService(firebase);
    if (!functions?.httpsCallable) {
      setGateState("locked", "Accès administrateur indisponible", "La vérification du profil LivePalmes n'est pas disponible pour le moment.");
      return;
    }

    try {
      const result = await functions.httpsCallable("getCurrentAccessUser")({});
      const capabilities = Array.isArray(result.data?.capabilities) ? result.data.capabilities : [];
      if (!capabilities.length) {
        setGateState("locked", "Accès administrateur requis", "Votre profil ne dispose pas encore d'un accès LivePalmes actif.");
        return;
      }
      setGateState("unlocked", "", "");
      await loadGatedScripts();
      global.dispatchEvent(new CustomEvent("livepalmes:admin-gate-unlocked", { detail: result.data || {} }));
    } catch {
      setGateState("locked", "Accès au portail requis", "Connectez-vous depuis le Portail LivePalmes pour consulter cette page.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", validateAccess, { once: true });
  } else {
    validateAccess();
  }
})(window);
