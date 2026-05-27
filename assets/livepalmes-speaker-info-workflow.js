(function () {
  function init(context = {}) {
    with (context) {
      function speakerInfoOptions() {
        return {
          data,
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
      
      function applySpeakerInfoToEntrants(entrants, seedSources, clubs) { return livePalmesSpeakerInfo.applySpeakerInfoToEntrants(entrants, seedSources, clubs, speakerInfoOptions()); }
      
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
        setButtons(true, "Mise à jour...");
        renderDataStatus("Mise à jour des infos speaker depuis Google Sheets...");
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
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.edf),
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.international),
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.qualifications),
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.clubs),
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.seedSources),
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.competitionStats),
            fetchSpeakerSheetRows(SPEAKER_INFO_SHEETS.swimmerInfos).catch(() => [])
          ]);
          const clubs = parseClubSheet(clubRows);
          const seedSources = parseSeedSourceSheet(seedRows);
          const entrantsWithSpeakerInfo = applySpeakerInfoToEntrants(data.entrants || [], seedSources, clubs);
          const attachedSeedSources = entrantsWithSpeakerInfo.filter((entrant) => entrant.seedSource).length;
          const nextData = normalizeData({
            ...data,
            top2025: parseTopSheet(franceRows),
            records: parseRecordsSheet(recordRows),
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
          applyFreshData(nextData, false);
          await publishLiveDataToFirestore(nextData, "Infos speaker Google Sheets");
          window.alert(`Infos speaker mises à jour : ${nextData.top2025.length} lignes France N-1, ${nextData.records.length} records, ${nextData.qualifications.length} qualifs, ${nextData.edfMembers.length} membres EDF, ${nextData.internationalMedals.length} repères internationaux, ${nextData.competitionStats.length} stats compétition, ${nextData.swimmerInfos.length} infos nageurs, ${attachedSeedSources} lieux rattachés aux engagés (${seedSources.size} repères trouvés).`);
        } catch (error) {
          console.error(error);
          renderDataStatus(`Impossible de lire le Google Sheet : ${error?.message || error}`);
          window.alert(`Mise à jour impossible : ${error?.message || error}. Vérifie que le Google Sheet est partagé en lecture avec le lien.`);
        } finally {
          setButtons(false, "MAJ repères");
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
  }

  window.LivePalmesSpeakerInfoWorkflow = { init };
})();
