// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_sendEngagementPreparedEmailJobs(backendContext) {
  async function sendEngagementPreparedEmailJobs(db, competitionSnapshot, context = {}, options = {}) {
    const competitionId = backendContext.cleanText(competitionSnapshot.id).slice(0, 128);
    const requestedType = backendContext.cleanText(options.type).slice(0, 80);
    const limit = Math.max(1, Math.min(Number(options.limit || 500) || 500, 500));
    const config = backendContext.engagementMailSmtpConfig();
    if (!config.ready) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Configuration mail SMTP incomplete."
      );
    }
    const snapshot = await db.collection(backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION)
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    let eligibleRecapClubIds = null;
    if (requestedType === "club_recap_pdf") {
      const entriesSnapshot = await db.collection("engagementClubEntries")
        .where("competitionId", "==", competitionId)
        .limit(500)
        .get();
      eligibleRecapClubIds = new Set(entriesSnapshot.docs
        .map((doc) => backendContext.engagementClubEntryItem(doc))
        .filter((entry) => entry.teamLeaderComplete && backendContext.engagementClubEntryHasParticipants(entry))
        .map((entry) => entry.clubId));
    }
    const pendingDocs = snapshot.docs
      .filter((doc) => {
        const data = doc.data() || {};
        const status = backendContext.cleanText(data.status);
        if (requestedType && backendContext.cleanText(data.type) !== requestedType) return false;
        return status === "ready" || status === "blocked_missing_config" || status === "failed";
      });
    const notificationCapabilities = requestedType === "club_recap_pdf"
      ? ["engagements.club.manage"]
      : backendContext.ENGAGEMENT_MAIL_CAPABILITIES;
    const enabledNotificationUids = pendingDocs.some((doc) => backendContext.OPTIONAL_COMPETITION_MAIL_TYPES.has(backendContext.cleanText(doc.data()?.type)))
      ? new Set(backendContext.engagementCompetitionNotificationRecipients(await backendContext.engagementActiveMailRecipients(db, notificationCapabilities))
          .map((recipient) => backendContext.cleanText(recipient.uid))
          .filter(Boolean))
      : null;
    const notificationsDisabledDocs = enabledNotificationUids
      ? pendingDocs.filter((doc) => {
          const data = doc.data() || {};
          const recipientUid = backendContext.cleanText(data.recipientUid);
          return backendContext.OPTIONAL_COMPETITION_MAIL_TYPES.has(backendContext.cleanText(data.type)) && recipientUid && !enabledNotificationUids.has(recipientUid);
        })
      : [];
    const noParticipantsDocs = eligibleRecapClubIds
      ? pendingDocs.filter((doc) => !eligibleRecapClubIds.has(backendContext.cleanText(doc.data()?.clubId)))
      : [];
    const cancelledDocs = [...new Map([...notificationsDisabledDocs, ...noParticipantsDocs].map((doc) => [doc.id, doc])).values()];
    if (cancelledDocs.length) {
      const now = new Date().toISOString();
      const batch = db.batch();
      cancelledDocs.forEach((doc) => {
        const notificationsDisabled = notificationsDisabledDocs.some((item) => item.id === doc.id);
        batch.set(doc.ref, {
          status: notificationsDisabled ? "cancelled_notifications_disabled" : "cancelled_no_participants",
          updatedAt: now,
          cancelledAt: now
        }, { merge: true });
      });
      await batch.commit();
    }
    const candidates = pendingDocs
      .filter((doc) => !eligibleRecapClubIds || eligibleRecapClubIds.has(backendContext.cleanText(doc.data()?.clubId)))
      .filter((doc) => !notificationsDisabledDocs.some((item) => item.id === doc.id))
      .sort((left, right) =>
        backendContext.cleanText(left.data()?.updatedAt).localeCompare(backendContext.cleanText(right.data()?.updatedAt)) ||
        backendContext.cleanText(left.data()?.toEmail).localeCompare(backendContext.cleanText(right.data()?.toEmail))
      )
      .slice(0, limit);
    const transporter = backendContext.nodemailer.createTransport(config.transport);
    const jobs = [];
    let sentCount = 0;
    let errorCount = 0;
    for (const doc of candidates) {
      const job = await backendContext.sendEngagementMailJob(transporter, doc, config, context);
      if (job.status === "sent") sentCount += 1;
      else if (job.status === "failed") errorCount += 1;
      jobs.push(job);
    }
    if ((requestedType === "club_recap_pdf" || requestedType === "entries_txt" || requestedType === "officials_pdf") && candidates.length) {
      const now = new Date().toISOString();
      await db.collection("engagementCompetitions").doc(competitionId).set({
        documents: requestedType === "entries_txt"
          ? {
              entriesTxt: {
                status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                generatedAt: now,
                updatedAt: now,
                attemptedCount: candidates.length,
                sentCount,
                errorCount
              }
            }
          : requestedType === "officials_pdf"
            ? {
                officialsEmail: {
                  status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                  generatedAt: now,
                  updatedAt: now,
                  attemptedCount: candidates.length,
                  sentCount,
                  errorCount
                }
              }
            : {
              clubRecapEmails: {
                status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                generatedAt: now,
                updatedAt: now,
                attemptedCount: candidates.length,
                sentCount,
                errorCount
              }
            }
      }, { merge: true });
    }
    return {
      competitionId,
      attemptedCount: candidates.length,
      sentCount,
      errorCount,
      jobs
    };
  }

  return { sendEngagementPreparedEmailJobs };
}

module.exports = { createCompetitionService_sendEngagementPreparedEmailJobs };
