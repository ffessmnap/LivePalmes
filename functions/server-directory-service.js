// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createDirectoryService(backendContext) {
  function cleanEngagementAccessRequestPayload(raw = {}, request = {}) {
    const authEmail = backendContext.normalizeEmail(request.auth?.token?.email || "");
    const email = backendContext.normalizeEmail(raw.email || authEmail);
    backendContext.assertEmail(email);
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).toLocaleUpperCase("fr-FR").slice(0, 80);
    const clubRole = backendContext.cleanText(raw.clubRole).slice(0, 120);
    const clubId = backendContext.cleanText(raw.clubId).slice(0, 40);
    const clubName = backendContext.cleanText(raw.clubName).slice(0, 140);
    const regionId = backendContext.cleanText(raw.regionId).slice(0, 80);
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).slice(0, 60);
    const message = backendContext.cleanText(raw.message).slice(0, 600);
    const newClubRequested = raw.newClubRequested === true;
    let newClub = null;
    if (newClubRequested) {
      try {
        newClub = backendContext.cleanClubPayload({ ...(raw.newClub || {}), regionId, active: true }, {});
      } catch (error) {
        throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error));
      }
      if (!newClub.city || !newClub.postalCode) {
        throw new backendContext.HttpsError("invalid-argument", "Ville et code postal du nouveau club obligatoires.");
      }
    }
    if (!firstName || !lastName || !regionId || !licenseNumber || (!clubId && !newClubRequested)) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, prenom, club, region et licence sont obligatoires.");
    }
    return {
      email,
      firstName,
      lastName,
      clubRole,
      clubId: newClubRequested ? "" : clubId,
      clubName: newClubRequested ? "" : clubName,
      regionId,
      licenseNumber,
      message,
      newClubRequested,
      ...(newClub ? { newClub } : {})
    };
  }

  function engagementAccessRequestItem(doc) {
    const data = doc.data() || {};
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      email: backendContext.cleanText(data.email).slice(0, 180),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      clubRole: backendContext.cleanText(data.clubRole).slice(0, 120),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      newClubRequested: data.newClubRequested === true,
      newClub: data.newClubRequested === true ? {
        clubCode: backendContext.cleanText(data.newClub?.clubCode).slice(0, 40),
        clubName: backendContext.cleanText(data.newClub?.clubName).slice(0, 140),
        regionId: backendContext.cleanText(data.newClub?.regionId || data.regionId).slice(0, 80),
        federalNumber: backendContext.cleanText(data.newClub?.federalNumber).slice(0, 24),
        city: backendContext.cleanText(data.newClub?.city).slice(0, 100),
        postalCode: backendContext.cleanText(data.newClub?.postalCode).slice(0, 16)
      } : null,
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      message: backendContext.cleanText(data.message).slice(0, 600),
      status: backendContext.cleanText(data.status || "pending").slice(0, 40),
      requestedBy: backendContext.cleanText(data.requestedBy).slice(0, 80),
      requestedByEmail: backendContext.cleanText(data.requestedByEmail).slice(0, 180),
      requestedAt: backendContext.cleanText(data.requestedAt).slice(0, 40),
      resolvedAt: backendContext.cleanText(data.resolvedAt).slice(0, 40),
      resolvedBy: backendContext.cleanText(data.resolvedBy).slice(0, 80),
      resolvedByEmail: backendContext.cleanText(data.resolvedByEmail).slice(0, 180),
      resolutionReason: backendContext.cleanText(data.resolutionReason).slice(0, 600),
      resolutionNotification: data.resolutionNotification && typeof data.resolutionNotification === "object"
        ? data.resolutionNotification
        : null
    });
  }

  function assertEngagementAccessRequestScope(context = {}, requestData = {}) {
    if (context.national) return;
    if (!context.region) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements region ou national requis.");
    }
    if (!context.regionId || backendContext.cleanText(requestData.regionId) !== context.regionId) {
      throw new backendContext.HttpsError("permission-denied", "Demande hors perimetre regional.");
    }
  }

  function engagementAccessExistingClubPayload(club = {}) {
    return {
      clubId: backendContext.cleanText(club.clubId || club.id).slice(0, 40),
      clubName: backendContext.cleanText(club.clubName).slice(0, 140),
      regionId: backendContext.engagementClubRegionId(club, club.regionId),
      newClubRequested: false
    };
  }

  async function findEngagementClubByFederalNumber(federalNumber = "") {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("./nap-club-access-request").findByFederalNumber(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), federalNumber);
    const cleanNumber = backendContext.cleanText(federalNumber).toUpperCase().slice(0, 24);
    if (!cleanNumber) return null;
    const referenceClub = backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER.get(cleanNumber);
    if (referenceClub) {
      const overrideSnapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(referenceClub.clubId).get();
      if (!overrideSnapshot.exists) return referenceClub;
      const override = backendContext.engagementStoredClubItem(overrideSnapshot);
      if (override.deleted === true || override.federalNumber.toUpperCase() !== cleanNumber) return null;
      return { ...referenceClub, ...override };
    }
    const snapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION)
      .where("federalNumber", "==", cleanNumber)
      .limit(2)
      .get();
    const storedClub = snapshot.docs.map(backendContext.engagementStoredClubItem).find((club) => club.deleted !== true);
    return storedClub || null;
  }

  async function resolveExistingClubForAccessRequest(payload = {}) {
    if (payload.newClubRequested !== true || !payload.newClub?.federalNumber) return payload;
    const existingClub = await findEngagementClubByFederalNumber(payload.newClub.federalNumber);
    return existingClub
      ? { ...payload, ...engagementAccessExistingClubPayload(existingClub), newClub: null }
      : payload;
  }

  async function createClubFromEngagementAccessRequest(payload = {}, actorUid = "", requestId = "") {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("./nap-club-access-request").createFromRequest(
      require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {payload, actorUid, requestId}, {
        read: async operation => { const doc = await backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).get(); return doc.exists ? doc.data().target : null; },
        prepare: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).create({action:"nap.clubCreate.prepare",actorUid,target,createdAt:new Date().toISOString()}),
        checkpoint: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).update({target}),
        complete: async (operation, target) => { await backendContext.writeAuditLogOnce("nap.clubCreate.complete",actorUid,{...target,auditPreparationId:`nap-club-create-${operation}-before`},`nap-club-create-${operation}-complete`); await require("./nap-club-provenance").record(backendContext.db,operation,target,actorUid); }
      });
    const existingClub = await findEngagementClubByFederalNumber(payload.newClub?.federalNumber);
    if (existingClub) return { club: existingClub, created: false };
    let cleaned;
    try {
      cleaned = backendContext.cleanClubPayload({ ...(payload.newClub || {}), regionId: payload.regionId, active: true }, {});
    } catch (error) {
      throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error));
    }
    if (!cleaned.city || !cleaned.postalCode) {
      throw new backendContext.HttpsError("invalid-argument", "Ville et code postal du nouveau club obligatoires.");
    }
    const clubId = `club-${backendContext.stableHash(cleaned.federalNumber).slice(0, 16)}`;
    const now = new Date().toISOString();
    const club = {
      ...cleaned,
      clubId,
      createdAt: now,
      createdBy: actorUid,
      updatedAt: now,
      updatedBy: actorUid
    };
    const batch = backendContext.db.batch();
    batch.create(backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId), club);
    batch.set(backendContext.publicEngagementClubDirectoryRef(), {
      clubs: { [clubId]: backendContext.publicEngagementClubItem(club) },
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClub.createdFromAccessRequest", actorUid, {
      clubId,
      federalNumber: cleaned.federalNumber,
      clubCode: cleaned.clubCode,
      clubName: cleaned.clubName
    });
    return { club, created: true };
  }

  async function sendEngagementAccessAcknowledgement(payload = {}) {
    const config = backendContext.engagementMailSmtpConfig();
    const attemptedAt = new Date().toISOString();
    if (!config.ready) {
      return {
        status: "skipped_missing_config",
        attemptedAt,
        reason: "Configuration SMTP incomplete."
      };
    }
    const mail = backendContext.engagementAccessAcknowledgement(payload);
    try {
      const transporter = backendContext.nodemailer.createTransport(config.transport);
      await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: payload.email,
        subject: backendContext.cleanText(mail.subject).slice(0, 220),
        text: mail.text,
        html: backendContext.livePalmesMailHtml(mail.text)
      });
      return {
        status: "sent",
        attemptedAt,
        sentAt: new Date().toISOString(),
        reason: ""
      };
    } catch (error) {
      console.error(
        "Accuse de reception de demande d'acces impossible.",
        backendContext.cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
      );
      return {
        status: "failed",
        attemptedAt,
        reason: "Envoi SMTP impossible."
      };
    }
  }

  async function sendEngagementAccessRejection(payload = {}) {
    const config = backendContext.engagementMailSmtpConfig();
    const attemptedAt = new Date().toISOString();
    if (!config.ready) {
      return { status: "skipped_missing_config", attemptedAt, reason: "Configuration SMTP incomplete." };
    }
    const mail = backendContext.engagementAccessRejection(payload);
    try {
      const transporter = backendContext.nodemailer.createTransport(config.transport);
      await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: payload.email,
        subject: backendContext.cleanText(mail.subject).slice(0, 220),
        text: mail.text,
        html: backendContext.livePalmesMailHtml(mail.text)
      });
      return { status: "sent", attemptedAt, sentAt: new Date().toISOString(), reason: "" };
    } catch (error) {
      console.error(
        "Notification de refus de demande d'acces impossible.",
        backendContext.cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
      );
      return { status: "failed", attemptedAt, reason: "Envoi SMTP impossible." };
    }
  }

  async function sendEngagementExistingAccountNotice(payload = {}) {
    const config = backendContext.engagementMailSmtpConfig();
    const attemptedAt = new Date().toISOString();
    if (!config.ready) {
      return { status: "skipped_missing_config", attemptedAt, reason: "Configuration SMTP incomplete." };
    }
    const mail = backendContext.engagementExistingAccountNotice(payload);
    try {
      const transporter = backendContext.nodemailer.createTransport(config.transport);
      await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: payload.email,
        subject: backendContext.cleanText(mail.subject).slice(0, 220),
        text: mail.text,
        html: backendContext.livePalmesMailHtml(mail.text)
      });
      return { status: "sent", attemptedAt, sentAt: new Date().toISOString(), reason: "" };
    } catch (error) {
      console.error(
        "Notification de compte existant impossible.",
        backendContext.cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
      );
      return { status: "failed", attemptedAt, reason: "Envoi SMTP impossible." };
    }
  }

  async function engagementExistingAccessAccount(email = "") {
    let authUser;
    try {
      authUser = await backendContext.auth.getUserByEmail(backendContext.normalizeEmail(email));
    } catch (error) {
      if (error?.code === "auth/user-not-found") return null;
      throw error;
    }
    const snapshot = await backendContext.db.collection("users").doc(authUser.uid).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    if (!["active", "inactive"].includes(backendContext.cleanText(data.status))) return null;
    return {
      uid: authUser.uid,
      email: backendContext.normalizeEmail(authUser.email || email),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      status: backendContext.cleanText(data.status),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140)
    };
  }

  async function consumePublicAccessRequestRateLimit(request = {}, now = "") {
    if (backendContext.cleanText(request.auth?.uid)) return;
    const headers = request.rawRequest?.headers || {};
    const forwardedIp = backendContext.cleanText(headers["x-forwarded-for"]).split(",")[0].trim();
    const clientIp = forwardedIp || backendContext.cleanText(request.rawRequest?.ip || request.rawRequest?.socket?.remoteAddress);
    const userAgent = backendContext.cleanText(headers["user-agent"]).slice(0, 240);
    const rateId = backendContext.stableHash(`${clientIp || "unknown"}|${userAgent || "unknown"}`).slice(0, 40);
    const rateRef = backendContext.db.collection(backendContext.PORTAL_ACCESS_RATE_LIMIT_COLLECTION).doc(rateId);
    await backendContext.db.runTransaction(async (transaction) => {
      const rateSnapshot = await transaction.get(rateRef);
      const rate = backendContext.nextPortalAccessRateLimit(rateSnapshot.data() || {}, Date.parse(now));
      if (!rate.allowed) {
        throw new backendContext.HttpsError("resource-exhausted", "Trop de demandes. Reessayez plus tard.", {
          retryAfterSeconds: Math.ceil(rate.retryAfterMs / 1000)
        });
      }
      transaction.set(rateRef, rate.next, { merge: false });
    });
  }

  async function sendEngagementAccessAdminNotifications(payload = {}) {
    const attemptedAt = new Date().toISOString();
    const config = backendContext.engagementMailSmtpConfig();
    if (!config.ready) {
      return {
        status: "skipped_missing_config",
        attemptedAt,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        reason: "Configuration SMTP incomplete."
      };
    }
    const capabilities = [
      "engagements.region.manage",
      ...(payload.newClubRequested === true ? ["engagements.national.manage"] : [])
    ];
    let recipients;
    try {
      recipients = backendContext.engagementAccessAdminNotificationRecipients(
        await backendContext.engagementActiveMailRecipients(backendContext.db, capabilities),
        payload
      );
    } catch (error) {
      console.error(
        "Lecture des destinataires de demande d'acces impossible.",
        backendContext.cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
      );
      return { status: "failed", attemptedAt, recipientCount: 0, sentCount: 0, failedCount: 0, reason: "Destinataires indisponibles." };
    }
    if (!recipients.length) {
      return { status: "skipped_no_recipient", attemptedAt, recipientCount: 0, sentCount: 0, failedCount: 0, reason: "Aucun administrateur destinataire." };
    }
    const transporter = backendContext.nodemailer.createTransport(config.transport);
    const notificationPayload = {
      ...payload,
      clubCode: backendContext.engagementClubCode(payload.clubId, payload.clubCode).slice(0, 40),
      clubName: backendContext.engagementClubName(payload.clubId, payload.clubName).slice(0, 140),
      regionName: backendContext.CLUB_REFERENCE_REGION_LABELS[backendContext.cleanText(payload.regionId)] || backendContext.cleanText(payload.regionId).slice(0, 80)
    };
    let sentCount = 0;
    let failedCount = 0;
    for (let index = 0; index < recipients.length; index += 5) {
      const batch = recipients.slice(index, index + 5);
      const results = await Promise.allSettled(batch.map((recipient) => {
        const mail = backendContext.engagementAccessAdminNotification({
          ...notificationPayload,
          recipientFirstName: recipient.firstName
        });
        return transporter.sendMail({
          from: `LivePalmes <${config.fromEmail}>`,
          to: recipient.email,
          subject: backendContext.cleanText(mail.subject).slice(0, 220),
          text: mail.text,
          html: backendContext.livePalmesMailHtml(mail.text)
        });
      }));
      results.forEach((result) => {
        if (result.status === "fulfilled") sentCount += 1;
        else failedCount += 1;
      });
    }
    if (failedCount) {
      console.error("Certaines notifications administratives de demande d'acces ont echoue.", {
        recipientCount: recipients.length,
        sentCount,
        failedCount
      });
    }
    return {
      status: failedCount ? sentCount ? "partial" : "failed" : "sent",
      attemptedAt,
      ...(sentCount ? { sentAt: new Date().toISOString() } : {}),
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      reason: failedCount ? "Envoi SMTP partiellement ou totalement impossible." : ""
    };
  }

  function accessUserListItemFromData(uid, data = {}) {
    return {
      uid,
      email: data.email || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      clubId: data.clubId || "",
      clubName: data.clubName || "",
      regionId: data.regionId || "",
      licenseNumber: data.licenseNumber || "",
      status: data.status || "active",
      capabilities: backendContext.activeCapabilitiesFromMap(data.capabilities || {}),
      accessScopes: data.accessScopes || {},
      updatedAt: data.updatedAt || "",
      lastLoginAt: data.lastLoginAt || ""
    };
  }

  function accessUserListItem(doc) {
    return accessUserListItemFromData(doc.id, doc.data() || {});
  }

  function accessDirectorySnapshotEntry(uid, data = {}) {
    return accessUserListItemFromData(uid, data);
  }

  function accessDirectorySnapshotRegionId(data = {}) {
    const capabilities = data.capabilities || {};
    if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return "";
    return backendContext.accessUserRegionIdFromData(data);
  }

  function sameAccessDirectorySnapshotEntry(left, right) {
    return JSON.stringify(left || null) === JSON.stringify(right || null);
  }

  function mergeAccessDirectorySnapshotEntries(batch, scopeType, scopeId, entries, now, status = "") {
    batch.set(backendContext.accessDirectorySnapshotRef(scopeType, scopeId), {
      scopeType,
      scopeId: scopeType === "region" ? scopeId : "",
      version: backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION,
      updatedAt: now,
      ...(status ? { status } : {}),
      entries
    }, { merge: true });
  }



  function accessUserDeletionRequestItem(doc) {
    const data = doc.data() || {};
    return {
      id: doc.id,
      targetUid: data.targetUid || "",
      targetEmail: data.targetEmail || "",
      targetFirstName: data.targetFirstName || "",
      targetLastName: data.targetLastName || "",
      targetRegionId: data.targetRegionId || "",
      targetClubId: data.targetClubId || "",
      targetClubName: data.targetClubName || "",
      targetCapabilities: Array.isArray(data.targetCapabilities) ? data.targetCapabilities : [],
      status: data.status || "pending",
      requestedBy: data.requestedBy || "",
      requestedByEmail: data.requestedByEmail || "",
      requestedAt: data.requestedAt || "",
      resolvedBy: data.resolvedBy || "",
      resolvedAt: data.resolvedAt || "",
      decision: data.decision || ""
    };
  }

  function accessUserMatchesFilters(doc, status, capability) {
    const data = doc.data() || {};
    if (status && (data.status || "active") !== status) return false;
    if (capability && data.capabilities?.[capability] !== true) return false;
    return true;
  }

  function normalizedDirectoryText(value) {
    return backendContext.cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");
  }

  function accessUserContainsSearch(doc, search) {
    const data = doc.data() || {};
    const haystack = [data.firstName, data.lastName, data.email, data.clubId, data.clubName, data.regionId, data.licenseNumber]
      .map(normalizedDirectoryText)
      .join(" ");
    return normalizedDirectoryText(search).split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
  }

  async function searchAccessUserDocuments(search, context, maxScanned = 90) {
    const usersRef = backendContext.db.collection("users");
    const raw = backendContext.cleanText(search).slice(0, 80);
    const variantsFor = (value) => {
      const titleCase = value.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
      return [...new Set([value, titleCase].filter(Boolean))];
    };
    let querySpecs = [];
    if (raw.includes("@")) {
      querySpecs = [{ field: "email", variants: [raw.toLocaleLowerCase("fr")] }];
    } else if (/^[a-z\d-]+$/i.test(raw) && /\d/.test(raw)) {
      const variants = [...new Set([raw, raw.toLocaleUpperCase("fr")])];
      querySpecs = [
        { field: "licenseNumber", variants },
        { field: "clubId", variants }
      ];
    } else {
      const nameSeed = raw.split(/\s+/).filter(Boolean).at(-1) || raw;
      querySpecs = [
        { field: "lastName", variants: variantsFor(nameSeed) },
        { field: "firstName", variants: variantsFor(nameSeed) },
        { field: "clubName", variants: variantsFor(raw) }
      ];
    }
    const flatSpecs = querySpecs.flatMap(({ field, variants }) => variants.map((variant) => ({ field, variant }))).slice(0, 6);
    const perQueryLimit = Math.max(10, Math.floor(maxScanned / Math.max(1, flatSpecs.length)));
    const snapshots = await Promise.all(flatSpecs.map(({ field, variant }) => {
      let query = usersRef;
      if (!context.national && context.regionId) query = query.where("regionId", "==", context.regionId);
      return query
        .orderBy(field)
        .startAt(variant)
        .endAt(`${variant}\uf8ff`)
        .limit(perQueryLimit)
        .get();
    }));
    const documents = new Map();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => documents.set(doc.id, doc)));
    const matches = [...documents.values()]
      .filter((doc) => accessUserContainsSearch(doc, raw))
      .sort((left, right) => {
        const leftData = left.data() || {};
        const rightData = right.data() || {};
        return `${leftData.lastName || ""}\u0000${leftData.firstName || ""}\u0000${left.id}`
          .localeCompare(`${rightData.lastName || ""}\u0000${rightData.firstName || ""}\u0000${right.id}`, "fr", { sensitivity: "base" });
      });
    return {
      documents: matches,
      scannedCount: snapshots.reduce((total, snapshot) => total + snapshot.size, 0),
      truncated: snapshots.some((snapshot) => snapshot.size >= perQueryLimit)
    };
  }

  async function deleteAccessUserAccount(uid, actorUid, source = {}) {
    const targetUid = backendContext.cleanText(uid);
    if (!targetUid) {
      throw new backendContext.HttpsError("invalid-argument", "Utilisateur requis.");
    }
    if (targetUid === actorUid) {
      throw new backendContext.HttpsError("failed-precondition", "Tu ne peux pas supprimer ton propre acces.");
    }
    if (backendContext.ADMIN_UIDS.has(targetUid)) {
      throw new backendContext.HttpsError("failed-precondition", "Ce compte administrateur racine ne peut pas etre supprime.");
    }
    const userRef = backendContext.db.collection("users").doc(targetUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Acces LivePalmes introuvable.");
    }
    const data = snapshot.data() || {};
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {});
    const email = data.email || "";
    try {
      await backendContext.auth.deleteUser(targetUid);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
    }
    const batch = backendContext.db.batch();
    batch.delete(userRef);
    backendContext.ACCESS_CAPABILITIES.forEach((capability) => {
      batch.delete(backendContext.db.collection("accessGrants").doc(`${targetUid}_${capability.replace(".", "_")}`));
    });
    await batch.commit();
    await backendContext.writeAuditLog("accessUser.deleted", actorUid, {
      uid: targetUid,
      email,
      capabilities,
      regionId: data.regionId || "",
      clubId: data.clubId || "",
      source
    });
    return {
      ok: true,
      uid: targetUid,
      email
    };
  }

  async function setCompetitionEmailNotificationPreference(uid = "", enabled = true, source = "portal") {
    const cleanUid = backendContext.cleanText(uid).slice(0, 128);
    if (!cleanUid) throw new backendContext.HttpsError("invalid-argument", "Compte requis.");
    const userRef = backendContext.db.collection("users").doc(cleanUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Compte LivePalmes introuvable.");
    const userData = snapshot.data() || {};
    const now = new Date().toISOString();
    const preferencePatch = {
      emailPreferences: {
        competitionNotifications: enabled === true,
        updatedAt: now,
        source: backendContext.cleanText(source).slice(0, 40)
      },
      updatedAt: now
    };
    const before = backendContext.engagementMailRecipientFromUserDoc(snapshot);
    const afterData = {
      ...userData,
      ...preferencePatch,
      emailPreferences: {
        ...(userData.emailPreferences || {}),
        ...preferencePatch.emailPreferences
      }
    };
    const after = afterData.status === "active"
      ? backendContext.engagementMailRecipientFromUserDoc({ id: cleanUid, data: () => afterData })
      : null;
    const recipientKey = backendContext.engagementMailRecipientIndexKey(cleanUid);
    const capabilities = new Set([...(before.capabilities || []), ...(after?.capabilities || [])]);
    const batch = backendContext.db.batch();
    batch.set(userRef, preferencePatch, { merge: true });
    capabilities.forEach((capability) => {
      const shardNumber = backendContext.engagementMailRecipientShardNumber(cleanUid);
      const value = after?.capabilities?.includes(capability) ? after : backendContext.FieldValue.delete();
      batch.set(backendContext.engagementMailRecipientShardRef(backendContext.db, capability, shardNumber), {
        capability,
        shardNumber,
        recipients: { [recipientKey]: value },
        generatedAt: now
      }, { merge: true });
    });
    await batch.commit();
    await backendContext.writeAuditLog("accessUser.competitionEmailPreferenceUpdated", cleanUid, {
      uid: cleanUid,
      enabled: enabled === true,
      source: backendContext.cleanText(source).slice(0, 40)
    }).catch((error) => console.warn("Journalisation de la préférence mail impossible", error));
    return { enabled: enabled === true, updatedAt: now };
  }

  return {
    cleanEngagementAccessRequestPayload,
    engagementAccessRequestItem,
    assertEngagementAccessRequestScope,
    engagementAccessExistingClubPayload,
    findEngagementClubByFederalNumber,
    resolveExistingClubForAccessRequest,
    createClubFromEngagementAccessRequest,
    sendEngagementAccessAcknowledgement,
    sendEngagementAccessRejection,
    sendEngagementExistingAccountNotice,
    engagementExistingAccessAccount,
    consumePublicAccessRequestRateLimit,
    sendEngagementAccessAdminNotifications,
    accessUserListItemFromData,
    accessUserListItem,
    accessDirectorySnapshotEntry,
    accessDirectorySnapshotRegionId,
    sameAccessDirectorySnapshotEntry,
    mergeAccessDirectorySnapshotEntries,
    accessUserDeletionRequestItem,
    accessUserMatchesFilters,
    normalizedDirectoryText,
    accessUserContainsSearch,
    searchAccessUserDocuments,
    deleteAccessUserAccount,
    setCompetitionEmailNotificationPreference
  };
}

module.exports = { createDirectoryService };
