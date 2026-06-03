(function attachLivePalmesAdminPortal(global) {
  const elements = {
    dashboard: document.querySelector("#adminPortalDashboard"),
    email: document.querySelector("#adminPortalEmail"),
    form: document.querySelector("#adminPortalLoginForm"),
    message: document.querySelector("#adminPortalMessage"),
    password: document.querySelector("#adminPortalPassword"),
    reset: document.querySelector("#adminPortalResetButton"),
    sessionLabel: document.querySelector("#adminPortalSessionLabel"),
    signOut: document.querySelector("#adminPortalSignOutButton"),
    accessForm: document.querySelector("#adminAccessForm"),
    accessMessage: document.querySelector("#adminAccessMessage"),
    accessList: document.querySelector("#adminAccessList"),
    accessRefresh: document.querySelector("#adminAccessRefreshButton"),
    cancelEdit: document.querySelector("#adminAccessCancelEdit"),
    currentName: document.querySelector("#adminCurrentUserName"),
    currentEmail: document.querySelector("#adminCurrentUserEmail"),
    currentClub: document.querySelector("#adminCurrentUserClub"),
    currentLicense: document.querySelector("#adminCurrentUserLicense"),
    currentRights: document.querySelector("#adminCurrentUserRights")
  };

  let adminAuth = null;
  let accessUsers = [];
  let editingUid = "";
  let currentUserLoading = false;

  function ensureFirebaseApp() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !config) return false;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return true;
  }

  function ensureAdminAuth() {
    if (adminAuth) return adminAuth;
    if (!ensureFirebaseApp() || !global.LivePalmesAdminAuth?.init) return null;
    adminAuth = global.LivePalmesAdminAuth.init({
      firebase: global.firebase,
      authConfig: global.LivePalmesAppConfig?.adminAuth || {}
    });
    adminAuth.onChange(updateView);
    return adminAuth;
  }

  function functionsService() {
    if (!ensureFirebaseApp() || !global.firebase?.functions) return null;
    try {
      return global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    } catch {
      return global.firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    }
  }

  async function callFunction(name, payload) {
    const functions = functionsService();
    if (!functions?.httpsCallable) throw new Error("Cloud Functions LivePalmes indisponibles.");
    const result = await functions.httpsCallable(name)(payload);
    return result.data || {};
  }

  function setMessage(message, tone = "error") {
    if (!elements.message) return;
    elements.message.textContent = message || "";
    elements.message.dataset.tone = tone;
  }

  function setAccessMessage(message, tone = "error") {
    if (!elements.accessMessage) return;
    elements.accessMessage.textContent = message || "";
    elements.accessMessage.dataset.tone = tone;
  }

  function canUse(capability) {
    const auth = ensureAdminAuth();
    return Boolean(auth?.hasCapability?.("admin.full") || auth?.hasCapability?.(capability));
  }

  function updateCapabilityView() {
    document.querySelectorAll("[data-capability-card]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityCard);
    });
    document.querySelectorAll("[data-capability-panel]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityPanel);
    });
  }

  function capabilityLabel(capability) {
    return {
      "admin.full": "Administration generale",
      "records.manage": "Records / MPF",
      "consoles.manage": "Pilotage LivePalmes",
      "competitions.import": "Import competitions"
    }[capability] || capability;
  }

  function renderCurrentUser(user = {}) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Profil LivePalmes";
    if (elements.sessionLabel) elements.sessionLabel.textContent = name;
    if (elements.currentName) elements.currentName.textContent = name;
    if (elements.currentEmail) elements.currentEmail.textContent = user.email || "-";
    if (elements.currentClub) elements.currentClub.textContent = user.clubName || "-";
    if (elements.currentLicense) elements.currentLicense.textContent = user.licenseNumber || "-";
    if (elements.currentRights) {
      elements.currentRights.textContent = (user.capabilities || []).map(capabilityLabel).join(", ") || "-";
    }
  }

  async function loadCurrentUser() {
    if (currentUserLoading) return;
    currentUserLoading = true;
    try {
      const result = await callFunction("getCurrentAccessUser", {});
      renderCurrentUser(result);
    } catch {
      renderCurrentUser({ email: ensureAdminAuth()?.status?.().email || "" });
    } finally {
      currentUserLoading = false;
    }
  }

  function updateView(status = {}) {
    const signedIn = Boolean(status.signedIn);
    document.body.dataset.adminAuth = signedIn ? "unlocked" : "locked";
    if (elements.dashboard) elements.dashboard.hidden = !signedIn;
    if (elements.sessionLabel) elements.sessionLabel.textContent = signedIn ? "Profil LivePalmes" : "Compte administrateur";
    if (signedIn) {
      updateCapabilityView();
      loadCurrentUser();
      if (canUse("admin.full")) loadAccessUsers();
    }
    if (!status.available) {
      setMessage("Firebase Authentication n'est pas disponible.");
    } else if (!status.configured) {
      setMessage("Aucun administrateur Firebase n'est configure.");
    } else if (!signedIn) {
      setMessage("");
    }
  }

  async function signIn(event) {
    event?.preventDefault?.();
    const auth = ensureAdminAuth();
    if (!auth) {
      setMessage("Connexion Firebase indisponible.");
      return;
    }
    setMessage("");
    try {
      await auth.signIn(elements.email?.value, elements.password?.value);
    } catch (error) {
      setMessage(`Connexion impossible : ${error?.message || error}`);
    }
  }

  async function sendPasswordReset() {
    const auth = ensureAdminAuth();
    if (!auth) {
      setMessage("Connexion Firebase indisponible.");
      return;
    }
    try {
      await auth.sendPasswordReset(elements.email?.value);
      setMessage("Email de reinitialisation envoye.", "ok");
    } catch (error) {
      setMessage(`Reinitialisation impossible : ${error?.message || error}`);
    }
  }

  async function signOut() {
    try {
      await ensureAdminAuth()?.signOut?.();
    } catch (error) {
      setMessage(`Deconnexion impossible : ${error?.message || error}`);
    }
  }

  function accessPayloadFromForm() {
    const form = elements.accessForm;
    const capabilities = [...form.querySelectorAll("input[name='capability']:checked")]
      .map((input) => input.value);
    return {
      uid: editingUid,
      firstName: form.querySelector("#adminAccessFirstName")?.value || "",
      lastName: form.querySelector("#adminAccessLastName")?.value || "",
      email: form.querySelector("#adminAccessEmail")?.value || "",
      clubName: form.querySelector("#adminAccessClubName")?.value || "",
      licenseNumber: form.querySelector("#adminAccessLicenseNumber")?.value || "",
      capabilities
    };
  }

  function fillAccessForm(user = {}) {
    const form = elements.accessForm;
    if (!form) return;
    editingUid = user.uid || "";
    form.querySelector("#adminAccessFirstName").value = user.firstName || "";
    form.querySelector("#adminAccessLastName").value = user.lastName || "";
    form.querySelector("#adminAccessEmail").value = user.email || "";
    form.querySelector("#adminAccessClubName").value = user.clubName || "";
    form.querySelector("#adminAccessLicenseNumber").value = user.licenseNumber || "";
    form.querySelectorAll("input[name='capability']").forEach((input) => {
      input.checked = (user.capabilities || []).includes(input.value);
    });
    form.querySelector("#adminAccessSendReset").checked = false;
    if (elements.cancelEdit) elements.cancelEdit.hidden = !editingUid;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetAccessForm() {
    editingUid = "";
    elements.accessForm?.reset();
    if (elements.cancelEdit) elements.cancelEdit.hidden = true;
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

  function renderAccessUsers() {
    const mount = elements.accessList;
    if (!mount) return;
    if (!accessUsers.length) {
      mount.innerHTML = `<p class="admin-access-empty">Aucun acces cree depuis le portail pour le moment.</p>`;
      return;
    }
    mount.innerHTML = accessUsers.map((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Compte LivePalmes";
      const details = [user.email, user.clubName, user.licenseNumber ? `Licence ${user.licenseNumber}` : ""].filter(Boolean).join(" · ");
      const lastLogin = `Derniere connexion : ${formatAccessDateTime(user.lastLoginAt)}`;
      const rights = (user.capabilities || []).length
        ? user.capabilities.map((capability) => `<span>${capabilityLabel(capability)}</span>`).join("")
        : `<span>Aucun droit actif</span>`;
      const inactive = user.status !== "active";
      return `
        <article class="admin-access-row ${inactive ? "inactive" : ""}" data-access-uid="${user.uid}">
          <div>
            <span class="admin-access-status">${inactive ? "Inactif" : "Actif"}</span>
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(details || user.uid)}</small>
            <small class="admin-access-login">${escapeHtml(lastLogin)}</small>
            <div class="admin-access-right-tags">${rights}</div>
          </div>
          <div class="admin-access-row-actions">
            <button class="ghost-button" type="button" data-access-edit="${user.uid}">Modifier</button>
            <button class="ghost-button" type="button" data-access-status="${inactive ? "active" : "inactive"}" data-access-uid="${user.uid}">
              ${inactive ? "Reactiver" : "Desactiver"}
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function loadAccessUsers() {
    if (!canUse("admin.full")) return;
    try {
      const result = await callFunction("listAccessUsers", {});
      accessUsers = Array.isArray(result.users) ? result.users : [];
      renderAccessUsers();
    } catch (error) {
      if (elements.accessList) {
        elements.accessList.innerHTML = `<p class="admin-access-empty">Lecture des acces impossible : ${escapeHtml(error?.message || error)}</p>`;
      }
    }
  }

  async function setAccessStatus(uid, status) {
    const user = accessUsers.find((item) => item.uid === uid);
    const label = user?.email || uid;
    const verb = status === "active" ? "reactiver" : "desactiver";
    if (!window.confirm(`Confirmer : ${verb} ${label} ?`)) return;
    try {
      await callFunction("setAccessUserStatus", { uid, status });
      await loadAccessUsers();
      setAccessMessage(`Acces ${status === "active" ? "reactive" : "desactive"}.`, "ok");
    } catch (error) {
      setAccessMessage(`Changement de statut impossible : ${error?.message || error}`);
    }
  }

  async function saveAccessUser(event) {
    event?.preventDefault?.();
    if (!canUse("admin.full")) {
      setAccessMessage("Droit admin general requis.");
      return;
    }
    const payload = accessPayloadFromForm();
    setAccessMessage("");
    try {
      const result = await callFunction("createOrUpdateAccessUser", payload);
      const sendReset = elements.accessForm.querySelector("#adminAccessSendReset")?.checked;
      if (sendReset) {
        await global.firebase.auth().sendPasswordResetEmail(result.email || payload.email);
      }
      resetAccessForm();
      await loadAccessUsers();
      setAccessMessage(
        `${result.created ? "Compte cree" : "Compte mis a jour"} : ${result.email}. ${sendReset ? "Email de mot de passe envoye." : ""}`,
        "ok"
      );
    } catch (error) {
      setAccessMessage(`Enregistrement impossible : ${error?.message || error}`);
    }
  }

  function init() {
    const auth = ensureAdminAuth();
    updateView(auth?.status?.() || {});
    elements.form?.addEventListener("submit", signIn);
    elements.reset?.addEventListener("click", sendPasswordReset);
    elements.signOut?.addEventListener("click", signOut);
    elements.accessForm?.addEventListener("submit", saveAccessUser);
    elements.accessRefresh?.addEventListener("click", loadAccessUsers);
    elements.cancelEdit?.addEventListener("click", resetAccessForm);
    elements.accessList?.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-access-edit]");
      if (edit) {
        const user = accessUsers.find((item) => item.uid === edit.dataset.accessEdit);
        if (user) fillAccessForm(user);
        return;
      }
      const statusButton = event.target.closest("[data-access-status]");
      if (statusButton) {
        setAccessStatus(statusButton.dataset.accessUid, statusButton.dataset.accessStatus);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
