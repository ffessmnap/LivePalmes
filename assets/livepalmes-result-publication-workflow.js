(function () {
  function init(context = {}) {
    const {
      buildPublicResultsIndex,
      compactRaceTitle,
      createFinalistReplacementSpeakerAlert,
      deleteFinalResultAlerts,
      ensureComputerWriteAccess,
      extractPdfLines,
      finalRowKey,
      finalistRowName,
      fixPdfEncoding,
      formatDisplayName,
      importedBirthYear,
      importedSeriesTime,
      isFinalStage,
      livePalmesResultAlertWorkflow,
      livePalmesResultPdfStorage,
      livePalmesResults,
      markAlertAlreadyClosedError,
      markSpeakerAlertDoneLocally,
      normalizePersonName,
      programKey,
      publishPublicResultsIndex,
      raceOptionKey,
      rebuildFinalistsFromParsedResult,
      render,
      renderDataStatus,
      resultForProgramRow,
      resultIdForProgramRow,
      resultMetadataPayload,
      resultPdfPayload,
      resultPdfsCollection,
      resultPhaseLabelForProgramRow,
      resultsCollection,
      resultWithoutPdf,
      saveAlerts,
      saveData,
      sexDisplayLabel,
      splitImportedPersonName,
      stampReplacementAnnouncement,
      syncAlertChangesToFirestore,
      syncAlertChangesToFirestoreStrict,
      syncAlertToFirestore,
      window = globalThis.window
    } = context;
    const data = new Proxy({}, {
      get: (_, prop) => context.data?.[prop],
      set: (_, prop, value) => {
        const nextData = context.data || {};
        nextData[prop] = value;
        context.data = nextData;
        return true;
      }
    });
    const raceResults = new Proxy([], {
      get: (_, prop) => context.raceResults?.[prop],
      has: (_, prop) => prop in (context.raceResults || []),
      set: (_, prop, value) => {
        const nextResults = context.raceResults || [];
        nextResults[prop] = value;
        context.raceResults = nextResults;
        return true;
      }
    });
    const resultPdfStorage = livePalmesResultPdfStorage.init({
      context,
      livePalmesResults,
      renderDataStatus,
      resultPdfPayload,
      resultPdfsCollection,
      resultsCollection,
      window
    });
    const resultAlertWorkflow = livePalmesResultAlertWorkflow.init({
      ...context,
      createFinalistReplacementSpeakerAlert,
      deleteFinalResultAlerts,
      finalRowKey,
      finalistRowName,
      finalRowsCount,
      markAlertAlreadyClosedError,
      markSpeakerAlertDoneLocally,
      publishPublicResultsIndex,
      render,
      resultWithoutPdf,
      resultsCollection,
      saveAlerts,
      stampReplacementAnnouncement,
      syncAlertChangesToFirestoreStrict,
      syncAlertToFirestore
    });

      function reopenPublicDirectIfDisabled() {
        if (data.notes?.publicDirectDisabled !== true) return;
        context.data = {
          ...context.data,
          notes: {
            ...(context.data?.notes || {}),
            publicDirectDisabled: false
          }
        };
        if (typeof saveData === "function") saveData();
      }

      async function fileToDataUrl(file) {
        return resultPdfStorage.fileToDataUrl(file);
      }
      
      async function loadResultPdfData(result) {
        return resultPdfStorage.loadResultPdfData(result);
      }
      
      async function resultPdfDataUrl(result) {
        return resultPdfStorage.resultPdfDataUrl(result);
      }
      
      async function saveResultPdfPayload(result, pdfDataUrl) {
        return resultPdfStorage.saveResultPdfPayload(result, pdfDataUrl);
      }
      
      async function deleteResultPdfPayload(resultId) {
        return resultPdfStorage.deleteResultPdfPayload(resultId);
      }
      
      async function migrateResultPdfsOutOfResults(rows = [], options = {}) {
        return resultPdfStorage.migrateResultPdfsOutOfResults(rows, options);
      }
      
      async function dataUrlToFile(dataUrl, name = "resultat.pdf", type = "application/pdf") {
        return resultPdfStorage.dataUrlToFile(dataUrl, name, type);
      }
      
      const livePalmesResultParser = window.LivePalmesResultParser;
      
      function resultParserOptions() {
        return {
          fixPdfEncoding,
          finalistRowName,
          formatDisplayName,
          importedBirthYear,
          importedSeriesTime,
          isFinalStage,
          normalizePersonName,
          splitImportedPersonName
        };
      }
      
      function resultParserFunction(name) {
        const fn = livePalmesResultParser?.[name];
        if (typeof fn !== "function") throw new Error(`Module de lecture des resultats indisponible: ${name}`);
        return fn;
      }
      
      function normalizeResultLineText(line) {
        return resultParserFunction("normalizeResultLineText")(line, resultParserOptions());
      }
      
      function parseResultRow(line) {
        return resultParserFunction("parseResultRow")(line, resultParserOptions());
      }
      
      function parseUnrankedResultRow(line) {
        return resultParserFunction("parseUnrankedResultRow")(line, resultParserOptions());
      }
      
      function resultStatusFromText(value) {
        return resultParserFunction("resultStatusFromText")(value, resultParserOptions());
      }
      
      function parseResultStatusRow(line) {
        return resultParserFunction("parseResultStatusRow")(line, resultParserOptions());
      }
      
      function resultImportRowKey(row) {
        return resultParserFunction("resultImportRowKey")(row, resultParserOptions());
      }
      
      function parseFinalistsFromResultLines(lines) {
        return resultParserFunction("parseFinalistsFromResultLines")(lines, resultParserOptions());
      }
      
      function emptyParsedFinals() {
        return resultParserFunction("emptyParsedFinals")();
      }
      
      function resolveParsedFinals(parsedRows, existingResult, options = {}) {
        return resultParserFunction("resolveParsedFinals")(parsedRows, existingResult, {
          ...options,
          rebuildFinalistsFromParsedResult
        });
      }
      
      function shouldPreserveFinalistsOnReread(existingResult) {
        return resultParserFunction("shouldPreserveFinalistsOnReread")(existingResult);
      }
      
      function buildPublishedResult(input) {
        return resultParserFunction("buildPublishedResult")(input);
      }
      
      function finalRowCountsAsFinalist(row) {
        return resultParserFunction("finalRowCountsAsFinalist")(row, resultParserOptions());
      }
      
      function finalRowsCount(finalists = {}) {
        return resultParserFunction("finalRowsCount")(finalists, resultParserOptions());
      }
      
      function performanceStageForResultRow(item, result, row, rowIndex = 0) {
        return resultParserFunction("performanceStageForResultRow")(item, result, row, rowIndex, resultParserOptions());
      }
      
      function resultPerformanceDuplicateKey(item) {
        return resultParserFunction("resultPerformanceDuplicateKey")(item, resultParserOptions());
      }
      
      function resultPerformanceRows(parsedRows, result, row) {
        return resultParserFunction("resultPerformanceRows")(parsedRows, result, row, resultParserOptions());
      }
      
      async function publishResultPdf(file, row, hasFinal, isPartial = false, options = {}) {
        if (typeof ensureComputerWriteAccess === "function" && !await ensureComputerWriteAccess()) {
          throw new Error("Accès bureau des performances requis pour publier dans Firebase.");
        }
        const collection = resultsCollection();
        if (!collection) throw new Error("Firebase n'est pas disponible pour publier ce résultat.");
        const now = new Date().toISOString();
        const event = data.events.find((item) => item.id === row.eventId);
        const existingResult = resultForProgramRow(row);
        const reuseExistingPdf = Boolean(options.reuseExistingPdf && existingResult);
        const pdfDataUrl = reuseExistingPdf ? await resultPdfDataUrl(existingResult) : await fileToDataUrl(file);
        const preserveFinalists = Boolean(options.preserveFinalists && existingResult?.hasFinal);
        const lines = await extractPdfLines(file);
        const parsedRows = parseFinalistsFromResultLines(lines);
        const resolvedFinals = resolveParsedFinals(parsedRows, existingResult, {
          hasFinal,
          now,
          preserveFinalists
        });
        hasFinal = resolvedFinals.hasFinal;
        if (hasFinal && !preserveFinalists && !resolvedFinals.parsedFinals.finalists.a.length) {
          throw new Error("Aucun finaliste détecté dans ce PDF. Vérifie que les lignes contiennent bien la mention finale.");
        }
        const result = buildPublishedResult({
          event,
          existingResult,
          file,
          hasFinal,
          isPartial,
          now,
          parsedFinals: resolvedFinals.parsedFinals || emptyParsedFinals(),
          preserveFinalists,
          preservedFinalState: resolvedFinals.preservedFinalState,
          row,
          values: {
            id: resultIdForProgramRow(row),
            raceKey: raceOptionKey(row.eventId, row.sex),
            programKey: programKey(row),
            sexLabel: sexDisplayLabel(row.sex),
            stage: isFinalStage(row.stage) ? row.stage : "series",
            phaseLabel: resultPhaseLabelForProgramRow(row)
          }
        });
        result.performances = resultPerformanceRows(parsedRows.ranking, result, row);
        await saveResultPdfPayload(result, pdfDataUrl);
        await collection.doc(result.id).set(JSON.parse(JSON.stringify(resultMetadataPayload(result))));
        context.raceResults = [
          resultMetadataPayload(result),
          ...raceResults.filter((item) => item.id !== result.id)
        ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        if (hasFinal && !preserveFinalists) {
          await createFinalistsSpeakerAlert(result);
        }
        reopenPublicDirectIfDisabled();
        await publishPublicResultsIndex({ strict: true });
        return result;
      }
      
      async function rereadPublishedResult(row) {
        const existingResult = resultForProgramRow(row);
        if (!existingResult) {
          throw new Error("Aucun PDF déjà publié à relire pour cette course.");
        }
        const pdfDataUrl = await resultPdfDataUrl(existingResult);
        const file = await dataUrlToFile(pdfDataUrl, existingResult.pdfName || "resultat.pdf");
        const preserveFinalists = shouldPreserveFinalistsOnReread(existingResult);
        return publishResultPdf(file, row, Boolean(existingResult.hasFinal), Boolean(existingResult.isPartial), {
          preserveFinalists,
          reuseExistingPdf: true
        });
      }
      
      async function createFinalistsSpeakerAlert(result) {
        return resultAlertWorkflow.createFinalistsSpeakerAlert(result);
      }
      
      async function stampFinalistsAnnouncement(result, announcedAt) {
        return resultAlertWorkflow.stampFinalistsAnnouncement(result, announcedAt);
      }
      
      async function ensurePendingFinalistsSpeakerAlerts() {
        return resultAlertWorkflow.ensurePendingFinalistsSpeakerAlerts();
      }
      
      function replacementAlertMatches(alert, result, row) {
        return resultAlertWorkflow.replacementAlertMatches(alert, result, row);
      }
      
      function replacementAlertKey(alert) {
        return resultAlertWorkflow.replacementAlertKey(alert);
      }
      
      async function dedupePendingReplacementAlerts() {
        return resultAlertWorkflow.dedupePendingReplacementAlerts();
      }
      
      async function ensurePendingReplacementSpeakerAlerts() {
        return resultAlertWorkflow.ensurePendingReplacementSpeakerAlerts();
      }
      
      async function publishFinalistsAfterSpeaker(alertId) {
        return resultAlertWorkflow.publishFinalistsAfterSpeaker(alertId);
      }

      return {
        fileToDataUrl,
        loadResultPdfData,
        resultPdfDataUrl,
        saveResultPdfPayload,
        deleteResultPdfPayload,
        migrateResultPdfsOutOfResults,
        dataUrlToFile,
        resultParserOptions,
        resultParserFunction,
        normalizeResultLineText,
        parseResultRow,
        parseUnrankedResultRow,
        resultStatusFromText,
        parseResultStatusRow,
        resultImportRowKey,
        parseFinalistsFromResultLines,
        emptyParsedFinals,
        resolveParsedFinals,
        shouldPreserveFinalistsOnReread,
        buildPublishedResult,
        finalRowCountsAsFinalist,
        finalRowsCount,
        performanceStageForResultRow,
        resultPerformanceDuplicateKey,
        resultPerformanceRows,
        publishResultPdf,
        rereadPublishedResult,
        createFinalistsSpeakerAlert,
        stampFinalistsAnnouncement,
        ensurePendingFinalistsSpeakerAlerts,
        replacementAlertMatches,
        replacementAlertKey,
        dedupePendingReplacementAlerts,
        ensurePendingReplacementSpeakerAlerts,
        publishFinalistsAfterSpeaker
      };
  }

  window.LivePalmesResultPublicationWorkflow = { init };
})();
