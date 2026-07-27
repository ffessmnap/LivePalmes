(function attachLivePalmesConsolePageGate(global) {
  const ROLE_LABELS = {
    live: "Live",
    speaker: "Speaker",
    referee: "Juge arbitre",
    video: "Juge video",
    computer: "Bureau des performances",
    secretary: "Secretariat"
  };
  const CONSOLE_ACCESS_CAPABILITIES = ["admin.full", "consoles.manage", "consoles.access"];

  const dedicatedRole = String(global.LivePalmesDedicatedRole || "").trim();
  const gateRole = dedicatedRole || "computer";
  const pageLabel = dedicatedRole ? (ROLE_LABELS[gateRole] || "Console") : "Consoles compétition";
  const pinLabel = dedicatedRole ? (ROLE_LABELS[gateRole] || "console") : "Bureau des performances";
  let unlocked = false;
  let unlockedRole = "";
  let adminBypass = false;
  let unlockResolve = () => {};
  const unlockPromise = new Promise((resolve) => {
    unlockResolve = resolve;
  });

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
      try {
        return firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      } catch {
        return null;
      }
    }
  }

  function waitForInitialFirebaseUser(auth) {
    if (!auth?.onAuthStateChanged) return Promise.resolve(auth?.currentUser || null);
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve) => {
      let done = false;
      let unsubscribe = () => {};
      const finish = (user) => {
        if (done) return;
        done = true;
        unsubscribe();
        resolve(user || auth.currentUser || null);
      };
      const timer = global.setTimeout(() => finish(auth.currentUser || null), 900);
      unsubscribe = auth.onAuthStateChanged((user) => {
        global.clearTimeout(timer);
        finish(user);
      });
    });
  }

  function hasConsolePortalCapability(capabilities = []) {
    return CONSOLE_ACCESS_CAPABILITIES.some((capability) => capabilities.includes(capability));
  }

  async function loadPortalProfile(firebase) {
    const functions = functionsService(firebase);
    if (!functions?.httpsCallable) {
      throw new Error("Verification du compte LivePalmes indisponible.");
    }
    const result = await functions.httpsCallable("getCurrentAccessUser")({});
    const profile = result.data || {};
    const capabilities = Array.isArray(profile.capabilities) ? profile.capabilities : [];
    if (profile.status !== "active" || !hasConsolePortalCapability(capabilities)) {
      throw new Error("Ce compte ne dispose pas de l'acces aux consoles LivePalmes.");
    }
    return profile;
  }

  async function currentUserHasRole(user) {
    if (!user?.getIdTokenResult) return false;
    const token = await user.getIdTokenResult(true).catch(() => null);
    const claims = token?.claims || {};
    const portalAccess = claims.livepalmesAccess === true && claims.livepalmesConsoleAccess === true;
    return portalAccess &&
      claims.livepalmesConsole === true &&
      claims.livepalmesCompetition === (global.LivePalmesAppConfig?.firestoreCompetitionId || "livepalmes-active") &&
      claims.livepalmesRole === gateRole;
  }

  async function currentUserHasAdminAccess(firebase) {
    if (!firebase || !global.LivePalmesAdminAuth?.init) return false;
    const adminAuth = global.LivePalmesAdminAuth.init({
      authConfig: global.LivePalmesAppConfig?.adminAuth || {},
      firebase,
      requiredCapability: "consoles.manage"
    });
    await adminAuth?.whenReady?.();
    return Boolean(adminAuth?.isAdminAuthenticated?.());
  }

  function setStatus(message, tone = "") {
    const node = document.querySelector("[data-console-gate-status]");
    if (!node) return;
    node.textContent = message || "";
    node.dataset.tone = tone;
  }

  function showStep(step) {
    const accountForm = document.querySelector("[data-console-account-form]");
    const pinForm = document.querySelector("[data-console-pin-form]");
    if (accountForm) accountForm.hidden = step !== "account";
    if (pinForm) pinForm.hidden = step !== "pin";
    setStatus("");
    if (step === "account") document.querySelector("[data-console-gate-email]")?.focus();
    if (step === "pin") document.querySelector("[data-console-gate-pin]")?.focus();
  }

  function ensurePanel() {
    document.body.dataset.consoleGate = "locked";
    if (document.querySelector("#consolePageGate")) {
      document.documentElement.removeAttribute("data-console-access");
      document.querySelector("#consoleAccessPending")?.remove();
      return;
    }
    const style = document.createElement("style");
    style.textContent = `
      body[data-console-gate="locked"] > :not(#consolePageGate) { display: none !important; }
      .console-page-gate { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f4f8f9; color: #102a43; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .console-page-gate-card { width: min(420px, 100%); background: #fff; border: 1px solid #d9e5ea; border-radius: 8px; box-shadow: 0 16px 42px rgba(16, 42, 67, .14); padding: 24px; }
      .console-page-gate-card[hidden] { display: none; }
      .console-page-gate-card h1 { margin: 0 0 8px; font-size: 1.35rem; line-height: 1.2; }
      .console-page-gate-card p { margin: 0 0 18px; color: #486581; line-height: 1.45; }
      .console-page-gate-card label { display: grid; gap: 8px; margin-top: 12px; font-weight: 700; }
      .console-page-gate-card input { min-height: 44px; border: 1px solid #bcccdc; border-radius: 6px; padding: 0 12px; font-size: 1rem; }
      .console-page-gate-card [data-console-gate-pin] { font-size: 1.25rem; }
      .console-page-gate-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }
      .console-page-gate-card button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 14px; font-weight: 800; cursor: pointer; }
      .console-page-gate-card button[type="submit"] { background: #0b7285; color: #fff; }
      .console-page-gate-card button[type="button"] { background: #e9f1f4; color: #102a43; }
      .console-page-gate-status { width: min(420px, 100%); min-height: 20px; margin-top: 12px; font-weight: 700; color: #486581; }
      .console-page-gate-status[data-tone="error"] { color: #c92a2a; }
    `;
    document.head.appendChild(style);
    const panel = document.createElement("section");
    panel.id = "consolePageGate";
    panel.className = "console-page-gate";
    panel.innerHTML = `
      <div>
        <form class="console-page-gate-card" data-console-account-form hidden>
          <h1>Connexion LivePalmes</h1>
          <p>Connecte-toi avec ton compte autorise avant d'ouvrir ${pageLabel}.</p>
          <label>Adresse email<input type="email" autocomplete="username" required data-console-gate-email></label>
          <label>Mot de passe<input type="password" autocomplete="current-password" required data-console-gate-password></label>
          <div class="console-page-gate-actions"><button type="submit">Se connecter</button></div>
        </form>
        <form class="console-page-gate-card" data-console-pin-form hidden>
          <h1>Acces ${pageLabel}</h1>
          <p>Compte LivePalmes valide. Entre le code PIN ${pinLabel} pour ouvrir cette console.</p>
          <label>Code PIN<input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" data-console-gate-pin></label>
          <div class="console-page-gate-actions">
            <button type="button" data-console-gate-signout>Changer de compte</button>
            <button type="submit">Ouvrir</button>
          </div>
        </form>
        <div class="console-page-gate-status" data-console-gate-status aria-live="polite">V&eacute;rification de la connexion&hellip;</div>
      </div>
    `;
    document.body.appendChild(panel);
    document.documentElement.removeAttribute("data-console-access");
    document.querySelector("#consoleAccessPending")?.remove();
  }

  function unlock(options = {}) {
    if (unlocked) return;
    unlocked = true;
    unlockedRole = dedicatedRole ? gateRole : "";
    adminBypass = options.adminBypass === true;
    delete document.body.dataset.consoleGate;
    document.querySelector("#consolePageGate")?.remove();
    unlockResolve(true);
  }

  async function verifyPin(pin) {
    const firebase = ensureFirebaseApp();
    const pinAuth = global.LivePalmesPinAuth?.init?.({
      firebase,
      region: global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1"
    });
    if (!pinAuth?.verifyRolePin) throw new Error("Verification PIN serveur indisponible.");
    await pinAuth.verifyRolePin({
      clientId: currentClientId(),
      competitionId: global.LivePalmesAppConfig?.firestoreCompetitionId || "livepalmes-active",
      pin,
      role: gateRole
    });
  }

  function currentClientId() {
    if (global.LivePalmesLocalState?.currentClientId) return global.LivePalmesLocalState.currentClientId();
    const key = global.LivePalmesAppConfig?.clientIdKey || "napSpeakerFrance2026:client-id:v1";
    try {
      const existing = global.localStorage?.getItem(key);
      if (existing) return existing;
      const id = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      global.localStorage?.setItem(key, id);
      return id;
    } catch {
      return "";
    }
  }

  async function authorizeCurrentUser(firebase) {
    const auth = firebase?.auth ? firebase.auth() : null;
    const user = await waitForInitialFirebaseUser(auth);
    if (!user || user.isAnonymous) {
      if (user?.isAnonymous) await auth.signOut().catch(() => {});
      showStep("account");
      return;
    }
    if (await currentUserHasAdminAccess(firebase)) {
      unlock({ adminBypass: true });
      return;
    }
    try {
      await loadPortalProfile(firebase);
      if (dedicatedRole && await currentUserHasRole(user)) {
        unlock();
        return;
      }
      if (!dedicatedRole) {
        unlock();
        return;
      }
      showStep("pin");
    } catch (error) {
      await auth.signOut().catch(() => {});
      showStep("account");
      setStatus(error?.message || "Compte LivePalmes refuse.", "error");
    }
  }

  async function start() {
    ensurePanel();
    const firebase = ensureFirebaseApp();
    if (!firebase?.auth) {
      showStep("account");
      setStatus("Connexion Firebase indisponible.", "error");
      return;
    }
    const auth = firebase.auth();
    document.querySelector("[data-console-account-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = String(document.querySelector("[data-console-gate-email]")?.value || "").trim();
      const password = String(document.querySelector("[data-console-gate-password]")?.value || "");
      const button = event.currentTarget.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      setStatus("Connexion au portail LivePalmes...");
      try {
        await auth.setPersistence?.(global.firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInWithEmailAndPassword(email, password);
        await authorizeCurrentUser(firebase);
      } catch (error) {
        setStatus(`Connexion refusee : ${error?.message || error}`, "error");
      } finally {
        if (button) button.disabled = false;
      }
    });
    document.querySelector("[data-console-pin-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.querySelector("[data-console-gate-pin]");
      const pin = String(input?.value || "").trim();
      if (!/^\d{4}$/.test(pin)) {
        setStatus("Le code PIN doit contenir 4 chiffres.", "error");
        return;
      }
      const button = event.currentTarget.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      setStatus("Verification du code PIN...");
      try {
        await verifyPin(pin);
        unlock();
      } catch (error) {
        setStatus(error?.message || "Code PIN refuse.", "error");
        if (input) input.value = "";
      } finally {
        if (button) button.disabled = false;
      }
    });
    document.querySelector("[data-console-gate-signout]")?.addEventListener("click", async () => {
      await auth.signOut().catch(() => {});
      showStep("account");
    });
    await authorizeCurrentUser(firebase);
  }

  global.LivePalmesConsoleGate = {
    role: gateRole,
    adminBypass: () => adminBypass,
    isUnlocked: () => unlocked,
    unlockedRole: () => unlockedRole,
    waitUntilUnlocked: () => unlockPromise
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
