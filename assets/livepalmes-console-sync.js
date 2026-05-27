(function () {
  function init(context = {}) {
    with (context) {
      async function updateConsolePresence(force = false) {
        const doc = presenceDocument();
        if (!doc) return;
        if (profileHomeActive) {
          if (consolePresenceActive) await releaseConsolePresence();
          return;
        }
        const timestamp = Date.now();
        if (!force && timestamp - lastPresenceWriteAt < PRESENCE_WRITE_THROTTLE_MS) return;
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
          lastPresenceWriteAt = timestamp;
          consolePresenceActive = true;
        } catch (error) {
          console.warn("Présence console impossible", error);
        }
      }
      
      async function releaseConsolePresence() {
        const doc = presenceDocument();
        if (!doc || !consolePresenceActive) return;
        try {
          await doc.delete();
          consolePresenceActive = false;
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
          presenceCounts = counts;
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
        alerts = alerts.filter((alert) => !(isFinalResultAlert(alert) && alert.resultId === resultId));
        saveAlerts();
        const collection = alertsCollection();
        if (collection && firestoreDb) {
          const batch = firestoreDb.batch();
          linkedAlerts.forEach((alert) => batch.delete(collection.doc(alert.id)));
          await batch.commit();
        }
        render();
        return linkedAlerts.length;
      }
      
      async function cleanupOrphanFinalResultAlerts() {
        if (!resultsSnapshotReady) return;
        const resultIds = new Set(raceResults.map((result) => result.id).filter(Boolean));
        const orphanResultIds = [...new Set(alerts
          .filter((alert) => isFinalResultAlert(alert) && alert.resultId && !resultIds.has(alert.resultId))
          .map((alert) => alert.resultId))];
        for (const resultId of orphanResultIds) {
          await deleteFinalResultAlerts(resultId);
        }
      }
      
      async function cleanupResolvedSpeakerResultAlerts() {
        if (!resultsSnapshotReady) return;
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
        const batch = firestoreDb.batch();
        snapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      
      async function deleteCollectionDocuments(collectionRef, { nestedItems = false } = {}) {
        if (typeof livePalmesAdminMaintenance.deleteCollectionDocuments === "function") {
          return livePalmesAdminMaintenance.deleteCollectionDocuments(collectionRef, { firestoreDb, nestedItems });
        }
        if (!collectionRef || !firestoreDb) return 0;
        const snapshot = await collectionRef.get();
        let deleted = 0;
        for (const doc of snapshot.docs) {
          if (nestedItems) {
            const items = await doc.ref.collection("items").get();
            if (!items.empty) {
              const itemBatch = firestoreDb.batch();
              items.docs.forEach((item) => itemBatch.delete(item.ref));
              await itemBatch.commit();
            }
          }
          const batch = firestoreDb.batch();
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
          firebaseStatus = "local";
          return;
        }
        const payload = normalizeData(nextData);
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
        firebaseStatus = "connected";
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
        data = nextData;
        saveData();
        renderDataStatus();
        try {
          await publishLiveDataToFirestore(nextData, label || "Mise à jour LivePalmes");
        } catch (error) {
          console.warn("Publication des notes impossible", error);
        }
      }
      
      function lockExpired(lock) {
        return livePalmesRoleAccess.lockExpired(lock);
      }
      
      function lockLastActivityTime(lock) {
        return livePalmesRoleAccess.lockLastActivityTime(lock);
      }
      
      function lockLooksAbandoned(lock) {
        return livePalmesRoleAccess.lockLooksAbandoned(lock, LOCK_RECOVERY_MS);
      }
      
      async function releaseRoleLock(role = activeRoleLock?.role) {
        if (!role || !activeRoleLock || activeRoleLock.role !== role) return;
        if (activeRoleLock.adminBypass) {
          activeRoleLock = null;
          return;
        }
        const doc = roleLockDocument(role);
        if (!doc) return;
        const clientId = currentClientId();
        try {
          if (roleConnectionLimit(role) > 1 && firestoreDb) {
            await firestoreDb.runTransaction(async (transaction) => {
              const snapshot = await transaction.get(doc);
              if (!snapshot.exists) return;
              const lock = snapshot.data() || {};
              const clients = { ...(lock.clients || {}) };
              delete clients[clientId];
              const activeClients = livePalmesRoleAccess.activeClients(clients);
              if (Object.keys(activeClients).length) {
                transaction.set(doc, {
                  role,
                  roleLabel: ROLE_LABELS[role] || role,
                  clients: activeClients,
                  updatedAt: new Date().toISOString()
                }, { merge: false });
              } else {
                transaction.delete(doc);
              }
            });
          } else {
            const snapshot = await doc.get();
            if (snapshot.exists && snapshot.data()?.clientId === clientId) {
              await doc.delete();
            }
          }
        } catch (error) {
          console.warn("Libération du verrou impossible", error);
        } finally {
          if (activeRoleLock?.role === role) activeRoleLock = null;
        }
      }
      
      async function acquireRoleLock(role, options = {}) {
        if (!protectedRole(role) || !pinLockEnabled()) {
          await releaseRoleLock();
          return true;
        }
        if (options.adminBypass) {
          await releaseRoleLock();
          activeRoleLock = { role, adminBypass: true };
          return true;
        }
        const doc = roleLockDocument(role);
        if (!doc || !firestoreDb) {
          activeRoleLock = { role, adminBypass: false };
          return true;
        }
        const clientId = currentClientId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
        const payload = {
          role,
          clientId,
          roleLabel: ROLE_LABELS[role] || role,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          expiresAt
        };
        try {
          let blockingLock = null;
          const allowed = await firestoreDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(doc);
            const lock = snapshot.exists ? snapshot.data() : null;
            if (roleConnectionLimit(role) > 1) {
              const clients = livePalmesRoleAccess.activeClients(lock?.clients || {});
              if (!clients[clientId] && Object.keys(clients).length >= roleConnectionLimit(role)) return false;
              clients[clientId] = {
                clientId,
                createdAt: clients[clientId]?.createdAt || now.toISOString(),
                updatedAt: now.toISOString(),
                expiresAt
              };
              transaction.set(doc, {
                role,
                roleLabel: ROLE_LABELS[role] || role,
                clients,
                updatedAt: now.toISOString(),
                expiresAt
              }, { merge: false });
              return true;
            }
            if (lock && lock.clientId !== clientId && !lockExpired(lock)) {
              blockingLock = lock;
              return false;
            }
            transaction.set(doc, payload);
            return true;
          });
          if (!allowed) {
            if (lockLooksAbandoned(blockingLock)) {
              const last = formatAlertTime(blockingLock?.updatedAt);
              const ok = window.confirm([
                `La console ${ROLE_LABELS[role] || role} semble encore réservée par un ancien appareil.`,
                last ? `Dernier signal reçu à ${last}.` : "Aucun signal récent n'a été trouvé.",
                "",
                "Forcer l'ouverture de cette console ?"
              ].join("\n"));
              if (ok) {
                await doc.set(payload, { merge: false });
                if (activeRoleLock?.role && activeRoleLock.role !== role) {
                  await releaseRoleLock(activeRoleLock.role);
                }
                activeRoleLock = { role, adminBypass: false };
                return true;
              }
            }
            window.alert(roleConnectionLimit(role) > 1
              ? `La console ${ROLE_LABELS[role] || role} est déjà utilisée sur ${roleConnectionLimit(role)} appareils.`
              : `La console ${ROLE_LABELS[role] || role} est déjà utilisée sur un autre appareil.`);
            return false;
          }
          if (activeRoleLock?.role && activeRoleLock.role !== role) {
            await releaseRoleLock(activeRoleLock.role);
          }
          activeRoleLock = { role, adminBypass: false };
          return true;
        } catch (error) {
          console.warn("Réservation de console impossible", error);
          window.alert("Impossible de vérifier si cette console est déjà utilisée. L'accès est autorisé sur cet appareil.");
          activeRoleLock = { role, adminBypass: false };
          return true;
        }
      }
      
      async function heartbeatRoleLock() {
        if (!activeRoleLock || activeRoleLock.adminBypass || !protectedRole(activeRoleLock.role) || !pinLockEnabled()) return;
        const doc = roleLockDocument(activeRoleLock.role);
        if (!doc) return;
        const clientId = currentClientId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
        try {
          if (roleConnectionLimit(activeRoleLock.role) > 1 && firestoreDb) {
            await firestoreDb.runTransaction(async (transaction) => {
              const snapshot = await transaction.get(doc);
              if (!snapshot.exists) {
                activeRoleLock = null;
                return;
              }
              const lock = snapshot.data() || {};
              const clients = livePalmesRoleAccess.activeClients(lock.clients || {});
              if (!clients[clientId]) {
                activeRoleLock = null;
                return;
              }
              clients[clientId] = {
                ...clients[clientId],
                updatedAt: now.toISOString(),
                expiresAt
              };
              transaction.set(doc, {
                role: activeRoleLock.role,
                roleLabel: ROLE_LABELS[activeRoleLock.role] || activeRoleLock.role,
                clients,
                updatedAt: now.toISOString(),
                expiresAt
              }, { merge: false });
            });
          } else {
            const snapshot = await doc.get();
            if (!snapshot.exists || snapshot.data()?.clientId !== clientId) {
              activeRoleLock = null;
              return;
            }
            await doc.set({
              updatedAt: now.toISOString(),
              expiresAt
            }, { merge: true });
          }
        } catch (error) {
          console.warn("Maintien de la réservation impossible", error);
        }
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
        applyingRemoteData = true;
        // Les mises à jour live arrivent souvent pendant la compétition : elles ne doivent
        // pas ramener le JA, la vidéo ou le live sur la première série.
        applyFreshData(mergeRemoteLiveData(remoteData), false);
        applyingRemoteData = false;
        if (wasLocked && !pinLockEnabled()) {
          unlockedRoles = [];
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
  }

  window.LivePalmesConsoleSync = { init };
}());
