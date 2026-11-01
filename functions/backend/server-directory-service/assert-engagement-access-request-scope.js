// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_assertEngagementAccessRequestScope(backendContext) {
  function assertEngagementAccessRequestScope(context = {}, requestData = {}) {
    if (context.national) return;
    if (!context.region) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements region ou national requis.");
    }
    if (!context.regionId || backendContext.cleanText(requestData.regionId) !== context.regionId) {
      throw new backendContext.HttpsError("permission-denied", "Demande hors perimetre regional.");
    }
  }

  async function createClubFromEngagementAccessRequest(payload = {}, actorUid = "", requestId = "") {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("../../nap-club-access-request").createFromRequest(
      require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {payload, actorUid, requestId}, {
        read: async operation => { const doc = await backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).get(); return doc.exists ? doc.data().target : null; },
        prepare: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).create({action:"nap.clubCreate.prepare",actorUid,target,createdAt:new Date().toISOString()}),
        checkpoint: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-club-create-${operation}-before`).update({target}),
        complete: async (operation, target) => { await backendContext.writeAuditLogOnce("nap.clubCreate.complete",actorUid,{...target,auditPreparationId:`nap-club-create-${operation}-before`},`nap-club-create-${operation}-complete`); await require("../../nap-club-provenance").record(backendContext.db,operation,target,actorUid); }
      });
    const existingClub = await (0, backendContext.local$findEngagementClubByFederalNumber)(payload.newClub?.federalNumber);
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

  return { assertEngagementAccessRequestScope, createClubFromEngagementAccessRequest, sendEngagementAccessRejection };
}

module.exports = { createDirectoryService_assertEngagementAccessRequestScope };
