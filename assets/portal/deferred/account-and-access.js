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
        if (!global.confirm(message)) return;
        if (statusElement) {
          statusElement.textContent = approve ? "Suppression en cours..." : "Refus en cours...";
          statusElement.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction("resolveAccessUserDeletionRequest", { requestId, decision: approve ? "approved" : "rejected" });
          portalState.portalPendingOverviewLoaded = false;
          portalState.accessDeletionRequestsLoaded = false;
          await moduleActions.refreshAccessUsersAfterMutation({ reset: true });
          await moduleActions.loadAccessDeletionRequests({ force: true });
          await portalActions.loadPortalPendingOverview({ force: true });
          if (statusElement) {
          statusElement.textContent = approve ? "Demande acceptée et compte supprimé." : "Demande refusée.";
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
    return { updateAccountEmail, toggleAccountNotificationPreferences, updateAccountPassword, loadAccessUsers, showNextAccessPage, showPreviousAccessPage, refreshAccessUsersAfterMutation, setAccessStatus, loadAccessDeletionRequests, deleteAccessUser, requestAccessUserDeletion, resolveAccessDeletionRequest, saveAccessUser };
  });
})(window);
