/* Portal-only preference. No Firebase reads or writes. */
(function () {
  "use strict";
  const key = "livepalmes.portal.appearance";
  const modes = ["light", "dark", "system"];
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let mode = "light";
  try { const saved = localStorage.getItem(key); if (modes.includes(saved)) mode = saved; } catch (_) { /* Storage may be disabled. */ }
  function render() {
    root.dataset.portalTheme = mode === "system" ? (media.matches ? "dark" : "light") : mode;
    document.querySelectorAll("[data-portal-appearance]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.portalAppearance === mode));
    });
  }
  render();
  media.addEventListener("change", () => { if (mode === "system") render(); });
  window.addEventListener("storage", event => {
    if (event.key !== key) return;
    mode = modes.includes(event.newValue) ? event.newValue : "light";
    render();
  });
  document.addEventListener("DOMContentLoaded", () => {
    render();
    document.querySelectorAll("[data-portal-appearance]").forEach(button => {
      button.addEventListener("click", () => {
        mode = button.dataset.portalAppearance;
        if (!modes.includes(mode)) return;
        render();
        let saved = true;
        try { localStorage.setItem(key, mode); } catch (_) { saved = false; }
        const message = document.querySelector("#adminAppearanceMessage");
        if (message) message.textContent = saved ? "Apparence enregistrée dans ce navigateur." : "Apparence appliquée pour cette visite. Le navigateur ne permet pas de l’enregistrer.";
      });
    });
  });
}());
