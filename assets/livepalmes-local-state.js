(function () {
  function loadJson(key, fallbackValue) {
    const saved = localStorage.getItem(key);
    if (!saved) return fallbackValue;
    try {
      return JSON.parse(saved);
    } catch {
      return fallbackValue;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadData(key, fallbackData, normalizeData) {
    const saved = localStorage.getItem(key);
    if (!saved) return structuredClone(fallbackData);
    try {
      return normalizeData(JSON.parse(saved));
    } catch {
      return structuredClone(fallbackData);
    }
  }

  function lastActivityTimestamp(key) {
    return Number(localStorage.getItem(key) || "0") || 0;
  }

  function saveLastActivityTimestamp(key, timestamp = Date.now()) {
    localStorage.setItem(key, String(timestamp));
  }

  function shouldReturnHomeForInactivity(key, durationMs) {
    const last = lastActivityTimestamp(key);
    return last > 0 && Date.now() - last > durationMs;
  }

  function loadActiveView(options = {}) {
    const {
      activeViewKey,
      homeAfterInactivityMs,
      knownRole,
      lastActivityKey
    } = options;
    const saved = localStorage.getItem(activeViewKey);
    if (shouldReturnHomeForInactivity(lastActivityKey, homeAfterInactivityMs)) {
      return { role: "live", profileHomeActive: true };
    }
    if (!saved) return { role: "live", profileHomeActive: true };
    try {
      const parsed = JSON.parse(saved);
      return {
        role: knownRole(parsed?.role) ? parsed.role : "live",
        profileHomeActive: parsed?.profileHomeActive !== false
      };
    } catch {
      return { role: "live", profileHomeActive: true };
    }
  }

  function saveActiveView(key, state, profileHomeActive) {
    saveJson(key, {
      role: state.role,
      profileHomeActive
    });
  }

  function currentClientId(key) {
    let id = localStorage.getItem(key);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  window.LivePalmesLocalState = {
    currentClientId,
    lastActivityTimestamp,
    loadActiveView,
    loadData,
    loadJson,
    saveActiveView,
    saveJson,
    saveLastActivityTimestamp,
    shouldReturnHomeForInactivity
  };
}());
