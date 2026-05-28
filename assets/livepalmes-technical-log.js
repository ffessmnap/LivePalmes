(function attachLivePalmesTechnicalLog(global) {
  const STORAGE_KEY = "livepalmesTechnicalLog";
  const MAX_ENTRIES = 120;

  function safeStorage() {
    try {
      return global.localStorage || null;
    } catch {
      return null;
    }
  }

  function readEntries() {
    const storage = safeStorage();
    if (!storage) return [];
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeEntries(entries) {
    const storage = safeStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    } catch {
      // Le journal technique ne doit jamais bloquer LivePalmes.
    }
  }

  function compactDetails(details) {
    if (!details) return "";
    if (details instanceof Error) {
      return [details.message, details.stack].filter(Boolean).join("\n").slice(0, 4000);
    }
    if (typeof details === "string") return details.slice(0, 4000);
    try {
      return JSON.stringify(details, null, 2).slice(0, 4000);
    } catch {
      return String(details).slice(0, 4000);
    }
  }

  function record(input = {}) {
    const entry = {
      id: `tech-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      level: String(input.level || "info"),
      scope: String(input.scope || "LivePalmes"),
      message: String(input.message || "").slice(0, 500),
      details: compactDetails(input.details),
      url: String(global.location?.href || "")
    };
    const entries = [entry, ...readEntries()].slice(0, MAX_ENTRIES);
    writeEntries(entries);
    return entry;
  }

  function clear() {
    writeEntries([]);
  }

  function summary() {
    const entries = readEntries();
    return {
      count: entries.length,
      errors: entries.filter((entry) => entry.level === "error").length,
      warnings: entries.filter((entry) => entry.level === "warn").length,
      latest: entries[0] || null
    };
  }

  function installGlobalHandlers() {
    if (global.__livePalmesTechnicalLogInstalled) return;
    global.__livePalmesTechnicalLogInstalled = true;
    global.addEventListener?.("error", (event) => {
      record({
        level: "error",
        scope: "Erreur navigateur",
        message: event.message || "Erreur JavaScript",
        details: event.error || {
          file: event.filename,
          line: event.lineno,
          column: event.colno
        }
      });
    });
    global.addEventListener?.("unhandledrejection", (event) => {
      record({
        level: "error",
        scope: "Promesse rejetee",
        message: event.reason?.message || String(event.reason || "Erreur asynchrone"),
        details: event.reason
      });
    });
  }

  global.LivePalmesTechnicalLog = {
    clear,
    entries: readEntries,
    installGlobalHandlers,
    record,
    summary
  };
})(window);
