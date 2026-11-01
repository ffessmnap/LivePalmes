// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_competitionImportExistingSummary(backendContext) {
  function competitionImportPreviewPerformance(perf = {}) {
    const swimmerMatch = (0, backendContext.local$resolveIntranapSwimmer)(perf, perf.sex);
    const swimmer = swimmerMatch.swimmer;
    return backendContext.cleanFirestoreValue({
      sourceLine: Number(perf.sourceLine || perf.originSourceLine || 0) || null,
      firstName: backendContext.cleanText(perf.firstName),
      lastName: backendContext.cleanText(perf.lastName),
      birthDate: backendContext.cleanText(perf.birthDate),
      sex: (0, backendContext.local$normalizeCategoryCode)(perf.sex),
      swimmerId: backendContext.cleanText(perf.swimmerId),
      course: backendContext.cleanText(perf.course),
      time: backendContext.cleanText(perf.time),
      intermediateTimes: Array.isArray(perf.intermediateTimes)
        ? perf.intermediateTimes.map((split) => ({ code: backendContext.cleanText(split.code), time: backendContext.cleanText(split.time) }))
        : [],
      categoryCode: backendContext.cleanText(perf.categoryCode),
      club: backendContext.cleanText(perf.club),
      clubName: backendContext.cleanText(perf.clubName),
      date: backendContext.cleanText(perf.date),
      round: backendContext.cleanText(perf.round),
      isIntermediate: perf.isIntermediate === true,
      originCourse: backendContext.cleanText(perf.originCourse),
      duplicateInFile: perf.duplicateInFile === true,
      swimmerMatch: swimmer ? {
        status: "matched",
        method: swimmerMatch.method,
        swimmerId: backendContext.cleanText(swimmer.id),
        name: backendContext.cleanText(swimmer.name) || [backendContext.cleanText(swimmer.firstName), backendContext.cleanText(swimmer.lastName)].filter(Boolean).join(" "),
        birthDate: backendContext.cleanText(swimmer.birthDate),
        sex: (0, backendContext.local$normalizeCategoryCode)(swimmer.sex)
      } : {
        status: "unmatched",
        method: "none"
      }
    });
  }

  function competitionImportExistingSummary(snapshot) {
    if (!snapshot?.exists) return null;
    const data = snapshot.data() || {};
    return backendContext.cleanFirestoreValue({
      importId: snapshot.id,
      status: data.status || "",
      fileName: data.fileName || "",
      fileHash: data.fileHash || "",
      metadata: data.metadata || {},
      summary: data.summary || {},
      importedAt: data.importedAt || "",
      importedByEmail: data.importedByEmail || "",
      publicationStatus: backendContext.importPublicationStatus(data) || "",
      replacementJobId: data.replacementJobId || ""
    });
  }

  async function findExistingCompetitionImport(metadata = {}, excludedImportId = "") {
    const identity = backendContext.competitionImportIdentity(metadata);
    const candidateSnapshots = [];
    const keyedSnapshot = await backendContext.db.collection("performanceImports")
      .where("competitionKey", "==", identity)
      .limit(5)
      .get();
    candidateSnapshots.push(...keyedSnapshot.docs);

    if (!candidateSnapshots.length && backendContext.cleanText(metadata.competitionCode)) {
      const codeSnapshot = await backendContext.db.collection("performanceImports")
        .where("metadata.competitionCode", "==", backendContext.cleanText(metadata.competitionCode))
        .limit(5)
        .get();
      candidateSnapshots.push(...codeSnapshot.docs);
    }

    if (!candidateSnapshots.length && !backendContext.cleanText(metadata.competitionCode) && backendContext.cleanText(metadata.date)) {
      const dateSnapshot = await backendContext.db.collection("performanceImports")
        .where("metadata.date", "==", backendContext.cleanText(metadata.date))
        .limit(20)
        .get();
      candidateSnapshots.push(...dateSnapshot.docs);
    }

    return candidateSnapshots.find((snapshot) => {
      const data = snapshot.data() || {};
      return snapshot.id !== excludedImportId &&
        (0, backendContext.local$activeCompetitionImportData)(data) &&
        backendContext.sameCompetitionImport(data.metadata || {}, metadata);
    }) || null;
  }

  return { competitionImportPreviewPerformance, competitionImportExistingSummary, findExistingCompetitionImport };
}

module.exports = { createImportService_competitionImportExistingSummary };
