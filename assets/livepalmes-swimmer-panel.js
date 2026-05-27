(function () {
  const context = {};
  let api;
  with (context) {
  function renderCategorySelect() {
    const categories = [...new Set(data.entrants.filter(matchesRace).map((entrant) => entrant.category).filter(Boolean))];
    const preferred = ["Cadet", "Junior", "Senior"];
    categories.sort((a, b) => {
      const ai = preferred.indexOf(a);
      const bi = preferred.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.localeCompare(b, "fr");
    });
    if (state.category !== "all" && !categories.some((category) => sameCategory(category, state.category))) {
      state.category = "all";
    }
    categorySelect.innerHTML = [
      `<option value="all">Toutes catégories</option>`,
      ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(categoryLabel(category))}</option>`)
    ].join("");
    categorySelect.value = state.category;
  }
  
  function renderHeader() {
    const title = compactRaceTitle();
    raceTitle.innerHTML = `${escapeHtml(title)}${isLastRaceOfCurrentSession() ? ` <span class="session-end-note">[dernière course de la session]</span>` : ""}`;
    const currentEntrants = raceEntrants();
    const meta = [
      state.session !== "all" ? `Session ${state.session}` : "",
      selectedSeriesTime() ? `Horaire ${selectedSeriesTime()}` : "",
      state.role === "speaker" && state.series !== "all" ? `${currentEntrants.length} ${swimmerWord(currentEntrants.length)}` : ""
    ].filter(Boolean).join(" - ");
    raceMeta.textContent = meta;
    const sexLabel = sexDisplayLabel(state.sex);
    raceSexBadge.textContent = sexLabel;
    renderRefereeProgressControl();
  }
  
  function renderRefereeProgressControl() {
    if (!refereeProgressBtn) return;
    const progress = refereeProgress();
    const label = refereeProgressLabel(progress);
    if (state.role === "referee") {
      const panelActions = document.querySelector(".entrants-panel .panel-actions");
      if (panelActions && refereeProgressBtn.parentElement !== panelActions) {
        const programReference = programBtn?.parentElement === panelActions ? programBtn : null;
        panelActions.insertBefore(refereeProgressBtn, programReference || panelActions.firstChild);
      }
      const isPointedHere = currentRefereeProgressIsHere();
      refereeProgressBtn.hidden = false;
      refereeProgressBtn.disabled = !selectedProgramRow();
      refereeProgressBtn.dataset.refereeProgressAction = "set";
      refereeProgressBtn.textContent = isPointedHere ? "Pointé JA" : "Pointer ici";
      refereeProgressBtn.title = label ? `Repère actuel : ${label}` : "Marquer cette course/série comme repère du JA";
      refereeProgressBtn.classList.add("confirm-button");
      refereeProgressBtn.classList.toggle("is-pointed", isPointedHere);
      return;
    }
    const headerActions = document.querySelector(".race-header .badge-row");
    if (headerActions && refereeProgressBtn.parentElement !== headerActions) {
      headerActions.insertBefore(refereeProgressBtn, headerActions.firstChild);
    }
    refereeProgressBtn.hidden = true;
    refereeProgressBtn.disabled = false;
    refereeProgressBtn.removeAttribute("data-referee-progress-action");
    refereeProgressBtn.classList.remove("confirm-button", "is-pointed");
  }
  
  function headerReferenceChipsHtml() {
    const recordRows = currentRecordRows();
    const qualificationRows = data.qualifications
      .filter(matchesRace)
      .sort((a, b) => timeToMs(a.time) - timeToMs(b.time));
    return livePalmesHeaderView.renderHeaderReferenceChipsHtml({
      qualificationRows,
      recordRows,
      selectedRecordKey: state.selectedRecordKey,
      helpers: {
        categoryClass,
        recordKey,
        shortRecordLabel
      }
    });
  }
  
  function selectedHeaderReferenceDetailsHtml() {
    if (!state.selectedRecordKey) return "";
    const row = currentRecordRows().find((record) => recordKey(record) === state.selectedRecordKey);
    if (!row) {
      state.selectedRecordKey = "";
      return "";
    }
    return livePalmesHeaderView.renderSelectedHeaderReferenceDetailsHtml(row, {
      recordDescription,
      shortRecordLabel
    });
  }
  
  function renderHeaderReferences() {
    headerRefs.innerHTML = headerReferenceChipsHtml();
    renderHeaderRefDetails();
  }
  
  function renderHeaderRefDetails() {
    const detailsHtml = selectedHeaderReferenceDetailsHtml();
    if (!detailsHtml) {
      headerRefDetails.hidden = true;
      headerRefDetails.innerHTML = "";
      return;
    }
    headerRefDetails.hidden = false;
    headerRefDetails.innerHTML = detailsHtml;
  }
  
  function recordKey(row) {
    return [row.eventId, row.sex, row.category, row.label].join("|").toLowerCase();
  }
  
  function renderEntrants() {
    const entrants = raceEntrants();
    const allRaceEntrants = data.entrants.filter(matchesRace);
    const statsEntrants = raceEntrantsForStats();
    const visibleEntrants = entrants;
    const seriesNumbers = availableSeriesNumbers();
    const selectedSeries = Number(state.series);
    const hasSeriesFilter = state.series !== "all";
    const programRow = selectedProgramRow() || programRows().find((row) => row.eventId === state.eventId && row.sex === state.sex);
    const seriesTime = selectedSeriesTime();
    const statsCount = statsEntrants.length || allRaceEntrants.length;
    entrantCount.textContent = statsCount;
    if (entrantCountLabel) entrantCountLabel.textContent = entrantWord(statsCount);
    filteredCount.textContent = hasSeriesFilter
      ? `${seriesTime ? `Horaire ${seriesTime} - ` : ""}${visibleEntrants.length} ${swimmerWord(visibleEntrants.length)}`
      : `${visibleEntrants.length} ${displayedWord(visibleEntrants.length)}`;
    const seriesLabel = selectedSeriesLabel();
    const compactViewTitle = ["referee", "speaker", "live"].includes(state.role);
    const entrantsTitleText = hasSeriesFilter
      ? (compactViewTitle ? compactRaceTitle() : seriesLabel)
      : (state.role === "referee" ? "Participants" : `${entrantWord(2).replace(/^./, (letter) => letter.toUpperCase())} 2026`);
    const inlineEntrantCount = ["referee", "speaker", "live"].includes(state.role) && hasSeriesFilter
      ? ` <span class="inline-entrant-count">${escapeHtml(`${statsCount} ${entrantWord(statsCount)}`)}</span>`
      : "";
    entrantsTitle.innerHTML = `${escapeHtml(entrantsTitleText)}${inlineEntrantCount}${hasSeriesFilter ? splitRaceNote() : ""}${isLastSeriesOfCurrentSession() ? ` <span class="session-end-note">[dernière série de la session]</span>` : ""}`;
    if (entrantsSubtitle) {
      if (hasSeriesFilter && ["speaker", "live"].includes(state.role)) {
        const refDetails = selectedHeaderReferenceDetailsHtml();
        entrantsSubtitle.innerHTML = `
          <span class="speaker-panel-refs">${headerReferenceChipsHtml()}</span>
          ${refDetails ? `<span class="header-ref-details speaker-panel-ref-details">${refDetails}</span>` : ""}
        `;
      } else if (hasSeriesFilter && state.role === "referee") {
        entrantsSubtitle.textContent = "";
      } else {
        entrantsSubtitle.textContent = hasSeriesFilter
          ? [seriesTime ? `Horaire ${seriesTime}` : "", `${visibleEntrants.length} ${swimmerWord(visibleEntrants.length)}`].filter(Boolean).join(" - ")
          : "";
      }
    }
    rankHeader.textContent = hasSeriesFilter ? "Ligne" : "Rang";
    if (swimmerHeader) swimmerHeader.textContent = isFemaleContext() ? "Nageuse" : "Nageur";
    if (searchLabel) searchLabel.textContent = `Recherche ${entrantWord(1)}`;
    if (lineOrderBtn) {
      lineOrderBtn.hidden = !hasSeriesFilter || !["live", "speaker", "referee"].includes(state.role);
      lineOrderBtn.textContent = state.lineOrder === "desc" ? "Lignes 8-1" : "Lignes 1-8";
      lineOrderBtn.title = state.lineOrder === "desc" ? "Afficher les lignes de 1 à 8" : "Afficher les lignes de 8 à 1";
    }
    entrantsTableWrap?.classList.toggle("series-table", hasSeriesFilter);
    const best = [...(statsEntrants.length ? statsEntrants : allRaceEntrants)].sort((a, b) => timeToMs(a.seedTime) - timeToMs(b.seedTime))[0];
    bestEntry.textContent = best?.seedTime || "--";
    if (bestEntryName) {
      const club = best ? shortClubName(best) : "";
      bestEntryName.textContent = best
        ? `${formatDisplayName(best)}${club ? ` - ${club}` : ""}`
        : "";
    }
  
    entrantsBody.innerHTML = visibleEntrants.length ? visibleEntrants.map((entrant, index) => {
      const importedForfait = entrant.importedStatus === "forfait";
      const reference = state.role === "referee"
        ? (importedForfait ? `<span class="badge muted">Forfait déclaré</span>` : `<span class="badge muted">Cliquer pour décider</span>`)
        : (isSpeakerView() ? getEntrantReference(entrant) : "");
      const swimmerId = entrant.swimmerId || entrantKey(entrant);
      const lineLabel = hasSeriesFilter ? (entrant.seriesInfo?.line || "-") : index + 1;
      const clubLabel = state.role === "referee" ? shortClubName(entrant) : (entrant.club || "-");
      const displayName = state.role === "referee" && isRelayEntrant(entrant)
        ? (shortClubName(entrant) || formatDisplayName(entrant))
        : formatSeriesDisplayName(entrant);
      const lineAlerts = activeLineAlertsForEntrant(entrant);
      const lineTimeStatus = renderLineTimeStatus(entrant, lineAlerts);
      const rowDisabled = lineAlerts.length || importedForfait;
      return `
        <tr class="${state.selectedSwimmerId === swimmerId ? "selected-row" : ""} ${rowDisabled ? "dsq-row" : ""} ${importedForfait ? "imported-forfait-row" : ""} category-row ${categoryClass(entrant.category)}" data-swimmer-id="${escapeHtml(swimmerId)}" data-imported-forfait="${importedForfait ? "1" : "0"}">
          <td><span class="lane">${escapeHtml(lineLabel)}</span></td>
          <td class="name-cell">
            <button class="swimmer-button" data-swimmer-id="${escapeHtml(swimmerId)}">${escapeHtml(displayName)}${!isRelayEntrant(entrant) ? ` <span class="birth-year">(${escapeHtml(getBirthYearLabel(entrant.birthDate))})</span>${renderNonSelectableBadge(entrant)}${renderCompetitionStatBadges(entrant)}` : ""}${isSpeakerView() ? renderEdfBadges(entrant) : ""}</button>
            ${!isRelayEntrant(entrant) || state.role === "referee" ? `<span class="club-name">${escapeHtml(clubLabel || "-")}</span>` : ""}
          </td>
          <td><span class="category-pill">${escapeHtml(categoryLabel(entrant.category, entrant.sex))}</span></td>
          <td class="time-cell">
            ${lineTimeStatus
              ? lineTimeStatus
              : lineAlerts.length
              ? renderLineAlertBadges(lineAlerts)
              : `<span class="time">${escapeHtml(entrant.seedTime || "-")}</span>`}
            ${!lineTimeStatus && !lineAlerts.length && isSpeakerView() ? renderRecordGapAlert(entrant) : ""}
            ${!lineTimeStatus && !lineAlerts.length && isSpeakerView() && entrant.seedSource ? `<span class="seed-source">${escapeHtml(entrant.seedSource)}</span>` : ""}
          </td>
          <td>${reference}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="5" class="empty">${programRow?.hasEntrants === false ? `Finale à afficher, ${entrantWord(2)} non disponibles pour le moment.` : `Aucun${isFemaleContext() ? "e" : ""} ${entrantWord(1)} pour cette sélection.`}</td></tr>`;
    if (isSpeakerView()) {
      renderSwimmerDetails();
    } else {
      swimmerDetails.hidden = true;
      swimmerDetails.innerHTML = "";
    }
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
      references.push(`<span class="badge holder-alert">${isRelayEntrant(entrant) ? "Club recordman" : "Détient"} ${escapeHtml(shortRecordLabel(record))}</span>`);
    });
    const raceMedals = findInternationalMedalsForRace(entrant);
    raceMedals.forEach((medal) => {
      references.push(`<span class="badge international-alert">${escapeHtml(medal.medal || "Médaille")} ${escapeHtml(shortChampionshipLabel(medal.championship))}</span>`);
    });
    findSwimmerInfosForEntrant(entrant).forEach((item) => {
      references.push(`<span class="badge swimmer-info-badge">${escapeHtml(item.info)}</span>`);
    });
    return references.length ? `<div class="reference-badges">${references.join("")}</div>` : "";
  }
  
  function recordTargetsForEntrant(entrant) {
    return data.records
      .filter((record) => record.eventId === entrant.eventId && record.sex === entrant.sex)
      .filter((record) => sameCategory(record.category, entrant.category));
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
    return `<span class="record-gap">à ${escapeHtml(formatGap(target.diff))} du ${escapeHtml(label)}</span>`;
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
      `<span class="stat-badge ${escapeHtml(item.type || "")}" title="${escapeHtml(item.detail || item.label || "Repère compétition")}">${escapeHtml(item.icon || "*")}</span>`
    )).join("");
  }
  
  function renderNonSelectableBadge(entrant) {
    return entrant?.nonSelectable && isSpeakerView()
      ? `<span class="non-selectable-label" title="Non sélectionnable">NS</span>`
      : "";
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
  
  function normalizeClubMatch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .toUpperCase();
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
  
  function findRecordByTime(entrant, time, category) {
    if (!time) return null;
    return data.records.find((record) => (
      record.eventId === entrant.eventId &&
      record.sex === entrant.sex &&
      sameCategory(record.category, category) &&
      sameTime(record.time, time)
    ));
  }
  
  function isRelayEntrant(entrant) {
    return /^\d+x/i.test(String(entrant.eventId || ""));
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
  
  function sameTime(left, right) {
    return Number.isFinite(timeToMs(left)) && timeToMs(left) === timeToMs(right);
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
  
  function entrantPerformanceNameKey(row) {
    return livePalmesResults.entrantPerformanceNameKey(row, {
      formatPersonNameParts,
      normalizePersonName
    });
  }
  
  function performanceBirthYear(row) {
    return livePalmesResults.performanceBirthYear(row);
  }
  
  function performanceMatchesEntrant(performance, entrant) {
    return livePalmesResults.performanceMatchesEntrant(performance, entrant, {
      formatPersonNameParts,
      normalizePersonName,
      recordEventMatches
    });
  }
  
  function performanceStatusResultLabel(performance) {
    return livePalmesResults.performanceStatusResultLabel(performance);
  }
  
  function performanceDisplayValue(performance) {
    return livePalmesResults.performanceDisplayValue(performance);
  }
  
  function resultRankForPerformance(performance, result) {
    return livePalmesResults.resultRankForPerformance(performance, result, {
      formatPersonNameParts,
      normalizePersonName,
      recordEventMatches
    });
  }
  
  function performanceRankLabel(performance) {
    return livePalmesResults.performanceRankLabel(performance, { formatRank });
  }
  
  function swimmerBestPerformanceForEntry(entry) {
    return livePalmesResults.swimmerBestPerformanceForEntry(entry, raceResults, {
      formatPersonNameParts,
      isFinalStage,
      normalizePersonName,
      recordEventMatches
    });
  }
  
  function compactProgramPerformanceLabel(entry) {
    return livePalmesResults.compactProgramPerformanceLabel(entry, raceResults, {
      escapeHtml,
      finalStageLabel,
      formatPersonNameParts,
      formatRank,
      isFinalStage,
      isSpeakerView,
      normalizePersonName,
      recordEventMatches
    });
  }
  
  function selectRecordForCategory(category) {
    if (category === "all") {
      state.selectedRecordKey = "";
      return;
    }
    const record = currentRecordRows().find((row) => sameCategory(row.category, category));
    state.selectedRecordKey = record ? recordKey(record) : "";
  }
  
  function renderSwimmerDetails() {
    if (!state.selectedSwimmerId) {
      swimmerDetails.hidden = true;
      swimmerDetails.innerHTML = "";
      return;
    }
    const entries = data.entrants
      .filter((entrant) => (entrant.swimmerId || entrantKey(entrant)) === state.selectedSwimmerId)
      .sort((a, b) => eventOrder(a.eventId) - eventOrder(b.eventId) || timeToMs(a.seedTime) - timeToMs(b.seedTime));
    if (!entries.length) {
      swimmerDetails.hidden = true;
      swimmerDetails.innerHTML = "";
      return;
    }
    const swimmer = entries[0];
    const uniqueEntries = [...entries.reduce((map, entry) => {
      const key = `${entry.eventId}|${entry.sex || swimmer.sex || ""}`;
      if (!map.has(key)) map.set(key, entry);
      return map;
    }, new Map()).values()];
    const france2025 = findFrance2025Results(swimmer);
    const internationalMedals = findInternationalMedals(swimmer);
    const heldRecords = findAllRecordsHeldByEntrant(swimmer);
    const competitionStats = findCompetitionStatsForEntrant(swimmer);
    const swimmerInfos = findSwimmerInfosForEntrant(swimmer);
    swimmerDetails.hidden = false;
    swimmerDetails.innerHTML = `
      <div class="details-title">
        <div class="swimmer-identity">
          <h4>${escapeHtml(formatName(swimmer))} ${renderCompetitionStatBadges(swimmer)} ${renderEdfBadges(swimmer)}</h4>
          <span>${escapeHtml(swimmer.club || "")} - ${escapeHtml(categoryLabel(swimmer.category, swimmer.sex))} - ${escapeHtml(getBirthYearLabel(swimmer.birthDate))}</span>
          ${competitionStats.length ? `
            <div class="stat-detail-list">
              ${competitionStats.map((item) => `<strong>${escapeHtml(item.icon || "*")} ${escapeHtml(item.detail || item.label || "Repère compétition")}</strong>`).join("")}
            </div>
          ` : ""}
          ${swimmerInfos.length ? `
            <div class="swimmer-info-list">
              ${swimmerInfos.map((item) => `<strong>${escapeHtml(item.info)}</strong>`).join("")}
            </div>
          ` : ""}
        </div>
        <div class="compact-program" aria-label="Courses engagées du weekend">
          ${uniqueEntries.map((entry) => `
            <span class="${categoryClass(entry.category)}">
              <strong>${escapeHtml(shortEventLabel(entry.eventId))}</strong>
              ${compactProgramPerformanceLabel(entry)}
            </span>
          `).join("")}
        </div>
        <button class="icon-button close-details" title="Fermer la fiche" aria-label="Fermer la fiche">×</button>
      </div>
      ${heldRecords.length ? `
        <div class="detail-section">
          <h5>Records actuels détenus</h5>
          <div class="detail-list">
            ${heldRecords.map((record) => `
              <div class="detail-row record-detail ${categoryClass(record.category)}">
                <span>${renderRecordFlag(record)} ${renderRecordCategoryFlag(record)} <strong>${escapeHtml(eventLabel(record.eventId))}</strong> - ${escapeHtml([record.time, record.date, record.place].filter(Boolean).join(" - ") || "-")}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
      ${internationalMedals.length ? `
        <div class="detail-section">
          <h5>International</h5>
          <div class="compact-achievement-list">
            ${internationalMedals.map((medal) => `
              <div class="compact-achievement ${categoryClass(swimmer.category)}">
                <span class="medal-dot ${medalClass(medal.medal)}" aria-label="${escapeHtml(medal.medal || "Médaille")}">●</span>
                <span><strong>${escapeHtml(medal.eventLabel || eventLabel(medal.eventId))}</strong>${escapeHtml([medal.time, shortChampionshipLabel(medal.championship)].filter(Boolean).join(" - ")) ? ` - ${escapeHtml([medal.time, shortChampionshipLabel(medal.championship)].filter(Boolean).join(" - "))}` : ""}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
      ${france2025.length ? `
        <div class="detail-section">
          <h5>France 2025</h5>
          <div class="compact-achievement-list france-compact">
            ${france2025.map((row) => `
              <div class="compact-achievement ${categoryClass(row.category)}">
                <span><strong>${escapeHtml(formatRank(row.rank))}</strong> ${escapeHtml(categoryLabel(row.category, row.sex))}</span>
                <span>${escapeHtml(eventLabel(row.eventId))}</span>
                <span>${escapeHtml(row.time || "-")}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;
  }
  
  function eventOrder(eventId) {
    const index = data.events.findIndex((event) => event.id === eventId);
    return index === -1 ? 99 : index;
  }
  
  function eventLabel(eventId) {
    const event = data.events.find((item) => item.id === eventId);
    return event?.label || String(eventId || "").toUpperCase();
  }
  
  function shortEventLabel(eventId) {
    return String(eventId || "").toUpperCase();
  }
  
  function findFrance2025Results(entrant) {
    const entrantName = normalizePersonName(formatName(entrant));
    return data.top2025
      .filter((item) => item.sex === entrant.sex && normalizePersonName(item.name) === entrantName)
      .sort((a, b) => eventOrder(a.eventId) - eventOrder(b.eventId) || (a.rank || 99) - (b.rank || 99));
  }
  
  function medalForRank(rank) {
    const value = Number(rank);
    if (value === 1) return "Or";
    if (value === 2) return "Argent";
    if (value === 3) return "Bronze";
    return "Finaliste";
  }
  
  function medalClass(value) {
    const text = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (text.includes("or")) return "medal-gold";
    if (text.includes("argent")) return "medal-silver";
    if (text.includes("bronze")) return "medal-bronze";
    return "medal-neutral";
  }
  
  function currentRecordRows() {
    const order = { Cadet: 1, Junior: 2, Senior: 3 };
    const relayCategories = isRelayEntrant({ eventId: state.eventId })
      ? new Set(data.entrants.filter(matchesRace).map((entrant) => entrant.category).filter(Boolean))
      : null;
    return data.records
      .filter(shouldKeepRecord)
      .filter((record) => recordMatchesRace(record))
      .filter((record) => !relayCategories || relayCategories.has(record.category))
      .sort((a, b) => (order[a.category] || 99) - (order[b.category] || 99));
  }
  
  function shortRecordLabel(row) {
    if (sameCategory(row.category, "Cadet")) return state.sex === "F" ? "MPF cadette" : "MPF cadet";
    if (sameCategory(row.category, "Junior")) return "RF junior";
    if (sameCategory(row.category, "Senior")) return "RF senior";
    return row.label || row.category || "Record";
  }
  
  function recordFlagText(row) {
    if (sameCategory(row.category, "Cadet")) return "MPF";
    if (sameCategory(row.category, "Junior")) return "RFJ";
    if (sameCategory(row.category, "Senior")) return "RF";
    return "REC";
  }
  
  function renderRecordFlag(row) {
    return `<span class="record-flag" title="${escapeHtml(shortRecordLabel(row))}">${escapeHtml(recordFlagText(row))}</span>`;
  }
  
  function shortCategoryLabel(category) {
    if (sameCategory(category, "Cadet")) return "CAD";
    if (sameCategory(category, "Junior")) return "JUN";
    if (sameCategory(category, "Senior")) return "SEN";
    return String(category || "").slice(0, 3).toUpperCase();
  }
  
  function renderRecordCategoryFlag(row) {
    return `<span class="record-category-flag ${categoryClass(row.category)}">${escapeHtml(shortCategoryLabel(row.category))}</span>`;
  }
  
  function renderTop2025() {
    const categories = ["Cadet", "Junior", "Senior"];
    top2025Box.innerHTML = categories.map((category) => {
      const rows = data.top2025
        .filter((item) => matchesRace(item) && sameCategory(item.category, category))
        .sort((a, b) => (a.rank || 99) - (b.rank || 99))
        .slice(0, 5);
      return `
        <div class="ranking-list ${categoryClass(category)}">
          <h4>${escapeHtml(categoryLabel(category))}</h4>
          <ol>
            ${rows.length ? rows.map((row) => `
              <li>
                <span class="rank">${escapeHtml(row.rank || "-")}</span>
                <span>
                  <strong>${escapeHtml(row.name || "-")}</strong>
                  <span class="muted-text">${escapeHtml(row.club || "")}</span>
                </span>
                <span class="time">${escapeHtml(row.time || "-")}</span>
              </li>
            `).join("") : `<li class="empty">À renseigner</li>`}
          </ol>
        </div>
      `;
    }).join("");
  }
  
  function recordDescription(row) {
    return [
      row.holder || "Titulaire à renseigner",
      row.club,
      row.date,
      row.place
    ].filter(Boolean).join(" - ");
  }
  api = {
    renderCategorySelect,
    renderHeader,
    renderRefereeProgressControl,
    headerReferenceChipsHtml,
    selectedHeaderReferenceDetailsHtml,
    renderHeaderReferences,
    renderHeaderRefDetails,
    recordKey,
    renderEntrants,
    getEntrantReference,
    recordTargetsForEntrant,
    renderRecordGapAlert,
    renderEdfBadges,
    renderCompetitionStatBadges,
    renderNonSelectableBadge,
    findEdfMemberships,
    findCompetitionStatsForEntrant,
    normalizeClubMatch,
    findSwimmerInfosForEntrant,
    findInternationalMedals,
    findInternationalMedalsForRace,
    shortChampionshipLabel,
    findRecordByTime,
    isRelayEntrant,
    isNationalTeamRelayRecord,
    shouldKeepRecord,
    isBestClubRelayEntry,
    findRelayClubRecords,
    findRecordsHeldByEntrant,
    findAllRecordsHeldByEntrant,
    sameTime,
    isQualificationEligible,
    findTop2025ForEntrant,
    entrantPerformanceNameKey,
    performanceBirthYear,
    performanceMatchesEntrant,
    performanceStatusResultLabel,
    performanceDisplayValue,
    resultRankForPerformance,
    performanceRankLabel,
    swimmerBestPerformanceForEntry,
    compactProgramPerformanceLabel,
    selectRecordForCategory,
    renderSwimmerDetails,
    eventOrder,
    eventLabel,
    shortEventLabel,
    findFrance2025Results,
    medalForRank,
    medalClass,
    currentRecordRows,
    shortRecordLabel,
    recordFlagText,
    renderRecordFlag,
    shortCategoryLabel,
    renderRecordCategoryFlag,
    renderTop2025,
    recordDescription
  };
  }

  function useContext(nextContext = {}) {
    Object.keys(context).forEach((key) => { delete context[key]; });
    Object.assign(context, nextContext || {});
  }

  window.LivePalmesSwimmerPanel = {
    renderCategorySelect: (...args) => { useContext(args.pop() || {}); return api.renderCategorySelect(...args); },
    renderHeader: (...args) => { useContext(args.pop() || {}); return api.renderHeader(...args); },
    renderRefereeProgressControl: (...args) => { useContext(args.pop() || {}); return api.renderRefereeProgressControl(...args); },
    headerReferenceChipsHtml: (...args) => { useContext(args.pop() || {}); return api.headerReferenceChipsHtml(...args); },
    selectedHeaderReferenceDetailsHtml: (...args) => { useContext(args.pop() || {}); return api.selectedHeaderReferenceDetailsHtml(...args); },
    renderHeaderReferences: (...args) => { useContext(args.pop() || {}); return api.renderHeaderReferences(...args); },
    renderHeaderRefDetails: (...args) => { useContext(args.pop() || {}); return api.renderHeaderRefDetails(...args); },
    recordKey: (...args) => { useContext(args.pop() || {}); return api.recordKey(...args); },
    renderEntrants: (...args) => { useContext(args.pop() || {}); return api.renderEntrants(...args); },
    getEntrantReference: (...args) => { useContext(args.pop() || {}); return api.getEntrantReference(...args); },
    recordTargetsForEntrant: (...args) => { useContext(args.pop() || {}); return api.recordTargetsForEntrant(...args); },
    renderRecordGapAlert: (...args) => { useContext(args.pop() || {}); return api.renderRecordGapAlert(...args); },
    renderEdfBadges: (...args) => { useContext(args.pop() || {}); return api.renderEdfBadges(...args); },
    renderCompetitionStatBadges: (...args) => { useContext(args.pop() || {}); return api.renderCompetitionStatBadges(...args); },
    renderNonSelectableBadge: (...args) => { useContext(args.pop() || {}); return api.renderNonSelectableBadge(...args); },
    findEdfMemberships: (...args) => { useContext(args.pop() || {}); return api.findEdfMemberships(...args); },
    findCompetitionStatsForEntrant: (...args) => { useContext(args.pop() || {}); return api.findCompetitionStatsForEntrant(...args); },
    normalizeClubMatch: (...args) => { useContext(args.pop() || {}); return api.normalizeClubMatch(...args); },
    findSwimmerInfosForEntrant: (...args) => { useContext(args.pop() || {}); return api.findSwimmerInfosForEntrant(...args); },
    findInternationalMedals: (...args) => { useContext(args.pop() || {}); return api.findInternationalMedals(...args); },
    findInternationalMedalsForRace: (...args) => { useContext(args.pop() || {}); return api.findInternationalMedalsForRace(...args); },
    shortChampionshipLabel: (...args) => { useContext(args.pop() || {}); return api.shortChampionshipLabel(...args); },
    findRecordByTime: (...args) => { useContext(args.pop() || {}); return api.findRecordByTime(...args); },
    isRelayEntrant: (...args) => { useContext(args.pop() || {}); return api.isRelayEntrant(...args); },
    isNationalTeamRelayRecord: (...args) => { useContext(args.pop() || {}); return api.isNationalTeamRelayRecord(...args); },
    shouldKeepRecord: (...args) => { useContext(args.pop() || {}); return api.shouldKeepRecord(...args); },
    isBestClubRelayEntry: (...args) => { useContext(args.pop() || {}); return api.isBestClubRelayEntry(...args); },
    findRelayClubRecords: (...args) => { useContext(args.pop() || {}); return api.findRelayClubRecords(...args); },
    findRecordsHeldByEntrant: (...args) => { useContext(args.pop() || {}); return api.findRecordsHeldByEntrant(...args); },
    findAllRecordsHeldByEntrant: (...args) => { useContext(args.pop() || {}); return api.findAllRecordsHeldByEntrant(...args); },
    sameTime: (...args) => { useContext(args.pop() || {}); return api.sameTime(...args); },
    isQualificationEligible: (...args) => { useContext(args.pop() || {}); return api.isQualificationEligible(...args); },
    findTop2025ForEntrant: (...args) => { useContext(args.pop() || {}); return api.findTop2025ForEntrant(...args); },
    entrantPerformanceNameKey: (...args) => { useContext(args.pop() || {}); return api.entrantPerformanceNameKey(...args); },
    performanceBirthYear: (...args) => { useContext(args.pop() || {}); return api.performanceBirthYear(...args); },
    performanceMatchesEntrant: (...args) => { useContext(args.pop() || {}); return api.performanceMatchesEntrant(...args); },
    performanceStatusResultLabel: (...args) => { useContext(args.pop() || {}); return api.performanceStatusResultLabel(...args); },
    performanceDisplayValue: (...args) => { useContext(args.pop() || {}); return api.performanceDisplayValue(...args); },
    resultRankForPerformance: (...args) => { useContext(args.pop() || {}); return api.resultRankForPerformance(...args); },
    performanceRankLabel: (...args) => { useContext(args.pop() || {}); return api.performanceRankLabel(...args); },
    swimmerBestPerformanceForEntry: (...args) => { useContext(args.pop() || {}); return api.swimmerBestPerformanceForEntry(...args); },
    compactProgramPerformanceLabel: (...args) => { useContext(args.pop() || {}); return api.compactProgramPerformanceLabel(...args); },
    selectRecordForCategory: (...args) => { useContext(args.pop() || {}); return api.selectRecordForCategory(...args); },
    renderSwimmerDetails: (...args) => { useContext(args.pop() || {}); return api.renderSwimmerDetails(...args); },
    eventOrder: (...args) => { useContext(args.pop() || {}); return api.eventOrder(...args); },
    eventLabel: (...args) => { useContext(args.pop() || {}); return api.eventLabel(...args); },
    shortEventLabel: (...args) => { useContext(args.pop() || {}); return api.shortEventLabel(...args); },
    findFrance2025Results: (...args) => { useContext(args.pop() || {}); return api.findFrance2025Results(...args); },
    medalForRank: (...args) => { useContext(args.pop() || {}); return api.medalForRank(...args); },
    medalClass: (...args) => { useContext(args.pop() || {}); return api.medalClass(...args); },
    currentRecordRows: (...args) => { useContext(args.pop() || {}); return api.currentRecordRows(...args); },
    shortRecordLabel: (...args) => { useContext(args.pop() || {}); return api.shortRecordLabel(...args); },
    recordFlagText: (...args) => { useContext(args.pop() || {}); return api.recordFlagText(...args); },
    renderRecordFlag: (...args) => { useContext(args.pop() || {}); return api.renderRecordFlag(...args); },
    shortCategoryLabel: (...args) => { useContext(args.pop() || {}); return api.shortCategoryLabel(...args); },
    renderRecordCategoryFlag: (...args) => { useContext(args.pop() || {}); return api.renderRecordCategoryFlag(...args); },
    renderTop2025: (...args) => { useContext(args.pop() || {}); return api.renderTop2025(...args); },
    recordDescription: (...args) => { useContext(args.pop() || {}); return api.recordDescription(...args); }
  };
}());
