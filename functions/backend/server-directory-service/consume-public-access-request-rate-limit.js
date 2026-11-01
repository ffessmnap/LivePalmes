// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_consumePublicAccessRequestRateLimit(backendContext) {
  async function resolveExistingClubForAccessRequest(payload = {}) {
    if (payload.newClubRequested !== true || !payload.newClub?.federalNumber) return payload;
    const existingClub = await (0, backendContext.local$findEngagementClubByFederalNumber)(payload.newClub.federalNumber);
    return existingClub
      ? { ...payload, ...(0, backendContext.local$engagementAccessExistingClubPayload)(existingClub), newClub: null }
      : payload;
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

  return { resolveExistingClubForAccessRequest, sendEngagementAccessAcknowledgement, sendEngagementExistingAccountNotice, consumePublicAccessRequestRateLimit, sendEngagementAccessAdminNotifications };
}

module.exports = { createDirectoryService_consumePublicAccessRequestRateLimit };
