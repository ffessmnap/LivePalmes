(function (global) {
  "use strict";
  const headers = ["Rang", "Nageur", "Club",
    "50 m SF", "50 m BI", "100 m IS", "400 m SF", "800 m SF", "Total"];
  const qualificationRank = 32;
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
    const toolbar = node("div", null, root);
    toolbar.className = "trophy-toolbar";
    const metadata = node("div", null, toolbar);
    metadata.className = "trophy-metadata";
    const heading = node("h2", `Saison ${edition.seasonEndYear - 1}/${edition.seasonEndYear}`, metadata);
    heading.className = "trophy-heading";
    if (edition.title && !/^\d{4}(?:\s*[-–/]\s*\d{4})?$/.test(edition.title.trim())) {
      node("p", edition.title, metadata).className = "trophy-edition-name";
    }
    node("p", `${data.final ? "Classement arrêté" : "Classement provisoire"} · Du ${date.format(new Date(edition.from))} au ${date.format(new Date(edition.through))}`, metadata);
    node("p", `Mis à jour le ${dateTime.format(new Date(data.updatedAt))}`, metadata).className = "trophy-updated";
    const controls = node("div", null, toolbar);
    controls.className = "trophy-controls trophy-categories";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Catégorie");
    const girls = node("button", "Minimes filles", controls);
    const boys = node("button", "Minimes garçons", controls);
    girls.className = "trophy-category-f";
    boys.className = "trophy-category-m";
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
    // Public mobile view only; the national portal keeps its existing preview.
    const mobile = root.id === "trophyRanking" ? node("div", null, root) : null;
    if (mobile) mobile.className = "trophy-mobile";
    const dialog = node("dialog", null, root);
    dialog.className = "trophy-profile-dialog";
    const title = node("h3", "Ouvrir la fiche nageur ?", dialog);
    title.id = `${root.id || "trophyPreview"}-profile-title`;
    dialog.setAttribute("aria-labelledby", title.id);
    const person = node("p", null, dialog);
    person.className = "trophy-profile-person";
    const actions = node("div", null, dialog);
    actions.className = "trophy-profile-actions";
    const cancel = node("button", "Rester sur le classement", actions);
    const link = node("a", "Voir la fiche", actions);
    cancel.autofocus = true;
    cancel.addEventListener("click", () => dialog.close());
    link.addEventListener("click", () => dialog.close());

    function openProfile(swimmer) {
      person.textContent = `${swimmer.lastName} ${swimmer.firstName}`;
      link.href = `/performances/nageur.html?id=${encodeURIComponent(swimmer.swimmerId)}`;
      dialog.showModal();
    }

    function showMobile(swimmers) {
      if (!mobile) return;
      mobile.replaceChildren();
      if (!swimmers.length) {
        node("p", "Aucune performance dans cette catégorie.", mobile).className = "trophy-mobile-empty";
        return;
      }
      const columns = node("div", null, mobile);
      columns.className = "trophy-mobile-columns";
      columns.setAttribute("aria-hidden", "true");
      for (const label of ["Rg", "Nageur · club", "Total", ""]) node("span", label, columns);
      const list = node("div", null, mobile);
      list.setAttribute("role", "list");
      for (const [position, swimmer] of swimmers.entries()) {
        if (swimmer.rank > qualificationRank && swimmers[position - 1]?.rank <= qualificationRank) {
          const cutoff = node("p", "Limite des 32 places", list);
          cutoff.className = "trophy-mobile-cutoff";
          cutoff.setAttribute("role", "presentation");
        }
        const entry = node("div", null, list);
        entry.className = "trophy-mobile-entry";
        entry.setAttribute("role", "listitem");
        const summary = node("div", null, entry);
        summary.className = "trophy-mobile-summary";
        node("span", swimmer.rank, summary).setAttribute("aria-label", `Rang ${swimmer.rank}`);
        const name = node("button", null, summary);
        name.type = "button";
        name.className = "trophy-mobile-name";
        const fullName = `${swimmer.lastName} ${swimmer.firstName}`;
        node("span", fullName, name).className = "trophy-mobile-label";
        // The reader already supplies NAP abre_club: never invent an acronym.
        const club = node("span", `${swimmer.club || "—"} · ${swimmer.birthYear}`, name);
        club.className = "trophy-mobile-club";
        club.setAttribute("aria-label", `Club ${swimmer.club || "non renseigné"}, année ${swimmer.birthYear}`);
        name.addEventListener("click", () => openProfile(swimmer));
        const total = node("span", `${number.format(swimmer.totalPoints)} pts`, summary);
        total.className = "trophy-mobile-total";
        total.setAttribute("aria-label", `Total ${number.format(swimmer.totalPoints)} points`);
        const toggle = node("button", null, summary);
        toggle.type = "button";
        toggle.className = "trophy-mobile-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", `Afficher les cinq épreuves de ${fullName}`);
        const chevron = node("span", null, toggle);
        chevron.className = "trophy-mobile-chevron";
        chevron.setAttribute("aria-hidden", "true");
        const detail = node("div", null, entry);
        detail.className = "trophy-mobile-detail";
        detail.id = `${root.id}-courses-${position}`;
        detail.hidden = true;
        toggle.setAttribute("aria-controls", detail.id);
        const courses = node("table", null, detail);
        courses.setAttribute("aria-label", `Cinq épreuves de ${fullName}`);
        const head = courses.createTHead().insertRow();
        for (const label of ["Épreuve", "Temps", "Points"]) node("th", label, head).scope = "col";
        const body = courses.createTBody();
        for (const [index, event] of swimmer.events.entries()) {
          const row = body.insertRow();
          node("th", headers[index + 3], row).scope = "row";
          node("td", event?.time || "—", row);
          node("td", event ? number.format(event.points) : "—", row);
        }
        toggle.addEventListener("click", () => {
          detail.hidden = !detail.hidden;
          toggle.setAttribute("aria-expanded", String(!detail.hidden));
          toggle.setAttribute("aria-label", `${detail.hidden ? "Afficher" : "Masquer"} les cinq épreuves de ${fullName}`);
        });
      }
    }

    function show(sex) {
      girls.setAttribute("aria-pressed", String(sex === "F"));
      boys.setAttribute("aria-pressed", String(sex === "M"));
      body.replaceChildren();
      if (!groups[sex].length) {
        const empty = body.insertRow().insertCell();
        empty.colSpan = headers.length;
        empty.textContent = "Aucune performance dans cette catégorie.";
      }
      const swimmers = groups[sex];
      showMobile(swimmers);
      for (const [position, swimmer] of swimmers.entries()) {
        if (swimmer.rank > qualificationRank && swimmers[position - 1]?.rank <= qualificationRank) {
          const separator = body.insertRow();
          separator.className = "trophy-cutoff";
          const label = separator.insertCell();
          label.colSpan = headers.length;
          label.textContent = "Limite des 32 places";
        }
        const row = body.insertRow();
        row.className = "trophy-swimmer";
        row.setAttribute("role", "row");
        const rank = node("td", swimmer.rank, row);
        rank.setAttribute("aria-label", `Rang ${swimmer.rank}`);
        const fullName = `${swimmer.lastName} ${swimmer.firstName}`;
        const name = node("button", `${fullName} · ${swimmer.birthYear}`, node("td", null, row));
        name.className = "trophy-name";
        name.addEventListener("click", () => openProfile(swimmer));
        const club = node("td", swimmer.club || "—", row);
        club.setAttribute("aria-label", `Club ${swimmer.club || "non renseigné"}`);
        for (const [index, event] of swimmer.events.entries()) {
          const cell = node("td", null, row);
          cell.className = "trophy-course";
          const label = node("span", headers[index + 3], cell);
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
