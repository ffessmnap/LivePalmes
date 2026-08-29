(function () {
  function init(options = {}) {
    const {
      context,
      livePalmesResults,
      renderDataStatus,
      resultPdfPayload,
      resultPdfsCollection,
      resultsCollection,
      window = globalThis.window
    } = options;

    function currentState() {
      return context.state || {};
    }

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
      const collection = resultPdfsCollection();
      const payload = resultPdfPayload(result, pdfDataUrl);
      if (window.LivePalmesPdfStorage?.saveDocument) {
        return window.LivePalmesPdfStorage.saveDocument({ collection, payload, kind: "result" });
      }
      return livePalmesResults.saveResultPdfPayload(result, pdfDataUrl, { collection, resultPdfPayload });
    }

    async function deleteResultPdfPayload(resultId) {
      const collection = resultPdfsCollection();
      const docRef = collection?.doc(resultId);
      if (window.LivePalmesPdfStorage?.deleteDocument && docRef) {
        const snapshot = await docRef.get({ source: "server" }).catch(() => null);
        return window.LivePalmesPdfStorage.deleteDocument(docRef, snapshot?.data?.() || {});
      }
      return livePalmesResults.deleteResultPdfPayload(resultId, { collection,
        onError: (error) => console.warn("Suppression du PDF resultat separe impossible", error) });
    }

    async function migrateResultPdfsOutOfResults(rows = [], options = {}) {
      const force = options.force === true;
      if (context.resultPdfMigrationRunning || (!force && context.resultPdfMigrationAttempted) || (currentState().role !== "computer" && !force)) return 0;
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
          renderDataStatus(`${withPdf.length} PDF resultat deplace${withPdf.length > 1 ? "s" : ""} hors de la liste principale.`);
        }
        return withPdf.length;
      } finally {
        context.resultPdfMigrationRunning = false;
      }
    }

    async function dataUrlToFile(dataUrl, name = "resultat.pdf", type = "application/pdf") {
      return livePalmesResults.dataUrlToFile(dataUrl, name, type);
    }

    return {
      dataUrlToFile,
      deleteResultPdfPayload,
      fileToDataUrl,
      loadResultPdfData,
      migrateResultPdfsOutOfResults,
      resultPdfDataUrl,
      saveResultPdfPayload
    };
  }

  window.LivePalmesResultPdfStorage = { init };
}());
