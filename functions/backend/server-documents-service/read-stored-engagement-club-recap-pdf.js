// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_readStoredEngagementClubRecapPdf(backendContext) {
  async function readStoredEngagementClubRecapPdf(document = {}) {
    const storagePath = backendContext.cleanText(document.storagePath);
    if (!storagePath) return null;
    const [buffer] = await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).download();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  return { readStoredEngagementClubRecapPdf };
}

module.exports = { createDocumentsService_readStoredEngagementClubRecapPdf };
