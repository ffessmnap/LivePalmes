(function () {
  function init(options = {}) {
    const {
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
      window = globalThis.window
    } = options;

    function lockExpired(lock) {
      return livePalmesRoleAccess.lockExpired(lock);
    }

    function lockLastActivityTime(lock) {
      return livePalmesRoleAccess.lockLastActivityTime(lock);
    }

    function lockLooksAbandoned(lock) {
      return livePalmesRoleAccess.lockLooksAbandoned(lock, LOCK_RECOVERY_MS);
    }

    async function releaseRoleLock(role = context.activeRoleLock?.role) {
      if (!role || !context.activeRoleLock || context.activeRoleLock.role !== role) return;
      if (context.activeRoleLock.adminBypass) {
        context.activeRoleLock = null;
        return;
      }
      const doc = roleLockDocument(role);
      if (!doc) return;
      const clientId = currentClientId();
      try {
        if (roleConnectionLimit(role) > 1 && context.firestoreDb) {
          await context.firestoreDb.runTransaction(async (transaction) => {
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
        console.warn("Liberation du verrou impossible", error);
      } finally {
        if (context.activeRoleLock?.role === role) context.activeRoleLock = null;
      }
    }

    async function acquireRoleLock(role, options = {}) {
      if (!protectedRole(role) || !pinLockEnabled()) {
        await releaseRoleLock();
        return true;
      }
      if (options.adminBypass) {
        await releaseRoleLock();
        context.activeRoleLock = { role, adminBypass: true };
        return true;
      }
      const doc = roleLockDocument(role);
      if (!doc || !context.firestoreDb) {
        context.activeRoleLock = { role, adminBypass: false };
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
        const allowed = await context.firestoreDb.runTransaction(async (transaction) => {
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
              `La console ${ROLE_LABELS[role] || role} semble encore reservee par un ancien appareil.`,
              last ? `Dernier signal recu a ${last}.` : "Aucun signal recent n'a ete trouve.",
              "",
              "Forcer l'ouverture de cette console ?"
            ].join("\n"));
            if (ok) {
              await doc.set(payload, { merge: false });
              if (context.activeRoleLock?.role && context.activeRoleLock.role !== role) {
                await releaseRoleLock(context.activeRoleLock.role);
              }
              context.activeRoleLock = { role, adminBypass: false };
              return true;
            }
          }
          window.alert(roleConnectionLimit(role) > 1
            ? `La console ${ROLE_LABELS[role] || role} est deja utilisee sur ${roleConnectionLimit(role)} appareils.`
            : `La console ${ROLE_LABELS[role] || role} est deja utilisee sur un autre appareil.`);
          return false;
        }
        if (context.activeRoleLock?.role && context.activeRoleLock.role !== role) {
          await releaseRoleLock(context.activeRoleLock.role);
        }
        context.activeRoleLock = { role, adminBypass: false };
        return true;
      } catch (error) {
        console.warn("Reservation de console impossible", error);
        window.alert("Impossible de verifier si cette console est deja utilisee. L'acces est autorise sur cet appareil.");
        context.activeRoleLock = { role, adminBypass: false };
        return true;
      }
    }

    async function heartbeatRoleLock() {
      if (!context.activeRoleLock || context.activeRoleLock.adminBypass || !protectedRole(context.activeRoleLock.role) || !pinLockEnabled()) return;
      const doc = roleLockDocument(context.activeRoleLock.role);
      if (!doc) return;
      const clientId = currentClientId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS).toISOString();
      try {
        if (roleConnectionLimit(context.activeRoleLock.role) > 1 && context.firestoreDb) {
          await context.firestoreDb.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(doc);
            if (!snapshot.exists) {
              context.activeRoleLock = null;
              return;
            }
            const lock = snapshot.data() || {};
            const clients = livePalmesRoleAccess.activeClients(lock.clients || {});
            if (!clients[clientId]) {
              context.activeRoleLock = null;
              return;
            }
            clients[clientId] = {
              ...clients[clientId],
              updatedAt: now.toISOString(),
              expiresAt
            };
            transaction.set(doc, {
              role: context.activeRoleLock.role,
              roleLabel: ROLE_LABELS[context.activeRoleLock.role] || context.activeRoleLock.role,
              clients,
              updatedAt: now.toISOString(),
              expiresAt
            }, { merge: false });
          });
        } else {
          const snapshot = await doc.get();
          if (!snapshot.exists || snapshot.data()?.clientId !== clientId) {
            context.activeRoleLock = null;
            return;
          }
          await doc.set({
            updatedAt: now.toISOString(),
            expiresAt
          }, { merge: true });
        }
      } catch (error) {
        console.warn("Maintien de la reservation impossible", error);
      }
    }

    return {
      acquireRoleLock,
      heartbeatRoleLock,
      lockExpired,
      lockLastActivityTime,
      lockLooksAbandoned,
      releaseRoleLock
    };
  }

  window.LivePalmesRoleLockSync = { init };
}());
