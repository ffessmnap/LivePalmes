(function () {
  function init(context = {}) {
    const getData = () => context.data || { notes: {}, program: [], series: [] };
    const setData = (value) => { context.data = value; };
    const getRaceResults = () => Array.isArray(context.raceResults) ? context.raceResults : [];
    const getRoleStates = () => context.roleStates || {};
    const getState = () => context.state || {};

    const livePalmesResults = context.livePalmesResults || window.LivePalmesResults || {};
    const livePalmesPublication = context.livePalmesPublication || window.LivePalmesPublication || {};

    function raceOptionKey(eventId, sex) {
      return typeof context.raceOptionKey === "function"
        ? context.raceOptionKey(eventId, sex)
        : `${eventId || ""}-${sex || ""}`;
    }

    function programKey(row) {
      return typeof context.programKey === "function"
        ? context.programKey(row)
        : [row?.session, row?.eventId, row?.sex, row?.stage || "series"].filter(Boolean).join("|");
    }

    function isFinalStage(stage) {
      return typeof context.isFinalStage === "function"
        ? context.isFinalStage(stage)
        : /final/i.test(String(stage || ""));
    }

    function sessionRows() {
      return typeof context.sessionRows === "function" ? context.sessionRows() : [];
    }

    function sexDisplayLabel(sex) {
      return typeof context.sexDisplayLabel === "function" ? context.sexDisplayLabel(sex) : String(sex || "");
    }

    function isSplitRaceAcrossSessions(eventId, sex) {
      return typeof context.isSplitRaceAcrossSessions === "function"
        ? context.isSplitRaceAcrossSessions(eventId, sex)
        : false;
    }

    function resultIdForProgramRow(row) {
      const base = `result-${raceOptionKey(row?.eventId, row?.sex).replace(/[^a-z0-9_-]+/gi, "-")}`;
      if (!isFinalStage(row?.stage)) return base;
      const stage = String(row?.stage || "finale").replace(/[^a-z0-9_-]+/gi, "-");
      return `${base}-${stage}`;
    }

    function resultForProgramRow(row = {}) {
      const raceKey = raceOptionKey(row.eventId, row.sex);
      const raceResults = getRaceResults();
      const exact = raceResults.find((result) =>
        result.programKey === programKey(row) ||
        result.id === resultIdForProgramRow(row)
      );
      if (exact) return exact;
      if (isFinalStage(row.stage)) {
        const rowStages = new Set([row.stage, ...(row.finalStages || [])].map((stage) => String(stage || "")));
        return raceResults.find((result) => {
          if (result.raceKey !== raceKey || !isFinalStage(result.stage)) return false;
          if (row.session && result.session && String(row.session) !== String(result.session)) return false;
          const resultStage = String(result.stage || "");
          return rowStages.has(resultStage) ||
            row.stage === "finales" ||
            resultStage === "finales" ||
            result.programKey === programKey(row);
        }) || null;
      }
      return raceResults.find((result) => result.raceKey === raceKey && !isFinalStage(result.stage)) || null;
    }

    function resultPdfPayload(result, pdfDataUrl) {
      return typeof livePalmesResults.resultPdfPayload === "function"
        ? livePalmesResults.resultPdfPayload(result, pdfDataUrl, { sexLabel: sexDisplayLabel(result?.sex) })
        : {
          id: result?.id || "",
          resultId: result?.id || "",
          pdfName: result?.pdfName || "",
          pdfSize: result?.pdfSize || 0,
          pdfDataUrl: pdfDataUrl || "",
          updatedAt: result?.updatedAt || "",
          eventLabel: result?.eventLabel || "",
          sexLabel: result?.sexLabel || sexDisplayLabel(result?.sex),
          session: result?.session || ""
        };
    }

    function publicResultPayload(result) {
      return typeof livePalmesResults.publicResultPayload === "function"
        ? livePalmesResults.publicResultPayload(result, { sexLabel: sexDisplayLabel(result?.sex) })
        : result;
    }

    function publicSeriesPdfPayload(pdf) {
      return typeof livePalmesResults.publicSeriesPdfPayload === "function"
        ? livePalmesResults.publicSeriesPdfPayload(pdf)
        : pdf;
    }

    function publicSessionResultsPdfPayload(pdf) {
      return typeof livePalmesResults.publicSessionResultsPdfPayload === "function"
        ? livePalmesResults.publicSessionResultsPdfPayload(pdf)
        : pdf;
    }

    function buildPublicResultsIndex() {
      if (typeof livePalmesPublication.buildPublicResultsIndex !== "function") return {};
      return livePalmesPublication.buildPublicResultsIndex({
        data: getData(),
        raceResults: getRaceResults(),
        publicResultPayload,
        publicSeriesPdfPayload,
        publicSessionResultsPdfPayload
      });
    }

    function buildPublicSeriesIndex() {
      if (typeof livePalmesPublication.buildPublicSeriesIndex !== "function") return null;
      return livePalmesPublication.buildPublicSeriesIndex({
        data: getData(),
        publicSeriesPdfPayload
      });
    }

    function publicIndexByteSize(payload) {
      const json = JSON.stringify(payload || {});
      if (typeof TextEncoder === "function") return new TextEncoder().encode(json).length;
      return json.length;
    }

    function assertPublicIndexSize(label, payload) {
      const bytes = publicIndexByteSize(payload);
      const limit = 980000;
      if (bytes > limit) {
        throw new Error(`${label} trop lourd : ${bytes.toLocaleString("fr-FR")} octets. Limite de securite LivePalmes : ${limit.toLocaleString("fr-FR")} octets.`);
      }
      return bytes;
    }

    async function currentPublicResultsIndex(doc) {
      const snapshot = await doc.get({ source: "server" }).catch(() => null);
      return snapshot?.exists ? (snapshot.data() || {}) : {};
    }

    async function assertPublicResultsIndexCanBeReplaced(currentIndex, nextIndex, options = {}) {
      if (options.allowResultRegression) return;
      if (typeof livePalmesPublication.publicResultsRegressions !== "function") return;
      const regressions = livePalmesPublication.publicResultsRegressions(currentIndex || {}, nextIndex || {});
      if (!regressions.length) return;
      const details = regressions
        .map((item) => `session ${item.session}: ${item.after}/${item.before}`)
        .join(", ");
      throw new Error(`Publication interrompue : l'index public perd des resultats (${details}). Recharge le bureau des performances puis republie.`);
    }

    async function hydrateRaceResultsFromServer() {
      const collection = typeof context.resultsCollection === "function" ? context.resultsCollection() : null;
      const stripPdf = typeof livePalmesResults.resultWithoutPdf === "function"
        ? livePalmesResults.resultWithoutPdf
        : ((result) => {
          const clean = { ...(result || {}) };
          delete clean.pdfDataUrl;
          return clean;
        });
      if (!collection) return;
      const snapshot = await collection.orderBy("updatedAt", "desc").get();
      const rows = snapshot.docs.map((doc) => stripPdf({ id: doc.id, ...doc.data() }));
      if (rows.length) context.raceResults = rows;
    }

    async function hydratePublicSeriesPdfMetadataIfNeeded({ force = false } = {}) {
      const data = getData();
      if (!force && Array.isArray(data.notes?.publicSeriesPdfs)) return;
      const collection = typeof context.seriesPdfsCollection === "function" ? context.seriesPdfsCollection() : null;
      if (!collection) return;
      const snapshot = await collection.get();
      const metadata = snapshot.docs
        .map((doc) => publicSeriesPdfPayload({ id: doc.id, ...doc.data() }))
        .filter(Boolean)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      const nextData = typeof context.normalizeData === "function"
        ? context.normalizeData({ ...data, notes: { ...(data.notes || {}), publicSeriesPdfs: metadata } })
        : { ...data, notes: { ...(data.notes || {}), publicSeriesPdfs: metadata } };
      setData(nextData);
      if (typeof context.saveData === "function") context.saveData();
    }

    async function hydratePublicSessionResultsPdfMetadataIfNeeded({ force = false } = {}) {
      const data = getData();
      if (!force && Array.isArray(data.notes?.publicSessionResultsPdfs)) return;
      const collection = typeof context.sessionResultsPdfsCollection === "function" ? context.sessionResultsPdfsCollection() : null;
      if (!collection) return;
      const snapshot = await collection.get();
      const metadata = snapshot.docs
        .map((doc) => publicSessionResultsPdfPayload({ id: doc.id, ...doc.data() }))
        .filter(Boolean)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      const nextData = typeof context.normalizeData === "function"
        ? context.normalizeData({ ...data, notes: { ...(data.notes || {}), publicSessionResultsPdfs: metadata } })
        : { ...data, notes: { ...(data.notes || {}), publicSessionResultsPdfs: metadata } };
      setData(nextData);
      if (typeof context.saveData === "function") context.saveData();
    }

    async function publishPublicResultsIndex({ silent = false, strict = false, allowResultRegression = false } = {}) {
      const doc = typeof context.publicResultsIndexDocument === "function" ? context.publicResultsIndexDocument() : null;
      if (!doc) return;
      try {
        await hydrateRaceResultsFromServer();
        const currentIndex = await currentPublicResultsIndex(doc);
        await hydratePublicSeriesPdfMetadataIfNeeded({ force: true });
        await hydratePublicSessionResultsPdfMetadataIfNeeded({ force: true });
        let nextIndex = JSON.parse(JSON.stringify(buildPublicResultsIndex()));
        const directDisabled = getData().notes?.publicDirectDisabled === true;
        if (!allowResultRegression && !directDisabled && typeof livePalmesPublication.mergePublicResultsPreservingCurrent === "function") {
          nextIndex = livePalmesPublication.mergePublicResultsPreservingCurrent(currentIndex, nextIndex);
        }
        await assertPublicResultsIndexCanBeReplaced(currentIndex, nextIndex, { allowResultRegression: allowResultRegression || directDisabled });
        assertPublicIndexSize("Index resultats public", nextIndex);
        await doc.set(nextIndex);
        const seriesIndex = JSON.parse(JSON.stringify(buildPublicSeriesIndex()));
        if (seriesIndex && doc.parent?.doc) {
          assertPublicIndexSize("Index series public", seriesIndex);
          await doc.parent.doc("seriesIndex").set(seriesIndex);
        }
      } catch (error) {
        console.warn("Publication de l'index public impossible", error);
        if (!silent && typeof context.renderDataStatus === "function") {
          context.renderDataStatus("L'index public des resultats n'a pas pu etre mis a jour. Verifie les regles Firebase.");
        }
        if (strict) throw error;
      }
    }

    function isLastProgramPartForRace(row = {}) {
      const raceRows = (getData().program || [])
        .filter((item) => item.eventId === row.eventId && item.sex === row.sex && !isFinalStage(item.stage))
        .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
      if (!raceRows.length) return true;
      return programKey(raceRows[raceRows.length - 1]) === programKey(row);
    }

    function resultSessions() {
      return sessionRows().filter((session) =>
        (getData().program || []).some((row) => row.session === session.number && row.eventId && row.sex)
      );
    }

    function latestResultSession() {
      const latest = getRaceResults()
        .filter((result) => result.updatedAt && result.session)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      return latest?.session ? String(latest.session) : "";
    }

    function resultProgramRows(sessionNumber = "") {
      const data = getData();
      const seenRegular = new Set();
      const seenFinals = new Set();
      const sortedRows = (data.program || [])
        .filter((row) => row.eventId && row.sex)
        .filter((row) => !sessionNumber || row.session === sessionNumber)
        .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
      const rows = [];
      sortedRows.forEach((row) => {
        if (isFinalStage(row.stage)) {
          const key = `${row.session || ""}|${row.eventId}|${row.sex}|finales`;
          if (seenFinals.has(key)) return;
          seenFinals.add(key);
          const finalRows = sortedRows.filter((item) =>
            item.session === row.session &&
            item.eventId === row.eventId &&
            item.sex === row.sex &&
            isFinalStage(item.stage)
          );
          rows.push({
            ...row,
            finalStageCount: finalRows.length,
            finalStages: finalRows.map((item) => item.stage).filter(Boolean),
            stage: finalRows.length > 1 ? "finales" : row.stage,
            startTime: finalRows.map((item) => item.startTime).filter(Boolean)[0] || row.startTime || ""
          });
          return;
        }
        const raceKey = raceOptionKey(row.eventId, row.sex);
        if (!isLastProgramPartForRace(row) && !resultForProgramRow(row)) {
          rows.push(row);
          return;
        }
        if (seenRegular.has(raceKey)) return;
        seenRegular.add(raceKey);
        rows.push(row);
      });
      return rows;
    }

    function resultPhaseLabelForProgramRow(row = {}) {
      const data = getData();
      if (isFinalStage(row.stage)) {
        return Number(row.finalStageCount || 0) > 1 || row.stage === "finales" ? "finales" : "finale";
      }
      const finals = (data.program || []).filter((item) => item.eventId === row.eventId && item.sex === row.sex && isFinalStage(item.stage));
      const seriesNumbers = (data.series || [])
        .filter((item) => item.eventId === row.eventId && item.sex === row.sex)
        .filter((item) => !row.session || !item.session || item.session === row.session)
        .filter((item) => !isFinalStage(item.stage))
        .map((item) => Number(item.series))
        .filter(Number.isFinite);
      const uniqueSeries = [...new Set(seriesNumbers)];
      if (!finals.length && isSplitRaceAcrossSessions(row.eventId, row.sex) && isLastProgramPartForRace(row)) {
        return "meilleure s\u00e9rie";
      }
      return uniqueSeries.length > 1 ? "s\u00e9ries" : "s\u00e9rie";
    }

    return {
      resultIdForProgramRow,
      resultForProgramRow,
      resultPdfPayload,
      publicResultPayload,
      buildPublicResultsIndex,
      publishPublicResultsIndex,
      isLastProgramPartForRace,
      resultSessions,
      latestResultSession,
      resultProgramRows,
      resultPhaseLabelForProgramRow
    };
  }

  window.LivePalmesResultsAccess = { init };
}());
