(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("account-and-access", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function updateAccountEmail(event) {
        event?.preventDefault?.();
        const nextEmail = String(portalContext.elements.accountEmail?.value || "").trim().toLowerCase();
        const currentPassword = portalContext.elements.accountEmailPassword?.value || "";
        const currentEmail = String(global.firebase?.auth?.().currentUser?.email || "").trim().toLowerCase();
        if (!nextEmail || !currentPassword) return;
        if (nextEmail === currentEmail) {
          portalActions.setAccountMessage(portalContext.elements.accountEmailMessage, "Cette adresse est déjà celle de votre compte.");
          return;
        }
        const button = portalContext.elements.accountEmailForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        portalActions.setAccountMessage(portalContext.elements.accountEmailMessage, "Mise à jour en cours…", "loading");
        try {
          const user = await portalActions.reauthenticateCurrentUser(currentPassword);
          await portalActions.callFunction("updateCurrentAccountEmail", { email: nextEmail });
          await user.reload?.();
          await user.getIdToken?.(true);
          let verificationSent = false;
          try {
            await user.sendEmailVerification?.();
            verificationSent = true;
          } catch (error) {
            console.warn("Envoi de la vérification email impossible", error);
          }
          portalContext.elements.accountEmailPassword.value = "";
          portalActions.renderCurrentUser({ ...(portalActions.ensureAdminAuth()?.status?.().profile || {}), email: nextEmail });
          await moduleActions.loadCurrentUser();
          portalActions.setAccountMessage(
            portalContext.elements.accountEmailMessage,
            verificationSent
              ? "Adresse mise à jour. Un email de vérification vient de vous être envoyé."
              : "Adresse mise à jour.",
            "ok"
          );
        } catch (error) {
          portalActions.setAccountMessage(portalContext.elements.accountEmailMessage, `Modification impossible : ${portalActions.firebaseAccountError(error)}`);
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function toggleAccountNotificationPreferences() {
        const button = portalContext.elements.accountCompetitionNotifications;
        if (!button || button.disabled) return;
        const currentlyEnabled = button.getAttribute("aria-checked") !== "false";
        const enabled = !currentlyEnabled;
        if (!enabled && !global.confirm(
          "Désactiver les notifications de compétition ? Vous ne recevrez plus les ouvertures de compétitions, les nouveaux documents ni les récapitulatifs PDF d’engagement."
        )) return;
        if (button) button.disabled = true;
        portalActions.setAccountMessage(portalContext.elements.accountNotificationsMessage, "Enregistrement…", "loading");
        try {
          const result = await portalActions.callFunction("updateCurrentEmailNotificationPreferences", {
            competitionNotifications: enabled
          });
          portalActions.renderCurrentUser({
            ...(portalState.currentAccessProfile || {}),
            competitionNotificationsEnabled: result.competitionNotificationsEnabled !== false
          });
          portalActions.setAccountMessage(
            portalContext.elements.accountNotificationsMessage,
            result.competitionNotificationsEnabled !== false
              ? "Notifications de compétition activées."
              : "Notifications de compétition désactivées.",
            "ok"
          );
        } catch (error) {
          portalActions.setAccountMessage(portalContext.elements.accountNotificationsMessage, `Enregistrement impossible : ${error?.message || error}`);
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function updateAccountPassword(event) {
        event?.preventDefault?.();
        const currentPassword = portalContext.elements.accountCurrentPassword?.value || "";
        const nextPassword = portalContext.elements.accountNewPassword?.value || "";
        const confirmation = portalContext.elements.accountConfirmPassword?.value || "";
        if (nextPassword.length < 8) {
          portalActions.setAccountMessage(portalContext.elements.accountPasswordMessage, "Le nouveau mot de passe doit contenir au moins 8 caractères.");
          return;
        }
        if (nextPassword !== confirmation) {
          portalActions.setAccountMessage(portalContext.elements.accountPasswordMessage, "La confirmation ne correspond pas au nouveau mot de passe.");
          return;
        }
        if (currentPassword === nextPassword) {
          portalActions.setAccountMessage(portalContext.elements.accountPasswordMessage, "Le nouveau mot de passe doit être différent de l’ancien.");
          return;
        }
        const button = portalContext.elements.accountPasswordForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        portalActions.setAccountMessage(portalContext.elements.accountPasswordMessage, "Mise à jour en cours…", "loading");
        try {
          const user = await portalActions.reauthenticateCurrentUser(currentPassword);
          await user.updatePassword(nextPassword);
          await user.getIdToken?.(true);
          portalContext.elements.accountPasswordForm.reset();
          portalActions.setAccountMessage(portalContext.elements.accountPasswordMessage, "Mot de passe modifié.", "ok");
        } catch (error) {
          portalActions.setAccountMessage(portalContext.elements.accountPasswordMessage, `Modification impossible : ${portalActions.firebaseAccountError(error)}`);
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function loadAccessUsers({ reset = false, force = false, skipSnapshot = false } = {}) {
        if (!portalActions.canManageAccessDirectory()) return;
        if (portalState.accessUsersLoading && !reset) return;
        if (portalState.accessDirectorySnapshotMode && portalState.accessDirectorySnapshotUsers && !skipSnapshot) {
          moduleActions.renderAccessDirectorySnapshotPage({ reset });
          return;
        }
        if (portalState.accessUsersLoaded && !reset && !force) {
          moduleActions.renderAccessUsers();
          return;
        }
        const loadSequence = ++portalState.accessLoadSequence;
        if (reset) {
          portalState.accessCurrentCursor = null;
          portalState.accessNextCursor = null;
          portalState.accessPreviousCursors = [];
          portalState.accessPage = 1;
        }
        portalState.accessUsersLoading = true;
        moduleActions.renderAccessPagination();
        if (portalContext.elements.accessCount) portalContext.elements.accessCount.textContent = "Chargement…";
        try {
          if (!skipSnapshot) {
            try {
              const snapshotUsers = await moduleActions.loadAccessDirectorySnapshot();
              if (loadSequence !== portalState.accessLoadSequence) return;
              if (snapshotUsers) {
                portalState.accessDirectorySnapshotUsers = snapshotUsers;
                portalState.accessDirectorySnapshotMode = true;
                moduleActions.renderAccessDirectorySnapshotPage({ reset: true });
                return;
              }
            } catch (error) {
              console.warn("Annuaire privé direct indisponible, utilisation de la lecture paginée.", error?.code || error?.message || error);
            }
          }
          portalState.accessDirectorySnapshotMode = false;
          moduleActions.renderAccessDirectoryAlphabet();
          const filters = moduleActions.accessFiltersPayload();
          const result = await portalActions.callFunction("listAccessUsers", {
            pageSize: 25,
            cursor: portalState.accessCurrentCursor,
            ...filters
          });
          if (loadSequence !== portalState.accessLoadSequence) return;
          const returnedUsers = Array.isArray(result.users) ? result.users : [];
          if (Number(result.directoryVersion) >= 2) {
            portalState.accessUsers = returnedUsers;
            portalState.accessNextCursor = result.nextCursor || null;
            portalState.accessDirectoryTruncated = result.truncated === true;
          } else {
            const filteredUsers = moduleActions.legacyFilteredAccessUsers(returnedUsers, filters);
            const offset = Math.max(0, Math.trunc(Number(portalState.accessCurrentCursor?.offset) || 0));
            portalState.accessUsers = filteredUsers.slice(offset, offset + 25);
            portalState.accessNextCursor = offset + 25 < filteredUsers.length ? { offset: offset + 25 } : null;
            portalState.accessDirectoryTruncated = false;
          }
          portalState.accessUsersLoaded = true;
          moduleActions.renderAccessUsers();
        } catch (error) {
          if (loadSequence !== portalState.accessLoadSequence) return;
          if (portalContext.elements.accessList) {
            portalContext.elements.accessList.innerHTML = `<p class="admin-access-empty">Lecture des accès impossible : ${moduleActions.escapeHtml(error?.message || error)}</p>`;
          }
        } finally {
          if (loadSequence !== portalState.accessLoadSequence) return;
          portalState.accessUsersLoading = false;
          moduleActions.renderAccessPagination();
        }
      }

    async function showNextAccessPage() {
        if (!portalState.accessNextCursor || portalState.accessUsersLoading) return;
        if (portalState.accessDirectorySnapshotMode) {
          portalState.accessPage += 1;
          moduleActions.renderAccessDirectorySnapshotPage();
          return;
        }
        portalState.accessPreviousCursors.push(portalState.accessCurrentCursor);
        portalState.accessCurrentCursor = portalState.accessNextCursor;
        portalState.accessPage += 1;
        await moduleActions.loadAccessUsers({ force: true });
      }

    async function showPreviousAccessPage() {
        if (portalState.accessUsersLoading || (portalState.accessDirectorySnapshotMode ? portalState.accessPage <= 1 : !portalState.accessPreviousCursors.length)) return;
        if (portalState.accessDirectorySnapshotMode) {
          portalState.accessPage = Math.max(1, portalState.accessPage - 1);
          moduleActions.renderAccessDirectorySnapshotPage();
          return;
        }
        portalState.accessCurrentCursor = portalState.accessPreviousCursors.pop() || null;
        portalState.accessPage = Math.max(1, portalState.accessPage - 1);
        await moduleActions.loadAccessUsers({ force: true });
      }

    async function refreshAccessUsersAfterMutation({ reset = false } = {}) {
        portalState.accessDirectorySnapshotUsers = null;
        portalState.accessDirectorySnapshotMode = false;
        portalState.accessDirectorySnapshotFilteredCount = 0;
        await moduleActions.loadAccessUsers({ reset, force: true, skipSnapshot: true });
      }

    async function setAccessStatus(uid, status) {
        const user = portalState.accessUsers.find((item) => item.uid === uid);
        const label = user?.email || uid;
        const verb = status === "active" ? "réactiver" : "désactiver";
        if (!window.confirm(`Confirmer : ${verb} ${label} ?`)) return;
        try {
          await portalActions.callFunction("setAccessUserStatus", { uid, status });
          await moduleActions.refreshAccessUsersAfterMutation();
          portalActions.setAccessMessage(`Accès ${status === "active" ? "réactivé" : "désactivé"}.`, "ok");
        } catch (error) {
          portalActions.setAccessMessage(`Changement de statut impossible : ${error?.message || error}`);
        }
      }

    async function loadAccessDeletionRequests({ force = false } = {}) {
        if (!portalActions.canDeleteAccessUserDirectly() || portalState.accessDeletionRequestsLoading) return;
        if (portalState.accessDeletionRequestsLoaded && !force) return;
        portalState.accessDeletionRequestsLoading = true;
        portalActions.updateEngagementNationalRequestsPresentation();
        if (portalContext.elements.accessDeletionRequestsStatus) {
          portalContext.elements.accessDeletionRequestsStatus.textContent = "Chargement...";
          portalContext.elements.accessDeletionRequestsStatus.dataset.tone = "loading";
        }
        if (portalContext.elements.engagementsNationalAccountsStatus) {
          portalContext.elements.engagementsNationalAccountsStatus.textContent = "Chargement...";
          portalContext.elements.engagementsNationalAccountsStatus.dataset.tone = "loading";
        }
        global.LivePalmesRequestDecision.history({root:portalContext.elements.engagementsNationalAccountsList?.closest('[data-engagements-national-panel]'),name:'accounts',callable:'listAccessUserDeletionRequests',resolver:'resolveAccessUserDeletionRequest',callFunction:portalActions.callFunction,valid:()=>portalActions.canDeleteAccessUserDirectly()});
        try {
          const result = await portalActions.callFunction("listAccessUserDeletionRequests", {});
          portalState.accessDeletionRequests = Array.isArray(result.requests) ? result.requests : [];
          portalState.accessDeletionRequestsLoaded = true;
          portalActions.markLastRefresh(portalContext.elements.accessDeletionRequestsStatus);
          portalActions.markLastRefresh(portalContext.elements.engagementsNationalAccountsStatus);
          moduleActions.renderAccessDeletionRequests();
          if (portalContext.elements.accessDeletionRequestsStatus) portalContext.elements.accessDeletionRequestsStatus.dataset.tone = "ok";
        } catch (error) {
          if (portalContext.elements.accessDeletionRequestsStatus) {
            portalContext.elements.accessDeletionRequestsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
            portalContext.elements.accessDeletionRequestsStatus.dataset.tone = "error";
          }
          if (portalContext.elements.engagementsNationalAccountsStatus) {
            portalContext.elements.engagementsNationalAccountsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalAccountsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.accessDeletionRequestsLoading = false;
          portalActions.updateEngagementNationalRequestsPresentation();
        }
      }

    async function deleteAccessUser(uid) {
        const user = portalState.accessUsers.find((item) => item.uid === uid);
        const label = user?.email || uid;
        if (!global.confirm(`Suppression définitive du compte ${label} ? Cette action supprime le compte Firebase et ses droits LivePalmes.`)) return;
        try {
          await portalActions.callFunction("deleteAccessUser", { uid, confirmPermanent: true });
          portalState.accessDeletionRequestsLoaded = false;
          await moduleActions.refreshAccessUsersAfterMutation({ reset: true });
          if (portalActions.canDeleteAccessUserDirectly()) await moduleActions.loadAccessDeletionRequests({ force: true });
          portalActions.setAccessMessage("Compte supprimé définitivement.", "ok");
        } catch (error) {
          portalActions.setAccessMessage(`Suppression impossible : ${error?.message || error}`);
        }
      }

    async function requestAccessUserDeletion(uid) {
        const user = portalState.accessUsers.find((item) => item.uid === uid);
        const label = user?.email || uid;
        if (!global.confirm(`Demander à un admin national de supprimer le compte ${label} ?`)) return;
        try {
          await portalActions.callFunction("requestAccessUserDeletion", { uid });
          portalActions.setAccessMessage("Demande de suppression envoyée à l'administration nationale.", "ok");
        } catch (error) {
          portalActions.setAccessMessage(`Demande impossible : ${error?.message || error}`);
        }
      }

    async function resolveAccessDeletionRequest(requestId, decision, statusElement = portalContext.elements.accessDeletionRequestsStatus) {
        const request = portalState.accessDeletionRequests.find((item) => item.id === requestId);
        const label = request?.targetEmail || request?.targetUid || "ce compte";
        const approve = decision === "approved";
        const message = approve
          ? `Accepter la demande et supprimer définitivement ${label} ?`
          : `Refuser la demande de suppression de ${label} ?`;
        const choice = await global.LivePalmesRequestDecision.collect({ decision, title: message });
        if (!choice) return;
        if (statusElement) {
          statusElement.textContent = approve ? "Suppression en cours..." : "Refus en cours...";
          statusElement.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("resolveAccessUserDeletionRequest", { requestId, decision: approve ? "approved" : "rejected", ...choice });
          portalState.portalPendingOverviewLoaded = false;
          portalState.accessDeletionRequestsLoaded = false;
          await moduleActions.refreshAccessUsersAfterMutation({ reset: true });
          await moduleActions.loadAccessDeletionRequests({ force: true });
          await portalActions.loadPortalPendingOverview({ force: true });
          if (statusElement) {
          statusElement.textContent = approve ? "Demande acceptée et compte supprimé." : "Demande refusée.";
            global.LivePalmesRequestDecision.report(statusElement, { ...result, requestId }, "resolveAccessUserDeletionRequest", portalActions.callFunction);
            statusElement.dataset.tone = "ok";
          }
        } catch (error) {
          if (statusElement) {
            statusElement.textContent = `Traitement impossible : ${error?.message || error}`;
            statusElement.dataset.tone = "error";
          }
        }
      }

    async function saveAccessUser(event) {
        event?.preventDefault?.();
        if (!portalActions.canUse("admin.full") && !portalActions.canUse("engagements.region.manage")) {
          portalActions.setAccessMessage("Droit de gestion des accès requis.");
          return;
        }
        const payload = moduleActions.accessPayloadFromForm();
        portalActions.setAccessMessage("");
        try {
          const result = await portalActions.callFunction("createOrUpdateAccessUser", payload);
          const sendReset = portalContext.elements.accessForm.querySelector("#adminAccessSendReset")?.checked;
          if (sendReset) {
            await global.firebase.auth().sendPasswordResetEmail(result.email || payload.email, {
              url: `${global.LivePalmesEnvironment.authOrigin}/portail.html`,
              handleCodeInApp: false
            });
          }
          moduleActions.resetAccessForm(true);
          await moduleActions.refreshAccessUsersAfterMutation({ reset: true });
          portalActions.setAccessMessage(
            `${result.created ? "Compte créé" : "Compte mis à jour"} : ${result.email}. ${sendReset ? "E-mail de mot de passe envoyé." : ""}`,
            "ok"
          );
        } catch (error) {
          portalActions.setAccessMessage(`Enregistrement impossible : ${error?.message || error}`);
        }
      }
    function accessPayloadFromForm() {
        const form = portalContext.elements.accessForm;
        const capabilities = [...form.querySelectorAll("input[name='capability']:checked")]
          .map((input) => input.value);
        return {
          uid: portalState.editingUid,
          firstName: form.querySelector("#adminAccessFirstName")?.value || "",
          lastName: form.querySelector("#adminAccessLastName")?.value || "",
          email: form.querySelector("#adminAccessEmail")?.value || "",
          clubId: portalContext.elements.accessClubId?.value || "",
          clubName: portalContext.elements.accessClubName?.value || "",
          regionId: portalContext.elements.accessRegionId?.value || "",
          licenseNumber: form.querySelector("#adminAccessLicenseNumber")?.value || "",
          capabilities
        };
      }

    function accessDirectorySnapshotScope() {
        if (portalActions.canUse("admin.full") || portalActions.canUse("engagements.national.manage")) {
          return { scopeType: "national", scopeId: "", documentId: "national" };
        }
        const regionId = portalActions.canonicalLivePalmesRegion(portalActions.engagementRegionScope(portalState.currentAccessProfile || {}));
        return {
          scopeType: "region",
          scopeId: regionId,
          documentId: `region:${encodeURIComponent(regionId)}`
        };
      }

    function loadAccessDirectoryFirestoreModule() {
        if (global.firebase?.firestore) return Promise.resolve();
        if (!portalState.accessDirectoryFirestoreModulePromise) {
          portalState.accessDirectoryFirestoreModulePromise = portalActions.loadScriptOnce(
            "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js",
            "adminAccessDirectoryFirestoreScript"
          ).catch((error) => {
            portalState.accessDirectoryFirestoreModulePromise = null;
            throw error;
          });
        }
        return portalState.accessDirectoryFirestoreModulePromise;
      }

    function preloadAccessDirectoryFirestore() {
        if (!portalActions.canManageAccessDirectory() || global.firebase?.firestore || portalState.accessDirectoryFirestoreModulePromise) return;
        const load = () => moduleActions.loadAccessDirectoryFirestoreModule().catch(() => {});
        if (typeof global.requestIdleCallback === "function") global.requestIdleCallback(load, { timeout: 2500 });
        else global.setTimeout(load, 800);
      }

    function renderAccessDeletionRequests() {
        if (!portalActions.canDeleteAccessUserDirectly()) {
          if (portalContext.elements.accessDeletionRequestsPanel) portalContext.elements.accessDeletionRequestsPanel.hidden = true;
          if (portalContext.elements.engagementsNationalAccountsList) portalContext.elements.engagementsNationalAccountsList.innerHTML = "";
          portalActions.updateEngagementNationalRequestsPresentation();
          return;
        }
        if (portalContext.elements.accessDeletionRequestsPanel) portalContext.elements.accessDeletionRequestsPanel.hidden = false;
        if (!portalState.accessDeletionRequests.length) {
          if (portalContext.elements.accessDeletionRequestsList) portalContext.elements.accessDeletionRequestsList.innerHTML = `<p class="admin-access-empty">Aucune demande de suppression en attente.</p>`;
          if (portalContext.elements.engagementsNationalAccountsList) portalContext.elements.engagementsNationalAccountsList.innerHTML = `<p class="admin-engagements-empty">Aucune demande de suppression de compte en attente.</p>`;
          if (portalContext.elements.accessDeletionRequestsStatus) portalContext.elements.accessDeletionRequestsStatus.textContent = `Aucune demande en attente.${portalActions.lastRefreshSuffix(portalContext.elements.accessDeletionRequestsStatus)}`;
          if (portalContext.elements.engagementsNationalAccountsStatus) {
            portalContext.elements.engagementsNationalAccountsStatus.textContent = "Aucune demande en attente.";
            portalContext.elements.engagementsNationalAccountsStatus.dataset.tone = "ok";
          }
          portalActions.updateEngagementNationalRequestsPresentation();
          return;
        }
        const html = portalState.accessDeletionRequests.map((request) => {
          const name = [request.targetFirstName, request.targetLastName].filter(Boolean).join(" ") || request.targetEmail || "Compte LivePalmes";
          const region = request.targetRegionId ? portalActions.regionDisplayLabel(request.targetRegionId) : "Région non renseignée";
          const rights = (request.targetCapabilities || []).map(portalActions.capabilityLabel).join(", ") || "Aucun droit actif";
          return `
        <article class="admin-engagements-request-card" data-access-deletion-request-id="${request.id}">
          <div class="admin-engagements-request-main">
            <strong>${moduleActions.escapeHtml(name)}</strong>
            <small>${moduleActions.escapeHtml(request.targetEmail || request.targetUid)}</small>
            <small>${moduleActions.escapeHtml(`Région ${region} - ${rights}`)}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>Demande par ${moduleActions.escapeHtml(request.requestedByEmail || request.requestedBy || "admin régional")}</span>
            <span>${moduleActions.escapeHtml(request.requestedAt ? moduleActions.formatAccessDateTime(request.requestedAt) : "")}</span>
          </div>
          <div class="admin-engagements-request-actions">
            <button type="button" data-access-deletion-decision="approved" data-access-deletion-request-id="${request.id}">Accepter</button>
            <button class="ghost-button" type="button" data-access-deletion-decision="rejected" data-access-deletion-request-id="${request.id}">Refuser</button>
          </div>
        </article>
      `;
        }).join("");
        if (portalContext.elements.accessDeletionRequestsList) portalContext.elements.accessDeletionRequestsList.innerHTML = html;
        if (portalContext.elements.engagementsNationalAccountsList) portalContext.elements.engagementsNationalAccountsList.innerHTML = html;
        if (portalContext.elements.accessDeletionRequestsStatus) {
          portalContext.elements.accessDeletionRequestsStatus.textContent = `${portalState.accessDeletionRequests.length} demande${portalState.accessDeletionRequests.length > 1 ? "s" : ""} en attente.${portalActions.lastRefreshSuffix(portalContext.elements.accessDeletionRequestsStatus)}`;
        }
        if (portalContext.elements.engagementsNationalAccountsStatus) {
          portalContext.elements.engagementsNationalAccountsStatus.textContent = `${portalState.accessDeletionRequests.length} demande${portalState.accessDeletionRequests.length > 1 ? "s" : ""} en attente.`;
          portalContext.elements.engagementsNationalAccountsStatus.dataset.tone = "ok";
        }
        portalActions.updateEngagementNationalRequestsPresentation();
      }
    function openAccessDialog() {
        const dialog = portalContext.elements.accessPanel;
        if (!dialog || (!portalActions.canUse("admin.full") && !portalActions.canUse("engagements.region.manage"))) return;
        dialog.hidden = false;
        if (!dialog.open) {
          if (typeof dialog.showModal === "function") dialog.showModal();
          else dialog.setAttribute("open", "");
        }
        portalContext.elements.accessAdd?.setAttribute("aria-expanded", "true");
      }

    function fillAccessForm(user = {}) {
        const form = portalContext.elements.accessForm;
        if (!form) return;
        portalState.editingUid = user.uid || "";
        form.querySelector("#adminAccessFirstName").value = user.firstName || "";
        form.querySelector("#adminAccessLastName").value = user.lastName || "";
        form.querySelector("#adminAccessEmail").value = user.email || "";
        if (portalContext.elements.accessClubId) portalContext.elements.accessClubId.value = user.clubId || "";
        if (portalContext.elements.accessClubName) portalContext.elements.accessClubName.value = user.clubName || "";
        portalActions.setRegionSelectValue(portalContext.elements.accessRegionId, user.regionId || "");
        portalActions.populateAccessClubSelect(user.clubId || "", user.clubName || "");
        form.querySelector("#adminAccessLicenseNumber").value = user.licenseNumber || "";
        form.querySelectorAll("input[name='capability']").forEach((input) => {
          input.checked = (user.capabilities || []).includes(input.value);
        });
        form.querySelector("#adminAccessSendReset").checked = false;
        if (portalContext.elements.accessDialogTitle) portalContext.elements.accessDialogTitle.textContent = `Modifier ${[user.lastName, user.firstName].filter(Boolean).join(" ") || "l’utilisateur"}`;
        moduleActions.openAccessDialog();
        form.querySelector("#adminAccessLastName")?.focus();
      }

    function resetAccessForm(close = false) {
        portalState.editingUid = "";
        portalContext.elements.accessForm?.reset();
        const regional = portalActions.canUse("engagements.region.manage") && !portalActions.canUse("admin.full");
        if (portalContext.elements.accessRegionId) {
          portalContext.elements.accessRegionId.disabled = regional;
          if (regional) portalActions.setRegionSelectValue(portalContext.elements.accessRegionId, portalActions.engagementRegionScope());
        }
        portalContext.elements.accessForm?.querySelectorAll("input[name='capability']").forEach(input => {
          input.closest("label").hidden = regional && input.value !== "engagements.club.manage";
          input.disabled = regional;
          if (regional) input.checked = input.value === "engagements.club.manage";
        });
        portalActions.populateAccessClubSelect();
        portalActions.setAccessMessage("");
        if (portalContext.elements.accessDialogTitle) portalContext.elements.accessDialogTitle.textContent = "Ajouter un utilisateur";
        if (close && portalContext.elements.accessPanel?.open) portalContext.elements.accessPanel.close();
        if (close) portalContext.elements.accessAdd?.setAttribute("aria-expanded", "false");
      }

    function formatAccessDateTime(value) {
        if (!value) return "jamais";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

    function accessActionIcon(action) {
        if (action === "edit") {
          return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z"></path><path d="m14.8 6 3.2 3.2"></path></svg>';
        }
        if (action === "enable") {
          return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8"></path><path d="M7.1 5.8a8 8 0 1 0 9.8 0"></path></svg>';
        }
        if (action === "disable") {
          return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
        }
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="m9 7 1-3h4l1 3"></path><path d="m7 7 1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>';
      }

    function renderAccessUsers() {
        const mount = portalContext.elements.accessList;
        if (!mount) return;
        if (portalContext.elements.accessCount) {
          const firstVisible = portalState.accessDirectorySnapshotMode && portalState.accessUsers.length ? ((portalState.accessPage - 1) * 25) + 1 : 0;
          const lastVisible = portalState.accessDirectorySnapshotMode ? firstVisible + portalState.accessUsers.length - 1 : 0;
          portalContext.elements.accessCount.textContent = portalState.accessUsers.length
            ? portalState.accessDirectorySnapshotMode
              ? `${firstVisible}–${lastVisible} sur ${portalState.accessDirectorySnapshotFilteredCount} compte${portalState.accessDirectorySnapshotFilteredCount > 1 ? "s" : ""}`
              : `${portalState.accessUsers.length} compte${portalState.accessUsers.length > 1 ? "s" : ""} affiché${portalState.accessUsers.length > 1 ? "s" : ""}${portalState.accessDirectoryTruncated ? " · recherche bornée, affinez les filtres" : ""}`
            : "Aucun compte trouvé";
        }
        if (!portalState.accessUsers.length) {
          mount.innerHTML = `<p class="admin-access-empty">Aucun compte ne correspond à cette recherche.</p>`;
          moduleActions.renderAccessPagination();
          return;
        }
        const sortedUsers = [...portalState.accessUsers].sort((left, right) =>
          String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
          String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
          String(left.email || "").localeCompare(String(right.email || ""), "fr-FR", { sensitivity: "base", numeric: true })
        );
        const rows = sortedUsers.map((user, index) => {
          const lastName = user.lastName || "—";
          const firstName = user.firstName || "—";
          const name = [user.lastName, user.firstName].filter(Boolean).join(" ") || user.email || "Compte LivePalmes";
          const rights = (user.capabilities || []).map(portalActions.capabilityLabel);
          const rightsLabel = rights.join(" · ") || "Aucune habilitation active";
          const inactive = user.status !== "active";
          const clubLine = portalActions.clubDisplayLabel(user, { fallback: "Club non renseigné" });
          const regionLine = user.regionId ? `Région ${portalActions.regionDisplayLabel(user.regionId)}` : "Région non renseignée";
          const currentUid = global.firebase?.auth?.().currentUser?.uid || "";
          const isCurrentUser = user.uid && user.uid === currentUid;
          const detailsId = `adminAccessDirectoryDetails${index}`;
          const actions = [];
          if (portalActions.canUse("admin.full")) {
            actions.push(`<button class="ghost-button admin-access-action-button" type="button" data-access-edit="${user.uid}">${moduleActions.accessActionIcon("edit")}<span>Modifier</span></button>`);
            actions.push(`<button class="ghost-button admin-access-action-button" type="button" data-access-status="${inactive ? "active" : "inactive"}" data-access-uid="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${moduleActions.accessActionIcon(inactive ? "enable" : "disable")}<span>${inactive ? "Réactiver" : "Désactiver"}</span></button>`);
          }
          if (portalActions.canDeleteAccessUserDirectly()) {
            actions.push(`<button class="ghost-button danger-button admin-access-action-button" type="button" data-access-delete="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${moduleActions.accessActionIcon("delete")}<span>Supprimer</span></button>`);
          } else if (portalActions.canUse("engagements.region.manage") && (user.capabilities || []).includes("engagements.region.manage")) {
            actions.push(`<button class="ghost-button danger-button admin-access-action-button" type="button" data-access-delete-request="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${moduleActions.accessActionIcon("delete")}<span>Demander la suppression</span></button>`);
          }
          return `
        <article class="admin-access-row ${inactive ? "inactive" : ""}" data-access-uid="${user.uid}" data-expanded="false" role="rowgroup">
          <button class="admin-access-row-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" data-access-directory-toggle>
            <span class="admin-access-row-toggle-user">
              <strong>${moduleActions.escapeHtml(name)}</strong>
              <small>${moduleActions.escapeHtml(user.email || user.uid)}</small>
            </span>
            <span class="admin-access-row-toggle-meta">
              <span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span>
              <span class="admin-access-row-chevron" aria-hidden="true">›</span>
            </span>
          </button>
          <div class="admin-access-row-summary" role="row">
            <div class="admin-access-last-name" role="cell" data-label="Nom">
              <strong>${moduleActions.escapeHtml(lastName)}</strong>
            </div>
            <div class="admin-access-first-name" role="cell" data-label="Prénom">${moduleActions.escapeHtml(firstName)}</div>
            <div class="admin-access-email" role="cell" data-label="Email" title="${moduleActions.escapeHtml(user.email || user.uid)}">${moduleActions.escapeHtml(user.email || user.uid)}</div>
            <div class="admin-access-scope" role="cell" data-label="Club" title="${moduleActions.escapeHtml(`${clubLine} · ${regionLine}`)}">
              <span>${moduleActions.escapeHtml(clubLine)}</span>
            </div>
            <div role="cell" data-label="Connexion">
              <small class="admin-access-login">${moduleActions.escapeHtml(user.lastLoginAt ? moduleActions.formatAccessDateTime(user.lastLoginAt) : "Non disponible")}</small>
            </div>
            <div role="cell" data-label="État"><span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span></div>
            <div class="admin-access-row-disclosure" role="cell">
              <button type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${moduleActions.escapeHtml(name)}" data-access-directory-toggle>
                <span class="admin-access-row-chevron" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <div id="${detailsId}" class="admin-access-row-expanded">
            <div class="admin-access-row-expanded-data">
              <div><span>Licence</span><strong>${moduleActions.escapeHtml(user.licenseNumber || "Non renseignée")}</strong></div>
              <div><span>Périmètre</span><strong>${moduleActions.escapeHtml(clubLine)}</strong><small>${moduleActions.escapeHtml(regionLine)}</small></div>
              <div class="admin-access-row-expanded-rights"><span>Habilitations</span><strong>${moduleActions.escapeHtml(rightsLabel)}</strong></div>
            </div>
            <div class="admin-access-row-actions">
              ${actions.join("") || "<small>Aucune action disponible</small>"}
            </div>
          </div>
        </article>
      `;
        }).join("");
        mount.innerHTML = `
      <div class="admin-access-table" role="table" aria-label="Utilisateurs du portail">
        <div class="admin-access-table-head" role="row">
          <span role="columnheader">Nom</span>
          <span role="columnheader">Prénom</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Club</span>
          <span role="columnheader">Connexion</span>
          <span role="columnheader">État</span>
          <span role="columnheader" aria-label="Détails"></span>
        </div>
        ${rows}
      </div>`;
        moduleActions.renderAccessPagination();
      }

    function renderAccessPagination() {
        if (!portalContext.elements.accessPagination) return;
        const hasPrevious = portalState.accessDirectorySnapshotMode ? portalState.accessPage > 1 : portalState.accessPreviousCursors.length > 0;
        const hasNext = Boolean(portalState.accessNextCursor);
        portalContext.elements.accessPagination.hidden = !hasPrevious && !hasNext;
        if (portalContext.elements.accessPreviousPage) portalContext.elements.accessPreviousPage.disabled = !hasPrevious || portalState.accessUsersLoading;
        if (portalContext.elements.accessNextPage) portalContext.elements.accessNextPage.disabled = !hasNext || portalState.accessUsersLoading;
        if (portalContext.elements.accessPageLabel) portalContext.elements.accessPageLabel.textContent = `Page ${portalState.accessPage}`;
      }

    function accessFiltersPayload() {
        return {
          search: portalContext.elements.accessSearch?.value || "",
          status: portalContext.elements.accessStatusFilter?.value || "",
          capability: portalContext.elements.accessCapabilityFilter?.value || ""
        };
      }

    function legacyFilteredAccessUsers(users, filters) {
        const searchTerms = moduleActions.normalizedAccessSearch(filters.search).split(/\s+/).filter(Boolean);
        return users.filter((user) => {
          if (filters.status && user.status !== filters.status) return false;
          if (filters.capability && !(user.capabilities || []).includes(filters.capability)) return false;
          if (!searchTerms.length) return true;
          const haystack = moduleActions.normalizedAccessSearch([
            user.firstName,
            user.lastName,
            user.email,
            user.clubId,
            user.clubName,
            user.regionId,
            user.licenseNumber
          ].join(" "));
          return searchTerms.every((term) => haystack.includes(term));
        });
      }

    function sortedAccessUsers(users = []) {
        return [...users].sort((left, right) =>
          String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
          String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
          String(left.email || "").localeCompare(String(right.email || ""), "fr-FR", { sensitivity: "base", numeric: true })
        );
      }

    function accessDirectoryUserLetter(user = {}) {
        const normalizedName = moduleActions.normalizedAccessSearch(user.lastName || "").trim();
        const letter = normalizedName.charAt(0).toLocaleUpperCase("fr-FR");
        return /^[A-Z]$/.test(letter) ? letter : "";
      }

    function renderAccessDirectoryAlphabet(users = []) {
        const mount = portalContext.elements.accessAlphabet;
        if (!mount) return;
        mount.hidden = !portalState.accessDirectorySnapshotMode;
        if (!portalState.accessDirectorySnapshotMode) {
          mount.innerHTML = "";
          return;
        }
        const counts = users.reduce((result, user) => {
          const letter = moduleActions.accessDirectoryUserLetter(user);
          if (letter) result[letter] = (result[letter] || 0) + 1;
          return result;
        }, {});
        if (portalState.accessDirectoryLetter && !counts[portalState.accessDirectoryLetter]) portalState.accessDirectoryLetter = "";
        const choices = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
        mount.innerHTML = choices.map((letter) => {
          const label = letter || "Tous";
          const count = letter ? counts[letter] || 0 : users.length;
          const active = portalState.accessDirectoryLetter === letter;
          return `<button type="button" data-access-directory-letter="${letter}" aria-pressed="${active ? "true" : "false"}" aria-label="${moduleActions.escapeHtml(letter ? `Noms commençant par ${letter}, ${count} compte${count > 1 ? "s" : ""}` : `Tous les noms, ${count} compte${count > 1 ? "s" : ""}`)}" ${letter && !count ? "disabled" : ""}>${label}</button>`;
        }).join("");
      }

    function renderAccessDirectorySnapshotPage({ reset = false } = {}) {
        const usersMatchingFilters = moduleActions.legacyFilteredAccessUsers(
          portalState.accessDirectorySnapshotUsers || [],
          moduleActions.accessFiltersPayload()
        );
        moduleActions.renderAccessDirectoryAlphabet(usersMatchingFilters);
        const filteredUsers = moduleActions.sortedAccessUsers(portalState.accessDirectoryLetter
          ? usersMatchingFilters.filter((user) => moduleActions.accessDirectoryUserLetter(user) === portalState.accessDirectoryLetter)
          : usersMatchingFilters);
        portalState.accessDirectorySnapshotFilteredCount = filteredUsers.length;
        const pageCount = Math.max(1, Math.ceil(filteredUsers.length / 25));
        if (reset) portalState.accessPage = 1;
        portalState.accessPage = Math.min(portalState.accessPage, pageCount);
        const offset = (portalState.accessPage - 1) * 25;
        portalState.accessUsers = filteredUsers.slice(offset, offset + 25);
        portalState.accessCurrentCursor = { offset };
        portalState.accessNextCursor = offset + 25 < filteredUsers.length ? { offset: offset + 25 } : null;
        portalState.accessPreviousCursors = portalState.accessPage > 1 ? Array.from({ length: portalState.accessPage - 1 }, (_, index) => ({ offset: index * 25 })) : [];
        portalState.accessDirectoryTruncated = false;
        portalState.accessUsersLoaded = true;
        moduleActions.renderAccessUsers();
      }
    return { updateAccountEmail, toggleAccountNotificationPreferences, updateAccountPassword, loadAccessUsers, showNextAccessPage, showPreviousAccessPage, refreshAccessUsersAfterMutation, setAccessStatus, loadAccessDeletionRequests, deleteAccessUser, requestAccessUserDeletion, resolveAccessDeletionRequest, saveAccessUser , accessPayloadFromForm, accessDirectorySnapshotScope, loadAccessDirectoryFirestoreModule, preloadAccessDirectoryFirestore, renderAccessDeletionRequests , openAccessDialog, fillAccessForm, resetAccessForm, formatAccessDateTime, accessActionIcon, renderAccessUsers, renderAccessPagination, accessFiltersPayload, legacyFilteredAccessUsers, sortedAccessUsers, accessDirectoryUserLetter, renderAccessDirectoryAlphabet, renderAccessDirectorySnapshotPage };
  });
})(window);
