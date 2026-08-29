(function attachLivePalmesPortalSession(global) {
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
  const INACTIVITY_WARNING_MS = 25 * 60 * 1000;
  const SESSION_STORAGE_PREFIX = "livepalmes.portal.inactivity.v1.";
  const ACTIVITY_WRITE_THROTTLE_MS = 5000;
  const ACTIVITY_EVENTS = ["pointerdown", "keydown", "input", "scroll", "touchstart"];

  let currentUser = null;
  let lastActivityAt = 0;
  let lastStoredActivityAt = 0;
  let inactivityTimer = null;
  let initialized = false;

  const elements = {};

  function storageKey(uid = currentUser?.uid) {
    const cleanUid = String(uid || "").trim();
    return cleanUid ? `${SESSION_STORAGE_PREFIX}${cleanUid}` : "";
  }

  function readStoredState(uid = currentUser?.uid) {
    const key = storageKey(uid);
    if (!key) return null;
    try {
      const state = JSON.parse(global.localStorage?.getItem(key) || "null");
      if (!state || typeof state !== "object") return null;
      return {
        lastActivityAt: Number(state.lastActivityAt) || 0,
        locked: state.locked === true
      };
    } catch {
      return null;
    }
  }

  function writeStoredState({ locked = false, force = false } = {}) {
    const key = storageKey();
    if (!key) return;
    const now = Date.now();
    if (!force && !locked && now - lastStoredActivityAt < ACTIVITY_WRITE_THROTTLE_MS) return;
    try {
      global.localStorage?.setItem(key, JSON.stringify({ lastActivityAt, locked }));
      lastStoredActivityAt = now;
    } catch {
      // Le verrouillage reste actif dans l'onglet si le stockage local est indisponible.
    }
  }

  function removeStoredState(uid) {
    const key = storageKey(uid);
    if (!key) return;
    try {
      global.localStorage?.removeItem(key);
    } catch {
      // Aucun nettoyage supplementaire n'est possible sans stockage local.
    }
  }

  function dialogIsOpen(dialog) {
    return Boolean(dialog?.open || dialog?.hasAttribute?.("open"));
  }

  function openDialog(dialog) {
    if (!dialog || dialogIsOpen(dialog)) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog || !dialogIsOpen(dialog)) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function setSessionMode(mode) {
    document.body.dataset.portalSession = mode;
  }

  function setSessionMessage(message = "") {
    if (elements.message) elements.message.textContent = message;
  }

  function formatRemainingTime(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes >= 1) return `${minutes} min ${String(remainingSeconds).padStart(2, "0")} s`;
    return `${remainingSeconds} s`;
  }

  function showWarning(elapsed) {
    if (document.visibilityState === "hidden") return;
    if (elements.countdown) {
      elements.countdown.textContent = formatRemainingTime(INACTIVITY_TIMEOUT_MS - elapsed);
    }
    openDialog(elements.warning);
  }

  function showLockedSession({ persist = true } = {}) {
    if (!currentUser) return;
    closeDialog(elements.warning);
    setSessionMode("locked");
    if (elements.email) elements.email.value = currentUser.email || "";
    if (elements.password) elements.password.value = "";
    setSessionMessage("");
    if (persist) writeStoredState({ locked: true, force: true });
    openDialog(elements.lock);
    global.setTimeout(() => elements.password?.focus(), 0);
  }

  function activateSession({ recordActivity = false } = {}) {
    closeDialog(elements.warning);
    closeDialog(elements.lock);
    setSessionMode("active");
    setSessionMessage("");
    if (recordActivity) {
      lastActivityAt = Date.now();
      writeStoredState({ force: true });
    }
  }

  function recordActivity({ force = false } = {}) {
    if (!currentUser || document.body.dataset.portalSession !== "active") return;
    if (!force && dialogIsOpen(elements.warning)) return;
    lastActivityAt = Date.now();
    writeStoredState({ force });
    if (dialogIsOpen(elements.warning)) closeDialog(elements.warning);
  }

  function checkInactivity() {
    if (!currentUser || document.body.dataset.portalSession === "locked") return;
    const elapsed = Math.max(0, Date.now() - lastActivityAt);
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      showLockedSession();
      return;
    }
    if (elapsed >= INACTIVITY_WARNING_MS) showWarning(elapsed);
    else if (dialogIsOpen(elements.warning)) closeDialog(elements.warning);
  }

  function applyStoredSessionState() {
    const state = readStoredState();
    lastActivityAt = state?.lastActivityAt || Date.now();
    lastStoredActivityAt = state?.lastActivityAt || 0;
    if (state?.locked || Date.now() - lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
      showLockedSession();
      return;
    }
    activateSession();
    if (!state?.lastActivityAt) writeStoredState({ force: true });
    checkInactivity();
  }

  async function unlockSession(event) {
    event?.preventDefault?.();
    const password = elements.password?.value || "";
    const firebase = global.firebase;
    const user = firebase?.auth?.().currentUser;
    if (!password || !user?.email || !firebase?.auth?.EmailAuthProvider?.credential || !user.reauthenticateWithCredential) {
      setSessionMessage("Saisissez votre mot de passe pour déverrouiller le Portail.");
      return;
    }
    const submit = elements.form?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setSessionMessage("Vérification en cours…");
    try {
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(credential);
      await user.getIdToken?.(true);
      activateSession({ recordActivity: true });
    } catch (error) {
      const code = String(error?.code || "");
      setSessionMessage(code.includes("wrong-password") || code.includes("invalid-credential")
        ? "Le mot de passe est incorrect."
        : code.includes("too-many-requests")
          ? "Trop de tentatives. Réessayez dans quelques minutes."
          : `Reconnexion impossible : ${error?.message || error}`);
      elements.password?.focus();
      elements.password?.select();
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function signOut() {
    const uid = currentUser?.uid;
    removeStoredState(uid);
    try {
      await global.firebase?.auth?.().signOut?.();
    } catch (error) {
      setSessionMessage(`Déconnexion impossible : ${error?.message || error}`);
    }
  }

  function handleAuthState(user) {
    const previousUid = currentUser?.uid;
    currentUser = user || null;
    if (!currentUser) {
      if (previousUid) removeStoredState(previousUid);
      lastActivityAt = 0;
      closeDialog(elements.warning);
      closeDialog(elements.lock);
      setSessionMode("active");
      return;
    }
    applyStoredSessionState();
  }

  function handleStorage(event) {
    if (!currentUser || event.key !== storageKey()) return;
    const state = readStoredState();
    if (!state) return;
    lastActivityAt = state.lastActivityAt || lastActivityAt;
    if (state.locked) showLockedSession({ persist: false });
    else if (document.body.dataset.portalSession === "locked") activateSession();
    else checkInactivity();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    elements.warning = document.querySelector("#adminPortalSessionWarning");
    elements.countdown = document.querySelector("#adminPortalSessionCountdown");
    elements.continueButton = document.querySelector("#adminPortalSessionContinue");
    elements.warningSignOut = document.querySelector("#adminPortalSessionWarningSignOut");
    elements.lock = document.querySelector("#adminPortalSessionLock");
    elements.form = document.querySelector("#adminPortalSessionUnlockForm");
    elements.email = document.querySelector("#adminPortalSessionEmail");
    elements.password = document.querySelector("#adminPortalSessionPassword");
    elements.message = document.querySelector("#adminPortalSessionMessage");
    elements.lockSignOut = document.querySelector("#adminPortalSessionLockSignOut");

    elements.continueButton?.addEventListener("click", () => recordActivity({ force: true }));
    elements.warningSignOut?.addEventListener("click", signOut);
    elements.lockSignOut?.addEventListener("click", signOut);
    elements.form?.addEventListener("submit", unlockSession);
    [elements.warning, elements.lock].forEach((dialog) => {
      dialog?.addEventListener("cancel", (event) => event.preventDefault());
    });
    elements.lock?.addEventListener("close", () => {
      if (document.body.dataset.portalSession === "locked") openDialog(elements.lock);
    });

    ACTIVITY_EVENTS.forEach((eventName) => {
      global.addEventListener(eventName, recordActivity, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", checkInactivity);
    global.addEventListener("storage", handleStorage);
    inactivityTimer = global.setInterval(checkInactivity, 1000);

    const auth = global.firebase?.auth?.();
    if (auth?.onAuthStateChanged) auth.onAuthStateChanged(handleAuthState);
    else setSessionMode("active");
  }

  global.LivePalmesPortalSession = {
    init,
    formatRemainingTime,
    inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
    inactivityWarningMs: INACTIVITY_WARNING_MS
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
