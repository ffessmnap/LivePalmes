(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function selectedEngagementTeamLeaderFromForm() {
        const mode = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "person";
        if (mode === "renounced") {
          return {
            mode,
            renunciationAccepted: portalContext.elements.engagementsClubTeamRenunciation?.checked === true
          };
        }
        const externalClub = portalContext.elements.engagementsClubTeamExternal?.checked === true;
        const activeClubProfile = portalActions.activeEngagementClubProfile(portalState.currentAccessProfile || {});
        return {
          mode: "person",
          personId: externalClub ? "" : String(portalContext.elements.engagementsClubTeamPersonSelect?.value || "").trim(),
          firstName: String(portalContext.elements.engagementsClubTeamFirstName?.value || "").trim(),
          lastName: String(portalContext.elements.engagementsClubTeamLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
          birthDate: externalClub ? "" : String(portalContext.elements.engagementsClubTeamBirthDate?.value || "").trim(),
          sex: externalClub ? "" : String(portalContext.elements.engagementsClubTeamSex?.value || "").trim(),
          licenseNumber: portalActions.formatEngagementSwimmerLicense(portalContext.elements.engagementsClubTeamLicense?.value || ""),
          externalClub,
          clubId: externalClub ? String(portalContext.elements.engagementsClubTeamExternalClubId?.value || "").trim() : (activeClubProfile.clubId || ""),
          clubName: externalClub ? String(portalContext.elements.engagementsClubTeamExternalClubName?.value || "").trim() : (activeClubProfile.clubName || "")
        };
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

    function applyEngagementClubTeamPerson(personId = "") {
        const person = portalState.engagementClubPeople.find((item) => item.id === personId);
        if (!person) {
          if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = "";
          if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = "";
          if (portalContext.elements.engagementsClubTeamBirthDate) portalContext.elements.engagementsClubTeamBirthDate.value = "";
          if (portalContext.elements.engagementsClubTeamSex) portalContext.elements.engagementsClubTeamSex.value = "";
          if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.value = "";
          if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
          if (portalContext.elements.engagementsClubTeamExternalClubId) portalContext.elements.engagementsClubTeamExternalClubId.value = "";
          if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = "";
          portalActions.updateEngagementClubTeamFormMode();
          return false;
        }
        if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = person.firstName || "";
        if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = person.lastName || "";
        if (portalContext.elements.engagementsClubTeamBirthDate) portalContext.elements.engagementsClubTeamBirthDate.value = person.birthDate || "";
        if (portalContext.elements.engagementsClubTeamSex) portalContext.elements.engagementsClubTeamSex.value = person.sex || "";
        if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.value = person.licenseNumber || "";
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
        if (portalContext.elements.engagementsClubTeamExternalClubId) portalContext.elements.engagementsClubTeamExternalClubId.value = "";
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = "";
        portalActions.updateEngagementClubTeamFormMode();
        return true;
      }

    async function confirmEngagementClubTeamLeaderCandidate(candidate = {}) {
        if (!candidate?.selectionId) return null;
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap") return candidate;
        const conflict = engagementClubMemberRoleConflict(candidate, "teamLeader");
        if (conflict) {
          global.alert(conflict);
          throw new Error(conflict);
        }
        if (candidate.roles?.teamLeader === true) return candidate;
        const name = engagementClubPersonDisplayName(candidate);
        if (!global.confirm(`${name} n'est pas encore déclaré comme chef d'équipe. Voulez-vous lui attribuer ce rôle ?`)) {
          return null;
        }
        if (candidate.candidateType !== "swimmer") return candidate;
        const result = await portalActions.callFunction("saveEngagementClubPerson", {
          person: engagementClubPersonPayloadWithRole(candidate, "teamLeader")
        });
        const person = result.person || null;
        if (!person?.id) throw new Error("Membre non retourné après l'ajout du rôle chef d'équipe.");
        portalState.engagementClubPeople = [
          ...portalState.engagementClubPeople.filter((item) => item.id !== person.id),
          person
        ];
        return { ...person, selectionId: person.id, candidateType: "person" };
      }

    function restoreEngagementClubTeamLeaderChoice() {
        const teamLeader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        portalContext.elements.engagementsClubTeamForm?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
          .forEach((radio) => {
            radio.checked = teamLeader.mode === "renounced"
              ? radio.value === "renounced"
              : teamLeader.mode === "person" && !teamLeader.externalClub && radio.value === "person";
          });
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = teamLeader.mode === "person" && teamLeader.externalClub === true;
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = teamLeader.renunciationAccepted === true;
        portalActions.updateEngagementClubTeamFormMode();
      }

    function cancelEngagementClubTeamEdit() {
        if (portalState.engagementClubTeamSaving) return;
        const leader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        for (const [key, property] of [["FirstName", "firstName"], ["LastName", "lastName"], ["BirthDate", "birthDate"], ["Sex", "sex"], ["License", "licenseNumber"]]) {
          if (portalContext.elements[`engagementsClubTeam${key}`]) portalContext.elements[`engagementsClubTeam${key}`].value = leader[property] || "";
        }
        portalState.engagementClubTeamEditing = false;
        if (portalContext.elements.engagementsClubTeamPersonFields) delete portalContext.elements.engagementsClubTeamPersonFields.dataset.manualEntry;
        if (portalContext.elements.engagementsClubTeamPersonSearch) portalContext.elements.engagementsClubTeamPersonSearch.value = "";
        renderEngagementClubTeamPersonOptions(findEngagementClubTeamPersonFromFields(leader)?.id || "");
        restoreEngagementClubTeamLeaderChoice();
        portalActions.updateEngagementClubTeamLeaderActions();
        portalContext.elements.engagementsClubTeamModifyButton?.focus();
      }

    async function selectEngagementClubTeamRenunciation(event) {
        event?.preventDefault?.();
        if (portalState.engagementClubTeamRenunciationSaving) return;
        const context = portalState.engagementClubTeamRenunciationContext;
        if (!context || context.competitionId !== portalState.selectedEngagementCompetitionId || context.clubId !== String(portalActions.activeEngagementClubProfile().clubId || "")) return;
        if (context.fingerprint !== portalState.selectedEngagementClubEntry?.napFingerprint || context.leader !== JSON.stringify(portalState.selectedEngagementClubEntry?.teamLeader || {})) {
          closeEngagementClubTeamRenunciationDialog();
          if (portalContext.elements.engagementsClubTeamMessage) {
            portalContext.elements.engagementsClubTeamMessage.textContent = "Le dossier a changé. Rouvrez la confirmation après avoir vérifié le chef d’équipe actuel.";
            portalContext.elements.engagementsClubTeamMessage.dataset.tone = "warning";
          }
          return;
        }
        if (portalState.engagementClubTeamSaving || portalActions.engagementClubTeamLeaderLockReason() || !portalActions.canUse("engagements.club.manage")) return;
        portalState.engagementClubTeamRenunciationContext = null;
        if (portalContext.elements.engagementsClubTeamRenunciationDialog?.open) portalContext.elements.engagementsClubTeamRenunciationDialog.close();
        const radio = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="renounced"]');
        if (radio) radio.checked = true;
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = true;
        portalActions.updateEngagementClubTeamFormMode();
        portalState.engagementClubTeamRenunciationSaving = true;
        try {
          const saved = await portalActions.saveEngagementClubTeamLeader();
          if (!saved && context.competitionId === portalState.selectedEngagementCompetitionId && context.clubId === String(portalActions.activeEngagementClubProfile().clubId || "")) restoreEngagementClubTeamLeaderChoice();
        } finally {
          portalState.engagementClubTeamRenunciationSaving = false;
        }
      }

    function openEngagementClubTeamRenunciationDialog() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage") || portalState.engagementClubTeamSaving || portalState.engagementClubTeamRenunciationSaving || portalActions.engagementClubTeamLeaderLockReason()) return false;
        const leader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        if (portalState.selectedEngagementCompetition?.nativeReadOnly === true && leader.externalClub) return false;
        portalState.engagementClubTeamRenunciationContext = {competitionId: portalState.selectedEngagementCompetitionId, clubId: String(portalActions.activeEngagementClubProfile().clubId || ""), fingerprint: portalState.selectedEngagementClubEntry?.napFingerprint, leader: JSON.stringify(leader)};
        if (portalContext.elements.engagementsClubTeamRenunciationDialogTitle) portalContext.elements.engagementsClubTeamRenunciationDialogTitle.textContent = leader.mode === "person" ? "Retirer le chef d’équipe ?" : "Ne déclarer aucun chef d’équipe ?";
        if (portalContext.elements.engagementsClubTeamRenunciationDialogSummary) portalContext.elements.engagementsClubTeamRenunciationDialogSummary.textContent = leader.mode === "person"
          ? `Vous allez retirer ${[leader.firstName, leader.lastName].filter(Boolean).join(" ")} et participer sans chef d’équipe.`
          : "Vous allez participer sans chef d’équipe.";
        if (!portalContext.elements.engagementsClubTeamRenunciationDialog?.open) {
          portalContext.elements.engagementsClubTeamRenunciationDialog?.showModal();
        }
        return true;
      }

    function closeEngagementClubTeamRenunciationDialog() {
        portalState.engagementClubTeamRenunciationContext = null;
        if (portalContext.elements.engagementsClubTeamRenunciationDialog?.open) portalContext.elements.engagementsClubTeamRenunciationDialog.close();
        restoreEngagementClubTeamLeaderChoice();
      }

    function closeEngagementClubExternalTeamDialog({ reset = false } = {}) {
        if (portalContext.elements.engagementsClubTeamExternalDialog?.open) portalContext.elements.engagementsClubTeamExternalDialog.close();
        if (reset) restoreEngagementClubTeamLeaderChoice();
      }

    function openEngagementClubExternalTeamDialog() {
        const dialog = portalContext.elements.engagementsClubTeamExternalDialog;
        if (!dialog) return;
        if (portalContext.elements.engagementsClubTeamExternalLastName) portalContext.elements.engagementsClubTeamExternalLastName.value = portalContext.elements.engagementsClubTeamLastName?.value || "";
        if (portalContext.elements.engagementsClubTeamExternalFirstName) portalContext.elements.engagementsClubTeamExternalFirstName.value = portalContext.elements.engagementsClubTeamFirstName?.value || "";
        if (portalContext.elements.engagementsClubTeamExternalDialogClubName) portalContext.elements.engagementsClubTeamExternalDialogClubName.value = portalContext.elements.engagementsClubTeamExternalClubName?.value || "";
        if (portalContext.elements.engagementsClubTeamExternalDialogMessage) portalContext.elements.engagementsClubTeamExternalDialogMessage.textContent = "";
        if (!dialog.open) dialog.showModal();
        portalContext.elements.engagementsClubTeamExternalLastName?.focus();
      }

    async function saveEngagementClubExternalTeamLeader(event) {
        event?.preventDefault?.();
        if (portalContext.elements.engagementsClubTeamExternalDialogForm && !portalContext.elements.engagementsClubTeamExternalDialogForm.checkValidity()) {
          portalContext.elements.engagementsClubTeamExternalDialogForm.reportValidity?.();
          return;
        }
        if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = portalContext.elements.engagementsClubTeamExternalLastName?.value.trim().toLocaleUpperCase("fr-FR") || "";
        if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = portalContext.elements.engagementsClubTeamExternalFirstName?.value.trim() || "";
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = portalContext.elements.engagementsClubTeamExternalDialogClubName?.value.trim() || "";
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = true;
        portalActions.updateEngagementClubTeamFormMode();
        if (portalContext.elements.engagementsClubTeamExternalDialogApply) portalContext.elements.engagementsClubTeamExternalDialogApply.disabled = true;
        const saved = await portalActions.saveEngagementClubTeamLeader();
        if (portalContext.elements.engagementsClubTeamExternalDialogApply) portalContext.elements.engagementsClubTeamExternalDialogApply.disabled = false;
        if (saved) {
          closeEngagementClubExternalTeamDialog();
        } else if (portalContext.elements.engagementsClubTeamExternalDialogMessage) {
          portalContext.elements.engagementsClubTeamExternalDialogMessage.textContent = portalContext.elements.engagementsClubTeamMessage?.textContent || "Enregistrement impossible.";
          portalContext.elements.engagementsClubTeamExternalDialogMessage.dataset.tone = "error";
        }
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

    function engagementClubSwimmerFromReferenceValue(value = "") {
        const [rawSource = "", rawId = ""] = String(value || "").split(":");
        if (!rawSource || !rawId) return null;
        const source = decodeURIComponent(rawSource);
        const swimmerIndexId = decodeURIComponent(rawId);
        return portalState.engagementClubSwimmers.find((swimmer) =>
          String(swimmer.source || "performances") === source && String(swimmer.swimmerIndexId || swimmer.id || "") === swimmerIndexId
        ) || null;
      }

    function engagementClubPersonForSwimmer(swimmer = {}) {
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "");
        const swimmerSource = String(swimmer.source || "performances");
        return portalState.engagementClubPeople.find((person) =>
          (person.swimmerIndexId === swimmerIndexId && String(person.swimmerSource || "performances") === swimmerSource) ||
          (person.licenseNumber && swimmer.licenseNumber && person.licenseNumber === swimmer.licenseNumber)
        ) || null;
      }

    function renderEngagementClubPersonSwimmerOptions() {
        const availableSwimmers = portalState.engagementClubSwimmers
          .filter((swimmer) => swimmer.active !== false)
          .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
        if (portalContext.elements.engagementsClubPersonSwimmerResults) {
          const query = normalizedEngagementClubSearch(portalContext.elements.engagementsClubPersonSwimmerSearch?.value || "");
          const terms = query.split(/\s+/).filter(Boolean);
          const matchingSwimmers = query
            ? availableSwimmers.filter((swimmer) => {
              const haystack = portalActions.engagementClubSwimmerSearchText(swimmer);
              return terms.every((term) => haystack.includes(term));
            })
            : [];
          if (!query) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = true;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = "";
            portalContext.elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "false");
          } else if (!matchingSwimmers.length) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = false;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = '<p class="admin-engagements-club-person-swimmer-empty">Aucun nageur trouvé. Vous pouvez saisir la personne manuellement.</p>';
            portalContext.elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "true");
          } else {
            const visibleSwimmers = matchingSwimmers.slice(0, 8);
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = false;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = [
              ...visibleSwimmers.map((swimmer) => {
                const value = engagementClubSwimmerReferenceValue(swimmer);
                const name = [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ") || swimmer.name || "Nageur sans nom";
                const license = swimmer.licenseNumber || "Licence à renseigner";
                return `<button type="button" data-engagement-club-person-swimmer-result="${portalActions.escapeHtml(value)}" ${swimmer.licenseNumber ? "" : "disabled"}>
              <strong>${portalActions.escapeHtml(name)}</strong>
              <small>${portalActions.escapeHtml(license)}</small>
            </button>`;
              }),
              matchingSwimmers.length > visibleSwimmers.length
                ? `<small class="admin-engagements-club-person-swimmer-more">${matchingSwimmers.length - visibleSwimmers.length} autre${matchingSwimmers.length - visibleSwimmers.length > 1 ? "s" : ""} résultat${matchingSwimmers.length - visibleSwimmers.length > 1 ? "s" : ""} · précisez la recherche</small>`
                : ""
            ].join("");
            portalContext.elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "true");
          }
        }
      }

    function applyEngagementClubPersonSwimmer(value = "") {
        const swimmer = engagementClubSwimmerFromReferenceValue(value);
        if (value && !swimmer) return;
        const previouslyLinked = Boolean(portalContext.elements.engagementsClubPersonSwimmerId?.value);
        const linked = Boolean(swimmer);
        if (portalContext.elements.engagementsClubPersonSwimmerId) portalContext.elements.engagementsClubPersonSwimmerId.value = swimmer?.swimmerIndexId || swimmer?.id || "";
        if (portalContext.elements.engagementsClubPersonSwimmerSource) portalContext.elements.engagementsClubPersonSwimmerSource.value = swimmer?.source || "";
        if (linked) {
          if (portalContext.elements.engagementsClubPersonSwimmerSearch) {
            portalContext.elements.engagementsClubPersonSwimmerSearch.value = [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ");
            portalContext.elements.engagementsClubPersonSwimmerSearch.setAttribute("aria-expanded", "false");
          }
          if (portalContext.elements.engagementsClubPersonSwimmerResults) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = true;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = "";
          }
          if (portalContext.elements.engagementsClubPersonFirstName) portalContext.elements.engagementsClubPersonFirstName.value = swimmer.firstName || "";
          if (portalContext.elements.engagementsClubPersonLastName) portalContext.elements.engagementsClubPersonLastName.value = swimmer.lastName || "";
          if (portalContext.elements.engagementsClubPersonBirthDate) portalContext.elements.engagementsClubPersonBirthDate.value = swimmer.birthDate || "";
          if (portalContext.elements.engagementsClubPersonSex) portalContext.elements.engagementsClubPersonSex.value = swimmer.sex || "";
          if (portalContext.elements.engagementsClubPersonLicense) portalContext.elements.engagementsClubPersonLicense.value = swimmer.licenseNumber || "";
        } else if (previouslyLinked) {
          if (portalContext.elements.engagementsClubPersonFirstName) portalContext.elements.engagementsClubPersonFirstName.value = "";
          if (portalContext.elements.engagementsClubPersonLastName) portalContext.elements.engagementsClubPersonLastName.value = "";
          if (portalContext.elements.engagementsClubPersonBirthDate) portalContext.elements.engagementsClubPersonBirthDate.value = "";
          if (portalContext.elements.engagementsClubPersonSex) portalContext.elements.engagementsClubPersonSex.value = "";
          if (portalContext.elements.engagementsClubPersonLicense) portalContext.elements.engagementsClubPersonLicense.value = "";
        }
        [portalContext.elements.engagementsClubPersonFirstName, portalContext.elements.engagementsClubPersonLastName, portalContext.elements.engagementsClubPersonBirthDate, portalContext.elements.engagementsClubPersonSex, portalContext.elements.engagementsClubPersonLicense]
          .forEach((field) => {
            if (!field) return;
            if (field.matches("select")) field.disabled = linked;
            else field.readOnly = linked;
          });
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

    function engagementClubMemberRoleConflict(person = {}, targetRole = "") {
        const entry = portalState.selectedEngagementClubEntry || {};
        const personId = String(person.id || "");
        const swimmerIndexId = String(person.swimmerIndexId || person.id || "");
        const licenseKey = engagementClubPersonLicenseKey(person.licenseNumber);
        const teamLeader = entry.teamLeader || {};
        const isTeamLeader = teamLeader.mode === "person" && (
          (personId && teamLeader.personId === personId) ||
          (licenseKey && engagementClubPersonLicenseKey(teamLeader.licenseNumber) === licenseKey)
        );
        const isOfficial = (entry.officials || []).some((official) =>
          (personId && official.personId === personId) ||
          (licenseKey && engagementClubPersonLicenseKey(official.licenseNumber) === licenseKey)
        );
        const isSwimmer = (entry.swimmers || []).some((swimmer) =>
          (swimmerIndexId && swimmer.swimmerIndexId === swimmerIndexId) ||
          (licenseKey && engagementClubPersonLicenseKey(swimmer.licenseNumber) === licenseKey)
        );
        if (targetRole === "official") {
          if (isTeamLeader) return "Cette personne est déjà chef d'équipe sur cette compétition et ne peut pas être ajoutée comme officiel.";
          if (isSwimmer) return "Cette personne est déjà engagée comme nageur sur cette compétition et ne peut pas être ajoutée comme officiel.";
        }
        if (targetRole === "swimmer") {
          if (isTeamLeader) return "Cette personne est déjà chef d'équipe sur cette compétition et ne peut pas être engagée comme nageur.";
          if (isOfficial) return "Cette personne est déjà officielle sur cette compétition et ne peut pas être engagée comme nageur.";
        }
        if (targetRole === "teamLeader") {
          if (isOfficial) return "Cette personne est déjà officielle sur cette compétition et ne peut pas être choisie comme chef d'équipe.";
          if (isSwimmer) return "Cette personne est déjà engagée comme nageur sur cette compétition et ne peut pas être choisie comme chef d'équipe.";
        }
        return "";
      }

    async function handleEngagementClubOfficialSelection(event) {
        if(portalState.engagementClubNativeRelayRetry || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry) {
          renderEngagementClubOfficials();
          if(portalContext.elements.engagementsClubOfficialsMessage) portalContext.elements.engagementsClubOfficialsMessage.textContent="Un enregistrement NAP reste à vérifier. Cliquez sur Enregistrer pour le reprendre.";
          return;
        }
        const checkbox = event.target.closest("[data-engagement-club-official-selection]");
        if (!checkbox) return;
        const selectionId = checkbox.dataset.engagementClubOfficialSelection || "";
        let candidate = engagementClubOfficialPeople().find((person) => (person.selectionId || person.id) === selectionId) || null;
        if (!candidate) return;
        const previousOfficials = portalActions.cloneEngagementClubEntry(portalState.selectedEngagementClubEntry?.officials || []);
        if (!checkbox.checked) {
          portalState.selectedEngagementClubEntry = {
            ...(portalState.selectedEngagementClubEntry || {}),
            officials: (portalState.selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id)
          };
          renderEngagementClubOfficials();
          const saved = await portalActions.saveEngagementClubOfficials();
          if (!saved) {
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), officials: previousOfficials };
            renderEngagementClubOfficials();
          }
          return;
        }
        const conflict = engagementClubMemberRoleConflict(candidate, "official");
        if (conflict) {
          checkbox.checked = false;
          global.alert(conflict);
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = conflict;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
          return;
        }
        try {
          if (candidate.roles?.official !== true) {
            const name = engagementClubPersonDisplayName(candidate);
            if (!global.confirm(`${name} n'est pas encore déclaré comme officiel. Voulez-vous lui attribuer ce rôle ?`)) {
              checkbox.checked = false;
              return;
            }
            const existingPerson = candidate.candidateType === "swimmer" ? engagementClubPersonForSwimmer(candidate) : candidate;
            const personResult = await portalActions.callFunction("saveEngagementClubPerson", {
              personId: existingPerson?.id || "",
              person: engagementClubPersonPayloadWithRole({ ...candidate, ...(existingPerson || {}) }, "official")
            });
            const person = personResult.person || null;
            if (!person?.id) throw new Error("Personne non retournée après l'ajout du rôle officiel.");
            portalState.engagementClubPeople = [...portalState.engagementClubPeople.filter((item) => item.id !== person.id), person];
            candidate = { ...person, candidateType: "person", selectionId: person.id };
          }
          portalState.selectedEngagementClubEntry = {
            ...(portalState.selectedEngagementClubEntry || {}),
            officials: [
              ...(portalState.selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id),
              {
                personId: candidate.id,
                firstName: candidate.firstName || "",
                lastName: candidate.lastName || "",
                licenseNumber: candidate.licenseNumber || ""
              }
            ]
          };
          renderEngagementClubOfficials();
          const saved = await portalActions.saveEngagementClubOfficials();
          if (!saved) {
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), officials: previousOfficials };
            renderEngagementClubOfficials();
          }
        } catch (error) {
          checkbox.checked = false;
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = `Ajout impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
        }
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

    function engagementClubIdentityEditDistance(left = "", right = "") {
        const a = normalizedEngagementClubIdentityPart(left);
        const b = normalizedEngagementClubIdentityPart(right);
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
        for (let row = 1; row <= a.length; row += 1) {
          const current = [row];
          for (let column = 1; column <= b.length; column += 1) {
            current[column] = Math.min(
              current[column - 1] + 1,
              previous[column] + 1,
              previous[column - 1] + Number(a[row - 1] !== b[column - 1])
            );
          }
          previous = current;
        }
        return previous[b.length];
      }

    function engagementClubIdentityPartSimilar(left = "", right = "") {
        const a = normalizedEngagementClubIdentityPart(left);
        const b = normalizedEngagementClubIdentityPart(right);
        if (!a || !b) return false;
        if (a === b) return true;
        if (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))) return true;
        const maximumDistance = Math.min(a.length, b.length) >= 7 ? 2 : 1;
        return engagementClubIdentityEditDistance(a, b) <= maximumDistance;
      }

    function engagementClubPersonIdentityMatch(person = {}, ignoredPersonId = "") {
        const candidates = portalState.engagementClubPeople.filter((candidate) => candidate.id && candidate.id !== ignoredPersonId);
        const licenseKey = engagementClubPersonLicenseKey(person.licenseNumber);
        const sameLicense = licenseKey && candidates.find((candidate) =>
          engagementClubPersonLicenseKey(candidate.licenseNumber) === licenseKey
        );
        if (sameLicense) return { type: "license", person: sameLicense };
        const identityKey = engagementClubPersonIdentityKey(person);
        const invertedIdentityKey = engagementClubPersonIdentityKey(person, true);
        const exact = identityKey && candidates.find((candidate) => engagementClubPersonIdentityKey(candidate) === identityKey);
        if (exact) return { type: "exact", person: exact };
        const inverted = invertedIdentityKey && invertedIdentityKey !== identityKey
          ? candidates.find((candidate) => engagementClubPersonIdentityKey(candidate) === invertedIdentityKey)
          : null;
        if (inverted) return { type: "inverted", person: inverted };
        const similar = person.birthDate ? candidates.find((candidate) => {
          if (candidate.birthDate !== person.birthDate) return false;
          const normalOrder = engagementClubIdentityPartSimilar(candidate.lastName, person.lastName) &&
            engagementClubIdentityPartSimilar(candidate.firstName, person.firstName);
          const invertedOrder = engagementClubIdentityPartSimilar(candidate.lastName, person.firstName) &&
            engagementClubIdentityPartSimilar(candidate.firstName, person.lastName);
          return normalOrder || invertedOrder;
        }) : null;
        return similar ? { type: "similar", person: similar } : null;
      }

    function engagementClubPersonDisplayName(person = {}) {
        return [person.lastName, person.firstName].filter(Boolean).join(" ") || person.licenseNumber || "ce membre";
      }

    function engagementClubPersonPayloadWithRole(person = {}, role = "") {
        return {
          firstName: String(person.firstName || "").trim(),
          lastName: String(person.lastName || "").trim().toLocaleUpperCase("fr-FR"),
          birthDate: String(person.birthDate || "").trim(),
          sex: String(person.sex || "").trim().toUpperCase(),
          licenseNumber: portalActions.formatEngagementSwimmerLicense(person.licenseNumber || ""),
          swimmerIndexId: String(person.swimmerIndexId || "").trim(),
          swimmerSource: String(person.swimmerSource || person.source || "").trim(),
          roles: {
            teamLeader: person.roles?.teamLeader === true || role === "teamLeader",
            official: person.roles?.official === true || role === "official"
          }
        };
      }

    function resolveEngagementClubPersonIdentity(person = {}, roleLabel = "membre", ignoredPersonId = "") {
        const match = engagementClubPersonIdentityMatch(person, ignoredPersonId);
        if (!match) return { person: null, cancelled: false };
        const name = engagementClubPersonDisplayName(match.person);
        if (match.type === "similar") {
          if (global.confirm(`Une personne similaire existe peut-être : ${name}. L'utiliser comme ${roleLabel} ?`)) {
            return { person: match.person, cancelled: false };
          }
          const createAnyway = global.confirm(`Créer une nouvelle personne malgré la ressemblance avec ${name} ?`);
          return { person: null, cancelled: !createAnyway };
        }
        const reason = match.type === "inverted"
          ? "avec le nom et le prénom inversés"
          : match.type === "license"
            ? "avec le même numéro de licence"
            : "avec la même identité";
        const reuse = global.confirm(`Cette création est impossible : ${name} existe déjà ${reason}. L'utiliser comme ${roleLabel} ?`);
        return { person: reuse ? match.person : null, cancelled: !reuse };
      }

    function engagementAdminPublicSwimmerSearchTokens(value) {
        return normalizedEngagementClubSearch(value)
          .replace(/[^a-z0-9]+/g, " ")
          .split(/\s+/)
          .filter((token) => token.length >= 2);
      }

    function engagementAdminPublicSwimmerSearchShard(value) {
        const token = engagementAdminPublicSwimmerSearchTokens(value)[0] || "";
        return token.slice(0, 2);
      }

    async function loadEngagementAdminPublicSwimmerSearchShard(shard = "") {
        const cleanShard = String(shard || "").trim();
        if (!cleanShard) return [];
        if (portalConfig.publicPerformanceSwimmerSearchShards.has(cleanShard)) {
          return portalConfig.publicPerformanceSwimmerSearchShards.get(cleanShard);
        }
        const promise = fetch(`${portalConfig.PERFORMANCE_PUBLIC_SEARCH_BASE}/search/${encodeURIComponent(cleanShard)}.json?v=${portalConfig.ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION}`, {
          cache: "no-cache"
        })
          .then((response) => {
            if (response.status === 404) return [];
            if (!response.ok) throw new Error("Index public nageurs indisponible.");
            return response.json();
          })
          .then((rows) => Array.isArray(rows) ? rows : [])
          .catch(() => []);
        portalConfig.publicPerformanceSwimmerSearchShards.set(cleanShard, promise);
        return promise;
      }

    function engagementAdminPublicSwimmerScore(swimmer = {}, terms = []) {
        const name = normalizedEngagementClubSearch([swimmer.firstName, swimmer.lastName].filter(Boolean).join(" "));
        const reverseName = normalizedEngagementClubSearch([swimmer.lastName, swimmer.firstName].filter(Boolean).join(" "));
        const searchText = normalizedEngagementClubSearch(swimmer.searchText || "");
        if (terms.length && (name === terms.join(" ") || reverseName === terms.join(" "))) return 0;
        if (terms.length && (name.startsWith(terms.join(" ")) || reverseName.startsWith(terms.join(" ")))) return 1;
        if (terms.some((term) => normalizedEngagementClubSearch(swimmer.lastName).startsWith(term))) return 2;
        if (terms.every((term) => searchText.includes(term))) return 3;
        return 4;
      }

    function engagementAdminPublicSwimmerItem(row = {}) {
        return {
          ...row,
          id: String(row.id || row.swimmerIndexId || "").trim(),
          swimmerIndexId: String(row.swimmerIndexId || row.id || "").trim(),
          source: row.source || "performances",
          active: row.active !== false,
          status: row.status || "active",
          clubName: row.clubName || row.club || "",
          updatedAt: row.updatedAt || row.latestDate || ""
        };
      }

    async function searchEngagementAdminPublicSwimmers(query = "", limit = 80) {
        const terms = engagementAdminPublicSwimmerSearchTokens(query).slice(0, 5);
        if (!terms.length) return [];
        const shard = engagementAdminPublicSwimmerSearchShard(query);
        const rows = await loadEngagementAdminPublicSwimmerSearchShard(shard);
        const results = rows
          .map(engagementAdminPublicSwimmerItem)
          .filter((swimmer) => {
            const haystack = normalizedEngagementClubSearch(swimmer.searchText || [
              swimmer.firstName,
              swimmer.lastName,
              swimmer.name,
              swimmer.birthDate,
              swimmer.sex,
              swimmer.clubId,
              swimmer.clubName,
              ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
              ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
            ].filter(Boolean).join(" "));
            return terms.every((term) => haystack.includes(term));
          })
          .sort((left, right) =>
            engagementAdminPublicSwimmerScore(left, terms) - engagementAdminPublicSwimmerScore(right, terms) ||
            String(right.latestDate || "").localeCompare(String(left.latestDate || "")) ||
            String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR") ||
            String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR")
          );
        return results.slice(0, limit);
      }

    function mergeEngagementNationalSwimmerResults(rows = []) {
        const byKey = new Map();
        rows.forEach((raw) => {
          const swimmer = engagementAdminPublicSwimmerItem(raw);
          const source = swimmer.source || "performances";
          const stablePerformanceId = Array.isArray(swimmer.sourceIds)
            ? swimmer.sourceIds.find(Boolean)
            : "";
          const key = source === "performances"
            ? `${source}:${stablePerformanceId || swimmer.swimmerId || swimmer.identityKey || swimmer.id || swimmer.swimmerIndexId}`
            : `${source}:${swimmer.id || swimmer.swimmerIndexId}`;
          if (!key.endsWith(":")) {
            const existing = byKey.get(key) || {};
            const merged = { ...existing, ...swimmer };
            ["clubId", "club", "clubName", "latestDate"].forEach((field) => {
              if (!merged[field] && existing[field]) merged[field] = existing[field];
            });
            if (Number(existing.performanceCount || 0) > Number(swimmer.performanceCount || 0)) {
              merged.performanceCount = existing.performanceCount;
            }
            byKey.set(key, merged);
          }
        });
        return Array.from(byKey.values());
      }

    function engagementNationalSwimmerKey(swimmer = {}) {
        return `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId || ""}`;
      }

    function engagementNationalSwimmerByKey(key = "") {
        return portalState.engagementNationalSwimmers.find((swimmer) => engagementNationalSwimmerKey(swimmer) === key) || null;
      }

    function engagementNationalSwimmerIdentityKey(swimmer = {}) {
        return String(swimmer.identityKey || [
          normalizedEngagementClubSearch(swimmer.lastName || swimmer.name || ""),
          normalizedEngagementClubSearch(swimmer.firstName || ""),
          swimmer.birthDate || ""
        ].filter(Boolean).join("|")).trim();
      }

    function engagementNationalSwimmerDuplicateAlertLabel(swimmer = {}, swimmers = []) {
        const key = engagementNationalSwimmerKey(swimmer);
        const license = String(swimmer.licenseNumber || "").trim();
        const identity = engagementNationalSwimmerIdentityKey(swimmer);
        const normalizedName = normalizedEngagementClubSearch([swimmer.lastName, swimmer.firstName].filter(Boolean).join(" "));
        const sameLicense = license && swimmers.some((candidate) =>
          engagementNationalSwimmerKey(candidate) !== key &&
          String(candidate.licenseNumber || "").trim() === license
        );
        if (sameLicense) return { score: "high", label: "Même licence" };
        const sameIdentity = identity && swimmers.some((candidate) =>
          engagementNationalSwimmerKey(candidate) !== key &&
          engagementNationalSwimmerIdentityKey(candidate) === identity
        );
        if (sameIdentity) return { score: "high", label: "Même identité" };
        const sameBirthNearName = swimmer.birthDate && normalizedName && swimmers.some((candidate) => {
          if (engagementNationalSwimmerKey(candidate) === key || candidate.birthDate !== swimmer.birthDate) return false;
          const candidateName = normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" "));
          return candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName) ||
            candidateName.split(/\s+/).some((part) => part.length >= 4 && normalizedName.includes(part)));
        });
        if (sameBirthNearName) return { score: "medium", label: "A verifier" };
        return { score: "low", label: "Simple" };
      }

    function selectedEngagementNationalSwimmerMergeKeys() {
        return Array.from(portalContext.elements.engagementsNationalSwimmersList?.querySelectorAll("[data-engagement-national-swimmer-merge-check]:checked") || [])
          .map((item) => item.value)
          .filter(Boolean);
      }

    function selectedEngagementNationalSwimmerKeepKey() {
        return portalContext.elements.engagementsNationalSwimmersList?.querySelector("[data-engagement-national-swimmer-keep]:checked")?.value || "";
      }

    function updateEngagementNationalSwimmerSelectionState() {
        if (portalContext.elements.engagementsNationalSwimmersBulk) portalContext.elements.engagementsNationalSwimmersBulk.hidden = !portalState.engagementNationalSwimmerMergeMode;
        if (portalContext.elements.engagementsNationalSwimmersMergeMode) {
          portalContext.elements.engagementsNationalSwimmersMergeMode.setAttribute("aria-pressed", portalState.engagementNationalSwimmerMergeMode ? "true" : "false");
          portalContext.elements.engagementsNationalSwimmersMergeMode.textContent = portalState.engagementNationalSwimmerMergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
        }
        const keepKey = selectedEngagementNationalSwimmerKeepKey();
        const mergeKeys = selectedEngagementNationalSwimmerMergeKeys().filter((key) => key !== keepKey);
        if (portalContext.elements.engagementsNationalSwimmersBulkMerge) {
          portalContext.elements.engagementsNationalSwimmersBulkMerge.disabled = !keepKey || !mergeKeys.length || portalState.engagementNationalSwimmerMergeLoading;
        }
        if (portalContext.elements.engagementsNationalSwimmersSelectionSummary) {
          const keep = engagementNationalSwimmerByKey(keepKey);
          const keepName = keep ? ([keep.firstName, keep.lastName].filter(Boolean).join(" ") || keep.name || keepKey) : "";
          portalContext.elements.engagementsNationalSwimmersSelectionSummary.textContent = keepKey && mergeKeys.length
            ? `${mergeKeys.length} fiche${mergeKeys.length > 1 ? "s" : ""} à fusionner vers ${keepName}.`
            : "Choisissez une fiche à conserver et au moins une fiche à fusionner.";
        }
      }

    function setEngagementNationalSwimmerMergeMode(enabled) {
        portalState.engagementNationalSwimmerMergeMode = enabled === true;
        if (!portalState.engagementNationalSwimmerMergeMode) {
          portalState.engagementNationalSwimmerMergeSourceId = "";
          portalState.engagementNationalSwimmerMergeTargets = [];
          portalState.engagementNationalSwimmerMergeQuery = "";
        }
        portalActions.renderEngagementNationalSwimmers();
      }

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
