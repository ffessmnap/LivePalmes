// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_cleanEngagementGeneratedFile(backendContext) {
  function cleanEngagementGeneratedFile(raw = {}) {
    const url = backendContext.cleanText(raw.url).slice(0, 600);
    const storagePath = backendContext.cleanText(raw.storagePath).slice(0, 260);
    if (!url && !storagePath) return null;
    return backendContext.cleanFirestoreValue({
      type: backendContext.cleanText(raw.type || "document").slice(0, 60),
      name: backendContext.cleanText(raw.name || raw.fileName || "Document").slice(0, 180),
      fileName: backendContext.cleanText(raw.fileName || raw.name || "document").slice(0, 180),
      contentType: backendContext.cleanText(raw.contentType || "application/octet-stream").slice(0, 80),
      storagePath,
      url,
      size: Math.max(0, Math.trunc(Number(raw.size) || 0)),
      generatedAt: backendContext.cleanText(raw.generatedAt).slice(0, 40)
    });
  }

  function cleanEngagementGeneratedFiles(rawFiles = []) {
    return (Array.isArray(rawFiles) ? rawFiles : [])
      .map(cleanEngagementGeneratedFile)
      .filter(Boolean)
      .slice(0, 30);
  }

  function engagementCompetitionDocumentsMetadata(raw = {}) {
    const documents = raw && typeof raw === "object" ? raw : {};
    const clubRecapPdf = (0, backendContext.local$cleanEngagementDocumentMetadata)(documents.clubRecapPdf || {});
    const officialsPdf = (0, backendContext.local$cleanEngagementDocumentMetadata)(documents.officialsPdf || {});
    return backendContext.cleanFirestoreValue({
      ...(clubRecapPdf ? { clubRecapPdf } : {}),
      ...(officialsPdf ? { officialsPdf } : {}),
      entriesTxt: documents.entriesTxt && typeof documents.entriesTxt === "object"
        ? {
            status: backendContext.cleanText(documents.entriesTxt.status) === "generated" ? "generated" : backendContext.cleanText(documents.entriesTxt.status) === "sent" ? "sent" : "pending",
            generatedAt: backendContext.cleanText(documents.entriesTxt.generatedAt).slice(0, 40)
          }
        : undefined,
      clubRecapEmails: documents.clubRecapEmails && typeof documents.clubRecapEmails === "object"
        ? {
            status: backendContext.cleanText(documents.clubRecapEmails.status) === "sent" ? "sent" : backendContext.cleanText(documents.clubRecapEmails.status) === "generated" ? "generated" : "pending",
            generatedAt: backendContext.cleanText(documents.clubRecapEmails.generatedAt).slice(0, 40)
          }
        : undefined,
      officialsEmail: documents.officialsEmail && typeof documents.officialsEmail === "object"
        ? {
            status: backendContext.cleanText(documents.officialsEmail.status) === "sent" ? "sent" : backendContext.cleanText(documents.officialsEmail.status) === "generated" ? "generated" : "pending",
            generatedAt: backendContext.cleanText(documents.officialsEmail.generatedAt).slice(0, 40)
          }
        : undefined
    });
  }

  return { cleanEngagementGeneratedFile, cleanEngagementGeneratedFiles, engagementCompetitionDocumentsMetadata };
}

module.exports = { createDocumentsService_cleanEngagementGeneratedFile };
