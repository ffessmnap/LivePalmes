// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_storeCompetitionPdf(backendContext) {
  async function storeCompetitionPdf(request) {
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    await backendContext.assertComputerPdfAccess(request, competitionId);
    const kind = backendContext.cleanText(request.data?.kind);
    const id = backendContext.cleanText(request.data?.id).slice(0, 180);
    const pdfName = backendContext.cleanText(request.data?.pdfName).slice(0, 220) || "document.pdf";
    if (!id) throw new backendContext.HttpsError("invalid-argument", "Identifiant PDF requis.");
    let buffer;
    let storagePath;
    try {
      buffer = backendContext.decodePdfDataUrl(request.data?.pdfDataUrl);
      storagePath = backendContext.publicPdfStoragePath({ competitionId, kind, id, buffer });
    } catch (error) {
      throw new backendContext.HttpsError("invalid-argument", error?.message || "PDF invalide.");
    }
    const bucket = backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET);
    await bucket.file(storagePath).save(buffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        contentDisposition: `inline; filename="${pdfName.replace(/["\r\n]/g, "_")}"`
      }
    });
    return {
      ok: true,
      id,
      kind,
      pdfName,
      pdfSize: buffer.length,
      storagePath,
      pdfUrl: backendContext.publicStorageUrl(backendContext.PUBLIC_PERFORMANCE_BUCKET, storagePath)
    };
  }

  return { storeCompetitionPdf };
}

module.exports = { createPerformanceHandlers_storeCompetitionPdf };
