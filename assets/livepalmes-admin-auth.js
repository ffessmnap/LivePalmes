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
    const requiredCapability = String(options.requiredCapability || "").trim();
    const allowedUids = new Set((authConfig.adminUids || []).map((uid) => String(uid || "").trim()).filter(Boolean));
    const allowedEmails = new Set((authConfig.adminEmails || []).map(normalizeEmail).filter(Boolean));
    const legacyFallback = authConfig.legacyAdminPinFallback !== false;
    let currentUser = null;
    let currentClaims = {};
    let currentProfile = null;
    let authReady = false;
    let authUnsubscribe = null;
    let accessRefreshPromise = null;
    let accessRefreshUid = "";
    let accessRefreshCompletedAt = 0;
    let accessRefreshCompletedUid = "";
    let persistenceReady = Promise.resolve();
    let readyResolver = null;
    const readyPromise = new Promise((resolve) => {
      readyResolver = resolve;
    });
    const listeners = new Set();

    function authService() {
      if (!firebase?.auth || !firebase.apps?.length) return null;
      try {
        const service = firebase.auth();
        configurePersistence(service);
        attachAuthListener(service);
        return service;
      } catch {
        return null;
      }
    }

    function functionsService() {
      if (!firebase?.functions || !firebase.apps?.length) return null;
      try {
        const service = firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
        return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
      } catch {
        try {
          const service = firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
          return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
        } catch {
          return null;
        }
      }
    }

    async function refreshAccessFromServer() {
      if (!currentUser) return;
      const refreshUid = String(currentUser.uid || "");
      if (currentProfile && accessRefreshCompletedUid === refreshUid && Date.now() - accessRefreshCompletedAt < 5000) return;
      if (accessRefreshPromise && accessRefreshUid === refreshUid) return accessRefreshPromise;
      const functions = functionsService();
      if (!functions?.httpsCallable) return;
      accessRefreshUid = refreshUid;
      accessRefreshPromise = (async () => {
        try {
          const result = await functions.httpsCallable("getCurrentAccessUser")({});
          if (String(currentUser?.uid || "") !== refreshUid) return;
          const capabilities = Array.isArray(result.data?.capabilities) ? result.data.capabilities : [];
          currentProfile = result.data || null;
          accessRefreshCompletedUid = refreshUid;
          accessRefreshCompletedAt = Date.now();
          if (!capabilities.length) return;
          currentClaims = {
            ...currentClaims,
            livepalmesAccess: true,
            livepalmesCapabilities: capabilities.reduce((acc, capability) => {
              acc[capability] = true;
              return acc;
            }, {})
          };
        } catch {
          if (String(currentUser?.uid || "") === refreshUid) currentProfile = null;
          // No server-side access found; keep the local auth status unchanged.
        } finally {
          if (accessRefreshUid === refreshUid) {
            accessRefreshPromise = null;
            accessRefreshUid = "";
          }
        }
      })();
      return accessRefreshPromise;
    }

    function configurePersistence(service) {
      if (!service?.setPersistence || !firebase?.auth?.Auth?.Persistence?.LOCAL) return;
      if (persistenceReady.livePalmesConfigured) return;
      persistenceReady = service.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
        console.warn("Persistance admin Firebase impossible", error);
      });
      persistenceReady.livePalmesConfigured = true;
    }

    function isConfigured() {
      return allowedUids.size > 0 || allowedEmails.size > 0;
    }

    function hasLivePalmesCapability(claims = currentClaims) {
      const capabilities = claims?.livepalmesCapabilities || {};
      const requiredCapabilityNeedsExplicitGrant = requiredCapability === "dtn.view" || requiredCapability.startsWith("engagements.");
      if (requiredCapability) {
        return claims?.livepalmesAccess === true && (
          (!requiredCapabilityNeedsExplicitGrant && capabilities["admin.full"] === true) ||
          capabilities[requiredCapability] === true
        );
      }
      return claims?.livepalmesAccess === true && (
        capabilities["admin.full"] === true ||
        capabilities["records.manage"] === true ||
        capabilities["consoles.manage"] === true ||
        capabilities["consoles.access"] === true ||
        capabilities["competitions.import"] === true ||
        capabilities["dtn.view"] === true ||
        capabilities["engagements.club.manage"] === true ||
        capabilities["engagements.region.manage"] === true ||
        capabilities["engagements.national.manage"] === true
      );
    }

    function isAllowedUser(user = currentUser) {
      if (!user) return false;
      if (!isConfigured()) return hasLivePalmesCapability();
      return allowedUids.has(user.uid) || allowedEmails.has(normalizeEmail(user.email)) || hasLivePalmesCapability();
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
      authUnsubscribe = service.onAuthStateChanged(async (user) => {
        currentUser = user || null;
        currentClaims = {};
        currentProfile = null;
        if (currentUser?.getIdTokenResult) {
          try {
            currentClaims = (await currentUser.getIdTokenResult(true))?.claims || {};
          } catch (error) {
            console.warn("Lecture des droits admin LivePalmes impossible", error);
          }
        }
        await refreshAccessFromServer();
        authReady = true;
        readyResolver?.();
        readyResolver = null;
        notify();
      });
    }

    function status() {
      const service = authService();
      return {
        available: Boolean(service),
        configured: isConfigured() || hasLivePalmesCapability(),
        claims: currentClaims,
        email: currentUser?.email || "",
        profile: currentProfile,
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
      await persistenceReady;
      const credential = await service.signInWithEmailAndPassword(cleanEmail, password);
      const nextUser = credential.user || service.currentUser || null;
      const sameUser = Boolean(nextUser?.uid && currentUser?.uid === nextUser.uid);
      currentUser = nextUser;
      if (!sameUser) {
        currentClaims = {};
        currentProfile = null;
      }
      if (currentUser?.getIdTokenResult) {
        currentClaims = (await currentUser.getIdTokenResult(true))?.claims || {};
      }
      await refreshAccessFromServer();
      if (!isAllowedUser(currentUser)) {
        await service.signOut().catch(() => {});
        currentUser = null;
        currentClaims = {};
        currentProfile = null;
        throw createAuthError("Ce compte Firebase n'est pas autorise comme admin LivePalmes.");
      }
      notify();
      return currentUser;
    }

    async function sendPasswordReset(email) {
      const service = authService();
      if (!service?.sendPasswordResetEmail) {
        throw createAuthError("Firebase Authentication n'est pas charge.");
      }
      if (!isConfigured()) {
        throw createAuthError("Aucun admin Firebase n'est encore configure dans LivePalmes.");
      }
      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail) {
        throw createAuthError("Renseigne l'email admin avant de demander la reinitialisation.");
      }
      if (allowedEmails.size && !allowedEmails.has(cleanEmail)) {
        throw createAuthError("Cet email n'est pas autorise comme admin LivePalmes.");
      }
      await service.sendPasswordResetEmail(cleanEmail);
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

    const initialService = authService();
    if (!initialService) {
      authReady = true;
      readyResolver?.();
      readyResolver = null;
    }

    return {
      isAdminAuthenticated: () => isAllowedUser(),
      hasCapability: (capability) => {
        if (isAllowedUser() && (allowedUids.has(currentUser?.uid) || allowedEmails.has(normalizeEmail(currentUser?.email)))) return true;
        if (capability === "consoles.access" && currentClaims?.livepalmesCapabilities?.["consoles.manage"] === true) return true;
        return currentClaims?.livepalmesCapabilities?.[capability] === true;
      },
      legacyAdminPinFallbackEnabled: () => status().legacyFallbackEnabled,
      onChange,
      whenReady: () => readyPromise,
      sendPasswordReset,
      signIn,
      signOut,
      status
    };
  }

  global.LivePalmesAdminAuth = { init };
})(window);
