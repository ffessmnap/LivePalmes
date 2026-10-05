(function () {
  "use strict";
  const status = document.getElementById("nap-status");
  const form = document.getElementById("nap-form");
  const load = document.getElementById("nap-load");
  const next = document.getElementById("nap-next");
  const table = document.getElementById("nap-table");
  const rows = document.getElementById("nap-rows");
  const input = document.getElementById("nap-swimmer");
  const environment = window.LivePalmesEnvironment;
  if (!environment.isTest) {
    status.textContent = "Cet écran est réservé à LivePalmes TEST.";
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(environment.firebaseConfig);
  const auth = firebase.auth();
  const read = firebase.app().functions(environment.functionsRegion).httpsCallable("getNapSwimmerPerformances");
  let swimmerId = null;
  let afterId = null;
  let busy = false;
  let sessionRevision = 0;
  auth.onAuthStateChanged(async (user) => {
    const revision = ++sessionRevision;
    form.hidden = true;
    next.hidden = true;
    table.hidden = true;
    rows.replaceChildren();
    if (!user) {
      status.textContent = "Connectez-vous au portail TEST avec votre compte administrateur, puis revenez sur cette page.";
      return;
    }
    try {
      const token = await user.getIdTokenResult();
      if (revision !== sessionRevision) return;
      if (token.claims.livepalmesCapabilities?.["admin.full"] !== true) {
        status.textContent = "Cette consultation nécessite un compte administrateur TEST.";
        return;
      }
      form.hidden = false;
      status.textContent = "Session administrateur reconnue. Saisissez un identifiant NAP pour consulter ses performances.";
    } catch {
      status.textContent = "Impossible de vérifier votre session. Reconnectez-vous au portail TEST.";
    }
  });
  async function consult(reset) {
    if (busy) return;
    if (reset) {
      if (!input.reportValidity()) return;
      swimmerId = Number(input.value);
      afterId = null;
    }
    const revision = sessionRevision;
    busy = true;
    load.disabled = next.disabled = input.disabled = true;
    next.hidden = true;
    rows.replaceChildren();
    table.hidden = true;
    document.getElementById("nap-count").textContent = "";
    status.textContent = "Consultation de NAP en cours…";
    try {
      const response = await read({ swimmerId, afterId });
      if (revision !== sessionRevision) return;
      const data = response.data;
      for (const item of data.items) {
        const tr = document.createElement("tr");
        for (const key of ["id", "compet", "course", "cat", "tps", "club", "classement"]) {
          const td = document.createElement("td");
          td.textContent = item[key] == null ? "" : String(item[key]);
          tr.appendChild(td);
        }
        rows.appendChild(tr);
      }
      table.hidden = data.items.length === 0;
      next.hidden = !data.hasMore;
      afterId = data.nextAfterId;
      document.getElementById("nap-count").textContent = `${data.items.length} performance(s) sur cette page.`;
      status.textContent = data.items.length ? "Données lues directement dans NAP." : "Aucune performance trouvée pour cette sélection.";
    } catch (error) {
      if (revision !== sessionRevision) return;
      status.textContent = error.code === "functions/permission-denied"
        ? "Votre compte ne dispose pas de l’accès administrateur requis."
        : "La consultation NAP n’est pas encore disponible. La connexion serveur doit être configurée et déployée.";
    } finally {
      busy = false;
      load.disabled = next.disabled = input.disabled = false;
    }
  }
  form.addEventListener("submit", (event) => { event.preventDefault(); consult(true); });
  next.addEventListener("click", () => consult(false));
})();
