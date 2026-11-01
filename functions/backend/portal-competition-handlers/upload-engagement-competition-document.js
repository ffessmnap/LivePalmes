// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_uploadEngagementCompetitionDocument(backendContext) {
  async function uploadEngagementCompetitionDocument(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.mutateNativeCompetitionDocument(request,"upload");
    const { context, competitionId, calendarEventId, sourceType, ref, snapshot } = await backendContext.engagementCompetitionDocumentContext(request);
    const requestedDocumentId = backendContext.cleanText(request.data?.documentId).slice(0, 80);
    const initialDocuments = backendContext.cleanCompetitionDocuments(snapshot.data()?.clubDocuments || [], { includeUploader: true });
    const existingDocument = requestedDocumentId
      ? initialDocuments.find((document) => document.id === requestedDocumentId)
      : null;
    if (requestedDocumentId && !existingDocument) {
      throw new backendContext.HttpsError("not-found", "Document à remplacer introuvable.");
    }
    if (!existingDocument && initialDocuments.length >= backendContext.MAX_COMPETITION_DOCUMENTS) {
      throw new backendContext.HttpsError("resource-exhausted", `La compétition contient déjà ${backendContext.MAX_COMPETITION_DOCUMENTS} documents.`);
    }
    let input;
    let decoded;
    try {
      input = backendContext.cleanCompetitionDocumentInput(request.data || {});
      decoded = backendContext.decodeCompetitionDocumentDataUrl(request.data?.fileDataUrl, input.fileName, { national: context.national === true });
    } catch (error) {
      throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error).slice(0, 220));
    }
    const documentId = existingDocument?.id || backendContext.crypto.randomUUID();
    const storagePath = existingDocument?.storagePath || backendContext.competitionDocumentStoragePath({
      competitionId,
      documentId,
      fileName: input.fileName,
      buffer: decoded.buffer
    });
    const token = backendContext.competitionDocumentTokenFromUrl(existingDocument?.url) || backendContext.crypto.randomUUID();
    const bucket = backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET);
    const file = bucket.file(storagePath);
    await file.save(decoded.buffer, {
      resumable: false,
      metadata: {
        contentType: decoded.contentType,
        cacheControl: "public, max-age=300, must-revalidate",
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    const now = new Date().toISOString();
    const document = {
      id: documentId,
      ...input,
      contentType: decoded.contentType,
      storagePath,
      url: backendContext.competitionDocumentDownloadUrl(backendContext.LIVEPALMES_STORAGE_BUCKET, storagePath, token),
      size: decoded.buffer.length,
      uploadedAt: existingDocument?.uploadedAt || now,
      updatedAt: now,
      uploadedBy: backendContext.engagementCompetitionDocumentUploader(context)
    };
    let previousStoragePath = existingDocument?.storagePath || "";
    let updatedDocuments = [];
    try {
      await backendContext.db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(ref);
        if (!currentSnapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition d'engagements introuvable.");
        backendContext.assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
        const currentDocuments = backendContext.cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
        const currentIndex = currentDocuments.findIndex((item) => item.id === documentId);
        if (existingDocument && currentIndex < 0) throw new backendContext.HttpsError("not-found", "Document à remplacer introuvable.");
        if (!existingDocument && currentIndex < 0 && currentDocuments.length >= backendContext.MAX_COMPETITION_DOCUMENTS) {
          throw new backendContext.HttpsError("resource-exhausted", `La compétition contient déjà ${backendContext.MAX_COMPETITION_DOCUMENTS} documents.`);
        }
        if (currentIndex >= 0) {
          previousStoragePath = currentDocuments[currentIndex].storagePath;
          currentDocuments[currentIndex] = document;
        } else {
          currentDocuments.push(document);
        }
        updatedDocuments = backendContext.cleanCompetitionDocuments(currentDocuments, { includeUploader: true });
        transaction.update(ref, {
          clubDocuments: updatedDocuments,
          documentsUpdatedAt: now,
          documentsUpdatedBy: context.uid
        });
      });
    } catch (error) {
      await file.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
    if (backendContext.hasManagedEngagementCompetitionDocumentStorage({ storagePath: previousStoragePath }) && previousStoragePath !== storagePath) {
      await bucket.file(backendContext.assertEngagementCompetitionDocumentPath(previousStoragePath)).delete({ ignoreNotFound: true }).catch(() => undefined);
    }
    await backendContext.writeAuditLog(existingDocument
      ? `${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentReplaced`
      : `${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentUploaded`, context.uid, {
      competitionId,
      calendarEventId,
      documentId,
      title: document.title,
      category: document.category,
      fileName: document.fileName,
      size: document.size
    });
    return {
      ok: true,
      competitionId,
      calendarEventId,
      documentId,
      documents: updatedDocuments
    };
  }

  return { uploadEngagementCompetitionDocument };
}

module.exports = { createCompetitionHandlers_uploadEngagementCompetitionDocument };
