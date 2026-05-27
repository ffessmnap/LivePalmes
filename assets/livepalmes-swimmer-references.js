(function attachLivePalmesSwimmerReferences(global) {
  function build(options = {}) {
    const {
      categoryClass,
      categoryLabel,
      data,
      entrantKey,
      entrantPersonKey,
      escapeHtml,
      formatGap,
      formatName,
      formatRank,
      getBirthYear,
      getBirthYearLabel,
      isSpeakerView,
      matchesRace,
      normalizePersonName,
      recordEventMatches,
      recordMatchesRace,
      sameCategory,
      sheetSex,
      shortClubName,
      shortRecordLabel,
      timeToMs
    } = options;

    function isRelayEntrant(entrant) {
      return /^\d+x/i.test(String(entrant.eventId || ""));
    }

    function normalizeClubMatch(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "")
        .toUpperCase();
    }

    function sameTime(left, right) {
      return Number.isFinite(timeToMs(left)) && timeToMs(left) === timeToMs(right);
    }

    function isNationalTeamRelayRecord(record) {
      if (!isRelayEntrant(record)) return false;
      const values = [record.club, record.holder]
        .map((value) => String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase());
      return values.some((value) => value === "EDF" || value === "EDFJ" || value === "EQUIPEDEFRANCE");
    }

    function shouldKeepRecord(record) {
      return !isNationalTeamRelayRecord(record);
    }

    function recordTargetsForEntrant(entrant) {
      return data.records
        .filter((record) => record.eventId === entrant.eventId && record.sex === entrant.sex)
        .filter((record) => sameCategory(record.category, entrant.category));
    }

    function findRecordByTime(entrant, time, category) {
      if (!time) return null;
      return data.records.find((record) => (
        record.eventId === entrant.eventId &&
        record.sex === entrant.sex &&
        sameCategory(record.category, category) &&
        sameTime(record.time, time)
      ));
    }

    function isBestClubRelayEntry(entrant) {
      if (!isRelayEntrant(entrant) || !entrant.clubCode) return false;
      const sameClubEntries = data.entrants.filter((row) => (
        row.eventId === entrant.eventId &&
        row.sex === entrant.sex &&
        String(row.clubCode || "").toUpperCase() === String(entrant.clubCode || "").toUpperCase()
      ));
      const best = sameClubEntries.sort((a, b) => timeToMs(a.seedTime) - timeToMs(b.seedTime))[0];
      return best && (best.swimmerId || entrantKey(best)) === (entrant.swimmerId || entrantKey(entrant));
    }

    function findRelayClubRecords(entrant) {
      if (!isBestClubRelayEntry(entrant)) return [];
      const clubCode = String(entrant.clubCode || "").toUpperCase();
      return data.records.filter((record) => (
        shouldKeepRecord(record) &&
        record.eventId === entrant.eventId &&
        recordMatchesRace(record, entrant.eventId, entrant.sex) &&
        sameCategory(record.category, entrant.category) &&
        String(record.club || "").toUpperCase() === clubCode
      ));
    }

    function findRecordsHeldByEntrant(entrant) {
      if (isRelayEntrant(entrant)) {
        return findRelayClubRecords(entrant);
      }
      const entrantName = normalizePersonName(formatName(entrant));
      return data.records.filter((record) => (
        shouldKeepRecord(record) &&
        record.eventId === entrant.eventId &&
        record.sex === entrant.sex &&
        normalizePersonName(record.holder) === entrantName
      ));
    }

    function findAllRecordsHeldByEntrant(entrant) {
      const entrantName = normalizePersonName(formatName(entrant));
      return data.records.filter((record) => (
        record.sex === entrant.sex &&
        normalizePersonName(record.holder) === entrantName
      ));
    }

    function isQualificationEligible(entrant, qualification) {
      if (qualification.label !== "TRP") return true;
      const birthYear = getBirthYear(entrant.birthDate);
      return Number.isFinite(birthYear) && birthYear >= 2005;
    }

    function findTop2025ForEntrant(entrant) {
      const entrantName = normalizePersonName(formatName(entrant));
      return data.top2025.find((item) => (
        matchesRace(item) && normalizePersonName(item.name) === entrantName
      ));
    }

    function findEdfMemberships(entrant) {
      const key = entrantPersonKey(entrant);
      return (data.edfMembers || []).filter((member) => member.personKey === key);
    }

    function findCompetitionStatsForEntrant(entrant) {
      if (isRelayEntrant(entrant)) return [];
      const entrantName = normalizePersonName(formatName(entrant));
      const entrantYear = getBirthYearLabel(entrant.birthDate);
      const entrantSex = sheetSex(entrant.sex);
      return (data.competitionStats || []).filter((item) => {
        if (!item.name || normalizePersonName(item.name) !== entrantName) return false;
        if (item.sex && entrantSex && item.sex !== entrantSex) return false;
        if (item.type === "birthday") return true;
        if (item.birthYear && entrantYear !== "----" && String(item.birthYear) !== String(entrantYear)) return false;
        return true;
      });
    }

    function findSwimmerInfosForEntrant(entrant) {
      if (!isSpeakerView() || isRelayEntrant(entrant)) return [];
      const entrantName = normalizePersonName(formatName(entrant));
      const clubKeys = [
        entrant.club,
        entrant.clubCode,
        shortClubName(entrant)
      ].map(normalizeClubMatch).filter(Boolean);
      return (data.swimmerInfos || []).filter((item) => {
        if (!item.info || item.personKey !== entrantName) return false;
        if (!item.clubKey) return true;
        return clubKeys.includes(item.clubKey);
      });
    }

    function findInternationalMedals(entrant) {
      const key = entrantPersonKey(entrant);
      return (data.internationalMedals || []).filter((medal) => medal.personKey === key);
    }

    function findInternationalMedalsForRace(entrant) {
      return findInternationalMedals(entrant).filter((medal) => recordEventMatches(medal, entrant.eventId));
    }

    function shortChampionshipLabel(value) {
      const text = String(value || "").toUpperCase();
      if (text.includes("MONDE")) return text.replace("MONDE", "Monde");
      if (text.includes("EURO")) return text.replace("EURO", "Europe");
      return value || "";
    }

    function renderEdfBadges(entrant) {
      const memberships = findEdfMemberships(entrant);
      return memberships.map((member) => (
        `<span class="edf-badge" title="${escapeHtml(member.label || "Equipe de France")}">${escapeHtml(member.team || "E")}</span>`
      )).join("");
    }

    function renderCompetitionStatBadges(entrant) {
      if (!isSpeakerView()) return "";
      return findCompetitionStatsForEntrant(entrant).map((item) => (
        `<span class="stat-badge ${escapeHtml(item.type || "")}" title="${escapeHtml(item.detail || item.label || "Rep\u00e8re comp\u00e9tition")}">${escapeHtml(item.icon || "*")}</span>`
      )).join("");
    }

    function renderNonSelectableBadge(entrant) {
      return entrant?.nonSelectable && isSpeakerView()
        ? `<span class="non-selectable-label" title="Non s\u00e9lectionnable">NS</span>`
        : "";
    }

    function renderRecordGapAlert(entrant) {
      const seed = timeToMs(entrant.seedTime);
      if (!Number.isFinite(seed)) return "";
      const target = recordTargetsForEntrant(entrant)
        .map((record) => ({ record, diff: seed - timeToMs(record.time) }))
        .filter((item) => Number.isFinite(item.diff))
        .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))[0];
      if (!target) return "";
      const label = shortRecordLabel(target.record);
      if (target.diff <= 0) {
        return `<span class="record-gap under-record">sous ${escapeHtml(label)}</span>`;
      }
      const threshold = seed < 60000 ? 1000 : (seed < 180000 ? 2500 : 5000);
      if (target.diff > threshold) return "";
      return `<span class="record-gap">\u00e0 ${escapeHtml(formatGap(target.diff))} du ${escapeHtml(label)}</span>`;
    }

    function getEntrantReference(entrant) {
      const references = [];
      const seed = timeToMs(entrant.seedTime);
      const recordSeed = findRecordByTime(entrant, entrant.seedTime, entrant.category);
      if (recordSeed) {
        references.push(`<span class="badge record-alert">${escapeHtml(shortRecordLabel(recordSeed))} actuel</span>`);
      }
      if (sameCategory(entrant.category, "Senior")) {
        const quals = data.qualifications
          .filter(matchesRace)
          .filter((item) => isQualificationEligible(entrant, item))
          .sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
        const qual = quals.find((item) => seed <= timeToMs(item.time));
        if (qual) {
          references.push(`<span class="badge">${escapeHtml(qual.label)} EDF</span>`);
        }
      }
      const top2025Match = findTop2025ForEntrant(entrant);
      if (top2025Match) {
        const record2025 = findRecordByTime(entrant, top2025Match.time, top2025Match.category);
        references.push(`<span class="badge category-mini ${categoryClass(top2025Match.category)}">FRA 25: ${escapeHtml(formatRank(top2025Match.rank))} ${escapeHtml(categoryLabel(top2025Match.category, entrant.sex))} - ${escapeHtml(top2025Match.time || "-")}</span>`);
        if (record2025) {
          references.push(`<span class="badge record-alert">Temps FRA 25 = ${escapeHtml(shortRecordLabel(record2025))}</span>`);
        }
      }
      const heldRecords = findRecordsHeldByEntrant(entrant).filter((record) => (
        !sameTime(record.time, entrant.seedTime) && (!top2025Match || !sameTime(record.time, top2025Match.time))
      ));
      heldRecords.forEach((record) => {
        references.push(`<span class="badge holder-alert">${isRelayEntrant(entrant) ? "Club recordman" : "D\u00e9tient"} ${escapeHtml(shortRecordLabel(record))}</span>`);
      });
      findInternationalMedalsForRace(entrant).forEach((medal) => {
        references.push(`<span class="badge international-alert">${escapeHtml(medal.medal || "M\u00e9daille")} ${escapeHtml(shortChampionshipLabel(medal.championship))}</span>`);
      });
      findSwimmerInfosForEntrant(entrant).forEach((item) => {
        references.push(`<span class="badge swimmer-info-badge">${escapeHtml(item.info)}</span>`);
      });
      return references.length ? `<div class="reference-badges">${references.join("")}</div>` : "";
    }

    return {
      findAllRecordsHeldByEntrant,
      findCompetitionStatsForEntrant,
      findEdfMemberships,
      findInternationalMedals,
      findInternationalMedalsForRace,
      findRecordByTime,
      findRecordsHeldByEntrant,
      findRelayClubRecords,
      findSwimmerInfosForEntrant,
      findTop2025ForEntrant,
      getEntrantReference,
      isBestClubRelayEntry,
      isNationalTeamRelayRecord,
      isQualificationEligible,
      isRelayEntrant,
      normalizeClubMatch,
      recordTargetsForEntrant,
      renderCompetitionStatBadges,
      renderEdfBadges,
      renderNonSelectableBadge,
      renderRecordGapAlert,
      sameTime,
      shortChampionshipLabel,
      shouldKeepRecord
    };
  }

  function call(name, entrant, options) {
    return build(options)[name](entrant);
  }

  global.LivePalmesSwimmerReferences = {
    build,
    call
  };
})(window);
