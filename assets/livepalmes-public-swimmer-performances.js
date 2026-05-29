(function attachLivePalmesPublicSwimmerPerformances(global) {
  function create(options = {}) {
    const {
      birthYearLabel,
      cleanText,
      displaySeriesRow,
      isFinalStage,
      normalizeText,
      recordEventMatches
    } = options;

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

    function performanceMatchesRow(performance, row, matchOptions = {}) {
      row = displaySeriesRow(row, matchOptions.entrants || []);
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

    function performancesForProgramRow(row, performanceOptions = {}) {
      const performances = allPublicPerformances(performanceOptions.results || [])
        .filter((performance) => performanceMatchesRow(performance, row, performanceOptions))
        .sort((a, b) => {
          const finalA = isFinalStage(a.stage) ? 1 : 0;
          const finalB = isFinalStage(b.stage) ? 1 : 0;
          return finalA - finalB || String(a.updatedAt || "").localeCompare(String(b.updatedAt || ""));
        });
      return uniquePerformances(performances);
    }

    function resultPdfLinksForProgramRow(row, performances = [], resultOptions = {}) {
      const seen = new Set();
      const results = resultOptions.results || [];
      const programKey = resultOptions.programKey || (() => "");
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

    function isPlaceholderSeedTime(value) {
      const digits = String(value || "").replace(/\D/g, "");
      return digits === "595999";
    }

    function performanceDeltaLabel(performance, referenceTime, referenceLabel = "") {
      if (performance?.status || !performance?.time || !referenceTime) return "";
      if (isPlaceholderSeedTime(referenceTime)) return "";
      const performanceMs = timeToMs(performance.time);
      const referenceMs = timeToMs(referenceTime);
      if (!Number.isFinite(performanceMs) || !Number.isFinite(referenceMs)) return "";
      const delta = (performanceMs - referenceMs) / 1000;
      if (!Number.isFinite(delta)) return "";
      const sign = delta >= 0 ? "+" : "-";
      return `${sign}${Math.abs(delta).toFixed(2).replace(".", ",")}s${referenceLabel ? ` / ${referenceLabel}` : ""}`;
    }

    return {
      allPublicPerformances,
      performanceClubKey,
      performanceDeltaLabel,
      performanceDuplicateKey,
      performanceInlinePhaseLabel,
      performanceMatchesRow,
      performanceNameKey,
      performancePhaseLabel,
      performanceStatusLabel,
      performanceValueLabel,
      performancesForProgramRow,
      resultPdfLabel,
      resultPdfLinksForProgramRow,
      isPlaceholderSeedTime,
      timeToMs,
      uniquePerformances
    };
  }

  global.LivePalmesPublicSwimmerPerformances = { create };
})(window);
