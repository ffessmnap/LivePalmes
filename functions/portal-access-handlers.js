// Preserve the execution mode of the existing index.js function bodies.

// Existing callable bodies only. Firebase registrations stay in index.js.
// This factory performs no I/O and retains live access to its explicit services.
function createAccessHandlers(backendContext) {
  async function setRolePins(request) {
    backendContext.assertCapability(request, "consoles.manage");
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    if (request.data?.enabled === false) {
      throw new backendContext.HttpsError("failed-precondition", "Les codes PIN des consoles ne peuvent plus etre desactives.");
    }
    const enabled = true;
    const now = new Date().toISOString();
    const pins = request.data?.pins || {};
    const ref = backendContext.rolePinsRef(competitionId);

    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const previousRoles = snapshot.exists ? (snapshot.data()?.roles || {}) : {};
      const nextRoles = enabled ? { ...previousRoles } : {};

      if (enabled) {
        backendContext.ROLES.forEach((role) => {
          const pin = backendContext.cleanText(pins[role]);
          if (!pin) {
            const previous = previousRoles[role] || {};
            if (!previous.hash || !previous.salt) {
              throw new backendContext.HttpsError("invalid-argument", `Le code PIN ${role} doit contenir 4 chiffres.`);
            }
            nextRoles[role] = previous;
            return;
          }
          backendContext.assertPin(pin);
          const salt = backendContext.crypto.randomBytes(16).toString("hex");
          nextRoles[role] = {
            hash: backendContext.pinHash(pin, salt),
            salt,
            updatedAt: now
          };
        });
      }

      transaction.set(ref, {
        enabled,
        roles: nextRoles,
        updatedAt: now,
        updatedBy: request.auth.uid,
        version: 1
      }, { merge: false });
    });

    await backendContext.db.runTransaction(async (transaction) => {
      const attemptsRoot = backendContext.db
        .collection("competitions")
        .doc(competitionId)
        .collection("security")
        .doc("pinAttempts")
        .collection("items");
      const changedRoles = new Set(backendContext.ROLES.filter((role) => backendContext.cleanText(pins[role])));
      if (!changedRoles.size) return;
      const snapshot = await transaction.get(attemptsRoot.where("role", "in", [...changedRoles]));
      snapshot.docs.forEach((doc) => {
        transaction.delete(doc.ref);
      });
    }).catch(() => {});

    await backendContext.updatePublicPinNotes(competitionId, enabled);

    return {
      ok: true,
      enabled,
      mode: "cloud",
      updatedAt: now
    };
  }

  async function verifyPin(request) {
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    const role = backendContext.cleanText(request.data?.role);
    const pin = backendContext.cleanText(request.data?.pin);
    const clientId = backendContext.cleanText(request.data?.clientId);
    backendContext.assertRole(role);
    backendContext.assertPin(pin);
    const uid = backendContext.cleanText(request.auth?.uid);
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase console requise.");
    }
    await backendContext.assertConsolePortalAccess(request);
    const attemptsRef = backendContext.pinAttemptRef(competitionId, role, uid, clientId);
    await backendContext.assertPinAttemptAllowed(attemptsRef);

    const snapshot = await backendContext.rolePinsRef(competitionId).get();
    if (!snapshot.exists || snapshot.data()?.enabled !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Codes PIN serveur non configures.");
    }

    const entry = snapshot.data()?.roles?.[role];
    if (!entry?.hash || !entry?.salt || !backendContext.safeCompareHex(backendContext.pinHash(pin, entry.salt), entry.hash)) {
      await backendContext.recordFailedPinAttempt(attemptsRef, { clientId, role, uid });
      throw new backendContext.HttpsError("permission-denied", "Code PIN incorrect.");
    }

    await backendContext.clearPinAttempts(attemptsRef);
    const authUser = await backendContext.auth.getUser(uid);
    await backendContext.auth.setCustomUserClaims(uid, backendContext.consoleRoleClaims(
      authUser.customClaims || {},
      role,
      competitionId
    ));
    const now = new Date();
    await backendContext.consoleGrantRef(competitionId, uid).set({
      uid,
      role,
      competitionId,
      clientIdHash: backendContext.stableHash(clientId),
      updatedAt: now.toISOString(),
      expiresAt: backendContext.Timestamp.fromMillis(now.getTime() + 12 * 60 * 60 * 1000)
    }, { merge: false });

    return {
      ok: true,
      role
    };
  }



  async function rebuildAccessDirectoryIndexNextPage(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
    const pageSize = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
    const requestedCursor = backendContext.cleanText(request.data?.cursor).slice(0, 128);
    const restart = request.data?.restart === true;
    const stateRef = backendContext.accessDirectoryIndexStateRef();
    const stateSnapshot = requestedCursor ? null : await stateRef.get();
    if (!requestedCursor && !restart && stateSnapshot?.data()?.status === "ready" && Number(stateSnapshot.data()?.version) >= backendContext.ACCESS_DIRECTORY_INDEX_VERSION) {
      return { ok: true, processed: 0, cursor: "", completed: true };
    }
    const cursor = requestedCursor || (restart ? "" : backendContext.cleanText(stateSnapshot?.data()?.cursor).slice(0, 128));
    let query = backendContext.db.collection("users").orderBy(backendContext.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      batch.set(doc.ref, {
        accessDirectoryKeys: backendContext.accessDirectoryKeys(data, data.status),
        accessDirectoryIndexedAt: now
      }, { merge: true });
    });
    const nextCursor = snapshot.docs.at(-1)?.id || cursor;
    const completed = snapshot.size < pageSize;
    batch.set(stateRef, {
      status: completed ? "ready" : "building",
      version: backendContext.ACCESS_DIRECTORY_INDEX_VERSION,
      cursor: completed ? "" : nextCursor,
      indexedCount: restart ? snapshot.size : backendContext.FieldValue.increment(snapshot.size),
      updatedAt: now,
      ...(completed ? { completedAt: now } : {})
    }, { merge: true });
    await batch.commit();
    return { ok: true, processed: snapshot.size, cursor: completed ? "" : nextCursor, completed };
  }

  async function rebuildAccessDirectorySnapshotNextPage(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
    const pageSize = Math.min(100, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
    const restart = request.data?.restart === true;
    const stateRef = backendContext.accessDirectorySnapshotStateRef();
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
    if (!restart && state.status === "ready" && Number(state.version) >= backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION) {
      return { ok: true, processed: 0, cursor: "", completed: true };
    }
    if (!restart && state.status !== "building") {
      throw new backendContext.HttpsError("failed-precondition", "Commence la reconstruction avec restart: true.");
    }

    if (restart) {
      const existingSnapshots = await backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION).limit(101).get();
      if (existingSnapshots.size > 100) {
        throw new backendContext.HttpsError("failed-precondition", "Trop de fragments d'annuaire a reinitialiser.");
      }
      const clearBatch = backendContext.db.batch();
      existingSnapshots.docs.forEach((doc) => clearBatch.delete(doc.ref));
      clearBatch.set(stateRef, {
        status: "building",
        version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
        cursor: "",
        indexedCount: 0,
        updatedAt: new Date().toISOString()
      });
      await clearBatch.commit();
    }

    const cursor = restart ? "" : backendContext.cleanText(state.cursor).slice(0, 128);
    let query = backendContext.db.collection("users").orderBy(backendContext.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const now = new Date().toISOString();
    const nationalEntries = {};
    const regionalEntries = new Map();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() || {};
      const key = backendContext.accessDirectorySnapshotEntryKey(doc.id);
      const entry = backendContext.accessDirectorySnapshotEntry(doc.id, data);
      nationalEntries[key] = entry;
      const regionId = backendContext.accessDirectorySnapshotRegionId(data);
      if (!regionId) return;
      if (!regionalEntries.has(regionId)) regionalEntries.set(regionId, {});
      regionalEntries.get(regionId)[key] = entry;
    });

    const nextCursor = snapshot.docs.at(-1)?.id || cursor;
    const completed = snapshot.size < pageSize;
    const writeBatch = backendContext.db.batch();
    backendContext.mergeAccessDirectorySnapshotEntries(writeBatch, "national", "", nationalEntries, now, "building");
    regionalEntries.forEach((entries, regionId) => {
      backendContext.mergeAccessDirectorySnapshotEntries(writeBatch, "region", regionId, entries, now, "building");
    });
    writeBatch.set(stateRef, {
      status: "building",
      version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
      cursor: completed ? "" : nextCursor,
      indexedCount: restart ? snapshot.size : backendContext.FieldValue.increment(snapshot.size),
      updatedAt: now
    }, { merge: true });
    await writeBatch.commit();

    if (completed) {
      const generatedSnapshots = await backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION).limit(101).get();
      if (generatedSnapshots.size > 100) {
        throw new backendContext.HttpsError("failed-precondition", "Trop de fragments d'annuaire a finaliser.");
      }
      const finalizeBatch = backendContext.db.batch();
      generatedSnapshots.docs.forEach((doc) => finalizeBatch.set(doc.ref, {
        status: "ready",
        version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
        updatedAt: now
      }, { merge: true }));
      finalizeBatch.set(stateRef, {
        status: "ready",
        version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
        cursor: "",
        completedAt: now,
        updatedAt: now
      }, { merge: true });
      await finalizeBatch.commit();
    }

    return {
      ok: true,
      processed: snapshot.size,
      cursor: completed ? "" : nextCursor,
      completed,
      readBudget: {
        baseDocuments: 1,
        userDocumentsMax: pageSize,
        snapshotDocumentsMax: restart || completed ? 100 : 0
      }
    };
  }

  async function listAccessUsers(request) {
    const context = await backendContext.accessManagementContext(request);
    const pageSize = Math.min(50, Math.max(10, Math.trunc(Number(request.data?.pageSize) || 25)));
    const status = ["active", "inactive"].includes(backendContext.cleanText(request.data?.status))
      ? backendContext.cleanText(request.data.status)
      : "";
    const capability = backendContext.ACCESS_CAPABILITY_SET.has(backendContext.cleanText(request.data?.capability))
      ? backendContext.cleanText(request.data.capability)
      : "";
    const search = backendContext.cleanText(request.data?.search).slice(0, 80);
    const cursor = request.data?.cursor && typeof request.data.cursor === "object" ? request.data.cursor : {};

    if (search) {
      const offset = Math.max(0, Math.trunc(Number(cursor.offset) || 0));
      const searchResult = await backendContext.searchAccessUserDocuments(search, context);
      const matches = searchResult.documents
        .filter((doc) => backendContext.accessUserMatchesFilters(doc, status, capability))
        .filter((doc) => backendContext.accessUserVisibleForAccessDirectory(context, doc));
      const page = matches.slice(offset, offset + pageSize);
      return {
        ok: true,
        directoryVersion: 2,
        users: page.map(backendContext.accessUserListItem),
        nextCursor: offset + pageSize < matches.length ? { offset: offset + pageSize } : null,
        scannedCount: searchResult.scannedCount,
        truncated: searchResult.truncated
      };
    }

    const indexState = await backendContext.accessDirectoryIndexStateRef().get();
    if (indexState.data()?.status === "ready" && Number(indexState.data()?.version) >= backendContext.ACCESS_DIRECTORY_INDEX_VERSION) {
      const documentId = backendContext.FieldPath.documentId();
      let query = backendContext.db.collection("users")
        .where("accessDirectoryKeys", "array-contains", backendContext.accessDirectoryFilterKey(context, status, capability))
        .orderBy("lastName")
        .orderBy(documentId);
      if (backendContext.cleanText(cursor.uid) && typeof cursor.lastName === "string") {
        query = query.startAfter(cursor.lastName, backendContext.cleanText(cursor.uid));
      }
      const snapshot = await query.limit(pageSize + 1).get();
      const page = snapshot.docs.slice(0, pageSize);
      const lastVisible = page.at(-1);
      return {
        ok: true,
        directoryVersion: 3,
        users: page.map(backendContext.accessUserListItem),
        nextCursor: snapshot.size > pageSize && lastVisible
          ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
          : null,
        scannedCount: snapshot.size,
        truncated: false
      };
    }

    const usersRef = backendContext.db.collection("users");
    const documentId = backendContext.FieldPath.documentId();
    const matchingDocs = [];
    let queryCursor = backendContext.cleanText(cursor.uid) && typeof cursor.lastName === "string"
      ? { lastName: cursor.lastName, uid: backendContext.cleanText(cursor.uid) }
      : null;
    let exhausted = false;
    let scannedCount = 0;
    const maxScanned = 250;

    while (matchingDocs.length <= pageSize && !exhausted && scannedCount < maxScanned) {
      let query = usersRef;
      if (!context.national && context.regionId) query = query.where("regionId", "==", context.regionId);
      query = query.orderBy("lastName").orderBy(documentId);
      if (queryCursor) query = query.startAfter(queryCursor.lastName, queryCursor.uid);
      const batchSize = Math.min(status || capability ? 100 : pageSize + 1, maxScanned - scannedCount);
      const snapshot = await query.limit(batchSize).get();
      if (!snapshot.size) break;
      scannedCount += snapshot.size;
      for (const doc of snapshot.docs) {
        queryCursor = { lastName: doc.data()?.lastName || "", uid: doc.id };
        if (backendContext.accessUserMatchesFilters(doc, status, capability) && backendContext.accessUserVisibleForAccessDirectory(context, doc)) matchingDocs.push(doc);
        if (matchingDocs.length > pageSize) break;
      }
      exhausted = snapshot.size < batchSize;
    }

    const page = matchingDocs.slice(0, pageSize);
    const lastVisible = page.at(-1);
    const truncated = !exhausted && scannedCount >= maxScanned;
    const nextCursor = matchingDocs.length > pageSize && lastVisible
      ? { lastName: lastVisible.data()?.lastName || "", uid: lastVisible.id }
      : truncated && queryCursor
        ? queryCursor
        : null;
    console.info("Annuaire portail", { uid: context.uid, search: Boolean(search), scannedCount, returnedCount: page.length, truncated });
    return {
      ok: true,
      directoryVersion: 2,
      users: page.map(backendContext.accessUserListItem),
      nextCursor,
      scannedCount,
      truncated
    };
  }

  async function setAccessUserStatus(request) {
    backendContext.assertAdmin(request);
    const uid = backendContext.cleanText(request.data?.uid);
    const status = backendContext.cleanText(request.data?.status);
    if (!uid) {
      throw new backendContext.HttpsError("invalid-argument", "Utilisateur requis.");
    }
    if (!["active", "inactive"].includes(status)) {
      throw new backendContext.HttpsError("invalid-argument", "Statut invalide.");
    }
    if (uid === request.auth.uid && status === "inactive") {
      throw new backendContext.HttpsError("failed-precondition", "Tu ne peux pas desactiver ton propre acces.");
    }
    const userRef = backendContext.db.collection("users").doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Acces LivePalmes introuvable.");
    }
    const data = snapshot.data() || {};
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {});
    const accessScopes = data.accessScopes || {};
    const email = data.email || "";
    const now = new Date().toISOString();
    const authUser = await backendContext.auth.getUser(uid);
    await backendContext.auth.updateUser(uid, { disabled: status !== "active" });
    await backendContext.auth.setCustomUserClaims(uid, {
      ...(authUser.customClaims || {}),
      livepalmesAccess: status === "active",
      livepalmesConsoleAccess: status === "active" && backendContext.hasConsolePortalCapability(backendContext.capabilitiesMap(capabilities)),
      livepalmesCapabilities: status === "active" ? backendContext.capabilitiesMap(capabilities) : backendContext.capabilitiesMap([])
    });
    if (status !== "active") await backendContext.auth.revokeRefreshTokens(uid);
    await userRef.set({
      status,
      accessDirectoryKeys: backendContext.accessDirectoryKeys({ ...data, capabilities }, status),
      updatedAt: now,
      updatedBy: request.auth.uid
    }, { merge: true });
    await backendContext.writeAccessGrants(uid, email, capabilities, status, request.auth.uid, now, accessScopes);
    await backendContext.writeAuditLog(status === "active" ? "accessUser.activated" : "accessUser.deactivated", request.auth.uid, {
      uid,
      email,
      capabilities,
      accessScopes
    });
    return {
      ok: true,
      uid,
      status
    };
  }

  async function deleteAccessUser(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    return backendContext.deleteAccessUserAccount(request.data?.uid, context.uid, { mode: "direct" });
  }

  async function requestAccessUserDeletion(request) {
    const context = await backendContext.accessManagementContext(request);
    if (context.national) {
      throw new backendContext.HttpsError("failed-precondition", "Un admin national peut supprimer directement ce compte.");
    }
    const targetUid = backendContext.cleanText(request.data?.uid);
    if (!targetUid) {
      throw new backendContext.HttpsError("invalid-argument", "Utilisateur requis.");
    }
    if (targetUid === context.uid) {
      throw new backendContext.HttpsError("failed-precondition", "Tu ne peux pas demander la suppression de ton propre acces.");
    }
    const userRef = backendContext.db.collection("users").doc(targetUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Acces LivePalmes introuvable.");
    }
    const data = snapshot.data() || {};
    backendContext.assertRegionalAccessUserDeletionRequestAllowed(context, data);

    const pendingSnapshot = await backendContext.db.collection("accessUserDeletionRequests")
      .where("targetUid", "==", targetUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!pendingSnapshot.empty) {
      throw new backendContext.HttpsError("already-exists", "Une demande de suppression est deja en attente pour ce compte.");
    }

    const now = new Date().toISOString();
    const requestRef = await backendContext.db.collection("accessUserDeletionRequests").add({
      targetUid,
      targetEmail: data.email || "",
      targetFirstName: data.firstName || "",
      targetLastName: data.lastName || "",
      targetRegionId: backendContext.accessUserRegionIdFromData(data),
      targetClubId: data.clubId || "",
      targetClubName: data.clubName || "",
      targetCapabilities: backendContext.activeCapabilitiesFromMap(data.capabilities || {}),
      status: "pending",
      requestedBy: context.uid,
      requestedByEmail: context.email || "",
      requestedAt: now,
      updatedAt: now
    });
    await backendContext.writeAuditLog("accessUser.deletionRequested", context.uid, {
      requestId: requestRef.id,
      uid: targetUid,
      email: data.email || "",
      regionId: backendContext.accessUserRegionIdFromData(data)
    });
    const created = await requestRef.get();
    return {
      ok: true,
      request: backendContext.accessUserDeletionRequestItem(created)
    };
  }

  async function listAccessUserDeletionRequests(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    const snapshot = await backendContext.db.collection("accessUserDeletionRequests")
      .where("status", "==", "pending")
      .limit(100)
      .get();
    const requests = snapshot.docs
      .map(backendContext.accessUserDeletionRequestItem)
      .sort((left, right) => String(left.requestedAt || "").localeCompare(String(right.requestedAt || "")));
    return {
      ok: true,
      requests
    };
  }

  async function resolveAccessUserDeletionRequest(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    const requestId = backendContext.cleanText(request.data?.requestId);
    const decision = backendContext.cleanText(request.data?.decision);
    if (!requestId) {
      throw new backendContext.HttpsError("invalid-argument", "Demande requise.");
    }
    if (!["approved", "rejected"].includes(decision)) {
      throw new backendContext.HttpsError("invalid-argument", "Decision invalide.");
    }
    const requestRef = backendContext.db.collection("accessUserDeletionRequests").doc(requestId);
    const snapshot = await requestRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Demande introuvable.");
    }
    const data = snapshot.data() || {};
    if (data.status !== "pending") {
      throw new backendContext.HttpsError("failed-precondition", "Cette demande a deja ete traitee.");
    }
    let deletionResult = null;
    if (decision === "approved") {
      deletionResult = await backendContext.deleteAccessUserAccount(data.targetUid, context.uid, { mode: "request", requestId });
    }
    const now = new Date().toISOString();
    await requestRef.set({
      status: decision,
      decision,
      resolvedBy: context.uid,
      resolvedByEmail: context.email || "",
      resolvedAt: now,
      updatedAt: now,
      targetDeleted: decision === "approved"
    }, { merge: true });
    await backendContext.writeAuditLog("accessUser.deletionRequestResolved", context.uid, {
      requestId,
      decision,
      uid: data.targetUid || "",
      email: data.targetEmail || ""
    });
    return {
      ok: true,
      requestId,
      decision,
      deletion: deletionResult
    };
  }

  async function updateCurrentAccountEmail(request) {
    await backendContext.assertLivePalmesAccess(request);
    const uid = backendContext.cleanText(request.auth?.uid);
    const email = backendContext.normalizeEmail(request.data?.email);
    backendContext.assertEmail(email);

    const authTime = Number(request.auth?.token?.auth_time || 0) * 1000;
    if (!authTime || Date.now() - authTime > 5 * 60 * 1000) {
      throw new backendContext.HttpsError("failed-precondition", "Reconnexion recente requise.");
    }

    const authUser = await backendContext.auth.getUser(uid);
    const previousEmail = backendContext.normalizeEmail(authUser.email);
    const userRef = backendContext.db.collection("users").doc(uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {};
    const capabilities = backendContext.ADMIN_UIDS.has(uid)
      ? backendContext.ACCESS_CAPABILITIES
      : backendContext.activeCapabilitiesFromMap(userData.capabilities || request.auth?.token?.livepalmesCapabilities || {});
    const accessScopes = userData.accessScopes || {};
    const now = new Date().toISOString();

    if (email !== previousEmail) {
      try {
        await backendContext.auth.updateUser(uid, { email, emailVerified: false });
      } catch (error) {
        if (error?.code === "auth/email-already-exists") {
          throw new backendContext.HttpsError("already-exists", "Cette adresse email est deja utilisee.");
        }
        if (error?.code === "auth/invalid-email") {
          throw new backendContext.HttpsError("invalid-argument", "Email invalide.");
        }
        throw error;
      }
    }

    try {
      const batch = backendContext.db.batch();
      batch.set(userRef, {
        uid,
        email,
        status: userData.status || "active",
        updatedAt: now,
        updatedBy: uid,
        ...(!userSnapshot.exists ? { createdAt: now, createdBy: uid } : {})
      }, { merge: true });
      backendContext.ACCESS_CAPABILITIES.forEach((capability) => {
        const grantRef = backendContext.db.collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
        const scope = backendContext.normalizedAccessScope(accessScopes[capability]);
        batch.set(grantRef, {
          uid,
          email,
          capability,
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
          status: capabilities.includes(capability) ? "active" : "inactive",
          updatedAt: now,
          updatedBy: uid,
          createdAt: now
        }, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      if (email !== previousEmail && previousEmail) {
        await backendContext.auth.updateUser(uid, { email: previousEmail }).catch((rollbackError) => {
          console.error("Rollback email compte impossible", rollbackError);
        });
      }
      throw new backendContext.HttpsError("internal", "La mise a jour du profil LivePalmes a echoue.");
    }

    await backendContext.writeAuditLog("accessUser.emailUpdated", uid, {
      uid,
      previousEmail,
      email
    }).catch((error) => console.warn("Journalisation du changement d'email impossible", error));

    return {
      ok: true,
      uid,
      email,
      verificationRequired: true
    };
  }

  async function getCurrentAccessUser(request) {
    const startedAt = Date.now();
    const uid = backendContext.cleanText(request.auth?.uid);
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const authTimeSeconds = Number(request.auth?.token?.auth_time) || 0;
    const lastLoginAt = authTimeSeconds ? new Date(authTimeSeconds * 1000).toISOString() : (data.lastLoginAt || "");
    if (snapshot.exists && lastLoginAt && lastLoginAt !== data.lastLoginAt) {
      await snapshot.ref.set({ lastLoginAt }, { merge: true }).catch((error) => {
        console.warn("Mise a jour de la derniere connexion impossible", error);
      });
    }
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE) {
      return {
        ok: true,
        uid,
        email: data.email || request.auth?.token?.email || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        clubId: data.clubId || "",
        clubName: data.clubName || "",
        regionId: data.regionId || "",
        licenseNumber: data.licenseNumber || "",
        status: "active",
        capabilities: backendContext.ACCESS_CAPABILITIES,
        accessScopes: data.accessScopes || {},
        competitionNotificationsEnabled: backendContext.competitionEmailNotificationsEnabled(data),
        lastLoginAt,
        readStats: backendContext.portalReadStats("getCurrentAccessUser", startedAt, { baseDocuments: 1, cacheHit: false })
      };
    }
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("permission-denied", "Aucun acces LivePalmes actif.");
    }
    if (data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {});
    if (!capabilities.length) {
      throw new backendContext.HttpsError("permission-denied", "Aucun droit LivePalmes actif.");
    }
    return {
      ok: true,
      uid,
      email: data.email || request.auth?.token?.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubId: data.clubId || "",
      clubName: data.clubName || "",
      regionId: data.regionId || "",
      licenseNumber: data.licenseNumber || "",
      status: "active",
      capabilities,
      accessScopes: data.accessScopes || {},
      competitionNotificationsEnabled: backendContext.competitionEmailNotificationsEnabled(data),
      lastLoginAt,
      readStats: backendContext.portalReadStats("getCurrentAccessUser", startedAt, { baseDocuments: 1, cacheHit: false })
    };
  }

  return { setRolePins, verifyPin, rebuildAccessDirectoryIndexNextPage, rebuildAccessDirectorySnapshotNextPage, listAccessUsers, setAccessUserStatus, deleteAccessUser, requestAccessUserDeletion, listAccessUserDeletionRequests, resolveAccessUserDeletionRequest, updateCurrentAccountEmail, getCurrentAccessUser };
}

module.exports = { createAccessHandlers };
