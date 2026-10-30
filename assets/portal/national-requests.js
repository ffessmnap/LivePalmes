(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function renderEngagementAccessRequests() {
        if (!portalContext.elements.engagementsAccessRequestsList) return;
        if (!portalActions.canReviewEngagementAccessRequests()) {
          portalContext.elements.engagementsAccessRequestsList.innerHTML = "";
          return;
        }
        if (!portalState.engagementAccessRequests.length) {
          portalContext.elements.engagementsAccessRequestsList.innerHTML = '<p class="admin-engagements-empty">Aucune demande d\'accès en attente. Consultez l’Historique pour retrouver les demandes déjà traitées.</p>';
          closeEngagementAccessRequestEditForm();
          return;
        }
        portalContext.elements.engagementsAccessRequestsList.innerHTML = portalState.engagementAccessRequests.map((request) => {
          const name = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "Demande sans nom";
          const newClubRequested = request.newClubRequested === true;
          const newClub = request.newClub || {};
          const nationalOnly = newClubRequested && !portalActions.canUse("engagements.national.manage");
          const clubLabel = newClubRequested
            ? `${newClub.clubCode || "Nouveau club"} — ${newClub.clubName || "Nom non renseigné"}`
            : portalActions.clubDisplayLabel(request, { fallback: "Club non renseigné" });
          const requestDetails = [
            newClubRequested
              ? `N° fédéral ${newClub.federalNumber || "-"} · ${[newClub.postalCode, newClub.city].filter(Boolean).join(" ") || "Localité non renseignée"}${nationalOnly ? " · Traitement national requis" : ""}`
              : "",
            request.message || ""
          ].filter(Boolean);
          return `
        <article class="admin-engagements-request-card" data-engagement-access-request-id="${portalActions.escapeHtml(request.id || "")}">
          <div class="admin-engagements-request-main">
            <strong>${portalActions.escapeHtml(name)}</strong>
            <small>${portalActions.escapeHtml([request.email, request.licenseNumber ? `Licence ${request.licenseNumber}` : ""].filter(Boolean).join(" · "))}</small>
          </div>
          <div class="admin-engagements-request-scope">
            <strong>${portalActions.escapeHtml(clubLabel)}</strong>
            <small>${portalActions.escapeHtml([portalActions.regionDisplayLabel(request.regionId) || "Région non renseignée", request.requestedAt ? portalActions.formatDeadline(request.requestedAt).replace(/^Limite /, "") : ""].filter(Boolean).join(" · "))}</small>
          </div>
          <div class="admin-engagements-request-badges">
            ${newClubRequested ? '<span class="admin-access-request-badge">Nouveau club</span>' : ""}
          </div>
          <div class="admin-engagements-request-actions">
            <button class="ghost-button" type="button" data-engagement-access-request-action="edit" data-engagement-access-request-id="${portalActions.escapeHtml(request.id || "")}" ${nationalOnly ? "disabled title=\"Traitement réservé au niveau national\"" : ""}>${nationalOnly ? "Traitement national" : "Examiner"}</button>
            <button class="ghost-button" type="button" data-engagement-access-request-action="reject" data-engagement-access-request-id="${portalActions.escapeHtml(request.id || "")}">Refuser</button>
          </div>
          ${requestDetails.length ? `<details class="admin-engagements-request-details"><summary>Voir les informations complémentaires</summary>${requestDetails.map((detail) => `<p>${portalActions.escapeHtml(detail)}</p>`).join("")}</details>` : ""}
        </article>
      `;
        }).join("");
      }

    async function loadEngagementAccessRequests({ force = false, silent = false } = {}) {
        portalConfig.accessRequestHistory?.onOpen();
        if (!portalActions.canReviewEngagementAccessRequests() || portalState.engagementAccessRequestsLoading) return;
        if (portalState.engagementAccessRequestsLoaded && !force) return;
        portalState.engagementAccessRequestsLoading = true;
        if (portalContext.elements.engagementsAccessRequestsStatus && !silent) {
          portalContext.elements.engagementsAccessRequestsStatus.textContent = "Chargement des demandes...";
          portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("listEngagementAccessRequests", { status: "pending", limit: 120 });
          portalState.engagementAccessRequests = Array.isArray(result.requests) ? result.requests : [];
          portalState.engagementAccessRequestsLoaded = true;
          portalActions.updateEngagementAccessRequestBadge(portalState.engagementAccessRequests.length);
          renderEngagementAccessRequests();
          if (portalContext.elements.engagementsAccessRequestsStatus && !silent) {
            portalActions.markLastRefresh(portalContext.elements.engagementsAccessRequestsStatus);
            portalContext.elements.engagementsAccessRequestsStatus.textContent = `${portalState.engagementAccessRequests.length} demande${portalState.engagementAccessRequests.length > 1 ? "s" : ""} en attente.${portalActions.lastRefreshSuffix(portalContext.elements.engagementsAccessRequestsStatus)}`;
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsAccessRequestsStatus && !silent) {
            portalContext.elements.engagementsAccessRequestsStatus.textContent = `Lecture demandes impossible : ${error?.message || error}`;
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementAccessRequestsLoading = false;
        }
      }

    function setEngagementAccessRequestEditMessage(message, tone = "error") {
        if (!portalContext.elements.engagementsAccessRequestEditMessage) return;
        portalContext.elements.engagementsAccessRequestEditMessage.textContent = message || "";
        portalContext.elements.engagementsAccessRequestEditMessage.dataset.tone = tone;
      }

    function closeEngagementAccessRequestEditForm() {
        portalContext.elements.engagementsAccessRequestEditForm?.reset();
        if (portalContext.elements.engagementsAccessRequestEditDialog?.open) portalContext.elements.engagementsAccessRequestEditDialog.close();
        if (portalContext.elements.engagementsAccessRequestEditNewClubFields) portalContext.elements.engagementsAccessRequestEditNewClubFields.hidden = true;
        setEngagementAccessRequestEditMessage("");
      }

    function openEngagementAccessRequestEditForm(requestId) {
        const request = portalState.engagementAccessRequests.find((item) => item.id === requestId);
        if (!request || !portalContext.elements.engagementsAccessRequestEditForm) return;
        const requestName = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "la demande";
        if (portalContext.elements.engagementsAccessRequestEditTitle) portalContext.elements.engagementsAccessRequestEditTitle.textContent = `Vérifier · ${requestName}`;
        if (portalContext.elements.engagementsAccessRequestEditId) portalContext.elements.engagementsAccessRequestEditId.value = request.id || "";
        if (portalContext.elements.engagementsAccessRequestEditFirstName) portalContext.elements.engagementsAccessRequestEditFirstName.value = request.firstName || "";
        if (portalContext.elements.engagementsAccessRequestEditLastName) portalContext.elements.engagementsAccessRequestEditLastName.value = request.lastName || "";
        if (portalContext.elements.engagementsAccessRequestEditEmail) portalContext.elements.engagementsAccessRequestEditEmail.value = request.email || "";
        if (portalContext.elements.engagementsAccessRequestEditLicenseNumber) portalContext.elements.engagementsAccessRequestEditLicenseNumber.value = request.licenseNumber || "";
        portalActions.setRegionSelectValue(portalContext.elements.engagementsAccessRequestEditRegionId, request.regionId || "");
        if (portalContext.elements.engagementsAccessRequestEditRegionId) {
          portalContext.elements.engagementsAccessRequestEditRegionId.disabled = !portalActions.canUse("engagements.national.manage");
        }
        const newClubRequested = request.newClubRequested === true;
        const newClub = request.newClub || {};
        portalActions.populateEngagementAccessRequestEditClubSelect(request.clubId || "", request.clubName || "");
        if (portalContext.elements.engagementsAccessRequestEditClubSelect) {
          portalContext.elements.engagementsAccessRequestEditClubSelect.required = !newClubRequested;
          if (newClubRequested) portalContext.elements.engagementsAccessRequestEditClubSelect.disabled = true;
        }
        if (portalContext.elements.engagementsAccessRequestEditNewClubFields) portalContext.elements.engagementsAccessRequestEditNewClubFields.hidden = !newClubRequested;
        [
          [portalContext.elements.engagementsAccessRequestEditNewClubName, newClub.clubName],
          [portalContext.elements.engagementsAccessRequestEditNewClubCode, newClub.clubCode],
          [portalContext.elements.engagementsAccessRequestEditNewClubFederalNumber, newClub.federalNumber],
          [portalContext.elements.engagementsAccessRequestEditNewClubCity, newClub.city],
          [portalContext.elements.engagementsAccessRequestEditNewClubPostalCode, newClub.postalCode]
        ].forEach(([field, value]) => {
          if (!field) return;
          field.value = value || "";
          field.required = newClubRequested;
        });
        setEngagementAccessRequestEditMessage("Vérifiez les informations avant validation.", "loading");
        if (portalContext.elements.engagementsAccessRequestEditDialog?.showModal && !portalContext.elements.engagementsAccessRequestEditDialog.open) {
          portalContext.elements.engagementsAccessRequestEditDialog.showModal();
        }
      }

    function correctedEngagementAccessRequestFromEditForm() {
        const requestId = portalContext.elements.engagementsAccessRequestEditId?.value || "";
        const request = portalState.engagementAccessRequests.find((item) => item.id === requestId) || {};
        const newClubRequested = request.newClubRequested === true;
        return {
          firstName: String(portalContext.elements.engagementsAccessRequestEditFirstName?.value || "").trim(),
          lastName: String(portalContext.elements.engagementsAccessRequestEditLastName?.value || "").trim(),
          email: String(portalContext.elements.engagementsAccessRequestEditEmail?.value || "").trim(),
          licenseNumber: String(portalContext.elements.engagementsAccessRequestEditLicenseNumber?.value || "").trim(),
          regionId: portalContext.elements.engagementsAccessRequestEditRegionId?.value || "",
          clubId: portalContext.elements.engagementsAccessRequestEditClubId?.value || "",
          clubName: portalContext.elements.engagementsAccessRequestEditClubName?.value || "",
          newClubRequested,
          ...(newClubRequested ? {
            newClub: {
              clubName: String(portalContext.elements.engagementsAccessRequestEditNewClubName?.value || "").trim(),
              clubCode: String(portalContext.elements.engagementsAccessRequestEditNewClubCode?.value || "").trim(),
              federalNumber: String(portalContext.elements.engagementsAccessRequestEditNewClubFederalNumber?.value || "").trim(),
              city: String(portalContext.elements.engagementsAccessRequestEditNewClubCity?.value || "").trim(),
              postalCode: String(portalContext.elements.engagementsAccessRequestEditNewClubPostalCode?.value || "").trim()
            }
          } : {})
        };
      }

    async function resolveEngagementAccessRequest(requestId, decision, correctedRequest = null, resolutionReason = "") {
        const cleanId = String(requestId || "").trim();
        if (!cleanId || !portalActions.canReviewEngagementAccessRequests()) return;
        const request = portalState.engagementAccessRequests.find((item) => item.id === cleanId) || {};
        const approve = decision === "approved";
        const label = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "cette demande";
        const message = approve
          ? `Valider la demande de ${label} et créer l'accès aux engagements du club ?`
          : `Refuser la demande de ${label} ?`;
        if (approve && !global.confirm(message)) return false;
        if (portalContext.elements.engagementsAccessRequestsStatus) {
          portalContext.elements.engagementsAccessRequestsStatus.textContent = approve ? "Validation en cours..." : "Refus en cours...";
          portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("resolveEngagementAccessRequest", {
            requestId: cleanId,
            decision: approve ? "approved" : "rejected",
            ...(approve && correctedRequest ? { correctedRequest } : {}),
            ...(!approve ? { resolutionReason: String(resolutionReason || "").trim() } : {})
          });
          portalConfig.accessRequestHistory?.invalidate();
          if (approve && result.access?.email) {
            await global.firebase?.auth?.().sendPasswordResetEmail(result.access.email, {
              url: `${global.LivePalmesEnvironment.authOrigin}/portail.html`,
              handleCodeInApp: false
            }).catch(() => {});
          }
          portalState.engagementAccessRequestsLoaded = false;
          if (portalActions.canManageAccessDirectory()) portalActions.refreshAccessUsersAfterMutation({ reset: true });
          await loadEngagementAccessRequests({ force: true });
          portalState.portalPendingOverviewLoaded = false;
          await portalActions.loadPortalPendingOverview({ force: true });
          if (portalContext.elements.engagementsAccessRequestsStatus) {
            const notificationFailed = !approve && result.resolutionNotification?.status !== "sent";
            portalContext.elements.engagementsAccessRequestsStatus.textContent = approve
              ? "Demande validée. L'accès club est actif et un e-mail de mot de passe a été envoyé si possible."
              : notificationFailed
                ? "Demande refusée, mais l’e-mail d’information n’a pas pu être envoyé."
                : "Demande refusée et demandeur informé par e-mail.";
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = notificationFailed ? "error" : "ok";
          }
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsAccessRequestsStatus) {
            portalContext.elements.engagementsAccessRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "error";
          }
          setEngagementAccessRequestEditMessage(`Validation impossible : ${error?.message || error}`);
          return false;
        }
      }

    async function submitEngagementAccessRequestEdit(event) {
        event?.preventDefault?.();
        const requestId = portalContext.elements.engagementsAccessRequestEditId?.value || "";
        if (!requestId) return;
        const button = portalContext.elements.engagementsAccessRequestEditForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        setEngagementAccessRequestEditMessage("Validation en cours...", "loading");
        try {
          const ok = await resolveEngagementAccessRequest(requestId, "approved", correctedEngagementAccessRequestFromEditForm());
          if (ok) closeEngagementAccessRequestEditForm();
        } finally {
          if (button) button.disabled = false;
        }
      }

    function publicAccessRequestPayloadFromForm() {
        const newClubRequested = portalContext.elements.publicAccessRequestNewClub?.checked === true;
        return {
          firstName: String(portalContext.elements.publicAccessRequestFirstName?.value || "").trim(),
          lastName: String(portalContext.elements.publicAccessRequestLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
          email: String(portalContext.elements.publicAccessRequestEmail?.value || "").trim(),
          licenseNumber: String(portalContext.elements.publicAccessRequestLicenseNumber?.value || "").trim(),
          regionId: portalContext.elements.publicAccessRequestRegionId?.value || "",
          clubId: portalContext.elements.publicAccessRequestClubId?.value || "",
          clubName: portalContext.elements.publicAccessRequestClubName?.value || "",
          newClubRequested,
          ...(newClubRequested ? {
            newClub: {
              clubName: String(portalContext.elements.publicAccessRequestNewClubName?.value || "").trim(),
              clubCode: String(portalContext.elements.publicAccessRequestNewClubCode?.value || "").trim(),
              federalNumber: String(portalContext.elements.publicAccessRequestNewClubFederalNumber?.value || "").trim(),
              city: String(portalContext.elements.publicAccessRequestNewClubCity?.value || "").trim(),
              postalCode: String(portalContext.elements.publicAccessRequestNewClubPostalCode?.value || "").trim()
            }
          } : {}),
          message: String(portalContext.elements.publicAccessRequestText?.value || "").trim(),
          website: String(portalContext.elements.publicAccessRequestWebsite?.value || "").trim()
        };
      }

    async function submitPublicEngagementAccessRequest(event) {
        event?.preventDefault?.();
        portalActions.setFormPending(portalContext.elements.publicAccessRequestForm, true, "Envoi en cours…");
        portalActions.setPublicAccessRequestMessage("Envoi de la demande...", "loading");
        try {
          await portalActions.matchPublicAccessRequestClubByFederalNumber();
          portalActions.setPublicAccessRequestMessage("Envoi de la demande...", "loading");
          const result = await portalActions.callFunction("submitEngagementAccessRequest", publicAccessRequestPayloadFromForm());
          portalContext.elements.publicAccessRequestForm?.reset();
          portalActions.populatePublicAccessRequestClubSelect();
          portalActions.updatePublicAccessRequestNewClubMode();
          portalState.engagementAccessRequestsLoaded = false;
          portalActions.setPublicAccessRequestMessage(
            result.existingAccount
              ? "Cette adresse semble déjà associée à un compte LivePalmes. Consultez l'e-mail que nous venons de vous envoyer."
              : "Demande envoyée. Elle doit maintenant être validée par la région ou le niveau national.",
            "ok"
          );
        } catch (error) {
          portalActions.setPublicAccessRequestMessage(`Demande impossible : ${error?.message || error}`);
        } finally {
          portalActions.setFormPending(portalContext.elements.publicAccessRequestForm, false);
        }
      }

    function updateEngagementNationalRequestsPresentation() {
        const correctionCount = portalState.engagementSwimmerChangeRequests.length;
        const deletionCount = portalState.engagementDeletionRequests.length;
        const accountCount = portalState.accessDeletionRequests.length;
        const total = correctionCount + deletionCount + accountCount;
        const correctionError = portalContext.elements.engagementsSwimmerChangeRequestsStatus?.dataset.tone === "error";
        const deletionError = portalContext.elements.engagementsDeletionRequestsStatus?.dataset.tone === "error";
        const accountError = portalContext.elements.engagementsNationalAccountsStatus?.dataset.tone === "error";
        if (portalContext.elements.engagementsSwimmerChangeRequests) {
          portalContext.elements.engagementsSwimmerChangeRequests.hidden = correctionCount === 0 && !correctionError;
          if (correctionError) portalContext.elements.engagementsSwimmerChangeRequests.open = true;
        }
        if (portalContext.elements.engagementsDeletionRequestsGroup) {
          portalContext.elements.engagementsDeletionRequestsGroup.hidden = deletionCount === 0 && !deletionError;
          if (deletionError) portalContext.elements.engagementsDeletionRequestsGroup.open = true;
        }
        if (portalContext.elements.engagementsNationalAccountsGroup) {
          portalContext.elements.engagementsNationalAccountsGroup.hidden = accountCount === 0 && !accountError;
          if (accountError) portalContext.elements.engagementsNationalAccountsGroup.open = true;
        }
        if (portalContext.elements.engagementsDeletionRequestsCount) {
          portalContext.elements.engagementsDeletionRequestsCount.textContent = `${deletionCount} en attente`;
        }
        if (portalContext.elements.engagementsNationalAccountsCount) {
          portalContext.elements.engagementsNationalAccountsCount.textContent = `${accountCount} en attente`;
        }
        const loading = portalState.engagementDeletionRequestsLoading || portalState.engagementSwimmerChangeRequestsLoading || portalState.accessDeletionRequestsLoading;
        const complete = portalState.engagementDeletionRequestsLoaded && portalState.engagementSwimmerChangeRequestsLoaded && portalState.accessDeletionRequestsLoaded;
        if (portalContext.elements.nationalRequestsEmpty) {
          portalContext.elements.nationalRequestsEmpty.hidden = total > 0 || (!loading && !complete && (deletionError || correctionError || accountError));
          portalContext.elements.nationalRequestsEmpty.textContent = complete
            ? "Aucune demande en attente."
            : loading ? "Chargement des demandes..." : "Certaines demandes n'ont pas pu être chargées.";
        }
        if (!portalState.portalPendingOverviewLoaded) {
          portalActions.renderPendingBadgeCollection(
            portalContext.elements.nationalPendingBadges,
            portalActions.canDeleteEngagementCompetitionDirectly() ? total : 0,
            "demande nationale en attente",
            "demandes nationales en attente"
          );
        }
      }

    function renderEngagementDeletionRequests() {
        if (!portalContext.elements.engagementsDeletionRequestsList) return;
        if (!portalActions.canDeleteEngagementCompetitionDirectly()) {
          portalContext.elements.engagementsDeletionRequestsList.innerHTML = "";
          return;
        }
        if (!portalState.engagementDeletionRequests.length) {
          portalContext.elements.engagementsDeletionRequestsList.innerHTML = '<p class="admin-engagements-empty">Aucune demande de suppression en attente.</p>';
          updateEngagementNationalRequestsPresentation();
          return;
        }
        portalContext.elements.engagementsDeletionRequestsList.innerHTML = portalState.engagementDeletionRequests.map((request) => {
          const swimmerRequest = request.requestType === "swimmer";
          const calendarEventRequest = !swimmerRequest && request.sourceType === "calendarEvent";
          const usageDetails = swimmerRequest ? [
            request.performanceMatchCount ? `${request.performanceMatchCount} correspondance${request.performanceMatchCount > 1 ? "s" : ""} dans les performances` : "",
            request.entryUsageCount ? `${request.entryUsageCount} inscription${request.entryUsageCount > 1 ? "s" : ""}` : "",
            request.entryScanTruncated ? "contrôle historique à compléter" : ""
          ].filter(Boolean).join(" - ") : "";
          return `
      <article class="admin-engagements-request-card" data-engagement-deletion-request-id="${portalActions.escapeHtml(request.id || request.competitionId || request.swimmerId || "")}" data-request-type="${swimmerRequest ? "swimmer" : "competition"}">
        <div class="admin-engagements-request-main">
          <strong>${portalActions.escapeHtml(swimmerRequest ? request.swimmerName || "Nageur sans nom" : request.competitionName || (calendarEventRequest ? "Événement sans nom" : "Compétition sans nom"))}</strong>
          <small>${portalActions.escapeHtml([
                swimmerRequest ? "Nageur désactivé" : calendarEventRequest ? "Événement du calendrier" : request.competitionDate ? portalActions.formatShortDate(request.competitionDate) : "",
                calendarEventRequest && request.competitionDate ? portalActions.formatShortDate(request.competitionDate) : "",
                swimmerRequest ? request.birthDate ? portalActions.formatShortDate(request.birthDate) : "" : portalActions.engagementLevelLabel(request.competitionLevel),
                swimmerRequest ? request.licenseNumber ? `Licence ${request.licenseNumber}` : "" : request.regionId ? portalActions.regionDisplayLabel(request.regionId) : "",
                swimmerRequest ? portalActions.clubDisplayLabel(request, { fallback: "Club non renseigné" }) : "",
                usageDetails
              ].filter(Boolean).join(" - "))}</small>
        </div>
        <div class="admin-engagements-request-meta">
          <span>Demandee par ${portalActions.escapeHtml(request.requestedByEmail || request.requestedBy || "-")}</span>
          <span>${portalActions.escapeHtml(request.requestedAt ? portalActions.formatDeadline(request.requestedAt).replace(/^Limite /, "") : "-")}</span>
        </div>
        <div class="admin-engagements-request-actions">
          ${swimmerRequest ? "" : `<button class="ghost-button" type="button" data-engagement-deletion-action="view" data-engagement-source-type="${calendarEventRequest ? "calendarEvent" : "competition"}" data-engagement-event-id="${portalActions.escapeHtml(request.eventId || request.calendarEventId || request.competitionId || "")}">Voir</button>`}
          <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-deletion-action="approve" data-engagement-deletion-request-id="${portalActions.escapeHtml(request.id || request.competitionId || request.swimmerId || "")}" data-engagement-deletion-request-type="${swimmerRequest ? "swimmer" : "competition"}">${swimmerRequest ? "Confirmer le retrait" : "Approuver"}</button>
          <button class="ghost-button" type="button" data-engagement-deletion-action="reject" data-engagement-deletion-request-id="${portalActions.escapeHtml(request.id || request.competitionId || request.swimmerId || "")}" data-engagement-deletion-request-type="${swimmerRequest ? "swimmer" : "competition"}">${swimmerRequest ? "Réactiver" : "Refuser"}</button>
        </div>
      </article>
    `;
        }).join("");
        updateEngagementNationalRequestsPresentation();
      }

    async function loadEngagementDeletionRequests({ force = false, silent = false } = {}) {
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap") {
          portalState.engagementDeletionRequests = [];
          portalState.engagementDeletionRequestsLoaded = true;
          updateEngagementDeletionRequestBadge(0);
          renderEngagementDeletionRequests();
          return;
        }
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementDeletionRequestsLoading) return;
        if (portalState.engagementDeletionRequestsLoaded && !force) return;
        portalState.engagementDeletionRequestsLoading = true;
        updateEngagementNationalRequestsPresentation();
        if (portalContext.elements.engagementsDeletionRequestsRefresh) portalContext.elements.engagementsDeletionRequestsRefresh.disabled = true;
        if (portalContext.elements.engagementsDeletionRequestsStatus && !silent) {
          portalContext.elements.engagementsDeletionRequestsStatus.textContent = "Chargement des demandes...";
          portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
        }
        try {
          const [competitionResult, swimmerResult] = await Promise.all([
            portalActions.callFunction("listEngagementCompetitionDeletionRequests", { status: "pending", limit: 50 }),
            portalActions.callFunction("listEngagementSwimmerDeletionRequests", { status: "pending", limit: 50 })
          ]);
          portalState.engagementDeletionRequests = [
            ...(Array.isArray(competitionResult.requests) ? competitionResult.requests.map((request) => ({ ...request, requestType: "competition" })) : []),
            ...(Array.isArray(swimmerResult.requests) ? swimmerResult.requests : [])
          ].sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));
          portalState.engagementDeletionRequestsLoaded = true;
          updateEngagementDeletionRequestBadge(portalState.engagementDeletionRequests.length);
          renderEngagementDeletionRequests();
          if (portalContext.elements.engagementsDeletionRequestsStatus && !silent) {
            portalActions.markLastRefresh(portalContext.elements.engagementsDeletionRequestsStatus);
            portalContext.elements.engagementsDeletionRequestsStatus.textContent = `${portalState.engagementDeletionRequests.length} demande${portalState.engagementDeletionRequests.length > 1 ? "s" : ""} en attente.`;
            portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsDeletionRequestsStatus && !silent) {
            portalContext.elements.engagementsDeletionRequestsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementDeletionRequestsLoading = false;
          if (portalContext.elements.engagementsDeletionRequestsRefresh) portalContext.elements.engagementsDeletionRequestsRefresh.disabled = false;
          updateEngagementNationalRequestsPresentation();
        }
      }

    function updateEngagementDeletionRequestBadge(count = portalState.engagementDeletionRequests.length) {
        void count;
        updateEngagementNationalRequestsPresentation();
      }

    async function resolveEngagementDeletionRequest(requestId, decision, requestType = "competition") {
        const cleanId = String(requestId || "").trim();
        if (!cleanId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const approve = decision === "approved";
        const swimmerRequest = requestType === "swimmer";
        const message = swimmerRequest
          ? approve
            ? "Confirmer le retrait de ce nageur ? Sa fiche restera archivée et désactivée pour préserver l'historique."
            : "Refuser cette demande et réactiver le nageur dans l'effectif de son club ?"
          : approve
            ? "Approuver cette demande et supprimer définitivement la compétition ?"
            : "Refuser cette demande de suppression ?";
        if (!global.confirm(message)) return;
        if (portalContext.elements.engagementsDeletionRequestsStatus) {
          portalContext.elements.engagementsDeletionRequestsStatus.textContent = swimmerRequest
            ? approve ? "Confirmation du retrait..." : "Réactivation en cours..."
            : approve ? "Suppression en cours..." : "Refus en cours...";
          portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction(swimmerRequest ? "resolveEngagementSwimmerDeletionRequest" : "resolveEngagementCompetitionDeletionRequest", {
            requestId: cleanId,
            decision: approve ? "approved" : "rejected"
          });
          portalState.portalPendingOverviewLoaded = false;
          portalState.engagementDeletionRequestsLoaded = false;
          await loadEngagementDeletionRequests({ force: true });
          await portalActions.loadPortalPendingOverview({ force: true });
          if (approve && !swimmerRequest) {
            portalActions.invalidateEngagementCalendarCaches();
            portalActions.closeEngagementCompetitionDetail();
            await portalActions.loadEngagementCompetitions({ force: true });
          }
        } catch (error) {
          if (portalContext.elements.engagementsDeletionRequestsStatus) {
            portalContext.elements.engagementsDeletionRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "error";
          }
        }
      }

    function renderEngagementNationalSwimmers() {
        if (!portalContext.elements.engagementsNationalSwimmersList) return;
        if (!portalActions.canDeleteEngagementCompetitionDirectly()) {
          portalContext.elements.engagementsNationalSwimmersList.innerHTML = "";
          portalActions.updateEngagementNationalSwimmerSelectionState();
          return;
        }
        if (!portalState.engagementNationalSwimmers.length) {
          updateEngagementNationalSwimmersStatus(0);
          portalContext.elements.engagementsNationalSwimmersList.innerHTML = '<p class="admin-engagements-empty">Lancez une recherche pour afficher les nageurs de la base.</p>';
          portalActions.updateEngagementNationalSwimmerSelectionState();
          return;
        }
        const swimmers = portalActions.filteredEngagementNationalSwimmers();
        updateEngagementNationalSwimmersStatus(swimmers.length);
        if (!swimmers.length) {
          portalContext.elements.engagementsNationalSwimmersList.innerHTML = '<p class="admin-engagements-empty">Aucun nageur ne correspond aux filtres.</p>';
          portalActions.updateEngagementNationalSwimmerSelectionState();
          return;
        }
        const rows = swimmers.map((swimmer) => {
          const active = swimmer.active !== false;
          const merged = swimmer.status === "merged" || Boolean(swimmer.mergedIntoId);
          const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
          const statusLabel = merged
            ? `Fusionné vers ${swimmer.mergedIntoName || swimmer.mergedIntoId || "une autre fiche"}`
            : active ? "Actif" : "Desactive";
          const sourceId = swimmer.id || swimmer.swimmerIndexId || "";
          const sourceType = swimmer.source || "performances";
          const sourceKey = `${sourceType}:${sourceId}`;
          const mergeOpen = portalState.engagementNationalSwimmerMergeMode && portalState.engagementNationalSwimmerMergeSourceId === sourceKey;
          const mergeTargets = mergeOpen ? portalState.engagementNationalSwimmerMergeTargets : [];
          const alertLabel = portalActions.engagementNationalSwimmerDuplicateAlertLabel(swimmer, swimmers);
          const clubLabel = portalActions.clubDisplayLabel(swimmer, { fallback: "Club non renseigné" });
          const perfCount = Number(swimmer.performanceCount || 0) || 0;
          return `
        <tr class="admin-engagements-national-swimmer-row" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}" data-engagement-national-swimmer-key="${portalActions.escapeHtml(sourceKey)}" data-active="${active ? "true" : "false"}" data-merged="${merged ? "true" : "false"}">
          <td class="admin-engagements-national-choice">
            ${merged ? "" : `<input type="radio" name="adminEngagementsNationalSwimmerKeep" value="${portalActions.escapeHtml(sourceKey)}" title="Conserver cette fiche" data-engagement-national-swimmer-keep>`}
          </td>
          <td class="admin-engagements-national-choice">
            ${merged ? "" : `<input type="checkbox" value="${portalActions.escapeHtml(sourceKey)}" title="Fusionner cette fiche vers la fiche conservee" data-engagement-national-swimmer-merge-check>`}
          </td>
          <td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge" data-score="${portalActions.escapeHtml(alertLabel.score)}">${portalActions.escapeHtml(alertLabel.label)}</span></td>
          <td><strong>${portalActions.escapeHtml(swimmer.lastName || name)}</strong></td>
          <td>${portalActions.escapeHtml(swimmer.firstName || "")}</td>
          <td>${portalActions.escapeHtml(swimmer.birthDate ? portalActions.formatShortDate(swimmer.birthDate) : "-")}</td>
          <td>${portalActions.escapeHtml(swimmer.sex || "-")}</td>
          <td>${portalActions.escapeHtml(swimmer.licenseNumber || "-")}</td>
          <td>${portalActions.escapeHtml(clubLabel)}</td>
          <td>${portalActions.escapeHtml(perfCount ? String(perfCount) : "-")}</td>
          <td>${portalActions.escapeHtml(statusLabel)}</td>
          <td class="admin-engagements-national-table-actions">
            ${merged ? (swimmer.napSource ? `<button class="ghost-button" type="button" data-engagement-national-swimmer-action="repair-publication" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">Finaliser la fusion</button>` : `
              <button class="ghost-button" type="button" title="À utiliser seulement si la fiche publique ou les performances ne sont pas correctement synchronisées après la fusion." data-engagement-national-swimmer-action="repair-publication" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">Réparer la publication publique</button>
            `) : `
              <details class="admin-national-row-menu">
                <summary aria-label="Actions pour ${portalActions.escapeHtml(name)}" title="Actions">&#8942;</summary>
                <div>
                  <button class="ghost-button" type="button" data-engagement-national-swimmer-action="edit" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">Modifier la fiche</button>
                  ${!portalState.engagementNationalSwimmerMergeMode ? "" : `<button class="ghost-button" type="button" data-engagement-national-swimmer-action="merge" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">Choisir une autre cible</button>`}
                  ${sourceType !== "engagement" && !swimmer.napSource ? "" : `<button class="ghost-button" type="button" data-engagement-national-swimmer-action="${active ? "disable" : "enable"}" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">${active ? "Désactiver" : "Réactiver"}</button>`}
                  ${sourceType === "engagement" || swimmer.napSource ? `<button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-national-swimmer-action="delete" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">Supprimer</button>` : ""}
                </div>
              </details>
            `}
          </td>
        </tr>
        ${mergeOpen ? `
          <tr class="admin-engagements-national-merge-row">
            <td colspan="12">
              <div class="admin-engagements-national-merge" data-engagement-national-swimmer-merge="${portalActions.escapeHtml(sourceKey)}">
                <label>
                  <span>Recherche cible</span>
                  <input type="search" value="${portalActions.escapeHtml(portalState.engagementNationalSwimmerMergeQuery)}" placeholder="Nom, prénom ou licence" data-engagement-national-swimmer-merge-query>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-swimmer-action="search-merge" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}" ${portalState.engagementNationalSwimmerMergeLoading ? "disabled" : ""}>Rechercher</button>
                </div>
                <label class="admin-engagements-national-merge-target">
                  <span>Fusionner vers</span>
                  <select data-engagement-national-swimmer-merge-target>
                    <option value="">Choisir la fiche à conserver</option>
                    ${mergeTargets.map((candidate) => {
                          const candidateId = candidate.id || candidate.swimmerIndexId || "";
                          const candidateSource = candidate.source || "performances";
                          const candidateName = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.name || candidateId;
                          return `<option value="${portalActions.escapeHtml(`${candidateSource}:${candidateId}`)}">${portalActions.escapeHtml(candidateName)} - ${portalActions.escapeHtml(candidate.licenseNumber || "sans licence")} - ${portalActions.escapeHtml(portalActions.clubDisplayLabel(candidate, { fallback: "club non renseigné" }))} - ${portalActions.escapeHtml(candidateSource === "performances" ? "LivePalmes" : "création club")}</option>`;
                        }).join("")}
                  </select>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-swimmer-action="cancel-merge" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}">Annuler</button>
                  <button type="button" data-engagement-national-swimmer-action="confirm-merge" data-engagement-national-swimmer-id="${portalActions.escapeHtml(sourceId)}" data-engagement-national-swimmer-source="${portalActions.escapeHtml(sourceType)}" ${mergeTargets.length ? "" : "disabled"}>Confirmer la fusion</button>
                </div>
                <p class="admin-engagements-request-note">${portalActions.escapeHtml(portalState.engagementNationalSwimmerMergeLoading ? "Recherche en cours..." : mergeTargets.length ? `${mergeTargets.length} cible${mergeTargets.length > 1 ? "s" : ""} trouvée${mergeTargets.length > 1 ? "s" : ""}.` : "Lancez une recherche pour trouver la fiche à conserver.")}</p>
              </div>
            </td>
          </tr>
        ` : ""}
      `;
        }).join("");
        portalContext.elements.engagementsNationalSwimmersList.innerHTML = `
      <div class="admin-engagements-national-table-wrap">
        <table class="admin-engagements-national-table" data-merge-mode="${portalState.engagementNationalSwimmerMergeMode ? "true" : "false"}">
          <thead>
            <tr>
              <th class="admin-engagements-national-choice">Conserver</th>
              <th class="admin-engagements-national-choice">Fusionner</th>
              <th class="admin-engagements-national-merge-only">Alerte</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Naissance</th>
              <th>Sexe</th>
              <th>Licence</th>
              <th>Club</th>
              <th>Perf.</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
        portalActions.updateEngagementNationalSwimmerSelectionState();
      }

    function updateEngagementNationalSwimmersStatus(filteredCount = portalState.engagementNationalSwimmers.length) {
        if (!portalContext.elements.engagementsNationalSwimmersStatus) return;
        const total = portalState.engagementNationalSwimmers.length;
        if (!total) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Aucun nageur charge. Lancez une recherche.";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
          return;
        }
        const filtered = Math.max(0, Math.min(total, Number(filteredCount) || 0));
        portalContext.elements.engagementsNationalSwimmersStatus.textContent = filtered === total
          ? `${total} nageur${total > 1 ? "s" : ""} charge${total > 1 ? "s" : ""}.`
          : `${filtered} nageur${filtered > 1 ? "s" : ""} affiche${filtered > 1 ? "s" : ""} sur ${total} charge${total > 1 ? "s" : ""}.`;
        portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
      }

    function engagementSwimmerChangeSummary(current = {}, proposed = {}) {
        const fields = [
          ["lastName", "Nom", (value) => value || "Non renseigné"],
          ["firstName", "Prénom", (value) => value || "Non renseigné"],
          ["birthDate", "Naissance", (value) => value ? portalActions.formatShortDate(value) : "Non renseignée"],
          ["sex", "Sexe", (value) => value || "Non renseigné"],
          ["licenseNumber", "Licence", (value) => value || "Non renseignée"],
          ["nonSelectable", "Statut NS", value => value === true ? "NS" : "Retrait NS"]
        ];
        return fields
          .filter(([key]) => String(current[key] || "") !== String(proposed[key] || ""))
          .map(([key, label, format]) => ({ label, before: format(current[key]), after: format(proposed[key]) }));
      }

    function updateEngagementSwimmerChangeRequestsBadge(count = portalState.engagementSwimmerChangeRequests.length) {
        const total = Math.max(0, Number(count) || 0);
        if (portalContext.elements.engagementsSwimmerChangeRequestsBadge) {
          portalContext.elements.engagementsSwimmerChangeRequestsBadge.hidden = total === 0;
          portalContext.elements.engagementsSwimmerChangeRequestsBadge.textContent = String(total);
        }
        if (portalContext.elements.engagementsSwimmerChangeRequestsCount) {
          portalContext.elements.engagementsSwimmerChangeRequestsCount.textContent = `${total} en attente`;
        }
      }

    function renderEngagementSwimmerChangeRequests() {
        const section = portalContext.elements.engagementsSwimmerChangeRequests;
        const mount = portalContext.elements.engagementsSwimmerChangeRequestsList;
        if (!section || !mount) return;
        updateEngagementSwimmerChangeRequestsBadge();
        if (portalState.engagementSwimmerChangeRequestsLoading) {
          mount.innerHTML = '<p class="admin-engagements-empty">Chargement des demandes de correction...</p>';
          updateEngagementNationalRequestsPresentation();
          return;
        }
        if (!portalState.engagementSwimmerChangeRequests.length) {
          mount.innerHTML = "";
          updateEngagementNationalRequestsPresentation();
          return;
        }
        mount.innerHTML = portalState.engagementSwimmerChangeRequests.map((item) => {
          const current = item.current || {};
          const proposed = item.proposed || {};
          const name = portalActions.engagementSwimmerDisplayName(current, "Nageur");
          const changes = engagementSwimmerChangeSummary(current, proposed);
          const duplicate = item.reportType === "duplicate";
          const nsRequest = item.requestType === "swimmer-ns";
          const requesterName = [item.requestedByFirstName, item.requestedByLastName].filter(Boolean).join(" ");
          const requesterIdentity = [requesterName, item.requestedByEmail].filter(Boolean).join(" · ") || "Non renseigné";
          return `
        <article class="admin-engagements-swimmer-change-request" data-engagement-swimmer-change-request="${portalActions.escapeHtml(item.id || "")}">
          <div class="admin-engagements-swimmer-change-request-head">
            <div>
              <strong>${portalActions.escapeHtml(name)}${nsRequest ? " · Retrait du statut NS" : item.requestType === "person-change" ? " · Officiel" : duplicate ? " · Doublon à examiner" : ""}</strong>
              <span>${portalActions.escapeHtml(portalActions.clubDisplayLabel(item, { fallback: "Club non renseigné" }))} · ${portalActions.escapeHtml(portalActions.formatAccessDateTime(item.requestedAt) || "Date inconnue")}</span>
            </div>
            <span class="admin-engagements-request-status" data-status="pending">En attente</span>
          </div>
          ${duplicate ? '<p class="admin-engagements-request-note">Signalement uniquement. Vérifiez les fiches dans la gestion des nageurs ; une fusion reste une opération nationale distincte. Clore ce signalement ne modifie aucune fiche.</p>' : '<div class="admin-engagements-swimmer-change-diff">'}
            ${changes.map((change) => `
              <div>
                <span>${portalActions.escapeHtml(change.label)}</span>
                <del>${portalActions.escapeHtml(change.before)}</del>
                <strong>${portalActions.escapeHtml(change.after)}</strong>
              </div>
            `).join("")}
          ${duplicate ? "" : "</div>"}
          <p class="admin-engagements-request-note"><strong>Demandée par :</strong> ${portalActions.escapeHtml(requesterIdentity)}</p>
          <p class="admin-engagements-request-note"><strong>Motif du club :</strong> ${portalActions.escapeHtml(item.reason || "Non précisé")}</p>
          <label class="admin-engagements-swimmer-change-resolution-note">
            <span>Commentaire national <small>(${duplicate ? "obligatoire" : "facultatif"})</small></span>
            <input type="text" maxlength="500" placeholder="Précision pour le club" data-engagement-swimmer-change-resolution-note>
          </label>
          <div class="admin-engagements-request-actions">
            ${duplicate ? `<button type="button" data-engagement-swimmer-change-decision="approved" data-engagement-swimmer-change-request-id="${portalActions.escapeHtml(item.id || "")}">Clore le signalement</button>` : `<button class="ghost-button" type="button" data-engagement-swimmer-change-decision="rejected" data-engagement-swimmer-change-request-id="${portalActions.escapeHtml(item.id || "")}">Refuser</button>
            ${nsRequest ? "" : `<button class="ghost-button" type="button" data-engagement-swimmer-change-edit="${portalActions.escapeHtml(item.id || "")}">Modifier et valider</button>`}
            <button type="button" data-engagement-swimmer-change-decision="approved" data-engagement-swimmer-change-request-id="${portalActions.escapeHtml(item.id || "")}">Valider telle quelle</button>`}
          </div>
        </article>
      `;
        }).join("");
        updateEngagementNationalRequestsPresentation();
      }

    async function loadEngagementSwimmerChangeRequests({ force = false } = {}) {
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementSwimmerChangeRequestsLoading) return;
        if (portalState.engagementSwimmerChangeRequestsLoaded && !force) return;
        portalState.engagementSwimmerChangeRequestsLoading = true;
        updateEngagementNationalRequestsPresentation();
        if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = "Chargement des demandes...";
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "loading";
        }
        renderEngagementSwimmerChangeRequests();
        try {
          const result = await portalActions.callFunction("listEngagementSwimmerChangeRequests", { status: "pending", limit: 50 });
          portalState.engagementSwimmerChangeRequests = Array.isArray(result.requests) ? result.requests : [];
          portalState.engagementSwimmerChangeRequestsLoaded = true;
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = "";
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "neutral";
          }
        } catch (error) {
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = `Demandes impossibles à charger : ${error?.message || error}`;
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementSwimmerChangeRequestsLoading = false;
          renderEngagementSwimmerChangeRequests();
          updateEngagementNationalRequestsPresentation();
        }
      }

    function openEngagementSwimmerChangeRequestReview(requestId = "", opener = null, card = null) {
        const item = portalState.engagementSwimmerChangeRequests.find((request) => request.id === requestId);
        if(item?.requestType === "swimmer-ns")return;
        if (!item || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const current = item.current || {};
        const proposed = item.proposed || {};
        const swimmer = {
          ...current,
          ...proposed,
          id: item.requestedSwimmerId || current.id || current.swimmerIndexId || "",
          swimmerIndexId: item.requestedSwimmerId || current.swimmerIndexId || current.id || "",
          source: item.requestedSource || item.targetSource || current.source || "performances",
          identityKey: current.identityKey || "",
          clubId: item.clubId || current.clubId || "",
          clubName: item.clubName || current.clubName || ""
        };
        const resolutionNote = String(card?.querySelector("[data-engagement-swimmer-change-resolution-note]")?.value || "").trim();
        openEngagementSwimmerCorrectionDialog(swimmer, "review", opener, {
          requestId,
          card,
          resolutionNote
        });
      }

    async function resolveEngagementSwimmerChangeRequest(requestId = "", decision = "", card = null, options = {}) {
        if (!requestId || !["approved", "rejected"].includes(decision) || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const duplicate=portalState.engagementSwimmerChangeRequests.find(item=>item.id===requestId)?.reportType==="duplicate";
        const verb = decision === "approved" ? "Valider" : "Refuser";
        if (options.confirm !== false && !global.confirm(duplicate ? "Clore ce signalement sans modifier ni fusionner de fiche ?" : `${verb} cette demande de correction ?`)) return;
        const resolutionNote = String(options.resolutionNote ?? card?.querySelector("[data-engagement-swimmer-change-resolution-note]")?.value ?? "").trim();
        const buttons = card?.querySelectorAll("button") || [];
        buttons.forEach((button) => { button.disabled = true; });
        if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = decision === "approved" ? "Application de la correction..." : "Refus de la demande...";
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("resolveEngagementSwimmerChangeRequest", {
            requestId,
            decision,
            resolutionNote,
            ...(options.proposed && typeof options.proposed === "object" ? { proposed: options.proposed } : {})
          });
          const correctedPerson=result?.result?.person;
          if(correctedPerson){
            portalState.engagementNationalPeopleLoaded=false;
            if(portalState.engagementClubPeople.some(person=>person.id===correctedPerson.id&&String(person.clubId)===String(correctedPerson.clubId))){
              portalState.engagementClubPeople=portalState.engagementClubPeople.map(person=>person.id===correctedPerson.id?correctedPerson:person);
              portalActions.renderEngagementClubPeople();
            }
          }
          portalState.portalPendingOverviewLoaded = false;
          portalState.engagementSwimmerChangeRequestsLoaded = false;
          portalState.engagementNationalSwimmersLoaded = false;
          portalActions.invalidateEngagementClubSwimmersCache();
          await loadEngagementSwimmerChangeRequests({ force: true });
          await portalActions.loadPortalPendingOverview({ force: true });
          if (portalContext.elements.engagementsNationalSwimmersSearch?.value.trim().length >= 2) {
            await portalActions.loadEngagementNationalSwimmers({ force: true, silent: true });
          }
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            const publicWarning = result?.result?.publicSnapshot?.ok === false
              ? " La fiche a été corrigée, mais sa publication publique devra être relancée."
              : "";
            const notificationStatus = result?.request?.resolutionNotification?.status || "";
            const testMailDisabled = global.LivePalmesEnvironment?.isTest === true && result?.request?.resolutionNotification?.reason === "test-emails-disabled";
            const mailWarning = notificationStatus && notificationStatus !== "sent" && !testMailDisabled && !duplicate && result?.request?.requestType !== "swimmer-ns"
              ? " La demande a bien été traitée, mais l’e-mail au demandeur n’a pas été envoyé."
              : "";
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = duplicate ? "Signalement clos. Aucune fiche n’a été modifiée ou fusionnée." : `${decision === "approved" ? "Correction validée." : "Demande refusée."}${publicWarning}${mailWarning}`;
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = publicWarning || mailWarning ? "warning" : "ok";
          }
          return result;
        } catch (error) {
          buttons.forEach((button) => { button.disabled = false; });
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "error";
          }
          if (options.rethrow) throw error;
          return null;
        }
      }

    function openEngagementAccessRequestRejectDialog(requestId = "") {
        const request = portalState.engagementAccessRequests.find((item) => item.id === requestId);
        if (!request || !portalContext.elements.engagementsAccessRequestRejectDialog) return;
        portalContext.elements.engagementsAccessRequestRejectForm?.reset();
        if (portalContext.elements.engagementsAccessRequestRejectId) portalContext.elements.engagementsAccessRequestRejectId.value = requestId;
        if (portalContext.elements.engagementsAccessRequestRejectMessage) portalContext.elements.engagementsAccessRequestRejectMessage.textContent = "";
        portalContext.elements.engagementsAccessRequestRejectDialog.showModal();
        portalContext.elements.engagementsAccessRequestRejectReason?.focus();
      }

    function closeEngagementAccessRequestRejectDialog() {
        if (portalContext.elements.engagementsAccessRequestRejectDialog?.open) portalContext.elements.engagementsAccessRequestRejectDialog.close();
      }

    async function submitEngagementAccessRequestRejection(event) {
        event?.preventDefault?.();
        const requestId = portalContext.elements.engagementsAccessRequestRejectId?.value || "";
        const reason = String(portalContext.elements.engagementsAccessRequestRejectReason?.value || "").trim();
        if (!requestId || !reason) return;
        const button = portalContext.elements.engagementsAccessRequestRejectForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsAccessRequestRejectMessage) {
          portalContext.elements.engagementsAccessRequestRejectMessage.textContent = "Refus et envoi de l’e-mail en cours...";
          portalContext.elements.engagementsAccessRequestRejectMessage.dataset.tone = "loading";
        }
        const resolved = await resolveEngagementAccessRequest(requestId, "rejected", null, reason);
        if (resolved) closeEngagementAccessRequestRejectDialog();
        else if (portalContext.elements.engagementsAccessRequestRejectMessage) {
          portalContext.elements.engagementsAccessRequestRejectMessage.textContent = "Refus impossible. Vérifiez le message affiché dans la liste des demandes.";
          portalContext.elements.engagementsAccessRequestRejectMessage.dataset.tone = "error";
        }
        if (button) button.disabled = false;
      }

    function closeEngagementSwimmerCorrectionDialog() {
        if (portalContext.elements.engagementsSwimmerCorrectionDialog?.open) portalContext.elements.engagementsSwimmerCorrectionDialog.close();
      }

    function resetEngagementSwimmerCorrectionDialog() {
        portalContext.elements.engagementsSwimmerCorrectionForm?.reset();
        if(portalContext.elements.engagementsSwimmerCorrectionClub){portalContext.elements.engagementsSwimmerCorrectionClub.hidden=true;portalContext.elements.engagementsSwimmerCorrectionClub.replaceChildren();}
        if (portalContext.elements.engagementsSwimmerCorrectionForm) {
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.napSource;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.expectedFingerprint;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.expectedLicenseNumber;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialClubId;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.identityKind;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialIdentity;
          delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.nsSaving;
        }
        if (portalContext.elements.engagementsSwimmerCorrectionLicense) portalContext.elements.engagementsSwimmerCorrectionLicense.readOnly = false;
        for(const field of [portalContext.elements.engagementsSwimmerCorrectionLastName,portalContext.elements.engagementsSwimmerCorrectionFirstName,portalContext.elements.engagementsSwimmerCorrectionBirthDate,portalContext.elements.engagementsSwimmerCorrectionSex,portalContext.elements.engagementsSwimmerCorrectionLicense]) if(field) field.disabled=false;
        portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm, false);
        if (portalContext.elements.engagementsSwimmerCorrectionReason) portalContext.elements.engagementsSwimmerCorrectionReason.required = false;
        if (portalContext.elements.engagementsSwimmerCorrectionMessage) {
          portalContext.elements.engagementsSwimmerCorrectionMessage.textContent = "";
          portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone = "neutral";
          portalContext.elements.engagementsSwimmerCorrectionMessage.classList.remove("is-loading");
        }
      }

    function openEngagementSwimmerCorrectionDialog(swimmer = {}, mode = "request", opener = null, options = {}) {
        const dialog = portalContext.elements.engagementsSwimmerCorrectionDialog;
        if (!dialog || !swimmer) return;
        resetEngagementSwimmerCorrectionDialog();
        portalState.engagementSwimmerCorrectionOpener = opener instanceof HTMLElement ? opener : null;
        const direct = mode === "direct";
        const review = mode === "review";
        const duplicate = mode === "duplicate" && swimmer.napSource === true;
        const official=swimmer.nativePersonKind==="officials"||swimmer.source==="officials";
        const identityLegend=portalContext.elements.engagementsSwimmerCorrectionForm?.querySelector?.("legend");
        if(identityLegend)identityLegend.textContent=official?"Identité de la personne":"Identité du nageur";
        const reasonContainer=portalContext.elements.engagementsSwimmerCorrectionReason?.closest?.("label");
        if(reasonContainer)reasonContainer.hidden=false;
        if(portalContext.elements.engagementsSwimmerCorrectionForm) {
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.identityKind=official?"official":"swimmer";
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialIdentity=JSON.stringify(Object.fromEntries(["firstName","lastName","birthDate","sex","licenseNumber"].map(key=>[key,String(swimmer[key]||"")])));
        }
        portalState.engagementSwimmerCorrectionReview = review ? {
          requestId: String(options.requestId || "").trim(),
          card: options.card || null
        } : null;
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur");
        if(direct&&swimmer.napSource&&portalContext.elements.engagementsSwimmerCorrectionClub&&global.LivePalmesSwimmerClubs){portalContext.elements.engagementsSwimmerCorrectionClub.hidden=false;global.LivePalmesSwimmerClubs.getTools(portalActions.callFunction).mount(portalContext.elements.engagementsSwimmerCorrectionClub,swimmer.clubId);}
        if (swimmer.napSource && portalContext.elements.engagementsSwimmerCorrectionForm) {
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.napSource = "true";
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.expectedFingerprint = swimmer.napFingerprint || "";
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.expectedLicenseNumber = String(swimmer.licenseNumber ?? "");
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialClubId = String(swimmer.clubId ?? "");
          portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession=String(Number(portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession||0)+1);
          if (portalContext.elements.engagementsSwimmerCorrectionLicense) portalContext.elements.engagementsSwimmerCorrectionLicense.readOnly = !direct&&(review||!!swimmer.licenseNumber);
        }
        if (portalContext.elements.engagementsSwimmerCorrectionMode) portalContext.elements.engagementsSwimmerCorrectionMode.value = duplicate ? "duplicate" : review ? "review" : direct ? "direct" : "request";
        if (portalContext.elements.engagementsSwimmerCorrectionSource) portalContext.elements.engagementsSwimmerCorrectionSource.value = swimmer.source || "performances";
        if (portalContext.elements.engagementsSwimmerCorrectionId) portalContext.elements.engagementsSwimmerCorrectionId.value = swimmer.id || swimmer.swimmerIndexId || "";
        if (portalContext.elements.engagementsSwimmerCorrectionIdentityKey) portalContext.elements.engagementsSwimmerCorrectionIdentityKey.value = swimmer.identityKey || "";
        if (portalContext.elements.engagementsSwimmerCorrectionLastName) portalContext.elements.engagementsSwimmerCorrectionLastName.value = swimmer.lastName || "";
        if (portalContext.elements.engagementsSwimmerCorrectionFirstName) portalContext.elements.engagementsSwimmerCorrectionFirstName.value = swimmer.firstName || "";
        if (portalContext.elements.engagementsSwimmerCorrectionLastName) portalContext.elements.engagementsSwimmerCorrectionLastName.maxLength = swimmer.napSource ? 64 : 80;
        if (portalContext.elements.engagementsSwimmerCorrectionFirstName) portalContext.elements.engagementsSwimmerCorrectionFirstName.maxLength = swimmer.napSource ? 64 : 80;
        if (portalContext.elements.engagementsSwimmerCorrectionBirthDate) portalContext.elements.engagementsSwimmerCorrectionBirthDate.value = swimmer.birthDate || "";
        if (portalContext.elements.engagementsSwimmerCorrectionSex) portalContext.elements.engagementsSwimmerCorrectionSex.value = swimmer.sex || "";
        if (portalContext.elements.engagementsSwimmerCorrectionLicense) portalContext.elements.engagementsSwimmerCorrectionLicense.value = String(swimmer.licenseNumber ?? "");
        if (portalContext.elements.engagementsSwimmerCorrectionLicense) {
          portalContext.elements.engagementsSwimmerCorrectionLicense.pattern = swimmer.napSource ? ".*" : "[A-Za-z]-[0-9]{2}-[0-9]+";
          portalContext.elements.engagementsSwimmerCorrectionLicense.maxLength = swimmer.napSource ? 100 : 60;
          portalContext.elements.engagementsSwimmerCorrectionLicense.title = swimmer.napSource ? "Numéro de licence NAP ; une autre fiche ne peut pas utiliser ce numéro." : "Format attendu : A-12-34567";
        }
        if (portalContext.elements.engagementsSwimmerCorrectionTitle) portalContext.elements.engagementsSwimmerCorrectionTitle.textContent = duplicate ? "Signaler un doublon" : review ? "Modifier et valider la demande" : direct ? "Modifier le nageur" : "Demander une correction";
        if (portalContext.elements.engagementsSwimmerCorrectionContext) portalContext.elements.engagementsSwimmerCorrectionContext.textContent = `${name} · ${portalActions.clubDisplayLabel(swimmer, { fallback: "Club non renseigné" })}`;
        if (portalContext.elements.engagementsSwimmerCorrectionReasonLabel) portalContext.elements.engagementsSwimmerCorrectionReasonLabel.textContent = duplicate ? "Précisez les fiches qui semblent en double" : review ? "Commentaire national (facultatif)" : direct ? "Motif de la correction" : swimmer.napSource ? "Motif de la demande" : "Motif de la demande (facultatif)";
        for(const field of [portalContext.elements.engagementsSwimmerCorrectionLastName,portalContext.elements.engagementsSwimmerCorrectionFirstName,portalContext.elements.engagementsSwimmerCorrectionBirthDate,portalContext.elements.engagementsSwimmerCorrectionSex,portalContext.elements.engagementsSwimmerCorrectionLicense]) if(field) field.disabled=duplicate;
        for(const field of [portalContext.elements.engagementsSwimmerCorrectionLastName,portalContext.elements.engagementsSwimmerCorrectionFirstName,portalContext.elements.engagementsSwimmerCorrectionBirthDate,portalContext.elements.engagementsSwimmerCorrectionSex]) if(field)field.required=!official;
        const warning=portalContext.elements.engagementsSwimmerCorrectionForm?.querySelector?.(".admin-engagements-swimmer-correction-warning");
        if(warning) warning.textContent=duplicate ? "Le signalement est transmis à l’administration nationale. Aucune identité, performance ni inscription n’est modifiée. Aucune fiche n’est fusionnée ou supprimée automatiquement." : "Une modification du nom, du prénom ou de la date de naissance peut changer le rattachement des performances. Pour une fiche en double, utilisez l’action « Signaler un doublon » dans la liste.";
        if (portalContext.elements.engagementsSwimmerCorrectionReason) {
          portalContext.elements.engagementsSwimmerCorrectionReason.required = direct || (!review && swimmer.napSource === true);
          portalContext.elements.engagementsSwimmerCorrectionReason.value = review ? String(options.resolutionNote || "") : "";
        }
        if (portalContext.elements.engagementsSwimmerCorrectionSubmit) {
          portalContext.elements.engagementsSwimmerCorrectionSubmit.textContent = duplicate ? "Envoyer le signalement" : review ? "Valider la demande" : direct ? "Enregistrer la correction" : "Envoyer la demande";
          delete portalContext.elements.engagementsSwimmerCorrectionSubmit.dataset.idleLabel;
        }
        if(swimmer.napSource&&!direct&&!review&&!duplicate)updateClubIdentityCorrectionAction();
        function openSwimmerNs(swimmer,allowed) {
            const form=portalContext.elements.engagementsSwimmerCorrectionForm;
            const section=form?.querySelector?.("[data-swimmer-ns]");
            if(!section)return;
            const checkbox=section.querySelector("[data-swimmer-ns-checkbox]"),message=form.querySelector("[data-swimmer-ns-status]");
            section.hidden=!allowed||swimmer.napSource!==true;
            checkbox.onchange=null;checkbox.checked=swimmer.nonSelectable===true;checkbox.disabled=true;
            message.hidden=true;message.textContent="";message.dataset.tone="neutral";message.classList.remove("is-loading");message.removeAttribute("aria-busy");
            if(section.hidden)return;
            const session=form.dataset.correctionSession,scope=portalState.engagementClubPeopleRequestVersion;
            const current=()=>!section.hidden&&form.dataset.napSource==="true"&&form.dataset.correctionSession===session&&scope===portalState.engagementClubPeopleRequestVersion&&portalContext.elements.engagementsSwimmerCorrectionDialog?.open;
            let saved=null,pending=false,busy=true;
            const update=()=>{
              checkbox.disabled=busy||!saved?.swimmer?.nsAvailable||pending;
              section.setAttribute("aria-busy",String(busy));
            };
            const feedback=(text,tone="ok",loading=false)=>{
              message.textContent=text;message.hidden=!text;message.dataset.tone=tone;
              message.classList.toggle("is-loading",loading);message.setAttribute("aria-busy",String(loading));
            };
            const display=(result,announce=false)=>{
              saved=result;pending=result.nsRequest?.status==="pending";checkbox.checked=result.swimmer.nonSelectable===true;
              const fields=["nonSelectable","nsAvailable","nsVersion","napNsFingerprint"];
              const patch=Object.fromEntries(fields.map(key=>[key,result.swimmer[key]]));
              portalState.engagementClubSwimmers=portalState.engagementClubSwimmers.map(item=>String(item.id||item.swimmerIndexId)===String(swimmer.id||swimmer.swimmerIndexId)?{...item,...patch}:item);
              portalActions.writeEngagementClubSwimmersCache();portalActions.renderEngagementClubSwimmersDirectory();
              const rejected=result.nsRequest?.status==="rejected";
              const text=!result.swimmer.nsAvailable?"Statut NS indisponible. Les autres modifications restent disponibles.":pending?"Retrait NS en attente de validation nationale. Le nageur reste NS.":rejected?"Retrait NS refusé. Le nageur reste NS."+(result.nsRequest.resolutionNote?" Motif : "+result.nsRequest.resolutionNote:""):announce?"Statut NS enregistré.":"";
              feedback(text,!result.swimmer.nsAvailable||rejected?"warning":"ok");
            };
            feedback("Chargement du statut NS…","loading",true);update();
            portalActions.callFunction("requestEngagementClubSwimmerChange",{nsAction:"read",swimmerId:String(swimmer.id||swimmer.swimmerIndexId)})
              .then(result=>{if(current())display(result);})
              .catch(error=>{if(current())feedback("Statut NS indisponible : "+(error?.message||error)+". Les autres modifications restent disponibles.","error");})
              .finally(()=>{if(current()){busy=false;update();}});
            checkbox.onchange=async event=>{
              event.stopPropagation();
              if(busy||pending||!saved||form.getAttribute("aria-busy")==="true"){
                checkbox.checked=saved?.swimmer?.nonSelectable===true;return;
              }
              const nonSelectable=checkbox.checked;
              busy=true;form.dataset.nsSaving="true";update();
              portalActions.setFormPending(form,true,nonSelectable?"Enregistrement NS en cours…":"Envoi en cours…");
              feedback(nonSelectable?"Enregistrement du statut NS en cours…":"Envoi de la demande de retrait NS en cours…","loading",true);
              try{
                const result=await portalActions.callFunction("requestEngagementClubSwimmerChange",{nsAction:"save",swimmerId:String(swimmer.id||swimmer.swimmerIndexId),nonSelectable,expectedNsFingerprint:saved.swimmer.napNsFingerprint});
                if(!current())return;
                display(result,true);portalState.engagementSwimmerChangeRequestsLoaded=false;portalState.portalPendingOverviewLoaded=false;
              }catch(error){if(current()){
                checkbox.checked=saved.swimmer.nonSelectable===true;saved=null;
                feedback("Statut NS à vérifier : "+(error?.message||error)+". Fermez puis rouvrez la fiche avant de réessayer.","error");
              }}finally{if(current()){
                busy=false;delete form.dataset.nsSaving;portalActions.setFormPending(form,false);
                if(portalContext.elements.engagementsSwimmerCorrectionSubmit)delete portalContext.elements.engagementsSwimmerCorrectionSubmit.dataset.idleLabel;
                update();updateClubIdentityCorrectionAction();
              }}
            };
          }

        openSwimmerNs(swimmer,!direct&&!review&&!duplicate&&!official);
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        (duplicate ? portalContext.elements.engagementsSwimmerCorrectionReason : portalContext.elements.engagementsSwimmerCorrectionLastName)?.focus();
      }

    function updateClubIdentityCorrectionAction() {
        const form=portalContext.elements.engagementsSwimmerCorrectionForm;
        if(form?.dataset.nsSaving==="true")return;
        if(!form?.dataset.initialIdentity||portalContext.elements.engagementsSwimmerCorrectionMode?.value!=="request")return;
        const after=Object.fromEntries(["FirstName","LastName","BirthDate","Sex","License"].map((suffix,index)=>[["firstName","lastName","birthDate","sex","licenseNumber"][index],portalContext.elements[`engagementsSwimmerCorrection${suffix}`]?.value||""]));
        let action="request";
        try{action=global.LivePalmesClubIdentity.classify(JSON.parse(form.dataset.initialIdentity),after,form.dataset.identityKind==="official").action;}catch{}
        const complete=action==="complete";
        for(const field of [portalContext.elements.engagementsSwimmerCorrectionLastName,portalContext.elements.engagementsSwimmerCorrectionFirstName,portalContext.elements.engagementsSwimmerCorrectionBirthDate,portalContext.elements.engagementsSwimmerCorrectionSex])if(field)field.required=!complete&&form.dataset.identityKind!=="official";
        if(portalContext.elements.engagementsSwimmerCorrectionReason)portalContext.elements.engagementsSwimmerCorrectionReason.required=!complete;
        const reasonContainer=portalContext.elements.engagementsSwimmerCorrectionReason?.closest?.("label");if(reasonContainer)reasonContainer.hidden=complete;
        if(portalContext.elements.engagementsSwimmerCorrectionTitle)portalContext.elements.engagementsSwimmerCorrectionTitle.textContent=complete?"Compléter la fiche":"Demander une correction";
        if(portalContext.elements.engagementsSwimmerCorrectionSubmit)portalContext.elements.engagementsSwimmerCorrectionSubmit.textContent=complete?"Enregistrer les champs manquants":"Envoyer la demande";
        const warning=form.querySelector?.(".admin-engagements-swimmer-correction-warning");
        if(warning)warning.textContent=complete?"Les champs vides sont complétés directement, sans demande nationale. La licence se verrouille à sa première saisie ; sa validité saisonnière reste contrôlée séparément.":"Toute correction d’un champ déjà renseigné est soumise à l’administration nationale. La fiche actuelle reste utilisée jusqu’à sa décision.";
      }

    async function submitEngagementSwimmerCorrection() {
        if(portalContext.elements.engagementsSwimmerCorrectionForm?.getAttribute?.("aria-busy")==="true")return;
        if (!portalContext.elements.engagementsSwimmerCorrectionForm?.reportValidity()) return;
        const correctionSession=portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession;
        const clubScopeVersion=portalState.engagementClubPeopleRequestVersion;
        const mode = portalContext.elements.engagementsSwimmerCorrectionMode?.value || "request";
        const direct = mode === "direct";
        const review = mode === "review";
        const duplicate = mode === "duplicate";
        if (direct && portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource !== "true" && !global.confirm("Enregistrer cette correction nationale ?")) return;
        if (review && !global.confirm("Valider cette demande avec les valeurs affichées ?")) return;
        const payload = {
          napSource: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource === "true",
          expectedFingerprint: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.expectedFingerprint || "",
          expectedLicenseNumber: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.expectedLicenseNumber || "",
          source: portalContext.elements.engagementsSwimmerCorrectionSource?.value || "performances",
          swimmerId: portalContext.elements.engagementsSwimmerCorrectionId?.value || "",
          identityKey: portalContext.elements.engagementsSwimmerCorrectionIdentityKey?.value || "",
          proposed: {
            lastName: portalContext.elements.engagementsSwimmerCorrectionLastName?.value || "",
            firstName: portalContext.elements.engagementsSwimmerCorrectionFirstName?.value || "",
            birthDate: portalContext.elements.engagementsSwimmerCorrectionBirthDate?.value || "",
            sex: portalContext.elements.engagementsSwimmerCorrectionSex?.value || "",
            licenseNumber: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource === "true" ? String(portalContext.elements.engagementsSwimmerCorrectionLicense?.value || "").trim() : portalActions.formatEngagementSwimmerLicense(portalContext.elements.engagementsSwimmerCorrectionLicense?.value || "")
          },
          reason: portalContext.elements.engagementsSwimmerCorrectionReason?.value || ""
        };
        if(portalContext.elements.engagementsSwimmerCorrectionForm.dataset.identityKind==="official")payload.personId=payload.swimmerId;
        if(payload.napSource&&!direct&&!review&&!duplicate) {
          try {
            const official=portalContext.elements.engagementsSwimmerCorrectionForm.dataset.identityKind==="official";
            const plan=global.LivePalmesClubIdentity.classify(JSON.parse(portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialIdentity),payload.proposed,official);
            if(plan.action==="none")throw Error("Aucune modification.");
            if(official)payload.personId=payload.swimmerId;
            payload.proposed=plan.patch;
            if(plan.action==="complete") {
              payload.completeLicense=!official;
              payload.completePerson=official;
            }
          }catch(error){if(portalContext.elements.engagementsSwimmerCorrectionMessage){portalContext.elements.engagementsSwimmerCorrectionMessage.textContent=error.message;portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone="error";}return;}
        } else if(payload.napSource&&!direct)delete payload.proposed.licenseNumber;
        if(direct&&payload.napSource&&portalContext.elements.engagementsSwimmerCorrectionClub){const club=portalContext.elements.engagementsSwimmerCorrectionClub.querySelector("select");if(!club?.value||!club.reportValidity())return;payload.proposed.clubId=club.value;}
        if (duplicate) { payload.reportType="duplicate"; payload.proposed={}; }
        portalActions.setFormPending(
          portalContext.elements.engagementsSwimmerCorrectionForm,
          true,
          review ? "Validation en cours…" : direct ? "Enregistrement en cours…" : "Envoi en cours…"
        );
        if (portalContext.elements.engagementsSwimmerCorrectionMessage) {
          portalContext.elements.engagementsSwimmerCorrectionMessage.textContent = review ? "Validation de la demande..." : direct ? "Enregistrement de la correction..." : "Envoi de la demande...";
          portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone = "loading";
          portalContext.elements.engagementsSwimmerCorrectionMessage.classList.add("is-loading");
        }
        try {
          if(direct&&payload.napSource){
            const clubChanged=String(payload.proposed.clubId)!==portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialClubId;
            if(clubChanged){
              const serialized=JSON.stringify(payload),previous=portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload;
              const retry=previous?JSON.parse(previous):null;
              if(retry?.serialized===serialized)payload.historicalClubConfirmation=retry.token;
              else{
                const preview=await portalActions.callFunction("updateEngagementNationalSwimmerIdentity",{...payload,previewOnly:true});
                if(!portalContext.elements.engagementsSwimmerCorrectionDialog?.open||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession)return;
                const summary=preview?.historicalClubPreview;
                if(!summary?.token)throw Error("Récapitulatif des clubs historiques indisponible. Rechargez la fiche.");
                const confirmed=await global.LivePalmesSwimmerClubs.getTools(portalActions.callFunction).confirmClubChange(summary);
                if(!portalContext.elements.engagementsSwimmerCorrectionDialog?.open||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession)return;
                if(!confirmed){
                  portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm,false);
                  if(portalContext.elements.engagementsSwimmerCorrectionMessage){portalContext.elements.engagementsSwimmerCorrectionMessage.textContent="Changement de club annulé. Aucune donnée modifiée.";portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone="neutral";portalContext.elements.engagementsSwimmerCorrectionMessage.classList.remove("is-loading");}
                  return;
                }
                payload.historicalClubConfirmation=summary.token;
                portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload=JSON.stringify({serialized,token:summary.token});
              }
            }else if(!global.confirm("Enregistrer cette correction nationale ?")){portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm,false);return;}
            if(!portalContext.elements.engagementsSwimmerCorrectionDialog?.open||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession)return;
          }
          const result = review
            ? await resolveEngagementSwimmerChangeRequest(
              portalState.engagementSwimmerCorrectionReview?.requestId || "",
              "approved",
              portalState.engagementSwimmerCorrectionReview?.card || null,
              {
                confirm: false,
                rethrow: true,
                proposed: payload.proposed,
                resolutionNote: payload.reason
              }
            )
            : payload.completePerson
              ? await portalActions.callFunction("saveEngagementClubPerson",{personId:payload.personId,expectedFingerprint:payload.expectedFingerprint,patch:payload.proposed})
              : await portalActions.callFunction(direct ? "updateEngagementNationalSwimmerIdentity" : "requestEngagementClubSwimmerChange", payload);
          if(payload.personId) {
            if(clubScopeVersion!==portalState.engagementClubPeopleRequestVersion||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession||!portalContext.elements.engagementsSwimmerCorrectionDialog?.open)return;
            const changedPerson=result.person||result.result?.person;
            if(changedPerson)portalState.engagementClubPeople=portalState.engagementClubPeople.filter(person=>person.id!==changedPerson.id).concat(changedPerson);
            portalActions.renderEngagementClubPeople();portalState.engagementSwimmerChangeRequestsLoaded=false;closeEngagementSwimmerCorrectionDialog();
            if(portalContext.elements.engagementsClubPeopleStatus){portalContext.elements.engagementsClubPeopleStatus.textContent=payload.completePerson?"Champs manquants enregistrés. Aucun visa demandé.":"Demande transmise au niveau national.";portalContext.elements.engagementsClubPeopleStatus.dataset.tone="ok";}
            return;
          }
          if(payload.completeLicense) {
            if(clubScopeVersion!==portalState.engagementClubPeopleRequestVersion||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession||!portalContext.elements.engagementsSwimmerCorrectionDialog?.open)return;
            const index=portalState.engagementClubSwimmers.findIndex(swimmer=>String(swimmer.id||swimmer.swimmerIndexId)===String(payload.swimmerId));
            if(index>=0){
              const saved=result.swimmer||{};
              portalState.engagementClubSwimmers[index]={...portalState.engagementClubSwimmers[index],licenseNumber:saved.licenseNumber,napFingerprint:saved.napFingerprint||portalState.engagementClubSwimmers[index].napFingerprint,...Object.fromEntries(["licenseVerificationStatus","licenseSeasonLabel","licenseSeasonStatus"].filter(key=>saved[key]!==undefined).map(key=>[key,saved[key]]))};
              portalActions.writeEngagementClubSwimmersCache();
            }
            portalActions.renderEngagementClubSwimmersDirectory();closeEngagementSwimmerCorrectionDialog();
            if(portalContext.elements.engagementsClubSwimmersDirectoryStatus){portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent="Licence enregistrée et numéro verrouillé. Le contrôle saisonnier est conservé.";portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone="ok";}
            return;
          }
          portalActions.invalidateEngagementClubSwimmersCache();
          portalState.engagementNationalSwimmersLoaded = false;
          portalState.engagementSwimmerChangeRequestsLoaded = false;
          closeEngagementSwimmerCorrectionDialog();
          if (review) {
            portalConfig.publicPerformanceSwimmerSearchShards.clear();
          } else if (direct) {
            portalConfig.publicPerformanceSwimmerSearchShards.clear();
            await Promise.all([
              portalContext.elements.engagementsNationalSwimmersSearch?.value.trim().length >= 2
                ? portalActions.loadEngagementNationalSwimmers({ force: true, silent: true })
                : Promise.resolve(),
              loadEngagementSwimmerChangeRequests({ force: true })
            ]);
            if (portalContext.elements.engagementsNationalSwimmersStatus) {
              const publicWarning = result?.publicSnapshot?.ok === false ? " Publication publique à relancer." : "";
              portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Nageur corrigé.${publicWarning}`;
              portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = publicWarning ? "warning" : "ok";
            }
          } else {
            await portalActions.loadEngagementClubSwimmers({ force: true, silent: true });
            if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
              portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = duplicate ? "Signalement transmis au niveau national. Aucune fiche n’a été modifiée." : "Demande envoyée au niveau national.";
              portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
            }
          }
        } catch (error) {
          if((payload.personId||payload.completeLicense)&&(clubScopeVersion!==portalState.engagementClubPeopleRequestVersion||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession||!portalContext.elements.engagementsSwimmerCorrectionDialog?.open))return;
          if(String(error?.code||"").endsWith("failed-precondition")||String(error?.code||"").endsWith("resource-exhausted"))delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload;
          portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm, false);
          if (portalContext.elements.engagementsSwimmerCorrectionMessage) {
            portalContext.elements.engagementsSwimmerCorrectionMessage.textContent = `Correction impossible : ${String(error?.message || error).replace(/^(Correction impossible :\s*)+/i, "")}`;
            portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone = "error";
            portalContext.elements.engagementsSwimmerCorrectionMessage.classList.remove("is-loading");
          }
        }
      }

    function normalizeEngagementNationalClub(row = []) {
        if (row && !Array.isArray(row) && typeof row === "object") {
          return {
            ...row,
            clubId: String(row.clubId || row.id || "").trim(),
            clubCode: String(row.clubCode || "").trim(),
            clubName: String(row.clubName || "").trim(),
            regionId: String(row.referenceRegionId || row.regionId || "").trim(),
            federalNumber: String(row.federalNumber || "").trim(),
            city: String(row.city || "").trim(),
            postalCode: String(row.postalCode || "").trim(),
            active: row.active !== false,
            deleted: row.deleted === true
          };
        }
        return {
          clubId: String(row[0] || "").trim(),
          clubCode: String(row[1] || "").trim(),
          clubName: String(row[2] || "").trim(),
          regionId: String(row[3] || "").trim(),
          federalNumber: String(row[4] || "").trim(),
          city: String(row[5] || "").trim(),
          postalCode: String(row[6] || "").trim(),
          active: row[7] !== false,
          deleted: false,
          source: "intranap"
        };
      }

    function readEngagementNationalClubCache() {
        try {
          const cached = JSON.parse(global.localStorage?.getItem(portalConfig.ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY) || "null");
          if (!cached || cached.version !== 1 || !Array.isArray(cached.clubs)) return { clubs: [], syncedThrough: "" };
          return {
            clubs: cached.clubs.map(normalizeEngagementNationalClub).filter((club) => club.clubId),
            syncedThrough: String(cached.syncedThrough || "").trim()
          };
        } catch (_) {
          return { clubs: [], syncedThrough: "" };
        }
      }

    function writeEngagementNationalClubCache(clubs = [], syncedThrough = "") {
        try {
          global.localStorage?.setItem(portalConfig.ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY, JSON.stringify({
            version: 1,
            syncedThrough,
            clubs: clubs.map(normalizeEngagementNationalClub).filter((club) => club.clubId)
          }));
        } catch (_) {
          // Le cache reste facultatif si le stockage local est indisponible.
        }
      }

    function engagementNationalClubSyncStart(syncedThrough = "") {
        const date = new Date(syncedThrough);
        if (Number.isNaN(date.getTime())) return "";
        return new Date(date.getTime() - 1000).toISOString();
      }

    function mergeEngagementNationalClubDirectory(referenceRows = [], storedClubs = []) {
        const byId = new Map(referenceRows
          .map(normalizeEngagementNationalClub)
          .filter((club) => club.clubId && club.clubName)
          .map((club) => [club.clubId, club]));
        storedClubs.map(normalizeEngagementNationalClub).filter((club) => club.clubId).forEach((club) => {
          if (club.deleted === true) byId.delete(club.clubId);
          else byId.set(club.clubId, { ...(byId.get(club.clubId) || {}), ...club });
        });
        return Array.from(byId.values()).sort((left, right) =>
          String(left.clubName || "").localeCompare(String(right.clubName || ""), "fr")
          || String(left.clubCode || "").localeCompare(String(right.clubCode || ""), "fr")
        );
      }

    function filteredEngagementNationalClubs() {
        const terms = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsNationalClubsSearch?.value || "").split(/\s+/).filter(Boolean);
        const status = portalContext.elements.engagementsNationalClubsStatusFilter?.value || "";
        const regionId = portalContext.elements.engagementsNationalClubsRegionFilter?.value || "";
        return portalState.engagementNationalClubs.filter((club) => {
          if (status === "active" && club.active === false) return false;
          if (status === "inactive" && club.active !== false) return false;
          if (regionId && club.regionId !== regionId) return false;
          const haystack = portalActions.normalizedEngagementClubSearch([
            club.clubId, club.clubCode, club.clubName, club.federalNumber,
            club.city, club.postalCode, club.regionId, club.regionLabel
          ].filter(Boolean).join(" "));
          return terms.every((term) => haystack.includes(term));
        });
      }

    function setEngagementNationalClubAdministrators(administrators = [], available = true) {
        const byClub = new Map();
        (Array.isArray(administrators) ? administrators : []).forEach((administrator) => {
          const clubId = String(administrator?.clubId || "").trim();
          if (!clubId || !administrator?.email) return;
          if (!byClub.has(clubId)) byClub.set(clubId, []);
          byClub.get(clubId).push({
            uid: String(administrator.uid || "").trim(),
            email: String(administrator.email || "").trim(),
            firstName: String(administrator.firstName || "").trim(),
            lastName: String(administrator.lastName || "").trim()
          });
        });
        byClub.forEach((items) => items.sort((left, right) =>
          `${left.lastName} ${left.firstName} ${left.email}`.localeCompare(`${right.lastName} ${right.firstName} ${right.email}`, "fr", { sensitivity: "base" })
        ));
        portalState.engagementNationalClubAdministratorsByClub = byClub;
        portalState.engagementNationalClubAdministratorsLoaded = true;
        portalState.engagementNationalClubAdministratorsAvailable = available;
      }

    function engagementNationalClubAdministratorsHtml(clubId = "") {
        const administrators = portalState.engagementNationalClubAdministratorsByClub.get(clubId) || [];
        const content = !portalState.engagementNationalClubAdministratorsLoaded
          ? '<small>Chargement…</small>'
          : !portalState.engagementNationalClubAdministratorsAvailable
            ? '<small>Annuaire temporairement indisponible</small>'
            : administrators.length
              ? administrators.map((administrator) => {
                  const name = [administrator.firstName, administrator.lastName].filter(Boolean).join(" ") || administrator.email;
                  return `<small title="${portalActions.escapeHtml(administrator.email)}"><strong>${portalActions.escapeHtml(name)}</strong><span>${portalActions.escapeHtml(administrator.email)}</span></small>`;
                }).join("")
              : '<small>Aucun administrateur actif</small>';
        return `<div class="admin-national-club-card-administrators"><span>Administrateurs engagements</span>${content}</div>`;
      }

    function renderEngagementNationalClubs() {
        if (!portalContext.elements.engagementsNationalClubsList) return;
        const regionFilter=portalContext.elements.engagementsNationalClubsRegionFilter;
        if(regionFilter){const existing=new Set(Array.from(regionFilter.options,option=>option.value));for(const club of portalState.engagementNationalClubs){if(club.napSource&&club.regionId&&!existing.has(club.regionId)){regionFilter.add(new Option(club.regionLabel||club.regionId,club.regionId));existing.add(club.regionId);}}}
        const clubs = filteredEngagementNationalClubs();
        const renderedClubs = clubs.slice(0, portalState.engagementNationalClubsVisibleLimit);
        if (portalContext.elements.engagementsNationalClubsStatus) {
          portalContext.elements.engagementsNationalClubsStatus.textContent = `${renderedClubs.length} club${renderedClubs.length > 1 ? "s" : ""} affiché${renderedClubs.length > 1 ? "s" : ""} sur ${clubs.length} correspondant${clubs.length > 1 ? "s" : ""} (${portalState.engagementNationalClubs.length} au total).`;
          portalContext.elements.engagementsNationalClubsStatus.dataset.tone = "info";
        }
        portalContext.elements.engagementsNationalClubsList.innerHTML = clubs.length
          ? renderedClubs.map((club) => `<article class="admin-national-club-card" data-national-club-id="${portalActions.escapeHtml(club.clubId)}">
          <div class="admin-national-club-card-main"><strong>${portalActions.escapeHtml(club.clubCode || club.clubName)}</strong><span>${portalActions.escapeHtml(club.clubName)}</span><small>${portalActions.escapeHtml([club.city, club.postalCode].filter(Boolean).join(" · ") || "Localité non renseignée")}</small></div>
          <div class="admin-national-club-card-reference"><span>Numéro fédéral</span><strong>${portalActions.escapeHtml(club.federalNumber || "À renseigner")}</strong><small>${portalActions.escapeHtml(portalConfig.LIVEPALMES_REFERENCE_REGION_LABELS[club.regionId] || club.regionLabel || club.regionId || "Région inconnue")}</small></div>
          ${engagementNationalClubAdministratorsHtml(club.clubId)}
          <span class="admin-national-club-status" data-active="${club.active !== false}">${club.active !== false ? "Actif" : "Inactif"}</span>
          <button class="ghost-button compact" type="button" data-engagement-national-club-edit="${portalActions.escapeHtml(club.clubId)}">Modifier</button>
        </article>`).join("") + (renderedClubs.length < clubs.length
              ? '<button class="ghost-button admin-national-clubs-show-more" type="button" data-engagement-national-clubs-show-more>Afficher plus de clubs</button>'
              : "")
          : '<p class="admin-engagements-empty">Aucun club ne correspond aux filtres.</p>';
      }

    return {
      renderEngagementAccessRequests,
      loadEngagementAccessRequests,
      setEngagementAccessRequestEditMessage,
      closeEngagementAccessRequestEditForm,
      openEngagementAccessRequestEditForm,
      correctedEngagementAccessRequestFromEditForm,
      resolveEngagementAccessRequest,
      submitEngagementAccessRequestEdit,
      publicAccessRequestPayloadFromForm,
      submitPublicEngagementAccessRequest,
      updateEngagementNationalRequestsPresentation,
      renderEngagementDeletionRequests,
      loadEngagementDeletionRequests,
      updateEngagementDeletionRequestBadge,
      resolveEngagementDeletionRequest,
      renderEngagementNationalSwimmers,
      updateEngagementNationalSwimmersStatus,
      engagementSwimmerChangeSummary,
      updateEngagementSwimmerChangeRequestsBadge,
      renderEngagementSwimmerChangeRequests,
      loadEngagementSwimmerChangeRequests,
      openEngagementSwimmerChangeRequestReview,
      resolveEngagementSwimmerChangeRequest,
      openEngagementAccessRequestRejectDialog,
      closeEngagementAccessRequestRejectDialog,
      submitEngagementAccessRequestRejection,
      closeEngagementSwimmerCorrectionDialog,
      resetEngagementSwimmerCorrectionDialog,
      openEngagementSwimmerCorrectionDialog,
      updateClubIdentityCorrectionAction,
      submitEngagementSwimmerCorrection,
      normalizeEngagementNationalClub,
      readEngagementNationalClubCache,
      writeEngagementNationalClubCache,
      engagementNationalClubSyncStart,
      mergeEngagementNationalClubDirectory,
      filteredEngagementNationalClubs,
      setEngagementNationalClubAdministrators,
      engagementNationalClubAdministratorsHtml,
      renderEngagementNationalClubs
    };
  }
  global.LivePalmesPortalNationalRequests = { create };
})(window);
