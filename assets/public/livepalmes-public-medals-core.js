(function attachLivePalmesPublicMedalsCore(global) {
  const swimmerCore = global.LivePalmesPublicSwimmerCore || {};

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    const normalize = swimmerCore.normalizeText || ((item) => cleanText(item)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim());
    return normalize(value);
  }

  const isFinalStage = swimmerCore.isFinalStage || ((stage) => String(stage || "").toLowerCase().startsWith("final"));
  const isRelayRow = swimmerCore.isRelayRow || ((row) => /^4x/i.test(String(row?.eventId || row?.label || row?.eventLabel || "")));

  function rankingRows(result = {}) {
    return Array.isArray(result.ranking) ? result.ranking.filter(Boolean) : [];
  }

  function isPublishedMedalResult(result = {}) {
    if (!result || result.isPartial || !rankingRows(result).length) return false;
    if (result.hasFinal && !isFinalStage(result.stage)) return false;
    if (result.hasFinal && !result.finalistsAnnouncedAt && !isFinalStage(result.stage)) return false;
    return true;
  }

  function rankValue(row = {}) {
    const value = cleanText(row.rank ?? row.place ?? row.position);
    const match = value.match(/^\s*(\d{1,2})\b/);
    if (!match) return null;
    const rank = Number(match[1]);
    return Number.isFinite(rank) ? rank : null;
  }

  function isClassifiedRow(row = {}) {
    const status = normalizeText([
      row.resultStatus,
      row.status,
      row.statusLabel,
      row.importedStatus
    ].filter(Boolean).join(" "));
    if (!status) return true;
    return !/(forfait|disqual|abandon|absent|non classe|dns|dnf|dsq|nc)/.test(status);
  }

  function isMinimeResult(result = {}, row = {}) {
    const text = normalizeText([
      row.category,
      row.categoryLabel,
      row.categoryCode,
      result.category,
      result.categoryLabel,
      result.categoryCode,
      row.eventId,
      result.eventId,
      row.eventLabel,
      result.eventLabel
    ].filter(Boolean).join(" "));
    return /\bmi\b/.test(text) || text.includes("minime");
  }

  function rowName(row = {}) {
    return cleanText(row.displayName || row.name || [row.lastName, row.firstName].filter(Boolean).join(" "));
  }

  function isLikelyClubCode(value) {
    const text = cleanText(value);
    return Boolean(text && text.length <= 10 && !/\s/.test(text) && text === text.toLocaleUpperCase("fr-FR"));
  }

  function clubCodeCandidates(row = {}) {
    return [
      row.clubCode,
      row.codeClub,
      row.clubId,
      row.teamCode,
      row.structureCode,
      isLikelyClubCode(row.club) ? row.club : "",
      isLikelyClubCode(row.team) ? row.team : ""
    ].map(cleanText).filter(Boolean);
  }

  function clubNameCandidates(row = {}) {
    return [
      row.clubName,
      row.clubFullName,
      row.clubLabel,
      row.teamName,
      row.structureName,
      row.associationName,
      row.association,
      row.club,
      row.team
    ].map(cleanText).filter(Boolean);
  }

  function bestFullClubName(row = {}) {
    return clubNameCandidates(row).find((name) => !isLikelyClubCode(name)) || "";
  }

  function collectClubAlias(map, row = {}) {
    const name = bestFullClubName(row);
    if (!name) return;
    clubCodeCandidates(row).forEach((code) => {
      map.set(normalizeText(code), name);
    });
  }

  function clubAliases(results = [], entrants = []) {
    const map = new Map();
    entrants.forEach((entrant) => collectClubAlias(map, entrant));
    (Array.isArray(results) ? results : []).forEach((result) => {
      rankingRows(result).forEach((row) => collectClubAlias(map, row));
    });
    return map;
  }

  function clubDisplay(row = {}, aliases = new Map()) {
    const fullName = bestFullClubName(row);
    if (fullName) return fullName;
    const code = clubCodeCandidates(row)[0] || "";
    const alias = code ? aliases.get(normalizeText(code)) : "";
    return alias || code || "Club non renseigné";
  }

  function clubCodeDisplay(row = {}) {
    return clubCodeCandidates(row)[0] || bestFullClubName(row) || "Club";
  }

  function clubKey(row = {}) {
    const key = clubCodeCandidates(row)[0] || bestFullClubName(row);
    return normalizeText(key || "club non renseigne") || "club non renseigne";
  }

  function medalKind(rank) {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "";
  }

  function sameMedalScore(a = {}, b = {}) {
    return a.gold === b.gold && a.silver === b.silver && a.bronze === b.bronze;
  }

  function eventLabel(result = {}, row = {}, options = {}) {
    const eventId = cleanText(row.eventId || result.eventId);
    const events = Array.isArray(options.events) ? options.events : [];
    const event = events.find((item) => String(item.id || "") === eventId);
    return cleanText(row.eventLabel || result.eventLabel || event?.label || eventId || "Course");
  }

  function sexLabel(value) {
    const sex = cleanText(value).toUpperCase();
    if (sex === "F") return "Femmes";
    if (sex === "M" || sex === "H") return "Hommes";
    return sex || "Mixte";
  }

  function categoryLabel(result = {}, row = {}) {
    return cleanText(row.categoryLabel || row.category || row.categoryCode || result.categoryLabel || result.category || "");
  }

  function stageLabel(result = {}) {
    if (!isFinalStage(result.stage)) return "";
    const phase = cleanText(result.phaseLabel || "");
    if (phase) return phase;
    const stage = String(result.stage || "").toLowerCase();
    if (stage.includes("b")) return "Finale B";
    if (stage.includes("a")) return "Finale A";
    return "Finale";
  }

  function buildClubMedals(results = [], options = {}) {
    const clubs = new Map();
    const aliases = clubAliases(results, options.entrants || []);
    const relaySeen = new Set();
    (Array.isArray(results) ? results : [])
      .filter(isPublishedMedalResult)
      .forEach((result) => {
        rankingRows(result).forEach((row) => {
          const rank = rankValue(row);
          if (rank === null || rank < 1 || rank > 3 || !isClassifiedRow(row) || isMinimeResult(result, row)) return;
          const kind = medalKind(rank);
          const key = clubKey(row);
          const relay = isRelayRow({
            ...result,
            ...row,
            eventId: row.eventId || result.eventId,
            label: row.label || result.label || result.eventLabel
          });
          if (relay) {
            const relayCategory = categoryLabel(result, row);
            const relaySex = cleanText(row.sex || result.sex);
            const relayKey = [
              cleanText(result.id || result.programKey || `${result.eventId}|${result.sex}|${result.stage}`),
              relaySex,
              relayCategory,
              rank,
              key
            ].join("|");
            if (relaySeen.has(relayKey)) return;
            relaySeen.add(relayKey);
          }
          if (!clubs.has(key)) {
            clubs.set(key, {
              key,
              clubCode: clubCodeDisplay(row),
              clubName: clubDisplay(row, aliases),
              gold: 0,
              silver: 0,
              bronze: 0,
              total: 0,
              medals: []
            });
          }
          const club = clubs.get(key);
          club[kind] += 1;
          club.total += 1;
          club.medals.push({
            kind,
            rank,
            event: eventLabel(result, row, options),
            sex: sexLabel(row.sex || result.sex),
            sexCode: cleanText(row.sex || result.sex).toUpperCase(),
            category: categoryLabel(result, row),
            stage: stageLabel(result),
            name: rowName(row),
            time: cleanText(row.time || row.result || row.performance),
            relay
          });
        });
      });

    const sortedClubs = Array.from(clubs.values())
      .map((club) => ({
        ...club,
        medals: club.medals.slice().sort((a, b) =>
          a.rank - b.rank ||
          a.event.localeCompare(b.event, "fr") ||
          a.category.localeCompare(b.category, "fr") ||
          a.name.localeCompare(b.name, "fr")
        )
      }))
      .sort((a, b) =>
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        b.total - a.total ||
        a.clubCode.localeCompare(b.clubCode, "fr")
      );

    return sortedClubs.map((club, index) => {
      const previous = sortedClubs[index - 1];
      return {
        ...club,
        rank: previous && sameMedalScore(club, previous) ? previous.rank : index + 1
      };
    });
  }

  function medalTotals(rows = []) {
    return rows.reduce((acc, row) => ({
      clubs: acc.clubs + 1,
      gold: acc.gold + Number(row.gold || 0),
      silver: acc.silver + Number(row.silver || 0),
      bronze: acc.bronze + Number(row.bronze || 0),
      total: acc.total + Number(row.total || 0)
    }), { clubs: 0, gold: 0, silver: 0, bronze: 0, total: 0 });
  }

  function buildSnapshot(results = [], options = {}) {
    const rows = buildClubMedals(results, options);
    return {
      type: "medals",
      version: 1,
      createdAt: new Date().toISOString(),
      rows,
      totals: medalTotals(rows)
    };
  }

  global.LivePalmesPublicMedalsCore = {
    buildClubMedals,
    buildSnapshot,
    cleanText,
    medalTotals,
    sameMedalScore
  };
})(window);
