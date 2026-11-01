// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativeNotificationPreview(backendContext) {
  async function nativeNotificationPreview(request, kind) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.calendarEventId || request.data?.competitionId).slice(0, 128);
    if (!competitionId) throw new backendContext.HttpsError("invalid-argument", "Compétition requise.");
    try {
      return await require("../../nap-notification-preview").preview({ competitionId, kind,
        documentIds: kind === "documents" && Object.hasOwn(request.data || {}, "documentIds") ? request.data.documentIds : undefined }, {
        competition: id => (0, backendContext.local$nativePortalCompetition)(id, event => (0, backendContext.local$assertCanManageEngagementCompetition)(context, event)),
        mailSetting: () => require("../../engagement-mail-control").read(backendContext.db),
        recipients: async () => {
          const state = await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get();
          if (state.data()?.status !== "ready") throw new backendContext.HttpsError("failed-precondition", "Annuaire des destinataires indisponible. Sa reconstruction doit être demandée séparément.");
          return require("../../nap-notification-preview").nativeClubScopes(
            require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), await backendContext.engagementMailRecipientsFromIndex(backendContext.db));
        },
        select: (type, recipients, competition) => type === "opening"
          ? backendContext.engagementCompetitionOpeningRecipients(recipients, competition, [backendContext.engagementMailRecipientFromContext(context)].filter(Boolean))
          : backendContext.engagementCompetitionDocumentRecipients(recipients, competition),
        clubRecipients: recipients => backendContext.engagementCompetitionNotificationRecipients(backendContext.engagementDedupMailRecipients(recipients))
          .filter(recipient => recipient.clubId && backendContext.engagementRecipientHasCapability(recipient, "engagements.club.manage")),
        entries: competition => require("../../nap-admin-entries").readAdminEntries(
          require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), { competitionId, competition },
          event => (0, backendContext.local$assertCanManageEngagementCompetition)(context, event), { category: backendContext.ageCategoryFromDates }),
        hasParticipants: backendContext.engagementClubEntryHasParticipants
      });
    } catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",
        error instanceof TypeError || error instanceof RangeError ? error.message : "Aperçu des notifications NAP indisponible.");
    }
  }

  return { nativeNotificationPreview };
}

module.exports = { createCompetitionService_nativeNotificationPreview };
