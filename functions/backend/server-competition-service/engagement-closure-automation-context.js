// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_engagementClosureAutomationContext(backendContext) {
  async function prepareEngagementTxtEmailJob(db, competitionSnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const competitionId = backendContext.cleanText(competition.id).slice(0, 128);
    if (backendContext.cleanEngagementCompetitionType(competition.competitionType) === "openWater") {
      return {
        competitionId,
        entryCount: 0,
        jobCount: 0,
        errorCount: 0,
        generatedAt: "",
        skippedReason: "open_water_export_pending",
        errors: [],
        generatedFiles: backendContext.cleanEngagementGeneratedFiles(competition.generatedFiles || [])
      };
    }
    const computerEmail = backendContext.normalizeEmail(competition.computerEmail);
    const now = new Date().toISOString();
    if (!computerEmail) {
      return {
        competitionId,
        jobCount: 0,
        errorCount: 1,
        errors: [{
          message: "Email du responsable informatique non renseigne."
        }],
        generatedFiles: backendContext.cleanEngagementGeneratedFiles(competition.generatedFiles || [])
      };
    }
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const txt = await backendContext.getOrCreateEngagementCompetitionTxt(competitionSnapshot, entriesSnapshot.docs, {
      force: options.forceTxt === true
    });
    const job = await backendContext.upsertEngagementMailJob({
      type: "entries_txt",
      competitionId,
      competitionName: competition.name,
      clubId: "informatique",
      clubName: "Informatique competition",
      regionId: competition.regionId,
      toEmail: computerEmail,
      toName: "Responsable informatique",
      subject: backendContext.engagementTxtMailSubject(competition),
      text: backendContext.engagementTxtMailText(competition, txt),
      attachments: [{
        type: "entriesTxt",
        fileName: txt.document?.fileName || txt.fileName,
        contentType: "text/plain; charset=utf-8",
        storagePath: txt.document?.storagePath
      }]
    }, now);
    await db.collection("engagementCompetitions").doc(competitionId).set({
      documents: {
        entriesTxt: {
          status: "generated",
          generatedAt: txt.generatedAt,
          updatedAt: now,
          jobCount: job ? 1 : 0
        }
      }
    }, { merge: true });
    return {
      competitionId,
      entryCount: txt.entryCount,
      jobCount: job ? 1 : 0,
      errorCount: 0,
      mailStatus: backendContext.engagementMailPreparedStatus(),
      generatedAt: txt.generatedAt,
      generatedFiles: txt.generatedFiles,
      txtFileName: txt.fileName,
      txtFromStorage: txt.fromStorage,
      jobs: job ? [job] : []
    };
  }

  async function prepareEngagementOfficialsEmailJob(db, competitionSnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const competitionId = backendContext.cleanText(competition.id).slice(0, 128);
    if (competition.officialsRequired !== true) {
      return {
        competitionId,
        jobCount: 0,
        errorCount: 0,
        officialCount: 0,
        personLookupReadCount: 0,
        skippedReason: "officials_not_required"
      };
    }
    const officialsManagerEmail = backendContext.normalizeEmail(competition.officialsManagerEmail);
    if (!officialsManagerEmail) {
      return {
        competitionId,
        jobCount: 0,
        errorCount: 1,
        officialCount: 0,
        personLookupReadCount: 0,
        errors: [{ message: "Email du responsable juge non renseigne." }]
      };
    }
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const pdf = await backendContext.getOrCreateEngagementOfficialsPdf(db, competitionSnapshot, entriesSnapshot.docs, {
      force: options.forcePdf === true
    });
    const now = new Date().toISOString();
    const job = await backendContext.upsertEngagementMailJob({
      type: "officials_pdf",
      competitionId,
      competitionName: competition.name,
      clubId: "jury",
      clubName: "Jury compétition",
      regionId: competition.regionId,
      toEmail: officialsManagerEmail,
      toName: "Responsable juge",
      subject: backendContext.engagementOfficialsMailSubject(competition),
      text: backendContext.engagementOfficialsMailText(competition, pdf),
      attachments: [{
        type: "officialsPdf",
        fileName: pdf.document?.fileName || pdf.fileName,
        contentType: "application/pdf",
        storagePath: pdf.document?.storagePath
      }]
    }, now);
    await db.collection("engagementCompetitions").doc(competitionId).set({
      documents: {
        officialsEmail: {
          status: "generated",
          generatedAt: pdf.generatedAt,
          updatedAt: now,
          jobCount: job ? 1 : 0
        }
      }
    }, { merge: true });
    return {
      competitionId,
      jobCount: job ? 1 : 0,
      errorCount: 0,
      officialCount: pdf.officialCount,
      personLookupReadCount: pdf.personLookupReadCount,
      mailStatus: backendContext.engagementMailPreparedStatus(),
      generatedAt: pdf.generatedAt,
      pdfFileName: pdf.fileName,
      pdfFromStorage: pdf.fromStorage,
      jobs: job ? [job] : []
    };
  }

  function engagementClosureAutomationContext() {
    return {
      uid: "system:engagementClosureScheduler",
      email: "livepalmes@nap-ffessm.fr",
      national: true,
      region: true,
      regionId: ""
    };
  }

  async function reserveEngagementCompetitionClosure(db, competitionRef, now) {
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(competitionRef);
      if (!snapshot.exists) {
        return { reserved: false, reason: "not-found" };
      }
      const data = snapshot.data() || {};
      if (data.qualificationJobId) return { reserved: false, reason: "qualification-control" };
      const entryStatus = backendContext.cleanEngagementEntryStatus(data.entryStatus || data.status);
      const deadline = backendContext.cleanIsoDateTime(data.entryDeadlineAt);
      if (entryStatus !== "open") {
        return { reserved: false, reason: "not-open" };
      }
      if (!deadline || deadline > now) {
        return { reserved: false, reason: "deadline-not-reached" };
      }
      transaction.set(competitionRef, {
        entryStatus: "closed",
        closureAutomationStatus: "processing",
        closureAutomationStartedAt: now,
        closureAutomationLastAttemptAt: now,
        closureAutomationAttemptCount: backendContext.FieldValue.increment(1),
        updatedAt: now,
        updatedBy: "system:engagementClosureScheduler"
      }, { merge: true });
      return {
        reserved: true,
        competition: backendContext.engagementCompetitionDetailItem({
          id: snapshot.id,
          data: () => ({ ...data, entryStatus: "closed" })
        })
      };
    });
  }

  async function processEngagementCompetitionAutomaticClosure(db, competitionSnapshot, now) {
    const context = engagementClosureAutomationContext();
    const competitionRef = competitionSnapshot.ref;
    const reservation = await reserveEngagementCompetitionClosure(db, competitionRef, now);
    if (!reservation.reserved) {
      return {
        competitionId: competitionSnapshot.id,
        skipped: true,
        reason: reservation.reason
      };
    }
    const closedSnapshot = await competitionRef.get();
    try {
      const preparation = await (0, backendContext.local$prepareEngagementClubRecapEmailJobs)(db, closedSnapshot, {
        forcePdf: false
      });
      const txtPreparation = await prepareEngagementTxtEmailJob(db, closedSnapshot, {
        forceTxt: false
      });
      const officialsPreparation = await prepareEngagementOfficialsEmailJob(db, closedSnapshot, {
        forcePdf: false
      });
      const sendResult = preparation.jobCount
        ? await (0, backendContext.local$sendEngagementPreparedEmailJobs)(db, closedSnapshot, context, {
            type: "club_recap_pdf",
            limit: 500
          })
        : {
            competitionId: closedSnapshot.id,
            attemptedCount: 0,
            sentCount: 0,
            errorCount: 0,
            jobs: []
          };
      const txtSendResult = txtPreparation.jobCount
        ? await (0, backendContext.local$sendEngagementPreparedEmailJobs)(db, closedSnapshot, context, {
            type: "entries_txt",
            limit: 10
          })
        : {
            competitionId: closedSnapshot.id,
            attemptedCount: 0,
            sentCount: 0,
            errorCount: 0,
            jobs: []
          };
      const officialsSendResult = officialsPreparation.jobCount
        ? await (0, backendContext.local$sendEngagementPreparedEmailJobs)(db, closedSnapshot, context, {
            type: "officials_pdf",
            limit: 10
          })
        : {
            competitionId: closedSnapshot.id,
            attemptedCount: 0,
            sentCount: 0,
            errorCount: 0,
            jobs: []
          };
      const completedAt = new Date().toISOString();
      const status = preparation.errorCount || txtPreparation.errorCount || officialsPreparation.errorCount || sendResult.errorCount || txtSendResult.errorCount || officialsSendResult.errorCount
        ? "completed_with_errors"
        : "completed";
      await competitionRef.set({
        closureAutomationStatus: status,
        closureAutomationCompletedAt: completedAt,
        closureRecapEmailsPreparedAt: preparation.jobCount ? completedAt : "",
        closureRecapEmailsSentAt: sendResult.attemptedCount ? completedAt : "",
        closureAutomationSummary: backendContext.cleanFirestoreValue({
          clubEntryCount: preparation.clubEntryCount,
          skippedClubCount: preparation.skippedClubCount,
          jobCount: preparation.jobCount,
          pdfGeneratedCount: preparation.pdfGeneratedCount,
          pdfReusedCount: preparation.pdfReusedCount,
          txtGeneratedCount: txtPreparation.generatedAt ? 1 : 0,
          txtMailJobCount: txtPreparation.jobCount,
          officialsPdfGeneratedCount: officialsPreparation.generatedAt ? 1 : 0,
          officialsMailJobCount: officialsPreparation.jobCount,
          officialCount: officialsPreparation.officialCount,
          officialsPersonLookupReadCount: officialsPreparation.personLookupReadCount,
          prepareErrorCount: Number(preparation.errorCount || 0) + Number(txtPreparation.errorCount || 0) + Number(officialsPreparation.errorCount || 0),
          attemptedMailCount: Number(sendResult.attemptedCount || 0) + Number(txtSendResult.attemptedCount || 0) + Number(officialsSendResult.attemptedCount || 0),
          sentMailCount: Number(sendResult.sentCount || 0) + Number(txtSendResult.sentCount || 0) + Number(officialsSendResult.sentCount || 0),
          sendErrorCount: Number(sendResult.errorCount || 0) + Number(txtSendResult.errorCount || 0) + Number(officialsSendResult.errorCount || 0),
          txtAttemptedMailCount: txtSendResult.attemptedCount,
          txtSentMailCount: txtSendResult.sentCount,
          txtSendErrorCount: txtSendResult.errorCount,
          officialsAttemptedMailCount: officialsSendResult.attemptedCount,
          officialsSentMailCount: officialsSendResult.sentCount,
          officialsSendErrorCount: officialsSendResult.errorCount,
          updatedAt: completedAt
        }),
        updatedAt: completedAt,
        updatedBy: context.uid
      }, { merge: true });
      await backendContext.writeAuditLog("engagementCompetition.closedAutomatically", context.uid, {
        competitionId: closedSnapshot.id,
        closureAutomationStatus: status,
        clubEntryCount: preparation.clubEntryCount,
        skippedClubCount: preparation.skippedClubCount,
        jobCount: preparation.jobCount,
        pdfGeneratedCount: preparation.pdfGeneratedCount,
        pdfReusedCount: preparation.pdfReusedCount,
        txtGeneratedCount: txtPreparation.generatedAt ? 1 : 0,
        txtMailJobCount: txtPreparation.jobCount,
        officialsPdfGeneratedCount: officialsPreparation.generatedAt ? 1 : 0,
        officialsMailJobCount: officialsPreparation.jobCount,
        officialCount: officialsPreparation.officialCount,
        officialsPersonLookupReadCount: officialsPreparation.personLookupReadCount,
        prepareErrorCount: Number(preparation.errorCount || 0) + Number(txtPreparation.errorCount || 0) + Number(officialsPreparation.errorCount || 0),
        attemptedMailCount: Number(sendResult.attemptedCount || 0) + Number(txtSendResult.attemptedCount || 0) + Number(officialsSendResult.attemptedCount || 0),
        sentMailCount: Number(sendResult.sentCount || 0) + Number(txtSendResult.sentCount || 0) + Number(officialsSendResult.sentCount || 0),
        sendErrorCount: Number(sendResult.errorCount || 0) + Number(txtSendResult.errorCount || 0) + Number(officialsSendResult.errorCount || 0),
        txtAttemptedMailCount: txtSendResult.attemptedCount,
        txtSentMailCount: txtSendResult.sentCount,
        txtSendErrorCount: txtSendResult.errorCount,
        officialsAttemptedMailCount: officialsSendResult.attemptedCount,
        officialsSentMailCount: officialsSendResult.sentCount,
        officialsSendErrorCount: officialsSendResult.errorCount
      });
      return {
        competitionId: closedSnapshot.id,
        skipped: false,
        status,
        preparation,
        txtPreparation,
        officialsPreparation,
        sendResult,
        txtSendResult,
        officialsSendResult
      };
    } catch (error) {
      const failedAt = new Date().toISOString();
      await competitionRef.set({
        closureAutomationStatus: "failed",
        closureAutomationFailedAt: failedAt,
        closureAutomationReason: backendContext.cleanText(error?.message || error).slice(0, 220),
        updatedAt: failedAt,
        updatedBy: context.uid
      }, { merge: true });
      await backendContext.writeAuditLog("engagementCompetition.automaticClosureFailed", context.uid, {
        competitionId: closedSnapshot.id,
        message: backendContext.cleanText(error?.message || error).slice(0, 220)
      });
      return {
        competitionId: closedSnapshot.id,
        skipped: false,
        status: "failed",
        error: backendContext.cleanText(error?.message || error).slice(0, 220)
      };
    }
  }

  return { prepareEngagementTxtEmailJob, prepareEngagementOfficialsEmailJob, engagementClosureAutomationContext, reserveEngagementCompetitionClosure, processEngagementCompetitionAutomaticClosure };
}

module.exports = { createCompetitionService_engagementClosureAutomationContext };
