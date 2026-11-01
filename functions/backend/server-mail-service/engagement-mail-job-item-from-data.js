// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailJobItemFromData(backendContext) {
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

  return { engagementMailJobItemFromData };
}

module.exports = { createMailService_engagementMailJobItemFromData };
