// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailAttachments(backendContext) {
  async function engagementMailAttachments(job = {}) {
    const attachments = [];
    for (const attachment of Array.isArray(job.attachments) ? job.attachments : []) {
      const storagePath = backendContext.cleanText(attachment.storagePath);
      if (!storagePath) continue;
      const buffer = await backendContext.readStoredEngagementClubRecapPdf({ storagePath });
      if (!buffer?.length) continue;
      if (attachment.sha256 && (buffer.length !== attachment.size || backendContext.crypto.createHash('sha256').update(buffer).digest('hex') !== attachment.sha256))
        throw new TypeError('Pièce jointe différente du document préparé.');
      attachments.push({
        filename: backendContext.cleanText(attachment.fileName) || "document-livepalmes.pdf",
        content: buffer,
        contentType: backendContext.cleanText(attachment.contentType) || "application/pdf"
      });
    }
    return attachments;
  }

  return { engagementMailAttachments };
}

module.exports = { createMailService_engagementMailAttachments };
