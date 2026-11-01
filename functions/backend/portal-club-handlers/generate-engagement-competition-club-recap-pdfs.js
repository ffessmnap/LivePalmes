// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_generateEngagementCompetitionClubRecapPdfs(backendContext) {
  async function generateEngagementCompetitionClubRecapPdfs(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result = await backendContext.nativeAdminCompetitionEntries(context, competitionId);
      const files = [], entries = [];
      let bytes = 0, skippedCount = 0;
      for (const entry of result.entries) {
        if (!entry.teamLeaderComplete || !backendContext.engagementClubEntryHasParticipants(entry)) { skippedCount++; continue; }
        const { buffer } = await backendContext.buildEngagementClubRecapPdf(result.competition, entry);
        if (!Buffer.isBuffer(buffer)) throw new backendContext.HttpsError("internal", "PDF indisponible.");
        bytes += buffer.length;
        if (bytes > 7000000) throw new backendContext.HttpsError("resource-exhausted", "ZIP trop volumineux : télécharger les PDF individuellement.");
        files.push({ name: `club-${entry.clubId}.pdf`, buffer });
        entries.push(backendContext.engagementCompetitionEntrySummaryItem(entry));
      }
      const buffer = backendContext.clubRecapZip(files);
      return { ok: true, source: "nap", competitionId, entryCount: result.entries.length,
        generatedCount: files.length, reusedCount: 0, skippedCount, errorCount: 0, errors: [], entries,
        fileName: `recapitulatifs-${competitionId}.zip`, contentType: "application/zip",
        zipBase64: buffer.toString("base64"), sqlBudget: result.sqlBudget };
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    let generatedCount = 0;
    let reusedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    const entries = [];
    for (const entryDoc of entriesSnapshot.docs) {
      const entry = backendContext.engagementClubEntryItem(entryDoc);
      if (!entry.clubId || !entry.teamLeaderComplete || !backendContext.engagementClubEntryHasParticipants(entry)) {
        skippedCount += 1;
        continue;
      }
      try {
        const result = await backendContext.getOrCreateEngagementClubRecapPdf(competition, entryDoc, {
          force: request.data?.force === true
        });
        if (result.fromStorage) reusedCount += 1;
        else generatedCount += 1;
        entries.push(backendContext.engagementCompetitionEntrySummaryItem({
          ...entry,
          documents: {
            ...(entry.documents || {}),
            clubRecapPdf: result.document
          }
        }));
      } catch (error) {
        errorCount += 1;
        errors.push({
          clubId: entry.clubId,
          clubName: entry.clubName,
          message: backendContext.cleanText(error?.message || String(error)).slice(0, 220)
        });
        console.warn("engagement recap pdf generation failed", {
          competitionId,
          clubId: entry.clubId,
          message: error?.message || String(error)
        });
      }
    }
    await backendContext.writeAuditLog("engagementCompetition.clubRecapPdfsGenerated", context.uid, {
      competitionId,
      entryCount: entriesSnapshot.size,
      generatedCount,
      reusedCount,
      skippedCount,
      errorCount
    });
    return {
      ok: true,
      competitionId,
      entryCount: entriesSnapshot.size,
      generatedCount,
      reusedCount,
      skippedCount,
      errorCount,
      errors,
      entries
    };
  }

  return { generateEngagementCompetitionClubRecapPdfs };
}

module.exports = { createClubHandlers_generateEngagementCompetitionClubRecapPdfs };
