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
    accountControl: document.querySelector("#adminPortalAccount"),
    accountToggle: document.querySelector("#adminPortalAccountToggle"),
    accountActions: document.querySelector("#adminPortalAccountActions"),
    navToggle: document.querySelector("#adminPortalNavToggle"),
    navCurrent: document.querySelector("#adminPortalNavCurrent"),
    navigation: document.querySelector("#adminPortalNavigation"),
    performanceMenu: document.querySelector("[data-admin-performance-menu]"),
    performanceToggle: document.querySelector("#adminPortalPerformanceToggle"),
    performanceSubmenu: document.querySelector("#adminPortalPerformanceSubmenu"),
    dtnToggle: document.querySelector("#adminPortalDtnToggle"),
    dtnSubmenu: document.querySelector("#adminPortalDtnSubmenu"),
    accessForm: document.querySelector("#adminAccessForm"),
    accessMessage: document.querySelector("#adminAccessMessage"),
    accessList: document.querySelector("#adminAccessList"),
    accessRefresh: document.querySelector("#adminAccessRefreshButton"),
    cancelEdit: document.querySelector("#adminAccessCancelEdit"),
    accountEmailForm: document.querySelector("#adminAccountEmailForm"),
    accountEmail: document.querySelector("#adminAccountEmail"),
    accountEmailPassword: document.querySelector("#adminAccountEmailPassword"),
    accountEmailMessage: document.querySelector("#adminAccountEmailMessage"),
    accountPasswordForm: document.querySelector("#adminAccountPasswordForm"),
    accountCurrentPassword: document.querySelector("#adminAccountCurrentPassword"),
    accountNewPassword: document.querySelector("#adminAccountNewPassword"),
    accountConfirmPassword: document.querySelector("#adminAccountConfirmPassword"),
    accountPasswordMessage: document.querySelector("#adminAccountPasswordMessage"),
    recordModuleStatus: document.querySelector("#adminRecordModuleStatus"),
    performanceStyles: document.querySelector("#adminPerformanceStyles"),
    recordWorkbench: document.querySelector("#adminWorkbench"),
    importModuleStatus: document.querySelector("#adminImportModuleStatus"),
    importStyles: document.querySelector("#adminImportStyles"),
    importWorkbench: document.querySelector("#importWorkbench"),
    correctionModuleStatus: document.querySelector("#adminCorrectionModuleStatus"),
    correctionWorkbench: document.querySelector("#correctionWorkbench")
  };

  let adminAuth = null;
  let accessUsers = [];
  let editingUid = "";
  let currentUserLoading = false;
  let recordModuleLoadPromise = null;
  let importModuleLoadPromise = null;

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

  function setAccountMessage(element, message, tone = "error") {
    if (!element) return;
    element.textContent = message || "";
    element.dataset.tone = tone;
  }

  function closeAccountMenu() {
    elements.accountToggle?.setAttribute("aria-expanded", "false");
    if (elements.accountActions) elements.accountActions.hidden = true;
  }

  function canManagePerformances() {
    return canUse("records.manage") || canUse("competitions.import");
  }

  function setPerformanceMenuOpen(open) {
    const expanded = Boolean(open && canManagePerformances());
    elements.performanceToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.performanceSubmenu) elements.performanceSubmenu.hidden = !expanded;
  }

  function setDtnMenuOpen(open) {
    const expanded = Boolean(open && canUse("dtn.view"));
    elements.dtnToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (elements.dtnSubmenu) elements.dtnSubmenu.hidden = !expanded;
  }

  function firebaseAccountError(error) {
    const code = String(error?.code || "");
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Le mot de passe actuel est incorrect.";
    if (code.includes("email-already-in-use") || code.includes("already-exists")) return "Cette adresse email est déjà utilisée.";
    if (code.includes("invalid-email")) return "L’adresse email n’est pas valide.";
    if (code.includes("weak-password")) return "Le nouveau mot de passe n’est pas assez sécurisé.";
    if (code.includes("too-many-requests")) return "Trop de tentatives. Réessayez dans quelques minutes.";
    if (code.includes("requires-recent-login") || code.includes("failed-precondition")) return "Votre session doit être confirmée à nouveau. Vérifiez votre mot de passe actuel.";
    return error?.message || String(error);
  }

  async function reauthenticateCurrentUser(password) {
    const firebase = global.firebase;
    const user = firebase?.auth?.().currentUser;
    if (!user?.email || !firebase?.auth?.EmailAuthProvider?.credential || !user.reauthenticateWithCredential) {
      throw new Error("Compte Firebase indisponible.");
    }
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
    await user.getIdToken?.(true);
    return user;
  }

  function canUse(capability) {
    const auth = ensureAdminAuth();
    if (capability === "dtn.view") return Boolean(auth?.hasCapability?.("dtn.view"));
    return Boolean(auth?.hasCapability?.("admin.full") || auth?.hasCapability?.(capability));
  }

  function updateCapabilityView() {
    document.querySelectorAll("[data-capability-nav]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityNav);
    });
    document.querySelectorAll(".admin-portal-nav-group").forEach((group) => {
      group.hidden = !Array.from(group.querySelectorAll("a")).some((link) => !link.hidden);
    });
    document.querySelectorAll("[data-capability-panel]").forEach((item) => {
      item.hidden = !canUse(item.dataset.capabilityPanel);
    });
    if (elements.performanceMenu) elements.performanceMenu.hidden = !canManagePerformances();
    if (!canManagePerformances()) setPerformanceMenuOpen(false);
    if (!canUse("dtn.view")) setDtnMenuOpen(false);
    updateNavigationView();
  }

  function requestedNavigationView() {
    if (global.location.hash === "#gestion-acces") return "access";
    if (global.location.hash === "#mon-compte") return "account";
    if (global.location.hash === "#records-mpf") return "records";
    if (global.location.hash === "#import-competitions") return "import";
    if (global.location.hash === "#correction-performance") return "correction";
    if (["#espace-dtn", "#espace-dtn-france", "#espace-dtn-edf"].includes(global.location.hash)) return "dtn";
    if (canUse("records.manage")) return "records";
    if (canUse("competitions.import")) return "import";
    if (canUse("dtn.view")) return "dtn";
    if (canUse("admin.full")) return "access";
    return "account";
  }

  function updateNavigationView() {
    const requestedView = requestedNavigationView();
    const accessDenied = requestedView === "access" && !canUse("admin.full");
    const recordsDenied = requestedView === "records" && !canUse("records.manage");
    const importDenied = requestedView === "import" && !canUse("competitions.import");
    const correctionDenied = requestedView === "correction" && !canUse("competitions.import");
    const dtnDenied = requestedView === "dtn" && !canUse("dtn.view");
    const activeView = accessDenied || recordsDenied || importDenied || correctionDenied || dtnDenied
      ? (canUse("records.manage") ? "records" : canUse("competitions.import") ? "import" : canUse("dtn.view") ? "dtn" : "account")
      : requestedView;
    document.querySelectorAll("[data-admin-view]").forEach((section) => {
      section.hidden = section.dataset.adminView !== activeView;
    });
    document.querySelectorAll("[data-admin-view-link]").forEach((link) => {
      const dtnHash = link.dataset.dtnGridLink ? `#espace-dtn-${link.dataset.dtnGridLink}` : "";
      const legacyDtnFrance = link.dataset.dtnGridLink === "france" && global.location.hash === "#espace-dtn";
      const isActive = link.dataset.adminViewLink === activeView && (!dtnHash || global.location.hash === dtnHash || legacyDtnFrance);
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    const activeLink = document.querySelector("[data-admin-view-link].active");
    if (elements.navCurrent) elements.navCurrent.textContent = activeLink?.textContent?.trim() || "Navigation";
    const recordsActive = activeView === "records";
    const importActive = activeView === "import";
    const correctionActive = activeView === "correction";
    const importModuleActive = importActive || correctionActive;
    const performanceModuleActive = recordsActive || importModuleActive;
    if (elements.performanceStyles) elements.performanceStyles.disabled = !performanceModuleActive;
    if (elements.importStyles) elements.importStyles.disabled = !importModuleActive;
    document.body.classList.toggle("performance-admin-page", performanceModuleActive);
    if (recordsActive) loadRecordModule();
    if (importModuleActive) loadImportModule();
  }

  function loadScriptOnce(src, id) {
    const existing = document.querySelector(`#${id}`);
    if (existing?.dataset.loaded === "true") return Promise.resolve();
    if (existing?.livePalmesLoadPromise) return existing.livePalmesLoadPromise;
    const script = existing || document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    script.livePalmesLoadPromise = new Promise((resolve, reject) => {
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Chargement impossible : ${src}`)), { once: true });
    });
    if (!existing) document.body.appendChild(script);
    return script.livePalmesLoadPromise;
  }

  function watchRecordWorkbench() {
    if (!elements.recordWorkbench || !elements.recordModuleStatus) return;
    const updateStatus = () => {
      if (!elements.recordWorkbench.hidden) {
        elements.recordModuleStatus.hidden = true;
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(updateStatus);
    observer.observe(elements.recordWorkbench, { attributes: true, attributeFilter: ["hidden"] });
    updateStatus();
  }

  function loadRecordModule() {
    if (recordModuleLoadPromise) return recordModuleLoadPromise;
    if (elements.recordModuleStatus) {
      elements.recordModuleStatus.hidden = false;
      elements.recordModuleStatus.textContent = "Chargement du module Records / MPF…";
      elements.recordModuleStatus.dataset.tone = "loading";
    }
    recordModuleLoadPromise = (async () => {
      if (!global.firebase?.firestore) {
        await loadScriptOnce(
          "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js",
          "adminRecordFirestoreScript"
        );
      }
      const scripts = [
        ["performances/public/data/records-data.js?v=records-firestore-20260629060432", "adminRecordDataScript"],
        ["performances/public/record-placeholders.js?v=20260613-mpf-relays-mixed-1", "adminRecordPlaceholdersScript"],
        ["performances/public/data/admin-reference.js?v=20260601-performance-admin-page-1", "adminRecordReferenceScript"],
        ["performances/public/store.js?v=20260613-birth-year-restore-1", "adminRecordStoreScript"],
        ["performances/public/admin-records.js?v=20260721-default-filters-1", "adminRecordModuleScript"]
      ];
      for (const [src, id] of scripts) await loadScriptOnce(src, id);
      watchRecordWorkbench();
    })().catch((error) => {
      recordModuleLoadPromise = null;
      if (elements.recordModuleStatus) {
        elements.recordModuleStatus.hidden = false;
        elements.recordModuleStatus.textContent = `Module Records / MPF indisponible : ${error?.message || error}`;
        elements.recordModuleStatus.dataset.tone = "error";
      }
      return null;
    });
    return recordModuleLoadPromise;
  }

  function watchImportWorkbench() {
    const pairs = [
      [elements.importWorkbench, elements.importModuleStatus],
      [elements.correctionWorkbench, elements.correctionModuleStatus]
    ];
    pairs.forEach(([workbench, status]) => {
      if (!workbench || !status) return;
      const updateStatus = () => {
        if (!workbench.hidden) {
          status.hidden = true;
          observer.disconnect();
        }
      };
      const observer = new MutationObserver(updateStatus);
      observer.observe(workbench, { attributes: true, attributeFilter: ["hidden"] });
      updateStatus();
    });
  }

  function loadImportModule() {
    if (importModuleLoadPromise) return importModuleLoadPromise;
    if (elements.importModuleStatus) {
      elements.importModuleStatus.hidden = false;
      elements.importModuleStatus.textContent = "Chargement du module d’import…";
      elements.importModuleStatus.dataset.tone = "loading";
    }
    if (elements.correctionModuleStatus) {
      elements.correctionModuleStatus.hidden = false;
      elements.correctionModuleStatus.textContent = "Chargement du module de correction…";
      elements.correctionModuleStatus.dataset.tone = "loading";
    }
    importModuleLoadPromise = (async () => {
      const scripts = [
        ["performances/public/data/intranap-summary.js?v=consolidated-20260603140205", "adminImportSummaryScript"],
        ["performances/public/data/performance-public/version.js", "adminImportVersionScript"],
        ["performances/public/vendor/xlsx.full.min.js?v=20260603-international-xlsx-1", "adminImportXlsxScript"],
        ["performances/public/import-competitions.js?v=20260727-portal-name-1", "adminImportModuleScript"]
      ];
      for (const [src, id] of scripts) await loadScriptOnce(src, id);
      watchImportWorkbench();
    })().catch((error) => {
      importModuleLoadPromise = null;
      if (elements.importModuleStatus) {
        elements.importModuleStatus.hidden = false;
        elements.importModuleStatus.textContent = `Module d’import indisponible : ${error?.message || error}`;
        elements.importModuleStatus.dataset.tone = "error";
      }
      if (elements.correctionModuleStatus) {
        elements.correctionModuleStatus.hidden = false;
        elements.correctionModuleStatus.textContent = `Module de correction indisponible : ${error?.message || error}`;
        elements.correctionModuleStatus.dataset.tone = "error";
      }
      return null;
    });
    return importModuleLoadPromise;
  }

  function capabilityLabel(capability) {
    return {
      "admin.full": "Gestion generale",
      "records.manage": "Records / MPF",
      "consoles.access": "Accès aux consoles",
      "consoles.manage": "Consoles compétition",
      "competitions.import": "Import des compétitions",
      "dtn.view": "Espace DTN"
    }[capability] || capability;
  }

  function renderCurrentUser(user = {}) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Profil LivePalmes";
    if (elements.sessionLabel) elements.sessionLabel.textContent = name;
    if (elements.accountEmail && document.activeElement !== elements.accountEmail) {
      elements.accountEmail.value = user.email || ensureAdminAuth()?.status?.().email || "";
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
    if (elements.accountControl) elements.accountControl.hidden = !signedIn;
    if (elements.sessionLabel) elements.sessionLabel.textContent = "Profil LivePalmes";
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
      closeAccountMenu();
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

  async function updateAccountEmail(event) {
    event?.preventDefault?.();
    const nextEmail = String(elements.accountEmail?.value || "").trim().toLowerCase();
    const currentPassword = elements.accountEmailPassword?.value || "";
    const currentEmail = String(global.firebase?.auth?.().currentUser?.email || "").trim().toLowerCase();
    if (!nextEmail || !currentPassword) return;
    if (nextEmail === currentEmail) {
      setAccountMessage(elements.accountEmailMessage, "Cette adresse est déjà celle de votre compte.");
      return;
    }
    const button = elements.accountEmailForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setAccountMessage(elements.accountEmailMessage, "Mise à jour en cours…", "loading");
    try {
      const user = await reauthenticateCurrentUser(currentPassword);
      await callFunction("updateCurrentAccountEmail", { email: nextEmail });
      await user.reload?.();
      await user.getIdToken?.(true);
      let verificationSent = false;
      try {
        await user.sendEmailVerification?.();
        verificationSent = true;
      } catch (error) {
        console.warn("Envoi de la vérification email impossible", error);
      }
      elements.accountEmailPassword.value = "";
      renderCurrentUser({ ...(ensureAdminAuth()?.status?.().profile || {}), email: nextEmail });
      await loadCurrentUser();
      setAccountMessage(
        elements.accountEmailMessage,
        verificationSent
          ? "Adresse mise à jour. Un email de vérification vient de vous être envoyé."
          : "Adresse mise à jour.",
        "ok"
      );
    } catch (error) {
      setAccountMessage(elements.accountEmailMessage, `Modification impossible : ${firebaseAccountError(error)}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function updateAccountPassword(event) {
    event?.preventDefault?.();
    const currentPassword = elements.accountCurrentPassword?.value || "";
    const nextPassword = elements.accountNewPassword?.value || "";
    const confirmation = elements.accountConfirmPassword?.value || "";
    if (nextPassword.length < 8) {
      setAccountMessage(elements.accountPasswordMessage, "Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (nextPassword !== confirmation) {
      setAccountMessage(elements.accountPasswordMessage, "La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    if (currentPassword === nextPassword) {
      setAccountMessage(elements.accountPasswordMessage, "Le nouveau mot de passe doit être différent de l’ancien.");
      return;
    }
    const button = elements.accountPasswordForm?.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setAccountMessage(elements.accountPasswordMessage, "Mise à jour en cours…", "loading");
    try {
      const user = await reauthenticateCurrentUser(currentPassword);
      await user.updatePassword(nextPassword);
      await user.getIdToken?.(true);
      elements.accountPasswordForm.reset();
      setAccountMessage(elements.accountPasswordMessage, "Mot de passe modifié.", "ok");
    } catch (error) {
      setAccountMessage(elements.accountPasswordMessage, `Modification impossible : ${firebaseAccountError(error)}`);
    } finally {
      if (button) button.disabled = false;
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
    elements.accountToggle?.addEventListener("click", () => {
      const open = elements.accountToggle.getAttribute("aria-expanded") !== "true";
      elements.accountToggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (elements.accountActions) elements.accountActions.hidden = !open;
    });
    elements.accountActions?.addEventListener("click", closeAccountMenu);
    document.addEventListener("click", (event) => {
      if (!elements.accountControl?.contains(event.target)) closeAccountMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAccountMenu();
    });
    elements.navToggle?.addEventListener("click", () => {
      const open = elements.navToggle.getAttribute("aria-expanded") !== "true";
      elements.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.querySelector(".admin-portal-sidebar")?.classList.toggle("is-open", open);
    });
    elements.performanceToggle?.addEventListener("click", () => {
      setPerformanceMenuOpen(elements.performanceToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.dtnToggle?.addEventListener("click", () => {
      setDtnMenuOpen(elements.dtnToggle.getAttribute("aria-expanded") !== "true");
    });
    elements.navigation?.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      elements.navToggle?.setAttribute("aria-expanded", "false");
      document.querySelector(".admin-portal-sidebar")?.classList.remove("is-open");
    });
    elements.accountEmailForm?.addEventListener("submit", updateAccountEmail);
    elements.accountPasswordForm?.addEventListener("submit", updateAccountPassword);
    elements.accessForm?.addEventListener("submit", saveAccessUser);
    elements.accessRefresh?.addEventListener("click", loadAccessUsers);
    elements.cancelEdit?.addEventListener("click", resetAccessForm);
    global.addEventListener("hashchange", updateNavigationView);
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
