(function attachPerformanceStore(global) {
  const COMPETITION_ID = "livepalmes-active";
  const COLLECTION = "performanceData";
  const DOCUMENT = "records";
  const PUBLIC_PERFORMANCE_BASE = window.LivePalmesEnvironment.publicStorageUrl("performance-public-firestore");

  function ensureFirebase() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig || {};
    if (!firebase?.initializeApp || !firebase?.firestore) return null;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return firebase;
  }

  function documentRef() {
    const firebase = ensureFirebase();
    if (!firebase) return null;
    return firebase.firestore()
      .collection("competitions")
      .doc(COMPETITION_ID)
      .collection(COLLECTION)
      .doc(DOCUMENT);
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data || {}));
  }

  function completeData(data) {
    return global.LivePalmesRecordPlaceholders?.completeData
      ? global.LivePalmesRecordPlaceholders.completeData(data)
      : data;
  }

  function usefulArray(remoteValue, fallbackValue) {
    if (!Array.isArray(remoteValue)) return fallbackValue;
    if (remoteValue.length > 0 || !Array.isArray(fallbackValue) || fallbackValue.length === 0) return remoteValue;
    return fallbackValue;
  }

  function rowMergeKey(row) {
    return String(row?.key || [
      row?.recordType,
      row?.sex,
      row?.category,
      row?.course,
      row?.swimmer,
      row?.time,
      row?.date,
      row?.club
    ].map((value) => String(value || "").trim()).join("|"));
  }

  function rowFallbackSignature(row) {
    return [
      row?.recordType,
      row?.sex,
      row?.category,
      row?.course,
      row?.swimmer,
      row?.time,
      row?.date,
      row?.club
    ].map((value) => String(value || "").trim()).join("|");
  }

  function withFallbackBirthDates(remoteValue, fallbackValue) {
    const rows = usefulArray(remoteValue, fallbackValue);
    if (!Array.isArray(rows) || rows !== remoteValue || !Array.isArray(fallbackValue)) return rows;
    const fallbackByKey = new Map(fallbackValue.map((row) => [rowMergeKey(row), row]));
    const fallbackBySignature = new Map(fallbackValue.map((row) => [rowFallbackSignature(row), row]));
    return rows.map((row) => {
      if (row?.birthDate) return row;
      const fallbackRow = fallbackByKey.get(rowMergeKey(row)) || fallbackBySignature.get(rowFallbackSignature(row));
      return fallbackRow?.birthDate ? { ...row, birthDate: fallbackRow.birthDate } : row;
    });
  }

  async function loadPublicRecordsData(fallback) {
    try {
      const manifestResponse = await fetch(`${PUBLIC_PERFORMANCE_BASE}/records/manifest.json`, { cache: "no-store" });
      if (!manifestResponse.ok) return completeData(fallback);
      const manifest = await manifestResponse.json();
      const dataPath = String(manifest?.dataPath || "");
      if (!/^records\/versions\/[a-f0-9]{20}\.json$/.test(dataPath)) return completeData(fallback);
      const dataResponse = await fetch(`${PUBLIC_PERFORMANCE_BASE}/${dataPath}`, { cache: "force-cache" });
      if (!dataResponse.ok) return completeData(fallback);
      const remote = await dataResponse.json();
      if (!Array.isArray(remote?.records) || !Array.isArray(remote?.franceRecords)) return completeData(fallback);
      return completeData({
        ...cloneData(fallback),
        ...cloneData(remote),
        records: withFallbackBirthDates(remote.records, fallback.records),
        franceRecords: withFallbackBirthDates(remote.franceRecords, fallback.franceRecords),
        filters: remote.filters || fallback.filters || {},
        sourceDate: remote.sourceDate || fallback.sourceDate,
        updatedAt: remote.updatedAt || fallback.updatedAt || fallback.generatedAt
      });
    } catch (error) {
      console.warn("Lecture du fichier public RF/MPF impossible", error);
      return completeData(fallback);
    }
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
    if (usesNap()) return loadNapRecords(options);
    const fallback = global.LIVEPALMES_RECORDS || {};
    const ref = documentRef();
    if (!ref) return loadPublicRecordsData(fallback);
    try {
      const snapshot = await ref.get({ source: "server" });
      const remote = snapshot.exists ? snapshot.data() : null;
      if (!remote?.records && !remote?.franceRecords) return loadPublicRecordsData(fallback);
      return completeData({
        ...cloneData(fallback),
        ...cloneData(remote),
        records: withFallbackBirthDates(remote.records, fallback.records),
        franceRecords: withFallbackBirthDates(remote.franceRecords, fallback.franceRecords),
        filters: remote.filters || fallback.filters || {},
        sourceDate: remote.sourceDate || fallback.sourceDate,
        updatedAt: remote.updatedAt || fallback.updatedAt || fallback.generatedAt
      });
    } catch (error) {
      console.warn("Lecture des performances Firebase impossible", error);
      return loadPublicRecordsData(fallback);
    }
  }

  async function saveData(nextData) {
    if (usesNap()) {
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
    const ref = documentRef();
    if (!ref) throw new Error("Firebase Firestore n'est pas disponible.");
    const completed = completeData(cloneData(nextData));
    const currentUser = ensureFirebase()?.auth?.().currentUser || null;
    const payload = {
      id: DOCUMENT,
      records: Array.isArray(completed.records) ? completed.records : [],
      franceRecords: Array.isArray(completed.franceRecords) ? completed.franceRecords : [],
      filters: completed.filters && typeof completed.filters === "object" ? completed.filters : {},
      ...(Array.isArray(completed.recordHistory) ? { recordHistory: completed.recordHistory } : {}),
      ...(completed.sourceDate ? { sourceDate: completed.sourceDate } : {}),
      ...(completed.generatedAt ? { generatedAt: completed.generatedAt } : {}),
      ...(completed.cutoffDate ? { cutoffDate: completed.cutoffDate } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || "",
      updatedByEmail: currentUser?.email || ""
    };
    await ref.set(payload, { merge: false });
    global.LIVEPALMES_RECORDS = payload;
    global.dispatchEvent(new CustomEvent("livepalmes:performance-data-updated", { detail: payload }));
    return payload;
  }

  global.LivePalmesPerformanceStore = {
    loadData,
    saveData
  };
})(window);
