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
            <strong title="${portalActions.escapeHtml(name)}">${portalActions.escapeHtml(name)}</strong>
            <span class="admin-engagements-club-person-toggle-meta">
              <span class="admin-engagements-club-person-role-badge" title="${portalActions.escapeHtml(role)}">${portalActions.escapeHtml(role)}</span>
              <span class="admin-engagements-club-person-chevron" aria-hidden="true">›</span>
            </span>
          </button>
          <div id="${detailsId}" class="admin-engagements-club-person-details">
            <span role="cell"><strong title="${portalActions.escapeHtml(name)}">${portalActions.escapeHtml(name)}</strong></span>
            <span role="cell">${portalActions.escapeHtml(person.licenseNumber || "-")}</span>
            <span role="cell" title="${portalActions.escapeHtml(role)}">${portalActions.escapeHtml(role)}</span>
            <span role="cell">${nativeReadOnly && !person.nativeStatusEditable ? `<span class="admin-engagements-club-person-status" data-active="${active ? "true" : "false"}">${active ? "Actif" : "Inactif"}</span>` : `<button class="admin-engagements-club-person-activity-button" type="button" data-active="${active ? "true" : "false"}" title="Profil ${active ? "actif — cliquer pour rendre inactif" : "inactif — cliquer pour rendre actif"} : ${portalActions.escapeHtml(name)}" aria-label="Profil ${active ? "actif" : "inactif"} de ${portalActions.escapeHtml(name)}, ${active ? "rendre inactif" : "rendre actif"}" data-engagement-club-person-action="${active ? "disable" : "enable"}" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}" ${person.statusSaving ? 'disabled aria-busy="true"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9"></path><path d="M6.7 5.7a8 8 0 1 0 10.6 0"></path></svg><span>${active ? "Actif" : "Inactif"}</span></button>`}</span>
            <span role="cell">
              <span class="admin-engagements-request-actions">
                ${nativeReadOnly && !person.nativeIdentityEditable
                      ? `<span class="admin-engagements-request-note admin-engagements-historical-person-note">Déclaration historique de chef d’équipe · compétition n° ${portalActions.escapeHtml(person.nativeCompetitionId || "non renseignée")}. À modifier depuis le dossier de cette compétition.</span>`
                      : `<button class="admin-engagements-club-person-edit-button" type="button" title="Compléter ou demander une correction pour ${portalActions.escapeHtml(name)}" aria-label="Compléter ou demander une correction pour ${portalActions.escapeHtml(name)}" data-engagement-club-person-action="edit" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}" ${nativeReadOnly && portalState.engagementClubPersonSaving ? 'disabled' : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4"></path></svg></button>${nativeReadOnly?`<button class="ghost-button" type="button" data-engagement-club-person-action="roles" data-engagement-club-person-id="${portalActions.escapeHtml(person.id)}">Rôles</button>`:""}`}
              </span>
            </span>
          </div>
        </div>
      `;
        }).join("")}
      </div>
    `;
      }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#loadEngagementClubPeople */
    async function loadEngagementClubPeople(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "loadEngagementClubPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#saveEngagementClubPerson */
    async function saveEngagementClubPerson(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "saveEngagementClubPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#setEngagementClubPersonStatus */
    async function setEngagementClubPersonStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "setEngagementClubPersonStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#loadEngagementCompetitions */
    async function loadEngagementCompetitions(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "loadEngagementCompetitions", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/club-and-competition.js#saveNativeCompetitionDetail */
    async function saveNativeCompetitionDetail(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "saveNativeCompetitionDetail", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/club-and-competition.js#prepareAndSendEngagementOpeningEmails */
    async function prepareAndSendEngagementOpeningEmails(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "prepareAndSendEngagementOpeningEmails", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#createEngagementCompetition */
    async function createEngagementCompetition(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "createEngagementCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#completeNewlyCreatedEngagementCompetition */
    async function completeNewlyCreatedEngagementCompetition(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "completeNewlyCreatedEngagementCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#updateEngagementCompetition */
    async function updateEngagementCompetition(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "updateEngagementCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#saveEngagementCompetitionDetail */
    async function saveEngagementCompetitionDetail(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "saveEngagementCompetitionDetail", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/club-and-competition.js#updateEngagementCompetitionEvents */
    async function updateEngagementCompetitionEvents(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "updateEngagementCompetitionEvents", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#updateEngagementCompetitionFees */
    async function updateEngagementCompetitionFees(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "updateEngagementCompetitionFees", args, moduleActions);
    }

    const moduleActions = { openEngagementClubPersonForm, selectedEngagementClubPersonFromForm, renderEngagementClubPeople, loadEngagementClubPeople, saveEngagementClubPerson, setEngagementClubPersonStatus, loadEngagementCompetitions, engagementCompetitionPayloadFromFields, createCompetitionFields, editCompetitionFields, engagementCompetitionPayloadFromForm, engagementCompetitionPayloadFromEditForm, nativeCompetitionFormValues, nativeCompetitionPatchFromForm, saveNativeCompetitionDetail, engagementOpeningDeadlineError, shouldSendEngagementOpeningMail, engagementOpeningMailScopeLabel, confirmEngagementOpeningMail, confirmEngagementReopeningMail, confirmOpenedCompetitionSensitiveChanges, prepareAndSendEngagementOpeningEmails, createEngagementCompetition, completeNewlyCreatedEngagementCompetition, updateEngagementCompetition, saveEngagementCompetitionDetail, engagementCompetitionPayloadFromSelection, updateEngagementCompetitionEvents, updateEngagementCompetitionFees };
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
