// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_prepareEngagementClubRecapEmailJobs(backendContext) {
  async function prepareEngagementClubRecapEmailJobs(db, competitionSnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const competitionId = backendContext.cleanText(competition.id).slice(0, 128);
    const recipientsByClub = backendContext.engagementRecipientsByClub(backendContext.engagementCompetitionNotificationRecipients(
      await backendContext.engagementActiveClubMailRecipients(db)
    ));
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const now = new Date().toISOString();
    const jobs = [];
    let skippedClubCount = 0;
    let pdfGeneratedCount = 0;
    let pdfReusedCount = 0;
    let errorCount = 0;
    const errors = [];
    for (const entryDoc of entriesSnapshot.docs) {
      const entry = backendContext.engagementClubEntryItem(entryDoc);
      const recipients = recipientsByClub.get(entry.clubId) || [];
      if (!entry.clubId || !entry.teamLeaderComplete || !backendContext.engagementClubEntryHasParticipants(entry) || !recipients.length) {
        skippedClubCount += 1;
        continue;
      }
      let pdf = null;
      try {
        pdf = await backendContext.getOrCreateEngagementClubRecapPdf(competitionSnapshot, entryDoc, {
          force: options.forcePdf === true
        });
      } catch (error) {
        errorCount += 1;
        errors.push({
          clubId: entry.clubId,
          clubName: entry.clubName,
          message: backendContext.cleanText(error?.message || error).slice(0, 220)
        });
        continue;
      }
      if (pdf.fromStorage) pdfReusedCount += 1;
      else pdfGeneratedCount += 1;
      for (const recipient of recipients) {
        const job = await backendContext.upsertEngagementMailJob({
          type: "club_recap_pdf",
          competitionId,
          competitionName: competition.name,
          clubId: entry.clubId,
          clubName: entry.clubName,
          regionId: entry.regionId,
          toEmail: recipient.email,
          toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
          recipientUid: recipient.uid,
          subject: backendContext.engagementClubRecapMailSubject(competition, entry),
          text: backendContext.engagementClubRecapMailText(competition, entry),
          attachments: [{
            type: "clubRecapPdf",
            fileName: pdf.document?.fileName || pdf.fileName,
            contentType: "application/pdf",
            storagePath: pdf.document?.storagePath
          }]
        }, now);
        if (job) jobs.push(job);
      }
    }
    if (jobs.length || errorCount) {
      await db.collection("engagementCompetitions").doc(competitionId).set({
        documents: {
          clubRecapEmails: {
            status: jobs.length ? "generated" : "pending",
            generatedAt: now,
            updatedAt: now,
            jobCount: jobs.length,
            errorCount
          }
        }
      }, { merge: true });
    }
    return {
      competitionId,
      clubEntryCount: entriesSnapshot.size,
      skippedClubCount,
      jobCount: jobs.length,
      pdfGeneratedCount,
      pdfReusedCount,
      errorCount,
      mailStatus: backendContext.engagementMailPreparedStatus(),
      errors,
      jobs
    };
  }

  return { prepareEngagementClubRecapEmailJobs };
}

module.exports = { createCompetitionService_prepareEngagementClubRecapEmailJobs };
