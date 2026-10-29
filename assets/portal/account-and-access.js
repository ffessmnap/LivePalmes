(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function loadCurrentUser() {
        if (portalState.currentUserLoading) return;
        portalState.currentUserLoading = true;
        try {
          const result = await portalActions.callFunction("getCurrentAccessUser", {});
          portalActions.renderCurrentUser(result);
        } catch {
          portalActions.renderCurrentUser({ email: portalActions.ensureAdminAuth()?.status?.().email || "" });
        } finally {
          portalState.currentUserLoading = false;
        }
      }

    function updateView(status = {}) {
        const signedIn = Boolean(status.signedIn);
        if (!signedIn) portalConfig.accessRequestHistory?.reset();
        const authReady = status.ready === true;
        const authUid = global.firebase?.auth?.().currentUser?.uid || "";
        if (portalState.activeAuthUid && portalState.activeAuthUid !== authUid) {
          portalConfig.accessRequestHistory?.reset();
          portalActions.clearEngagementClubWorkspaceSessionCaches();
          portalActions.clearEngagementClubSwimmersSessionCaches();
          portalActions.clearActiveEngagementClub();
          portalState.currentAccessProfile = null;
          portalActions.renderPortalScopeContext({});
          portalState.portalPendingOverviewLoaded = false;
          portalState.portalPendingOverviewLoading = false;
          portalActions.renderPortalPendingOverview();
          portalActions.resetEngagementClubData();
          portalState.engagementCompetitions = [];
          portalState.engagementCompetitionsLoaded = false;
          portalState.engagementCompetitionsLoadedRange = "";
          portalState.engagementCompetitionsLoadedCacheKey = "";
          portalState.engagementCompetitionsCachedAt = 0;
          portalState.engagementAccessRequestsLoaded = false;
          portalState.engagementDeletionRequestsLoaded = false;
          portalState.accessUsers = [];
          portalState.accessUsersLoaded = false;
          portalState.accessDirectorySnapshotUsers = null;
          portalState.accessDirectorySnapshotMode = false;
          portalState.accessDirectorySnapshotFilteredCount = 0;
          portalState.accessDirectoryLetter = "";
          portalState.accessCurrentCursor = null;
          portalState.accessNextCursor = null;
          portalState.accessPreviousCursors = [];
          portalState.accessPage = 1;
          portalState.accessDeletionRequestsLoaded = false;
          portalActions.resetEngagementNationalAuditData();
        }
        portalState.activeAuthUid = signedIn ? authUid : "";
        if (!signedIn && status.ready) {
          portalActions.clearActiveEngagementClub();
          portalState.currentAccessProfile = null;
          portalActions.renderPortalScopeContext({});
          portalState.portalPendingOverviewLoaded = false;
          portalState.portalPendingOverviewLoading = false;
          portalActions.renderPortalPendingOverview();
          portalActions.resetEngagementClubData();
          portalActions.resetEngagementNationalAuditData();
        }
        document.body.dataset.adminAuth = !authReady ? "loading" : signedIn ? "unlocked" : "locked";
        document.body.setAttribute("aria-busy", authReady ? "false" : "true");
        if (portalContext.elements.dashboard) portalContext.elements.dashboard.hidden = !signedIn;
        if (portalContext.elements.accountControl) portalContext.elements.accountControl.hidden = !signedIn;
        if (portalContext.elements.navToggle) portalContext.elements.navToggle.hidden = !signedIn;
        if (portalContext.elements.sessionLabel) portalContext.elements.sessionLabel.textContent = "Profil LivePalmes";
        if (signedIn) {
          portalActions.updateCapabilityView();
          if (status.profile) portalActions.renderCurrentUser(status.profile);
          else loadCurrentUser();
        } else {
          portalActions.applyPortalHomeForProfile();
          portalActions.setMobilePortalNavigationOpen(false);
        }
        if (!status.available) {
          portalActions.setMessage("Firebase Authentication n'est pas disponible.");
        } else if (!status.configured) {
          portalActions.setMessage("Aucun administrateur Firebase n'est configure.");
        } else if (!signedIn) {
          portalActions.closeAccountMenu();
          portalActions.setMessage("");
        }
      }

    async function signIn(event) {
        event?.preventDefault?.();
        const auth = portalActions.ensureAdminAuth();
        if (!auth) {
          portalActions.setMessage("Connexion Firebase indisponible.");
          return;
        }
        portalActions.setFormPending(portalContext.elements.form, true, "Connexion en cours…");
        portalActions.setMessage("Connexion en cours...", "loading");
        try {
          await auth.signIn(portalContext.elements.email?.value, portalContext.elements.password?.value);
        } catch (error) {
          portalActions.setMessage(`Connexion impossible : ${error?.message || error}`);
        } finally {
          portalActions.setFormPending(portalContext.elements.form, false);
        }
      }

    async function sendPasswordReset() {
        const auth = portalActions.ensureAdminAuth();
        if (!auth) {
          portalActions.setMessage("Connexion Firebase indisponible.");
          return;
        }
        try {
          await auth.sendPasswordReset(portalContext.elements.email?.value);
          portalActions.setMessage("E-mail de réinitialisation envoyé.", "ok");
        } catch (error) {
          portalActions.setMessage(`Réinitialisation impossible : ${error?.message || error}`);
        }
      }

    async function signOut() {
        try {
          portalActions.clearActiveEngagementClub();
          await portalActions.ensureAdminAuth()?.signOut?.();
        } catch (error) {
          portalActions.setMessage(`Deconnexion impossible : ${error?.message || error}`);
        }
      }

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
          await loadCurrentUser();
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

    function openAccessDialog() {
        const dialog = portalContext.elements.accessPanel;
        if (!dialog) return;
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
        openAccessDialog();
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
          renderAccessPagination();
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
            actions.push(`<button class="ghost-button admin-access-action-button" type="button" data-access-edit="${user.uid}">${accessActionIcon("edit")}<span>Modifier</span></button>`);
            actions.push(`<button class="ghost-button admin-access-action-button" type="button" data-access-status="${inactive ? "active" : "inactive"}" data-access-uid="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${accessActionIcon(inactive ? "enable" : "disable")}<span>${inactive ? "Réactiver" : "Désactiver"}</span></button>`);
          }
          if (portalActions.canDeleteAccessUserDirectly()) {
            actions.push(`<button class="ghost-button danger-button admin-access-action-button" type="button" data-access-delete="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${accessActionIcon("delete")}<span>Supprimer</span></button>`);
          } else if (portalActions.canUse("engagements.region.manage") && (user.capabilities || []).includes("engagements.region.manage")) {
            actions.push(`<button class="ghost-button danger-button admin-access-action-button" type="button" data-access-delete-request="${user.uid}" ${isCurrentUser ? "disabled" : ""}>${accessActionIcon("delete")}<span>Demander la suppression</span></button>`);
          }
          return `
        <article class="admin-access-row ${inactive ? "inactive" : ""}" data-access-uid="${user.uid}" data-expanded="false" role="rowgroup">
          <button class="admin-access-row-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}" data-access-directory-toggle>
            <span class="admin-access-row-toggle-user">
              <strong>${escapeHtml(name)}</strong>
              <small>${escapeHtml(user.email || user.uid)}</small>
            </span>
            <span class="admin-access-row-toggle-meta">
              <span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span>
              <span class="admin-access-row-chevron" aria-hidden="true">›</span>
            </span>
          </button>
          <div class="admin-access-row-summary" role="row">
            <div class="admin-access-last-name" role="cell" data-label="Nom">
              <strong>${escapeHtml(lastName)}</strong>
            </div>
            <div class="admin-access-first-name" role="cell" data-label="Prénom">${escapeHtml(firstName)}</div>
            <div class="admin-access-email" role="cell" data-label="Email" title="${escapeHtml(user.email || user.uid)}">${escapeHtml(user.email || user.uid)}</div>
            <div class="admin-access-scope" role="cell" data-label="Club" title="${escapeHtml(`${clubLine} · ${regionLine}`)}">
              <span>${escapeHtml(clubLine)}</span>
            </div>
            <div role="cell" data-label="Connexion">
              <small class="admin-access-login">${escapeHtml(user.lastLoginAt ? formatAccessDateTime(user.lastLoginAt) : "Non disponible")}</small>
            </div>
            <div role="cell" data-label="État"><span class="admin-access-status ${inactive ? "inactive" : "active"}">${inactive ? "Inactif" : "Actif"}</span></div>
            <div class="admin-access-row-disclosure" role="cell">
              <button type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${escapeHtml(name)}" data-access-directory-toggle>
                <span class="admin-access-row-chevron" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
          <div id="${detailsId}" class="admin-access-row-expanded">
            <div class="admin-access-row-expanded-data">
              <div><span>Licence</span><strong>${escapeHtml(user.licenseNumber || "Non renseignée")}</strong></div>
              <div><span>Périmètre</span><strong>${escapeHtml(clubLine)}</strong><small>${escapeHtml(regionLine)}</small></div>
              <div class="admin-access-row-expanded-rights"><span>Habilitations</span><strong>${escapeHtml(rightsLabel)}</strong></div>
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
        renderAccessPagination();
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

    function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

    function accessFiltersPayload() {
        return {
          search: portalContext.elements.accessSearch?.value || "",
          status: portalContext.elements.accessStatusFilter?.value || "",
          capability: portalContext.elements.accessCapabilityFilter?.value || ""
        };
      }

    function normalizedAccessSearch(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("fr");
      }

    function legacyFilteredAccessUsers(users, filters) {
        const searchTerms = normalizedAccessSearch(filters.search).split(/\s+/).filter(Boolean);
        return users.filter((user) => {
          if (filters.status && user.status !== filters.status) return false;
          if (filters.capability && !(user.capabilities || []).includes(filters.capability)) return false;
          if (!searchTerms.length) return true;
          const haystack = normalizedAccessSearch([
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
        const load = () => loadAccessDirectoryFirestoreModule().catch(() => {});
        if (typeof global.requestIdleCallback === "function") global.requestIdleCallback(load, { timeout: 2500 });
        else global.setTimeout(load, 800);
      }

    async function loadAccessDirectorySnapshot() {
        const scope = accessDirectorySnapshotScope();
        if (scope.scopeType === "region" && !scope.scopeId) return null;
        await loadAccessDirectoryFirestoreModule();
        if (!portalActions.ensureFirebaseApp() || !global.firebase?.firestore) return null;
        const snapshot = await global.firebase.firestore()
          .collection("accessDirectorySnapshots")
          .doc(scope.documentId)
          .get();
        if (!snapshot.exists) return null;
        const data = snapshot.data() || {};
        if (data.status !== "ready" || Number(data.version) < 3 || data.scopeType !== scope.scopeType) return null;
        if (scope.scopeType === "region" && data.scopeId !== scope.scopeId) return null;
        return Object.values(data.entries && typeof data.entries === "object" ? data.entries : {})
          .filter((user) => user && typeof user === "object" && user.uid);
      }

    function sortedAccessUsers(users = []) {
        return [...users].sort((left, right) =>
          String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
          String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR", { sensitivity: "base", numeric: true }) ||
          String(left.email || "").localeCompare(String(right.email || ""), "fr-FR", { sensitivity: "base", numeric: true })
        );
      }

    function accessDirectoryUserLetter(user = {}) {
        const normalizedName = normalizedAccessSearch(user.lastName || "").trim();
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
          const letter = accessDirectoryUserLetter(user);
          if (letter) result[letter] = (result[letter] || 0) + 1;
          return result;
        }, {});
        if (portalState.accessDirectoryLetter && !counts[portalState.accessDirectoryLetter]) portalState.accessDirectoryLetter = "";
        const choices = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
        mount.innerHTML = choices.map((letter) => {
          const label = letter || "Tous";
          const count = letter ? counts[letter] || 0 : users.length;
          const active = portalState.accessDirectoryLetter === letter;
          return `<button type="button" data-access-directory-letter="${letter}" aria-pressed="${active ? "true" : "false"}" aria-label="${escapeHtml(letter ? `Noms commençant par ${letter}, ${count} compte${count > 1 ? "s" : ""}` : `Tous les noms, ${count} compte${count > 1 ? "s" : ""}`)}" ${letter && !count ? "disabled" : ""}>${label}</button>`;
        }).join("");
      }

    function renderAccessDirectorySnapshotPage({ reset = false } = {}) {
        const usersMatchingFilters = legacyFilteredAccessUsers(
          portalState.accessDirectorySnapshotUsers || [],
          accessFiltersPayload()
        );
        renderAccessDirectoryAlphabet(usersMatchingFilters);
        const filteredUsers = sortedAccessUsers(portalState.accessDirectoryLetter
          ? usersMatchingFilters.filter((user) => accessDirectoryUserLetter(user) === portalState.accessDirectoryLetter)
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
        renderAccessUsers();
      }

    async function loadAccessUsers({ reset = false, force = false, skipSnapshot = false } = {}) {
        if (!portalActions.canManageAccessDirectory()) return;
        if (portalState.accessUsersLoading && !reset) return;
        if (portalState.accessDirectorySnapshotMode && portalState.accessDirectorySnapshotUsers && !skipSnapshot) {
          renderAccessDirectorySnapshotPage({ reset });
          return;
        }
        if (portalState.accessUsersLoaded && !reset && !force) {
          renderAccessUsers();
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
        renderAccessPagination();
        if (portalContext.elements.accessCount) portalContext.elements.accessCount.textContent = "Chargement…";
        try {
          if (!skipSnapshot) {
            try {
              const snapshotUsers = await loadAccessDirectorySnapshot();
              if (loadSequence !== portalState.accessLoadSequence) return;
              if (snapshotUsers) {
                portalState.accessDirectorySnapshotUsers = snapshotUsers;
                portalState.accessDirectorySnapshotMode = true;
                renderAccessDirectorySnapshotPage({ reset: true });
                return;
              }
            } catch (error) {
              console.warn("Annuaire privé direct indisponible, utilisation de la lecture paginée.", error?.code || error?.message || error);
            }
          }
          portalState.accessDirectorySnapshotMode = false;
          renderAccessDirectoryAlphabet();
          const filters = accessFiltersPayload();
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
            const filteredUsers = legacyFilteredAccessUsers(returnedUsers, filters);
            const offset = Math.max(0, Math.trunc(Number(portalState.accessCurrentCursor?.offset) || 0));
            portalState.accessUsers = filteredUsers.slice(offset, offset + 25);
            portalState.accessNextCursor = offset + 25 < filteredUsers.length ? { offset: offset + 25 } : null;
            portalState.accessDirectoryTruncated = false;
          }
          portalState.accessUsersLoaded = true;
          renderAccessUsers();
        } catch (error) {
          if (loadSequence !== portalState.accessLoadSequence) return;
          if (portalContext.elements.accessList) {
            portalContext.elements.accessList.innerHTML = `<p class="admin-access-empty">Lecture des accès impossible : ${escapeHtml(error?.message || error)}</p>`;
          }
        } finally {
          if (loadSequence !== portalState.accessLoadSequence) return;
          portalState.accessUsersLoading = false;
          renderAccessPagination();
        }
      }

    async function showNextAccessPage() {
        if (!portalState.accessNextCursor || portalState.accessUsersLoading) return;
        if (portalState.accessDirectorySnapshotMode) {
          portalState.accessPage += 1;
          renderAccessDirectorySnapshotPage();
          return;
        }
        portalState.accessPreviousCursors.push(portalState.accessCurrentCursor);
        portalState.accessCurrentCursor = portalState.accessNextCursor;
        portalState.accessPage += 1;
        await loadAccessUsers({ force: true });
      }

    async function showPreviousAccessPage() {
        if (portalState.accessUsersLoading || (portalState.accessDirectorySnapshotMode ? portalState.accessPage <= 1 : !portalState.accessPreviousCursors.length)) return;
        if (portalState.accessDirectorySnapshotMode) {
          portalState.accessPage = Math.max(1, portalState.accessPage - 1);
          renderAccessDirectorySnapshotPage();
          return;
        }
        portalState.accessCurrentCursor = portalState.accessPreviousCursors.pop() || null;
        portalState.accessPage = Math.max(1, portalState.accessPage - 1);
        await loadAccessUsers({ force: true });
      }

    async function refreshAccessUsersAfterMutation({ reset = false } = {}) {
        portalState.accessDirectorySnapshotUsers = null;
        portalState.accessDirectorySnapshotMode = false;
        portalState.accessDirectorySnapshotFilteredCount = 0;
        await loadAccessUsers({ reset, force: true, skipSnapshot: true });
      }

    async function setAccessStatus(uid, status) {
        const user = portalState.accessUsers.find((item) => item.uid === uid);
        const label = user?.email || uid;
        const verb = status === "active" ? "réactiver" : "désactiver";
        if (!window.confirm(`Confirmer : ${verb} ${label} ?`)) return;
        try {
          await portalActions.callFunction("setAccessUserStatus", { uid, status });
          await refreshAccessUsersAfterMutation();
          portalActions.setAccessMessage(`Accès ${status === "active" ? "réactivé" : "désactivé"}.`, "ok");
        } catch (error) {
          portalActions.setAccessMessage(`Changement de statut impossible : ${error?.message || error}`);
        }
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
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(request.targetEmail || request.targetUid)}</small>
            <small>${escapeHtml(`Région ${region} - ${rights}`)}</small>
          </div>
          <div class="admin-engagements-request-meta">
            <span>Demande par ${escapeHtml(request.requestedByEmail || request.requestedBy || "admin régional")}</span>
            <span>${escapeHtml(request.requestedAt ? formatAccessDateTime(request.requestedAt) : "")}</span>
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
          renderAccessDeletionRequests();
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
          await refreshAccessUsersAfterMutation({ reset: true });
          if (portalActions.canDeleteAccessUserDirectly()) await loadAccessDeletionRequests({ force: true });
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
          await refreshAccessUsersAfterMutation({ reset: true });
          await loadAccessDeletionRequests({ force: true });
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
        const payload = accessPayloadFromForm();
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
          resetAccessForm(true);
          await refreshAccessUsersAfterMutation({ reset: true });
          portalActions.setAccessMessage(
            `${result.created ? "Compte créé" : "Compte mis à jour"} : ${result.email}. ${sendReset ? "E-mail de mot de passe envoyé." : ""}`,
            "ok"
          );
        } catch (error) {
          portalActions.setAccessMessage(`Enregistrement impossible : ${error?.message || error}`);
        }
      }

    return {
      loadCurrentUser,
      updateView,
      signIn,
      sendPasswordReset,
      signOut,
      updateAccountEmail,
      toggleAccountNotificationPreferences,
      updateAccountPassword,
      accessPayloadFromForm,
      openAccessDialog,
      fillAccessForm,
      resetAccessForm,
      formatAccessDateTime,
      accessActionIcon,
      renderAccessUsers,
      renderAccessPagination,
      escapeHtml,
      accessFiltersPayload,
      normalizedAccessSearch,
      legacyFilteredAccessUsers,
      accessDirectorySnapshotScope,
      loadAccessDirectoryFirestoreModule,
      preloadAccessDirectoryFirestore,
      loadAccessDirectorySnapshot,
      sortedAccessUsers,
      accessDirectoryUserLetter,
      renderAccessDirectoryAlphabet,
      renderAccessDirectorySnapshotPage,
      loadAccessUsers,
      showNextAccessPage,
      showPreviousAccessPage,
      refreshAccessUsersAfterMutation,
      setAccessStatus,
      renderAccessDeletionRequests,
      loadAccessDeletionRequests,
      deleteAccessUser,
      requestAccessUserDeletion,
      resolveAccessDeletionRequest,
      saveAccessUser
    };
  }
  global.LivePalmesPortalAccountAndAccess = { create };
})(window);
