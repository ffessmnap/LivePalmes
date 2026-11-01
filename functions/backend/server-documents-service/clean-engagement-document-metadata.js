// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_cleanEngagementDocumentMetadata(backendContext) {
  function cleanEngagementDocumentMetadata(raw = {}) {
    const storagePath = backendContext.cleanText(raw.storagePath).slice(0, 260);
    const status = backendContext.cleanText(raw.status);
    if (!storagePath && status !== "generated") return null;
    return backendContext.cleanFirestoreValue({
      status: status === "generated" ? "generated" : "pending",
      type: backendContext.cleanText(raw.type || "clubRecapPdf").slice(0, 60),
      fileName: backendContext.cleanText(raw.fileName).slice(0, 180),
      contentType: backendContext.cleanText(raw.contentType || "application/pdf").slice(0, 80),
      storagePath,
      size: Math.max(0, Math.trunc(Number(raw.size) || 0)),
      generatedAt: backendContext.cleanText(raw.generatedAt).slice(0, 40),
      sourceUpdatedAt: backendContext.cleanText(raw.sourceUpdatedAt).slice(0, 40),
      sourceHash: backendContext.cleanText(raw.sourceHash).slice(0, 80),
      competitionId: backendContext.cleanText(raw.competitionId).slice(0, 128),
      clubId: backendContext.cleanText(raw.clubId).slice(0, 40)
    });
  }

  return { cleanEngagementDocumentMetadata };
}

module.exports = { createDocumentsService_cleanEngagementDocumentMetadata };
