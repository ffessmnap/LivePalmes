(function (global) {
  "use strict";
  const headers = ["Rang", "Nom", "Prénom", "Année de naissance", "Club",
    "50 m SF", "50 m BI", "100 m IS", "400 m SF", "800 m SF", "Total"];
  const number = new Intl.NumberFormat("fr-FR");
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
  const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

  function node(tag, text, parent) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (parent) parent.append(element);
    return element;
  }

  function render(root, data) {
    root.replaceChildren();
    const { edition, groups } = data;
    const heading = node("h2", `${edition.title} · ${edition.seasonEndYear - 1}–${edition.seasonEndYear}`, root);
    heading.className = "trophy-heading";
    node("p", `${data.final ? "Classement arrêté" : "Classement provisoire"} · Du ${date.format(new Date(edition.from))} au ${date.format(new Date(edition.through))}`, root);
    node("p", `Mis à jour le ${dateTime.format(new Date(data.updatedAt))}`, root);
    const controls = node("div", null, root);
    controls.className = "trophy-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Catégorie");
    const girls = node("button", "Minimes filles", controls);
    const boys = node("button", "Minimes garçons", controls);
    const scroller = node("div", null, root);
    scroller.className = "trophy-scroll";
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "Tableau des cinq courses");
    const table = node("table", null, scroller);
    table.className = "trophy-table";
    table.setAttribute("role", "table");
    const head = table.createTHead().insertRow();
    for (const label of headers) node("th", label, head).scope = "col";
    const body = table.createTBody();
    body.setAttribute("role", "rowgroup");
    const dialog = node("dialog", null, root);
    dialog.setAttribute("aria-label", "Ouvrir la fiche nageur ?");
    node("h3", "Ouvrir la fiche nageur ?", dialog);
    const person = node("p", null, dialog);
    const link = node("a", "Voir la fiche", dialog);
    const cancel = node("button", "Rester sur le classement", dialog);
    cancel.autofocus = true;
    cancel.addEventListener("click", () => dialog.close());
    link.addEventListener("click", () => dialog.close());

    function show(sex) {
      girls.setAttribute("aria-pressed", String(sex === "F"));
      boys.setAttribute("aria-pressed", String(sex === "M"));
      body.replaceChildren();
      if (!groups[sex].length) {
        const empty = body.insertRow().insertCell();
        empty.colSpan = headers.length;
        empty.textContent = "Aucune performance dans cette catégorie.";
      }
      for (const swimmer of groups[sex]) {
        const row = body.insertRow();
        row.className = "trophy-swimmer";
        row.setAttribute("role", "row");
        const rank = node("td", swimmer.rank, row);
        rank.setAttribute("aria-label", `Rang ${swimmer.rank}`);
        for (const value of [swimmer.lastName, swimmer.firstName]) {
          const name = node("button", value, node("td", null, row));
          name.className = "trophy-name";
          name.addEventListener("click", () => {
            person.textContent = `${swimmer.firstName} ${swimmer.lastName}`;
            link.href = `/performances/nageur.html?id=${encodeURIComponent(swimmer.swimmerId)}`;
            dialog.showModal();
          });
        }
        const birth = node("td", swimmer.birthYear, row);
        birth.setAttribute("aria-label", `Année de naissance ${swimmer.birthYear}`);
        const club = node("td", swimmer.club || "—", row);
        club.setAttribute("aria-label", `Club ${swimmer.club || "non renseigné"}`);
        for (const [index, event] of swimmer.events.entries()) {
          const cell = node("td", null, row);
          cell.className = "trophy-course";
          const label = node("span", headers[index + 5], cell);
          label.className = "trophy-course-label";
          if (event) {
            node("strong", event.time, cell);
            node("small", `${number.format(event.points)} pts`, cell);
          } else {
            node("span", "—", cell);
          }
        }
        const total = node("td", `${number.format(swimmer.totalPoints)} pts`, row);
        total.setAttribute("aria-label", `Total ${number.format(swimmer.totalPoints)} points`);
        for (const cell of row.cells) cell.setAttribute("role", "cell");
      }
    }
    girls.addEventListener("click", () => show("F"));
    boys.addEventListener("click", () => show("M"));
    show("F");
    root.hidden = false;
  }

  global.LivePalmesTrophyTable = { render };
})(window);
