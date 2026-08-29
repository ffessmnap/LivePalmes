(function attachLivePalmesPdfStorage(global) {
  function functionsService() {
    if (!global.firebase?.functions || !global.firebase.apps?.length) return null;
    try {
      const service = global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
    } catch {
      return null;
    }
  }

  async function storePdf(payload = {}) {
    const functions = functionsService();
    if (!functions?.httpsCallable) throw new Error("Cloud Functions LivePalmes indisponibles.");
    const result = await functions.httpsCallable("storeCompetitionPdf")({
      competitionId: global.LivePalmesAppConfig?.firestoreCompetitionId || "livepalmes-active",
      kind: payload.kind,
      id: payload.id,
      pdfName: payload.pdfName,
      pdfDataUrl: payload.pdfDataUrl
    });
    return result.data || {};
  }

  async function deleteStoredPdf(storagePath) {
    if (!storagePath) return false;
    const functions = functionsService();
    if (!functions?.httpsCallable) return false;
    await functions.httpsCallable("deleteCompetitionPdf")({
      competitionId: global.LivePalmesAppConfig?.firestoreCompetitionId || "livepalmes-active",
      storagePath
    });
    return true;
  }

  function storedPayload(payload = {}, stored = {}) {
    const clean = { ...payload };
    delete clean.pdfDataUrl;
    return {
      ...clean,
      pdfUrl: stored.pdfUrl || "",
      storagePath: stored.storagePath || "",
      pdfSize: Number(stored.pdfSize || clean.pdfSize || 0)
    };
  }

  async function saveDocument({ collection, payload, kind }) {
    if (!collection || !payload?.id) throw new Error("Destination PDF Firebase indisponible.");
    const docRef = collection.doc(payload.id);
    const previousSnapshot = await docRef.get({ source: "server" }).catch(() => null);
    const previousPayload = previousSnapshot?.exists ? (previousSnapshot.data() || {}) : {};
    let nextPayload = payload;
    if (payload.pdfDataUrl) {
      try {
        const stored = await storePdf({ ...payload, kind });
        nextPayload = storedPayload(payload, stored);
      } catch (error) {
        console.warn("Stockage Cloud Storage indisponible, fallback Firestore utilise", error);
      }
    }
    await docRef.set(JSON.parse(JSON.stringify(nextPayload)));
    if (previousPayload.storagePath && previousPayload.storagePath !== nextPayload.storagePath) {
      await deleteStoredPdf(previousPayload.storagePath).catch((error) => {
        console.warn("Nettoyage de l'ancienne version PDF impossible", error);
      });
    }
    return nextPayload;
  }

  async function deleteDocument(docRef, payload = {}) {
    if (!docRef) return false;
    await docRef.delete();
    if (payload.storagePath) {
      await deleteStoredPdf(payload.storagePath).catch((error) => {
        console.warn("Nettoyage du fichier PDF Storage impossible", error);
      });
    }
    return true;
  }

  function pdfSource(payload = {}) {
    return payload.pdfUrl || payload.pdfDataUrl || "";
  }

  global.LivePalmesPdfStorage = {
    deleteDocument,
    deleteStoredPdf,
    pdfSource,
    saveDocument,
    storePdf,
    storedPayload
  };
})(window);
