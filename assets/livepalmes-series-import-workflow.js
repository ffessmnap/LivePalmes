(function () {
  function init(context = {}) {
    const {
      appendImportHistory,
      applyFreshData,
      availableSexesForEvent,
      clearHistoryAndAlertsForFullImport,
      clearPublishedResults,
      clearPublicSeriesPdfs,
      eventSignature,
      formatName,
      importedSeriesTime,
      livePalmesPdfImport,
      livePalmesSeriesImport,
      normalizeData,
      normalizePersonName,
      publishLiveDataToFirestore,
      publishPublicResultsIndex,
      publishPublicSeriesPdf,
      renderDataStatus,
      sampleData,
      seedSourceTimeKey,
      window = globalThis.window
    } = context;
    const alerts = new Proxy([], {
      get: (_, prop) => context.alerts?.[prop],
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
      set: (_, prop, value) => {
        const nextResults = context.raceResults || [];
        nextResults[prop] = value;
        context.raceResults = nextResults;
        return true;
      }
    });

      function normalizePdfLabel(value) {
        if (typeof livePalmesPdfImport.normalizePdfLabel === "function") {
          return livePalmesPdfImport.normalizePdfLabel(value);
        }
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
      }
      
      function fixPdfEncoding(value) {
        if (typeof livePalmesPdfImport.fixPdfEncoding === "function") {
          return livePalmesPdfImport.fixPdfEncoding(value);
        }
        return String(value || "");
      }
      
      function importedEventId(label) {
        if (typeof livePalmesPdfImport.importedEventId === "function") {
          return livePalmesPdfImport.importedEventId(label, { events: data.events || [] });
        }
        const normalized = normalizePdfLabel(label);
        const event = data.events.find((item) => normalizePdfLabel(item.label) === normalized);
        return event?.id || "";
      }
      
      function importedEventInfo(eventId, fallbackLabel = "") {
        if (typeof livePalmesPdfImport.importedEventInfo === "function") {
          return livePalmesPdfImport.importedEventInfo(eventId, fallbackLabel, { events: data.events || [] });
        }
        return data.events.find((event) => event.id === eventId) || { id: eventId, label: fallbackLabel || eventId };
      }
      
      function importedCategoryLabel(code) {
        if (typeof livePalmesPdfImport.importedCategoryLabel === "function") {
          return livePalmesPdfImport.importedCategoryLabel(code);
        }
        return String(code || "").toUpperCase();
      }
      
      function importedBirthYear(twoDigits) {
        if (typeof livePalmesPdfImport.importedBirthYear === "function") {
          return livePalmesPdfImport.importedBirthYear(twoDigits);
        }
        return String(twoDigits || "");
      }
      
      function normalizePdfUppercaseEToken(token) {
        if (typeof livePalmesPdfImport.normalizePdfUppercaseEToken === "function") {
          return livePalmesPdfImport.normalizePdfUppercaseEToken(token);
        }
        return String(token || "");
      }
      
      function splitImportedPersonName(value) {
        if (typeof livePalmesPdfImport.splitImportedPersonName === "function") {
          return livePalmesPdfImport.splitImportedPersonName(value);
        }
        return { lastName: String(value || "").trim(), firstName: "" };
      }
      
      function isImportedRelayEvent(eventId) {
        if (typeof livePalmesPdfImport.isImportedRelayEvent === "function") {
          return livePalmesPdfImport.isImportedRelayEvent(eventId);
        }
        return String(eventId || "").includes("x");
      }
      
      function seriesImportOptions() {
        return {
          availableSexesForEvent,
          data,
          eventSignature,
          fixPdfEncoding,
          formatName,
          importedBirthYear,
          importedCategoryLabel,
          importedEventId,
          importedEventInfo,
          importedSeriesTime,
          isImportedRelayEvent,
          normalizePdfLabel,
          normalizePersonName,
          sampleData,
          seedSourceTimeKey,
          splitImportedPersonName
        };
      }
      
      async function extractPdfLines(file) { return livePalmesSeriesImport.extractPdfLines(file, seriesImportOptions()); }
      
      function parseImportedSeriesLines(lines, fileName = "s?ries import?es.pdf") { return livePalmesSeriesImport.parseImportedSeriesLines(lines, fileName, seriesImportOptions()); }
      
      function showPdfImportDebug(parsed, lines) { return livePalmesSeriesImport.showPdfImportDebug(parsed, lines, seriesImportOptions()); }
      
      function prepareImportedSeriesForMode(parsed, mode, forcedSession) { return livePalmesSeriesImport.prepareImportedSeriesForMode(parsed, mode, forcedSession, seriesImportOptions()); }
      
      function seedSourceLookupKeys(row) { return livePalmesSeriesImport.seedSourceLookupKeys(row, seriesImportOptions()); }
      
      function inheritImportedSeedSources(parsed) { return livePalmesSeriesImport.inheritImportedSeedSources(parsed, seriesImportOptions()); }
      
      function mergeImportedSeriesData(parsed, mode = "session") { return livePalmesSeriesImport.mergeImportedSeriesData(parsed, mode, seriesImportOptions()); }
      
      async function importSeriesPdf(file, mode = "session", forcedSession = "") {
        if (!file) return;
        renderDataStatus("Lecture du PDF des séries...");
        try {
          const lines = await extractPdfLines(file);
          const parsedRaw = parseImportedSeriesLines(lines, file.name);
          const parsed = inheritImportedSeedSources(prepareImportedSeriesForMode(parsedRaw, mode, forcedSession));
          if (!parsed.series.length || !parsed.program.length) {
            showPdfImportDebug(parsed, lines);
            renderDataStatus();
            return;
          }
          if (parsed.series.length < 50) {
            const ok = window.confirm(`Je n'ai reconnu que ${parsed.series.length} lignes pour ${parsed.program.length} courses. Ce résultat semble incomplet. Publier quand même ?`);
            if (!ok) {
              renderDataStatus("Import annulé : le PDF n'a pas été reconnu complètement.");
              return;
            }
          }
          const mergedSeriesData = mergeImportedSeriesData(parsed, mode);
          const importedSessions = [...new Set(parsed.program.map((row) => row.session).filter(Boolean))]
            .sort((a, b) => Number(a) - Number(b));
          const updatedSession = mode === "full" ? "" : (forcedSession || importedSessions[0] || "");
          let clearedResultsCount = 0;
          let clearedAlertsCount = 0;
          let archivedHistoryCount = 0;
          let publishedSeriesPdf = null;
          let clearResults = false;
          if (mode === "full") {
            const hasActiveHistory = alerts.length > 0;
            const hasPublishedResults = raceResults.length > 0;
            const confirmFullImport = window.confirm([
              "Tu importes un PDF général de compétition.",
              "",
              "LivePalmes va remplacer tout le programme de la compétition.",
              hasActiveHistory
                ? `Le journal actif sera archivé puis les ${alerts.length} alerte${alerts.length > 1 ? "s" : ""} active${alerts.length > 1 ? "s" : ""} seront supprimées.`
                : "Aucune alerte active à supprimer.",
              hasPublishedResults
                ? `Il y a ${raceResults.length} résultat${raceResults.length > 1 ? "s" : ""} public${raceResults.length > 1 ? "s" : ""} déjà publié${raceResults.length > 1 ? "s" : ""}.`
                : "Aucun résultat public déjà publié.",
              "",
              "Continuer l'import du PDF général ?"
            ].join("\n"));
            if (!confirmFullImport) {
              renderDataStatus("Import PDF général annulé.");
              return;
            }
            if (hasPublishedResults) {
              clearResults = window.confirm([
                "Résultats publics existants",
                "",
                "Veux-tu les archiver puis les supprimer de la page publique ?",
                "Oui : conseillé si tu changes de compétition.",
                "Non : les résultats restent visibles."
              ].join("\n"));
            }
            if (hasActiveHistory) {
              renderDataStatus("Archivage du journal et remise à zéro des alertes...");
              try {
                const historyReset = await clearHistoryAndAlertsForFullImport();
                clearedAlertsCount = historyReset.clearedAlerts;
                archivedHistoryCount = historyReset.archivedCount;
                renderDataStatus("Journal archivé et alertes remises à zéro.");
              } catch (error) {
                console.warn("Archivage/nettoyage du journal refusé par Firebase", error);
                renderDataStatus("Import annulé : Firebase a refusé l'archivage du journal.");
                window.alert([
                  "Import annulé par sécurité.",
                  "",
                  "Le PDF est bien reconnu, mais Firebase a refusé l'archivage du journal ou la suppression des anciennes alertes.",
                  "Il faut publier les dernières règles Firestore depuis le fichier firestore.rules, puis relancer l'import."
                ].join("\n"));
                return;
              }
            }
            if (clearResults) {
              renderDataStatus("Suppression des anciens résultats publics...");
              try {
                clearedResultsCount = await clearPublishedResults();
                renderDataStatus("Anciens résultats publics supprimés.");
              } catch (error) {
                console.warn("Archivage/nettoyage des résultats refusé par Firebase", error);
                renderDataStatus("Import annulé : Firebase a refusé l'archivage des résultats.");
                window.alert([
                  "Import annulé par sécurité.",
                  "",
                  "Le PDF est bien reconnu, mais Firebase a refusé l'archivage ou la suppression des anciens résultats publics.",
                  "Il faut publier les dernières règles Firestore depuis le fichier firestore.rules, puis relancer l'import."
                ].join("\n"));
                return;
              }
            }
          }
          const importHistoryLabel = mode === "full"
            ? `PDF général ${file.name}`
            : `mise à jour S${updatedSession || "?"} ${file.name}`;
          const nextData = normalizeData({
            ...data,
            meet: parsed.meet || data.meet,
            events: mergedSeriesData.events,
            entrants: mergedSeriesData.entrants,
            series: mergedSeriesData.series,
            program: mergedSeriesData.program,
            sourceVersion: `live-${Date.now()}`,
            notes: {
              ...(data.notes || {}),
              sourceMode: "series-live",
              sourceLabel: mode === "full" ? "PDF général importé depuis LivePalmes" : "Session mise à jour depuis LivePalmes",
              sourceFile: parsed.sourceFile,
              seriesLineCount: mergedSeriesData.series.length,
              entrantCount: mergedSeriesData.entrants.length,
              programCount: mergedSeriesData.program.length,
              lastImportedMode: mode === "full" ? "PDF général" : "Mise à jour session",
              lastImportedSessions: importedSessions.join(", "),
              lastUpdatedSession: updatedSession,
              lastUpdatedSessionAt: updatedSession ? new Date().toISOString() : "",
              importHistory: appendImportHistory(data.notes || {}, importHistoryLabel),
              generatedAt: new Date().toLocaleString("fr-FR")
            }
          });
          applyFreshData(nextData, true);
          try {
            if (mode === "full") {
              await clearPublicSeriesPdfs();
            }
            publishedSeriesPdf = await publishPublicSeriesPdf(file, mode, updatedSession);
            await publishLiveDataToFirestore(data, `Import PDF ${file.name}`);
            await publishPublicResultsIndex({ silent: true });
            const sessionList = [...new Set(parsed.program.map((row) => row.session).filter(Boolean))]
              .sort((a, b) => Number(a) - Number(b))
              .map((session) => `S${session}`)
              .join(", ");
            const sessionText = sessionList ? ` Sessions détectées : ${sessionList}.` : "";
            const clearedText = clearedResultsCount ? ` ${clearedResultsCount} résultat${clearedResultsCount > 1 ? "s" : ""} public${clearedResultsCount > 1 ? "s" : ""} supprimé${clearedResultsCount > 1 ? "s" : ""}.` : "";
            const historyText = clearedAlertsCount
              ? ` Journal archivé (${archivedHistoryCount} ligne${archivedHistoryCount > 1 ? "s" : ""}) et ${clearedAlertsCount} alerte${clearedAlertsCount > 1 ? "s" : ""} supprimée${clearedAlertsCount > 1 ? "s" : ""}.`
              : "";
            const publicPdfText = publishedSeriesPdf ? ` PDF public des séries mis à jour.` : "";
            window.alert(`${mode === "full" ? "PDF général publié" : "Session publiée"} : ${parsed.program.length} courses, ${parsed.series.length} lignes.${sessionText}${clearedText}${historyText}${publicPdfText}`);
          } catch {
            window.alert(`Séries chargées sur cet appareil (${parsed.program.length} courses, ${parsed.series.length} lignes), mais Firebase n'a pas accepté la publication. Il faut élargir les règles Firestore pour liveData.`);
          }
        } catch (error) {
          console.error(error);
          const message = String(error?.message || error);
          const isPermissionError = /permission|insufficient/i.test(message);
          window.alert(isPermissionError
            ? [
              "Import impossible : Firebase a refusé l'opération.",
              "",
              "Le problème vient probablement des règles Firestore, pas du PDF.",
              "Publie le contenu du fichier firestore.rules dans Firebase > Firestore Database > Règles, puis réessaie."
            ].join("\n")
            : `Import impossible pour ce PDF : ${message}. On gardera la méthode actuelle si ce format n'est pas reconnu.`);
          renderDataStatus();
        }
      }

      return {
        normalizePdfLabel,
        fixPdfEncoding,
        importedEventId,
        importedEventInfo,
        importedCategoryLabel,
        importedBirthYear,
        normalizePdfUppercaseEToken,
        splitImportedPersonName,
        isImportedRelayEvent,
        seriesImportOptions,
        extractPdfLines,
        parseImportedSeriesLines,
        showPdfImportDebug,
        prepareImportedSeriesForMode,
        seedSourceLookupKeys,
        inheritImportedSeedSources,
        mergeImportedSeriesData,
        importSeriesPdf
      };
  }

  window.LivePalmesSeriesImportWorkflow = { init };
})();
