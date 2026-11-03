(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function teamEntrySection(section){
      const ids={swimmers:'adminEngagementsDetailSwimmersPanel',entries:'adminEngagementsDetailEntriesPanel',relays:'adminEngagementsDetailRelaysPanel',summary:'adminEngagementsDetailSummaryPanel'},panel=document.getElementById?.(ids[section]);
      if(portalState.selectedEngagementCompetition?.entryFormat&&portalState.selectedEngagementCompetition.entryFormat!=='classic'){
        void global.LivePalmesPortalDeferred.invoke(portalContext,'team-entries','render',[section],{});return true;
      }
      panel?.querySelector('[data-team-entry-mount]')?.remove();panel?.querySelectorAll('[data-team-entry-previous-hidden]').forEach(node=>{node.hidden=node.dataset.teamEntryPreviousHidden==='true';delete node.dataset.teamEntryPreviousHidden;});return false;
    }
    /* deferred-function: assets/portal/deferred/club-entry-views.js#renderEngagementClubSwimmersDirectory */
    function renderEngagementClubSwimmersDirectory(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "renderEngagementClubSwimmersDirectory", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#setEngagementClubSwimmerActivityStatus */
    async function setEngagementClubSwimmerActivityStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-views", "setEngagementClubSwimmerActivityStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#requestEngagementClubSwimmerDeletion */
    async function requestEngagementClubSwimmerDeletion(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-views", "requestEngagementClubSwimmerDeletion", args, moduleActions);
    }

    function renderEngagementClubSelectedSwimmersPreview(mount, selectedById) {
        const swimmers = Array.from(selectedById.entries())
          .map(([id, swimmer]) => ({ ...swimmer, id, swimmerIndexId: id }))
          .sort(portalActions.compareEngagementSwimmersBySexAndName);
        if (!swimmers.length) {
          mount.innerHTML = "";
          return;
        }
        mount.innerHTML = `
      <section class="admin-engagements-club-swimmers-section">
        <h5>Nageurs engagés <span>${swimmers.length}</span></h5>
        <div class="admin-engagements-club-swimmers-table" role="table" aria-label="Nageurs engagés">
          <div class="admin-engagements-club-swimmers-head" role="row">
            <span role="columnheader">Nageur</span><span role="columnheader">Naissance</span><span role="columnheader">Sexe</span><span role="columnheader">Cat.</span><span role="columnheader">Licence</span>
          </div>
          ${swimmers.map((swimmer, index) => {
                const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
                const licenseNumber = swimmer.licenseNumber || "";
                const category = portalActions.engagementSwimmerCategory(swimmer, portalState.selectedEngagementCompetition?.date || "");
                const detailsId = `adminEngagementsClubSelectedSwimmerDetails${index}`;
                return `
              <div class="admin-engagements-club-swimmer-row" role="row" data-engagement-club-swimmer-row data-selected="true" data-expanded="false" data-sex="${portalActions.escapeHtml(swimmer.sex || "")}">
                <label role="cell">
                  <input type="checkbox" data-engagement-club-swimmer-id="${portalActions.escapeHtml(swimmer.id)}" data-engagement-club-swimmer-source="${portalActions.escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-livepalmes-id="${portalActions.escapeHtml(swimmer.swimmerId || "")}" data-engagement-club-swimmer-name="${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-first-name="${portalActions.escapeHtml(swimmer.firstName || "")}" data-engagement-club-swimmer-last-name="${portalActions.escapeHtml(swimmer.lastName || "")}" data-engagement-club-swimmer-birth-date="${portalActions.escapeHtml(swimmer.birthDate || "")}" data-engagement-club-swimmer-sex="${portalActions.escapeHtml(swimmer.sex || "")}" data-engagement-club-swimmer-category="${portalActions.escapeHtml(category)}" checked>
                  <strong>${portalActions.escapeHtml(name)}</strong>
                </label>
                <span class="admin-engagements-club-swimmer-mobile-meta" aria-hidden="true"><b>${portalActions.escapeHtml(swimmer.sex || "-")}</b><b>${portalActions.escapeHtml(category || "-")}</b></span>
                <button class="admin-engagements-club-swimmer-details-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-details-toggle data-engagement-club-swimmer-details-name="${portalActions.escapeHtml(name)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
                <div id="${detailsId}" class="admin-engagements-club-swimmer-details">
                  <span role="cell" data-label="Naissance">${portalActions.escapeHtml(swimmer.birthDate ? portalActions.formatShortDate(swimmer.birthDate) : "-")}</span>
                  <span role="cell" data-label="Sexe">${portalActions.escapeHtml(swimmer.sex || "-")}</span>
                  <span role="cell" data-label="Catégorie">${portalActions.escapeHtml(category || "-")}</span>
                  <div class="admin-engagements-club-swimmer-license-cell" role="cell" data-label="Licence" aria-label="Numéro de licence">
                    ${licenseNumber ? `<span class="admin-engagements-club-swimmer-license-value" data-engagement-club-swimmer-license="${portalActions.escapeHtml(licenseNumber)}">${portalActions.escapeHtml(licenseNumber)}</span>` : `<input type="text" maxlength="60" pattern="[A-Za-z]-[0-9]{2}-[0-9]+" placeholder="A-12-34567" aria-label="Numéro de licence, format A-12-34567" data-engagement-club-swimmer-license>`}
                    ${portalActions.engagementSwimmerLicenseStatusIndicator(swimmer, swimmer)}
                  </div>
                </div>
              </div>`;
              }).join("")}
        </div>
      </section>`;
      }

    function renderEngagementClubSwimmers() {
        if(teamEntrySection('swimmers'))return;
        const mount = portalContext.elements.engagementsClubSwimmersList;
        const selectedMount = portalContext.elements.engagementsClubSelectedSwimmersList;
        if (!mount || !selectedMount) return;
        const canPreserveDraft = portalState.engagementClubSwimmersRenderedCompetitionId === portalState.selectedEngagementCompetitionId;
        const writeLockReason = portalActions.engagementClubSwimmerSelectionLockReason();
        const locked = Boolean(writeLockReason || !portalActions.engagementClubTeamComplete());
        if (portalContext.elements.engagementsClubSwimmersForm) portalContext.elements.engagementsClubSwimmersForm.dataset.locked = locked ? "true" : "false";
        if (portalContext.elements.engagementsClubSwimmersSaveButton) portalContext.elements.engagementsClubSwimmersSaveButton.disabled = locked || (portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded);
        portalActions.updateEngagementClubNewSwimmerControls();
        const selectedById = new Map((portalState.selectedEngagementClubEntry?.swimmers || [])
          .map((swimmer) => [swimmer.swimmerIndexId, swimmer])
          .filter(([id]) => id));
        (canPreserveDraft ? portalActions.selectedEngagementClubSwimmerRows() : []).forEach((swimmer) => {
          selectedById.set(swimmer.swimmerIndexId, {
            ...(selectedById.get(swimmer.swimmerIndexId) || {}),
            swimmerIndexId: swimmer.swimmerIndexId,
            source: swimmer.source || "performances",
            licenseNumber: swimmer.licenseNumber,
            individualEntries: swimmer.individualEntries || (swimmer.individualEventCodes || []).map((eventCode) => ({ eventCode }))
          });
        });
        if (locked) {
          selectedMount.innerHTML = "";
          mount.innerHTML = `<p class="admin-engagements-empty">${portalActions.escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
          portalState.engagementClubSwimmersRenderedCompetitionId = portalState.selectedEngagementCompetitionId;
          portalActions.updateEngagementClubSwimmersSummary();
          return;
        }
        if (portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded) {
          renderEngagementClubSelectedSwimmersPreview(selectedMount, selectedById);
          mount.innerHTML = '<p class="admin-engagements-empty">Préparation de la recherche des nageurs...</p>';
          portalState.engagementClubSwimmersRenderedCompetitionId = portalState.selectedEngagementCompetitionId;
          portalActions.updateEngagementClubSwimmersSummary();
          return;
        }
        if (!portalState.engagementClubSwimmersLoaded) {
          renderEngagementClubSelectedSwimmersPreview(selectedMount, selectedById);
          mount.innerHTML = '<p class="admin-engagements-empty">Ouvrez l\'onglet Nageurs pour charger la base du club.</p>';
          portalState.engagementClubSwimmersRenderedCompetitionId = portalState.selectedEngagementCompetitionId;
          portalActions.updateEngagementClubSwimmersSummary();
          return;
        }
        const renderedSwimmerIds = new Set(Array.from(canPreserveDraft ? portalContext.elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]") || [] : [])
          .map((input) => input.dataset.engagementClubSwimmerId || "")
          .filter(Boolean));
        const currentSelectedRows = canPreserveDraft ? portalActions.selectedEngagementClubSwimmerRows() : [];
        const currentSelectedIds = new Set(currentSelectedRows.map((swimmer) => swimmer.swimmerIndexId).filter(Boolean));
        const query = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsClubSwimmersSearch?.value || "");
        renderedSwimmerIds.forEach((id) => {
          if (!currentSelectedIds.has(id)) selectedById.delete(id);
        });
        currentSelectedRows.forEach((swimmer) => {
          selectedById.set(swimmer.swimmerIndexId, {
            ...(selectedById.get(swimmer.swimmerIndexId) || {}),
            swimmerIndexId: swimmer.swimmerIndexId,
            source: swimmer.source || "performances",
            licenseNumber: swimmer.licenseNumber,
            individualEntries: swimmer.individualEntries || (swimmer.individualEventCodes || []).map((eventCode) => ({ eventCode }))
          });
        });
        const selectedIds = new Set(selectedById.keys());
        const visibleAvailableLimit = query ? 50 : 800;
        const availableSexMatches = (swimmer) =>
          portalState.engagementClubAvailableSwimmersSexFilter === "all" ||
          String(swimmer.sex || "").trim().toUpperCase() === portalState.engagementClubAvailableSwimmersSexFilter;
        const compareAvailableSwimmers = portalState.engagementClubAvailableSwimmersSexFilter === "all"
          ? portalActions.compareEngagementSwimmersByName
          : portalActions.compareEngagementSwimmersBySexAndName;
        const swimmers = portalState.engagementClubSwimmers
          .filter((swimmer) => selectedIds.has(swimmer.id) || (availableSexMatches(swimmer) && (query
            ? portalActions.engagementClubSwimmerSearchText(swimmer).includes(query)
            : portalActions.engagementClubSwimmerIsActive(swimmer))))
          .sort((left, right) =>
            Number(selectedIds.has(right.id)) - Number(selectedIds.has(left.id)) ||
            compareAvailableSwimmers(left, right)
          )
          .slice(0, visibleAvailableLimit + selectedIds.size);
        const renderSwimmerRow = (swimmer, index) => {
          const selected = selectedById.get(swimmer.id);
          const licenseNumber = selected?.licenseNumber || swimmer.licenseNumber || "";
          const licenseLocked = Boolean(swimmer.licenseNumber || swimmer.licenseLocked);
          const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
          const category = portalActions.engagementSwimmerCategory({
            ...swimmer,
            ...(selected || {}),
            category: selected?.category || swimmer.category || "",
            birthDate: selected?.birthDate || swimmer.birthDate || ""
          }, portalState.selectedEngagementCompetition?.date || "");
          const detailsId = `adminEngagementsClubSwimmerDetails${String(swimmer.id || index).replace(/[^A-Za-z0-9_-]/g, "")}`;
          return `
        <div class="admin-engagements-club-swimmer-row" role="row" data-engagement-club-swimmer-row data-selected="${selected ? "true" : "false"}" data-expanded="false" data-sex="${portalActions.escapeHtml(swimmer.sex || "")}">
          <label role="cell">
            <input type="checkbox" data-engagement-club-swimmer-id="${portalActions.escapeHtml(swimmer.id)}" data-engagement-club-swimmer-source="${portalActions.escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-livepalmes-id="${portalActions.escapeHtml(swimmer.swimmerId || "")}" data-engagement-club-swimmer-name="${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-first-name="${portalActions.escapeHtml(swimmer.firstName || "")}" data-engagement-club-swimmer-last-name="${portalActions.escapeHtml(swimmer.lastName || "")}" data-engagement-club-swimmer-birth-date="${portalActions.escapeHtml(swimmer.birthDate || "")}" data-engagement-club-swimmer-sex="${portalActions.escapeHtml(swimmer.sex || "")}" data-engagement-club-swimmer-category="${portalActions.escapeHtml(category)}" ${selected ? "checked" : ""}>
            <strong>${portalActions.escapeHtml(name)}</strong>
          </label>
          <span class="admin-engagements-club-swimmer-mobile-meta" aria-hidden="true"><b>${portalActions.escapeHtml(swimmer.sex || "-")}</b><b>${portalActions.escapeHtml(category || "-")}</b></span>
          <button class="admin-engagements-club-swimmer-details-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-details-toggle data-engagement-club-swimmer-details-name="${portalActions.escapeHtml(name)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>
          <div id="${detailsId}" class="admin-engagements-club-swimmer-details">
            <span role="cell" data-label="Naissance">${portalActions.escapeHtml(swimmer.birthDate ? portalActions.formatShortDate(swimmer.birthDate) : "-")}</span>
            <span role="cell" data-label="Sexe">${portalActions.escapeHtml(swimmer.sex || "-")}</span>
            <span role="cell" data-label="Catégorie">${portalActions.escapeHtml(category || "-")}</span>
              <div class="admin-engagements-club-swimmer-license-cell" role="cell" data-label="Licence" aria-label="Numéro de licence">
              ${licenseLocked
                    ? `<span class="admin-engagements-club-swimmer-license-value" data-engagement-club-swimmer-license="${portalActions.escapeHtml(licenseNumber)}">${portalActions.escapeHtml(licenseNumber)}</span>`
                      : `<input type="text" maxlength="60" inputmode="text" autocapitalize="characters" autocomplete="off" pattern="[A-Za-z]-[0-9]{2}-[0-9]+" placeholder="A-12-34567" title="Une lettre, un tiret, deux chiffres, un tiret, puis des chiffres" aria-label="Numéro de licence, format A-12-34567" data-engagement-club-swimmer-license value="${portalActions.escapeHtml(licenseNumber)}" ${selected && portalConfig.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE ? "required" : ""}>`}
              ${portalActions.engagementSwimmerLicenseStatusIndicator(swimmer, selected || {})}
            </div>
          </div>
        </div>
      `;
        };
        const renderSwimmerSectionHead = (rows, label, { showCount = false, showSexFilter = false } = {}) => `
      <div class="admin-engagements-club-swimmers-section-head">
        <h5>${portalActions.escapeHtml(label)}${showCount ? ` <span>${rows.length}</span>` : ""}</h5>
        ${showSexFilter ? `<div class="admin-engagements-club-swimmers-sex-filter" role="group" aria-label="Filtrer les nageurs actifs par sexe">
          <button type="button" data-engagement-club-available-swimmer-sex-filter="all" aria-pressed="${portalState.engagementClubAvailableSwimmersSexFilter === "all"}">Tous</button>
          <button type="button" data-engagement-club-available-swimmer-sex-filter="F" aria-pressed="${portalState.engagementClubAvailableSwimmersSexFilter === "F"}">Femmes</button>
          <button type="button" data-engagement-club-available-swimmer-sex-filter="M" aria-pressed="${portalState.engagementClubAvailableSwimmersSexFilter === "M"}">Hommes</button>
        </div>` : ""}
      </div>`;
        const renderSwimmerTable = (rows, label, options = {}) => `
      <section class="admin-engagements-club-swimmers-section">
        ${options.hideSectionHead ? "" : renderSwimmerSectionHead(rows, label, options)}
        <div class="admin-engagements-club-swimmers-table" role="table" aria-label="${portalActions.escapeHtml(label)}">
          <div class="admin-engagements-club-swimmers-head" role="row">
            <span role="columnheader">Nageur</span>
            <span role="columnheader">Naissance</span>
            <span role="columnheader">Sexe</span>
            <span role="columnheader">Cat.</span>
            <span role="columnheader">Licence</span>
          </div>
          ${rows.map(renderSwimmerRow).join("")}
        </div>
      </section>
    `;
        const selectedSwimmers = [
          ...swimmers.filter((swimmer) => selectedIds.has(swimmer.id)),
          ...Array.from(selectedById.entries())
            .filter(([id]) => !swimmers.some((swimmer) => swimmer.id === id))
            .map(([id, swimmer]) => ({ ...swimmer, id, swimmerIndexId: id }))
        ].sort(portalActions.compareEngagementSwimmersBySexAndName);
        const availableMatches = portalState.engagementClubSwimmers
          .filter((swimmer) => !selectedIds.has(swimmer.id))
          .filter(availableSexMatches)
          .filter((swimmer) => !query || portalActions.engagementClubSwimmerSearchText(swimmer).includes(query));
        const activeAvailableMatches = availableMatches.filter(portalActions.engagementClubSwimmerIsActive);
        const inactiveAvailableMatches = availableMatches.filter((swimmer) => !portalActions.engagementClubSwimmerIsActive(swimmer));
        const availableSwimmers = (query ? availableMatches : activeAvailableMatches)
          .sort(compareAvailableSwimmers)
          .slice(0, visibleAvailableLimit);
        const inactiveAvailableSwimmers = !query && portalState.engagementClubInactiveSwimmersExpanded
          ? inactiveAvailableMatches.sort(compareAvailableSwimmers).slice(0, visibleAvailableLimit)
          : [];
        const hiddenAvailableCount = Math.max(0, (query ? availableMatches : activeAvailableMatches).length - availableSwimmers.length);
        const hiddenInactiveCount = Math.max(0, inactiveAvailableMatches.length - inactiveAvailableSwimmers.length);
        selectedMount.innerHTML = selectedSwimmers.length
          ? renderSwimmerTable(selectedSwimmers, "Nageurs engagés", { showCount: true })
          : "";
        const inactiveAccordion = !query && inactiveAvailableMatches.length
          ? `<section class="admin-engagements-club-swimmers-inactive">
          <button type="button" class="admin-engagements-club-inactive-toggle" data-engagement-club-inactive-swimmers-toggle aria-expanded="${portalState.engagementClubInactiveSwimmersExpanded}" aria-controls="adminEngagementsClubInactiveSwimmers">
            <strong>Nageurs inactifs</strong><span>${inactiveAvailableMatches.length}</span><i aria-hidden="true"></i>
          </button>
          <div id="adminEngagementsClubInactiveSwimmers" ${portalState.engagementClubInactiveSwimmersExpanded ? "" : "hidden"}>
            ${renderSwimmerTable(inactiveAvailableSwimmers, "Nageurs inactifs", { hideSectionHead: true })}
            ${hiddenInactiveCount ? '<p class="admin-engagements-empty">Affinez votre recherche pour afficher les autres nageurs inactifs.</p>' : ""}
          </div>
        </section>`
          : "";
        mount.innerHTML = availableSwimmers.length
          ? `${renderSwimmerTable(availableSwimmers, query ? "Résultats de recherche" : "Nageurs actifs", { showCount: !query, showSexFilter: true })}
          ${hiddenAvailableCount ? '<p class="admin-engagements-empty">Affinez votre recherche pour afficher les autres résultats.</p>' : ""}
          ${inactiveAccordion}`
          : `<section class="admin-engagements-club-swimmers-section admin-engagements-club-swimmers-section-empty">
          ${renderSwimmerSectionHead([], query ? "Résultats de recherche" : "Nageurs actifs", { showCount: !query, showSexFilter: true })}
          <p class="admin-engagements-empty">${query ? "Aucun nageur ne correspond à la recherche et au filtre." : "Aucun nageur actif ne correspond au filtre."}</p>
        </section>${inactiveAccordion}`;
        portalState.engagementClubSwimmersRenderedCompetitionId = portalState.selectedEngagementCompetitionId;
        portalActions.setEngagementClubFormControlsLocked(portalContext.elements.engagementsClubSwimmersForm, false);
        if(portalState.selectedEngagementCompetition?.napSource===true) {
          portalContext.elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-license]").forEach(control=>{control.disabled=true;control.required=false;});
        }
        portalActions.updateEngagementClubNewSwimmerControls();
        portalActions.updateEngagementClubSwimmersSummary();
      }

    function renderEngagementClubEntriesTable({ sex = "", label = "Nageurs", rows = [], swimmersById, sessions = [] } = {}) {
        if (!rows.length) return "";
        const visibleSessions = portalActions.engagementClubProgramSessionsForSex(sessions, sex);
        const identityColumnLabel = sex === "F" ? "Nageuse" : "Nageur";
        const swimmerLabel = sex === "F"
          ? `${rows.length} nageuse${rows.length > 1 ? "s" : ""}`
          : `${rows.length} nageur${rows.length > 1 ? "s" : ""}`;
        const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
        if (!visibleSessions.length) {
          return `
        <section class="admin-engagements-club-entry-group" data-entry-sex="${portalActions.escapeHtml(sex || "unknown")}">
          <div class="admin-engagements-club-entry-group-head"><h4>${portalActions.escapeHtml(label)}</h4><span>${portalActions.escapeHtml(swimmerLabel)}</span></div>
          <p class="admin-engagements-empty">Aucune course individuelle ouverte pour ce groupe.</p>
        </section>
      `;
        }
        const columns = visibleSessions.flatMap((session, sessionIndex) => (session.items || []).map((item, itemIndex) => ({
          ...item,
          session,
          sessionIndex,
          sessionStart: itemIndex === 0
        })));
        return `
      <section class="admin-engagements-club-entry-group" data-entry-sex="${portalActions.escapeHtml(sex || "unknown")}">
        <div class="admin-engagements-club-entry-group-head">
          <h4>${portalActions.escapeHtml(label)}</h4>
          <span>${portalActions.escapeHtml(swimmerLabel)}</span>
        </div>
        <p class="admin-engagements-club-entries-scroll-hint" data-engagement-club-entries-scroll-hint>↔ Faites glisser pour voir les autres courses</p>
        <div class="admin-engagements-club-entries-table-shell" data-engagement-club-entries-sex="${portalActions.escapeHtml(sex)}" tabindex="0" aria-label="Courses ${portalActions.escapeHtml(label.toLowerCase())}, faire défiler horizontalement si nécessaire">
          <table class="admin-engagements-club-entries-table" aria-label="Courses ${portalActions.escapeHtml(label.toLowerCase())}">
            <thead>
              <tr class="admin-engagements-club-entry-session-head">
                <th class="admin-engagements-club-entry-identity admin-engagements-club-entry-last-name" rowspan="2" scope="col">${identityColumnLabel}</th>
                <th class="admin-engagements-club-entry-identity" rowspan="2" scope="col">Naissance</th>
                <th class="admin-engagements-club-entry-identity" rowspan="2" scope="col">Cat.</th>
                ${visibleSessions.map((session, sessionIndex) => {
                      const meta = [portalActions.formatShortDate(session.date), session.startTime].filter(Boolean).join(" · ");
                      return `<th class="admin-engagements-club-entry-session${sessionIndex ? " is-session-start" : ""}" colspan="${session.items.length}" scope="colgroup"><span>${portalActions.escapeHtml(session.label || `Session ${sessionIndex + 1}`)}</span>${meta ? `<small>${portalActions.escapeHtml(meta)}</small>` : ""}</th>`;
                    }).join("")}
                <th class="admin-engagements-club-entry-action" rowspan="2" scope="col">${openWater ? "Courses" : "Temps"}</th>
              </tr>
              <tr class="admin-engagements-club-entry-course-head">
                ${columns.map((item) => {
                      const itemLabel = portalActions.engagementClubProgramItemLabel(item);
                      return `<th class="${item.sessionStart ? "is-session-start" : ""}" scope="col" title="${portalActions.escapeHtml(itemLabel.full)}"><span>${portalActions.escapeHtml(itemLabel.short)}</span><small>${portalActions.escapeHtml(itemLabel.gender)}</small></th>`;
                    }).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows.map((selected) => {
                    const swimmer = swimmersById.get(selected.swimmerIndexId) || selected;
                    const selectedCodes = portalActions.engagementClubSelectedIndividualEventCodes(selected);
                    const entryByCode = new Map((selected.individualEntries || []).map((entry) => [entry.eventCode, entry]).filter(([code]) => code));
                    const lastName = swimmer.lastName || selected.lastName || swimmer.name || "Nageur sans nom";
                    const firstName = swimmer.firstName || selected.firstName || "";
                    const category = portalActions.engagementSwimmerCategory({
                      ...swimmer,
                      ...selected,
                      category: selected.category || swimmer.category || "",
                      birthDate: selected.birthDate || swimmer.birthDate || ""
                    }, portalState.selectedEngagementCompetition?.date || "") || "-";
                    const selectedCount = selectedCodes.size;
                    const maxEvents = Number(portalState.selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
                    const countLabel = maxEvents > 0 ? `${selectedCount}/${maxEvents}` : String(selectedCount);
                    return `
                  <tr class="admin-engagements-club-entry-row" data-engagement-club-entry-row data-engagement-club-entry-swimmer-id="${portalActions.escapeHtml(selected.swimmerIndexId)}" data-sex="${portalActions.escapeHtml(swimmer.sex || "")}">
                    <th class="admin-engagements-club-entry-last-name admin-engagements-club-entry-swimmer" scope="row" title="${portalActions.escapeHtml(`${lastName} ${firstName}`.trim())}"><strong>${portalActions.escapeHtml(lastName)}</strong><span>${portalActions.escapeHtml(firstName || "-")}</span></th>
                    <td>${portalActions.escapeHtml(portalActions.formatShortDate(swimmer.birthDate || selected.birthDate) || "-")}</td>
                    <td>${portalActions.escapeHtml(category)}</td>
                    ${columns.map((item) => {
                          const allowed = portalActions.engagementClubProgramItemAllowsSwimmer(item, swimmer);
                          const checked = allowed && selectedCodes.has(item.eventCode);
                          const entry = entryByCode.get(item.eventCode) || {};
                          const manualValue = entry.entryTimeMode === "manual" ? (entry.manualEntryTime || entry.entryTime || "") : "";
                          const timeLabel = checked ? portalActions.engagementEntryTimeDisplayLabel(entry) : "";
                          const timeMode = checked ? (entry.entryTimeMode || "pending") : "";
                          const itemLabel = portalActions.engagementClubProgramItemLabel(item);
                          return `
                        <td class="admin-engagements-club-entry-course${item.sessionStart ? " is-session-start" : ""}${allowed ? "" : " is-unavailable"}">
                          ${allowed ? `
                            <label data-event-selected title="${portalActions.escapeHtml(itemLabel.full)} pour ${portalActions.escapeHtml(`${lastName} ${firstName}`.trim())}">
                              <input type="checkbox" data-engagement-club-swimmer-event="${portalActions.escapeHtml(item.eventCode)}" ${portalState.selectedEngagementCompetition?.qualifications?.enabled && !checked ? "disabled hidden" : ""} ${checked ? "checked" : ""} aria-label="${portalActions.escapeHtml(itemLabel.full)}">
                              ${openWater ? "" : `<small data-engagement-club-entry-cell-time data-entry-time-mode="${portalActions.escapeHtml(timeMode)}" ${checked ? "" : "hidden"} title="${portalActions.escapeHtml(portalActions.engagementEntryTimeHelpLabel(entry, portalActions.engagementManualIndividualTimesAllowed()))}">${portalActions.escapeHtml(timeLabel)}</small>`}
                            </label>
                            ${openWater ? "" : `<input type="hidden" data-engagement-club-swimmer-event-time="${portalActions.escapeHtml(item.eventCode)}" value="${portalActions.escapeHtml(manualValue)}" ${manualValue ? "" : "disabled"}>`}
                          ` : '<span aria-label="Course non ouverte pour ce nageur">—</span>'}
                        </td>
                      `;
                        }).join("")}
                    <td class="admin-engagements-club-entry-action">
                      ${openWater
                            ? `<span class="admin-engagements-club-entry-count" aria-label="${selectedCount} course${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}">${portalActions.escapeHtml(countLabel)}</span>`
                            : `<button class="ghost-button compact admin-engagements-club-times-open" type="button" data-engagement-club-times-open="${portalActions.escapeHtml(selected.swimmerIndexId)}" aria-label="Voir ou modifier les temps d'engagement, ${selectedCount} course${selectedCount > 1 ? "s" : ""}"><span>${portalActions.escapeHtml(countLabel)}</span><b aria-hidden="true">✎</b></button>`}
                      <button type="button" class="ghost-button compact admin-engagements-club-swimmer-remove" data-engagement-club-swimmer-remove="${portalActions.escapeHtml(selected.swimmerIndexId)}" aria-label="Retirer ${portalActions.escapeHtml(`${firstName} ${lastName}`.trim())} de cette compétition" title="Retirer de cette compétition" ${!portalActions.canUse("engagements.club.manage") || portalActions.engagementClubSwimmerSelectionLockReason() ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg></button>
                    </td>
                  </tr>
                `;
                  }).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
      }

    function initializeEngagementCourseScrollHints() {
        const mount = portalContext.elements.engagementsClubEntriesList;
        if (!mount) return;
        const competitionId = portalState.selectedEngagementCompetitionId;
        const dismissHints = () => {
          portalConfig.engagementCourseScrollHintSeen.add(competitionId);
          mount.querySelectorAll("[data-engagement-club-entries-scroll-hint]").forEach((hint) => { hint.hidden = true; });
        };
        mount.querySelectorAll(".admin-engagements-club-entries-table-shell").forEach((shell) => {
          const update = () => {
            const scrollable = shell.scrollWidth > shell.clientWidth + 2;
            shell.dataset.scrollable = scrollable ? "true" : "false";
            shell.dataset.atEnd = !scrollable || shell.scrollLeft + shell.clientWidth >= shell.scrollWidth - 2 ? "true" : "false";
            const hint = shell.previousElementSibling;
            if (hint?.matches?.("[data-engagement-club-entries-scroll-hint]")) {
              hint.hidden = !scrollable || portalConfig.engagementCourseScrollHintSeen.has(competitionId);
            }
          };
          update();
          shell.addEventListener("scroll", () => {
            update();
            if (Math.abs(shell.scrollLeft) > 6) dismissHints();
          }, { passive: true });
        });
      }

    function renderEngagementClubEntries() {
        if(teamEntrySection('entries'))return;
        const mount = portalContext.elements.engagementsClubEntriesList;
        if (!mount) return;
        mount.dataset.tone = portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded ? "loading" : "";
        portalState.engagementClubEntriesRenderedCompetitionId = portalState.selectedEngagementCompetitionId;
        const writeLockReason = portalActions.engagementClubIndividualEntriesLockReason();
        const locked = Boolean(writeLockReason || !portalActions.engagementClubTeamComplete());
        if (portalContext.elements.engagementsClubEntriesForm) portalContext.elements.engagementsClubEntriesForm.dataset.locked = locked ? "true" : "false";
        portalActions.syncEngagementClubEntriesSaveBar();
        if (locked) {
          mount.innerHTML = `<p class="admin-engagements-empty">${portalActions.escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
          portalActions.updateEngagementClubEntriesSummary();
          return;
        }
        if (portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded) {
          mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
          portalActions.updateEngagementClubEntriesSummary();
          return;
        }
        if (!portalState.engagementClubSwimmersLoaded) {
          mount.innerHTML = portalActions.engagementClubEmptySwimmersHtml("Choisissez les nageurs dans Participants pour commencer.");
          portalActions.updateEngagementClubEntriesSummary();
          return;
        }
        const selectedRows = currentEngagementClubSwimmersForSummary();
        if (!selectedRows.length) {
          mount.innerHTML = portalActions.engagementClubEmptySwimmersHtml();
          portalActions.updateEngagementClubEntriesSummary();
          return;
        }
        const swimmersById = new Map([
          ...portalState.engagementClubSwimmers.map((swimmer) => [swimmer.id, swimmer]),
          ...(portalState.selectedEngagementClubEntry?.swimmers || []).map((swimmer) => [swimmer.swimmerIndexId, swimmer])
        ].filter(([id]) => id));
        const sortedSelectedRows = [...selectedRows].sort((left, right) => {
          const leftSwimmer = swimmersById.get(left.swimmerIndexId) || left;
          const rightSwimmer = swimmersById.get(right.swimmerIndexId) || right;
          const leftLastName = leftSwimmer.lastName || left.lastName || leftSwimmer.name || left.name || "";
          const rightLastName = rightSwimmer.lastName || right.lastName || rightSwimmer.name || right.name || "";
          const lastNameDifference = String(leftLastName).localeCompare(String(rightLastName), "fr", { sensitivity: "base", numeric: true });
          if (lastNameDifference) return lastNameDifference;
          return String(leftSwimmer.firstName || left.firstName || "")
            .localeCompare(String(rightSwimmer.firstName || right.firstName || ""), "fr", { sensitivity: "base", numeric: true });
        });
        const sessions = portalActions.engagementClubProgramSessionsForEntries();
        if (!sessions.length) {
          mount.innerHTML = '<p class="admin-engagements-empty">Aucune course individuelle dans le programme.</p>';
          portalActions.updateEngagementClubEntriesSummary();
          return;
        }
        const sexFor = (selected) => {
          const swimmer = swimmersById.get(selected.swimmerIndexId) || selected;
          return String(swimmer.sex || selected.sex || "").toUpperCase();
        };
        const groups = [
          { sex: "F", label: "Femmes", rows: sortedSelectedRows.filter((selected) => sexFor(selected) === "F") },
          { sex: "M", label: "Hommes", rows: sortedSelectedRows.filter((selected) => sexFor(selected) === "M") },
          { sex: "", label: "Sexe à vérifier", rows: sortedSelectedRows.filter((selected) => !["F", "M"].includes(sexFor(selected))) }
        ];
        mount.innerHTML = groups
          .map((group) => renderEngagementClubEntriesTable({ ...group, swimmersById, sessions }))
          .join("");
        portalActions.renderQualificationExceptionToggle(mount);
        mount.querySelectorAll("[data-engagement-club-entry-row]").forEach((row) => portalActions.updateQualificationCheckboxes(row));
        portalActions.renderQualificationAlert(mount);
        global.requestAnimationFrame?.(initializeEngagementCourseScrollHints);
        if (portalState.selectedEngagementCompetition?.qualifications?.enabled) sortedSelectedRows.forEach((swimmer) => { void portalActions.ensureEngagementClubSwimmerEventTimes(swimmer); });
        portalActions.updateEngagementClubEntriesSummary();
      }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementClubTimesDialogSwimmer */
    function engagementClubTimesDialogSwimmer(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementClubTimesDialogSwimmer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementClubTimesDialogEventCodes */
    function engagementClubTimesDialogEventCodes(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementClubTimesDialogEventCodes", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementClubEntryTimeHistoryLabel */
    function engagementClubEntryTimeHistoryLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementClubEntryTimeHistoryLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#updateEngagementClubTimeDialogHelp */
    function updateEngagementClubTimeDialogHelp(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "updateEngagementClubTimeDialogHelp", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#populateEngagementClubEntryTimeHistory */
    function populateEngagementClubEntryTimeHistory(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "populateEngagementClubEntryTimeHistory", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#loadEngagementClubEntryTimeHistory */
    async function loadEngagementClubEntryTimeHistory(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-views", "loadEngagementClubEntryTimeHistory", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#renderEngagementClubTimesDialog */
    function renderEngagementClubTimesDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "renderEngagementClubTimesDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#openEngagementClubTimesDialog */
    async function openEngagementClubTimesDialog(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-views", "openEngagementClubTimesDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#closeEngagementClubTimesDialog */
    function closeEngagementClubTimesDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "closeEngagementClubTimesDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#applyEngagementClubTimesDialog */
    function applyEngagementClubTimesDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "applyEngagementClubTimesDialog", args, moduleActions);
    }

    function engagementClubRelayEvents() {
        return (portalState.selectedEngagementCompetition?.events || []).filter((event) => event.type === "relay");
      }

    function engagementClubRelaySessionLabel(eventCode = "", genderMode = "") {
        const events = Array.isArray(portalState.selectedEngagementCompetition?.events) ? portalState.selectedEngagementCompetition.events : [];
        const eventOptions = events.map((event) => ({ code: event.code, label: event.shortLabel || event.code }));
        const sessions = portalActions.normalizedEngagementProgramSessions(portalState.selectedEngagementCompetition?.programSessions || [], eventOptions);
        let matches = sessions.filter((session) => (session.items || []).some((item) =>
          item.eventCode === eventCode && item.phase !== "final" && (!genderMode || item.genderMode === genderMode)
        ));
        if (!matches.length && genderMode) {
          matches = sessions.filter((session) => (session.items || []).some((item) => item.eventCode === eventCode && item.phase !== "final"));
        }
        return matches.map((session) => [
          session.label,
          session.date ? portalActions.formatShortDate(session.date) : "",
          session.startTime || ""
        ].filter(Boolean).join(" · ")).join(" / ");
      }

    function engagementRelayCategoryOptions(event = {}) {
        const restrictions = Array.isArray(event.categoryRestrictions) ? event.categoryRestrictions : [];
        return portalConfig.ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS.filter(([code]) => !restrictions.length || restrictions.includes(code));
      }

    function engagementRelayGenderOptions(event = {}, category = "") {
        if (event.relayMixedRule === "required") return [["mixed", "Mixte"]];
        const base = [["female", "Femmes"], ["male", "Hommes"]];
        if (event.relayMixedRule === "mastersOnly" && event.relayMixedMode === "masters" && String(category || "").startsWith("R")) {
          return [...base, ["mixed", "Mixte"]];
        }
        return base;
      }

    function engagementClubRelaySwimmerOptions() {
        const byId = new Map();
        (portalState.selectedEngagementClubEntry?.swimmers || []).forEach((swimmer) => {
          if (swimmer.swimmerIndexId) byId.set(swimmer.swimmerIndexId, swimmer);
        });
        portalActions.selectedEngagementClubSwimmerRows().forEach((swimmer) => {
          if (swimmer.swimmerIndexId) byId.set(swimmer.swimmerIndexId, swimmer);
        });
        return Array.from(byId.values()).sort((left, right) =>
          String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr") ||
          String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr")
        );
      }

    function engagementRelayLegCount(event = {}) {
        return Math.max(1, Math.trunc(Number(event.relayLegs || 4) || 4));
      }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementRelayLegPlaceholder */
    function engagementRelayLegPlaceholder(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementRelayLegPlaceholder", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementRelayLegChoiceLabel */
    function engagementRelayLegChoiceLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementRelayLegChoiceLabel", args, moduleActions);
    }

    function engagementRelayPeopleWording(genderMode = "") {
        return genderMode === "female"
          ? { plural: "relayeuses", empty: "Relayeuses non renseignées" }
          : { plural: "relayeurs", empty: "Relayeurs non renseignés" };
      }

    function engagementRelayMemberShortLabel(swimmer = {}) {
        const lastName = String(swimmer.lastName || "").trim().toLocaleUpperCase("fr-FR");
        const firstName = String(swimmer.firstName || "").trim();
        if (lastName) return `${lastName}${firstName ? ` ${firstName.slice(0, 1).toLocaleUpperCase("fr-FR")}.` : ""}`;
        return String(swimmer.name || "").trim();
      }

    function engagementRelayMemberShortLabels(memberIds = []) {
        const swimmers = new Map(engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
        return memberIds
          .filter(Boolean)
          .map((memberId) => engagementRelayMemberShortLabel(swimmers.get(memberId) || {}))
          .filter(Boolean);
      }

    function engagementRelayMemberSummary(memberIds = []) {
        return engagementRelayMemberShortLabels(memberIds).join(" · ");
      }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementRelayExpectedMemberSex */
    function engagementRelayExpectedMemberSex(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementRelayExpectedMemberSex", args, moduleActions);
    }

    function engagementRelaySwimmerAllowedForCategory(swimmer = {}, relayCategory = "", competitionDate = "") {
        const category = portalActions.engagementSwimmerCategory(swimmer, competitionDate);
        if (!category) return false;
        if (String(relayCategory || "").startsWith("R")) return /^M\d/.test(category);
        if (relayCategory === "S") return true;
        const swimmerRank = portalConfig.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[category];
        const relayRank = portalConfig.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[relayCategory];
        return Number.isFinite(swimmerRank) && Number.isFinite(relayRank) && swimmerRank <= relayRank;
      }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementRelayMemberOptionLabel */
    function engagementRelayMemberOptionLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementRelayMemberOptionLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementRelaySameDistanceNature */
    function engagementRelaySameDistanceNature(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementRelaySameDistanceNature", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementRelayMemberAlreadyUsed */
    function engagementRelayMemberAlreadyUsed(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementRelayMemberAlreadyUsed", args, moduleActions);
    }

    function selectedEngagementClubRelayRowsFromDom() {
        return Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
          .map((row) => {
            const relayId = row.dataset.engagementClubRelayId || "";
            const existingRelay = portalState.engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
            if (row.dataset.engagementClubRelayReadonly === "true") {
              return {
                ...existingRelay,
                relayId,
                draftPending: false,
                persisted: true
              };
            }
            const eventCode = row.querySelector("[data-engagement-club-relay-event]")?.value || "";
            const category = row.querySelector("[data-engagement-club-relay-category]")?.value || "";
            const genderMode = row.querySelector("[data-engagement-club-relay-gender]")?.value || "";
            const manualEntryTime = row.querySelector("[data-engagement-club-relay-time]")?.value || "";
            const memberControls = Array.from(row.querySelectorAll("[data-engagement-club-relay-member]"));
            const memberIds = memberControls.length
              ? memberControls.map((select) => select.value || "")
              : Array.isArray(existingRelay.memberIds) ? existingRelay.memberIds : [];
            return {
              ...existingRelay,
              relayId,
              eventCode,
              category,
              genderMode,
              manualEntryTime,
              memberIds,
              draftNotice: row.dataset.engagementClubRelayNotice || "",
              draftPending: existingRelay.draftPending === true || row.dataset.engagementClubRelayPending === "true",
              persisted: existingRelay.persisted === true || row.dataset.engagementClubRelayPersisted === "true"
            };
          });
      }

    function selectedEngagementClubRelayRows() {
        const domRows = selectedEngagementClubRelayRowsFromDom();
        return domRows.length || portalContext.elements.engagementsClubRelaysList?.querySelector("[data-engagement-club-relay-row]")
          ? domRows
          : portalState.engagementClubRelaysDraft;
      }

    function engagementClubRelayNeedsCompletion(relay = {}) {
        const event = engagementClubRelayEvents().find((item) => item.code === relay.eventCode);
        if (!event || !relay.category || !relay.genderMode) return true;
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()) return true;
        const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : [];
        const selectedMemberCount = memberIds.filter(Boolean).length;
        return selectedMemberCount > 0 && selectedMemberCount !== engagementRelayLegCount(event);
      }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#reconcileEngagementClubRelayDraft */
    function reconcileEngagementClubRelayDraft(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "reconcileEngagementClubRelayDraft", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#focusEngagementClubRelayControl */
    function focusEngagementClubRelayControl(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "focusEngagementClubRelayControl", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#focusFirstIncompleteEngagementClubRelay */
    function focusFirstIncompleteEngagementClubRelay(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "focusFirstIncompleteEngagementClubRelay", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#selectedEngagementClubRelayRowsFromElement */
    function selectedEngagementClubRelayRowsFromElement(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "selectedEngagementClubRelayRowsFromElement", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementClubRelayDialogRelay */
    function engagementClubRelayDialogRelay(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementClubRelayDialogRelay", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#readEngagementClubRelayDialogDraft */
    function readEngagementClubRelayDialogDraft(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "readEngagementClubRelayDialogDraft", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#syncEngagementClubRelayDialogMemberOptions */
    function syncEngagementClubRelayDialogMemberOptions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "syncEngagementClubRelayDialogMemberOptions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#renderEngagementClubRelayDialog */
    function renderEngagementClubRelayDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "renderEngagementClubRelayDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#openEngagementClubRelayDialog */
    function openEngagementClubRelayDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "openEngagementClubRelayDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#closeEngagementClubRelayDialog */
    function closeEngagementClubRelayDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "closeEngagementClubRelayDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#applyEngagementClubRelayDialog */
    async function applyEngagementClubRelayDialog(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-views", "applyEngagementClubRelayDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#resetEngagementClubRelayDialogMembers */
    function resetEngagementClubRelayDialogMembers(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "resetEngagementClubRelayDialogMembers", args, moduleActions);
    }

    function engagementRelayMemberAge(swimmer = {}, competitionDate = "") {
        const birthYear = Number(String(swimmer.birthDate || "").slice(0, 4));
        if (!Number.isFinite(birthYear) || birthYear < 1900) return 0;
        return portalActions.engagementSeasonEndYearFromDate(competitionDate) - birthYear;
      }

    function engagementClubRelayValidationIssues(relays = selectedEngagementClubRelayRows()) {
        const issues = [];
        const relayEvents = new Map(engagementClubRelayEvents().map((event) => [event.code, event]));
        const swimmers = new Map(engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
        const seenRelays = new Set();
        const memberSlots = new Set();
        const competitionDate = portalState.selectedEngagementCompetition?.date || "";
        relays.forEach((relay, index) => {
          const rowLabel = `Relais ${index + 1}`;
          const event = relayEvents.get(relay.eventCode);
          if (!relay.eventCode) {
            issues.push(`${rowLabel} : choisissez une distance.`);
            return;
          }
          if (!event) {
            issues.push(`${rowLabel} : distance de relais non ouverte sur cette compétition.`);
            return;
          }
          if (!relay.category) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : choisissez une categorie.`);
          }
          if (!relay.genderMode) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : choisissez Femmes, Hommes ou Mixte.`);
          }
          if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : temps d'engagement obligatoire.`);
          }
          if (relay.category && relay.genderMode) {
            const duplicateKey = [relay.eventCode, relay.category, relay.genderMode].join("|");
            if (!event.multipleRelaysAllowed && seenRelays.has(duplicateKey)) {
          issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relais identique existe déjà pour ce club.`);
            }
            seenRelays.add(duplicateKey);
          }
          const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds.filter(Boolean) : [];
          const uniqueMemberIds = Array.from(new Set(memberIds));
          if (uniqueMemberIds.length !== memberIds.length) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relayeur est sélectionné plusieurs fois dans le même relais.`);
          }
          const expectedLegs = engagementRelayLegCount(event);
          if (memberIds.length > 0 && memberIds.length !== expectedLegs) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : indiquez ${expectedLegs} relayeurs ou laissez la composition vide.`);
          }
          if (!memberIds.length || memberIds.length !== expectedLegs) return;
          const members = memberIds.map((id) => swimmers.get(id)).filter(Boolean);
          if (members.length !== memberIds.length) {
              issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relayeur n'est plus dans les nageurs de la compétition.`);
            return;
          }
          if (relay.genderMode === "female" && members.some((member) => member.sex !== "F")) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relais Femmes ne peut contenir que des nageuses.`);
          }
          if (relay.genderMode === "male" && members.some((member) => member.sex !== "M")) {
            issues.push(`${rowLabel} ${event.shortLabel || event.code} : un relais Hommes ne peut contenir que des nageurs.`);
          }
          if (relay.genderMode === "mixed") {
            const invalidOrderIndex = members.findIndex((member, memberIndex) => member.sex !== (memberIndex % 2 === 0 ? "M" : "F"));
            if (invalidOrderIndex >= 0) {
              issues.push(`${rowLabel} ${event.shortLabel || event.code} : ordre mixte attendu Homme - Femme - Homme - Femme.`);
            }
          }
          if (String(relay.category || "").startsWith("R")) {
            const nonMaster = members.find((member) => !/^M\d/.test(portalActions.engagementSwimmerCategory(member, competitionDate)));
            if (nonMaster) {
              issues.push(`${rowLabel} ${event.shortLabel || event.code} : la categorie ${relay.category} est reservee aux Masters.`);
            }
            const minimumAge = Number(String(relay.category || "").replace(/\D/g, "")) || 0;
            const totalAge = members.reduce((sum, member) => sum + engagementRelayMemberAge(member, competitionDate), 0);
            if (minimumAge && totalAge < minimumAge) {
              issues.push(`${rowLabel} ${event.shortLabel || event.code} : total d'age ${totalAge}, minimum ${minimumAge}.`);
            }
          } else {
            const invalidMember = members.find((member) => !engagementRelaySwimmerAllowedForCategory(member, relay.category, competitionDate));
            if (invalidMember) {
              const name = invalidMember.name || [invalidMember.firstName, invalidMember.lastName].filter(Boolean).join(" ") || "un relayeur";
              issues.push(`${rowLabel} ${event.shortLabel || event.code} : ${name} n'est pas autorise en relais ${portalActions.engagementCategoryLabel(relay.category)}.`);
            }
          }
          members.forEach((member) => {
            const slotKey = [member.swimmerIndexId, event.distance, event.discipline].join("|");
            if (memberSlots.has(slotKey)) {
              const name = member.name || [member.firstName, member.lastName].filter(Boolean).join(" ") || "Un relayeur";
              issues.push(`${rowLabel} ${event.shortLabel || event.code} : ${name} est déjà dans un relais de même distance et même nature.`);
            }
            memberSlots.add(slotKey);
          });
        });
        return issues;
      }

    function updateEngagementClubRelaysSummary() {
        const rows = selectedEngagementClubRelayRows();
        const count = rows.length;
        const incompleteCount = rows.filter(engagementClubRelayNeedsCompletion).length;
        const pendingCount = rows.filter((relay) => relay.draftPending === true).length;
        const issues = engagementClubRelayValidationIssues(rows.filter((relay) => relay.draftPending !== true));
        if (portalContext.elements.engagementsClubRelaysSummary) {
          portalContext.elements.engagementsClubRelaysSummary.textContent = incompleteCount
            ? `${count} relais - ${incompleteCount} à compléter.`
            : pendingCount
              ? `${count} relais - ${pendingCount} à valider.`
              : issues.length
                ? `${count} relais - ${issues.length} point${issues.length > 1 ? "s" : ""} a corriger.`
                : count
                  ? `${count} relais.`
          : "Aucun relais sélectionné.";
        }
        renderEngagementClubSummary();
      }

    function currentEngagementClubSwimmersForSummary(entry = portalState.selectedEngagementClubEntry || {}) {
        const hasRenderedRows = portalContext.elements.engagementsClubSwimmersList?.querySelector("[data-engagement-club-swimmer-row]");
        if (hasRenderedRows) return portalActions.selectedEngagementClubSwimmerRows();
        return Array.isArray(entry.swimmers) ? entry.swimmers : [];
      }

    function currentEngagementClubOfficialCount(entry = portalState.selectedEngagementClubEntry || {}) {
        const hasRenderedRows = portalContext.elements.engagementsClubOfficialsForm?.querySelector("[data-engagement-club-official-id]");
        return hasRenderedRows
          ? portalActions.selectedEngagementClubOfficialIds().length
          : Array.isArray(entry.officials) ? entry.officials.length : 0;
      }

    function engagementClubSummaryTeamLeaderLabel(entry = portalState.selectedEngagementClubEntry || {}) {
        if (!portalActions.engagementClubTeamComplete(entry)) return "Non renseigne";
        const teamLeader = entry.teamLeader || {};
        if (teamLeader.mode === "renounced") return "Renonciation au droit de réclamation";
        const name = [teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ") || "Chef d'équipe";
        const details = [
          teamLeader.licenseNumber ? `licence ${teamLeader.licenseNumber}` : "",
          teamLeader.externalClub ? portalActions.clubDisplayLabel(teamLeader, { fallback: "club externe" }) : ""
        ].filter(Boolean).join(" - ");
        return details ? `${name} (${details})` : name;
      }

    function renderEngagementClubSummary(entry = portalState.selectedEngagementClubEntry || {}) {
        if (teamEntrySection("summary")) return;
        if (!portalContext.elements.engagementsClubSummaryList && !portalContext.elements.engagementsClubSummaryStatus) return;
        const competition = portalState.selectedEngagementCompetition || {};
        const fees = competition.fees || {};
        const noFees = fees.enabled === false;
        const nativeEntry = competition.napSource === true && entry.source === "nap";
        const swimmers = nativeEntry ? (entry.swimmers || []) : currentEngagementClubSwimmersForSummary(entry);
        const relays = nativeEntry ? (entry.relays || []) : selectedEngagementClubRelayRows().filter((relay) => !engagementClubRelayNeedsCompletion(relay));
        const officialsCount = currentEngagementClubOfficialCount(entry);
        const individualCount = swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0);
        const total = swimmers.length * portalActions.engagementFeeAmount(fees.swimmerFee) +
          individualCount * portalActions.engagementFeeAmount(fees.individualEventFee) +
          relays.length * portalActions.engagementFeeAmount(fees.relayFee);
        const helloAssoUrl = portalActions.engagementExternalHttpUrl(fees.helloAssoUrl);
        const whatsAppValue = portalActions.engagementTeamLeadersWhatsAppValue(competition);
        const rows = [
          ["Chef d'équipe", engagementClubSummaryTeamLeaderLabel(entry)],
          ...(whatsAppValue ? [["Groupe WhatsApp", whatsAppValue]] : []),
          ["Officiels", competition.officialsRequired === false && !officialsCount ? "Officiels non requis" : `${officialsCount} officiel${officialsCount > 1 ? "s" : ""}`, "metric"],
          ["Nageurs", `${swimmers.length} nageur${swimmers.length > 1 ? "s" : ""}`, "metric"],
          ["Courses individuelles", `${individualCount} course${individualCount > 1 ? "s" : ""}`, "metric"],
          ["Relais", `${relays.length} relais`, "metric"],
          ["Frais d'engagement", noFees ? "Aucun frais d'engagement" : portalActions.formatEngagementFee(total)],
          ...(!noFees ? [["Paiement", helloAssoUrl
            ? { href: helloAssoUrl, label: "Payer sur HelloAsso", kind: "payment" }
            : "Lien de paiement non renseigné"]] : [])
        ];
        if (portalContext.elements.engagementsClubSummaryStatus) {
          portalContext.elements.engagementsClubSummaryStatus.textContent = "";
          portalContext.elements.engagementsClubSummaryStatus.dataset.tone = "";
          portalContext.elements.engagementsClubSummaryStatus.hidden = true;
        }
        if (portalContext.elements.engagementsClubSummaryList) {
          portalContext.elements.engagementsClubSummaryList.innerHTML = rows.map(([label, value, kind]) => `
        <div${kind ? ` data-summary-kind="${kind}"` : ""}>
          <dt>${portalActions.escapeHtml(label)}</dt>
          <dd>${portalActions.engagementRowValueHtml(value)}</dd>
        </div>
      `).join("");
        }
        renderEngagementClubNativeSummary(nativeEntry ? entry : null);
        if (portalContext.elements.engagementsClubSummaryPdfButton) {
          const canGenerateRecap = Boolean(portalState.selectedEngagementCompetitionId && portalActions.engagementClubTeamComplete(entry) && portalActions.engagementClubEntryHasParticipants(entry));
          portalContext.elements.engagementsClubSummaryPdfButton.textContent = "Télécharger le PDF";
          portalContext.elements.engagementsClubSummaryPdfButton.disabled = !canGenerateRecap;
          portalContext.elements.engagementsClubSummaryPdfButton.title = canGenerateRecap
            ? "Télécharger le récapitulatif PDF"
            : "Ajoutez au moins un nageur, un officiel ou un relais pour générer le récapitulatif.";
        }
      }

    function renderEngagementClubNativeSummary(entry) {
        if(teamEntrySection('summary'))return;
        const mount = portalContext.elements.engagementsClubNativeSummary;
        if (!mount) return;
        mount.hidden = !entry;
        if (!entry) { mount.innerHTML = ""; return; }
        const personName = person => [person.lastName, person.firstName].filter(Boolean).join(" ");
        const savedTime = row => row.entryTime || row.nativeTime || "Temps non renseigné";
        const swimmers = Array.isArray(entry.swimmers) ? [...entry.swimmers].sort(portalActions.compareEngagementSwimmersBySexAndName) : [];
        const officials = Array.isArray(entry.officials) ? [...entry.officials].sort(portalActions.compareEngagementSwimmersByName) : [];
        const relays = Array.isArray(entry.relays) ? entry.relays : [];
        const eventLabel = code => {
          const event = portalActions.engagementEventDefinition(code) || {};
          const label = event.label || event.shortLabel || code || "Course non renseignée";
          return `<span class="admin-engagements-recap-event"><strong>${portalActions.escapeHtml(label)}</strong></span>`;
        };
        const emptySwimmers = swimmers.length ? "" : !portalActions.engagementClubSwimmerSelectionLockReason() && portalActions.engagementClubTeamComplete()
          ? portalActions.engagementClubEmptySwimmersHtml("Aucun nageur engagé. Aucune course enregistrée.")
          : '<p>Aucun nageur engagé. Aucune course enregistrée.</p>';
        mount.innerHTML = `
      <details class="admin-engagements-recap-section" open>
        <summary>Courses enregistrées <span>${swimmers.length} nageur${swimmers.length > 1 ? "s" : ""}</span></summary>
        ${swimmers.length ? swimmers.map(person => `<article class="admin-engagements-recap-person admin-engagements-recap-swimmer">
          <h5>${portalActions.escapeHtml(personName(person))}</h5>
          ${person.individualEntries?.length ? `<ul class="admin-engagements-recap-courses">${person.individualEntries.map(row => `<li>${eventLabel(row.eventCode)}<span class="admin-engagements-recap-time">${portalActions.escapeHtml(savedTime(row))}</span></li>`).join("")}</ul>` : '<p>Aucune course enregistrée.</p>'}
        </article>`).join("") : emptySwimmers}
      </details>
      <details class="admin-engagements-recap-section" open>
        <summary>Officiels engagés <span>${officials.length}</span></summary>
        ${officials.length ? `<ul class="admin-engagements-recap-courses admin-engagements-recap-officials">${officials.map(person => `<li><span class="admin-engagements-recap-event">${portalActions.escapeHtml(personName(person))}</span></li>`).join("")}</ul>` : `<p>${portalState.selectedEngagementCompetition?.officialsRequired === false ? "Officiels non requis." : "Aucun officiel engagé."}</p>`}
      </details>
      <details class="admin-engagements-recap-section" open>
        <summary>Relais enregistrés <span>${relays.length}</span></summary>
        ${relays.length ? relays.map(row => `<article class="admin-engagements-recap-person">
          <div class="admin-engagements-recap-relay-head">${eventLabel(row.eventCode)}<span class="admin-engagements-recap-time">${portalActions.escapeHtml(savedTime(row))}</span></div>
          ${row.members?.length ? `<ol class="admin-engagements-recap-members">${row.members.map(person => `<li>${portalActions.escapeHtml(personName(person))}</li>`).join("")}</ol>` : '<p>Composition non renseignée.</p>'}
        </article>`).join("") : '<p>Aucun relais enregistré.</p>'}
      </details>`;
      }

    function engagementClubPersistedRelayDraft(relay, native = false) {
        // Only a relay explicitly mapped by LivePalmes can reuse its displayed
        // native time in the edit form. Unmapped historical times stay untouched.
        const mappedNative = native && relay.category && !relay.category.startsWith("NAP-") && Number(relay.entryTimeValue) > 0;
        return { ...relay, manualEntryTime: relay.manualEntryTime || (mappedNative ? relay.entryTime : "") || "", persisted: true, draftPending: false, draftNotice: "" };
      }

    function renderEngagementClubRelays() {
        if(teamEntrySection('relays'))return;
        const mount = portalContext.elements.engagementsClubRelaysList;
        if (!mount) return;
        portalState.engagementClubRelaysRenderedCompetitionId = portalState.selectedEngagementCompetitionId;
        const writeLockReason = portalActions.engagementClubRelaysLockReason();
        const locked = Boolean(writeLockReason || !portalActions.engagementClubTeamComplete());
        const relayEvents = engagementClubRelayEvents();
        const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
        if (portalContext.elements.engagementsClubRelaysForm) portalContext.elements.engagementsClubRelaysForm.dataset.locked = locked ? "true" : "false";
        const pendingRelay = portalState.engagementClubRelaysDraft.some((relay) => relay.draftPending === true);
        if (portalContext.elements.engagementsClubRelaysAddButton) {
          portalContext.elements.engagementsClubRelaysAddButton.disabled = locked || !relayEvents.length || pendingRelay;
          portalContext.elements.engagementsClubRelaysAddButton.title = pendingRelay ? "Validez le relais en cours avant d'en ajouter un autre." : "";
        }
        if (locked) {
          mount.innerHTML = `<p class="admin-engagements-empty">${portalActions.escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
          updateEngagementClubRelaysSummary();
          return;
        }
        if (!relayEvents.length) {
          mount.innerHTML = '<p class="admin-engagements-empty">Aucun relais ouvert sur cette compétition.</p>';
          updateEngagementClubRelaysSummary();
          return;
        }
        const rows = portalState.engagementClubRelaysDraft;
        if (!rows.length) {
          mount.innerHTML = portalActions.selectedEngagementClubSwimmerRows().length
            ? '<p class="admin-engagements-empty">Aucun relais enregistré. Utilisez « Ajouter un relais » pour commencer.</p>'
            : portalActions.engagementClubEmptySwimmersHtml("Sélectionnez les nageurs dans Participants avant de composer un relais.");
          updateEngagementClubRelaysSummary();
          return;
        }
        mount.innerHTML = `
      <div class="admin-engagements-club-relays-table">
        ${rows.map((relay, index) => {
          const relayId = relay.relayId || `relay-${Date.now()}-${index}`;
          const event = relayEvents.find((candidate) => candidate.code === relay.eventCode) || {};
          const categories = engagementRelayCategoryOptions(event);
          const category = categories.some(([code]) => code === relay.category) ? relay.category : "";
          const genderOptions = engagementRelayGenderOptions(event, category);
          const genderMode = genderOptions.length === 1
            ? genderOptions[0][0]
            : genderOptions.some(([mode]) => mode === relay.genderMode) ? relay.genderMode : "";
          const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : (relay.members || []).map((member) => member.swimmerIndexId).filter(Boolean);
          const relayLegs = engagementRelayLegCount(event);
          const memberCount = memberIds.filter(Boolean).length;
          const memberLabels = engagementRelayMemberShortLabels(memberIds);
          const memberSummary = engagementRelayMemberSummary(memberIds);
          const peopleWording = engagementRelayPeopleWording(genderMode);
          const sessionLabel = event.code ? engagementClubRelaySessionLabel(event.code, genderMode) : "";
          const relayPending = relay.draftPending === true;
          const relayReadonly = relay.persisted === true && !relayPending;
          const categoryLabel = portalActions.engagementCategoryLabel(category) || category || "Non renseignée";
          const genderLabel = genderMode === "female" ? "Femmes" : genderMode === "male" ? "Hommes" : genderMode === "mixed" ? "Mixte" : "Non renseigné";
          const relayTimeRaw = relay.manualEntryTime || relay.entryTime || "";
          const relayTime = portalActions.formatEngagementEntryTimeInput(relayTimeRaw) || relayTimeRaw;
          if (relayReadonly) {
            return `
          <div class="admin-engagements-club-relay-row admin-engagements-club-relay-row-readonly" data-engagement-club-relay-row data-engagement-club-relay-id="${portalActions.escapeHtml(relayId)}" data-engagement-club-relay-readonly="true" data-engagement-club-relay-persisted="true" data-gender="${portalActions.escapeHtml(genderMode)}">
            <div class="admin-engagements-club-relay-event">
              <strong>${portalActions.escapeHtml(event.shortLabel || event.code || "Distance non renseignée")}</strong>
              ${sessionLabel ? `<small>${portalActions.escapeHtml(sessionLabel)}</small>` : ""}
            </div>
            <span class="admin-engagements-club-relay-read-value"><small>Catégorie</small><strong>${portalActions.escapeHtml(categoryLabel)}</strong></span>
            <span class="admin-engagements-club-relay-read-value"><small>Sexe</small><strong>${portalActions.escapeHtml(genderLabel)}</strong></span>
            ${openWater ? "" : `<span class="admin-engagements-club-relay-read-value"><small>Temps</small><strong>${portalActions.escapeHtml(relayTime || "-")}</strong></span>`}
            <div class="admin-engagements-club-relay-compose admin-engagements-club-relay-compose-readonly">
              <small>${portalActions.escapeHtml(peopleWording.plural.slice(0, 1).toLocaleUpperCase("fr-FR") + peopleWording.plural.slice(1))}</small>
              ${memberLabels.length
                    ? `<ul class="admin-engagements-club-relay-member-list">${memberLabels.map((label) => `<li>${portalActions.escapeHtml(label)}</li>`).join("")}</ul>`
                    : `<strong>${portalActions.escapeHtml(peopleWording.empty)}</strong>`}
            </div>
            <div class="admin-engagements-club-relay-row-actions">
              <button type="button" class="ghost-button compact admin-engagements-club-relay-edit" data-engagement-club-relay-edit aria-label="Modifier le relais" title="Modifier le relais">✎</button>
              <button type="button" class="ghost-button compact admin-engagements-club-relay-remove" data-engagement-club-relay-remove aria-label="Supprimer le relais" title="Supprimer le relais"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg></button>
            </div>
          </div>
        `;
          }
          return `
        <div class="admin-engagements-club-relay-row" data-engagement-club-relay-row data-engagement-club-relay-id="${portalActions.escapeHtml(relayId)}" data-engagement-club-relay-notice="${portalActions.escapeHtml(relay.draftNotice || "")}" data-engagement-club-relay-pending="${relayPending ? "true" : "false"}" data-engagement-club-relay-persisted="${relay.persisted === true ? "true" : "false"}" data-gender="${portalActions.escapeHtml(genderMode)}">
          <div class="admin-engagements-club-relay-event">
            <select data-engagement-club-relay-event aria-label="Distance" required>
              <option value="" ${event.code ? "" : "selected"} disabled>Choisir une distance</option>
              ${relayEvents.map((option) => `<option value="${portalActions.escapeHtml(option.code)}" ${option.code === event.code ? "selected" : ""}>${portalActions.escapeHtml(option.shortLabel || option.code)}</option>`).join("")}
            </select>
            ${sessionLabel ? `<small>${portalActions.escapeHtml(sessionLabel)}</small>` : ""}
          </div>
          <select data-engagement-club-relay-category aria-label="Categorie" required>
            <option value="" ${category ? "" : "selected"} disabled>Choisir une categorie</option>
            ${categories.map(([code, label]) => `<option value="${portalActions.escapeHtml(code)}" ${code === category ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("")}
          </select>
          <select data-engagement-club-relay-gender aria-label="Sexe" data-gender="${portalActions.escapeHtml(genderMode)}" required ${genderOptions.length === 1 ? "disabled data-relay-gender-locked=true" : ""}>
            <option value="" ${genderMode ? "" : "selected"} disabled>Choisir un sexe</option>
            ${genderOptions.map(([mode, label]) => `<option value="${portalActions.escapeHtml(mode)}" ${mode === genderMode ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("")}
          </select>
          ${openWater ? "" : `<input type="text" maxlength="8" inputmode="numeric" placeholder="00:00.00" data-engagement-club-relay-time value="${portalActions.escapeHtml(relayTime)}" aria-label="Temps d'engagement au format MM:SS.CC">`}
          <div class="admin-engagements-club-relay-compose">
            ${memberSummary ? `<small title="${portalActions.escapeHtml(memberSummary)}">${portalActions.escapeHtml(memberSummary)}${relayPending ? " · À valider" : ""}</small>` : ""}
            <button type="button" class="ghost-button compact" data-engagement-club-relay-compose="${portalActions.escapeHtml(relayId)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>${memberCount ? `Modifier les ${peopleWording.plural}` : `Choisir les ${peopleWording.plural}`}</span>
            </button>
          </div>
          ${relay.persisted === true
                ? '<button type="button" class="ghost-button compact admin-engagements-club-relay-cancel-edit" data-engagement-club-relay-cancel-edit aria-label="Annuler les modifications" title="Annuler les modifications">×</button>'
                : '<button type="button" class="ghost-button compact admin-engagements-club-relay-remove" data-engagement-club-relay-remove aria-label="Supprimer le relais" title="Supprimer le relais"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg></button>'}
          ${relay.draftNotice ? `<small class="admin-engagements-club-relay-draft-notice" role="status">${portalActions.escapeHtml(relay.draftNotice)}</small>` : ""}
        </div>
      `;
        }).join("")}
      </div>
    `;
        const issues = engagementClubRelayValidationIssues(rows.filter((relay) => relay.draftPending !== true));
        if (issues.length) {
          mount.insertAdjacentHTML("beforeend", `
        <div class="admin-engagements-club-relay-issues" role="status">
          <strong>Points à corriger avant enregistrement</strong>
          <ul>${issues.slice(0, 8).map((issue) => `<li>${portalActions.escapeHtml(issue)}</li>`).join("")}</ul>
          ${issues.length > 8 ? `<small>+ ${issues.length - 8} autre${issues.length - 8 > 1 ? "s" : ""} point${issues.length - 8 > 1 ? "s" : ""}.</small>` : ""}
        </div>
      `);
        }
        portalActions.setEngagementClubFormControlsLocked(portalContext.elements.engagementsClubRelaysForm, false);
        mount.querySelectorAll("[data-relay-gender-locked=true]").forEach((control) => { control.disabled = true; });
        updateEngagementClubRelaysSummary();
      }

    function updateEngagementClubTeamFormMode() {
        if (portalState.selectedEngagementCompetition?.nativeReadOnly === true && portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true) {
          const locked = portalState.engagementClubTeamSaving || Boolean(portalActions.engagementClubWriteLockReason({ ...portalState.selectedEngagementCompetition, nativeReadOnly: false }));
          const mode = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "";
          const declaring = mode === "person";
          const known = portalState.engagementClubPeople.find(person => person.id === portalContext.elements.engagementsClubTeamPersonSelect?.value);
          const manual = declaring && (portalContext.elements.engagementsClubTeamPersonFields?.dataset.manualEntry === "true" || Boolean(known && !known.birthDate));
          portalActions.setEngagementClubFormControlsLocked(portalContext.elements.engagementsClubTeamForm, locked);
          if (portalContext.elements.engagementsClubTeamPersonFields) { portalContext.elements.engagementsClubTeamPersonFields.hidden = false; portalContext.elements.engagementsClubTeamPersonFields.dataset.picker = "table"; }
          portalActions.setEngagementClubTeamManualFieldsVisible(manual);
          for (const field of [portalContext.elements.engagementsClubTeamFirstName, portalContext.elements.engagementsClubTeamLastName, portalContext.elements.engagementsClubTeamBirthDate]) {
            if (field) {
              field.disabled = locked || !declaring;
              field.required = declaring && (field !== portalContext.elements.engagementsClubTeamBirthDate || !portalState.selectedEngagementClubEntry?.teamLeader?.nativeLeaderId || portalState.selectedEngagementClubEntry?.teamLeader?.mode === "renounced");
              const label = field.closest("label"); if (label) label.hidden = !manual;
            }
          }
          for (const field of [portalContext.elements.engagementsClubTeamLicense, portalContext.elements.engagementsClubTeamSex, portalContext.elements.engagementsClubTeamExternal]) {
            if (field) { field.required = false; field.disabled = true; const label = field.closest("label"); if (label) label.hidden = true; }
          }
          if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.value = "";
          for (const control of [portalContext.elements.engagementsClubTeamPersonSearch, portalContext.elements.engagementsClubTeamPersonSelect]) {
            const label = control?.closest("label"); if (label) label.hidden = control === portalContext.elements.engagementsClubTeamPersonSelect;
          }
          if (portalContext.elements.engagementsClubTeamPersonResults) portalContext.elements.engagementsClubTeamPersonResults.hidden = false;
          if (portalContext.elements.engagementsClubTeamPersonCreate) portalContext.elements.engagementsClubTeamPersonCreate.hidden = false;
          if (portalContext.elements.engagementsClubTeamPeopleMore) portalContext.elements.engagementsClubTeamPeopleMore.hidden = !portalState.engagementClubPeopleHasMore;
          for (const control of [portalContext.elements.engagementsClubTeamRenunciationLabel, portalContext.elements.engagementsClubTeamExternalClubIdLabel, portalContext.elements.engagementsClubTeamExternalClubNameLabel]) if (control) control.hidden = true;
          if (portalContext.elements.engagementsClubTeamRenunciation) { portalContext.elements.engagementsClubTeamRenunciation.required = mode === "renounced"; portalContext.elements.engagementsClubTeamRenunciation.disabled = locked; }
          portalContext.elements.engagementsClubTeamChoices?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]').forEach(control => { const label = control.closest("label"); if (label) label.hidden = true; else control.hidden = true; });
          if (portalContext.elements.engagementsClubTeamExternalOpen) portalContext.elements.engagementsClubTeamExternalOpen.hidden = true;
          if (portalContext.elements.engagementsClubTeamRenunciationButton) { portalContext.elements.engagementsClubTeamRenunciationButton.hidden = false; portalContext.elements.engagementsClubTeamRenunciationButton.disabled = locked; }
          if (portalContext.elements.engagementsClubTeamSaveButton) {
            portalContext.elements.engagementsClubTeamSaveButton.hidden = !declaring || !manual;
            portalContext.elements.engagementsClubTeamSaveButton.disabled = locked;
            const validation = portalContext.elements.engagementsClubTeamSaveButton.closest(".admin-engagements-club-team-validation"); if (validation) validation.hidden = !declaring || !manual;
          }
          return;
        }
        const mode = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "";
        const declaringPerson = mode === "person";
        const renounced = mode === "renounced";
        const externalClub = portalContext.elements.engagementsClubTeamExternal?.checked === true;
        if (portalContext.elements.engagementsClubTeamPersonFields) portalContext.elements.engagementsClubTeamPersonFields.hidden = !declaringPerson;
        if (portalContext.elements.engagementsClubTeamRenunciationLabel) portalContext.elements.engagementsClubTeamRenunciationLabel.hidden = !renounced;
        const knownPerson = portalState.engagementClubPeople.find((person) => person.id === portalContext.elements.engagementsClubTeamPersonSelect?.value);
        const knownPersonReady = Boolean(knownPerson?.birthDate && knownPerson?.sex);
        const manualEntry = portalContext.elements.engagementsClubTeamPersonFields?.dataset.manualEntry === "true";
        const showManualFields = declaringPerson && (Boolean(knownPerson) ? !knownPersonReady : manualEntry);
        portalActions.setEngagementClubTeamManualFieldsVisible(showManualFields);
        const teamSearchLabel = portalContext.elements.engagementsClubTeamPersonSearch?.closest("label");
        if (teamSearchLabel) teamSearchLabel.hidden = !declaringPerson || externalClub;
        if (portalContext.elements.engagementsClubTeamPersonResults) portalContext.elements.engagementsClubTeamPersonResults.hidden = !declaringPerson || externalClub || !String(portalContext.elements.engagementsClubTeamPersonSearch?.value || "").trim();
        if (portalContext.elements.engagementsClubTeamPersonCreate) portalContext.elements.engagementsClubTeamPersonCreate.hidden = !declaringPerson || externalClub;
        if (portalContext.elements.engagementsClubTeamSaveButton) {
          portalContext.elements.engagementsClubTeamSaveButton.hidden = externalClub || !declaringPerson || (Boolean(knownPerson) && knownPersonReady) || (!knownPerson && !manualEntry);
          const validation = portalContext.elements.engagementsClubTeamSaveButton.closest(".admin-engagements-club-team-validation");
          if (validation) validation.hidden = portalContext.elements.engagementsClubTeamSaveButton.hidden;
        }
        [portalContext.elements.engagementsClubTeamFirstName, portalContext.elements.engagementsClubTeamLastName].forEach((field) => {
          if (field) field.required = showManualFields;
        });
        if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.required = showManualFields && !externalClub;
        if (portalContext.elements.engagementsClubTeamFirstNameLabel) portalContext.elements.engagementsClubTeamFirstNameLabel.hidden = !showManualFields || externalClub;
        if (portalContext.elements.engagementsClubTeamLastNameLabel) portalContext.elements.engagementsClubTeamLastNameLabel.hidden = !showManualFields || externalClub;
        if (portalContext.elements.engagementsClubTeamLicenseLabel) portalContext.elements.engagementsClubTeamLicenseLabel.hidden = !showManualFields || externalClub;
        if (portalContext.elements.engagementsClubTeamBirthDateLabel) portalContext.elements.engagementsClubTeamBirthDateLabel.hidden = !showManualFields || externalClub;
        if (portalContext.elements.engagementsClubTeamSexLabel) portalContext.elements.engagementsClubTeamSexLabel.hidden = !showManualFields || externalClub;
        if (portalContext.elements.engagementsClubTeamBirthDate) portalContext.elements.engagementsClubTeamBirthDate.required = showManualFields && !externalClub;
        if (portalContext.elements.engagementsClubTeamSex) portalContext.elements.engagementsClubTeamSex.required = showManualFields && !externalClub;
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.required = renounced;
        if (portalContext.elements.engagementsClubTeamExternalClubNameLabel) portalContext.elements.engagementsClubTeamExternalClubNameLabel.hidden = true;
        if (portalContext.elements.engagementsClubTeamExternalNote) portalContext.elements.engagementsClubTeamExternalNote.hidden = true;
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.required = showManualFields && externalClub;
      }

    function renderEngagementClubEntry(entry = portalState.selectedEngagementClubEntry || {}) {
        portalState.selectedEngagementClubEntry = entry || {};
        portalState.engagementClubTeamEditing = !portalActions.engagementClubTeamComplete(portalState.selectedEngagementClubEntry);
        portalActions.rememberEngagementClubPersistedEntry(portalState.selectedEngagementClubEntry);
        portalState.engagementClubSwimmersRenderedCompetitionId = "";
        portalState.engagementClubEntriesRenderedCompetitionId = "";
        portalState.engagementClubRelaysRenderedCompetitionId = "";
        const writeLockReason = portalActions.engagementClubWriteLockReason();
        portalState.engagementClubRelaysDraft = Array.isArray(portalState.selectedEngagementClubEntry.relays)
          ? portalState.selectedEngagementClubEntry.relays.map((relay) => engagementClubPersistedRelayDraft(relay, portalState.selectedEngagementClubEntry.napSource === true))
          : [];
        const teamLeader = portalState.selectedEngagementClubEntry.teamLeader || {};
        if (portalState.selectedEngagementCompetition?.nativeReadOnly === true) portalActions.setEngagementClubTeamManualFieldsVisible(false);
        if (portalContext.elements.engagementsClubTeamForm) {
          const mode = teamLeader.mode === "renounced"
            ? "renounced"
            : portalActions.engagementClubTeamComplete() && !teamLeader.externalClub ? "person" : "";
          portalContext.elements.engagementsClubTeamForm.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
            .forEach((radio) => { radio.checked = radio.value === mode; });
        }
        if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = teamLeader.firstName || "";
        if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = teamLeader.lastName || "";
        if (portalContext.elements.engagementsClubTeamBirthDate) portalContext.elements.engagementsClubTeamBirthDate.value = teamLeader.birthDate || "";
        if (portalContext.elements.engagementsClubTeamSex) portalContext.elements.engagementsClubTeamSex.value = teamLeader.sex || "";
        if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.value = teamLeader.licenseNumber || "";
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = teamLeader.externalClub === true;
        if (portalContext.elements.engagementsClubTeamExternalClubId) portalContext.elements.engagementsClubTeamExternalClubId.value = teamLeader.externalClub ? (teamLeader.clubId || "") : "";
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = teamLeader.externalClub ? (teamLeader.clubName || "") : "";
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = teamLeader.renunciationAccepted === true;
        if (portalContext.elements.engagementsClubTeamPersonSearch) portalContext.elements.engagementsClubTeamPersonSearch.value = "";
        portalActions.renderEngagementClubTeamPersonOptions(portalActions.findEngagementClubTeamPersonFromFields(teamLeader)?.id || "");
        updateEngagementClubTeamFormMode();
        portalActions.setEngagementClubCompetitionFormsLocked(Boolean(writeLockReason));
        portalActions.updateEngagementClubTeamLeaderActions(portalState.selectedEngagementClubEntry);

        if (portalContext.elements.engagementsClubTeamSummary) {
          portalContext.elements.engagementsClubTeamSummary.textContent = portalActions.engagementClubTeamComplete()
            ? teamLeader.mode === "renounced"
              ? "Aucun chef d’équipe déclaré — renonciation au droit de réclamation confirmée."
              : `${[teamLeader.firstName, teamLeader.lastName].filter(Boolean).join(" ")}${teamLeader.externalClub ? ` · ${teamLeader.clubName || "hors du club"}` : ""}`
            : "À renseigner avant de commencer les engagements.";
          portalContext.elements.engagementsClubTeamSummary.dataset.complete = portalActions.engagementClubTeamComplete() ? "true" : "false";
        }
        if (portalContext.elements.engagementsClubTeamMessage) {
          const teamLockReason = portalActions.engagementClubTeamLeaderLockReason();
          portalContext.elements.engagementsClubTeamMessage.textContent = teamLockReason || "";
          portalContext.elements.engagementsClubTeamMessage.dataset.tone = teamLockReason ? "error" : "ok";
        }
        document.querySelectorAll("[data-club-step]").forEach((step) => {
          const stepLockReason = portalActions.engagementClubStepLockReason(step.dataset.clubStep);
          const locked = Boolean(stepLockReason || !portalActions.engagementClubTeamComplete());
          step.dataset.locked = locked ? "true" : "false";
        });
        if (!portalActions.isEngagementAdminMode() && portalActions.isClubEngagementWorkflowTab(portalState.activeEngagementsDetailTab) && !portalActions.canOpenClubEngagementTab(portalState.activeEngagementsDetailTab)) {
          portalActions.setEngagementsDetailTab("team");
        } else {
          portalActions.setEngagementsDetailTab(portalState.activeEngagementsDetailTab);
        }
      }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementClosureAutomationStatusLabel */
    function engagementClosureAutomationStatusLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementClosureAutomationStatusLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-views.js#engagementClosureAutomationStatusTone */
    function engagementClosureAutomationStatusTone(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-views", "engagementClosureAutomationStatusTone", args, moduleActions);
    }

    const moduleActions = { renderEngagementClubSwimmersDirectory, setEngagementClubSwimmerActivityStatus, requestEngagementClubSwimmerDeletion, renderEngagementClubSelectedSwimmersPreview, renderEngagementClubSwimmers, renderEngagementClubEntriesTable, initializeEngagementCourseScrollHints, renderEngagementClubEntries, engagementClubTimesDialogSwimmer, engagementClubTimesDialogEventCodes, engagementClubEntryTimeHistoryLabel, updateEngagementClubTimeDialogHelp, populateEngagementClubEntryTimeHistory, loadEngagementClubEntryTimeHistory, renderEngagementClubTimesDialog, openEngagementClubTimesDialog, closeEngagementClubTimesDialog, applyEngagementClubTimesDialog, engagementClubRelayEvents, engagementClubRelaySessionLabel, engagementRelayCategoryOptions, engagementRelayGenderOptions, engagementClubRelaySwimmerOptions, engagementRelayLegCount, engagementRelayLegPlaceholder, engagementRelayLegChoiceLabel, engagementRelayPeopleWording, engagementRelayMemberShortLabel, engagementRelayMemberShortLabels, engagementRelayMemberSummary, engagementRelayExpectedMemberSex, engagementRelaySwimmerAllowedForCategory, engagementRelayMemberOptionLabel, engagementRelaySameDistanceNature, engagementRelayMemberAlreadyUsed, selectedEngagementClubRelayRowsFromDom, selectedEngagementClubRelayRows, engagementClubRelayNeedsCompletion, reconcileEngagementClubRelayDraft, focusEngagementClubRelayControl, focusFirstIncompleteEngagementClubRelay, selectedEngagementClubRelayRowsFromElement, engagementClubRelayDialogRelay, readEngagementClubRelayDialogDraft, syncEngagementClubRelayDialogMemberOptions, renderEngagementClubRelayDialog, openEngagementClubRelayDialog, closeEngagementClubRelayDialog, applyEngagementClubRelayDialog, resetEngagementClubRelayDialogMembers, engagementRelayMemberAge, engagementClubRelayValidationIssues, updateEngagementClubRelaysSummary, currentEngagementClubSwimmersForSummary, currentEngagementClubOfficialCount, engagementClubSummaryTeamLeaderLabel, renderEngagementClubSummary, renderEngagementClubNativeSummary, engagementClubPersistedRelayDraft, renderEngagementClubRelays, updateEngagementClubTeamFormMode, renderEngagementClubEntry, engagementClosureAutomationStatusLabel, engagementClosureAutomationStatusTone };
    return {
      renderEngagementClubSwimmersDirectory,
      setEngagementClubSwimmerActivityStatus,
      requestEngagementClubSwimmerDeletion,
      renderEngagementClubSelectedSwimmersPreview,
      renderEngagementClubSwimmers,
      renderEngagementClubEntriesTable,
      initializeEngagementCourseScrollHints,
      renderEngagementClubEntries,
      engagementClubTimesDialogSwimmer,
      engagementClubTimesDialogEventCodes,
      engagementClubEntryTimeHistoryLabel,
      updateEngagementClubTimeDialogHelp,
      populateEngagementClubEntryTimeHistory,
      loadEngagementClubEntryTimeHistory,
      renderEngagementClubTimesDialog,
      openEngagementClubTimesDialog,
      closeEngagementClubTimesDialog,
      applyEngagementClubTimesDialog,
      engagementClubRelayEvents,
      engagementClubRelaySessionLabel,
      engagementRelayCategoryOptions,
      engagementRelayGenderOptions,
      engagementClubRelaySwimmerOptions,
      engagementRelayLegCount,
      engagementRelayLegPlaceholder,
      engagementRelayLegChoiceLabel,
      engagementRelayPeopleWording,
      engagementRelayMemberShortLabel,
      engagementRelayMemberShortLabels,
      engagementRelayMemberSummary,
      engagementRelayExpectedMemberSex,
      engagementRelaySwimmerAllowedForCategory,
      engagementRelayMemberOptionLabel,
      engagementRelaySameDistanceNature,
      engagementRelayMemberAlreadyUsed,
      selectedEngagementClubRelayRowsFromDom,
      selectedEngagementClubRelayRows,
      engagementClubRelayNeedsCompletion,
      reconcileEngagementClubRelayDraft,
      focusEngagementClubRelayControl,
      focusFirstIncompleteEngagementClubRelay,
      selectedEngagementClubRelayRowsFromElement,
      engagementClubRelayDialogRelay,
      readEngagementClubRelayDialogDraft,
      syncEngagementClubRelayDialogMemberOptions,
      renderEngagementClubRelayDialog,
      openEngagementClubRelayDialog,
      closeEngagementClubRelayDialog,
      applyEngagementClubRelayDialog,
      resetEngagementClubRelayDialogMembers,
      engagementRelayMemberAge,
      engagementClubRelayValidationIssues,
      updateEngagementClubRelaysSummary,
      currentEngagementClubSwimmersForSummary,
      currentEngagementClubOfficialCount,
      engagementClubSummaryTeamLeaderLabel,
      renderEngagementClubSummary,
      renderEngagementClubNativeSummary,
      engagementClubPersistedRelayDraft,
      renderEngagementClubRelays,
      updateEngagementClubTeamFormMode,
      renderEngagementClubEntry,
      engagementClosureAutomationStatusLabel,
      engagementClosureAutomationStatusTone
    };
  }
  global.LivePalmesPortalClubEntryViews = { create };
})(window);
