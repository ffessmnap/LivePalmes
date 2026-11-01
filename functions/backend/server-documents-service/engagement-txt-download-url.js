// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementTxtDownloadUrl(backendContext) {
  function engagementTxtStoragePath(competitionId) {
    return [
      backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
      backendContext.engagementPdfFileName(competitionId),
      "export.txt"
    ].join("/");
  }

  function engagementTxtDownloadUrl(storagePath, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${backendContext.LIVEPALMES_STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
  }

  function engagementTxtSourceHash(competition = {}, entries = [], clubsById = new Map()) {
    return backendContext.stableHash(JSON.stringify({
      format: "winpalme-v2",
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        endDate: competition.endDate,
        location: competition.location,
        level: competition.level,
        regionId: competition.regionId,
        entryDeadlineAt: competition.entryDeadlineAt,
        events: competition.events,
        programSessions: competition.programSessions
      },
      entries: entries.map((entry) => ({
        id: entry.id,
        clubId: entry.clubId,
        clubName: entry.clubName,
        regionId: entry.regionId,
        teamLeader: entry.teamLeader,
        officials: entry.officials,
        swimmers: entry.swimmers,
        relays: entry.relays,
        updatedAt: entry.updatedAt,
        club: clubsById.get(entry.clubId) || null
      }))
    }));
  }

  async function readStoredEngagementTxt(document = {}) {
    const storagePath = backendContext.cleanText(document.storagePath);
    if (!storagePath) return null;
    const [buffer] = await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).download();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  async function getOrCreateEngagementCompetitionTxt(competitionSnapshot, entrySnapshots = [], options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    if (competition.qualificationJobId) throw new backendContext.HttpsError("failed-precondition", "Attendez la fin du contrôle des qualifications avant de générer les documents.");
    const rawCompetition = competitionSnapshot.data() || {};
    const entries = entrySnapshots
      .map((entryDoc) => backendContext.engagementClubEntryItem(entryDoc))
      .filter((entry) => entry.competitionId === competition.id && entry.clubId && backendContext.engagementClubEntryHasParticipants(entry))
      .sort((left, right) => backendContext.cleanText(left.clubName).localeCompare(backendContext.cleanText(right.clubName), "fr"));
    const clubsById = await backendContext.engagementClubsByIds(entries.map((entry) => entry.clubId));
    const sourceHash = engagementTxtSourceHash(competition, entries, clubsById);
    const existingDocument = rawCompetition.documents?.entriesTxt || null;
    if (options.force !== true && existingDocument?.storagePath && existingDocument.sourceHash === sourceHash) {
      try {
        const buffer = await readStoredEngagementTxt(existingDocument);
        if (buffer?.length) {
          return {
            buffer,
            generatedAt: existingDocument.generatedAt,
            fileName: existingDocument.fileName || "export-engagements-livepalmes.txt",
            document: existingDocument,
            file: (0, backendContext.local$cleanEngagementGeneratedFile)(existingDocument),
            generatedFiles: (0, backendContext.local$cleanEngagementGeneratedFiles)(rawCompetition.generatedFiles || []),
            entryCount: entries.length,
            fromStorage: true
          };
        }
      } catch (error) {
        console.warn("engagement txt storage read failed", {
          competitionId: competition.id,
          storagePath: existingDocument.storagePath,
          message: error?.message || String(error)
        });
      }
    }
    let txt;
    try {
      txt = (0, backendContext.local$buildEngagementCompetitionTxt)(competition, entries, clubsById);
    } catch (error) {
      if (error?.code === "missing-club-federal-number") {
        throw new backendContext.HttpsError("failed-precondition", error.message, { warnings: error.warnings || [] });
      }
      throw error;
    }
    const storagePath = engagementTxtStoragePath(competition.id);
    const token = backendContext.crypto.randomUUID();
    await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(txt.buffer, {
      resumable: false,
      contentType: "text/plain; charset=utf-8",
      metadata: {
        cacheControl: "private, max-age=0, no-transform",
        metadata: {
          firebaseStorageDownloadTokens: token,
          competitionId: backendContext.cleanText(competition.id).slice(0, 128),
          generatedAt: txt.generatedAt,
          sourceHash
        }
      }
    });
    const url = engagementTxtDownloadUrl(storagePath, token);
    const document = (0, backendContext.local$cleanEngagementDocumentMetadata)({
      status: "generated",
      type: "entriesTxt",
      fileName: txt.fileName,
      contentType: "text/plain; charset=utf-8",
      storagePath,
      url,
      size: txt.buffer.length,
      generatedAt: txt.generatedAt,
      sourceHash,
      competitionId: competition.id
    });
    const file = (0, backendContext.local$cleanEngagementGeneratedFile)({
      ...document,
      type: "entriesTxt",
      name: "Export TXT engagements",
      url
    });
    const generatedFiles = [
      file,
      ...(0, backendContext.local$cleanEngagementGeneratedFiles)(rawCompetition.generatedFiles || []).filter((item) => item.type !== "entriesTxt")
    ].slice(0, 30);
    await backendContext.db.collection("engagementCompetitions").doc(competition.id).set({
      documents: {
        entriesTxt: {
          ...document,
          url
        }
      },
      generatedFiles,
      updatedAt: txt.generatedAt
    }, { merge: true });
    return {
      ...txt,
      document,
      file,
      generatedFiles,
      entryCount: entries.length,
      fromStorage: false
    };
  }

  return { engagementTxtStoragePath, engagementTxtDownloadUrl, engagementTxtSourceHash, readStoredEngagementTxt, getOrCreateEngagementCompetitionTxt };
}

module.exports = { createDocumentsService_engagementTxtDownloadUrl };
