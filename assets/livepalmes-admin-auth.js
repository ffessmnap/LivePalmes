(function attachLivePalmesAdminAuth(global) {
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function createAuthError(message) {
    const error = new Error(message);
    error.livePalmesAuth = true;
    return error;
  }

  function init(options = {}) {
    const firebase = options.firebase || global.firebase;
    const authConfig = options.authConfig || {};
    const allowedUids = new Set((authConfig.adminUids || []).map((uid) => String(uid || "").trim()).filter(Boolean));
    const allowedEmails = new Set((authConfig.adminEmails || []).map(normalizeEmail).filter(Boolean));
    const legacyFallback = authConfig.legacyAdminPinFallback !== false;
    let currentUser = null;
    let authReady = false;
    let authUnsubscribe = null;
    const listeners = new Set();

    function authService() {
      if (!firebase?.auth || !firebase.apps?.length) return null;
      try {
        const service = firebase.auth();
        attachAuthListener(service);
        return service;
      } catch {
        return null;
      }
    }

    function isConfigured() {
      return allowedUids.size > 0 || allowedEmails.size > 0;
    }

    function isAllowedUser(user = currentUser) {
      if (!user || !isConfigured()) return false;
      return allowedUids.has(user.uid) || allowedEmails.has(normalizeEmail(user.email));
    }

    function notify() {
      const nextStatus = status();
      listeners.forEach((listener) => {
        try {
          listener(nextStatus);
        } catch (error) {
          console.warn("Ecoute admin auth impossible", error);
        }
      });
    }

    function attachAuthListener(service) {
      if (authUnsubscribe || !service?.onAuthStateChanged) return;
      authUnsubscribe = service.onAuthStateChanged((user) => {
        currentUser = user || null;
        authReady = true;
        notify();
      });
    }

    function status() {
      const service = authService();
      return {
        available: Boolean(service),
        configured: isConfigured(),
        email: currentUser?.email || "",
        ready: authReady,
        signedIn: isAllowedUser(),
        legacyFallbackEnabled: legacyFallback && !isConfigured()
      };
    }

    async function signIn(email, password) {
      const service = authService();
      if (!service) {
        throw createAuthError("Firebase Authentication n'est pas charge.");
      }
      if (!isConfigured()) {
        throw createAuthError("Aucun admin Firebase n'est encore configure dans LivePalmes.");
      }
      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail || !password) {
        throw createAuthError("Email et mot de passe obligatoires.");
      }
      const credential = await service.signInWithEmailAndPassword(cleanEmail, password);
      currentUser = credential.user || service.currentUser || null;
      if (!isAllowedUser(currentUser)) {
        await service.signOut().catch(() => {});
        currentUser = null;
        throw createAuthError("Ce compte Firebase n'est pas autorise comme admin LivePalmes.");
      }
      notify();
      return currentUser;
    }

    async function signOut() {
      const service = authService();
      if (!service) return;
      await service.signOut();
    }

    function onChange(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(status());
      return () => listeners.delete(listener);
    }

    authService();
    authReady = true;

    return {
      isAdminAuthenticated: () => isAllowedUser(),
      legacyAdminPinFallbackEnabled: () => status().legacyFallbackEnabled,
      onChange,
      signIn,
      signOut,
      status
    };
  }

  global.LivePalmesAdminAuth = { init };
})(window);
