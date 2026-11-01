// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_engagementCalendarEventDetailItem(backendContext) {
  function engagementCalendarEventDetailItem(doc, options = {}) {
    const data = doc?.data ? doc.data() || {} : doc || {};
    const id = backendContext.cleanText(doc?.id || options.id).slice(0, 128);
    return {
      ...(0, backendContext.local$engagementCalendarEventCalendarItem)(data, id),
      programSessions: backendContext.cleanPublicCalendarProgram(data.programSessions || []),
      clubDocuments: backendContext.cleanCompetitionDocuments(data.clubDocuments || [], {
        includeUploader: options.includeDocumentUploader === true
      }),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      createdBy: options.includeDocumentUploader === true ? backendContext.cleanText(data.createdBy).slice(0, 128) : ""
    };
  }

  return { engagementCalendarEventDetailItem };
}

module.exports = { createCompetitionModelService_engagementCalendarEventDetailItem };
