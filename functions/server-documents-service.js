// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createDocumentsService(backendContext) {
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
    const clubRecapPdf = cleanEngagementDocumentMetadata(documents.clubRecapPdf || {});
    const officialsPdf = cleanEngagementDocumentMetadata(documents.officialsPdf || {});
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

  function engagementCompetitionEntrySummaryId(competitionId) {
    return backendContext.stableHash(backendContext.cleanText(competitionId)).slice(0, 40);
  }

  function engagementCompetitionEntrySummaryRef(db, competitionId) {
    return db.collection(backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION)
      .doc(engagementCompetitionEntrySummaryId(competitionId));
  }

  function engagementCompetitionStatisticsCacheRef(db, competitionId) {
    return db.collection(backendContext.ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION)
      .doc(engagementCompetitionEntrySummaryId(competitionId));
  }

  function invalidateEngagementCompetitionStatistics(batch, db, competitionId, now = "") {
    const cleanCompetitionId = backendContext.cleanText(competitionId).slice(0, 128);
    if (!cleanCompetitionId) return;
    batch.set(engagementCompetitionStatisticsCacheRef(db, cleanCompetitionId), {
      competitionId: cleanCompetitionId,
      status: "stale",
      updatedAt: now || new Date().toISOString()
    }, { merge: true });
  }

  function decodeEngagementCompetitionStatisticsCache(data = {}, competition = {}) {
    if (data.status !== "ready" || data.payloadEncoding !== "gzip-base64") return null;
    if (backendContext.cleanText(data.competitionUpdatedAt) !== backendContext.cleanText(competition.updatedAt)) return null;
    const payloadGzip = typeof data.payloadGzip === "string" ? data.payloadGzip : "";
    if (!payloadGzip || payloadGzip.length > 850000) return null;
    try {
      const payload = JSON.parse(backendContext.zlib.gunzipSync(Buffer.from(payloadGzip, "base64"), {
        maxOutputLength: 10 * 1024 * 1024
      }).toString("utf8"));
      if (!payload || typeof payload !== "object" || !payload.counts || !Array.isArray(payload.events) || !Array.isArray(payload.clubs)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function encodeEngagementCompetitionStatisticsCache(payload = {}) {
    try {
      const payloadGzip = backendContext.zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 6 }).toString("base64");
      return payloadGzip.length <= 780000 ? payloadGzip : "";
    } catch {
      return "";
    }
  }

  function engagementCompetitionEntrySummaryItem(entry = {}) {
    const stats = backendContext.engagementPdfEntryStats(entry);
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(entry.id || backendContext.engagementClubEntryId(entry.competitionId, entry.clubId)).slice(0, 180),
      competitionId: backendContext.cleanText(entry.competitionId).slice(0, 128),
      clubId: backendContext.cleanText(entry.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
      clubName: backendContext.engagementClubName(entry.clubId, entry.clubName || "Club").slice(0, 140),
      regionId: backendContext.cleanText(entry.regionId).slice(0, 80),
      teamLeaderComplete: entry.teamLeaderComplete === true,
      officialCount: Array.isArray(entry.officials) ? entry.officials.length : Math.max(0, Math.trunc(Number(entry.officialCount) || 0)),
      swimmerCount: stats.swimmerCount || Math.max(0, Math.trunc(Number(entry.swimmerCount) || 0)),
      individualCount: stats.individualCount || Math.max(0, Math.trunc(Number(entry.individualCount) || 0)),
      relayCount: stats.relayCount || Math.max(0, Math.trunc(Number(entry.relayCount) || 0)),
      recapPdf: cleanEngagementDocumentMetadata(entry.documents?.clubRecapPdf || {}) || undefined,
      updatedAt: backendContext.cleanText(entry.updatedAt).slice(0, 40)
    });
  }

  function engagementCompetitionEntrySummariesFromData(data = {}) {
    const entries = data.entries && typeof data.entries === "object" ? data.entries : {};
    return Object.values(entries)
      .map(engagementCompetitionEntrySummaryItem)
      .filter((entry) => entry.clubId && backendContext.engagementClubEntryHasParticipants(entry))
      .sort((left, right) => backendContext.cleanText(left.clubName).localeCompare(backendContext.cleanText(right.clubName), "fr"));
  }

  async function rebuildEngagementCompetitionEntrySummary(db, competitionId) {
    const cleanCompetitionId = backendContext.cleanText(competitionId).slice(0, 128);
    if (!cleanCompetitionId) return [];
    const snapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", cleanCompetitionId)
      .limit(500)
      .get();
    const entries = {};
    snapshot.docs.forEach((doc) => {
      const item = engagementCompetitionEntrySummaryItem(backendContext.engagementClubEntryItem(doc));
      if (item.clubId && backendContext.engagementClubEntryHasParticipants(item)) entries[item.clubId] = item;
    });
    const now = new Date().toISOString();
    await engagementCompetitionEntrySummaryRef(db, cleanCompetitionId).set({
      competitionId: cleanCompetitionId,
      generatedAt: now,
      updatedAt: now,
      entryCount: Object.keys(entries).length,
      entries
    }, { merge: false });
    return engagementCompetitionEntrySummariesFromData({ entries });
  }

  function upsertEngagementCompetitionEntrySummary(batch, db, entry = {}, now = "") {
    const item = engagementCompetitionEntrySummaryItem(entry);
    if (!item.competitionId || !item.clubId) return;
    if (!backendContext.engagementClubEntryHasParticipants(item)) {
      deleteEngagementCompetitionEntrySummary(batch, db, item, now);
      return;
    }
    batch.set(engagementCompetitionEntrySummaryRef(db, item.competitionId), {
      competitionId: item.competitionId,
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      entries: {
        [item.clubId]: item
      }
    }, { merge: true });
  }

  function deleteEngagementCompetitionEntrySummary(batch, db, entry = {}, now = "") {
    const competitionId = backendContext.cleanText(entry.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(entry.clubId).slice(0, 40);
    if (!competitionId || !clubId) return;
    batch.set(engagementCompetitionEntrySummaryRef(db, competitionId), {
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      entries: {
        [clubId]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  function upsertEngagementClubCompetitionIndex(batch, db, entry = {}, now = "") {
    const competitionId = backendContext.cleanText(entry.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(entry.clubId).slice(0, 40);
    if (!competitionId || !clubId) return;
    batch.set(backendContext.engagementClubCompetitionIndexRef(db, clubId), {
      clubId,
      generatedAt: now || new Date().toISOString(),
      updatedAt: now || new Date().toISOString(),
      competitionIds: {
        [backendContext.engagementClubCompetitionIndexKey(competitionId)]: competitionId
      }
    }, { merge: true });
  }

  function deleteEngagementClubCompetitionIndexEntry(batch, db, entry = {}, now = "") {
    const competitionId = backendContext.cleanText(entry.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(entry.clubId).slice(0, 40);
    if (!competitionId || !clubId) return;
    batch.set(backendContext.engagementClubCompetitionIndexRef(db, clubId), {
      updatedAt: now || new Date().toISOString(),
      competitionIds: {
        [backendContext.engagementClubCompetitionIndexKey(competitionId)]: backendContext.FieldValue.delete()
      }
    }, { merge: true });
  }

  async function syncEngagementCompetitionEntrySummaryFromChange(event = {}) {
    const before = event.data?.before?.exists ? backendContext.engagementClubEntryItem(event.data.before) : null;
    const after = event.data?.after?.exists ? backendContext.engagementClubEntryItem(event.data.after) : null;
    const now = new Date().toISOString();
    const batch = backendContext.db.batch();
    let batchSize = 0;
    const summaryPatches = new Map();
    const clubIndexPatches = new Map();
    const entryMoved = before?.competitionId && before?.clubId && (
      !after || before.competitionId !== after.competitionId || before.clubId !== after.clubId
    );
    const summaryPatch = (competitionId) => {
      if (!summaryPatches.has(competitionId)) summaryPatches.set(competitionId, {});
      return summaryPatches.get(competitionId);
    };
    const clubIndexPatch = (clubId) => {
      if (!clubIndexPatches.has(clubId)) clubIndexPatches.set(clubId, {});
      return clubIndexPatches.get(clubId);
    };
    if (entryMoved) {
      summaryPatch(before.competitionId)[before.clubId] = backendContext.FieldValue.delete();
      clubIndexPatch(before.clubId)[backendContext.engagementClubCompetitionIndexKey(before.competitionId)] = backendContext.FieldValue.delete();
    }
    if (after?.competitionId && after?.clubId) {
      const item = engagementCompetitionEntrySummaryItem(after);
      summaryPatch(after.competitionId)[after.clubId] = backendContext.engagementClubEntryHasParticipants(item)
        ? item
        : backendContext.FieldValue.delete();
      clubIndexPatch(after.clubId)[backendContext.engagementClubCompetitionIndexKey(after.competitionId)] = after.competitionId;
    }
    summaryPatches.forEach((entries, competitionId) => {
      batch.set(engagementCompetitionEntrySummaryRef(backendContext.db, competitionId), {
        competitionId,
        generatedAt: now,
        updatedAt: now,
        entries
      }, { merge: true });
      batchSize += 1;
    });
    clubIndexPatches.forEach((competitionIds, clubId) => {
      batch.set(backendContext.engagementClubCompetitionIndexRef(backendContext.db, clubId), {
        clubId,
        generatedAt: now,
        updatedAt: now,
        competitionIds
      }, { merge: true });
      batchSize += 1;
    });
    const changedCompetitionIds = new Set([before?.competitionId, after?.competitionId].filter(Boolean));
    changedCompetitionIds.forEach((competitionId) => {
      invalidateEngagementCompetitionStatistics(batch, backendContext.db, competitionId, now);
      batchSize += 1;
    });
    if (batchSize) await batch.commit();
  }

  async function readStoredEngagementClubRecapPdf(document = {}) {
    const storagePath = backendContext.cleanText(document.storagePath);
    if (!storagePath) return null;
    const [buffer] = await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).download();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
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
    const document = cleanEngagementDocumentMetadata({
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
        const buffer = await readStoredEngagementClubRecapPdf(existingDocument);
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

  function engagementOfficialsPdfStoragePath(competitionId) {
    return [
      backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX,
      backendContext.engagementPdfFileName(competitionId),
      "officiels",
      "liste-officiels.pdf"
    ].join("/");
  }

  function engagementOfficialsPdfRows(entries = [], birthDatesByPersonId = new Map()) {
    const rows = [];
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      (Array.isArray(entry.officials) ? entry.officials : []).forEach((official) => {
        rows.push({
          club: backendContext.cleanText(entry.clubName) || backendContext.engagementClubCode(entry.clubId, entry.clubCode) || "-",
          clubCode: backendContext.engagementClubCode(entry.clubId, entry.clubCode),
          lastName: backendContext.cleanText(official.lastName).toUpperCase(),
          firstName: backendContext.cleanText(official.firstName),
          birthDate: backendContext.cleanIsoDate(official.birthDate) || backendContext.cleanIsoDate(birthDatesByPersonId.get(backendContext.cleanText(official.personId))),
          licenseNumber: backendContext.cleanText(official.licenseNumber),
          personId: backendContext.cleanText(official.personId)
        });
      });
    });
    if (rows.length > 5000) {
      throw new Error("La liste des officiels depasse la limite de 5 000 lignes pour un PDF.");
    }
    return rows.sort((left, right) =>
      left.club.localeCompare(right.club, "fr", { sensitivity: "base", numeric: true }) ||
      left.lastName.localeCompare(right.lastName, "fr", { sensitivity: "base" }) ||
      left.firstName.localeCompare(right.firstName, "fr", { sensitivity: "base" }) ||
      left.licenseNumber.localeCompare(right.licenseNumber, "fr", { sensitivity: "base", numeric: true })
    );
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
      rows: engagementOfficialsPdfRows(entries, birthDatesByPersonId),
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
    const document = cleanEngagementDocumentMetadata({
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
        const buffer = await readStoredEngagementClubRecapPdf(existingDocument);
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

  function engagementTxtSwimmerCategory(swimmer = {}, competition = {}) {
    return backendContext.ageCategoryFromDates(competition.date, swimmer.birthDate) || "-";
  }

  function buildEngagementCompetitionTxt(competition = {}, entries = [], clubsById = new Map()) {
    const normalizedEntries = entries.map((entry) => ({
      ...entry,
      swimmers: (entry.swimmers || []).map((swimmer) => ({
        ...swimmer,
        category: engagementTxtSwimmerCategory(swimmer, competition)
      }))
    }));
    const result = backendContext.buildWinPalmeCompetitionTxt(competition, normalizedEntries, clubsById);
    return {
      ...result,
      fileName: `engagements-winpalme-${backendContext.engagementPdfFileName(competition.name || competition.id)}.txt`
    };
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
            file: cleanEngagementGeneratedFile(existingDocument),
            generatedFiles: cleanEngagementGeneratedFiles(rawCompetition.generatedFiles || []),
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
      txt = buildEngagementCompetitionTxt(competition, entries, clubsById);
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
    const document = cleanEngagementDocumentMetadata({
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
    const file = cleanEngagementGeneratedFile({
      ...document,
      type: "entriesTxt",
      name: "Export TXT engagements",
      url
    });
    const generatedFiles = [
      file,
      ...cleanEngagementGeneratedFiles(rawCompetition.generatedFiles || []).filter((item) => item.type !== "entriesTxt")
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

  function engagementMailStatusLabel(status) {
    return {
      draft: "Brouillon",
      blocked_missing_config: "Configuration mail manquante",
      ready: "Pret a envoyer",
      sending: "Envoi en cours — ne pas relancer",
      uncertain: "À vérifier — ne pas renvoyer",
      sent: "Envoye",
      failed: "Erreur",
      cancelled_no_participants: "Annule - aucun participant",
      cancelled_notifications_disabled: "Annule - notifications désactivées"
    }[backendContext.cleanText(status)] || "Brouillon";
  }

  function engagementMailSecretValue(secret, envName) {
    try {
      return String(secret.value() || process.env[envName] || "");
    } catch (error) {
      return String(process.env[envName] || "");
    }
  }

  function engagementMailSmtpConfig() {
    const host = backendContext.cleanText(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_HOST, "LIVEPALMES_SMTP_HOST"));
    const port = Number(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_PORT, "LIVEPALMES_SMTP_PORT") || 587);
    const user = backendContext.cleanText(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_USER, "LIVEPALMES_SMTP_USER"));
    const pass = engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_PASS, "LIVEPALMES_SMTP_PASS");
    const secureSetting = backendContext.cleanText(engagementMailSecretValue(backendContext.LIVEPALMES_SMTP_SECURE, "LIVEPALMES_SMTP_SECURE")).toLowerCase();
    const fromEmail = backendContext.normalizeEmail(engagementMailSecretValue(backendContext.LIVEPALMES_MAIL_FROM, "LIVEPALMES_MAIL_FROM") || "livepalmes@nap-ffessm.fr");
    const missing = [];
    if (!host) missing.push("LIVEPALMES_SMTP_HOST");
    if (!Number.isFinite(port) || port <= 0) missing.push("LIVEPALMES_SMTP_PORT");
    if (!user) missing.push("LIVEPALMES_SMTP_USER");
    if (!pass) missing.push("LIVEPALMES_SMTP_PASS");
    if (!fromEmail) missing.push("LIVEPALMES_MAIL_FROM");
    return {
      ready: !missing.length,
      missing,
      transport: {
        host,
        port,
        secure: secureSetting ? secureSetting === "true" : port === 465,
        auth: { user, pass }
      },
      fromEmail
    };
  }

  function engagementMailPreparedStatus() {
    return engagementMailSmtpConfig().ready ? "ready" : "blocked_missing_config";
  }

  return {
    cleanEngagementDocumentMetadata,
    cleanEngagementGeneratedFile,
    cleanEngagementGeneratedFiles,
    engagementCompetitionDocumentsMetadata,
    engagementClubRecapPdfStoragePath,
    engagementClubRecapPdfSourceHash,
    engagementCompetitionEntrySummaryId,
    engagementCompetitionEntrySummaryRef,
    engagementCompetitionStatisticsCacheRef,
    invalidateEngagementCompetitionStatistics,
    decodeEngagementCompetitionStatisticsCache,
    encodeEngagementCompetitionStatisticsCache,
    engagementCompetitionEntrySummaryItem,
    engagementCompetitionEntrySummariesFromData,
    rebuildEngagementCompetitionEntrySummary,
    upsertEngagementCompetitionEntrySummary,
    deleteEngagementCompetitionEntrySummary,
    upsertEngagementClubCompetitionIndex,
    deleteEngagementClubCompetitionIndexEntry,
    syncEngagementCompetitionEntrySummaryFromChange,
    readStoredEngagementClubRecapPdf,
    saveEngagementClubRecapPdfDocument,
    getOrCreateEngagementClubRecapPdf,
    engagementOfficialsPdfStoragePath,
    engagementOfficialsPdfRows,
    resolveEngagementOfficialsPdfRows,
    engagementOfficialsPdfSourceHash,
    saveEngagementOfficialsPdfDocument,
    getOrCreateEngagementOfficialsPdf,
    engagementTxtStoragePath,
    engagementTxtDownloadUrl,
    engagementTxtSourceHash,
    engagementTxtSwimmerCategory,
    buildEngagementCompetitionTxt,
    readStoredEngagementTxt,
    getOrCreateEngagementCompetitionTxt,
    engagementMailStatusLabel,
    engagementMailSecretValue,
    engagementMailSmtpConfig,
    engagementMailPreparedStatus
  };
}

module.exports = { createDocumentsService };
