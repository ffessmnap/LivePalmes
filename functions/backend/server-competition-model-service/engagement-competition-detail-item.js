// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementCompetitionDetailItem(backendContext) {
  function engagementCompetitionDetailItem(doc, options = {}) {
    const data = doc.data() || {};
    const events = (0, backendContext.local$cleanEngagementCompetitionEvents)(data.events || [], {
      strict: false,
      competitionType: (0, backendContext.local$cleanEngagementCompetitionType)(data.competitionType)
    });
    const closureSummary = data.closureAutomationSummary && typeof data.closureAutomationSummary === "object"
      ? data.closureAutomationSummary
      : {};
    return {
      ...(0, backendContext.local$engagementCompetitionListItem)(doc),
      qualifications: data.qualifications || { enabled: false },
      qualificationVersion: Number(data.qualificationVersion || 0),
      qualificationJobId: backendContext.cleanText(data.qualificationJobId),
      events,
      programSessions: (0, backendContext.local$cleanEngagementProgramSessions)(data.programSessions || [], events, { strict: false }),
      fees: (0, backendContext.local$cleanEngagementFees)(data.fees || {}, { strict: false }),
      clubDocuments: backendContext.cleanCompetitionDocuments(data.clubDocuments || [], {
        includeUploader: options.includeDocumentUploader === true
      }),
      documents: backendContext.engagementCompetitionDocumentsMetadata(data.documents || {}),
      generatedFiles: backendContext.cleanEngagementGeneratedFiles(data.generatedFiles || []),
      closureAutomationStatus: backendContext.cleanText(data.closureAutomationStatus).slice(0, 80),
      closureAutomationStartedAt: backendContext.cleanText(data.closureAutomationStartedAt).slice(0, 40),
      closureAutomationCompletedAt: backendContext.cleanText(data.closureAutomationCompletedAt).slice(0, 40),
      closureAutomationFailedAt: backendContext.cleanText(data.closureAutomationFailedAt).slice(0, 40),
      closureAutomationReason: backendContext.cleanText(data.closureAutomationReason).slice(0, 220),
      closureRecapEmailsPreparedAt: backendContext.cleanText(data.closureRecapEmailsPreparedAt).slice(0, 40),
      closureRecapEmailsSentAt: backendContext.cleanText(data.closureRecapEmailsSentAt).slice(0, 40),
      closureAutomationSummary: {
        clubEntryCount: Math.max(0, Math.trunc(Number(closureSummary.clubEntryCount) || 0)),
        skippedClubCount: Math.max(0, Math.trunc(Number(closureSummary.skippedClubCount) || 0)),
        jobCount: Math.max(0, Math.trunc(Number(closureSummary.jobCount) || 0)),
        pdfGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.pdfGeneratedCount) || 0)),
        pdfReusedCount: Math.max(0, Math.trunc(Number(closureSummary.pdfReusedCount) || 0)),
        txtGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.txtGeneratedCount) || 0)),
        txtMailJobCount: Math.max(0, Math.trunc(Number(closureSummary.txtMailJobCount) || 0)),
        officialsPdfGeneratedCount: Math.max(0, Math.trunc(Number(closureSummary.officialsPdfGeneratedCount) || 0)),
        officialsMailJobCount: Math.max(0, Math.trunc(Number(closureSummary.officialsMailJobCount) || 0)),
        officialCount: Math.max(0, Math.trunc(Number(closureSummary.officialCount) || 0)),
        officialsPersonLookupReadCount: Math.max(0, Math.trunc(Number(closureSummary.officialsPersonLookupReadCount) || 0)),
        prepareErrorCount: Math.max(0, Math.trunc(Number(closureSummary.prepareErrorCount) || 0)),
        attemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.attemptedMailCount) || 0)),
        sentMailCount: Math.max(0, Math.trunc(Number(closureSummary.sentMailCount) || 0)),
        sendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.sendErrorCount) || 0)),
        txtAttemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.txtAttemptedMailCount) || 0)),
        txtSentMailCount: Math.max(0, Math.trunc(Number(closureSummary.txtSentMailCount) || 0)),
        txtSendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.txtSendErrorCount) || 0)),
        officialsAttemptedMailCount: Math.max(0, Math.trunc(Number(closureSummary.officialsAttemptedMailCount) || 0)),
        officialsSentMailCount: Math.max(0, Math.trunc(Number(closureSummary.officialsSentMailCount) || 0)),
        officialsSendErrorCount: Math.max(0, Math.trunc(Number(closureSummary.officialsSendErrorCount) || 0)),
        updatedAt: backendContext.cleanText(closureSummary.updatedAt).slice(0, 40)
      },
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      createdBy: backendContext.cleanText(data.createdBy).slice(0, 128),
      updatedBy: backendContext.cleanText(data.updatedBy).slice(0, 128)
    };
  }

  return { engagementCompetitionDetailItem };
}

module.exports = { createCompetitionModelService_engagementCompetitionDetailItem };
