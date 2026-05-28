(function () {
  function init(context = {}) {
    const {
      buildPublicResultsIndex,
      compactRaceTitle,
      createFinalistReplacementSpeakerAlert,
      deleteFinalResultAlerts,
      extractPdfLines,
      finalRowKey,
      finalistRowName,
      fixPdfEncoding,
      formatDisplayName,
      importedBirthYear,
      importedSeriesTime,
      isFinalStage,
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
      sexDisplayLabel,
      splitImportedPersonName,
      stampReplacementAnnouncement,
      syncAlertChangesToFirestore,
      syncAlertChangesToFirestoreStrict,
      syncAlertToFirestore,
      window = globalThis.window
    } = context;
    const alerts = new Proxy([], {
      get: (_, prop) => context.alerts?.[prop],
      has: (_, prop) => prop in (context.alerts || []),
      set: (_, prop, value) => {
        const nextAlerts = context.alerts || [];
        nextAlerts[prop] = value;
        context.alerts = nextAlerts;
        return true;
      }
    });
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
    const state = new Proxy({}, {
      get: (_, prop) => context.state?.[prop],
      set: (_, prop, value) => {
        const nextState = context.state || {};
        nextState[prop] = value;
        context.state = nextState;
        return true;
      }
    });

      async function fileToDataUrl(file) {
        return livePalmesResults.fileToDataUrl(file);
      }
      
      async function loadResultPdfData(result) {
        return livePalmesResults.loadResultPdfData(result, {
          collection: resultPdfsCollection(),
          resultPdfPayload
        });
      }
      
      async function resultPdfDataUrl(result) {
        return livePalmesResults.resultPdfDataUrl(result, {
          collection: resultPdfsCollection(),
          resultPdfPayload
        });
      }
      
      async function saveResultPdfPayload(result, pdfDataUrl) {
        return livePalmesResults.saveResultPdfPayload(result, pdfDataUrl, {
          collection: resultPdfsCollection(),
          resultPdfPayload
        });
      }
      
      async function deleteResultPdfPayload(resultId) {
        return livePalmesResults.deleteResultPdfPayload(resultId, {
          collection: resultPdfsCollection(),
          onError: (error) => console.warn("Suppression du PDF résultat séparé impossible", error)
        });
      }
      
      async function migrateResultPdfsOutOfResults(rows = [], options = {}) {
        const force = options.force === true;
        if (context.resultPdfMigrationRunning || (!force && context.resultPdfMigrationAttempted) || (state.role !== "computer" && !force)) return 0;
        const withPdf = rows.filter((result) => result.id && result.pdfDataUrl);
        if (!withPdf.length) return 0;
        const pdfCollection = resultPdfsCollection();
        const resultCollection = resultsCollection();
        if (!pdfCollection || !resultCollection || !window.firebase?.firestore?.FieldValue) return 0;
        context.resultPdfMigrationRunning = true;
        if (!force) context.resultPdfMigrationAttempted = true;
        try {
          for (const result of withPdf) {
            await pdfCollection.doc(result.id).set(JSON.parse(JSON.stringify(resultPdfPayload(result, result.pdfDataUrl))));
            await resultCollection.doc(result.id).update({
              pdfDataUrl: window.firebase.firestore.FieldValue.delete()
            });
          }
          if (options.showStatus !== false) {
            renderDataStatus(`${withPdf.length} PDF résultat déplacé${withPdf.length > 1 ? "s" : ""} hors de la liste principale.`);
          }
          return withPdf.length;
        } finally {
          context.resultPdfMigrationRunning = false;
        }
      }
      
      async function dataUrlToFile(dataUrl, name = "resultat.pdf", type = "application/pdf") {
        return livePalmesResults.dataUrlToFile(dataUrl, name, type);
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
        await publishPublicResultsIndex();
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
        const finalistCount = finalRowsCount(result?.finalists);
        if (!finalistCount) return null;
        const now = new Date().toISOString();
        const alreadyAnnounced = alerts.find((alert) =>
          alert.type === "finalists_announcement" &&
          alert.resultId === result.id &&
          alert.speakerStatus === "done" &&
          alert.speakerAnnouncedAt
        );
        if (alreadyAnnounced) {
          if (!result.finalistsAnnouncedAt) {
            await stampFinalistsAnnouncement(result, alreadyAnnounced.speakerAnnouncedAt);
          }
          return alreadyAnnounced;
        }
        alerts
          .filter((alert) => alert.type === "finalists_announcement" && alert.resultId === result.id && alert.speakerStatus === "pending")
          .forEach((alert) => {
            alert.speakerStatus = "none";
            alert.updatedAt = now;
            syncAlertToFirestore(alert);
          });
        const alert = {
          id: `finalists-${result.id}`,
          type: "finalists_announcement",
          roleSource: "computer",
          resultId: result.id,
          eventId: result.eventId,
          eventLabel: result.eventLabel,
          sex: result.sex,
          sexLabel: result.sexLabel,
          session: result.session || "",
          startTime: result.startTime || "",
          finalistCount,
          finalists: result.finalists || { a: [], b: [] },
          nextUnqualified: result.nextUnqualified || [],
          requiresVideo: false,
          videoStatus: "none",
          speakerStatus: "pending",
          informaticsStatus: "none",
          createdAt: now,
          updatedAt: now
        };
        alerts.unshift(alert);
        saveAlerts();
        await syncAlertToFirestore(alert);
        return alert;
      }
      
      async function stampFinalistsAnnouncement(result, announcedAt) {
        if (!result?.id || !announcedAt) return false;
        const collection = resultsCollection();
        if (!collection) return false;
        await collection.doc(result.id).set({
          finalistsAnnouncedAt: announcedAt,
          status: "published",
          updatedAt: announcedAt
        }, { merge: true });
        const index = raceResults.findIndex((item) => item.id === result.id);
        if (index !== -1) {
          raceResults[index] = {
            ...raceResults[index],
            finalistsAnnouncedAt: announcedAt,
            status: "published",
            updatedAt: announcedAt
          };
        }
        await publishPublicResultsIndex({ silent: true });
        return true;
      }
      
      async function ensurePendingFinalistsSpeakerAlerts() {
        if (context.finalistAlertRepairRunning) return;
        context.finalistAlertRepairRunning = true;
        try {
          for (const result of raceResults.filter((item) => item.hasFinal && finalRowsCount(item.finalists) > 0 && !item.finalistsAnnouncedAt)) {
            const relatedAlerts = alerts.filter((alert) => alert.type === "finalists_announcement" && alert.resultId === result.id);
            const announcedAlert = relatedAlerts.find((alert) => alert.speakerStatus === "done" && alert.speakerAnnouncedAt);
            if (announcedAlert) {
              await stampFinalistsAnnouncement(result, announcedAlert.speakerAnnouncedAt);
              const now = new Date().toISOString();
              for (const pendingAlert of relatedAlerts.filter((alert) => alert.speakerStatus === "pending")) {
                pendingAlert.speakerStatus = "none";
                pendingAlert.cancelledAt = pendingAlert.cancelledAt || now;
                pendingAlert.updatedAt = now;
                await syncAlertToFirestore(pendingAlert);
              }
              continue;
            }
            if (relatedAlerts.some((alert) => alert.speakerStatus === "pending")) continue;
            await createFinalistsSpeakerAlert(result);
          }
          saveAlerts();
          render();
        } finally {
          context.finalistAlertRepairRunning = false;
        }
      }
      
      function replacementAlertMatches(alert, result, row) {
        if (alert.type !== "finalist_replacement_announcement") return false;
        if (alert.resultId !== result.id) return false;
        if (alert.replacementRowKey && finalRowKey(row) === alert.replacementRowKey) return true;
        const sameName = String(alert.replacementName || "") === finalistRowName(row);
        const sameRank = !alert.replacementRank || String(alert.replacementRank || "") === String(row.rank || "");
        const sameTime = !alert.replacementTime || String(alert.replacementTime || "") === String(row.time || "");
        return sameName && sameRank && (sameTime || alert.speakerStatus === "done");
      }
      
      function replacementAlertKey(alert) {
        return [
          alert.resultId || "",
          alert.replacementRowKey || "",
          alert.replacementRank || "",
          String(alert.replacementName || "").toLocaleUpperCase("fr-FR"),
          alert.replacementTime || ""
        ].join("|");
      }
      
      async function dedupePendingReplacementAlerts() {
        const pending = alerts
          .filter((alert) => alert.type === "finalist_replacement_announcement" && alert.speakerStatus === "pending")
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        const seen = new Set();
        let changed = false;
        const now = new Date().toISOString();
        for (const alert of pending) {
          const key = replacementAlertKey(alert);
          if (!key || !seen.has(key)) {
            seen.add(key);
            continue;
          }
          alert.speakerStatus = "none";
          alert.cancelledAt = alert.cancelledAt || now;
          alert.updatedAt = now;
          changed = true;
          await syncAlertToFirestore(alert);
        }
        if (changed) saveAlerts();
      }
      
      async function ensurePendingReplacementSpeakerAlerts() {
        if (context.replacementAlertRepairRunning) return;
        await dedupePendingReplacementAlerts();
        const missing = [];
        for (const result of raceResults) {
          for (const finalKey of ["a", "b"]) {
            for (const row of (result.finalists?.[finalKey] || [])) {
              if (!row.repechaged || row.repechageAnnouncedAt || row.withdrawnAt) continue;
              const matchingAlerts = alerts.filter((alert) => replacementAlertMatches(alert, result, row));
              const announcedAlert = matchingAlerts.find((alert) => alert.speakerStatus === "done" && alert.speakerAnnouncedAt);
              if (announcedAlert) {
                await stampReplacementAnnouncement(result, row, announcedAlert.speakerAnnouncedAt);
                const now = new Date().toISOString();
                for (const pendingAlert of matchingAlerts.filter((alert) => alert.speakerStatus === "pending")) {
                  pendingAlert.speakerStatus = "none";
                  pendingAlert.cancelledAt = pendingAlert.cancelledAt || now;
                  pendingAlert.updatedAt = now;
                  await syncAlertToFirestore(pendingAlert);
                }
                continue;
              }
              const existing = matchingAlerts.find((alert) => alert.speakerStatus === "pending");
              if (!existing || existing.speakerStatus !== "pending") {
                missing.push({ result, row });
              }
            }
          }
        }
        if (!missing.length) return;
        context.replacementAlertRepairRunning = true;
        try {
          for (const item of missing) {
            const withdrawn = {
              displayName: item.row.replacesName || item.row.withdrawnName || "un finaliste",
              name: item.row.replacesName || item.row.withdrawnName || "un finaliste"
            };
            await createFinalistReplacementSpeakerAlert(item.result, withdrawn, item.row);
          }
          saveAlerts();
          render();
        } finally {
          context.replacementAlertRepairRunning = false;
        }
      }
      
      async function publishFinalistsAfterSpeaker(alertId) {
        const alert = alerts.find((item) => item.id === alertId);
        const now = new Date().toISOString();
        const changes = { speakerStatus: "done", speakerAnnouncedAt: now, updatedAt: now };
        await syncAlertChangesToFirestoreStrict(alertId, changes);
        markSpeakerAlertDoneLocally(alertId, now);
        if (!alert?.resultId) {
          return;
        }
        const collection = resultsCollection();
        if (!collection) {
          const error = new Error("Firebase n'est pas disponible pour publier les finalistes.");
          throw markAlertAlreadyClosedError(error);
        }
        const resultRef = collection.doc(alert.resultId);
        try {
          await resultRef.update({
            finalistsAnnouncedAt: now,
            status: "published",
            updatedAt: now
          });
        } catch (error) {
          if (/not.?found|no document|missing/i.test(String(error?.message || error))) {
            await deleteFinalResultAlerts(alert.resultId);
            return;
          }
          throw markAlertAlreadyClosedError(error);
        }
        try {
          const resultSnapshot = await resultRef.get({ source: "server" });
          const updatedResult = resultSnapshot.exists
            ? resultWithoutPdf({ id: resultSnapshot.id, ...resultSnapshot.data() })
            : null;
          const index = raceResults.findIndex((result) => result.id === alert.resultId);
          if (updatedResult) {
            context.raceResults = [
              updatedResult,
              ...raceResults.filter((result) => result.id !== alert.resultId)
            ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
          } else if (index !== -1) {
            raceResults[index] = {
              ...raceResults[index],
              finalistsAnnouncedAt: now,
              status: "published",
              updatedAt: now
            };
          }
          await publishPublicResultsIndex({ strict: true });
        } catch (error) {
          throw markAlertAlreadyClosedError(error);
        }
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
