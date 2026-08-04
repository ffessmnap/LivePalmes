(function attachIntranapSwimmerPage(global) {
  let summary = global.LIVEPALMES_INTRANAP_SUMMARY || { counts: {}, filters: { courses: [] } };
  let recordData = global.LIVEPALMES_RECORDS || { records: [], franceRecords: [] };
  const swimmerRowsCache = new Map();
  const swimmerSearchCache = new Map();
  const publicVersion = global.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION || summary.generatedAt || "20260602-swimmer-card-2";
  const params = new URLSearchParams(global.location.search);
  const usesLegacyPublicData = params.get("base") === "legacy" || params.get("data") === "legacy";
  const usesFirestorePublicData = !usesLegacyPublicData;
  const usesLocalFirestorePublicData = usesFirestorePublicData && params.get("data") === "local";
  const publicStoragePerformanceBase = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore";
  let dataVersion = encodeURIComponent(usesFirestorePublicData ? "firestore-current" : publicVersion);
  const publicPerformanceBase = usesFirestorePublicData
    ? (usesLocalFirestorePublicData ? "public/data/performance-public-firestore" : publicStoragePerformanceBase)
    : "public/data/performance-public";
  const usesConsolidatedData = usesLegacyPublicData;
  const publicAdditionalDataUrl = global.LivePalmesAppConfig?.performanceAdditionalDataUrl ||
    "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public/additional-data.json";

  function categoryMetaFromManifest(value) {
    const [sex, code] = String(value || "").split("|");
    const existing = (summary.filters.categories || []).find((category) => category.sex === sex && category.code === code);
    if (existing) return existing;
    const prefix = sex === "F" ? "F" : "H";
    const suffixes = {
      P: "PO",
      B: "BE",
      M: "MI",
      C: "CA",
      J: "JU",
      S: "SE",
      "M30+": "30+",
      "M40+": "40+",
      "M50+": "50+",
      "M60+": "60+",
      "M70+": "70+",
      "M80+": "80+"
    };
    return {
      code,
      displayCode: `${prefix}${suffixes[code] || code}`,
      label: code,
      sex
    };
  }

  function applyPublicManifest(manifest = {}) {
    const currentFilters = summary.filters || {};
    const currentCourses = new Map((currentFilters.courses || []).map((course) => [course.code, course]));
    const manifestCourses = Array.isArray(manifest.courses) ? manifest.courses.map(String).filter(Boolean) : [];
    const manifestCategories = Array.isArray(manifest.categories) ? manifest.categories.map(String).filter(Boolean) : [];
    summary = {
      ...summary,
      generatedAt: manifest.generatedAt || summary.generatedAt,
      filters: {
        ...currentFilters,
        courses: manifestCourses.length
          ? manifestCourses.map((code) => currentCourses.get(code) || { code, label: code, shortLabel: code, style: "", length: 0 })
          : (currentFilters.courses || []),
        seasons: Array.isArray(manifest.seasons) ? manifest.seasons : (currentFilters.seasons || []),
        regions: Array.isArray(manifest.regions) ? manifest.regions : (currentFilters.regions || []),
        categories: manifestCategories.length
          ? manifestCategories.map(categoryMetaFromManifest).filter((category) => category.sex && category.code)
          : (currentFilters.categories || [])
      }
    };
    if (usesFirestorePublicData && manifest.generatedAt) {
      dataVersion = encodeURIComponent(`firestore-${manifest.generatedAt}`);
    }
    courseOrder = buildCourseOrder(summary.filters.courses || []);
  }

  async function loadSelectedPublicManifest() {
    if (!usesFirestorePublicData) return;
    try {
      const response = await fetch(`${publicPerformanceBase}/manifest.json`, { cache: "no-store" });
      if (!response.ok) return;
      applyPublicManifest(await response.json());
    } catch (error) {
      console.warn("Lecture du manifeste public Firestore impossible", error);
    }
  }

  const elements = {
    search: document.querySelector("#swimmerSearchInput"),
    clearSearch: document.querySelector("#swimmerSearchClear"),
    suggestions: document.querySelector("#swimmerSearchResults"),
    season: document.querySelector("#swimmerSeasonFilter"),
    course: document.querySelector("#swimmerCourseFilter"),
    pool: document.querySelector("#swimmerPoolFilter"),
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

  const STANDARD_COURSE_ORDER = [
    "50SF", "100SF", "200SF", "400SF", "800SF", "1500SF",
    "50AP",
    "100IS", "200IS", "400IS",
    "50BI", "100BI", "200BI", "400BI"
  ];

  function buildCourseOrder(courses) {
    const codes = [
      ...STANDARD_COURSE_ORDER,
      ...courses.map((course) => course.code).filter(Boolean)
    ];
    return new Map(Array.from(new Set(codes)).map((course, index) => [course, index]));
  }

  let courseOrder = buildCourseOrder(summary.filters.courses || []);

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
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "-");
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

  function swimmerBirthSummary(swimmer) {
    const birthDate = swimmer?.birthDate ? formatDate(swimmer.birthDate) : "Date de naissance non renseignée";
    const age = realAgeFromBirthDate(swimmer?.birthDate);
    return age ? `${birthDate} (${age})` : birthDate;
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
    const perfsCount = performanceCount(perfs);
    const competitions = competitionCount(perfs);
    const latestClub = latestKnownClub(swimmer, perfs);
    const recordCards = mergedSwimmerRecordCards(records);
    const franceRecordCount = rfCount + rfjCount;
    const recordSummaryParts = [];
    if (franceRecordCount) {
      recordSummaryParts.push(`${franceRecordCount} record${franceRecordCount > 1 ? "s" : ""} de France détenu${franceRecordCount > 1 ? "s" : ""}`);
    }
    if (mpfCount) {
      recordSummaryParts.push(`${mpfCount} MPF détenue${mpfCount > 1 ? "s" : ""}`);
    }

    elements.profile.hidden = false;
    elements.profile.innerHTML = `
      <div class="swimmer-profile-stats">
        <div><span>Dernier club connu</span><strong>${escapeHtml(latestClub)}</strong></div>
        <div><span>Performances bassin</span><strong>${perfsCount.toLocaleString("fr-FR")}</strong></div>
        <div><span>Comp&eacute;titions</span><strong>${competitions.toLocaleString("fr-FR")}</strong></div>
      </div>
      ${records.length ? `<div class="swimmer-profile-honors">
        <div class="swimmer-profile-honors-head">
          <strong class="swimmer-profile-record-summary">${escapeHtml(recordSummaryParts.join(" · "))}</strong>
          <button type="button" class="swimmer-records-toggle" data-swimmer-records-toggle aria-expanded="false" aria-controls="swimmerRecordsPanel" data-collapsed-label="Afficher les records" data-expanded-label="Masquer les records">Afficher les records</button>
        </div>
        <div class="swimmer-profile-records" id="swimmerRecordsPanel">
          ${recordCards.map((card) => `
            <article class="swimmer-record-card">
              <div class="swimmer-record-card-head">
                <strong>${escapeHtml(card.courseShortLabel || card.course || "-")}</strong>
                <div class="swimmer-record-card-badges">${card.badges.map((badge) => recordScopeBadgeHtml(badge.scope, badge.category)).join("")}</div>
              </div>
              <div class="swimmer-record-card-details">
                <strong>${escapeHtml(card.time || "-")}</strong>
                <span>${escapeHtml(recordCardLocation(card.records))}</span>
                <span>${escapeHtml(recordCardDate(card.records))}</span>
              </div>
            </article>
          `).join("")}
        </div>
      </div>` : ""}
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

  function courseShortLabel(code) {
    const course = (summary.filters.courses || []).find((item) => item.code === code);
    return course?.shortLabel || course?.label || code;
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

  async function loadPerformanceBaseSwimmerByIdentity(name, birthDate = "", sex = "") {
    const matches = await searchPerformanceBaseSwimmers(name);
    const normalizedName = normalize(name);
    const exactMatches = matches.filter((candidate) => normalize(displayName(candidate)) === normalizedName);
    const exactIdentity = exactMatches.find((candidate) =>
      (!birthDate || String(candidate.birthDate || "") === String(birthDate)) &&
      (!sex || String(candidate.sex || "").toUpperCase() === String(sex).toUpperCase())
    );
    if (exactIdentity) return exactIdentity;
    const sameBirthDate = exactMatches.find((candidate) =>
      !birthDate || String(candidate.birthDate || "") === String(birthDate)
    );
    return sameBirthDate || (exactMatches.length === 1 ? exactMatches[0] : null);
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
    setSegmentValue(elements.pool, "");
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
    addOptions(elements.course, courses, "Toutes", courseShortLabel);
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
      pool: selectedSegmentValue(elements.pool),
      mode: selectedSegmentValue(elements.displayMode)
    };
  }

  function updateSearchClearButton() {
    if (elements.clearSearch) elements.clearSearch.hidden = !elements.search.value;
  }

  function clearSwimmerSearch() {
    swimmerSearchRequestId += 1;
    swimmerSearchMatches = [];
    selectedSwimmer = null;
    selectedPerfs = [];
    elements.search.value = "";
    elements.suggestions.innerHTML = "";
    resetFilters();
    render();
    updateSearchClearButton();

    const nextParams = new URLSearchParams(window.location.search);
    ["id", "name", "birth", "sex"].forEach((name) => nextParams.delete(name));
    const query = nextParams.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    elements.search.focus();
  }

  function performancePool(perf) {
    const candidates = [perf?.pool, perf?.poolLength, perf?.poolSize, perf?.bassin, perf?.basin];
    for (const value of candidates) {
      const text = String(value ?? "").trim().toLowerCase();
      if (!text) continue;
      const match = text.match(/(?:^|[^0-9])(25|50)(?:[^0-9]|$)/) || text.match(/^(25|50)$/);
      if (match) return match[1];
    }
    return "";
  }

  function filteredPerfs(perfs, filters) {
    return perfs.filter((perf) =>
      (!filters.season || String(perf.seasonYear) === filters.season) &&
      (!filters.course || perf.course === filters.course) &&
      (!filters.pool || performancePool(perf) === filters.pool)
    );
  }

  function recordScope(record) {
    if (record.recordType === "RF") return "RF";
    if (record.recordType === "RFJ") return "RFJ";
    return "MPF";
  }

  function mergedSwimmerRecordCards(records) {
    const cards = new Map();
    records.forEach((record) => {
      const timeKey = Number.isFinite(Number(record.value)) ? Number(record.value) : String(record.time || "").trim();
      const key = `${record.course || ""}|${timeKey}|${record.date || ""}`;
      if (!cards.has(key)) {
        cards.set(key, {
          course: record.course,
          courseShortLabel: record.courseShortLabel,
          time: record.time,
          records: [],
          scopes: new Set(),
          mpfCategories: new Set()
        });
      }
      const card = cards.get(key);
      card.records.push(record);
      card.scopes.add(recordScope(record));
      if (!record.recordType) {
        const category = categoryDisplayLabel(record);
        if (category) card.mpfCategories.add(category);
      }
    });
    const scopeRanks = { RF: 0, RFJ: 1, MPF: 2 };
    return Array.from(cards.values())
      .map((card) => {
        const scopes = Array.from(card.scopes).sort((a, b) => scopeRanks[a] - scopeRanks[b]);
        const mpfCategories = Array.from(card.mpfCategories);
        return {
          ...card,
          scopes,
          mpfCategories,
          badges: [
            ...scopes.filter((scope) => scope !== "MPF").map((scope) => ({ scope, category: "" })),
            ...(scopes.includes("MPF") ? (mpfCategories.length ? mpfCategories : [""])
              .map((category) => ({ scope: "MPF", category })) : [])
          ],
          sortGroup: scopes.some((scope) => scope === "RF" || scope === "RFJ") ? 0 : 1,
          sortDate: card.records.reduce((latest, record) => validRecordDate(record.date) && record.date > latest ? record.date : latest, "")
        };
      })
      .sort((a, b) =>
        a.sortGroup - b.sortGroup ||
        String(b.sortDate).localeCompare(String(a.sortDate)) ||
        compareCourse(a, b)
      );
  }

  function validRecordDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1]) &&
      date.getUTCMonth() === Number(match[2]) - 1 &&
      date.getUTCDate() === Number(match[3]);
  }

  function recordCardDate(records) {
    const datedRecord = records
      .filter((record) => validRecordDate(record.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    return datedRecord ? formatDate(datedRecord.date) : "Date à confirmer";
  }

  function recordCardLocation(records) {
    const locations = Array.from(new Set(records
      .map((record) => String(record.location || "").trim())
      .filter(Boolean)));
    return locations.length ? locations.join(" / ") : "Lieu non renseigné";
  }

  function recordScopeBadgeHtml(scope, category = "") {
    if (scope === "MPF") {
      const label = ["MPF", category].filter(Boolean).join(" · ");
      return `<span class="swimmer-record-scope-badge is-mpf">${escapeHtml(label)}</span>`;
    }
    const title = scope === "RFJ" ? "Record de France Junior" : "Record de France";
    return `<span class="record-france-badge" title="${title}" aria-label="${title}"><span class="france-flag" aria-hidden="true"></span><span>${title}</span></span>`;
  }

  function matchingFranceRecordsForPerformance(perf) {
    if (!selectedSwimmer || !perf || perf.isIntermediate) return [];
    return (recordData.franceRecords || []).filter((record) => {
      if (!isIndividualRecord(record) || !["RF", "RFJ"].includes(record.recordType)) return false;
      if (!swimmerMatchesRecord(selectedSwimmer, record)) return false;
      if (record.course !== perf.course || (record.sex && selectedSwimmer.sex && record.sex !== selectedSwimmer.sex)) return false;
      const candidates = selectedPerfs.filter((candidate) =>
        !candidate.isIntermediate &&
        candidate.course === record.course &&
        samePerformanceTime(candidate, record)
      );
      if (!candidates.length) return false;
      const exactDate = candidates.find((candidate) => record.date && candidate.date === record.date);
      if (exactDate) return exactDate === perf;
      const recordTimestamp = Date.parse(record.date || "");
      const closest = Number.isFinite(recordTimestamp)
        ? candidates.slice().sort((a, b) =>
          Math.abs(Date.parse(a.date || "") - recordTimestamp) - Math.abs(Date.parse(b.date || "") - recordTimestamp)
        )[0]
        : candidates[0];
      return closest === perf;
    });
  }

  function samePerformanceTime(perf, record) {
    const perfTimeValue = Number(perf.timeValue);
    const recordTimeValue = Number(record.value);
    return Number.isFinite(perfTimeValue) && Number.isFinite(recordTimeValue)
      ? perfTimeValue === recordTimeValue
      : String(perf.time || "").trim() === String(record.time || "").trim();
  }

  function renderFranceRecordBadges(perf) {
    const recordTypes = Array.from(new Set(
      matchingFranceRecordsForPerformance(perf).map((record) => record.recordType)
    ));
    return recordTypes.map((recordType) => {
      const title = recordType === "RFJ"
        ? "Cette performance est le Record de France Junior"
        : "Cette performance est le Record de France";
      return `<span class="record-france-badge" title="${title}" aria-label="${title}"><span class="france-flag" aria-hidden="true"></span><span>${recordType}</span></span>`;
    }).join("");
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
      return compareCourse(a, b) ||
        Number(a.timeValue || 0) - Number(b.timeValue || 0) ||
        String(b.date).localeCompare(a.date);
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
    const origin = perf.originCourse ? courseShortLabel(perf.originCourse) : "";
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
            ${escapeHtml(perf.courseShortLabel || courseShortLabel(perf.course) || perf.course)}
          </button>
          ${origin ? `<small class="performance-origin-meta">${escapeHtml(origin)}</small>` : ""}
        </td>
        <td class="time" data-label="Temps">${escapeHtml(perf.time)}${renderFranceRecordBadges(perf)}</td>
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

  function progressPointAttributes(point, index) {
    const date = formatDate(point.date);
    const location = point.location || "Lieu non renseign\u00e9";
    const competition = point.competition || point.competitionName || "";
    const label = [`Saison ${point.seasonYear}`, point.time, date, location].filter(Boolean).join(" - ");
    return [
      `data-progress-point="${index}"`,
      `data-progress-season="${escapeHtml(point.seasonYear || "")}"`,
      `data-progress-time="${escapeHtml(point.time || "")}"`,
      `data-progress-date="${escapeHtml(date)}"`,
      `data-progress-location="${escapeHtml(location)}"`,
      `data-progress-competition="${escapeHtml(competition)}"`,
      `aria-label="${escapeHtml(label)}"`
    ].join(" ");
  }

  function showProgressPointDetail(source) {
    const detail = elements.progress.querySelector("[data-progress-detail]");
    if (!detail || !source?.dataset) return;
    const { progressPoint, progressSeason, progressTime, progressDate, progressLocation, progressCompetition } = source.dataset;
    const meta = [progressDate, progressLocation, progressCompetition].filter(Boolean).join(" · ");
    detail.hidden = false;
    detail.innerHTML = `
      <strong>Saison ${escapeHtml(progressSeason || "-")} · ${escapeHtml(progressTime || "-")}</strong>
      <span>${escapeHtml(meta || "-")}</span>
    `;
    elements.progress.querySelectorAll("[data-progress-point]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.progressPoint === progressPoint);
    });
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
        <div><h2>Progression ${escapeHtml(courseShortLabel(filters.course))}</h2><span>Meilleure performance par saison</span></div>
        <div class="progress-actions">
          <span>${trend}</span>
          <button class="progress-reset-button" type="button" data-progress-reset>Retour aux MP</button>
        </div>
      </div>
      <svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Progression par saison">
        <line class="progress-axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
        <line class="progress-axis" x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}"></line>
        <path class="progress-line" d="${path}"></path>
        ${coords.map((point, index) => `
          <g class="progress-point-group" tabindex="0" role="button" ${progressPointAttributes(point, index)}>
            <circle class="progress-hit" cx="${point.x}" cy="${point.y}" r="13"></circle>
            <circle class="progress-point${point === best ? " best" : ""}" cx="${point.x}" cy="${point.y}" r="4">
              <title>${escapeHtml(`${point.seasonYear} - ${point.time} - ${formatDate(point.date)} - ${point.location || "Lieu non renseign\u00e9"}`)}</title>
            </circle>
          </g>
          <text class="progress-time" x="${point.x}" y="${Math.max(14, point.y - 9)}" text-anchor="middle">${escapeHtml(point.time)}</text>
          <text class="progress-label" x="${point.x}" y="${height - 17}" text-anchor="middle">${escapeHtml(point.seasonYear)}</text>
        `).join("")}
      </svg>
      <div class="progress-detail" data-progress-detail hidden></div>
      <div class="progress-list">
        ${coords.map((point, index) => `<button class="progress-list-item" type="button" ${progressPointAttributes(point, index)}><strong>${escapeHtml(point.seasonYear)}</strong>${escapeHtml(point.time)}</button>`).join("")}
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
    elements.status.textContent = swimmerBirthSummary(selectedSwimmer);

    if (!rows.length) {
      elements.body.innerHTML = `<tr class="pending-row"><td class="empty" colspan="6">Aucune performance ne correspond aux filtres.</td></tr>`;
      return;
    }

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
    updateSearchClearButton();
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
    updateSearchClearButton();

    elements.search.addEventListener("input", () => {
      updateSearchClearButton();
      if (selectedSwimmer && normalize(elements.search.value) !== normalize(displayName(selectedSwimmer))) {
        selectedSwimmer = null;
        selectedPerfs = [];
        resetFilters();
        render();
      }
      searchSwimmers();
    });

    elements.clearSearch?.addEventListener("click", clearSwimmerSearch);

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
    elements.pool.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        setSegmentValue(elements.pool, button.dataset.value);
        render();
      });
    });
    elements.displayMode.querySelectorAll(".segment").forEach((button) => {
      button.addEventListener("click", () => {
        setSegmentValue(elements.displayMode, button.dataset.value);
        render();
      });
    });

    elements.progress.addEventListener("click", (event) => {
      const point = event.target.closest("[data-progress-point]");
      if (point) {
        showProgressPointDetail(point);
        return;
      }
      const resetButton = event.target.closest("[data-progress-reset]");
      if (!resetButton) return;
      elements.course.value = "";
      setSegmentValue(elements.displayMode, "best");
      render();
      elements.card.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.progress.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const point = event.target.closest("[data-progress-point]");
      if (!point) return;
      event.preventDefault();
      showProgressPointDetail(point);
    });

    elements.profile?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-swimmer-records-toggle]");
      if (!button) return;
      const honors = button.closest(".swimmer-profile-honors");
      const expanded = !honors?.classList.contains("is-expanded");
      honors?.classList.toggle("is-expanded", expanded);
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
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

    const directParams = new URLSearchParams(window.location.search);
    const directId = directParams.get("id");
    const directName = directParams.get("name");
    if (directId) {
      loadPerformanceBaseSwimmerById(directId).then((swimmer) => {
        if (!swimmer) {
          elements.status.textContent = "Fiche nageur introuvable.";
          return;
        }
        return selectSwimmer(swimmer);
      }).catch((error) => {
        elements.status.textContent = `Chargement impossible : ${error.message || error}`;
      });
    } else if (directName) {
      elements.search.value = directName;
      updateSearchClearButton();
      loadPerformanceBaseSwimmerByIdentity(directName, directParams.get("birth") || "", directParams.get("sex") || "")
        .then((swimmer) => {
          if (swimmer) return selectSwimmer(swimmer);
          elements.status.textContent = "Sélectionnez le nageur correspondant dans les résultats proposés.";
          searchSwimmers();
        })
        .catch((error) => {
          elements.status.textContent = `Chargement impossible : ${error.message || error}`;
        });
    }

    loadRecordData().then(() => {
      if (selectedSwimmer) {
        renderSwimmerProfile(selectedSwimmer, selectedPerfs);
        render();
      }
    });

    if (elements.search.value) searchSwimmers();
  }

  function start() {
    loadSelectedPublicManifest().then(init);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);
