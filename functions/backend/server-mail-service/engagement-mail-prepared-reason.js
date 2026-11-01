// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailPreparedReason(backendContext) {
  function engagementMailPreparedReason() {
    return backendContext.engagementMailSmtpConfig().ready ? "" : "Configuration technique d'envoi mail non branchee.";
  }

  async function upsertEngagementMailJob(payload = {}, now = "") {
    const id = (0, backendContext.local$engagementMailJobId)(payload);
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
    return (0, backendContext.local$engagementMailJobItemFromData)(job, id);
  }

  return { engagementMailPreparedReason, upsertEngagementMailJob };
}

module.exports = { createMailService_engagementMailPreparedReason };
