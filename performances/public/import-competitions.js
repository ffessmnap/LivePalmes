(function attachCompetitionImportAdmin(global) {
  const elements = {
    loginPanel: document.querySelector("#importLoginPanel"),
    loginForm: document.querySelector("#importLoginForm"),
    loginEmail: document.querySelector("#importLoginEmail"),
    loginPassword: document.querySelector("#importLoginPassword"),
    loginMessage: document.querySelector("#importLoginMessage"),
    workbench: document.querySelector("#importWorkbench"),
    sessionLabel: document.querySelector("#importSessionLabel"),
    signOut: document.querySelector("#importSignOutButton"),
    form: document.querySelector("#competitionImportForm"),
    file: document.querySelector("#competitionImportFile"),
    encoding: document.querySelector("#competitionImportEncoding"),
    encodingLabel: document.querySelector("label:has(#competitionImportEncoding)"),
    message: document.querySelector("#competitionImportMessage"),
    preview: document.querySelector("#competitionImportPreview"),
    summary: document.querySelector("#competitionImportSummary"),
    warnings: document.querySelector("#competitionImportWarnings"),
    sample: document.querySelector("#competitionImportSample"),
    validate: document.querySelector("#competitionImportValidateButton"),
    importsList: document.querySelector("#competitionImportsList"),
    importsRefresh: document.querySelector("#competitionImportsRefreshButton")
  };

  let adminAuth = null;
  let currentFile = null;
  let currentRawText = "";
  let currentPayload = null;
  let currentPreview = null;

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
      authConfig: global.LivePalmesAppConfig?.adminAuth || {},
      requiredCapability: "competitions.import"
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

  function setMessage(target, message, tone = "error") {
    if (!target) return;
    target.textContent = message || "";
    target.dataset.tone = tone;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "-");
  }

  function importTitle(item = {}) {
    const metadata = item.metadata || {};
    return [metadata.competitionName, metadata.location, formatDate(metadata.date)].filter(Boolean).join(" - ") || item.fileName || item.importId;
  }

  function updateView(status = {}) {
    const signedIn = Boolean(status.signedIn);
    document.body.dataset.adminAuth = signedIn ? "unlocked" : "locked";
    if (elements.loginPanel) elements.loginPanel.hidden = signedIn;
    if (elements.workbench) elements.workbench.hidden = !signedIn;
    if (signedIn && elements.loginForm) elements.loginForm.reset();
    const profile = status.profile || {};
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || status.email || "Profil LivePalmes";
    if (elements.sessionLabel) elements.sessionLabel.textContent = name;
    if (signedIn) loadImports();
    if (!status.available) {
      setMessage(elements.loginMessage, "Firebase Authentication n'est pas disponible.");
    } else if (!signedIn) {
      setMessage(elements.loginMessage, "");
    }
  }

  async function signIn(event) {
    event?.preventDefault?.();
    const auth = ensureAdminAuth();
    if (!auth) {
      setMessage(elements.loginMessage, "Connexion Firebase indisponible.");
      return;
    }
    setMessage(elements.loginMessage, "");
    try {
      await auth.signIn(elements.loginEmail?.value, elements.loginPassword?.value);
    } catch (error) {
      setMessage(elements.loginMessage, `Connexion impossible : ${error?.message || error}`);
    }
  }

  async function signOut() {
    await ensureAdminAuth()?.signOut?.();
  }

  async function readSelectedFile(file, encoding) {
    const buffer = await file.arrayBuffer();
    try {
      return new TextDecoder(encoding || "utf-8").decode(buffer);
    } catch {
      return new TextDecoder("utf-8").decode(buffer);
    }
  }

  function isExcelFile(file) {
    const name = String(file?.name || "").toLowerCase();
    return name.endsWith(".xlsx");
  }

  function workbookSheetRows(workbook, sheetName) {
    const sheet = workbook?.Sheets?.[sheetName];
    if (!sheet) throw new Error(`Onglet ${sheetName} introuvable dans la trame Excel.`);
    return global.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
      dateNF: "dd-mm-yyyy"
    });
  }

  async function readInternationalWorkbook(file) {
    if (!global.XLSX?.read) {
      throw new Error("Lecteur Excel indisponible. Recharge la page puis reessaie.");
    }
    const buffer = await file.arrayBuffer();
    const workbook = global.XLSX.read(buffer, {
      type: "array",
      cellDates: false,
      cellNF: false,
      cellText: true,
      dateNF: "dd-mm-yyyy"
    });
    return {
      Competition: workbookSheetRows(workbook, "Competition"),
      Performances: workbookSheetRows(workbook, "Performances")
    };
  }

  async function buildPreviewPayload(file) {
    if (isExcelFile(file)) {
      return {
        sourceType: "international-xlsx",
        fileName: file.name,
        workbook: {
          sheets: await readInternationalWorkbook(file)
        }
      };
    }
    const rawText = await readSelectedFile(file, elements.encoding?.value);
    return {
      sourceType: "ffessm-txt",
      fileName: file.name,
      rawText
    };
  }

  function sourceTypeLabel(value) {
    if (value === "international-xlsx") return "Excel international";
    if (value === "ffessm-txt") return "TXT federal";
    return value || "-";
  }

  function updateFileMode() {
    const file = elements.file?.files?.[0];
    const excel = isExcelFile(file);
    if (elements.encoding) elements.encoding.disabled = excel;
    if (elements.encodingLabel) elements.encodingLabel.dataset.disabled = excel ? "true" : "false";
  }

  function renderPreview(result) {
    currentPreview = result;
    const metadata = result.metadata || {};
    const summary = result.summary || {};
    elements.preview.hidden = false;
    elements.summary.innerHTML = `
      <div><span>Competition</span><strong>${escapeHtml(metadata.competitionName || "-")}</strong></div>
      <div><span>Date</span><strong>${escapeHtml(formatDate(metadata.date))}</strong></div>
      <div><span>Lieu</span><strong>${escapeHtml(metadata.location || "-")}</strong></div>
      <div><span>Bassin</span><strong>${escapeHtml(metadata.poolSize || "-")} m</strong></div>
      <div><span>Performances</span><strong>${escapeHtml(summary.importedPerformances || 0)}</strong></div>
      <div><span>Avec passage</span><strong>${escapeHtml(summary.performancesWithIntermediateTimes || 0)}</strong></div>
      <div><span>Perfs avec passage</span><strong>${escapeHtml(summary.intermediatePerformances || 0)}</strong></div>
      <div><span>Lignes ignorees</span><strong>${escapeHtml(summary.ignoredRows || 0)}</strong></div>
      <div><span>Clubs</span><strong>${escapeHtml(summary.clubs || 0)}</strong></div>
      <div><span>Format</span><strong>${escapeHtml(sourceTypeLabel(result.sourceType))}</strong></div>
      <div><span>Import</span><strong>${result.alreadyImported ? "Deja stocke" : "Nouveau"}</strong></div>
    `;
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    const duplicateDetails = Array.isArray(result.duplicateDetails) ? result.duplicateDetails : [];
    const duplicateHtml = duplicateDetails.length ? `
      <div class="import-duplicates">
        <strong>Doublons possibles detectes</strong>
        ${duplicateDetails.map((group) => `
          <article>
            <div>
              <span>${escapeHtml(group.swimmer || "-")}</span>
              <small>${escapeHtml([group.course, group.time, group.club].filter(Boolean).join(" - "))}</small>
            </div>
            <div>
              <span>Lignes ${escapeHtml((group.lines || []).join(", "))}</span>
              <small>${escapeHtml((group.entries || []).map((entry) => `ligne ${entry.sourceLine}: place ${entry.rank || "-"}, ordre ${entry.order || "-"}`).join(" / "))}</small>
            </div>
          </article>
        `).join("")}
      </div>
    ` : "";
    elements.warnings.innerHTML = warnings.length
      ? warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("") + duplicateHtml
      : `<p class="ok">Aucune alerte detectee.</p>`;
    const rows = Array.isArray(result.samplePerformances) ? result.samplePerformances : [];
    elements.sample.innerHTML = rows.length ? rows.map((perf) => `
      <tr>
        <td>${escapeHtml([perf.firstName, perf.lastName].filter(Boolean).join(" "))}<small>${escapeHtml(perf.swimmerId || "")}</small></td>
        <td>${escapeHtml(perf.course || "-")}</td>
        <td class="time">${escapeHtml(perf.time || "-")}</td>
        <td>${escapeHtml((perf.intermediateTimes || []).map((split) => `${split.code} ${split.time}`).join(" · ") || "-")}</td>
        <td>${escapeHtml(perf.categoryCode || "-")}</td>
        <td>${escapeHtml(perf.club || "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="6">Aucune performance a afficher.</td></tr>`;
    elements.validate.disabled = result.alreadyImported || !summary.importedPerformances;
  }

  async function previewImport(event) {
    event?.preventDefault?.();
    const file = elements.file?.files?.[0];
    if (!file) {
      setMessage(elements.message, "Choisis un fichier TXT ou XLSX.");
      return;
    }
    currentFile = file;
    setMessage(elements.message, "Analyse du fichier en cours...", "ok");
    elements.preview.hidden = true;
    try {
      currentPayload = await buildPreviewPayload(file);
      currentRawText = currentPayload.rawText || "";
      const result = await callFunction("previewCompetitionImport", currentPayload);
      renderPreview(result);
      setMessage(elements.message, `Previsualisation prete : ${result.summary?.importedPerformances || 0} performances importables.`, "ok");
    } catch (error) {
      currentPreview = null;
      currentPayload = null;
      setMessage(elements.message, `Analyse impossible : ${error?.message || error}`);
    }
  }

  async function validateImport() {
    if (!currentPreview || !currentPayload || !currentFile) {
      setMessage(elements.message, "Previsualise le fichier avant de valider.");
      return;
    }
    if (!global.confirm("Confirmer l'ajout de cette competition dans la base additionnelle LivePalmes ?")) return;
    elements.validate.disabled = true;
    setMessage(elements.message, "Import en cours...", "ok");
    try {
      const result = await callFunction("createCompetitionImport", {
        ...currentPayload,
        fileName: currentFile.name,
        importId: currentPreview.importId
      });
      setMessage(elements.message, `Import stocke : ${result.summary?.importedPerformances || 0} performances.`, "ok");
      await loadImports();
      elements.validate.disabled = true;
    } catch (error) {
      elements.validate.disabled = false;
      setMessage(elements.message, `Import impossible : ${error?.message || error}`);
    }
  }

  function renderImports(items = []) {
    if (!elements.importsList) return;
    if (!items.length) {
      elements.importsList.innerHTML = `<p class="admin-access-empty">Aucun import stocke pour le moment.</p>`;
      return;
    }
    elements.importsList.innerHTML = items.map((item) => {
      const summary = item.summary || {};
      const warnings = Array.isArray(item.warnings) ? item.warnings.length : 0;
      const duplicateCount = Array.isArray(item.duplicateDetails) ? item.duplicateDetails.length : 0;
      return `
        <article class="competition-import-row">
          <div>
            <span>${escapeHtml([item.status || "stocke", sourceTypeLabel(item.sourceType)].filter(Boolean).join(" - "))}</span>
            <strong>${escapeHtml(importTitle(item))}</strong>
            <small>${escapeHtml(item.fileName || item.importId)}</small>
            <small>${escapeHtml(summary.importedPerformances || 0)} performances - ${escapeHtml(summary.clubs || 0)} clubs - ${escapeHtml(warnings)} alerte(s) - ${escapeHtml(duplicateCount)} groupe(s) doublon</small>
          </div>
          <div>
            <small>${escapeHtml(item.importedByEmail || "")}</small>
            <small>${escapeHtml(item.importedAt ? new Date(item.importedAt).toLocaleString("fr-FR") : "")}</small>
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadImports() {
    if (!ensureAdminAuth()?.isAdminAuthenticated?.()) return;
    try {
      const result = await callFunction("listCompetitionImports", {});
      renderImports(Array.isArray(result.imports) ? result.imports : []);
    } catch (error) {
      if (elements.importsList) {
        elements.importsList.innerHTML = `<p class="admin-access-empty">Lecture des imports impossible : ${escapeHtml(error?.message || error)}</p>`;
      }
    }
  }

  function init() {
    const auth = ensureAdminAuth();
    updateView(auth?.status?.() || {});
    elements.loginForm?.addEventListener("submit", signIn);
    elements.signOut?.addEventListener("click", signOut);
    elements.file?.addEventListener("change", updateFileMode);
    elements.form?.addEventListener("submit", previewImport);
    elements.validate?.addEventListener("click", validateImport);
    elements.importsRefresh?.addEventListener("click", loadImports);
    updateFileMode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
