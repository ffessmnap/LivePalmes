(function attachLivePalmesPublicSwimmers(global) {
  function cleanText(value) {
    return String(value ?? "")
      .replaceAll("ÃƒÆ’Ã‚Â©", "\u00e9")
      .replaceAll("ÃƒÆ’Ã‚Â¨", "\u00e8")
      .replaceAll("ÃƒÆ’Ã‚Âª", "\u00ea")
      .replaceAll("ÃƒÆ’Ã‚Â«", "\u00eb")
      .replaceAll("ÃƒÆ’ ", "\u00e0")
      .replaceAll("ÃƒÆ’Ã‚Â¢", "\u00e2")
      .replaceAll("ÃƒÆ’Ã‚Â¹", "\u00f9")
      .replaceAll("ÃƒÆ’Ã‚Â»", "\u00fb")
      .replaceAll("ÃƒÆ’Ã‚Â®", "\u00ee")
      .replaceAll("ÃƒÆ’Ã‚Â¯", "\u00ef")
      .replaceAll("ÃƒÆ’Ã‚Â´", "\u00f4")
      .replaceAll("ÃƒÆ’Ã‚Â§", "\u00e7")
      .replaceAll("ÃƒÂ©", "\u00e9")
      .replaceAll("ÃƒÂ¨", "\u00e8")
      .replaceAll("ÃƒÂª", "\u00ea")
      .replaceAll("ÃƒÂ«", "\u00eb")
      .replaceAll("Ãƒ ", "\u00e0")
      .replaceAll("ÃƒÂ¢", "\u00e2")
      .replaceAll("ÃƒÂ¹", "\u00f9")
      .replaceAll("ÃƒÂ»", "\u00fb")
      .replaceAll("ÃƒÂ®", "\u00ee")
      .replaceAll("ÃƒÂ¯", "\u00ef")
      .replaceAll("ÃƒÂ´", "\u00f4")
      .replaceAll("ÃƒÂ§", "\u00e7")
      .replace(/\bapn\s+e\b/gi, "apn\u00e9e")
      .replace(/\br\s+sultats\b/gi, "r\u00e9sultats")
      .replace(/\bcomp\s+tition\b/gi, "comp\u00e9tition");
  }

  function normalizeText(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function formatPersonNameParts(firstName, lastName, fallback = "") {
    const last = cleanText(lastName).trim().toLocaleUpperCase("fr-FR");
    const first = cleanText(firstName).trim();
    return [last, first].filter(Boolean).join(" ").trim() || cleanText(fallback);
  }

  function sameCategory(a, b) {
    return normalizeText(a) === normalizeText(b);
  }

  function categoryLabel(category, sex) {
    if (sameCategory(category, "Cadet")) return sex === "F" ? "Cadette" : "Cadet";
    if (sameCategory(category, "Junior")) return "Junior";
    if (sameCategory(category, "Senior")) return "Senior";
    return cleanText(category || "");
  }

  function sexLabel(sex) {
    if (sex === "F") return "Femmes";
    if (sex === "M") return "Hommes";
    return "Mixte";
  }

  function eventLabel(events = [], eventId, fallback = "") {
    return cleanText((Array.isArray(events) ? events : []).find((event) => event.id === eventId)?.label || fallback || eventId || "Course");
  }

  function categoryClass(category) {
    if (sameCategory(category, "Cadet")) return "cat-cadet";
    if (sameCategory(category, "Junior")) return "cat-junior";
    if (sameCategory(category, "Senior")) return "cat-senior";
    return "cat-other";
  }

  function isFinalStage(stage) {
    const value = String(stage || "");
    return value === "finalA" || value === "finalB" || value.startsWith("finale");
  }

  function finalStageLabel(stage) {
    const value = String(stage || "").toLowerCase();
    if (value.includes("b")) return "Finale B";
    if (value.includes("a")) return "Finale A";
    return "Finale";
  }

  function isRelayRow(row) {
    return /^4x/i.test(String(row?.eventId || row?.label || ""));
  }

  function comparableEventId(value) {
    return normalizeText(value).replace(/\s+/g, "");
  }

  function eventSignature(value) {
    const text = comparableEventId(value);
    const distance = (text.match(/\d+x?\d*/i) || [""])[0];
    const discipline = text
      .replace(distance, "")
      .replace(/metres?|m$/g, "")
      .replace(/surface/g, "sf")
      .replace(/apnee/g, "ap")
      .replace(/immersion/g, "is")
      .replace(/bipalmes?/g, "bi")
      .replace(/[^a-z0-9]/g, "");
    return `${distance}${discipline}`;
  }

  function recordEventMatches(recordEventId, eventId) {
    const recordId = comparableEventId(recordEventId);
    const raceId = comparableEventId(eventId);
    if (recordId && raceId && recordId === raceId) return true;
    const recordSig = eventSignature(recordEventId);
    const raceSig = eventSignature(eventId);
    return Boolean(recordSig && raceSig && recordSig === raceSig);
  }

  function birthYearLabel(row) {
    const value = cleanText(row?.birthDate || row?.birthYear || "");
    const match = value.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : value;
  }

  function swimmerKey(row) {
    if (row?.swimmerId) return `id:${row.swimmerId}`;
    return normalizeText([row?.lastName, row?.firstName, row?.name, row?.displayName, row?.club].filter(Boolean).join("|"));
  }

  function entrantForSeriesRow(row, entrants = []) {
    if (!row) return null;
    if (row.swimmerId) {
      return entrants.find((entrant) =>
        entrant.swimmerId === row.swimmerId &&
        (!row.eventId || !entrant.eventId || entrant.eventId === row.eventId) &&
        (!row.sex || !entrant.sex || entrant.sex === row.sex) &&
        (!row.session || !entrant.session || entrant.session === row.session)
      ) || entrants.find((entrant) => entrant.swimmerId === row.swimmerId) || null;
    }
    const key = normalizeText([row.lastName, row.firstName, row.birthDate, row.sex].join("|"));
    return entrants.find((entrant) =>
      normalizeText([entrant.lastName, entrant.firstName, entrant.birthDate, entrant.sex].join("|")) === key
    ) || null;
  }

  function displaySeriesRow(row, entrants = []) {
    const entrant = entrantForSeriesRow(row, entrants);
    if (!entrant) return row || {};
    return {
      ...entrant,
      ...row,
      lastName: row.lastName || entrant.lastName || "",
      firstName: row.firstName || entrant.firstName || "",
      name: row.name || entrant.name || entrant.displayName || "",
      displayName: row.displayName || entrant.displayName || "",
      club: row.club || entrant.club || "",
      clubCode: row.clubCode || entrant.clubCode || "",
      category: row.category || entrant.category || "",
      categoryCode: row.categoryCode || entrant.categoryCode || "",
      seedTime: row.seedTime || entrant.seedTime || "",
      birthDate: row.birthDate || entrant.birthDate || ""
    };
  }

  function swimmerName(row, entrants = []) {
    row = displaySeriesRow(row, entrants);
    const last = cleanText(row.lastName || "").trim().toLocaleUpperCase("fr-FR");
    const first = cleanText(row.firstName || "").trim();
    return [last, first].filter(Boolean).join(" ").trim() || cleanText(row.name || row.displayName || "Nageur");
  }

  function clubLabel(row, entrants = []) {
    row = displaySeriesRow(row, entrants);
    const explicit = cleanText(row.clubCode || "").trim();
    if (explicit) return explicit.toLocaleUpperCase("fr-FR");
    const club = cleanText(row.club || "").trim();
    if (!club) return "";
    const initials = club
      .replace(/['\u2019]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !/^(de|du|des|la|le|les|et|avec|en)$/i.test(word))
      .map((word) => word[0])
      .join("")
      .slice(0, 6);
    return initials.toLocaleUpperCase("fr-FR");
  }

  function lineLabel(row) {
    return row?.line || row?.lane || "-";
  }

  function seedLabel(row, entrants = []) {
    row = displaySeriesRow(row, entrants);
    return cleanText(row.seedTime || row.time || row.entryTime || "");
  }

  function isForfait(row) {
    return normalizeText(row?.importedStatus || row?.status || row?.statusLabel || row?.note).includes("forfait");
  }

  function performanceNameKey(row) {
    const parts = [row?.lastName, row?.firstName].filter(Boolean);
    return normalizeText(parts.length ? parts.join(" ") : (row?.displayName || row?.name || ""));
  }

  function performanceClubKey(row) {
    return normalizeText(row?.clubCode || row?.club || "");
  }

  function performanceDuplicateKey(performance) {
    return [
      performance?.eventId || "",
      performance?.sex || "",
      performance?.stage || "",
      performance?.phaseLabel || "",
      performanceNameKey(performance),
      birthYearLabel(performance),
      performanceClubKey(performance),
      cleanText(performance?.time || ""),
      cleanText(performance?.status || ""),
      cleanText(performance?.statusLabel || "")
    ].join("|");
  }

  function uniquePerformances(rows) {
    const seen = new Set();
    return rows.filter((performance) => {
      const key = performanceDuplicateKey(performance);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function allPublicPerformances(results = []) {
    return (Array.isArray(results) ? results : []).flatMap((result) =>
      (result.performances || []).map((performance) => ({
        ...performance,
        resultId: result.id || "",
        eventId: performance.eventId || result.eventId,
        eventLabel: performance.eventLabel || result.eventLabel,
        sex: performance.sex || result.sex,
        stage: performance.stage || result.stage,
        phaseLabel: performance.phaseLabel || result.phaseLabel,
        updatedAt: performance.updatedAt || result.updatedAt
      }))
    );
  }

  function performanceMatchesRow(performance, row, options = {}) {
    row = displaySeriesRow(row, options.entrants || []);
    if (/^4x/i.test(String(performance?.eventId || row.eventId || ""))) return false;
    if (!recordEventMatches(performance?.eventId, row.eventId)) return false;
    if (performance?.sex && row.sex && performance.sex !== row.sex) return false;
    if (performanceNameKey(performance) !== performanceNameKey(row)) return false;
    const performanceBirth = birthYearLabel(performance);
    const rowBirth = birthYearLabel(row);
    if (performanceBirth && rowBirth && performanceBirth !== rowBirth) return false;
    const performanceClub = performanceClubKey(performance);
    const rowClub = performanceClubKey(row);
    if (performanceClub && rowClub && performanceClub !== rowClub) return false;
    return true;
  }

  function performancesForProgramRow(row, options = {}) {
    const performances = allPublicPerformances(options.results || [])
      .filter((performance) => performanceMatchesRow(performance, row, options))
      .sort((a, b) => {
        const finalA = isFinalStage(a.stage) ? 1 : 0;
        const finalB = isFinalStage(b.stage) ? 1 : 0;
        return finalA - finalB || String(a.updatedAt || "").localeCompare(String(b.updatedAt || ""));
      });
    return uniquePerformances(performances);
  }

  function resultPdfLinksForProgramRow(row, performances = [], options = {}) {
    const seen = new Set();
    const results = options.results || [];
    const programKey = options.programKey || (() => "");
    const matches = performances
      .map((performance) => results.find((result) => String(result.id || "") === String(performance.resultId || "")))
      .filter(Boolean);
    if (!matches.length) {
      matches.push(...results.filter((result) =>
        result.id &&
        result.eventId === row.eventId &&
        result.sex === row.sex &&
        !isFinalStage(result.stage) &&
        (
          result.programKey === programKey(row) ||
          result.raceKey === `${row.eventId || ""}|${row.sex || ""}`
        )
      ));
    }
    return matches.filter((result) => {
      const key = result.id || result.programKey || result.raceKey;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resultPdfLabel(result) {
    if (isFinalStage(result?.stage)) return "PDF finale";
    return "PDF";
  }

  function performancePhaseLabel(performance) {
    if (!isFinalStage(performance?.stage)) return "Série";
    if (performance?.phaseLabel) return cleanText(performance.phaseLabel);
    return "Finale";
  }

  function performanceInlinePhaseLabel(performance) {
    const label = performancePhaseLabel(performance);
    const stage = String(performance?.stage || "").toLowerCase();
    if (stage.includes("b")) return "finale B";
    if (stage.includes("a")) return "finale A";
    if (/^finale\s+[AB]$/i.test(label)) {
      return label.replace(/^finale/i, "finale").replace(/\s+([ab])$/i, (_, letter) => ` ${letter.toUpperCase()}`);
    }
    return label.toLowerCase();
  }

  function finalSessionsForRace(eventId, sex, program = []) {
    return new Set((Array.isArray(program) ? program : [])
      .filter((row) => row.eventId === eventId && row.sex === sex && isFinalStage(row.stage) && row.session)
      .map((row) => String(row.session || "").trim()));
  }

  function swimmerProgramSortValue(row) {
    return Number(row?.session || 999) * 100000 +
      Number(row?.heatOrder || row?.series || 9999) * 100 +
      Number(row?.line || row?.lane || 99);
  }

  function dedupeSwimmerProgramRows(rows = [], options = {}) {
    const byRace = new Map();
    rows.forEach((row) => {
      const key = `${row.eventId || ""}|${row.sex || ""}`;
      if (!key.trim()) return;
      if (!byRace.has(key)) byRace.set(key, []);
      byRace.get(key).push(row);
    });
    return [...byRace.values()]
      .map((raceRows) => {
        const reference = raceRows[0] || {};
        const finalSessions = finalSessionsForRace(reference.eventId, reference.sex, options.program || []);
        const initialRows = raceRows.filter((row) => !finalSessions.has(String(row.session || "").trim()));
        return (initialRows.length ? initialRows : raceRows)
          .slice()
          .sort((a, b) => swimmerProgramSortValue(a) - swimmerProgramSortValue(b))[0];
      })
      .filter(Boolean)
      .sort((a, b) => swimmerProgramSortValue(a) - swimmerProgramSortValue(b));
  }

  function swimmerProgramRows(key, series = [], options = {}) {
    const entrants = options.entrants || [];
    const rows = (Array.isArray(series) ? series : [])
      .filter((row) => swimmerKey(row) === key)
      .filter((row) => !isFinalStage(row.stage) && !isRelayRow(row))
      .map((row) => displaySeriesRow(row, entrants));
    return dedupeSwimmerProgramRows(rows, options);
  }

  function swimmerResultSessions(key, options = {}) {
    const sessions = new Set();
    const program = Array.isArray(options.program) ? options.program : [];
    const rows = options.rows || swimmerProgramRows(key, options.series || [], options);
    rows.forEach((row) => {
      if (row.session) sessions.add(String(row.session).trim());
      program
        .filter((programRow) =>
          programRow.eventId === row.eventId &&
          programRow.sex === row.sex &&
          isFinalStage(programRow.stage) &&
          programRow.session
        )
        .forEach((programRow) => sessions.add(String(programRow.session).trim()));
    });
    return [...sessions].filter(Boolean);
  }

  function swimmerResultSessionsToLoad(key, options = {}) {
    const loadedSessions = options.loadedSessions || new Set();
    return swimmerResultSessions(key, options)
      .filter((session) => !loadedSessions.has(session));
  }

  function swimmerResultsAreLoading(key, options = {}) {
    const loadingKeys = options.loadingKeys || new Set();
    return Boolean(key && (
      loadingKeys.has(key) ||
      swimmerResultSessionsToLoad(key, options).length
    ));
  }

  function allSearchSwimmers(series = [], options = {}) {
    const seen = new Set();
    const entrants = options.entrants || [];
    return (Array.isArray(series) ? series : [])
      .filter((row) => !isFinalStage(row.stage) && !isRelayRow(row))
      .sort((a, b) => swimmerName(a, entrants).localeCompare(swimmerName(b, entrants), "fr") || clubLabel(a, entrants).localeCompare(clubLabel(b, entrants), "fr"))
      .reduce((items, row) => {
        const key = swimmerKey(row);
        if (!key || seen.has(key)) return items;
        seen.add(key);
        items.push(row);
        return items;
      }, []);
  }

  function searchSwimmers(query, series = [], options = {}) {
    const normalized = normalizeText(query);
    if (normalized.length < 2) return [];
    const entrants = options.entrants || [];
    const tokens = normalized.split(" ").filter(Boolean);
    return allSearchSwimmers(series, options)
      .filter((row) => {
        const displayRow = displaySeriesRow(row, entrants);
        const haystack = normalizeText(`${swimmerName(displayRow, entrants)} ${clubLabel(displayRow, entrants)} ${displayRow.club || ""}`);
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, options.limit || 8);
  }

  function performanceStatusLabel(performance) {
    const status = cleanText(performance?.status || performance?.resultStatus || "").toLowerCase();
    const label = cleanText(performance?.statusLabel || "").trim();
    const normalizedLabel = normalizeText(label);
    if (status === "dsq" || /\b(dsq|dq|disqual)/.test(normalizedLabel)) return "DSQ";
    if (status === "ab" || /\b(ab|abd|dnf|abandon)\b/.test(normalizedLabel)) return "ABD";
    if (status === "dns" || /\b(dns|ns|abs|absent|forfait)\b/.test(normalizedLabel)) return "Forfait";
    return label;
  }

  function performanceValueLabel(performance) {
    return cleanText(performanceStatusLabel(performance) || performance?.time || "-");
  }

  function timeToMs(value) {
    const text = String(value || "").trim();
    const parts = text.split(":");
    if (!text) return Number.POSITIVE_INFINITY;
    if (parts.length === 2) {
      const ms = (Number(parts[0]) * 60 + Number(parts[1].replace(",", "."))) * 1000;
      return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
    }
    const ms = Number(text.replace(",", ".")) * 1000;
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
  }

  function formatPublicDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function publicResultFromDoc(doc) {
    const result = { id: doc.id, ...doc.data() };
    delete result.pdfDataUrl;
    return result;
  }

  function mergePublicResults(currentResults = [], nextResults = []) {
    const byId = new Map((Array.isArray(currentResults) ? currentResults : []).map((result) => [result.id, result]));
    (Array.isArray(nextResults) ? nextResults : []).forEach((result) => {
      if (!result?.id) return;
      byId.set(result.id, result);
    });
    const results = [...byId.values()]
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    const latestUpdatedAt = results
      .map((result) => result.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || "";
    return { results, latestUpdatedAt };
  }

  function latestResultSession(results = [], options = {}) {
    const isVisible = options.isVisible || (() => true);
    const latest = (Array.isArray(results) ? results : [])
      .filter((result) => result.session && isVisible(result))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
    return latest?.session || "";
  }

  function setStatus(statusBadge, label, className = "pending", options = {}) {
    if (!statusBadge) return;
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    if (className === "ok") {
      statusBadge.hidden = true;
      statusBadge.innerHTML = "";
      return;
    }
    statusBadge.hidden = false;
    statusBadge.className = `firebase-header-status ${className}`;
    statusBadge.innerHTML = `<i class="firebase-dot ${className}" aria-hidden="true"></i>${escapeHtml(label)}`;
  }

  function publicCompetitionDocument(config, competitionId) {
    if (!global.firebase?.initializeApp || !global.firebase?.firestore) return null;
    if (!global.firebase.apps?.length) {
      global.firebase.initializeApp(config);
    }
    return global.firebase.firestore().collection("competitions").doc(competitionId);
  }

  function seriesPdfForSession(seriesPdfs = [], session = "") {
    const exact = seriesPdfs.find((pdf) => pdf.scope === "session" && String(pdf.session || "") === String(session || ""));
    return exact || seriesPdfs.find((pdf) => pdf.scope === "full") || null;
  }

  function liveDataIsNewerThanPublicIndex(remote, index) {
    if (!remote?.sourceVersion) return false;
    if (!index?.sourceVersion) return true;
    return remote.sourceVersion !== index.sourceVersion;
  }

  function performanceDeltaLabel(performance, referenceTime, referenceLabel = "") {
    if (performance?.status || !performance?.time || !referenceTime) return "";
    const performanceMs = timeToMs(performance.time);
    const referenceMs = timeToMs(referenceTime);
    if (!Number.isFinite(performanceMs) || !Number.isFinite(referenceMs)) return "";
    const delta = (performanceMs - referenceMs) / 1000;
    if (!Number.isFinite(delta)) return "";
    const sign = delta >= 0 ? "+" : "-";
    return `${sign}${Math.abs(delta).toFixed(2).replace(".", ",")}s${referenceLabel ? ` / ${referenceLabel}` : ""}`;
  }

  function escapeHtmlFallback(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function swimmerCategoryBirthHtml(row, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const category = categoryLabel(row?.category, row?.sex);
    const birthYear = birthYearLabel(row);
    if (!category && !birthYear) return "-";
    return [
      category ? `<span class="public-swimmer-category ${categoryClass(row?.category)}">${escapeHtml(category)}</span>` : "",
      birthYear ? `<span class="public-swimmer-birth">&middot; ${escapeHtml(birthYear)}</span>` : ""
    ].filter(Boolean).join("");
  }

  function renderSwimmerResultPdfLinks(row, performances = [], options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const results = resultPdfLinksForProgramRow(row, performances, options);
    if (!results.length) return "";
    return `
      <span class="public-swimmer-pdf-actions">
        ${results.map((result) => `
          <a class="public-swimmer-pdf-link" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id || "")}" aria-label="Voir le PDF r&eacute;sultat">
            ${escapeHtml(resultPdfLabel(result))}
          </a>
        `).join("")}
      </span>
    `;
  }

  function renderPerformanceLines(row, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const performances = options.performances || performancesForProgramRow(row, options);
    if (!performances.length) return "";
    const engagementReference = seedLabel(row, options.entrants || []);
    let seriesReference = "";
    return performances.map((performance) => {
      const final = isFinalStage(performance.stage);
      const reference = final ? seriesReference : engagementReference;
      const delta = performanceDeltaLabel(performance, reference, final ? "s\u00e9rie" : "eng.");
      if (!final && performance.time) seriesReference = performance.time;
      return `
        <span class="public-performance-line">
          R&eacute;alis&eacute; ${escapeHtml(performanceInlinePhaseLabel(performance))} : <strong>${escapeHtml(performanceValueLabel(performance))}</strong>
          ${delta ? `<em class="public-performance-delta ${delta.startsWith("-") ? "faster" : "slower"}">${escapeHtml(delta)}</em>` : ""}
        </span>
      `;
    }).join("");
  }

  function renderSwimmerProgramMeta(row, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const performances = options.performances || performancesForProgramRow(row, options);
    const engagement = options.forfait ? "Forfait" : (seedLabel(row, options.entrants || []) || "-");
    if (performances.length) {
      return `<span class="public-entry-line">Engagement : ${escapeHtml(engagement)}</span>`;
    }
    return `<span>S&eacute;rie ${escapeHtml(row?.series || "-")} &middot; Ligne ${escapeHtml(lineLabel(row))} &middot; Engagement : ${escapeHtml(engagement)}</span>`;
  }

  function renderInlineSwimmerProgram(key, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const rows = options.rows || [];
    const swimmer = rows[0];
    if (!swimmer) return "";
    const programHead = `
      <div class="public-search-program-head">
        <span>${escapeHtml(clubLabel(swimmer, options.entrants || []) || "-")}</span>
        <strong>${escapeHtml(swimmerName(swimmer, options.entrants || []))}</strong>
        <em>${swimmerCategoryBirthHtml(swimmer, options)}</em>
      </div>
    `;
    if (options.loading) {
      return `
        <div class="public-search-program">
          ${programHead}
          <p class="panel-subtitle public-search-empty">Chargement des temps du nageur...</p>
        </div>
      `;
    }
    const rowStartTime = options.rowStartTime || ((row) => row?.startTime || "");
    const eventLabel = options.eventLabel || ((eventId, fallback = "") => cleanText(fallback || eventId || "Course"));
    const sexLabel = options.sexLabel || ((sex) => sex === "F" ? "Femmes" : (sex === "M" ? "Hommes" : "Mixte"));
    const rowIsForfait = options.isForfait || isForfait;
    return `
      <div class="public-search-program">
        ${programHead}
        <div class="public-swimmer-program">
          ${rows.map((row) => {
            const time = row.startTime || rowStartTime(row);
            const forfait = rowIsForfait(row);
            const performances = performancesForProgramRow(row, options);
            const timeLabel = performances.length ? "" : (time ? ` &middot; ${escapeHtml(time)}` : "");
            return `
              <div class="public-swimmer-program-row ${forfait ? "is-forfait" : ""}">
                <div class="public-swimmer-program-row-head">
                  <strong>S${escapeHtml(row.session || "-")}${timeLabel} &middot; ${escapeHtml(eventLabel(row.eventId, row.label))} ${escapeHtml(sexLabel(row.sex))}</strong>
                  ${renderSwimmerResultPdfLinks(row, performances, options)}
                </div>
                ${renderSwimmerProgramMeta(row, { ...options, forfait, performances })}
                ${renderPerformanceLines(row, { ...options, performances })}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderSwimmerSearchContent(options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const query = options.query || "";
    const selectedKey = options.selectedKey || "";
    const renderProgram = options.renderProgram || (() => "");
    const matches = options.matches || [];
    if (selectedKey) return renderProgram(selectedKey);
    if (normalizeText(query).length < 2) {
      return `<p class="panel-subtitle public-search-empty">Tape au moins 2 lettres pour chercher un nageur.</p>`;
    }
    if (!matches.length) {
      return `<p class="panel-subtitle public-search-empty">Aucun nageur trouv&eacute;.</p>`;
    }
    return `
      <div class="public-search-results" aria-label="Nageurs trouv&eacute;s">
        ${matches.map((row) => {
          const key = swimmerKey(row);
          return `
            <button class="public-search-result ${key === selectedKey ? "active" : ""}" type="button" data-search-swimmer-key="${escapeHtml(key)}">
              <strong>${escapeHtml(swimmerName(row, options.entrants || []))}</strong>
              <span>${escapeHtml(clubLabel(row, options.entrants || []) || "-")}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSwimmerSearchSection(options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    if (options.hidden) return "";
    return `
      <section class="panel public-swimmer-search-panel">
        <label class="public-swimmer-search">
          <span>Recherche nageur</span>
          <input id="publicSwimmerSearchInput" type="search" inputmode="search" autocomplete="off" placeholder="Nom ou club" value="${escapeHtml(options.query || "")}">
        </label>
        <div id="publicSwimmerSearchOutput" class="public-swimmer-search-output">
          ${renderSwimmerSearchContent(options)}
        </div>
      </section>
    `;
  }

  function renderSessionInformation(session, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const infos = options.infos || {};
    const text = cleanText(infos?.[session] || "").trim();
    if (!text) return "";
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const visibleLines = lines.filter((line) => !/^!{0,2}\s*Live\s+vid[e\u00e9]o\s*:\s*$/i.test(line));
    const renderLineContent = (line) => {
      const videoMatch = line.match(/^Live\s+vid[e\u00e9]o\s*:\s*(https?:\/\/\S+)/i);
      if (videoMatch) {
        return `<a class="public-session-video-link" href="${escapeHtml(videoMatch[1])}" target="_blank" rel="noopener">&#128249; Live vid&eacute;o</a>`;
      }
      return escapeHtml(line);
    };
    return `
      <div class="public-session-info">
        <strong>Informations</strong>
        ${visibleLines.map((line) => {
          const isWarning = line.startsWith("!!");
          const isNotice = !isWarning && line.startsWith("!");
          const displayLine = isWarning ? line.slice(2).trim() : (isNotice ? line.slice(1).trim() : line);
          const className = isWarning ? "public-session-warning" : (isNotice ? "public-session-notice" : "");
          const icon = isWarning || isNotice
            ? `<span class="public-session-info-icon" aria-hidden="true">!</span>`
            : "";
          return `<p class="${className}">${icon}${renderLineContent(displayLine)}</p>`;
        }).join("")}
      </div>
    `;
  }

  global.LivePalmesPublicSwimmers = {
    birthYearLabel,
    allPublicPerformances,
    allSearchSwimmers,
    categoryClass,
    categoryLabel,
    cleanText,
    clubLabel,
    comparableEventId,
    dedupeSwimmerProgramRows,
    displaySeriesRow,
    entrantForSeriesRow,
    eventLabel,
    eventSignature,
    finalStageLabel,
    finalSessionsForRace,
    formatPublicDateTime,
    formatPersonNameParts,
    isForfait,
    isFinalStage,
    isRelayRow,
    latestResultSession,
    lineLabel,
    liveDataIsNewerThanPublicIndex,
    mergePublicResults,
    normalizeText,
    performanceClubKey,
    performanceDeltaLabel,
    performanceDuplicateKey,
    performanceInlinePhaseLabel,
    performanceNameKey,
    performancePhaseLabel,
    performanceStatusLabel,
    performanceValueLabel,
    performanceMatchesRow,
    performancesForProgramRow,
    publicCompetitionDocument,
    publicResultFromDoc,
    recordEventMatches,
    renderInlineSwimmerProgram,
    renderPerformanceLines,
    renderSessionInformation,
    renderSwimmerSearchContent,
    renderSwimmerSearchSection,
    renderSwimmerProgramMeta,
    renderSwimmerResultPdfLinks,
    resultPdfLabel,
    resultPdfLinksForProgramRow,
    sameCategory,
    searchSwimmers,
    seedLabel,
    seriesPdfForSession,
    setStatus,
    sexLabel,
    swimmerKey,
    swimmerCategoryBirthHtml,
    swimmerName,
    swimmerProgramRows,
    swimmerResultSessions,
    swimmerResultSessionsToLoad,
    swimmerResultsAreLoading,
    swimmerProgramSortValue,
    timeToMs,
    uniquePerformances
  };
})(window);
