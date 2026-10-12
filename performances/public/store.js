(function attachPerformanceStore(global) {
  function ensureFirebase() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig || {};
    if (!firebase?.initializeApp || !firebase?.functions) return null;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return firebase;
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data || {}));
  }

  function completeData(data) {
    return global.LivePalmesRecordPlaceholders?.completeData
      ? global.LivePalmesRecordPlaceholders.completeData(data)
      : data;
  }

  let napRevision = null;
  let pendingNapPublication = null;
  function usesNap() { return global.LivePalmesEnvironment?.sportingDataSource === "nap"; }
  async function napCall(name, input) {
    const firebase = ensureFirebase();
    if (!firebase?.functions) throw new Error("Connexion serveur Records/MPF indisponible.");
    const result = await firebase.app().functions(global.LivePalmesEnvironment.functionsRegion || "europe-west1").httpsCallable(name)(input || {});
    if (result.data?.source !== "nap" || !Number.isSafeInteger(result.data.revision) || !result.data.data) throw new Error("Réponse Records/MPF NAP invalide.");
    return result.data;
  }
  async function loadNapRecords(options) {
    let result;
    if (options?.administration === true) result = await napCall("getNapPerformanceAdministration", { recordsAction: "read" });
    else {
      const url = new URL(global.LivePalmesEnvironment.napReaderUrl);
      url.searchParams.set("action", "records");
      const response = await fetch(url.href, { cache: "no-store" });
      if (!response.ok) throw new Error("Consultation Records/MPF NAP indisponible.");
      result = await response.json();
      if (result.source !== "nap" || !Number.isSafeInteger(result.revision) || !result.data) throw new Error("Référence Records/MPF NAP invalide.");
    }
    if (options?.administration === true) { napRevision = result.revision; pendingNapPublication = null; }
    return completeData(result.data);
  }

  async function loadData(options = {}) {
    if (!usesNap()) throw new Error("Source Records/MPF NAP requise.");
    return loadNapRecords(options);
  }

  async function saveData(nextData) {
    if (!usesNap()) throw new Error("Source Records/MPF NAP requise.");
    if (!Number.isSafeInteger(napRevision)) throw new Error("Rechargez les Records/MPF avant publication.");
    const data = cloneData(completeData(cloneData(nextData)));
    const sportingContent = value => JSON.stringify([value.records, value.franceRecords, value.filters, value.cutoffDate, value.generatedAt]);
    if (pendingNapPublication && sportingContent(pendingNapPublication.data) !== sportingContent(data)) throw new Error("Une publication reste à vérifier. Rechargez avant de modifier le brouillon.");
    if (!pendingNapPublication) pendingNapPublication = { expectedRevision: napRevision, operationId: global.crypto.randomUUID(), data };
    const result = await napCall("savePerformanceCorrection", { ...pendingNapPublication, recordsAction: "publish" });
    napRevision = result.revision;
    pendingNapPublication = null;
    global.LIVEPALMES_RECORDS = result.data;
    global.dispatchEvent(new CustomEvent("livepalmes:performance-data-updated", { detail: result.data }));
    return result.data;
  }

  global.LivePalmesPerformanceStore = {
    loadData,
    saveData
  };
})(window);
