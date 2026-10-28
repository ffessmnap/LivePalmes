(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
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
        script.addEventListener("error", () => {
          script.livePalmesLoadPromise = null;
          script.remove();
          reject(new Error(`Chargement impossible : ${src}`));
        }, { once: true });
        });
        if (!existing) document.body.appendChild(script);
        return script.livePalmesLoadPromise;
      }

    function loadPortalClubCodeReference() {
        if (portalState.portalClubCodeReferenceById.size) return Promise.resolve(portalState.portalClubCodeReferenceById);
        if (portalState.portalClubCodeReferenceLoadPromise) return portalState.portalClubCodeReferenceLoadPromise;
        portalState.portalClubCodeReferenceLoadPromise = loadScriptOnce(
          "performances/public/data/club-reference.js?v=20260813-national-clubs-3",
          "adminAccessReferenceScript"
        ).then(() => {
          const clubs = (global.LIVEPALMES_CLUB_REFERENCE?.clubs || [])
            .map(normalizeAccessClubReference)
            .filter((club) => club.clubId && club.clubCode);
          portalState.portalClubCodeReferenceById = new Map(clubs.map((club) => [club.clubId, club]));
          if (portalState.currentAccessProfile) portalActions.renderPortalScopeContext(portalState.currentAccessProfile);
          return portalState.portalClubCodeReferenceById;
        }).catch(() => {
          portalState.portalClubCodeReferenceLoadPromise = null;
          return portalState.portalClubCodeReferenceById;
        });
        return portalState.portalClubCodeReferenceLoadPromise;
      }

    function watchRecordWorkbench() {
        if (!portalContext.elements.recordWorkbench || !portalContext.elements.recordModuleStatus) return;
        const updateStatus = () => {
          if (!portalContext.elements.recordWorkbench.hidden) {
            portalContext.elements.recordModuleStatus.hidden = true;
            observer.disconnect();
          }
        };
        const observer = new MutationObserver(updateStatus);
        observer.observe(portalContext.elements.recordWorkbench, { attributes: true, attributeFilter: ["hidden"] });
        updateStatus();
      }

    function loadDtnModule() {
        if (portalState.dtnModuleLoadPromise) return portalState.dtnModuleLoadPromise;
        portalState.dtnModuleLoadPromise = loadScriptOnce(
          "assets/livepalmes-dtn-seasons.js?v=20261020-lecture-groupee",
          "livepalmes-dtn-qualifications-script"
        ).then(() => global.LivePalmesDtnQualifications?.init?.()).catch((error) => {
          portalState.dtnModuleLoadPromise = null;
          console.error("Chargement du module DTN impossible", error);
        });
        return portalState.dtnModuleLoadPromise;
      }

    function loadRecordModule() {
        if (portalState.recordModuleLoadPromise) return portalState.recordModuleLoadPromise;
        if (portalContext.elements.recordModuleStatus) {
          portalContext.elements.recordModuleStatus.hidden = false;
          portalContext.elements.recordModuleStatus.textContent = "Chargement du module Records / MPF…";
          portalContext.elements.recordModuleStatus.dataset.tone = "loading";
        }
        portalState.recordModuleLoadPromise = (async () => {
          if (!global.firebase?.firestore) {
            await loadScriptOnce(
              "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js",
              "adminRecordFirestoreScript"
            );
          }
          const scripts = [
            ["performances/public/record-placeholders.js?v=20260613-mpf-relays-mixed-1", "adminRecordPlaceholdersScript"],
            ["performances/public/data/club-reference.js?v=20260813-national-clubs-3", "adminRecordReferenceScript"],
            ["performances/public/store.js?v=20261012-records-cleanup-2", "adminRecordStoreScript"]
          ];
          await Promise.all(scripts.map(([src, id]) => loadScriptOnce(src, id)));
          await loadScriptOnce("performances/public/admin-records.js?v=20261015-nap-suggestions-1", "adminRecordModuleScript");
          watchRecordWorkbench();
        })().catch((error) => {
          portalState.recordModuleLoadPromise = null;
          if (portalContext.elements.recordModuleStatus) {
            portalContext.elements.recordModuleStatus.hidden = false;
            portalContext.elements.recordModuleStatus.textContent = `Module Records / MPF indisponible : ${error?.message || error}`;
            portalContext.elements.recordModuleStatus.dataset.tone = "error";
          }
          return null;
        });
        return portalState.recordModuleLoadPromise;
      }

    function watchImportWorkbench() {
        const pairs = [
          [portalContext.elements.importWorkbench, portalContext.elements.importModuleStatus],
          [portalContext.elements.correctionWorkbench, portalContext.elements.correctionModuleStatus]
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

    function loadImportSpreadsheet() {
        if (!portalState.importSpreadsheetLoadPromise) {
          portalState.importSpreadsheetLoadPromise = loadScriptOnce(
            "performances/public/vendor/xlsx.full.min.js?v=20260603-international-xlsx-1",
            "adminImportXlsxScript"
          ).catch((error) => {
            portalState.importSpreadsheetLoadPromise = null;
            throw error;
          });
        }
        return portalState.importSpreadsheetLoadPromise;
      }

    function loadImportModule({ includeSpreadsheet = false } = {}) {
        if (portalState.importModuleLoadPromise) {
          return includeSpreadsheet
            ? Promise.all([portalState.importModuleLoadPromise, loadImportSpreadsheet()]).then(() => undefined)
            : portalState.importModuleLoadPromise;
        }
        if (portalContext.elements.importModuleStatus) {
          portalContext.elements.importModuleStatus.hidden = false;
          portalContext.elements.importModuleStatus.textContent = "Chargement du module d’import…";
          portalContext.elements.importModuleStatus.dataset.tone = "loading";
        }
        if (portalContext.elements.correctionModuleStatus) {
          portalContext.elements.correctionModuleStatus.hidden = false;
          portalContext.elements.correctionModuleStatus.textContent = "Chargement du module de correction…";
          portalContext.elements.correctionModuleStatus.dataset.tone = "loading";
        }
        portalState.importModuleLoadPromise = (async () => {
          const scripts = global.LivePalmesEnvironment?.sportingDataSource === "nap" ? [] : [
            ["performances/public/data/intranap-summary.js?v=consolidated-20260603140205", "adminImportSummaryScript"],
            ["performances/public/data/performance-public/version.js", "adminImportVersionScript"]
          ];
          await Promise.all(scripts.map(([src, id]) => loadScriptOnce(src, id)));
          await loadScriptOnce("performances/public/winpalme-zip.js?v=20261026-import-text-1", "adminImportZipScript");
          await loadScriptOnce("performances/public/import-confirmation-message.js?v=20261025-import-courses-1", "adminImportConfirmationScript");
          await loadScriptOnce("performances/public/import-swimmer-creation.js?v=20261025-import-creation-1", "adminImportSwimmerCreationScript");
          await loadScriptOnce("performances/public/import-swimmer-review.js?v=20261026-import-relay-alerts-1", "adminImportReviewScript");
          await loadScriptOnce("performances/public/import-competitions.js?v=20261026-import-relay-alerts-1", "adminImportModuleScript");
          if (includeSpreadsheet) await loadImportSpreadsheet();
          watchImportWorkbench();
        })().catch((error) => {
          portalState.importModuleLoadPromise = null;
          if (portalContext.elements.importModuleStatus) {
            portalContext.elements.importModuleStatus.hidden = false;
            portalContext.elements.importModuleStatus.textContent = `Module d’import indisponible : ${error?.message || error}`;
            portalContext.elements.importModuleStatus.dataset.tone = "error";
          }
          if (portalContext.elements.correctionModuleStatus) {
            portalContext.elements.correctionModuleStatus.hidden = false;
            portalContext.elements.correctionModuleStatus.textContent = `Module de correction indisponible : ${error?.message || error}`;
            portalContext.elements.correctionModuleStatus.dataset.tone = "error";
          }
          return null;
        });
        return portalState.importModuleLoadPromise;
      }

    function capabilityLabel(capability) {
        return {
          "admin.full": "Gestion generale",
          "records.manage": "Records / MPF",
          "consoles.access": "Accès aux consoles",
          "consoles.manage": "Consoles compétition",
          "competitions.import": "Import des compétitions",
          "dtn.view": "Espace DTN",
          "dtn.manage": "Gérer les paramètres DTN",
          "engagements.club.manage": "Engagements club",
          "engagements.club.switch": "Changement de club national",
          "engagements.region.manage": "Engagements région",
          "engagements.national.manage": "Engagements national"
        }[capability] || capability;
      }

    function normalizedRegionKey(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/gi, "")
          .toLocaleLowerCase("fr");
      }

    function canonicalLivePalmesRegion(value) {
        const cleanValue = String(value || "").trim();
        const referenceLabel = portalConfig.LIVEPALMES_REFERENCE_REGION_LABELS[cleanValue] || cleanValue;
        const key = normalizedRegionKey(referenceLabel);
        if (!key) return "";
        return portalConfig.LIVEPALMES_REGION_DEFINITIONS.find((region) => normalizedRegionKey(region) === key) || referenceLabel;
      }

    function sameLivePalmesRegion(left, right) {
        const leftKey = normalizedRegionKey(canonicalLivePalmesRegion(left));
        return Boolean(leftKey && leftKey === normalizedRegionKey(canonicalLivePalmesRegion(right)));
      }

    function regionDisplayLabel(value) {
        return canonicalLivePalmesRegion(value) || "-";
      }

    function setRegionSelectValue(select, value) {
        if (!select) return;
        const nextValue = canonicalLivePalmesRegion(value);
        if (nextValue && !Array.from(select.options).some((option) => option.value === nextValue)) {
          select.append(new Option(`${nextValue} (ancienne valeur)`, nextValue));
        }
        select.value = nextValue;
      }

    function fillLivePalmesRegionSelect(select, placeholder = "À choisir") {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = "";
        select.append(new Option(placeholder, ""));
        portalConfig.LIVEPALMES_REGION_DEFINITIONS.forEach((region) => {
          select.append(new Option(region, region));
        });
        setRegionSelectValue(select, currentValue);
      }

    function selectedRegionMultiSelectValues(select) {
        if (!select) return [];
        const seen = new Set();
        return Array.from(select.selectedOptions || [])
          .map((option) => canonicalLivePalmesRegion(option.value))
          .filter(Boolean)
          .filter((region) => {
            const key = normalizedRegionKey(region);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
      }

    function setRegionMultiSelectValues(select, values = [], excludedRegion = "") {
        if (!select) return;
        const selectedKeys = new Set((Array.isArray(values) ? values : [])
          .map(canonicalLivePalmesRegion)
          .filter(Boolean)
          .filter((region) => normalizedRegionKey(region) !== normalizedRegionKey(excludedRegion))
          .map(normalizedRegionKey));
        Array.from(select.options).forEach((option) => {
          option.selected = selectedKeys.has(normalizedRegionKey(option.value));
        });
      }

    function updateInvitedRegionWarning(select) {
        const warning = select.closest("[data-engagements-conditional-region]")?.querySelector("[data-engagements-all-regions-warning]");
        const available = Array.from(select.options).filter((option) => option.value && !option.disabled);
        if (warning) warning.hidden = select.disabled || !available.length || !available.every((option) => option.selected);
      }

    function renderInvitedRegionChoices(select, container) {
        if (!select || !container) return;
        const primaryRegion = select === portalContext.elements.engagementsEditInvitedRegionIds
          ? portalContext.elements.engagementsEditRegionId?.value : portalContext.elements.engagementsRegionId?.value;
        const isPrimary = (option) => Boolean(primaryRegion) && normalizedRegionKey(option.value) === normalizedRegionKey(primaryRegion);
        container.innerHTML = Array.from(select.options).map((option) => {
          const primary = isPrimary(option);
          return `<label><input type="checkbox" value="${portalActions.escapeHtml(option.value)}" ${option.selected || primary ? "checked" : ""} ${option.disabled || primary ? "disabled" : ""}><span>${portalActions.escapeHtml(option.textContent)}${primary ? " (région organisatrice)" : ""}</span></label>`;
        }).join("");
        container.hidden = select.disabled;
        updateInvitedRegionWarning(select);
        if (select === portalContext.elements.engagementsInvitedRegionIds && portalContext.elements.engagementsInvitedRegionSummary) {
          const selected = selectedRegionMultiSelectValues(select).map(regionDisplayLabel);
          portalContext.elements.engagementsInvitedRegionSummary.textContent = selected.length
            ? selected.join(", ")
            : "Aucune région invitée";
        }
      }

    function fillLivePalmesRegionMultiSelect(select) {
        if (!select) return;
        const currentValues = selectedRegionMultiSelectValues(select);
        select.innerHTML = "";
        portalConfig.LIVEPALMES_REGION_DEFINITIONS.forEach((region) => {
          select.append(new Option(region, region));
        });
        setRegionMultiSelectValues(select, currentValues);
      }

    function populateLivePalmesRegionSelects() {
        fillLivePalmesRegionSelect(portalContext.elements.accessRegionId, "À choisir");
        fillLivePalmesRegionSelect(portalContext.elements.publicAccessRequestRegionId, "À choisir");
        fillLivePalmesRegionSelect(portalContext.elements.engagementsRegionId, "À choisir");
        fillLivePalmesRegionSelect(portalContext.elements.engagementsEditRegionId, "À choisir");
        fillLivePalmesRegionSelect(portalContext.elements.engagementsRegionFilter, portalActions.isEngagementAdminMode() ? "Toutes les régions" : "Toutes");
        fillLivePalmesRegionMultiSelect(portalContext.elements.engagementsInvitedRegionIds);
        fillLivePalmesRegionMultiSelect(portalContext.elements.engagementsEditInvitedRegionIds);
        renderInvitedRegionChoices(portalContext.elements.engagementsInvitedRegionIds, portalContext.elements.engagementsInvitedRegionChoices);
        renderInvitedRegionChoices(portalContext.elements.engagementsEditInvitedRegionIds, portalContext.elements.engagementsEditInvitedRegionChoices);
      }

    function accessReferenceRegionLabel(regionId) {
        const value = String(regionId || "").trim();
        if (!value) return "";
        const namedRegion = portalConfig.LIVEPALMES_REGION_DEFINITIONS.find((region) => normalizedRegionKey(region) === normalizedRegionKey(value));
        if (namedRegion) return namedRegion;
        return portalConfig.LIVEPALMES_REFERENCE_REGION_LABELS[value] || `Autre / code ${value}`;
      }

    function normalizeAccessClubReference(row = []) {
        if (row && !Array.isArray(row) && typeof row === "object") {
          const referenceRegionId = String(row.referenceRegionId || row.regionId || "").trim();
          return {
            ...row,
            clubId: String(row.clubId || row.id || "").trim(),
            clubCode: String(row.clubCode || "").trim(),
            clubName: String(row.clubName || "").trim(),
            federalNumber: String(row.federalNumber || "").trim(),
            referenceRegionId,
            regionId: accessReferenceRegionLabel(referenceRegionId)
          };
        }
        const clubId = String(row[0] || "").trim();
        const clubCode = String(row[1] || "").trim();
        const clubName = String(row[2] || "").trim();
        const referenceRegionId = String(row[3] || "").trim();
        return {
          clubId,
          clubCode,
          clubName,
          federalNumber: String(row[4] || "").trim(),
          referenceRegionId,
          regionId: accessReferenceRegionLabel(referenceRegionId),
          city: String(row[5] || "").trim(),
          postalCode: String(row[6] || "").trim(),
          active: row[7] !== false
        };
      }

    function accessClubLabel(club) {
        if (!club) return "";
        const name = club.clubName || "Club sans nom";
        return club.clubCode ? `${club.clubCode} — ${name}` : name;
      }

    function accessClubFromId(clubId) {
        const cleanClubId = String(clubId || "").trim();
        return cleanClubId ? portalState.accessClubReferenceById.get(cleanClubId) || null : null;
      }

    function clubDisplayCode(club = {}, fallback = "Club non renseigné") {
        const data = club && typeof club === "object" ? club : { clubId: club };
        const reference = accessClubFromId(data.clubId) || portalState.portalClubCodeReferenceById.get(String(data.clubId || "").trim());
        return String(data.clubCode || reference?.clubCode || data.clubName || reference?.clubName || fallback).trim();
      }

    function clubDisplayLabel(club = {}, { includeName = true, fallback = "Club non renseigné" } = {}) {
        const data = club && typeof club === "object" ? club : { clubId: club };
        const reference = accessClubFromId(data.clubId) || portalState.portalClubCodeReferenceById.get(String(data.clubId || "").trim());
        const code = String(data.clubCode || reference?.clubCode || "").trim();
        const name = String(data.clubName || reference?.clubName || "").trim();
        if (includeName && code && name && portalActions.normalizedAccessSearch(code) !== portalActions.normalizedAccessSearch(name)) return `${code} — ${name}`;
        return code || name || fallback;
      }

    function populateAccessRegionChoices() {
        const selects = [portalContext.elements.accessRegionId, portalContext.elements.publicAccessRequestRegionId, portalContext.elements.engagementsAccessRequestEditRegionId].filter(Boolean);
        if (!selects.length) return;
        const knownRegions = new Set(portalConfig.LIVEPALMES_REGION_DEFINITIONS.map(normalizedRegionKey));
        const extraRegions = Array.from(new Set(portalState.accessClubReference.map((club) => club.regionId)))
          .filter((region) => region && !knownRegions.has(normalizedRegionKey(region)))
          .sort((a, b) => a.localeCompare(b, "fr"));
        selects.forEach((select) => {
          const currentValue = select.value;
          fillLivePalmesRegionSelect(select, "À choisir");
          extraRegions.forEach((region) => select.append(new Option(region, region)));
          setRegionSelectValue(select, currentValue);
        });
      }

    function syncAccessClubFieldsFromSelect() {
        const selectedClubId = portalContext.elements.accessClubSelect?.value || "";
        const club = portalState.accessClubReference.find((item) => item.clubId === selectedClubId);
        if (portalContext.elements.accessClubId) portalContext.elements.accessClubId.value = club?.clubId || "";
        if (portalContext.elements.accessClubName) portalContext.elements.accessClubName.value = club?.clubName || "";
      }

    function populateAccessClubSelect(selectedClubId = "", fallbackClubName = "") {
        const select = portalContext.elements.accessClubSelect;
        if (!select) return;
        const selectedId = String(selectedClubId || "").trim();
        const knownClub = selectedId
          ? portalState.accessClubReference.find((club) => club.clubId === selectedId)
          : null;
        if (knownClub && !portalContext.elements.accessRegionId?.value) {
          setRegionSelectValue(portalContext.elements.accessRegionId, knownClub.regionId);
        }
        const regionId = canonicalLivePalmesRegion(portalContext.elements.accessRegionId?.value || "");
        select.innerHTML = "";
        if (!regionId) {
          select.append(new Option("Choisissez d'abord une région", ""));
          select.disabled = true;
          syncAccessClubFieldsFromSelect();
          return;
        }
        const regionKey = normalizedRegionKey(regionId);
        const clubs = portalState.accessClubReference
          .filter((club) => club.active !== false && normalizedRegionKey(club.regionId) === regionKey)
          .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
        select.append(new Option("À choisir", ""));
        clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
        if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
          const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
          select.append(new Option(label, selectedId));
        }
        select.disabled = clubs.length === 0 && !selectedId;
        if (!clubs.length && !selectedId) {
          select.options[0].textContent = "Aucun club trouvé pour cette région";
        }
        select.value = selectedId;
        if (selectedId && !knownClub) {
          if (portalContext.elements.accessClubId) portalContext.elements.accessClubId.value = selectedId;
          if (portalContext.elements.accessClubName) portalContext.elements.accessClubName.value = fallbackClubName || "";
          return;
        }
        syncAccessClubFieldsFromSelect();
      }

    function syncPublicAccessRequestClubFieldsFromSelect() {
        const selectedClubId = portalContext.elements.publicAccessRequestClubSelect?.value || "";
        const club = portalState.accessClubReference.find((item) => item.clubId === selectedClubId);
        if (portalContext.elements.publicAccessRequestClubId) portalContext.elements.publicAccessRequestClubId.value = club?.clubId || "";
        if (portalContext.elements.publicAccessRequestClubName) portalContext.elements.publicAccessRequestClubName.value = club?.clubName || "";
      }

    function populatePublicAccessRequestClubSelect(selectedClubId = "", fallbackClubName = "") {
        const select = portalContext.elements.publicAccessRequestClubSelect;
        if (!select) return;
        const selectedId = String(selectedClubId || "").trim();
        const knownClub = selectedId
          ? portalState.accessClubReference.find((club) => club.clubId === selectedId)
          : null;
        if (knownClub && !portalContext.elements.publicAccessRequestRegionId?.value) {
          setRegionSelectValue(portalContext.elements.publicAccessRequestRegionId, knownClub.regionId);
        }
        const regionId = canonicalLivePalmesRegion(portalContext.elements.publicAccessRequestRegionId?.value || "");
        select.innerHTML = "";
        if (!regionId) {
          select.append(new Option("Choisissez d'abord une région", ""));
          select.disabled = true;
          syncPublicAccessRequestClubFieldsFromSelect();
          return;
        }
        const regionKey = normalizedRegionKey(regionId);
        const clubs = portalState.accessClubReference
          .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
          .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
        select.append(new Option("À choisir", ""));
        clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
        if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
          const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
          select.append(new Option(label, selectedId));
        }
        select.disabled = clubs.length === 0 && !selectedId;
        if (!clubs.length && !selectedId) {
          select.options[0].textContent = "Aucun club trouvé pour cette région";
        }
        select.value = selectedId;
        if (selectedId && !knownClub) {
          if (portalContext.elements.publicAccessRequestClubId) portalContext.elements.publicAccessRequestClubId.value = selectedId;
          if (portalContext.elements.publicAccessRequestClubName) portalContext.elements.publicAccessRequestClubName.value = fallbackClubName || "";
          return;
        }
        syncPublicAccessRequestClubFieldsFromSelect();
      }

    function normalizedClubFederalNumber(value = "") {
        return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      }

    function publicAccessRequestNewClubInputs() {
        return [
          portalContext.elements.publicAccessRequestNewClubName,
          portalContext.elements.publicAccessRequestNewClubCode,
          portalContext.elements.publicAccessRequestNewClubFederalNumber,
          portalContext.elements.publicAccessRequestNewClubCity,
          portalContext.elements.publicAccessRequestNewClubPostalCode
        ].filter(Boolean);
      }

    function updatePublicAccessRequestNewClubMode({ preserveMessage = false } = {}) {
        const newClub = portalContext.elements.publicAccessRequestNewClub?.checked === true;
        if (portalContext.elements.publicAccessRequestNewClubFields) portalContext.elements.publicAccessRequestNewClubFields.hidden = !newClub;
        publicAccessRequestNewClubInputs().forEach((input) => { input.required = newClub; });
        if (portalContext.elements.publicAccessRequestClubSelect) {
          portalContext.elements.publicAccessRequestClubSelect.required = !newClub;
          if (newClub) portalContext.elements.publicAccessRequestClubSelect.disabled = true;
          else populatePublicAccessRequestClubSelect(portalContext.elements.publicAccessRequestClubId?.value || "");
        }
        if (newClub) {
          if (portalContext.elements.publicAccessRequestClubId) portalContext.elements.publicAccessRequestClubId.value = "";
          if (portalContext.elements.publicAccessRequestClubName) portalContext.elements.publicAccessRequestClubName.value = "";
        }
        if (!preserveMessage && portalContext.elements.publicAccessRequestNewClubMatch) {
          portalContext.elements.publicAccessRequestNewClubMatch.textContent = "";
          delete portalContext.elements.publicAccessRequestNewClubMatch.dataset.tone;
        }
      }

    async function matchPublicAccessRequestClubByFederalNumber() {
        if (portalContext.elements.publicAccessRequestNewClub?.checked !== true) return null;
        let federalNumber = normalizedClubFederalNumber(portalContext.elements.publicAccessRequestNewClubFederalNumber?.value || "");
        if (!federalNumber) return null;
        if (!portalState.accessClubReference.length) {
          if (portalContext.elements.publicAccessRequestNewClubMatch) {
            portalContext.elements.publicAccessRequestNewClubMatch.textContent = "Vérification du numéro fédéral...";
            portalContext.elements.publicAccessRequestNewClubMatch.dataset.tone = "loading";
          }
          await loadAccessClubReference();
          if (portalContext.elements.publicAccessRequestNewClub?.checked !== true) return null;
          federalNumber = normalizedClubFederalNumber(portalContext.elements.publicAccessRequestNewClubFederalNumber?.value || "");
          if (!federalNumber) return null;
        }
        if (!portalState.accessClubReference.length) {
          if (portalContext.elements.publicAccessRequestNewClubMatch) {
            portalContext.elements.publicAccessRequestNewClubMatch.textContent = "Le référentiel des clubs est temporairement indisponible. Réessayez dans quelques instants.";
            portalContext.elements.publicAccessRequestNewClubMatch.dataset.tone = "error";
          }
          return null;
        }
        const club = portalState.accessClubReference.find((candidate) =>
          normalizedClubFederalNumber(candidate.federalNumber) === federalNumber
        );
        if (!club) {
          if (portalContext.elements.publicAccessRequestNewClubMatch) {
            portalContext.elements.publicAccessRequestNewClubMatch.textContent = "Aucun club existant ne porte ce numéro fédéral.";
            portalContext.elements.publicAccessRequestNewClubMatch.dataset.tone = "loading";
          }
          return null;
        }
        setRegionSelectValue(portalContext.elements.publicAccessRequestRegionId, club.regionId || "");
        if (portalContext.elements.publicAccessRequestNewClub) portalContext.elements.publicAccessRequestNewClub.checked = false;
        if (portalContext.elements.publicAccessRequestClubId) portalContext.elements.publicAccessRequestClubId.value = club.clubId || "";
        populatePublicAccessRequestClubSelect(club.clubId || "", club.clubName || "");
        updatePublicAccessRequestNewClubMode({ preserveMessage: true });
        if (portalContext.elements.publicAccessRequestNewClubMatch) {
          portalContext.elements.publicAccessRequestNewClubMatch.textContent = `Ce numéro correspond à ${accessClubLabel(club)}. Le club existant a été sélectionné.`;
          portalContext.elements.publicAccessRequestNewClubMatch.dataset.tone = "ok";
        }
        portalActions.setPublicAccessRequestMessage(`Club existant trouvé : ${accessClubLabel(club)}.`, "ok");
        return club;
      }

    function syncEngagementAccessRequestEditClubFieldsFromSelect() {
        const selectedClubId = portalContext.elements.engagementsAccessRequestEditClubSelect?.value || "";
        const club = portalState.accessClubReference.find((item) => item.clubId === selectedClubId);
        if (portalContext.elements.engagementsAccessRequestEditClubId) portalContext.elements.engagementsAccessRequestEditClubId.value = club?.clubId || "";
        if (portalContext.elements.engagementsAccessRequestEditClubName) portalContext.elements.engagementsAccessRequestEditClubName.value = club?.clubName || "";
      }

    function populateEngagementAccessRequestEditClubSelect(selectedClubId = "", fallbackClubName = "") {
        const select = portalContext.elements.engagementsAccessRequestEditClubSelect;
        if (!select) return;
        const selectedId = String(selectedClubId || "").trim();
        const knownClub = selectedId
          ? portalState.accessClubReference.find((club) => club.clubId === selectedId)
          : null;
        if (knownClub && !portalContext.elements.engagementsAccessRequestEditRegionId?.value) {
          setRegionSelectValue(portalContext.elements.engagementsAccessRequestEditRegionId, knownClub.regionId);
        }
        const regionId = canonicalLivePalmesRegion(portalContext.elements.engagementsAccessRequestEditRegionId?.value || "");
        select.innerHTML = "";
        if (!regionId) {
          select.append(new Option("Choisissez d'abord une région", ""));
          select.disabled = true;
          syncEngagementAccessRequestEditClubFieldsFromSelect();
          return;
        }
        const regionKey = normalizedRegionKey(regionId);
        const clubs = portalState.accessClubReference
          .filter((club) => normalizedRegionKey(club.regionId) === regionKey)
          .sort((a, b) => accessClubLabel(a).localeCompare(accessClubLabel(b), "fr", { numeric: true }));
        select.append(new Option("À choisir", ""));
        clubs.forEach((club) => select.append(new Option(accessClubLabel(club), club.clubId)));
        if (selectedId && !clubs.some((club) => club.clubId === selectedId)) {
          const label = fallbackClubName || knownClub?.clubName || "ancienne valeur";
          select.append(new Option(label, selectedId));
        }
        select.disabled = clubs.length === 0 && !selectedId;
        if (!clubs.length && !selectedId) {
          select.options[0].textContent = "Aucun club trouvé pour cette région";
        }
        select.value = selectedId;
        if (selectedId && !knownClub) {
          if (portalContext.elements.engagementsAccessRequestEditClubId) portalContext.elements.engagementsAccessRequestEditClubId.value = selectedId;
          if (portalContext.elements.engagementsAccessRequestEditClubName) portalContext.elements.engagementsAccessRequestEditClubName.value = fallbackClubName || "";
          return;
        }
        syncEngagementAccessRequestEditClubFieldsFromSelect();
      }

    function loadAccessClubReference() {
        if (portalState.accessClubReference.length) return Promise.resolve(portalState.accessClubReference);
        if (portalState.accessClubReferenceLoadPromise) return portalState.accessClubReferenceLoadPromise;
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap") {
          portalState.accessClubReferenceLoadPromise = portalActions.callFunction("getPublicEngagementClubDirectory", {}).then(result=>{
            portalState.accessClubReference = (Array.isArray(result.clubs)?result.clubs:[]).map(normalizeAccessClubReference).filter(club=>club.clubId && club.clubName);
            portalState.accessClubReferenceById = new Map(portalState.accessClubReference.map(club=>[club.clubId,club]));
            populateAccessRegionChoices();
            populateAccessClubSelect(portalContext.elements.accessClubId?.value || "");
            populatePublicAccessRequestClubSelect(portalContext.elements.publicAccessRequestClubId?.value || "");
            populateEngagementAccessRequestEditClubSelect(portalContext.elements.engagementsAccessRequestEditClubId?.value || "");
            if(portalState.currentAccessProfile) {portalActions.renderPortalScopeContext(portalState.currentAccessProfile);portalActions.renderEngagementsProfile(portalState.currentAccessProfile);}
            return portalState.accessClubReference;
          }).catch(error=>{
            portalState.accessClubReferenceLoadPromise = null;
            portalActions.setAccessMessage(`Referentiel NAP indisponible : ${error?.message || error}`);
            portalActions.setPublicAccessRequestMessage(`Referentiel NAP indisponible : ${error?.message || error}`);
            return [];
          });
          return portalState.accessClubReferenceLoadPromise;
        }
        portalState.accessClubReferenceLoadPromise = loadScriptOnce(
          "performances/public/data/club-reference.js?v=20260813-national-clubs-3",
          "adminAccessReferenceScript"
        ).then(async () => {
          portalState.accessClubReference = (global.LIVEPALMES_CLUB_REFERENCE?.clubs || [])
            .map(normalizeAccessClubReference)
            .filter((club) => club.clubId && club.clubName);
          if (!portalState.publicClubDirectoryLoadPromise) {
            portalState.publicClubDirectoryLoadPromise = portalActions.callFunction("getPublicEngagementClubDirectory", {})
              .then((result) => Array.isArray(result?.clubs) ? result.clubs : [])
              .catch(() => []);
          }
          portalActions.mergeNationalClubsIntoAccessReference(await portalState.publicClubDirectoryLoadPromise);
          portalState.accessClubReferenceById = new Map(portalState.accessClubReference.map((club) => [club.clubId, club]));
          populateAccessRegionChoices();
          populateAccessClubSelect(portalContext.elements.accessClubId?.value || "");
          populatePublicAccessRequestClubSelect(portalContext.elements.publicAccessRequestClubId?.value || "");
          populateEngagementAccessRequestEditClubSelect(portalContext.elements.engagementsAccessRequestEditClubId?.value || "");
          if (portalState.currentAccessProfile) {
            portalActions.renderPortalScopeContext(portalState.currentAccessProfile);
            portalActions.renderEngagementsProfile(portalState.currentAccessProfile);
          }
          return portalState.accessClubReference;
        }).catch((error) => {
          portalState.accessClubReferenceLoadPromise = null;
          portalActions.setAccessMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
          portalActions.setPublicAccessRequestMessage(`Referentiel clubs indisponible : ${error?.message || error}`);
          return [];
        });
        return portalState.accessClubReferenceLoadPromise;
      }

    function renderClubSwitchResults() {
        const results = portalContext.elements.clubSwitchResults;
        if (!results) return;
        const query = portalActions.normalizedAccessSearch(portalContext.elements.clubSwitchSearch?.value || "");
        const clubs = portalState.accessClubReference
          .filter((club) => Boolean(portalConfig.LIVEPALMES_REFERENCE_REGION_LABELS[club.referenceRegionId]))
          .filter((club) => !query || portalActions.normalizedAccessSearch([club.clubCode, club.clubName].join(" ")).includes(query))
          .sort((left, right) => accessClubLabel(left).localeCompare(accessClubLabel(right), "fr", { numeric: true }))
          .slice(0, 80);
        if (!portalState.accessClubReference.length) {
          results.innerHTML = '<p class="admin-engagements-empty">Référentiel des clubs indisponible.</p>';
          return;
        }
        if (!clubs.length) {
          results.innerHTML = '<p class="admin-engagements-empty">Aucun club ne correspond à cette recherche.</p>';
          return;
        }
        const activeClubId = portalActions.engagementClubScope(portalState.currentAccessProfile || {});
        results.innerHTML = clubs.map((club) => {
          const active = club.clubId === activeClubId;
          return `<button class="admin-portal-club-switch-result" type="button" data-portal-active-club-id="${portalActions.escapeHtml(club.clubId)}" aria-pressed="${active ? "true" : "false"}"><strong>${portalActions.escapeHtml(club.clubCode || club.clubName)}</strong><span>${portalActions.escapeHtml(club.clubName)}</span>${active ? '<small>Club actif</small>' : ""}</button>`;
        }).join("");
      }

    function openClubSwitchDialog() {
        if (!portalActions.canSwitchEngagementClub(portalState.currentAccessProfile || {})) return;
        if (!portalState.accessClubReference.length) {
          void loadAccessClubReference().then(openClubSwitchDialog);
          return;
        }
        if (portalContext.elements.clubSwitchStatus) {
          portalContext.elements.clubSwitchStatus.textContent = "";
          delete portalContext.elements.clubSwitchStatus.dataset.tone;
        }
        if (portalContext.elements.clubSwitchSearch) portalContext.elements.clubSwitchSearch.value = "";
        renderClubSwitchResults();
        if (!portalContext.elements.clubSwitchDialog?.open) portalContext.elements.clubSwitchDialog?.showModal();
        portalContext.elements.clubSwitchSearch?.focus();
      }

    function changeActiveEngagementClub(clubId = "") {
        if (!portalActions.canSwitchEngagementClub(portalState.currentAccessProfile || {})) return;
        if (portalState.selectedEngagementCompetitionId && !portalActions.confirmLeaveDirtyEngagementTab()) return;
        portalActions.setActiveEngagementClub(clubId);
        portalActions.closeEngagementCompetitionDetail({ skipConfirmation: true });
        if (portalContext.elements.clubSwitchStatus) {
          const activeClub = portalActions.activeEngagementClubProfile(portalState.currentAccessProfile || {});
          portalContext.elements.clubSwitchStatus.textContent = clubId
            ? `${clubDisplayLabel(activeClub)} est maintenant le club actif de cette session.`
            : "Votre club d’appartenance est de nouveau actif.";
          portalContext.elements.clubSwitchStatus.dataset.tone = "ok";
        }
        renderClubSwitchResults();
      }

    function currentEngagementSeasonStartYear(date = new Date()) {
        const year = date.getFullYear();
        return date.getMonth() >= 8 ? year : year - 1;
      }

    function engagementSeasonBounds(startYear) {
        const season = Math.trunc(Number(startYear) || currentEngagementSeasonStartYear());
        return {
          startYear: season,
          startDate: `${season}-09-01`,
          endDate: `${season + 1}-08-31`
        };
      }

    function engagementSeasonLabel(startYear) {
        const season = Math.trunc(Number(startYear) || currentEngagementSeasonStartYear());
        return `${season}-${season + 1}`;
      }

    function populateEngagementSeasonFilter() {
        const select = portalContext.elements.engagementsSeasonFilter;
        if (!select) return;
        const currentSeason = currentEngagementSeasonStartYear();
        const currentValue = select.value || String(currentSeason);
        select.innerHTML = "";
        [currentSeason + 1, currentSeason, currentSeason - 1, currentSeason - 2, currentSeason - 3].forEach((season) => {
          select.append(new Option(engagementSeasonLabel(season), String(season)));
        });
        select.value = Array.from(select.options).some((option) => option.value === currentValue)
          ? currentValue
          : String(currentSeason);
      }

    function syncEngagementStatusSegments() {
        const activeStatus = portalContext.elements.engagementsStatusFilter?.value || "";
        portalContext.elements.engagementsStatusSegmentButtons?.forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.engagementStatus === activeStatus ? "true" : "false");
        });
      }

    return {
      loadScriptOnce,
      loadPortalClubCodeReference,
      watchRecordWorkbench,
      loadDtnModule,
      loadRecordModule,
      watchImportWorkbench,
      loadImportSpreadsheet,
      loadImportModule,
      capabilityLabel,
      normalizedRegionKey,
      canonicalLivePalmesRegion,
      sameLivePalmesRegion,
      regionDisplayLabel,
      setRegionSelectValue,
      fillLivePalmesRegionSelect,
      selectedRegionMultiSelectValues,
      setRegionMultiSelectValues,
      updateInvitedRegionWarning,
      renderInvitedRegionChoices,
      fillLivePalmesRegionMultiSelect,
      populateLivePalmesRegionSelects,
      accessReferenceRegionLabel,
      normalizeAccessClubReference,
      accessClubLabel,
      accessClubFromId,
      clubDisplayCode,
      clubDisplayLabel,
      populateAccessRegionChoices,
      syncAccessClubFieldsFromSelect,
      populateAccessClubSelect,
      syncPublicAccessRequestClubFieldsFromSelect,
      populatePublicAccessRequestClubSelect,
      normalizedClubFederalNumber,
      publicAccessRequestNewClubInputs,
      updatePublicAccessRequestNewClubMode,
      matchPublicAccessRequestClubByFederalNumber,
      syncEngagementAccessRequestEditClubFieldsFromSelect,
      populateEngagementAccessRequestEditClubSelect,
      loadAccessClubReference,
      renderClubSwitchResults,
      openClubSwitchDialog,
      changeActiveEngagementClub,
      currentEngagementSeasonStartYear,
      engagementSeasonBounds,
      engagementSeasonLabel,
      populateEngagementSeasonFilter,
      syncEngagementStatusSegments
    };
  }
  global.LivePalmesPortalModulesAndClubs = { create };
})(window);
