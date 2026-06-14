(function attachLivePalmesDamienHebertTrophy(global) {
  const TROPHY_EVENT_ORDER = ["50sf", "50bi", "100is", "400sf", "800sf"];
  const TROPHY_EVENTS = new Set(TROPHY_EVENT_ORDER);

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function normalizeText(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function eventRank(eventId) {
    const index = TROPHY_EVENT_ORDER.indexOf(String(eventId || "").toLowerCase());
    return index >= 0 ? index : TROPHY_EVENT_ORDER.length;
  }

  function trophyEventId(result = {}, row = {}) {
    const direct = cleanText(row.eventId || result.eventId).toLowerCase();
    if (TROPHY_EVENTS.has(direct)) return direct;
    const label = normalizeText([row.eventLabel, result.eventLabel].filter(Boolean).join(" "));
    if (/50.*surface|50sf/.test(label)) return "50sf";
    if (/50.*bipalmes|50bi/.test(label)) return "50bi";
    if (/100.*immersion|100is/.test(label)) return "100is";
    if (/400.*surface|400sf/.test(label)) return "400sf";
    if (/800.*surface|800sf/.test(label)) return "800sf";
    return "";
  }

  function rowPoints(row = {}) {
    const value = cleanText(row.points ?? row.score ?? row.trophyPoints);
    const match = value.match(/^\d{1,4}$/);
    if (!match) return null;
    const points = Number(value);
    return Number.isFinite(points) ? points : null;
  }

  function rowSex(result = {}, row = {}) {
    const value = cleanText(row.sex || result.sex).toUpperCase();
    if (value === "F" || /^fem/.test(value.toLowerCase())) return "F";
    if (value === "M" || value === "H" || /^hom/.test(value.toLowerCase())) return "M";
    return "";
  }

  function isMinimeRow(result = {}, row = {}) {
    const rowCategoryText = normalizeText([
      row.category,
      row.categoryLabel,
      row.categoryCode
    ].filter(Boolean).join(" "));
    const text = rowCategoryText || normalizeText([
      result.category,
      result.categoryLabel,
      result.eventLabel
    ].filter(Boolean).join(" "));
    return /\bmi\b/.test(text) ||
      text.includes("minime") ||
      /[fh]mi/.test(text);
  }

  function rowName(row = {}) {
    return cleanText(row.displayName || row.name || [row.lastName, row.firstName].filter(Boolean).join(" "));
  }

  function competitorKey(result = {}, row = {}, options = {}) {
    const normalizePersonName = typeof options.normalizePersonName === "function"
      ? options.normalizePersonName
      : ((value) => normalizeText(value));
    return [
      rowSex(result, row),
      normalizePersonName(rowName(row)),
      cleanText(row.birthYear || row.birthDate),
      normalizeText(row.club || row.clubCode)
    ].join("|");
  }

  function resultRows(result = {}) {
    const rows = Array.isArray(result.ranking) && result.ranking.length
      ? result.ranking
      : (Array.isArray(result.performances) ? result.performances : []);
    return rows.filter(Boolean);
  }

  function betterEventRow(left, right) {
    if (!left) return right;
    if (!right) return left;
    return Number(right.points || 0) > Number(left.points || 0) ? right : left;
  }

  function provisionalRankings(results = [], options = {}) {
    const swimmers = new Map();
    (Array.isArray(results) ? results : []).forEach((result) => {
      resultRows(result).forEach((row) => {
        const points = rowPoints(row);
        if (points === null || !isMinimeRow(result, row)) return;
        const eventId = trophyEventId(result, row);
        if (!eventId) return;
        const sex = rowSex(result, row);
        if (sex !== "F" && sex !== "M") return;
        const key = competitorKey(result, row, options);
        if (!swimmers.has(key)) {
          swimmers.set(key, {
            key,
            sex,
            name: rowName(row),
            birthYear: cleanText(row.birthYear || row.birthDate),
            club: cleanText(row.club || row.clubCode),
            events: new Map()
          });
        }
        const swimmer = swimmers.get(key);
        const eventRow = {
          eventId,
          eventLabel: cleanText(row.eventLabel || result.eventLabel || eventId),
          points,
          rank: row.rank || "",
          time: cleanText(row.time),
          resultId: cleanText(result.id),
          session: cleanText(result.session || row.session),
          updatedAt: cleanText(result.updatedAt || row.updatedAt)
        };
        swimmer.events.set(eventId, betterEventRow(swimmer.events.get(eventId), eventRow));
      });
    });

    const rows = Array.from(swimmers.values()).map((swimmer) => {
      const events = Array.from(swimmer.events.values())
        .sort((a, b) => eventRank(a.eventId) - eventRank(b.eventId));
      const totalPoints = events.reduce((sum, event) => sum + Number(event.points || 0), 0);
      const bestPoints = events.reduce((best, event) => Math.max(best, Number(event.points || 0)), 0);
      return {
        ...swimmer,
        events,
        eventCount: events.length,
        totalPoints,
        bestPoints
      };
    }).sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.eventCount - a.eventCount ||
      b.bestPoints - a.bestPoints ||
      a.name.localeCompare(b.name, "fr")
    ).map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      all: rows,
      female: rows.filter((row) => row.sex === "F").map((row, index) => ({ ...row, rank: index + 1 })),
      male: rows.filter((row) => row.sex === "M").map((row, index) => ({ ...row, rank: index + 1 }))
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function eventSummary(row) {
    return row.events
      .map((event) => `${event.eventId.toUpperCase()} ${event.points}`)
      .join(" - ");
  }

  function swumEvents(rows = []) {
    const events = new Set();
    rows.forEach((row) => {
      (row.events || []).forEach((event) => {
        if (event.eventId) events.add(event.eventId);
      });
    });
    return TROPHY_EVENT_ORDER
      .filter((eventId) => events.has(eventId))
      .map((eventId) => eventId.toUpperCase());
  }

  function renderRankingTable(title, rows = [], options = {}) {
    if (!rows.length) {
      return `
        <section class="trophy-ranking-group">
          <h4>${title}</h4>
          <p class="panel-subtitle">Aucun point minime lu pour l'instant.</p>
        </section>
      `;
    }
    const limit = Number(options.limit || 0);
    const displayedRows = limit > 0 ? rows.slice(0, limit) : rows;
    return `
      <section class="trophy-ranking-group">
        <h4>${title}</h4>
        <table class="trophy-ranking-table">
          <thead>
            <tr>
              <th>Rg</th>
              <th>Nageur</th>
              <th>Club</th>
              <th>Pts</th>
              <th>Courses</th>
            </tr>
          </thead>
          <tbody>
            ${displayedRows.map((row) => `
              <tr class="${row.rank === 1 ? "trophy-podium-gold" : (row.rank === 2 ? "trophy-podium-silver" : (row.rank === 3 ? "trophy-podium-bronze" : ""))}">
                <td>${escapeHtml(row.rank)}</td>
                <td class="trophy-name-cell">
                  <span class="trophy-row-name">${escapeHtml(row.name)}</span>
                  ${row.birthYear ? ` <small class="trophy-row-birth">${escapeHtml(row.birthYear)}</small>` : ""}
                  ${row.club ? `<small class="trophy-mobile-club">${escapeHtml(row.club)}</small>` : ""}
                  ${row.events?.length ? `<small class="trophy-mobile-events">${escapeHtml(eventSummary(row))}</small>` : ""}
                </td>
                <td class="trophy-club-cell">${escapeHtml(row.club)}</td>
                <td class="trophy-points-cell"><strong>${escapeHtml(row.totalPoints)}</strong></td>
                <td class="trophy-events-cell">${escapeHtml(eventSummary(row))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  function renderProvisionalHtml(results = [], options = {}) {
    const rankings = provisionalRankings(results, options);
    const pointRows = rankings.all.length;
    return `
      <section class="trophy-provisional-panel" aria-label="Classement provisoire Troph&eacute;e Damien H&eacute;bert">
        <div class="trophy-provisional-head">
          <div>
            <h3>Troph&eacute;e Damien H&eacute;bert</h3>
            <p class="panel-subtitle">Classement provisoire local sur les points lus dans les PDF minimes.</p>
          </div>
          <span class="result-status-badge partial">${escapeHtml(pointRows)} nageur${pointRows > 1 ? "s" : ""}</span>
        </div>
        <div class="trophy-ranking-grid">
          ${renderRankingTable("Filles", rankings.female, { limit: 12 })}
          ${renderRankingTable("Gar&ccedil;ons", rankings.male, { limit: 12 })}
        </div>
      </section>
    `;
  }

  function renderPublicProvisionalHtml(results = [], options = {}) {
    return renderPublicSnapshotHtml(buildSnapshot(results, options));
  }

  function buildSnapshot(results = [], options = {}) {
    return {
      type: "tdh",
      version: 1,
      createdAt: new Date().toISOString(),
      rankings: provisionalRankings(results, options)
    };
  }

  function renderPublicSnapshotHtml(snapshot = {}) {
    const rankings = snapshot.rankings || snapshot || {};
    const femaleRows = Array.isArray(rankings.female) ? rankings.female : [];
    const maleRows = Array.isArray(rankings.male) ? rankings.male : [];
    const femaleEvents = swumEvents(rankings.female);
    const maleEvents = swumEvents(rankings.male);
    return `
      <div class="tdh-public-dialog" role="dialog" aria-modal="true" aria-label="Classement provisoire Troph&eacute;e Damien H&eacute;bert">
        <div class="tdh-public-head">
          <div>
            <span>Classement provisoire</span>
            <h2>Troph&eacute;e Damien H&eacute;bert</h2>
            <p>Addition des points des 5 courses minimes de la comp&eacute;tition.</p>
          </div>
          <button class="public-swimmer-close" type="button" data-close-tdh-ranking aria-label="Fermer">x</button>
        </div>
        <div class="tdh-public-note">
          Le classement est mis &agrave; jour au fil des r&eacute;sultats import&eacute;s. Il reste provisoire jusqu'&agrave; publication compl&egrave;te.
        </div>
        <div class="tdh-public-grid">
          <section id="tdh-ranking-female" class="tdh-public-group">
            <div class="tdh-public-group-head">
              <div>
                <h3>TDH Filles</h3>
                <span>Courses nag&eacute;es : ${escapeHtml(femaleEvents.join(", ") || "aucune")}</span>
              </div>
              <div class="tdh-public-jump" aria-label="Acc&egrave;s rapide aux classements TDH">
                <button class="ghost-button compact" type="button" data-tdh-jump="tdh-ranking-female">Filles</button>
                <button class="ghost-button compact" type="button" data-tdh-jump="tdh-ranking-male">Gar&ccedil;ons</button>
              </div>
            </div>
            ${renderRankingTable("Minimes filles", femaleRows)}
          </section>
          <section id="tdh-ranking-male" class="tdh-public-group">
            <div class="tdh-public-group-head">
              <div>
                <h3>TDH Gar&ccedil;ons</h3>
                <span>Courses nag&eacute;es : ${escapeHtml(maleEvents.join(", ") || "aucune")}</span>
              </div>
              <div class="tdh-public-jump" aria-label="Acc&egrave;s rapide aux classements TDH">
                <button class="ghost-button compact" type="button" data-tdh-jump="tdh-ranking-female">Filles</button>
                <button class="ghost-button compact" type="button" data-tdh-jump="tdh-ranking-male">Gar&ccedil;ons</button>
              </div>
            </div>
            ${renderRankingTable("Minimes gar&ccedil;ons", maleRows)}
          </section>
        </div>
      </div>
    `;
  }

  global.LivePalmesDamienHebertTrophy = {
    TROPHY_EVENT_ORDER,
    buildSnapshot,
    isMinimeRow,
    provisionalRankings,
    renderPublicProvisionalHtml,
    renderPublicSnapshotHtml,
    renderProvisionalHtml,
    rowPoints,
    swumEvents,
    trophyEventId
  };
})(window);
