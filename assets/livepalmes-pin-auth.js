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
        const timer = setTimeout(() => finish(auth.currentUser || null), 900);
        unsubscribe = auth.onAuthStateChanged((user) => {
          clearTimeout(timer);
          finish(user);
        });
      });
    }

    async function verifyRolePin(options = {}) {
      const auth = authService();
      if (!auth) {
        throw new Error("Authentification console indisponible.");
      }
      await waitForInitialFirebaseUser(auth);
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        throw new Error("Connecte-toi au portail LivePalmes avant de saisir le code PIN.");
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
      const competitionId = options.competitionId || "livepalmes-active";
      const expectedRole = options.role || "";
      let tokenResult = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await auth.currentUser?.getIdToken?.(true);
        tokenResult = await auth.currentUser?.getIdTokenResult?.(true);
        const claims = tokenResult?.claims || {};
        if (
          claims.livepalmesConsole === true &&
          claims.livepalmesCompetition === competitionId &&
          claims.livepalmesRole === expectedRole
        ) {
          return result;
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      const claims = tokenResult?.claims || {};
      throw new Error([
        "Droits Firebase non recus apres validation du PIN.",
        `Role attendu : ${expectedRole || "console"}.`,
        `Role recu : ${claims.livepalmesRole || "aucun"}.`
      ].join(" "));
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
