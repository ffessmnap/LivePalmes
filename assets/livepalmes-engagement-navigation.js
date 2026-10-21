(function (global) {
  "use strict";
  // One checkpoint per browser tab. It is never sent to a service or used as authority.
  const key = "livepalmes.portal.engagementNavigation.v1";
  const maxLength = 2 * 1024 * 1024;
  function read(scope) {
    try {
      const raw = global.sessionStorage.getItem(key);
      if (!raw || raw.length > maxLength) return null;
      const state = JSON.parse(raw);
      return state?.version === 1 && state.scope === scope && typeof state.competitionId === "string"
        && Array.isArray(state.fields) && state.fields.length <= 200 ? state : null;
    } catch (_) { return null; }
  }
  function save(scope, snapshot) {
    if (!Array.isArray(snapshot.fields) || snapshot.fields.length > 200) throw new Error("Trop de champs à conserver : terminez la saisie avant de quitter le dossier.");
    const raw = JSON.stringify({ ...snapshot, version: 1, scope });
    if (raw.length > maxLength) throw new Error("Brouillon trop volumineux pour la conservation dans cet onglet.");
    global.sessionStorage.setItem(key, raw);
    if (global.sessionStorage.getItem(key) !== raw) throw new Error("Conservation du brouillon impossible.");
  }
  function clear() {
    try { global.sessionStorage.removeItem(key); } catch (_) {}
  }
  function captureFields(roots) {
    const fields = new Map();
    for (const root of roots.filter(Boolean)) {
      for (const field of root.querySelectorAll("input[id],textarea[id],select[id]")) {
        if (field.disabled || ["password", "file", "hidden", "submit", "button"].includes(field.type)) continue;
        fields.set(field.id, { id: field.id, value: field.value, checked: field.checked,
          label: field.labels?.[0]?.textContent?.trim() || field.id });
      }
    }
    return [...fields.values()];
  }
  function restoreFields(document, fields) {
    // No synthetic input/change event: returning must never submit or autosave.
    for (const saved of fields) {
      const field = document.getElementById(saved.id);
      if (!field || field.disabled || ["password", "file", "hidden", "submit", "button"].includes(field.type)) continue;
      field.value = saved.value;
      if (["checkbox", "radio"].includes(field.type)) field.checked = saved.checked === true;
    }
  }
  global.LivePalmesEngagementNavigation = { read, save, clear, captureFields, restoreFields };
})(window);
