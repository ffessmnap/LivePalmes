(function (global) {
  "use strict";
  const panel = document.getElementById("adminTrophy");
  const form = panel.querySelector("form");
  const fields = form.querySelector("fieldset");
  const status = panel.querySelector("[data-trophy-state]");
  const preview = panel.querySelector("[data-trophy-preview]");
  const freeze = panel.querySelector("[data-trophy-freeze]");
  let busy = false;

  async function run(action, edition) {
    if (busy) return;
    busy = true;
    fields.disabled = true;
    status.textContent = "Chargement…";
    const currentUser = () => global.firebase.auth().currentUser?.uid;
    const uid = currentUser();
    try {
      const app = global.firebase.app();
      const functions = app.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      const service = global.LivePalmesAppConfig?.configureFunctionsService?.(functions) || functions;
      const { data } = await service.httpsCallable("manageDamienHebertEdition")({ action, edition });
      if (currentUser() !== uid) return;
      if (data.preview) {
        global.LivePalmesTrophyTable.render(preview, data.preview);
        status.textContent = "Aperçu de l’édition.";
        return;
      }
      const draft = data.draft || {};
      for (const key of ["title", "seasonEndYear", "from", "through"]) form.elements[key].value = draft[key] ?? "";
      const active = data.published;
      freeze.hidden = !active || active.frozen;
      status.textContent = active
        ? `${active.edition.title} est en ligne · classement ${active.frozen ? "arrêté" : "provisoire"}.`
        : "Aucune édition en ligne.";
      if (action === "save") status.textContent = `Brouillon enregistré. ${status.textContent}`;
      form.hidden = false;
    } catch (error) {
      if (currentUser() === uid) status.textContent = error.message || "L’action a échoué.";
    } finally {
      busy = false;
      fields.disabled = false;
    }
  }

  panel.addEventListener("toggle", () => {
    form.hidden = true;
    preview.hidden = true;
    if (panel.open) run("read");
  });
  form.addEventListener("input", () => { preview.hidden = true; });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const action = event.submitter?.value || "save";
    if (action === "publish" && !global.confirm("Afficher cette édition au public ?")) return;
    const data = new FormData(form);
    run(action, {
      title: data.get("title"), seasonEndYear: Number(data.get("seasonEndYear")),
      from: data.get("from"), through: data.get("through")
    });
  });
  freeze.addEventListener("click", () => {
    if (global.confirm("Arrêter le classement de l’édition publique ?")) run("freeze");
  });
  global.firebase.auth().onAuthStateChanged(() => {
    panel.open = false;
    form.hidden = true;
    preview.hidden = true;
    status.textContent = "";
  });
})(window);
