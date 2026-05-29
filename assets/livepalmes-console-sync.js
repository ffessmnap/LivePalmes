(function () {
  function init(context = {}) {
    const {
      LOCK_DURATION_MS,
      LOCK_RECOVERY_MS,
      PRESENCE_DURATION_MS,
      PRESENCE_WRITE_THROTTLE_MS,
      ROLE_LABELS,
      activeCompetitionId,
      alertsCollection,
      appendImportHistory,
      applyFreshData,
      clearPublicSessionResultsPdfs,
      currentClientId,
      emptyPresenceCounts,
      formatAlertTime,
      liveDataDocument,
      livePalmesAdminMaintenance,
      livePalmesFirebase,
      livePalmesRoleAccess,
      livePalmesRoleLockSync,
      normalizeData,
      pinLockEnabled,
      presenceCollection,
      presenceDocument,
      protectedRole,
      publishPublicResultsIndex,
      render,
      renderDataStatus,
      renderPresenceCounts,
      resultPdfsCollection,
      roleConnectionLimit,
      roleLockDocument,
      saveAlerts,
      saveData,
      saveUnlockedRoles,
      speakerAlertAlreadyResolvedByResult
    } = context;
    const alerts = new Proxy([], {
      get: (_, prop) => context.alerts?.[prop],
      has: (_, prop) => prop in (context.alerts || []),
      set: (_, prop, value) => {
        const nextAlerts = context.alerts || [];
        nextAlerts[prop] = value;
        context.alerts = nextAlerts;
        return true;
      }
    });
    const data = new Proxy({}, {
      get: (_, prop) => context.data?.[prop],
      set: (_, prop, value) => {
        const nextData = context.data || {};
        nextData[prop] = value;
        context.data = nextData;
        return true;
      },
      ownKeys: () => Reflect.ownKeys(context.data || {}),
      getOwnPropertyDescriptor: (_, prop) => Object.getOwnPropertyDescriptor(context.data || {}, prop) || { enumerable: true, configurable: true }
    });
    const raceResults = new Proxy([], {
      get: (_, prop) => context.raceResults?.[prop],
      has: (_, prop) => prop in (context.raceResults || []),
      set: (_, prop, value) => {
        const nextResults = context.raceResults || [];
        nextResults[prop] = value;
        context.raceResults = nextResults;
        return true;
      }
    });
    const state = new Proxy({}, {
      get: (_, prop) => context.state?.[prop],
      set: (_, prop, value) => {
        const nextState = context.state || {};
        nextState[prop] = value;
        context.state = nextState;
        return true;
      }
    });
    const roleLockSync = livePalmesRoleLockSync.init({
      LOCK_DURATION_MS,
      LOCK_RECOVERY_MS,
      ROLE_LABELS,
      context,
      currentClientId,
      formatAlertTime,
      livePalmesRoleAccess,
      pinLockEnabled,
      protectedRole,
      roleConnectionLimit,
      roleLockDocument,
      window
    });

      async function updateConsolePresence(force = false) {
        const doc = presenceDocument();
        if (!doc) return;
        if (context.profileHomeActive) {
          if (context.consolePresenceActive) await releaseConsolePresence();
          return;
        }
        const timestamp = Date.now();
        if (!force && timestamp - context.lastPresenceWriteAt < PRESENCE_WRITE_THROTTLE_MS) return;
        const now = new Date();
        try {
          await doc.set({
            id: doc.id,
            clientId: currentClientId(),
            role: state.role || "live",
            page: "console",
            updatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + PRESENCE_DURATION_MS).toISOString()
          });
          context.lastPresenceWriteAt = timestamp;
          context.consolePresenceActive = true;
        } catch (error) {
          console.warn("Présence console impossible", error);
        }
      }
      
      async function releaseConsolePresence() {
        const doc = presenceDocument();
        if (!doc || !context.consolePresenceActive) return;
        try {
          await doc.delete();
          context.consolePresenceActive = false;
        } catch (error) {
          console.warn("Suppression présence console impossible", error);
        }
      }
      
      async function refreshPresenceCounts() {
        const collection = presenceCollection();
        if (!collection) return;
        try {
          const snapshot = await collection.get({ source: "server" });
          const counts = emptyPresenceCounts();
          const now = Date.now();
          snapshot.docs.forEach((doc) => {
            const item = doc.data() || {};
            if ((Date.parse(item.expiresAt || "") || 0) <= now) return;
            if (item.page === "console" && item.role && Object.prototype.hasOwnProperty.call(counts, item.role)) {
              counts[item.role] += 1;
            }
          });
          context.presenceCounts = counts;
          renderPresenceCounts();
        } catch (error) {
          console.warn("Lecture présence impossible", error);
        }
      }
      
      function sanitizeAlertForFirestore(alert) {
        return livePalmesFirebase.sanitizeForFirestore(alert);
      }
      
      async function syncAlertToFirestore(alert) {
        const collection = alertsCollection();
        if (!collection || !alert?.id) return;
        try {
          await collection.doc(alert.id).set(sanitizeAlertForFirestore(alert));
        } catch (error) {
          console.warn("Synchronisation Firebase impossible", error);
          renderDataStatus("Firebase n'a pas pu enregistrer cette action. L'outil continue en local sur cet appareil.");
        }
      }
      
      async function syncAlertToFirestoreStrict(alert) {
        const collection = alertsCollection();
        if (!collection || !alert?.id) throw new Error("Firebase n'est pas disponible.");
        await collection.doc(alert.id).set(sanitizeAlertForFirestore(alert));
      }
      
      async function syncAlertChangesToFirestore(alertId, changes) {
        const collection = alertsCollection();
        if (!collection || !alertId) return;
        try {
          await collection.doc(alertId).set(sanitizeAlertForFirestore(changes), { merge: true });
        } catch (error) {
          console.warn("Synchronisation Firebase impossible", error);
          renderDataStatus("Firebase n'a pas pu enregistrer cette action. L'outil continue en local sur cet appareil.");
        }
      }
      
      async function syncAlertChangesToFirestoreStrict(alertId, changes) {
        const collection = alertsCollection();
        if (!collection || !alertId) throw new Error("Firebase n'est pas disponible.");
        await collection.doc(alertId).set(sanitizeAlertForFirestore(changes), { merge: true });
      }
      
      function markAlertAlreadyClosedError(error) {
        if (error && typeof error === "object") error.alertAlreadyClosed = true;
        return error;
      }
      
      let toastTimer = null;
      
      function showToast(message, tone = "error") {
        let toast = document.querySelector(".app-toast");
        if (!toast) {
          toast = document.createElement("div");
          toast.className = "app-toast";
          toast.setAttribute("role", "status");
          document.body.appendChild(toast);
        }
        toast.className = `app-toast ${tone}`;
        toast.textContent = message;
        toast.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
          toast.hidden = true;
        }, 4500);
      }
      
      function isFinalResultAlert(alert) {
        return livePalmesAlerts.isFinalResultAlert(alert);
      }
      
      async function deleteFinalResultAlerts(resultId) {
        if (!resultId) return 0;
        const linkedAlerts = alerts.filter((alert) => isFinalResultAlert(alert) && alert.resultId === resultId);
        if (!linkedAlerts.length) return 0;
        context.alerts = alerts.filter((alert) => !(isFinalResultAlert(alert) && alert.resultId === resultId));
        saveAlerts();
        const collection = alertsCollection();
        if (collection && context.firestoreDb) {
          const batch = context.firestoreDb.batch();
          linkedAlerts.forEach((alert) => batch.delete(collection.doc(alert.id)));
          await batch.commit();
        }
        render();
        return linkedAlerts.length;
      }
      
      async function cleanupOrphanFinalResultAlerts() {
        if (!context.resultsSnapshotReady) return;
        const resultIds = new Set(raceResults.map((result) => result.id).filter(Boolean));
        const orphanResultIds = [...new Set(alerts
          .filter((alert) => isFinalResultAlert(alert) && alert.resultId && !resultIds.has(alert.resultId))
          .map((alert) => alert.resultId))];
        for (const resultId of orphanResultIds) {
          await deleteFinalResultAlerts(resultId);
        }
      }
      
      async function cleanupResolvedSpeakerResultAlerts() {
        if (!context.resultsSnapshotReady) return;
        const now = new Date().toISOString();
        const resolved = alerts.filter((alert) =>
          alert.speakerStatus === "pending" &&
          !alert.cancelledAt &&
          speakerAlertAlreadyResolvedByResult(alert)
        );
        if (!resolved.length) return;
        for (const alert of resolved) {
          alert.speakerStatus = "none";
          alert.cancelledAt = alert.cancelledAt || now;
          alert.updatedAt = now;
          await syncAlertChangesToFirestore(alert.id, {
            speakerStatus: "none",
            cancelledAt: alert.cancelledAt,
            updatedAt: now
          });
        }
        saveAlerts();
      }
      
      async function clearFirestoreAlerts() {
        const collection = alertsCollection();
        if (!collection) return;
        const snapshot = await collection.get();
        const batch = context.firestoreDb.batch();
        snapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      
      async function deleteCollectionDocuments(collectionRef, { nestedItems = false } = {}) {
        if (typeof livePalmesAdminMaintenance.deleteCollectionDocuments === "function") {
          return livePalmesAdminMaintenance.deleteCollectionDocuments(collectionRef, { firestoreDb: context.firestoreDb, nestedItems });
        }
        if (!collectionRef || !context.firestoreDb) return 0;
        const snapshot = await collectionRef.get();
        let deleted = 0;
        for (const doc of snapshot.docs) {
          if (nestedItems) {
            const items = await doc.ref.collection("items").get();
            if (!items.empty) {
              const itemBatch = context.firestoreDb.batch();
              items.docs.forEach((item) => itemBatch.delete(item.ref));
              await itemBatch.commit();
            }
          }
          const batch = context.firestoreDb.batch();
          batch.delete(doc.ref);
          await batch.commit();
          deleted += 1;
        }
        return deleted;
      }
      
      async function publishLiveDataToFirestore(nextData, source = "Import PDF séries") {
        return publishLiveDataToCompetition(nextData, source, activeCompetitionId);
      }
      
      async function publishLiveDataToCompetition(nextData, source = "Import PDF séries", competitionId = activeCompetitionId) {
        const doc = liveDataDocument(competitionId);
        if (!doc) {
          context.firebaseStatus = "local";
          return;
        }
        const payload = normalizeData(nextData);
        const hasCompetitionRows = Boolean(
          payload.program?.length ||
          payload.series?.length ||
          payload.entrants?.length
        );
        const isEmptyRescueData = payload.notes?.sourceMode === "empty-rescue" ||
          /comp[Ãé]tition\s+[Ãà]?\s*charger/i.test(String(payload.meet?.name || ""));
        if (!hasCompetitionRows && isEmptyRescueData) {
          context.firebaseStatus = "local";
          throw new Error("Publication refusée : aucune compétition n'est chargée localement.");
        }
        const livePayload = {
          meet: payload.meet,
          events: payload.events,
          entrants: payload.entrants,
          series: payload.series,
          program: payload.program,
          qualifications: payload.qualifications,
          top2025: payload.top2025,
          records: payload.records,
          edfMembers: payload.edfMembers,
          internationalMedals: payload.internationalMedals,
          competitionStats: payload.competitionStats,
          swimmerInfos: payload.swimmerInfos,
          sourceVersion: payload.sourceVersion,
          notes: {
            ...(payload.notes || {}),
            livePublishedAt: new Date().toISOString(),
            liveSource: source
          }
        };
        await doc.set({
          data: sanitizeAlertForFirestore(livePayload),
          updatedAt: livePayload.notes.livePublishedAt,
          source
        });
        if (competitionId === activeCompetitionId) {
          await publishPublicResultsIndex({ silent: true });
        }
        context.firebaseStatus = "connected";
      }
      
      async function updateLiveNotes(label, notePatch = {}) {
        const nextData = normalizeData({
          ...data,
          notes: {
            ...(data.notes || {}),
            ...notePatch,
            importHistory: label ? appendImportHistory(data.notes || {}, label) : (data.notes?.importHistory || [])
          },
          sourceVersion: `notes-${Date.now()}`
        });
        context.data = nextData;
        saveData();
        renderDataStatus();
        try {
          await publishLiveDataToFirestore(nextData, label || "Mise à jour LivePalmes");
        } catch (error) {
          console.warn("Publication des notes impossible", error);
        }
      }
      
      const lockExpired = roleLockSync.lockExpired;
      const lockLastActivityTime = roleLockSync.lockLastActivityTime;
      const lockLooksAbandoned = roleLockSync.lockLooksAbandoned;
      
      async function releaseRoleLock(role = context.activeRoleLock?.role) {
        return roleLockSync.releaseRoleLock(role);
      }
      
      async function acquireRoleLock(role, options = {}) {
        return roleLockSync.acquireRoleLock(role, options);
      }
      
      async function heartbeatRoleLock() {
        return roleLockSync.heartbeatRoleLock();
      }
      
      function mergeRemoteLiveData(remoteData) {
        return normalizeData({
          ...data,
          meet: remoteData.meet || data.meet,
          events: Array.isArray(remoteData.events) ? remoteData.events : data.events,
          entrants: Array.isArray(remoteData.entrants) ? remoteData.entrants : data.entrants,
          series: Array.isArray(remoteData.series) ? remoteData.series : data.series,
          program: Array.isArray(remoteData.program) ? remoteData.program : data.program,
          qualifications: Array.isArray(remoteData.qualifications) ? remoteData.qualifications : data.qualifications,
          top2025: Array.isArray(remoteData.top2025) ? remoteData.top2025 : data.top2025,
          records: Array.isArray(remoteData.records) ? remoteData.records : data.records,
          edfMembers: Array.isArray(remoteData.edfMembers) ? remoteData.edfMembers : data.edfMembers,
          internationalMedals: Array.isArray(remoteData.internationalMedals) ? remoteData.internationalMedals : data.internationalMedals,
          competitionStats: Array.isArray(remoteData.competitionStats) ? remoteData.competitionStats : data.competitionStats,
          swimmerInfos: Array.isArray(remoteData.swimmerInfos) ? remoteData.swimmerInfos : data.swimmerInfos,
          sourceVersion: remoteData.sourceVersion || data.sourceVersion,
          notes: {
            ...(data.notes || {}),
            ...(remoteData.notes || {}),
            sourceMode: remoteData.notes?.sourceMode || "series-live",
            sourceLabel: remoteData.notes?.sourceLabel || "Séries importées depuis LivePalmes"
          }
        });
      }
      
      function applyRemoteLiveData(remoteData) {
        if (!remoteData) return;
        const wasLocked = pinLockEnabled();
        context.applyingRemoteData = true;
        // Les mises à jour live arrivent souvent pendant la compétition : elles ne doivent
        // pas ramener le JA, la vidéo ou le live sur la première série.
        applyFreshData(mergeRemoteLiveData(remoteData), false);
        context.applyingRemoteData = false;
        const isLockedNow = pinLockEnabled();
        if (wasLocked !== isLockedNow) {
          context.unlockedRoles = [];
          saveUnlockedRoles();
        }
      }

      return {
        updateConsolePresence,
        releaseConsolePresence,
        refreshPresenceCounts,
        sanitizeAlertForFirestore,
        syncAlertToFirestore,
        syncAlertToFirestoreStrict,
        syncAlertChangesToFirestore,
        syncAlertChangesToFirestoreStrict,
        markAlertAlreadyClosedError,
        showToast,
        isFinalResultAlert,
        deleteFinalResultAlerts,
        cleanupOrphanFinalResultAlerts,
        cleanupResolvedSpeakerResultAlerts,
        clearFirestoreAlerts,
        deleteCollectionDocuments,
        publishLiveDataToFirestore,
        publishLiveDataToCompetition,
        updateLiveNotes,
        lockExpired,
        lockLastActivityTime,
        lockLooksAbandoned,
        releaseRoleLock,
        acquireRoleLock,
        heartbeatRoleLock,
        mergeRemoteLiveData,
        applyRemoteLiveData
      };
  }

  window.LivePalmesConsoleSync = { init };
}());
