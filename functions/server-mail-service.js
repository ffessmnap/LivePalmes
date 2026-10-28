// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createMailService(backendContext) {
  function engagementMailPreparedReason() {
    return backendContext.engagementMailSmtpConfig().ready ? "" : "Configuration technique d'envoi mail non branchee.";
  }

  function engagementMailJobId(payload = {}) {
    const identity = [
      backendContext.cleanText(payload.type),
      backendContext.cleanText(payload.competitionId),
      backendContext.cleanText(payload.clubId),
      backendContext.normalizeEmail(payload.toEmail)
    ];
    if (backendContext.cleanText(payload.notificationId)) identity.push(backendContext.cleanText(payload.notificationId));
    return backendContext.stableHash(identity.join("|")).slice(0, 40);
  }

  function engagementMailRecipientFromUserDoc(doc) {
    const data = doc.data() || {};
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {})
      .filter((capability) => backendContext.ENGAGEMENT_MAIL_CAPABILITIES.includes(capability));
    return backendContext.cleanFirestoreValue({
      uid: doc.id,
      email: backendContext.normalizeEmail(data.email).slice(0, 180),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.engagementClubName(data.clubId, data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      competitionNotificationsEnabled: backendContext.competitionEmailNotificationsEnabled(data),
      capabilities
    });
  }

  function engagementMailRecipientShardNumber(uid = "") {
    return Number.parseInt(backendContext.stableHash(uid).slice(0, 8), 16) % backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT;
  }

  function engagementMailRecipientShardRef(db, capability, shardNumber) {
    const capabilityKey = backendContext.cleanText(capability).replace(/[^a-z0-9]+/gi, "_");
    return db.collection(backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION).doc(`${capabilityKey}-${shardNumber}`);
  }

  function engagementMailRecipientIndexStateRef(db) {
    return db.collection(backendContext.ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION).doc("default");
  }

  function engagementMailRecipientIndexKey(uid = "") {
    return backendContext.stableHash(uid).slice(0, 24);
  }

  function engagementClubAdminDirectoryRef(db) {
    return db.collection(backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION).doc("default");
  }

  function engagementClubAdminDirectoryEntry(recipient = {}) {
    if (
      !recipient.uid ||
      !recipient.clubId ||
      !recipient.email ||
      !engagementRecipientHasCapability(recipient, "engagements.club.manage")
    ) return null;
    return backendContext.cleanFirestoreValue({
      uid: backendContext.cleanText(recipient.uid).slice(0, 128),
      email: backendContext.normalizeEmail(recipient.email).slice(0, 180),
      firstName: backendContext.cleanText(recipient.firstName).slice(0, 80),
      lastName: backendContext.cleanText(recipient.lastName).slice(0, 80),
      clubId: backendContext.cleanText(recipient.clubId).slice(0, 40)
    });
  }

  function engagementClubAdminDirectoryMap(recipients = []) {
    return recipients.reduce((admins, recipient) => {
      const entry = engagementClubAdminDirectoryEntry(recipient);
      if (entry) admins[engagementMailRecipientIndexKey(entry.uid)] = entry;
      return admins;
    }, {});
  }

  function assertEngagementClubAdminDirectorySize(admins = {}) {
    const byteLength = Buffer.byteLength(JSON.stringify(admins), "utf8");
    if (byteLength > backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES) {
      throw new Error(`Annuaire des administrateurs de clubs trop volumineux (${byteLength} octets).`);
    }
    return byteLength;
  }

  async function writeEngagementClubAdminDirectory(db, recipients = [], now = new Date().toISOString()) {
    const admins = engagementClubAdminDirectoryMap(recipients);
    const byteLength = assertEngagementClubAdminDirectorySize(admins);
    await engagementClubAdminDirectoryRef(db).set({
      status: "ready",
      admins,
      adminCount: Object.keys(admins).length,
      byteLength,
      updatedAt: now
    }, { merge: false });
    return { admins, byteLength };
  }

  async function updateEngagementClubAdminDirectory(db, before = null, after = null, now = new Date().toISOString()) {
    const uid = backendContext.cleanText(after?.uid || before?.uid);
    if (!uid) return;
    const key = engagementMailRecipientIndexKey(uid);
    await db.runTransaction(async (transaction) => {
      const ref = engagementClubAdminDirectoryRef(db);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists || snapshot.data()?.status !== "ready") return;
      const admins = { ...(snapshot.data()?.admins || {}) };
      const entry = engagementClubAdminDirectoryEntry(after || {});
      if (entry) admins[key] = entry;
      else delete admins[key];
      const byteLength = assertEngagementClubAdminDirectorySize(admins);
      transaction.set(ref, {
        status: "ready",
        admins,
        adminCount: Object.keys(admins).length,
        byteLength,
        updatedAt: now
      }, { merge: false });
    });
  }

  async function readEngagementClubAdminDirectory(db) {
    const ref = engagementClubAdminDirectoryRef(db);
    const snapshot = await ref.get();
    if (snapshot.exists && snapshot.data()?.status === "ready") {
      return {
        administrators: Object.values(snapshot.data()?.admins || {}),
        bootstrapped: false
      };
    }
    const stateSnapshot = await engagementMailRecipientIndexStateRef(db).get();
    if (stateSnapshot.data()?.status !== "ready") {
      return { administrators: [], available: false, bootstrapped: false };
    }
    const recipients = await engagementMailRecipientsFromIndex(db, ["engagements.club.manage"]);
    try {
      const directory = await writeEngagementClubAdminDirectory(db, recipients);
      return {
        administrators: Object.values(directory.admins),
        available: true,
        bootstrapped: true
      };
    } catch (error) {
      console.error("Initialisation de l'annuaire privé des administrateurs impossible.", backendContext.cleanText(error?.message || error));
      return { administrators: [], available: false, bootstrapped: false };
    }
  }

  function engagementMailRecipientShardRefs(db, capabilities = backendContext.ENGAGEMENT_MAIL_CAPABILITIES) {
    return capabilities.flatMap((capability) => Array.from(
      { length: backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT },
      (_, shardNumber) => engagementMailRecipientShardRef(db, capability, shardNumber)
    ));
  }

  function engagementMailRecipientShardGroups(recipients = []) {
    const groups = new Map();
    recipients.forEach((recipient) => {
      (recipient.capabilities || []).forEach((capability) => {
        if (!backendContext.ENGAGEMENT_MAIL_CAPABILITIES.includes(capability)) return;
        const shardNumber = engagementMailRecipientShardNumber(recipient.uid);
        const groupKey = `${capability}|${shardNumber}`;
        if (!groups.has(groupKey)) groups.set(groupKey, { capability, shardNumber, recipients: {} });
        groups.get(groupKey).recipients[engagementMailRecipientIndexKey(recipient.uid)] = recipient;
      });
    });
    return groups;
  }

  async function replaceEngagementMailRecipientIndex(db, recipients = [], context = {}) {
    const now = context.now || new Date().toISOString();
    const deleteBatch = db.batch();
    engagementMailRecipientShardRefs(db).forEach((ref) => deleteBatch.delete(ref));
    await deleteBatch.commit();

    const writeBatch = db.batch();
    engagementMailRecipientShardGroups(recipients).forEach((group) => {
      writeBatch.set(engagementMailRecipientShardRef(db, group.capability, group.shardNumber), {
        capability: group.capability,
        shardNumber: group.shardNumber,
        recipients: group.recipients,
        generatedAt: now
      }, { merge: false });
    });
    writeBatch.set(engagementMailRecipientIndexStateRef(db), {
      status: "ready",
      cursor: "",
      recipientCount: recipients.length,
      generatedAt: now,
      updatedAt: now,
      source: context.source || "bounded-bootstrap"
    }, { merge: true });
    await writeBatch.commit();
    await writeEngagementClubAdminDirectory(db, recipients, now);
  }

  async function bootstrapEngagementMailRecipientIndex(db) {
    const snapshots = await Promise.all(backendContext.ENGAGEMENT_MAIL_CAPABILITIES.map((capability) => {
      const capabilityField = new backendContext.FieldPath("capabilities", capability);
      return db.collection("users")
        .where(capabilityField, "==", true)
        .limit(backendContext.ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT + 1)
        .get();
    }));
    if (snapshots.some((snapshot) => snapshot.size > backendContext.ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT)) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Index des destinataires a initialiser par lots avant de preparer les courriels."
      );
    }
    const recipientsByUid = new Map();
    snapshots.flatMap((snapshot) => snapshot.docs)
      .filter((doc) => (doc.data() || {}).status === "active")
      .forEach((doc) => recipientsByUid.set(doc.id, engagementMailRecipientFromUserDoc(doc)));
    const recipients = Array.from(recipientsByUid.values()).filter((recipient) => recipient.email && recipient.capabilities?.length);
    await replaceEngagementMailRecipientIndex(db, recipients);
    return recipients;
  }

  async function engagementMailRecipientsFromIndex(db, capabilities = backendContext.ENGAGEMENT_MAIL_CAPABILITIES) {
    const refs = engagementMailRecipientShardRefs(db, capabilities);
    const snapshots = refs.length ? await db.getAll(...refs) : [];
    return snapshots.flatMap((snapshot) => {
      const recipients = snapshot.exists ? snapshot.data()?.recipients : null;
      return recipients && typeof recipients === "object" ? Object.values(recipients) : [];
    });
  }

  function engagementRecipientHasCapability(recipient = {}, capability) {
    return Array.isArray(recipient.capabilities) && recipient.capabilities.includes(capability);
  }

  function engagementCompetitionNotificationRecipients(recipients = []) {
    return recipients.filter((recipient) => recipient?.competitionNotificationsEnabled !== false);
  }

  async function engagementActiveMailRecipients(db, capabilities = backendContext.ENGAGEMENT_MAIL_CAPABILITIES) {
    const mailCapabilities = capabilities.filter((capability) => backendContext.ENGAGEMENT_MAIL_CAPABILITIES.includes(capability));
    if (!mailCapabilities.length) return [];
    const stateSnapshot = await engagementMailRecipientIndexStateRef(db).get();
    const indexedRecipients = stateSnapshot.data()?.status === "ready"
      ? await engagementMailRecipientsFromIndex(db, mailCapabilities)
      : await bootstrapEngagementMailRecipientIndex(db);
    const recipientsByEmail = new Map();
    indexedRecipients
      .filter((recipient) => mailCapabilities.some((capability) => engagementRecipientHasCapability(recipient, capability)))
      .filter((recipient) => recipient.email && recipient.capabilities?.length)
      .forEach((recipient) => {
        const existing = recipientsByEmail.get(recipient.email);
        if (!existing) {
          recipientsByEmail.set(recipient.email, recipient);
          return;
        }
        recipientsByEmail.set(recipient.email, {
          ...existing,
          ...recipient,
          competitionNotificationsEnabled: existing.competitionNotificationsEnabled !== false && recipient.competitionNotificationsEnabled !== false,
          capabilities: Array.from(new Set([...(existing.capabilities || []), ...(recipient.capabilities || [])]))
        });
      });
    return [...recipientsByEmail.values()];
  }

  async function engagementActiveClubMailRecipients(db) {
    return (await engagementActiveMailRecipients(db, ["engagements.club.manage"]))
      .filter((recipient) =>
        recipient.clubId &&
        engagementRecipientHasCapability(recipient, "engagements.club.manage")
      );
  }

  function engagementMailRecipientFromContext(context = {}) {
    const capabilities = [];
    if (context.national) capabilities.push("engagements.national.manage");
    else if (context.region) capabilities.push("engagements.region.manage");
    if (!context.email || !capabilities.length) return null;
    return {
      uid: context.uid || "",
      email: backendContext.normalizeEmail(context.email).slice(0, 180),
      firstName: "",
      lastName: "",
      clubId: "",
      clubName: "",
      regionId: backendContext.cleanText(context.regionId).slice(0, 80),
      competitionNotificationsEnabled: context.competitionNotificationsEnabled !== false,
      capabilities
    };
  }

  function engagementDedupMailRecipients(recipients = []) {
    const recipientsByEmail = new Map();
    recipients
      .filter((recipient) => recipient?.email)
      .forEach((recipient) => {
        const email = backendContext.normalizeEmail(recipient.email);
        const existing = recipientsByEmail.get(email);
        if (!existing) {
          recipientsByEmail.set(email, { ...recipient, email });
          return;
        }
        recipientsByEmail.set(email, {
          ...existing,
          ...recipient,
          email,
          competitionNotificationsEnabled: existing.competitionNotificationsEnabled !== false && recipient.competitionNotificationsEnabled !== false,
          capabilities: Array.from(new Set([...(existing.capabilities || []), ...(recipient.capabilities || [])]))
        });
      });
    return [...recipientsByEmail.values()];
  }

  function engagementCompetitionOpeningRecipients(recipients = [], competition = {}, extraRecipients = []) {
    const level = backendContext.cleanEngagementCompetitionLevel(competition.level);
    const regionKeys = new Set([
      backendContext.cleanText(competition.regionId),
      ...backendContext.cleanEngagementRegionIds(competition.invitedRegionIds, competition.regionId)
    ].map(backendContext.normalizedEngagementRegionKey).filter(Boolean));
    return engagementCompetitionNotificationRecipients(
      engagementDedupMailRecipients([...extraRecipients, ...recipients])
    ).filter((recipient) => {
      if (engagementRecipientHasCapability(recipient, "engagements.national.manage")) return true;
      if (backendContext.isNationalOnlyEngagementCompetitionLevel(level)) {
        return engagementRecipientHasCapability(recipient, "engagements.club.manage") ||
          engagementRecipientHasCapability(recipient, "engagements.region.manage");
      }
      const recipientRegionKey = backendContext.normalizedEngagementRegionKey(recipient.regionId);
      if (!recipientRegionKey || !regionKeys.has(recipientRegionKey)) return false;
      return engagementRecipientHasCapability(recipient, "engagements.club.manage") ||
        engagementRecipientHasCapability(recipient, "engagements.region.manage");
    });
  }

  function engagementCompetitionDocumentRecipients(recipients = [], competition = {}) {
    const level = backendContext.cleanEngagementCompetitionLevel(competition.level);
    const regionKeys = new Set([
      backendContext.cleanText(competition.regionId),
      ...backendContext.cleanEngagementRegionIds(competition.invitedRegionIds, competition.regionId)
    ].map(backendContext.normalizedEngagementRegionKey).filter(Boolean));
    return engagementCompetitionNotificationRecipients(engagementDedupMailRecipients(recipients)).filter((recipient) => {
      if (!recipient.clubId || !engagementRecipientHasCapability(recipient, "engagements.club.manage")) return false;
      if (backendContext.isNationalOnlyEngagementCompetitionLevel(level)) return true;
      const recipientRegionKey = backendContext.normalizedEngagementRegionKey(recipient.regionId);
      return Boolean(recipientRegionKey && regionKeys.has(recipientRegionKey));
    });
  }

  function engagementCompetitionDocumentMailSubject(competition = {}, documents = []) {
    return `Documents disponibles - ${competition.name || "Compétition LivePalmes"}`;
  }

  function engagementCompetitionDocumentMailText(competition = {}, documents = []) {
    return [
      "Bonjour,",
      "",
      `${documents.length > 1 ? "Des documents ont été ajoutés ou mis à jour" : "Un document a été ajouté ou mis à jour"} pour la compétition suivante :`,
      "",
      ...backendContext.competitionMailLines(competition),
      "",
      ...documents.flatMap((document) => [
        `- ${document.title || document.fileName || "Document"}`,
        `  ${document.url || ""}`
      ]),
      "",
      "Consultez les documents depuis la fiche de la compétition dans le portail LivePalmes :",
      "",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions`,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementCompetitionDocumentMailHtml(competition = {}, documents = []) {
    const detailsHtml = backendContext.competitionMailLines(competition).map(backendContext.escapeMailHtml).join("<br>");
    const documentItems = documents.map((document) => {
      const label = backendContext.escapeMailHtml(document.title || document.fileName || "Document");
      const url = backendContext.escapeMailHtml(document.url || "");
      return `<li><a href="${url}">${label}</a></li>`;
    }).join("");
    return [
      "<p>Bonjour,</p>",
      `<p>${documents.length > 1 ? "Des documents ont été ajoutés ou mis à jour" : "Un document a été ajouté ou mis à jour"} pour la compétition suivante :</p>`,
      `<p>${detailsHtml}</p>`,
      `<ul>${documentItems}</ul>`,
      `<p><a href="${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions">Accéder à la compétition dans le portail LivePalmes</a></p>`,
      "<p>Sportivement,<br>Nage avec Palmes FFESSM</p>"
    ].join("");
  }

  function engagementRecipientsByClub(recipients = []) {
    return recipients.reduce((acc, recipient) => {
      const clubId = backendContext.cleanText(recipient.clubId);
      if (!clubId) return acc;
      if (!acc.has(clubId)) acc.set(clubId, []);
      acc.get(clubId).push(recipient);
      return acc;
    }, new Map());
  }

  function engagementOpeningMailSubject(competition = {}) {
    return `Ouverture des engagements - ${competition.name || "Compétition LivePalmes"}`;
  }

  function engagementOpeningMailText(competition = {}) {
    return [
      "Bonjour,",
      "",
      "Les engagements sont désormais ouverts pour la compétition suivante :",
      "",
      ...backendContext.competitionMailLines(competition),
      "",
      "Pour saisir et suivre les engagements de votre club, connectez-vous au portail LivePalmes :",
      "",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions`,
      "",
      `Merci de finaliser et de vérifier les engagements de votre club au plus tard le ${backendContext.competitionMailDateTime(competition.entryDeadlineAt)}.`,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementClubRecapMailSubject(competition = {}, entry = {}) {
    return `Fermeture des engagements - Récapitulatif ${entry.clubName || entry.clubId || "Club"} - ${competition.name || "LivePalmes"}`;
  }

  function engagementClubRecapMailText(competition = {}, entry = {}) {
    const fees = competition.fees || {};
    const feeLines = fees.enabled === false
      ? ["Aucun frais d'engagement n'est demandé pour cette compétition."]
      : [
        `Total indicatif des frais d'engagement : ${backendContext.engagementPdfMoney(backendContext.engagementPdfFeeTotal(entry, competition))}.`,
        fees.helloAssoUrl
          ? `Paiement HelloAsso : ${fees.helloAssoUrl}`
          : "Lien HelloAsso en attente de publication.",
        "Rappel : paiement attendu avant la fin de la premiere journee de competition. Surplus forfaitaire de 50 EUR ensuite."
      ];
    return [
      `Bonjour,`,
      "",
      "Les engagements sont désormais fermés pour la compétition suivante :",
      "",
      ...backendContext.competitionMailLines(competition),
      "",
      `Vous trouverez en pièce jointe le récapitulatif des engagements de ${entry.clubName || entry.clubId || "votre club"}.`,
      "Merci de vérifier les informations figurant dans ce document. Si vous constatez une anomalie, contactez l’organisateur de la compétition.",
      "",
      "Vous pouvez également consulter votre dossier dans le portail LivePalmes :",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions`,
      "",
      ...feeLines,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementTxtMailSubject(competition = {}) {
    return `Export WinPalme engagements - ${competition.name || "Competition LivePalmes"}`;
  }

  function engagementTxtMailText(competition = {}, txt = {}) {
    return [
      "Bonjour,",
      "",
      `Vous trouverez en pièce jointe l’export WinPalme des engagements pour ${competition.name || "la competition"}.`,
      ...backendContext.competitionMailLines(competition),
      `Fichier : ${txt.document?.fileName || txt.fileName || "export-engagements-livepalmes.txt"}.`,
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementOfficialsMailSubject(competition = {}) {
    return `Liste des officiels - ${competition.name || "Compétition LivePalmes"}`;
  }

  function engagementOfficialsMailText(competition = {}, pdf = {}) {
    return [
      "Bonjour,",
      "",
      `Vous trouverez en pièce jointe la liste consolidée des officiels inscrits pour ${competition.name || "la compétition"}.`,
      ...backendContext.competitionMailLines(competition),
      `Nombre d'officiels déclarés : ${Math.max(0, Math.trunc(Number(pdf.officialCount) || 0))}.`,
      "Le tableau est classé par club, puis par nom et prénom.",
      "",
      "Sportivement,",
      "Nage avec Palmes FFESSM"
    ].join("\n");
  }

  function engagementMailJobItemFromData(data = {}, id = "") {
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(id || data.id).slice(0, 80),
      type: backendContext.cleanText(data.type).slice(0, 80),
      status: backendContext.cleanText(data.status).slice(0, 80),
      statusLabel: backendContext.engagementMailStatusLabel(data.status),
      competitionId: backendContext.cleanText(data.competitionId).slice(0, 128),
      notificationId: backendContext.cleanText(data.notificationId).slice(0, 80),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      toEmail: backendContext.normalizeEmail(data.toEmail).slice(0, 180),
      toName: backendContext.cleanText(data.toName).slice(0, 180),
      deliveryMode: data.deliveryMode === 'bcc-v1' ? 'bcc-v1' : '',
      recipientCount: Number(data.recipientCount || data.recipients?.length || 1),
      sentCount: Number(data.sentCount || 0),
      failedCount: Number(data.failedCount || 0),
      uncertainCount: Number(data.uncertainCount || 0),
      cancelledCount: Number(data.cancelledCount || 0),
      subject: backendContext.cleanText(data.subject).slice(0, 220),
      attachmentCount: Array.isArray(data.attachments) ? data.attachments.length : 0,
      reason: backendContext.cleanText(data.reason).slice(0, 220),
      sentAt: backendContext.cleanText(data.sentAt).slice(0, 40),
      failedAt: backendContext.cleanText(data.failedAt).slice(0, 40),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    });
  }

  async function upsertEngagementMailJob(payload = {}, now = "") {
    const id = engagementMailJobId(payload);
    if (!id || !backendContext.normalizeEmail(payload.toEmail)) return null;
    const preparedAt = now || new Date().toISOString();
    const status = backendContext.engagementMailPreparedStatus();
    const job = backendContext.cleanFirestoreValue({
      id,
      type: backendContext.cleanText(payload.type).slice(0, 80),
      status,
      reason: engagementMailPreparedReason(),
      fromEmail: "livepalmes@nap-ffessm.fr",
      toEmail: backendContext.normalizeEmail(payload.toEmail).slice(0, 180),
      toName: backendContext.cleanText(payload.toName).slice(0, 180),
      recipientUid: backendContext.cleanText(payload.recipientUid).slice(0, 128),
      subject: backendContext.cleanText(payload.subject).slice(0, 220),
      textBody: backendContext.cleanText(payload.text).slice(0, 5000),
      htmlBody: String(payload.html || "").trim().slice(0, 20000),
      textPreview: backendContext.cleanText(payload.text).slice(0, 1200),
      competitionId: backendContext.cleanText(payload.competitionId).slice(0, 128),
      competitionName: backendContext.cleanText(payload.competitionName).slice(0, 160),
      notificationId: backendContext.cleanText(payload.notificationId).slice(0, 80),
      clubId: backendContext.cleanText(payload.clubId).slice(0, 40),
      clubName: backendContext.cleanText(payload.clubName).slice(0, 140),
      regionId: backendContext.cleanText(payload.regionId).slice(0, 80),
      attachments: Array.isArray(payload.attachments) ? payload.attachments.map((attachment) => backendContext.cleanFirestoreValue({
        type: backendContext.cleanText(attachment.type).slice(0, 80),
        fileName: backendContext.cleanText(attachment.fileName).slice(0, 180),
        contentType: backendContext.cleanText(attachment.contentType).slice(0, 80),
        storagePath: backendContext.cleanText(attachment.storagePath).slice(0, 260)
      })).filter((attachment) => attachment.storagePath) : [],
      preparedAt,
      updatedAt: preparedAt,
      createdAt: preparedAt
    });
    await backendContext.db.collection(backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(id).set({
      ...job,
      sentAt: backendContext.FieldValue.delete(),
      sentBy: backendContext.FieldValue.delete(),
      sentByEmail: backendContext.FieldValue.delete(),
      failedAt: backendContext.FieldValue.delete(),
      providerMessageId: backendContext.FieldValue.delete()
    }, { merge: true });
    return engagementMailJobItemFromData(job, id);
  }

  async function engagementMailAttachments(job = {}) {
    const attachments = [];
    for (const attachment of Array.isArray(job.attachments) ? job.attachments : []) {
      const storagePath = backendContext.cleanText(attachment.storagePath);
      if (!storagePath) continue;
      const buffer = await backendContext.readStoredEngagementClubRecapPdf({ storagePath });
      if (!buffer?.length) continue;
      if (attachment.sha256 && (buffer.length !== attachment.size || backendContext.crypto.createHash('sha256').update(buffer).digest('hex') !== attachment.sha256))
        throw new TypeError('Pièce jointe différente du document préparé.');
      attachments.push({
        filename: backendContext.cleanText(attachment.fileName) || "document-livepalmes.pdf",
        content: buffer,
        contentType: backendContext.cleanText(attachment.contentType) || "application/pdf"
      });
    }
    return attachments;
  }

  function engagementMailWithNotificationPreferenceFooter(text = "", html = "", uid = "") {
    const preferenceUrl = backendContext.competitionNotificationPreferenceUrl(uid);
    if (!preferenceUrl) throw new Error("Configuration du lien de gestion des notifications manquante.");
    const footerText = [
      "",
      "Vous pouvez gérer ou désactiver les notifications email LivePalmes en utilisant ce lien :",
      preferenceUrl,
      "ou depuis la rubrique Mon compte du portail LivePalmes :",
      `${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#mon-compte`
    ].join("\n");
    const htmlBody = html || backendContext.livePalmesMailHtml(text);
    const footerHtml = [
      '<hr style="margin:24px 0;border:0;border-top:1px solid #d8e0e5">',
      '<p style="color:#66717a;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">',
      `Vous pouvez gérer ou désactiver les notifications email LivePalmes en cliquant sur <a href="${backendContext.escapeMailHtml(preferenceUrl)}">ce lien</a>, ou depuis la rubrique <a href="${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#mon-compte">« Mon compte »</a> du portail LivePalmes.</p>`
    ].join("");
    return { text: `${text}${footerText}`, html: `${htmlBody}${footerHtml}` };
  }

  async function sendEngagementMailJob(transporter, doc, config, context) {
    const data = doc.data() || {};
    if(data.deliveryMode==='bcc-v1')return {skipped:true,reason:'task-worker-required'};
    let smtpStarted = false, smtpAccepted = false;
    const now = new Date().toISOString();
    const toEmail = backendContext.normalizeEmail(data.toEmail);
    const subject = backendContext.cleanText(data.subject).slice(0, 220);
    let text = backendContext.cleanText(data.textBody || data.textPreview).slice(0, 5000);
    let html = String(data.htmlBody || "").trim().slice(0, 20000);
    if (!toEmail || !subject || !text) {
      const update = {
        status: "failed",
        reason: "Mail incomplet.",
        failedAt: now,
        updatedAt: now,
        updatedBy: context.uid || ""
      };
      await doc.ref.set(update, { merge: true });
      return engagementMailJobItemFromData({ ...data, ...update }, doc.id);
    }
    try {
      if (backendContext.OPTIONAL_COMPETITION_MAIL_TYPES.has(backendContext.cleanText(data.type))) {
        const content = engagementMailWithNotificationPreferenceFooter(text, html, data.recipientUid);
        text = content.text;
        html = content.html;
      }
      if (!html) html = backendContext.livePalmesMailHtml(text);
      const attachments = await engagementMailAttachments(data);
      // Fresh server read immediately before SMTP; never trust the UI switch.
      const control = require('./engagement-mail-control');
      const gate = control.decision(await control.read(backendContext.db), data, backendContext.ENVIRONMENT.projectId);
      if (!gate.allowed) {
        const update = { status: 'cancelled', reason: gate.reason, updatedAt: new Date().toISOString() };
        await doc.ref.set(update, { merge: true });
        return engagementMailJobItemFromData({ ...data, ...update }, doc.id);
      }
      smtpStarted = true;
      const info = await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: gate.to,
        subject: gate.test ? `[TEST LivePalmes] ${subject}` : subject,
        text,
        ...(html ? { html } : {}),
        attachments
      });
      smtpAccepted = true;
      const update = backendContext.cleanFirestoreValue({
        status: "sent",
        reason: "",
        sentAt: now,
        sentBy: context.uid || "",
        sentByEmail: context.email || "",
        providerMessageId: backendContext.cleanText(info?.messageId).slice(0, 180),
        deliveredTo: gate.to,
        updatedAt: now,
        updatedBy: context.uid || ""
      });
      await doc.ref.set(update, { merge: true });
      return engagementMailJobItemFromData({ ...data, ...update }, doc.id);
    } catch (error) {
      const outcome = data.source === 'nap'
        ? require('./nap-mail-delivery').failure(error, { smtpStarted, smtpAccepted })
        : { status: 'failed' };
      const update = backendContext.cleanFirestoreValue({
        status: outcome.status,
        reason: backendContext.cleanText(error?.message || error).slice(0, 220),
        failedAt: now,
        updatedAt: now,
        updatedBy: context.uid || ""
      });
      await doc.ref.set(update, { merge: true });
      return { ...engagementMailJobItemFromData({ ...data, ...update }, doc.id), stopDelivery: outcome.stop === true };
    }
  }

  return {
    engagementMailPreparedReason,
    engagementMailJobId,
    engagementMailRecipientFromUserDoc,
    engagementMailRecipientShardNumber,
    engagementMailRecipientShardRef,
    engagementMailRecipientIndexStateRef,
    engagementMailRecipientIndexKey,
    engagementClubAdminDirectoryRef,
    engagementClubAdminDirectoryEntry,
    engagementClubAdminDirectoryMap,
    assertEngagementClubAdminDirectorySize,
    writeEngagementClubAdminDirectory,
    updateEngagementClubAdminDirectory,
    readEngagementClubAdminDirectory,
    engagementMailRecipientShardRefs,
    engagementMailRecipientShardGroups,
    replaceEngagementMailRecipientIndex,
    bootstrapEngagementMailRecipientIndex,
    engagementMailRecipientsFromIndex,
    engagementRecipientHasCapability,
    engagementCompetitionNotificationRecipients,
    engagementActiveMailRecipients,
    engagementActiveClubMailRecipients,
    engagementMailRecipientFromContext,
    engagementDedupMailRecipients,
    engagementCompetitionOpeningRecipients,
    engagementCompetitionDocumentRecipients,
    engagementCompetitionDocumentMailSubject,
    engagementCompetitionDocumentMailText,
    engagementCompetitionDocumentMailHtml,
    engagementRecipientsByClub,
    engagementOpeningMailSubject,
    engagementOpeningMailText,
    engagementClubRecapMailSubject,
    engagementClubRecapMailText,
    engagementTxtMailSubject,
    engagementTxtMailText,
    engagementOfficialsMailSubject,
    engagementOfficialsMailText,
    engagementMailJobItemFromData,
    upsertEngagementMailJob,
    engagementMailAttachments,
    engagementMailWithNotificationPreferenceFooter,
    sendEngagementMailJob
  };
}

module.exports = { createMailService };
