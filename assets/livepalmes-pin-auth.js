(function attachLivePalmesPinAuth(global) {
  function init(options = {}) {
    const firebase = options.firebase || global.firebase;
    const region = options.region || "europe-west1";

    function appReady() {
      return Boolean(firebase?.apps?.length);
    }

    function authService() {
      if (!appReady() || !firebase?.auth) return null;
      try {
        return firebase.auth();
      } catch {
        return null;
      }
    }

    function functionsService() {
      if (!appReady() || !firebase?.functions) return null;
      try {
        return firebase.app().functions(region);
      } catch {
        try {
          return firebase.functions(region);
        } catch {
          return null;
        }
      }
    }

    function cloudPinModeEnabled(notes = {}) {
      return notes?.pinAuthMode === "cloud";
    }

    function available() {
      return Boolean(functionsService() && authService());
    }

    async function callFunction(name, payload) {
      const functions = functionsService();
      if (!functions?.httpsCallable) {
        throw new Error("Cloud Functions LivePalmes indisponible.");
      }
      const callable = functions.httpsCallable(name);
      const result = await callable(payload);
      return result.data || {};
    }

    async function verifyRolePin(options = {}) {
      const auth = authService();
      if (!auth?.signInAnonymously) {
        throw new Error("Authentification console indisponible.");
      }
      if (!auth.currentUser || !auth.currentUser.isAnonymous) {
        try {
          await auth.signInAnonymously();
        } catch (error) {
          throw new Error("Connexion console anonyme indisponible. Active le fournisseur Anonyme dans Firebase Authentication.");
        }
      }
      const result = await callFunction("verifyPin", {
        clientId: options.clientId || "",
        competitionId: options.competitionId || "livepalmes-active",
        pin: options.pin || "",
        role: options.role || ""
      });
      if (!result.ok) {
        throw new Error("Code PIN refuse.");
      }
      await auth.currentUser?.getIdToken?.(true);
      return result;
    }

    async function saveRolePins(options = {}) {
      return callFunction("setRolePins", {
        competitionId: options.competitionId || "livepalmes-active",
        enabled: options.enabled !== false,
        pins: options.pins || {}
      });
    }

    return {
      available,
      cloudPinModeEnabled,
      saveRolePins,
      verifyRolePin
    };
  }

  global.LivePalmesPinAuth = { init };
})(window);
