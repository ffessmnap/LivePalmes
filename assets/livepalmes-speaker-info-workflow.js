(function () {
  function init(context = {}) {
    const {
      appendImportHistory,
      applyFreshData,
      document,
      ensureConsoleWriteAccess,
      eventSignature,
      fixPdfEncoding,
      formatPersonNameParts,
      importedEventId,
      importedSeriesTime,
      livePalmesSpeakerInfo,
      normalizeClubMatch,
      normalizeData,
      normalizePdfLabel,
      normalizePersonName,
      publishLiveDataToFirestore,
      renderDataStatus,
      sameCategory,
      seedSourceLookupKeys,
      shouldKeepRecord,
      SPEAKER_INFO_SHEETS,
      SPEAKER_SHEET_ID,
      timeToMs,
      window
    } = context;
    const getData = () => context.data || {};

    function speakerInfoOptions() {
      return {
        data: getData(),
        eventSignature,
        fixPdfEncoding,
        formatPersonNameParts,
        importedEventId,
        importedSeriesTime,
        normalizeClubMatch,
        normalizePdfLabel,
        normalizePersonName,
        sameCategory,
        seedSourceLookupKeys,
        shouldKeepRecord,
        speakerSheetId: SPEAKER_SHEET_ID,
        timeToMs
      };
    }

    function fetchSpeakerSheetRows(sheetName) { return livePalmesSpeakerInfo.fetchSpeakerSheetRows(sheetName, speakerInfoOptions()); }

    async function fetchOptionalSpeakerSheetRows(sheetName) {
      try {
        return await fetchSpeakerSheetRows(sheetName);
      } catch {
        return [];
      }
    }

    function parseTopSheet(rows) { return livePalmesSpeakerInfo.parseTopSheet(rows, speakerInfoOptions()); }

    function parseRecordsSheet(rows) { return livePalmesSpeakerInfo.parseRecordsSheet(rows, speakerInfoOptions()); }

    function parseEdfSheet(rows) { return livePalmesSpeakerInfo.parseEdfSheet(rows, speakerInfoOptions()); }

    function parseCompetitionStatsSheet(rows) { return livePalmesSpeakerInfo.parseCompetitionStatsSheet(rows, speakerInfoOptions()); }

    function parseInternationalSheet(rows) { return livePalmesSpeakerInfo.parseInternationalSheet(rows, speakerInfoOptions()); }

    function parseQualificationsSheet(rows) { return livePalmesSpeakerInfo.parseQualificationsSheet(rows, speakerInfoOptions()); }

    function parseClubSheet(rows) { return livePalmesSpeakerInfo.parseClubSheet(rows, speakerInfoOptions()); }

    function parseSwimmerInfosSheet(rows) { return livePalmesSpeakerInfo.parseSwimmerInfosSheet(rows, speakerInfoOptions()); }

    function parseSeedSourceSheet(rows) { return livePalmesSpeakerInfo.parseSeedSourceSheet(rows, speakerInfoOptions()); }

    function sheetSex(value) { return livePalmesSpeakerInfo.sheetSex(value, speakerInfoOptions()); }

    function seedSourceTimeKey(value) { return livePalmesSpeakerInfo.seedSourceTimeKey(value, speakerInfoOptions()); }

    function applySpeakerInfoToEntrants(entrants, seedSources, clubs) {
      return livePalmesSpeakerInfo.applySpeakerInfoToEntrants(entrants, seedSources, clubs, speakerInfoOptions());
    }

    async function updateSpeakerInfoFromGoogleSheet() {
      const buttons = [
        document.querySelector("#updateSpeakerInfoBtn"),
        document.querySelector("#updateSpeakerInfoPanelBtn")
      ].filter(Boolean);
      const setButtons = (disabled, label) => {
        buttons.forEach((button) => {
          button.disabled = disabled;
          button.textContent = label;
        });
      };
      setButtons(true, "Mise \u00e0 jour...");
      renderDataStatus("Mise \u00e0 jour des infos speaker depuis Google Sheets...");
      try {
        const [
          franceRows,
          recordRows,
          edfRows,
          internationalRows,
          qualificationRows,
          clubRows,
          seedRows,
          competitionStatRows,
          swimmerInfoRows
        ] = await Promise.all([
          fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.france),
          fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.records),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.edf),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.international),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.qualifications),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.clubs),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.seedSources),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.competitionStats),
          fetchOptionalSpeakerSheetRows(SPEAKER_INFO_SHEETS.swimmerInfos)
        ]);
        const data = getData();
        const clubs = parseClubSheet(clubRows);
        const seedSources = parseSeedSourceSheet(seedRows);
        const entrantsWithSpeakerInfo = applySpeakerInfoToEntrants(data.entrants || [], seedSources, clubs);
        const attachedSeedSources = entrantsWithSpeakerInfo.filter((entrant) => entrant.seedSource).length;
        const parsedRecords = parseRecordsSheet(recordRows);
        let nextData = normalizeData({
          ...data,
          top2025: parseTopSheet(franceRows),
          records: parsedRecords,
          edfMembers: parseEdfSheet(edfRows),
          internationalMedals: parseInternationalSheet(internationalRows),
          competitionStats: parseCompetitionStatsSheet(competitionStatRows),
          swimmerInfos: parseSwimmerInfosSheet(swimmerInfoRows),
          qualifications: parseQualificationsSheet(qualificationRows),
          entrants: entrantsWithSpeakerInfo,
          sourceVersion: `speaker-info-${Date.now()}`,
          notes: {
            ...(data.notes || {}),
            sourceMode: data.notes?.sourceMode || "series-live",
            speakerInfoSource: "Google Sheets",
            speakerInfoUpdatedAt: new Date().toLocaleString("fr-FR"),
            importHistory: appendImportHistory(data.notes || {}, "infos speaker Google Sheet")
          }
        });
        if (parsedRecords.length && !nextData.records.length) {
          nextData = { ...nextData, records: parsedRecords };
        }
        applyFreshData(nextData, false);
        if (typeof ensureConsoleWriteAccess === "function" && !await ensureConsoleWriteAccess()) {
          throw new Error("Connexion Firebase console requise pour publier les repères.");
        }
        await publishLiveDataToFirestore(nextData, "Infos speaker Google Sheets");
        window.alert(`Infos speaker mises \u00e0 jour : ${nextData.top2025.length} lignes France N-1, ${nextData.records.length} records, ${nextData.qualifications.length} qualifs, ${nextData.edfMembers.length} membres EDF, ${nextData.internationalMedals.length} rep\u00e8res internationaux, ${nextData.competitionStats.length} stats comp\u00e9tition, ${nextData.swimmerInfos.length} infos nageurs, ${attachedSeedSources} lieux rattach\u00e9s aux engag\u00e9s (${seedSources.size} rep\u00e8res trouv\u00e9s).`);
      } catch (error) {
        console.error(error);
        renderDataStatus(`Impossible de lire le Google Sheet : ${error?.message || error}`);
        window.alert(`Mise \u00e0 jour impossible : ${error?.message || error}. V\u00e9rifie que le Google Sheet est partag\u00e9 en lecture avec le lien.`);
      } finally {
        setButtons(false, "MAJ rep\u00e8res");
      }
    }

    return {
      speakerInfoOptions,
      fetchSpeakerSheetRows,
      parseTopSheet,
      parseRecordsSheet,
      parseEdfSheet,
      parseCompetitionStatsSheet,
      parseInternationalSheet,
      parseQualificationsSheet,
      parseClubSheet,
      parseSwimmerInfosSheet,
      parseSeedSourceSheet,
      sheetSex,
      seedSourceTimeKey,
      applySpeakerInfoToEntrants,
      updateSpeakerInfoFromGoogleSheet
    };
  }

  window.LivePalmesSpeakerInfoWorkflow = { init };
})();
