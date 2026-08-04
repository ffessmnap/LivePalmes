(function attachPerformanceStore(global) {
  const COMPETITION_ID = "livepalmes-active";
  const COLLECTION = "performanceData";
  const DOCUMENT = "records";
  const PUBLIC_PERFORMANCE_BASE = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore";

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

  async function loadData() {
    const fallback = global.LIVEPALMES_RECORDS || {};
    const ref = documentRef();
    if (!ref) return loadPublicRecordsData(fallback);
    try {
      const snapshot = await ref.get({ source: "server" });
      const remote = snapshot.exists ? snapshot.data() : null;
      if (!remote?.records && !remote?.franceRecords) return completeData(fallback);
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
      return completeData(fallback);
    }
  }

  async function saveData(nextData) {
    const ref = documentRef();
    if (!ref) throw new Error("Firebase Firestore n'est pas disponible.");
    const completed = completeData(cloneData(nextData));
    const payload = {
      id: DOCUMENT,
      records: Array.isArray(completed.records) ? completed.records : [],
      franceRecords: Array.isArray(completed.franceRecords) ? completed.franceRecords : [],
      filters: completed.filters && typeof completed.filters === "object" ? completed.filters : {},
      ...(Array.isArray(completed.recordHistory) ? { recordHistory: completed.recordHistory } : {}),
      ...(completed.sourceDate ? { sourceDate: completed.sourceDate } : {}),
      ...(completed.generatedAt ? { generatedAt: completed.generatedAt } : {}),
      ...(completed.cutoffDate ? { cutoffDate: completed.cutoffDate } : {}),
      updatedAt: new Date().toISOString()
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
