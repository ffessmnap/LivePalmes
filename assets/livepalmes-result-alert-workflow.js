(function () {
  function init(context = {}) {
    const getAlerts = () => context.alerts || [];
    const setAlerts = (value) => { context.alerts = value; };
    const getRaceResults = () => context.raceResults || [];
    const setRaceResults = (value) => { context.raceResults = value; };

    async function createFinalistsSpeakerAlert(result) {
      const finalistCount = context.finalRowsCount(result?.finalists);
      if (!finalistCount) return null;
      const now = new Date().toISOString();
      const alerts = getAlerts();
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
          context.syncAlertToFirestore(alert);
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
      context.saveAlerts();
      await context.syncAlertToFirestore(alert);
      return alert;
    }

    async function stampFinalistsAnnouncement(result, announcedAt) {
      if (!result?.id || !announcedAt) return false;
      const collection = context.resultsCollection();
      if (!collection) return false;
      await collection.doc(result.id).set({
        finalistsAnnouncedAt: announcedAt,
        status: "published",
        updatedAt: announcedAt
      }, { merge: true });
      const raceResults = getRaceResults();
      const index = raceResults.findIndex((item) => item.id === result.id);
      if (index !== -1) {
        raceResults[index] = {
          ...raceResults[index],
          finalistsAnnouncedAt: announcedAt,
          status: "published",
          updatedAt: announcedAt
        };
      }
      await context.publishPublicResultsIndex({ silent: true });
      return true;
    }

    async function ensurePendingFinalistsSpeakerAlerts() {
      if (context.finalistAlertRepairRunning) return;
      context.finalistAlertRepairRunning = true;
      try {
        for (const result of getRaceResults().filter((item) => item.hasFinal && context.finalRowsCount(item.finalists) > 0 && !item.finalistsAnnouncedAt)) {
          const relatedAlerts = getAlerts().filter((alert) => alert.type === "finalists_announcement" && alert.resultId === result.id);
          const announcedAlert = relatedAlerts.find((alert) => alert.speakerStatus === "done" && alert.speakerAnnouncedAt);
          if (announcedAlert) {
            await stampFinalistsAnnouncement(result, announcedAlert.speakerAnnouncedAt);
            const now = new Date().toISOString();
            for (const pendingAlert of relatedAlerts.filter((alert) => alert.speakerStatus === "pending")) {
              pendingAlert.speakerStatus = "none";
              pendingAlert.cancelledAt = pendingAlert.cancelledAt || now;
              pendingAlert.updatedAt = now;
              await context.syncAlertToFirestore(pendingAlert);
            }
            continue;
          }
          if (relatedAlerts.some((alert) => alert.speakerStatus === "pending")) continue;
          await createFinalistsSpeakerAlert(result);
        }
        context.saveAlerts();
        context.render();
      } finally {
        context.finalistAlertRepairRunning = false;
      }
    }

    function replacementAlertMatches(alert, result, row) {
      if (alert.type !== "finalist_replacement_announcement") return false;
      if (alert.resultId !== result.id) return false;
      if (alert.replacementRowKey && context.finalRowKey(row) === alert.replacementRowKey) return true;
      const sameName = String(alert.replacementName || "") === context.finalistRowName(row);
      const sameRank = !alert.replacementRank || String(row.rank || "") === String(alert.replacementRank || "");
      const sameTime = !alert.replacementTime || String(row.time || "") === String(alert.replacementTime || "");
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
      const pending = getAlerts()
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
        await context.syncAlertToFirestore(alert);
      }
      if (changed) context.saveAlerts();
    }

    async function ensurePendingReplacementSpeakerAlerts() {
      if (context.replacementAlertRepairRunning) return;
      await dedupePendingReplacementAlerts();
      const missing = [];
      for (const result of getRaceResults()) {
        for (const finalKey of ["a", "b"]) {
          for (const row of (result.finalists?.[finalKey] || [])) {
            if (!row.repechaged || row.repechageAnnouncedAt || row.withdrawnAt) continue;
            const matchingAlerts = getAlerts().filter((alert) => replacementAlertMatches(alert, result, row));
            const announcedAlert = matchingAlerts.find((alert) => alert.speakerStatus === "done" && alert.speakerAnnouncedAt);
            if (announcedAlert) {
              await context.stampReplacementAnnouncement(result, row, announcedAlert.speakerAnnouncedAt);
              const now = new Date().toISOString();
              for (const pendingAlert of matchingAlerts.filter((alert) => alert.speakerStatus === "pending")) {
                pendingAlert.speakerStatus = "none";
                pendingAlert.cancelledAt = pendingAlert.cancelledAt || now;
                pendingAlert.updatedAt = now;
                await context.syncAlertToFirestore(pendingAlert);
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
          await context.createFinalistReplacementSpeakerAlert(item.result, withdrawn, item.row);
        }
        context.saveAlerts();
        context.render();
      } finally {
        context.replacementAlertRepairRunning = false;
      }
    }

    async function publishFinalistsAfterSpeaker(alertId) {
      const alert = getAlerts().find((item) => item.id === alertId);
      const now = new Date().toISOString();
      const changes = { speakerStatus: "done", speakerAnnouncedAt: now, updatedAt: now };
      await context.syncAlertChangesToFirestoreStrict(alertId, changes);
      context.markSpeakerAlertDoneLocally(alertId, now);
      if (!alert?.resultId) return;
      const collection = context.resultsCollection();
      if (!collection) {
        const error = new Error("Firebase n'est pas disponible pour publier les finalistes.");
        throw context.markAlertAlreadyClosedError(error);
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
          await context.deleteFinalResultAlerts(alert.resultId);
          return;
        }
        throw context.markAlertAlreadyClosedError(error);
      }
      try {
        const resultSnapshot = await resultRef.get({ source: "server" });
        const updatedResult = resultSnapshot.exists
          ? context.resultWithoutPdf({ id: resultSnapshot.id, ...resultSnapshot.data() })
          : null;
        const raceResults = getRaceResults();
        const index = raceResults.findIndex((result) => result.id === alert.resultId);
        if (updatedResult) {
          setRaceResults([
            updatedResult,
            ...raceResults.filter((result) => result.id !== alert.resultId)
          ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))));
        } else if (index !== -1) {
          raceResults[index] = {
            ...raceResults[index],
            finalistsAnnouncedAt: now,
            status: "published",
            updatedAt: now
          };
        }
        await context.publishPublicResultsIndex({ strict: true });
      } catch (error) {
        throw context.markAlertAlreadyClosedError(error);
      }
    }

    return {
      createFinalistsSpeakerAlert,
      dedupePendingReplacementAlerts,
      ensurePendingFinalistsSpeakerAlerts,
      ensurePendingReplacementSpeakerAlerts,
      publishFinalistsAfterSpeaker,
      replacementAlertKey,
      replacementAlertMatches,
      stampFinalistsAnnouncement
    };
  }

  window.LivePalmesResultAlertWorkflow = { init };
}());
