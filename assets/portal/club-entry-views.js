(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function renderEngagementClubSwimmersDirectory() {
        const mount = portalContext.elements.engagementsClubSwimmersDirectoryList;
        if (!mount) return;
        portalContext.elements.engagementsClubSwimmersDirectorySexFilter?.querySelectorAll("[data-engagement-club-swimmer-sex-filter]").forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.engagementClubSwimmerSexFilter === portalState.engagementClubSwimmersDirectorySexFilter));
        });
        const clubLabel = portalActions.clubDisplayLabel(portalState.currentAccessProfile || {}, { fallback: "votre club" });
        if (portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded) {
          mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Lecture de la base nageurs pour ${clubLabel}...`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
          }
          return;
        }
        if (!portalState.engagementClubSwimmersLoaded) {
          mount.innerHTML = '<p class="admin-engagements-empty">Les nageurs seront chargés à l’ouverture de cette page.</p>';
          return;
        }
        const query = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsClubSwimmersDirectorySearch?.value || "");
        if (portalContext.elements.engagementsClubSwimmersDirectorySearchClear) {
          portalContext.elements.engagementsClubSwimmersDirectorySearchClear.hidden = !String(portalContext.elements.engagementsClubSwimmersDirectorySearch?.value || "").length;
        }
        const swimmers = portalState.engagementClubSwimmers
          .filter((swimmer) =>
            (!query || portalActions.engagementClubSwimmerSearchText(swimmer).includes(query)) &&
            (portalState.engagementClubSwimmersDirectorySexFilter === "all" || String(swimmer.sex || "").trim().toUpperCase() === portalState.engagementClubSwimmersDirectorySexFilter)
          )
          .sort((left, right) =>
            Number(portalActions.engagementClubSwimmerIsActive(right)) - Number(portalActions.engagementClubSwimmerIsActive(left)) ||
            String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr", { sensitivity: "base" }) ||
            String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr", { sensitivity: "base" })
          )
          .slice(0, 800);
        const activeCount = swimmers.filter(portalActions.engagementClubSwimmerIsActive).length;
        const inactiveCount = swimmers.length - activeCount;
        const hiddenCount = Math.max(0, portalState.engagementClubSwimmers.length - swimmers.length);
        if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = "";
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "neutral";
        }
        if (!swimmers.length) {
          mount.innerHTML = portalState.engagementClubSwimmers.length
            ? '<p class="admin-engagements-empty">Aucun nageur ne correspond aux filtres.</p>'
            : "<p class=\"admin-engagements-empty\">Aucun nageur trouvé dans l'effectif du club.</p>";
          return;
        }
        mount.innerHTML = `
      <div class="admin-engagements-club-swimmers-directory-table" role="table" aria-label="Mes nageurs">
        <div class="admin-engagements-club-swimmers-directory-row admin-engagements-club-swimmers-directory-head" role="row">
          <span role="columnheader">Nageur</span>
          <span role="columnheader">Naissance</span>
          <span role="columnheader">Sexe</span>
          <span role="columnheader">Cat.</span>
          <span role="columnheader">Licence</span>
          <span role="columnheader">Action</span>
        </div>
        ${swimmers.map((swimmer, index) => {
          const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
          const category = portalActions.engagementSwimmerCategory(swimmer);
          const sex = String(swimmer.sex || "").trim().toUpperCase();
          const sexLabel = sex === "F" ? "Femme" : (sex === "M" ? "Homme" : "Sexe non renseigné");
          const sexDisplay = sex === "M" ? "H" : (sex || "-");
          const detailsId = `adminEngagementsClubSwimmerDirectoryDetails${index}`;
          const publicProfileUrl = portalActions.engagementPublicSwimmerProfileUrl(swimmer, name);
          const changePending = swimmer.changeRequestStatus === "pending";
          const licenseStatusIndicator = portalActions.engagementSwimmerLicenseStatusIndicator(swimmer, swimmer);
          const profileButton = `
        <button class="admin-engagements-club-swimmers-directory-name-button" type="button" title="Voir la fiche publique de ${portalActions.escapeHtml(name)}" aria-label="Voir la fiche publique de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-public-profile="${portalActions.escapeHtml(publicProfileUrl)}" data-engagement-club-swimmer-public-name="${portalActions.escapeHtml(name)}">
          <strong>${portalActions.escapeHtml(name)}</strong>
          <svg class="admin-engagements-club-swimmers-directory-profile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-7 7"></path><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"></path></svg>
        </button>`;
          const correctionAction = changePending
            ? '<span class="admin-engagements-club-swimmers-directory-change-pending" aria-label="Correction en attente"><span class="admin-engagements-club-swimmers-directory-change-pending-long">Correction en attente</span><span class="admin-engagements-club-swimmers-directory-change-pending-short" aria-hidden="true">En attente</span></span>'
            : `<button class="admin-engagements-club-swimmers-directory-edit-button" type="button" title="Demander une correction pour ${portalActions.escapeHtml(name)}" aria-label="Demander une correction pour ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-change="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-change-source="${portalActions.escapeHtml(swimmer.source || "performances")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4"></path></svg></button>`;
          const duplicateAction = swimmer.napSource && !changePending
            ? `<button class="admin-engagements-club-swimmers-directory-edit-button" type="button" title="Signaler un doublon pour ${portalActions.escapeHtml(name)}" aria-label="Signaler un doublon pour ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-duplicate="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-change-source="${portalActions.escapeHtml(swimmer.source || "reference")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v11H9zM4 15V4h11"/></svg></button>` : "";
          const deletionAction = swimmer.source === "engagement"
            ? `<button class="admin-engagements-club-swimmers-directory-delete-button" type="button" title="Demander la suppression de ${portalActions.escapeHtml(name)}" aria-label="Demander la suppression de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-delete="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-delete-name="${portalActions.escapeHtml(name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"></path></svg></button>`
            : "";
          const isActive = portalActions.engagementClubSwimmerIsActive(swimmer);
          const nextActivityStatus = isActive ? "inactive" : "active";
          const activityAction = `<button class="admin-engagements-club-swimmers-directory-activity-button" type="button" title="Profil ${isActive ? "actif — cliquer pour rendre inactif" : "inactif — cliquer pour rendre actif"} : ${portalActions.escapeHtml(name)}" aria-label="Profil ${isActive ? "actif" : "inactif"} de ${portalActions.escapeHtml(name)}, ${isActive ? "rendre inactif" : "rendre actif"}" data-engagement-club-swimmer-activity="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-activity-source="${portalActions.escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-activity-status="${nextActivityStatus}" data-engagement-club-swimmer-activity-name="${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-activity-sex="${portalActions.escapeHtml(sex)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9"></path><path d="M6.7 5.7a8 8 0 1 0 10.6 0"></path></svg><span>${isActive ? "Actif" : "Inactif"}</span></button>`;
          const activitySeparator = index === 0 && activeCount
            ? `<div class="admin-engagements-club-swimmers-directory-activity-separator" role="row"><strong>Actifs</strong><span>${activeCount}</span></div>`
            : index === activeCount && inactiveCount
              ? `<button class="admin-engagements-club-swimmers-directory-activity-separator admin-engagements-club-inactive-toggle" type="button" role="row" data-engagement-club-directory-inactive-toggle aria-expanded="${portalState.engagementClubInactiveSwimmersDirectoryExpanded}"><strong>Nageurs inactifs</strong><span>${inactiveCount}</span><i aria-hidden="true"></i></button>`
              : "";
          return `
        ${activitySeparator}
        <div class="admin-engagements-club-swimmers-directory-row" role="row" data-sex="${portalActions.escapeHtml(sex)}" data-activity-status="${isActive ? "active" : "inactive"}" data-expanded="false" ${!isActive && !portalState.engagementClubInactiveSwimmersDirectoryExpanded ? "hidden" : ""}>
          <div class="admin-engagements-club-swimmers-directory-toggle">
            ${profileButton}
            <span class="admin-engagements-club-swimmers-directory-toggle-meta">
              <span class="admin-engagements-club-swimmers-directory-sex-category" aria-label="${portalActions.escapeHtml(sexLabel)}, catégorie ${portalActions.escapeHtml(category || "non renseignée")}"><span class="admin-engagements-club-swimmers-directory-sex">${portalActions.escapeHtml(sexDisplay)}</span><span aria-hidden="true">·</span><span class="admin-engagements-club-swimmers-directory-category">${portalActions.escapeHtml(category || "-")}</span></span>
              <span class="admin-engagements-club-swimmers-directory-mobile-actions">${activityAction}${correctionAction}${duplicateAction}${deletionAction}</span>
              <button class="admin-engagements-club-swimmers-directory-details-button" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-directory-toggle>
                <span class="admin-engagements-club-swimmers-directory-chevron" aria-hidden="true">›</span>
              </button>
            </span>
          </div>
          <div id="${detailsId}" class="admin-engagements-club-swimmers-directory-details">
            <span role="cell">${profileButton}</span>
            <span role="cell">${portalActions.escapeHtml(swimmer.birthDate ? portalActions.formatShortDate(swimmer.birthDate) : "-")}</span>
            <span role="cell">${portalActions.escapeHtml(swimmer.sex || "-")}</span>
            <span role="cell" title="${portalActions.escapeHtml(portalActions.engagementCategoryLabel(category) || "-")}">${portalActions.escapeHtml(category || "-")}</span>
            <span class="admin-engagements-club-swimmer-license-cell" role="cell">${swimmer.licenseNumber
                  ? `<span class="admin-engagements-club-swimmers-directory-license-content"><span class="admin-engagements-club-swimmer-license-value">${portalActions.escapeHtml(swimmer.licenseNumber)}</span>${licenseStatusIndicator}</span>`
                  : '<span class="admin-engagements-club-swimmers-directory-license-missing">Licence à renseigner</span>'}</span>
            <span role="cell" class="admin-engagements-club-swimmers-directory-actions">
              ${activityAction}${correctionAction}${duplicateAction}${deletionAction}
            </span>
          </div>
        </div>
      `;
        }).join("")}
      </div>
      ${hiddenCount ? `<p class="admin-engagements-empty">${hiddenCount} nageur${hiddenCount > 1 ? "s" : ""} masque${hiddenCount > 1 ? "s" : ""} par les filtres ou la limite d'affichage.</p>` : ""}
    `;
      }

    async function setEngagementClubSwimmerActivityStatus(swimmerId, source, status, swimmerName = "ce nageur", swimmerSex = "") {
        const cleanId = String(swimmerId || "").trim();
        const cleanStatus = status === "inactive" ? "inactive" : "active";
        if (!cleanId || !portalActions.canUse("engagements.club.manage")) return;
        const subject = String(swimmerSex || "").toUpperCase() === "F"
          ? "Elle"
          : String(swimmerSex || "").toUpperCase() === "M" ? "Il" : "Cette personne";
        if (cleanStatus === "inactive" && !global.confirm(`Rendre ${swimmerName} inactif ? ${subject} n'apparaîtra plus spontanément dans les sélections d'engagement.`)) return;
        if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Mise à jour du statut de ${swimmerName}...`;
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("setEngagementClubSwimmerActivityStatus", {
            swimmerIndexId: cleanId,
            source: source || "performances",
            expectedFingerprint: portalState.engagementClubSwimmers.find(item => String(item.swimmerIndexId || item.id) === cleanId)?.napActivityFingerprint,
            status: cleanStatus
          });
          const swimmerIndex = portalState.engagementClubSwimmers.findIndex((item) =>
            (item.source || "performances") === (source || "performances") &&
            (item.id === cleanId || item.swimmerIndexId === cleanId)
          );
          if (swimmerIndex >= 0) {
            portalState.engagementClubSwimmers[swimmerIndex] = {
              ...portalState.engagementClubSwimmers[swimmerIndex],
              ...(result.swimmer || {}),
              clubActivityStatus: cleanStatus
            };
            portalActions.writeEngagementClubSwimmersCache();
          }
          renderEngagementClubSwimmersDirectory();
          renderEngagementClubSwimmers();
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `${swimmerName} est maintenant ${cleanStatus === "active" ? "actif" : "inactif"}.`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Mise à jour impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
          }
        }
      }

    async function requestEngagementClubSwimmerDeletion(swimmerId, swimmerName = "ce nageur") {
        const cleanId = String(swimmerId || "").trim();
        if (!cleanId || !portalActions.canUse("engagements.club.manage")) return;
        if (!global.confirm(`Demander la suppression de ${swimmerName} ? La fiche sera supprimée immédiatement si elle n'est utilisée nulle part. Sinon, elle sera désactivée et transmise au niveau national.`)) return;
        if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = "Vérification des performances et engagements...";
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("requestEngagementClubSwimmerDeletion", { swimmerId: cleanId });
          portalActions.invalidateEngagementClubSwimmersCache();
          await portalActions.loadEngagementClubSwimmers({ force: true, silent: true });
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = result.deleted
              ? `${swimmerName} a été supprimé définitivement : aucune performance ni inscription ne le référençait.`
              : `${swimmerName} a été désactivé. Une demande avec le détail des utilisations a été transmise au niveau national.`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
          }
        }
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

    function engagementClubTimesDialogSwimmer() {
        if (!portalState.engagementClubTimesDialogSwimmerId) return null;
        return portalActions.selectedEngagementClubSwimmerRows()
          .find((swimmer) => swimmer.swimmerIndexId === portalState.engagementClubTimesDialogSwimmerId) || null;
      }

    function engagementClubTimesDialogEventCodes(swimmer = {}) {
        const selectedCodes = portalActions.engagementClubSelectedIndividualEventCodes(swimmer);
        const orderedCodes = portalActions.engagementClubProgramSessionsForEntries()
          .flatMap((session) => session.items || [])
          .map((item) => item.eventCode)
          .filter((code, index, codes) => selectedCodes.has(code) && codes.indexOf(code) === index);
        selectedCodes.forEach((code) => {
          if (!orderedCodes.includes(code)) orderedCodes.push(code);
        });
        return orderedCodes;
      }

    function engagementClubEntryTimeHistoryLabel(item = {}) {
        return portalActions.formatEngagementEntryTimeInput(item.entryTime) || item.entryTime || "Temps inconnu";
      }

    function updateEngagementClubTimeDialogHelp(select) {
        const row = select?.closest("[data-engagement-club-time-dialog-row]");
        const help = row?.querySelector("[data-engagement-club-time-dialog-help]");
        const option = select?.selectedOptions?.[0];
        if (!help || !option) return;
        const mode = option.dataset.entryTimeMode || select.dataset.entryTimeMode || "";
        help.textContent = mode === "manual"
          ? "Temps saisi manuellement"
          : mode === "default595999"
          ? "Aucun temps connu"
          : [option.dataset.historyDate || "", option.dataset.historyLocation || ""].filter(Boolean).join(" · ");
      }

    function populateEngagementClubEntryTimeHistory(swimmer = {}) {
        const cacheKey = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        const historyByEvent = portalConfig.engagementClubEntryTimeHistoryCache.get(cacheKey);
        if (!historyByEvent || portalState.engagementClubTimesDialogSwimmerId !== swimmer.swimmerIndexId) return;
        Array.from(portalContext.elements.engagementsClubTimesDialogList?.querySelectorAll("[data-engagement-club-time-history-select]") || [])
          .forEach((select) => {
            const eventCode = select.dataset.engagementClubTimeHistorySelect || "";
            const originalTime = select.dataset.originalTime || "";
            const selectedTime = select.value;
            const seen = new Set([originalTime]);
            select.querySelectorAll("option[data-history-option]").forEach((option) => option.remove());
            (historyByEvent.get(eventCode) || []).forEach((item) => {
              const value = portalActions.formatEngagementEntryTimeInput(item.entryTime) || item.entryTime || "";
              if (!value || seen.has(value)) return;
              seen.add(value);
              const option = document.createElement("option");
              option.value = value;
              option.textContent = engagementClubEntryTimeHistoryLabel(item);
              option.dataset.historyOption = "true";
              option.dataset.entryTimeMode = "known";
              option.dataset.historyDate = item.date ? portalActions.formatShortDate(item.date) : "";
              option.dataset.historyLocation = item.location || "";
              select.append(option);
            });
            select.value = Array.from(select.options).some((option) => option.value === selectedTime)
              ? selectedTime
              : originalTime;
            const hasAlternatives = select.querySelectorAll("option[data-history-option]").length > 0;
            select.disabled = !hasAlternatives;
            select.dataset.hasAlternatives = hasAlternatives ? "true" : "false";
            updateEngagementClubTimeDialogHelp(select);
          });
      }

    async function loadEngagementClubEntryTimeHistory(swimmer = {}) {
        const eventCodes = engagementClubTimesDialogEventCodes(swimmer);
        const cacheKey = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        if (!cacheKey || !eventCodes.length || !portalActions.engagementKnownIndividualTimesSelectable()) return;
        if (portalConfig.engagementClubEntryTimeHistoryCache.has(cacheKey)) {
          populateEngagementClubEntryTimeHistory(swimmer);
          return;
        }
        if (portalConfig.engagementClubEntryTimeHistoryRequests.has(cacheKey)) {
          await portalConfig.engagementClubEntryTimeHistoryRequests.get(cacheKey);
          populateEngagementClubEntryTimeHistory(swimmer);
          return;
        }
        const request = (async () => {
          if (portalConfig.engagementClubSelectionChanges.size) await portalActions.flushEngagementClubSwimmerSelections();
          if (portalState.engagementClubEntriesAutosaveTimer) await portalActions.flushEngagementClubIndividualEntriesAutosave();
          await portalState.engagementClubEntryMutationQueue;
          const result = await portalActions.callFunction("getEngagementClubEntryTimeHistory", {
            competitionId: portalState.selectedEngagementCompetitionId,
            swimmerIndexId: swimmer.swimmerIndexId,
            eventCodes
          });
          portalConfig.engagementClubEntryTimeHistoryCache.set(cacheKey, new Map(
            (Array.isArray(result.events) ? result.events : []).map((event) => [event.eventCode, event.times || []])
          ));
        })();
        portalConfig.engagementClubEntryTimeHistoryRequests.set(cacheKey, request);
        if (portalContext.elements.engagementsClubTimesDialogMessage && portalState.engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
          portalContext.elements.engagementsClubTimesDialogMessage.textContent = "Chargement des autres temps connus...";
          portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "loading";
        }
        try {
          await request;
          populateEngagementClubEntryTimeHistory(swimmer);
          if (portalContext.elements.engagementsClubTimesDialogMessage && portalState.engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
            portalContext.elements.engagementsClubTimesDialogMessage.textContent = "";
            portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubTimesDialogMessage && portalState.engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
            portalContext.elements.engagementsClubTimesDialogMessage.textContent = `Historique indisponible : ${error?.message || error}`;
            portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
          }
        } finally {
          portalConfig.engagementClubEntryTimeHistoryRequests.delete(cacheKey);
        }
      }

    function renderEngagementClubTimesDialog() {
        const swimmer = engagementClubTimesDialogSwimmer();
        const mount = portalContext.elements.engagementsClubTimesDialogList;
        if (!swimmer || !mount) return;
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur");
        const meta = [
          swimmer.birthDate ? `né(e) le ${portalActions.formatShortDate(swimmer.birthDate)}` : "",
          swimmer.category ? `catégorie ${swimmer.category}` : "",
          swimmer.licenseNumber ? `licence ${swimmer.licenseNumber}` : ""
        ].filter(Boolean).join(" · ");
        if (portalContext.elements.engagementsClubTimesDialogTitle) portalContext.elements.engagementsClubTimesDialogTitle.textContent = name;
        if (portalContext.elements.engagementsClubTimesDialogMeta) portalContext.elements.engagementsClubTimesDialogMeta.textContent = meta;
        if (portalContext.elements.engagementsClubTimesDialogApply) portalContext.elements.engagementsClubTimesDialogApply.disabled = portalState.engagementClubTimesDialogLoading;
        if (portalContext.elements.engagementsClubTimesDialogMessage) {
          portalContext.elements.engagementsClubTimesDialogMessage.textContent = portalState.engagementClubTimesDialogLoading ? "Recherche des temps d'engagement..." : "";
          portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = portalState.engagementClubTimesDialogLoading ? "loading" : "";
        }
        const eventCodes = engagementClubTimesDialogEventCodes(swimmer);
        if (!eventCodes.length) {
          mount.innerHTML = '<p class="admin-engagements-empty">Aucune course cochée pour ce nageur.</p>';
          return;
        }
        const entryByCode = new Map((swimmer.individualEntries || []).map((entry) => [entry.eventCode, entry]));
        const cacheKey = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        const previewByCode = new Map((portalConfig.engagementClubSwimmerEventTimesCache.get(cacheKey) || []).map((entry) => [entry.eventCode, entry]));
        const manualAllowed = portalActions.engagementManualIndividualTimesAllowed();
        const knownSelectable = portalActions.engagementKnownIndividualTimesSelectable();
        mount.innerHTML = eventCodes.map((eventCode) => {
          const event = portalActions.engagementEventDefinition(eventCode) || { code: eventCode, shortLabel: eventCode, label: eventCode };
          const entry = entryByCode.get(eventCode) || {};
          const preview = previewByCode.get(eventCode) || (entry.entryTimeMode !== "manual" ? entry : {});
          const manualEditing = manualAllowed && entry.entryTimeMode === "manual" && Boolean(entry.manualEntryTime || entry.entryTime);
          const manualValueRaw = manualEditing ? (entry.manualEntryTime || entry.entryTime || "") : "";
          const manualValue = portalActions.formatEngagementEntryTimeInput(manualValueRaw) || manualValueRaw;
          const automaticValueRaw = preview.entryTime || "59:59.99";
          const automaticValue = portalActions.formatEngagementEntryTimeInput(automaticValueRaw) || automaticValueRaw;
          const displayedEntry = manualEditing ? entry : preview;
          const displayLabel = portalActions.engagementEntryTimeDisplayLabel(displayedEntry);
          const help = portalActions.engagementEntryTimeHelpLabel(displayedEntry, manualAllowed);
          const automaticLabel = portalActions.engagementEntryTimeDisplayLabel(preview);
          return `
        <div class="admin-engagements-club-time-dialog-row" data-engagement-club-time-dialog-row="${portalActions.escapeHtml(eventCode)}">
          <div class="admin-engagements-club-time-dialog-course">
            <strong>${portalActions.escapeHtml(event.shortLabel || eventCode)}</strong>
            <small>${portalActions.escapeHtml(event.label || eventCode)}</small>
          </div>
          <div class="admin-engagements-club-time-dialog-value">
            ${knownSelectable ? `
              <select class="admin-engagements-club-time-history-select" data-engagement-club-time-history-select="${portalActions.escapeHtml(eventCode)}" data-original-time="${portalActions.escapeHtml(displayLabel)}" data-entry-time-mode="${portalActions.escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-has-alternatives="false" aria-label="Temps d'engagement ${portalActions.escapeHtml(event.shortLabel || eventCode)}" disabled>
                <option value="${portalActions.escapeHtml(displayLabel)}" data-entry-time-mode="${portalActions.escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-history-date="${portalActions.escapeHtml(displayedEntry.date ? portalActions.formatShortDate(displayedEntry.date) : "")}" data-history-location="${portalActions.escapeHtml(displayedEntry.location || "")}">${portalActions.escapeHtml(displayLabel)}</option>
              </select>
            ` : `
              <span data-engagement-club-time-dialog-display data-entry-time-mode="${portalActions.escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-automatic-label="${portalActions.escapeHtml(automaticLabel)}">${portalActions.escapeHtml(displayLabel)}</span>
            `}
            ${manualAllowed ? `
              <button class="ghost-button compact" type="button" data-engagement-club-time-toggle data-automatic-time="${portalActions.escapeHtml(automaticValue)}">${manualEditing ? "Rétablir auto" : "Saisie libre"}</button>
              <input type="text" maxlength="8" inputmode="numeric" placeholder="00:00.00" aria-label="Temps manuel ${portalActions.escapeHtml(event.shortLabel || eventCode)}" data-engagement-club-time-dialog-input value="${portalActions.escapeHtml(manualValue)}" ${manualEditing ? "" : "hidden disabled"}>
            ` : knownSelectable ? '<input type="text" data-engagement-club-time-dialog-input hidden disabled>' : ""}
          </div>
          <small class="admin-engagements-club-time-dialog-help" data-engagement-club-time-dialog-help>${portalActions.escapeHtml(help)}</small>
        </div>
      `;
        }).join("");
      }

    async function openEngagementClubTimesDialog(swimmerIndexId = "", opener = null) {
        const row = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
          .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
        if (!row) return;
        portalState.engagementClubTimesDialogSwimmerId = swimmerIndexId;
        portalState.engagementClubTimesDialogOpener = opener;
        const swimmer = engagementClubTimesDialogSwimmer();
        portalState.engagementClubTimesDialogLoading = Boolean(swimmer && (swimmer.individualEntries || [])
          .some((entry) => !entry.entryTimeMode || entry.entryTimeMode === "pending"));
        if (portalContext.elements.engagementsClubTimesDialog && !portalContext.elements.engagementsClubTimesDialog.open) {
          portalContext.elements.engagementsClubTimesDialog.showModal();
        }
        renderEngagementClubTimesDialog();
        if (!swimmer) return;
        if (portalState.engagementClubTimesDialogLoading) {
          if (portalState.engagementClubEntriesAutosaveTimer) await portalActions.flushEngagementClubIndividualEntriesAutosave();
          else await portalState.engagementClubEntryMutationQueue;
          if (portalState.engagementClubTimesDialogSwimmerId !== swimmerIndexId) return;
          const refreshedSwimmer = engagementClubTimesDialogSwimmer() || swimmer;
          const stillPending = (refreshedSwimmer.individualEntries || [])
            .some((entry) => !entry.entryTimeMode || entry.entryTimeMode === "pending");
          if (stillPending) await portalActions.ensureEngagementClubSwimmerEventTimes(refreshedSwimmer);
          if (portalState.engagementClubTimesDialogSwimmerId !== swimmerIndexId) return;
          portalState.engagementClubTimesDialogLoading = false;
          renderEngagementClubTimesDialog();
        }
        void loadEngagementClubEntryTimeHistory(engagementClubTimesDialogSwimmer() || swimmer);
      }

    function closeEngagementClubTimesDialog(restoreFocus = true) {
        if (portalContext.elements.engagementsClubTimesDialog?.open) portalContext.elements.engagementsClubTimesDialog.close();
        const opener = portalState.engagementClubTimesDialogOpener;
        portalState.engagementClubTimesDialogSwimmerId = "";
        portalState.engagementClubTimesDialogLoading = false;
        portalState.engagementClubTimesDialogOpener = null;
        if (restoreFocus) opener?.focus?.();
      }

    function applyEngagementClubTimesDialog() {
        const swimmer = engagementClubTimesDialogSwimmer();
        if (!swimmer) return;
        const overrides = new Map();
        const dialogRows = Array.from(portalContext.elements.engagementsClubTimesDialogList?.querySelectorAll("[data-engagement-club-time-dialog-row]") || []);
        for (const dialogRow of dialogRows) {
          const eventCode = dialogRow.dataset.engagementClubTimeDialogRow || "";
          const input = dialogRow.querySelector("[data-engagement-club-time-dialog-input]");
          const historySelect = dialogRow.querySelector("[data-engagement-club-time-history-select]");
          if (!input) continue;
          const historyValue = String(historySelect?.value || "").trim();
          const historyChanged = Boolean(historySelect && historyValue && historyValue !== historySelect.dataset.originalTime);
          const manual = historyChanged || !input.disabled;
          const savedEntry=(swimmer.individualEntries || []).find(entry=>entry.eventCode===eventCode);
          if(portalState.selectedEngagementCompetition?.napSource===true && savedEntry?.entryTimeMode==="native" && !manual && dialogRow.dataset.nativeAutoRequested!=="true") continue;
          const validTime = !manual || (historyChanged
            ? Boolean(portalActions.formatEngagementEntryTimeInput(historyValue))
            : portalActions.normalizeEngagementEntryTimeInput(input));
          const value = historyChanged ? historyValue : manual ? String(input.value || "").trim() : "";
          if (manual && !value) {
            if (portalContext.elements.engagementsClubTimesDialogMessage) {
              portalContext.elements.engagementsClubTimesDialogMessage.textContent = "Renseignez le temps modifié ou rétablissez le temps automatique.";
              portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
            }
            input.focus?.();
            return;
          }
          if (!validTime) {
            if (portalContext.elements.engagementsClubTimesDialogMessage) {
              portalContext.elements.engagementsClubTimesDialogMessage.textContent = "Temps invalide : utilisez MM:SS.CC ou saisissez uniquement les chiffres.";
              portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
            }
            input.reportValidity?.();
            input.focus?.();
            return;
          }
          overrides.set(eventCode, { manual, value, known: historyChanged && !portalActions.engagementManualIndividualTimesAllowed() });
        }
        const matrixRow = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
          .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === swimmer.swimmerIndexId);
        overrides.forEach((override, eventCode) => {
          const timeInput = Array.from(matrixRow?.querySelectorAll("[data-engagement-club-swimmer-event-time]") || [])
            .find((input) => input.dataset.engagementClubSwimmerEventTime === eventCode);
          if (!timeInput) return;
          timeInput.value = override.value;
          timeInput.disabled = !override.manual || override.known;
        });
        const previewByCode = new Map((portalConfig.engagementClubSwimmerEventTimesCache.get(portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer)) || [])
          .map((entry) => [entry.eventCode, entry]));
        const swimmers = portalActions.selectedEngagementClubSwimmerRows().map((candidate) => {
          if (candidate.swimmerIndexId !== swimmer.swimmerIndexId) return candidate;
          return {
            ...candidate,
            individualEntries: (candidate.individualEntries || []).map((entry) => {
              const override = overrides.get(entry.eventCode);
              if (!override) return entry;
              if (override.known) {
                return { ...entry, entryTimeMode: "known", entryTime: override.value, manualEntryTime: "" };
              }
              if (override.manual) {
                return { ...entry, entryTimeMode: "manual", entryTime: override.value, manualEntryTime: override.value };
              }
              const preview = previewByCode.get(entry.eventCode);
              return preview ? { ...entry, ...preview, manualEntryTime: "" } : { ...entry, manualEntryTime: "" };
            })
          };
        });
        const swimmerIndexId = swimmer.swimmerIndexId;
        const changedSwimmer = swimmers.find((candidate) => candidate.swimmerIndexId === swimmerIndexId);
        portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), swimmers };
        closeEngagementClubTimesDialog(false);
        renderEngagementClubEntries();
        Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-times-open]") || [])
          .find((button) => button.dataset.engagementClubTimesOpen === swimmerIndexId)?.focus?.();
        if (changedSwimmer) void portalActions.persistEngagementClubIndividualEntries(changedSwimmer);
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

    function engagementRelayLegPlaceholder(genderMode = "", index = 0) {
        if (genderMode === "female") return `Relayeuse ${index + 1}`;
        if (genderMode === "mixed") return `${index % 2 === 0 ? "Relayeur" : "Relayeuse"} ${index + 1} (${index % 2 === 0 ? "Homme" : "Femme"})`;
        return `Relayeur ${index + 1}`;
      }

    function engagementRelayLegChoiceLabel(genderMode = "", index = 0) {
        const expectedSex = engagementRelayExpectedMemberSex(genderMode, index);
        return `${expectedSex === "F" ? "Relayeuse" : "Relayeur"} ${index + 1}`;
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

    function engagementRelayExpectedMemberSex(genderMode = "", index = 0) {
        if (genderMode === "female") return "F";
        if (genderMode === "male") return "M";
        if (genderMode === "mixed") return index % 2 === 0 ? "M" : "F";
        return "";
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

    function engagementRelayMemberOptionLabel(swimmer = {}, competitionDate = "") {
        const name = portalActions.engagementSwimmerDisplayName(swimmer);
        const category = portalActions.engagementSwimmerCategory(swimmer, competitionDate);
        return category ? `${name} (${category})` : name;
      }

    function engagementRelaySameDistanceNature(event = {}, candidate = {}) {
        return String(event.distance || "") === String(candidate.distance || "") &&
          String(event.discipline || "") === String(candidate.discipline || "");
      }

    function engagementRelayMemberAlreadyUsed(swimmerIndexId = "", rows = [], rowIndex = -1, memberIndex = -1, event = {}) {
        if (!swimmerIndexId) return false;
        const relayEvents = new Map(engagementClubRelayEvents().map((item) => [item.code, item]));
        return rows.some((relay, relayIndex) => {
          const relayEvent = relayEvents.get(relay.eventCode);
          if (!relayEvent || !engagementRelaySameDistanceNature(event, relayEvent)) return false;
          const memberIds = Array.isArray(relay.memberIds)
            ? relay.memberIds
            : (relay.members || []).map((member) => member.swimmerIndexId).filter(Boolean);
          return memberIds.some((memberId, currentMemberIndex) =>
            memberId === swimmerIndexId && (relayIndex !== rowIndex || currentMemberIndex !== memberIndex)
          );
        });
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

    function reconcileEngagementClubRelayDraft(relay = {}, previousRelay = {}, changedField = "") {
        const event = engagementClubRelayEvents().find((item) => item.code === relay.eventCode) || {};
        const categories = engagementRelayCategoryOptions(event);
        const category = categories.some(([code]) => code === relay.category) ? relay.category : "";
        const genderOptions = engagementRelayGenderOptions(event, category);
        const genderMode = genderOptions.length === 1
          ? genderOptions[0][0]
          : genderOptions.some(([mode]) => mode === relay.genderMode) ? relay.genderMode : "";
        const eventChanged = changedField === "event" && previousRelay.eventCode && previousRelay.eventCode !== relay.eventCode;
        if (eventChanged) {
          return {
            ...relay,
            category,
            genderMode,
            manualEntryTime: "",
            memberIds: Array.from({ length: engagementRelayLegCount(event) }, () => ""),
            draftNotice: "Épreuve modifiée : vérifiez le temps et les relayeurs."
          };
        }
        const competitionDate = portalState.selectedEngagementCompetition?.date || "";
        const swimmers = new Map(engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
        const memberIds = Array.from({ length: engagementRelayLegCount(event) }, (_, memberIndex) => {
          const swimmerId = Array.isArray(relay.memberIds) ? relay.memberIds[memberIndex] || "" : "";
          const swimmer = swimmers.get(swimmerId);
          const expectedSex = engagementRelayExpectedMemberSex(genderMode, memberIndex);
          if (!swimmer || !category || !genderMode) return "";
          if (expectedSex && swimmer.sex !== expectedSex) return "";
          return engagementRelaySwimmerAllowedForCategory(swimmer, category, competitionDate) ? swimmerId : "";
        });
        return {
          ...relay,
          category,
          genderMode,
          memberIds
        };
      }

    function focusEngagementClubRelayControl(relayId = "", selector = "", memberIndex = -1) {
        global.requestAnimationFrame?.(() => {
          const row = Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
            .find((item) => item.dataset.engagementClubRelayId === relayId);
          if (!row) return;
          const controls = selector ? Array.from(row.querySelectorAll(selector)) : [];
          const control = memberIndex >= 0 ? controls[memberIndex] : controls[0];
          control?.focus?.();
          row.scrollIntoView?.({ block: "nearest" });
        });
      }

    function focusFirstIncompleteEngagementClubRelay() {
        global.requestAnimationFrame?.(() => {
          const rows = Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || []);
          const row = rows.find((item) => engagementClubRelayNeedsCompletion(selectedEngagementClubRelayRowsFromElement(item)));
          if (!row) return;
          const relay = selectedEngagementClubRelayRowsFromElement(row);
          const control = !relay.eventCode
            ? row.querySelector("[data-engagement-club-relay-event]")
            : !relay.category
              ? row.querySelector("[data-engagement-club-relay-category]")
              : !relay.genderMode
                ? row.querySelector("[data-engagement-club-relay-gender]")
                : portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()
                  ? row.querySelector("[data-engagement-club-relay-time]")
                  : Array.from(row.querySelectorAll("[data-engagement-club-relay-member]")).find((item) => !item.value);
          control?.focus?.();
          row.scrollIntoView?.({ block: "nearest" });
        });
      }

    function selectedEngagementClubRelayRowsFromElement(row) {
        if (!row) return {};
        const relayId = row.dataset.engagementClubRelayId || "";
        const existingRelay = portalState.engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
        return {
          ...existingRelay,
          relayId,
          eventCode: row.querySelector("[data-engagement-club-relay-event]")?.value || "",
          category: row.querySelector("[data-engagement-club-relay-category]")?.value || "",
          genderMode: row.querySelector("[data-engagement-club-relay-gender]")?.value || "",
          manualEntryTime: row.querySelector("[data-engagement-club-relay-time]")?.value || "",
          memberIds: Array.isArray(existingRelay.memberIds) ? existingRelay.memberIds : [],
          draftPending: existingRelay.draftPending === true || row.dataset.engagementClubRelayPending === "true",
          persisted: existingRelay.persisted === true || row.dataset.engagementClubRelayPersisted === "true"
        };
      }

    function engagementClubRelayDialogRelay() {
        return portalState.engagementClubRelayDialogDraft;
      }

    function readEngagementClubRelayDialogDraft() {
        const relay = engagementClubRelayDialogRelay();
        if (!relay) return null;
        return {
          ...relay,
          eventCode: portalContext.elements.engagementsClubRelayDialogEvent?.value || "",
          category: portalContext.elements.engagementsClubRelayDialogCategory?.value || "",
          genderMode: portalContext.elements.engagementsClubRelayDialogGender?.value || "",
          manualEntryTime: portalContext.elements.engagementsClubRelayDialogTime?.value || "",
          memberIds: Array.from(portalContext.elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || [])
            .map((select) => select.value || "")
        };
      }

    function syncEngagementClubRelayDialogMemberOptions() {
        const selects = Array.from(portalContext.elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || []);
        const selectedIds = selects.map((select) => select.value).filter(Boolean);
        selects.forEach((select) => {
          Array.from(select.options).forEach((option) => {
            if (!option.value) return;
            const selectedElsewhere = option.value !== select.value && selectedIds.includes(option.value);
            option.hidden = selectedElsewhere;
            option.disabled = selectedElsewhere;
          });
        });
      }

    function renderEngagementClubRelayDialog() {
        const relay = engagementClubRelayDialogRelay();
        const mount = portalContext.elements.engagementsClubRelayDialogList;
        if (!relay || !mount) return;
        const membersWereOpen = portalContext.elements.engagementsClubRelayDialogMembers?.open === true;
        const relayEvents = engagementClubRelayEvents();
        const event = relayEvents.find((candidate) => candidate.code === relay.eventCode) || {};
        const relayIndex = portalState.engagementClubRelaysDraft.findIndex((candidate) => candidate.relayId === relay.relayId);
        const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : [];
        const dialogRelayIndex = relayIndex >= 0 ? relayIndex : portalState.engagementClubRelaysDraft.length;
        const relaysWithDialogDraft = relayIndex >= 0
          ? portalState.engagementClubRelaysDraft.map((candidate, candidateIndex) => candidateIndex === relayIndex ? relay : candidate)
          : [...portalState.engagementClubRelaysDraft, relay];
        const relaysWithoutCurrentMembers = relaysWithDialogDraft.map((candidate, candidateIndex) => candidateIndex === dialogRelayIndex
          ? { ...candidate, memberIds: [] }
          : candidate);
        const relayLegs = engagementRelayLegCount(event);
        const competitionDate = portalState.selectedEngagementCompetition?.date || "";
        const swimmerOptions = engagementClubRelaySwimmerOptions();
        const sessionLabel = engagementClubRelaySessionLabel(relay.eventCode, relay.genderMode);
        const peopleWording = engagementRelayPeopleWording(relay.genderMode);
        const categories = engagementRelayCategoryOptions(event);
        const genderOptions = engagementRelayGenderOptions(event, relay.category);
        const selectedMemberCount = memberIds.filter(Boolean).length;
        if (portalContext.elements.engagementsClubRelayDialogTitle) {
          portalContext.elements.engagementsClubRelayDialogTitle.textContent = relay.persisted ? "Modifier le relais" : "Nouveau relais";
        }
        if (portalContext.elements.engagementsClubRelayDialogMeta) {
          portalContext.elements.engagementsClubRelayDialogMeta.textContent = sessionLabel || "Renseignez les informations puis validez.";
        }
        if (portalContext.elements.engagementsClubRelayDialogEvent) {
          portalContext.elements.engagementsClubRelayDialogEvent.innerHTML = `
        <option value="" ${event.code ? "" : "selected"} disabled>Choisir</option>
        ${relayEvents.map((option) => `<option value="${portalActions.escapeHtml(option.code)}" ${option.code === event.code ? "selected" : ""}>${portalActions.escapeHtml(option.shortLabel || option.code)}</option>`).join("")}
      `;
          portalContext.elements.engagementsClubRelayDialogEvent.disabled = portalState.engagementClubRelayDialogSaving;
        }
        if (portalContext.elements.engagementsClubRelayDialogCategory) {
          portalContext.elements.engagementsClubRelayDialogCategory.innerHTML = `
        <option value="" ${relay.category ? "" : "selected"} disabled>Choisir</option>
        ${categories.map(([code, label]) => `<option value="${portalActions.escapeHtml(code)}" ${code === relay.category ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("")}
      `;
          portalContext.elements.engagementsClubRelayDialogCategory.disabled = portalState.engagementClubRelayDialogSaving || !event.code;
        }
        if (portalContext.elements.engagementsClubRelayDialogGender) {
          portalContext.elements.engagementsClubRelayDialogGender.innerHTML = `
        <option value="" ${relay.genderMode ? "" : "selected"} disabled>Choisir</option>
        ${genderOptions.map(([mode, label]) => `<option value="${portalActions.escapeHtml(mode)}" ${mode === relay.genderMode ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("")}
      `;
          portalContext.elements.engagementsClubRelayDialogGender.dataset.gender = relay.genderMode || "";
          portalContext.elements.engagementsClubRelayDialogGender.disabled = portalState.engagementClubRelayDialogSaving || !relay.category || genderOptions.length === 1;
        }
        if (portalContext.elements.engagementsClubRelayDialogTime) {
          const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
          const timeField = portalContext.elements.engagementsClubRelayDialogTime.closest("[data-engagements-relay-time-field]");
          if (timeField) timeField.hidden = openWater;
          portalContext.elements.engagementsClubRelayDialogTime.required = !openWater;
          portalContext.elements.engagementsClubRelayDialogTime.value = portalActions.formatEngagementEntryTimeInput(relay.manualEntryTime || "") || relay.manualEntryTime || "";
          portalContext.elements.engagementsClubRelayDialogTime.disabled = portalState.engagementClubRelayDialogSaving;
        }
        if (portalContext.elements.engagementsClubRelayDialogMembersSummary) {
          portalContext.elements.engagementsClubRelayDialogMembersSummary.textContent = selectedMemberCount
            ? `Participants · ${selectedMemberCount}/${relayLegs}`
            : `Choisir les ${peopleWording.plural}`;
        }
        if (portalContext.elements.engagementsClubRelayDialogMembersHelp) {
          portalContext.elements.engagementsClubRelayDialogMembersHelp.textContent = event.code && relay.category && relay.genderMode
            ? `Sélectionnez les ${relayLegs} ${peopleWording.plural}, ou laissez la composition vide.`
            : "Choisissez d'abord la distance, la catégorie et le sexe.";
        }
        mount.innerHTML = event.code && relay.category && relay.genderMode ? `
      <div class="admin-engagements-club-relay-dialog-grid">
        ${Array.from({ length: relayLegs }, (_, memberIndex) => {
              const expectedSex = engagementRelayExpectedMemberSex(relay.genderMode, memberIndex);
              const currentMemberId = memberIds[memberIndex] || "";
              const options = swimmerOptions.filter((swimmer) => {
                if (expectedSex && swimmer.sex !== expectedSex) return false;
                if (!engagementRelaySwimmerAllowedForCategory(swimmer, relay.category, competitionDate)) return false;
                return !engagementRelayMemberAlreadyUsed(swimmer.swimmerIndexId, relaysWithoutCurrentMembers, dialogRelayIndex, memberIndex, event);
              });
              const label = engagementRelayLegPlaceholder(relay.genderMode, memberIndex);
              const choiceLabel = engagementRelayLegChoiceLabel(relay.genderMode, memberIndex);
              return `
            <label data-expected-sex="${portalActions.escapeHtml(expectedSex)}">
              <span aria-hidden="true">${memberIndex + 1}</span>
              <select data-engagement-club-relay-dialog-member aria-label="${portalActions.escapeHtml(label)}" ${portalState.engagementClubRelayDialogSaving ? "disabled" : ""}>
                <option value="">${portalActions.escapeHtml(choiceLabel)}</option>
                ${options.map((swimmer) => `<option value="${portalActions.escapeHtml(swimmer.swimmerIndexId)}" ${currentMemberId === swimmer.swimmerIndexId ? "selected" : ""}>${portalActions.escapeHtml(engagementRelayMemberOptionLabel(swimmer, competitionDate))}</option>`).join("")}
              </select>
            </label>
          `;
            }).join("")}
      </div>
    ` : "";
        if (portalContext.elements.engagementsClubRelayDialogMembers) {
          portalContext.elements.engagementsClubRelayDialogMembers.open = membersWereOpen;
          portalContext.elements.engagementsClubRelayDialogMembers.classList.toggle("is-unavailable", !event.code || !relay.category || !relay.genderMode);
        }
        syncEngagementClubRelayDialogMemberOptions();
        if (portalContext.elements.engagementsClubRelayDialogApply) {
          portalContext.elements.engagementsClubRelayDialogApply.textContent = portalState.engagementClubRelayDialogSaving ? "Enregistrement..." : "Valider le relais";
          portalContext.elements.engagementsClubRelayDialogApply.disabled = portalState.engagementClubRelayDialogSaving;
        }
        if (portalContext.elements.engagementsClubRelayDialogReset) portalContext.elements.engagementsClubRelayDialogReset.disabled = portalState.engagementClubRelayDialogSaving;
        if (portalContext.elements.engagementsClubRelayDialogCancel) portalContext.elements.engagementsClubRelayDialogCancel.disabled = portalState.engagementClubRelayDialogSaving;
        if (portalContext.elements.engagementsClubRelayDialogClose) portalContext.elements.engagementsClubRelayDialogClose.disabled = portalState.engagementClubRelayDialogSaving;
      }

    function openEngagementClubRelayDialog(relayId = "", opener = null) {
        portalState.engagementClubRelaysDraft = selectedEngagementClubRelayRowsFromDom();
        const savedRelay = relayId ? portalState.engagementClubRelaysDraft.find((candidate) => candidate.relayId === relayId) : null;
        if (relayId && !savedRelay) return;
        const relay = savedRelay
          ? {
              ...savedRelay,
              memberIds: Array.isArray(savedRelay.memberIds)
                ? [...savedRelay.memberIds]
                : (savedRelay.members || []).map((member) => member.swimmerIndexId).filter(Boolean)
            }
          : {
              relayId: `relay-${Date.now()}`,
              eventCode: "",
              category: "",
              genderMode: "",
              manualEntryTime: "",
              memberIds: [],
              persisted: false
            };
        portalState.engagementClubRelayDialogRelayId = relayId;
        portalState.engagementClubRelayDialogDraft = relay;
        portalState.engagementClubRelayDialogOpener = opener;
        portalState.engagementClubRelayDialogSaving = false;
        if (portalContext.elements.engagementsClubRelayDialogMessage) {
          portalContext.elements.engagementsClubRelayDialogMessage.textContent = "";
          portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "";
        }
        renderEngagementClubRelayDialog();
        if (portalContext.elements.engagementsClubRelayDialog && !portalContext.elements.engagementsClubRelayDialog.open) {
          portalContext.elements.engagementsClubRelayDialog.showModal();
        }
        global.requestAnimationFrame?.(() => portalContext.elements.engagementsClubRelayDialogEvent?.focus?.());
      }

    function closeEngagementClubRelayDialog(restoreFocus = true) {
        if (portalState.engagementClubRelayDialogSaving) return;
        if (portalContext.elements.engagementsClubRelayDialog?.open) portalContext.elements.engagementsClubRelayDialog.close();
        const opener = portalState.engagementClubRelayDialogOpener;
        portalState.engagementClubRelayDialogRelayId = "";
        portalState.engagementClubRelayDialogDraft = null;
        portalState.engagementClubRelayDialogOpener = null;
        if (restoreFocus) opener?.focus?.();
      }

    async function applyEngagementClubRelayDialog() {
        let relay = readEngagementClubRelayDialogDraft();
        if (!relay || portalState.engagementClubRelayDialogSaving) return;
        const timeInput = portalContext.elements.engagementsClubRelayDialogTime;
        const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
        if (!openWater && timeInput && !portalActions.normalizeEngagementEntryTimeInput(timeInput)) {
          timeInput.reportValidity?.();
          timeInput.focus?.();
          return;
        }
        relay = { ...relay, manualEntryTime: openWater ? "" : timeInput?.value || "", draftPending: false };
        portalState.engagementClubRelayDialogDraft = relay;
        const relayIndex = portalState.engagementClubRelaysDraft.findIndex((candidate) => candidate.relayId === relay.relayId);
        const nextRows = relayIndex >= 0
          ? portalState.engagementClubRelaysDraft.map((candidate, index) => index === relayIndex ? relay : candidate)
          : [...portalState.engagementClubRelaysDraft, relay];
        const validationIssues = engagementClubRelayValidationIssues(portalState.selectedEngagementCompetition?.napSource===true ? [relay] : nextRows);
        if (validationIssues.length) {
          if (portalContext.elements.engagementsClubRelayDialogMessage) {
            portalContext.elements.engagementsClubRelayDialogMessage.textContent = validationIssues[0];
            portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "error";
          }
          const firstMissingControl = !relay.eventCode
            ? portalContext.elements.engagementsClubRelayDialogEvent
            : !relay.category
              ? portalContext.elements.engagementsClubRelayDialogCategory
              : !relay.genderMode
                ? portalContext.elements.engagementsClubRelayDialogGender
                : !openWater && !relay.manualEntryTime ? portalContext.elements.engagementsClubRelayDialogTime : null;
          firstMissingControl?.focus?.();
          return;
        }
        const previousRows = portalState.engagementClubRelaysDraft;
        portalState.engagementClubRelaysDraft = nextRows;
        portalState.engagementClubRelayDialogSaving = true;
        renderEngagementClubRelayDialog();
        if (portalContext.elements.engagementsClubRelayDialogMessage) {
          portalContext.elements.engagementsClubRelayDialogMessage.textContent = "Enregistrement du relais...";
          portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "loading";
        }
        const saved = await portalActions.saveEngagementClubRelays(null, portalContext.elements.engagementsClubRelayDialogMessage, nextRows, "", relay);
        portalState.engagementClubRelayDialogSaving = false;
        if (!saved) {
          portalState.engagementClubRelaysDraft = previousRows;
          renderEngagementClubRelayDialog();
          return;
        }
        const relayId = relay.relayId;
        closeEngagementClubRelayDialog(false);
        global.requestAnimationFrame?.(() => {
          const savedRow = Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
            .find((row) => row.dataset.engagementClubRelayId === relayId);
          (savedRow?.querySelector("[data-engagement-club-relay-edit]") || savedRow?.querySelector("[data-engagement-club-relay-compose]"))?.focus?.();
        });
      }

    function resetEngagementClubRelayDialogMembers() {
        if (portalState.engagementClubRelayDialogSaving) return;
        Array.from(portalContext.elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || [])
          .forEach((select) => { select.value = ""; });
        syncEngagementClubRelayDialogMemberOptions();
        portalState.engagementClubRelayDialogDraft = readEngagementClubRelayDialogDraft();
        if (portalContext.elements.engagementsClubRelayDialogMembersSummary) {
          portalContext.elements.engagementsClubRelayDialogMembersSummary.textContent = `Choisir les ${engagementRelayPeopleWording(portalState.engagementClubRelayDialogDraft?.genderMode).plural}`;
        }
        if (portalContext.elements.engagementsClubRelayDialogMessage) {
          portalContext.elements.engagementsClubRelayDialogMessage.textContent = "Sélection des participants réinitialisée.";
          portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "";
        }
        portalContext.elements.engagementsClubRelayDialogList?.querySelector("[data-engagement-club-relay-dialog-member]")?.focus?.();
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
          portalContext.elements.engagementsClubSummaryPdfButton.disabled = !canGenerateRecap;
          portalContext.elements.engagementsClubSummaryPdfButton.title = canGenerateRecap
            ? "Télécharger le récapitulatif PDF"
            : "Ajoutez au moins un nageur, un officiel ou un relais pour générer le récapitulatif.";
        }
      }

    function renderEngagementClubNativeSummary(entry) {
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

    function engagementClosureAutomationStatusLabel(status) {
        return {
          processing: "En cours",
          completed: "Terminée",
          completed_with_errors: "Terminée avec erreurs",
          failed: "Erreur"
        }[String(status || "")] || "En attente";
      }

    function engagementClosureAutomationStatusTone(status) {
        return {
          processing: "processing",
          completed: "sent",
          completed_with_errors: "warning",
          failed: "failed"
        }[String(status || "")] || "pending";
      }

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
