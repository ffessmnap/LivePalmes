// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_deleteEngagementCompetitionDocument(backendContext) {
  async function deleteEngagementCompetitionDocument(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.mutateNativeCompetitionDocument(request,"delete");
    const { context, competitionId, calendarEventId, sourceType, ref } = await backendContext.engagementCompetitionDocumentContext(request);
    const documentId = backendContext.cleanText(request.data?.documentId).slice(0, 80);
    if (!documentId) throw new backendContext.HttpsError("invalid-argument", "Document requis.");
    const now = new Date().toISOString();
    let deletedDocument = null;
    let updatedDocuments = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(ref);
      if (!currentSnapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition d'engagements introuvable.");
      backendContext.assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
      backendContext.assertCanDeleteEngagementDocument(context, currentSnapshot.data() || {});
      const documents = backendContext.cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
      deletedDocument = documents.find((document) => document.id === documentId) || null;
      if (!deletedDocument) throw new backendContext.HttpsError("not-found", "Document introuvable.");
      updatedDocuments = documents.filter((document) => document.id !== documentId);
      transaction.update(ref, {
        clubDocuments: updatedDocuments,
        documentsUpdatedAt: now,
        documentsUpdatedBy: context.uid
      });
    });
    let storageDeleted = true;
    if (backendContext.hasManagedEngagementCompetitionDocumentStorage(deletedDocument)) {
      try {
        await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET)
          .file(backendContext.assertEngagementCompetitionDocumentPath(deletedDocument.storagePath))
          .delete({ ignoreNotFound: true });
      } catch (_) {
        storageDeleted = false;
      }
    }
    await backendContext.writeAuditLog(`${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentDeleted`, context.uid, {
      competitionId,
      calendarEventId,
      documentId,
      title: deletedDocument.title,
      fileName: deletedDocument.fileName,
      storageDeleted
    });
    return { ok: true, competitionId, calendarEventId, documentId, documents: updatedDocuments, storageDeleted };
  }

  return { deleteEngagementCompetitionDocument };
}

module.exports = { createCompetitionHandlers_deleteEngagementCompetitionDocument };
