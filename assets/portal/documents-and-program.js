(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/documents-and-program.js#formatEngagementAutomationDate */
    function formatEngagementAutomationDate(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "formatEngagementAutomationDate", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementClosureAutomation */
    function renderEngagementClosureAutomation(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementClosureAutomation", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#loadEngagementClubRecapFiles */
    async function loadEngagementClubRecapFiles(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "loadEngagementClubRecapFiles", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementClubRecapSelector */
    function renderEngagementClubRecapSelector(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementClubRecapSelector", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementStatisticsTimeModeLabel */
    function engagementStatisticsTimeModeLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementStatisticsTimeModeLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementCompetitionStatistics */
    function renderEngagementCompetitionStatistics(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementCompetitionStatistics", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#loadEngagementCompetitionStatistics */
    async function loadEngagementCompetitionStatistics(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "loadEngagementCompetitionStatistics", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementMailJobTypeLabel */
    function engagementMailJobTypeLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementMailJobTypeLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementMailJobs */
    function renderEngagementMailJobs(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementMailJobs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#loadEngagementMailJobs */
    async function loadEngagementMailJobs(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "loadEngagementMailJobs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCompetitionDocumentCategoryLabel */
    function engagementCompetitionDocumentCategoryLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCompetitionDocumentCategoryLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCompetitionDocumentCategoryOptions */
    function engagementCompetitionDocumentCategoryOptions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCompetitionDocumentCategoryOptions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCompetitionDocumentFileSize */
    function engagementCompetitionDocumentFileSize(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCompetitionDocumentFileSize", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCompetitionDocumentTypeLabel */
    function engagementCompetitionDocumentTypeLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCompetitionDocumentTypeLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementCompetitionDocumentDrafts */
    function renderEngagementCompetitionDocumentDrafts(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementCompetitionDocumentDrafts", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#openEngagementCompetitionDocumentForm */
    function openEngagementCompetitionDocumentForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "openEngagementCompetitionDocumentForm", args, moduleActions);
    }

    function closeEngagementCompetitionDocumentForm() {
        portalState.engagementCompetitionDocumentEditingId = "";
        portalState.engagementCompetitionDocumentFiles = [];
        if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.value = "";
        if (portalContext.elements.engagementsDocumentDrafts) portalContext.elements.engagementsDocumentDrafts.innerHTML = "";
        if (portalContext.elements.engagementsDocumentNotify) portalContext.elements.engagementsDocumentNotify.checked = false;
        if (portalContext.elements.engagementsDocumentForm) portalContext.elements.engagementsDocumentForm.hidden = true;
        if (portalContext.elements.engagementsDocumentAddButton) portalContext.elements.engagementsDocumentAddButton.hidden = false;
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCompetitionDocumentDraftValues */
    function engagementCompetitionDocumentDraftValues(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCompetitionDocumentDraftValues", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#readEngagementCompetitionDocumentFile */
    function readEngagementCompetitionDocumentFile(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "readEngagementCompetitionDocumentFile", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#handleEngagementCompetitionDocumentFiles */
    function handleEngagementCompetitionDocumentFiles(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "handleEngagementCompetitionDocumentFiles", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#updateSelectedEngagementCompetitionDocuments */
    function updateSelectedEngagementCompetitionDocuments(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "updateSelectedEngagementCompetitionDocuments", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#saveEngagementCompetitionDocuments */
    async function saveEngagementCompetitionDocuments(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "saveEngagementCompetitionDocuments", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#deleteEngagementCompetitionDocument */
    async function deleteEngagementCompetitionDocument(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "deleteEngagementCompetitionDocument", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementSharedDocuments */
    function renderEngagementSharedDocuments(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementSharedDocuments", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#canDownloadEngagementOpenWaterTxt */
    function canDownloadEngagementOpenWaterTxt(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "canDownloadEngagementOpenWaterTxt", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementDocuments */
    function renderEngagementDocuments(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementDocuments", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#updateSelectedEngagementDocumentStatus */
    function updateSelectedEngagementDocumentStatus(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "updateSelectedEngagementDocumentStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementEventSummary */
    function engagementEventSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementEventSummary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramSummary */
    function engagementProgramSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramSummary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramStatusSummary */
    function engagementProgramStatusSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramStatusSummary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementEventsCompactSummary */
    function engagementEventsCompactSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementEventsCompactSummary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#missingEngagementProgramEventCount */
    function missingEngagementProgramEventCount(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "missingEngagementProgramEventCount", args, moduleActions);
    }

    function updateEngagementEventsSectionToggleLabels() {
        portalContext.elements.engagementsSectionToggles?.forEach((button) => {
          const section = document.querySelector(`#${button.dataset.engagementsSectionToggle}`);
          button.textContent = section?.open ? "Replier" : "Ouvrir";
        });
      }

    function setEngagementEventsSectionOpen(section, open) {
        if (!section) return;
        section.open = Boolean(open);
        updateEngagementEventsSectionToggleLabels();
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#updateEngagementEventsSectionSummaries */
    function updateEngagementEventsSectionSummaries(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "updateEngagementEventsSectionSummaries", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementEventCountLabel */
    function engagementEventCountLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementEventCountLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#selectedEngagementEventOptions */
    function selectedEngagementEventOptions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "selectedEngagementEventOptions", args, moduleActions);
    }

    function normalizedEngagementProgramSessions(rawSessions = [], eventOptions = selectedEngagementEventOptions()) {
        const allowedCodes = new Set(eventOptions.map((event) => event.code));
        return (Array.isArray(rawSessions) ? rawSessions : []).map((session, sessionIndex) => {
          const items = (Array.isArray(session.items) ? session.items : [])
            .map((item) => ({
              eventCode: String(item.eventCode || item.code || "").trim().toUpperCase(),
              genderMode: portalConfig.ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS[item.genderMode] ? item.genderMode : "mixed",
              phase: engagementProgramPhaseForEvent(item.eventCode, item.phase)
            }))
            .filter((item) => allowedCodes.has(item.eventCode));
          return {
            id: session.id || `session-${sessionIndex + 1}`,
            label: `Session ${sessionIndex + 1}`,
            date: session.date || "",
            startTime: session.startTime || "",
            items
          };
        }).filter((session) => session.label || session.date || session.startTime || session.items.length);
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#selectedEngagementProgramSessionsFromForm */
    function selectedEngagementProgramSessionsFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "selectedEngagementProgramSessionsFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramGenderModesForEvent */
    function engagementProgramGenderModesForEvent(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramGenderModesForEvent", args, moduleActions);
    }

    function engagementProgramGenderModeShortLabel(mode, eventCode = "", eventOption = null) {
        const definition = portalActions.engagementEventDefinition(eventCode);
        return {
          female: "F",
          male: "H"
        }[mode] || (
          definition?.relayMixedRule === "required" || (definition?.relayMixedRule === "mastersOnly" && eventOption?.relayMixedMode === "masters")
            ? "Mixte"
            : "F/H"
        );
      }

    function engagementProgramGenderModeDisplayLabel(mode, eventCode = "", eventOption = null) {
        const definition = portalActions.engagementEventDefinition(eventCode);
        return {
          female: "Femmes",
          male: "Hommes"
        }[mode] || (
          definition?.relayMixedRule === "required"
            ? "Relais mixte"
            : definition?.relayMixedRule === "mastersOnly" && eventOption?.relayMixedMode === "masters"
              ? "Masters mixte"
              : "F/H ensemble"
        );
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramGenderModeTone */
    function engagementProgramGenderModeTone(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramGenderModeTone", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramPhaseLabel */
    function engagementProgramPhaseLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramPhaseLabel", args, moduleActions);
    }

    function engagementProgramFormatsForEvent(eventCode = "") {
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) !== "openWater") return portalConfig.ENGAGEMENT_PROGRAM_FORMATS;
        return portalActions.engagementEventDefinition(eventCode)?.openWaterFormat === "elimination"
          ? portalConfig.ENGAGEMENT_OPEN_WATER_ELIMINATION_PROGRAM_FORMATS
          : [];
      }

    function engagementProgramPhaseForEvent(eventCode = "", requestedPhase = "direct") {
        const phase = portalConfig.ENGAGEMENT_PROGRAM_PHASE_LABELS[requestedPhase] ? requestedPhase : "direct";
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) !== "openWater") return phase;
        const formats = engagementProgramFormatsForEvent(eventCode);
        if (!formats.length) return "direct";
        return ["direct", "heats", "final"].includes(phase) ? phase : "direct";
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramSameSlot */
    function engagementProgramSameSlot(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramSameSlot", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramPassages */
    function engagementProgramPassages(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramPassages", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramFormatForPhase */
    function engagementProgramFormatForPhase(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramFormatForPhase", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramFirstPhaseForFormat */
    function engagementProgramFirstPhaseForFormat(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramFirstPhaseForFormat", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramSecondPhaseForFormat */
    function engagementProgramSecondPhaseForFormat(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramSecondPhaseForFormat", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramCanAddPassage */
    function engagementProgramCanAddPassage(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramCanAddPassage", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementProgramNextPhase */
    function engagementProgramNextPhase(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementProgramNextPhase", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#normalizeEngagementProgramPassageOrder */
    function normalizeEngagementProgramPassageOrder(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "normalizeEngagementProgramPassageOrder", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#applyEngagementProgramFormatChange */
    function applyEngagementProgramFormatChange(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "applyEngagementProgramFormatChange", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementProgramSessions */
    function renderEngagementProgramSessions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementProgramSessions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#refreshEngagementProgramEditor */
    function refreshEngagementProgramEditor(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "refreshEngagementProgramEditor", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#addEngagementProgramSession */
    function addEngagementProgramSession(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "addEngagementProgramSession", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#handleEngagementProgramAction */
    function handleEngagementProgramAction(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "handleEngagementProgramAction", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#selectedEngagementEventsFromForm */
    function selectedEngagementEventsFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "selectedEngagementEventsFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#selectedEngagementEventsCategoryError */
    function selectedEngagementEventsCategoryError(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "selectedEngagementEventsCategoryError", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#selectedEngagementProgramError */
    function selectedEngagementProgramError(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "selectedEngagementProgramError", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementAllowedCategoryCodes */
    function engagementAllowedCategoryCodes(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementAllowedCategoryCodes", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#normalizeEngagementCategoryRestrictions */
    function normalizeEngagementCategoryRestrictions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "normalizeEngagementCategoryRestrictions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCategoryDefinitionsForEvent */
    function engagementCategoryDefinitionsForEvent(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCategoryDefinitionsForEvent", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#updateEngagementEventsSummaryFromForm */
    function updateEngagementEventsSummaryFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "updateEngagementEventsSummaryFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementCategoryColumnInputs */
    function engagementCategoryColumnInputs(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementCategoryColumnInputs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#updateEngagementCategoryColumnControls */
    function updateEngagementCategoryColumnControls(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "updateEngagementCategoryColumnControls", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#applyEngagementCategoryColumnControl */
    function applyEngagementCategoryColumnControl(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "applyEngagementCategoryColumnControl", args, moduleActions);
    }

    const openWaterProposedDistances = new Set([150,1000,2000,3000,4000,5000,6000]);
    const openWaterReadyDistances = new Set(openWaterProposedDistances);
    const openWaterExtraDistances = new Set();
    let openWaterVisibleCompetitionId = null;
    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementOpenWaterCourseLibrary */
    function renderEngagementOpenWaterCourseLibrary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementOpenWaterCourseLibrary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#loadEngagementOpenWaterCourses */
    async function loadEngagementOpenWaterCourses(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "loadEngagementOpenWaterCourses", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#addEngagementOpenWaterCourseToProgram */
    function addEngagementOpenWaterCourseToProgram(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "addEngagementOpenWaterCourseToProgram", args, moduleActions);
    }

    async function addEngagementOpenWaterCourse(event) {
        event?.preventDefault?.();
        if(portalContext.elements.engagementsOpenWaterCourseAdd?.disabled)return;
        const distance = Math.trunc(Number(portalContext.elements.engagementsOpenWaterDistance?.value));
        if (!Number.isInteger(Number(portalContext.elements.engagementsOpenWaterDistance?.value))||distance<1||distance>100000) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "Renseignez une distance entière de 1 à 100 000 mètres.";
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
          return;
        }
        const preservedEvents = selectedEngagementEventsFromForm();
        const preservedSessions = selectedEngagementProgramSessionsFromForm();
        try {
          const addButton=portalContext.elements.engagementsOpenWaterCourseAdd;
          if(addButton)addButton.disabled=true;
          const existing = portalState.engagementOpenWaterCourses.filter(course=>course.distance===distance);
          const disciplines = distance===150?["SF","BI"]:["SF","BI","SUP"];
          const alreadyAvailable = disciplines.every(discipline=>existing.some(course=>course.discipline===discipline&&course.active!==false));
          const result = alreadyAvailable && openWaterReadyDistances.has(distance) ? {courses:portalState.engagementOpenWaterCourses} : await portalActions.callFunction("addEngagementOpenWaterCourse", { distance });
          if(result.nativeReferencesReady===true)openWaterReadyDistances.add(distance);
          portalState.engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : portalState.engagementOpenWaterCourses;
          portalState.engagementOpenWaterCoursesLoaded = true;
          openWaterExtraDistances.add(distance);
          if (portalContext.elements.engagementsOpenWaterDistance) portalContext.elements.engagementsOpenWaterDistance.value = "";
          if (portalContext.elements.engagementsOpenWaterDiscipline) portalContext.elements.engagementsOpenWaterDiscipline.value = "";
          renderEngagementEvents({
            ...portalState.selectedEngagementCompetition,
            events: preservedEvents,
            programSessions: preservedSessions
          });
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `${distance} m ajouté.`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `Ajout impossible : ${error?.message || error}`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
        } finally {if(portalContext.elements.engagementsOpenWaterCourseAdd)portalContext.elements.engagementsOpenWaterCourseAdd.disabled=false;}
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#setEngagementOpenWaterCourseStatus */
    async function setEngagementOpenWaterCourseStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "documents-and-program", "setEngagementOpenWaterCourseStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementEventGroup */
    function renderEngagementEventGroup(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementEventGroup", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementEvents */
    function renderEngagementEvents(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementEvents", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderNativeCourseRemoval */
    function renderNativeCourseRemoval(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderNativeCourseRemoval", args, moduleActions);
    }

    function renderEngagementCompetitions() {
        const mount = portalContext.elements.engagementsCalendarList;
        if (!mount) return;
        const visibleCompetitions = portalActions.filteredEngagementCompetitions();
        if (!visibleCompetitions.length) {
          mount.innerHTML = `
        <div class="admin-engagements-empty admin-engagements-calendar-empty">
          <strong>Aucune compétition dans cette vue.</strong>
          <span>Modifiez le statut ou retirez les filtres secondaires.</span>
          <button class="ghost-button" type="button" data-engagement-filters-reset>Réinitialiser les filtres</button>
        </div>
      `;
          return;
        }
        const { upcoming, past } = portalActions.engagementCalendarSections(visibleCompetitions);
        mount.innerHTML = `<h3 class="admin-engagements-period-title">En cours et à venir</h3>` +
          (upcoming.length ? renderEngagementCompetitionTable(upcoming, "upcoming", portalState.engagementCompetitionsVisibleLimit)
            : '<p class="admin-engagements-empty">Aucune compétition en cours ou à venir pour ces filtres.</p>') +
          (past.length ? `<details class="admin-engagements-past" data-engagement-past ${portalState.engagementPastCompetitionsExpanded ? "open" : ""}>
        <summary>Compétitions passées (${past.length})</summary>
        ${renderEngagementCompetitionTable(past, "past", portalState.engagementPastCompetitionsVisibleLimit)}
      </details>` : "");
      }

    function engagementCompetitionAdminStatus(competition = {}, now = Date.now()) {
        if (competition.canceled) return { state: "canceled", label: "Annulée" };
        if (competition.resultsPublishedAt || /\.pdf(?:$|[?#])/i.test(competition.resultsPdfUrl || competition.results?.pdfUrl || "")) {
          return { state: "results", label: "Résultats publiés" };
        }
        const verify = { state: "unknown", label: "État à vérifier" };
        if (competition.publicationStatus !== "published") return verify;
        if (!["pool", "openWater"].includes(portalActions.engagementCompetitionType(competition))) {
          return { state: "calendar", label: "Au calendrier" };
        }
        const status = competition.entryStatus;
        const deadline = competition.entryDeadlineAt ? Date.parse(competition.entryDeadlineAt) : null;
        if (competition.entryStatusKnown === false || competition.deadlineWarning ||
          !["upcoming", "open", "closed"].includes(status) || deadline !== null && !Number.isFinite(deadline)) return verify;
        if (status === "closed" || deadline !== null && deadline <= now) return { state: "closed", label: "Engagements fermés" };
        if (status === "open") return deadline === null ? verify : { state: "open", label: "Engagements ouverts" };
        return { state: "calendar", label: "Au calendrier" };
      }

    function refreshEngagementCompetitionStatuses() {
        document.querySelectorAll("[data-engagement-admin-status-id]").forEach((badge) => {
          const competition = portalState.engagementCompetitions.find(item => item.id === badge.dataset.engagementAdminStatusId);
          if (!competition) return;
          const status = engagementCompetitionAdminStatus(competition);
          badge.textContent = status.label;
          badge.dataset.entryState = status.state;
        });
      }

    function renderEngagementCompetitionTable(visibleCompetitions, period, limit) {
        const renderedCompetitions = visibleCompetitions.slice(0, limit);
        const groupedCompetitions = [];
        renderedCompetitions.forEach((competition) => {
          const groupLabel = portalActions.engagementCompetitionMonthLabel(competition);
          let group = groupedCompetitions.at(-1);
          if (!group || group.label !== groupLabel) {
            group = { label: groupLabel, competitions: [] };
            groupedCompetitions.push(group);
          }
          group.competitions.push(competition);
        });
        return `
      <div class="admin-engagements-competitions-table" role="table" aria-label="${period === "past" ? "Compétitions passées" : portalActions.isEngagementAdminMode() ? "Compétitions à administrer" : "Engagements en compétition"}">
        <div class="admin-engagements-competitions-table-head" role="row">
          <span role="columnheader">Date</span>
          <span role="columnheader">Compétition</span>
          <span role="columnheader">Niveau / région</span>
          <span role="columnheader">${portalActions.isEngagementAdminMode() ? "État" : "Engagements"}</span>
          <span role="columnheader">Action</span>
        </div>
        ${groupedCompetitions.map((group, groupIndex) => `
          <section class="admin-engagements-competition-group" role="rowgroup" aria-labelledby="engagement-competition-group-${period}-${groupIndex}">
            <h4 id="engagement-competition-group-${period}-${groupIndex}">${portalActions.escapeHtml(group.label)}</h4>
            ${group.competitions.map((competition) => {
                  const action = portalActions.engagementCompetitionAction(competition);
                  const entryStatus = competition.entryStatus || "upcoming";
                  const deadlineLabel = portalActions.engagementDeadlineDisplay(competition);
                  const showStatusBadge = entryStatus !== "open";
                  const calendarEvent = competition.sourceType === "calendarEvent";
                  const adminStatus = engagementCompetitionAdminStatus(competition);
                  return `
                <article class="admin-engagements-competition ${competition.id === portalState.selectedEngagementCompetitionId ? "selected" : ""}" role="row" data-competition-type="${portalActions.escapeHtml(portalActions.engagementCompetitionType(competition))}" data-engagement-competition-card-id="${portalActions.escapeHtml(competition.id)}" data-engagement-open-tab="${portalActions.escapeHtml(action.tab)}">
                  <time class="admin-engagements-competition-date" role="cell" data-label="Date" datetime="${portalActions.escapeHtml(competition.date || "")}">${portalActions.escapeHtml(portalActions.formatEngagementCompetitionDate(competition))}</time>
                  <div class="admin-engagements-competition-main" role="cell" data-label="Compétition">
                    <strong>${portalActions.escapeHtml(competition.name || "Compétition sans nom")}</strong>
                    <small class="admin-engagements-competition-type">${portalActions.escapeHtml(portalActions.engagementCompetitionTypeLabel(portalActions.engagementCompetitionType(competition)))}</small>
                    <small class="admin-engagements-competition-location">${portalActions.escapeHtml(competition.city || competition.location || "Ville non renseignée")}</small>
                    <small class="admin-engagements-competition-mobile-meta">${portalActions.escapeHtml([
                          competition.city || competition.location || "Ville non renseignée",
                          portalActions.engagementLevelLabel(competition.level),
                          competition.regionId ? portalActions.regionDisplayLabel(competition.regionId) : ""
                        ].filter(Boolean).join(" · "))}</small>
                  </div>
                  <div class="admin-engagements-competition-scope" role="cell" data-label="Niveau / région">
                    <span>${portalActions.escapeHtml(portalActions.engagementLevelLabel(competition.level))}</span>
                    ${competition.regionId ? `<small>${portalActions.escapeHtml(portalActions.regionDisplayLabel(competition.regionId))}</small>` : ""}
                  </div>
                  <div class="admin-engagements-competition-status" role="cell" data-label="${portalActions.isEngagementAdminMode() ? "État" : "Engagements"}">
                    ${portalActions.isEngagementAdminMode()
                          ? `<span class="admin-engagements-competition-entry-badge" data-engagement-admin-status-id="${portalActions.escapeHtml(competition.id)}" data-entry-state="${adminStatus.state}">${adminStatus.label}</span>`
                          : calendarEvent
                          ? `<span class="admin-engagements-competition-entry-badge" data-entry-state="${competition.publicationStatus === "published" ? "open" : "upcoming"}">${portalActions.escapeHtml(portalActions.publicCalendarPublicationLabel(competition.publicationStatus))}</span>${competition.canceled ? "<small>Événement annulé</small>" : ""}`
                          : `${showStatusBadge ? `<span class="admin-engagements-competition-entry-badge" data-entry-state="${portalActions.escapeHtml(entryStatus)}">${portalActions.escapeHtml(portalActions.engagementStatusLabel(entryStatus))}</span>` : ""}${deadlineLabel ? `<small data-entry-status="${portalActions.escapeHtml(portalActions.engagementDeadlineTone(competition))}" data-engagement-deadline-competition-id="${portalActions.escapeHtml(competition.id)}">${portalActions.escapeHtml(deadlineLabel)}</small>` : ""}`}
                  </div>
                  <div class="admin-engagements-competition-actions" role="cell" data-label="Action">
                    <button class="ghost-button" type="button" aria-label="${portalActions.escapeHtml(`${action.label} — ${competition.name || "Compétition sans nom"}`)}" data-engagement-competition-id="${portalActions.escapeHtml(competition.id)}" data-engagement-open-tab="${portalActions.escapeHtml(action.tab)}">
                      ${action.tab === "team"
                            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><circle cx="17" cy="9" r="3"></circle><path d="M2 21a6 6 0 0 1 12 0M12 21a5 5 0 0 1 10 0"></path></svg>'
                            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>'}
                      <span>${portalActions.escapeHtml(action.label)}</span>
                    </button>
                  </div>
                </article>
              `;
                }).join("")}
          </section>
        `).join("")}
      </div>
    ` + (renderedCompetitions.length < visibleCompetitions.length
          ? `<button class="ghost-button admin-engagements-show-more" type="button" data-engagement-show-more="${period}">Afficher plus de compétitions${period === "past" ? " passées" : ""}</button>`
          : "");
      }

    function setEngagementCompetitionDetailVisible(visible) {
        if (portalContext.elements.engagementsView) portalContext.elements.engagementsView.dataset.detailOpen = visible ? "true" : "false";
        if (!visible) portalState.qualificationExceptionScope = "";
        if (portalContext.elements.engagementsCalendarPanel) portalContext.elements.engagementsCalendarPanel.dataset.detailOpen = visible ? "true" : "false";
        if (portalContext.elements.engagementsCalendarCard) portalContext.elements.engagementsCalendarCard.dataset.detailOpen = visible ? "true" : "false";
        if (portalContext.elements.engagementsCalendarFilters) portalContext.elements.engagementsCalendarFilters.hidden = visible;
        if (portalContext.elements.engagementsCalendarList) portalContext.elements.engagementsCalendarList.hidden = visible;
        if (portalContext.elements.engagementsCalendarActions) {
          const calendarActionsVisible = !visible && portalActions.isEngagementAdminMode() && portalState.activeEngagementsTab === "calendar";
          portalContext.elements.engagementsCalendarActions.hidden = !calendarActionsVisible;
        }
        if (portalContext.elements.engagementsDetail) portalContext.elements.engagementsDetail.hidden = !visible;
        if (portalContext.elements.engagementsDetailClose) portalContext.elements.engagementsDetailClose.hidden = !visible;
        if (!visible) portalActions.setEngagementSaveState("");
      }

    function setEngagementClubEntryLoadingState(state = "") {
        if (!portalContext.elements.engagementsDetail) return;
        if (state) {
          portalContext.elements.engagementsDetail.dataset.clubEntryLoading = state;
          portalContext.elements.engagementsDetail.setAttribute("aria-busy", state === "loading" ? "true" : "false");
          return;
        }
        delete portalContext.elements.engagementsDetail.dataset.clubEntryLoading;
        portalContext.elements.engagementsDetail.removeAttribute("aria-busy");
      }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementNativeEditWarningKind */
    function engagementNativeEditWarningKind(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementNativeEditWarningKind", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#renderEngagementNativeEditWarnings */
    function renderEngagementNativeEditWarnings(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "renderEngagementNativeEditWarnings", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/documents-and-program.js#engagementClubContextMessage */
    function engagementClubContextMessage(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "documents-and-program", "engagementClubContextMessage", args, moduleActions);
    }

    const moduleActions = { get openWaterVisibleCompetitionId() { return openWaterVisibleCompetitionId; }, set openWaterVisibleCompetitionId(value) { openWaterVisibleCompetitionId = value; }, get openWaterExtraDistances() { return openWaterExtraDistances; }, get openWaterProposedDistances() { return openWaterProposedDistances; }, formatEngagementAutomationDate, renderEngagementClosureAutomation, loadEngagementClubRecapFiles, renderEngagementClubRecapSelector, engagementStatisticsTimeModeLabel, renderEngagementCompetitionStatistics, loadEngagementCompetitionStatistics, engagementMailJobTypeLabel, renderEngagementMailJobs, loadEngagementMailJobs, engagementCompetitionDocumentCategoryLabel, engagementCompetitionDocumentCategoryOptions, engagementCompetitionDocumentFileSize, engagementCompetitionDocumentTypeLabel, renderEngagementCompetitionDocumentDrafts, openEngagementCompetitionDocumentForm, closeEngagementCompetitionDocumentForm, engagementCompetitionDocumentDraftValues, readEngagementCompetitionDocumentFile, handleEngagementCompetitionDocumentFiles, updateSelectedEngagementCompetitionDocuments, saveEngagementCompetitionDocuments, deleteEngagementCompetitionDocument, renderEngagementSharedDocuments, canDownloadEngagementOpenWaterTxt, renderEngagementDocuments, updateSelectedEngagementDocumentStatus, engagementEventSummary, engagementProgramSummary, engagementProgramStatusSummary, engagementEventsCompactSummary, missingEngagementProgramEventCount, updateEngagementEventsSectionToggleLabels, setEngagementEventsSectionOpen, updateEngagementEventsSectionSummaries, engagementEventCountLabel, selectedEngagementEventOptions, normalizedEngagementProgramSessions, selectedEngagementProgramSessionsFromForm, engagementProgramGenderModesForEvent, engagementProgramGenderModeShortLabel, engagementProgramGenderModeDisplayLabel, engagementProgramGenderModeTone, engagementProgramPhaseLabel, engagementProgramFormatsForEvent, engagementProgramPhaseForEvent, engagementProgramSameSlot, engagementProgramPassages, engagementProgramFormatForPhase, engagementProgramFirstPhaseForFormat, engagementProgramSecondPhaseForFormat, engagementProgramCanAddPassage, engagementProgramNextPhase, normalizeEngagementProgramPassageOrder, applyEngagementProgramFormatChange, renderEngagementProgramSessions, refreshEngagementProgramEditor, addEngagementProgramSession, handleEngagementProgramAction, selectedEngagementEventsFromForm, selectedEngagementEventsCategoryError, selectedEngagementProgramError, engagementAllowedCategoryCodes, normalizeEngagementCategoryRestrictions, engagementCategoryDefinitionsForEvent, updateEngagementEventsSummaryFromForm, engagementCategoryColumnInputs, updateEngagementCategoryColumnControls, applyEngagementCategoryColumnControl, renderEngagementOpenWaterCourseLibrary, loadEngagementOpenWaterCourses, addEngagementOpenWaterCourseToProgram, addEngagementOpenWaterCourse, setEngagementOpenWaterCourseStatus, renderEngagementEventGroup, renderEngagementEvents, renderNativeCourseRemoval, renderEngagementCompetitions, renderEngagementCompetitionTable, setEngagementCompetitionDetailVisible, setEngagementClubEntryLoadingState, engagementNativeEditWarningKind, renderEngagementNativeEditWarnings, engagementClubContextMessage };
    return {
      formatEngagementAutomationDate,
      renderEngagementClosureAutomation,
      loadEngagementClubRecapFiles,
      renderEngagementClubRecapSelector,
      engagementStatisticsTimeModeLabel,
      renderEngagementCompetitionStatistics,
      loadEngagementCompetitionStatistics,
      engagementMailJobTypeLabel,
      renderEngagementMailJobs,
      loadEngagementMailJobs,
      engagementCompetitionDocumentCategoryLabel,
      engagementCompetitionDocumentCategoryOptions,
      engagementCompetitionDocumentFileSize,
      engagementCompetitionDocumentTypeLabel,
      renderEngagementCompetitionDocumentDrafts,
      openEngagementCompetitionDocumentForm,
      closeEngagementCompetitionDocumentForm,
      engagementCompetitionDocumentDraftValues,
      readEngagementCompetitionDocumentFile,
      handleEngagementCompetitionDocumentFiles,
      updateSelectedEngagementCompetitionDocuments,
      saveEngagementCompetitionDocuments,
      deleteEngagementCompetitionDocument,
      renderEngagementSharedDocuments,
      canDownloadEngagementOpenWaterTxt,
      renderEngagementDocuments,
      updateSelectedEngagementDocumentStatus,
      engagementEventSummary,
      engagementProgramSummary,
      engagementProgramStatusSummary,
      engagementEventsCompactSummary,
      missingEngagementProgramEventCount,
      updateEngagementEventsSectionToggleLabels,
      setEngagementEventsSectionOpen,
      updateEngagementEventsSectionSummaries,
      engagementEventCountLabel,
      selectedEngagementEventOptions,
      normalizedEngagementProgramSessions,
      selectedEngagementProgramSessionsFromForm,
      engagementProgramGenderModesForEvent,
      engagementProgramGenderModeShortLabel,
      engagementProgramGenderModeDisplayLabel,
      engagementProgramGenderModeTone,
      engagementProgramPhaseLabel,
      engagementProgramFormatsForEvent,
      engagementProgramPhaseForEvent,
      engagementProgramSameSlot,
      engagementProgramPassages,
      engagementProgramFormatForPhase,
      engagementProgramFirstPhaseForFormat,
      engagementProgramSecondPhaseForFormat,
      engagementProgramCanAddPassage,
      engagementProgramNextPhase,
      normalizeEngagementProgramPassageOrder,
      applyEngagementProgramFormatChange,
      renderEngagementProgramSessions,
      refreshEngagementProgramEditor,
      addEngagementProgramSession,
      handleEngagementProgramAction,
      selectedEngagementEventsFromForm,
      selectedEngagementEventsCategoryError,
      selectedEngagementProgramError,
      engagementAllowedCategoryCodes,
      normalizeEngagementCategoryRestrictions,
      engagementCategoryDefinitionsForEvent,
      updateEngagementEventsSummaryFromForm,
      engagementCategoryColumnInputs,
      updateEngagementCategoryColumnControls,
      applyEngagementCategoryColumnControl,
      renderEngagementOpenWaterCourseLibrary,
      loadEngagementOpenWaterCourses,
      addEngagementOpenWaterCourseToProgram,
      addEngagementOpenWaterCourse,
      setEngagementOpenWaterCourseStatus,
      renderEngagementEventGroup,
      renderEngagementEvents,
      renderNativeCourseRemoval,
      renderEngagementCompetitions,
      renderEngagementCompetitionTable,
      engagementCompetitionAdminStatus,
      refreshEngagementCompetitionStatuses,
      setEngagementCompetitionDetailVisible,
      setEngagementClubEntryLoadingState,
      engagementNativeEditWarningKind,
      renderEngagementNativeEditWarnings,
      engagementClubContextMessage
    };
  }
  global.LivePalmesPortalDocumentsAndProgram = { create };
})(window);
