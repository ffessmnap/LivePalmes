(function attachIntranapSwimmerPage(global) {
  const summary = global.LIVEPALMES_INTRANAP_SUMMARY || { counts: {}, filters: { courses: [] } };
  let recordData = global.LIVEPALMES_RECORDS || { records: [], franceRecords: [] };
  const swimmerRowsCache = new Map();
  const swimmerSearchCache = new Map();
  const publicVersion = global.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION || summary.generatedAt || "20260602-swimmer-card-2";
  const dataVersion = encodeURIComponent(publicVersion);
  const publicPerformanceBase = "public/data/performance-public";
  const usesConsolidatedData = true;
  const publicAdditionalDataUrl = global.LivePalmesAppConfig?.performanceAdditionalDataUrl ||
    "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public/additional-data.json";

  const elements = {
    search: document.querySelector("#swimmerSearchInput"),
    suggestions: document.querySelector("#swimmerSearchResults"),
    season: document.querySelector("#swimmerSeasonFilter"),
    course: document.querySelector("#swimmerCourseFilter"),
    displayMode: document.querySelector("#swimmerDisplayMode"),
    progress: document.querySelector("#progressPanel"),
    title: document.querySelector("#swimmerTitle"),
    status: document.querySelector("#swimmerStatus"),
    profile: document.querySelector("#swimmerProfilePanel"),
    body: document.querySelector("#swimmerBestBody"),
    card: document.querySelector("#swimmerCard")
  };

  const COURSE_FAMILIES = [
    { key: "SF", label: "Surface" },
    { key: "AP", label: "Apn\u00e9e" },
    { key: "IS", label: "Immersion" },
    { key: "BI", label: "Bi-palmes" }
  ];

  const courseOrder = new Map((summary.filters.courses || []).map((course, index) => [course.code, index]));

  let selectedSwimmer = null;
  let selectedPerfs = [];
  let swimmerSearchMatches = [];
  let swimmerSearchRequestId = 0;
  let additionalPerfs = [];
  let additionalSwimmers = [];
  let performanceCorrections = [];
  let additionalLoaded = false;
  let additionalLoad = null;
  const publicSwimmerSearchShards = new Map();
  const publicSwimmerIdShards = new Map();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR")
      .trim();
  }

  function normalizeSearchToken(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
  }

  function searchShardFromQuery(value) {
    const token = normalizeSearchToken(value).split(/\s+/).find((item) => item.length >= 2) || "";
    return token.slice(0, 2);
  }

  function idShardFromValue(value) {
    const id = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!id) return "";
    if (id.length === 1) return `0${id}`;
    return id.slice(0, 2);
  }

  function normalizeIdentityPart(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
  }

  function swimmerIdentityKey(swimmer) {
    const first = normalizeIdentityPart(swimmer?.firstName);
    const last = normalizeIdentityPart(swimmer?.lastName);
    const birth = String(swimmer?.birthDate || "").trim();
    return first && last && birth ? `${last}|${first}|${birth}` : "";
  }

  function swimmerKnownIds(swimmer) {
    return Array.from(new Set([
      swimmer?.id,
      ...(Array.isArray(swimmer?.aliases) ? swimmer.aliases : []),
      ...(Array.isArray(swimmer?.sourceIds) ? swimmer.sourceIds : [])
    ].map((id) => String(id || "").trim()).filter(Boolean)));
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "-");
  }

  function realAgeFromBirthDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return "";
    const today = new Date();
    let age = today.getFullYear() - year;
    const birthdayPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
    if (!birthdayPassed) age -= 1;
    return age >= 0 && age <= 130 ? `${age} an${age > 1 ? "s" : ""}` : "";
  }

  function displayName(swimmer) {
    return swimmer?.name || [swimmer?.firstName, swimmer?.lastName].filter(Boolean).join(" ");
  }

  function displayClubLabel(perfOrSwimmer) {
    const club = String(perfOrSwimmer?.club || "").trim();
    const clubName = String(perfOrSwimmer?.clubName || "").trim();
    if (club && clubName && normalize(club) !== normalize(clubName)) return `${club} · ${clubName}`;
    return club || clubName || "";
  }

  function latestKnownClub(swimmer, perfs) {
    const latestPerf = perfs.find((perf) => displayClubLabel(perf));
    return displayClubLabel(latestPerf) || displayClubLabel(swimmer) || "-";
  }

  function competitionCount(perfs) {
    const competitions = new Set();
    perfs
      .filter((perf) => !perf.isIntermediate)
      .forEach((perf) => {
        const id = String(perf.competitionId || "").trim();
        const fallback = [perf.competition, perf.date, perf.location].map((value) => String(value || "").trim()).filter(Boolean).join("|");
        if (id) competitions.add(`id:${id}`);
        else if (fallback) competitions.add(`fallback:${fallback}`);
      });
    return competitions.size;
  }

  function performanceCount(perfs) {
    return perfs.filter((perf) => !perf.isIntermediate).length;
  }

  function isIndividualRecord(record) {
    return record &&
      !String(record.style || "").startsWith("RELAY") &&
      !String(record.course || "").startsWith("4X");
  }

  function swimmerMatchesRecord(swimmer, record) {
    if (!isIndividualRecord(record)) return false;
    if (record.sex && swimmer.sex && record.sex !== swimmer.sex) return false;
    if (record.swimmerId && String(record.swimmerId) === String(swimmer.id)) return true;
    if (normalize(record.swimmer) !== normalize(displayName(swimmer))) return false;
    if (!record.birthDate || !swimmer.birthDate) return true;
    if (record.birthDate === swimmer.birthDate) return true;
    const recordYear = String(record.birthDate).slice(0, 4);
    const swimmerYear = String(swimmer.birthDate).slice(0, 4);
    return recordYear === swimmerYear && String(record.birthDate).endsWith("-01-01");
  }

  function categoryDisplayCode(record) {
    if (record.categoryCode) return record.categoryCode;
    const prefix = record.sex === "M" ? "H" : "F";
    const codes = {
      P: `${prefix}PO`,
      B: `${prefix}BE`,
      M: `${prefix}MI`,
      C: `${prefix}CA`,
      J: `${prefix}JU`,
      S: `${prefix}SE`,
      "M30+": `${prefix}30+`,
      "M40+": `${prefix}40+`,
      "M50+": `${prefix}50+`,
      "M60+": `${prefix}60+`,
      "M70+": `${prefix}70+`,
      "M80+": `${prefix}80+`
    };
    return codes[record.category] || record.category || "";
  }

  function categoryDisplayLabel(record) {
    const female = record.sex === "F";
    const labels = {
      P: female ? "Poussine" : "Poussin",
      B: female ? "Benjamine" : "Benjamin",
      M: "Minime",
      C: female ? "Cadette" : "Cadet",
      J: "Junior",
      S: "Senior",
      "M30+": "Senior 30+",
      "M40+": "Master 40+",
      "M50+": "Master 50+",
      "M60+": "Master 60+",
      "M70+": "Master 70+",
      "M80+": "Master 80+"
    };
    return labels[record.category] || record.categoryLabel || record.category || "";
  }

  function recordLabel(record) {
    const scope = record.recordType === "RFJ" ? "RFJ" : record.recordType === "RF" ? "RF" : "MPF";
    return [scope, record.courseShortLabel || record.course, categoryDisplayCode(record)]
      .filter(Boolean)
      .join(" · ");
  }

  function recordScopeRank(record) {
    if (record.recordType === "RF") return 0;
    if (record.recordType === "RFJ") return 1;
    return 2;
  }

  function recordScopeLabel(record) {
    if (record.recordType === "RF") return "Record de France";
    if (record.recordType === "RFJ") return "Record de France Junior";
    return "MPF";
  }

  function recordGroupKey(record) {
    if (record.recordType === "RF") return "RF";
    if (record.recordType === "RFJ") return "RFJ";
    return "MPF";
  }

  function recordGroupLabel(key) {
    const labels = {
      RF: "Records de France",
      RFJ: "Records de France Juniors",
      MPF: "MPF"
    };
    return labels[key] || key;
  }

  function swimmerRecords(swimmer) {
    const franceRecords = (recordData.franceRecords || [])
      .filter((record) => swimmerMatchesRecord(swimmer, record));
    const mpfRecords = (recordData.records || [])
      .filter((record) => swimmerMatchesRecord(swimmer, record));
    return [...franceRecords, ...mpfRecords].sort((a, b) =>
      recordScopeRank(a) - recordScopeRank(b) ||
      compareCourse(a, b) ||
      String(categoryDisplayCode(a)).localeCompare(String(categoryDisplayCode(b)), "fr-FR", { numeric: true })
    );
  }

  function renderSwimmerProfile(swimmer, perfs) {
    if (!elements.profile) return;
    const records = swimmerRecords(swimmer);
    const rfCount = records.filter((record) => record.recordType === "RF").length;
    const rfjCount = records.filter((record) => record.recordType === "RFJ").length;
    const mpfCount = records.filter((record) => !record.recordType).length;
    const birthDate = swimmer.birthDate ? formatDate(swimmer.birthDate) : "-";
    const realAge = realAgeFromBirthDate(swimmer.birthDate);
    const birthDateWithAge = realAge ? `${birthDate} (${realAge})` : birthDate;
    const perfsCount = performanceCount(perfs);
    const competitions = competitionCount(perfs);
    const latestClub = latestKnownClub(swimmer, perfs);
    const recordGroups = ["RF", "RFJ", "MPF"].map((key) => {
      const rows = records
        .map((record, index) => ({ record, index }))
        .filter((item) => recordGroupKey(item.record) === key);
      return { key, rows };
    }).filter((group) => group.rows.length);

    elements.profile.hidden = false;
    elements.profile.innerHTML = `
      <div class="swimmer-profile-stats">
        <div><span>Date de naissance</span><strong>${escapeHtml(birthDateWithAge)}</strong></div>
        <div><span>Dernier club connu</span><strong>${escapeHtml(latestClub)}</strong></div>
        <div><span>Performances bassin</span><strong>${perfsCount.toLocaleString("fr-FR")}</strong></div>
        <div><span>Comp&eacute;titions</span><strong>${competitions.toLocaleString("fr-FR")}</strong></div>
      </div>
      <div class="swimmer-profile-honors">
        <div class="swimmer-profile-honors-head">
          <span>MPF et records d&eacute;tenus</span>
          <strong>${records.length ? `RF ${rfCount} · RFJ ${rfjCount} · MPF ${mpfCount}` : "Aucun record individuel connu"}</strong>
        </div>
        ${records.length ? `
          <div class="swimmer-profile-records">
            ${recordGroups.map((group) => `
              <section class="swimmer-record-group${group.rows.some((item) => item.index < 5) ? "" : " is-extra"}">
                <h3>${escapeHtml(recordGroupLabel(group.key))}</h3>
                ${group.rows.map(({ record, index }) => `
                  <div class="swimmer-record-line${index >= 5 ? " is-extra" : ""}">
                    <span>${escapeHtml(categoryDisplayLabel(record) || "-")}</span>
                    <strong>${escapeHtml(record.courseShortLabel || record.course || "-")}</strong>
                    <strong>${escapeHtml(record.time || "-")}</strong>
                    <span>${escapeHtml(formatDate(record.date))}</span>
                  </div>
                `).join("")}
              </section>
            `).join("")}
          </div>
          ${records.length > 5 ? `<button type="button" class="swimmer-records-toggle" data-swimmer-records-toggle data-collapsed-label="Afficher tout le palmar&egrave;s" data-expanded-label="Masquer le d&eacute;tail">Afficher tout le palmar&egrave;s</button>` : ""}
        ` : ""}
      </div>
    `;
  }

  function rawSwimmers() {
    return swimmerSearchMatches;
  }

  function mergeSwimmerProfiles(base, next) {
    const ids = Array.from(new Set([...swimmerKnownIds(base), ...swimmerKnownIds(next)]));
    return {
      ...base,
      aliases: ids.filter((id) => id !== String(base.id)),
      sourceIds: ids,
      clubId: base.clubId || next.clubId || "",
      club: base.club || next.club || "",
      clubName: base.clubName || next.clubName || "",
      performanceCount: Number(base.performanceCount || 0) + Number(next.performanceCount || 0)
    };
  }

  function allSwimmers() {
    return rawSwimmers();
  }

  function swimmerMergeKey(swimmer) {
    return swimmer?.identityKey || swimmerIdentityKey(swimmer) || String(swimmer?.id || "");
  }

  function uniqueSwimmers(swimmers) {
    const byKey = new Map();
    swimmers.forEach((swimmer) => {
      const key = swimmerMergeKey(swimmer);
      if (!key) return;
      byKey.set(key, byKey.has(key) ? mergeSwimmerProfiles(byKey.get(key), swimmer) : swimmer);
    });
    return Array.from(byKey.values());
  }

  function findSwimmerById(id) {
    const needle = String(id || "");
    return allSwimmers().find((swimmer) => swimmerKnownIds(swimmer).includes(needle));
  }

  function relatedSwimmers(swimmer) {
    return [swimmer];
  }

  function performanceMatchesSwimmer(perf, swimmer, knownIds, identityKey) {
    if (knownIds.has(String(perf.swimmerId || ""))) return true;
    if (knownIds.has(String(perf.originalSwimmerId || ""))) return true;
    const perfKey = perf.swimmerIdentityKey || swimmerIdentityKey(perf);
    return identityKey && perfKey === identityKey;
  }

  function performanceCorrectionKey(row) {
    if (row?.id) return `${row.source || "intranap"}|${row.id}`;
    return [
      row?.swimmerIdentityKey || row?.swimmerId || row?.swimmer,
      row?.date,
      row?.course,
      row?.timeValue,
      row?.club || row?.clubName,
      row?.competitionId || row?.location
    ].map((value) => String(value || "").trim()).join("|");
  }

  function correctedRows(rows) {
    if (!performanceCorrections.length) return rows;
    const byKey = new Map(performanceCorrections.map((correction) => [correction.targetKey, correction]));
    return rows
      .map((row) => {
        const correction = byKey.get(performanceCorrectionKey(row));
        if (!correction) return row;
        if (correction.hidden) return null;
        if (correctionMovesSwimmer(correction, row)) return null;
        return { ...row, ...(correction.patch || {}) };
      })
      .filter(Boolean);
  }

  function correctionMovesSwimmer(correction, row = {}) {
    const patch = correction?.patch || {};
    return Boolean(patch.swimmerId) && String(patch.swimmerId) !== String(row.swimmerId || "");
  }

  function rowFromCorrection(correction) {
    if (!correction || correction.hidden || !correction.targetRow || !correctionMovesSwimmer(correction, correction.targetRow)) return null;
    return { ...correction.targetRow, ...(correction.patch || {}) };
  }

  function withCacheBust(url, param = "publicCache") {
    return `${url}${url.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(`${publicVersion}-${Date.now()}`)}`;
  }

  function addOptions(select, values, allLabel, labeler = (value) => value) {
    select.innerHTML = "";
    select.append(new Option(allLabel, ""));
    values.forEach((value) => select.append(new Option(labeler(value), value)));
  }

  function selectedSegmentValue(group) {
    return group.querySelector(".segment.active")?.dataset.value ?? "best";
  }

  function setSegmentValue(group, value) {
    group.querySelectorAll(".segment").forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function courseLabel(code) {
    const course = (summary.filters.courses || []).find((item) => item.code === code);
    return course?.label || course?.shortLabel || code;
  }

  function compareCourse(a, b) {
    return (courseOrder.get(a.course) ?? 999) - (courseOrder.get(b.course) ?? 999) ||
      Number(a.length || 0) - Number(b.length || 0) ||
      String(a.course || "").localeCompare(String(b.course || ""), "fr-FR", { numeric: true });
  }

  async function loadPerformanceBaseRowsForSwimmer(swimmer, related) {
    const file = swimmer?.perfFile || related.find((item) => item?.perfFile)?.perfFile || "";
    const knownIds = new Set(swimmerKnownIds(swimmer));
    const identityKey = swimmer.identityKey || swimmerIdentityKey(swimmer);
    const overlayRowsForSwimmer = () => {
      const importedRows = additionalPerfs.filter((perf) => performanceMatchesSwimmer(perf, swimmer, knownIds, identityKey));
      const reassignedRows = performanceCorrections
        .map(rowFromCorrection)
        .filter((row) => row && performanceMatchesSwimmer(row, swimmer, knownIds, identityKey));
      return [...correctedRows(importedRows), ...reassignedRows];
    };

    if (file) {
      const cacheKey = `file:${file}`;
      if (swimmerRowsCache.has(cacheKey)) return swimmerRowsCache.get(cacheKey);
      const promise = Promise.all([
        fetch(`${publicPerformanceBase}/${file}?v=${dataVersion}`, { cache: "force-cache" })
          .then((response) => {
            if (response.status === 404) return { rows: [] };
            if (!response.ok) throw new Error("Fiche nageur indisponible.");
            return response.json();
          }),
        loadAdditionalData()
      ])
        .then(([payload]) => {
          const baseRows = Array.isArray(payload?.rows) ? payload.rows.map((row) => ({
            ...row,
            swimmerId: swimmer.id,
            originalSwimmerId: row.originalSwimmerId || swimmer.id,
            swimmerIdentityKey: swimmer.identityKey,
            swimmer: displayName(swimmer),
            firstName: swimmer.firstName,
            lastName: swimmer.lastName,
            birthDate: swimmer.birthDate,
            sex: swimmer.sex
          })) : [];
          return [...correctedRows(baseRows), ...overlayRowsForSwimmer()];
        });
      swimmerRowsCache.set(cacheKey, promise);
      return promise;
    }

    await loadAdditionalData();
    const rows = overlayRowsForSwimmer();
    if (rows.length) return rows;
    throw new Error("Fiche nageur indisponible.");
  }

  function loadPublicSwimmerSearchShard(shard) {
    if (!shard) return Promise.resolve([]);
    if (publicSwimmerSearchShards.has(shard)) return publicSwimmerSearchShards.get(shard);
    const promise = fetch(`${publicPerformanceBase}/search/${encodeURIComponent(shard)}.json?v=${dataVersion}`, { cache: "force-cache" })
        .then((response) => {
          if (response.status === 404) return [];
          if (!response.ok) throw new Error("Index nageurs indisponible.");
          return response.json();
        })
      .then((rows) => Array.isArray(rows) ? rows : []);
    publicSwimmerSearchShards.set(shard, promise);
    return promise;
  }

  function loadPublicSwimmerIdShard(shard) {
    if (!shard) return Promise.resolve({});
    if (publicSwimmerIdShards.has(shard)) return publicSwimmerIdShards.get(shard);
    const promise = fetch(`${publicPerformanceBase}/ids/${encodeURIComponent(shard)}.json?v=${dataVersion}`, { cache: "force-cache" })
      .then((response) => {
        if (response.status === 404) return {};
        if (!response.ok) throw new Error("Index identifiants nageurs indisponible.");
        return response.json();
      })
      .then((rows) => rows && typeof rows === "object" && !Array.isArray(rows) ? rows : {});
    publicSwimmerIdShards.set(shard, promise);
    return promise;
  }

  async function searchPerformanceBaseSwimmers(query) {
    const cleanQuery = normalize(query);
    if (swimmerSearchCache.has(cleanQuery)) return swimmerSearchCache.get(cleanQuery);
    const tokens = cleanQuery.split(/\s+/).filter((token) => token.length >= 2);
    const shard = searchShardFromQuery(query);
    const promise = Promise.all([loadPublicSwimmerSearchShard(shard), loadAdditionalData()])
      .then(([rows]) => uniqueSwimmers([
        ...rows,
        ...additionalSwimmers
      ])
        .filter((swimmer) => {
          const haystack = normalize(swimmer.searchText || [swimmer.name, swimmer.firstName, swimmer.lastName, swimmer.birthDate, swimmer.club].join(" "));
          return tokens.every((token) => haystack.includes(token));
        })
        .sort((a, b) => scoreSwimmer(a, tokens) - scoreSwimmer(b, tokens) ||
          String(a.lastName || "").localeCompare(String(b.lastName || ""), "fr-FR") ||
          String(a.firstName || "").localeCompare(String(b.firstName || ""), "fr-FR"))
        .slice(0, 10));
    swimmerSearchCache.set(cleanQuery, promise);
    return promise;
  }

  async function loadPerformanceBaseSwimmerById(swimmerId) {
    const index = await loadPublicSwimmerIdShard(idShardFromValue(swimmerId));
    const swimmer = index[String(swimmerId || "").trim()] || null;
    if (swimmer) return swimmer;
    await loadAdditionalData();
    const needle = String(swimmerId || "").trim();
    return additionalSwimmers.find((candidate) => swimmerKnownIds(candidate).includes(needle)) || null;
  }

  function loadAdditionalData() {
    if (additionalLoaded) return Promise.resolve(additionalPerfs);
    if (additionalLoad) return additionalLoad;
    if (!usesConsolidatedData || !publicAdditionalDataUrl) {
      additionalLoaded = true;
      additionalPerfs = [];
      additionalSwimmers = [];
      performanceCorrections = [];
      return Promise.resolve(additionalPerfs);
    }

    additionalLoad = fetch(withCacheBust(publicAdditionalDataUrl), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { performances: [], swimmers: [], corrections: [] })
      .then((payload) => {
        additionalPerfs = Array.isArray(payload?.performances) ? payload.performances : [];
        additionalSwimmers = Array.isArray(payload?.swimmers) ? payload.swimmers : [];
        performanceCorrections = Array.isArray(payload?.corrections) ? payload.corrections : [];
        additionalLoaded = true;
        return additionalPerfs;
      })
      .catch(() => {
        additionalPerfs = [];
        additionalSwimmers = [];
        performanceCorrections = [];
        additionalLoaded = true;
        return additionalPerfs;
      });
    return additionalLoad;
  }

  function uniquePerformanceRows(rows) {
    const seen = new Set();
    return rows.filter((perf) => {
      const key = [
        perf.id,
        perf.swimmerIdentityKey || perf.swimmerId || perf.swimmer,
        perf.date,
        perf.course,
        perf.timeValue,
        perf.club || perf.clubName,
        perf.competition || perf.location
      ].map((value) => String(value || "").trim()).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function loadRecordData() {
    if (!global.LivePalmesPerformanceStore?.loadData) return Promise.resolve(recordData);
    return global.LivePalmesPerformanceStore.loadData()
      .then((data) => {
        recordData = data || recordData;
        global.LIVEPALMES_RECORDS = recordData;
        return recordData;
      })
      .catch(() => recordData);
  }

  function resetFilters() {
    addOptions(elements.season, [], "Toutes");
    addOptions(elements.course, [], "Toutes");
    setSegmentValue(elements.displayMode, "best");
  }

  function updateFilters(perfs) {
    const seasons = Array.from(new Set(perfs.map((perf) => perf.seasonYear).filter(Boolean))).sort((a, b) => b - a);
    const courses = Array.from(new Set(perfs.map((perf) => perf.course).filter(Boolean)))
      .map((course) => (summary.filters.courses || []).find((item) => item.code === course) || { code: course, label: course })
      .sort((a, b) =>
        (courseOrder.get(a.code) ?? 999) - (courseOrder.get(b.code) ?? 999) ||
        Number(a.length || 0) - Number(b.length || 0) ||
        a.code.localeCompare(b.code, "fr-FR", { numeric: true })
      )
      .map((course) => course.code);
    addOptions(elements.season, seasons, "Toutes", (season) => `Saison ${season}`);
    addOptions(elements.course, courses, "Toutes", courseLabel);
  }

  function scoreSwimmer(swimmer, tokens) {
    const name = normalize(displayName(swimmer));
    const lastName = normalize(swimmer.lastName);
    const firstName = normalize(swimmer.firstName);
    if (tokens.every((token) => lastName.startsWith(token) || firstName.startsWith(token))) return 0;
    if (tokens.every((token) => name.includes(token))) return 1;
    if (tokens.every((token) => lastName.includes(token) || firstName.includes(token))) return 2;
    return 3;
  }

  function searchSwimmers() {
    const query = normalize(elements.search.value);
    if (query.length < 2) {
      swimmerSearchMatches = [];
      elements.suggestions.innerHTML = "";
      return;
    }
    const requestId = ++swimmerSearchRequestId;
    elements.suggestions.innerHTML = `<button type="button" class="suggestion-button">Recherche...</button>`;
    searchPerformanceBaseSwimmers(elements.search.value)
      .then((matches) => {
        if (requestId !== swimmerSearchRequestId) return;
        swimmerSearchMatches = matches;
        elements.suggestions.innerHTML = matches.length ? matches.map((swimmer) => `
          <button type="button" class="suggestion-button" data-swimmer-id="${escapeHtml(swimmer.id)}">
            <strong>${escapeHtml(displayName(swimmer))}</strong>
            <span>${escapeHtml([swimmer.sex === "F" ? "Femme" : "Homme", swimmer.club].filter(Boolean).join(" - "))}</span>
          </button>
        `).join("") : `<button type="button" class="suggestion-button">Aucun nageur trouv&eacute;</button>`;
      })
      .catch((error) => {
        if (requestId !== swimmerSearchRequestId) return;
        swimmerSearchMatches = [];
        elements.suggestions.innerHTML = `<button type="button" class="suggestion-button">Recherche impossible : ${escapeHtml(error?.message || error)}</button>`;
      });
  }

  function currentFilters() {
    return {
      season: elements.season.value,
      course: elements.course.value,
      mode: selectedSegmentValue(elements.displayMode)
    };
  }

  function filteredPerfs(perfs, filters) {
    return perfs.filter((perf) =>
      (!filters.season || String(perf.seasonYear) === filters.season) &&
      (!filters.course || perf.course === filters.course)
    );
  }

  function bestByCourse(perfs) {
    const best = new Map();
    perfs.forEach((perf) => {
      const current = best.get(perf.course);
      if (!current || perf.timeValue < current.timeValue || (perf.timeValue === current.timeValue && String(perf.date).localeCompare(current.date) < 0)) {
        best.set(perf.course, perf);
      }
    });
    return Array.from(best.values()).sort(compareCourse);
  }

  function rowsForFilters() {
    const filters = currentFilters();
    const filtered = filteredPerfs(selectedPerfs, filters);
    if (filters.mode === "best") return bestByCourse(filtered);
    return filtered.sort((a, b) => {
      if (filters.course) return a.timeValue - b.timeValue || String(b.date).localeCompare(a.date);
      return String(b.date).localeCompare(a.date) || compareCourse(a, b);
    });
  }

  function familyForPerf(perf) {
    return COURSE_FAMILIES.find((family) => perf.style === family.key || String(perf.course || "").endsWith(family.key));
  }

  function mobileMeta(perf) {
    return [perf.location, formatDate(perf.date)]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" \u00b7 ");
  }

  function originMeta(perf) {
    if (!perf.isIntermediate) return "";
    const origin = perf.originCourseShortLabel || perf.originCourse || "";
    return origin ? `Passage du ${origin}` : "Temps de passage";
  }

  function splitDistance(split) {
    const codeDistances = { TI1: 100, TI2: 200, TI3: 400, TI4: 800 };
    return split.distance || codeDistances[String(split.code || "").toUpperCase()] || Number(String(split.code || "").replace(/\D/g, "")) || "";
  }

  function splitDetails(perf) {
    if (perf.isIntermediate) return [];
    const directSplits = Array.isArray(perf.intermediateTimes)
      ? perf.intermediateTimes
        .filter((split) => split?.time)
        .map((split) => ({
          distance: splitDistance(split),
          time: split.time,
          timeValue: split.timeValue || 0
        }))
      : [];

    const linkedSplits = selectedPerfs
      .filter((candidate) =>
        candidate.isIntermediate &&
        candidate.originPerformanceId &&
        String(candidate.originPerformanceId) === String(perf.id)
      )
      .map((candidate) => ({
        distance: candidate.length || candidate.splitDistance || "",
        time: candidate.time,
        timeValue: candidate.timeValue || 0
      }));

    const byDistance = new Map();
    [...directSplits, ...linkedSplits].forEach((split) => {
      const key = String(split.distance || split.time);
      if (!byDistance.has(key) || split.timeValue < byDistance.get(key).timeValue) {
        byDistance.set(key, split);
      }
    });
    return Array.from(byDistance.values()).sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
  }

  function splitPanelHtml(perf) {
    const splits = splitDetails(perf);
    if (!splits.length) return "";
    const passageLabel = splits.length > 1 ? "Passages" : "Passage";
    return `
      <tr class="swimmer-splits-row" aria-hidden="true">
        <td colspan="6">
          <div class="swimmer-splits-panel">
            <span class="swimmer-splits-title">${passageLabel}</span>
            <span class="swimmer-splits-list">
              ${splits.map((split) => `
                <span class="swimmer-split-chip">
                  <span class="swimmer-split-distance">${escapeHtml(split.distance ? `${split.distance} m` : "Passage")}</span>
                  <strong>${escapeHtml(split.time)}</strong>
                </span>
              `).join("")}
            </span>
          </div>
        </td>
      </tr>
    `;
  }

  function rowHtml(perf) {
    const origin = originMeta(perf);
    const splits = splitPanelHtml(perf);
    return `
      <tr class="sex-${escapeHtml(String(perf.sex || "").toLowerCase())}" tabindex="0" role="button" aria-expanded="false">
        <td data-label="Course">
          <button class="course-progress-trigger" type="button" data-progress-course="${escapeHtml(perf.course)}">
            ${escapeHtml(perf.courseShortLabel || perf.course)}
          </button>
          ${origin ? `<small class="performance-origin-meta">${escapeHtml(origin)}</small>` : ""}
        </td>
        <td class="time" data-label="Temps">${escapeHtml(perf.time)}</td>
        <td data-label="Cat&eacute;gorie"><strong>${escapeHtml(perf.categoryCode || perf.category || "-")}</strong></td>
        <td data-label="Club">
          <strong>${escapeHtml(perf.club || "-")}</strong>
          <small class="record-mobile-meta">${escapeHtml(mobileMeta(perf))}</small>
        </td>
        <td data-label="Lieu">${escapeHtml(perf.location || "-")}</td>
        <td data-label="Date">${escapeHtml(formatDate(perf.date))}</td>
      </tr>
      ${splits}
    `;
  }

  function renderSectionedRows(rows) {
    const html = [];
    COURSE_FAMILIES.forEach((family) => {
      const sectionRows = rows.filter((perf) => familyForPerf(perf)?.key === family.key);
      if (!sectionRows.length) return;
      html.push(`<tr class="section-row"><td colspan="6">${escapeHtml(family.label)}</td></tr>`);
      html.push(...sectionRows.map(rowHtml));
    });
    elements.body.innerHTML = html.join("");
  }

  function renderFlatRows(rows) {
    elements.body.innerHTML = rows.map(rowHtml).join("");
  }

  function formatTimeDelta(value) {
    const centiseconds = Math.abs(value) % 100;
    const totalSeconds = Math.floor(Math.abs(value) / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    const base = `${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
    return minutes > 0 ? `${minutes}:${base}` : base;
  }

  function renderProgress() {
    const filters = currentFilters();
    if (!filters.course || !selectedPerfs.length) {
      elements.progress.classList.remove("active");
      elements.progress.innerHTML = "";
      return;
    }

    const seasonBest = new Map();
    selectedPerfs.forEach((perf) => {
      if (perf.course !== filters.course) return;
      const current = seasonBest.get(perf.seasonYear);
      if (!current || perf.timeValue < current.timeValue) seasonBest.set(perf.seasonYear, perf);
    });
    const points = Array.from(seasonBest.values()).sort((a, b) => a.seasonYear - b.seasonYear);
    if (points.length < 2) {
      elements.progress.classList.remove("active");
      elements.progress.innerHTML = "";
      return;
    }

    const width = 920;
    const height = 220;
    const pad = { left: 44, right: 24, top: 24, bottom: 42 };
    const min = Math.min(...points.map((point) => point.timeValue));
    const max = Math.max(...points.map((point) => point.timeValue));
    const span = Math.max(1, max - min);
    const coords = points.map((point, index) => ({
      ...point,
      x: pad.left + (index * (width - pad.left - pad.right)) / (points.length - 1),
      y: pad.top + ((point.timeValue - min) * (height - pad.top - pad.bottom)) / span
    }));
    const path = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const first = coords[0];
    const best = coords.find((point) => point.timeValue === min);
    const diff = first.timeValue - best.timeValue;
    const trend = diff > 0 ? `Progression ${formatTimeDelta(diff)}` : "Meilleur niveau d&egrave;s la premi&egrave;re saison";

    elements.progress.classList.add("active");
    elements.progress.innerHTML = `
      <div class="progress-head">
        <div><h2>Progression ${escapeHtml(courseLabel(filters.course))}</h2><span>Meilleure performance par saison</span></div>
        <div class="progress-actions">
          <span>${trend}</span>
          <button class="progress-reset-button" type="button" data-progress-reset>Retour aux MP</button>
        </div>
      </div>
      <svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Progression par saison">
        <line class="progress-axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
        <line class="progress-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}"></line>
        <path class="progress-line" d="${path}"></path>
        ${coords.map((point) => `
          <circle class="progress-point${point === best ? " best" : ""}" cx="${point.x}" cy="${point.y}" r="4">
            <title>${escapeHtml(`${point.seasonYear} - ${point.time} - ${point.location || "Lieu non renseign\u00e9"}`)}</title>
          </circle>
          <text class="progress-time" x="${point.x}" y="${Math.max(14, point.y - 9)}" text-anchor="middle">${escapeHtml(point.time)}</text>
          <text class="progress-label" x="${point.x}" y="${height - 17}" text-anchor="middle">${escapeHtml(point.seasonYear)}</text>
        `).join("")}
      </svg>
      <div class="progress-list">
        ${coords.map((point) => `<span><strong>${escapeHtml(point.seasonYear)}</strong>${escapeHtml(point.time)}</span>`).join("")}
      </div>
    `;
  }

  function render() {
    if (!selectedSwimmer) {
      elements.title.textContent = "Performances du nageur";
      elements.status.textContent = "Recherchez puis s\u00e9lectionnez un nageur.";
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Choisissez un nageur.</td></tr>`;
      if (elements.profile) {
        elements.profile.hidden = true;
        elements.profile.innerHTML = "";
      }
      elements.progress.classList.remove("active");
      elements.progress.innerHTML = "";
      return;
    }

    const filters = currentFilters();
    const rows = rowsForFilters();
    renderProgress();

    if (!rows.length) {
      elements.status.textContent = "Aucune performance ne correspond aux filtres.";
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Aucune performance ne correspond aux filtres.</td></tr>`;
      return;
    }

    elements.status.textContent = `${rows.length} performance${rows.length > 1 ? "s" : ""} affich\u00e9e${rows.length > 1 ? "s" : ""}.`;
    if (filters.mode === "best" && !filters.course) {
      renderSectionedRows(rows);
    } else {
      renderFlatRows(rows);
    }
  }

  async function selectSwimmer(swimmer) {
    selectedSwimmer = swimmer;
    selectedPerfs = [];
    elements.search.value = displayName(swimmer);
    elements.suggestions.innerHTML = "";
    elements.title.textContent = displayName(swimmer);
    elements.status.textContent = "Chargement des performances...";
    elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Chargement des performances...</td></tr>`;

    const related = relatedSwimmers(swimmer);
    const basePerfs = await loadPerformanceBaseRowsForSwimmer(swimmer, related);
    selectedPerfs = uniquePerformanceRows(basePerfs)
      .sort((a, b) => String(b.date).localeCompare(a.date) || compareCourse(a, b));
    updateFilters(selectedPerfs);
    setSegmentValue(elements.displayMode, "best");
    elements.title.textContent = displayName(swimmer);
    renderSwimmerProfile(swimmer, selectedPerfs);
    render();

    const params = new URLSearchParams(window.location.search);
    params.set("id", swimmer.id);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    elements.card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function init() {
    resetFilters();
    render();

    elements.search.addEventListener("input", () => {
      if (selectedSwimmer && normalize(elements.search.value) !== normalize(displayName(selectedSwimmer))) {
        selectedSwimmer = null;
        selectedPerfs = [];
        resetFilters();
        render();
      }
      searchSwimmers();
    });

    elements.suggestions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-swimmer-id]");
      if (!button) return;
      const swimmer = findSwimmerById(button.dataset.swimmerId);
      selectSwimmer(swimmer).catch((error) => {
        elements.status.textContent = `Chargement impossible : ${error.message || error}`;
      });
    });

    elements.season.addEventListener("input", render);
    elements.course.addEventListener("input", render);
    elements.displayMode.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        setSegmentValue(elements.displayMode, button.dataset.value);
        render();
      });
    });

    elements.progress.addEventListener("click", (event) => {
      const resetButton = event.target.closest("[data-progress-reset]");
      if (!resetButton) return;
      elements.course.value = "";
      setSegmentValue(elements.displayMode, "best");
      render();
      elements.card.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.profile?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-swimmer-records-toggle]");
      if (!button) return;
      const honors = button.closest(".swimmer-profile-honors");
      const expanded = !honors?.classList.contains("is-expanded");
      honors?.classList.toggle("is-expanded", expanded);
      button.textContent = expanded ? button.dataset.expandedLabel : button.dataset.collapsedLabel;
    });

    elements.body.addEventListener("click", (event) => {
      const progressTrigger = event.target.closest("[data-progress-course]");
      if (progressTrigger) {
        event.preventDefault();
        event.stopPropagation();
        const course = progressTrigger.dataset.progressCourse || "";
        if (course) {
          elements.course.value = course;
          render();
          elements.progress.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row") || row.classList.contains("swimmer-splits-row")) return;
      const expanded = !row.classList.contains("expanded");
      row.classList.toggle("expanded", expanded);
      row.setAttribute("aria-expanded", expanded ? "true" : "false");
      const splitsRow = row.nextElementSibling;
      if (splitsRow?.classList.contains("swimmer-splits-row")) {
        splitsRow.setAttribute("aria-hidden", expanded ? "false" : "true");
      }
    });

    elements.body.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button, a, input, select, textarea")) return;
      const row = event.target.closest("tr");
      if (!row || row.classList.contains("section-row") || row.classList.contains("pending-row") || row.classList.contains("swimmer-splits-row")) return;
      event.preventDefault();
      row.click();
    });

    const directId = new URLSearchParams(window.location.search).get("id");
    if (directId) {
      loadPerformanceBaseSwimmerById(directId).then((swimmer) => {
        if (!swimmer) return;
        return selectSwimmer(swimmer);
      }).catch((error) => {
        elements.status.textContent = `Chargement impossible : ${error.message || error}`;
      });
    }

    loadRecordData().then(() => {
      if (selectedSwimmer) renderSwimmerProfile(selectedSwimmer, selectedPerfs);
    });

    if (elements.search.value) searchSwimmers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
