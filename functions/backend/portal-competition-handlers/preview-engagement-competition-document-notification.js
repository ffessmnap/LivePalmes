// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_previewEngagementCompetitionDocumentNotification(backendContext) {
  async function previewEngagementCompetitionDocumentNotification(request) {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.nativeNotificationPreview(request, "documents");
    const { competitionId, snapshot } = await backendContext.engagementCompetitionDocumentContext(request);
    const recipients = backendContext.engagementCompetitionDocumentRecipients(
      await backendContext.engagementActiveClubMailRecipients(backendContext.db),
      backendContext.engagementCompetitionDetailItem(snapshot)
    );
    return {
      ok: true,
      competitionId,
      recipientCount: recipients.length,
      clubCount: new Set(recipients.map((recipient) => backendContext.cleanText(recipient.clubId)).filter(Boolean)).size
    };
  }

  return { previewEngagementCompetitionDocumentNotification };
}

module.exports = { createCompetitionHandlers_previewEngagementCompetitionDocumentNotification };
