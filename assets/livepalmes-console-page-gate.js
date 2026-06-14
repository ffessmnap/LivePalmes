(function attachLivePalmesConsolePageGate(global) {
  const ROLE_LABELS = {
    live: "Live",
    speaker: "Speaker",
    referee: "Juge arbitre",
    video: "Juge video",
    computer: "Bureau des performances",
    secretary: "Secretariat"
  };

  const dedicatedRole = String(global.LivePalmesDedicatedRole || "").trim();
  const gateRole = dedicatedRole || "computer";
  const pageLabel = dedicatedRole ? (ROLE_LABELS[gateRole] || "Console") : "Pilotage LivePalmes";
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
      const timer = global.setTimeout(() => finish(auth.currentUser || null), 700);
      unsubscribe = auth.onAuthStateChanged((user) => {
        global.clearTimeout(timer);
        finish(user);
      });
    });
  }

  async function currentUserHasRole(firebase) {
    const auth = firebase?.auth ? firebase.auth() : null;
    if (!auth) return false;
    const user = await waitForInitialFirebaseUser(auth);
    if (!user?.getIdTokenResult) return false;
    const token = await user.getIdTokenResult(true).catch(() => null);
    const claims = token?.claims || {};
    return claims.livepalmesConsole === true &&
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

  function ensurePanel() {
    document.body.dataset.consoleGate = "locked";
    if (document.querySelector("#consolePageGate")) return;
    const style = document.createElement("style");
    style.textContent = `
      body[data-console-gate="locked"] > :not(#consolePageGate) {
        display: none !important;
      }
      .console-page-gate {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f4f8f9;
        color: #102a43;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .console-page-gate-card {
        width: min(420px, 100%);
        background: #ffffff;
        border: 1px solid #d9e5ea;
        border-radius: 8px;
        box-shadow: 0 16px 42px rgba(16, 42, 67, .14);
        padding: 24px;
      }
      .console-page-gate-card h1 {
        margin: 0 0 8px;
        font-size: 1.35rem;
        line-height: 1.2;
      }
      .console-page-gate-card p {
        margin: 0 0 18px;
        color: #486581;
        line-height: 1.45;
      }
      .console-page-gate-card label {
        display: grid;
        gap: 8px;
        font-weight: 700;
      }
      .console-page-gate-card input {
        min-height: 44px;
        border: 1px solid #bcccdc;
        border-radius: 6px;
        padding: 0 12px;
        font-size: 1.25rem;
        letter-spacing: 0;
      }
      .console-page-gate-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 18px;
      }
      .console-page-gate-card button {
        min-height: 40px;
        border: 0;
        border-radius: 6px;
        padding: 0 14px;
        font-weight: 800;
        cursor: pointer;
      }
      .console-page-gate-card button[type="submit"] {
        background: #0b7285;
        color: #ffffff;
      }
      .console-page-gate-status {
        min-height: 20px;
        margin-top: 12px;
        font-weight: 700;
        color: #486581;
      }
      .console-page-gate-status[data-tone="error"] {
        color: #c92a2a;
      }
    `;
    document.head.appendChild(style);
    const panel = document.createElement("section");
    panel.id = "consolePageGate";
    panel.className = "console-page-gate";
    panel.innerHTML = `
      <form class="console-page-gate-card" data-console-gate-form>
        <h1>Acces ${pageLabel}</h1>
        <p>Entre le code PIN ${pinLabel} pour ouvrir cette console.</p>
        <label>
          Code PIN
          <input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" data-console-gate-pin autofocus>
        </label>
        <div class="console-page-gate-actions">
          <button type="submit">Ouvrir</button>
        </div>
        <div class="console-page-gate-status" data-console-gate-status></div>
      </form>
    `;
    document.body.appendChild(panel);
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
    if (!pinAuth?.verifyRolePin) {
      throw new Error("Verification PIN serveur indisponible.");
    }
    await pinAuth.verifyRolePin({
      clientId: currentClientId(),
      competitionId: global.LivePalmesAppConfig?.firestoreCompetitionId || "livepalmes-active",
      pin,
      role: gateRole
    });
  }

  function currentClientId() {
    if (global.LivePalmesLocalState?.currentClientId) {
      return global.LivePalmesLocalState.currentClientId();
    }
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

  async function start() {
    if (!dedicatedRole) {
      unlock();
      return;
    }
    ensurePanel();
    const firebase = ensureFirebaseApp();
    if (await currentUserHasRole(firebase)) {
      unlock();
      return;
    }
    if (await currentUserHasAdminAccess(firebase)) {
      unlock({ adminBypass: true });
      return;
    }
    const input = document.querySelector("[data-console-gate-pin]");
    input?.focus();
    document.querySelector("[data-console-gate-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const pin = String(input?.value || "").trim();
      if (!/^\d{4}$/.test(pin)) {
        setStatus("Le code PIN doit contenir 4 chiffres.", "error");
        return;
      }
      setStatus("Verification du code PIN...");
      const button = event.currentTarget.querySelector("button[type='submit']");
      if (button) button.disabled = true;
      try {
        await verifyPin(pin);
        setStatus("Console deverrouillee.");
        unlock();
      } catch (error) {
        console.warn("Acces console refuse", error);
        setStatus(error?.message || "Code PIN refuse.", "error");
        if (button) button.disabled = false;
        if (input) {
          input.value = "";
          input.focus();
        }
      }
    });
  }

  global.LivePalmesConsoleGate = {
    role: gateRole,
    adminBypass: () => adminBypass,
    isUnlocked: () => unlocked,
    unlockedRole: () => unlockedRole,
    waitUntilUnlocked: () => unlockPromise
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);
