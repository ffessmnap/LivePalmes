(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function openEngagementClubPersonForm(person = null) {
        const native = global.LivePalmesEnvironment?.sportingDataSource === "nap";
        if(native && (portalState.engagementClubPersonSaving || person && !person.nativeIdentityEditable)) return;
        portalActions.resetEngagementClubPersonForm();
        if (!native && !portalState.engagementClubSwimmersLoaded) void portalActions.loadEngagementClubSwimmers({ silent: true });
        if (person) {
          if (portalContext.elements.engagementsClubPersonId) portalContext.elements.engagementsClubPersonId.value = person.id || "";
          if (portalContext.elements.engagementsClubPersonFirstName) portalContext.elements.engagementsClubPersonFirstName.value = person.firstName || "";
          if (portalContext.elements.engagementsClubPersonLastName) portalContext.elements.engagementsClubPersonLastName.value = person.lastName || "";
          if (portalContext.elements.engagementsClubPersonBirthDate) portalContext.elements.engagementsClubPersonBirthDate.value = person.birthDate || "";
          if (portalContext.elements.engagementsClubPersonSex) portalContext.elements.engagementsClubPersonSex.value = person.sex || "";
          if (portalContext.elements.engagementsClubPersonLicense) portalContext.elements.engagementsClubPersonLicense.value = person.licenseNumber || "";
          if (portalContext.elements.engagementsClubPersonSwimmerId) portalContext.elements.engagementsClubPersonSwimmerId.value = person.swimmerIndexId || "";
          if (portalContext.elements.engagementsClubPersonSwimmerSource) portalContext.elements.engagementsClubPersonSwimmerSource.value = person.swimmerSource || "";
          if (portalContext.elements.engagementsClubPersonRoleTeamLeader) portalContext.elements.engagementsClubPersonRoleTeamLeader.checked = person.roles?.teamLeader === true;
          if (portalContext.elements.engagementsClubPersonRoleOfficial) portalContext.elements.engagementsClubPersonRoleOfficial.checked = person.roles?.official === true;
        }
        portalActions.renderEngagementClubPersonSwimmerOptions();
        if(native) {
          if(portalContext.elements.engagementsClubPersonForm) {
            portalContext.elements.engagementsClubPersonForm.dataset.napFingerprint=person?.napFingerprint || "";
            portalContext.elements.engagementsClubPersonForm.dataset.napCreationId=person ? "" : global.crypto.randomUUID();
          }
          if(portalContext.elements.engagementsClubPersonSwimmerSearch) portalContext.elements.engagementsClubPersonSwimmerSearch.disabled=true;
          if(portalContext.elements.engagementsClubPersonSwimmerResults) portalContext.elements.engagementsClubPersonSwimmerResults.hidden=true;
          if(portalContext.elements.engagementsClubPersonBirthDate) portalContext.elements.engagementsClubPersonBirthDate.required=person ? Boolean(person.birthDate) : true;
          for(const field of [portalContext.elements.engagementsClubPersonSex,portalContext.elements.engagementsClubPersonLicense]) {
            if(!field) continue;field.required=!person;
            if(field.matches("select")) field.disabled=!!person;else field.readOnly=!!person;
          }
          for(const field of [portalContext.elements.engagementsClubPersonRoleTeamLeader,portalContext.elements.engagementsClubPersonRoleOfficial]) if(field) field.disabled=false;
          for(const field of [portalContext.elements.engagementsClubPersonFirstName,portalContext.elements.engagementsClubPersonLastName,portalContext.elements.engagementsClubPersonBirthDate])if(field){field.readOnly=!!person;field.required=!person;}
          for(const field of [portalContext.elements.engagementsClubPersonFirstName,portalContext.elements.engagementsClubPersonLastName]) if(field) field.maxLength=100;
          if(portalContext.elements.engagementsClubPersonMessage) portalContext.elements.engagementsClubPersonMessage.textContent=person ? "Modifiez les rôles du club. Les déclarations déjà enregistrées en compétition sont conservées. Utilisez le crayon pour l’identité." : "Nom, prénom, naissance, sexe et licence sont obligatoires. Le numéro de licence sera verrouillé après enregistrement. Aucun engagement en compétition n’est créé.";
        }
        if (person?.swimmerIndexId) {
          const swimmerValue = portalActions.engagementClubSwimmerReferenceValue({
            swimmerIndexId: person.swimmerIndexId,
            source: person.swimmerSource || "performances"
          });
          portalActions.applyEngagementClubPersonSwimmer(swimmerValue);
          if (!portalActions.engagementClubSwimmerFromReferenceValue(swimmerValue)) {
            [portalContext.elements.engagementsClubPersonFirstName, portalContext.elements.engagementsClubPersonLastName, portalContext.elements.engagementsClubPersonBirthDate, portalContext.elements.engagementsClubPersonSex, portalContext.elements.engagementsClubPersonLicense]
              .forEach((field) => {
                if (!field) return;
                if (field.matches("select")) field.disabled = true;
                else field.readOnly = true;
              });
          }
        }
        if (portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden = false;
        if(native && portalContext.elements.engagementsClubPersonDialog && !portalState.engagementClubPersonFormHome) {
          const form=portalContext.elements.engagementsClubPersonForm,dialog=portalContext.elements.engagementsClubPersonDialog;
          portalState.engagementClubPersonFormHome={parent:form.parentNode,next:form.nextSibling,opener:global.document?.activeElement,fromCompetition:false};
          const title=global.document?.querySelector?.("#adminEngagementsClubPersonDialogTitle");
          if(title) title.textContent=person ? "Modifier les rôles" : "Ajouter une personne au club";
          dialog.append(form);
          dialog.showModal();
        }
        (person || native ? portalContext.elements.engagementsClubPersonFirstName : portalContext.elements.engagementsClubPersonSwimmerSearch)?.focus?.();
      }

    function selectedEngagementClubPersonFromForm() {
        return {
          firstName: String(portalContext.elements.engagementsClubPersonFirstName?.value || "").trim(),
          lastName: String(portalContext.elements.engagementsClubPersonLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
          birthDate: String(portalContext.elements.engagementsClubPersonBirthDate?.value || "").trim(),
          sex: String(portalContext.elements.engagementsClubPersonSex?.value || "").trim(),
          licenseNumber: portalActions.formatEngagementSwimmerLicense(portalContext.elements.engagementsClubPersonLicense?.value || ""),
          swimmerIndexId: String(portalContext.elements.engagementsClubPersonSwimmerId?.value || "").trim(),
          swimmerSource: String(portalContext.elements.engagementsClubPersonSwimmerSource?.value || "").trim(),
          roles: {
            teamLeader: portalContext.elements.engagementsClubPersonRoleTeamLeader?.checked === true,
            official: portalContext.elements.engagementsClubPersonRoleOfficial?.checked === true
          }
        };
      }

    function renderEngagementClubPeople() {
        portalActions.updateNativeCompetitionPersonCreationButton();
        if (!portalContext.elements.engagementsClubPeopleList) return;
        const nativeReadOnly = global.LivePalmesEnvironment?.sportingDataSource === "nap";
        if(portalContext.elements.engagementsClubPeopleAddButton) portalContext.elements.engagementsClubPeopleAddButton.disabled = nativeReadOnly && (!portalState.engagementClubPeopleLoaded || portalState.engagementClubPeopleLoading || portalState.engagementClubPersonSaving);
        if(portalContext.elements.engagementsClubPeopleLoadMore) {
          portalContext.elements.engagementsClubPeopleLoadMore.hidden = !portalState.engagementClubPeopleHasMore;
          portalContext.elements.engagementsClubPeopleLoadMore.disabled = portalState.engagementClubPeopleLoading;
        }
        // This directory contains reusable, editable officials only. Competition
        // declarations remain available to the shared competition selectors.
        const directoryPeople = portalState.engagementClubPeople.filter(person => !nativeReadOnly || (
          person.nativePersonKind === "officials" && person.nativeIdentityEditable === true
        ));
        if (!directoryPeople.length) {
          portalContext.elements.engagementsClubPeopleList.innerHTML = portalState.engagementClubPeopleLoaded
            ? '<p class="admin-engagements-empty">Aucun officiel enregistré dans l’annuaire de ce club.</p>'
            : '<p class="admin-engagements-empty">Les officiels s’afficheront après le chargement de l’annuaire.</p>';
          return;
        }
        portalContext.elements.engagementsClubPeopleList.innerHTML = `
      <div class="admin-engagements-club-people-table" role="table" aria-label="Mes officiels">
        <div class="admin-engagements-club-person-row admin-engagements-club-person-head" role="row">
          <span role="columnheader">Personne</span>
          <span role="columnheader">Licence</span>
          <span role="columnheader">Rôle</span>
          <span role="columnheader">Statut</span>
          <span role="columnheader">Actions</span>
        </div>
        ${directoryPeople
              .sort((left, right) =>
                Number(right.active === true) - Number(left.active === true) ||
                String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr", { sensitivity: "base" }) ||
                String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr", { sensitivity: "base" })
              )
              .map((person, index) => {
          const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Personne sans nom";
          const role = portalActions.engagementClubPersonRoleLabel(person);
          const active = person.active === true;
          const detailsId = `adminEngagementsClubPersonDirectoryDetails${index}`;
          return `
        <div class="admin-engagements-club-person-row" role="row" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}" data-active="${active ? "true" : "false"}" data-expanded="false">
          <button class="admin-engagements-club-person-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" data-engagement-club-person-directory-toggle>
            <strong>${portalActions.escapeHtml(name)}</strong>
            <span class="admin-engagements-club-person-toggle-meta">
              <span class="admin-engagements-club-person-role-badge" title="${portalActions.escapeHtml(role)}">${portalActions.escapeHtml(role)}</span>
              <span class="admin-engagements-club-person-chevron" aria-hidden="true">›</span>
            </span>
          </button>
          <div id="${detailsId}" class="admin-engagements-club-person-details">
            <span role="cell"><strong>${portalActions.escapeHtml(name)}</strong></span>
            <span role="cell">${portalActions.escapeHtml(person.licenseNumber || "-")}</span>
            <span role="cell">${portalActions.escapeHtml(role)}</span>
            <span role="cell"><span class="admin-engagements-club-person-status" data-active="${active ? "true" : "false"}">${active ? "Actif" : "Inactif"}</span></span>
            <span role="cell">
              <span class="admin-engagements-request-actions">
                ${nativeReadOnly && !person.nativeIdentityEditable
                      ? `<span class="admin-engagements-request-note admin-engagements-historical-person-note">Déclaration historique de chef d’équipe · compétition n° ${portalActions.escapeHtml(person.nativeCompetitionId || "non renseignée")}. À modifier depuis le dossier de cette compétition.</span>`
                      : `<button class="admin-engagements-club-person-edit-button" type="button" title="Compléter ou demander une correction pour ${portalActions.escapeHtml(name)}" aria-label="Compléter ou demander une correction pour ${portalActions.escapeHtml(name)}" data-engagement-club-person-action="edit" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}" ${nativeReadOnly && portalState.engagementClubPersonSaving ? 'disabled' : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4"></path></svg></button>${nativeReadOnly?`<button class="ghost-button" type="button" data-engagement-club-person-action="roles" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}">Rôles</button>`:""}`}
                ${nativeReadOnly && !person.nativeStatusEditable ? "" : `<button class="ghost-button" type="button" data-engagement-club-person-action="${active ? "disable" : "enable"}" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}" ${person.statusSaving ? 'disabled title="Modification momentanément indisponible"' : ""}>${active ? "Désactiver" : "Réactiver"}</button>`}
              </span>
            </span>
          </div>
        </div>
      `;
        }).join("")}
      </div>
    `;
      }

    async function loadEngagementClubPeople({ force = false, silent = false, append = false } = {}) {
        if (!portalActions.canUse("engagements.club.manage") || portalState.engagementClubPeopleLoading) return;
        if(append && !portalState.engagementClubPeopleHasMore) return;
        if (portalState.engagementClubPeopleLoaded && !force && !append) {
          if (portalState.activeEngagementsTab === "clubPeople") renderEngagementClubPeople();
          portalActions.renderEngagementClubPersonSwimmerOptions();
          portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
          if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
          return;
        }
        portalState.engagementClubPeopleLoading = true;
        const requestVersion = portalState.engagementClubPeopleRequestVersion;
        if (portalContext.elements.engagementsClubPeopleRetry) {
          portalContext.elements.engagementsClubPeopleRetry.hidden = true;
          portalContext.elements.engagementsClubPeopleRetry.disabled = true;
        }
        if(portalContext.elements.engagementsClubPeopleAddButton && global.LivePalmesEnvironment?.sportingDataSource === "nap") portalContext.elements.engagementsClubPeopleAddButton.disabled = true;
        if(portalContext.elements.engagementsClubPeopleLoadMore) portalContext.elements.engagementsClubPeopleLoadMore.disabled = true;
        if (portalContext.elements.engagementsClubPeopleStatus && !silent) {
          portalContext.elements.engagementsClubPeopleStatus.textContent = "Chargement de Mes officiels...";
          portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("listEngagementClubPeople", { includeInactive: true, ...(append ? {cursor:portalState.engagementClubPeopleCursor} : {}) });
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          const people = Array.isArray(result.people) ? result.people : [];
          portalState.engagementClubPeople = append ? [...new Map([...portalState.engagementClubPeople,...people].map(person=>[person.id,person])).values()] : people;
          portalState.engagementClubPeopleCursor = result.nextCursor || null;
          portalState.engagementClubPeopleHasMore = result.source === "nap" && result.hasMore === true;
          portalState.engagementClubPeopleLoaded = true;
          if (portalState.activeEngagementsTab === "clubPeople") renderEngagementClubPeople();
          portalActions.renderEngagementClubPersonSwimmerOptions();
          portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
          if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
          if (portalContext.elements.engagementsClubPeopleStatus && !silent) {
            portalContext.elements.engagementsClubPeopleStatus.textContent = "";
            portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "neutral";
          }
        } catch (error) {
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if (portalContext.elements.engagementsClubPeopleRetry) portalContext.elements.engagementsClubPeopleRetry.hidden = false;
          if (portalContext.elements.engagementsClubPeopleStatus && !silent) {
            portalContext.elements.engagementsClubPeopleStatus.textContent = `Lecture impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "error";
          }
        } finally {
          if(requestVersion===portalState.engagementClubPeopleRequestVersion) {
            portalState.engagementClubPeopleLoading = false;
            if (portalContext.elements.engagementsClubPeopleRetry) portalContext.elements.engagementsClubPeopleRetry.disabled = false;
            renderEngagementClubPeople();
            if(portalContext.elements.engagementsClubPeopleLoadMore) portalContext.elements.engagementsClubPeopleLoadMore.disabled = false;
            if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
          }
        }
      }

    async function saveEngagementClubPerson(event) {
        event?.preventDefault?.();
        if (!portalActions.canUse("engagements.club.manage")) return;
        const native=global.LivePalmesEnvironment?.sportingDataSource === "nap";
        if(native && portalState.engagementClubPersonSaving) return;
        const requestVersion=portalState.engagementClubPeopleRequestVersion;
        if (!native && !portalContext.elements.engagementsClubPersonRoleTeamLeader?.checked && !portalContext.elements.engagementsClubPersonRoleOfficial?.checked) {
          if (portalContext.elements.engagementsClubPersonMessage) {
          portalContext.elements.engagementsClubPersonMessage.textContent = "Sélectionnez au moins un rôle.";
            portalContext.elements.engagementsClubPersonMessage.dataset.tone = "error";
          }
          return;
        }
        if (portalContext.elements.engagementsClubPersonForm && !portalContext.elements.engagementsClubPersonForm.checkValidity()) {
          portalContext.elements.engagementsClubPersonForm.reportValidity?.();
          return;
        }
        const button = portalContext.elements.engagementsClubPersonForm?.querySelector('button[type="submit"]');
        if(native) {portalState.engagementClubPersonSaving=true;if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.inert=true;renderEngagementClubPeople();}
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsClubPersonMessage) {
          portalContext.elements.engagementsClubPersonMessage.textContent = "Enregistrement...";
          portalContext.elements.engagementsClubPersonMessage.dataset.tone = "loading";
        }
        try {
          let personId = portalContext.elements.engagementsClubPersonId?.value || "";
          if(native) {
            const current=portalState.engagementClubPeople.find(item=>item.id===personId);
            const creating=!personId;
            if(!creating && !current?.nativeIdentityEditable) throw new Error("Cette fiche ne peut pas être corrigée ici.");
            const identity={
              firstName:String(portalContext.elements.engagementsClubPersonFirstName?.value || "").trim(),
              lastName:String(portalContext.elements.engagementsClubPersonLastName?.value || "").trim(),
              birthDate:String(portalContext.elements.engagementsClubPersonBirthDate?.value || "").trim(),
              sex:String(portalContext.elements.engagementsClubPersonSex?.value||""),licenseNumber:String(portalContext.elements.engagementsClubPersonLicense?.value||"").trim()
            };
            const roles={teamLeader:portalContext.elements.engagementsClubPersonRoleTeamLeader?.checked===true,official:portalContext.elements.engagementsClubPersonRoleOfficial?.checked===true};
            const payload=creating ? {creationId:portalContext.elements.engagementsClubPersonForm?.dataset.napCreationId,person:{...identity,roles}} : {personId,expectedFingerprint:portalContext.elements.engagementsClubPersonForm?.dataset.napFingerprint,roles,active:current.active};
            const result=await portalActions.callFunction("saveEngagementClubPerson",payload);
            if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
            if(result.source!=="nap" || !/^nap-official-\d+$/.test(result.person?.id || "") || !creating && result.person.id!==personId) throw new Error("Réponse NAP à vérifier avant de poursuivre.");
            portalState.engagementClubPeople=portalState.engagementClubPeople.filter(item=>item.id!==result.person.id).concat(result.person);
            const fromCompetition=portalState.engagementClubPersonFormHome?.fromCompetition===true;
            portalActions.closeEngagementClubPersonDialog();
            portalActions.resetEngagementClubPersonForm();
            if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden=true;
            if(fromCompetition && portalContext.elements.engagementsClubTeamMessage) {
              portalContext.elements.engagementsClubTeamMessage.textContent="Personne ajoutée au club. Aucun engagement en compétition n’a été créé.";
              portalContext.elements.engagementsClubTeamMessage.dataset.tone="neutral";
            }
            renderEngagementClubPeople();
            portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
            if(portalState.activeEngagementsDetailTab==="officials") portalActions.renderEngagementClubOfficials();
            return;
          }
          let person = selectedEngagementClubPersonFromForm();
          if (!personId && person.swimmerIndexId) {
            const swimmer = portalActions.engagementClubSwimmerFromReferenceValue(portalActions.engagementClubSwimmerReferenceValue({
              swimmerIndexId: person.swimmerIndexId,
              source: person.swimmerSource || "performances"
            }));
            personId = portalActions.engagementClubPersonForSwimmer(swimmer || {})?.id || "";
          }
          if (!personId) {
            const roleLabel = person.roles.official ? "officiel" : "chef d'équipe";
            const resolution = portalActions.resolveEngagementClubPersonIdentity(person, roleLabel);
            if (resolution.cancelled) {
              if (portalContext.elements.engagementsClubPersonMessage) {
                portalContext.elements.engagementsClubPersonMessage.textContent = "Création annulée : utilisez la personne proposée ou corrigez l'identité.";
                portalContext.elements.engagementsClubPersonMessage.dataset.tone = "warning";
              }
              return;
            }
            if (resolution.person) {
              personId = resolution.person.id;
              person = {
                ...portalActions.engagementClubPersonPayloadWithRole(resolution.person),
                roles: {
                  teamLeader: resolution.person.roles?.teamLeader === true || person.roles.teamLeader,
                  official: resolution.person.roles?.official === true || person.roles.official
                }
              };
            }
          }
          await portalActions.callFunction("saveEngagementClubPerson", {
            personId,
            person
          });
          portalActions.resetEngagementClubPersonForm();
          if (portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden = true;
          portalState.engagementClubPeopleLoaded = false;
          await loadEngagementClubPeople({ force: true });
          portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
        } catch (error) {
          if(native && requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if (portalContext.elements.engagementsClubPersonMessage) {
            portalContext.elements.engagementsClubPersonMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubPersonMessage.dataset.tone = "error";
          }
        } finally {
          if(!native || requestVersion===portalState.engagementClubPeopleRequestVersion) {
            if (button) button.disabled = false;
            if(native) {portalState.engagementClubPersonSaving=false;if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.inert=false;renderEngagementClubPeople();}
          }
        }
      }

    async function setEngagementClubPersonStatus(personId, active) {
        const person = portalState.engagementClubPeople.find((item) => item.id === personId);
        if (!person || person.statusSaving) return;
        const label = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.licenseNumber;
        if (!global.confirm(`${active ? "Réactiver" : "Désactiver"} ${label} ? Les engagements déjà saisis seront conservés.`)) return;
        const requestVersion=portalState.engagementClubPeopleRequestVersion;
        person.statusSaving=true;renderEngagementClubPeople();
        try {
          const result=await portalActions.callFunction("setEngagementClubPersonStatus", { personId, active, ...(person.napSource?{expectedFingerprint:person.napFingerprint}:{}) });
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if(result.source==="nap" && result.person?.id===personId) {
            portalState.engagementClubPeople=portalState.engagementClubPeople.map(item=>item.id===personId?result.person:item);
            renderEngagementClubPeople();
            portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
            if(portalState.activeEngagementsDetailTab==="officials") portalActions.renderEngagementClubOfficials();
            return;
          }
          portalState.engagementClubPeopleLoaded = false;
          await loadEngagementClubPeople({ force: true });
        } catch (error) {
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if (portalContext.elements.engagementsClubPeopleStatus) {
            portalContext.elements.engagementsClubPeopleStatus.textContent = `Changement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "error";
          }
        } finally {
          delete person.statusSaving;
          if(requestVersion===portalState.engagementClubPeopleRequestVersion) renderEngagementClubPeople();
        }
      }

    async function loadEngagementCompetitions({ force = false, mode = portalActions.engagementNavigationMode(), activate = null, silent = false } = {}) {
        const requestedMode = mode === "admin" ? "admin" : "club";
        const allowed = requestedMode === "admin" ? portalActions.canCreateEngagementCompetition() : portalActions.canUse("engagements.club.manage");
        if (!allowed) return;
        const filters = portalActions.engagementCalendarFiltersPayload();
        const septemberPreview = portalActions.engagementCalendarSeptemberPreview(filters);
        const requestedRange = portalActions.engagementCalendarRequestedRange(filters);
        const cacheKey = portalActions.engagementCalendarCacheKey(requestedMode, requestedRange);
        const clubCalendarAlreadyOpen = requestedMode === "club" && global.location.hash === "#club-competitions";
        const shouldActivate = activate === null
          ? requestedMode === portalActions.engagementNavigationMode()
          : activate === true || clubCalendarAlreadyOpen;
        const cachedEntry = portalActions.readEngagementCalendarCache(cacheKey) || (portalState.engagementCompetitionsLoadedCacheKey === cacheKey && portalState.engagementCompetitionsLoaded
          ? { competitions: portalState.engagementCompetitions, cachedAt: portalState.engagementCompetitionsCachedAt }
          : null);
        if (cachedEntry && shouldActivate) {
          portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, cachedEntry);
        }
        const nativeCalendar = cachedEntry?.source === "nap" || cachedEntry?.competitions?.some(competition => competition.napSource === true);
        const cacheFresh = Boolean(!nativeCalendar && cachedEntry?.cachedAt && Date.now() - cachedEntry.cachedAt < portalConfig.ENGAGEMENT_CALENDAR_CACHE_TTL_MS);
        if (!force && cacheFresh) {
          if (requestedMode === "club") portalActions.scheduleEngagementClubWorkspacePreload(cachedEntry.competitions);
          return cachedEntry;
        }
        const cachedListVisible = Boolean(cachedEntry && shouldActivate);
        if (!cachedListVisible && shouldActivate && portalContext.elements.engagementsCalendarList) {
          portalContext.elements.engagementsCalendarList.innerHTML = `
        <div class="admin-engagements-calendar-loading" role="status">
          <strong>Chargement des compétitions...</strong>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </div>
      `;
        }
        if (!silent && !cachedListVisible && shouldActivate && portalContext.elements.engagementsStatus) {
          portalContext.elements.engagementsStatus.hidden = false;
          portalContext.elements.engagementsStatus.textContent = "Chargement du calendrier...";
          portalContext.elements.engagementsStatus.dataset.tone = "loading";
        }
        const pendingRequest = portalConfig.engagementCompetitionCalendarRequests.get(cacheKey);
        if (pendingRequest) {
          return pendingRequest.then((entry) => {
            if (!entry && shouldActivate) {
              return loadEngagementCompetitions({ force: true, mode: requestedMode, activate: true, silent: false });
            }
            const currentFilters = portalActions.engagementCalendarFiltersPayload();
            const stillActive = entry && shouldActivate && requestedMode === portalActions.engagementNavigationMode() &&
              portalActions.engagementCalendarCacheKey(requestedMode, portalActions.engagementCalendarRequestedRange(currentFilters)) === cacheKey;
            if (stillActive) {
              portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, entry);
              if (portalContext.elements.engagementsStatus) {
                portalContext.elements.engagementsStatus.textContent = "";
                delete portalContext.elements.engagementsStatus.dataset.tone;
                portalContext.elements.engagementsStatus.hidden = true;
              }
            }
            return entry;
          });
        }
        const cacheRevision = portalState.engagementCalendarCacheRevision;
        const requestPromise = (async () => {
          try {
            const ranges = [
              { startDate: filters.startDate, endDate: filters.endDate },
              ...(septemberPreview ? [septemberPreview] : [])
            ];
            const result = await portalActions.callFunction("listEngagementCompetitions", {
              ranges: ranges.map((range) => ({ fromDate: range.startDate, toDate: range.endDate })),
              manageOnly: requestedMode === "admin",
              includeCalendarEvents: requestedMode === "admin",
              limit: 250
            });
            // Older/Firestore backends retain their existing second endpoint.
            const calendarEventResult = requestedMode === "admin"
              ? Array.isArray(result.calendarEvents) ? { events: result.calendarEvents }
                : await portalActions.callFunction("listEngagementCalendarEvents", {
                    ranges: ranges.map((range) => ({ fromDate: range.startDate, toDate: range.endDate })),
                    limit: 250
                  })
              : { events: [] };
            if (cacheRevision !== portalState.engagementCalendarCacheRevision) return null;
            let competitions = [
              ...(Array.isArray(result.competitions) ? result.competitions.map((item) => ({ ...item, sourceType: "competition" })) : []),
              ...(Array.isArray(calendarEventResult.events) ? calendarEventResult.events.map((item) => ({ ...item, sourceType: item.napSource ? "competition" : "calendarEvent" })) : [])
            ];
            if (requestedMode === "admin" && !portalActions.canUse("engagements.national.manage")) {
              competitions = competitions.filter((competition) => portalActions.canManageEngagementCompetitionScope(competition));
            }
            const entry = portalActions.writeEngagementCalendarCache(cacheKey, competitions, Date.now(), result.source === "nap" ? "nap" : "");
            if (requestedMode === "club") portalActions.scheduleEngagementClubWorkspacePreload(entry.competitions);
            const currentFilters = portalActions.engagementCalendarFiltersPayload();
            const stillActive = shouldActivate && requestedMode === portalActions.engagementNavigationMode() &&
              portalActions.engagementCalendarCacheKey(requestedMode, portalActions.engagementCalendarRequestedRange(currentFilters)) === cacheKey;
            if (stillActive) portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, entry);
            const deepLinkedCompetitionId = new URLSearchParams(global.location.search).get("competition") || "";
            if (stillActive && requestedMode === "club" && deepLinkedCompetitionId && !portalState.engagementPublicDeepLinkHandled) {
              portalState.engagementPublicDeepLinkHandled = true;
              portalActions.loadEngagementCompetitionDetail(deepLinkedCompetitionId, "general");
            }
            if (stillActive && portalContext.elements.engagementsStatus) {
              portalContext.elements.engagementsStatus.textContent = "";
              delete portalContext.elements.engagementsStatus.dataset.tone;
              portalContext.elements.engagementsStatus.hidden = true;
            }
            return entry;
          } catch (error) {
            if (shouldActivate && requestedMode === portalActions.engagementNavigationMode() && portalContext.elements.engagementsStatus) {
              portalContext.elements.engagementsStatus.hidden = false;
              portalContext.elements.engagementsStatus.textContent = cachedEntry
                ? `Liste affichée depuis le cache ; actualisation impossible : ${error?.message || error}`
                : `Calendrier indisponible : ${error?.message || error}`;
              portalContext.elements.engagementsStatus.dataset.tone = "error";
            }
            if (!cachedEntry && shouldActivate && portalContext.elements.engagementsCalendarList) {
              portalContext.elements.engagementsCalendarList.innerHTML = '<p class="admin-engagements-empty">Le calendrier est momentanément indisponible. Réessayez dans quelques instants.</p>';
            }
            return cachedEntry || null;
          } finally {
            if (portalConfig.engagementCompetitionCalendarRequests.get(cacheKey) === requestPromise) {
              portalConfig.engagementCompetitionCalendarRequests.delete(cacheKey);
            }
          }
        })();
        portalConfig.engagementCompetitionCalendarRequests.set(cacheKey, requestPromise);
        return requestPromise;
      }

    function engagementCompetitionPayloadFromFields(fields = {}) {
        const deadlineValue = portalActions.normalizeEngagementDeadlineField(fields.deadline) || fields.deadline?.value || "";
        const deadlineDate = deadlineValue ? new Date(deadlineValue) : null;
        const level = fields.level?.value || "regional";
        const qualificationTimesMode = fields.qualificationMode?.value || "all";
        const missingEntryTimeMode = fields.missingEntryTimeMode?.value || "manual";
        const maxEventsValue = Math.trunc(Number(fields.maxEvents?.value));
        const maxEventsPerSwimmer = Number.isFinite(maxEventsValue)
          ? Math.max(0, Math.min(5, maxEventsValue))
          : 0;
        return {
          competitionType: fields.competitionType?.value === "openWater" || fields.competitionType?.dataset?.value === "openWater" ? "openWater" : "pool",
          waterBodyType: fields.waterBodyType?.value || "",
          name: fields.name?.value || "",
          date: fields.date?.value || "",
          endDate: fields.endDate?.value || fields.date?.value || "",
          location: fields.location?.value || "",
          city: fields.city?.value || fields.location?.value || "",
          address: fields.address?.value || "",
          organizer: fields.organizer?.value || "",
          organizerEmail: fields.organizerEmail?.value || "",
          teamLeadersWhatsAppUrl: ["national", "international"].includes(level) ? fields.teamLeadersWhatsAppUrl?.value || "" : "",
          publicDescription: fields.publicDescription?.value || "",
          publicationStatus: "published",
          canceled: fields.canceled?.checked === true,
          level,
          regionId: ["national", "international"].includes(level) ? "" : fields.regionId?.value || "",
          invitedRegionIds: ["national", "international"].includes(level) ? [] : portalActions.selectedRegionMultiSelectValues(fields.invitedRegionIds)
            .filter((region) => portalActions.normalizedRegionKey(region) !== portalActions.normalizedRegionKey(fields.regionId?.value || "")),
          entryDeadlineAt: deadlineDate && !Number.isNaN(deadlineDate.getTime()) ? deadlineDate.toISOString() : "",
          computerEmail: fields.computerEmail?.value || "",
          officialsManagerEmail: fields.officialsManagerEmail?.value || "",
          fees: portalActions.selectedCreateEngagementFeesFromForm(),
          entryStatus: fields.entryStatus?.value || "upcoming",
          officialsRequired: fields.officialsRequired?.value === "true",
          poolLength: fields.poolLength?.value || "",
          poolLaneCount: fields.poolLaneCount?.value === ""
            ? ""
            : Math.trunc(Number(fields.poolLaneCount?.value)),
          timingType: fields.timingType?.value || "",
          qualificationTimesMode,
          qualificationStartDate: qualificationTimesMode === "period" ? fields.qualificationStart?.value || "" : "",
          qualificationEndDate: qualificationTimesMode === "period" ? fields.qualificationEnd?.value || "" : "",
          missingEntryTimeMode,
          maxEventsPerSwimmer
        };
      }

    function createCompetitionFields() {
        return {
          competitionType: portalContext.elements.engagementsCompetitionType,
          name: portalContext.elements.engagementsName,
          date: portalContext.elements.engagementsDate,
          endDate: portalContext.elements.engagementsEndDate,
          city: portalContext.elements.engagementsLocation,
          level: portalContext.elements.engagementsLevel,
          regionId: portalContext.elements.engagementsRegionId,
          invitedRegionIds: portalContext.elements.engagementsInvitedRegionIds,
          deadline: portalContext.elements.engagementsDeadline,
          computerEmail: portalContext.elements.engagementsComputerEmail,
          officialsManagerEmail: portalContext.elements.engagementsOfficialsManagerEmail,
          poolLength: portalContext.elements.engagementsPoolLength,
          poolLaneCount: portalContext.elements.engagementsPoolLaneCount,
          timingType: portalContext.elements.engagementsTimingType,
          qualificationMode: portalContext.elements.engagementsQualificationMode,
          qualificationStart: portalContext.elements.engagementsQualificationStart,
          qualificationEnd: portalContext.elements.engagementsQualificationEnd,
          missingEntryTimeMode: portalContext.elements.engagementsMissingEntryTimeMode,
          maxEvents: portalContext.elements.engagementsMaxEvents,
          maxEventsUnlimited: portalContext.elements.engagementsMaxEventsUnlimited,
          entryStatus: portalContext.elements.engagementsEntryStatus,
          officialsRequired: portalContext.elements.engagementsOfficialsRequired
        };
      }

    function editCompetitionFields() {
        return {
          competitionType: portalContext.elements.engagementsEditCompetitionType,
          waterBodyType: portalContext.elements.engagementsEditWaterBodyType,
          name: portalContext.elements.engagementsEditName,
          date: portalContext.elements.engagementsEditDate,
          endDate: portalContext.elements.engagementsEditEndDate,
          location: portalContext.elements.engagementsEditLocation,
          city: portalContext.elements.engagementsEditCity,
          address: portalContext.elements.engagementsEditAddress,
          organizer: portalContext.elements.engagementsEditOrganizer,
          organizerEmail: portalContext.elements.engagementsEditOrganizerEmail,
          teamLeadersWhatsAppUrl: portalContext.elements.engagementsEditWhatsAppUrl,
          publicDescription: portalContext.elements.engagementsEditPublicDescription,
          canceled: portalContext.elements.engagementsEditCanceled,
          level: portalContext.elements.engagementsEditLevel,
          regionId: portalContext.elements.engagementsEditRegionId,
          invitedRegionIds: portalContext.elements.engagementsEditInvitedRegionIds,
          deadline: portalContext.elements.engagementsEditDeadline,
          computerEmail: portalContext.elements.engagementsEditComputerEmail,
          officialsManagerEmail: portalContext.elements.engagementsEditOfficialsManagerEmail,
          poolLength: portalContext.elements.engagementsEditPoolLength,
          poolLaneCount: portalContext.elements.engagementsEditPoolLaneCount,
          timingType: portalContext.elements.engagementsEditTimingType,
          qualificationMode: portalContext.elements.engagementsEditQualificationMode,
          qualificationStart: portalContext.elements.engagementsEditQualificationStart,
          qualificationEnd: portalContext.elements.engagementsEditQualificationEnd,
          missingEntryTimeMode: portalContext.elements.engagementsEditMissingEntryTimeMode,
          maxEvents: portalContext.elements.engagementsEditMaxEvents,
          maxEventsUnlimited: portalContext.elements.engagementsEditMaxEventsUnlimited,
          entryStatus: portalContext.elements.engagementsEditEntryStatus,
          officialsRequired: portalContext.elements.engagementsEditOfficialsRequired
        };
      }

    function engagementCompetitionPayloadFromForm() {
        const payload = engagementCompetitionPayloadFromFields(createCompetitionFields());
        return {
          ...payload,
          invitedRegionIds: [],
          entryDeadlineAt: "",
          entryStatus: "upcoming",
          computerEmail: "",
          officialsManagerEmail: "",
          fees: { enabled: false, swimmerFee: 0, individualEventFee: 0, relayFee: 0, helloAssoUrl: "" },
          officialsRequired: !["national", "international"].includes(payload.level),
          poolLength: "",
          poolLaneCount: "",
          timingType: "",
          qualificationTimesMode: "all",
          qualificationStartDate: "",
          qualificationEndDate: "",
          missingEntryTimeMode: payload.competitionType === "openWater" ? "none" : "manual",
          maxEventsPerSwimmer: 0
        };
      }

    function engagementCompetitionPayloadFromEditForm() {
        return engagementCompetitionPayloadFromFields(editCompetitionFields());
      }

    function nativeCompetitionFormValues() {
        const fields = editCompetitionFields();
        const values = {};
        for (const key of ["name", "date", "endDate", "location", "city", "address", "organizer", "organizerEmail", "teamLeadersWhatsAppUrl", "publicDescription", "waterBodyType", "computerEmail", "officialsManagerEmail", "poolLength", "timingType", "entryStatus"]) values[key] = fields[key]?.value || "";
        values.canceled = fields.canceled?.checked === true;
        values.missingEntryTimeMode = fields.missingEntryTimeMode?.value || "";
        if(fields.level && !fields.level.disabled) values.level=fields.level.value;
        if(fields.regionId && !fields.regionId.disabled) values.regionId=fields.regionId.value;
        else if(fields.level && !fields.level.disabled && ["national","international"].includes(fields.level.value)) values.regionId="";
        if(fields.invitedRegionIds && !fields.invitedRegionIds.disabled && ["regional","departemental"].includes(fields.level?.value)) values.invitedRegionIds=portalActions.selectedRegionMultiSelectValues(fields.invitedRegionIds);
        if(portalContext.elements.engagementsEditNationalKindLabel?.hidden === false && !portalContext.elements.engagementsEditNationalKind?.disabled) values.nativeNationalLevelCode=Number(portalContext.elements.engagementsEditNationalKind.value);
        values.qualificationStartDate=fields.qualificationMode?.value === "period" ? fields.qualificationStart?.value || "" : "";
        values.qualificationEndDate=fields.qualificationMode?.value === "period" ? fields.qualificationEnd?.value || "" : "";
        values.officialsRequired = fields.officialsRequired?.value === "true";
        values.poolLaneCount = Number(fields.poolLaneCount?.value || 0);
        values.maxEventsPerSwimmer = Number(fields.maxEvents?.value || 0);
        const deadline = fields.deadline?.value || "";
        values.entryDeadlineLocal = deadline ? `${deadline.replace("T", " ")}${deadline.length === 16 ? ":00" : ""}` : "";
        values.fees = portalActions.selectedEngagementFeesFromForm();
        values.programSessions = portalActions.selectedEngagementProgramSessionsFromForm();
        if(typeof portalActions.selectedEngagementEventsFromForm==='function' && portalContext.elements.engagementsEventsForm)values.courseOptions=portalActions.selectedEngagementEventsFromForm().map(event=>({code:event.code,categoryRestrictions:event.categoryRestrictions||[],...(event.type==='relay'?{relayMixedMode:event.relayMixedMode||'',multipleRelaysAllowed:event.multipleRelaysAllowed===true}:{})}));
        if(typeof portalState.qualificationEditor!=='undefined' && portalState.qualificationEditor && typeof portalActions.canUse==='function' && portalActions.canUse('engagements.national.manage') && !document.querySelector('#adminQualificationEditor')?.disabled)values.qualifications=portalState.qualificationEditor.read();
        return values;
      }

    function nativeCompetitionPatchFromForm() {
        if (!portalState.nativeCompetitionEditBaseline) throw new Error("Rechargez la fiche avant de la modifier.");
        return Object.fromEntries(Object.entries(nativeCompetitionFormValues()).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(portalState.nativeCompetitionEditBaseline[key])));
      }

    async function saveNativeCompetitionDetail(options = {}) {
        const button = portalContext.elements.engagementsSaveButton;
        let nativeCoursesAdded = false;
        let nativeCoursesRemoved = false;
        try {
          const selectionError=portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition)==="openWater"&&(portalActions.selectedEngagementEventsCategoryError()||portalActions.selectedEngagementProgramError());
          if(selectionError)throw new Error(selectionError);
          const patch = nativeCompetitionPatchFromForm();
          const existingCodes = new Set((portalState.selectedEngagementCompetition.events || []).map(event => event.code));
          const additions = portalActions.selectedEngagementEventsFromForm().filter(event => !existingCodes.has(event.code));
          const selectedCodes=new Set(portalActions.selectedEngagementEventsFromForm().map(event=>event.code));
          const removedEvents=portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition)==="openWater"?(portalState.selectedEngagementCompetition.events||[]).filter(event=>event.nativeRecognized===true&&!selectedCodes.has(event.code)):[];
          const removalIds=removedEvents.flatMap(event=>(event.nativeCourses||[]).map(row=>Number(row.id)));
          if(removedEvents.length&&(!removalIds.length||removedEvents.some(event=>!event.nativeCourses?.length)))throw new Error("Références natives des courses à retirer absentes. Rechargez la fiche.");
          if (!Object.keys(patch).length) {
            if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Aucune modification à enregistrer.";
            return false;
          }
          if(removalIds.length&&!global.confirm("Retirer les courses décochées de cette compétition ? Les engagements existants seront conservés. En présence d’engagements, ce retrait est réservé au National."))return false;
          if (patch.entryStatus === "closed" && !global.confirm("Fermer les engagements dans LivePalmes ? Les engagements existants et la date limite seront conservés.")) return false;
          if (["level","regionId","invitedRegionIds"].some(key=>Object.hasOwn(patch,key)) && !global.confirm("Modifier le niveau, la région organisatrice ou les régions invitées dans LivePalmes ? Les engagements déjà enregistrés seront conservés.")) return false;
          if (patch.entryStatus === "open" && !global.confirm("Ouvrir les engagements dans LivePalmes ? Les notifications autorisées par le réglage national partiront uniquement vers livepalmes@nap-ffessm.fr sur TEST.")) return false;
          const notificationOpeningRequested=patch.entryStatus==='open' && (portalState.selectedEngagementCompetition.entryStatus!=='closed'||confirmEngagementReopeningMail({...portalState.selectedEngagementCompetition,...patch}));
          if (button) button.disabled = true;
          if (portalContext.elements.engagementsDetailStatus) { portalContext.elements.engagementsDetailStatus.textContent = "Enregistrement dans NAP..."; portalContext.elements.engagementsDetailStatus.dataset.tone = "loading"; }
          let result;
          if (additions.length) {
            result = await portalActions.callFunction("updateEngagementCompetition", { competitionId:portalState.selectedEngagementCompetition.id, expectedFingerprint:portalState.selectedEngagementCompetition.napFingerprint, patch:{addNativeCourses:additions.map(event=>({code:event.code,relayMixedMode:event.relayMixedMode||""}))} });
            portalState.selectedEngagementCompetition = result.competition;
            nativeCoursesAdded = true;
            // Preserve pending settings; the second save uses the new native fingerprint.
            if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Courses ajoutées dans NAP ; enregistrement des réglages...";
          }
          if(removalIds.length){
            result=await portalActions.callFunction("updateEngagementCompetition",{competitionId:portalState.selectedEngagementCompetition.id,expectedFingerprint:portalState.selectedEngagementCompetition.napFingerprint,patch:{removeNativeCourseIds:removalIds,confirmCourseRemoval:true}});
            portalState.selectedEngagementCompetition=result.competition;
            nativeCoursesRemoved=true;
          }
          result = await portalActions.callFunction("updateEngagementCompetition", { competitionId:portalState.selectedEngagementCompetition.id, expectedFingerprint:portalState.selectedEngagementCompetition.napFingerprint, patch,notificationOpeningRequested });
          if (result.qualificationJobId) {
            portalState.selectedEngagementCompetition.qualificationJobId = result.qualificationJobId;
            portalActions.renderQualificationJobActions();
            result = await portalActions.finishQualificationJob(result.qualificationJobId);
          }
          portalState.selectedEngagementCompetition = result.competition;
          portalState.nativeCompetitionEditBaseline = null;
          portalActions.invalidateEngagementCalendarCaches();
          await loadEngagementCompetitions({ force:true });
          portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition);
          portalActions.clearEngagementDetailTabDirty();
          if (options.continueEditing === true) portalActions.setEngagementEditMode(true);
          if (portalContext.elements.engagementsDetailStatus) { portalContext.elements.engagementsDetailStatus.textContent = "Modifications enregistrées dans NAP."; portalContext.elements.engagementsDetailStatus.dataset.tone = "ok"; }
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) { portalContext.elements.engagementsDetailStatus.textContent = `${nativeCoursesRemoved ? "Les modifications de courses déjà effectuées dans NAP sont conservées ; les autres réglages restent à enregistrer. " : nativeCoursesAdded ? "Les courses ont été ajoutées dans NAP, mais les autres réglages restent à enregistrer. " : ""}Enregistrement impossible : ${error?.message || error}`; portalContext.elements.engagementsDetailStatus.dataset.tone = "error"; }
          return false;
        } finally { if (button) button.disabled = false; }
      }

    function engagementOpeningDeadlineError(payload = {}, nowMs = Date.now()) {
        if (payload.entryStatus !== "open") return "";
        if (payload.publicationStatus !== "published") {
          return "Publiez la compétition avant d’ouvrir les engagements.";
        }
        const programItemCount = (payload.programSessions || [])
          .reduce((sum, session) => sum + (session.items || []).length, 0);
        if (!programItemCount) {
          return "Ajoutez au moins une course au programme avant d’ouvrir les engagements.";
        }
        if (!payload.entryDeadlineAt) return "Renseignez la date et l’heure de clôture avant d’ouvrir les engagements.";
        const competitionDate = new Date(`${payload.date || ""}T00:00:00`);
        if (!Number.isNaN(competitionDate.getTime()) && competitionDate.getTime() - nowMs > 30 * 24 * 60 * 60 * 1000) {
          return "Impossible d’ouvrir les engagements plus de 30 jours avant la compétition.";
        }
        const deadline = new Date(payload.entryDeadlineAt);
        if (Number.isNaN(deadline.getTime()) || deadline.getTime() > nowMs) return "";
        return "Impossible d’ouvrir les engagements : la date de clôture est dépassée.";
      }

    function shouldSendEngagementOpeningMail(previousStatus, nextStatus) {
        return previousStatus !== "open" && nextStatus === "open";
      }

    function engagementOpeningMailScopeLabel(payload = {}) {
        if (["national", "international"].includes(payload.level || "regional")) {
          return "Destinataires : admins LivePalmes club, région et national, toutes régions.";
        }
        const regions = [
          payload.regionId,
          ...(Array.isArray(payload.invitedRegionIds) ? payload.invitedRegionIds : [])
        ].map(portalActions.regionDisplayLabel).filter((region) => region && region !== "-");
        return `Destinataires : admins LivePalmes club, région et national${regions.length ? ` - régions ${regions.join(", ")}` : ""}.`;
      }

    function confirmEngagementOpeningMail(payload = {}) {
        return global.confirm([
          "Ouvrir les engagements et envoyer le mail d'ouverture ?",
          engagementOpeningMailScopeLabel(payload),
            "Les e-mails seront préparés pour ce cycle d'ouverture puis envoyés aux destinataires concernés."
        ].join("\n\n"));
      }

    function confirmEngagementReopeningMail(payload = {}) {
        return global.confirm([
          "La compétition va être réouverte.",
          "Souhaitez-vous renvoyer le mail d'ouverture aux clubs ?",
          engagementOpeningMailScopeLabel(payload),
          "OK : réouvrir et renvoyer le mail.\nAnnuler : réouvrir sans renvoyer de mail."
        ].join("\n\n"));
      }

    function confirmOpenedCompetitionSensitiveChanges(competition = {}, payload = {}) {
        const changes = [];
        if (competition.date !== payload.date || (competition.endDate || competition.date) !== (payload.endDate || payload.date)) {
          changes.push("date de la compétition");
        }
        if ((competition.regionId || "") !== (payload.regionId || "")) changes.push("région");
        if ((competition.level || "regional") !== (payload.level || "regional")) changes.push("niveau");
        if (!changes.length) return true;
        return global.confirm([
          "Des clubs peuvent déjà avoir commencé leurs engagements.",
          `Vous modifiez : ${changes.join(", ")}.`,
          "Confirmer ces changements ?"
        ].join("\n\n"));
      }

    async function prepareAndSendEngagementOpeningEmails(competitionId, statusTarget = portalContext.elements.engagementsDetailStatus) {
        if (!competitionId) return null;
        if (statusTarget) {
          statusTarget.textContent = "Preparation du mail d'ouverture...";
          statusTarget.dataset.tone = "loading";
          statusTarget.hidden = false;
        }
        portalActions.startEngagementLongOperation(
          "Préparation des courriels d'ouverture en cours...",
          "La compétition est ouverte ; LivePalmes prépare maintenant les destinataires avant l'envoi."
        );
        try {
          const preparation = await portalActions.callFunction("prepareEngagementOpeningNotificationEmails", { competitionId });
          if (preparation.disabled) {
            const message = `Engagements ouverts. TEST : ${Number(preparation.recipientCount || 0)} destinataire(s) prévus. Notifications programmées selon le réglage national, uniquement vers livepalmes@nap-ffessm.fr.`;
            if (statusTarget) { statusTarget.textContent = message; statusTarget.dataset.tone = "ok"; }
            portalActions.finishEngagementLongOperation("success", "Engagements ouverts", message);
            return preparation;
          }
          const jobCount = Number(preparation.jobCount || 0);
          if (!jobCount) {
            if (statusTarget) {
              statusTarget.textContent = "Engagements ouverts. Aucun destinataire d'e-mail trouvé.";
              statusTarget.dataset.tone = "ok";
            }
            portalActions.finishEngagementLongOperation("success", "Engagements ouverts", "Aucun destinataire de courriel n'a été trouvé.");
            return preparation;
          }
          if (statusTarget) {
            statusTarget.textContent = `Envoi de ${jobCount} mail${jobCount > 1 ? "s" : ""} d'ouverture...`;
          }
          portalActions.updateEngagementLongOperation(
            "Envoi des courriels d'ouverture en cours...",
            `${jobCount} courriel${jobCount > 1 ? "s" : ""} préparé${jobCount > 1 ? "s" : ""} ${jobCount > 1 ? "sont" : "est"} maintenant transmis.`
          );
          const sendResult = await portalActions.callFunction("sendEngagementPreparedEmails", {
            competitionId,
            type: "opening_notification",
            limit: 500
          });
          if (portalState.engagementMailJobsCompetitionId === competitionId || portalState.selectedEngagementCompetitionId === competitionId) {
            await portalActions.loadEngagementMailJobs({ force: true });
          }
          const sentCount = Number(sendResult.sentCount || 0);
          const errorCount = Number(sendResult.errorCount || 0);
          if (statusTarget) {
            statusTarget.textContent = [
              `Engagements ouverts. ${sentCount}/${jobCount} mail${jobCount > 1 ? "s" : ""} d'ouverture envoye${sentCount > 1 ? "s" : ""}.`,
              errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}.` : ""
            ].filter(Boolean).join(" ");
            statusTarget.dataset.tone = errorCount ? "error" : "ok";
          }
          portalActions.finishEngagementLongOperation(
            errorCount ? "error" : "success",
            errorCount ? "Ouverture terminée avec des erreurs d'envoi" : "Engagements ouverts et courriels envoyés",
            `${sentCount}/${jobCount} courriel${jobCount > 1 ? "s" : ""} envoyé${sentCount > 1 ? "s" : ""}${errorCount ? ` · ${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""}.`
          );
          return sendResult;
        } catch (error) {
          portalActions.finishEngagementLongOperation("error", "Envoi des courriels d'ouverture impossible", error?.message || String(error));
          throw error;
        }
      }

    async function createEngagementCompetition(event) {
        event?.preventDefault?.();
        if (!portalActions.canCreateEngagementCompetition()) {
          if (portalContext.elements.engagementsCreateMessage) {
          portalContext.elements.engagementsCreateMessage.textContent = "Droit de création des compétitions d'engagements requis.";
            portalContext.elements.engagementsCreateMessage.dataset.tone = "error";
          }
          return;
        }
        const payload = engagementCompetitionPayloadFromForm();
        if (portalContext.elements.engagementsCreateForm && !portalContext.elements.engagementsCreateForm.dataset.napCreationId) portalContext.elements.engagementsCreateForm.dataset.napCreationId=global.crypto.randomUUID();
        payload.creationId=portalContext.elements.engagementsCreateForm?.dataset.napCreationId;
        const button = portalContext.elements.engagementsCreateForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsCreateMessage) {
          portalContext.elements.engagementsCreateMessage.textContent = "Création en cours...";
          portalContext.elements.engagementsCreateMessage.dataset.tone = "loading";
        }
        try {
          const genericEvent = ["training", "stage", "meeting", "other"].includes(portalContext.elements.engagementsCompetitionType?.value || "");
          const result = await portalActions.callFunction(genericEvent ? "createEngagementCalendarEvent" : "createEngagementCompetition", genericEvent ? {
            creationId: payload.creationId,
            eventType: portalContext.elements.engagementsCompetitionType.value,
            name: payload.name,
            date: payload.date,
            endDate: payload.endDate,
            location: payload.location,
            city: payload.city,
            level: payload.level,
            regionId: payload.regionId
          } : payload);
          portalContext.elements.engagementsCreateForm?.reset();
          if (portalContext.elements.engagementsCreateForm) delete portalContext.elements.engagementsCreateForm.dataset.napCreationId;
          portalActions.updateEngagementMaxEventsFields("create");
          portalActions.updateEngagementCreateFormAccess();
          portalActions.invalidateEngagementCalendarCaches();
          portalContext.elements.engagementsCreateDialog?.close();
          portalActions.setEngagementsTab("calendar");
          await loadEngagementCompetitions({ force: true });
          portalActions.upsertEngagementCalendarItemFromServer(
            genericEvent ? result.event : result.competition,
            result.source === "nap" ? "competition" : genericEvent ? "calendarEvent" : "competition"
          );
          portalState.newlyCreatedEngagementCompetitionId = genericEvent ? "" : result.competition?.id || "";
          if (portalContext.elements.engagementsCreateMessage) {
            portalContext.elements.engagementsCreateMessage.textContent = `Événement créé : ${result.event?.name || result.competition?.name || "calendrier"}.`;
            portalContext.elements.engagementsCreateMessage.dataset.tone = "ok";
          }
          if (portalState.newlyCreatedEngagementCompetitionId) portalContext.elements.engagementsCreateChecklist?.showModal();
          if (genericEvent && result.event?.id) global.LivePalmesCalendarEvents?.open?.(result.event.id);
        } catch (error) {
          if (portalContext.elements.engagementsCreateMessage) {
            portalContext.elements.engagementsCreateMessage.textContent = `Création impossible : ${error?.message || error}`;
            portalContext.elements.engagementsCreateMessage.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = false;
          portalActions.updateEngagementCreateFormAccess();
        }
      }

    async function completeNewlyCreatedEngagementCompetition() {
        const competitionId = portalState.newlyCreatedEngagementCompetitionId;
        portalState.newlyCreatedEngagementCompetitionId = "";
        portalContext.elements.engagementsCreateChecklist?.close("complete");
        if (competitionId) await portalActions.loadEngagementCompetitionDetail(competitionId, "general");
      }

    async function updateEngagementCompetition(event) {
        event?.preventDefault?.();
        if (!portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        const button = portalContext.elements.engagementsEditForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = "Enregistrement en cours...";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        try {
          const payload = {
            competitionId: portalState.selectedEngagementCompetition.id,
            ...engagementCompetitionPayloadFromEditForm()
          };
          const openingDeadlineError = engagementOpeningDeadlineError(payload);
          if (openingDeadlineError) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = openingDeadlineError;
              portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
            }
            return;
          }
          const previousStatus = portalState.selectedEngagementCompetition.entryStatus || "upcoming";
          if (previousStatus === "open" && !confirmOpenedCompetitionSensitiveChanges(portalState.selectedEngagementCompetition, payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Modification annulée.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return;
          }
          const reopening = previousStatus === "closed" && payload.entryStatus === "open";
          let sendOpeningMail = shouldSendEngagementOpeningMail(previousStatus, payload.entryStatus);
          if (reopening) sendOpeningMail = confirmEngagementReopeningMail(payload);
          if (!reopening && sendOpeningMail && !confirmEngagementOpeningMail(payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Ouverture annulee.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return;
          }
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          portalState.selectedEngagementCompetition = result.competition || null;
          portalActions.invalidateEngagementCalendarCaches();
          await loadEngagementCompetitions({ force: true });
          portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty("general");
          if (sendOpeningMail && portalState.selectedEngagementCompetition?.id) {
            try {
              await prepareAndSendEngagementOpeningEmails(portalState.selectedEngagementCompetition.id, portalContext.elements.engagementsDetailStatus);
            } catch (mailError) {
              if (portalContext.elements.engagementsDetailStatus) {
                portalContext.elements.engagementsDetailStatus.textContent = `Paramètres enregistrés, mais e-mail d'ouverture impossible : ${mailError?.message || mailError}`;
                portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
              }
            }
          }
          if (portalContext.elements.engagementsDetailStatus) {
            if (!sendOpeningMail) {
              portalContext.elements.engagementsDetailStatus.textContent = reopening
                ? "Compétition rouverte sans renvoi de l'e-mail d'ouverture."
                : "Paramètres enregistrés.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "ok";
            }
          }
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = false;
          portalActions.updateEngagementEditFormAccess();
        }
      }

    async function saveEngagementCompetitionDetail(event, options = {}) {
        event?.preventDefault?.();
        if (!portalState.engagementDetailEditing || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return false;
        if (portalState.selectedEngagementCompetition.napSource === true) return saveNativeCompetitionDetail(options);
        if (portalContext.elements.engagementsEditForm && !portalContext.elements.engagementsEditForm.checkValidity()) {
          portalActions.setEngagementsDetailTab("general");
          portalContext.elements.engagementsEditForm.reportValidity();
          return false;
        }
        const categoryError = portalActions.selectedEngagementEventsCategoryError();
        if (categoryError) {
          portalActions.setEngagementsDetailTab("courses");
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = categoryError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return false;
        }
        const programError = portalActions.selectedEngagementProgramError();
        if (programError) {
          portalActions.setEngagementsDetailTab("courses");
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = programError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return false;
        }
        const button = portalContext.elements.engagementsSaveButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = "Enregistrement de la fiche...";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        try {
          const payload = {
            competitionId: portalState.selectedEngagementCompetition.id,
            ...engagementCompetitionPayloadFromEditForm(),
            events: portalActions.selectedEngagementEventsFromForm(),
            programSessions: portalActions.selectedEngagementProgramSessionsFromForm(),
            fees: portalActions.selectedEngagementFeesFromForm()
          };
          const openingDeadlineError = engagementOpeningDeadlineError(payload);
          if (openingDeadlineError) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = openingDeadlineError;
              portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
            }
            return false;
          }
          const previousStatus = portalState.selectedEngagementCompetition.entryStatus || "upcoming";
          if (previousStatus === "open" && !confirmOpenedCompetitionSensitiveChanges(portalState.selectedEngagementCompetition, payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Modification annulée.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return false;
          }
          const reopening = previousStatus === "closed" && payload.entryStatus === "open";
          let sendOpeningMail = shouldSendEngagementOpeningMail(previousStatus, payload.entryStatus);
          if (reopening) sendOpeningMail = confirmEngagementReopeningMail(payload);
          if (!reopening && sendOpeningMail && !confirmEngagementOpeningMail(payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Ouverture annulee.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return false;
          }
          const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          const returnedCompetition = result.competition || {};
          const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
          portalState.selectedEngagementCompetition = {
            ...returnedCompetition,
            ...(expectedProgramItemCount && !returnedProgramItemCount ? { programSessions: payload.programSessions } : {})
          };
          portalActions.invalidateEngagementCalendarCaches();
          await loadEngagementCompetitions({ force: true });
          portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
          portalState.activeEngagementProgramSessionId = "";
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          if (options.continueEditing === true) portalActions.setEngagementEditMode(true);
          portalActions.clearEngagementDetailTabDirty();
          if (sendOpeningMail && portalState.selectedEngagementCompetition?.id) {
            try {
              await prepareAndSendEngagementOpeningEmails(portalState.selectedEngagementCompetition.id, portalContext.elements.engagementsDetailStatus);
            } catch (mailError) {
              if (portalContext.elements.engagementsDetailStatus) {
                portalContext.elements.engagementsDetailStatus.textContent = `Fiche enregistrée, mais e-mail d'ouverture impossible : ${mailError?.message || mailError}`;
                portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
              }
            }
          }
          if (portalContext.elements.engagementsDetailStatus) {
            if (!sendOpeningMail) {
              portalContext.elements.engagementsDetailStatus.textContent = reopening
              ? "Compétition rouverte sans renvoi de l'e-mail d'ouverture."
              : "Fiche compétition enregistrée.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "ok";
            }
          }
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
          return false;
        } finally {
          if (button) button.disabled = false;
        }
      }

    function engagementCompetitionPayloadFromSelection(extra = {}) {
        return {
          competitionId: portalState.selectedEngagementCompetition.id,
          competitionType: portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition),
          waterBodyType: portalState.selectedEngagementCompetition.waterBodyType || "",
          name: portalState.selectedEngagementCompetition.name || "",
          date: portalState.selectedEngagementCompetition.date || "",
          location: portalState.selectedEngagementCompetition.location || "",
          organizerEmail: portalState.selectedEngagementCompetition.organizerEmail || "",
          level: portalState.selectedEngagementCompetition.level || "regional",
          regionId: portalState.selectedEngagementCompetition.regionId || "",
          invitedRegionIds: portalState.selectedEngagementCompetition.invitedRegionIds || [],
          entryDeadlineAt: portalState.selectedEngagementCompetition.entryDeadlineAt || "",
          endDate: portalState.selectedEngagementCompetition.endDate || portalState.selectedEngagementCompetition.date || "",
          computerEmail: portalState.selectedEngagementCompetition.computerEmail || "",
          entryStatus: portalState.selectedEngagementCompetition.entryStatus || "upcoming",
          officialsRequired: portalState.selectedEngagementCompetition.officialsRequired === true,
          poolLength: portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool" ? portalState.selectedEngagementCompetition.poolLength || "50" : "",
          poolLaneCount: portalState.selectedEngagementCompetition.poolLaneCount || 0,
          timingType: portalState.selectedEngagementCompetition.timingType || "electronic",
          qualificationTimesMode: portalState.selectedEngagementCompetition.qualificationTimesMode || "all",
          qualificationStartDate: portalState.selectedEngagementCompetition.qualificationStartDate || "",
          qualificationEndDate: portalState.selectedEngagementCompetition.qualificationEndDate || "",
          missingEntryTimeMode: portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool" ? portalState.selectedEngagementCompetition.missingEntryTimeMode || "manual" : "none",
          maxEventsPerSwimmer: portalState.selectedEngagementCompetition.maxEventsPerSwimmer || 0,
          ...extra
        };
      }

    async function updateEngagementCompetitionEvents(event) {
        event?.preventDefault?.();
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        if(portalState.selectedEngagementCompetition.napSource === true) return saveNativeCompetitionDetail({continueEditing:true});
        const button = portalContext.elements.engagementsEventsSaveButton;
        const categoryError = portalActions.selectedEngagementEventsCategoryError();
        if (categoryError) {
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = categoryError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return;
        }
        const programError = portalActions.selectedEngagementProgramError();
        if (programError) {
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = programError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return;
        }
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsEventsMessage) {
          portalContext.elements.engagementsEventsMessage.textContent = "Enregistrement du programme...";
          portalContext.elements.engagementsEventsMessage.dataset.tone = "loading";
        }
        try {
          const payload = engagementCompetitionPayloadFromSelection({
            events: portalActions.selectedEngagementEventsFromForm(),
            programSessions: portalActions.selectedEngagementProgramSessionsFromForm()
          });
          const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          const returnedCompetition = result.competition || {};
          const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
          const programConfirmed = expectedProgramItemCount === 0 || returnedProgramItemCount > 0;
          portalState.selectedEngagementCompetition = {
            ...returnedCompetition,
            ...(!programConfirmed ? { programSessions: payload.programSessions } : {})
          };
          portalActions.invalidateEngagementCalendarCaches();
          await loadEngagementCompetitions({ force: true });
          portalState.activeEngagementProgramSessionId = "";
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty("courses");
          portalActions.setEngagementsDetailTab("courses");
          portalActions.setEngagementEventsSectionOpen(portalContext.elements.engagementsEventsChoiceSection, false);
          portalActions.setEngagementEventsSectionOpen(portalContext.elements.engagementsProgramSection, true);
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = programConfirmed
              ? "Programme enregistré."
              : "Programme conservé à l'écran, mais non confirmé par le serveur. Redéployez les Functions avant de tester l'enregistrement réel.";
            portalContext.elements.engagementsEventsMessage.dataset.tone = programConfirmed ? "ok" : "error";
          }
        } catch (error) {
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = !portalActions.isEngagementAdminMode() || !portalActions.canEditEngagementCompetition();
        }
      }

    async function updateEngagementCompetitionFees(event) {
        event?.preventDefault?.();
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        const button = portalContext.elements.engagementsFeesSaveButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsFeesMessage) {
          portalContext.elements.engagementsFeesMessage.textContent = "Enregistrement des frais...";
          portalContext.elements.engagementsFeesMessage.dataset.tone = "loading";
        }
        try {
          const payload = engagementCompetitionPayloadFromSelection({
            fees: portalActions.selectedEngagementFeesFromForm()
          });
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          portalState.selectedEngagementCompetition = result.competition || null;
          portalActions.invalidateEngagementCalendarCaches();
          await loadEngagementCompetitions({ force: true });
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty("fees");
          portalActions.setEngagementsDetailTab("fees");
          if (portalContext.elements.engagementsFeesMessage) {
          portalContext.elements.engagementsFeesMessage.textContent = "Frais enregistrés.";
            portalContext.elements.engagementsFeesMessage.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsFeesMessage) {
            portalContext.elements.engagementsFeesMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsFeesMessage.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = !portalActions.canEditEngagementCompetition();
        }
      }

    return {
      openEngagementClubPersonForm,
      selectedEngagementClubPersonFromForm,
      renderEngagementClubPeople,
      loadEngagementClubPeople,
      saveEngagementClubPerson,
      setEngagementClubPersonStatus,
      loadEngagementCompetitions,
      engagementCompetitionPayloadFromFields,
      createCompetitionFields,
      editCompetitionFields,
      engagementCompetitionPayloadFromForm,
      engagementCompetitionPayloadFromEditForm,
      nativeCompetitionFormValues,
      nativeCompetitionPatchFromForm,
      saveNativeCompetitionDetail,
      engagementOpeningDeadlineError,
      shouldSendEngagementOpeningMail,
      engagementOpeningMailScopeLabel,
      confirmEngagementOpeningMail,
      confirmEngagementReopeningMail,
      confirmOpenedCompetitionSensitiveChanges,
      prepareAndSendEngagementOpeningEmails,
      createEngagementCompetition,
      completeNewlyCreatedEngagementCompetition,
      updateEngagementCompetition,
      saveEngagementCompetitionDetail,
      engagementCompetitionPayloadFromSelection,
      updateEngagementCompetitionEvents,
      updateEngagementCompetitionFees
    };
  }
  global.LivePalmesPortalClubAndCompetition = { create };
})(window);
