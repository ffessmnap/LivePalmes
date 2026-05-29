(function () {
  function init(context = {}) {
    const {
      ROLE_LABELS,
      competitionModeEnabled,
      currentRolePins,
      ensureResultsAdminSession,
      formatAlertDateTime,
      historyArchivesCollection,
      initFirebaseSync,
      livePalmesAdminBackups,
      livePalmesPinAuth,
      livePalmesAdminAuth,
      livePalmesAdminModals,
      normalizeData,
      pinLockEnabled,
      publishLiveDataToFirestore,
      render,
      resultArchivesCollection,
      resultSessions,
      roleCodesModal,
      roleIsUnlocked,
      saveAlerts,
      saveData,
      saveRoleStates,
      saveUnlockedRoles,
      updateLiveNotes
    } = context;
    const getData = () => context.data || { notes: {} };
    const serverPinModeEnabled = () => livePalmesPinAuth?.cloudPinModeEnabled?.(getData().notes);
    const getState = () => context.state || {};
    const setData = (value) => { context.data = value; };

      function renderRoleCodesModal() {
        if (!roleCodesModal) return;
        const pins = currentRolePins();
        const active = pinLockEnabled();
        const roleOrder = ["live", "speaker", "referee", "video", "computer", "secretary"];
        roleCodesModal.hidden = false;
        roleCodesModal.innerHTML = livePalmesAdminModals.renderRoleCodesModalHtml({
          active,
          adminAuthStatus: livePalmesAdminAuth?.status?.(),
          diagnosticsEnabled: getState().role === "computer",
          pins,
          serverPinMode: serverPinModeEnabled(),
          roles: roleOrder.map((role) => ({ role, label: ROLE_LABELS[role] }))
        });
      }
      
      function renderRoleCodesAdminModal(action = "codes") {
        if (!roleCodesModal) return;
        roleCodesModal.hidden = false;
        const title = action === "reset" ? "Confirmer le RAZ" : "Code administrateur";
        const help = action === "reset"
          ? "Entre le code administrateur pour archiver puis remettre l'historique à zéro."
          : "Connecte-toi comme administrateur pour modifier les codes des consoles.";
        roleCodesModal.innerHTML = livePalmesAdminModals.renderRoleCodesAdminModalHtml({
          action,
          adminAuthStatus: livePalmesAdminAuth?.status?.(),
          help,
          title
        });
        roleCodesModal.querySelector("#adminEmailInput, #roleCodeAdminInput")?.focus();
      }
      
      function renderResetHistoryModal() {
        if (!roleCodesModal) return;
        roleCodesModal.hidden = false;
        roleCodesModal.innerHTML = livePalmesAdminModals.renderResetHistoryModalHtml();
        roleCodesModal.querySelector("#resetHistoryInput")?.focus();
      }
      
      function renderResetResultsModal() {
        if (!roleCodesModal) return;
        const activeSession = ensureResultsAdminSession();
        const sessions = resultSessions();
        const selectedSession = activeSession || sessions[0]?.number || "";
        roleCodesModal.hidden = false;
        roleCodesModal.innerHTML = livePalmesAdminModals.renderResetResultsModalHtml({
          activeSession,
          selectedSession,
          sessions
        });
        roleCodesModal.querySelector("#resetResultsInput")?.focus();
      }
      
      function renderPublicSessionInfosModal() {
        if (!roleCodesModal) return;
        const sessions = resultSessions();
        const infos = getData().notes?.publicSessionInfos || {};
        roleCodesModal.hidden = false;
        roleCodesModal.innerHTML = livePalmesAdminModals.renderPublicSessionInfosModalHtml({ infos, sessions });
      }
      
      async function renderHistoryArchivesModal({ canDelete = false } = {}) {
        if (!roleCodesModal) return;
        const historyCollection = historyArchivesCollection();
        const resultCollection = resultArchivesCollection();
        let historyArchives = [];
        let resultArchives = [];
        if (historyCollection) {
          try {
            const snapshot = await historyCollection.orderBy("createdAt", "desc").limit(20).get();
            historyArchives = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            if (resultCollection) {
              const resultSnapshot = await resultCollection.orderBy("createdAt", "desc").limit(20).get();
              resultArchives = resultSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            }
          } catch (error) {
            console.warn("Lecture des archives impossible", error);
            window.alert("Impossible de lire les archives historiques.");
            return;
          }
        }
        roleCodesModal.hidden = false;
        roleCodesModal.innerHTML = livePalmesAdminModals.renderHistoryArchivesModalHtml({
          canDelete,
          formatDateTime: formatAlertDateTime,
          historyArchives,
          resultArchives
        });
      }
      
      function renderRolePinModal(role) {
        if (!roleCodesModal) return;
        const label = ROLE_LABELS[role] || "Console";
        roleCodesModal.hidden = false;
        roleCodesModal.innerHTML = livePalmesAdminModals.renderRolePinModalHtml({ label, role });
        roleCodesModal.querySelector("#rolePinInput")?.focus();
      }

      function backupContext() {
        return {
          activeCompetitionId: context.FIRESTORE_COMPETITION_ID,
          alerts: context.alerts,
          data: getData(),
          normalizeData,
          raceResults: context.raceResults,
          render,
          roleStates: context.roleStates,
          saveAlerts,
          saveData,
          saveRoleStates
        };
      }

      function downloadAdminBackup() {
        if (typeof livePalmesAdminBackups?.downloadBackup !== "function") {
          window.alert("Sauvegarde indisponible sur cette version.");
          return;
        }
        livePalmesAdminBackups.downloadBackup(backupContext());
      }

      async function restoreAdminBackupFile(file) {
        if (!file) return null;
        if (typeof livePalmesAdminBackups?.readBackupFile !== "function") {
          window.alert("Restauration indisponible sur cette version.");
          return null;
        }
        const backup = await livePalmesAdminBackups.readBackupFile(file);
        const ok = window.confirm([
          "Restaurer cette sauvegarde sur cette console ?",
          "",
          "Cela remplace les donnees locales LivePalmes de cet ordinateur : series, resultats lus, journaux et etats de consoles.",
          "Les pages publiques en ligne ne sont pas modifiees automatiquement."
        ].join("\n"));
        if (!ok) return null;
        return livePalmesAdminBackups.applyBackup(backup, backupContext());
      }
      
      async function askRolePin(role) {
        if (roleIsUnlocked(role)) return Promise.resolve({ allowed: true, adminBypass: false });
        await livePalmesAdminAuth?.whenReady?.();
        if (livePalmesAdminAuth?.isAdminAuthenticated?.()) {
          return { allowed: true, adminBypass: true };
        }
        renderRolePinModal(role);
        return new Promise((resolve) => {
          context.rolePinResolver = resolve;
        });
      }
      
      function finishRolePin(result) {
        context.forceCloudRolePin = "";
        if (context.rolePinResolver) {
          context.rolePinResolver(result);
          context.rolePinResolver = null;
        }
        closeRoleCodesModal();
      }
      
      function closeRoleCodesModal() {
        if (!roleCodesModal) return;
        roleCodesModal.hidden = true;
        roleCodesModal.innerHTML = "";
      }
      
      function readRolePinsFromModal(options = {}) {
        const required = options.required !== false;
        const pins = {};
        roleCodesModal?.querySelectorAll("[data-role-code]").forEach((input) => {
          pins[input.dataset.roleCode] = String(input.value || "").trim();
        });
        const invalid = Object.entries(pins).find(([, value]) => required && !/^\d{4}$/.test(value));
        if (invalid) {
          window.alert("Chaque code doit contenir exactement 4 chiffres.");
          return null;
        }
        return pins;
      }
      
      async function saveRoleCodesFromModal(enableLock) {
        if (!roleCodesModal) return;
        const pins = readRolePinsFromModal({ required: enableLock });
        if (!pins) return;
        if (livePalmesPinAuth?.available?.() && livePalmesAdminAuth?.isAdminAuthenticated?.()) {
          try {
            await livePalmesPinAuth.saveRolePins({
              competitionId: context.FIRESTORE_COMPETITION_ID,
              enabled: enableLock,
              pins
            });
          } catch (error) {
            console.error(error);
            window.alert(`Enregistrement serveur des codes impossible : ${error?.message || error}`);
            return;
          }
          const data = getData();
          const nextNotes = {
            ...(data.notes || {}),
            pinAuthMode: "cloud",
            pinLockEnabled: enableLock,
            pinLockUpdatedAt: new Date().toISOString()
          };
          delete nextNotes.rolePins;
          const nextData = normalizeData({
            ...data,
            notes: nextNotes,
            sourceVersion: `cloud-lock-${Date.now()}`
          });
          setData(nextData);
          context.unlockedRoles = enableLock ? ["computer"] : [];
          saveUnlockedRoles();
          saveData();
          closeRoleCodesModal();
          render();
          window.alert(enableLock ? "Codes enregistrés côté serveur et actifs." : "Codes désactivés côté serveur.");
          return;
        }
        const data = getData();
        const nextData = normalizeData({
          ...data,
          notes: {
            ...(data.notes || {}),
            rolePins: pins,
            pinLockEnabled: enableLock,
            pinLockUpdatedAt: new Date().toISOString()
          },
          sourceVersion: `lock-${Date.now()}`
        });
        setData(nextData);
        if (enableLock) {
          context.unlockedRoles = ["computer"];
        } else {
          context.unlockedRoles = [];
        }
        saveUnlockedRoles();
        saveData();
        closeRoleCodesModal();
        render();
        try {
          await publishLiveDataToFirestore(nextData, enableLock ? "Codes activés" : "Codes désactivés");
        } catch {
          window.alert("Les codes ont été modifiés sur cet appareil, mais Firebase n'a pas accepté la mise à jour.");
          return;
        }
        window.alert(enableLock ? "Codes enregistrés et actifs." : "Codes désactivés.");
      }
      async function toggleRoleLock() {
        await livePalmesAdminAuth?.whenReady?.();
        if (livePalmesAdminAuth?.isAdminAuthenticated?.()) {
          renderRoleCodesModal();
          return;
        }
        renderRoleCodesAdminModal();
      }

      async function ensureComputerWriteAccess() {
        await livePalmesAdminAuth?.whenReady?.();
        if (livePalmesAdminAuth?.isAdminAuthenticated?.()) return true;
        const auth = window.firebase?.auth ? window.firebase.auth() : null;
        if (!auth?.signInAnonymously) return true;
        try {
          if (auth.setPersistence && window.firebase?.auth?.Auth?.Persistence?.LOCAL) {
            await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
          }
          if (!auth.currentUser) await auth.signInAnonymously();
          return true;
        } catch (error) {
          console.warn("Connexion Firebase console impossible", error);
          window.alert(`Connexion Firebase impossible : ${error?.message || error}`);
          return false;
        }
      }

      async function firebaseAuthSummary() {
        const auth = window.firebase?.auth ? window.firebase.auth() : null;
        const user = auth?.currentUser || null;
        const token = user?.getIdTokenResult ? await user.getIdTokenResult(true).catch(() => null) : null;
        const claims = token?.claims || {};
        return [
          `uid: ${user?.uid || "aucun"}`,
          `role: ${claims.livepalmesRole || "aucun"}`,
          `competition: ${claims.livepalmesCompetition || "aucune"}`,
          `console: ${claims.livepalmesConsole === true ? "oui" : "non"}`,
          `grant local computer: ${context.cloudAuthenticatedRoles?.computer ? "oui" : "non"}`
        ].join("\n");
      }
      
      async function toggleCompetitionMode(targetEnabled) {
        if (!await ensureComputerWriteAccess()) return false;
        const enabled = typeof targetEnabled === "boolean" ? targetEnabled : !competitionModeEnabled();
        const previousData = getData();
        context.lastConsoleActivityAt = Date.now();
        const data = previousData;
        const hasCompetitionRows = Boolean(
          data.program?.length ||
          data.series?.length ||
          data.entrants?.length
        );
        const isEmptyRescueData = data.notes?.sourceMode === "empty-rescue" ||
          /comp[Ãé]tition\s+[Ãà]?\s*charger/i.test(String(data.meet?.name || ""));
        if (enabled && !hasCompetitionRows && isEmptyRescueData) {
          window.alert("Mode Direct impossible : aucune compétition n'est chargée sur cette console. Clique d'abord sur Actualiser ou réimporte les séries.");
          return false;
        }
        const nextData = normalizeData({
          ...data,
          notes: {
            ...(data.notes || {}),
            competitionMode: enabled,
            competitionModeUpdatedAt: new Date().toISOString()
          },
          sourceVersion: `competition-mode-${Date.now()}`
        });
        setData(nextData);
        saveData();
        render();
        try {
          await updateLiveNotes(enabled ? "Actualisation directe activée" : "Actualisation manuelle activée", {
            competitionMode: enabled,
            competitionModeUpdatedAt: nextData.notes.competitionModeUpdatedAt
          });
          initFirebaseSync();
          render();
          return true;
        } catch (error) {
          setData(previousData);
          saveData();
          render();
          const permissionHint = /permission|insufficient|denied/i.test(String(error?.message || error))
            ? `\n\nFirebase refuse l'ecriture.\n${await firebaseAuthSummary()}`
            : "";
          window.alert(`Changement de mode impossible : ${error?.message || error}${permissionHint}`);
          return false;
        }
      }

      return {
        renderRoleCodesModal,
        renderRoleCodesAdminModal,
        renderResetHistoryModal,
        renderResetResultsModal,
        renderPublicSessionInfosModal,
        renderHistoryArchivesModal,
        renderRolePinModal,
        askRolePin,
        finishRolePin,
        closeRoleCodesModal,
        readRolePinsFromModal,
        saveRoleCodesFromModal,
        ensureComputerWriteAccess,
        toggleRoleLock,
        downloadAdminBackup,
        restoreAdminBackupFile,
        toggleCompetitionMode
      };
  }

  window.LivePalmesAdminActions = { init };
}());
