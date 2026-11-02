(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/club-people.js#selectedEngagementTeamLeaderFromForm */
    function selectedEngagementTeamLeaderFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "selectedEngagementTeamLeaderFromForm", args, moduleActions);
    }

    function engagementClubTeamLeaderPeople(query = "") {
        const terms = normalizedEngagementClubSearch(query).split(/\s+/).filter(Boolean);
        const peopleBySwimmer = new Map();
        const peopleByLicense = new Map();
        portalState.engagementClubPeople.forEach((person) => {
          if (!person.active) return;
          const swimmerKey = [person.swimmerSource || "performances", person.swimmerIndexId].filter(Boolean).join(":");
          if (swimmerKey) peopleBySwimmer.set(swimmerKey, person);
          const licenseKey = engagementClubPersonLicenseKey(person.licenseNumber);
          if (licenseKey) peopleByLicense.set(licenseKey, person);
        });
        const native = global.LivePalmesEnvironment?.sportingDataSource === "nap";
        const candidates = [
          ...portalActions.visibleNativePeople(portalState.engagementClubPeople)
            .filter((person) => person.active)
            .map((person) => ({ ...person, selectionId: person.id, candidateType: "person" })),
          ...(native ? [] : portalState.engagementClubSwimmers)
            .filter((swimmer) => swimmer.active !== false)
            .filter((swimmer) => {
              const swimmerKey = [swimmer.source || "performances", swimmer.swimmerIndexId || swimmer.id].filter(Boolean).join(":");
              return !peopleBySwimmer.has(swimmerKey) && !peopleByLicense.has(engagementClubPersonLicenseKey(swimmer.licenseNumber));
            })
            .map((swimmer) => ({
              ...swimmer,
              selectionId: `swimmer:${swimmer.source || "performances"}:${swimmer.swimmerIndexId || swimmer.id}`,
              candidateType: "swimmer",
              roles: { swimmer: true, teamLeader: false }
            }))
        ];
        return candidates
          .filter((person) => {
            if (!person.active) return false;
            if (!terms.length) return true;
            const haystack = normalizedEngagementClubSearch([
              person.lastName,
              person.firstName,
              person.licenseNumber
            ].filter(Boolean).join(" "));
            return terms.every((term) => haystack.includes(term));
          })
          .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
      }

    function renderEngagementClubTeamPersonOptions(selectedPersonId = "") {
        if (!portalContext.elements.engagementsClubTeamPersonSelect) return;
        if (portalContext.elements.engagementsClubTeamPeopleMore) { portalContext.elements.engagementsClubTeamPeopleMore.hidden = !portalState.engagementClubPeopleHasMore; portalContext.elements.engagementsClubTeamPeopleMore.disabled = portalState.engagementClubPeopleLoading; }
        const query = portalContext.elements.engagementsClubTeamPersonSearch?.value || "";
        const options = engagementClubTeamLeaderPeople(query);
        portalContext.elements.engagementsClubTeamPersonSelect.innerHTML = [
          `<option value="">${options.length ? "Choisir un membre ou saisir manuellement" : "Aucun membre correspondant — saisie manuelle"}</option>`,
          ...options.map((person) => `
        <option value="${portalActions.escapeHtml(person.selectionId || person.id)}">${portalActions.escapeHtml([person.lastName, person.firstName].filter(Boolean).join(" "))} - licence ${portalActions.escapeHtml(person.licenseNumber || "-")}</option>
      `)
        ].join("");
        portalContext.elements.engagementsClubTeamPersonSelect.value = options.some((person) => (person.selectionId || person.id) === selectedPersonId) ? selectedPersonId : "";
        if (portalState.selectedEngagementCompetition?.nativeReadOnly === true && portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true && portalContext.elements.engagementsClubTeamPersonResults) {
          const leader = portalState.selectedEngagementClubEntry?.teamLeader || {};
          const locked = portalState.engagementClubTeamSaving || Boolean(portalActions.engagementClubWriteLockReason({ ...portalState.selectedEngagementCompetition, nativeReadOnly: false }));
          const identity = person => [person.lastName, person.firstName, person.birthDate].map(value => normalizedEngagementClubSearch(value || "")).join("|");
          const matches = leader.mode === "person" ? options.filter(person => identity(person) === identity(leader)) : [];
          const selected = matches.find(person => person.id === leader.personId) || (matches.length === 1 ? matches[0] : null);
          const samePerson = person => person === selected;
          portalContext.elements.engagementsClubTeamPersonResults.hidden = false;
          portalContext.elements.engagementsClubTeamPersonResults.innerHTML = `<section class="admin-engagements-club-officials-section">
        <h5>${String(query).trim() ? "Résultats de recherche" : "Membres du club"} <span>${options.length}</span></h5>
        <div class="admin-engagements-club-officials-table" role="table" aria-label="Choisir le chef d’équipe">
          <div class="admin-engagements-club-officials-head" role="row"><span role="columnheader">Membre</span><span role="columnheader">Naissance</span><span role="columnheader">Licence</span></div>
          ${options.map(person => `<label class="admin-engagements-club-official-row" role="row" data-selected="${samePerson(person)}">
            <span role="cell"><input type="radio" name="adminEngagementsClubTeamCandidate" data-engagement-club-team-candidate value="${portalActions.escapeHtml(person.selectionId || person.id)}" ${samePerson(person) ? "checked" : ""} ${locked ? "disabled" : ""}><strong>${portalActions.escapeHtml([person.firstName, person.lastName].filter(Boolean).join(" "))}</strong></span>
            <span role="cell">${portalActions.escapeHtml(person.birthDate ? portalActions.formatShortDate(person.birthDate) : "-")}</span><span role="cell">${portalActions.escapeHtml(person.licenseNumber || "-")}</span>
          </label>`).join("")}
        </div>${options.length ? "" : '<p class="admin-engagements-empty">Aucun membre correspondant.</p>'}
      </section>`;
          return;
        }
        if (portalContext.elements.engagementsClubTeamPersonResults) {
          const hasQuery = Boolean(String(query).trim());
          const visiblePeople = options.slice(0, 12);
          portalContext.elements.engagementsClubTeamPersonResults.hidden = !hasQuery;
          portalContext.elements.engagementsClubTeamPersonResults.innerHTML = !hasQuery
            ? ""
            : visiblePeople.length
            ? visiblePeople.map((person) => {
              const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Membre sans nom";
              const role = person.roles?.teamLeader ? "chef d'équipe" : person.candidateType === "swimmer" ? "nageur du club" : "membre du club";
              const details = [person.licenseNumber ? `licence ${person.licenseNumber}` : "licence non renseignée", role];
              return `<button type="button" data-engagement-club-team-person-result="${portalActions.escapeHtml(person.selectionId || person.id)}"><strong>${portalActions.escapeHtml(name)}</strong><small>${portalActions.escapeHtml(details.join(" · "))}</small></button>`;
            }).join("")
            : `<p class="admin-engagements-empty">Aucun membre trouvé.</p>`;
        }
      }

    function setEngagementClubTeamManualFieldsVisible(visible) {
        if (portalContext.elements.engagementsClubTeamPersonFields) portalContext.elements.engagementsClubTeamPersonFields.dataset.manualEntry = visible ? "true" : "false";
        const pickerLabel = portalContext.elements.engagementsClubTeamPersonSelect?.closest("label");
        if (pickerLabel) pickerLabel.hidden = true;
        [
          portalContext.elements.engagementsClubTeamFirstName,
          portalContext.elements.engagementsClubTeamLastName,
          portalContext.elements.engagementsClubTeamBirthDate,
          portalContext.elements.engagementsClubTeamSex,
          portalContext.elements.engagementsClubTeamLicense,
          portalContext.elements.engagementsClubTeamExternal
        ].forEach((field) => {
          const label = field?.closest("label");
          if (label) label.hidden = !visible;
        });
        if (!visible) {
          if (portalContext.elements.engagementsClubTeamExternalClubIdLabel) portalContext.elements.engagementsClubTeamExternalClubIdLabel.hidden = true;
          if (portalContext.elements.engagementsClubTeamExternalClubNameLabel) portalContext.elements.engagementsClubTeamExternalClubNameLabel.hidden = true;
        }
        if (portalContext.elements.engagementsClubTeamPersonCreate) portalContext.elements.engagementsClubTeamPersonCreate.hidden = visible;
      }

    function findEngagementClubTeamPersonFromFields(teamLeader = {}) {
        if (teamLeader.personId) {
          return portalState.engagementClubPeople.find((person) => person.id === teamLeader.personId) || null;
        }
        return engagementClubTeamLeaderPeople().find((person) =>
          engagementClubPersonLicenseKey(person.licenseNumber) &&
          engagementClubPersonLicenseKey(person.licenseNumber) === engagementClubPersonLicenseKey(teamLeader.licenseNumber) &&
          engagementClubPersonIdentityKey(person) === engagementClubPersonIdentityKey(teamLeader)
        ) || null;
      }

    /* deferred-function: assets/portal/deferred/club-people.js#applyEngagementClubTeamPerson */
    function applyEngagementClubTeamPerson(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "applyEngagementClubTeamPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#confirmEngagementClubTeamLeaderCandidate */
    async function confirmEngagementClubTeamLeaderCandidate(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-people", "confirmEngagementClubTeamLeaderCandidate", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#restoreEngagementClubTeamLeaderChoice */
    function restoreEngagementClubTeamLeaderChoice(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "restoreEngagementClubTeamLeaderChoice", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#cancelEngagementClubTeamEdit */
    function cancelEngagementClubTeamEdit(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "cancelEngagementClubTeamEdit", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#selectEngagementClubTeamRenunciation */
    async function selectEngagementClubTeamRenunciation(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-people", "selectEngagementClubTeamRenunciation", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#openEngagementClubTeamRenunciationDialog */
    function openEngagementClubTeamRenunciationDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "openEngagementClubTeamRenunciationDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#closeEngagementClubTeamRenunciationDialog */
    function closeEngagementClubTeamRenunciationDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "closeEngagementClubTeamRenunciationDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#closeEngagementClubExternalTeamDialog */
    function closeEngagementClubExternalTeamDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "closeEngagementClubExternalTeamDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#openEngagementClubExternalTeamDialog */
    function openEngagementClubExternalTeamDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "openEngagementClubExternalTeamDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#saveEngagementClubExternalTeamLeader */
    async function saveEngagementClubExternalTeamLeader(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-people", "saveEngagementClubExternalTeamLeader", args, moduleActions);
    }

    function engagementClubOfficialPeople() {
        const candidates = portalActions.visibleNativePeople(portalState.engagementClubPeople)
          .filter((person) => person.active)
          .map((person) => ({ ...person, candidateType: "person", selectionId: person.id }));
        if(portalState.selectedEngagementClubEntry?.source==="nap") {
          for(const official of portalState.selectedEngagementClubEntry.officials || []) {
            if(!candidates.some(person=>person.id===official.personId)) candidates.push({...official,id:official.personId,selectionId:official.personId,candidateType:"person",roles:{official:true},nativeExistingOnly:true});
          }
        }
        portalState.engagementClubSwimmers
          .filter((swimmer) => swimmer.active !== false && !engagementClubPersonForSwimmer(swimmer))
          .forEach((swimmer) => candidates.push({
            ...swimmer,
            candidateType: "swimmer",
            selectionId: `swimmer:${engagementClubSwimmerReferenceValue(swimmer)}`,
            roles: { swimmer: true, official: false, teamLeader: false }
          }));
        return candidates
          .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
      }

    function engagementClubSwimmerReferenceValue(swimmer = {}) {
        const source = String(swimmer.source || "performances").trim() || "performances";
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
        return source && swimmerIndexId ? `${encodeURIComponent(source)}:${encodeURIComponent(swimmerIndexId)}` : "";
      }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubSwimmerFromReferenceValue */
    function engagementClubSwimmerFromReferenceValue(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubSwimmerFromReferenceValue", args, moduleActions);
    }

    function engagementClubPersonForSwimmer(swimmer = {}) {
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "");
        const swimmerSource = String(swimmer.source || "performances");
        return portalState.engagementClubPeople.find((person) =>
          (person.swimmerIndexId === swimmerIndexId && String(person.swimmerSource || "performances") === swimmerSource) ||
          (person.licenseNumber && swimmer.licenseNumber && person.licenseNumber === swimmer.licenseNumber)
        ) || null;
      }

    /* deferred-function: assets/portal/deferred/club-people.js#renderEngagementClubPersonSwimmerOptions */
    function renderEngagementClubPersonSwimmerOptions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "renderEngagementClubPersonSwimmerOptions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#applyEngagementClubPersonSwimmer */
    function applyEngagementClubPersonSwimmer(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "applyEngagementClubPersonSwimmer", args, moduleActions);
    }

    function selectedEngagementClubOfficialIds() {
        return Array.from(portalContext.elements.engagementsClubOfficialsForm?.querySelectorAll("[data-engagement-club-official-id]:checked") || [])
          .map((input) => input.dataset.engagementClubOfficialId)
          .filter(Boolean);
      }

    function updateEngagementClubOfficialsSummary() {
        if (!portalContext.elements.engagementsClubOfficialsSummary) return;
        const selectedCount = selectedEngagementClubOfficialIds().length;
        portalContext.elements.engagementsClubOfficialsSummary.textContent = selectedCount
          ? `${selectedCount} officiel${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}.`
          : "Aucun officiel sélectionné.";
        portalActions.renderEngagementClubSummary();
      }

    function renderEngagementClubOfficials() {
        const mount = portalContext.elements.engagementsClubOfficialsList;
        const selectedMount = portalContext.elements.engagementsClubSelectedOfficialsList;
        if (!mount) return;
        const writeLockReason = portalActions.engagementClubOfficialsLockReason();
        const locked = Boolean(writeLockReason || !portalActions.engagementClubTeamComplete());
        const candidateListsReady = portalState.engagementClubPeopleLoaded && portalState.engagementClubSwimmersLoaded;
        const candidateListsLoading = (!portalState.engagementClubPeopleLoaded && portalState.engagementClubPeopleLoading) ||
          (!portalState.engagementClubSwimmersLoaded && portalState.engagementClubSwimmersLoading);
        if (portalContext.elements.engagementsClubOfficialsForm) portalContext.elements.engagementsClubOfficialsForm.dataset.locked = locked ? "true" : "false";
        if (portalContext.elements.engagementsClubOfficialsSaveButton) portalContext.elements.engagementsClubOfficialsSaveButton.disabled = locked || !candidateListsReady;
        if (portalContext.elements.engagementsClubOfficialsSearch) portalContext.elements.engagementsClubOfficialsSearch.disabled = locked || !candidateListsReady;
        const selectedIds = new Set((portalState.selectedEngagementClubEntry?.officials || []).map((official) => official.personId).filter(Boolean));
        const members = engagementClubOfficialPeople();
        if (locked) {
          if (selectedMount) selectedMount.innerHTML = "";
          mount.innerHTML = `<p class="admin-engagements-empty">${portalActions.escapeHtml(writeLockReason || "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape.")}</p>`;
          updateEngagementClubOfficialsSummary();
          return;
        }
        if (!candidateListsReady) {
          if (selectedMount) selectedMount.innerHTML = candidateListsLoading
            ? '<p class="admin-engagements-empty">Préparation des officiels engagés…</p>'
            : '<p class="admin-engagements-empty">La liste des membres du club est indisponible.</p>';
          mount.innerHTML = "";
          if (portalContext.elements.engagementsClubOfficialsSummary) {
            portalContext.elements.engagementsClubOfficialsSummary.textContent = candidateListsLoading
              ? "Préparation des sélections enregistrées…"
              : "Officiels indisponibles.";
          }
          return;
        }
        if (!members.length) {
          if (selectedMount) selectedMount.innerHTML = "";
          mount.innerHTML = '<p class="admin-engagements-empty">Aucun membre actif trouvé pour ce club.</p>';
          updateEngagementClubOfficialsSummary();
          return;
        }
        const renderOfficialRow = (person) => {
          const selected = selectedIds.has(person.id);
          const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Membre sans nom";
          return `
        <label class="admin-engagements-club-official-row" role="row" data-selected="${selected ? "true" : "false"}" data-engagement-club-official-candidate="${portalActions.escapeHtml(person.selectionId || person.id)}">
          <span role="cell">
            <input type="checkbox" data-engagement-club-official-id="${portalActions.escapeHtml(person.id || "")}" data-engagement-club-official-selection="${portalActions.escapeHtml(person.selectionId || person.id)}" ${selected ? "checked" : ""}>
            <strong>${portalActions.escapeHtml(name)}</strong>
          </span>
          <span role="cell">${portalActions.escapeHtml(person.birthDate ? portalActions.formatShortDate(person.birthDate) : "-")}</span>
          <span role="cell">${portalActions.escapeHtml(person.licenseNumber || "-")}</span>
        </label>
      `;
        };
        const renderOfficialTable = (rows, label) => `
      <section class="admin-engagements-club-officials-section">
        <h5>${portalActions.escapeHtml(label)} <span>${rows.length}</span></h5>
        <div class="admin-engagements-club-officials-table" role="table" aria-label="${portalActions.escapeHtml(label)}">
          <div class="admin-engagements-club-officials-head" role="row">
            <span role="columnheader">Membre</span>
            <span role="columnheader">Naissance</span>
            <span role="columnheader">Licence</span>
          </div>
          ${rows.map(renderOfficialRow).join("")}
        </div>
      </section>
    `;
        const selectedOfficials = members.filter((person) => selectedIds.has(person.id));
        const availableOfficials = members.filter((person) => !selectedIds.has(person.id));
        const availableClubOfficials = availableOfficials.filter((person) => person.roles?.official === true);
        const search = normalizedEngagementClubSearch(portalContext.elements.engagementsClubOfficialsSearch?.value || "");
        const matchingOfficials = availableOfficials.filter((person) => normalizedEngagementClubSearch([
          person.firstName,
          person.lastName,
          person.birthDate,
          person.licenseNumber
        ].filter(Boolean).join(" ")).includes(search));
        if (selectedMount) {
          selectedMount.innerHTML = selectedOfficials.length
            ? renderOfficialTable(selectedOfficials, "Officiels engagés")
            : "";
        }
        mount.innerHTML = !search
          ? availableClubOfficials.length
            ? renderOfficialTable(availableClubOfficials, "Officiels du club")
            : '<p class="admin-engagements-empty">Aucun autre officiel actif dans ce club.</p>'
          : matchingOfficials.length
            ? renderOfficialTable(matchingOfficials, "Résultats de recherche")
            : '<p class="admin-engagements-empty">Aucun membre ne correspond à cette recherche.</p>';
        portalActions.setEngagementClubFormControlsLocked(portalContext.elements.engagementsClubOfficialsForm, Boolean(portalState.engagementClubNativeOfficialRetry));
        if(portalState.engagementClubNativeOfficialRetry && portalContext.elements.engagementsClubOfficialsSaveButton) {
          portalContext.elements.engagementsClubOfficialsSaveButton.hidden=false;
          portalContext.elements.engagementsClubOfficialsSaveButton.disabled=false;
        }
        updateEngagementClubOfficialsSummary();
      }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubMemberRoleConflict */
    function engagementClubMemberRoleConflict(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubMemberRoleConflict", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#handleEngagementClubOfficialSelection */
    async function handleEngagementClubOfficialSelection(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-people", "handleEngagementClubOfficialSelection", args, moduleActions);
    }

    function normalizedEngagementClubSearch(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
      }

    function normalizedEngagementClubIdentityPart(value) {
        return normalizedEngagementClubSearch(value)
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

    function engagementClubPersonLicenseKey(value) {
        return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      }

    function engagementClubPersonIdentityKey(person = {}, inverted = false) {
        const firstName = normalizedEngagementClubIdentityPart(inverted ? person.lastName : person.firstName);
        const lastName = normalizedEngagementClubIdentityPart(inverted ? person.firstName : person.lastName);
        const birthDate = String(person.birthDate || "").trim();
        return firstName && lastName && birthDate ? `${lastName}|${firstName}|${birthDate}` : "";
      }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubIdentityEditDistance */
    function engagementClubIdentityEditDistance(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubIdentityEditDistance", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubIdentityPartSimilar */
    function engagementClubIdentityPartSimilar(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubIdentityPartSimilar", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubPersonIdentityMatch */
    function engagementClubPersonIdentityMatch(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubPersonIdentityMatch", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubPersonDisplayName */
    function engagementClubPersonDisplayName(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubPersonDisplayName", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementClubPersonPayloadWithRole */
    function engagementClubPersonPayloadWithRole(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementClubPersonPayloadWithRole", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#resolveEngagementClubPersonIdentity */
    function resolveEngagementClubPersonIdentity(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "resolveEngagementClubPersonIdentity", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementAdminPublicSwimmerSearchTokens */
    function engagementAdminPublicSwimmerSearchTokens(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementAdminPublicSwimmerSearchTokens", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementAdminPublicSwimmerSearchShard */
    function engagementAdminPublicSwimmerSearchShard(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementAdminPublicSwimmerSearchShard", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#loadEngagementAdminPublicSwimmerSearchShard */
    async function loadEngagementAdminPublicSwimmerSearchShard(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-people", "loadEngagementAdminPublicSwimmerSearchShard", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementAdminPublicSwimmerScore */
    function engagementAdminPublicSwimmerScore(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementAdminPublicSwimmerScore", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementAdminPublicSwimmerItem */
    function engagementAdminPublicSwimmerItem(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementAdminPublicSwimmerItem", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#searchEngagementAdminPublicSwimmers */
    async function searchEngagementAdminPublicSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-people", "searchEngagementAdminPublicSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#mergeEngagementNationalSwimmerResults */
    function mergeEngagementNationalSwimmerResults(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "mergeEngagementNationalSwimmerResults", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementNationalSwimmerKey */
    function engagementNationalSwimmerKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementNationalSwimmerKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementNationalSwimmerByKey */
    function engagementNationalSwimmerByKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementNationalSwimmerByKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementNationalSwimmerIdentityKey */
    function engagementNationalSwimmerIdentityKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementNationalSwimmerIdentityKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#engagementNationalSwimmerDuplicateAlertLabel */
    function engagementNationalSwimmerDuplicateAlertLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "engagementNationalSwimmerDuplicateAlertLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#selectedEngagementNationalSwimmerMergeKeys */
    function selectedEngagementNationalSwimmerMergeKeys(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "selectedEngagementNationalSwimmerMergeKeys", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#selectedEngagementNationalSwimmerKeepKey */
    function selectedEngagementNationalSwimmerKeepKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "selectedEngagementNationalSwimmerKeepKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#updateEngagementNationalSwimmerSelectionState */
    function updateEngagementNationalSwimmerSelectionState(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "updateEngagementNationalSwimmerSelectionState", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-people.js#setEngagementNationalSwimmerMergeMode */
    function setEngagementNationalSwimmerMergeMode(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-people", "setEngagementNationalSwimmerMergeMode", args, moduleActions);
    }

    const moduleActions = { selectedEngagementTeamLeaderFromForm, engagementClubTeamLeaderPeople, renderEngagementClubTeamPersonOptions, setEngagementClubTeamManualFieldsVisible, findEngagementClubTeamPersonFromFields, applyEngagementClubTeamPerson, confirmEngagementClubTeamLeaderCandidate, restoreEngagementClubTeamLeaderChoice, cancelEngagementClubTeamEdit, selectEngagementClubTeamRenunciation, openEngagementClubTeamRenunciationDialog, closeEngagementClubTeamRenunciationDialog, closeEngagementClubExternalTeamDialog, openEngagementClubExternalTeamDialog, saveEngagementClubExternalTeamLeader, engagementClubOfficialPeople, engagementClubSwimmerReferenceValue, engagementClubSwimmerFromReferenceValue, engagementClubPersonForSwimmer, renderEngagementClubPersonSwimmerOptions, applyEngagementClubPersonSwimmer, selectedEngagementClubOfficialIds, updateEngagementClubOfficialsSummary, renderEngagementClubOfficials, engagementClubMemberRoleConflict, handleEngagementClubOfficialSelection, normalizedEngagementClubSearch, normalizedEngagementClubIdentityPart, engagementClubPersonLicenseKey, engagementClubPersonIdentityKey, engagementClubIdentityEditDistance, engagementClubIdentityPartSimilar, engagementClubPersonIdentityMatch, engagementClubPersonDisplayName, engagementClubPersonPayloadWithRole, resolveEngagementClubPersonIdentity, engagementAdminPublicSwimmerSearchTokens, engagementAdminPublicSwimmerSearchShard, loadEngagementAdminPublicSwimmerSearchShard, engagementAdminPublicSwimmerScore, engagementAdminPublicSwimmerItem, searchEngagementAdminPublicSwimmers, mergeEngagementNationalSwimmerResults, engagementNationalSwimmerKey, engagementNationalSwimmerByKey, engagementNationalSwimmerIdentityKey, engagementNationalSwimmerDuplicateAlertLabel, selectedEngagementNationalSwimmerMergeKeys, selectedEngagementNationalSwimmerKeepKey, updateEngagementNationalSwimmerSelectionState, setEngagementNationalSwimmerMergeMode };
    return {
      selectedEngagementTeamLeaderFromForm,
      engagementClubTeamLeaderPeople,
      renderEngagementClubTeamPersonOptions,
      setEngagementClubTeamManualFieldsVisible,
      findEngagementClubTeamPersonFromFields,
      applyEngagementClubTeamPerson,
      confirmEngagementClubTeamLeaderCandidate,
      restoreEngagementClubTeamLeaderChoice,
      cancelEngagementClubTeamEdit,
      selectEngagementClubTeamRenunciation,
      openEngagementClubTeamRenunciationDialog,
      closeEngagementClubTeamRenunciationDialog,
      closeEngagementClubExternalTeamDialog,
      openEngagementClubExternalTeamDialog,
      saveEngagementClubExternalTeamLeader,
      engagementClubOfficialPeople,
      engagementClubSwimmerReferenceValue,
      engagementClubSwimmerFromReferenceValue,
      engagementClubPersonForSwimmer,
      renderEngagementClubPersonSwimmerOptions,
      applyEngagementClubPersonSwimmer,
      selectedEngagementClubOfficialIds,
      updateEngagementClubOfficialsSummary,
      renderEngagementClubOfficials,
      engagementClubMemberRoleConflict,
      handleEngagementClubOfficialSelection,
      normalizedEngagementClubSearch,
      normalizedEngagementClubIdentityPart,
      engagementClubPersonLicenseKey,
      engagementClubPersonIdentityKey,
      engagementClubIdentityEditDistance,
      engagementClubIdentityPartSimilar,
      engagementClubPersonIdentityMatch,
      engagementClubPersonDisplayName,
      engagementClubPersonPayloadWithRole,
      resolveEngagementClubPersonIdentity,
      engagementAdminPublicSwimmerSearchTokens,
      engagementAdminPublicSwimmerSearchShard,
      loadEngagementAdminPublicSwimmerSearchShard,
      engagementAdminPublicSwimmerScore,
      engagementAdminPublicSwimmerItem,
      searchEngagementAdminPublicSwimmers,
      mergeEngagementNationalSwimmerResults,
      engagementNationalSwimmerKey,
      engagementNationalSwimmerByKey,
      engagementNationalSwimmerIdentityKey,
      engagementNationalSwimmerDuplicateAlertLabel,
      selectedEngagementNationalSwimmerMergeKeys,
      selectedEngagementNationalSwimmerKeepKey,
      updateEngagementNationalSwimmerSelectionState,
      setEngagementNationalSwimmerMergeMode
    };
  }
  global.LivePalmesPortalClubPeople = { create };
})(window);
