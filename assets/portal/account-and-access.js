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
        const retry = document.querySelector?.("#adminPortalAuthRetry");
        if (retry) retry.hidden = signedIn || !authReady || !authUid || status.accessError?.retryable !== true;
        const context = profile => profile ? JSON.stringify([profile.clubId,profile.regionId,profile.accessScopes,[...(profile.capabilities || [])].sort()]) : "";
        const contextChanged = status.profile && portalState.currentAccessProfile && context(status.profile) !== context(portalState.currentAccessProfile);
        if (portalState.activeAuthUid && (portalState.activeAuthUid !== authUid || contextChanged)) {
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
          portalActions.setMessage(status.accessError?.message || "", status.accessError ? "error" : "");
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
          if (portalContext.elements.password) portalContext.elements.password.value = "";
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

    /* deferred-function: assets/portal/deferred/account-and-access.js#updateAccountEmail */
    async function updateAccountEmail(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "updateAccountEmail", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#toggleAccountNotificationPreferences */
    async function toggleAccountNotificationPreferences(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "toggleAccountNotificationPreferences", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#updateAccountPassword */
    async function updateAccountPassword(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "updateAccountPassword", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#accessPayloadFromForm */
    function accessPayloadFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "accessPayloadFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#openAccessDialog */
    function openAccessDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "openAccessDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#fillAccessForm */
    function fillAccessForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "fillAccessForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#resetAccessForm */
    function resetAccessForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "resetAccessForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#formatAccessDateTime */
    function formatAccessDateTime(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "formatAccessDateTime", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#accessActionIcon */
    function accessActionIcon(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "accessActionIcon", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#renderAccessUsers */
    function renderAccessUsers(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "renderAccessUsers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#renderAccessPagination */
    function renderAccessPagination(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "renderAccessPagination", args, moduleActions);
    }

    function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

    /* deferred-function: assets/portal/deferred/account-and-access.js#accessFiltersPayload */
    function accessFiltersPayload(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "accessFiltersPayload", args, moduleActions);
    }

    function normalizedAccessSearch(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("fr");
      }

    /* deferred-function: assets/portal/deferred/account-and-access.js#legacyFilteredAccessUsers */
    function legacyFilteredAccessUsers(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "legacyFilteredAccessUsers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#accessDirectorySnapshotScope */
    function accessDirectorySnapshotScope(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "accessDirectorySnapshotScope", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#loadAccessDirectoryFirestoreModule */
    function loadAccessDirectoryFirestoreModule(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "loadAccessDirectoryFirestoreModule", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#preloadAccessDirectoryFirestore */
    function preloadAccessDirectoryFirestore(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "preloadAccessDirectoryFirestore", args, moduleActions);
    }

    async function loadAccessDirectorySnapshot() {
        const scope = accessDirectorySnapshotScope();
        if (scope.scopeType === "region" && !scope.scopeId) return null;
        if (global.LivePalmesPortalSession?.enabled) {
          const result = await portalActions.callFunction("getPortalAccessDirectorySnapshot", {});
          return Array.isArray(result.users) ? result.users : null;
        }
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

    /* deferred-function: assets/portal/deferred/account-and-access.js#sortedAccessUsers */
    function sortedAccessUsers(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "sortedAccessUsers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#accessDirectoryUserLetter */
    function accessDirectoryUserLetter(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "accessDirectoryUserLetter", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#renderAccessDirectoryAlphabet */
    function renderAccessDirectoryAlphabet(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "renderAccessDirectoryAlphabet", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#renderAccessDirectorySnapshotPage */
    function renderAccessDirectorySnapshotPage(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "renderAccessDirectorySnapshotPage", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#loadAccessUsers */
    async function loadAccessUsers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "loadAccessUsers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#showNextAccessPage */
    async function showNextAccessPage(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "showNextAccessPage", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#showPreviousAccessPage */
    async function showPreviousAccessPage(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "showPreviousAccessPage", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#refreshAccessUsersAfterMutation */
    async function refreshAccessUsersAfterMutation(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "refreshAccessUsersAfterMutation", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#setAccessStatus */
    async function setAccessStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "setAccessStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#renderAccessDeletionRequests */
    function renderAccessDeletionRequests(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "account-and-access", "renderAccessDeletionRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#loadAccessDeletionRequests */
    async function loadAccessDeletionRequests(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "loadAccessDeletionRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#deleteAccessUser */
    async function deleteAccessUser(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "deleteAccessUser", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#requestAccessUserDeletion */
    async function requestAccessUserDeletion(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "requestAccessUserDeletion", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#resolveAccessDeletionRequest */
    async function resolveAccessDeletionRequest(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "resolveAccessDeletionRequest", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/account-and-access.js#saveAccessUser */
    async function saveAccessUser(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "account-and-access", "saveAccessUser", args, moduleActions);
    }

    const moduleActions = { loadCurrentUser, updateView, signIn, sendPasswordReset, signOut, updateAccountEmail, toggleAccountNotificationPreferences, updateAccountPassword, accessPayloadFromForm, openAccessDialog, fillAccessForm, resetAccessForm, formatAccessDateTime, accessActionIcon, renderAccessUsers, renderAccessPagination, escapeHtml, accessFiltersPayload, normalizedAccessSearch, legacyFilteredAccessUsers, accessDirectorySnapshotScope, loadAccessDirectoryFirestoreModule, preloadAccessDirectoryFirestore, loadAccessDirectorySnapshot, sortedAccessUsers, accessDirectoryUserLetter, renderAccessDirectoryAlphabet, renderAccessDirectorySnapshotPage, loadAccessUsers, showNextAccessPage, showPreviousAccessPage, refreshAccessUsersAfterMutation, setAccessStatus, renderAccessDeletionRequests, loadAccessDeletionRequests, deleteAccessUser, requestAccessUserDeletion, resolveAccessDeletionRequest, saveAccessUser };
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
