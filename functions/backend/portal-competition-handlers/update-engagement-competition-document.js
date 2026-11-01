// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_updateEngagementCompetitionDocument(backendContext) {
  async function updateEngagementCompetitionDocument(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.mutateNativeCompetitionDocument(request,"update");
    const { context, competitionId, calendarEventId, sourceType, ref } = await backendContext.engagementCompetitionDocumentContext(request);
    const documentId = backendContext.cleanText(request.data?.documentId).slice(0, 80);
    if (!documentId) throw new backendContext.HttpsError("invalid-argument", "Document requis.");
    const now = new Date().toISOString();
    let updatedDocuments = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(ref);
      if (!currentSnapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition d'engagements introuvable.");
      backendContext.assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
      const documents = backendContext.cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
      const index = documents.findIndex((document) => document.id === documentId);
      if (index < 0) throw new backendContext.HttpsError("not-found", "Document introuvable.");
      let input;
      try {
        input = backendContext.cleanCompetitionDocumentInput({ ...request.data, fileName: documents[index].fileName });
      } catch (error) {
        throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error).slice(0, 220));
      }
      documents[index] = { ...documents[index], ...input, updatedAt: now };
      updatedDocuments = backendContext.cleanCompetitionDocuments(documents, { includeUploader: true });
      transaction.update(ref, {
        clubDocuments: updatedDocuments,
        documentsUpdatedAt: now,
        documentsUpdatedBy: context.uid
      });
    });
    await backendContext.writeAuditLog(`${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentUpdated`, context.uid, {
      competitionId,
      calendarEventId,
      documentId,
      title: updatedDocuments.find((document) => document.id === documentId)?.title || ""
    });
    return { ok: true, competitionId, calendarEventId, documentId, documents: updatedDocuments };
  }

  return { updateEngagementCompetitionDocument };
}

module.exports = { createCompetitionHandlers_updateEngagementCompetitionDocument };
