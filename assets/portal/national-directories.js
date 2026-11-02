(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/national-directories.js#loadEngagementNationalClubs */
    async function loadEngagementNationalClubs(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "loadEngagementNationalClubs", args, moduleActions);
    }

    function closeEngagementNationalClubDialog() {
        if (portalContext.elements.engagementsNationalClubDialog?.open) portalContext.elements.engagementsNationalClubDialog.close();
      }

    function openEngagementNationalClubDialog(clubId = "") {
        portalState.engagementNationalClubCreationRetry = null;
        const club = portalState.engagementNationalClubs.find((item) => item.clubId === clubId) || {};
        if (portalContext.elements.engagementsNationalClubForm) portalContext.elements.engagementsNationalClubForm.reset();
        if (portalContext.elements.engagementsNationalClubId) portalContext.elements.engagementsNationalClubId.value = club.clubId || "";
        if (portalContext.elements.engagementsNationalClubFederalNumber) {
          portalContext.elements.engagementsNationalClubFederalNumber.value = club.federalNumber || "";
          portalContext.elements.engagementsNationalClubFederalNumber.readOnly = false;
          portalContext.elements.engagementsNationalClubFederalNumber.dataset.originalValue = club.federalNumber || "";
        }
        if (portalContext.elements.engagementsNationalClubCode) portalContext.elements.engagementsNationalClubCode.value = club.clubCode || "";
        if (portalContext.elements.engagementsNationalClubName) portalContext.elements.engagementsNationalClubName.value = club.clubName || "";
        if (portalContext.elements.engagementsNationalClubRegion) {
          const select=portalContext.elements.engagementsNationalClubRegion;
          if(club.napSource&&club.regionId&&!Array.from(select.options).some(option=>option.value===club.regionId))select.add(new Option(club.regionLabel||club.regionId,club.regionId));
          select.value = club.regionId || "";
        }
        if (portalContext.elements.engagementsNationalClubCity) portalContext.elements.engagementsNationalClubCity.value = club.city || "";
        if (portalContext.elements.engagementsNationalClubPostalCode) portalContext.elements.engagementsNationalClubPostalCode.value = club.postalCode || "";
        if (portalContext.elements.engagementsNationalClubActive) portalContext.elements.engagementsNationalClubActive.checked = club.active !== false;
        if (portalContext.elements.engagementsNationalClubDelete) portalContext.elements.engagementsNationalClubDelete.hidden = !club.clubId || club.source !== "national";
        if (portalContext.elements.engagementsNationalClubDialogTitle) portalContext.elements.engagementsNationalClubDialogTitle.textContent = club.clubId ? `Modifier ${club.clubCode || club.clubName}` : "Ajouter un club";
        if (portalContext.elements.engagementsNationalClubMessage) {
          portalContext.elements.engagementsNationalClubMessage.textContent = club.clubId && club.federalNumber
            ? "Une correction du numéro fédéral demandera une confirmation et sera journalisée."
            : "";
          portalContext.elements.engagementsNationalClubMessage.dataset.tone = "loading";
        }
        if (!portalContext.elements.engagementsNationalClubDialog?.open) portalContext.elements.engagementsNationalClubDialog?.showModal();
        portalContext.elements.engagementsNationalClubFederalNumber?.focus();
        if(club.napSource&&club.clubId){
          club.napDeletionEligible=false;
          portalActions.callFunction("listEngagementNationalClubs",{deletionClubId:club.clubId}).then(result=>{
            club.napDeletionEligible=result?.deletionEligible===true;
            if(portalContext.elements.engagementsNationalClubId?.value===club.clubId&&portalContext.elements.engagementsNationalClubDelete)portalContext.elements.engagementsNationalClubDelete.hidden=!club.napDeletionEligible;
          }).catch(()=>{});
        }
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#saveEngagementNationalClub */
    async function saveEngagementNationalClub(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "saveEngagementNationalClub", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#deleteEngagementNationalClub */
    async function deleteEngagementNationalClub(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "deleteEngagementNationalClub", args, moduleActions);
    }

    function engagementNationalStatusMatches(item = {}, status = "") {
        const merged = item.status === "merged" || Boolean(item.mergedIntoId);
        if (status === "merged") return merged;
        if (status === "active") return !merged && item.active !== false;
        if (status === "inactive") return !merged && item.active === false;
        return true;
      }

    function filteredEngagementNationalSwimmers() {
        const terms = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsNationalSwimmersSearch?.value || "").split(/\s+/).filter(Boolean);
        const status = portalContext.elements.engagementsNationalSwimmersStatusFilter?.value || "";
        return portalState.engagementNationalSwimmers.filter((swimmer) => {
          if (!engagementNationalStatusMatches(swimmer, status)) return false;
          if (!terms.length) return true;
          const haystack = portalActions.normalizedEngagementClubSearch([
            swimmer.firstName,
            swimmer.lastName,
            swimmer.name,
            swimmer.licenseNumber,
            swimmer.clubId,
            swimmer.clubName,
            swimmer.sex,
            swimmer.birthDate,
            swimmer.searchText,
            ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
            ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
          ].filter(Boolean).join(" "));
          return terms.every((term) => haystack.includes(term));
        });
      }

    function resetEngagementNationalSwimmerFilters() {
        if (portalContext.elements.engagementsNationalSwimmersSearch) portalContext.elements.engagementsNationalSwimmersSearch.value = "";
        if (portalContext.elements.engagementsNationalSwimmersStatusFilter) portalContext.elements.engagementsNationalSwimmersStatusFilter.value = "";
        portalState.engagementNationalSwimmers = [];
        portalState.engagementNationalSwimmersLoaded = true;
        resetEngagementNationalSwimmerMergeState();
        portalActions.renderEngagementNationalSwimmers();
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#loadEngagementNationalSwimmers */
    async function loadEngagementNationalSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "loadEngagementNationalSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#setEngagementNationalSwimmerStatus */
    async function setEngagementNationalSwimmerStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "setEngagementNationalSwimmerStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#deleteEngagementNationalSwimmer */
    async function deleteEngagementNationalSwimmer(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "deleteEngagementNationalSwimmer", args, moduleActions);
    }

    function resetEngagementNationalSwimmerMergeState() {
        portalState.engagementNationalSwimmerMergeSourceId = "";
        portalState.engagementNationalSwimmerMergeTargets = [];
        portalState.engagementNationalSwimmerMergeQuery = "";
        portalState.engagementNationalSwimmerMergeLoading = false;
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#searchEngagementNationalSwimmerMergeTargets */
    async function searchEngagementNationalSwimmerMergeTargets(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "searchEngagementNationalSwimmerMergeTargets", args, moduleActions);
    }

    function chooseMergeEngagements(summary) {
        const document=global.document,dialog=document.createElement("dialog"),form=document.createElement("form"),heading=document.createElement("h2"),intro=document.createElement("p"),actions=document.createElement("div"),confirm=document.createElement("button"),cancel=document.createElement("button"),controls=[];
        const opener=document.activeElement;
        dialog.className="admin-swimmer-club-dialog";dialog.setAttribute("aria-label","Choisir les engagements conservés");heading.textContent="Choisir les engagements conservés";
        intro.textContent="Plusieurs engagements diffèrent sur la fiche prioritaire. Choisissez celui à conserver pour chaque course. Les autres courses seront réunies automatiquement. Aucune fusion n’a encore été effectuée pour ces deux fiches.";
        form.append(heading,intro);
        for(const [index,conflict] of summary.conflicts.entries()){
          const field=document.createElement("fieldset"),legend=document.createElement("legend"),radios=[];
          field.className="admin-swimmer-merge-conflict";
          legend.textContent=`Compétition ${conflict.competitionId} — ${conflict.course} — fiche ${conflict.swimmerId}`;field.append(legend);
          for(const choice of conflict.choices){
            const label=document.createElement("label"),radio=document.createElement("input"),text=document.createElement("span");
            const detail=Object.entries(choice.fields).filter(([key])=>key!=="course").map(([key,value])=>`${key==="tps"?"Temps d’engagement":key} : ${value===null?"non renseigné":String(value)}`).join(" ; ");
            radio.type="radio";radio.name=`merge-engagement-choice-${index}`;radio.value=choice.id;radio.required=true;text.textContent=`Engagement ${choice.id} — ${detail}`;
            label.append(radio,text);field.append(label);radios.push(radio);
          }
          form.append(field);controls.push({key:conflict.key,radios});
        }
        actions.className="admin-portal-actions";confirm.type="submit";confirm.textContent="Valider et fusionner";cancel.type="button";cancel.textContent="Annuler";cancel.className="ghost-button";
        actions.append(cancel,confirm);form.append(actions);dialog.append(form);document.body.append(dialog);
        return new Promise(resolve=>{let result=null;
          cancel.addEventListener("click",()=>dialog.close());
          form.addEventListener("submit",event=>{event.preventDefault();if(!form.reportValidity())return;result=controls.map(({key,radios})=>({key,id:radios.find(radio=>radio.checked).value}));dialog.close();});
          dialog.addEventListener("close",()=>{dialog.remove();if(opener?.isConnected)opener.focus();resolve(result);},{once:true});dialog.showModal();controls[0]?.radios[0]?.focus();
        });
      }

    let swimmerMergePending=false;
    async function executeSwimmerMerge(payload) {
        if(swimmerMergePending)throw new Error("Une fusion est déjà en cours. Terminez-la avant d’en lancer une autre.");
        swimmerMergePending=true;
        payload={...payload,entryConflictProtocol:1};
        try{
        let result=await portalActions.callFunction("mergeEngagementNationalClubSwimmer",payload);
        if(result?.mergeConflicts){
          const choices=await chooseMergeEngagements(result.mergeConflicts);
          if(!choices){const error=new Error("Fusion annulée avant modification.");error.mergeCancelled=true;throw error;}
          result=await portalActions.callFunction("mergeEngagementNationalClubSwimmer",{...payload,entryConflictToken:result.mergeConflicts.token,entryConflictChoices:choices});
          if(result?.mergeConflicts)throw new Error("Les engagements ont changé. Relancez la fusion pour refaire les choix.");
        }
        return result;
        }finally{swimmerMergePending=false;}
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeEngagementNationalSwimmer */
    async function mergeEngagementNationalSwimmer(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeEngagementNationalSwimmer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeSelectedEngagementNationalSwimmers */
    async function mergeSelectedEngagementNationalSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeSelectedEngagementNationalSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#repairEngagementNationalSwimmerMergePublication */
    async function repairEngagementNationalSwimmerMergePublication(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "repairEngagementNationalSwimmerMergePublication", args, moduleActions);
    }

    function renderEngagementNationalPeople() {
        if (!portalContext.elements.engagementsNationalPeopleList) return;
        if (!portalActions.canDeleteEngagementCompetitionDirectly()) {
          portalContext.elements.engagementsNationalPeopleList.innerHTML = "";
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        if (!portalState.engagementNationalPeople.length) {
          updateEngagementNationalPeopleStatus(0);
          portalContext.elements.engagementsNationalPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ou chef d\'équipe créé par un club.</p>';
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        const people = filteredEngagementNationalPeople();
        updateEngagementNationalPeopleStatus(people.length);
        if (!people.length) {
          portalContext.elements.engagementsNationalPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ne correspond aux filtres.</p>';
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        const rows = people.map((person) => {
          const active = person.active !== false;
          const merged = person.status === "merged" || Boolean(person.mergedIntoId);
          const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Personne sans nom";
          const statusLabel = merged
            ? `Fusionnee vers ${person.mergedIntoName || person.mergedIntoId || "une autre fiche"}`
            : active ? "Actif" : "Desactive";
          const sourceId = person.id || "";
          const historical = person.napSource && person.nativePersonKind === "leaders";
          const mergeOpen = !historical && portalState.engagementNationalPeopleMergeMode && portalState.engagementNationalPersonMergeSourceId === sourceId;
          const mergeCandidates = engagementNationalPersonMergeCandidates(sourceId);
          const alertLabel = engagementNationalPersonDuplicateAlertLabel(person, people);
          const clubLabel = portalActions.clubDisplayLabel(person, { fallback: "Club non renseigné" });
          return `
        <tr class="admin-engagements-national-person-row" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}" data-active="${active ? "true" : "false"}" data-merged="${merged ? "true" : "false"}">
          <td class="admin-engagements-national-choice">${merged || historical ? "" : `<input type="radio" name="adminEngagementsNationalPersonKeep" value="${portalActions.escapeHtml(sourceId)}" title="Conserver cette fiche" data-engagement-national-person-keep>`}</td>
          <td class="admin-engagements-national-choice">${merged || historical ? "" : `<input type="checkbox" value="${portalActions.escapeHtml(sourceId)}" title="Fusionner cette fiche vers la fiche conservee" data-engagement-national-person-merge-check>`}</td>
          <td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge" data-score="${portalActions.escapeHtml(alertLabel.score)}">${portalActions.escapeHtml(alertLabel.label)}</span></td>
          <td><strong>${portalActions.escapeHtml(person.lastName || name)}</strong></td>
          <td>${portalActions.escapeHtml(person.firstName || "")}</td>
          <td>${portalActions.escapeHtml(person.licenseNumber || "-")}</td>
          <td>${portalActions.escapeHtml(portalActions.engagementClubPersonRoleLabel(person))}</td>
          <td>${portalActions.escapeHtml(clubLabel)}</td>
          <td>${portalActions.escapeHtml(statusLabel)}</td>
          <td class="admin-engagements-national-table-actions">
            ${historical ? '<span>Déclaration historique</span>' : `<details class="admin-national-row-menu">
              <summary aria-label="Actions pour ${portalActions.escapeHtml(name)}" title="Actions">&#8942;</summary>
              <div>
                ${merged || !portalState.engagementNationalPeopleMergeMode ? "" : `<button class="ghost-button" type="button" data-engagement-national-person-action="merge" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">Choisir une autre cible</button>`}
                ${merged ? "" : `<button class="ghost-button" type="button" data-engagement-national-person-action="${active ? "disable" : "enable"}" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">${active ? "Désactiver" : "Réactiver"}</button>`}
                <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-national-person-action="delete" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">Supprimer</button>
              </div>
            </details>`}
          </td>
        </tr>
        ${mergeOpen ? `
          <tr class="admin-engagements-national-merge-row">
            <td colspan="10">
              <div class="admin-engagements-national-merge" data-engagement-national-person-merge="${portalActions.escapeHtml(sourceId)}">
                <label>
                  <span>Fusionner vers</span>
                  <select data-engagement-national-person-merge-target>
                    <option value="">Choisir la fiche à conserver</option>
                    ${mergeCandidates.map((candidate) => `
                      <option value="${portalActions.escapeHtml(candidate.id)}">${portalActions.escapeHtml([candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.licenseNumber || candidate.id)} - ${portalActions.escapeHtml(candidate.licenseNumber || "sans licence")} - ${portalActions.escapeHtml(portalActions.clubDisplayLabel(candidate, { fallback: "club non renseigné" }))}</option>
                    `).join("")}
                  </select>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-person-action="cancel-merge" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">Annuler</button>
                  <button type="button" data-engagement-national-person-action="confirm-merge" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}" ${mergeCandidates.length ? "" : "disabled"}>Confirmer la fusion</button>
                </div>
                ${mergeCandidates.length ? "" : '<p class="admin-engagements-request-note">Aucune autre fiche n est chargee dans la liste.</p>'}
              </div>
            </td>
          </tr>
        ` : ""}
      `;
        }).join("");
        portalContext.elements.engagementsNationalPeopleList.innerHTML = `
      <div class="admin-engagements-national-table-wrap">
        <table class="admin-engagements-national-table admin-engagements-national-people-table" data-merge-mode="${portalState.engagementNationalPeopleMergeMode ? "true" : "false"}">
          <thead>
            <tr>
              <th class="admin-engagements-national-choice">Conserver</th>
              <th class="admin-engagements-national-choice">Fusionner</th>
              <th class="admin-engagements-national-merge-only">Alerte</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Licence</th>
              <th>Role</th>
              <th>Club</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
        updateEngagementNationalPeopleSelectionState();
      }

    function updateEngagementNationalPeopleStatus(filteredCount = portalState.engagementNationalPeople.length) {
        if (!portalContext.elements.engagementsNationalPeopleStatus) return;
        const total = visibleNativePeople(portalState.engagementNationalPeople).length;
        if (!total) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = "Aucun officiel chargé.";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
          return;
        }
        const filtered = Math.max(0, Math.min(total, Number(filteredCount) || 0));
        portalContext.elements.engagementsNationalPeopleStatus.textContent = filtered === total
          ? `${total} personne${total > 1 ? "s" : ""} chargée${total > 1 ? "s" : ""}.`
          : `${filtered} personne${filtered > 1 ? "s" : ""} affichée${filtered > 1 ? "s" : ""} sur ${total}.`;
        portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
      }

    function visibleNativePeople(people) {
        const key = person => {
          if (!person.napSource || !person.firstName || !person.lastName || !person.birthDate || !person.clubId) return null;
          return JSON.stringify([person.clubId, person.lastName.trim(), person.firstName.trim(), person.birthDate]);
        };
        const officials = new Map();
        for (const person of people) {
          if (person.nativePersonKind !== "officials" || !person.roles?.teamLeader) continue;
          const identity = key(person);
          if (identity) officials.set(identity, (officials.get(identity) || 0) + 1);
        }
        const seen = new Set();
        return people.filter(person => {
          if (person.nativePersonKind !== "leaders") return true;
          const identity = key(person);
          if (!identity) return true;
          if (officials.get(identity) === 1 || seen.has(identity)) return false;
          seen.add(identity);
          return true;
        });
      }

    function filteredEngagementNationalPeople() {
        const terms = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsNationalPeopleSearch?.value || "").split(/\s+/).filter(Boolean);
        const status = portalContext.elements.engagementsNationalPeopleStatusFilter?.value || "";
        return visibleNativePeople(portalState.engagementNationalPeople).filter((person) => {
          if (!engagementNationalStatusMatches(person, status)) return false;
          if (!terms.length) return true;
          const haystack = portalActions.normalizedEngagementClubSearch([
            person.firstName,
            person.lastName,
            person.licenseNumber,
            person.clubId,
            person.clubName,
            portalActions.engagementClubPersonRoleLabel(person)
          ].filter(Boolean).join(" "));
          return terms.every((term) => haystack.includes(term));
        });
      }

    function resetEngagementNationalPeopleFilters() {
        if (portalContext.elements.engagementsNationalPeopleSearch) portalContext.elements.engagementsNationalPeopleSearch.value = "";
        if (portalContext.elements.engagementsNationalPeopleStatusFilter) portalContext.elements.engagementsNationalPeopleStatusFilter.value = "";
        renderEngagementNationalPeople();
      }

    function engagementNationalPersonMergeCandidates(sourceId = "") {
        const source = portalState.engagementNationalPeople.find((person) => person.id === sourceId);
        if (!source) return [];
        return portalState.engagementNationalPeople
          .filter((person) => person.id && person.id !== sourceId && !(person.napSource && person.nativePersonKind === "leaders"))
          .filter((person) => person.status !== "merged" && !person.mergedIntoId)
          .sort((left, right) =>
            Number(right.clubId === source.clubId) - Number(left.clubId === source.clubId) ||
            `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr")
          );
      }

    function engagementNationalPersonDuplicateAlertLabel(person = {}, people = []) {
        const personId = person.id || "";
        const license = String(person.licenseNumber || "").trim();
        const normalizedName = portalActions.normalizedEngagementClubSearch([person.lastName, person.firstName].filter(Boolean).join(" "));
        const sameLicense = license && people.some((candidate) => candidate.id !== personId && String(candidate.licenseNumber || "").trim() === license);
        if (sameLicense) return { score: "high", label: "Même licence" };
        const sameNameClub = normalizedName && people.some((candidate) =>
          candidate.id !== personId &&
          portalActions.normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" ")) === normalizedName &&
          (!person.clubId || !candidate.clubId || person.clubId === candidate.clubId)
        );
        if (sameNameClub) return { score: "high", label: "Même identité" };
        const nearName = normalizedName && people.some((candidate) => {
          if (candidate.id === personId) return false;
          const candidateName = portalActions.normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" "));
          return candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName));
        });
        if (nearName) return { score: "medium", label: "A verifier" };
        return { score: "low", label: "Simple" };
      }

    function engagementNationalPersonById(personId = "") {
        return portalState.engagementNationalPeople.find((person) => person.id === personId) || null;
      }

    function selectedEngagementNationalPersonMergeIds() {
        return Array.from(portalContext.elements.engagementsNationalPeopleList?.querySelectorAll("[data-engagement-national-person-merge-check]:checked") || [])
          .map((item) => item.value)
          .filter(Boolean);
      }

    function selectedEngagementNationalPersonKeepId() {
        return portalContext.elements.engagementsNationalPeopleList?.querySelector("[data-engagement-national-person-keep]:checked")?.value || "";
      }

    function updateEngagementNationalPeopleSelectionState() {
        if (portalContext.elements.engagementsNationalPeopleBulk) portalContext.elements.engagementsNationalPeopleBulk.hidden = !portalState.engagementNationalPeopleMergeMode;
        if (portalContext.elements.engagementsNationalPeopleMergeMode) {
          portalContext.elements.engagementsNationalPeopleMergeMode.setAttribute("aria-pressed", portalState.engagementNationalPeopleMergeMode ? "true" : "false");
          portalContext.elements.engagementsNationalPeopleMergeMode.textContent = portalState.engagementNationalPeopleMergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
        }
        const keepId = selectedEngagementNationalPersonKeepId();
        const mergeIds = selectedEngagementNationalPersonMergeIds().filter((id) => id !== keepId);
        if (portalContext.elements.engagementsNationalPeopleBulkMerge) {
          portalContext.elements.engagementsNationalPeopleBulkMerge.disabled = !keepId || !mergeIds.length || portalState.engagementNationalPeopleLoading;
        }
        if (portalContext.elements.engagementsNationalPeopleSelectionSummary) {
          const keep = engagementNationalPersonById(keepId);
          const keepName = keep ? ([keep.firstName, keep.lastName].filter(Boolean).join(" ") || keep.licenseNumber || keepId) : "";
          portalContext.elements.engagementsNationalPeopleSelectionSummary.textContent = keepId && mergeIds.length
            ? `${mergeIds.length} fiche${mergeIds.length > 1 ? "s" : ""} à fusionner vers ${keepName}.`
            : "Choisissez une fiche à conserver et au moins une fiche à fusionner.";
        }
      }

    function setEngagementNationalPeopleMergeMode(enabled) {
        portalState.engagementNationalPeopleMergeMode = enabled === true;
        if (!portalState.engagementNationalPeopleMergeMode) portalState.engagementNationalPersonMergeSourceId = "";
        renderEngagementNationalPeople();
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#loadEngagementNationalPeople */
    async function loadEngagementNationalPeople(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "loadEngagementNationalPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#setEngagementNationalPersonStatus */
    async function setEngagementNationalPersonStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "setEngagementNationalPersonStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#deleteEngagementNationalPerson */
    async function deleteEngagementNationalPerson(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "deleteEngagementNationalPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeEngagementNationalPerson */
    async function mergeEngagementNationalPerson(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeEngagementNationalPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeSelectedEngagementNationalPeople */
    async function mergeSelectedEngagementNationalPeople(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeSelectedEngagementNationalPeople", args, moduleActions);
    }

    const moduleActions = { loadEngagementNationalClubs, closeEngagementNationalClubDialog, openEngagementNationalClubDialog, saveEngagementNationalClub, deleteEngagementNationalClub, engagementNationalStatusMatches, filteredEngagementNationalSwimmers, resetEngagementNationalSwimmerFilters, loadEngagementNationalSwimmers, setEngagementNationalSwimmerStatus, deleteEngagementNationalSwimmer, resetEngagementNationalSwimmerMergeState, searchEngagementNationalSwimmerMergeTargets, chooseMergeEngagements, executeSwimmerMerge, mergeEngagementNationalSwimmer, mergeSelectedEngagementNationalSwimmers, repairEngagementNationalSwimmerMergePublication, renderEngagementNationalPeople, updateEngagementNationalPeopleStatus, visibleNativePeople, filteredEngagementNationalPeople, resetEngagementNationalPeopleFilters, engagementNationalPersonMergeCandidates, engagementNationalPersonDuplicateAlertLabel, engagementNationalPersonById, selectedEngagementNationalPersonMergeIds, selectedEngagementNationalPersonKeepId, updateEngagementNationalPeopleSelectionState, setEngagementNationalPeopleMergeMode, loadEngagementNationalPeople, setEngagementNationalPersonStatus, deleteEngagementNationalPerson, mergeEngagementNationalPerson, mergeSelectedEngagementNationalPeople };
    return {
      loadEngagementNationalClubs,
      closeEngagementNationalClubDialog,
      openEngagementNationalClubDialog,
      saveEngagementNationalClub,
      deleteEngagementNationalClub,
      engagementNationalStatusMatches,
      filteredEngagementNationalSwimmers,
      resetEngagementNationalSwimmerFilters,
      loadEngagementNationalSwimmers,
      setEngagementNationalSwimmerStatus,
      deleteEngagementNationalSwimmer,
      resetEngagementNationalSwimmerMergeState,
      searchEngagementNationalSwimmerMergeTargets,
      mergeEngagementNationalSwimmer,
      mergeSelectedEngagementNationalSwimmers,
      repairEngagementNationalSwimmerMergePublication,
      renderEngagementNationalPeople,
      updateEngagementNationalPeopleStatus,
      visibleNativePeople,
      filteredEngagementNationalPeople,
      resetEngagementNationalPeopleFilters,
      engagementNationalPersonMergeCandidates,
      engagementNationalPersonDuplicateAlertLabel,
      engagementNationalPersonById,
      selectedEngagementNationalPersonMergeIds,
      selectedEngagementNationalPersonKeepId,
      updateEngagementNationalPeopleSelectionState,
      setEngagementNationalPeopleMergeMode,
      loadEngagementNationalPeople,
      setEngagementNationalPersonStatus,
      deleteEngagementNationalPerson,
      mergeEngagementNationalPerson,
      mergeSelectedEngagementNationalPeople
    };
  }
  global.LivePalmesPortalNationalDirectories = { create };
})(window);
