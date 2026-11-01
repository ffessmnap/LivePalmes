// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementClubRecapPdfSourceHash(backendContext) {
  function engagementClubRecapPdfStoragePath(competitionId, clubId) {
    return [
      backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
      backendContext.engagementPdfFileName(competitionId),
      "clubs",
      backendContext.engagementPdfFileName(clubId),
      "recap.pdf"
    ].join("/");
  }

  function engagementClubRecapPdfSourceHash(competition = {}, entry = {}) {
    return backendContext.stableHash(JSON.stringify({
      relayCategoryLabelVersion: 2,
      registeredSwimmersLayoutVersion: 1,
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        endDate: competition.endDate,
        location: competition.location,
        level: competition.level,
        regionId: competition.regionId,
        poolLength: competition.poolLength,
        poolLaneCount: competition.poolLaneCount,
        timingType: competition.timingType,
        entryDeadlineAt: competition.entryDeadlineAt,
        teamLeadersWhatsAppUrl: backendContext.cleanPublicCalendarWhatsAppUrl(competition.teamLeadersWhatsAppUrl),
        fees: competition.fees
      },
      entry: {
        clubId: entry.clubId,
        clubName: entry.clubName,
        regionId: entry.regionId,
        teamLeader: entry.teamLeader,
        officials: entry.officials,
        swimmers: entry.swimmers,
        relays: entry.relays,
        updatedAt: entry.updatedAt
      }
    }));
  }

  function upsertEngagementCompetitionEntrySummary(batch, db, entry = {}, now = "") {
    const item = (0, backendContext.local$engagementCompetitionEntrySummaryItem)(entry);
    if (!item.competitionId || !item.clubId) return;
    if (!backendContext.engagementClubEntryHasParticipants(item)) {
      (0, backendContext.local$deleteEngagementCompetitionEntrySummary)(batch, db, item, now);
      return;
    }
    batch.set((0, backendContext.local$engagementCompetitionEntrySummaryRef)(db, item.competitionId), {
      competitionId: item.competitionId,
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      entries: {
        [item.clubId]: item
      }
    }, { merge: true });
  }

  async function saveEngagementClubRecapPdfDocument(competition = {}, entry = {}, pdf = {}, sourceHash = "") {
    const generatedAt = backendContext.cleanText(pdf.generatedAt) || new Date().toISOString();
    const storagePath = engagementClubRecapPdfStoragePath(competition.id || entry.competitionId, entry.clubId);
    const fileName = backendContext.cleanText(pdf.fileName) || "recap-engagements-livepalmes.pdf";
    const buffer = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer || []);
    await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(buffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
        metadata: {
          competitionId: backendContext.cleanText(competition.id || entry.competitionId).slice(0, 128),
          clubId: backendContext.cleanText(entry.clubId).slice(0, 40),
          generatedAt,
          sourceHash: backendContext.cleanText(sourceHash).slice(0, 80)
        }
      }
    });
    const document = (0, backendContext.local$cleanEngagementDocumentMetadata)({
      status: "generated",
      type: "clubRecapPdf",
      fileName,
      contentType: "application/pdf",
      storagePath,
      size: buffer.length,
      generatedAt,
      sourceUpdatedAt: entry.updatedAt,
      sourceHash,
      competitionId: competition.id || entry.competitionId,
      clubId: entry.clubId
    });
    const summaryEntry = {
      ...entry,
      documents: {
        ...(entry.documents || {}),
        clubRecapPdf: document
      }
    };
    const batch = backendContext.db.batch();
    batch.set(backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(entry.competitionId, entry.clubId)), {
      documents: {
        clubRecapPdf: document
      }
    }, { merge: true });
    batch.set(backendContext.db.collection("engagementCompetitions").doc(entry.competitionId), {
      documents: {
        clubRecapPdf: {
          status: "generated",
          generatedAt,
          updatedAt: generatedAt
        }
      }
    }, { merge: true });
    upsertEngagementCompetitionEntrySummary(batch, backendContext.db, summaryEntry, generatedAt);
    await batch.commit();
    return document;
  }

  async function getOrCreateEngagementClubRecapPdf(competitionSnapshot, entrySnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    if (competition.qualificationJobId) throw new backendContext.HttpsError("failed-precondition", "Attendez la fin du contrôle des qualifications avant de générer les documents.");
    const entry = backendContext.engagementClubEntryItem(entrySnapshot);
    if (!backendContext.engagementClubEntryHasParticipants(entry)) {
      throw new backendContext.HttpsError("failed-precondition", "Aucun nageur, officiel ou relais engage pour ce club.");
    }
    const sourceHash = engagementClubRecapPdfSourceHash(competition, entry);
    const existingDocument = entry.documents?.clubRecapPdf || null;
    if (options.force !== true && existingDocument?.storagePath && existingDocument.sourceHash === sourceHash) {
      try {
        const buffer = await (0, backendContext.local$readStoredEngagementClubRecapPdf)(existingDocument);
        if (buffer?.length) {
          return {
            buffer,
            generatedAt: existingDocument.generatedAt,
            fileName: existingDocument.fileName || "recap-engagements-livepalmes.pdf",
            document: existingDocument,
            fromStorage: true
          };
        }
      } catch (error) {
        console.warn("engagement recap pdf storage read failed", {
          competitionId: entry.competitionId,
          clubId: entry.clubId,
          storagePath: existingDocument.storagePath,
          message: error?.message || String(error)
        });
      }
    }
    const pdf = await backendContext.buildEngagementClubRecapPdf(competition, entry);
    const document = await saveEngagementClubRecapPdfDocument(competition, entry, pdf, sourceHash);
    return {
      ...pdf,
      document,
      fromStorage: false
    };
  }

  return { engagementClubRecapPdfStoragePath, engagementClubRecapPdfSourceHash, upsertEngagementCompetitionEntrySummary, saveEngagementClubRecapPdfDocument, getOrCreateEngagementClubRecapPdf };
}

module.exports = { createDocumentsService_engagementClubRecapPdfSourceHash };
