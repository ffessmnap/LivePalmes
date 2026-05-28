(function attachLivePalmesAdminBackups(global) {
  const BACKUP_KIND = "livepalmes-backup";
  const BACKUP_VERSION = 1;

  function cloneJson(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value ?? fallback));
    } catch {
      return fallback;
    }
  }

  function safeName(value) {
    return String(value || "livepalmes")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "livepalmes";
  }

  function fileStamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes())
    ].join("");
  }

  function createBackup(context = {}) {
    const data = cloneJson(context.data, {});
    const alerts = cloneJson(context.alerts, []);
    const raceResults = cloneJson(context.raceResults, []);
    const roleStates = cloneJson(context.roleStates, {});
    return {
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      competitionId: context.activeCompetitionId || "",
      sourceVersion: data.sourceVersion || "",
      meet: data.meet || {},
      data,
      alerts,
      raceResults,
      roleStates,
      notes: {
        warning: "Sauvegarde d'exploitation LivePalmes. Les PDF publics restent dans Firebase si deja publies.",
        resultCount: raceResults.length,
        alertCount: alerts.length,
        entrantCount: Array.isArray(data.entrants) ? data.entrants.length : 0,
        seriesCount: Array.isArray(data.series) ? data.series.length : 0
      }
    };
  }

  function downloadJson(payload, fileName) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadBackup(context = {}) {
    const backup = createBackup(context);
    const meet = backup.meet || {};
    const name = safeName([meet.name, meet.city, meet.year].filter(Boolean).join("-"));
    downloadJson(backup, `${name}-sauvegarde-${fileStamp()}.json`);
    return backup;
  }

  async function readBackupFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed?.kind !== BACKUP_KIND || !parsed.data) {
      throw new Error("Ce fichier n'est pas une sauvegarde LivePalmes.");
    }
    return parsed;
  }

  function applyBackup(backup, context = {}) {
    const normalizeData = typeof context.normalizeData === "function"
      ? context.normalizeData
      : ((value) => value || {});
    const nextData = normalizeData(backup.data || {});
    context.data = nextData;
    context.alerts = Array.isArray(backup.alerts) ? backup.alerts : [];
    context.raceResults = Array.isArray(backup.raceResults) ? backup.raceResults : [];
    context.roleStates = backup.roleStates && typeof backup.roleStates === "object" ? backup.roleStates : context.roleStates;
    context.saveData?.();
    context.saveAlerts?.();
    context.saveRoleStates?.();
    context.render?.();
    return {
      alerts: context.alerts.length,
      results: context.raceResults.length,
      series: nextData.series?.length || 0,
      entrants: nextData.entrants?.length || 0
    };
  }

  global.LivePalmesAdminBackups = {
    applyBackup,
    createBackup,
    downloadBackup,
    readBackupFile
  };
})(window);
