// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementCompetitionDocumentRecipients(backendContext) {
  function engagementCompetitionNotificationRecipients(recipients = []) {
    return recipients.filter((recipient) => recipient?.competitionNotificationsEnabled !== false);
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
      if ((0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.national.manage")) return true;
      if (backendContext.isNationalOnlyEngagementCompetitionLevel(level)) {
        return (0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.club.manage") ||
          (0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.region.manage");
      }
      const recipientRegionKey = backendContext.normalizedEngagementRegionKey(recipient.regionId);
      if (!recipientRegionKey || !regionKeys.has(recipientRegionKey)) return false;
      return (0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.club.manage") ||
        (0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.region.manage");
    });
  }

  function engagementCompetitionDocumentRecipients(recipients = [], competition = {}) {
    const level = backendContext.cleanEngagementCompetitionLevel(competition.level);
    const regionKeys = new Set([
      backendContext.cleanText(competition.regionId),
      ...backendContext.cleanEngagementRegionIds(competition.invitedRegionIds, competition.regionId)
    ].map(backendContext.normalizedEngagementRegionKey).filter(Boolean));
    return engagementCompetitionNotificationRecipients(engagementDedupMailRecipients(recipients)).filter((recipient) => {
      if (!recipient.clubId || !(0, backendContext.local$engagementRecipientHasCapability)(recipient, "engagements.club.manage")) return false;
      if (backendContext.isNationalOnlyEngagementCompetitionLevel(level)) return true;
      const recipientRegionKey = backendContext.normalizedEngagementRegionKey(recipient.regionId);
      return Boolean(recipientRegionKey && regionKeys.has(recipientRegionKey));
    });
  }

  return { engagementCompetitionNotificationRecipients, engagementDedupMailRecipients, engagementCompetitionOpeningRecipients, engagementCompetitionDocumentRecipients };
}

module.exports = { createMailService_engagementCompetitionDocumentRecipients };
