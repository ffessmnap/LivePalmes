// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementOfficialsPdfSourceHash(backendContext) {
  function engagementOfficialsPdfStoragePath(competitionId) {
    return [
      backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
      backendContext.engagementPdfFileName(competitionId),
      "officiels",
      "liste-officiels.pdf"
    ].join("/");
  }

  async function resolveEngagementOfficialsPdfRows(db, entries = []) {
    const missingPersonIds = Array.from(new Set((Array.isArray(entries) ? entries : []).flatMap((entry) =>
      (Array.isArray(entry.officials) ? entry.officials : [])
        .filter((official) => !backendContext.cleanIsoDate(official.birthDate))
        .map((official) => backendContext.cleanText(official.personId).slice(0, 80))
        .filter(Boolean)
    )));
    if (missingPersonIds.length > 5000) {
      throw new Error("Trop de fiches d'officiels a completer pour generer le PDF.");
    }
    const birthDatesByPersonId = new Map();
    for (let index = 0; index < missingPersonIds.length; index += 200) {
      const personIds = missingPersonIds.slice(index, index + 200);
      const snapshots = await db.getAll(...personIds.map((personId) => db.collection("engagementClubPeople").doc(personId)));
      snapshots.forEach((snapshot) => {
        if (!snapshot.exists) return;
        const birthDate = backendContext.cleanIsoDate(snapshot.data()?.birthDate);
        if (birthDate) birthDatesByPersonId.set(snapshot.id, birthDate);
      });
    }
    return {
      rows: (0, backendContext.local$engagementOfficialsPdfRows)(entries, birthDatesByPersonId),
      personLookupReadCount: missingPersonIds.length
    };
  }

  function engagementOfficialsPdfSourceHash(competition = {}, rows = []) {
    return backendContext.stableHash(JSON.stringify({
      formatVersion: 1,
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        endDate: competition.endDate,
        location: competition.location,
        level: competition.level
      },
      rows
    }));
  }

  async function saveEngagementOfficialsPdfDocument(competition = {}, pdf = {}, sourceHash = "") {
    const generatedAt = backendContext.cleanText(pdf.generatedAt) || new Date().toISOString();
    const storagePath = engagementOfficialsPdfStoragePath(competition.id);
    const buffer = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer || []);
    await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(buffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
        metadata: {
          competitionId: backendContext.cleanText(competition.id).slice(0, 128),
          generatedAt,
          sourceHash: backendContext.cleanText(sourceHash).slice(0, 80)
        }
      }
    });
    const document = (0, backendContext.local$cleanEngagementDocumentMetadata)({
      status: "generated",
      type: "officialsPdf",
      fileName: pdf.fileName,
      contentType: "application/pdf",
      storagePath,
      size: buffer.length,
      generatedAt,
      sourceHash,
      competitionId: competition.id
    });
    await backendContext.db.collection("engagementCompetitions").doc(competition.id).set({
      documents: { officialsPdf: document }
    }, { merge: true });
    return document;
  }

  async function getOrCreateEngagementOfficialsPdf(db, competitionSnapshot, entryDocs = [], options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const entries = entryDocs.map((entryDoc) => backendContext.engagementClubEntryItem(entryDoc));
    const resolved = await resolveEngagementOfficialsPdfRows(db, entries);
    const sourceHash = engagementOfficialsPdfSourceHash(competition, resolved.rows);
    const existingDocument = competition.documents?.officialsPdf || null;
    if (options.force !== true && existingDocument?.storagePath && existingDocument.sourceHash === sourceHash) {
      try {
        const buffer = await (0, backendContext.local$readStoredEngagementClubRecapPdf)(existingDocument);
        if (buffer?.length) {
          return {
            buffer,
            generatedAt: existingDocument.generatedAt,
            officialCount: resolved.rows.length,
            personLookupReadCount: resolved.personLookupReadCount,
            fileName: existingDocument.fileName || "liste-officiels-livepalmes.pdf",
            document: existingDocument,
            fromStorage: true
          };
        }
      } catch (error) {
        console.warn("engagement officials pdf storage read failed", {
          competitionId: competition.id,
          storagePath: existingDocument.storagePath,
          message: error?.message || String(error)
        });
      }
    }
    const pdf = await backendContext.buildEngagementOfficialsPdf(competition, resolved.rows);
    const document = await saveEngagementOfficialsPdfDocument(competition, pdf, sourceHash);
    return {
      ...pdf,
      personLookupReadCount: resolved.personLookupReadCount,
      document,
      fromStorage: false
    };
  }

  return { engagementOfficialsPdfStoragePath, resolveEngagementOfficialsPdfRows, engagementOfficialsPdfSourceHash, saveEngagementOfficialsPdfDocument, getOrCreateEngagementOfficialsPdf };
}

module.exports = { createDocumentsService_engagementOfficialsPdfSourceHash };
