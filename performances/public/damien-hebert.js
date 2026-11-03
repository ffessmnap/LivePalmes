(async function () {
  "use strict";
  const status = document.getElementById("trophyStatus");
  try {
    const url = new URL(window.LivePalmesEnvironment.napReaderUrl);
    url.searchParams.set("action", "damien-hebert");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Lecture impossible.");
    const data = await response.json();
    if (!data) {
      status.textContent = "Aucune édition n’est actuellement publiée.";
      return;
    }
    window.LivePalmesTrophyTable.render(document.getElementById("trophyRanking"), data);
    status.hidden = true;
  } catch {
    status.textContent = "Le classement est momentanément indisponible.";
  }
})();
